// === MODEL ===
// Make a deep copy of the mock data to avoid mutating the original. If
// window.mockData is not yet defined (e.g., script loading order issues),
// fall back to an empty object to avoid JSON.parse errors. This ensures
// the application still initializes and can recover once mock data is loaded.
const model = window.mockData ? JSON.parse(JSON.stringify(window.mockData)) : {};

// === Helpers ===

// Redirect to login page if no login session is present. Returns true if the user
// is logged in. This should be called early in initialization to prevent
// unauthorized access to protected pages.
function checkLogin() {
  const currentFile = window.location.pathname.split('/').pop();
  // Permit free access to the login page itself
  if (currentFile === 'login.html') {
    return true;
  }
  const role = localStorage.getItem('webHydraRole');
  // Redirect unauthenticated users back to the login page
  if (!role) {
    window.location.href = 'login.html';
    return false;
  }
  // Prevent non‑admins from loading the admin dashboard and vice versa
  if (currentFile === 'index.html' && role !== 'admin') {
    window.location.href = 'user.html';
    return false;
  }
  if (currentFile === 'user.html' && role === 'admin') {
    window.location.href = 'index.html';
    return false;
  }
  // Ensure the role is known and load its permissions
  const perms = rolePermissions[role];
  if (!perms) {
    window.location.href = 'login.html';
    return false;
  }
  // Determine the logical page identifier from the data-page attribute. All
  // dashboard pages (index.html, user.html, index.html) share the
  // identifier 'dashboard'.
  const currentPage = document.body.dataset.page;
  // If the current page is not permitted for this role, redirect to the
  // first page the role is allowed to access. Use a mapping from logical
  // page identifiers to file names. The dashboard link selection depends on
  // whether the user is an admin or not.
  if (currentPage && perms.pages.indexOf(currentPage) === -1) {
    const targetView = perms.pages[0];
    const fileMap = {
      dashboard: role === 'admin' ? 'index.html' : 'user.html',
      threat: 'threat-monitor.html',
      intelligence: 'threat-intelligence.html',
      rules: 'rules-policies.html',
      logs: 'logs.html',
      test: 'test.html',
      recommendations: 'recommendations.html',
      settings: 'settings.html',
      users: 'users.html',
    };
    const targetFile = fileMap[targetView] || 'login.html';
    window.location.href = targetFile;
    return false;
  }
  return true;
}

// Attach logout functionality. Clears stored login info and redirects to login page.
function initLogout() {
  const btn = document.getElementById('logout-btn');
  if (btn) {
    btn.addEventListener('click', () => {
      localStorage.removeItem('webHydraRole');
      localStorage.removeItem('webHydraUsername');
      localStorage.removeItem('webHydraLoggedIn');
      window.location.href = 'login.html';
    });
  }
}
// Load persisted data from localStorage (rules, theme, api key)
function loadPersistedData() {
  const storedRules = JSON.parse(localStorage.getItem('webHydraRules') || '[]');
  if (storedRules.length) {
    model.rules = model.rules.concat(storedRules);
  }
  const storedTheme = localStorage.getItem('webHydraTheme');
  if (storedTheme === 'light') {
    document.documentElement.classList.remove('dark');
  } else {
    document.documentElement.classList.add('dark');
  }
  const storedKey = localStorage.getItem('webHydraApiKey');
  if (storedKey) {
    model.apiKey = storedKey;
  }
}

// Highlight the active navigation link based on the current page
function highlightActiveNav() {
  const current = document.body.dataset.page;
  document.querySelectorAll('.nav-link').forEach((link) => {
    link.classList.remove('bg-gray-100', 'dark:bg-gray-700', 'text-teal-600');
    if (link.dataset.view === current) {
      link.classList.add('bg-gray-100', 'dark:bg-gray-700', 'text-teal-600');
    }
  });
}

//
// Sidebar loader
//
// All pages include an empty <aside id="sidebar"> element. To avoid
// duplicating the sidebar markup in each HTML file and to simplify
// maintenance, the navigation and logo are defined in the
// `partials/sidebar.html` file. This helper fetches that partial and
// injects it into the sidebar on page load. After insertion, Feather
// icons are replaced so that the SVGs render correctly. Any errors are
// logged to the console but will not halt initialization.
async function loadSidebar() {
  const sidebar = document.getElementById('sidebar');
  if (!sidebar) return;
  // Define a fallback markup for environments where fetch() fails. This string
  // mirrors the contents of partials/sidebar.html so the sidebar still
  // renders correctly when viewing pages via the file:// protocol or when
  // network requests are blocked. Update this markup if the sidebar
  // structure changes.
  const sidebarFallback = `
    <div class="flex items-center justify-center h-24 border-b border-gray-200 dark:border-gray-700">
      <img src="assets/images/web-hydra-logo.png"
           alt="Web Hydra Logo"
           class="w-20 h-20 logo-glow">
    </div>
    <nav class="flex-1 overflow-y-auto py-4">
      <ul class="space-y-2">
        <li>
          <a href="index.html" class="nav-link flex items-center px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition" data-view="dashboard">
            <i data-feather="home" class="mr-3"></i>
            <span>Dashboard</span>
          </a>
        </li>
        <li>
          <a href="threat-monitor.html" class="nav-link flex items-center px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition" data-view="threat">
            <i data-feather="activity" class="mr-3"></i>
            <span>Threat Monitor</span>
          </a>
        </li>
        <li>
          <a href="threat-intelligence.html" class="nav-link flex items-center px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition" data-view="intelligence">
            <i data-feather="target" class="mr-3"></i>
            <span>Threat Intelligence</span>
          </a>
        </li>
        <li>
          <a href="rules-policies.html" class="nav-link flex items-center px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition" data-view="rules">
            <i data-feather="shield" class="mr-3"></i>
            <span>Rules &amp; Policies</span>
          </a>
        </li>
        <li>
          <a href="logs.html" class="nav-link flex items-center px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition" data-view="logs">
            <i data-feather="file-text" class="mr-3"></i>
            <span>Logs</span>
          </a>
        </li>
        <li>
          <a href="test.html" class="nav-link flex items-center px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition" data-view="test">
            <i data-feather="play-circle" class="mr-3"></i>
            <span>WAF Test Suite</span>
          </a>
        </li>
        <li>
            <i data-feather="refresh-cw" class="mr-3"></i>
            <span>Learning Loop</span>
          </a>
        </li>
        <li>
          <a href="recommendations.html" class="nav-link flex items-center px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition" data-view="recommendations">
            <i data-feather="thumbs-up" class="mr-3"></i>
            <span>Recommendations</span>
          </a>
        </li>
        <li>
          <a href="users.html" class="nav-link flex items-center px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition" data-view="users">
            <i data-feather="users" class="mr-3"></i>
            <span>User Management</span>
          </a>
        </li>
        <li>
          <a href="settings.html" class="nav-link flex items-center px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition" data-view="settings">
            <i data-feather="settings" class="mr-3"></i>
            <span>Settings</span>
          </a>
        </li>
      </ul>
    </nav>
  `;
  try {
    const response = await fetch('partials/sidebar.html');
    if (response.ok) {
      const html = await response.text();
      sidebar.innerHTML = html;
    } else {
      // Use fallback markup when the partial cannot be fetched (e.g. file:// context)
      sidebar.innerHTML = sidebarFallback;
    }
  } catch (err) {
    // In file:// contexts, fetch will throw. Use the fallback markup instead.
    sidebar.innerHTML = sidebarFallback;
  }
  // Replace icon placeholders with SVGs
  if (typeof feather !== 'undefined') {
    feather.replace();
  }
}

