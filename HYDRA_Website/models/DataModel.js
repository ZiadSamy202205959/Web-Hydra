// Data Model - Manages application data state
class DataModel {
  constructor() {
    // Start with empty data - will be populated from API
    this.data = {};
    this.apiService = new ApiService();
    this.loadPersistedData();
  }

  loadPersistedData() {
    const storedRules = StorageService.getRules();
    if (storedRules.length && this.data.rules) {
      this.data.rules = this.data.rules.concat(storedRules);
    }

    const storedKey = StorageService.getApiKey();
    if (storedKey && this.data) {
      this.data.apiKey = storedKey;
    }
  }

  // Getters
  getKPIs() {
    return this.data.kpis || {};
  }

  getTrafficData() {
    return this.data.trafficData || [];
  }

  getOWASPCounts() {
    return this.data.owaspCounts || {};
  }

  getAlerts() {
    return this.data.alerts || [];
  }

  getHeatmap() {
    return this.data.heatmap || [];
  }

  getRules() {
    return this.data.rules || [];
  }

  getLogs() {
    return this.data.logs || [];
  }

  getSyslogs() {
    return this.data.syslogs || [];
  }

  getRecommendations() {
    return this.data.recommendations || [];
  }

  getApiKey() {
    return this.data.apiKey || '';
  }

  getTraining() {
    return this.data.training || { inProgress: false, progress: 0, logs: [] };
  }

  // Setters
  setKPIs(kpis) {
    if (kpis) {
      this.data.kpis = kpis;
    }
  }

  setAlerts(alerts) {
    if (alerts && alerts.length > 0) {
      this.data.alerts = alerts;
    }
  }

  setTrafficData(traffic) {
    if (traffic && traffic.length > 0) {
      this.data.trafficData = traffic;
    }
  }

  setOWASPCounts(owasp) {
    if (owasp && Object.keys(owasp).length > 0) {
      this.data.owaspCounts = owasp;
    }
  }

  setHeatmap(heatmap) {
    if (heatmap && heatmap.length > 0) {
      this.data.heatmap = heatmap;
    }
  }

  setLogs(logs) {
    if (logs && logs.length > 0) {
      this.data.logs = logs;
    }
  }

  setSyslogs(logs) {
    if (logs) {
      this.data.syslogs = logs;
    }
  }

  setApiKey(key) {
    this.data.apiKey = key;
    StorageService.setApiKey(key);
  }

  // Rule management
  addRule(rule) {
    if (!this.data.rules) {
      this.data.rules = [];
    }
    const newId = this.data.rules.length
      ? Math.max(...this.data.rules.map((r) => r.id)) + 1
      : 1;
    const newRule = { ...rule, id: newId };
    this.data.rules.push(newRule);
    this.persistRules();
    return newRule;
  }

  updateRule(ruleId, updates) {
    const rule = this.data.rules.find((r) => r.id === ruleId);
    if (rule) {
      Object.assign(rule, updates);
      this.persistRules();
      return rule;
    }
    return null;
  }

  deleteRule(ruleId) {
    const idx = this.data.rules.findIndex((r) => r.id === ruleId);
    if (idx !== -1) {
      this.data.rules.splice(idx, 1);
      this.persistRules();
      return true;
    }
    return false;
  }

  toggleRule(ruleId) {
    const rule = this.data.rules.find((r) => r.id === ruleId);
    if (rule) {
      rule.enabled = !rule.enabled;
      this.persistRules();
      return rule.enabled;
    }
    return false;
  }

  persistRules() {
    const stored = this.data.rules.filter((r) => r.id > 3);
    StorageService.setRules(stored);
  }

  // Recommendation management
  applyRecommendation(recId) {
    const rec = this.data.recommendations.find((r) => r.id === recId);
    if (rec && !rec.applied) {
      rec.applied = true;
      const newRule = this.addRule({
        name: rec.action.name,
        description: rec.action.description,
        enabled: true,
      });
      return newRule;
    }
    return null;
  }

  // Training management
  startTraining() {
    this.data.training = {
      inProgress: true,
      progress: 0,
      logs: [],
    };
  }

  updateTraining(progress, log) {
    if (this.data.training) {
      this.data.training.progress = progress;
      if (log) {
        this.data.training.logs.push(log);
      }
    }
  }

  completeTraining() {
    if (this.data.training) {
      this.data.training.inProgress = false;
      if (this.data.kpis) {
        this.data.kpis.modelConfidence = Math.min(
          (this.data.kpis.modelConfidence || 0.87) + 0.02,
          0.99
        );
      }
    }
  }

  // API data loading
  async loadRealData() {
    const [kpis, alerts, traffic, owasp, heatmap] = await Promise.all([
      this.apiService.fetchKPIs(),
      this.apiService.fetchAlerts(),
      this.apiService.fetchTraffic(),
      this.apiService.fetchOWASP(),
      this.apiService.fetchHeatmap(),
    ]);

    this.setKPIs(kpis);
    this.setAlerts(alerts);
    this.setTrafficData(traffic);
    this.setOWASPCounts(owasp);
    this.setHeatmap(heatmap);
  }

  async loadRealLogs() {
    const logs = await this.apiService.fetchLogs(100, 0);
    this.setLogs(logs);
    return logs;
  }

  async loadRealSyslogs() {
    const data = await this.apiService.fetchSyslogs(100, 0);
    this.setSyslogs(data.logs);
    return data;
  }
}

