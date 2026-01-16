/**
 * Patient State Tracker - V3.0 Performance Assessment System
 *
 * Purpose: Track patient state continuously for outcome-based competence assessment
 *
 * Key Concept: Assessment is based on PATIENT STATE AT ACTION and AFTER ACTION,
 * not arbitrary time thresholds.
 *
 * States:
 * - initial: Presenting symptoms, stable for assessment (0-5 min untreated)
 * - early_deteriorating: First signs of worsening (5-7 min)
 * - deteriorating: Clear worsening, needs immediate intervention (7-9 min)
 * - critical: Life-threatening, imminent arrest (9-13 min)
 * - improving: Positive response to treatment
 * - stable: Stabilized after treatment
 */

class StateTracker {
  /**
   * Initialize state tracker with scenario blueprint
   * @param {Object} scenarioBlueprint - Full scenario blueprint
   */
  constructor(scenarioBlueprint) {
    this.scenarioId = scenarioBlueprint.scenario_id;
    this.states = scenarioBlueprint.scenario_states || {};
    this.deteriorationTimeline = scenarioBlueprint.simulation_config?.deterioration_timing_minutes || [5, 9, 13];
    this.noTreatmentProgression = scenarioBlueprint.no_treatment_progression || {};

    // Current state tracking
    this.currentState = 'initial';
    this.stateHistory = [{
      state: 'initial',
      timestamp: Date.now(),
      elapsedMinutes: 0,
      reason: 'Scenario start'
    }];

    // Vitals tracking
    this.currentVitals = { ...scenarioBlueprint.initial_vitals };
    this.vitalsHistory = [{
      vitals: { ...this.currentVitals },
      timestamp: Date.now(),
      elapsedMinutes: 0
    }];

    // Treatment tracking
    this.criticalTreatmentGiven = false;
    this.treatmentTimestamps = [];

    this.scenarioStartTime = Date.now();
  }

  /**
   * Get current state name
   * @returns {string} - Current state ('initial', 'deteriorating', etc.)
   */
  getCurrentState() {
    return this.currentState;
  }

  /**
   * Get state at a specific timestamp (for retrospective assessment)
   * Used for competence assessment: "What state was patient in when action was performed?"
   *
   * @param {number} timestamp - Timestamp to query
   * @returns {string} - State at that timestamp
   */
  getStateAtTime(timestamp) {
    // Find the most recent state change before or at this timestamp
    for (let i = this.stateHistory.length - 1; i >= 0; i--) {
      if (this.stateHistory[i].timestamp <= timestamp) {
        return this.stateHistory[i].state;
      }
    }

    return 'initial'; // Default if no history found
  }

  /**
   * Get vitals at a specific timestamp
   * @param {number} timestamp - Timestamp to query
   * @returns {Object} - Vitals at that timestamp
   */
  getVitalsAtTime(timestamp) {
    for (let i = this.vitalsHistory.length - 1; i >= 0; i--) {
      if (this.vitalsHistory[i].timestamp <= timestamp) {
        return this.vitalsHistory[i].vitals;
      }
    }

    return this.vitalsHistory[0]?.vitals || {};
  }

  /**
   * Update patient state based on time progression (untreated deterioration)
   * Called periodically by ScenarioEngine if auto-deterioration enabled
   *
   * @param {number} elapsedMinutes - Minutes since scenario start
   */
  updateStateBasedOnTime(elapsedMinutes) {
    // If critical treatment has been given, don't auto-deteriorate
    if (this.criticalTreatmentGiven) {
      return;
    }

    const [earlyThreshold, deterioratingThreshold, criticalThreshold] = this.deteriorationTimeline;

    let newState = this.currentState;

    if (elapsedMinutes >= criticalThreshold && this.currentState !== 'critical') {
      newState = 'critical';
    } else if (elapsedMinutes >= deterioratingThreshold && !['deteriorating', 'critical'].includes(this.currentState)) {
      newState = 'deteriorating';
    } else if (elapsedMinutes >= earlyThreshold && this.currentState === 'initial') {
      newState = 'early_deteriorating';
    }

    if (newState !== this.currentState) {
      this.transitionTo(newState, 'Time-based deterioration (no treatment)');
    }

    // Update vitals based on no-treatment progression
    this._updateVitalsFromNoTreatmentProgression(elapsedMinutes);
  }

