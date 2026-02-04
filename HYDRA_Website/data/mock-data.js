// Shared mock data for Web Hydra. Expose as window.mockData so app.js can access it.
window.mockData = {
  kpis: {
    totalRequests: 123456,
    blockedAttacks: 2345,
    falsePositives: 56,
    modelConfidence: 0.87,
  },
  trafficData: Array.from({ length: 30 }, () => Math.floor(500 + Math.random() * 1000)),
  owaspCounts: {
    SQLi: 120,
    XSS: 90,
    CSRF: 50,
    'Command Injection': 40,
    'Path Traversal': 30,
  },
  alerts: [
    { id: 1, type: 'SQLi', severity: 'High', description: 'Suspicious SELECT detected', timestamp: Date.now() - 3600 * 1000 },
    { id: 2, type: 'XSS', severity: 'Medium', description: 'Possible script injection', timestamp: Date.now() - 7200 * 1000 },
    { id: 3, type: 'CSRF', severity: 'Low', description: 'Potential CSRF token misuse', timestamp: Date.now() - 10800 * 1000 },
    { id: 4, type: 'Command Injection', severity: 'Critical', description: 'Command pattern detected', timestamp: Date.now() - 14400 * 1000 },
    { id: 5, type: 'Path Traversal', severity: 'Medium', description: 'Directory traversal attempt', timestamp: Date.now() - 18000 * 1000 },
  ],
  heatmap: Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => Math.random())),
  rules: [
    { id: 1, name: 'Block SQL Injection', description: 'Detect and block SQL injection patterns', enabled: true },
    { id: 2, name: 'Inspect XSS', description: 'Sanitize inputs to mitigate XSS', enabled: true },
    { id: 3, name: 'Rate Limiting', description: 'Limit requests per IP', enabled: false },
  ],
  logs: Array.from({ length: 60 }, (_, i) => {
    const severities = ['Low', 'Medium', 'High', 'Critical'];
    const types = ['Info', 'Warning', 'Attack'];
    const messages = ['Request received', 'Potential misuse detected', 'Anomaly detected', 'User logged in', 'Rule triggered'];
    return {
      id: i + 1,
      type: types[Math.floor(Math.random() * types.length)],
      severity: severities[Math.floor(Math.random() * severities.length)],
      message: messages[Math.floor(Math.random() * messages.length)],
      timestamp: Date.now() - Math.floor(Math.random() * 10 * 24 * 3600 * 1000),
    };
  }),
  training: {
    inProgress: false,
    progress: 0,
    logs: [],
  },
  recommendations: [
    {
      id: 1,
      message: 'Frequent SQL injection attempts detected. Consider tightening SQLi rule sensitivity.',
      action: { name: 'Tighten SQLi Rule', description: 'Add stricter patterns to SQLi detection', enabled: true },
      applied: false,
    },
    {
      id: 2,
      message: 'Multiple XSS alerts observed. Suggest enabling CSP headers.',
      action: { name: 'Enable CSP', description: 'Configure Content Security Policy headers', enabled: true },
      applied: false,
    },
  ],
  apiKey: 'abcdef-12345-xyz',
};