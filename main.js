const DATA_URL = 'crp_openalex_enhanced.json';

let allRecords = [];
let filteredRecords = [];
let recordMap = {};
let currentPage = 1;
const pageSize = 10;
let currentSeed = null;

// On load: fetch data, build map, render table & pagination, wire events
;(async () => {
allRecords = await loadData();
allRecords.forEach(r => recordMap[r.id] = r);

buildThemeFilters(allRecords);
filteredRecords = allRecords.slice();

renderTable();
renderPagination();
setupSearch();

// show graph inline when clicking "Network" button
document.querySelector('#results').addEventListener('click', e => {
if (e.target.classList.contains('network-btn')) {
const tr = e.target.closest('tr');
const idx = (currentPage - 1) * pageSize +
Array.from(tr.parentNode.children).indexOf(tr);
currentSeed = filteredRecords[idx];
showGraph(currentSeed);
document.getElementById('graphPanel').classList.remove('d-none');
}
});

// close inline graph
document.getElementById('close-graph').onclick = () =>
document.getElementById('graphPanel').classList.add('d-none');

// regenerate at depth change
document.getElementById('graph-regenerate').onclick = () => {
if (currentSeed) showGraph(currentSeed);
};
})();

// Fetch the JSON dataset
async function loadData() {
const resp = await fetch(DATA_URL);
if (!resp.ok) throw new Error(Fetch failed: ${resp.statusText});
const data = await resp.json();
return data.records || [];
}

// Build the Theme checkboxes
function buildThemeFilters(records) {
const container = document.getElementById('theme-filters');
const badge = document.getElementById('theme-count');
const themes = new Set();

records.forEach(r => (r.topics || []).forEach(t => themes.add(t.name)));
badge.textContent = themes.size;

themes.forEach(name => {
const id = theme-${name.replace(/\W+/g, '_')};
const div = document.createElement('div');
div.className = 'form-check form-check-inline';
div.innerHTML =       <input class="form-check-input" type="checkbox" id="${id}" value="${name}">
      <label class="form-check-label" for="${id}">${name}</label>
   ;
container.appendChild(div);
});
}

