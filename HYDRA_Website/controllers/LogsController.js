// Logs Controller - Coordinates logs interactions
class LogsController {
  constructor(dataModel, view) {
    this.model = dataModel;
    this.view = view;
    this.state = {
      page: 1,
      filters: {
        search: '',
        type: '',
        severity: '',
        date: '',
      },
    };
    this.refreshInterval = null;
  }

  async init() {
    await this.loadData();
    this.view.bindFilterHandlers((filters) => this.handleFilterChange(filters));
    this.view.bindPaginationHandlers((page) => this.handlePageChange(page));

    // Refresh logs every 30 seconds (reduced from 10s for performance)
    this.refreshInterval = setInterval(() => {
      this.loadData();
    }, 30000);
  }

  async loadData() {
    await this.model.loadRealLogs();
    this.render();
  }

  render() {
    const allLogs = this.model.getLogs();
    const filteredLogs = this.filterLogs(allLogs);
    const itemsPerPage = 10;
    const totalPages = Math.ceil(filteredLogs.length / itemsPerPage) || 1;
    const page = Math.min(Math.max(this.state.page, 1), totalPages);
    const start = (page - 1) * itemsPerPage;
    const pageLogs = filteredLogs.slice(start, start + itemsPerPage);

    this.view.renderLogs(pageLogs, page, totalPages, this.state.filters);
  }

  filterLogs(logs) {
    return logs.filter((log) => {
      const matchesSearch = this.state.filters.search
        ? log.message.toLowerCase().includes(this.state.filters.search.toLowerCase())
        : true;
      const matchesType = this.state.filters.type
        ? log.type === this.state.filters.type
        : true;
      const matchesSeverity = this.state.filters.severity
        ? log.severity === this.state.filters.severity
        : true;
      const matchesDate = this.state.filters.date
        ? new Date(log.timestamp).toDateString() === new Date(this.state.filters.date).toDateString()
        : true;
      return matchesSearch && matchesType && matchesSeverity && matchesDate;
    });
  }

  handleFilterChange(newFilters) {
    this.state.filters = { ...this.state.filters, ...newFilters };
    this.state.page = 1;
    this.render();
  }

  handlePageChange(page) {
    this.state.page = page;
    this.render();
  }

  destroy() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }
}

