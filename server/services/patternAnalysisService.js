/**
 * Pattern Analysis Service - Analyzes performance across 2 scenarios
 * Identifies recurring patterns in student clinical performance
 */

export class PatternAnalysisService {

  constructor() {
    this.patterns = {};
  }

  /**
   * Main entry point - analyzes all patterns
   * @param {Array} allScenariosData - Array of 2 scenario performance objects
   * @returns {Object} - Comprehensive pattern analysis results
   */
  analyzePerformancePatterns(allScenariosData) {
    // allScenariosData = array of 2 scenario performance objects
    // Each contains: criticalActionsLog, cdpEvaluations, stateHistory, etc.

    if (!allScenariosData || allScenariosData.length !== 2) {
      console.error('Pattern analysis requires exactly 2 completed scenarios');
      return this.getEmptyPatternSet();
    }

    return {
      temporal: {
        assessmentToTreatmentGap: this.analyzeAssessmentToTreatmentGap(allScenariosData)
      },
      decisionQuality: {
        consistentStrengths: this.analyzeConsistentStrengths(allScenariosData),
        consistentWeaknesses: this.analyzeConsistentWeaknesses(allScenariosData),
        highStakesPerformance: this.analyzeHighStakesPerformance(allScenariosData)
      },
      clinicalReasoning: {
        systematicAssessment: this.analyzeSystematicAssessment(allScenariosData),
        reactiveVsProactive: this.analyzeReactiveVsProactive(allScenariosData),
        reassessmentFrequency: this.analyzeReassessmentFrequency(allScenariosData),
        differentialConsideration: this.analyzeDifferentialConsideration(allScenariosData)
      },
      errorPatterns: {
        medicationErrorType: this.analyzeMedicationErrorType(allScenariosData),
        errorRecovery: this.analyzeErrorRecovery(allScenariosData)
      },
      cognitiveLoad: {
        informationOrganization: this.analyzeInformationOrganization(allScenariosData)
      },
      patientAwareness: {
        stateTransitionRecognition: this.analyzeStateTransitionRecognition(allScenariosData),
        deteriorationPrevention: this.analyzeDeteriorationPrevention(allScenariosData)
      },
      communication: {
        documentationSpecificity: this.analyzeDocumentationSpecificity(allScenariosData),
        patientCenteredLanguage: this.analyzePatientCenteredLanguage(allScenariosData)
      },
      metaPatterns: {
        consistencyIndex: this.analyzeConsistencyIndex(allScenariosData),
        riskToleranceProfile: this.analyzeRiskToleranceProfile(allScenariosData)
      },
      summary: this.generatePatternSummary(allScenariosData)
    };
  }

  /**
   * Returns empty pattern structure if data insufficient
   * @returns {Object} - Empty pattern set
   */
  getEmptyPatternSet() {
    return {
      temporal: {},
      decisionQuality: {},
      clinicalReasoning: {},
      errorPatterns: {},
      cognitiveLoad: {},
      patientAwareness: {},
      communication: {},
      metaPatterns: {},
      summary: {
        patternsDetected: 0,
        readyForAnalysis: false,
        message: 'Insufficient data for pattern analysis'
      }
    };
  }

  /**
   * Format pattern for AAR context
   * @param {Object} pattern - Pattern object
   * @returns {string} - Formatted pattern string
   */
  formatPatternForAAR(pattern) {
    if (!pattern || !pattern.detected) {
      return '';
    }

    return `
## ${pattern.patternName}
**Status:** ${pattern.detected ? 'DETECTED' : 'NOT DETECTED'}
${pattern.severity ? `**Severity:** ${pattern.severity}` : ''}
${pattern.isStrength ? `**Type:** STRENGTH` : ''}
${pattern.priority ? `**Priority:** ${pattern.priority}` : ''}

**Data:**
${JSON.stringify(pattern.data, null, 2)}

**Educational Focus:**
${pattern.educationalFocus || 'N/A'}

**AAR Talking Point:**
"${pattern.aarTalkingPoint || 'N/A'}"
`;
  }

  // =============================================================================
  // HELPER METHODS
  // =============================================================================

