/**
 * AAR Service - manages AAR session state and data
 * Handles After Action Review logic for performance analysis
 */

class AARService {
  constructor() {
    this.aarSessions = new Map();
  }

  /**
   * Initialize AAR session with performance data
   * @param {string} sessionId - Session identifier
   * @param {Object} performanceData - Student performance data from scenario
   * @returns {Object} - AAR session object
   */
  initializeAAR(sessionId, performanceData) {
    const aarSession = {
      sessionId: sessionId,
      performanceData: performanceData,
      phase: 'opening', // opening | scenario_review | pattern_analysis | action_plan | closing | complete
      currentScenarioIndex: 0,
      conversationHistory: [],
      startTime: Date.now()
    };

    this.aarSessions.set(sessionId, aarSession);
    console.log(`✅ AAR Session initialized for ${sessionId}`);
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

    const data = aar.performanceData;

    // Format time
    const totalMinutes = Math.floor(data.totalTime / 60);
    const totalSeconds = Math.floor(data.totalTime % 60);

    // Build context
    let context = `
# STUDENT PERFORMANCE DATA

## Overall Summary
- Total Time: ${totalMinutes}m ${totalSeconds}s
- Final Score: ${data.performanceScore?.percentage || 0}% (${data.performanceScore?.grade || 'N/A'})
- Scenarios Completed: 3
- Total Actions Taken: ${data.actionsLog?.length || 0}
- Safety Violations: ${data.medicationErrors?.length || 0}

`;

    // Critical Actions Timeline
    if (data.actionsLog && data.actionsLog.length > 0) {
      context += `## Critical Actions Timeline\n`;
      data.actionsLog.forEach(action => {
        const minutes = Math.floor(action.elapsedTime / 60);
        const seconds = Math.floor(action.elapsedTime % 60);
        const timeStr = `${minutes}:${String(seconds).padStart(2, '0')}`;
        context += `- ${timeStr}: ${action.action} (${action.category})\n`;
      });
      context += `\n`;
    }

    // CDP Evaluations
    if (data.cdpEvaluations && data.cdpEvaluations.length > 0) {
      context += `## CDP Evaluations\n`;
      data.cdpEvaluations.forEach(cdp => {
        context += `### ${cdp.cdp_title}\n`;
        context += `   Rating: ${cdp.rating?.toUpperCase() || 'NOT_PERFORMED'}\n`;
        context += `   Explanation: ${cdp.explanation}\n`;
        context += `   Time: ${Math.floor(cdp.elapsedTime)}m\n\n`;
      });
    }

    // Medication Errors
    if (data.medicationErrors && data.medicationErrors.length > 0) {
      context += `## Medication Safety Concerns\n`;
      data.medicationErrors.forEach(error => {
        const minutes = Math.floor(error.elapsedTime / 60);
        const seconds = Math.floor(error.elapsedTime % 60);
        context += `- ⚠️ ${minutes}:${String(seconds).padStart(2, '0')}: ${error.medication} - ${error.reason}\n`;
      });
      context += `\n`;
    }

    // State Progression
    if (data.stateHistory && data.stateHistory.length > 0) {
      context += `## Patient State Progression\n`;
      data.stateHistory.forEach(state => {
        const minutes = Math.floor(state.elapsedTime / 60);
        const seconds = Math.floor(state.elapsedTime % 60);
        const timeStr = `${minutes}:${String(seconds).padStart(2, '0')}`;
        const stateLabel = state.state?.toUpperCase() || 'UNKNOWN';
        const prevLabel = state.previousState ? ` (from ${state.previousState.toUpperCase()})` : '';
        context += `- ${timeStr}: ${stateLabel}${prevLabel}\n`;
      });
      context += `\n`;
    }

    // Treatment Summary
    if (data.criticalTreatments) {
      context += `## Critical Treatments Given\n`;
      context += `- Oxygen: ${data.criticalTreatments.oxygen ? '✅ YES' : '❌ NO'}\n`;
      context += `- Salbutamol: ${data.criticalTreatments.salbutamol ? '✅ YES' : '❌ NO'}\n`;
      context += `- Steroids: ${data.criticalTreatments.steroids ? '✅ YES' : '❌ NO'}\n\n`;
    }

    // Treatment Timing Analysis
    if (data.treatmentTiming) {
      context += `## Treatment Timing Analysis\n`;
      for (const [treatment, timing] of Object.entries(data.treatmentTiming)) {
        if (timing.given) {
          const minutes = Math.floor(timing.timeGiven / 60);
          const seconds = Math.floor(timing.timeGiven % 60);
          const status = timing.withinTarget ? '✅ Within target' : '⚠️ Delayed';
          context += `- ${treatment}: ${minutes}:${String(seconds).padStart(2, '0')} (${status})\n`;
        } else {
          context += `- ${treatment}: ❌ Not given\n`;
        }
      }
      context += `\n`;
    }

    // Final Patient Outcome
    context += `## Final Patient Outcome\n`;
    context += `- Final State: ${data.finalState?.toUpperCase() || 'UNKNOWN'}\n`;
    context += `- Patient Response: ${this.interpretOutcome(data.finalState)}\n\n`;

    // Current AAR Phase
    context += `# CURRENT AAR PHASE: ${aar.phase.toUpperCase()}\n`;
    if (aar.phase === 'scenario_review') {
      context += `Currently reviewing scenario ${aar.currentScenarioIndex + 1} of 3\n`;
    }
    context += `\nUse this data to provide specific, evidence-based feedback. Reference actual timing and actions.\n`;

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
