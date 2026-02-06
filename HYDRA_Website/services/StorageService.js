// Storage Service - Handles localStorage operations
class StorageService {
  static getItem(key) {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.error(`Error getting item ${key}:`, error);
      return null;
    }
  }

  static setItem(key, value) {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (error) {
      console.error(`Error setting item ${key}:`, error);
      return false;
    }
  }

  static removeItem(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error(`Error removing item ${key}:`, error);
      return false;
    }
  }

  static getJSON(key) {
    const item = this.getItem(key);
    if (!item) return null;
    try {
      return JSON.parse(item);
    } catch (error) {
      console.error(`Error parsing JSON for ${key}:`, error);
      return null;
    }
  }

  static setJSON(key, value) {
    try {
      this.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error(`Error stringifying JSON for ${key}:`, error);
      return false;
    }
  }

  // Specific getters/setters for Web Hydra
  static getRole() {
    return this.getItem('webHydraRole');
  }

  static setRole(role) {
    return this.setItem('webHydraRole', role);
  }

  static getUsername() {
    return this.getItem('webHydraUsername');
  }

  static setUsername(username) {
    return this.setItem('webHydraUsername', username);
  }

  static getTheme() {
    return this.getItem('webHydraTheme') || 'dark';
  }

  static setTheme(theme) {
    return this.setItem('webHydraTheme', theme);
  }

  static getApiKey() {
    return this.getItem('webHydraApiKey');
  }

  static setApiKey(key) {
    return this.setItem('webHydraApiKey', key);
  }

  static getRules() {
    return this.getJSON('webHydraRules') || [];
  }

  static setRules(rules) {
    return this.setJSON('webHydraRules', rules);
  }

  static getUsers() {
    return this.getJSON('webHydraUsers');
  }

  static setUsers(users) {
    return this.setJSON('webHydraUsers', users);
  }

  static clearSession() {
    this.removeItem('webHydraRole');
    this.removeItem('webHydraUsername');
    this.removeItem('webHydraLoggedIn');
    this.removeItem('authToken');
  }
}

