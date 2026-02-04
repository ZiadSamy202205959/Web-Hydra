// API Service - Handles all API communication
class ApiService {
  constructor(baseURL = 'http://127.0.0.1:8080/api') {
    this.baseURL = baseURL;
    // TI Backend URL (Flask)
    this.tiBaseURL = 'http://localhost:5000/api/ti';
    this.token = localStorage.getItem('authToken') || null;
  }

  setToken(token) {
    this.token = token;
    localStorage.setItem('authToken', token);
  }

  getToken() {
    return this.token;
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('authToken');
  }

  async login(username, password) {
    try {
      const response = await fetch(`${this.baseURL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();
      if (response.ok && data.success) {
        this.setToken(data.token);
        return data;
      } else {
        return { success: false, message: data.message || 'Login failed' };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, message: 'Network error during login' };
    }
  }

  getAuthHeaders() {
    const headers = { 'Content-Type': 'application/json' };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    return headers;
  }

  async fetchKPIs() {
    try {
      const response = await fetch(`${this.baseURL}/kpis`, { headers: this.getAuthHeaders() });
      if (response.ok) {
        return await response.json();
      }
      if (response.status === 401) this.clearToken();
    } catch (error) {
      console.error('Error fetching KPIs:', error);
    }
    return null;
  }

  async fetchLogs(limit = 100, offset = 0) {
    try {
      const response = await fetch(`${this.baseURL}/logs?limit=${limit}&offset=${offset}`);
      if (response.ok) {
        const data = await response.json();
        return data.logs || [];
      }
    } catch (error) {
      console.error('Error fetching logs:', error);
    }
    return [];
  }

  async fetchAlerts(limit = 10) {
    try {
      const response = await fetch(`${this.baseURL}/alerts?limit=${limit}`);
      if (response.ok) {
        const data = await response.json();
        return data.alerts || [];
      }
    } catch (error) {
      console.error('Error fetching alerts:', error);
    }
    return [];
  }

  async fetchTraffic() {
    try {
      const response = await fetch(`${this.baseURL}/traffic`);
      if (response.ok) {
        const data = await response.json();
        return data.trafficData || [];
      }
    } catch (error) {
      console.error('Error fetching traffic:', error);
    }
    return [];
  }

  async fetchOWASP() {
    try {
      const response = await fetch(`${this.baseURL}/owasp`);
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.error('Error fetching OWASP data:', error);
    }
    return {};
  }

  async fetchHeatmap() {
    try {
      const response = await fetch(`${this.baseURL}/heatmap`);
      if (response.ok) {
        const data = await response.json();
        return data.heatmap || [];
      }
    } catch (error) {
      console.error('Error fetching heatmap:', error);
    }
    return [];
  }

  async fetchStats() {
    try {
      const response = await fetch(`${this.baseURL}/stats`);
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
    return null;
  }

  // --- Rules Management Endpoints ---

  async fetchRules() {
    try {
      const response = await fetch(`${this.baseURL}/rules`);
      if (response.ok) {
        const data = await response.json();
        return data.rules || [];
      }
    } catch (error) {
      console.error('Error fetching rules:', error);
    }
    return [];
  }

  async toggleRule(ruleId, enabled) {
    try {
      const response = await fetch(`${this.baseURL}/rules/${ruleId}?enabled=${enabled}`, {
        method: 'PUT',
        headers: this.getAuthHeaders()
      });
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.error('Error toggling rule:', error);
    }
    return null;
  }

  // --- Settings Endpoints ---

  async fetchSettings() {
    try {
      const response = await fetch(`${this.baseURL}/settings`);
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
    return null;
  }

  async updateSettings(settings) {
    try {
      const response = await fetch(`${this.baseURL}/settings`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(settings)
      });
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.error('Error updating settings:', error);
    }
    return null;
  }

  // --- Training Endpoints ---

  async triggerTraining() {
    try {
      const response = await fetch(`${this.baseURL}/train`, {
        method: 'POST',
        headers: this.getAuthHeaders()
      });
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.error('Error triggering training:', error);
    }
    return null;
  }

  async fetchTrainingStatus() {
    try {
      const response = await fetch(`${this.baseURL}/train/status`);
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.error('Error fetching training status:', error);
    }
    return null;
  }

  // --- Threat Intelligence Endpoints ---

  async fetchVirusTotal(type, value) {
    try {
      const response = await fetch(`${this.tiBaseURL}/virustotal?type=${type}&value=${value}`);
      if (response.ok) {
        return await response.json();
      } else {
        // Handle 429/errors gracefully
        const err = await response.json();
        return { error: err.error || 'API Error', provider: 'virustotal' };
      }
    } catch (error) {
      console.error('Error fetching VirusTotal:', error);
      return { error: 'Network Error', provider: 'virustotal' };
    }
  }

  async fetchOTX(type, value) {
    try {
      const response = await fetch(`${this.tiBaseURL}/otx?type=${type}&value=${value}`);
      if (response.ok) {
        return await response.json();
      } else {
        const err = await response.json();
        return { error: err.error || 'API Error', provider: 'otx' };
      }
    } catch (error) {
      console.error('Error fetching OTX:', error);
      return { error: 'Network Error', provider: 'otx' };
    }
  }

  async fetchAbuseIPDB(value) {
    try {
      const response = await fetch(`${this.tiBaseURL}/abuseipdb?value=${value}`);
      if (response.ok) {
        return await response.json();
      } else {
        const err = await response.json();
        return { error: err.error || 'API Error', provider: 'abuseipdb' };
      }
    } catch (error) {
      console.error('Error fetching AbuseIPDB:', error);
      return { error: 'Network Error', provider: 'abuseipdb' };
    }
  }

  // --- Feeds ---

  async fetchAbuseIPDBFeed() {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // 3s timeout

      const response = await fetch(`${this.tiBaseURL}/feed/abuseipdb`, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (response.ok) return await response.json();
    } catch (error) {
      console.warn('AbuseIPDB feed fetch failed or timed out:', error);
    }
    return null;
  }

  async fetchOTXFeed() {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // 3s timeout

      const response = await fetch(`${this.tiBaseURL}/feed/otx`, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (response.ok) return await response.json();
    } catch (error) {
      console.warn('OTX feed fetch failed or timed out:', error);
    }
    return null;
  }
  // --- Patching / LLaMA ---

  async generateRecommendation(description, context = {}) {
    try {
      const response = await fetch('http://localhost:5000/api/patch/recommend', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          attack_description: description,
          context: context
        })
      });

      if (response.ok) {
        return await response.json();
      } else {
        const err = await response.json();
        return { error: err.error || 'Generative Analysis Failed' };
      }
    } catch (error) {
      console.error('Error generating recommendation:', error);
      return { error: 'Network Error - Is the backend running?' };
    }
  }

  // --- Health Check Endpoints ---

  async checkWAFHealth() {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      const response = await fetch(`${this.baseURL}/health`, {
        signal: controller.signal,
        method: 'GET'
      });
      clearTimeout(timeoutId);

      return { online: response.ok, latency: 0 };
    } catch (error) {
      return { online: false, error: error.message };
    }
  }

  async checkTIHealth() {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      // Just try to reach the TI backend
      const response = await fetch(`${this.tiBaseURL}/virustotal?type=ip&value=test`, {
        signal: controller.signal,
        method: 'GET'
      });
      clearTimeout(timeoutId);

      // Any response (even error) means server is reachable
      return { online: true, latency: 0 };
    } catch (error) {
      return { online: false, error: error.message };
    }
  }

  async checkAllHealth() {
    const [waf, ti] = await Promise.all([
      this.checkWAFHealth(),
      this.checkTIHealth()
    ]);
    return { waf, ti };
  }
}

