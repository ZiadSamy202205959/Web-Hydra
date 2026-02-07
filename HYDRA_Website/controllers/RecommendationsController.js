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

    // Auto-load and analyze
    this.loadAndAnalyzeRecentLogs();

    // Poll for new critical events every 30 seconds
    setInterval(() => this.loadAndAnalyzeRecentLogs(), 30000);
  }

  render() {
    const recommendations = this.model.getRecommendations();
    const canManage = this.authModel.canManageRules();
    this.view.renderRecommendations(recommendations, canManage);
  }

  async loadAndAnalyzeRecentLogs() {
    const feedContainer = document.getElementById('live-analysis-feed');
    if (!feedContainer) return;

    try {
      console.log('Fetching recent critical logs...');
      const api = this.model.apiService || new ApiService();

      // Fetch recent logs (limit 20 to find high severity)
      const logs = await api.fetchLogs(20);

      // DEBUG: Status update
      console.log('Logs fetched:', logs ? logs.length : 'null');

      if (!Array.isArray(logs)) {
        throw new Error('Invalid logs response');
      }

      // Take top 5 entries without filtering (show all detected activity)
      const interestingLogs = logs.slice(0, 5);

      if (interestingLogs.length === 0) {
        feedContainer.innerHTML = `
          <div class="text-center py-8 text-gray-500">
            <i data-feather="shield" class="mx-auto h-8 w-8 mb-2 text-green-500"></i>
            <p>No recent threats detected.</p>
            <p class="text-xs mt-1">System is monitoring...</p>
          </div>
        `;
        if (window.feather) feather.replace();
        return;
      }

      // clear waiting message if we have logs
      if (feedContainer.querySelector('.text-center')) {
        feedContainer.innerHTML = '';
      }

      for (const log of interestingLogs) {
        if (document.getElementById(`analysis-${log.id}`)) continue;

        this.createFeedItem(log, feedContainer);
        this.analyzeLog(log, api);
      }
    } catch (err) {
      console.error('Error in loadAndAnalyzeRecentLogs:', err);
      feedContainer.innerHTML = `
        <div class="text-center py-8 text-red-500">
          <i data-feather="alert-triangle" class="mx-auto h-8 w-8 mb-2"></i>
          <p>Error loading logs</p>
          <p class="text-xs font-mono mt-1">${err.message}</p>
        </div>
      `;
      if (window.feather) feather.replace();
    }
  }

  createFeedItem(log, container) {
    const el = document.createElement('div');
    el.id = `analysis-${log.id}`;
    el.className = 'bg-white dark:bg-gray-800 p-4 rounded-lg shadow border-l-4 border-red-500 animate-fade-in mb-4';
    el.innerHTML = `
      <div class="flex justify-between items-start mb-2">
        <div>
          <span class="inline-block px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 mb-1">
            ${log.severity.toUpperCase()}
          </span>
          <h4 class="font-semibold text-gray-800 dark:text-gray-100">${log.message || 'Suspicious Activity'}</h4>
        </div>
        <span class="text-xs text-gray-500">${new Date(log.timestamp).toLocaleTimeString()}</span>
      </div>
      <p class="text-sm text-gray-600 dark:text-gray-400 font-mono bg-gray-50 dark:bg-gray-700 p-2 rounded mb-3 break-all cursor-help" title="${log.payload || ''}">
        ${(log.payload || '').substring(0, 80)}${(log.payload || '').length > 80 ? '...' : ''}
      </p>
      
      <!-- Analysis Section -->
      <div id="result-${log.id}" class="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
        <div class="flex items-center text-teal-600 animate-pulse">
          <i data-feather="cpu" class="w-4 h-4 mr-2"></i>
          <span class="text-sm font-medium">AI Analyzing threat patterns...</span>
        </div>
      </div>
    `;
    // Prepend to show newest top
    container.insertBefore(el, container.firstChild);
    if (window.feather) feather.replace();
  }

  async analyzeLog(log, api) {
    // Construct description for LLaMA - User requested ONLY the message
    const description = log.message || 'Suspicious activity detected';

    // Call API w/ timeout handling implicitly in service
    const result = await api.generateRecommendation(description, 'live_feed', log.id);

    const resultContainer = document.getElementById(`result-${log.id}`);
    if (!resultContainer) return;

    if (result.error) {
      resultContainer.innerHTML = `<p class="text-red-500 text-sm">Analysis failed: ${result.error}</p>`;
      return;
    }

    // Render result
    resultContainer.innerHTML = `
      <div class="space-y-3">
        <div class="flex items-center text-indigo-600 dark:text-indigo-400 mb-1">
          <i data-feather="check-circle" class="w-4 h-4 mr-2"></i>
          <span class="text-sm font-bold">Analysis Complete: ${result.attack_type || 'Detected Attack'}</span>
        </div>
        
        <div class="bg-indigo-50 dark:bg-indigo-900/20 p-3 rounded space-y-2">
          <div>
            <p class="text-xs font-semibold text-indigo-800 dark:text-indigo-300 uppercase">Root Cause</p>
            <p class="text-sm text-gray-700 dark:text-gray-300">${result.root_cause || 'Pattern identified in request payload.'}</p>
          </div>
          
          <div>
            <p class="text-xs font-semibold text-indigo-800 dark:text-indigo-300 uppercase">Recommended Mitigations</p>
            <ul class="list-disc list-inside text-sm text-gray-700 dark:text-gray-300 mt-1">
              ${(result.mitigations || []).map(m => `<li><span class="font-medium">[${m.category}]</span> ${m.description}</li>`).join('')}
            </ul>
          </div>
        </div>

        ${result.virtual_patches && result.virtual_patches.length > 0 ? `
        <div class="mt-2 text-xs font-mono text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 p-2 rounded border border-green-100 dark:border-green-800">
           <strong>Suggested Virtual Patches:</strong><br>
           ${result.virtual_patches.map(p => `• [${p.target}] <code>${p.rule}</code>`).join('<br>')}
        </div>` : ''}
      </div>
    `;
    if (window.feather) feather.replace();
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

