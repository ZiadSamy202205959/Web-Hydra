// MVC Script Loader - Loads all MVC dependencies in correct order
// This file dynamically loads all MVC components

const scripts = [
  // Services
  'services/ApiService.js',
  'services/StorageService.js',
  // Utils
  'utils/constants.js',
  'utils/helpers.js',
  // Models
  'models/DataModel.js',
  'models/UserModel.js',
  'models/AuthModel.js',
  // Views
  'views/DashboardView.js',
  'views/ThreatView.js',
  'views/RulesView.js',
  'views/LogsView.js',
  'views/RecommendationsView.js',
  'views/SettingsView.js',
  'views/UsersView.js',
  'views/LearningView.js',
  // Controllers
  'controllers/DashboardController.js',
  'controllers/ThreatController.js',
  'controllers/RulesController.js',
  'controllers/LogsController.js',
  'controllers/RecommendationsController.js',
  'controllers/SettingsController.js',
  'controllers/UsersController.js',
  'controllers/LearningController.js',
  'controllers/AuthController.js',
  // Main app
  'assets/app-mvc.js',
];

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

async function loadMVC() {
  try {
    for (const src of scripts) {
      await loadScript(src);
    }
  } catch (error) {
    console.error('Error loading MVC scripts:', error);
  }
}

// Load MVC scripts
loadMVC();

