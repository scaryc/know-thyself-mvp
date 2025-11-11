/**
 * AAR Service - manages AAR session state and data
 * Handles After Action Review logic for performance analysis
 */

import { patternAnalysisService } from './patternAnalysisService.js';

class AARService {
  constructor() {
    this.aarSessions = new Map();
  }

  /**
   * Initialize AAR session with performance data
   * @param {string} sessionId - Session identifier
   * @param {Array} allScenariosPerformanceData - Array of performance data from all 3 scenarios
   * @returns {Object} - AAR session object
   */
  initializeAAR(sessionId, allScenariosPerformanceData) {
    // Calculate patterns from all 3 scenarios
    const patterns = patternAnalysisService.analyzePerformancePatterns(
      allScenariosPerformanceData
    );

    const aarSession = {
      sessionId: sessionId,
      performanceData: allScenariosPerformanceData, // Now stores ALL scenarios
      patterns: patterns, // NEW: Store calculated patterns
      phase: 'opening', // opening | scenario_review | pattern_analysis | action_plan | closing | complete
      currentScenarioIndex: 0,
      conversationHistory: [],
      startTime: Date.now()
    };

    this.aarSessions.set(sessionId, aarSession);
    console.log(`✅ AAR Session initialized for ${sessionId}`);
    console.log(`📊 Patterns detected: ${this.countDetectedPatterns(patterns)}`);
    return aarSession;
  }

  /**
   * Get AAR session by ID
   * @param {string} sessionId - Session identifier
   * @returns {Object|null} - AAR session object or null
   */
  getAAR(sessionId) {
    return this.aarSessions.get(sessionId);
  }

  /**
   * Update AAR phase
   * @param {string} sessionId - Session identifier
   * @param {string} newPhase - New phase name
   */
  updatePhase(sessionId, newPhase) {
    const aar = this.aarSessions.get(sessionId);
    if (aar) {
      aar.phase = newPhase;
      console.log(`📊 AAR Phase updated to: ${newPhase}`);
    }
  }

  /**
   * Advance to next scenario in review
   * @param {string} sessionId - Session identifier
   */
  advanceScenario(sessionId) {
    const aar = this.aarSessions.get(sessionId);
    if (aar) {
      aar.currentScenarioIndex++;
      console.log(`📊 AAR Scenario advanced to: ${aar.currentScenarioIndex + 1}`);
    }
  }