  /**
   * Transition to a new state
   * @param {string} newState - New state name
   * @param {string} reason - Reason for transition
   */
  transitionTo(newState, reason = '') {
    if (newState === this.currentState) {
      return; // No change
    }

    const previousState = this.currentState;
    this.currentState = newState;

    const now = Date.now();
    const elapsedMinutes = (now - this.scenarioStartTime) / 1000 / 60;

    this.stateHistory.push({
      state: newState,
      previousState,
      timestamp: now,
      elapsedMinutes: parseFloat(elapsedMinutes.toFixed(2)),
      reason
    });

    console.log(`[StateTracker] State transition: ${previousState} → ${newState} at ${elapsedMinutes.toFixed(2)} min (${reason})`);
  }

  /**
   * Record treatment administration
   * @param {Object} treatment - Treatment details
   * @param {boolean} isCritical - Whether this is a critical/life-saving treatment
   */
  recordTreatment(treatment, isCritical = false) {
    const now = Date.now();
    const elapsedMinutes = (now - this.scenarioStartTime) / 1000 / 60;

    this.treatmentTimestamps.push({
      ...treatment,
      timestamp: now,
      elapsedMinutes: parseFloat(elapsedMinutes.toFixed(2)),
      isCritical
    });

    if (isCritical) {
      this.criticalTreatmentGiven = true;
      console.log(`[StateTracker] Critical treatment given: ${treatment.name || treatment.action}`);
    }
  }

  /**
   * Apply treatment effect to patient state
   * Called by ScenarioEngine after Core Agent processes treatment
   *
   * @param {Object} treatmentEffect - Effect from blueprint (vital changes, state change)
   */
  applyTreatmentEffect(treatmentEffect) {
    if (!treatmentEffect) return;

    // Update vitals if treatment effect specifies changes
    if (treatmentEffect.vital_changes) {
      this._updateVitals(treatmentEffect.vital_changes, 'Treatment effect');
    }

    // Update state if treatment causes transition
    if (treatmentEffect.state_change) {
      if (treatmentEffect.state_change === 'improving') {
        this.transitionTo('improving', 'Response to treatment');
      } else if (treatmentEffect.state_change === 'stable') {
        this.transitionTo('stable', 'Stabilized after treatment');
      }
    }
  }

  /**
   * Update vitals
   * @private
   */
  _updateVitals(newVitals, reason = '') {
    // Merge new vitals with current (only update provided values)
    this.currentVitals = {
      ...this.currentVitals,
      ...newVitals
    };

    const now = Date.now();
    const elapsedMinutes = (now - this.scenarioStartTime) / 1000 / 60;

    this.vitalsHistory.push({
      vitals: { ...this.currentVitals },
      timestamp: now,
      elapsedMinutes: parseFloat(elapsedMinutes.toFixed(2)),
      reason
    });

    console.log(`[StateTracker] Vitals updated at ${elapsedMinutes.toFixed(2)} min: ${JSON.stringify(newVitals)} (${reason})`);
  }

  /**
   * Update vitals from no-treatment progression timeline
   * @private
   */
  _updateVitalsFromNoTreatmentProgression(elapsedMinutes) {
    if (this.criticalTreatmentGiven) {
      return; // Don't apply no-treatment progression if treated
    }

    // Find closest no-treatment progression point
    const progressionKeys = Object.keys(this.noTreatmentProgression).map(k => parseInt(k.replace('min', '')));
    const closestKey = progressionKeys.reduce((prev, curr) => {
      return Math.abs(curr - elapsedMinutes) < Math.abs(prev - elapsedMinutes) ? curr : prev;
    });

    if (Math.abs(closestKey - elapsedMinutes) < 0.5) { // Within 30 seconds
      const progression = this.noTreatmentProgression[`${closestKey}min`];
      if (progression?.vitals) {
        this._updateVitals(progression.vitals, `No-treatment progression (${closestKey} min)`);
      }
    }
  }