  /**
   * Categorize CDP by clinical domain
   * @param {string} cdpId - CDP identifier
   * @param {string} cdpDecision - CDP decision description
   * @returns {string} - Category name
   */
  categorizeCDP(cdpId, cdpDecision) {
    // Map CDP IDs to clinical categories
    const categoryMap = {
      'assessment': ['CDP1', 'assessment', 'initial_assessment', 'scene_assessment'],
      'airway': ['airway', 'intubation', 'airway_management'],
      'breathing': ['oxygen', 'bronchodilator', 'respiratory', 'breathing'],
      'circulation': ['IV', 'fluids', 'cardiac', 'circulation'],
      'medication': ['medication', 'drug', 'pharmacology'],
      'timing': ['timing', 'urgency', 'critical_window'],
      'prioritization': ['priority', 'triage', 'sequence']
    };

    const decisionLower = (cdpDecision || '').toLowerCase();
    const idLower = (cdpId || '').toLowerCase();

    for (const [category, keywords] of Object.entries(categoryMap)) {
      for (const keyword of keywords) {
        if (decisionLower.includes(keyword) || idLower.includes(keyword)) {
          return category;
        }
      }
    }

    return 'other';
  }

  /**
   * Categorize action type (A/B/C/D/other)
   * @param {string} action - Action description
   * @returns {string} - Action category
   */
  categorizeActionType(action) {
    const actionLower = action.toLowerCase();

    if (actionLower.includes('airway') || actionLower.includes('mouth') ||
        actionLower.includes('obstruction') || actionLower.includes('jaw')) {
      return 'A';
    }
    if (actionLower.includes('breath') || actionLower.includes('lung') ||
        actionLower.includes('respiratory') || actionLower.includes('spo2') ||
        actionLower.includes('oxygen') || actionLower.includes('chest')) {
      return 'B';
    }
    if (actionLower.includes('pulse') || actionLower.includes('bp') ||
        actionLower.includes('circulation') || actionLower.includes('heart') ||
        actionLower.includes('perfusion') || actionLower.includes('shock')) {
      return 'C';
    }
    if (actionLower.includes('disability') || actionLower.includes('gcs') ||
        actionLower.includes('conscious') || actionLower.includes('neuro')) {
      return 'D';
    }

    return 'other';
  }

  /**
   * Check if action sequence follows ABC pattern
   * @param {Array} actionSequence - Array of action types
   * @returns {boolean} - True if follows ABC pattern
   */
  followsABCPattern(actionSequence) {
    // Find indices of A, B, C in sequence
    const aIndex = actionSequence.findIndex(a => a === 'A');
    const bIndex = actionSequence.findIndex(a => a === 'B');
    const cIndex = actionSequence.findIndex(a => a === 'C');

    // Check if ABC appears in order (allowing for 'other' actions in between)
    if (aIndex === -1 || bIndex === -1 || cIndex === -1) {
      return false; // Missing essential components
    }

    return aIndex < bIndex && bIndex < cIndex;
  }

  /**
   * Categorize medication error type
   * @param {Object} error - Error object
   * @returns {string} - Error type
   */
  categorizeMedicationError(error) {
    const actionLower = error.action.toLowerCase();

    // Contraindication errors
    if (actionLower.includes('beta') || actionLower.includes('blocker') ||
        actionLower.includes('apaurin') || actionLower.includes('benzodiazepine')) {
      return 'contraindication';
    }

    // Dosing errors
    if (actionLower.includes('dose') || actionLower.includes('mg') ||
        actionLower.includes('overdose')) {
      return 'dosing';
    }

    // Timing errors
    if (actionLower.includes('delay') || actionLower.includes('late')) {
      return 'timing';
    }

    // Route errors
    if (actionLower.includes('route') || actionLower.includes('IV') ||
        actionLower.includes('IM')) {
      return 'route';
    }

    return 'other';
  }

  // =============================================================================
  // PATTERN ANALYSIS METHODS
  // =============================================================================

