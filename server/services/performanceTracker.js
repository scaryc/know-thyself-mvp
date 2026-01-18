/**
 * Performance Tracker - V3.0 Performance Assessment System
 *
 * Purpose: Track student performance using outcome-based competence assessment
 * Approach: Assess based on patient state at action and after action, not arbitrary time
 *
 * V3.0 Features:
 * - Outcome-based competence assessment (Exemplary/Competent/Developing/Novice)
 * - Integration with StateTracker for patient state progression
 * - Integration with MilestoneTracker for progress tracking
 * - Integration with SafetyGateMonitor for critical failure detection
 * - NO point-based scoring - assessment based on clinical outcomes
 * - Generate comprehensive V3.0 AAR report
 */

import MilestoneTracker from './milestoneTracker.js';
import SafetyGateMonitor from './safetyGateMonitor.js';
import StateTracker from './stateTracker.js';

class SimplifiedPerformanceTracker {
  constructor(scenario) {
    this.scenario = scenario;
    this.checklist = scenario.critical_actions_checklist || [];
    this.actionsCompleted = [];
    this.timeline = [];
    this.startTime = Date.now();

    // V3.0: Initialize tracking modules
    this.stateTracker = new StateTracker(scenario);
    this.milestoneTracker = new MilestoneTracker(scenario);
    this.safetyGateMonitor = new SafetyGateMonitor(scenario);
  }

  /**
   * Record a student action (V3.0 Enhanced)
   * @param {object} action - { type, name, details, timestamp, actionId }
   */
  recordAction(action) {
    const timestamp = action.timestamp || Date.now();
    const minutesMark = this.getElapsedMinutes(timestamp);

    // Add to timeline
    this.timeline.push({
      type: action.type,
      name: action.name,
      details: action.details || {},
      timestamp: timestamp,
      minutesMark: minutesMark,
      actionId: action.actionId
    });

    // V3.0: Record action in safety gate monitor
    if (action.actionId) {
      this.safetyGateMonitor.recordAction(action.actionId, action.name);
    }

    // V3.0: Check if action triggers milestone
    if (action.actionId) {
      const milestone = this.milestoneTracker.checkAction(action.actionId);
      if (milestone) {
        console.log(`[PerformanceTracker] Milestone triggered: ${milestone.id} - ${milestone.name}`);
      }
    }

    // Check if this action matches a checklist item
    const checklistMatch = this.findChecklistMatch(action.name, action.actionId);

    if (checklistMatch) {
      // V3.0: Get patient state data for outcome-based assessment
      const assessmentData = this.stateTracker.getAssessmentDataForAction(
        checklistMatch.id,
        timestamp
      );

      // V3.0: Assess competence level based on outcome
      const competenceLevel = this.assessCompetenceLevel(
        checklistMatch,
        assessmentData
      );

      this.actionsCompleted.push({
        checklistId: checklistMatch.id,
        action: checklistMatch.action,
        completedAt: timestamp,
        minutesMark: minutesMark,
        // V3.0: Outcome-based assessment data
        patient_state_at_action: assessmentData.patient_state_at_action,
        patient_state_after: assessmentData.patient_state_after,
        vitals_at_action: assessmentData.vitals_at_action,
        vitals_after: assessmentData.vitals_after,
        competence_level: competenceLevel.level,
        competence_feedback: competenceLevel.feedback,
        outcome_description: competenceLevel.outcome_description
      });
    }
  }

  /**
   * Record medication administration (V3.0)
   * @param {object} medication - { name, dose, route, details, timestamp }
   */
  recordMedication(medication) {
    const timestamp = medication.timestamp || Date.now();

    // V3.0: Record in safety gate monitor for contraindication/commission checking
    this.safetyGateMonitor.recordMedication(medication.name, {
      dose: medication.dose,
      route: medication.route,
      timestamp: timestamp,
      ...medication.details
    });

    // V3.0: Record as treatment in state tracker if critical
    const isCritical = medication.isCritical || false;
    this.stateTracker.recordTreatment(medication, isCritical);

    // Apply treatment effect if defined in scenario
    if (medication.effect) {
      this.stateTracker.applyTreatmentEffect(medication.effect);
    }
  }

  /**
   * Update patient state based on time progression (V3.0)
   * Called periodically by ScenarioEngine
   */
  updatePatientState() {
    const elapsedMinutes = this.stateTracker.getElapsedMinutes();
    this.stateTracker.updateStateBasedOnTime(elapsedMinutes);
  }

