// Constants and configuration
// Only admin role is allowed to access the system
const ROLE_PERMISSIONS = {
  admin: {
    pages: ['dashboard', 'threat', 'intelligence', 'rules', 'logs', 'test', 'recommendations', 'alerts', 'restrictions', 'signatures', 'reports', 'ai-models', 'syslog', 'user-profiles', 'profile', 'users', 'database'],
    manageRules: true,
  },
  user: {
    pages: ['dashboard', 'threat', 'intelligence', 'logs', 'recommendations', 'profile'],
    manageRules: false,
  },
  analyst: {
    pages: ['dashboard', 'threat', 'intelligence', 'logs', 'recommendations', 'profile', 'rules', 'alerts', 'reports', 'syslog'],
    manageRules: true,
  },
  viewer: {
    pages: ['dashboard', 'threat', 'intelligence', 'logs', 'profile'],
    manageRules: false,
  },
};

const PAGE_FILE_MAP = {
  dashboard: (role) => role === 'admin' ? 'index.html' : 'user.html',
  threat: 'threat-monitor.html',
  intelligence: 'threat-intelligence.html',
  rules: 'rules-policies.html',
  logs: 'logs.html',
  test: 'test.html',

  recommendations: 'recommendations.html',
  profile: 'profile.html',
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

