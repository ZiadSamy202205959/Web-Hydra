// Utility helper functions
class Helpers {
  static checkLogin() {
    const currentFile = window.location.pathname.split('/').pop();
    if (currentFile === 'login.html') {
      return true;
    }

    // Check for valid session
    const role = StorageService.getRole();
    const token = localStorage.getItem('authToken');
    const loggedIn = StorageService.getItem('webHydraLoggedIn');

    // Must have token, role, and logged in flag
    if (!token || !role || loggedIn !== 'true') {
      StorageService.clearSession();
      window.location.href = 'login.html';
      return false;
    }

    // Role-based dashboard redirection
    if (currentFile === 'user.html' && role === 'admin') {
      window.location.href = 'index.html';
      return false;
    }

    if (currentFile === 'index.html' && role !== 'admin') {
      window.location.href = 'user.html';
      return false;
    }

    const perms = ROLE_PERMISSIONS[role];
    if (!perms) {
      StorageService.clearSession();
      window.location.href = 'login.html';
      return false;
    }

    const currentPage = document.body.dataset.page;
    // Allow dashboard access for everyone (mapped to correct file above)
    if (currentPage && currentPage !== 'dashboard' && perms.pages.indexOf(currentPage) === -1) {
      // Redirect to their appropriate dashboard if trying to access unauthorized page
      window.location.href = role === 'admin' ? 'index.html' : 'user.html';
      return false;
    }

    return true;
  }

