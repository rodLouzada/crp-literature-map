// main.js
const DATA_URL = 'crp_openalex_enhanced.json';

let allRecords = [];
let filteredRecords = [];
let recordMap = {};
let currentPage = 1;
const pageSize = 10;
let currentSeed = null;

(async function () {
    try {
        allRecords = await loadData();
    } catch (err) {
        console.error('Failed to load data:', err);
        return;
    }

    // build a lookup map
    allRecords.forEach(r => recordMap[r.id] = r);

    buildThemeFilters(allRecords);
    filteredRecords = allRecords.slice();

    renderTable();
    renderPagination();
    setupSearch();

    // Show graph when a "Graph" button is clicked
    document.querySelector('#results').addEventListener('click', function (e) {
        if (e.target.classList.contains('network-btn')) {
            const tr = e.target.closest('tr');
            const rows = Array.from(tr.parentNode.children);
            const idx = (currentPage - 1) * pageSize + rows.indexOf(tr);
            currentSeed = filteredRecords[idx];
            showGraph(currentSeed);
            document.getElementById('graphPanel').classList.remove('d-none');
        }
    });

    // Close graph panel
    document.getElementById('close-graph')
        .addEventListener('click', () => {
            document.getElementById('graphPanel').classList.add('d-none');
        });

    // Regenerate network at new depth
    document.getElementById('graph-regenerate')
        .addEventListener('click', () => {
            if (currentSeed) showGraph(currentSeed);
        });
})();

// Fetch the JSON dataset
async function loadData() {
    const resp = await fetch(DATA_URL);
    if (!resp.ok) {
        throw new Error(`Fetch failed: ${resp.statusText}`);
    }
    const data = await resp.json();
    return data.records || [];
}

// Build the theme checkboxes
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

// Utility to grab checked values
function getCheckedValues(containerId) {
    return Array
        .from(document.querySelectorAll(`#${containerId} input:checked`))
        .map(i => i.value.toLowerCase());
}

// Apply all filters and re-render
function applyFilters() {
    const titleQ = (document.getElementById('search').value || '').trim().toLowerCase();
    const start = document.getElementById('start-date').value;
    const end = document.getElementById('end-date').value;
    const themes = getCheckedValues('theme-filters');
    const authorQ = (document.getElementById('author-filter').value || '').trim().toLowerCase();
    const journalQ = (document.getElementById('journal-filter').value || '').trim().toLowerCase();
    const keywordQ = (document.getElementById('keyword-filter').value || '').trim().toLowerCase();
    const minC = parseInt(document.getElementById('min-cites').value) || 0;
    const maxC = parseInt(document.getElementById('max-cites').value) || Infinity;

    filteredRecords = allRecords.filter(r => {
        if (titleQ && !r.title?.toLowerCase().includes(titleQ)) return false;
        if (start && r.publication_date < start) return false;
        if (end && r.publication_date > end) return false;

        if (themes.length) {
            const tnames = (r.topics || []).map(t => t.name.toLowerCase());
            if (!themes.some(t => tnames.includes(t))) return false;
        }

        if (authorQ) {
            const auths = r.authors.map(a => a.name).join(' ').toLowerCase();
            if (!auths.includes(authorQ)) return false;
        }
        if (journalQ && !r.journal?.toLowerCase().includes(journalQ)) return false;

        if (keywordQ) {
            const kws = (r.keywords || []).join(' ').toLowerCase();
            if (!kws.includes(keywordQ)) return false;
        }

        const cites = r.citation_counts?.forward || 0;
        if (cites < minC || cites > maxC) return false;

        return true;
    });

    currentPage = 1;
    renderTable();
    renderPagination();
}

// Render the paginated table
function renderTable() {
    const tbody = document.querySelector('#results tbody');
    tbody.innerHTML = '';

    const startIdx = (currentPage - 1) * pageSize;
    const pageRecs = filteredRecords.slice(startIdx, startIdx + pageSize);

    if (!pageRecs.length) {
        tbody.innerHTML = `
      <tr><td colspan="7" class="text-center py-3">
        No records match filters.
      </td></tr>`;
        return;
    }

    pageRecs.forEach(r => {
        const screening = r.screening?.title_abstract || 'Not screened';
        const tr = document.createElement('tr');
        tr.innerHTML = `
      <td><a href="${r.url || '#'}" target="_blank">${r.title}</a></td>
      <td>${r.publication_year || ''}</td>
      <td>${r.authors.map(a => a.name).join(', ')}</td>
      <td>${r.citation_counts.forward || 0}</td>
      <td>${screening}</td>
      <td><button class="btn btn-sm btn-outline-secondary details-btn">Details</button></td>
      <td><button class="btn btn-sm btn-outline-secondary network-btn">Graph</button></td>
    `;
        tbody.appendChild(tr);
        tr.querySelector('.details-btn').addEventListener('click', () => showDetails(r));
    });
}

