// Logs View - Renders logs UI
class LogsView {
  renderLogs(logs, page, totalPages, filters = {}) {
    const tbody = document.getElementById('logs-table');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    logs.forEach((log) => {
      const tr = document.createElement('tr');
      const sev = (log.severity || '').toString().trim();
      const sevKey =
        sev.toLowerCase() === 'critical' ? 'Critical' :
        sev.toLowerCase() === 'high' ? 'High' :
        sev.toLowerCase() === 'medium' ? 'Medium' :
        'Low';
      
      const severityClass = SEVERITY_CLASSES[sevKey] || 'severity-low';
      
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

