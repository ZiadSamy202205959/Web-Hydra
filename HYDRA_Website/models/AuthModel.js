// Auth Model - Manages authentication state
class AuthModel {
  constructor() {
    this.userModel = new UserModel();
    this.apiService = new ApiService();
    this.tiBackendURL = 'http://localhost:5000';
  }

  async login(username, password) {
    // Call TI Backend for JWT authentication
    try {
      const response = await fetch(`${this.tiBackendURL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const result = await response.json();

      if (response.ok && result.success) {
        // Store the JWT token
        if (result.token) {
          localStorage.setItem('authToken', result.token);
        }
        StorageService.setRole(result.user.role || 'user');
        StorageService.setUsername(result.user.username || username);
        StorageService.setItem('webHydraLoggedIn', 'true');
        return {
          success: true,
          user: result.user,
          redirectUrl: result.user.role === 'admin' ? 'admin.html' : 'user.html',
        };
      }
      return { success: false, message: result.message || 'Invalid credentials' };
    } catch (error) {
      console.error('Login error:', error);
      // Fall back to local authentication
      return this.localLogin(username, password);
    }
  }

  localLogin(username, password) {
    const result = this.userModel.authenticate(username, password);
    if (result.success) {
      StorageService.setRole(result.user.role || 'user');
      StorageService.setUsername(result.user.username || username);
      StorageService.setItem('webHydraLoggedIn', 'true');
      return {
        success: true,
        user: result.user,
        redirectUrl: result.user.role === 'admin' ? 'admin.html' : 'user.html',
      };
    }
    return result;
  }

  logout() {
    StorageService.clearSession();
  }

  isAuthenticated() {
    return !!StorageService.getRole();
  }

  getCurrentUser() {
    return {
      username: StorageService.getUsername(),
      role: StorageService.getRole(),
    };
  }

  hasPermission(page) {
    const role = StorageService.getRole();
    const perms = ROLE_PERMISSIONS[role];
    if (!perms) return false;
    return perms.pages.indexOf(page) !== -1;
  }

  canManageRules() {
    const role = StorageService.getRole();
    const perms = ROLE_PERMISSIONS[role];
    return perms ? perms.manageRules : false;
  }
}

