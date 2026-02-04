// Recommendations View - Renders recommendations UI
class RecommendationsView {
  renderRecommendations(recommendations, canManage) {
    const list = document.getElementById('recommendations-list');
    if (!list) return;

    list.innerHTML = '';

    recommendations.forEach((rec) => {
      const div = document.createElement('div');
      div.className = 'bg-white dark:bg-gray-800 p-4 rounded-2xl shadow flex justify-between items-center';

      const isDisabled = rec.applied || !canManage;

      div.innerHTML = `
        <div>
          <p class="text-sm text-gray-800 dark:text-gray-200 mb-1">${rec.message}</p>
          <p class="text-xs text-gray-500 dark:text-gray-400">Suggested action: ${rec.action.name}</p>
        </div>
        <button ${isDisabled ? 'disabled' : ''} data-rec-id="${rec.id}" class="apply-rec bg-teal-600 hover:bg-teal-700 text-white px-3 py-1 rounded disabled:opacity-50">${rec.applied ? 'Applied' : 'Apply'}</button>
      `;
      list.appendChild(div);
    });
  }

  bindHandlers(onApply) {
    const list = document.getElementById('recommendations-list');
    if (list) {
      list.addEventListener('click', (e) => {
        const id = e.target.getAttribute('data-rec-id');
        if (id) {
          onApply(parseInt(id));
        }
      });
    }
  }

  renderAnalysisResult(result) {
    const container = document.getElementById('analysis-result');
    const status = document.getElementById('analysis-status');
    const btn = document.getElementById('generate-analysis-btn');

    if (status) status.classList.add('hidden');
    if (btn) btn.disabled = false;

    if (!container) return;

    container.classList.remove('hidden');

    if (result.error) {
      container.innerHTML = `
            <div class="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded" role="alert">
                <p class="font-bold">Analysis Failed</p>
                <p>${result.error}</p>
            </div>
        `;
      return;
    }

    const riskColor = result.risk_level === 'critical' || result.risk_level === 'high' ? 'text-red-600 bg-red-100' :
      result.risk_level === 'medium' ? 'text-yellow-600 bg-yellow-100' : 'text-green-600 bg-green-100';

    container.innerHTML = `
        <div class="space-y-4">
            <div class="flex justify-between items-start">
                <div>
                   <h4 class="text-xl font-bold text-gray-900 dark:text-white mb-1">${result.attack_type}</h4>
                   <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${riskColor}">
                     Risk: ${result.risk_level.toUpperCase()}
                   </span>
                </div>
            </div>

            <div class="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                <p class="font-semibold text-sm text-gray-500 dark:text-gray-400 uppercase">Root Cause</p>
                <p class="text-gray-800 dark:text-gray-200 mt-1">${result.root_cause}</p>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-100 dark:border-blue-800">
                    <p class="font-semibold text-blue-800 dark:text-blue-300 mb-2">Mitigations</p>
                    <ul class="list-disc list-inside space-y-1 text-sm text-gray-700 dark:text-gray-300">
                        ${result.mitigations.map(m => `<li><span class="font-medium">[${m.category}]</span> ${m.description}</li>`).join('')}
                    </ul>
                </div>
                
                 <div class="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border border-purple-100 dark:border-purple-800">
                    <p class="font-semibold text-purple-800 dark:text-purple-300 mb-2">Virtual Patches</p>
                     <ul class="list-disc list-inside space-y-1 text-sm text-gray-700 dark:text-gray-300">
                        ${result.virtual_patches.map(m => `<li><span class="font-medium">[${m.target}]</span> <code class="bg-gray-200 dark:bg-gray-800 px-1 rounded text-xs">${m.rule}</code></li>`).join('')}
                    </ul>
                </div>
            </div>
            
            ${result.references && result.references.length > 0 ? `
            <div>
                 <p class="text-xs text-gray-500 dark:text-gray-400">References: ${result.references.map(r => `<a href="#" class="hover:underline text-indigo-500" title="${r.title}">${r.standard} ${r.id}</a>`).join(', ')}</p>
            </div>` : ''}
            
            ${result._cached ? '<p class="text-xs text-gray-400 italic text-right">Result from cache</p>' : ''}
        </div>
    `;
  }

  showLoading() {
    const status = document.getElementById('analysis-status');
    const btn = document.getElementById('generate-analysis-btn');
    const container = document.getElementById('analysis-result');

    if (status) {
      status.classList.remove('hidden');
      status.textContent = 'Analyzing with LLaMA...';
    }
    if (btn) btn.disabled = true;
    if (container) container.classList.add('hidden');
  }

  bindAnalysisHandlers(onGenerate) {
    const btn = document.getElementById('generate-analysis-btn');
    const input = document.getElementById('attack-description');

    if (btn && input) {
      btn.addEventListener('click', () => {
        const text = input.value.trim();
        if (text) onGenerate(text);
      });
    }
  }
}

