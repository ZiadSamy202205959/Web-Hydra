// Rules View - Renders rules management UI
class RulesView {
  renderRules(rules, canManage) {
    const tbody = document.getElementById('rules-table');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    rules.forEach((rule) => {
      const tr = document.createElement('tr');
      let enabledCell;
      let actionsCell;
      
      if (canManage) {
        enabledCell = `
          <label class="inline-flex items-center cursor-pointer">
            <input type="checkbox" data-rule-id="${rule.id}" class="rule-toggle sr-only" ${rule.enabled ? 'checked' : ''}>
            <div class="w-10 h-5 bg-gray-200 dark:bg-gray-700 rounded-full peer"></div>
            <span class="absolute ml-1 h-4 w-4 bg-white dark:bg-gray-300 rounded-full transition-transform ${rule.enabled ? 'translate-x-5' : ''}"></span>
          </label>
        `;
        actionsCell = `
          <button data-edit-id="${rule.id}" class="edit-rule text-teal-600 hover:underline">Edit</button>
          <button data-delete-id="${rule.id}" class="delete-rule text-red-600 hover:underline">Delete</button>
        `;
      } else {
        enabledCell = `<span>${rule.enabled ? 'Yes' : 'No'}</span>`;
        actionsCell = '';
      }
      
      tr.innerHTML = `
        <td class="px-4 py-2 whitespace-nowrap">${rule.id}</td>
        <td class="px-4 py-2 whitespace-nowrap">${rule.name}</td>
        <td class="px-4 py-2 whitespace-normal">${rule.description}</td>
        <td class="px-4 py-2">${enabledCell}</td>
        <td class="px-4 py-2 space-x-2">${actionsCell}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  openModal(ruleId = null, rule = null) {
    const modal = document.getElementById('rule-modal');
    const title = document.getElementById('rule-modal-title');
    const nameField = document.getElementById('rule-name');
    const descField = document.getElementById('rule-description');
    
    if (!modal) return;
    
    modal.classList.remove('hidden');
    modal.setAttribute('aria-hidden', 'false');
    modal.dataset.editId = ruleId || '';
    
    if (ruleId && rule) {
      title.textContent = 'Edit Rule';
      nameField.value = rule.name;
      descField.value = rule.description;
    } else {
      title.textContent = 'Add Rule';
      nameField.value = '';
      descField.value = '';
    }
  }

  closeModal() {
    const modal = document.getElementById('rule-modal');
    if (modal) {
      modal.classList.add('hidden');
      modal.setAttribute('aria-hidden', 'true');
    }
  }

  getModalData() {
    const name = document.getElementById('rule-name')?.value.trim();
    const desc = document.getElementById('rule-description')?.value.trim();
    const modal = document.getElementById('rule-modal');
    const editId = modal?.dataset.editId;
    
    return { name, desc, editId };
  }

  bindHandlers(onAdd, onEdit, onDelete, onToggle, onSave, onClose) {
    const openBtn = document.getElementById('open-add-rule');
    if (openBtn) {
      openBtn.addEventListener('click', () => onAdd());
    }
    
    const closeBtn = document.getElementById('close-rule-modal');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => onClose());
    }
    
    const form = document.getElementById('rule-form');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        onSave();
      });
    }
    
    const table = document.getElementById('rules-table');
    if (table) {
      table.addEventListener('change', (e) => {
        if (e.target.classList.contains('rule-toggle')) {
          const id = parseInt(e.target.dataset.ruleId);
          onToggle(id, e.target.checked);
        }
      });
      
      table.addEventListener('click', (e) => {
        const editId = e.target.getAttribute('data-edit-id');
        const deleteId = e.target.getAttribute('data-delete-id');
        if (editId) onEdit(parseInt(editId));
        if (deleteId) onDelete(parseInt(deleteId));
      });
    }
  }

  showAddButton(canManage) {
    const openBtn = document.getElementById('open-add-rule');
    if (openBtn) {
      openBtn.style.display = canManage ? '' : 'none';
    }
  }
}

