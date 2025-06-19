< !DOCTYPE html >
    <html lang="en">
        <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            <title>CRP Evidence Dashboard</title>
            <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet" />
            <style>
                body {
                    background - color: #f8f9fa;
    }
                .card {
                    border - radius: 0.75rem;
                margin-bottom: 1.5rem;
                box-shadow: 0 0.125rem 0.25rem rgba(0,0,0,0.075);
    }
                .card-header {
                    background - color: #006400;
                color: #fff;
                font-weight: 600;
                font-size: 1.1rem;
    }
                .chart-container {
                    height: 300px;
    }
                canvas {
                    width: 100% !important;
                height: 100% !important;
    }
                .help-btn {
                    background: none;
                border: none;
                color: #fff;
                margin-left: 0.5rem;
                font-weight: bold;
                cursor: pointer;
    }
            </style>
        </head>
        <body>
            <nav class="navbar navbar-expand-lg navbar-light bg-light shadow-sm">
                <div class="container">
                    <a class="navbar-brand" href="#">CRP Evidence Dashboard</a>
                </div>
            </nav>

            <div class="container my-4">
                <h1 class="mb-4 text-center">Conservation Reserve Program Evidence Map</h1>

                <!-- Create cards for each chart (1 to 12) as used in dashboard.js -->
                <div class="row">
                    <div class="col-12">

                        <!-- 1. Publications Per Year -->
                        <div class="card">
                            <div class="card-header d-flex align-items-center">
                                Papers Published Per Year
                                <button class="help-btn" data-bs-toggle="tooltip" title="Annual count of CRP‐related papers by publication year.">?</button>
                            </div>
                            <div class="card-body chart-container">
                                <canvas id="pubsChart"></canvas>
                            </div>
                        </div>

                        <!-- 2. Cumulative Publications -->
                        <div class="card">
                            <div class="card-header d-flex align-items-center">
                                Cumulative Publications
                                <button class="help-btn" data-bs-toggle="tooltip" title="Cumulative number of CRP‐related papers over time.">?</button>
                            </div>
                            <div class="card-body chart-container">
                                <canvas id="cumulativeChart"></canvas>
                            </div>
                        </div>

                        <!-- 3. Open Access Uptake -->
                        <div class="card">
                            <div class="card-header d-flex align-items-center">
                                Open Access Uptake (%)
                                <button class="help-btn" data-bs-toggle="tooltip" title="Percentage of CRP papers that are open access by year.">?</button>
                            </div>
                            <div class="card-body chart-container">
                                <canvas id="oaChart"></canvas>
                            </div>
                        </div>

                        <!-- 4. Domain Distribution -->
                        <div class="card">
                            <div class="card-header d-flex align-items-center">
                                Top Domains
                                <button class="help-btn" data-bs-toggle="tooltip" title="Breakdown of papers by primary topic domain (top 10).">?</button>
                            </div>
                            <div class="card-body chart-container">
                                <canvas id="domainChart"></canvas>
                            </div>
                        </div>

                        <!-- 5. Field Distribution -->
                        <div class="card">
                            <div class="card-header d-flex align-items-center">
                                Top Fields
                                <button class="help-btn" data-bs-toggle="tooltip" title="Breakdown of papers by primary topic field (top 10).">?</button>
                            </div>
                            <div class="card-body chart-container">
                                <canvas id="fieldChart"></canvas>
                            </div>
                        </div>

                        <!-- 6. Citation Impact -->
                        <div class="card">
                            <div class="card-header d-flex align-items-center">
                                Avg. Citation Impact (FWCI)
                                <button class="help-btn" data-bs-toggle="tooltip" title="Average Field‐Weighted Citation Impact per year.">?</button>
                            </div>
                            <div class="card-body chart-container">
                                <canvas id="fwciChart"></canvas>
                            </div>
                        </div>

                        <!-- 7. APC Cost -->
                        <div class="card">
                            <div class="card-header d-flex align-items-center">
                                Avg. APC Cost (USD)
                                <button class="help-btn" data-bs-toggle="tooltip" title="Average Article Processing Charges in USD by year.">?</button>
                            </div>
                            <div class="card-body chart-container">
                                <canvas id="apcChart"></canvas>
                            </div>
                        </div>

                        <!-- 8. Top Authors -->
                        <div class="card">
                            <div class="card-header d-flex align-items-center">
                                Top Authors
                                <button class="help-btn" data-bs-toggle="tooltip" title="Top 10 authors by number of CRP‐related papers.">?</button>
                            </div>
                            <div class="card-body chart-container">
                                <canvas id="authorChart"></canvas>
                            </div>
                        </div>

                        <!-- 9. Top Journals -->
                        <div class="card">
                            <div class="card-header d-flex align-items-center">
                                Top Journals
                                <button class="help-btn" data-bs-toggle="tooltip" title="Top 10 journals publishing CRP‐related research.">?</button>
                            </div>
                            <div class="card-body chart-container">
                                <canvas id="journalChart"></canvas>
                            </div>
                        </div>

                        <!-- 10. Top Funders -->
                        <div class="card">
                            <div class="card-header d-flex align-items-center">
                                Top Funders
                                <button class="help-btn" data-bs-toggle="tooltip" title="Top 10 grant funders acknowledged in CRP papers.">?</button>
                            </div>
                            <div class="card-body chart-container">
                                <canvas id="funderChart"></canvas>
                            </div>
                        </div>

                        <!-- 11. Indexed-In Trends -->
                        <div class="card">
                            <div class="card-header d-flex align-items-center">
                                Indexed-In Trends (Top 5)
                                <button class="help-btn" data-bs-toggle="tooltip" title="Yearly count of CRP papers indexed in top databases.">?</button>
                            </div>
                            <div class="card-body chart-container">
                                <canvas id="indexedTrendChart"></canvas>
                            </div>
                        </div>

                        <!-- 12. Top Indexed-In Overall -->
                        <div class="card">
                            <div class="card-header d-flex align-items-center">
                                Top Indexing Sources
                                <button class="help-btn" data-bs-toggle="tooltip" title="Top databases or platforms indexing CRP papers overall.">?</button>
                            </div>
                            <div class="card-body chart-container">
                                <canvas id="indexedTopChart"></canvas>
                            </div>
                        </div>

                    </div>
                </div>
            </div>

            <footer class="footer text-center mt-4">
                <div class="container">
                    <p class="mb-1">&copy; 2025 CRP Evidence Dashboard</p>
                    <p class="mb-0"><a href="#">GitHub Repo</a></p>
                </div>
            </footer>

            <!-- Dependencies -->
            <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
            <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
            <script>
    // Initialize Bootstrap tooltips
    document.querySelectorAll('[data-bs-toggle="tooltip"]').forEach(el => {
                    new bootstrap.Tooltip(el);
    });
            </script>

            <!-- Main dashboard script -->
            <script src="dashboard.js"></script>
        </body>
    </html>
