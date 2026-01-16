/**
 * Safety Gate Monitor - V3.0 Performance Assessment System
 *
 * Purpose: Track critical failures (patient-harming errors) during scenario execution
 *
 * Design Principles:
 * - Silent tracking - NEVER interrupt scenario or warn student
 * - Let consequences unfold naturally - Even if patient dies
 * - High priority in AAR - Address critical failures FIRST in debriefing
 * - Distinguish safety violations from development areas
 *
 * Three Types of Critical Failures:
 * 1. OMISSION - Life-saving treatment never provided
 * 2. COMMISSION - Dangerous action performed that harms patient
 * 3. CONTRAINDICATION - Medication given despite stated allergy
 */

class SafetyGateMonitor {
  /**
   * Initialize safety gate monitor with scenario blueprint
   * @param {Object} scenarioBlueprint - Full scenario blueprint containing safety_gate section
   */
  constructor(scenarioBlueprint) {
    if (!scenarioBlueprint.safety_gate || !scenarioBlueprint.safety_gate.enabled) {
      this.enabled = false;
      this.criticalFailures = [];
      this.failures = [];
      return;
    }

    this.enabled = true;
    this.trackingMode = scenarioBlueprint.safety_gate.tracking_mode || 'silent';
    this.interruptScenario = scenarioBlueprint.safety_gate.interrupt_scenario || false;
    this.criticalFailures = scenarioBlueprint.safety_gate.critical_failures || [];
    this.failures = [];
    this.scenarioStartTime = Date.now();

    // Patient state tracking for detection criteria
    this.patientState = {
      medications_given: [],
      actions_performed: [],
      patient_allergies: scenarioBlueprint.patient_profile?.allergies || [],
      patient_history: scenarioBlueprint.patient_profile || {}
    };
  }

  /**
   * Record an action performed by the student
   * Used for omission failure detection
   *
   * @param {string} actionId - Action ID (e.g., "CA3")
   * @param {string} actionName - Human-readable action name
   */
  recordAction(actionId, actionName) {
    if (!this.enabled) return;

    this.patientState.actions_performed.push({
      id: actionId,
      name: actionName,
      timestamp: Date.now()
    });
  }

  /**
   * Record a medication administered
   * Used for commission and contraindication detection
   *
   * @param {string} medicationName - Medication name
   * @param {Object} details - Administration details (dose, route, etc.)
   */
  recordMedication(medicationName, details = {}) {
    if (!this.enabled) return;

    const medication = {
      name: medicationName.toLowerCase(),
      ...details,
      timestamp: Date.now()
    };

    this.patientState.medications_given.push(medication);

    // Check for immediate commission failures (wrong medication, wrong route, contraindication)
    this._checkCommissionFailures(medication);
    this._checkContraindications(medication);
  }

  /**
   * Check for commission failures (dangerous actions)
   * @private
   */
  _checkCommissionFailures(medication) {
    for (const failure of this.criticalFailures) {
      if (failure.type !== 'commission') continue;

      // Check if this medication/action matches failure criteria
      const criteria = failure.detection_criteria;

      // Example: IV epinephrine in anaphylaxis (should be IM)
      if (criteria.condition.includes('epinephrine_route') && medication.name.includes('epinephrine')) {
        if (criteria.condition.includes("== 'IV'") && medication.route === 'IV') {
          // Check for exception (cardiac arrest)
          if (criteria.exception && criteria.exception.includes('cardiac_arrest_present')) {
            if (!this.patientState.cardiac_arrest) {
              this._logFailure(failure, medication);
            }
          } else {
            this._logFailure(failure, medication);
          }
        }
      }

      // Example: Sedatives in severe asthma
      if (criteria.condition.includes('medication_given')) {
        const dangerousMeds = this._extractMedicationsFromCondition(criteria.condition);
        if (dangerousMeds.includes(medication.name)) {
          this._logFailure(failure, medication);
        }
      }

      // Example: Beta-blockers given
      if (failure.description.toLowerCase().includes('beta-blocker')) {
        const betaBlockers = ['propranolol', 'metoprolol', 'atenolol', 'labetalol'];
        if (betaBlockers.some(bb => medication.name.includes(bb))) {
          this._logFailure(failure, medication);
        }
      }

      // Example: Excessive fluid resuscitation
      if (failure.description.toLowerCase().includes('excessive fluid')) {
        const totalFluids = this._calculateTotalFluids();
        if (totalFluids > 2000) { // >2L
          this._logFailure(failure, { ...medication, totalFluids });
        }
      }
    }
  }

