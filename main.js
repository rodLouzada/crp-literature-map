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

    // build lookup map
    allRecords.forEach(r => recordMap[r.id] = r);

    buildThemeFilters(allRecords);
    buildStateFilters(allRecords);

    filteredRecords = allRecords.slice();
    renderTable();
    renderPagination();
    setupSearch();

    // Graph buttons in table
    document.querySelector('#results').addEventListener('click', e => {
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

    // Regenerate network depth
    document.getElementById('graph-regenerate')
        .addEventListener('click', () => {
            if (currentSeed) showGraph(currentSeed);
        });
})();

// Fetch JSON
async function loadData() {
    const resp = await fetch(DATA_URL);
    if (!resp.ok) throw new Error(`Fetch failed: ${resp.statusText}`);
    const json = await resp.json();
    return json.records || [];
}

// Build Theme checkboxes
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

// Build State checkboxes
function buildStateFilters(records) {
    const container = document.getElementById('state-filters');
    const badge = document.getElementById('state-count');
    const states = new Set();
    records.forEach(r => (r.states || []).forEach(s => states.add(s)));
    badge.textContent = states.size;
    states.forEach(name => {
        const id = `state-${name.replace(/\W+/g, '_')}`;
        const div = document.createElement('div');
        div.className = 'form-check form-check-inline';
        div.innerHTML = `
          <input class="form-check-input" type="checkbox" id="${id}" value="${name}">
          <label class="form-check-label" for="${id}">${name}</label>
        `;
        container.appendChild(div);
    });
}

// Get checked values
function getCheckedValues(containerId) {
    return Array.from(
        document.querySelectorAll(`#${containerId} input:checked`)
    ).map(i => i.value.toLowerCase());
}