// Render the pagination controls
function renderPagination() {
    const totalPages = Math.max(1, Math.ceil(filteredRecords.length / pageSize));
    const ul = document.getElementById('pagination');
    ul.innerHTML = '';

    function makeItem(label, disabled, handler) {
        const li = document.createElement('li');
        li.className = `page-item${disabled ? ' disabled' : ''}`;
        const btn = document.createElement('button');
        btn.className = 'page-link';
        btn.textContent = label;
        if (!disabled) btn.addEventListener('click', handler);
        li.appendChild(btn);
        return li;
    }

    ul.appendChild(makeItem('Previous', currentPage === 1, () => {
        currentPage--; renderTable(); renderPagination();
    }));

    for (let p = 1; p <= totalPages; p++) {
        const li = document.createElement('li');
        li.className = `page-item${p === currentPage ? ' active' : ''}`;
        const btn = document.createElement('button');
        btn.className = 'page-link';
        btn.textContent = p;
        btn.addEventListener('click', () => {
            currentPage = p;
            renderTable();
            renderPagination();
        });
        li.appendChild(btn);
        ul.appendChild(li);
    }

    ul.appendChild(makeItem('Next', currentPage === totalPages, () => {
        currentPage++; renderTable(); renderPagination();
    }));
}

// Hook up the search button
function setupSearch() {
    document.getElementById('search-btn')
        .addEventListener('click', applyFilters);
}

// Show the details modal
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

// Draw the inline citation network
function showGraph(seed) {
    const depth = parseInt(document.getElementById('graph-depth').value, 10) || 1;
    const elements = [];
    const visitedNodes = new Set();
    const visitedEdges = new Set();

    // add seed node
    elements.push({
        data: {
            id: seed.id,
            label: seed.title,
            metaType: 'seed',
            meta: seed
        }
    });
    visitedNodes.add(seed.id);

    // recursive expansion
    function recurse(nodeId, level) {
        if (level > depth) return;
        const meta = recordMap[nodeId];
        if (!meta) return;

        // papers this node cites (backward)
        (meta.backward_citations || []).forEach(refId => {
            const edgeId = `${nodeId}->${refId}`;
            if (!visitedEdges.has(edgeId)) {
                visitedEdges.add(edgeId);
                if (!visitedNodes.has(refId) && recordMap[refId]) {
                    const child = recordMap[refId];
                    elements.push({
                        data: {
                            id: refId,
                            label: child.title,
                            metaType: 'backward',
                            meta: child
                        }
                    });
                    visitedNodes.add(refId);
                }
                elements.push({
                    data: {
                        id: edgeId,
                        source: nodeId,
                        target: refId
                    }
                });
            }
            recurse(refId, level + 1);
        });

        // papers that cite this node (forward)
        (meta.forward_citations || []).forEach(citId => {
            const edgeId = `${citId}->${nodeId}`;
            if (!visitedEdges.has(edgeId)) {
                visitedEdges.add(edgeId);
                if (!visitedNodes.has(citId) && recordMap[citId]) {
                    const child = recordMap[citId];
                    elements.push({
                        data: {
                            id: citId,
                            label: child.title,
                            metaType: 'forward',
                            meta: child
                        }
                    });
                    visitedNodes.add(citId);
                }
                elements.push({
                    data: {
                        id: edgeId,
                        source: citId,
                        target: nodeId
                    }
                });
            }
            recurse(citId, level + 1);
        });
    }

    recurse(seed.id, 0);

    // render
    const container = document.getElementById('cy');
    container.innerHTML = '';
    const cy = cytoscape({
        container,
        elements,
        style: [
            {
                selector: 'node',
                style: {
                    label: 'data(label)',
                    'text-wrap': 'wrap',
                    'text-max-width': 150,
                    'font-size': 6,
                    'text-valign': 'center',
                    color: '#000'
                }
            },
            {
                selector: 'node[metaType="seed"]',
                style: { 'background-color': '#0d6efd' }
            },
            {
                selector: 'node[metaType="backward"]',
                style: { 'background-color': 'green' }
            },
            {
                selector: 'node[metaType="forward"]',
                style: { 'background-color': 'yellow' }
            },
            {
                selector: 'edge',
                style: {
                    width: 1.5,
                    'line-color': '#999'
                }
            }
        ],
        layout: { name: 'cose' }
    });

    // increase node sizes based on degree
    cy.nodes().forEach(node => {
        const deg = node.degree();
        const size = 30 + deg * 10;
        node.style({ width: size, height: size });
    });

    // click updates selected node title
    cy.on('tap', 'node', evt => {
        const m = evt.target.data('meta');
        document.getElementById('node-info').textContent = m.title;
    });
}
