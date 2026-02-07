// Dashboard View - Renders dashboard UI dynamically
class DashboardView {
  constructor() {
    this.trafficChart = null;
    this.owaspChart = null;
    this.initialized = false;
  }

  // Initialize the dashboard structure in the main content area
  initializeDOM() {
    if (this.initialized) return;

    const mainContent = document.getElementById('main-content');
    if (!mainContent) return;

    mainContent.innerHTML = `
      <!-- Page Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2 animate-fade-in">
        <div>
          <h1 class="text-2xl font-bold text-gray-800 dark:text-white">Dashboard Overview</h1>
          <p class="text-sm text-gray-500 dark:text-gray-400">Real-time security monitoring and analytics</p>
        </div>
        <div class="flex items-center gap-2">
          <span class="flex items-center gap-2 px-3 py-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-full text-xs font-medium">
            <span class="relative flex h-2 w-2">
              <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span class="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            System Online
          </span>
          <button class="p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            <i data-feather="refresh-cw" class="w-4 h-4 text-gray-600 dark:text-gray-300"></i>
          </button>
        </div>
      </div>

      <!-- KPIs -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <!-- Total Requests -->
        <div class="card kpi-card border-l-4 border-blue-500 animate-fade-in" style="animation-delay: 0s">
          <div class="flex-1">
            <h3 class="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 font-semibold">Total Requests</h3>
            <p class="kpi-total-requests text-3xl font-bold text-gray-800 dark:text-white mt-2">--</p>
            <div class="mt-2 flex items-center text-xs text-green-600 dark:text-green-400">
              <i data-feather="trending-up" class="w-3 h-3 mr-1"></i>
              <span>Live Monitor</span>
            </div>
          </div>
          <div class="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-blue-600 dark:text-blue-400">
            <i data-feather="server" class="w-6 h-6"></i>
          </div>
        </div>

        <!-- Blocked Attacks -->
        <div class="card kpi-card border-l-4 border-red-500 animate-fade-in" style="animation-delay: 0.1s">
          <div class="flex-1">
            <h3 class="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 font-semibold">Blocked Attacks</h3>
            <p class="kpi-blocked-attacks text-3xl font-bold text-gray-800 dark:text-white mt-2">--</p>
            <div class="mt-2 flex items-center text-red-600 dark:text-red-400">
              <i data-feather="shield" class="w-3 h-3 mr-1"></i>
              <span>Threats Mitigated</span>
            </div>
          </div>
          <div class="p-3 bg-red-50 dark:bg-red-900/20 rounded-xl text-red-600 dark:text-red-400">
             <i data-feather="shield-off" class="w-6 h-6"></i>
          </div>
        </div>

        <!-- False Positives -->
        <div class="card kpi-card border-l-4 border-orange-500 animate-fade-in" style="animation-delay: 0.2s">
          <div class="flex-1">
            <h3 class="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 font-semibold">False Positives</h3>
            <p class="kpi-false-positives text-3xl font-bold text-gray-800 dark:text-white mt-2">--</p>
            <div class="mt-2 flex items-center text-orange-600 dark:text-orange-400">
              <i data-feather="alert-triangle" class="w-3 h-3 mr-1"></i>
              <span>Review Needed</span>
            </div>
          </div>
          <div class="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-xl text-orange-600 dark:text-orange-400">
            <i data-feather="alert-circle" class="w-6 h-6"></i>
          </div>
        </div>

        <!-- Model Confidence -->
        <div class="card kpi-card border-l-4 border-teal-500 animate-fade-in" style="animation-delay: 0.3s">
          <div class="flex-1">
            <h3 class="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 font-semibold">AI Confidence</h3>
            <p class="kpi-model-confidence text-3xl font-bold text-gray-800 dark:text-white mt-2">--</p>
            <div class="mt-2 flex items-center text-teal-600 dark:text-teal-400">
              <i data-feather="check-circle" class="w-3 h-3 mr-1"></i>
              <span>Optimized</span>
            </div>
          </div>
          <div class="p-3 bg-teal-50 dark:bg-teal-900/20 rounded-xl text-teal-600 dark:text-teal-400">
            <i data-feather="cpu" class="w-6 h-6"></i>
          </div>
        </div>
      </div>

      <!-- Charts -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Traffic Chart -->
        <div class="card overflow-hidden animate-fade-in" style="animation-delay: 0.4s">
          <div class="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50">
            <div>
              <h3 class="font-semibold text-lg text-gray-800 dark:text-white">Traffic Overview</h3>
              <p class="text-xs text-gray-500">Inbound requests over the last 30 days</p>
            </div>
            <select class="text-xs border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-teal-500">
              <option>Last 30 Days</option>
              <option>Last 7 Days</option>
              <option>Last 24 Hours</option>
            </select>
          </div>
          <div class="p-6">
            <div class="chart-container relative h-72 w-full">
               <canvas id="traffic-chart"></canvas>
            </div>
          </div>
        </div>

        <!-- OWASP Chart -->
        <div class="card overflow-hidden animate-fade-in" style="animation-delay: 0.5s">
          <div class="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50">
             <div>
              <h3 class="font-semibold text-lg text-gray-800 dark:text-white">Threat Distribution</h3>
              <p class="text-xs text-gray-500">OWASP Top 10 Attack Categories</p>
            </div>
            <button class="text-xs text-teal-600 hover:text-teal-700 font-medium">View Report</button>
          </div>
          <div class="p-6">
            <div class="chart-container relative h-72 w-full flex items-center justify-center">
              <canvas id="owasp-chart"></canvas>
            </div>
          </div>
        </div>
      </div>

      <!-- Recent Alerts -->
      <div class="card overflow-hidden animate-fade-in" style="animation-delay: 0.6s">
        <div class="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between bg-gray-50/50 dark:bg-gray-800/50">
          <div>
            <h3 class="font-semibold text-lg text-gray-800 dark:text-white">Recent Security Alerts</h3>
            <p class="text-xs text-gray-500">Latest detected anomalies and blocked attempts</p>
          </div>
          <div class="flex items-center gap-3">
             <div class="hidden sm:flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1 text-xs">
                <button id="alerts-sort-type" class="px-3 py-1 rounded-md hover:bg-white dark:hover:bg-gray-600 shadow-sm transition-all">Type</button>
                <button id="alerts-sort-severity" class="px-3 py-1 rounded-md hover:bg-white dark:hover:bg-gray-600 shadow-sm transition-all text-gray-600 dark:text-gray-300">Severity</button>
             </div>
             <button class="text-sm text-teal-600 hover:text-teal-700 font-medium">View All</button>
          </div>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-sm text-left">
            <thead class="text-xs text-gray-500 uppercase bg-gray-50 dark:bg-gray-800 dark:text-gray-400">
              <tr>
                <th class="px-6 py-3 font-medium tracking-wider">ID</th>
                <th class="px-6 py-3 font-medium tracking-wider">Type</th>
                <th class="px-6 py-3 font-medium tracking-wider">Severity</th>
                <th class="px-6 py-3 font-medium tracking-wider">Description</th>
                <th class="px-6 py-3 font-medium tracking-wider">Time</th>
              </tr>
            </thead>
            <tbody id="alerts-table" class="divide-y divide-gray-100 dark:divide-gray-700"></tbody>
          </table>
        </div>
      </div>
    `;

    // Re-initialize feather icons for the dynamically added content
    if (typeof feather !== 'undefined') {
      feather.replace();
    }

    this.initialized = true;
  }