  /**
   * Check for contraindication violations
   * @private
   */
  _checkContraindications(medication) {
    const contraFailure = this.criticalFailures.find(f =>
      f.type === 'contraindication' &&
      f.description.toLowerCase().includes('allergy')
    );

    if (!contraFailure) return;

    // Check if medication is in patient's allergy list
    const allergies = this.patientState.patient_allergies.map(a => a.toLowerCase());
    if (allergies.some(allergy => medication.name.includes(allergy) || allergy.includes(medication.name))) {
      this._logFailure(contraFailure, medication);
    }
  }

  /**
   * Check for omission failures at scenario end
   * Called by ScenarioEngine when scenario completes
   *
   * @param {Object} finalState - Final patient state and scenario data
   */
  checkEndOfScenarioOmissions(finalState) {
    if (!this.enabled) return;

    for (const failure of this.criticalFailures) {
      if (failure.type !== 'omission') continue;

      // Check if required action was performed
      const requiredActionPerformed = this._checkActionPerformed(failure);

      if (!requiredActionPerformed) {
        // Check if patient state requirement is met (e.g., anaphylaxis confirmed)
        const stateRequirementMet = this._checkStateRequirement(failure, finalState);

        if (stateRequirementMet) {
          this._logFailure(failure, {
            type: 'omission',
            scenarioEnd: true,
            finalState
          });
        }
      }
    }
  }

  /**
   * Check if required action was performed
   * @private
   */
  _checkActionPerformed(failure) {
    const criteria = failure.detection_criteria;

    // Extract what action/medication should have been given
    // Example: "epinephrine_given == false" means check if epinephrine was given
    if (criteria.condition.includes('epinephrine_given == false')) {
      return this.patientState.medications_given.some(m =>
        m.name.includes('epinephrine') || m.name.includes('adrenaline')
      );
    }

    if (criteria.condition.includes('salbutamol_given == false')) {
      return this.patientState.medications_given.some(m =>
        m.name.includes('salbutamol') || m.name.includes('albuterol')
      );
    }

    if (criteria.condition.includes('naloxone_given == false')) {
      return this.patientState.medications_given.some(m =>
        m.name.includes('naloxone') || m.name.includes('narcan')
      );
    }

    if (criteria.condition.includes('glucose_checked == false')) {
      return this.patientState.actions_performed.some(a =>
        a.name.toLowerCase().includes('glucose') ||
        a.name.toLowerCase().includes('blood sugar') ||
        a.id === 'CA4' // Glucose check is typically CA4 in seizure scenarios
      );
    }

    if (criteria.condition.includes('bvm_ventilation_provided == false')) {
      return this.patientState.actions_performed.some(a =>
        a.name.toLowerCase().includes('bvm') ||
        a.name.toLowerCase().includes('ventilat') ||
        a.id === 'CA4' // BVM is CA4 in opioid scenarios
      );
    }

    if (criteria.condition.includes('pelvic_binder_applied == false')) {
      return this.patientState.actions_performed.some(a =>
        a.name.toLowerCase().includes('binder') ||
        a.name.toLowerCase().includes('pelvic') ||
        a.id === 'CA4' // Pelvic binder is CA4 in hemorrhagic shock
      );
    }

    if (criteria.condition.includes('c_spine_immobilized == false')) {
      return this.patientState.actions_performed.some(a =>
        a.name.toLowerCase().includes('c-spine') ||
        a.name.toLowerCase().includes('collar') ||
        a.name.toLowerCase().includes('immobil') ||
        a.id === 'CA2' // C-spine is CA2 in TBI
      );
    }

    if (criteria.condition.includes('gcs_assessments_count')) {
      const gcsAssessments = this.patientState.actions_performed.filter(a =>
        a.name.toLowerCase().includes('gcs') ||
        a.name.toLowerCase().includes('glasgow') ||
        a.id === 'CA3' || a.id === 'CA7' // GCS assessment actions
      );
      return gcsAssessments.length >= 2; // Should have at least 2 for trending
    }

    return false;
  }

