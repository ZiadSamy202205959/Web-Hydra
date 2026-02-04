// Settings Controller - Coordinates settings interactions
class SettingsController {
  constructor(dataModel, view) {
    this.model = dataModel;
    this.view = view;
  }

  init() {
    const apiKey = this.model.getApiKey();
    const isDarkTheme = document.documentElement.classList.contains('dark');
    this.view.renderSettings(apiKey, isDarkTheme);
    
    this.view.bindHandlers(
      (isDark) => this.handleThemeChange(isDark),
      (apiField, toggleBtn) => this.handleApiKeyToggle(apiField, toggleBtn),
      () => this.handleApiKeyRegenerate()
    );
  }

  handleThemeChange(isDark) {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    StorageService.setTheme(isDark ? 'dark' : 'light');
  }

  handleApiKeyToggle(apiField, toggleBtn) {
    if (apiField.type === 'password') {
      apiField.type = 'text';
      apiField.value = apiField.dataset.full;
      toggleBtn.textContent = 'Hide';
    } else {
      apiField.type = 'password';
      apiField.value = apiField.dataset.masked;
      toggleBtn.textContent = 'Show';
    }
  }

  handleApiKeyRegenerate() {
    const randomKey = 'key-' + Math.random().toString(36).substring(2, 10) + '-' + Math.random().toString(36).substring(2, 8);
    this.model.setApiKey(randomKey);
    const isDarkTheme = document.documentElement.classList.contains('dark');
    this.view.renderSettings(randomKey, isDarkTheme);
  }
}

