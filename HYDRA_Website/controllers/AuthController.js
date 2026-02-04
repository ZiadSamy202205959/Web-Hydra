// Auth Controller - Coordinates authentication interactions
class AuthController {
  constructor(authModel) {
    this.authModel = authModel;
  }

  init() {
    const loginBtn = document.getElementById('login-btn');
    if (loginBtn) {
      loginBtn.addEventListener('click', () => this.handleLogin());
    }
  }

  async handleLogin() {
    const username = document.getElementById('username')?.value.trim();
    const password = document.getElementById('password')?.value.trim();
    const errorMsg = document.getElementById('login-error');

    if (errorMsg) {
      errorMsg.classList.add('hidden');
    }

    if (!username || !password) {
      if (errorMsg) {
        errorMsg.textContent = 'Please enter username and password.';
        errorMsg.classList.remove('hidden');
      }
      return;
    }

    const result = await this.authModel.login(username, password);
    if (result.success) {
      window.location.href = result.redirectUrl;
    } else {
      if (errorMsg) {
        errorMsg.textContent = result.message || 'Invalid username or password.';
        errorMsg.classList.remove('hidden');
      }
    }
  }
}

