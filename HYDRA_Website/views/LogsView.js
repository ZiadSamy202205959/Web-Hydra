// Logs View - Renders logs UI
class LogsView {
  renderLogs(logs, page, totalPages, viewMode = 'waf') {
    const tbody = document.getElementById('logs-table');
    const thead = document.querySelector('.data-table thead tr');
    if (!tbody || !thead) return;

    // Update headers based on viewMode
    if (viewMode === 'waf') {
      thead.innerHTML = `
        <th>ID</th>
        <th>Type</th>
        <th>Severity</th>
        <th>Message</th>
        <th>Time</th>
      `;
    } else {
      thead.innerHTML = `
        <th>Log ID</th>
        <th>Source</th>
        <th>Message</th>
        <th>Severity</th>
        <th>Timestamp</th>
      `;
    }

    tbody.innerHTML = '';

    if (logs.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="px-6 py-8 text-center text-gray-500">No logs found for this view.</td></tr>`;
      return;
    }

    logs.forEach((log) => {
      const tr = document.createElement('tr');
      tr.className = 'hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-default';

      if (viewMode === 'waf') {
        const sev = (log.severity || '').toString().trim();
        const sevKey =
          sev.toLowerCase() === 'critical' ? 'Critical' :
            sev.toLowerCase() === 'high' ? 'High' :
              sev.toLowerCase() === 'medium' ? 'Medium' :
                'Low';

        const severityClass = SEVERITY_CLASSES[sevKey] || 'severity-low';

        tr.innerHTML = `
          <td class="px-4 py-3 whitespace-nowrap font-mono text-xs text-gray-500">#${log.wlog_id || log.id}</td>
          <td class="px-4 py-3 whitespace-nowrap">
            <span class="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                ${log.wlog_type || log.type}
            </span>
          </td>
          <td class="px-4 py-3 whitespace-nowrap">
            <span class="severity-badge ${severityClass}">${sevKey}</span>
          </td>
          <td class="px-4 py-3 whitespace-normal text-sm" title="${log.intercepted_req || log.message}">${(log.intercepted_req || log.message).substring(0, 100)}${(log.intercepted_req || log.message).length > 100 ? '...' : ''}</td>
          <td class="px-4 py-3 whitespace-nowrap text-xs text-gray-500">${new Date(log.wlog_timestamp || log.timestamp).toLocaleString()}</td>
        `;
      } else {
        tr.innerHTML = `
          <td class="px-4 py-3 whitespace-nowrap font-mono text-xs text-gray-500">#${log.log_id || log.id}</td>
          <td class="px-4 py-3 whitespace-nowrap">
            <span class="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                ${log.source || 'System'}
            </span>
          </td>
          <td class="px-4 py-3 text-sm max-w-md truncate" title="${log.message}">${log.message}</td>
          <td class="px-4 py-3 whitespace-nowrap">
            <span class="px-2 py-0.5 text-xs font-medium rounded bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400">
                ${log.severity || 'Info'}
            </span>
          </td>
          <td class="px-4 py-3 whitespace-nowrap text-xs text-gray-500 font-medium">${new Date(log.timestamp).toLocaleString()}</td>
        `;
      }
      tbody.appendChild(tr);
    });

    const info = document.getElementById('logs-page-info');
    if (info) {
      info.textContent = `Page ${page} of ${totalPages}`;
    }

    const prevBtn = document.getElementById('logs-prev');
    const nextBtn = document.getElementById('logs-next');
    if (prevBtn && nextBtn) {
      prevBtn.disabled = page <= 1;
      nextBtn.disabled = page >= totalPages;
      prevBtn.dataset.page = page - 1;
      nextBtn.dataset.page = page + 1;
    }
  }

  bindTabHandlers(onTabChange) {
    const wafTab = document.getElementById('tab-waf');
    const sysTab = document.getElementById('tab-sys');

    if (wafTab && sysTab) {
      const switchTab = (mode) => {
        if (mode === 'waf') {
          wafTab.classList.add('border-teal-500', 'text-teal-600', 'dark:text-teal-400');
          wafTab.classList.remove('border-transparent', 'text-gray-500', 'dark:text-gray-400');
          sysTab.classList.remove('border-teal-500', 'text-teal-600', 'dark:text-teal-400');
          sysTab.classList.add('border-transparent', 'text-gray-500', 'dark:text-gray-400');
        } else {
          sysTab.classList.add('border-teal-500', 'text-teal-600', 'dark:text-teal-400');
          sysTab.classList.remove('border-transparent', 'text-gray-500', 'dark:text-gray-400');
          wafTab.classList.remove('border-teal-500', 'text-teal-600', 'dark:text-teal-400');
          wafTab.classList.add('border-transparent', 'text-gray-500', 'dark:text-gray-400');
        }
        onTabChange(mode);
      };

      wafTab.addEventListener('click', () => switchTab('waf'));
      sysTab.addEventListener('click', () => switchTab('sys'));
    }
  }

  bindFilterHandlers(onFilterChange) {
    const searchInput = document.getElementById('logs-search');
    const typeSelect = document.getElementById('logs-type-filter');
    const severitySelect = document.getElementById('logs-severity-filter');
    const dateInput = document.getElementById('logs-date-filter');

    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        onFilterChange({ search: e.target.value });
      });
    }

    if (typeSelect) {
      typeSelect.addEventListener('change', (e) => {
        onFilterChange({ type: e.target.value });
      });
    }

    if (severitySelect) {
      severitySelect.addEventListener('change', (e) => {
        onFilterChange({ severity: e.target.value });
      });
    }

    if (dateInput) {
      dateInput.addEventListener('change', (e) => {
        onFilterChange({ date: e.target.value });
      });
    }
  }

  bindPaginationHandlers(onPageChange) {
    const prevBtn = document.getElementById('logs-prev');
    const nextBtn = document.getElementById('logs-next');

    if (prevBtn) {
      prevBtn.addEventListener('click', (e) => {
        const page = parseInt(e.target.dataset.page);
        onPageChange(page);
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', (e) => {
        const page = parseInt(e.target.dataset.page);
        onPageChange(page);
      });
    }
  }
}

