// server/services/aarContextBuilder.js

import { loadBlueprint, extractAARRelevantContent } from '../utils/blueprintLoader.js';
import { analyzePerformancePatterns } from './patternAnalysisService.js';

/**
 * Build complete AAR context for agent initialization
 * @param {object} session - Session object with scenarioPerformanceHistory
 * @returns {object} Complete AAR context
 */
export function buildFullAARContext(session) {
  const performanceHistory = session.scenarioPerformanceHistory || [];

  if (performanceHistory.length === 0) {
    return {
      error: 'No completed scenarios to review',
      scenarios: []
    };
  }

  // Build context for each completed scenario
  const scenarioContexts = performanceHistory.map((perf, index) => {
    // Load full blueprint
    const fullBlueprint = loadBlueprint(perf.blueprintId || perf.scenarioId);
    const aarBlueprint = extractAARRelevantContent(fullBlueprint);

    return {
      scenarioNumber: index + 1,
      scenarioId: perf.scenarioId,
      scenarioName: perf.scenarioName || aarBlueprint?.metadata?.scenario_name || 'Unknown',

      // Full blueprint (AAR-relevant sections)
      blueprint: aarBlueprint,

      // Full conversation transcript
      transcript: perf.fullTranscript || [],

      // Structured performance data
      performance: {
        structuredMemory: perf.structuredMemory || {},
        cdpEvaluations: perf.cdpEvaluations || [],
        stateHistory: perf.stateHistory || [],
        criticalActionsLog: perf.actionsLog || [],
        medicationErrors: perf.errors || [],
        checklistResults: perf.checklistResults || [],
        checklistSummary: perf.checklistSummary || null,
        score: perf.score
      },

      // Timing
      durationMinutes: perf.durationMinutes || 0
    };
  });

  // Analyze cross-scenario patterns
  const patterns = analyzePerformancePatterns(performanceHistory);

  return {
    totalScenarios: scenarioContexts.length,
    scenarios: scenarioContexts,
    crossScenarioPatterns: patterns,
    sessionMetadata: {
      totalDurationMinutes: scenarioContexts.reduce((sum, s) => sum + s.durationMinutes, 0),
      completedAt: new Date().toISOString()
    }
  };
}

/**
 * Format AAR context as string for system prompt injection
 * @param {object} aarContext - Context from buildFullAARContext
 * @returns {string} Formatted context string
 */
export function formatAARContextForPrompt(aarContext) {
  if (aarContext.error) {
    return `## AAR Context\n\nError: ${aarContext.error}`;
  }

  let contextString = `## AAR SESSION DATA\n\n`;
  contextString += `**Scenarios Completed:** ${aarContext.totalScenarios}\n`;
  contextString += `**Total Session Duration:** ${aarContext.sessionMetadata.totalDurationMinutes.toFixed(1)} minutes\n\n`;

  // Format each scenario
  for (const scenario of aarContext.scenarios) {
    contextString += `---\n\n`;
    contextString += `### SCENARIO ${scenario.scenarioNumber}: ${scenario.scenarioName}\n\n`;

    // Blueprint summary
    contextString += `#### Blueprint Reference\n\n`;
    contextString += formatBlueprintSummary(scenario.blueprint);

    // Full transcript
    contextString += `\n#### Full Conversation Transcript\n\n`;
    contextString += formatTranscript(scenario.transcript);

    // Performance data
    contextString += `\n#### Performance Data\n\n`;
    contextString += formatPerformanceData(scenario.performance);
  }

  // Cross-scenario patterns
  if (aarContext.crossScenarioPatterns) {
    contextString += `---\n\n`;
    contextString += `### CROSS-SCENARIO PATTERNS\n\n`;
    contextString += formatPatterns(aarContext.crossScenarioPatterns);
  }

  return contextString;
}

// Helper functions for formatting

function formatBlueprintSummary(blueprint) {
  if (!blueprint) return 'Blueprint not available\n';

  let summary = '';

  // Patient info
  if (blueprint.patient_profile) {
    const p = blueprint.patient_profile;
    summary += `**Patient:** ${p.name || 'Unknown'}, ${p.age || '?'} years old\n`;
    summary += `**Chief Complaint:** ${p.chief_complaint || 'Not specified'}\n\n`;
  }

  // Critical actions checklist
  if (blueprint.critical_actions_checklist?.length > 0) {
    summary += `**Critical Actions Checklist:**\n`;
    for (const action of blueprint.critical_actions_checklist) {
      summary += `- ${action.id}: ${action.action} (target: ${action.time_target_minutes} min, ${action.importance})\n`;
    }
    summary += '\n';
  }

  // CDPs
  if (blueprint.critical_decision_points?.points?.length > 0) {
    summary += `**Critical Decision Points:**\n`;
    for (const cdp of blueprint.critical_decision_points.points) {
      summary += `- ${cdp.id}: ${cdp.name}\n`;
      if (cdp.clinical_anchor) {
        summary += `  Clinical Anchor: "${cdp.clinical_anchor}"\n`;
      }
    }
    summary += '\n';
  }

  // Common errors with clinical anchors
  if (blueprint.common_errors?.length > 0) {
    summary += `**Common Errors & Teaching Points:**\n`;
    for (const error of blueprint.common_errors) {
      summary += `- ${error.error_id}: ${error.error}\n`;
      summary += `  Teaching: ${error.teaching_point}\n`;
      if (error.clinical_anchor) {
        summary += `  Clinical Anchor: "${error.clinical_anchor}"\n`;
      }
    }
    summary += '\n';
  }

  return summary;
}

