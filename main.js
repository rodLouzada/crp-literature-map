const DATA_URL = 'crp_openalex_enhanced.json';
const API_BASE = 'https://api.openalex.org/works/';

let currentSeed = null;  // hold the node currently displayed

async function loadData() {
    const resp = await fetch(DATA_URL);
    if (!resp.ok) throw new Error(`Fetch failed: ${resp.statusText}`);
    return (await resp.json()).records || [];
}

function buildThemeFilters(records) {
    const container = document.getElementById('theme-filters');
    const countBadge = document.getElementById('theme-count');
    const themes = new Set();

    records.forEach(r => (r.topics || []).forEach(t => themes.add(t.name)));
    countBadge.textContent = themes.size;
    if (!themes.size) return;

    themes.forEach(name => {
        const id = `theme-${name.replace(/\W+/g, '_')}`;
        const div = document.createElement('div');
        div.className = 'form-check form-check-inline';
        div.innerHTML = `
      <input
        class="form-check-input"
        type="checkbox"
        id="${id}"
        value="${name}"
      >
      <label class="form-check-label" for="${id}">${name}</label>
    `;
        container.appendChild(div);
    });
}

function getSelectedThemes() {
    return Array.from(
        document.querySelectorAll('#theme-filters input:checked')
    ).map(i => i.value);
}

function applyFilters(records) {
    const q = document.getElementById('search').value.trim().toLowerCase();
    const start = document.getElementById('start-date').value;
    const end = document.getElementById('end-date').value;
    const themes = getSelectedThemes();

    return records.filter(r => {
        if (q && !r.title.toLowerCase().includes(q)) return false;
        if (start && r.publication_date && r.publication_date < start) return false;
        if (end && r.publication_date && r.publication_date > end) return false;
        if (themes.length) {
            const names = (r.topics || []).map(t => t.name);
            if (!themes.some(t => names.includes(t))) return false;
        }
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
      <td>${(r.citation_counts?.forward) || 0}</td>
      <td>${screening}</td>
      <td>
        <button class="btn btn-sm btn-outline-secondary details-btn">
          Details
        </button>
      </td>
      <td>
        <button class="btn btn-sm btn-outline-secondary network-btn">
          Graph
        </button>
      </td>
    `;
        tbody.appendChild(tr);
        tr.querySelector('.details-btn')
            .addEventListener('click', () => showDetails(r));
        tr.querySelector('.network-btn')
            .addEventListener('click', () => {
                currentSeed = r;
                showGraph(r);
            });
    });
}

function setupSearch(records) {
    document.getElementById('search-btn').onclick = () =>
        renderTable(applyFilters(records));
}

async function fetchMetadata(id) {
    const local = id.split('/').pop();
    const resp = await fetch(API_BASE + local);
    if (!resp.ok) throw new Error(`API fetch failed: ${resp.statusText}`);
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
                publication_date: raw.publication_date,
                topics: raw.topics.map(t => ({ name: t.display_name })),
                keywords: (raw.keywords || []).map(k => k.display_name),
                url: raw.primary_location?.landing_page_url,
                backward_citations: raw.referenced_works || [],
                cited_by_api_url: raw.cited_by_api_url,
                citation_counts: {
                    backward: raw.referenced_works_count,
                    forward: raw.cited_by_count
                }
            };
        }

        elements.push({ data: { id, label: meta.title, meta } });

        if (level < depth) {
            // backward
            for (const ref of meta.backward_citations.slice(0, depth * 5)) {
                elements.push({ data: { source: id, target: ref } });
                await recurse(ref, level + 1);
            }
            // forward
            if (meta.citation_counts.forward) {
                const resp = await fetch(meta.cited_by_api_url + `&per_page=${depth * 5}`);
                const citers = (await resp.json()).results || [];
                for (const c of citers) {
                    elements.push({ data: { source: c.id, target: id } });
                    await recurse(c.id, level + 1);
                }
            }
        }
    }

    await recurse(seed.id, 1);

    // clear previous
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
                    'text-max-width': 80,
                    'font-size': 8,
                    'text-valign': 'center',
                }
            },
            {
                selector: 'edge',
                style: {
                    width: 2,
                    'line-color': '#999'
                }
            }
        ],
        layout: { name: 'cose' }
    });

    cy.on('tap', 'node', evt => {
        const meta = evt.target.data('meta');
        showDetails(meta);
        document.getElementById('node-info').textContent =
            `${meta.title} (${meta.id.split('/').pop()})`;
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

(async () => {
    const records = await loadData();
    buildThemeFilters(records);
    renderTable(records);
    setupSearch(records);

    // Regenerate button inside modal
    document.getElementById('regenerate-btn').onclick = () => {
        if (currentSeed) showGraph(currentSeed);
    };
})();
