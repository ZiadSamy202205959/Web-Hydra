// Dashboard Controller - Coordinates dashboard interactions
class DashboardController {
  constructor(dataModel, view) {
    this.model = dataModel;
    this.view = view;
    this.sortKey = null;
    this.refreshInterval = null;
  }

  async init() {
    await this.loadData();
    this.view.bindSortHandlers((key) => this.handleSort(key));

    // Set up auto-refresh (60 seconds)
    this.refreshInterval = setInterval(() => {
      this.loadData();
    }, 60000);
  }

  async loadData() {
    await this.model.loadRealData();
    this.render();
  }

  render() {
    const kpis = this.model.getKPIs();
    const trafficData = this.model.getTrafficData();
    const owaspCounts = this.model.getOWASPCounts();
    const alerts = this.model.getAlerts();

    this.view.renderKPIs(kpis);
    this.view.renderCharts(trafficData, owaspCounts);
    this.view.renderAlerts(alerts, this.sortKey);
  }

  handleSort(key) {
    this.sortKey = key;
    const alerts = this.model.getAlerts();
    this.view.renderAlerts(alerts, this.sortKey);
  }

  destroy() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }
}