// Role-based permissions. Each role lists the internal "page" identifiers
// that the role is allowed to view. Administrators can view everything and
// manage rules, operators can manage rules but cannot access learning and
// settings, analysts can view most information but cannot manage rules,
// viewers have read‑only access to dashboards and logs.
const rolePermissions = {
  admin: {
    // Admins have access to all areas including the new threat intelligence page
    pages: ['dashboard', 'threat', 'intelligence', 'rules', 'logs', 'test', 'learning', 'recommendations', 'settings', 'users'],
    manageRules: true,
  },
  operator: {
    // Operators can see the intelligence feed along with other operational pages
    pages: ['dashboard', 'threat', 'intelligence', 'rules', 'logs', 'test', 'recommendations'],
    manageRules: true,
  },
  analyst: {
    // Analysts gain insight into threats, logs and learning loops
    pages: ['dashboard', 'threat', 'intelligence', 'logs', 'test', 'learning', 'recommendations'],
    manageRules: false,
  },
  viewer: {
    // Viewers have read-only access to dashboards, threats, intelligence and logs
    pages: ['dashboard', 'threat', 'intelligence', 'logs', 'test'],
    manageRules: false,
  },
};

// Hide navigation items that are not allowed for the current role and update
// the dashboard link based on whether the user is an administrator. This
// function should be called after the DOM has been parsed but before the
// navigation is used. It relies on the role stored in localStorage.
function filterNavByRole() {
  const role = localStorage.getItem('webHydraRole');
  const perms = rolePermissions[role] || { pages: [] };
  // Adjust dashboard link target based on role
  const dashLink = document.querySelector('.nav-link[data-view="dashboard"]');
  if (dashLink) {
    if (role === 'admin') {
      dashLink.setAttribute('href', 'index.html');
    } else {
      dashLink.setAttribute('href', 'user.html');
    }
  }
  document.querySelectorAll('.nav-link').forEach((link) => {
    const view = link.dataset.view;
    // Keep the dashboard link visible even if not explicitly listed in pages
    if (view !== 'dashboard' && perms.pages.indexOf(view) === -1) {
      // Hide the entire list item instead of just the link
      if (link.parentElement) link.parentElement.style.display = 'none';
    } else {
      if (link.parentElement) link.parentElement.style.display = '';
    }
  });
}

// Initialize mobile menu toggle
function initMobileMenu() {
  const button = document.getElementById('mobile-menu-button');
  const sidebar = document.getElementById('sidebar');
  if (button && sidebar) {
    button.addEventListener('click', () => {
      sidebar.classList.toggle('hidden');
    });
  }
}

// Initialize global theme toggle (topbar)
function initThemeToggle() {
  const themeBtn = document.getElementById('theme-toggle');
  if (!themeBtn) return;
  // Set initial icon
  const currentTheme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
  themeBtn.innerHTML = `<i data-feather="${currentTheme === 'dark' ? 'sun' : 'moon'}"></i>`;
  themeBtn.addEventListener('click', () => {
    document.documentElement.classList.toggle('dark');
    const newTheme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
    localStorage.setItem('webHydraTheme', newTheme);
    themeBtn.innerHTML = `<i data-feather="${newTheme === 'dark' ? 'sun' : 'moon'}"></i>`;
    feather.replace();
  });
}

// Persist user-added rules
function persistRules() {
  const stored = model.rules.filter((r) => r.id > 3);
  localStorage.setItem('webHydraRules', JSON.stringify(stored));
}

