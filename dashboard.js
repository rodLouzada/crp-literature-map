// dashboard.js — CRP Evidence Dashboard
// Reads metrics.json (from calculate_dashboard_metrics.py) and, if present,
// crp_manifest.json for the corpus date. Each chart guards against missing keys
// so an older metrics file still renders what it can.

// Sober palette in the green family of the rest of the site.
const GREEN = '#006400';
const GREEN2 = '#228B22';
const SEQ = ['#006400', '#228B22', '#5B8C5A', '#8FB996', '#B6883C', '#6A8CAF', '#9C6B8E', '#8B5A2B'];

function el(id) { return document.getElementById(id); }
function ctx(id) { const c = el(id); return c ? c.getContext('2d') : null; }
function has(v) { return v !== undefined && v !== null; }

// chart builders -------------------------------------------------------------
function lineChart(id, labels, datasets, yText) {
  const cx = ctx(id); if (!cx) return;
  new Chart(cx, {
    type: 'line',
    data: { labels, datasets: datasets.map(d => ({ tension: 0.3, borderWidth: 2, pointRadius: 0, pointHoverRadius: 4, fill: false, ...d })) },
    options: {
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: { legend: { display: datasets.length > 1 } },
      scales: {
        x: { title: { display: true, text: 'Year' } },
        y: { beginAtZero: true, title: yText ? { display: true, text: yText } : undefined },
      },
    },
  });
}

function hBar(id, pairs, color, max) {
  const cx = ctx(id); if (!cx || !pairs) return;
  const slice = pairs.slice(0, max || 10).reverse();
  new Chart(cx, {
    type: 'bar',
    data: { labels: slice.map(p => p[0]), datasets: [{ data: slice.map(p => p[1]), backgroundColor: color || GREEN2 }] },
    options: {
      maintainAspectRatio: false, indexAxis: 'y',
      scales: { x: { beginAtZero: true } },
      plugins: { legend: { display: false } },
    },
  });
}

function doughnut(id, pairs, max) {
  const cx = ctx(id); if (!cx || !pairs) return;
  const slice = pairs.slice(0, max || 8);
  new Chart(cx, {
    type: 'doughnut',
    data: { labels: slice.map(p => p[0]), datasets: [{ data: slice.map(p => p[1]), backgroundColor: SEQ }] },
    options: { maintainAspectRatio: false, plugins: { legend: { position: 'right' } } },
  });
}

// kpis -----------------------------------------------------------------------
function fillKpis(m) {
  const by = (m.publications_over_time && m.publications_over_time.by_year) || [];
  const years = by.map(o => o.year).filter(has);
  const total = has(m.corpus_size) ? m.corpus_size : by.reduce((s, o) => s + (o.count || 0), 0);

  if (total) el('kpi-total').textContent = total.toLocaleString();
  if (years.length) el('kpi-span').textContent = `${Math.min(...years)}–${Math.max(...years)}`;

  const ob = m.oa_status_breakdown;
  if (Array.isArray(ob) && ob.length) {
    let oa = 0, tot = 0;
    ob.forEach(([status, n]) => { tot += n; if (!/^(closed|unknown)$/i.test(status)) oa += n; });
    if (tot) el('kpi-oa').textContent = `${Math.round(oa / tot * 100)}%`;
  }

  const peak = m.publications_over_time && m.publications_over_time.peak_year;
  if (has(peak)) el('kpi-peak').textContent = peak;

  const vel = m.citation_impact && m.citation_impact.avg_early_citations;
  if (has(vel)) el('kpi-vel').textContent = vel;
}

