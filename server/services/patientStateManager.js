/**
 * COMPONENT 1: Simplified Patient State Manager
 * 
 * Purpose: Track patient's current condition state without complex probabilistic transitions
 * Approach: Simple rule-based categorization: initial → improving/deteriorating/critical
 * 
 * Rules:
 * - Has critical treatment + 5min = "improving"
 * - No treatment + 10min = "deteriorating"  
 * - No treatment + 15min = "critical"
 */

class SimplifiedPatientState {
  constructor(scenario) {
    this.scenario = scenario;
    this.treatmentsGiven = [];
    this.assessmentsPerformed = [];
    this.startTime = Date.now();
    this.currentStateName = 'initial';
  }

  /**
   * Determine current patient state based on:
   * 1. Time elapsed
   * 2. Critical treatments given
   * 3. Scenario-specific rules
   */
  getCurrentState() {
    const elapsed = this.getElapsedMinutes();
    const hasCritical = this.hasCriticalTreatment();
    
    // Rule 1: Has critical treatment + enough time = improving
    if (hasCritical && elapsed >= 5) {
      this.currentStateName = 'improving';
      return this.scenario.state_descriptions.improving;
    }
    
    // Rule 2: No treatment + moderate time = deteriorating
    if (!hasCritical && elapsed >= 10) {
      this.currentStateName = 'deteriorating';
      return this.scenario.state_descriptions.deteriorating;
    }
    
    // Rule 3: No treatment + long time = critical
    if (!hasCritical && elapsed >= 15) {
      this.currentStateName = 'critical';
      return this.scenario.state_descriptions.critical;
    }
    
    // Default: initial state
    this.currentStateName = 'initial';
    return this.scenario.state_descriptions.initial;
  }

  getStateName() {
    this.getCurrentState(); // Updates currentStateName
    return this.currentStateName;
  }

  hasCriticalTreatment() {
    const criticalTreatments = this.scenario.critical_treatments || [];
    return criticalTreatments.some(treatment => 
      this.treatmentsGiven.some(given => given.name === treatment)
    );
  }

  recordTreatment(treatmentName, dose = null) {
    this.treatmentsGiven.push({
      name: treatmentName,
      dose: dose,
      timestamp: Date.now(),
      minutesMark: this.getElapsedMinutes()
    });
  }

  recordAssessment(assessmentType) {
    this.assessmentsPerformed.push({
      type: assessmentType,
      timestamp: Date.now(),
      minutesMark: this.getElapsedMinutes()
    });
  }

  getElapsedMinutes() {
    return Math.floor((Date.now() - this.startTime) / 60000);
  }

  getElapsedSeconds() {
    return Math.floor((Date.now() - this.startTime) / 1000);
  }

  getTreatmentTimeline() {
    return this.treatmentsGiven;
  }

  getAssessmentTimeline() {
    return this.assessmentsPerformed;
  }

  // For performance evaluation
  wasTreatmentGivenWithinWindow(treatmentName, windowMinutes) {
    const treatment = this.treatmentsGiven.find(t => t.name === treatmentName);
    if (!treatment) return false;
    return treatment.minutesMark <= windowMinutes;
  }
}

export default SimplifiedPatientState;