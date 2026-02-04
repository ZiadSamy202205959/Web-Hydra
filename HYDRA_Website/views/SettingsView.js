// Settings View - Renders settings UI
class SettingsView {
  renderSettings(apiKey, isDarkTheme) {
    const themeCheckbox = document.getElementById('settings-theme-toggle');
    if (themeCheckbox) {
      themeCheckbox.checked = isDarkTheme;
    }
    
    const apiField = document.getElementById('api-key-field');
    if (apiField && apiKey) {
      const maskedKey = apiKey.replace(/.(?=.{4})/g, '*');
      apiField.value = maskedKey;
      apiField.dataset.full = apiKey;
      apiField.dataset.masked = maskedKey;
      apiField.type = 'password';
    }
    
    const toggleBtn = document.getElementById('api-key-toggle');
    if (toggleBtn) {
      toggleBtn.textContent = 'Show';
    }
  }

  bindHandlers(onThemeChange, onApiKeyToggle, onApiKeyRegenerate) {
    const themeCheckbox = document.getElementById('settings-theme-toggle');
    if (themeCheckbox) {
      themeCheckbox.addEventListener('change', () => {
        onThemeChange(themeCheckbox.checked);
      });
    }
    
    const apiField = document.getElementById('api-key-field');
    const toggleBtn = document.getElementById('api-key-toggle');
    if (toggleBtn && apiField) {
      toggleBtn.addEventListener('click', () => {
        onApiKeyToggle(apiField, toggleBtn);
      });
    }
    
    const regenBtn = document.getElementById('api-key-regenerate');
    if (regenBtn) {
      regenBtn.addEventListener('click', () => {
        onApiKeyRegenerate();
      });
    }
  }
}