  static async loadSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;

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
            <a href="logs.html" class="nav-link flex items-center px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition" data-view="logs">
              <i data-feather="file-text" class="mr-3"></i>
              <span>Logs</span>
            </a>
          </li>
          <!-- WAF Test Suite hidden by user request -->
          <!-- 
          <li>
            <a href="test.html" class="nav-link flex items-center px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition" data-view="test">
              <i data-feather="play-circle" class="mr-3"></i>
              <span>WAF Test Suite</span>
            </a>
          </li>
          -->
          <li>
            <a href="recommendations.html" class="nav-link flex items-center px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition" data-view="recommendations">
              <i data-feather="thumbs-up" class="mr-3"></i>
              <span>Recommendations</span>
            </a>
          </li>
          <li>
            <a href="database.html" class="nav-link flex items-center px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition" data-view="database">
              <i data-feather="database" class="mr-3"></i>
              <span>Database Admin</span>
            </a>
          </li>
          <li>
            <a href="profile.html" class="nav-link flex items-center px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition" data-view="profile">
              <i data-feather="user" class="mr-3"></i>
              <span>Profile</span>
            </a>
          </li>
        </ul>
      </nav>
    `;

    // Use sidebar caching for faster page loads
    const fetchSidebar = async () => {
      try {
        const response = await fetch('partials/sidebar.html');
        if (response.ok) {
          return await response.text();
        }
      } catch (err) {
        // Ignore fetch errors
      }
      return sidebarFallback;
    };

    let html;
    if (typeof SidebarCache !== 'undefined') {
      html = await SidebarCache.getOrFetch(fetchSidebar);
    } else {
      html = await fetchSidebar();
    }

    sidebar.innerHTML = html;

    if (typeof feather !== 'undefined') {
      feather.replace();
    }
  }

  static highlightActiveNav() {
    const current = document.body.dataset.page;
    document.querySelectorAll('.nav-link').forEach((link) => {
      link.classList.remove('bg-gray-100', 'dark:bg-gray-700', 'text-teal-600');
      if (link.dataset.view === current) {
        link.classList.add('bg-gray-100', 'dark:bg-gray-700', 'text-teal-600');
      }
    });
  }

  static filterNavByRole() {
    const role = StorageService.getRole();
    const perms = ROLE_PERMISSIONS[role] || { pages: [] };

    const dashLink = document.querySelector('.nav-link[data-view="dashboard"]');
    if (dashLink) {
      dashLink.setAttribute('href', role === 'admin' ? 'index.html' : 'user.html');
    }

    document.querySelectorAll('.nav-link').forEach((link) => {
      const view = link.dataset.view;
      if (view !== 'dashboard' && perms.pages.indexOf(view) === -1) {
        if (link.parentElement) link.parentElement.style.display = 'none';
      } else {
        if (link.parentElement) link.parentElement.style.display = '';
      }
    });
  }

  static initMobileMenu() {
    const button = document.getElementById('mobile-menu-button');
    const sidebar = document.getElementById('sidebar');
    if (button && sidebar) {
      button.addEventListener('click', () => {
        // For the new slide-over sidebar in style.css
        sidebar.classList.toggle('open');

        // Also toggle hidden for backward compatibility or if CSS fails to load
        // But mainly we rely on the CSS #sidebar logic now
        if (sidebar.classList.contains('open')) {
          sidebar.classList.remove('hidden');
        } else {
          // Delay adding hidden if we want animation to finish, but
          // our CSS overrides hidden anyway via ID selector.
          // So this might not be strictly necessary, but good for cleanliness.
          sidebar.classList.remove('hidden');
        }
      });

      // Close sidebar when clicking outside on mobile
      sidebar.addEventListener('click', (e) => {
        if (e.target === sidebar) {
          sidebar.classList.remove('open');
        }
      });
    }
  }

  static initThemeToggle() {
    const themeBtn = document.getElementById('theme-toggle');
    if (!themeBtn) return;

    const currentTheme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
    themeBtn.innerHTML = `<i data-feather="${currentTheme === 'dark' ? 'sun' : 'moon'}"></i>`;

    themeBtn.addEventListener('click', () => {
      document.documentElement.classList.toggle('dark');
      const newTheme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
      StorageService.setTheme(newTheme);
      themeBtn.innerHTML = `<i data-feather="${newTheme === 'dark' ? 'sun' : 'moon'}"></i>`;
      feather.replace();
    });
  }

  static initLogout() {
    const btn = document.getElementById('logout-btn');
    if (btn) {
      btn.addEventListener('click', () => {
        StorageService.clearSession();
        window.location.href = 'login.html';
      });
    }
  }

  static loadPersistedData() {
    const storedTheme = StorageService.getTheme();
    if (storedTheme === 'light') {
      document.documentElement.classList.remove('dark');
    } else {
      document.documentElement.classList.add('dark');
    }
  }

  static drawLineChart(canvas, labels, data) {
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const width = rect.width || 400;
    const height = rect.height || 256;
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

    const gridLines = 5;
    for (let i = 0; i <= gridLines; i++) {
      const y = padding + (plotHeight / gridLines) * i;
      ctx.moveTo(padding, y);
      ctx.lineTo(width - padding, y);
    }
    ctx.stroke();

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

    ctx.fillStyle = 'rgba(13, 148, 136, 0.1)';
    ctx.beginPath();
    data.forEach((val, idx) => {
      const x = padding + (plotWidth / (data.length - 1)) * idx;
      const yRatio = (val - minValue) / (maxValue - minValue);
      const y = height - padding - yRatio * plotHeight;
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.lineTo(padding + plotWidth, height - padding);
    ctx.lineTo(padding, height - padding);
    ctx.closePath();
    ctx.fill();
  }

  static drawDonutChart(canvas, labels, data, colors) {
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

    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(cx, cy, innerRadius, 0, 2 * Math.PI);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';

    let tooltip = document.querySelector('.donut-tooltip');
    if (!tooltip) {
      tooltip = document.createElement('div');
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

      if (dist < innerRadius || dist > radius) {
        tooltip.classList.add('hidden');
        return;
      }

      let rawAngle = Math.atan2(dy, dx);
      if (rawAngle < 0) rawAngle += 2 * Math.PI;

      for (const seg of segments) {
        const segStart = ((seg.start % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
        const segEnd = ((seg.end % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
        let inSegment;
        if (segEnd < segStart) {
          inSegment = rawAngle >= segStart || rawAngle <= segEnd;
        } else {
          inSegment = rawAngle >= segStart && rawAngle <= segEnd;
        }
        if (inSegment) {
          tooltip.textContent = seg.label;
          tooltip.style.left = `${e.clientX + 10}px`;
          tooltip.style.top = `${e.clientY + 10}px`;
          tooltip.classList.remove('hidden');
          return;
        }
      }
      tooltip.classList.add('hidden');
    }

    function onLeave() {
      tooltip.classList.add('hidden');
    }

    canvas.onmousemove = onMove;
    canvas.onmouseleave = onLeave;
  }

  static async initHealthCheck() {
    // Find or create health status container in topbar
    const topbar = document.querySelector('header');
    if (!topbar) return;

    // Check if container already exists
    let healthContainer = document.getElementById('health-status');
    if (!healthContainer) {
      // Create health status container
      healthContainer = document.createElement('div');
      healthContainer.id = 'health-status';
      healthContainer.className = 'flex items-center gap-3 mr-4';
      healthContainer.innerHTML = `
        <div class="flex items-center gap-1.5 text-xs">
          <span id="waf-status" class="flex items-center gap-1 px-2 py-1 rounded-full bg-gray-200 dark:bg-gray-700">
            <span class="w-2 h-2 rounded-full bg-gray-400 animate-pulse"></span>
            <span>WAF</span>
          </span>
          <span id="ti-status" class="flex items-center gap-1 px-2 py-1 rounded-full bg-gray-200 dark:bg-gray-700">
            <span class="w-2 h-2 rounded-full bg-gray-400 animate-pulse"></span>
            <span>TI</span>
          </span>
        </div>
      `;

      // Insert before theme toggle
      const themeBtn = document.getElementById('theme-toggle');
      if (themeBtn && themeBtn.parentElement) {
        themeBtn.parentElement.insertBefore(healthContainer, themeBtn);
      }
    }

    // Check health status
    const api = new ApiService();
    const updateStatus = async () => {
      const health = await api.checkAllHealth();

      const wafEl = document.getElementById('waf-status');
      const tiEl = document.getElementById('ti-status');

      if (wafEl) {
        const dot = wafEl.querySelector('span:first-child');
        if (health.waf.online) {
          dot.className = 'w-2 h-2 rounded-full bg-green-500';
          wafEl.title = 'WAF Backend: Online';
        } else {
          dot.className = 'w-2 h-2 rounded-full bg-red-500';
          wafEl.title = 'WAF Backend: Offline';
        }
      }

      if (tiEl) {
        const dot = tiEl.querySelector('span:first-child');
        if (health.ti.online) {
          dot.className = 'w-2 h-2 rounded-full bg-green-500';
          tiEl.title = 'Threat Intel Backend: Online';
        } else {
          dot.className = 'w-2 h-2 rounded-full bg-red-500';
          tiEl.title = 'Threat Intel Backend: Offline';
        }
      }
    };

    // Initial check
    await updateStatus();

    // Periodic check every 30 seconds
    setInterval(updateStatus, 30000);
  }
}

