// Dashboard View - Renders dashboard UI
class DashboardView {
  constructor() {
    this.trafficChart = null;
    this.owaspChart = null;
  }

  renderKPIs(kpis) {
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
    const trafficCanvas = document.getElementById('traffic-chart');
    const owaspCanvas = document.getElementById('owasp-chart');
    
    const labels = Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (29 - i));
      return `${date.getMonth() + 1}/${date.getDate()}`;
    });

    if (trafficCanvas && trafficData.length > 0) {
      Helpers.drawLineChart(trafficCanvas, labels, trafficData);
    }

    if (owaspCanvas && Object.keys(owaspCounts).length > 0) {
      const data = Object.values(owaspCounts);
      const labelsO = Object.keys(owaspCounts);
      const colors = ['#0d9488', '#059669', '#047857', '#065f46', '#064e3b'];
      Helpers.drawDonutChart(owaspCanvas, labelsO, data, colors);
    }
  }

  renderAlerts(alerts, sortKey = null) {
    const tbody = document.getElementById('alerts-table');
    if (!tbody) return;

    let sortedAlerts = [...alerts];
    if (sortKey === 'type') {
      sortedAlerts.sort((a, b) => a.type.localeCompare(b.type));
    } else if (sortKey === 'severity') {
      sortedAlerts.sort((a, b) => {
        const order = SEVERITY_ORDER;
        return (order[a.severity] || 99) - (order[b.severity] || 99);
      });
    }

    tbody.innerHTML = '';
    sortedAlerts.forEach((alert) => {
      const tr = document.createElement('tr');
      const severityClass = SEVERITY_CLASSES[alert.severity] || 'severity-low';

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
  }

  bindSortHandlers(onSort) {
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