// main -----------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', async () => {
  // optional corpus date
  try {
    const mf = await fetch('crp_manifest.json');
    if (mf.ok) { const j = await mf.json(); /* available if you want to show it */ void j; }
  } catch (e) { /* manifest optional */ }

  let m;
  try {
    const resp = await fetch('metrics.json');
    if (!resp.ok) throw new Error(`${resp.status} ${resp.statusText}`);
    m = await resp.json();
  } catch (e) {
    const box = el('loaderr');
    if (box) {
      box.textContent = `Couldn't load metrics.json (${e.message}). Run calculate_dashboard_metrics.py, then open this page from a local web server in the same folder.`;
      box.classList.remove('d-none');
    }
    return;
  }

  fillKpis(m);

  // Output
  if (m.publications_over_time) {
    const by = m.publications_over_time.by_year || [];
    lineChart('pubsChart', by.map(o => o.year), [{ label: 'Papers', data: by.map(o => o.count), borderColor: GREEN }], 'Papers');
    lineChart('cumulativeChart', by.map(o => o.year), [{ label: 'Cumulative', data: by.map(o => o.cumulative), borderColor: GREEN2, fill: true, backgroundColor: 'rgba(34,139,34,0.10)' }], 'Total papers');
  }

  // Access & cost
  if (m.open_access_uptake) {
    const e = Object.entries(m.open_access_uptake).sort((a, b) => a[0] - b[0]);
    const cx = ctx('oaChart');
    if (cx) new Chart(cx, {
      type: 'bar',
      data: { labels: e.map(x => x[0]), datasets: [{ data: e.map(x => x[1]), backgroundColor: GREEN2 }] },
      options: { maintainAspectRatio: false, plugins: { legend: { display: false } },
        scales: { x: { title: { display: true, text: 'Year' } }, y: { beginAtZero: true, max: 100, title: { display: true, text: '% open access' } } } },
    });
  }
  if (m.oa_status_breakdown) doughnut('oaStatusChart', m.oa_status_breakdown);
  if (m.apc_cost_usd_by_year) {
    const e = Object.entries(m.apc_cost_usd_by_year).sort((a, b) => a[0] - b[0]);
    lineChart('apcChart', e.map(x => x[0]), [{ label: 'Avg APC', data: e.map(x => x[1]), borderColor: '#8B5A2B' }], 'USD');
  }

  // Impact
  if (m.citation_impact && m.citation_impact.average_fwci_by_year) {
    const e = Object.entries(m.citation_impact.average_fwci_by_year).sort((a, b) => a[0] - b[0]);
    lineChart('fwciChart', e.map(x => x[0]), [{ label: 'Avg FWCI', data: e.map(x => x[1]), borderColor: GREEN }], 'FWCI');
  }

  // Themes
  if (m.theme_distribution)    doughnut('themeChart', m.theme_distribution, 8);
  if (m.field_distribution)    hBar('fieldChart',    m.field_distribution);
  if (m.subfield_distribution) hBar('subfieldChart', m.subfield_distribution);
  if (m.sdg_distribution)      hBar('sdgChart',      m.sdg_distribution);
  if (m.keyword_trends) {
    const kws = Object.keys(m.keyword_trends);
    const yrs = Array.from(new Set(kws.flatMap(k => Object.keys(m.keyword_trends[k])))).sort();
    const ds = kws.map((k, i) => ({ label: k, borderColor: SEQ[i % SEQ.length], data: yrs.map(y => m.keyword_trends[k][y] || 0) }));
    lineChart('keywordChart', yrs, ds, 'Papers');
  }

  // People & venues
  if (m.top_authors)  hBar('authorChart',  m.top_authors);
  if (m.top_journals) hBar('journalChart', m.top_journals);
  if (m.top_funders)  hBar('funderChart',  m.top_funders);

  // Reach
  if (m.indexed_in_trends && m.top_indexed_in) {
    const top5 = m.top_indexed_in.slice(0, 5).map(d => d[0]);
    const yrs = Object.keys(m.indexed_in_trends).sort();
    const ds = top5.map((idx, i) => ({ label: idx, borderColor: SEQ[i % SEQ.length], data: yrs.map(y => (m.indexed_in_trends[y] && m.indexed_in_trends[y][idx]) || 0) }));
    lineChart('indexedTrendChart', yrs, ds, 'Papers');
  }
  if (m.top_indexed_in) hBar('indexedTopChart', m.top_indexed_in);
  if (m.study_state_counts || m.state_counts)
    hBar('stateChart', m.study_state_counts || m.state_counts, GREEN2, 15);
});
