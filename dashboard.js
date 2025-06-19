// dashboard.js

document.addEventListener('DOMContentLoaded', async () => {
    // Load metrics.json
    const resp = await fetch('metrics.json');
    if (!resp.ok) {
        console.error('Failed to load metrics.json:', resp.statusText);
        return;
    }
    const m = await resp.json();

    //
    // 1) Publications Per Year
    //
    {
        const labels = m.publications_over_time.by_year.map(o => o.year);
        const data = m.publications_over_time.by_year.map(o => o.count);
        new Chart(
            document.getElementById('pubsChart').getContext('2d'),
            {
                type: 'line',
                data: { labels, datasets: [{ label: 'Papers', data, borderColor: '#006400', fill: false }] },
                options: {
                    scales: {
                        x: { title: { display: true, text: 'Year' } },
                        y: { title: { display: true, text: 'Number of Papers' }, beginAtZero: true }
                    }
                }
            }
        );
    }

    //
    // 2) Cumulative Publications
    //
    {
        const labels = m.publications_over_time.by_year.map(o => o.year);
        const data = m.publications_over_time.by_year.map(o => o.cumulative);
        new Chart(
            document.getElementById('cumulativeChart').getContext('2d'),
            {
                type: 'line',
                data: { labels, datasets: [{ label: 'Cumulative Papers', data, borderColor: '#228B22', fill: false }] },
                options: {
                    scales: {
                        x: { title: { display: true, text: 'Year' } },
                        y: { title: { display: true, text: 'Total Papers' }, beginAtZero: true }
                    }
                }
            }
        );
    }

    //
    // 3) Open Access Uptake
    //
    {
        const entries = Object.entries(m.open_access_uptake).sort((a, b) => a[0] - b[0]);
        const labels = entries.map(e => e[0]);
        const data = entries.map(e => e[1]);
        new Chart(
            document.getElementById('oaChart').getContext('2d'),
            {
                type: 'bar',
                data: { labels, datasets: [{ label: '% Open Access', data, backgroundColor: '#228B22' }] },
                options: {
                    scales: {
                        x: { title: { display: true, text: 'Year' } },
                        y: { title: { display: true, text: '% OA' }, beginAtZero: true, max: 100 }
                    }
                }
            }
        );
    }

    //
    // 4) Domain Distribution
    //
    {
        const slice = m.domain_distribution.slice(0, 10);
        const labels = slice.map(d => d[0]);
        const data = slice.map(d => d[1]);
        new Chart(
            document.getElementById('domainChart').getContext('2d'),
            {
                type: 'doughnut',
                data: { labels, datasets: [{ data }] },
                options: { plugins: { legend: { position: 'right' } } }
            }
        );
    }

    //
    // 5) Field Distribution
    //
    {
        const slice = m.field_distribution.slice(0, 10).reverse();
        const labels = slice.map(d => d[0]);
        const data = slice.map(d => d[1]);
        new Chart(
            document.getElementById('fieldChart').getContext('2d'),
            {
                type: 'bar',
                data: { labels, datasets: [{ label: 'Papers', data, backgroundColor: '#2E8B57' }] },
                options: {
                    indexAxis: 'y',
                    scales: { x: { beginAtZero: true } },
                    plugins: { legend: { display: false } }
                }
            }
        );
    }

    //
    // 6) Citation Impact (FWCI)
    //
    {
        const entries = Object.entries(m.citation_impact.average_fwci_by_year)
            .sort((a, b) => a[0] - b[0]);
        const labels = entries.map(e => e[0]);
        const data = entries.map(e => e[1]);
        new Chart(
            document.getElementById('fwciChart').getContext('2d'),
            {
                type: 'line',
                data: { labels, datasets: [{ label: 'Avg FWCI', data, borderColor: '#00008B', fill: false }] },
                options: {
                    scales: {
                        x: { title: { display: true, text: 'Year' } },
                        y: { title: { display: true, text: 'FWCI' }, beginAtZero: true }
                    }
                }
            }
        );
    }

    //
    // 7) APC Cost (USD)
    //
    {
        const entries = Object.entries(m.apc_cost_usd_by_year)
            .sort((a, b) => a[0] - b[0]);
        const labels = entries.map(e => e[0]);
        const data = entries.map(e => e[1]);
        new Chart(
            document.getElementById('apcChart').getContext('2d'),
            {
                type: 'line',
                data: { labels, datasets: [{ label: 'Avg APC (USD)', data, borderColor: '#8B0000', fill: false }] },
                options: {
                    scales: {
                        x: { title: { display: true, text: 'Year' } },
                        y: { title: { display: true, text: 'USD' }, beginAtZero: true }
                    }
                }
            }
        );
    }

    //
    // 8) Top Authors
    //
    {
        const slice = m.top_authors.slice(0, 10).reverse();
        const labels = slice.map(d => d[0]);
        const data = slice.map(d => d[1]);
        new Chart(
            document.getElementById('authorChart').getContext('2d'),
            {
                type: 'bar',
                data: { labels, datasets: [{ label: 'Papers', data, backgroundColor: '#DC143C' }] },
                options: { indexAxis: 'y', scales: { x: { beginAtZero: true } }, plugins: { legend: { display: false } } }
            }
        );
    }

    //
    // 9) Top Journals
    //
    {
        const slice = m.top_journals.slice(0, 10).reverse();
        const labels = slice.map(d => d[0]);
        const data = slice.map(d => d[1]);
        new Chart(
            document.getElementById('journalChart').getContext('2d'),
            {
                type: 'bar',
                data: { labels, datasets: [{ label: 'Papers', data, backgroundColor: '#6A5ACD' }] },
                options: { indexAxis: 'y', scales: { x: { beginAtZero: true } }, plugins: { legend: { display: false } } }
            }
        );
    }

    //
    // 10) Top Funders
    //
    {
        const slice = m.top_funders.slice(0, 10).reverse();
        const labels = slice.map(d => d[0]);
        const data = slice.map(d => d[1]);
        new Chart(
            document.getElementById('funderChart').getContext('2d'),
            {
                type: 'bar',
                data: { labels, datasets: [{ label: 'Papers', data, backgroundColor: '#20B2AA' }] },
                options: { indexAxis: 'y', scales: { x: { beginAtZero: true } }, plugins: { legend: { display: false } } }
            }
        );
    }

    //
    // 11) Indexed_in Trends (top 5)
    //
    {
        const top5 = m.top_indexed_in.slice(0, 5).map(d => d[0]);
        const years = Object.keys(m.indexed_in_trends).sort();
        const datasets = top5.map((idx, i) => ({
            label: idx,
            data: years.map(y => m.indexed_in_trends[y][idx] || 0),
            borderColor: ['#FF8C00', '#8A2BE2', '#FF1493', '#228B22', '#1E90FF'][i],
            fill: false
        }));
        new Chart(
            document.getElementById('indexedTrendChart').getContext('2d'),
            {
                type: 'line',
                data: { labels: years, datasets },
                options: {
                    scales: {
                        x: { title: { display: true, text: 'Year' } },
                        y: { title: { display: true, text: 'Count' }, beginAtZero: true }
                    }
                }
            }
        );
    }

    //
    // 12) Top Indexed_in Overall
    //
    {
        const slice = m.top_indexed_in.slice(0, 10).reverse();
        const labels = slice.map(d => d[0]);
        const data = slice.map(d => d[1]);
        new Chart(
            document.getElementById('indexedTopChart').getContext('2d'),
            {
                type: 'bar',
                data: { labels, datasets: [{ label: 'Papers', data, backgroundColor: '#FFA500' }] },
                options: { indexAxis: 'y', scales: { x: { beginAtZero: true } }, plugins: { legend: { display: false } } }
            }
        );
    }
});
