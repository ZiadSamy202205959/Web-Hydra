// Learning View - Renders learning loop UI
class LearningView {
  renderTrainingState(training) {
    const progressBar = document.getElementById('training-progress-bar');
    const progressText = document.getElementById('training-progress-text');
    const logsContainer = document.getElementById('training-logs');
    
    if (progressBar) {
      progressBar.style.width = `${training.progress || 0}%`;
    }
    
    if (progressText) {
      if (training.inProgress) {
        progressText.textContent = `Retraining: ${training.progress || 0}%`;
      } else {
        progressText.textContent = training.progress === 100 ? 'Retraining complete!' : 'Ready to start';
      }
    }
    
    if (logsContainer && training.logs) {
      logsContainer.textContent = training.logs.join('\n');
      logsContainer.scrollTop = logsContainer.scrollHeight;
    }
  }

  renderDatasetSummary(fileName) {
    const summary = document.getElementById('dataset-summary');
    if (summary) {
      if (fileName) {
        summary.textContent = `Selected file: ${fileName} (simulated 1000 records)`;
      } else {
        summary.textContent = '';
      }
    }
  }

  bindHandlers(onFileSelect, onStartTraining) {
    const fileInput = document.getElementById('dataset-file');
    const startBtn = document.getElementById('start-training');
    
    if (fileInput) {
      fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        onFileSelect(file ? file.name : null);
      });
    }
    
    if (startBtn) {
      startBtn.addEventListener('click', () => {
        onStartTraining();
      });
    }
  }

  setStartButtonEnabled(enabled) {
    const startBtn = document.getElementById('start-training');
    if (startBtn) {
      startBtn.disabled = !enabled;
    }
  }
}