// Utility: get checked values from a container
function getCheckedValues(containerId) {
return Array.from(
document.querySelectorAll(#${containerId} input:checked)
).map(i => i.value.toLowerCase());
}

// Apply filters and re-render
function applyFilters() {
const titleQ   = (document.getElementById('search').value || '').trim().toLowerCase();
const start    = document.getElementById('start-date').value;
const end      = document.getElementById('end-date').value;
const themes   = getCheckedValues('theme-filters');
const authorQ  = (document.getElementById('author-filter').value || '').trim().toLowerCase();
const journalQ = (document.getElementById('journal-filter').value || '').trim().toLowerCase();
const keywordQ = (document.getElementById('keyword-filter').value || '').trim().toLowerCase();
const minC     = parseInt(document.getElementById('min-cites').value) || 0;
const maxC     = parseInt(document.getElementById('max-cites').value) || Infinity;

filteredRecords = allRecords.filter(r => {
if (titleQ && (!r.title || !r.title.toLowerCase().includes(titleQ))) return false;
if (start && r.publication_date < start) return false;
if (end   && r.publication_date > end)   return false;
if (themes.length) {
const tnames = (r.topics||[]).map(t => t.name.toLowerCase());
if (!themes.some(t => tnames.includes(t))) return false;
}
if (authorQ) {
const authString = r.authors.map(a => a.name||'').join(' ').toLowerCase();
if (!authString.includes(authorQ)) return false;
}
if (journalQ && !(r.journal||'').toLowerCase().includes(journalQ)) return false;
if (keywordQ) {
const kwString = (r.keywords||[]).map(k=>k.toLowerCase()).join(' ');
if (!kwString.includes(keywordQ)) return false;
}
const cites = (r.citation_counts?.forward)||0;
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
tbody.innerHTML = 
      <tr><td colspan="7" class="text-center py-3">
        No records match filters.
      </td></tr>;
return;
}

pageRecs.forEach(r => {
const screening = r.screening?.title_abstract || 'Not screened';
const tr = document.createElement('tr');
tr.innerHTML =       <td><a href="${r.url||'#'}" target="_blank">${r.title}</a></td>
      <td>${r.publication_year||''}</td>
      <td>${r.authors.map(a=>a.name).join(', ')}</td>
      <td>${(r.citation_counts.forward)||0}</td>
      <td>${screening}</td>
      <td><button class="btn btn-sm btn-outline-secondary details-btn">Details</button></td>
      <td><button class="btn btn-sm btn-outline-secondary network-btn">Graph</button></td>
   ;
tbody.appendChild(tr);
tr.querySelector('.details-btn').onclick = () => showDetails(r);
});
}

// Render pagination controls
function renderPagination() {
const totalPages = Math.max(1, Math.ceil(filteredRecords.length / pageSize));
const ul = document.getElementById('pagination');
ul.innerHTML = '';

function makePageItem(label, disabled, onClick) {
const li = document.createElement('li');
li.className = page-item${disabled? ' disabled':''};
const btn = document.createElement('button');
btn.className = 'page-link';
btn.textContent = label;
if (!disabled) btn.onclick = onClick;
li.appendChild(btn);
return li;
}

ul.appendChild(makePageItem('Previous', currentPage===1, () => {
currentPage--; renderTable(); renderPagination();
}));

for (let p=1; p<=totalPages; p++) {
const li = document.createElement('li');
li.className = page-item${p===currentPage? ' active':''};
const btn = document.createElement('button');
btn.className = 'page-link';
btn.textContent = p;
btn.onclick = () => { currentPage=p; renderTable(); renderPagination(); };
li.appendChild(btn);
ul.appendChild(li);
}

ul.appendChild(makePageItem('Next', currentPage===totalPages, () => {
currentPage++; renderTable(); renderPagination();
}));
}

// Wire up the Search button
function setupSearch() {
document.getElementById('search-btn')
.addEventListener('click', applyFilters);
}

// Show paper details in modal
function showDetails(r) {
const mb = document.getElementById('modal-body');
mb.innerHTML =     <h5>${r.title}</h5>
    <p><strong>ID:</strong> ${r.id.split('/').pop()}</p>
    <p><strong>Publication Date:</strong> ${r.publication_date||'N/A'}</p>
    <p><strong>Topics:</strong> ${(r.topics||[]).map(t=>t.name).join(', ')}</p>
    <p><strong>Keywords:</strong> ${(r.keywords||[]).join(', ')}</p>
    <p><strong>URL:</strong> <a href="${r.url||'#'}">${r.url||'N/A'}</a></p>
 ;
new bootstrap.Modal(document.getElementById('detailModal')).show();
}

// Show inline citation network
function showGraph(seed) {
const depth = parseInt(
document.getElementById('graph-depth').value, 10
) || 1;

document.getElementById('node-info').textContent = seed.title;

const elements = [];
const visited = new Set();

function recurse(id, level, type) {
if (level>depth || visited.has(id)) return;
visited.add(id);
const meta = recordMap[id];
if (!meta) return;
// add node
elements.push({ data: { id, label: meta.title, meta, metaType: type }});
if (level<depth) {
(meta.backward_citations||[]).slice(0,50).forEach(refId=>{
if (!recordMap[refId]) return;
elements.push({ data:{ id:${id}->${refId}, source:id, target:refId }});
recurse(refId, level+1, 'backward');
});
(meta.forward_citations||[]).slice(0,50).forEach(citId=>{
if (!recordMap[citId]) return;
elements.push({ data:{ id:${citId}->${id}, source:citId, target:id }});
recurse(citId, level+1, 'forward');
});
}
}

recurse(seed.id,1,'seed');

const container = document.getElementById('cy');
container.innerHTML = '';

const cy = cytoscape({
container,
elements,
style: [
{ selector:'node', style:{ label:'data(label)', 'text-wrap':'wrap', 'text-max-width':120, 'font-size':8, 'text-valign':'center', color:'#000'}},
{ selector:'node[metaType="backward"]', style:{ 'background-color':'green' }},
{ selector:'node[metaType="forward"]', style:{ 'background-color':'orange'}},
{ selector:'node[metaType="seed"]', style:{ 'background-color':'#0d6efd' }},
{ selector:'edge', style:{ width:1.5, 'line-color':'#999' }}
],
layout:{ name:'cose' }
});

cy.nodes().forEach(node=>{
const size = 20 + node.degree()*5;
node.style({ width:size, height:size });
});

cy.on('tap','node', evt=>{
const m = evt.target.data('meta');
document.getElementById('node-info').textContent = m.title;
});
}