  /**
   * Build AAR context for AI prompt
   * Provides comprehensive performance data for the AAR agent
   * @param {string} sessionId - Session identifier
   * @returns {string} - Formatted context string
   */
  buildAARContext(sessionId) {
    const aar = this.aarSessions.get(sessionId);
    if (!aar) return '';

    const patterns = aar.patterns;

    // Build comprehensive context including all scenarios and patterns
    let context = `
# STUDENT PERFORMANCE DATA - ALL 3 SCENARIOS

## Overall Session Summary
- Total Scenarios: 3
- Total Session Time: ${this.calculateTotalTime(aar.performanceData)}
- Overall Score: ${this.calculateOverallScore(aar.performanceData)}
- Total Errors: ${this.countTotalErrors(aar.performanceData)}

`;

    // Add individual scenario summaries
    for (let i = 0; i < aar.performanceData.length; i++) {
      const scenario = aar.performanceData[i];
      context += this.buildScenarioSummary(scenario, i + 1);
    }

    // Add pattern analysis section
    context += `
---

# IDENTIFIED PERFORMANCE PATTERNS

**Pattern Analysis Status:** ${patterns.summary.readyForAnalysis ? 'COMPLETE' : 'INCOMPLETE'}
**Patterns Detected:** ${this.countDetectedPatterns(patterns)}

`;

    // Add each pattern category
    if (patterns.temporal.assessmentToTreatmentGap) {
      context += this.formatPattern(patterns.temporal.assessmentToTreatmentGap);
    }

    if (patterns.decisionQuality.consistentStrengths) {
      context += this.formatPattern(patterns.decisionQuality.consistentStrengths);
    }

    if (patterns.decisionQuality.consistentWeaknesses) {
      context += this.formatPattern(patterns.decisionQuality.consistentWeaknesses);
    }

    if (patterns.decisionQuality.highStakesPerformance) {
      context += this.formatPattern(patterns.decisionQuality.highStakesPerformance);
    }

    if (patterns.clinicalReasoning.systematicAssessment) {
      context += this.formatPattern(patterns.clinicalReasoning.systematicAssessment);
    }

    if (patterns.clinicalReasoning.reactiveVsProactive) {
      context += this.formatPattern(patterns.clinicalReasoning.reactiveVsProactive);
    }

    if (patterns.clinicalReasoning.reassessmentFrequency) {
      context += this.formatPattern(patterns.clinicalReasoning.reassessmentFrequency);
    }

    if (patterns.clinicalReasoning.differentialConsideration) {
      context += this.formatPattern(patterns.clinicalReasoning.differentialConsideration);
    }

    if (patterns.errorPatterns.medicationErrorType) {
      context += this.formatPattern(patterns.errorPatterns.medicationErrorType);
    }

    if (patterns.errorPatterns.errorRecovery) {
      context += this.formatPattern(patterns.errorPatterns.errorRecovery);
    }

    if (patterns.cognitiveLoad.informationOrganization) {
      context += this.formatPattern(patterns.cognitiveLoad.informationOrganization);
    }

    if (patterns.cognitiveLoad.challengePointQuality) {
      context += this.formatPattern(patterns.cognitiveLoad.challengePointQuality);
    }

    if (patterns.patientAwareness.stateTransitionRecognition) {
      context += this.formatPattern(patterns.patientAwareness.stateTransitionRecognition);
    }

    if (patterns.patientAwareness.deteriorationPrevention) {
      context += this.formatPattern(patterns.patientAwareness.deteriorationPrevention);
    }

    if (patterns.communication.documentationSpecificity) {
      context += this.formatPattern(patterns.communication.documentationSpecificity);
    }

    if (patterns.communication.patientCenteredLanguage) {
      context += this.formatPattern(patterns.communication.patientCenteredLanguage);
    }

    if (patterns.metaPatterns.consistencyIndex) {
      context += this.formatPattern(patterns.metaPatterns.consistencyIndex);
    }

    if (patterns.metaPatterns.riskToleranceProfile) {
      context += this.formatPattern(patterns.metaPatterns.riskToleranceProfile);
    }

    // Add instructions for AAR agent
    context += `

---

# AAR AGENT INSTRUCTIONS FOR PATTERN USAGE

## Phase 3: Pattern Analysis - PRIMARY USE OF PATTERNS

When you reach Phase 3 (Pattern Analysis) after reviewing all 3 scenarios individually:

1. **Select 2-4 most significant patterns** from the data above
2. **Reference patterns BY NAME** when discussing cross-scenario performance
3. **Use the "AAR Talking Point"** as your starting framework for each pattern
4. **Connect patterns to specific examples** from the scenario data
5. **Ask student if pattern resonates** with their experience

## Pattern Selection Priority:

**MUST discuss if detected:**
- Any pattern marked "HIGH" severity
- Any pattern marked "HIGH" priority
- Consistent Weakness Domain (always address if detected)

**SHOULD discuss:**
- Consistent Strength Domain (build confidence)
- High-Stakes Performance (if gap detected)
- Reactive vs. Proactive (fundamental care approach)
- Deterioration Prevention (patient outcome focused)

**MAY discuss if relevant:**
- Other patterns based on student's self-identified concerns
- Patterns that explain biggest performance gaps
- Patterns with clear actionable improvements

## Example Pattern Usage in Phase 3:

"Looking across all three scenarios, I see [PATTERN NAME]. [Use AAR Talking Point]. For example, in the asthma scenario [specific example], and in the cardiac scenario [specific example]. Does this pattern match what you experienced?"

## What NOT to do:
- ❌ Don't list all patterns mechanically
- ❌ Don't use technical pattern names without explanation
- ❌ Don't overwhelm student with too many patterns
- ❌ Don't discuss patterns without connecting to specific scenario examples

## Current AAR Phase: ${aar.phase}
${aar.phase === 'scenario_review' ? `Currently reviewing scenario ${aar.currentScenarioIndex + 1} of 3` : ''}

Focus on individual scenario feedback until Phase 3, then shift to pattern-based analysis.
`;

    return context;
  }

  /**
   * Interpret patient outcome for AAR context
   * @param {string} state - Final patient state
   * @returns {string} - Human-readable interpretation
   */
  interpretOutcome(state) {
    const interpretations = {
      'improving': 'Patient responded well to treatment, condition stabilizing',
      'stable': 'Patient condition stable, appropriate management',
      'deteriorating': 'Patient continued to decline despite interventions',
      'critical': 'Patient reached critical condition, immediate transport needed',
      'initial': 'Patient remained in initial presentation state'
    };
    return interpretations[state] || 'Outcome unclear';
  }

  /**
   * Format pattern for AAR context
   * @param {Object} pattern - Pattern object
   * @returns {string} - Formatted pattern string
   */
  formatPattern(pattern) {
    return patternAnalysisService.formatPatternForAAR(pattern);
  }

