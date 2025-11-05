/**
 * COMPONENT 2: Simplified Vital Signs System
 * 
 * Purpose: Update patient vital signs based on treatments and time progression
 * Approach: Simple lookup tables from scenario (no complex physiological algorithms)
 * 
 * Features:
 * - Apply treatment effects from scenario data
 * - Apply time-based deterioration if no treatment
 * - Track vital sign changes
 * - Detect concerning vital ranges
 */

class SimplifiedVitalSigns {
  constructor(scenario) {
    this.scenario = scenario;
    this.baseline = { ...scenario.initial_vitals };
    this.current = { ...scenario.initial_vitals };
    this.treatmentEffectsApplied = [];
    this.lastUpdate = Date.now();
  }

  /**
   * Apply treatment effect from scenario's lookup table
   * @param {string} treatmentName - Name of treatment (e.g., 'salbutamol')
   * @param {number} minutesSinceTreatment - Time elapsed since treatment given
   */
  applyTreatmentEffect(treatmentName, minutesSinceTreatment) {
    const treatmentData = this.scenario.treatment_responses[treatmentName];
    
    if (!treatmentData) {
      console.warn(`No effects defined for treatment: ${treatmentName}`);
      return null;
    }

    // Check if enough time has passed for effect to show
    const timeToEffect = treatmentData.time_to_effect_minutes || 0;
    
    if (minutesSinceTreatment < timeToEffect) {
      return { status: 'too_soon', message: 'Effect not yet visible' };
    }

    // Apply the vital sign changes from scenario
    const vitalChanges = treatmentData.vital_changes;
    
    if (vitalChanges.HR) this.current.HR = vitalChanges.HR;
    if (vitalChanges.RR) this.current.RR = vitalChanges.RR;
    if (vitalChanges.SpO2) this.current.SpO2 = vitalChanges.SpO2;
    if (vitalChanges.BP_systolic) this.current.BP_systolic = vitalChanges.BP_systolic;
    if (vitalChanges.BP_diastolic) this.current.BP_diastolic = vitalChanges.BP_diastolic;

    // Record that this effect has been applied
    this.treatmentEffectsApplied.push({
      treatment: treatmentName,
      appliedAt: Date.now(),
      changes: vitalChanges
    });

    return { 
      status: 'applied', 
      changes: vitalChanges,
      patientResponse: treatmentData.patient_says
    };
  }

  /**
   * Apply time-based deterioration if no treatment given
   * @param {number} minutesElapsed - Total minutes since scenario start
   */
  applyTimeDegradation(minutesElapsed) {
    const degradationData = this.scenario.no_treatment_progression;
    
    if (!degradationData) return;

    // Find the appropriate time bucket
    let applicableDegradation = null;
    
    for (const [timeKey, data] of Object.entries(degradationData)) {
      const timeThreshold = parseInt(timeKey.replace('min', ''));
      if (minutesElapsed >= timeThreshold) {
        applicableDegradation = data;
      }
    }

    if (applicableDegradation && applicableDegradation.vitals) {
      this.current = { ...this.current, ...applicableDegradation.vitals };
    }
  }

  /**
   * Get current vital signs
   */
  getCurrentVitals() {
    return { ...this.current };
  }

  /**
   * Get vital signs formatted for display
   */
  getFormattedVitals() {
    return {
      HR: `${this.current.HR} bpm`,
      RR: `${this.current.RR} /min`,
      SpO2: `${this.current.SpO2}%`,
      BP: `${this.current.BP_systolic}/${this.current.BP_diastolic} mmHg`,
      temperature: this.current.temperature ? `${this.current.temperature}°C` : null,
      pain: this.current.pain_score ? `${this.current.pain_score}/10` : null,
      GCS: this.current.GCS || null
    };
  }

  /**
   * Check if vitals are in concerning range
   */
  getVitalsConcernLevel() {
    const concerns = [];

    if (this.current.SpO2 < 90) concerns.push('Critical hypoxia');
    else if (this.current.SpO2 < 94) concerns.push('Moderate hypoxia');

    if (this.current.HR > 120) concerns.push('Tachycardia');
    else if (this.current.HR < 50) concerns.push('Bradycardia');

    if (this.current.RR > 30) concerns.push('Tachypnea');
    else if (this.current.RR < 10) concerns.push('Bradypnea - critical');

    if (this.current.BP_systolic < 90) concerns.push('Hypotension');
    else if (this.current.BP_systolic > 180) concerns.push('Hypertension');

    if (concerns.length === 0) return { level: 'normal', concerns: [] };
    if (concerns.some(c => c.includes('critical'))) return { level: 'critical', concerns };
    if (concerns.length >= 2) return { level: 'concerning', concerns };
    return { level: 'mild', concerns };
  }

  /**
   * Reset to baseline (for testing)
   */
  reset() {
    this.current = { ...this.baseline };
    this.treatmentEffectsApplied = [];
  }
}

export default SimplifiedVitalSigns;