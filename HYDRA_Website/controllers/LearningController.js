// Learning Controller - Coordinates learning loop interactions
class LearningController {
  constructor(dataModel, view) {
    this.model = dataModel;
    this.view = view;
    this.trainingInterval = null;
  }

  init() {
    const training = this.model.getTraining();
    this.view.renderTrainingState(training);
    this.view.setStartButtonEnabled(!training.inProgress);
    
    this.view.bindHandlers(
      (fileName) => this.handleFileSelect(fileName),
      () => this.handleStartTraining()
    );
  }

  handleFileSelect(fileName) {
    this.view.renderDatasetSummary(fileName);
    this.view.setStartButtonEnabled(!!fileName);
  }

  handleStartTraining() {
    const training = this.model.getTraining();
    if (training.inProgress) return;
    
    this.model.startTraining();
    this.view.setStartButtonEnabled(false);
    this.view.renderTrainingState(this.model.getTraining());
    
    const steps = 20;
    let current = 0;
    
    this.trainingInterval = setInterval(() => {
      current++;
      const percentage = Math.floor((current / steps) * 100);
      const log = `Epoch ${current}: loss ${(Math.random() * 0.1 + 0.1).toFixed(3)}, accuracy ${(0.7 + Math.random() * 0.2).toFixed(3)}`;
      
      this.model.updateTraining(percentage, log);
      this.view.renderTrainingState(this.model.getTraining());
      
      if (current >= steps) {
        clearInterval(this.trainingInterval);
        this.trainingInterval = null;
        this.model.completeTraining();
        this.view.renderTrainingState(this.model.getTraining());
        setTimeout(() => {
          this.view.setStartButtonEnabled(true);
        }, 1000);
      }
    }, 500);
  }

  destroy() {
    if (this.trainingInterval) {
      clearInterval(this.trainingInterval);
    }
  }
}