  /**
   * Get current vitals
   * @returns {Object} - Current vital signs
   */
  getCurrentVitals() {
    return { ...this.currentVitals };
  }

  /**
   * Get elapsed time in minutes
   * @returns {number} - Minutes since scenario start
   */
  getElapsedMinutes() {
    const now = Date.now();
    return (now - this.scenarioStartTime) / 1000 / 60;
  }

  /**
   * Get full state history (for detailed analysis)
   * @returns {Array} - Array of state transitions
   */
  getStateHistory() {
    return [...this.stateHistory];
  }

  /**
   * Get full vitals history
   * @returns {Array} - Array of vitals records
   */
  getVitalsHistory() {
    return [...this.vitalsHistory];
  }

  /**
   * Get assessment data for a specific action
   * This is the KEY method for outcome-based competence assessment
   *
   * @param {string} actionId - Action ID
   * @param {number} actionTimestamp - When action was performed
   * @returns {Object} - Data for competence assessment
   */
  getAssessmentDataForAction(actionId, actionTimestamp) {
    const stateAtAction = this.getStateAtTime(actionTimestamp);
    const vitalsAtAction = this.getVitalsAtTime(actionTimestamp);

    // Get state 2-3 minutes after action (to see treatment effect)
    const afterTimestamp = actionTimestamp + (2.5 * 60 * 1000);
    const stateAfter = this.getStateAtTime(afterTimestamp);
    const vitalsAfter = this.getVitalsAtTime(afterTimestamp);

    return {
      actionId,
      actionTimestamp,
      actionTimestampMinutes: (actionTimestamp - this.scenarioStartTime) / 1000 / 60,
      patient_state_at_action: stateAtAction,
      patient_state_after: stateAfter,
      vitals_at_action: vitalsAtAction,
      vitals_after: vitalsAfter,
      elapsed_minutes: this.getElapsedMinutes()
    };
  }

  /**
   * Get summary for AAR
   * @returns {Object} - State progression summary
   */
  getSummary() {
    return {
      scenario_id: this.scenarioId,
      duration_minutes: this.getElapsedMinutes(),
      initial_state: 'initial',
      final_state: this.currentState,
      state_transitions: this.stateHistory.length - 1,
      critical_treatment_given: this.criticalTreatmentGiven,
      worst_state_reached: this._getWorstStateReached(),
      state_history: this.getStateHistory(),
      initial_vitals: this.vitalsHistory[0]?.vitals,
      final_vitals: this.currentVitals
    };
  }

  /**
   * Get worst state reached during scenario
   * @private
   */
  _getWorstStateReached() {
    const severityOrder = { initial: 0, early_deteriorating: 1, deteriorating: 2, critical: 3, improving: -1, stable: -2 };

    return this.stateHistory.reduce((worst, entry) => {
      return (severityOrder[entry.state] || 0) > (severityOrder[worst] || 0) ? entry.state : worst;
    }, 'initial');
  }

  /**
   * Reset state tracker (for testing or scenario restart)
   */
  reset() {
    this.currentState = 'initial';
    this.stateHistory = [{
      state: 'initial',
      timestamp: Date.now(),
      elapsedMinutes: 0,
      reason: 'Reset'
    }];
    this.currentVitals = { ...this.vitalsHistory[0]?.vitals };
    this.vitalsHistory = [{
      vitals: { ...this.currentVitals },
      timestamp: Date.now(),
      elapsedMinutes: 0
    }];
    this.criticalTreatmentGiven = false;
    this.treatmentTimestamps = [];
    this.scenarioStartTime = Date.now();
  }
}

module.exports = StateTracker;