  /**
   * Build scenario summary for AAR context
   * @param {Object} scenarioData - Scenario data object
   * @param {number} scenarioNumber - Scenario number (1, 2, or 3)
   * @returns {string} - Formatted scenario summary
   */
  buildScenarioSummary(scenarioData, scenarioNumber) {
    return `
## Scenario ${scenarioNumber}: ${scenarioData.scenarioId || 'Unknown'}

**Time:** ${Math.floor((scenarioData.totalTime || 0) / 60)} minutes
**Score:** ${scenarioData.score?.percentage || 'N/A'}% (${scenarioData.score?.grade || 'N/A'})
**Final State:** ${scenarioData.finalState || 'Unknown'}

**Critical Actions Completed:**
${scenarioData.checklistResults?.map(item =>
  `- ${item.action}: ${item.completed ? '✅' : '❌'} ${item.completed && item.timeTarget ? `(${Math.floor(item.timeSinceStart / 60)}min, target ${item.timeTarget}min)` : ''}`
).join('\n') || 'No checklist data'}

**CDP Evaluations:**
${scenarioData.cdpEvaluations?.map(cdp =>
  `- ${cdp.decision}: ${cdp.score.toUpperCase()} - ${cdp.reasoning}`
).join('\n') || 'No CDP data'}

**Medication Errors:** ${scenarioData.errors?.length || 0}
${scenarioData.errors?.length > 0 ? scenarioData.errors.map(e => `  - ${e.action}`).join('\n') : ''}

**State Progression:**
${scenarioData.stateHistory?.map(s =>
  `- ${Math.floor(s.timeSinceStart || 0)}min: ${(s.state || 'unknown').toUpperCase()}`
).join('\n') || 'No state data'}

---
`;
  }

  /**
   * Calculate total time across all scenarios
   * @param {Array} allScenarios - Array of scenario data
   * @returns {string} - Formatted total time
   */
  calculateTotalTime(allScenarios) {
    const total = allScenarios.reduce((sum, s) => sum + (s.totalTime || 0), 0);
    return `${Math.floor(total / 60)} minutes`;
  }

  /**
   * Calculate overall score across all scenarios
   * @param {Array} allScenarios - Array of scenario data
   * @returns {string} - Formatted overall score
   */
  calculateOverallScore(allScenarios) {
    const scores = allScenarios.map(s => s.score?.percentage || 0);
    const avg = scores.reduce((sum, s) => sum + s, 0) / scores.length;
    return `${Math.round(avg)}%`;
  }

  /**
   * Count total errors across all scenarios
   * @param {Array} allScenarios - Array of scenario data
   * @returns {number} - Total error count
   */
  countTotalErrors(allScenarios) {
    return allScenarios.reduce((sum, s) => sum + (s.errors?.length || 0), 0);
  }

  /**
   * Count detected patterns
   * @param {Object} patterns - Patterns object
   * @returns {number} - Number of detected patterns
   */
  countDetectedPatterns(patterns) {
    let count = 0;

    const checkCategory = (category) => {
      for (const key in category) {
        if (category[key]?.detected) count++;
      }
    };

    checkCategory(patterns.temporal || {});
    checkCategory(patterns.decisionQuality || {});
    checkCategory(patterns.clinicalReasoning || {});
    checkCategory(patterns.errorPatterns || {});
    checkCategory(patterns.cognitiveLoad || {});
    checkCategory(patterns.patientAwareness || {});
    checkCategory(patterns.communication || {});
    checkCategory(patterns.metaPatterns || {});

    return count;
  }

  /**
   * Add message to AAR conversation history
   * @param {string} sessionId - Session identifier
   * @param {string} role - Message role (user/assistant)
   * @param {string} content - Message content
   */
  addMessage(sessionId, role, content) {
    const aar = this.aarSessions.get(sessionId);
    if (aar) {
      aar.conversationHistory.push({
        role: role,
        content: content,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Get conversation history for Claude API
   * @param {string} sessionId - Session identifier
   * @returns {Array} - Array of message objects
   */
  getConversationHistory(sessionId) {
    const aar = this.aarSessions.get(sessionId);
    if (!aar) return [];

    return aar.conversationHistory.map(msg => ({
      role: msg.role,
      content: msg.content
    }));
  }

  /**
   * Check if AAR is complete
   * @param {string} sessionId - Session identifier
   * @returns {boolean} - True if AAR is complete
   */
  isComplete(sessionId) {
    const aar = this.aarSessions.get(sessionId);
    return aar ? aar.phase === 'complete' : false;
  }

  /**
   * Delete AAR session
   * @param {string} sessionId - Session identifier
   */
  deleteAAR(sessionId) {
    const deleted = this.aarSessions.delete(sessionId);
    if (deleted) {
      console.log(`🗑️ AAR Session deleted: ${sessionId}`);
    }
  }

  /**
   * Get AAR statistics
   * @returns {Object} - Statistics about AAR sessions
   */
  getStatistics() {
    return {
      totalSessions: this.aarSessions.size,
      sessions: Array.from(this.aarSessions.values()).map(aar => ({
        sessionId: aar.sessionId,
        phase: aar.phase,
        duration: Math.floor((Date.now() - aar.startTime) / 1000),
        messageCount: aar.conversationHistory.length
      }))
    };
  }
}

// Export singleton instance
const aarService = new AARService();
export default aarService;
