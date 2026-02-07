// Profile View - Renders profile UI
class ProfileView {
    renderProfile(userData, apiKey, isDarkTheme) {
        // Basic settings
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

        // Profile fields
        if (userData) {
            const nameInput = document.getElementById('profile-name');
            const emailInput = document.getElementById('profile-email');
            const bioInput = document.getElementById('profile-bio');

            if (nameInput) nameInput.value = userData.fullName || '';
            if (emailInput) emailInput.value = userData.email || '';
            if (bioInput) bioInput.value = userData.bio || '';
        }
    }

    bindHandlers(handlers) {
        const { onThemeChange, onApiKeyToggle, onApiKeyRegenerate, onSaveProfile } = handlers;

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

        const saveBtn = document.getElementById('save-profile-btn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                const fullName = document.getElementById('profile-name').value;
                const email = document.getElementById('profile-email').value;
                const bio = document.getElementById('profile-bio').value;
                onSaveProfile({ fullName, email, bio });
            });
        }
    }

    showFeedback(message, type = 'success') {
        // Simple alert for now, could be a toast
        alert(message);
    }
}
