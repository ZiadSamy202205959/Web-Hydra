// Threat Controller - Coordinates threat monitor interactions
class ThreatController {
  constructor(dataModel, view) {
    this.model = dataModel;
    this.view = view;
    this.anomalyInterval = null;
    this.heatmapInterval = null;
    this.isPaused = false;
    this.lastAlertIds = new Set();
  }

  async init() {
    await this.loadHeatmap();
    this.view.bindToggleHandler((isPaused) => this.handleToggle(isPaused));

    // Refresh heatmap every 60 seconds
    this.heatmapInterval = setInterval(() => {
      this.loadHeatmap();
    }, 60000);

    // Start anomaly monitoring
    this.startAnomalyMonitoring();

    // Bind TI Lookup
    const searchBtn = document.getElementById('ti-search-btn');
    if (searchBtn) {
      searchBtn.addEventListener('click', () => this.handleLookup());
    }
  }

  async handleLookup() {
    const type = document.getElementById('ti-type').value;
    const value = document.getElementById('ti-input').value.trim();
    const resultsContainer = document.getElementById('ti-results');
    const loading = document.getElementById('ti-loading');

    if (!value) {
      alert('Please enter a value');
      return;
    }

    // Reset UI
    resultsContainer.innerHTML = '';
    resultsContainer.classList.add('hidden');
    loading.classList.remove('hidden');

    try {
      const promises = [];

      // VirusTotal (All types)
      promises.push(this.model.apiService.fetchVirusTotal(type, value));

      // OTX (All types)
      promises.push(this.model.apiService.fetchOTX(type, value));

      // AbuseIPDB (IP Only)
      if (type === 'ip') {
        promises.push(this.model.apiService.fetchAbuseIPDB(value));
      }

      const results = await Promise.all(promises);

      // Render
      loading.classList.add('hidden');
      resultsContainer.classList.remove('hidden');

      results.forEach(res => {
        const card = this.createResultCard(res);
        resultsContainer.appendChild(card);
      });

    } catch (err) {
      console.error(err);
      loading.classList.add('hidden');
      alert('Error fetching threat data');
    }
  }

  createResultCard(data) {
    const div = document.createElement('div');
    div.className = 'bg-gray-50 dark:bg-gray-700 p-4 rounded-xl border border-gray-200 dark:border-gray-600';

    // Header
    const providerName = data.provider ? data.provider.toUpperCase() : 'UNKNOWN';
    let riskColor = 'text-gray-500';
    let icon = 'help-circle';

    if (data.error) {
      riskColor = 'text-red-500';
      icon = 'alert-triangle';
    } else {
      switch (data.risk) {
        case 'high': riskColor = 'text-red-500'; icon = 'alert-octagon'; break;
        case 'medium': riskColor = 'text-orange-500'; icon = 'alert-triangle'; break;
        case 'low': riskColor = 'text-yellow-500'; icon = 'shield'; break;
        case 'clean': riskColor = 'text-green-500'; icon = 'check-circle'; break;
      }
    }

    const summary = data.error ? data.error : (data.summary || 'No data');

    div.innerHTML = `
      <div class="flex justify-between items-center mb-2">
        <span class="font-bold text-sm text-gray-400">${providerName}</span>
        <i data-feather="${icon}" class="${riskColor}"></i>
      </div>
      <div class="text-xl font-bold ${riskColor} mb-1 capitalize">${data.risk || 'Error'}</div>
      <div class="text-xs text-gray-500 dark:text-gray-300">${summary}</div>
    `;

    // Re-initialize icons for this element
    if (window.feather) feather.replace();

    return div;
  }

  async loadHeatmap() {
    await this.model.loadRealData();
    const heatmap = this.model.getHeatmap();
    this.view.renderHeatmap(heatmap);
  }

  startAnomalyMonitoring() {
    if (this.isPaused) return;

    this.anomalyInterval = setInterval(() => {
      this.checkAnomalies();
    }, 5000);
  }

  stopAnomalyMonitoring() {
    if (this.anomalyInterval) {
      clearInterval(this.anomalyInterval);
      this.anomalyInterval = null;
    }
    this.isPaused = true;
  }

  async checkAnomalies() {
    if (this.isPaused) return;

    try {
      const alerts = await this.model.apiService.fetchAlerts(5);
      const newAlerts = alerts.filter(alert => !this.lastAlertIds.has(alert.id));

      if (newAlerts.length > 0) {
        const alert = newAlerts[0];
        this.lastAlertIds.add(alert.id);

        const severityIcon = {
          'Critical': '🔴',
          'High': '🟠',
          'Medium': '🟡',
          'Low': '🟢'
        }[alert.severity] || '⚪';

        const message = `${severityIcon} [${alert.severity}] ${alert.type}: ${alert.description.substring(0, 80)}${alert.description.length > 80 ? '...' : ''}`;
        this.view.renderLiveAnomaly(message);

        if (this.lastAlertIds.size > 20) {
          const idsArray = Array.from(this.lastAlertIds);
          this.lastAlertIds = new Set(idsArray.slice(-20));
        }
      } else if (alerts.length > 0) {
        const alert = alerts[0];
        if (!this.lastAlertIds.has(alert.id)) {
          this.lastAlertIds.add(alert.id);
          const severityIcon = {
            'Critical': '🔴',
            'High': '🟠',
            'Medium': '🟡',
            'Low': '🟢'
          }[alert.severity] || '⚪';
          const message = `${severityIcon} [${alert.severity}] ${alert.type}: ${alert.description.substring(0, 80)}${alert.description.length > 80 ? '...' : ''}`;
          this.view.renderLiveAnomaly(message);
        }
      } else {
        if (Math.random() < 0.1) {
          const messages = [
            'Monitoring traffic patterns...',
            'No anomalies detected in last check',
            'System operating normally',
          ];
          const msg = messages[Math.floor(Math.random() * messages.length)];
          this.view.renderLiveAnomaly(`ℹ️ ${msg}`);
        }
      }
    } catch (err) {
      if (Math.random() < 0.05) {
        this.view.renderLiveAnomaly('⚠️ Unable to fetch alerts - check API connection');
      }
    }
  }

  handleToggle(isPaused) {
    if (isPaused) {
      this.stopAnomalyMonitoring();
    } else {
      this.isPaused = false;
      this.startAnomalyMonitoring();
    }
    this.view.updateToggleButton(this.isPaused);
  }

  destroy() {
    if (this.anomalyInterval) {
      clearInterval(this.anomalyInterval);
    }
    if (this.heatmapInterval) {
      clearInterval(this.heatmapInterval);
    }
  }
}

