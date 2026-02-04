// Rules Controller - Coordinates rules management interactions
class RulesController {
  constructor(dataModel, view, authModel) {
    this.model = dataModel;
    this.view = view;
    this.authModel = authModel;
  }

  init() {
    const canManage = this.authModel.canManageRules();
    this.view.showAddButton(canManage);
    this.render();
    
    this.view.bindHandlers(
      () => this.handleAdd(),
      (id) => this.handleEdit(id),
      (id) => this.handleDelete(id),
      (id, enabled) => this.handleToggle(id, enabled),
      () => this.handleSave(),
      () => this.handleClose()
    );
  }

  render() {
    const rules = this.model.getRules();
    const canManage = this.authModel.canManageRules();
    this.view.renderRules(rules, canManage);
  }

  handleAdd() {
    this.view.openModal();
  }

  handleEdit(ruleId) {
    const rule = this.model.getRules().find((r) => r.id === ruleId);
    if (rule) {
      this.view.openModal(ruleId, rule);
    }
  }

  handleDelete(ruleId) {
    if (confirm('Delete this rule?')) {
      if (this.model.deleteRule(ruleId)) {
        this.render();
      }
    }
  }

  handleToggle(ruleId, enabled) {
    const rule = this.model.getRules().find((r) => r.id === ruleId);
    if (rule) {
      this.model.updateRule(ruleId, { enabled });
      this.render();
    }
  }

  handleSave() {
    const { name, desc, editId } = this.view.getModalData();
    if (!name || !desc) {
      alert('Please enter both name and description.');
      return;
    }
    
    if (editId) {
      this.model.updateRule(parseInt(editId), { name, description: desc });
    } else {
      this.model.addRule({ name, description: desc, enabled: true });
    }
    
    this.render();
    this.handleClose();
  }

  handleClose() {
    this.view.closeModal();
  }
}