  /**
   * Find matching checklist item (V3.0 Enhanced)
   */
  findChecklistMatch(actionName, actionId = null) {
    // V3.0: First try to match by actionId if provided
    if (actionId) {
      const exactMatch = this.checklist.find(item => item.id === actionId);
      if (exactMatch) return exactMatch;
    }

    // Fallback: Match by action name keywords
    return this.checklist.find(item => {
      const itemKeywords = item.action.toLowerCase().split(' ');
      const actionLower = actionName.toLowerCase();

      // Match if action contains key words from checklist item
      return itemKeywords.some(keyword => actionLower.includes(keyword));
    });
  }

  /**
   * V3.0: Assess competence level based on outcome
   * Uses blueprint's competence_assessment criteria
   *
   * @param {object} checklistItem - Checklist item with competence_assessment section
   * @param {object} assessmentData - Patient state data from StateTracker
   * @returns {object} - { level, feedback, outcome_description }
   */
  assessCompetenceLevel(checklistItem, assessmentData) {
    const competenceConfig = checklistItem.competence_assessment;

    if (!competenceConfig || competenceConfig.method !== 'outcome_based') {
      // No V3.0 assessment configured - return neutral
      return {
        level: 'completed',
        feedback: 'Action completed',
        outcome_description: 'Action performed'
      };
    }

    const { patient_state_at_action, patient_state_after } = assessmentData;

    // Check each competence level in priority order: Exemplary → Competent → Developing → Novice
    const levels = ['exemplary', 'competent', 'developing', 'novice'];

    for (const level of levels) {
      const criteria = competenceConfig[level];
      if (!criteria) continue;

      const stateAtMatch = this._matchesStateList(
        patient_state_at_action,
        criteria.patient_state_at_action
      );

      const stateAfterMatch = this._matchesStateList(
        patient_state_after,
        criteria.patient_state_after
      );

      if (stateAtMatch && stateAfterMatch) {
        return {
          level: level,
          feedback: this._interpolateFeedbackTemplate(
            criteria.feedback_template,
            assessmentData
          ),
          outcome_description: criteria.outcome_description
        };
      }
    }

    // Default to developing if no criteria matched
    return {
      level: 'developing',
      feedback: 'Action performed - outcome being assessed',
      outcome_description: 'Action completed with outcome pending'
    };
  }

  /**
   * Check if patient state matches any state in the criteria list
   * @private
   */
  _matchesStateList(actualState, criteriaStates) {
    if (!criteriaStates || !Array.isArray(criteriaStates)) return false;
    return criteriaStates.includes(actualState);
  }

  /**
   * Interpolate feedback template with actual assessment data
   * @private
   */
  _interpolateFeedbackTemplate(template, assessmentData) {
    if (!template) return '';

    // Replace variables in template with actual values
    let feedback = template;

    // Replace patient state variables
    feedback = feedback.replace(/\{patient_state_at_action\}/g, assessmentData.patient_state_at_action);
    feedback = feedback.replace(/\{patient_state_after\}/g, assessmentData.patient_state_after);

    // Replace vitals variables if present
    if (assessmentData.vitals_at_action) {
      Object.entries(assessmentData.vitals_at_action).forEach(([key, value]) => {
        const regex = new RegExp(`\\{vitals_at_action\\.${key}\\}`, 'g');
        feedback = feedback.replace(regex, value);
      });
    }

    return feedback;
  }

  /**
   * V3.0: Calculate outcome-based assessment summary
   * Replaces point-based scoring with competence-based evaluation
   */
  calculateFinalScore() {
    // V3.0: Check for end-of-scenario omissions
    const finalState = {
      scenario_id: this.scenario.scenario_id,
      diagnosis: this.scenario.diagnosis,
      initial_vitals: this.scenario.initial_vitals
    };
    this.safetyGateMonitor.checkEndOfScenarioOmissions(finalState);

    // V3.0: Collect competence levels
    const competenceLevels = {
      exemplary: 0,
      competent: 0,
      developing: 0,
      novice: 0
    };

    this.actionsCompleted.forEach(action => {
      const level = action.competence_level;
      if (competenceLevels.hasOwnProperty(level)) {
        competenceLevels[level]++;
      }
    });

    // V3.0: Calculate overall competence assessment
    const overallCompetence = this._calculateOverallCompetence(
      competenceLevels,
      this.safetyGateMonitor.getSummary()
    );

    return {
      // V3.0: Outcome-based assessment (NO points)
      overall_competence: overallCompetence,
      competence_distribution: competenceLevels,

      // Action completion data
      completed_actions: this.actionsCompleted,
      missed_actions: this.getMissedActions(),
      timeline: this.timeline,

      // V3.0: Safety Gate results
      safety_gate: this.safetyGateMonitor.getSummary(),
      critical_failures: this.safetyGateMonitor.getFailuresForAAR(),

      // V3.0: Progress Milestones
      milestones: this.milestoneTracker.getSummary(),

      // V3.0: Patient State Progression
      patient_state_progression: this.stateTracker.getSummary()
    };
  }

