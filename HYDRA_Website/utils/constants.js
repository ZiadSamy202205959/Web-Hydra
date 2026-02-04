// Constants and configuration
const ROLE_PERMISSIONS = {
  admin: {
    pages: ['dashboard', 'threat', 'intelligence', 'rules', 'logs', 'test', 'learning', 'recommendations', 'settings', 'users'],
    manageRules: true,
  },
  operator: {
    pages: ['dashboard', 'threat', 'intelligence', 'rules', 'logs', 'test', 'recommendations'],
    manageRules: true,
  },
  analyst: {
    pages: ['dashboard', 'threat', 'intelligence', 'logs', 'test', 'learning', 'recommendations'],
    manageRules: false,
  },
  viewer: {
    pages: ['dashboard', 'threat', 'intelligence', 'logs', 'test'],
    manageRules: false,
  },
};

const PAGE_FILE_MAP = {
  dashboard: (role) => role === 'admin' ? 'admin.html' : 'user.html',
  threat: 'threat-monitor.html',
  intelligence: 'threat-intelligence.html',
  rules: 'rules-policies.html',
  logs: 'logs.html',
  test: 'test.html',
  learning: 'learning-loop.html',
  recommendations: 'recommendations.html',
  settings: 'settings.html',
  users: 'users.html',
};

const SEVERITY_ORDER = {
  Critical: 0,
  High: 1,
  Medium: 2,
  Low: 3,
};

const SEVERITY_CLASSES = {
  Critical: 'severity-critical',
  High: 'severity-high',
  Medium: 'severity-medium',
  Low: 'severity-low',
};