  renderKPIs(kpis) {
    // Ensure DOM is initialized
    this.initializeDOM();

    const elements = {
      totalRequests: document.querySelector('.kpi-total-requests'),
      blockedAttacks: document.querySelector('.kpi-blocked-attacks'),
      falsePositives: document.querySelector('.kpi-false-positives'),
      modelConfidence: document.querySelector('.kpi-model-confidence'),
    };

    if (elements.totalRequests) {
      elements.totalRequests.textContent = (kpis.totalRequests || 0).toLocaleString();
    }
    if (elements.blockedAttacks) {
      elements.blockedAttacks.textContent = (kpis.blockedAttacks || 0).toLocaleString();
    }
    if (elements.falsePositives) {
      elements.falsePositives.textContent = (kpis.falsePositives || 0).toLocaleString();
    }
    if (elements.modelConfidence) {
      elements.modelConfidence.textContent = ((kpis.modelConfidence || 0) * 100).toFixed(1) + '%';
    }
  }

  renderCharts(trafficData, owaspCounts) {
    // Ensure DOM is initialized
    this.initializeDOM();

    const trafficCanvas = document.getElementById('traffic-chart');
    const owaspCanvas = document.getElementById('owasp-chart');

    // Labels for the last 30 days
    const labels = Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (29 - i));
      return `${date.getMonth() + 1}/${date.getDate()}`;
    });

    // --- Traffic Line Chart ---
    if (trafficCanvas) {
      // Destroy previous instance if it exists
      if (this.trafficChart) {
        this.trafficChart.destroy();
      }

      const ctxTraffic = trafficCanvas.getContext('2d');
      // Create gradient
      const gradient = ctxTraffic.createLinearGradient(0, 0, 0, 400);
      gradient.addColorStop(0, 'rgba(13, 148, 136, 0.2)'); // Teal-600
      gradient.addColorStop(1, 'rgba(13, 148, 136, 0.0)');

      // If no data, use zeros but keep the chart rendered
      const dataPoints = trafficData.length > 0 ? trafficData : Array(30).fill(0);

      this.trafficChart = new Chart(trafficCanvas, {
        type: 'line',
        data: {
          labels: labels,
          datasets: [{
            label: 'Total Requests',
            data: dataPoints,
            backgroundColor: gradient,
            borderColor: '#0d9488',
            borderWidth: 2,
            pointBackgroundColor: '#ffffff',
            pointBorderColor: '#0d9488',
            pointHoverBackgroundColor: '#0d9488',
            pointHoverBorderColor: '#ffffff',
            fill: true,
            tension: 0.4 // Smooth curve
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: {
            mode: 'index',
            intersect: false,
          },
          plugins: {
            legend: {
              display: false
            },
            tooltip: {
              backgroundColor: 'rgba(255, 255, 255, 0.9)',
              titleColor: '#1f2937',
              bodyColor: '#111827',
              borderColor: '#e5e7eb',
              borderWidth: 1,
              padding: 10,
              displayColors: false,
              callbacks: {
                label: (context) => `Requests: ${context.parsed.y}`
              }
            }
          },
          scales: {
            x: {
              grid: {
                display: false,
                drawBorder: false
              },
              ticks: {
                maxTicksLimit: 7,
                color: '#9ca3af',
                font: { size: 10 }
              }
            },
            y: {
              beginAtZero: true,
              grid: {
                color: '#f3f4f6',
                borderDash: [2, 4],
                drawBorder: false
              },
              ticks: {
                color: '#9ca3af',
                font: { size: 10 },
                precision: 0
              }
            }
          }
        }
      });
    }

    // --- OWASP Doughnut Chart ---
    if (owaspCanvas) {
      if (this.owaspChart) {
        this.owaspChart.destroy();
      }

      // Prepare data
      const hasData = Object.keys(owaspCounts).length > 0;
      const labelsO = hasData ? Object.keys(owaspCounts) : ['No Data'];
      const dataO = hasData ? Object.values(owaspCounts) : [1]; // 1 for empty state
      const bgColors = hasData
        ? ['#0d9488', '#059669', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#6366f1', '#ec4899']
        : ['#e5e7eb']; // Gray for empty state

      this.owaspChart = new Chart(owaspCanvas, {
        type: 'doughnut',
        data: {
          labels: labelsO,
          datasets: [{
            data: dataO,
            backgroundColor: bgColors,
            borderWidth: 0,
            hoverOffset: 4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '70%', // Thinner ring
          plugins: {
            legend: {
              position: 'right',
              labels: {
                usePointStyle: true,
                boxWidth: 8,
                color: '#6b7280',
                font: { size: 11 }
              }
            },
            tooltip: {
              enabled: hasData,
              backgroundColor: 'rgba(255, 255, 255, 0.9)',
              titleColor: '#1f2937',
              bodyColor: '#111827',
              borderColor: '#e5e7eb',
              borderWidth: 1,
              padding: 10,
            }
          }
        }
      });
    }
  }

  renderAlerts(alerts, sortKey = null) {
    // Ensure DOM is initialized
    this.initializeDOM();

    const tbody = document.getElementById('alerts-table');
    if (!tbody) return;

    let sortedAlerts = [...alerts];
    if (sortKey === 'type') {
      sortedAlerts.sort((a, b) => (a.alert_type || '').localeCompare(b.alert_type || ''));
    } else if (sortKey === 'severity') {
      sortedAlerts.sort((a, b) => {
        const order = SEVERITY_ORDER;
        return (order[a.severity] || 99) - (order[b.severity] || 99);
      });
    }

    tbody.innerHTML = '';
    if (sortedAlerts.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="px-6 py-8 text-center text-gray-500">No recent alerts found.</td></tr>`;
      return;
    }

    sortedAlerts.forEach((alert) => {
      const tr = document.createElement('tr');
      tr.className = 'hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors';
      const severityClass = SEVERITY_CLASSES[alert.severity] || 'severity-low';

      // Format date - handle ISO string from API
      let timeStr = 'N/A';
      if (alert.created_at) {
        const date = new Date(alert.created_at);
        if (!isNaN(date.getTime())) {
          timeStr = date.toLocaleString();
        }
      }

      tr.innerHTML = `
        <td class="px-6 py-4 whitespace-nowrap font-mono text-xs text-gray-500 dark:text-gray-400">#${(alert.alert_id || alert.id || '000').toString().slice(-6)}</td>
        <td class="px-6 py-4 whitespace-nowrap font-medium text-gray-800 dark:text-gray-200">${alert.alert_type || alert.type || 'Unknown'}</td>
        <td class="px-6 py-4 whitespace-nowrap">
          <span class="severity-badge ${severityClass} text-[10px] uppercase tracking-wider px-2 py-0.5">${alert.severity || 'Medium'}</span>
        </td>
        <td class="px-6 py-4 whitespace-normal text-gray-600 dark:text-gray-400 max-w-md truncate" title="${alert.description || ''}">${alert.description || '-'}</td>
        <td class="px-6 py-4 whitespace-nowrap text-gray-500 dark:text-gray-400 text-xs">${timeStr}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  bindSortHandlers(onSort) {
    // Ensure DOM is initialized before binding
    this.initializeDOM();

    const sortType = document.getElementById('alerts-sort-type');
    const sortSeverity = document.getElementById('alerts-sort-severity');

    if (sortType) {
      sortType.addEventListener('click', () => onSort('type'));
    }
    if (sortSeverity) {
      sortSeverity.addEventListener('click', () => onSort('severity'));
    }
  }
}
