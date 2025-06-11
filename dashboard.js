// dashboard.js

document.addEventListener('DOMContentLoaded', async () => {
    // Load the metrics
    const resp = await fetch('metrics.json');
    if (!resp.ok) {
        console.error('Failed to load metrics.json:', resp.statusText);
        return;
    }
    const metrics = await resp.json();

    // 1) Publications Per Year (Line Chart)
    const pubYears = metrics.publications_over_time.by_year.map(o => o.year);
    const pubCounts = metrics.publications_over_time.by_year.map(o => o.count);
    new Chart(document.getElementById('pubsChart'), {
        type: 'line',
        data: {
            labels: pubYears,
            datasets: [{
                label: 'Papers Published',
                data: pubCounts,
                fill: false,
                tension: 0.1
            }]
        },
        options: {
            scales: {
                x: { title: { display: true, text: 'Year' } },
                y: { title: { display: true, text: 'Number of Papers' }, beginAtZero: true }
            }
        }
    });

    // 2) Open Access Uptake (Bar Chart)
    const oaEntries = Object.entries(metrics.open_access_uptake)
        .sort((a, b) => a[0] - b[0]);
    const oaYears = oaEntries.map(e => e[0]);
    const oaPerc = oaEntries.map(e => e[1]);
    new Chart(document.getElementById('oaChart'), {
        type: 'bar',
        data: {
            labels: oaYears,
            datasets: [{
                label: '% Open Access',
                data: oaPerc
            }]
        },
        options: {
            scales: {
                x: { title: { display: true, text: 'Year' } },
                y: { title: { display: true, text: '% Open Access' }, beginAtZero: true, max: 100 }
            }
        }
    });

    // 3) Domain Distribution (Doughnut)
    const domainData = metrics.domain_distribution.slice(0, 10);
    const domainLabels = domainData.map(d => d[0]);
    const domainCounts = domainData.map(d => d[1]);
    new Chart(document.getElementById('domainChart'), {
        type: 'doughnut',
        data: {
            labels: domainLabels,
            datasets: [{
                label: 'Top Domains',
                data: domainCounts
            }]
        },
        options: {
            plugins: {
                legend: { position: 'right' }
            }
        }
    });

    // 4) Field Distribution (Bar Chart)
    const fieldData = metrics.field_distribution.slice(0, 10);
    const fieldLabels = fieldData.map(d => d[0]);
    const fieldCounts = fieldData.map(d => d[1]);
    new Chart(document.getElementById('fieldChart'), {
        type: 'bar',
        data: {
            labels: fieldLabels,
            datasets: [{
                label: 'Top Fields',
                data: fieldCounts
            }]
        },
        options: {
            indexAxis: 'y',
            scales: {
                x: { title: { display: true, text: 'Number of Papers' }, beginAtZero: true },
                y: { title: { display: false } }
            },
            plugins: {
                legend: { display: false }
            }
        }
    });
});
