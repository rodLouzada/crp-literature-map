const DATA_URL = 'crp_openalex_enhanced.json';

async function loadData() {
    const resp = await fetch(DATA_URL);
    if (!resp.ok) throw new Error(`Fetch failed: ${resp.statusText}`);
    const json = await resp.json();
    return json.records || [];
}

function buildThemeFilters(records) {
    const container = document.getElementById('theme-filters');
    const themes = new Set();
    records.forEach(r => r.topics.forEach(t => themes.add(t.name)));
    themes.forEach(name => {
        const id = `theme-${name.replace(/\W+/g, '')}`;
        const cb = document.createElement('input');
        cb.type = 'checkbox'; cb.id = id; cb.value = name;
        const lbl = document.createElement('label');
        lbl.htmlFor = id; lbl.textContent = name;
        container.appendChild(cb);
        container.appendChild(lbl);
        container.appendChild(document.createTextNode(' '));
    });
}

function getSelectedThemes() {
    return Array.from(document.querySelectorAll('#theme-filters input:checked'))
        .map(i => i.value);
}

function applyFilters(records) {
    const q = document.getElementById('search').value.trim().toLowerCase();
    const start = document.getElementById('start-date').value;
    const end = document.getElementById('end-date').value;
    const themes = getSelectedThemes();

    return records.filter(r => {
        // title filter
        if (q && !r.title.toLowerCase().includes(q)) return false;
        // date filter
        if (start && r.publication_date < start) return false;
        if (end && r.publication_date > end) return false;
        // theme filter
        if (themes.length) {
            const names = r.topics.map(t => t.name);
            if (!themes.some(t => names.includes(t))) return false;
        }
        return true;
    });
}

function renderTable(records) {
    const tbody = document.querySelector('#results tbody');
    tbody.innerHTML = '';
    if (!records.length) {
        tbody.innerHTML = '<tr><td colspan="7">No records match filters.</td></tr>';
        return;
    }
    records.forEach(r => {
        const tr = document.createElement('tr');
        // screening status fallback to "pending"
        const screening = (r.screening && r.screening.title_abstract) || 'pending';
        tr.innerHTML = `
      <td><a href="${r.url || '#'}" target="_blank">${r.title}</a></td>
      <td>${r.publication_year || ''}</td>
      <td>${r.authors.map(a => a.name).join(', ')}</td>
      <td>${(r.citation_counts || {}).forward || 0}</td>
      <td>${screening}</td>
      <td><button class="details-btn">Details</button></td>
      <td><button class="network-btn">Graph</button></td>
    `;
        // attach handlers
        tr.querySelector('.details-btn').addEventListener('click', () => showDetails(r));
        tr.querySelector('.network-btn').addEventListener('click', () => showGraph(r));
        tbody.appendChild(tr);
    });
}

function setupSearch(records) {
    document.getElementById('search-btn').onclick = () =>
        renderTable(applyFilters(records));
}

function showDetails(r) {
    const md = document.getElementById('detail-modal');
    const mb = document.getElementById('modal-body');
    mb.innerHTML = `
    <h3>${r.title}</h3>
    <p><strong>Abstract:</strong> ${r.abstract || 'N/A'}</p>
    <p><strong>Topics:</strong> ${r.topics.map(t => t.name).join(', ')}</p>
    <p><strong>Keywords:</strong> ${r.keywords.join(', ')}</p>
    <p><strong>URL:</strong> <a href="${r.url || '#'}">${r.url || 'N/A'}</a></p>
  `;
    md.style.display = 'flex';
}

function showGraph(r) {
    const gm = document.getElementById('graph-modal');
    gm.style.display = 'flex';
    // build cytoscape data
    const elements = [];
    // central node
    elements.push({ data: { id: r.id, label: 'This Paper' } });
    // backward edges
    r.backward_citations.forEach(ref => {
        elements.push({ data: { id: ref, label: 'Ref', parent: null } });
        elements.push({ data: { source: r.id, target: ref } });
    });
    // forward edges
    r.forward_citations.forEach(c => {
        elements.push({ data: { id: c, label: 'Citer', parent: null } });
        elements.push({ data: { source: c, target: r.id } });
    });
    cytoscape({
        container: document.getElementById('cy'),
        elements,
        style: [
            { selector: 'node', style: { 'label': 'data(label)', 'text-valign': 'center', 'background-color': '#68a0b0' } },
            { selector: 'edge', style: { 'width': 2, 'line-color': '#ccc', 'curve-style': 'bezier' } }
        ],
        layout: { name: 'cose' }
    });
}

// Modal close handlers
document.querySelector('.close').onclick = () =>
    document.getElementById('detail-modal').style.display = 'none';
document.querySelector('.close-graph').onclick = () =>
    document.getElementById('graph-modal').style.display = 'none';

(async () => {
    const records = await loadData();
    buildThemeFilters(records);
    renderTable(records);
    setupSearch(records);
})();