  /**
   * Check if patient state requirement is met
   * @private
   */
  _checkStateRequirement(failure, finalState) {
    const requirement = failure.detection_criteria.patient_state_required;

    if (!requirement) return true; // No specific requirement

    // Map requirements to conditions
    if (requirement === 'anaphylaxis_confirmed') {
      return finalState.diagnosis === 'anaphylaxis' || finalState.scenario_id?.includes('ANAPHYLAXIS');
    }

    if (requirement === 'life_threatening_asthma_confirmed') {
      return finalState.scenario_id?.includes('ASTHMA');
    }

    if (requirement === 'opioid_toxidrome_confirmed') {
      return finalState.scenario_id?.includes('OPIOID');
    }

    if (requirement.includes('respiratory_rate_less_than')) {
      const threshold = parseInt(requirement.match(/\d+/)?.[0] || 8);
      return finalState.initial_vitals?.RR < threshold;
    }

    return true;
  }

  /**
   * Log a critical failure
   * @private
   */
  _logFailure(failure, context = {}) {
    // Check if this failure already logged (prevent duplicates)
    if (this.failures.some(f => f.id === failure.id)) {
      return;
    }

    const now = Date.now();
    const elapsedMinutes = (now - this.scenarioStartTime) / 1000 / 60;

    const loggedFailure = {
      id: failure.id,
      type: failure.type,
      description: failure.description,
      patient_outcome: failure.patient_outcome,
      aar_teaching_point: failure.aar_teaching_point,
      timestamp: now,
      timestampMinutes: parseFloat(elapsedMinutes.toFixed(2)),
      context: context
    };

    this.failures.push(loggedFailure);

    console.error(`[SafetyGate] CRITICAL FAILURE: ${failure.id} - ${failure.description} at ${elapsedMinutes.toFixed(2)} minutes`);

    // In silent mode, do NOT interrupt scenario
    if (this.trackingMode === 'silent' && !this.interruptScenario) {
      console.log('[SafetyGate] Silent mode - scenario continues naturally');
    }
  }

  /**
   * Extract medication names from condition string
   * @private
   */
  _extractMedicationsFromCondition(condition) {
    // Extract medications from strings like: "medication_given == 'diazepam' OR medication_given == 'midazolam'"
    const matches = condition.match(/'([^']+)'/g);
    return matches ? matches.map(m => m.replace(/'/g, '').toLowerCase()) : [];
  }

  /**
   * Calculate total fluids administered
   * @private
   */
  _calculateTotalFluids() {
    return this.patientState.medications_given
      .filter(m => m.name.includes('saline') || m.name.includes('fluid') || m.name.includes('crystalloid'))
      .reduce((total, m) => total + (m.volume || 0), 0);
  }

  /**
   * Get safety gate summary for AAR
   *
   * @returns {Object} - Summary with pass/fail status and failures
   */
  getSummary() {
    if (!this.enabled) {
      return {
        enabled: false,
        passed: true,
        failures: []
      };
    }

    return {
      enabled: true,
      passed: this.failures.length === 0,
      failureCount: this.failures.length,
      failures: this.failures.map(f => ({
        id: f.id,
        type: f.type,
        description: f.description,
        patient_outcome: f.patient_outcome,
        aar_teaching_point: f.aar_teaching_point,
        timestamp: f.timestampMinutes
      }))
    };
  }

  /**
   * Get AAR-prioritized failure list for debriefing
   * Safety Gate failures should be addressed FIRST in AAR
   *
   * @returns {Array} - Ordered list of failures for AAR review
   */
  getFailuresForAAR() {
    if (!this.enabled || this.failures.length === 0) {
      return [];
    }

    // Order by severity: omission > commission > contraindication
    const severityOrder = { omission: 1, commission: 2, contraindication: 3 };

    return this.failures.sort((a, b) => {
      return severityOrder[a.type] - severityOrder[b.type];
    });
  }

  /**
   * Reset safety gate (for testing or scenario restart)
   */
  reset() {
    if (!this.enabled) return;

    this.failures = [];
    this.patientState = {
      medications_given: [],
      actions_performed: [],
      patient_allergies: this.patientState.patient_allergies,
      patient_history: this.patientState.patient_history
    };
    this.scenarioStartTime = Date.now();
  }
}

module.exports = SafetyGateMonitor;
