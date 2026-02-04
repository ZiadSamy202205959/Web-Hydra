# MVC Architecture Documentation

This project has been converted to a Model-View-Controller (MVC) architecture for better code organization and maintainability.

## Directory Structure

```
/
├── models/          # Data models and business logic
├── views/           # UI rendering and DOM manipulation
├── controllers/     # Page controllers coordinating models and views
├── services/        # External services (API, Storage)
├── utils/           # Utility functions and constants
├── assets/          # CSS, images, and main app initialization
├── data/            # Mock data
└── *.html           # HTML templates (Views)

```

## Architecture Overview

### Models (`models/`)
Handle data management and business logic:
- **DataModel.js**: Manages application data (KPIs, alerts, rules, logs, etc.)
- **UserModel.js**: Manages user data and authentication operations
- **AuthModel.js**: Handles authentication state and permissions

### Views (`views/`)
Handle UI rendering and DOM manipulation:
- **DashboardView.js**: Renders dashboard KPIs, charts, and alerts
- **ThreatView.js**: Renders threat monitor heatmap and live anomalies
- **RulesView.js**: Renders rules management UI
- **LogsView.js**: Renders logs table with filtering
- **RecommendationsView.js**: Renders recommendations list
- **SettingsView.js**: Renders settings page
- **UsersView.js**: Renders user management table
- **LearningView.js**: Renders learning loop training UI

### Controllers (`controllers/`)
Coordinate between models and views, handle user interactions:
- **DashboardController.js**: Manages dashboard page
- **ThreatController.js**: Manages threat monitor page
- **RulesController.js**: Manages rules management
- **LogsController.js**: Manages logs page with filtering
- **RecommendationsController.js**: Manages recommendations
- **SettingsController.js**: Manages settings
- **UsersController.js**: Manages user management
- **LearningController.js**: Manages learning loop
- **AuthController.js**: Manages authentication

### Services (`services/`)
Handle external services:
- **ApiService.js**: API communication with backend
- **StorageService.js**: localStorage operations

### Utils (`utils/`)
Utility functions and constants:
- **constants.js**: Application constants (permissions, mappings, etc.)
- **helpers.js**: Helper functions (sidebar loading, theme toggle, chart rendering, etc.)

## How It Works

1. **Initialization**: `assets/app-mvc.js` initializes the MVC architecture
2. **Page Detection**: The app detects the current page via `data-page` attribute
3. **Controller Creation**: Creates appropriate controller for the page
4. **Model-View Binding**: Controller coordinates between model and view
5. **User Interactions**: Controllers handle events and update models/views

## Usage Example

```javascript
// In a controller
class DashboardController {
  constructor(dataModel, view) {
    this.model = dataModel;
    this.view = view;
  }

  async init() {
    await this.model.loadRealData();
    const kpis = this.model.getKPIs();
    this.view.renderKPIs(kpis);
  }
}

// In app-mvc.js
const dataModel = new DataModel();
const view = new DashboardView();
const controller = new DashboardController(dataModel, view);
await controller.init();
```

## Benefits

1. **Separation of Concerns**: Clear separation between data, UI, and logic
2. **Maintainability**: Easier to locate and modify code
3. **Testability**: Models, views, and controllers can be tested independently
4. **Scalability**: Easy to add new features without affecting existing code
5. **Reusability**: Models and views can be reused across different controllers

## Migration Notes

- Old `app.js` has been replaced with `app-mvc.js`
- Old `api.js` functionality moved to `services/ApiService.js`
- All HTML files updated to load MVC components in correct order
- Backward compatibility maintained with mock data

