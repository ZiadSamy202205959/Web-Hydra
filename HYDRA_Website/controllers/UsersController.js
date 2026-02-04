// Users Controller - Coordinates user management interactions
class UsersController {
  constructor(userModel, view, authModel) {
    this.userModel = userModel;
    this.view = view;
    this.authModel = authModel;
  }

  init() {
    const canManage = this.authModel.getCurrentUser().role === 'admin';
    this.view.showAddButton(canManage);
    this.render();
    
    this.view.bindHandlers(
      () => this.handleAdd(),
      (index) => this.handleEdit(index),
      (index) => this.handleDelete(index),
      () => this.handleSave(),
      () => this.handleClose()
    );
  }

  render() {
    const users = this.userModel.getUsers();
    this.view.renderUsers(users);
  }

  handleAdd() {
    this.view.openModal();
  }

  handleEdit(index) {
    const users = this.userModel.getUsers();
    const user = users[index];
    if (user) {
      this.view.openModal(index, user);
    }
  }

  handleDelete(index) {
    const users = this.userModel.getUsers();
    const user = users[index];
    if (!user) return;
    
    if (user.username === 'admin') {
      alert('Cannot delete admin user.');
      return;
    }
    
    if (confirm(`Delete user ${user.username}?`)) {
      const result = this.userModel.deleteUser(index);
      if (result.success) {
        this.render();
      } else {
        alert(result.message);
      }
    }
  }

  handleSave() {
    const { username, password, role, editIndex } = this.view.getModalData();
    
    if (!username || !password || !role) {
      alert('Please enter all fields.');
      return;
    }
    
    if (editIndex !== '') {
      const result = this.userModel.updateUser(parseInt(editIndex), { username, password, role });
      if (result.success) {
        this.render();
        this.handleClose();
      } else {
        alert(result.message);
      }
    } else {
      const result = this.userModel.addUser({ username, password, role });
      if (result.success) {
        this.render();
        this.handleClose();
      } else {
        alert(result.message);
      }
    }
  }

  handleClose() {
    this.view.closeModal();
  }
}

