/**
 * Pattern Analysis Service - Analyzes performance across 3 scenarios
 * Identifies recurring patterns in student clinical performance
 */

export class PatternAnalysisService {

  constructor() {
    this.patterns = {};
  }

  /**
   * Main entry point - analyzes all patterns
   * @param {Array} allScenariosData - Array of 3 scenario performance objects
   * @returns {Object} - Comprehensive pattern analysis results
   */
  analyzePerformancePatterns(allScenariosData) {
    // allScenariosData = array of 3 scenario performance objects
    // Each contains: criticalActionsLog, cdpEvaluations, stateHistory, etc.

    if (!allScenariosData || allScenariosData.length !== 3) {
      console.error('Pattern analysis requires exactly 3 completed scenarios');
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
        informationOrganization: this.analyzeInformationOrganization(allScenariosData),
        challengePointQuality: this.analyzeChallengePointQuality(allScenariosData)
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
        ? `Looking across all three scenarios, I notice a pattern: you consistently identified critical findings quickly, but there was an average ${Math.round(avgGap/60)}-minute delay before starting treatment. In the ${gaps[0].scenarioId}, you recognized the problem at ${Math.round(gaps[0].assessmentTime/60)} minutes but didn't treat until ${Math.round(gaps[0].treatmentTime/60)} minutes. Let's discuss what was happening in those gaps—was it uncertainty, gathering more information, or protocol checking?`
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
      aarTalkingPoint: `Looking across all three scenarios, I see a consistent strength: your ${primaryStrength.category} was systematically excellent. You earned Optimal ratings in ${primaryStrength.optimalCount} out of ${primaryStrength.totalCount} ${primaryStrength.category} decisions—that's ${primaryStrength.rate}% optimal. That foundation is rock-solid and exactly what we want to see.`
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

  analyzeSystematicAssessment(data) {
    return { patternName: "Systematic vs. Chaotic Assessment", detected: false };
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

  analyzeMedicationErrorType(data) {
    return { patternName: "Medication Error Type", detected: false };
  }

  analyzeErrorRecovery(data) {
    return { patternName: "Error Recovery Ability", detected: false };
  }

  analyzeInformationOrganization(data) {
    return { patternName: "Information Organization", detected: false };
  }

  analyzeChallengePointQuality(data) {
    return { patternName: "Challenge Point Reasoning Quality", detected: false };
  }

  analyzeStateTransitionRecognition(data) {
    return { patternName: "State Transition Recognition", detected: false };
  }

  analyzeDeteriorationPrevention(data) {
    return { patternName: "Deterioration Prevention", detected: false };
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
