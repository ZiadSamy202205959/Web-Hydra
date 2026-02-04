// Users View - Renders user management UI
class UsersView {
  renderUsers(users) {
    const table = document.getElementById('users-table');
    if (!table) return;
    
    table.innerHTML = '';
    
    users.forEach((user, idx) => {
      const tr = document.createElement('tr');
      let actions = '';
      
      if (user.username !== 'admin') {
        actions = `
          <button data-edit-index="${idx}" class="edit-user text-teal-600 hover:underline mr-2">Edit</button>
          <button data-delete-index="${idx}" class="delete-user text-red-600 hover:underline">Delete</button>
        `;
      }
      
      tr.innerHTML = `
        <td class="px-4 py-2 whitespace-nowrap">${user.username}</td>
        <td class="px-4 py-2 whitespace-nowrap">${user.role}</td>
        <td class="px-4 py-2 whitespace-nowrap">${actions}</td>
      `;
      table.appendChild(tr);
    });
  }

  openModal(index = null, user = null) {
    const modal = document.getElementById('user-modal');
    const title = document.getElementById('user-modal-title');
    const usernameField = document.getElementById('user-username');
    const passwordField = document.getElementById('user-password');
    const roleField = document.getElementById('user-role');
    
    if (!modal) return;
    
    modal.classList.remove('hidden');
    modal.setAttribute('aria-hidden', 'false');
    modal.dataset.editIndex = index !== null ? index : '';
    
    if (index !== null && user) {
      title.textContent = 'Edit User';
      usernameField.value = user.username;
      passwordField.value = user.password;
      roleField.value = user.role;
      usernameField.disabled = user.username === 'admin';
    } else {
      title.textContent = 'Add User';
      usernameField.value = '';
      passwordField.value = '';
      roleField.value = 'viewer';
      usernameField.disabled = false;
    }
  }

  closeModal() {
    const modal = document.getElementById('user-modal');
    if (modal) {
      modal.classList.add('hidden');
      modal.setAttribute('aria-hidden', 'true');
      delete modal.dataset.editIndex;
    }
  }

  getModalData() {
    const username = document.getElementById('user-username')?.value.trim();
    const password = document.getElementById('user-password')?.value;
    const role = document.getElementById('user-role')?.value;
    const modal = document.getElementById('user-modal');
    const editIndex = modal?.dataset.editIndex;
    
    return { username, password, role, editIndex };
  }

  bindHandlers(onAdd, onEdit, onDelete, onSave, onClose) {
    const addBtn = document.getElementById('open-add-user');
    if (addBtn) {
      addBtn.addEventListener('click', () => onAdd());
    }
    
    const closeBtn = document.getElementById('close-user-modal');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => onClose());
    }
    
    const form = document.getElementById('user-form');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        onSave();
      });
    }
    
    const table = document.getElementById('users-table');
    if (table) {
      table.addEventListener('click', (e) => {
        const editIdx = e.target.getAttribute('data-edit-index');
        const delIdx = e.target.getAttribute('data-delete-index');
        if (editIdx !== null && editIdx !== '') {
          onEdit(parseInt(editIdx));
        }
        if (delIdx !== null && delIdx !== '') {
          onDelete(parseInt(delIdx));
        }
      });
    }
  }

  showAddButton(canManage) {
    const addBtn = document.getElementById('open-add-user');
    if (addBtn) {
      addBtn.style.display = canManage ? '' : 'none';
    }
  }
}

