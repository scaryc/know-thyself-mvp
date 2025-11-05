/**
 * COMPONENT 3: Simplified Treatment Engine
 * 
 * Purpose: Process student treatment decisions with basic safety checks
 * Approach: Simple validation against scenario data
 * 
 * Features:
 * - Validate medication exists in scenario
 * - Check contraindications
 * - Validate dose ranges
 * - Return treatment effects from scenario
 */

class SimplifiedTreatmentEngine {
  constructor(scenario) {
    this.scenario = scenario;
    this.medications = scenario.medications_available || {};
  }

  /**
   * Apply treatment and get response
   * @param {string} drugName - Name of medication
   * @param {string} dose - Dose given
   * @param {object} currentPatientState - Current patient condition
   */
  applyTreatment(drugName, dose, currentPatientState) {
    const medication = this.medications[drugName];

    if (!medication) {
      return {
        success: false,
        error: 'unknown_medication',
        message: `Medication "${drugName}" not available in this scenario`
      };
    }

    // Check contraindications (simple yes/no check)
    const contraindication = this.checkContraindications(
      medication,
      currentPatientState
    );

    if (contraindication) {
      return {
        success: false,
        error: 'contraindicated',
        message: contraindication,
        severity: 'warning' // For MVP, don't block, just warn
      };
    }

    // Check if dose is appropriate
    const doseCheck = this.validateDose(medication, dose);
    
    if (!doseCheck.valid) {
      return {
        success: false,
        error: 'incorrect_dose',
        message: doseCheck.message,
        suggested_dose: medication.dose_adult
      };
    }

    // Return treatment effects from scenario
    return {
      success: true,
      drug: drugName,
      dose: dose,
      immediate_effect: medication.patient_experience,
      time_to_effect: medication.onset_minutes,
      vital_changes: medication.vital_effects,
      side_effects: medication.side_effects || [],
      clinical_note: medication.clinical_note
    };
  }

  /**
   * Simple contraindication checking
   */
  checkContraindications(medication, patientState) {
    const contraindications = medication.contraindications_absolute || [];
    
    // For MVP: Just check a few critical ones
    // Example checks:
    if (contraindications.includes('systolic_bp_below_90')) {
      if (patientState.vitals && patientState.vitals.BP_systolic < 90) {
        return `⚠️ CONTRAINDICATION: Systolic BP is ${patientState.vitals.BP_systolic} mmHg. This medication requires BP ≥ 90 mmHg.`;
      }
    }

    if (contraindications.includes('active_bleeding')) {
      if (patientState.has_bleeding) {
        return `⚠️ CONTRAINDICATION: Patient has active bleeding. This medication increases bleeding risk.`;
      }
    }

    // No contraindications found
    return null;
  }

  /**
   * Validate dose is within safe range
   */
  validateDose(medication, doseGiven) {
    const standardDose = medication.dose_adult;
    const maxDose = medication.max_dose;

    // For MVP: Simple string comparison
    // More sophisticated parsing can come later
    if (doseGiven === standardDose) {
      return { valid: true };
    }

    // Extract numeric value (simple parsing)
    const givenNumeric = parseFloat(doseGiven);
    const standardNumeric = parseFloat(standardDose);
    const maxNumeric = maxDose ? parseFloat(maxDose) : standardNumeric * 2;

    if (isNaN(givenNumeric)) {
      return {
        valid: false,
        message: `Could not parse dose "${doseGiven}". Standard dose is ${standardDose}.`
      };
    }

    if (givenNumeric > maxNumeric) {
      return {
        valid: false,
        message: `⚠️ DOSE TOO HIGH: ${doseGiven} exceeds maximum safe dose of ${maxDose}. Risk of serious side effects.`
      };
    }

    if (givenNumeric < standardNumeric * 0.5) {
      return {
        valid: false,
        message: `⚠️ DOSE TOO LOW: ${doseGiven} is below therapeutic range. Standard dose is ${standardDose}.`
      };
    }

    // Dose within reasonable range
    return { valid: true };
  }

  /**
   * Get available treatments for current scenario
   */
  getAvailableTreatments() {
    return Object.keys(this.medications).map(drugName => ({
      name: drugName,
      dose: this.medications[drugName].dose_adult,
      indication: this.medications[drugName].indication,
      route: this.medications[drugName].route
    }));
  }

  /**
   * Get detailed medication information
   */
  getMedicationInfo(drugName) {
    return this.medications[drugName] || null;
  }
}

export default SimplifiedTreatmentEngine;