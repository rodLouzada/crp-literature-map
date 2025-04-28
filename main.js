const DATA_URL = 'crp_openalex_enhanced.json';
const API_BASE = 'https://api.openalex.org/works/';
const MAX_PAGE = 200;
const THROTTLE_MS = 200;

let currentSeed = null;

// simple sleep
const sleep = ms => new Promise(res => setTimeout(res, ms));

// Load and initial render
(async () => {
    const records = await loadData();
    buildThemeFilters(records);
    renderTable(records);
    setupSearch(records);

    document.getElementById('regenerate-btn').onclick = () => {
        if (currentSeed) showGraph(currentSeed);
    };
})();

async function loadData() {
    const resp = await fetch(DATA_URL);
    if (!resp.ok) throw new Error(`Fetch failed: ${resp.statusText}`);
    return (await resp.json()).records || [];
}

function buildThemeFilters(records) {
    const container = document.getElementById('theme-filters');
    const badge = document.getElementById('theme-count');
    const themes = new Set();
    records.forEach(r => (r.topics || []).forEach(t => themes.add(t.name)));
    badge.textContent = themes.size;
    if (!themes.size) return;
    themes.forEach(name => {
        const id = `theme-${name.replace(/\W+/g, '_')}`;
        const div = document.createElement('div');
        div.className = 'form-check form-check-inline';
        div.innerHTML = `
      <input class="form-check-input" type="checkbox" id="${id}" value="${name}">
      <label class="form-check-label" for="${id}">${name}</label>
    `;
        container.appendChild(div);
    });
}

function getChecked(containerId) {
    return Array.from(
        document.querySelectorAll(`#${containerId} input:checked`)
    ).map(i => i.value.toLowerCase());
}

function applyFilters(records) {
    const titleQ = document.getElementById('search').value.trim().toLowerCase();
    const start = document.getElementById('start-date').value;
    const end = document.getElementById('end-date').value;
    const themes = getChecked('theme-filters');
    const authorQ = document.getElementById('author-filter').value.trim().toLowerCase();
    const journalQ = document.getElementById('journal-filter').value.trim().toLowerCase();
    const keywordQ = document.getElementById('keyword-filter').value.trim().toLowerCase();
    const minC = parseInt(document.getElementById('min-cites').value) || 0;
    const maxC = parseInt(document.getElementById('max-cites').value) || Infinity;

    return records.filter(r => {
        if (titleQ && !r.title.toLowerCase().includes(titleQ)) return false;
        if (start && r.publication_date && r.publication_date < start) return false;
        if (end && r.publication_date && r.publication_date > end) return false;
        if (themes.length && !themes.some(t => (r.topics || []).map(x => x.name.toLowerCase()).includes(t)))
            return false;
        if (authorQ && !r.authors.some(a => a.name.toLowerCase().includes(authorQ)))
            return false;
        if (journalQ && !(r.journal || '').toLowerCase().includes(journalQ))
            return false;
        if (keywordQ && !((r.keywords || []).some(k => k.toLowerCase().includes(keywordQ))))
            return false;
        const cites = (r.citation_counts || {}).forward || 0;
        if (cites < minC || cites > maxC) return false;
        return true;
    });
}

function renderTable(records) {
    const tbody = document.querySelector('#results tbody');
    tbody.innerHTML = '';
    if (!records.length) {
        tbody.innerHTML = `
      <tr><td colspan="7" class="text-center py-3">
        No records match filters.
      </td></tr>`;
        return;
    }
    records.forEach(r => {
        const screening = r.screening?.title_abstract || 'Not screened';
        const tr = document.createElement('tr');
        tr.innerHTML = `
      <td><a href="${r.url || '#'}" target="_blank">${r.title}</a></td>
      <td>${r.publication_year || ''}</td>
      <td>${r.authors.map(a => a.name).join(', ')}</td>
      <td>${(r.citation_counts.forward) || 0}</td>
      <td>${screening}</td>
      <td><button class="btn btn-sm btn-outline-secondary details-btn">Details</button></td>
      <td><button class="btn btn-sm btn-outline-secondary network-btn">Graph</button></td>
    `;
        tbody.appendChild(tr);
        tr.querySelector('.details-btn').onclick = () => showDetails(r);
        tr.querySelector('.network-btn').onclick = () => {
            currentSeed = r;
            showGraph(r);
        };
    });
}

