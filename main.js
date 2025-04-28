const DATA_URL = 'crp_openalex_enhanced.json';
const API_BASE = 'https://api.openalex.org/works/';

let currentSeed = null;

// ... loadData(), buildThemeFilters(), applyFilters(), renderTable(), setupSearch() unchanged ...

async function fetchMetadata(id) {
    // same as before
}

async function showGraph(seed) {
    currentSeed = seed;
    const depth = parseInt(document.getElementById('modal-graph-level').value, 10) || 1;
    document.getElementById('node-info').textContent =
        `${seed.title} (${seed.id.split('/').pop()})`;

    const elements = [];
    const visited = new Set();

    async function recurse(id, level) {
        if (level > depth || visited.has(id)) return;
        visited.add(id);

        let meta = (id === seed.id)
            ? seed
            : await normalizeMetadata(await fetchMetadata(id));

        elements.push({ data: { id, label: meta.title, meta } });

        if (level < depth) {
            for (const ref of (meta.backward_citations || []).slice(0, depth * 3)) {
                elements.push({ data: { source: id, target: ref } });
                await recurse(ref, level + 1);
            }
            if (meta.citation_counts.forward) {
                const resp = await fetch(meta.cited_by_api_url + `&per_page=${depth * 3}`);
                const citers = (await resp.json()).results || [];
                for (const c of citers) {
                    elements.push({ data: { source: c.id, target: id } });
                    await recurse(c.id, level + 1);
                }
            }
        }
    }

    await recurse(seed.id, 1);
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
                    'text-max-width': 120,
                    'font-size': 8,
                    'text-valign': 'center',
                }
            },
            { selector: 'edge', style: { width: 2, 'line-color': '#999' } }
        ],
        layout: { name: 'cose' }
    });

    // Only update node-info, no extra pop-up
    cy.on('tap', 'node', evt => {
        const meta = evt.target.data('meta');
        document.getElementById('node-info').textContent =
            `${meta.title} (${meta.id.split('/').pop()})`;
    });

    new bootstrap.Modal(document.getElementById('graphModal')).show();
}

function normalizeMetadata(raw) {
    return {
        id: raw.id,
        title: raw.title,
        backward_citations: raw.referenced_works || [],
        cited_by_api_url: raw.cited_by_api_url,
        citation_counts: {
            backward: raw.referenced_works_count,
            forward: raw.cited_by_count
        }
        // skip other fields for graph performance
    };
}

function showDetails(r) {
    // unchanged
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