// Apply all filters
function applyFilters() {
    const titleQ = (document.getElementById('search').value || '').trim().toLowerCase();
    const start = document.getElementById('start-date').value;
    const end = document.getElementById('end-date').value;
    const themes = getCheckedValues('theme-filters');
    const states = getCheckedValues('state-filters');
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
        if (states.length) {
            const snames = (r.states || []).map(s => s.toLowerCase());
            if (!states.some(s => snames.includes(s))) return false;
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

// Render paginated table
function renderTable() {
    const tbody = document.querySelector('#results tbody');
    tbody.innerHTML = '';
    const startIdx = (currentPage - 1) * pageSize;
    const pageRecs = filteredRecords.slice(startIdx, startIdx + pageSize);

    if (!pageRecs.length) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center py-3">
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

// Render pagination
function renderPagination() {
    const totalPages = Math.max(1, Math.ceil(filteredRecords.length / pageSize));
    const ul = document.getElementById('pagination');
    ul.innerHTML = '';

    function makeItem(label, disable, handler) {
        const li = document.createElement('li');
        li.className = `page-item${disable ? ' disabled' : ''}`;
        const btn = document.createElement('button');
        btn.className = 'page-link'; btn.textContent = label;
        if (!disable) btn.addEventListener('click', handler);
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
        btn.className = 'page-link'; btn.textContent = p;
        btn.addEventListener('click', () => {
            currentPage = p; renderTable(); renderPagination();
        });
        li.appendChild(btn);
        ul.appendChild(li);
    }

    ul.appendChild(makeItem('Next', currentPage === totalPages, () => {
        currentPage++; renderTable(); renderPagination();
    }));
}

// Hook up Search
function setupSearch() {
    document.getElementById('search-btn').addEventListener('click', applyFilters);
}

// Details modal
function showDetails(r) {
    const mb = document.getElementById('modal-body');
    mb.innerHTML = `
      <h5>${r.title}</h5>
      <p><strong>ID:</strong> ${r.id.split('/').pop()}</p>
      <p><strong>Publication Date:</strong> ${r.publication_date || 'N/A'}</p>
      <p><strong>Topics:</strong> ${(r.topics || []).map(t => t.name).join(', ')}</p>
      <p><strong>Keywords:</strong> ${(r.keywords || []).join(', ')}</p>
      <p><strong>States:</strong> ${(r.states || []).join(', ')}</p>
      <p><strong>URL:</strong> <a href="${r.url || '#'}">${r.url || 'N/A'}</a></p>
    `;
    new bootstrap.Modal(document.getElementById('detailModal')).show();
}

// Citation network (unchanged)
function showGraph(seed) {
    // 1) Read the depth input (how many hops out to go)
    const depthInput = parseInt(document.getElementById('graph-depth').value, 10);
    const depth = isNaN(depthInput) ? 1 : depthInput;

    // 2) Prepare arrays & sets
    const nodeEls = [];
    const edgeEls = [];
    const visitedNodes = new Set();
    const visitedEdges = new Set();

    // 3) Helpers to add nodes/edges only once
    function addNode(id, label, type, meta) {
        if (visitedNodes.has(id)) return;
        visitedNodes.add(id);
        nodeEls.push({ data: { id, label, metaType: type, meta } });
    }

    function addEdge(source, target) {
        const eid = `${source}->${target}`;
        if (visitedEdges.has(eid)) return;
        visitedEdges.add(eid);
        edgeEls.push({ data: { id: eid, source, target } });
    }

    // 4) Recursive walk up to `depth` levels
    function recurse(nodeId, level) {
        if (level >= depth) return;
        const meta = recordMap[nodeId];
        if (!meta) return;

        // papers this one cites (backward)
        (meta.backward_citations || []).forEach(refId => {
            if (!recordMap[refId] || refId === nodeId) return;
            addNode(refId, recordMap[refId].title, 'backward', recordMap[refId]);
            addEdge(nodeId, refId);
            recurse(refId, level + 1);
        });

        // papers that cite this one (forward)
        (meta.forward_citations || []).forEach(citId => {
            if (!recordMap[citId] || citId === nodeId) return;
            addNode(citId, recordMap[citId].title, 'forward', recordMap[citId]);
            addEdge(citId, nodeId);
            recurse(citId, level + 1);
        });
    }

    // 5) Seed node + kick off recursion
    addNode(seed.id, seed.title, 'seed', seed);
    recurse(seed.id, 0);

    // 6) Combine elements
    const elements = nodeEls.concat(edgeEls);
    const container = document.getElementById('cy');
    container.innerHTML = '';

    // 7) Initialize Cytoscape with static, larger node sizes
    const cy = cytoscape({
        container,
        elements,
        style: [
            {
                selector: 'node',
                style: {
                    width: 90,
                    height: 90,
                    label: 'data(label)',
                    'text-wrap': 'wrap',
                    'text-max-width': 150,
                    'font-size': 8,
                    'text-valign': 'center',
                    color: '#000'
                }
            },
            { selector: 'node[metaType="seed"]', style: { 'background-color': '#0d6efd' } },
            { selector: 'node[metaType="backward"]', style: { 'background-color': 'green' } },
            { selector: 'node[metaType="forward"]', style: { 'background-color': 'yellow' } },
            { selector: 'edge', style: { width: 2, 'line-color': '#999' } }
        ]
    });

    // 8) Improved spacing layout
    cy.layout({
        name: 'cose',
        idealEdgeLength: 120,
        nodeOverlap: 40,
        nodeRepulsion: 8000,
        gravity: 0.1,
        numIter: 1000,
        tile: true
    }).run();

    // 9) Append connection count to each node’s label
    cy.nodes().forEach(node => {
        const deg = node.degree();
        const title = node.data('meta').title;
        node.data('label', `${title} (${deg})`);
    });

    // 10) Click handler to update selected-node display
    cy.on('tap', 'node', evt => {
        const m = evt.target.data('meta');
        document.getElementById('node-info').textContent = m.title;
    });
}

