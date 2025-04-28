const DATA_URL = 'crp_openalex_enhanced.json';
const API_BASE = 'https://api.openalex.org/works/';
const MAX_PAGE = 200;            // per_page cap
const RECURSIVE_THROTTLE = 200;  // ms between API calls

let currentSeed = null;

function sleep(ms) {
    return new Promise(res => setTimeout(res, ms));
}

async function loadData() {
    const resp = await fetch(DATA_URL);
    if (!resp.ok) throw new Error(`Fetch failed: ${resp.statusText}`);
    return (await resp.json()).records || [];
}

// Generic filter builder
function buildCheckboxFilter(records, fieldPath, containerId, badgeId) {
    const container = document.getElementById(containerId);
    const badge = document.getElementById(badgeId);
    const values = new Set();

    records.forEach(r => {
        const arr = fieldPath(r);
        if (Array.isArray(arr)) arr.forEach(v => values.add(v));
    });

    badge.textContent = values.size;
    values.forEach(val => {
        const id = `${containerId}-${val.replace(/\W+/g, '_')}`;
        const div = document.createElement('div');
        div.className = 'form-check form-check-inline';
        div.innerHTML = `
      <input class="form-check-input" type="checkbox" id="${id}" value="${val}">
      <label class="form-check-label" for="${id}">${val}</label>
    `;
        container.appendChild(div);
    });
}

function buildFilters(records) {
    // Themes
    buildCheckboxFilter(records,
        r => (r.topics || []).map(t => t.name),
        'theme-filters', 'theme-count');

    // Authors
    buildCheckboxFilter(records,
        r => r.authors.map(a => a.name),
        'author-filters', 'author-count');

    // Journals
    buildCheckboxFilter(records,
        r => [r.journal],
        'journal-filters', 'journal-count');

    // Keywords
    buildCheckboxFilter(records,
        r => r.keywords || [],
        'keyword-filters', 'keyword-count');
}

function getCheckedValues(containerId) {
    return Array.from(
        document.querySelectorAll(`#${containerId} input:checked`)
    ).map(i => i.value);
}

function applyFilters(records) {
    const q = document.getElementById('search').value.trim().toLowerCase();
    const start = document.getElementById('start-date').value;
    const end = document.getElementById('end-date').value;
    const themes = getCheckedValues('theme-filters');
    const authors = getCheckedValues('author-filters');
    const journals = getCheckedValues('journal-filters');
    const keywords = getCheckedValues('keyword-filters');
    const minC = parseInt(document.getElementById('min-cites').value) || 0;
    const maxC = parseInt(document.getElementById('max-cites').value) || Infinity;

    return records.filter(r => {
        if (q && !r.title.toLowerCase().includes(q)) return false;
        if (start && r.publication_date && r.publication_date < start) return false;
        if (end && r.publication_date && r.publication_date > end) return false;
        if (themes.length && !themes.some(t => (r.topics || []).map(x => x.name).includes(t))) return false;
        if (authors.length && !authors.some(a => r.authors.map(x => x.name).includes(a))) return false;
        if (journals.length && !journals.includes(r.journal)) return false;
        if (keywords.length && !keywords.some(k => (r.keywords || []).includes(k))) return false;
        const cites = (r.citation_counts || {}).forward || 0;
        if (cites < minC || cites > maxC) return false;
        return true;
    });
}

function renderTable(records) {
    const tbody = document.querySelector('#results tbody');
    tbody.innerHTML = '';
    if (!records.length) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center py-3">
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
      <td>${(r.citation_counts?.forward) || 0}</td>
      <td>${screening}</td>
      <td><button class="btn btn-sm btn-outline-secondary details-btn">Details</button></td>
      <td><button class="btn btn-sm btn-outline-secondary network-btn">Graph</button></td>
    `;
        tbody.appendChild(tr);
        tr.querySelector('.details-btn').onclick = () => showDetails(r);
        tr.querySelector('.network-btn').onclick = () => { currentSeed = r; showGraph(r); };
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
    currentSeed = seed;
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
            meta = normalize(raw);
        }

        elements.push({ data: { id, label: meta.title, meta } });
        await sleep(RECURSIVE_THROTTLE);

        if (level < depth) {
            // backward citations
            for (const ref of (meta.backward_citations || []).slice(0, 50)) {
                elements.push({ data: { source: id, target: ref } });
                await recurse(ref, level + 1);
            }
            // forward citations (capped)
            if (meta.citation_counts.forward) {
                const url = meta.cited_by_api_url + `&per_page=${MAX_PAGE}`;
                const resp = await fetch(url);
                if (resp.ok) {
                    const citers = (await resp.json()).results || [];
                    for (const c of citers.slice(0, 50)) {
                        elements.push({ data: { source: c.id, target: id } });
                        await recurse(c.id, level + 1);
                    }
                }
                await sleep(RECURSIVE_THROTTLE);
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
                selector: 'node', style: {
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

    cy.on('tap', 'node', evt => {
        const m = evt.target.data('meta');
        document.getElementById('node-info').textContent =
            `${m.title} (${m.id.split('/').pop()})`;
    });

    new bootstrap.Modal(document.getElementById('graphModal')).show();
}

function normalize(raw) {
    return {
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

(async () => {
    const recs = await loadData();
    buildFilters(recs);
    renderTable(recs);
    setupSearch(recs);
    document.getElementById('regenerate-btn').onclick = () => {
        if (currentSeed) showGraph(currentSeed);
    };
})();
