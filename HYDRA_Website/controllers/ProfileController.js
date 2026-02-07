// Profile Controller - Coordinates profile interactions
class ProfileController {
    constructor(dataModel, userModel, view) {
        this.dataModel = dataModel;
        this.userModel = userModel;
        this.view = view;
    }

    init() {
        const apiKey = this.dataModel.getApiKey();
        const isDarkTheme = document.documentElement.classList.contains('dark');

        // Get current user data
        const username = StorageService.getUsername();
        const userData = this.userModel.getUserByUsername(username);

        this.view.renderProfile(userData, apiKey, isDarkTheme);

        this.view.bindHandlers({
            onThemeChange: (isDark) => this.handleThemeChange(isDark),
            onApiKeyToggle: (apiField, toggleBtn) => this.handleApiKeyToggle(apiField, toggleBtn),
            onApiKeyRegenerate: () => this.handleApiKeyRegenerate(),
            onSaveProfile: (updates) => this.handleSaveProfile(updates)
        });
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
        this.dataModel.setApiKey(randomKey);
        const isDarkTheme = document.documentElement.classList.contains('dark');
        const username = StorageService.getUsername();
        const userData = this.userModel.getUserByUsername(username);
        this.view.renderProfile(userData, randomKey, isDarkTheme);
    }

    handleSaveProfile(updates) {
        const username = StorageService.getUsername();
        const users = this.userModel.getUsers();
        const index = users.findIndex(u => u.username === username);

        if (index !== -1) {
            const result = this.userModel.updateUser(index, updates);
            if (result.success) {
                this.view.showFeedback('Profile updated successfully!');
            } else {
                this.view.showFeedback(result.message, 'error');
            }
        }
    }
}
