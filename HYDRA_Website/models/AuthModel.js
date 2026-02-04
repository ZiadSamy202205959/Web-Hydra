// Auth Model - Manages authentication state
class AuthModel {
  constructor() {
    this.userModel = new UserModel();
    this.apiService = new ApiService();
  }

  async login(username, password) {
    // Call WAF Backend
    const result = await this.apiService.login(username, password);

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

