const DATA_URL = 'crp_openalex_enhanced.json';

async function loadData() {
    const resp = await fetch(DATA_URL);
    if (!resp.ok) throw new Error(`Fetch failed: ${resp.statusText}`);
    return (await resp.json()).records || [];
}

function buildThemeFilters(records) {
    const container = document.getElementById('theme-filters');
    const themes = new Set();
    records.forEach(r => r.topics.forEach(t => themes.add(t.name)));
    themes.forEach(name => {
        const id = `theme-${name.replace(/\W+/g, '')}`;
        const div = document.createElement('div');
        div.className = 'form-check form-check-inline';
        div.innerHTML = `
      <input class="form-check-input" type="checkbox" id="${id}" value="${name}">
      <label class="form-check-label" for="${id}">${name}</label>
    `;
        container.appendChild(div);
    });
}

function getSelectedThemes() {
    return Array
        .from(document.querySelectorAll('#theme-filters input:checked'))
        .map(i => i.value);
}

function applyFilters(records) {
    const q = document.getElementById('search').value.trim().toLowerCase();
    const start = document.getElementById('start-date').value;
    const end = document.getElementById('end-date').value;
    const themes = getSelectedThemes();

    return records.filter(r => {
        if (q && !r.title.toLowerCase().includes(q)) return false;
        if (start && r.publication_date < start) return false;
        if (end && r.publication_date > end) return false;
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
        tbody.innerHTML = '<tr><td colspan="7" class="text-center py-3">No records match filters.</td></tr>';
        return;
    }

    records.forEach(r => {
        const screening = (r.screening?.title_abstract) || 'pending';
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

        tr.querySelector('.details-btn').addEventListener('click', () => showDetails(r));
        tr.querySelector('.network-btn').addEventListener('click', () => showGraph(r));
    });
}

function setupSearch(records) {
    document.getElementById('search-btn').onclick = () =>
        renderTable(applyFilters(records));
}

function showDetails(r) {
    const mb = document.getElementById('modal-body');
    mb.innerHTML = `
    <h5>${r.title}</h5>
    <p><strong>Abstract:</strong> ${r.abstract || 'N/A'}</p>
    <p><strong>Topics:</strong> ${r.topics.map(t => t.name).join(', ')}</p>
    <p><strong>Keywords:</strong> ${r.keywords.join(', ')}</p>
    <p><strong>URL:</strong> <a href="${r.url || '#'}">${r.url || 'N/A'}</a></p>
  `;
    new bootstrap.Modal(document.getElementById('detailModal')).show();
}

function showGraph(r) {
    const elems = [];
    elems.push({ data: { id: r.id, label: r.title.slice(0, 30) + '…' } });
    r.backward_citations.forEach(ref => {
        elems.push({ data: { id: ref, label: 'Ref' } });
        elems.push({ data: { source: r.id, target: ref } });
    });
    r.forward_citations.forEach(c => {
        elems.push({ data: { id: c, label: 'Citer' } });
        elems.push({ data: { source: c, target: r.id } });
    });

    const cy = cytoscape({
        container: document.getElementById('cy'),
        elements: elems,
        style: [
            { selector: 'node', style: { 'label': 'data(label)', 'background-color': '#0d6efd', 'color': '#fff', 'text-valign': 'center', 'text-halign': 'center' } },
            { selector: 'edge', style: { 'width': 2, 'line-color': '#999' } }
        ],
        layout: { name: 'cose' }
    });

    new bootstrap.Modal(document.getElementById('graphModal')).show();
}

(async () => {
    const records = await loadData();
    buildThemeFilters(records);
    renderTable(records);
    setupSearch(records);
})();
