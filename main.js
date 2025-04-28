const DATA_URL = 'crp_openalex_enhanced.json';

let allRecords = [];
let filteredRecords = [];
let recordMap = {};
let currentPage = 1;
const pageSize = 10;

; (async () => {
    // Load data and build lookup map
    const records = await loadData();
    allRecords = records;
    records.forEach(r => recordMap[r.id] = r);

    // Build UI
    buildThemeFilters(records);
    setupSearch(records);

    // Initial render (no filters)
    filteredRecords = allRecords;
    renderTable();
    renderPagination();
})();

// Fetch JSON dataset
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

function getCheckedValues(containerId) {
    return Array.from(
        document.querySelectorAll(`#${containerId} input:checked`)
    ).map(i => i.value.toLowerCase());
}

function applyFilters() {
    const titleQ = document.getElementById('search').value.trim().toLowerCase();
    const start = document.getElementById('start-date').value;
    const end = document.getElementById('end-date').value;
    const themes = getCheckedValues('theme-filters');
    const authorQ = document.getElementById('author-filter').value.trim().toLowerCase();
    const journalQ = document.getElementById('journal-filter').value.trim().toLowerCase();
    const keywordQ = document.getElementById('keyword-filter').value.trim().toLowerCase();
    const minC = parseInt(document.getElementById('min-cites').value) || 0;
    const maxC = parseInt(document.getElementById('max-cites').value) || Infinity;

    filteredRecords = allRecords.filter(r => {
        if (titleQ && !r.title.toLowerCase().includes(titleQ)) return false;
        if (start && r.publication_date && r.publication_date < start) return false;
        if (end && r.publication_date && r.publication_date > end) return false;

        if (themes.length) {
            const tnames = (r.topics || []).map(t => t.name.toLowerCase());
            if (!themes.some(t => tnames.includes(t))) return false;
        }
        if (authorQ) {
            const auths = r.authors.map(a => a.name.toLowerCase()).join(' ');
            if (!auths.includes(authorQ)) return false;
        }
        if (journalQ && !(r.journal || '').toLowerCase().includes(journalQ)) return false;
        if (keywordQ) {
            const kws = (r.keywords || []).map(k => k.toLowerCase()).join(' ');
            if (!kws.includes(keywordQ)) return false;
        }
        const cites = (r.citation_counts?.forward) || 0;
        if (cites < minC || cites > maxC) return false;

        return true;
    });

    currentPage = 1;
    renderTable();
    renderPagination();
}

function renderTable() {
    const tbody = document.querySelector('#results tbody');
    tbody.innerHTML = '';

    const startIdx = (currentPage - 1) * pageSize;
    const pageRecords = filteredRecords.slice(startIdx, startIdx + pageSize);

    if (!pageRecords.length) {
        tbody.innerHTML = `
      <tr><td colspan="7" class="text-center py-3">
        No records match filters.
      </td></tr>`;
        return;
    }

    pageRecords.forEach(r => {
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

function renderPagination() {
    const totalPages = Math.ceil(filteredRecords.length / pageSize) || 1;
    const ul = document.getElementById('pagination');
    ul.innerHTML = '';

    // Previous
    const prevLi = document.createElement('li');
    prevLi.className = `page-item ${currentPage === 1 ? 'disabled' : ''}`;
    prevLi.innerHTML = `<button class="page-link">Previous</button>`;
    prevLi.onclick = () => {
        if (currentPage > 1) {
            currentPage--;
            renderTable();
            renderPagination();
        }
    };
    ul.appendChild(prevLi);

    // Numbers
    for (let p = 1; p <= totalPages; p++) {
        const li = document.createElement('li');
        li.className = `page-item ${p === currentPage ? 'active' : ''}`;
        li.innerHTML = `<button class="page-link">${p}</button>`;
        li.onclick = () => {
            currentPage = p;
            renderTable();
            renderPagination();
        };
        ul.appendChild(li);
    }

    // Next
    const nextLi = document.createElement('li');
    nextLi.className = `page-item ${currentPage === totalPages ? 'disabled' : ''}`;
    nextLi.innerHTML = `<button class="page-link">Next</button>`;
    nextLi.onclick = () => {
        if (currentPage < totalPages) {
            currentPage++;
            renderTable();
            renderPagination();
        }
    };
    ul.appendChild(nextLi);
}

function setupSearch(records) {
    document.getElementById('search-btn').onclick = applyFilters;
}

// Show details modal
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

// Show graph modal (uses local JSON for recursion)
function showGraph(seed) {
    const depth = parseInt(document.getElementById('modal-graph-level').value, 10) || 1;
    document.getElementById('node-info').textContent =
        `${seed.title} (${seed.id.split('/').pop()})`;

    const elements = [];
    const visited = new Set();

    function recurse(id, level) {
        if (level > depth || visited.has(id)) return;
        visited.add(id);

        const meta = recordMap[id];
        if (!meta) return;
        elements.push({ data: { id, label: meta.title, meta } });

        if (level < depth) {
            (meta.backward_citations || []).slice(0, 50)
                .forEach(ref => {
                    elements.push({ data: { source: id, target: ref } });
                    recurse(ref, level + 1);
                });
            (meta.forward_citations || []).slice(0, 50)
                .forEach(cit => {
                    elements.push({ data: { source: cit, target: id } });
                    recurse(cit, level + 1);
                });
        }
    }

    recurse(seed.id, 1);
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
            { selector: 'edge', style: { 'width': 2, 'line-color': '#999' } }
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