  analyzeAssessmentToTreatmentGap(allScenariosData) {
    const gaps = [];

    for (const scenario of allScenariosData) {
      // Find first assessment action that identifies the critical condition
      const firstAssessment = scenario.criticalActionsLog
        ?.find(a => a.category === 'assessment' && a.timeSinceStart < 300); // within first 5 min

      // Find first treatment action
      const firstTreatment = scenario.criticalActionsLog
        ?.find(a => a.category === 'treatment');

      if (firstAssessment && firstTreatment) {
        const gap = firstTreatment.timeSinceStart - firstAssessment.timeSinceStart;

        gaps.push({
          scenarioId: scenario.scenarioId,
          assessmentTime: firstAssessment.timeSinceStart,
          treatmentTime: firstTreatment.timeSinceStart,
          gap: gap,
          assessmentAction: firstAssessment.action,
          treatmentAction: firstTreatment.action
        });
      }
    }

    if (gaps.length === 0) {
      return {
        patternName: "Assessment-to-Treatment Gap",
        detected: false,
        data: { message: "Insufficient data to calculate assessment-to-treatment gap" }
      };
    }

    const avgGap = gaps.reduce((sum, g) => sum + g.gap, 0) / gaps.length;
    const isSignificant = avgGap > 180; // >3 minutes is significant

    return {
      patternName: "Assessment-to-Treatment Gap",
      detected: isSignificant,
      priority: "P1",
      severity: avgGap > 300 ? "HIGH" : avgGap > 180 ? "MODERATE" : "LOW",
      data: {
        averageGapSeconds: Math.round(avgGap),
        averageGapMinutes: Math.round(avgGap / 60 * 10) / 10,
        scenarios: gaps.map(g => ({
          scenario: g.scenarioId,
          gapMinutes: Math.round(g.gap / 60 * 10) / 10,
          assessment: g.assessmentAction,
          treatment: g.treatmentAction
        }))
      },
      educationalFocus: isSignificant
        ? "Student recognizes problems but hesitates to act - confidence gap vs. knowledge gap"
        : "Student acts promptly after recognition - good clinical decisiveness",
      aarTalkingPoint: isSignificant
        ? `Looking across both scenarios, I notice a pattern: you consistently identified critical findings quickly, but there was an average ${Math.round(avgGap/60)}-minute delay before starting treatment. In the ${gaps[0].scenarioId}, you recognized the problem at ${Math.round(gaps[0].assessmentTime/60)} minutes but didn't treat until ${Math.round(gaps[0].treatmentTime/60)} minutes. Let's discuss what was happening in those gaps—was it uncertainty, gathering more information, or protocol checking?`
        : `Excellent decisiveness—you consistently acted quickly after identifying problems, with an average gap of only ${Math.round(avgGap/60)} minutes between recognition and treatment. That's exactly what we want to see.`
    };
  }

  analyzeConsistentStrengths(allScenariosData) {
    // Group CDPs by category
    const cdpByCategory = {};

    for (const scenario of allScenariosData) {
      if (!scenario.cdpEvaluations) continue;

      for (const cdp of scenario.cdpEvaluations) {
        const category = this.categorizeCDP(cdp.id, cdp.decision);

        if (!cdpByCategory[category]) {
          cdpByCategory[category] = [];
        }

        cdpByCategory[category].push({
          scenario: scenario.scenarioId,
          score: cdp.score,
          decision: cdp.decision
        });
      }
    }

    // Find categories with consistent optimal performance
    const strengths = [];

    for (const [category, cdps] of Object.entries(cdpByCategory)) {
      const optimalCount = cdps.filter(c => c.score === 'optimal').length;
      const totalCount = cdps.length;
      const optimalRate = optimalCount / totalCount;

      if (optimalCount >= 2 && optimalRate >= 0.67) { // At least 2/3 optimal
        strengths.push({
          category: category,
          optimalCount: optimalCount,
          totalCount: totalCount,
          rate: Math.round(optimalRate * 100),
          examples: cdps.filter(c => c.score === 'optimal').map(c => c.decision)
        });
      }
    }

    if (strengths.length === 0) {
      return {
        patternName: "Consistent Strength Domain",
        detected: false,
        data: { message: "No consistent strength domains identified across scenarios" }
      };
    }

    // Sort by rate, take top strength
    strengths.sort((a, b) => b.rate - a.rate);
    const primaryStrength = strengths[0];

    return {
      patternName: "Consistent Strength Domain",
      detected: true,
      isStrength: true,
      priority: "P1",
      data: {
        primaryStrength: primaryStrength.category,
        performance: `${primaryStrength.optimalCount}/${primaryStrength.totalCount} optimal`,
        rate: `${primaryStrength.rate}%`,
        allStrengths: strengths
      },
      educationalFocus: `Consistent excellence in ${primaryStrength.category} - reliable foundation to build on`,
      aarTalkingPoint: `Looking across both scenarios, I see a consistent strength: your ${primaryStrength.category} was systematically excellent. You earned Optimal ratings in ${primaryStrength.optimalCount} out of ${primaryStrength.totalCount} ${primaryStrength.category} decisions—that's ${primaryStrength.rate}% optimal. That foundation is rock-solid and exactly what we want to see.`
    };
  }

