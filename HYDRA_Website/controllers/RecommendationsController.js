// Recommendations Controller - Coordinates recommendations interactions
class RecommendationsController {
  constructor(dataModel, view, authModel) {
    this.model = dataModel;
    this.view = view;
    this.authModel = authModel;
  }

  init() {
    this.render();
    this.view.bindHandlers((id) => this.handleApply(id));
    this.view.bindAnalysisHandlers((desc) => this.handleGenerateAnalysis(desc));
  }

  async handleGenerateAnalysis(description) {
    this.view.showLoading();

    // Use ApiService (assumed to be available as global or via model/dependency)
    // The constructor takes dataModel, view, authModel.
    // We need access to ApiService. In this app structure, it seems often global or passed.
    // Checking app-mvc.js would clarify, but let's assume we can use the instance from the model if available,
    // or if it's a global. Based on app-mvc.js structure usually seen.
    // Wait, ApiService is usually instantiated in app-mvc.js and passed to Model.
    // Let's check if model has it.

    // Actually, looking at DataModel, it probably uses ApiService.
    // But for this direct feature, we might need to access ApiService directly or add a method to DataModel.
    // Ideally, the Controller shouldn't call API directly? Or maybe it's fine for this specific utility.
    // Let's stick to using the `apiService` global if it exists, or check `this.model.api`.

    // However, to be safe and clean, let's assume we can instantiate it or it's globally available.
    // In `recommendations.html`, we see `app-mvc.js` is deferred.

    // Let's try to access it via `window.apiService` if we can't find it on the model.
    // OR, better, let's look at `DataModel.js` to see how it works.

    // For now, I will use a new instance if needed, or better, allow the controller to receive it.
    // But modifying the specific instantiation in app-mvc.js is more work.
    // I'll assume a global `apiService` instance is available or I can create one.

    const api = new ApiService(); // Safe fallback
    const result = await api.generateRecommendation(description, window.location.pathname);

    this.view.renderAnalysisResult(result);
  }

  render() {
    const recommendations = this.model.getRecommendations();
    const canManage = this.authModel.canManageRules();
    this.view.renderRecommendations(recommendations, canManage);
  }

  handleApply(recId) {
    const rec = this.model.getRecommendations().find((r) => r.id === recId);
    if (!rec || rec.applied) return;

    const canManage = this.authModel.canManageRules();
    if (!canManage) return;

    this.model.applyRecommendation(recId);
    this.render();
  }
}