// === VIEW FUNCTIONS ===
const View = {
  renderKpis() {
    document.querySelector('.kpi-total-requests').textContent = model.kpis.totalRequests.toLocaleString();
    document.querySelector('.kpi-blocked-attacks').textContent = model.kpis.blockedAttacks.toLocaleString();
    document.querySelector('.kpi-false-positives').textContent = model.kpis.falsePositives.toLocaleString();
    document.querySelector('.kpi-model-confidence').textContent = (model.kpis.modelConfidence * 100).toFixed(1) + '%';
  },
  renderCharts() {
    // Determine if Chart.js is available; if so, use it. Otherwise, draw
    // simple charts manually. This fallback allows the dashboard to work in
    // environments without network access to Chart.js CDN.
    // Force fallback chart rendering. Chart.js may be unavailable or truncated
    // in offline environments, so we always use custom rendering functions.
    const hasChart = false;
    const trafficCanvas = document.getElementById('traffic-chart');
    const owaspCanvas = document.getElementById('owasp-chart');
    // Compute labels for last 30 days
    const labels = Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (29 - i));
      return `${date.getMonth() + 1}/${date.getDate()}`;
    });
    if (hasChart && trafficCanvas) {
      new Chart(trafficCanvas, {
        type: 'line',
        data: {
          labels,
          datasets: [{
            label: 'Requests',
            data: model.trafficData,
            borderColor: '#0d9488',
            backgroundColor: 'rgba(13,148,136,0.1)',
            fill: true,
            tension: 0.3,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: { y: { beginAtZero: true }, x: { ticks: { maxTicksLimit: 6 } } },
          plugins: { legend: { display: false } },
        },
      });
    } else if (trafficCanvas) {
      // Fallback line chart drawing
      drawLineChart(trafficCanvas, labels, model.trafficData);
    }
    if (hasChart && owaspCanvas) {
      new Chart(owaspCanvas, {
        type: 'doughnut',
        data: {
          labels: Object.keys(model.owaspCounts),
          datasets: [{
            data: Object.values(model.owaspCounts),
            backgroundColor: ['#0d9488', '#059669', '#047857', '#065f46', '#064e3b'],
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { position: 'right' } },
        },
      });
    } else if (owaspCanvas) {
      // Fallback donut chart drawing
      const data = Object.values(model.owaspCounts);
      const labelsO = Object.keys(model.owaspCounts);
      const colors = ['#0d9488', '#059669', '#047857', '#065f46', '#064e3b'];
      drawDonutChart(owaspCanvas, labelsO, data, colors);
    }
  },
  renderAlerts(sortKey = null) {
    const tbody = document.getElementById('alerts-table');
    if (!tbody) return;
    let alerts = [...model.alerts];
    if (sortKey === 'type') {
      alerts.sort((a, b) => a.type.localeCompare(b.type));
    } else if (sortKey === 'severity') {
      const order = { High: 0, Medium: 1, Low: 2 };
      alerts.sort((a, b) => order[a.severity] - order[b.severity]);
    }
    tbody.innerHTML = '';
    alerts.forEach((alert) => {
      const tr = document.createElement('tr');

      // ✅ Add severity color class
      const severityClass = {
        'Critical': 'severity-critical',
        'High': 'severity-high',
        'Medium': 'severity-medium',
        'Low': 'severity-low'
      }[alert.severity] || 'severity-low';

      tr.innerHTML = `
    <td class="px-4 py-2 whitespace-nowrap">${alert.id}</td>
    <td class="px-4 py-2 whitespace-nowrap">${alert.type}</td>
    <td class="px-4 py-2 whitespace-nowrap">
      <span class="severity-badge ${severityClass}">${alert.severity}</span>
    </td>
    <td class="px-4 py-2 whitespace-normal">${alert.description}</td>
    <td class="px-4 py-2 whitespace-nowrap">${new Date(alert.timestamp).toLocaleString()}</td>
  `;
      tbody.appendChild(tr);
    });

  },
  renderHeatmap() {
    const grid = document.getElementById('heatmap-grid');
    if (!grid) return;
    grid.innerHTML = '';

    // Ensure we have valid heatmap data
    if (!model.heatmap || model.heatmap.length === 0) {
      return;
    }

    // Find max intensity for normalization (avoid division by zero)
    const flatValues = model.heatmap.flat().filter(v => v > 0);
    const maxIntensity = flatValues.length > 0 ? Math.max(...flatValues) : 1;

    // Render: 7 days (columns) x 24 hours (rows)
    // Each day has 24 hours, so we iterate through hours first, then days
    for (let hour = 0; hour < 24; hour++) {
      for (let day = 0; day < 7; day++) {
        const value = model.heatmap[day] && model.heatmap[day][hour] !== undefined
          ? model.heatmap[day][hour]
          : 0;

        const cell = document.createElement('div');
        cell.className = 'heatmap-cell';
        cell.title = `Day ${day + 1}, Hour ${hour}: ${value.toFixed(2)} intensity`;

        const inner = document.createElement('span');
        const ratio = maxIntensity > 0 ? value / maxIntensity : 0;

        // Color gradient from light to dark teal
        const color = ratio === 0
          ? '#f0f0f0'
          : ratio < 0.2
            ? '#ecfdf5'
            : ratio < 0.4
              ? '#d1fae5'
              : ratio < 0.6
                ? '#a7f3d0'
                : ratio < 0.8
                  ? '#6ee7b7'
                  : '#34d399';

        inner.style.backgroundColor = color;
        cell.appendChild(inner);
        grid.appendChild(cell);
      }
    }
  },
  renderLiveAnomaly(message) {
    const list = document.getElementById('live-anomalies-list');
    if (!list) return;
    const entry = document.createElement('div');
    entry.className = 'p-3 rounded-lg bg-gray-50 dark:bg-gray-700 mb-2 border-l-4 border-teal-500 shadow-sm';
    entry.innerHTML = `
      <div class="flex items-start justify-between gap-2">
        <span class="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">${new Date().toLocaleTimeString()}</span>
        <span class="flex-1 text-sm break-words">${message}</span>
      </div>
    `;
    list.insertBefore(entry, list.firstChild);
    // Keep only last 50 entries
    while (list.children.length > 50) {
      list.removeChild(list.lastChild);
    }
    // Auto-scroll to top
    list.scrollTop = 0;
  },
  renderRules() {
    const tbody = document.getElementById('rules-table');
    if (!tbody) return;
    tbody.innerHTML = '';
    // Determine whether the current user can manage rules (add/edit/delete or toggle).
    const currentRole = localStorage.getItem('webHydraRole');
    const canManage = rolePermissions[currentRole] && rolePermissions[currentRole].manageRules;
    model.rules.forEach((rule) => {
      const tr = document.createElement('tr');
      let enabledCell;
      let actionsCell;
      if (canManage) {
        enabledCell = `
          <label class="inline-flex items-center cursor-pointer">
            <input type="checkbox" data-rule-id="${rule.id}" class="rule-toggle sr-only" ${rule.enabled ? 'checked' : ''}>
            <div class="w-10 h-5 bg-gray-200 dark:bg-gray-700 rounded-full peer"></div>
            <span class="absolute ml-1 h-4 w-4 bg-white dark:bg-gray-300 rounded-full transition-transform ${rule.enabled ? 'translate-x-5' : ''}"></span>
          </label>
        `;
        actionsCell = `
          <button data-edit-id="${rule.id}" class="edit-rule text-teal-600 hover:underline">Edit</button>
          <button data-delete-id="${rule.id}" class="delete-rule text-red-600 hover:underline">Delete</button>
        `;
      } else {
        // Read‑only mode: show the enabled state as text and omit actions.
        enabledCell = `<span>${rule.enabled ? 'Yes' : 'No'}</span>`;
        actionsCell = '';
      }
      tr.innerHTML = `
        <td class="px-4 py-2 whitespace-nowrap">${rule.id}</td>
        <td class="px-4 py-2 whitespace-nowrap">${rule.name}</td>
        <td class="px-4 py-2 whitespace-normal">${rule.description}</td>
        <td class="px-4 py-2">${enabledCell}</td>
        <td class="px-4 py-2 space-x-2">${actionsCell}</td>`;
      tbody.appendChild(tr);
    });
  },
  renderLogs(page = 1, filters = {}) {
    const itemsPerPage = 10;
    let logs = model.logs.filter((log) => {
      const matchesSearch = filters.search ? log.message.toLowerCase().includes(filters.search.toLowerCase()) : true;
      const matchesType = filters.type ? log.type === filters.type : true;
      const matchesSeverity = filters.severity ? log.severity === filters.severity : true;
      const matchesDate = filters.date ? new Date(log.timestamp).toDateString() === new Date(filters.date).toDateString() : true;
      return matchesSearch && matchesType && matchesSeverity && matchesDate;
    });
    const totalPages = Math.ceil(logs.length / itemsPerPage) || 1;
    page = Math.min(Math.max(page, 1), totalPages);
    const start = (page - 1) * itemsPerPage;
    const pageLogs = logs.slice(start, start + itemsPerPage);
    const tbody = document.getElementById('logs-table');
    if (!tbody) return;
    tbody.innerHTML = '';
    logs.forEach((log) => {
      const tr = document.createElement('tr');

      // Normalize & map severity → badge class
      const sev = (log.severity || '').toString().trim();
      const sevKey =
        sev.toLowerCase() === 'critical' ? 'Critical' :
          sev.toLowerCase() === 'high' ? 'High' :
            sev.toLowerCase() === 'medium' ? 'Medium' :
              'Low';

      const severityClass = {
        'Critical': 'severity-critical',
        'High': 'severity-high',
        'Medium': 'severity-medium',
        'Low': 'severity-low'
      }[sevKey];

      tr.innerHTML = `
    <td class="px-4 py-2 whitespace-nowrap">${log.id}</td>
    <td class="px-4 py-2 whitespace-nowrap">${log.type}</td>
    <td class="px-4 py-2 whitespace-nowrap">
      <span class="severity-badge ${severityClass}">${sevKey}</span>
    </td>
    <td class="px-4 py-2 whitespace-normal">${log.message}</td>
    <td class="px-4 py-2 whitespace-nowrap">${new Date(log.timestamp).toLocaleString()}</td>
  `;
      tbody.appendChild(tr);
    });
    const info = document.getElementById('logs-page-info');
    if (info) info.textContent = `Page ${page} of ${totalPages}`;
    const prevBtn = document.getElementById('logs-prev');
    const nextBtn = document.getElementById('logs-next');
    if (prevBtn && nextBtn) {
      prevBtn.disabled = page <= 1;
      nextBtn.disabled = page >= totalPages;
      prevBtn.dataset.page = page - 1;
      nextBtn.dataset.page = page + 1;
    }
  },
  renderRecommendations() {
    const list = document.getElementById('recommendations-list');
    if (!list) return;
    list.innerHTML = '';
    const currentRole = localStorage.getItem('webHydraRole');
    const canManage = rolePermissions[currentRole] && rolePermissions[currentRole].manageRules;
    model.recommendations.forEach((rec) => {
      const div = document.createElement('div');
      div.className = 'bg-white dark:bg-gray-800 p-4 rounded-2xl shadow flex justify-between items-center';
      // Determine whether the apply button should be disabled. If the recommendation is already applied
      // or the current role lacks rule management privileges, disable it. The disabled state also
      // reduces opacity via Tailwind's disabled:opacity-50 class.
      const isDisabled = rec.applied || !canManage;
      div.innerHTML = `
        <div>
          <p class="text-sm text-gray-800 dark:text-gray-200 mb-1">${rec.message}</p>
          <p class="text-xs text-gray-500 dark:text-gray-400">Suggested action: ${rec.action.name}</p>
        </div>
        <button ${isDisabled ? 'disabled' : ''} data-rec-id="${rec.id}" class="apply-rec bg-teal-600 hover:bg-teal-700 text-white px-3 py-1 rounded disabled:opacity-50">${rec.applied ? 'Applied' : 'Apply'}</button>`;
      list.appendChild(div);
    });
  },
  renderSettings() {
    const themeCheckbox = document.getElementById('settings-theme-toggle');
    if (themeCheckbox) {
      themeCheckbox.checked = document.documentElement.classList.contains('dark');
    }
    const apiField = document.getElementById('api-key-field');
    const maskedKey = model.apiKey.replace(/.(?=.{4})/g, '*');
    if (apiField) {
      apiField.value = maskedKey;
      apiField.dataset.full = model.apiKey;
      apiField.dataset.masked = maskedKey;
      apiField.type = 'password';
    }
    const toggleBtn = document.getElementById('api-key-toggle');
    if (toggleBtn) toggleBtn.textContent = 'Show';
  },
};

// === Chart Fallback Utilities ===
// Simple line chart renderer for environments without Chart.js. Draws a line
// chart on the given canvas using basic Canvas 2D operations. The labels
// argument is unused here but kept for signature consistency.
function drawLineChart(canvas, labels, data) {
  const ctx = canvas.getContext('2d');
  // Determine size using bounding rect to ensure dimensions are non-zero
  const rect = canvas.getBoundingClientRect();
  const width = rect.width || 400;
  const height = rect.height || 256;
  // Set canvas dimensions explicitly to render crisp graphics
  canvas.width = width;
  canvas.height = height;
  const padding = 40;
  const plotWidth = width - padding * 2;
  const plotHeight = height - padding * 2;
  const maxValue = Math.max(...data) * 1.1;
  const minValue = 0;
  ctx.clearRect(0, 0, width, height);
  ctx.strokeStyle = '#e5e7eb';
  ctx.lineWidth = 1;
  ctx.beginPath();
  // Draw horizontal grid lines
  const gridLines = 5;
  for (let i = 0; i <= gridLines; i++) {
    const y = padding + (plotHeight / gridLines) * i;
    ctx.moveTo(padding, y);
    ctx.lineTo(width - padding, y);
  }
  ctx.stroke();
  // Draw line
  ctx.strokeStyle = '#0d9488';
  ctx.lineWidth = 2;
  ctx.beginPath();
  data.forEach((val, idx) => {
    const x = padding + (plotWidth / (data.length - 1)) * idx;
    const yRatio = (val - minValue) / (maxValue - minValue);
    const y = height - padding - yRatio * plotHeight;
    if (idx === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
  // Draw area fill
  ctx.fillStyle = 'rgba(13, 148, 136, 0.1)';
  ctx.beginPath();
  data.forEach((val, idx) => {
    const x = padding + (plotWidth / (data.length - 1)) * idx;
    const yRatio = (val - minValue) / (maxValue - minValue);
    const y = height - padding - yRatio * plotHeight;
    if (idx === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  // Close the area to the x-axis
  ctx.lineTo(padding + plotWidth, height - padding);
  ctx.lineTo(padding, height - padding);
  ctx.closePath();
  ctx.fill();
}

// Simple donut chart renderer for environments without Chart.js. Draws a
// donut/pie chart on the given canvas with provided labels, data values, and
// colors. No legend is drawn; rely on accompanying text in the UI.
function drawDonutChart(canvas, labels, data, colors) {
  const ctx = canvas.getContext('2d');
  const rect = canvas.getBoundingClientRect();
  const width = rect.width || 400;
  const height = rect.height || 256;
  canvas.width = width;
  canvas.height = height;
  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.min(width, height) * 0.4;
  const innerRadius = radius * 0.6;
  const total = data.reduce((sum, v) => sum + v, 0);
  let startAngle = -0.5 * Math.PI;
  // Keep track of each segment's start and end angles and label for hover detection
  const segments = [];
  data.forEach((value, idx) => {
    const angle = (value / total) * 2 * Math.PI;
    const endAngle = startAngle + angle;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radius, startAngle, endAngle);
    ctx.closePath();
    ctx.fillStyle = colors[idx % colors.length];
    ctx.fill();
    segments.push({ start: startAngle, end: endAngle, label: labels[idx], color: colors[idx % colors.length] });
    startAngle = endAngle;
  });
  // Hollow out inner circle
  ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath();
  ctx.arc(cx, cy, innerRadius, 0, 2 * Math.PI);
  ctx.fill();
  ctx.globalCompositeOperation = 'source-over';

  // Interactive tooltip: show label when hovering over a segment
  // Create a global tooltip element if it doesn't exist yet. Use fixed
  // positioning so the tooltip is not clipped by container overflow and
  // appears relative to the viewport.
  let tooltip = document.querySelector('.donut-tooltip');
  if (!tooltip) {
    tooltip = document.createElement('div');
    // Use a light background and border so the tooltip is visible in both dark and light themes.
    tooltip.className = 'donut-tooltip pointer-events-none fixed text-sm px-2 py-1 rounded shadow-lg bg-gray-200 text-black hidden z-50 border border-gray-400';
    document.body.appendChild(tooltip);
  }
  function onMove(e) {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const dx = x - cx;
    const dy = y - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    // If pointer is outside the donut ring, hide tooltip
    if (dist < innerRadius || dist > radius) {
      tooltip.classList.add('hidden');
      return;
    }
    // Compute raw angle from positive x-axis, normalized to [0, 2π)
    let rawAngle = Math.atan2(dy, dx);
    if (rawAngle < 0) rawAngle += 2 * Math.PI;
    // Iterate through stored segments to determine if pointer lies within one
    for (const seg of segments) {
      // Normalize segment start and end angles to [0, 2π)
      const segStart = ((seg.start % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
      const segEnd = ((seg.end % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
      let inSegment;
      if (segEnd < segStart) {
        // Segment crosses 0 radians boundary
        inSegment = rawAngle >= segStart || rawAngle <= segEnd;
      } else {
        inSegment = rawAngle >= segStart && rawAngle <= segEnd;
      }
      if (inSegment) {
        tooltip.textContent = seg.label;
        // Position the tooltip relative to the viewport rather than the canvas
        // so it is not clipped by container boundaries. Use clientX/Y from the event.
        tooltip.style.left = `${e.clientX + 10}px`;
        tooltip.style.top = `${e.clientY + 10}px`;
        tooltip.classList.remove('hidden');
        return;
      }
    }
    // Not hovering any segment
    tooltip.classList.add('hidden');
  }
  function onLeave() {
    tooltip.classList.add('hidden');
  }
  canvas.onmousemove = onMove;
  canvas.onmouseleave = onLeave;
}

// === PAGE INITIALIZERS ===
function initDashboard() {
  // Load real data from API
  if (typeof loadRealData === 'function') {
    loadRealData().then(() => {
      View.renderKpis();
      View.renderCharts();
      View.renderAlerts();
    });
  } else {
    View.renderKpis();
    View.renderCharts();
    View.renderAlerts();
  }

  // Refresh data every 60 seconds (reduced from 30s for performance)
  if (typeof loadRealData === 'function') {
    setInterval(() => {
      loadRealData().then(() => {
        View.renderKpis();
        View.renderCharts();
        View.renderAlerts();
      });
    }, 60000);
  }

  const sortType = document.getElementById('alerts-sort-type');
  const sortSeverity = document.getElementById('alerts-sort-severity');
  if (sortType) sortType.addEventListener('click', () => View.renderAlerts('type'));
  if (sortSeverity) sortSeverity.addEventListener('click', () => View.renderAlerts('severity'));
}

function initThreat() {
  let lastAlertIds = new Set(); // Track shown alerts to avoid duplicates

  // Load and render initial heatmap data
  function refreshHeatmap() {
    if (typeof fetchHeatmap === 'function') {
      fetchHeatmap().then((heatmap) => {
        if (heatmap.length > 0 && window.mockData) {
          window.mockData.heatmap = heatmap;
        }
        View.renderHeatmap();
      });
    } else {
      View.renderHeatmap();
    }
  }

  // Initial load
  refreshHeatmap();

  // Refresh heatmap every 60 seconds
  const heatmapInterval = setInterval(refreshHeatmap, 60000);

  const anomalyBtn = document.getElementById('toggle-live-anomalies');
  let anomalyInterval;
  let isPaused = false;

  function start() {
    if (isPaused) return;
    anomalyInterval = setInterval(() => {
      // Fetch recent alerts for live anomalies
      if (typeof fetchAlerts === 'function') {
        fetchAlerts(5).then((alerts) => {
          // Find new alerts that haven't been shown yet
          const newAlerts = alerts.filter(alert => !lastAlertIds.has(alert.id));

          if (newAlerts.length > 0) {
            // Show the most recent new alert
            const alert = newAlerts[0];
            lastAlertIds.add(alert.id);

            // Format the alert message with severity indicator
            const severityIcon = {
              'Critical': '🔴',
              'High': '🟠',
              'Medium': '🟡',
              'Low': '🟢'
            }[alert.severity] || '⚪';

            const message = `${severityIcon} [${alert.severity}] ${alert.type}: ${alert.description.substring(0, 80)}${alert.description.length > 80 ? '...' : ''}`;
            View.renderLiveAnomaly(message);

            // Keep only last 20 alert IDs to prevent memory issues
            if (lastAlertIds.size > 20) {
              const idsArray = Array.from(lastAlertIds);
              lastAlertIds = new Set(idsArray.slice(-20));
            }
          } else if (alerts.length > 0) {
            // If no new alerts, show the most recent one anyway (but mark it as seen)
            const alert = alerts[0];
            if (!lastAlertIds.has(alert.id)) {
              lastAlertIds.add(alert.id);
              const severityIcon = {
                'Critical': '🔴',
                'High': '🟠',
                'Medium': '🟡',
                'Low': '🟢'
              }[alert.severity] || '⚪';
              const message = `${severityIcon} [${alert.severity}] ${alert.type}: ${alert.description.substring(0, 80)}${alert.description.length > 80 ? '...' : ''}`;
              View.renderLiveAnomaly(message);
            }
          } else {
            // No alerts available - don't spam messages
            // Only show status message occasionally
            if (Math.random() < 0.1) { // 10% chance
              const messages = [
                'Monitoring traffic patterns...',
                'No anomalies detected in last check',
                'System operating normally',
              ];
              const msg = messages[Math.floor(Math.random() * messages.length)];
              View.renderLiveAnomaly(`ℹ️ ${msg}`);
            }
          }
        }).catch((err) => {
          // If API fails, show error message occasionally
          if (Math.random() < 0.05) { // 5% chance to avoid spam
            View.renderLiveAnomaly('⚠️ Unable to fetch alerts - check API connection');
          }
        });
      } else {
        const messages = [
          'New SQL injection pattern detected',
          'Spike in traffic from IP 192.168.1.5',
          'Command injection attempt logged',
          'Unknown anomaly signature observed',
        ];
        const msg = messages[Math.floor(Math.random() * messages.length)];
        View.renderLiveAnomaly(msg);
      }
    }, 5000); // Check every 5 seconds
  }

  function stop() {
    if (anomalyInterval) {
      clearInterval(anomalyInterval);
      anomalyInterval = null;
    }
    isPaused = true;
  }

  function resume() {
    isPaused = false;
    start();
  }

  // Start immediately
  start();

  if (anomalyBtn) {
    anomalyBtn.addEventListener('click', () => {
      if (isPaused) {
        resume();
        anomalyBtn.textContent = 'Pause';
      } else {
        stop();
        anomalyBtn.textContent = 'Resume';
      }
    });
  }

  // Cleanup on page unload
  window.addEventListener('beforeunload', () => {
    clearInterval(heatmapInterval);
    if (anomalyInterval) clearInterval(anomalyInterval);
  });
}

// Initialize the Threat Intelligence page. The page displays static
// placeholder content for various threat intelligence feeds (e.g.
// VirusTotal, AlienVault OTX, AbuseIPDB) so no dynamic JavaScript is
// required at this time. This function exists to maintain parity with
// other page initializers and can be extended in the future if the
// feeds become interactive.
function initIntelligence() {
  // Intentionally empty – threat-intelligence.html contains its own
  // static markup. If dynamic behaviour is needed later this function
  // can be updated accordingly.
}

function openRuleModal(ruleId = null) {
  const modal = document.getElementById('rule-modal');
  const title = document.getElementById('rule-modal-title');
  const nameField = document.getElementById('rule-name');
  const descField = document.getElementById('rule-description');
  modal.classList.remove('hidden');
  modal.setAttribute('aria-hidden', 'false');
  modal.dataset.editId = ruleId || '';
  if (ruleId) {
    const rule = model.rules.find((r) => r.id === ruleId);
    title.textContent = 'Edit Rule';
    nameField.value = rule.name;
    descField.value = rule.description;
  } else {
    title.textContent = 'Add Rule';
    nameField.value = '';
    descField.value = '';
  }
}

function closeRuleModal() {
  const modal = document.getElementById('rule-modal');
  modal.classList.add('hidden');
  modal.setAttribute('aria-hidden', 'true');
}

function saveRule() {
  const modal = document.getElementById('rule-modal');
  const name = document.getElementById('rule-name').value.trim();
  const desc = document.getElementById('rule-description').value.trim();
  if (!name || !desc) return;
  const editId = modal.dataset.editId;
  if (editId) {
    const rule = model.rules.find((r) => r.id === parseInt(editId));
    if (rule) {
      rule.name = name;
      rule.description = desc;
    }
  } else {
    const newId = model.rules.length ? Math.max(...model.rules.map((r) => r.id)) + 1 : 1;
    model.rules.push({ id: newId, name, description: desc, enabled: true });
  }
  persistRules();
  View.renderRules();
  closeRuleModal();
}

function deleteRule(ruleId) {
  if (confirm('Delete this rule?')) {
    const idx = model.rules.findIndex((r) => r.id === ruleId);
    if (idx !== -1) {
      model.rules.splice(idx, 1);
      persistRules();
      View.renderRules();
    }
  }
}

function initRules() {
  View.renderRules();
  const role = localStorage.getItem('webHydraRole');
  const canManage = rolePermissions[role] && rolePermissions[role].manageRules;
  // Hide the "Add Rule" button for roles that cannot manage rules
  const openBtn = document.getElementById('open-add-rule');
  if (openBtn) {
    if (!canManage) {
      openBtn.style.display = 'none';
    } else {
      openBtn.addEventListener('click', () => openRuleModal());
    }
  }
  const closeBtn = document.getElementById('close-rule-modal');
  if (closeBtn) closeBtn.addEventListener('click', () => closeRuleModal());
  const form = document.getElementById('rule-form');
  if (form) form.addEventListener('submit', (e) => {
    e.preventDefault();
    saveRule();
  });
  const table = document.getElementById('rules-table');
  if (table) {
    table.addEventListener('change', (e) => {
      if (e.target.classList.contains('rule-toggle')) {
        const id = parseInt(e.target.dataset.ruleId);
        const rule = model.rules.find((r) => r.id === id);
        if (rule) {
          rule.enabled = e.target.checked;
          persistRules();
        }
      }
    });
    table.addEventListener('click', (e) => {
      const editId = e.target.getAttribute('data-edit-id');
      const deleteId = e.target.getAttribute('data-delete-id');
      if (editId) openRuleModal(parseInt(editId));
      if (deleteId) deleteRule(parseInt(deleteId));
    });
  }
}

function initLogs() {
  // Load real logs from API
  if (typeof loadRealLogs === 'function') {
    loadRealLogs().then(() => {
      const state = { page: 1, search: '', type: '', severity: '', date: '' };
      function update() { View.renderLogs(state.page, state); }
      const searchInput = document.getElementById('logs-search');
      searchInput?.addEventListener('input', (e) => { state.search = e.target.value; state.page = 1; update(); });
      const typeSelect = document.getElementById('logs-type-filter');
      typeSelect?.addEventListener('change', (e) => { state.type = e.target.value; state.page = 1; update(); });
      const severitySelect = document.getElementById('logs-severity-filter');
      severitySelect?.addEventListener('change', (e) => { state.severity = e.target.value; state.page = 1; update(); });
      const dateInput = document.getElementById('logs-date-filter');
      dateInput?.addEventListener('change', (e) => { state.date = e.target.value; state.page = 1; update(); });
      const prevBtn = document.getElementById('logs-prev');
      prevBtn?.addEventListener('click', (e) => { state.page = parseInt(e.target.dataset.page); update(); });
      const nextBtn = document.getElementById('logs-next');
      nextBtn?.addEventListener('click', (e) => { state.page = parseInt(e.target.dataset.page); update(); });
      update();

      // Refresh logs every 30 seconds (reduced from 10s for performance)
      setInterval(() => {
        loadRealLogs().then(() => update());
      }, 30000);
    });
  } else {
    const state = { page: 1, search: '', type: '', severity: '', date: '' };
    function update() { View.renderLogs(state.page, state); }
    const searchInput = document.getElementById('logs-search');
    searchInput?.addEventListener('input', (e) => { state.search = e.target.value; state.page = 1; update(); });
    const typeSelect = document.getElementById('logs-type-filter');
    typeSelect?.addEventListener('change', (e) => { state.type = e.target.value; state.page = 1; update(); });
    const severitySelect = document.getElementById('logs-severity-filter');
    severitySelect?.addEventListener('change', (e) => { state.severity = e.target.value; state.page = 1; update(); });
    const dateInput = document.getElementById('logs-date-filter');
    dateInput?.addEventListener('change', (e) => { state.date = e.target.value; state.page = 1; update(); });
    const prevBtn = document.getElementById('logs-prev');
    prevBtn?.addEventListener('click', (e) => { state.page = parseInt(e.target.dataset.page); update(); });
    const nextBtn = document.getElementById('logs-next');
    nextBtn?.addEventListener('click', (e) => { state.page = parseInt(e.target.dataset.page); update(); });
    update();
  }
}

function initLearning() {
  const fileInput = document.getElementById('dataset-file');
  const summary = document.getElementById('dataset-summary');
  const startBtn = document.getElementById('start-training');
  const progressBar = document.getElementById('training-progress-bar');
  const progressText = document.getElementById('training-progress-text');
  const logsContainer = document.getElementById('training-logs');
  fileInput?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      summary.textContent = `Selected file: ${file.name} (simulated 1000 records)`;
      startBtn.disabled = false;
    } else {
      summary.textContent = '';
      startBtn.disabled = true;
    }
  });
  startBtn?.addEventListener('click', () => {
    if (model.training.inProgress) return;
    model.training.inProgress = true;
    model.training.progress = 0;
    model.training.logs = [];
    progressBar.style.width = '0%';
    progressText.textContent = 'Starting retraining...';
    logsContainer.textContent = '';
    startBtn.disabled = true;
    const steps = 20;
    let current = 0;
    const interval = setInterval(() => {
      current++;
      const percentage = Math.floor((current / steps) * 100);
      progressBar.style.width = `${percentage}%`;
      progressText.textContent = `Retraining: ${percentage}%`;
      const log = `Epoch ${current}: loss ${(Math.random() * 0.1 + 0.1).toFixed(3)}, accuracy ${(0.7 + Math.random() * 0.2).toFixed(3)}`;
      model.training.logs.push(log);
      logsContainer.textContent += log + '\n';
      logsContainer.scrollTop = logsContainer.scrollHeight;
      if (current >= steps) {
        clearInterval(interval);
        model.training.inProgress = false;
        progressText.textContent = 'Retraining complete!';
        model.kpis.modelConfidence = Math.min(model.kpis.modelConfidence + 0.02, 0.99);
        setTimeout(() => { startBtn.disabled = false; }, 1000);
      }
    }, 500);
  });
}

function initRecommendations() {
  View.renderRecommendations();
  const list = document.getElementById('recommendations-list');
  list?.addEventListener('click', (e) => {
    const id = e.target.getAttribute('data-rec-id');
    if (!id) return;
    const rec = model.recommendations.find((r) => r.id === parseInt(id));
    if (!rec || rec.applied) return;
    const newId = model.rules.length ? Math.max(...model.rules.map((r) => r.id)) + 1 : 1;
    model.rules.push({ id: newId, name: rec.action.name, description: rec.action.description, enabled: true });
    rec.applied = true;
    View.renderRecommendations();
    persistRules();
  });
}

function initSettings() {
  View.renderSettings();
  const themeCheckbox = document.getElementById('settings-theme-toggle');
  themeCheckbox?.addEventListener('change', () => {
    document.documentElement.classList.toggle('dark');
    const newTheme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
    localStorage.setItem('webHydraTheme', newTheme);
  });
  const apiField = document.getElementById('api-key-field');
  const toggleBtn = document.getElementById('api-key-toggle');
  toggleBtn?.addEventListener('click', () => {
    if (apiField.type === 'password') {
      apiField.type = 'text';
      apiField.value = apiField.dataset.full;
      toggleBtn.textContent = 'Hide';
    } else {
      apiField.type = 'password';
      apiField.value = apiField.dataset.masked;
      toggleBtn.textContent = 'Show';
    }
  });
  const regenBtn = document.getElementById('api-key-regenerate');
  regenBtn?.addEventListener('click', () => {
    const randomKey = 'key-' + Math.random().toString(36).substring(2, 10) + '-' + Math.random().toString(36).substring(2, 8);
    model.apiKey = randomKey;
    localStorage.setItem('webHydraApiKey', randomKey);
    View.renderSettings();
  });
}

// === User Management Utilities ===
// Load the list of users from localStorage. If none exist, initialize
// with default accounts. This ensures that at least one administrator
// and one viewer account always exist so the application is usable out
// of the box. Returns an array of user objects { username, password, role }.
function loadUsers() {
  let users;
  try {
    users = JSON.parse(localStorage.getItem('webHydraUsers'));
  } catch (e) {
    users = null;
  }
  if (!Array.isArray(users) || !users.length) {
    users = [
      { username: 'admin', password: 'admin123', role: 'admin' },
      { username: 'user', password: 'user123', role: 'viewer' },
    ];
    localStorage.setItem('webHydraUsers', JSON.stringify(users));
  }
  return users;
}

// Save the provided list of users back to localStorage. This overwrites
// whatever was stored previously. Be careful to call this after making
// changes to the user list.
function saveUsers(users) {
  localStorage.setItem('webHydraUsers', JSON.stringify(users));
}

// Render the user table on the User Management page. Each row lists the
// username and role and, for users other than the built‑in admin,
// provides Edit and Delete actions. The admin account is protected
// against deletion to prevent accidental lock‑out.
function renderUsers() {
  const table = document.getElementById('users-table');
  if (!table) return;
  const users = loadUsers();
  table.innerHTML = '';
  users.forEach((user, idx) => {
    const tr = document.createElement('tr');
    let actions = '';
    // Disallow editing or deleting the built‑in admin account by omitting action buttons.
    if (user.username !== 'admin') {
      actions = `<button data-edit-index="${idx}" class="edit-user text-teal-600 hover:underline mr-2">Edit</button>` +
        `<button data-delete-index="${idx}" class="delete-user text-red-600 hover:underline">Delete</button>`;
    }
    tr.innerHTML = `
      <td class="px-4 py-2 whitespace-nowrap">${user.username}</td>
      <td class="px-4 py-2 whitespace-nowrap">${user.role}</td>
      <td class="px-4 py-2 whitespace-nowrap">${actions}</td>`;
    table.appendChild(tr);
  });
}

// Open the user modal for adding a new user or editing an existing one.
// When editing, index refers to the position in the users array. The
// modal's dataset.editIndex property stores this index for use when
// saving. On open, fields are pre‑filled if editing.
function openUserModal(index = null) {
  const modal = document.getElementById('user-modal');
  const title = document.getElementById('user-modal-title');
  const usernameField = document.getElementById('user-username');
  const passwordField = document.getElementById('user-password');
  const roleField = document.getElementById('user-role');
  modal.classList.remove('hidden');
  modal.setAttribute('aria-hidden', 'false');
  modal.dataset.editIndex = index !== null ? index : '';
  if (index !== null) {
    const users = loadUsers();
    const user = users[index];
    title.textContent = 'Edit User';
    usernameField.value = user.username;
    passwordField.value = user.password;
    roleField.value = user.role;
    // When editing, disable changing username of admin to avoid confusion
    usernameField.disabled = user.username === 'admin';
  } else {
    title.textContent = 'Add User';
    usernameField.value = '';
    passwordField.value = '';
    roleField.value = 'viewer';
    usernameField.disabled = false;
  }
}

// Hide the user modal and reset the form fields. Remove the editIndex
// attribute so subsequent opens are treated as adds by default.
function closeUserModal() {
  const modal = document.getElementById('user-modal');
  modal.classList.add('hidden');
  modal.setAttribute('aria-hidden', 'true');
  delete modal.dataset.editIndex;
}

// Persist the user currently entered in the modal. When editing, the
// existing entry is updated. When adding, a new entry is appended to
// the array. Performs basic validation such as ensuring the username
// is not blank and does not already exist. Passwords are stored in
// plain text for this demonstration; in a real application they should
// be hashed and salted.
function saveUser() {
  const username = document.getElementById('user-username').value.trim();
  const password = document.getElementById('user-password').value;
  const role = document.getElementById('user-role').value;
  if (!username || !password || !role) {
    alert('Please enter all fields.');
    return;
  }
  const users = loadUsers();
  const modal = document.getElementById('user-modal');
  const editIndex = modal.dataset.editIndex;
  // Prevent duplicate usernames when adding or renaming
  const duplicate = users.findIndex((u, i) => u.username === username && (editIndex === '' || parseInt(editIndex) !== i));
  if (duplicate !== -1) {
    alert('A user with that username already exists.');
    return;
  }
  if (editIndex !== '') {
    // Update existing user
    const idx = parseInt(editIndex);
    users[idx].username = username;
    users[idx].password = password;
    users[idx].role = role;
  } else {
    // Add new user
    users.push({ username, password, role });
  }
  saveUsers(users);
  renderUsers();
  closeUserModal();
}

// Delete a user at the specified index after confirmation. Protect
// against deleting the built‑in admin account and also prevent an
// administrator from deleting their own currently logged‑in account
// which would require logging out first.
function deleteUser(index) {
  const users = loadUsers();
  const currentUsername = localStorage.getItem('webHydraUsername');
  const user = users[index];
  if (!user || user.username === 'admin') {
    return;
  }
  if (user.username === currentUsername) {
    alert('You cannot delete your own account while logged in.');
    return;
  }
  if (confirm(`Delete user ${user.username}?`)) {
    users.splice(index, 1);
    saveUsers(users);
    renderUsers();
  }
}

// Initialize the User Management page. Renders the user table and
// attaches event listeners for opening the modal, saving users, and
// handling edit/delete actions on the table. Only administrators can
// access this page by virtue of rolePermissions but we defensively
// hide the Add User button if a non‑admin somehow arrives here.
function initUsers() {
  const role = localStorage.getItem('webHydraRole');
  // Only admins should see the Add User button
  const addBtn = document.getElementById('open-add-user');
  if (addBtn) {
    if (role !== 'admin') {
      addBtn.style.display = 'none';
    } else {
      addBtn.addEventListener('click', () => openUserModal());
    }
  }
  const closeBtn = document.getElementById('close-user-modal');
  closeBtn?.addEventListener('click', () => closeUserModal());
  const form = document.getElementById('user-form');
  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    saveUser();
  });
  const table = document.getElementById('users-table');
  table?.addEventListener('click', (e) => {
    const editIdx = e.target.getAttribute('data-edit-index');
    const delIdx = e.target.getAttribute('data-delete-index');
    if (editIdx !== null && editIdx !== '') {
      openUserModal(parseInt(editIdx));
    }
    if (delIdx !== null && delIdx !== '') {
      deleteUser(parseInt(delIdx));
    }
  });
  // Render the initial user list
  renderUsers();
}

// === Initialization ===
// Since this script is loaded with the `defer` attribute on each page,
// it may execute after the DOMContentLoaded event has already fired. In such
// cases, registering a DOMContentLoaded listener would not run. To ensure
// initialization always occurs, check the document.readyState and either
// execute immediately or register a listener accordingly.
async function initializeWebHydra() {
  // Enforce authentication first. If not logged in, checkLogin() will
  // redirect to the login page and we stop further initialization.
  if (!checkLogin()) {
    return;
  }
  // If the model was initially empty due to mock data not being defined at
  // script load time, attempt to copy from window.mockData now. This
  // prevents runtime errors when reading KPI values.
  if (!model.kpis && window.mockData) {
    Object.assign(model, JSON.parse(JSON.stringify(window.mockData)));
  }
  loadPersistedData();
  // Inject the sidebar partial before manipulating navigation. This ensures that
  // nav elements exist in the DOM when highlighted or filtered.
  await loadSidebar();
  highlightActiveNav();
  // Hide navigation items and adjust links based on the current role
  filterNavByRole();
  // Initialize mobile menu toggle after the sidebar has been added
  initMobileMenu();
  initThemeToggle();
  // Initialize logout button if present
  initLogout();
  const page = document.body.dataset.page;
  if (page === 'dashboard') initDashboard();
  else if (page === 'threat') initThreat();
  else if (page === 'intelligence') initIntelligence && initIntelligence();
  else if (page === 'rules') initRules();
  else if (page === 'logs') initLogs();
  else if (page === 'test') {
    // Test page initialization is handled by test.js
    if (typeof initTest === 'function') {
      initTest();
    }
  }
  else if (page === 'learning') initLearning();
  else if (page === 'recommendations') initRecommendations();
  else if (page === 'settings') initSettings();
  else if (page === 'users') initUsers();
  feather.replace();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeWebHydra);
} else {
  // If DOMContentLoaded has already fired, initialize immediately.
  initializeWebHydra();
}