  analyzeConsistentWeaknesses(allScenariosData) {
    // Group CDPs by category
    const cdpByCategory = {};

    for (const scenario of allScenariosData) {
      if (!scenario.cdpEvaluations) continue;

      for (const cdp of scenario.cdpEvaluations) {
        const category = this.categorizeCDP(cdp.id, cdp.decision);

        if (!cdpByCategory[category]) {
          cdpByCategory[category] = [];
        }

        cdpByCategory[category].push({
          scenario: scenario.scenarioId,
          score: cdp.score,
          decision: cdp.decision,
          reasoning: cdp.reasoning
        });
      }
    }

    // Find categories with consistent suboptimal/dangerous performance
    const weaknesses = [];

    for (const [category, cdps] of Object.entries(cdpByCategory)) {
      const poorCount = cdps.filter(c => c.score === 'suboptimal' || c.score === 'dangerous').length;
      const dangerousCount = cdps.filter(c => c.score === 'dangerous').length;
      const totalCount = cdps.length;
      const poorRate = poorCount / totalCount;

      if (poorCount >= 2 && poorRate >= 0.5) { // At least 2 poor scores and 50%+ poor
        weaknesses.push({
          category: category,
          poorCount: poorCount,
          dangerousCount: dangerousCount,
          totalCount: totalCount,
          rate: Math.round(poorRate * 100),
          examples: cdps.filter(c => c.score !== 'optimal').map(c => ({
            decision: c.decision,
            score: c.score,
            scenario: c.scenario
          }))
        });
      }
    }

    if (weaknesses.length === 0) {
      return {
        patternName: "Consistent Weakness Domain",
        detected: false,
        data: { message: "No consistent weakness domains identified" }
      };
    }

    // Sort by severity (dangerous count first, then poor rate)
    weaknesses.sort((a, b) => {
      if (b.dangerousCount !== a.dangerousCount) {
        return b.dangerousCount - a.dangerousCount;
      }
      return b.rate - a.rate;
    });

    const primaryWeakness = weaknesses[0];

    return {
      patternName: "Consistent Weakness Domain",
      detected: true,
      severity: primaryWeakness.dangerousCount > 0 ? "HIGH" : "MODERATE",
      priority: "P1",
      data: {
        primaryWeakness: primaryWeakness.category,
        performance: `${primaryWeakness.poorCount}/${primaryWeakness.totalCount} suboptimal/dangerous`,
        rate: `${primaryWeakness.rate}%`,
        dangerousCount: primaryWeakness.dangerousCount,
        examples: primaryWeakness.examples,
        allWeaknesses: weaknesses
      },
      educationalFocus: `Consistent difficulty with ${primaryWeakness.category} - specific knowledge gap requiring targeted remediation`,
      aarTalkingPoint: primaryWeakness.dangerousCount > 0
        ? `I need to highlight a pattern of concern: ${primaryWeakness.category} decisions were rated Suboptimal or Dangerous in ${primaryWeakness.poorCount} out of ${primaryWeakness.totalCount} cases across the scenarios. This suggests a specific knowledge gap that needs immediate attention. Let's discuss what's challenging about ${primaryWeakness.category} decisions for you.`
        : `I see a pattern in ${primaryWeakness.category}—this area earned Suboptimal ratings in ${primaryWeakness.poorCount} out of ${primaryWeakness.totalCount} decisions. This suggests a specific area where we can focus your learning. Let's talk about what makes ${primaryWeakness.category} challenging for you.`
    };
  }

