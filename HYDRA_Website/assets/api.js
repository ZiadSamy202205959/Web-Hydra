// API configuration
const API_BASE_URL = 'http://127.0.0.1:8080/api';

// Fetch data from WebHydra backend API
async function fetchKPIs() {
  try {
    const response = await fetch(`${API_BASE_URL}/kpis`);
    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.error('Error fetching KPIs:', error);
  }
  return null;
}

async function fetchLogs(limit = 100, offset = 0) {
  try {
    const response = await fetch(`${API_BASE_URL}/logs?limit=${limit}&offset=${offset}`);
    if (response.ok) {
      const data = await response.json();
      return data.logs || [];
    }
  } catch (error) {
    console.error('Error fetching logs:', error);
  }
  return [];
}

async function fetchAlerts(limit = 10) {
  try {
    const response = await fetch(`${API_BASE_URL}/alerts?limit=${limit}`);
    if (response.ok) {
      const data = await response.json();
      return data.alerts || [];
    }
  } catch (error) {
    console.error('Error fetching alerts:', error);
  }
  return [];
}

async function fetchTraffic() {
  try {
    const response = await fetch(`${API_BASE_URL}/traffic`);
    if (response.ok) {
      const data = await response.json();
      return data.trafficData || [];
    }
  } catch (error) {
    console.error('Error fetching traffic:', error);
  }
  return [];
}

async function fetchOWASP() {
  try {
    const response = await fetch(`${API_BASE_URL}/owasp`);
    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.error('Error fetching OWASP data:', error);
  }
  return {};
}

async function fetchHeatmap() {
  try {
    const response = await fetch(`${API_BASE_URL}/heatmap`);
    if (response.ok) {
      const data = await response.json();
      return data.heatmap || [];
    }
  } catch (error) {
    console.error('Error fetching heatmap:', error);
  }
  return [];
}

async function fetchStats() {
  try {
    const response = await fetch(`${API_BASE_URL}/stats`);
    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.error('Error fetching stats:', error);
  }
  return null;
}

// Load real data and merge with mock data (fallback to mock if API fails)
async function loadRealData() {
  const kpis = await fetchKPIs();
  const alerts = await fetchAlerts();
  const traffic = await fetchTraffic();
  const owasp = await fetchOWASP();
  const heatmap = await fetchHeatmap();
  
  // Update model with real data if available
  if (kpis && window.mockData) {
    window.mockData.kpis = kpis;
  }
  if (alerts.length > 0 && window.mockData) {
    window.mockData.alerts = alerts;
  }
  if (traffic.length > 0 && window.mockData) {
    window.mockData.trafficData = traffic;
  }
  if (Object.keys(owasp).length > 0 && window.mockData) {
    window.mockData.owaspCounts = owasp;
  }
  if (heatmap.length > 0 && window.mockData) {
    window.mockData.heatmap = heatmap;
  }
}

// Load logs for the logs page
async function loadRealLogs() {
  const logs = await fetchLogs(100, 0);
  if (logs.length > 0 && window.mockData) {
    window.mockData.logs = logs;
  }
  return logs;
}

// Auto-load real data when page loads (after mock data is loaded)
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(loadRealData, 500); // Wait for mock data to load first
  });
} else {
  setTimeout(loadRealData, 500);
}


