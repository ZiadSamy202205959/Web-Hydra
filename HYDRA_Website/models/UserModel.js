// User Model - Manages user data and operations (Admin-only access)
class UserModel {
  constructor() {
    this.initializeDefaultUsers();
  }

  initializeDefaultUsers() {
    let users = StorageService.getUsers();
    if (!Array.isArray(users) || !users.length) {
      // Only admin user is allowed in the system
      users = [
        { username: 'admin', password: 'admin123', role: 'admin' },
      ];
      StorageService.setUsers(users);
    }
  }

  getUsers() {
    return StorageService.getUsers() || [];
  }

  getUserByUsername(username) {
    const users = this.getUsers();
    return users.find((u) => u.username === username);
  }

  authenticate(username, password) {
    const user = this.getUserByUsername(username);
    if (user && user.password === password) {
      return {
        success: true,
        user: {
          username: user.username,
          role: user.role,
        },
      };
    }
    return {
      success: false,
      message: 'Invalid username or password.',
    };
  }

  addUser(user) {
    const users = this.getUsers();
    const exists = users.find((u) => u.username === user.username);
    if (exists) {
      return { success: false, message: 'A user with that username already exists.' };
    }
    users.push(user);
    StorageService.setUsers(users);
    return { success: true, user };
  }

  updateUser(index, updates) {
    const users = this.getUsers();
    if (index < 0 || index >= users.length) {
      return { success: false, message: 'Invalid user index.' };
    }

    const user = users[index];
    const updatedUser = { ...user, ...updates };

    // Check for duplicate username (excluding current user)
    const duplicate = users.findIndex(
      (u, i) => u.username === updatedUser.username && i !== index
    );
    if (duplicate !== -1) {
      return { success: false, message: 'A user with that username already exists.' };
    }

    users[index] = updatedUser;
    StorageService.setUsers(users);
    return { success: true, user: updatedUser };
  }

  deleteUser(index) {
    const users = this.getUsers();
    if (index < 0 || index >= users.length) {
      return { success: false, message: 'Invalid user index.' };
    }

    const user = users[index];
    if (user.username === 'admin') {
      return { success: false, message: 'Cannot delete admin user.' };
    }

    const currentUsername = StorageService.getUsername();
    if (user.username === currentUsername) {
      return { success: false, message: 'You cannot delete your own account while logged in.' };
    }

    users.splice(index, 1);
    StorageService.setUsers(users);
    return { success: true };
  }

  canManageUsers(role) {
    return role === 'admin';
  }
}