  /**
   * V3.0: Calculate overall competence level
   * @private
   */
  _calculateOverallCompetence(competenceLevels, safetyGate) {
    // Safety Gate failures override everything - CRITICAL priority
    if (!safetyGate.passed) {
      return {
        level: 'novice',
        description: 'Critical safety failures identified - immediate remediation required',
        rationale: 'Safety Gate failures indicate patient-harming errors'
      };
    }

    const total = Object.values(competenceLevels).reduce((sum, count) => sum + count, 0);
    if (total === 0) {
      return {
        level: 'developing',
        description: 'Limited critical actions performed',
        rationale: 'Insufficient data for full competence assessment'
      };
    }

    // Calculate weighted competence
    const exemplaryRate = competenceLevels.exemplary / total;
    const competentRate = competenceLevels.competent / total;
    const developingRate = competenceLevels.developing / total;

    if (exemplaryRate >= 0.6 && competenceLevels.novice === 0) {
      return {
        level: 'exemplary',
        description: 'Outstanding performance - early recognition and intervention prevented deterioration',
        rationale: `${competenceLevels.exemplary} of ${total} critical actions achieved exemplary outcomes`
      };
    }

    if ((exemplaryRate + competentRate) >= 0.7 && competenceLevels.novice === 0) {
      return {
        level: 'competent',
        description: 'Solid performance - patient stabilized with appropriate interventions',
        rationale: `${competenceLevels.exemplary + competenceLevels.competent} of ${total} actions achieved good outcomes`
      };
    }

    if (competenceLevels.novice > 0) {
      return {
        level: 'novice',
        description: 'Significant delays or errors - patient experienced preventable deterioration',
        rationale: `${competenceLevels.novice} critical actions with poor outcomes`
      };
    }

    return {
      level: 'developing',
      description: 'Some appropriate interventions - continued practice needed for consistent performance',
      rationale: 'Mixed outcomes across critical actions'
    };
  }

  /**
   * Get missed actions (V3.0 - no points)
   */
  getMissedActions() {
    return this.checklist.filter(item =>
      !this.actionsCompleted.find(a => a.checklistId === item.id)
    ).map(item => ({
      id: item.id,
      action: item.action,
      importance: item.importance || 'standard',
      clinical_anchor: item.clinical_anchor || null
    }));
  }

  /**
   * Get elapsed minutes from start
   */
  getElapsedMinutes(timestamp = Date.now()) {
    return Math.floor((timestamp - this.startTime) / 60000);
  }

  /**
   * V3.0: Generate comprehensive outcome-based AAR report
   */
  generateAARReport() {
    const assessment = this.calculateFinalScore();

    return {
      // V3.0: Outcome-based summary (NO score/points)
      summary: {
        overall_competence: assessment.overall_competence,
        total_actions: this.timeline.length,
        critical_actions_completed: this.actionsCompleted.length,
        critical_actions_missed: assessment.missed_actions.length,
        scenario_duration_minutes: this.stateTracker.getElapsedMinutes()
      },

      // V3.0: Competence distribution
      competence_assessment: {
        overall: assessment.overall_competence,
        distribution: assessment.competence_distribution,
        actions_detail: this.actionsCompleted.map(a => ({
          action: a.action,
          competence_level: a.competence_level,
          outcome_description: a.outcome_description,
          patient_state_at_action: a.patient_state_at_action,
          patient_state_after: a.patient_state_after,
          timestamp_minutes: a.minutesMark
        }))
      },

      // V3.0: Safety Gate (HIGHEST PRIORITY)
      safety_gate: assessment.safety_gate,
      critical_failures: assessment.critical_failures,

      // V3.0: Progress Milestones
      progress_milestones: assessment.milestones,

      // V3.0: Patient State Progression
      patient_progression: assessment.patient_state_progression,

      // Timeline
      timeline: this.timeline,

      // Missed actions
      missed_actions: assessment.missed_actions,

      // V3.0: Narrative sections
      strengths: this.identifyStrengths(assessment),

      areas_for_improvement: this.identifyImprovements(assessment),

      // Clinical teaching points
      teaching_points: this._extractTeachingPoints(assessment)
    };
  }

