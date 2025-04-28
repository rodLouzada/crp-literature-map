// Path to your JSON file
const DATA_URL = 'crp_openalex_enhanced.json';

async function loadData() {
    const resp = await fetch(DATA_URL);
    if (!resp.ok) {
        console.error(`Failed to fetch ${DATA_URL}:`, resp.statusText);
        return [];
    }
    const json = await resp.json();
    return json.records || [];
}

function renderTable(records) {
    const tbody = document.querySelector('#results tbody');
    tbody.innerHTML = '';  // clear existing rows

    if (records.length === 0) {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td colspan="4">No records found.</td>`;
        tbody.appendChild(tr);
        return;
    }

    records.forEach(r => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
      <td><a href="${r.url || '#'}" target="_blank">${r.title}</a></td>
      <td>${r.publication_year || ''}</td>
      <td>${r.authors.map(a => a.name).join(', ')}</td>
      <td>${(r.citation_counts || {}).forward || 0}</td>
    `;
        tbody.appendChild(tr);
    });
}

function setupSearch(records) {
    document.getElementById('search-btn').addEventListener('click', () => {
        const q = document.getElementById('search').value.trim().toLowerCase();
        const filtered = records.filter(r =>
            r.title.toLowerCase().includes(q)
        );
        renderTable(filtered);
    });
}

(async () => {
    const records = await loadData();
    renderTable(records);
    setupSearch(records);
})();