  analyzeHighStakesPerformance(data) {
    return { patternName: "High-Stakes Decision Making", detected: false };
  }

  analyzeSystematicAssessment(allScenariosData) {
    const assessmentSequences = [];

    for (const scenario of allScenariosData) {
      if (!scenario.criticalActionsLog) continue;

      // Get first 5-8 actions to analyze initial approach
      const initialActions = scenario.criticalActionsLog
        .filter(a => a.timeSinceStart < 300) // First 5 minutes
        .slice(0, 8);

      // Categorize each action
      const actionSequence = initialActions.map(a => this.categorizeActionType(a.action));

      // Check if follows ABC pattern
      const isSystematic = this.followsABCPattern(actionSequence);

      assessmentSequences.push({
        scenario: scenario.scenarioId,
        sequence: actionSequence,
        systematic: isSystematic,
        firstActions: initialActions.map(a => a.action)
      });
    }

    const systematicCount = assessmentSequences.filter(s => s.systematic).length;

    return {
      patternName: "Systematic vs. Chaotic Assessment",
      detected: true,
      isStrength: systematicCount >= 2,
      priority: systematicCount >= 2 ? "P1" : "P1",
      data: {
        systematicScenarios: systematicCount,
        chaoticScenarios: 2 - systematicCount,
        consistency: `${systematicCount}/2`,
        sequences: assessmentSequences
      },
      educationalFocus: systematicCount >= 2
        ? "Strong systematic assessment approach - reliable ABC foundation"
        : "Assessment approach inconsistent - needs structured framework practice",
      aarTalkingPoint: systematicCount >= 2
        ? `Your systematic assessment approach was excellent—you followed an ABC structure in both scenarios. That disciplined approach is exactly what makes a reliable paramedic. Even under pressure, you maintained that systematic framework.`
        : `I notice your assessment approach varied significantly. In ${assessmentSequences.find(s => s.systematic)?.scenario || 'one scenario'}, you followed ABC systematically, but in the other scenario, the sequence was more chaotic. A consistent systematic approach—checking Airway, then Breathing, then Circulation every time—would serve you better and help you avoid missing critical findings.`
    };
  }

  analyzeReactiveVsProactive(data) {
    return { patternName: "Reactive vs. Proactive Management", detected: false };
  }

  analyzeReassessmentFrequency(data) {
    return { patternName: "Reassessment Frequency", detected: false };
  }

  analyzeDifferentialConsideration(data) {
    return { patternName: "Differential Diagnosis Consideration", detected: false };
  }

  analyzeMedicationErrorType(allScenariosData) {
    const allErrors = [];

    for (const scenario of allScenariosData) {
      if (!scenario.errors || scenario.errors.length === 0) continue;

      for (const error of scenario.errors) {
        // Categorize error type based on action
        const errorType = this.categorizeMedicationError(error);
        allErrors.push({
          scenario: scenario.scenarioId,
          type: errorType,
          action: error.action,
          timing: error.timeSinceStart
        });
      }
    }

    if (allErrors.length === 0) {
      return {
        patternName: "Medication Error Type",
        detected: false,
        data: {
          message: "No medication errors detected - excellent safety profile",
          totalErrors: 0
        }
      };
    }

    // Group errors by type
    const errorsByType = {};
    for (const error of allErrors) {
      if (!errorsByType[error.type]) {
        errorsByType[error.type] = [];
      }
      errorsByType[error.type].push(error);
    }

    // Find most common error type
    let mostCommonType = null;
    let maxCount = 0;

    for (const [type, errors] of Object.entries(errorsByType)) {
      if (errors.length > maxCount) {
        mostCommonType = type;
        maxCount = errors.length;
      }
    }

    return {
      patternName: "Medication Error Type",
      detected: true,
      severity: maxCount >= 2 ? "HIGH" : "MODERATE",
      priority: "P1",
      data: {
        totalErrors: allErrors.length,
        mostCommonType: mostCommonType,
        errorCount: maxCount,
        errorsByType: errorsByType,
        allErrors: allErrors
      },
      educationalFocus: `Recurring ${mostCommonType} errors - specific pharmacology knowledge gap`,
      aarTalkingPoint: `I need to address a safety concern: you made ${allErrors.length} medication errors across the scenarios, with ${maxCount} being ${mostCommonType} errors. This suggests a specific gap in pharmacology knowledge. Let's discuss why ${mostCommonType} is particularly important to understand—these errors can cause immediate patient harm.`
    };
  }