function formatTranscript(transcript) {
  if (!transcript || transcript.length === 0) {
    return 'Transcript not available\n';
  }

  let formatted = '```\n';
  for (const msg of transcript) {
    const timePrefix = msg.scenarioTime !== undefined
      ? `[${msg.scenarioTime.toFixed(1)} min] `
      : '';
    const role = msg.role === 'user' ? 'STUDENT' : 'AI';
    formatted += `${timePrefix}${role}: ${msg.content}\n\n`;
  }
  formatted += '```\n';

  return formatted;
}

function formatPerformanceData(performance) {
  let formatted = '';

  // Checklist Summary (if Phase 2 is implemented)
  if (performance.checklistSummary) {
    const cs = performance.checklistSummary;
    formatted += `**Checklist Performance:**\n`;
    formatted += `- Score: ${cs.totalPoints}/${cs.maxPoints} points (${cs.percentageScore}%)\n`;
    formatted += `- Completed: ${cs.completedCount}/${cs.totalItems} actions\n`;
    formatted += `- On Time: ${cs.onTimeCount}, Late: ${cs.lateCount}\n`;

    if (cs.hasCriticalMisses) {
      formatted += `- ⚠️ CRITICAL ACTIONS MISSED: ${cs.criticalMissed.join(', ')}\n`;
    }
    if (cs.essentialMissed && cs.essentialMissed.length > 0) {
      formatted += `- Essential actions missed: ${cs.essentialMissed.join(', ')}\n`;
    }
    if (cs.averageDelay > 0) {
      formatted += `- Average delay (late actions): ${cs.averageDelay} minutes\n`;
    }
    formatted += '\n';
  }

  // Detailed Checklist Results (if Phase 2 is implemented)
  if (performance.checklistResults?.length > 0) {
    formatted += `**Checklist Details (Completed):**\n`;
    for (const item of performance.checklistResults) {
      const timing = item.onTime
        ? `✅ on time`
        : `⚠️ ${item.minutesLate?.toFixed(1) || 0} min late`;
      formatted += `- ${item.id}: ${item.action}\n`;
      formatted += `  Time: ${item.time?.toFixed(1) || 0} min (target: ${item.target} min) - ${timing}\n`;
      formatted += `  Points: ${item.points}/${item.maxPoints}\n`;
    }
    formatted += '\n';
  }

  if (performance.checklistSummary?.missed?.length > 0) {
    formatted += `**Checklist Details (Missed):**\n`;
    for (const item of performance.checklistSummary.missed) {
      formatted += `- ${item.id}: ${item.action} (${item.importance}) - ❌ NOT COMPLETED\n`;
    }
    formatted += '\n';
  }

  // CDP Evaluations
  if (performance.cdpEvaluations?.length > 0) {
    formatted += `**CDP Evaluations:**\n`;
    for (const cdp of performance.cdpEvaluations) {
      formatted += `- ${cdp.id || cdp.name}: ${cdp.score?.toUpperCase() || 'N/A'}\n`;
      if (cdp.reasoning) {
        formatted += `  Reasoning: ${cdp.reasoning}\n`;
      }
    }
    formatted += '\n';
  }

  // Critical Actions Log
  if (performance.criticalActionsLog?.length > 0) {
    formatted += `**Critical Actions Timeline:**\n`;
    for (const action of performance.criticalActionsLog) {
      const time = action.scenarioTime || action.time || action.elapsedTime / 60 || '?';
      formatted += `- ${typeof time === 'number' ? time.toFixed(1) : time} min: ${action.action} (${action.category || 'general'})\n`;
    }
    formatted += '\n';
  }

  // State History
  if (performance.stateHistory?.length > 0) {
    formatted += `**Patient State Progression:**\n`;
    for (const state of performance.stateHistory) {
      const time = state.timeSinceStart !== undefined
        ? Math.round(state.timeSinceStart / 60)
        : state.time || '?';
      formatted += `- ${time} min: ${state.state?.toUpperCase() || 'UNKNOWN'}`;
      if (state.reason) formatted += ` (${state.reason})`;
      formatted += '\n';
    }
    formatted += '\n';
  }

  // Medication Errors
  if (performance.medicationErrors?.length > 0) {
    formatted += `**Medication Errors:**\n`;
    for (const error of performance.medicationErrors) {
      formatted += `- ${error.action || error.medication}: ${error.reason || 'Error'}\n`;
    }
    formatted += '\n';
  }

  // Score
  if (performance.score !== null && performance.score !== undefined) {
    formatted += `**Final Score:** ${performance.score.percentage || performance.score}%\n\n`;
  }

  return formatted;
}

function formatPatterns(patterns) {
  if (!patterns || Object.keys(patterns).length === 0) {
    return 'No cross-scenario patterns detected\n';
  }

  let formatted = '';

  // Format detected patterns
  if (patterns.detectedPatterns) {
    for (const [patternName, patternData] of Object.entries(patterns.detectedPatterns)) {
      if (patternData.detected) {
        formatted += `**${patternName}:**\n`;
        formatted += `- ${patternData.description || patternData.message || 'Pattern detected'}\n`;
        if (patternData.evidence) {
          formatted += `- Evidence: ${patternData.evidence}\n`;
        }
        if (patternData.recommendation) {
          formatted += `- Recommendation: ${patternData.recommendation}\n`;
        }
        formatted += '\n';
      }
    }
  }

  // If patterns object has different structure, handle generically
  if (formatted === '' && typeof patterns === 'object') {
    formatted = JSON.stringify(patterns, null, 2) + '\n';
  }

  return formatted;
}

export default {
  buildFullAARContext,
  formatAARContextForPrompt
};