  /**
   * V3.0: Identify student strengths (outcome-based)
   */
  identifyStrengths(assessment) {
    const strengths = [];

    // Check for exemplary outcomes
    const exemplaryActions = this.actionsCompleted.filter(a => a.competence_level === 'exemplary');
    if (exemplaryActions.length > 0) {
      strengths.push({
        area: 'Early Recognition & Intervention',
        description: `${exemplaryActions.length} critical actions achieved exemplary outcomes - early identification prevented patient deterioration`,
        actions: exemplaryActions.map(a => a.action)
      });
    }

    // Check for systematic approach (milestones)
    const milestones = assessment.milestones;
    if (milestones.enabled && milestones.completed >= 5) {
      strengths.push({
        area: 'Systematic Approach',
        description: milestones.systematicApproach
          ? 'Demonstrated systematic assessment and management approach throughout scenario'
          : `Completed ${milestones.completed} of ${milestones.totalMilestones} progress milestones`
      });
    }

    // Check patient outcome
    const patientState = assessment.patient_state_progression;
    if (['improving', 'stable'].includes(patientState.final_state)) {
      strengths.push({
        area: 'Patient Outcome',
        description: `Patient ${patientState.final_state} - interventions were effective`,
        final_state: patientState.final_state
      });
    }

    return strengths;
  }

  /**
   * V3.0: Identify areas needing improvement (outcome-based)
   */
  identifyImprovements(assessment) {
    const improvements = [];

    // Check for novice-level outcomes
    const noviceActions = this.actionsCompleted.filter(a => a.competence_level === 'novice');
    if (noviceActions.length > 0) {
      improvements.push({
        priority: 'high',
        area: 'Delayed Critical Interventions',
        description: `${noviceActions.length} critical actions performed too late - patient experienced preventable deterioration`,
        actions: noviceActions.map(a => ({
          action: a.action,
          outcome: a.outcome_description
        }))
      });
    }

    // Check for developing-level outcomes
    const developingActions = this.actionsCompleted.filter(a => a.competence_level === 'developing');
    if (developingActions.length > 2) {
      improvements.push({
        priority: 'moderate',
        area: 'Recognition Speed',
        description: `Several interventions performed after initial patient deterioration - work on earlier pattern recognition`,
        actions: developingActions.map(a => a.action)
      });
    }

    // Check missed critical actions
    if (assessment.missed_actions.length > 0) {
      const criticalMissed = assessment.missed_actions.filter(a => a.importance === 'critical');
      if (criticalMissed.length > 0) {
        improvements.push({
          priority: 'high',
          area: 'Complete Assessment',
          description: `${criticalMissed.length} critical actions not performed`,
          actions: criticalMissed.map(a => a.action)
        });
      }
    }

    return improvements;
  }

  /**
   * V3.0: Extract teaching points from clinical anchors and safety failures
   * @private
   */
  _extractTeachingPoints(assessment) {
    const teachingPoints = [];

    // Safety Gate failures are HIGHEST PRIORITY teaching points
    if (assessment.critical_failures && assessment.critical_failures.length > 0) {
      assessment.critical_failures.forEach(failure => {
        teachingPoints.push({
          priority: 'critical',
          type: failure.type,
          description: failure.description,
          patient_outcome: failure.patient_outcome,
          teaching_point: failure.aar_teaching_point
        });
      });
    }

    // Extract clinical anchors from checklist items
    this.checklist.forEach(item => {
      if (item.clinical_anchor) {
        const completed = this.actionsCompleted.find(a => a.checklistId === item.id);
        teachingPoints.push({
          priority: completed ? 'reinforcement' : 'learning',
          action: item.action,
          clinical_anchor: item.clinical_anchor,
          was_performed: !!completed
        });
      }
    });

    return teachingPoints;
  }
}

export default SimplifiedPerformanceTracker;