function setupSearch(records) {
    document.getElementById('search-btn').onclick = () =>
        renderTable(applyFilters(records));
}

async function fetchMetadata(id) {
    const local = id.split('/').pop();
    const resp = await fetch(API_BASE + local);
    if (!resp.ok) throw new Error(`API fetch failed: ${resp.status}`);
    return await resp.json();
}

async function showGraph(seed) {
    const depth = parseInt(document.getElementById('modal-graph-level').value, 10) || 1;
    document.getElementById('node-info').textContent =
        `${seed.title} (${seed.id.split('/').pop()})`;

    const elements = [];
    const visited = new Set();

    async function recurse(id, level) {
        if (level > depth || visited.has(id)) return;
        visited.add(id);

        let meta;
        if (id === seed.id) {
            meta = seed;
        } else {
            const raw = await fetchMetadata(id);
            meta = {
                id: raw.id,
                title: raw.title,
                backward_citations: raw.referenced_works || [],
                cited_by_api_url: raw.cited_by_api_url,
                citation_counts: {
                    backward: raw.referenced_works_count,
                    forward: raw.cited_by_count
                }
            };
        }

        elements.push({ data: { id, label: meta.title, meta } });
        await sleep(THROTTLE_MS);

        if (level < depth) {
            // backward
            for (const ref of (meta.backward_citations || []).slice(0, 50)) {
                elements.push({ data: { source: id, target: ref } });
                await recurse(ref, level + 1);
            }
            // forward
            if (meta.citation_counts.forward) {
                const resp = await fetch(meta.cited_by_api_url + `&per_page=${MAX_PAGE}`);
                if (resp.ok) {
                    const citers = (await resp.json()).results || [];
                    for (const c of citers.slice(0, 50)) {
                        elements.push({ data: { source: c.id, target: id } });
                        await recurse(c.id, level + 1);
                    }
                }
                await sleep(THROTTLE_MS);
            }
        }
    }

    await recurse(seed.id, 1);
    document.getElementById('cy').innerHTML = '';

    const cy = cytoscape({
        container: document.getElementById('cy'),
        elements,
        style: [
            {
                selector: 'node',
                style: {
                    'background-color': '#0d6efd',
                    'label': 'data(label)',
                    'color': '#000',
                    'text-wrap': 'wrap',
                    'text-max-width': 120,
                    'font-size': 8,
                    'text-valign': 'center'
                }
            },
            { selector: 'edge', style: { width: 2, 'line-color': '#999' } }
        ],
        layout: { name: 'cose' }
    });

    // node-click only updates info
    cy.on('tap', 'node', evt => {
        const m = evt.target.data('meta');
        document.getElementById('node-info').textContent =
            `${m.title} (${m.id.split('/').pop()})`;
    });

    new bootstrap.Modal(document.getElementById('graphModal')).show();
}

function showDetails(r) {
    const mb = document.getElementById('modal-body');
    mb.innerHTML = `
    <h5>${r.title}</h5>
    <p><strong>ID:</strong> ${r.id.split('/').pop()}</p>
    <p><strong>Publication Date:</strong> ${r.publication_date || 'N/A'}</p>
    <p><strong>Topics:</strong> ${(r.topics || []).map(t => t.name).join(', ')}</p>
    <p><strong>Keywords:</strong> ${(r.keywords || []).join(', ')}</p>
    <p><strong>URL:</strong> <a href="${r.url || '#'}">${r.url || 'N/A'}</a></p>
  `;
    new bootstrap.Modal(document.getElementById('detailModal')).show();
}