  analyzeErrorRecovery(data) {
    return { patternName: "Error Recovery Ability", detected: false };
  }

  analyzeInformationOrganization(data) {
    return { patternName: "Information Organization", detected: false };
  }

  analyzeStateTransitionRecognition(data) {
    return { patternName: "State Transition Recognition", detected: false };
  }

  analyzeDeteriorationPrevention(allScenariosData) {
    const outcomes = [];

    for (const scenario of allScenariosData) {
      if (!scenario.stateHistory || scenario.stateHistory.length === 0) continue;

      // Check final state
      const finalState = scenario.stateHistory[scenario.stateHistory.length - 1];
      const reachedCritical = scenario.stateHistory.some(s => s.state === 'critical');
      const reachedDeteriorating = scenario.stateHistory.some(s => s.state === 'deteriorating');

      outcomes.push({
        scenario: scenario.scenarioId,
        finalState: finalState.state,
        reachedCritical: reachedCritical,
        reachedDeteriorating: reachedDeteriorating,
        prevented: finalState.state === 'improving' ||
                   (finalState.state === 'initial' && !reachedCritical)
      });
    }

    const preventedCount = outcomes.filter(o => o.prevented).length;
    const criticalCount = outcomes.filter(o => o.reachedCritical).length;

    return {
      patternName: "Deterioration Prevention",
      detected: true,
      isStrength: preventedCount >= 2,
      severity: criticalCount >= 2 ? "HIGH" : criticalCount === 1 ? "MODERATE" : "LOW",
      priority: criticalCount >= 2 ? "P1" : "P1",
      data: {
        preventedDeteriorationCount: preventedCount,
        reachedCriticalCount: criticalCount,
        outcomes: outcomes
      },
      educationalFocus: preventedCount >= 2
        ? "Excellent proactive care - consistently prevented patient deterioration"
        : "Reactive care pattern - patients frequently reached critical state before stabilization",
      aarTalkingPoint: criticalCount >= 2
        ? `I see a pattern in patient outcomes: in both scenarios, the patient reached critical state. Our goal is to prevent that deterioration through early, aggressive treatment. ${outcomes.filter(o => o.reachedCritical).map(o => `In the ${o.scenario}, the patient reached critical state`).join(', ')}. Let's discuss how earlier intervention could have prevented these outcomes.`
        : `Excellent work preventing deterioration—in ${preventedCount} scenario${preventedCount > 1 ? 's' : ''}, you kept the patient stable or improving without reaching critical state. That proactive approach is exactly what we're looking for.`
    };
  }

  analyzeDocumentationSpecificity(data) {
    return { patternName: "Documentation Specificity", detected: false };
  }

  analyzePatientCenteredLanguage(data) {
    return { patternName: "Patient-Centered Language", detected: false };
  }

  analyzeConsistencyIndex(data) {
    return { patternName: "Consistency Index", detected: false };
  }

  analyzeRiskToleranceProfile(data) {
    return { patternName: "Risk Tolerance Profile", detected: false };
  }

  /**
   * Generate pattern summary
   * @param {Array} data - All scenarios data
   * @returns {Object} - Pattern summary
   */
  generatePatternSummary(data) {
    return {
      patternsDetected: 0,
      readyForAnalysis: true,
      message: 'Pattern analysis complete (placeholder methods active)'
    };
  }
}

// Export singleton instance
export const patternAnalysisService = new PatternAnalysisService();
