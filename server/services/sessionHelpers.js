/**
 * Session Helpers - Convert between database and in-memory formats
 * Handles JSON parsing/stringification for SQLite storage
 */

/**
 * Convert database session to runtime session object
 * (Adds non-persisted runtime fields like scenarioEngine)
 */
export function dbToRuntimeSession(dbSession) {
  // Parse JSON fields from database strings
  const parseJSON = (str, defaultValue = null) => {
    if (!str) return defaultValue;
    try {
      return JSON.parse(str);
    } catch (e) {
      console.warn('Failed to parse JSON:', str);
      return defaultValue;
    }
  };

  return {
    sessionId: dbSession.id,

    // Copy all database fields
    ...dbSession,

    // Convert timestamp fields
    startTime: dbSession.scenarioStartTime ? parseInt(dbSession.scenarioStartTime) : Date.now(),

    // Parse JSON fields back to objects/arrays
    scenarioQueue: parseJSON(dbSession.scenarioQueue, []),
    completedScenarios: parseJSON(dbSession.completedScenarios, []),
    scenarioPerformanceHistory: parseJSON(dbSession.scenarioPerformanceHistory, []),
    cdpEvaluations: parseJSON(dbSession.cdpEvaluations, []),
    medicationErrors: parseJSON(dbSession.medicationErrors, []),
    medicationWarnings: parseJSON(dbSession.medicationWarnings, []),
    challengePointsUsed: parseJSON(dbSession.challengePointsUsed, []),
    criticalActionsLog: parseJSON(dbSession.criticalActionsLog, []),
    criticalTreatmentsGiven: parseJSON(dbSession.criticalTreatmentsGiven, {}),
    stateHistory: parseJSON(dbSession.stateHistory, []),
    currentVitals: parseJSON(dbSession.currentVitals, null),
    scenarioData: parseJSON(dbSession.scenarioData, null),
    dispatchInfo: parseJSON(dbSession.dispatchInfo, null),
    patientInfo: parseJSON(dbSession.patientInfo, null),
    activeChallenge: parseJSON(dbSession.activeChallenge, null),

    // Convert messages array to proper format
    messages: (dbSession.messages || []).map(m => ({
      role: m.role,
      content: m.content,
      timestamp: m.timestamp
    })),

    // Runtime-only fields (not in database)
    engine: null,  // Will be reconstructed when needed
    scenario: parseJSON(dbSession.scenarioData, null),  // Alias for scenarioData
    measuredVitals: parseJSON(dbSession.measuredVitals, {}),  // Restore from database
    patientNotes: parseJSON(dbSession.patientNotes, []),  // Restore from database
    vitals: parseJSON(dbSession.currentVitals, null),  // Alias for currentVitals

    // Cognitive coach state
    cognitiveCoach: parseJSON(dbSession.cognitiveCoachState, {
      selectedQuestions: [],
      currentQuestionIndex: 0,
      responses: [],
      startTime: Date.now(),
      completed: false,
      communicationAnalysis: {
        patternsDetected: {
          sequentialThinking: 'none',
          thoroughness: 'medium',
          conciseness: 'medium',
          actionBundling: false,
          verbose: false
        },
        metrics: {
          averageWordCount: 0,
          sequentialLanguageCount: 0,
          actionBundlingInstances: 0,
          responseStructureQuality: 'clear'
        },
        personalizedNudge: {
          type: 'none',
          content: ''
        },
        studentQuestions: [],
        phase3Completed: false,
        phase3Duration: 0
      }
    })
  };
}

/**
 * Convert runtime session to database-safe format
 * (Removes runtime-only fields, converts to JSON strings)
 */
export function runtimeToDbSession(session) {
  const toJSON = (value) => {
    if (value === null || value === undefined) return null;
    if (typeof value === 'string') return value;  // Already stringified
    return JSON.stringify(value);
  };

  return {
    // Student identity
    studentId: session.studentId || null,
    studentName: session.studentName || null,
    studentEmail: session.studentEmail || null,
    group: session.group || null,
    language: session.language || 'en',  // ✅ FIX: Include language preference in updates

    // Session metadata
    scenarioId: session.scenarioId || null,
    currentAgent: session.currentAgent || 'cognitive_coach',

    // Scenario progress
    currentScenarioIndex: session.currentScenarioIndex || 0,
    scenarioQueue: toJSON(session.scenarioQueue || []),
    completedScenarios: toJSON(session.completedScenarios || []),
    sessionComplete: session.sessionComplete || false,
    isAARMode: session.isAARMode || false,

    // Cognitive Coach
    cognitiveCoachState: toJSON(session.cognitiveCoach),

    // Performance tracking
    performanceScore: session.performanceScore || 0,
    optimalCount: session.optimalCount || 0,
    acceptableCount: session.acceptableCount || 0,
    suboptimalCount: session.suboptimalCount || 0,
    dangerousCount: session.dangerousCount || 0,
    cdpEvaluations: toJSON(session.cdpEvaluations || []),

    // Medication safety
    medicationErrors: toJSON(session.medicationErrors || []),
    medicationWarnings: toJSON(session.medicationWarnings || []),
    safetyViolations: session.safetyViolations || 0,

    // Challenge Points
    challengePointsEnabled: session.challengePointsEnabled || false,
    challengePointsUsed: toJSON(session.challengePointsUsed || []),
    activeChallenge: toJSON(session.activeChallenge),

    // Critical actions
    criticalActionsLog: toJSON(session.criticalActionsLog || []),
    criticalTreatmentsGiven: toJSON(session.criticalTreatmentsGiven || {}),

    // Patient state
    currentState: session.currentState || null,
    stateHistory: toJSON(session.stateHistory || []),
    currentVitals: toJSON(session.vitals || session.currentVitals),

    // Measured vitals and patient notes (core agent runtime data)
    measuredVitals: toJSON(session.measuredVitals || {}),
    patientNotes: toJSON(session.patientNotes || []),

    // Scenario data (store full blueprint if available)
    scenarioData: toJSON(session.scenario || session.scenarioData),
    dispatchInfo: toJSON(session.dispatchInfo),
    patientInfo: toJSON(session.patientInfo),

    // Performance history
    scenarioPerformanceHistory: toJSON(session.scenarioPerformanceHistory || []),

    // Timestamps
    scenarioStartTime: session.scenarioStartTime ? session.scenarioStartTime.toString() : (session.startTime ? session.startTime.toString() : null),
  };
}

/**
 * Extract fields that have changed (for efficient updates)
 */
export function getChangedFields(oldSession, newSession) {
  const changes = {};
  const dbFormat = runtimeToDbSession(newSession);

  for (const key in dbFormat) {
    // Compare stringified versions for deep equality
    const oldValue = oldSession[key];
    const newValue = dbFormat[key];

    if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
      changes[key] = newValue;
    }
  }

  return changes;
}

/**
 * Merge partial session updates into existing session
 */
export function mergeSessionUpdates(existingSession, updates) {
  return {
    ...existingSession,
    ...updates,
    // Preserve arrays/objects if not explicitly updated
    messages: updates.messages || existingSession.messages,
    scenarioQueue: updates.scenarioQueue !== undefined ? updates.scenarioQueue : existingSession.scenarioQueue,
    completedScenarios: updates.completedScenarios !== undefined ? updates.completedScenarios : existingSession.completedScenarios,
  };
}
