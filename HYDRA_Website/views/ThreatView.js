// Threat View - Renders threat monitor UI
class ThreatView {
  renderHeatmap(heatmap) {
    const grid = document.getElementById('heatmap-grid');
    if (!grid) return;
    
    grid.innerHTML = '';
    
    if (!heatmap || heatmap.length === 0) {
      return;
    }
    
    const flatValues = heatmap.flat().filter(v => v > 0);
    const maxIntensity = flatValues.length > 0 ? Math.max(...flatValues) : 1;
    
    for (let hour = 0; hour < 24; hour++) {
      for (let day = 0; day < 7; day++) {
        const value = heatmap[day] && heatmap[day][hour] !== undefined 
          ? heatmap[day][hour] 
          : 0;
        
        const cell = document.createElement('div');
        cell.className = 'heatmap-cell';
        cell.title = `Day ${day + 1}, Hour ${hour}: ${value.toFixed(2)} intensity`;
        
        const inner = document.createElement('span');
        const ratio = maxIntensity > 0 ? value / maxIntensity : 0;
        
        const color = ratio === 0
          ? '#f0f0f0'
          : ratio < 0.2
          ? '#ecfdf5'
          : ratio < 0.4
          ? '#d1fae5'
          : ratio < 0.6
          ? '#a7f3d0'
          : ratio < 0.8
          ? '#6ee7b7'
          : '#34d399';
        
        inner.style.backgroundColor = color;
        cell.appendChild(inner);
        grid.appendChild(cell);
      }
    }
  }

  renderLiveAnomaly(message) {
    const list = document.getElementById('live-anomalies-list');
    if (!list) return;
    
    const entry = document.createElement('div');
    entry.className = 'p-3 rounded-lg bg-gray-50 dark:bg-gray-700 mb-2 border-l-4 border-teal-500 shadow-sm';
    entry.innerHTML = `
      <div class="flex items-start justify-between gap-2">
        <span class="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">${new Date().toLocaleTimeString()}</span>
        <span class="flex-1 text-sm break-words">${message}</span>
      </div>
    `;
    list.insertBefore(entry, list.firstChild);
    
    while (list.children.length > 50) {
      list.removeChild(list.lastChild);
    }
    
    list.scrollTop = 0;
  }

  bindToggleHandler(onToggle) {
    const toggleBtn = document.getElementById('toggle-live-anomalies');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        const isPaused = toggleBtn.textContent === 'Resume';
        onToggle(isPaused);
        toggleBtn.textContent = isPaused ? 'Pause' : 'Resume';
      });
    }
  }

  updateToggleButton(isPaused) {
    const toggleBtn = document.getElementById('toggle-live-anomalies');
    if (toggleBtn) {
      toggleBtn.textContent = isPaused ? 'Resume' : 'Pause';
    }
  }
}

