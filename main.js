const DATA_URL = 'crp_openalex_enhanced.json';

let allRecords = [];
let filteredRecords = [];
let recordMap = {};
let currentPage = 1;
const pageSize = 10;

// On load: fetch data, build map, render initial table & pagination
; (async () => {
    allRecords = await loadData();
    allRecords.forEach(r => recordMap[r.id] = r);

    buildThemeFilters(allRecords);
    filteredRecords = allRecords.slice();

    renderTable();
    renderPagination();
    setupSearch();

    document.getElementById('regenerate-btn').onclick = () => {
        if (currentSeed) showGraph(currentSeed);
    };
})();

// Fetch the JSON dataset
async function loadData() {
    const resp = await fetch(DATA_URL);
    if (!resp.ok) throw new Error(`Fetch failed: ${resp.statusText}`);
    return (await resp.json()).records || [];
}

// Build the Theme checkboxes
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

// Utility: get checked values from a container
function getCheckedValues(containerId) {
    return Array.from(
        document.querySelectorAll(`#${containerId} input:checked`)
    ).map(i => i.value.toLowerCase());
}

// Apply filters from all input fields, update filteredRecords, reset page
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
        // Title
        if (titleQ && (!r.title || !r.title.toLowerCase().includes(titleQ))) return false;

        // Date
        if (start && r.publication_date < start) return false;
        if (end && r.publication_date > end) return false;

        // Themes
        if (themes.length) {
            const tnames = (r.topics || []).map(t => t.name.toLowerCase());
            if (!themes.some(t => tnames.includes(t))) return false;
        }

        // Author
        if (authorQ) {
            // join only non-null names, then lowercase
            const authString = r.authors
                .map(a => a.name || '')
                .filter(n => n)
                .join(' ')
                .toLowerCase();
            if (!authString.includes(authorQ)) return false;
        }

        // Journal
        if (journalQ) {
            const jname = (r.journal || '').toLowerCase();
            if (!jname.includes(journalQ)) return false;
        }

        // Keyword
        if (keywordQ) {
            const kwString = (r.keywords || [])
                .filter(k => typeof k === 'string')
                .map(k => k.toLowerCase())
                .join(' ');
            if (!kwString.includes(keywordQ)) return false;
        }

        // Citation count
        const cites = (r.citation_counts?.forward) || 0;
        if (cites < minC || cites > maxC) return false;

        return true;
    });

    currentPage = 1;
    renderTable();
    renderPagination();
}


// Render the current page of filteredRecords
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

// Render pagination controls
function renderPagination() {
    const totalPages = Math.max(1, Math.ceil(filteredRecords.length / pageSize));
    const ul = document.getElementById('pagination');
    ul.innerHTML = '';

    // Previous
    const prevLi = document.createElement('li');
    prevLi.className = `page-item${currentPage === 1 ? ' disabled' : ''}`;
    const prevBtn = document.createElement('button');
    prevBtn.className = 'page-link';
    prevBtn.textContent = 'Previous';
    prevBtn.onclick = () => {
        if (currentPage > 1) {
            currentPage--;
            renderTable();
            renderPagination();
        }
    };
    prevLi.appendChild(prevBtn);
    ul.appendChild(prevLi);

    // Pages
    for (let p = 1; p <= totalPages; p++) {
        const li = document.createElement('li');
        li.className = `page-item${p === currentPage ? ' active' : ''}`;
        const btn = document.createElement('button');
        btn.className = 'page-link';
        btn.textContent = p;
        btn.onclick = () => {
            currentPage = p;
            renderTable();
            renderPagination();
        };
        li.appendChild(btn);
        ul.appendChild(li);
    }

    // Next
    const nextLi = document.createElement('li');
    nextLi.className = `page-item${currentPage === totalPages ? ' disabled' : ''}`;
    const nextBtn = document.createElement('button');
    nextBtn.className = 'page-link';
    nextBtn.textContent = 'Next';
    nextBtn.onclick = () => {
        if (currentPage < totalPages) {
            currentPage++;
            renderTable();
            renderPagination();
        }
    };
    nextLi.appendChild(nextBtn);
    ul.appendChild(nextLi);
}

// Wire up the Search button
function setupSearch() {
    document.getElementById('search-btn')
        .addEventListener('click', applyFilters);
}

// Show paper details in modal
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


// Show citation network using only local JSON data
function showGraph(seed) {
    const depth = parseInt(
        document.getElementById('modal-graph-level').value,
        10
    ) || 1;

    // Update the "Selected Node" line (initially seed)
    document.getElementById('node-info').textContent =
        seed.title;

    const elements = [];
    const visited = new Set();

    function recurse(id, level, type) {
        if (level > depth || visited.has(id)) return;
        visited.add(id);

        const meta = recordMap[id];
        if (!meta) return;

        // 1) Add the node (only once)
        elements.push({
            data: {
                id,
                label: meta.title,
                meta,
                metaType: type   // "backward" or "forward"
            }
        });

        // 2) If we still have depth remaining, add edges + recurse
        if (level < depth) {
            // backward citations (this paper cites these older ones)
            (meta.backward_citations || [])
                .slice(0, 50)
                .forEach(refMeta => {
                    const refId = refMeta.id;
                    // create a unique edge id
                    elements.push({
                        data: {
                            id: `${id}->${refId}`,
                            source: id,
                            target: refId
                        }
                    });
                    recurse(refId, level + 1, 'backward');
                });

            // forward citations (these newer papers cite this one)
            (meta.forward_citations || [])
                .slice(0, 50)
                .forEach(citMeta => {
                    const citId = citMeta.id;
                    elements.push({
                        data: {
                            id: `${citId}->${id}`,
                            source: citId,
                            target: id
                        }
                    });
                    recurse(citId, level + 1, 'forward');
                });
        }
    }

    // kick off recursion from the seed (treat it as both)
    recurse(seed.id, 1, 'seed');

    // clear out any old graph
    const container = document.getElementById('cy');
    container.innerHTML = '';

    // initialize Cytoscape
    const cy = cytoscape({
        container,
        elements,
        style: [
            {
                selector: 'node',
                style: {
                    'label': 'data(label)',
                    'text-wrap': 'wrap',
                    'text-max-width': 120,
                    'font-size': 8,
                    'text-valign': 'center',
                    'text-outline-width': 0,
                    'color': '#000'
                }
            },
            {
                selector: 'node[metaType = "backward"]',
                style: {
                    'background-color': 'green'
                }
            },
            {
                selector: 'node[metaType = "forward"]',
                style: {
                    'background-color': 'orange'
                }
            },
            {
                selector: 'node[metaType = "seed"]',
                style: {
                    'background-color': '#0d6efd'  // keep seed blue
                }
            },
            {
                selector: 'edge',
                style: {
                    'width': 1.5,
                    'line-color': '#999'
                }
            }
        ],
        layout: { name: 'cose' }
    });

    // size nodes by their degree (more connections → larger)
    cy.nodes().forEach(node => {
        const deg = node.degree();
        // base size 20px + 5px per connection
        const size = 20 + deg * 5;
        node.style({
            'width': size,
            'height': size
        });
    });

    // clicking any node updates the Selected Node text to the paper title
    cy.on('tap', 'node', evt => {
        const m = evt.target.data('meta');
        document.getElementById('node-info').textContent = m.title;
    });

    // show the modal
    new bootstrap.Modal(document.getElementById('graphModal')).show();
}


