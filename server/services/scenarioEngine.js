/**
 * COMPONENT 5: Scenario Engine (Orchestrator)
 * 
 * Purpose: Coordinate all components and generate runtime contexts for AI
 * Architecture: Three-layer system
 *   - Layer 1: Full blueprint (2000+ lines) stored in database
 *   - Layer 2: Runtime context (300-500 lines) generated dynamically
 *   - Layer 3: Backend components handle all logic
 * 
 * This is the CORE of the MVP architecture
 */

import SimplifiedPatientState from './patientStateManager.js';
import SimplifiedVitalSigns from './vitalSignsSimulator.js';
import SimplifiedTreatmentEngine from './treatmentEngine.js';
import SimplifiedPerformanceTracker from './performanceTracker.js';

class ScenarioEngine {
  constructor(fullBlueprint) {
    this.blueprint = fullBlueprint;
    
    // Initialize all components
    this.stateManager = new SimplifiedPatientState(fullBlueprint);
    this.vitalsSimulator = new SimplifiedVitalSigns(fullBlueprint);
    this.treatmentEngine = new SimplifiedTreatmentEngine(fullBlueprint);
    this.performanceTracker = new SimplifiedPerformanceTracker(fullBlueprint);
    
    this.sessionStartTime = Date.now();
  }

  /**
   * LAYER 2: Generate runtime context for AI
   * This is what General Prompt sees - minimal, focused, current
   */
  getRuntimeContext() {
    const currentState = this.stateManager.getCurrentState();
    const currentVitals = this.vitalsSimulator.getCurrentVitals();
    const elapsedTime = this.stateManager.getElapsedMinutes();

    return {
      // Patient basics
      patient_profile: {
        name: this.blueprint.patient_profile.name,
        age: this.blueprint.patient_profile.age,
        appearance: currentState.appearance,
        personality: this.blueprint.patient_profile.personality
      },

      // Current scene
      current_scene: {
        location: this.blueprint.scene_description,
        current_state_description: currentState.clinical_note,
        urgency: currentState.urgency_level
      },

      // Current vitals
      current_vitals: currentVitals,
      vitals_concern_level: this.vitalsSimulator.getVitalsConcernLevel(),

      // What student can discover now
      discoverable_findings: this.getDiscoverableFindings(currentState),

      // Available treatments
      available_treatments: this.treatmentEngine.getAvailableTreatments(),

      // Time context
      time_elapsed_minutes: elapsedTime,

      // Teaching hints (for AI to provide subtle guidance)
      teaching_context: this.getTeachingContext(currentState, elapsedTime)
    };
  }

  /**
   * Get findings student can discover based on current state
   */
  getDiscoverableFindings(currentState) {
    const findings = this.blueprint.assessment_findings || {};
    
    return {
      if_asks_history: findings.sample_history,
      if_examines_chest: findings.chest_examination,
      if_checks_vitals: this.vitalsSimulator.getFormattedVitals(),
      if_asks_what_happened: findings.chief_complaint_detail
    };
  }

  /**
   * Get teaching context for AI
   */
  getTeachingContext(currentState, elapsedTime) {
    const context = {
      scenario_type: this.blueprint.metadata.scenario_type,
      difficulty: this.blueprint.metadata.difficulty
    };

    // Add time pressure hints
    if (elapsedTime > 5 && !this.stateManager.hasCriticalTreatment()) {
      context.urgency_note = "Patient needs treatment urgently - time is critical";
    }

    // Add state-specific hints
    if (currentState.urgency_level === 'critical') {
      context.critical_note = "Life-threatening situation - immediate intervention required";
    }

    return context;
  }

  /**
   * Process student action - MAIN ORCHESTRATION METHOD
   */
  processStudentAction(action) {
    const response = {
      success: true,
      type: action.type,
      results: {}
    };

    // Record action for performance tracking
    this.performanceTracker.recordAction(action);

    // Handle different action types
    switch (action.type) {
      case 'treatment':
        response.results = this.handleTreatmentAction(action);
        break;
        
      case 'assessment':
        response.results = this.handleAssessmentAction(action);
        break;
        
      case 'communication':
        response.results = this.handleCommunicationAction(action);
        break;
        
      default:
        response.success = false;
        response.error = 'Unknown action type';
    }

    // Update patient state after action
    this.updatePatientState();

    return response;
  }

  /**
   * Handle treatment action
   */
  handleTreatmentAction(action) {
    // Apply treatment through treatment engine
    const treatmentResult = this.treatmentEngine.applyTreatment(
      action.drug,
      action.dose,
      {
        vitals: this.vitalsSimulator.getCurrentVitals(),
        state: this.stateManager.getStateName()
      }
    );

    if (!treatmentResult.success) {
      return treatmentResult;
    }

    // Record treatment in state manager
    this.stateManager.recordTreatment(action.drug, action.dose);

    // Apply vital signs update immediately for MVP
    // (In full version, this would be time-delayed)
    const elapsed = this.stateManager.getElapsedMinutes();
    this.vitalsSimulator.applyTreatmentEffect(
      action.drug,
      elapsed + treatmentResult.time_to_effect
    );

    return treatmentResult;
  }

  /**
   * Handle assessment action
   */
  handleAssessmentAction(action) {
    // Record assessment
    this.stateManager.recordAssessment(action.assessment_type);

    // Return appropriate finding
    const findings = this.blueprint.assessment_findings;
    const findingKey = action.assessment_type;

    return {
      success: true,
      finding: findings[findingKey] || 'No specific findings',
      vitals: action.includes_vitals ? this.vitalsSimulator.getCurrentVitals() : null
    };
  }

  /**
   * Handle communication action
   */
  handleCommunicationAction(action) {
    // For MVP: Simple acknowledgment
    // Full version would have more sophisticated dialogue
    return {
      success: true,
      patient_response: "Patient acknowledges and cooperates",
      effectiveness: "good"
    };
  }

  /**
   * Update patient state based on time and treatments
   */
  updatePatientState() {
    const elapsed = this.stateManager.getElapsedMinutes();
    
    // Apply time-based vital deterioration if no treatment
    if (!this.stateManager.hasCriticalTreatment()) {
      this.vitalsSimulator.applyTimeDegradation(elapsed);
    }

    // State manager automatically updates state based on rules
    this.stateManager.getCurrentState();
  }

  /**
   * Get current vitals (for frontend display)
   */
  getCurrentVitals() {
    return this.vitalsSimulator.getCurrentVitals();
  }

  /**
   * Check if scenario should end
   */
  shouldScenarioEnd() {
    const elapsed = this.stateManager.getElapsedMinutes();
    const stateName = this.stateManager.getStateName();

    // End conditions
    if (elapsed >= 20) return { should_end: true, reason: 'time_limit' };
    if (stateName === 'critical') return { should_end: true, reason: 'patient_critical' };
    if (stateName === 'improving' && elapsed >= 12) return { should_end: true, reason: 'patient_stabilized' };

    return { should_end: false };
  }

  /**
   * Generate final performance report
   */
  generatePerformanceReport() {
    return this.performanceTracker.generateAARReport();
  }

  /**
   * Get scenario metadata
   */
  getScenarioMetadata() {
    return this.blueprint.metadata;
  }
}

export default ScenarioEngine;