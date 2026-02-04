// Main MVC Application Initialization
// This file replaces app.js and initializes the MVC architecture

let app = null; // Global controller instance for cleanup

async function initializeWebHydra() {
  // Check authentication first
  if (!Helpers.checkLogin()) {
    return;
  }

  // Initialize models
  if (!window.mockData) {
    console.warn('Mock data not loaded. Some features may not work.');
    window.mockData = {};
  }

  const dataModel = new DataModel();
  const authModel = new AuthModel();
  const userModel = new UserModel();

  // Load persisted data
  Helpers.loadPersistedData();

  // Load sidebar
  await Helpers.loadSidebar();
  Helpers.highlightActiveNav();
  Helpers.filterNavByRole();
  Helpers.initMobileMenu();
  Helpers.initThemeToggle();
  Helpers.initLogout();
  Helpers.initHealthCheck();

  // Initialize page-specific controller
  const page = document.body.dataset.page;

  if (page === 'dashboard') {
    const view = new DashboardView();
    app = new DashboardController(dataModel, view);
    await app.init();
  } else if (page === 'threat') {
    const view = new ThreatView();
    app = new ThreatController(dataModel, view);
    await app.init();
  } else if (page === 'intelligence') {
    app = new IntelController(dataModel, null);
    await app.init();
  } else if (page === 'rules') {
    const view = new RulesView();
    app = new RulesController(dataModel, view, authModel);
    app.init();
  } else if (page === 'logs') {
    const view = new LogsView();
    app = new LogsController(dataModel, view);
    await app.init();
  } else if (page === 'test') {
    // Test page initialization is handled by test.js
    if (typeof initTest === 'function') {
      initTest();
    }
  } else if (page === 'learning') {
    const view = new LearningView();
    app = new LearningController(dataModel, view);
    app.init();
  } else if (page === 'recommendations') {
    const view = new RecommendationsView();
    app = new RecommendationsController(dataModel, view, authModel);
    app.init();
  } else if (page === 'settings') {
    const view = new SettingsView();
    app = new SettingsController(dataModel, view);
    app.init();
  } else if (page === 'users') {
    const view = new UsersView();
    app = new UsersController(userModel, view, authModel);
    app.init();
  }

  // Replace Feather icons
  feather.replace();

  // Cleanup on page unload
  window.addEventListener('beforeunload', () => {
    if (app && typeof app.destroy === 'function') {
      app.destroy();
    }
  });
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeWebHydra);
} else {
  initializeWebHydra();
}

