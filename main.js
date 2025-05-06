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
    const depthInput = parseInt(document.getElementById('graph-depth').value, 10);
    const depth = isNaN(depthInput) ? 1 : depthInput;

    const nodeEls = [];
    const edgeEls = [];
    const visitedNodes = new Set();
    const visitedEdges = new Set();

    function addNode(id, label, type, meta) {
        if (visitedNodes.has(id)) return;
        visitedNodes.add(id);
        nodeEls.push({ data: { id, label, metaType: type, meta } });
    }

    function addEdge(src, tgt) {
        const eid = `${src}->${tgt}`;
        if (visitedEdges.has(eid)) return;
        visitedEdges.add(eid);
        edgeEls.push({ data: { id: eid, source: src, target: tgt } });
    }

    // 1) level‑1 neighbors only
    addNode(seed.id, seed.title, 'seed', seed);
    const firstNeighbors = [];

    (seed.backward_citations || []).forEach(rid => {
        if (!recordMap[rid]) return;
        addNode(rid, recordMap[rid].title, 'backward', recordMap[rid]);
        addEdge(seed.id, rid);
        firstNeighbors.push(rid);
    });
    (seed.forward_citations || []).forEach(cid => {
        if (!recordMap[cid]) return;
        addNode(cid, recordMap[cid].title, 'forward', recordMap[cid]);
        addEdge(cid, seed.id);
        firstNeighbors.push(cid);
    });

    // 2) deeper levels if requested
    function recurse(nodeId, level) {
        if (level > depth) return;
        const m = recordMap[nodeId];
        if (!m) return;

        (m.backward_citations || []).forEach(rid => {
            if (!recordMap[rid]) return;
            addNode(rid, recordMap[rid].title, 'backward', recordMap[rid]);
            addEdge(nodeId, rid);
            recurse(rid, level + 1);
        });
        (m.forward_citations || []).forEach(cid => {
            if (!recordMap[cid]) return;
            addNode(cid, recordMap[cid].title, 'forward', recordMap[cid]);
            addEdge(cid, nodeId);
            recurse(cid, level + 1);
        });
    }

    if (depth > 1) {
        firstNeighbors.forEach(nid => recurse(nid, 2));
    }

    // 3) render
    const elements = nodeEls.concat(edgeEls);
    const container = document.getElementById('cy');
    container.innerHTML = '';
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
        ],
        layout: {
            name: 'cose',
            idealEdgeLength: 120,
            nodeOverlap: 40,
            nodeRepulsion: 8000,
            gravity: 0.1,
            numIter: 1000,
            tile: true
        }
    });

    // 4) click vs Ctrl+click
    cy.on('tap', 'node', evt => {
        const m = evt.target.data('meta');
        if (evt.originalEvent.ctrlKey && m.url) {
            window.open(m.url, '_blank');
        } else {
            document.getElementById('node-info').textContent = m.title;
        }
    });

    // 5) CSV download
    document.getElementById('download-csv').onclick = () => {
        const rows = [['id', 'title', 'url', 'backward_count', 'forward_count']];
        cy.nodes().forEach(n => {
            const m = n.data('meta');
            rows.push([
                m.id,
                m.title.replace(/"/g, '""'),
                m.url || '',
                m.citation_counts?.backward || 0,
                m.citation_counts?.forward || 0
            ]);
        });
        const csv = rows.map(r => `"${r.join('","')}"`).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `${seed.id.split('/').pop()}-network.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };
}

