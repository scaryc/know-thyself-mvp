// server/services/aarContextBuilder.js

import { loadBlueprint, extractAARRelevantContent } from '../utils/blueprintLoader.js';
import { patternAnalysisService } from './patternAnalysisService.js';

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

      // Structured performance data (V3.0 Enhanced)
      performance: {
        // V3.0: Outcome-based competence assessment
        competence_assessment: perf.competence_assessment || null,
        overall_competence: perf.overall_competence || null,

        // V3.0: Safety Gate (HIGHEST PRIORITY)
        safety_gate: perf.safetyGate || perf.safety_gate || null,
        critical_failures: perf.safetyGate?.failures || perf.critical_failures || [],

        // V3.0: Outcome-based consequence feedback
        outcomeBasedFeedback: perf.outcomeBasedFeedback || [],

        // V3.0: Progress Milestones
        progress_milestones: perf.progress_milestones || null,

        // V3.0: Patient State Progression
        patient_progression: perf.patient_progression || null,

        // Action details with competence levels
        completed_actions: perf.completed_actions || [],
        missed_actions: perf.missed_actions || []
      },

      // Timing
      durationMinutes: perf.durationMinutes || 0
    };
  });

  // Analyze cross-scenario patterns
  const patterns = patternAnalysisService.analyzePerformancePatterns(performanceHistory);

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

  // V3.0: Safety Gate Critical Failures
  if (blueprint.safety_gate?.enabled && blueprint.safety_gate.critical_failures?.length > 0) {
    summary += `**Safety Gate - Critical Failures to Monitor:**\n`;
    for (const failure of blueprint.safety_gate.critical_failures) {
      summary += `- ${failure.id}: ${failure.description} (${failure.type})\n`;
    }
    summary += '\n';
  }

  // V3.0: Progress Milestones
  if (blueprint.progress_milestones?.enabled && blueprint.progress_milestones.milestone_definitions) {
    summary += `**Progress Milestones (Universal):**\n`;
    for (const [id, milestone] of Object.entries(blueprint.progress_milestones.milestone_definitions)) {
      summary += `- ${id}: ${milestone.name}\n`;
    }
    summary += '\n';
  }

  // Critical actions checklist (V3.0: no time targets or points)
  if (blueprint.critical_actions_checklist?.length > 0) {
    summary += `**Critical Actions Checklist:**\n`;
    for (const action of blueprint.critical_actions_checklist) {
      summary += `- ${action.id}: ${action.action} (${action.importance || 'standard'})\n`;
      if (action.clinical_anchor) {
        summary += `  Clinical Anchor: "${action.clinical_anchor}"\n`;
      }
      // V3.0: Show competence assessment method
      if (action.competence_assessment?.method === 'outcome_based') {
        summary += `  Assessment: Outcome-based (patient state at action & after)\n`;
      }
    }
    summary += '\n';
  }

  // CDPs (legacy, may be deprecated in V3.0)
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

  // Common errors with clinical anchors (legacy)
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

  // ===== V3.0: SAFETY GATE (HIGHEST PRIORITY) =====
  if (performance.safety_gate) {
    formatted += `**🚨 SAFETY GATE ASSESSMENT:**\n`;
    formatted += `- Status: ${performance.safety_gate.passed ? '✅ PASSED' : '❌ FAILED'}\n`;

    if (!performance.safety_gate.passed && performance.critical_failures?.length > 0) {
      formatted += `- Critical Failures Detected: ${performance.critical_failures.length}\n\n`;
      formatted += `**CRITICAL FAILURES (Patient-Harming Errors):**\n`;

      for (const failure of performance.critical_failures) {
        formatted += `\n**${failure.type.toUpperCase()}: ${failure.description}**\n`;
        formatted += `- Occurred at: ${failure.timestamp} minutes\n`;
        formatted += `- Patient Outcome: ${failure.patient_outcome}\n`;
        formatted += `- Teaching Point: ${failure.teaching_point}\n`;
      }
      formatted += '\n';
    } else {
      formatted += `- No critical safety failures detected\n\n`;
    }
  }

  // ===== V3.0: OUTCOME-BASED CONSEQUENCE FEEDBACK =====
  if (performance.outcomeBasedFeedback && performance.outcomeBasedFeedback.length > 0) {
    formatted += `**📊 OUTCOME-BASED PERFORMANCE FEEDBACK:**\n`;
    formatted += `- ${performance.outcomeBasedFeedback.length} action(s) require debriefing\n\n`;

    for (const feedback of performance.outcomeBasedFeedback) {
      formatted += `**${feedback.action_id}: ${feedback.action_name}**\n`;
      formatted += `- Competence Level: ${feedback.competence_level}\n`;

      if (feedback.omission) {
        formatted += `- Status: OMITTED (never performed)\n`;
        formatted += `- Patient State at End: ${feedback.patient_state_at_end}\n`;
      } else {
        formatted += `- Patient State at Action: ${feedback.patient_state_at_action}\n`;
        formatted += `- Patient State After: ${feedback.patient_state_after}\n`;

        // Show vital signs if available
        if (feedback.vitals_at_action && Object.keys(feedback.vitals_at_action).length > 0) {
          formatted += `- Vitals at Action:`;
          for (const [vital, value] of Object.entries(feedback.vitals_at_action)) {
            formatted += ` ${vital}=${value}`;
          }
          formatted += '\n';
        }

        if (feedback.elapsed_minutes) {
          formatted += `- Timing: ${feedback.elapsed_minutes.toFixed(1)} minutes into scenario\n`;
        }
      }

      if (feedback.feedback_text) {
        formatted += `- Outcome Feedback: ${feedback.feedback_text}\n`;
      }

      if (feedback.clinical_anchor) {
        formatted += `- Clinical Anchor: "${feedback.clinical_anchor}"\n`;
      }

      if (feedback.teaching_point) {
        formatted += `- Teaching Point: ${feedback.teaching_point}\n`;
      }

      formatted += '\n';
    }
  }

  // ===== V3.0: OVERALL COMPETENCE ASSESSMENT =====
  if (performance.overall_competence) {
    formatted += `**OVERALL COMPETENCE ASSESSMENT:**\n`;
    formatted += `- Level: ${performance.overall_competence.level.toUpperCase()}\n`;
    formatted += `- ${performance.overall_competence.description}\n`;
    formatted += `- Rationale: ${performance.overall_competence.rationale}\n\n`;
  }

  // ===== V3.0: COMPETENCE DISTRIBUTION =====
  if (performance.competence_assessment?.distribution) {
    const dist = performance.competence_assessment.distribution;
    formatted += `**Competence Distribution:**\n`;
    formatted += `- Exemplary: ${dist.exemplary} actions\n`;
    formatted += `- Competent: ${dist.competent} actions\n`;
    formatted += `- Developing: ${dist.developing} actions\n`;
    formatted += `- Novice: ${dist.novice} actions\n\n`;
  }

  // ===== V3.0: DETAILED ACTION ASSESSMENT =====
  if (performance.completed_actions?.length > 0) {
    formatted += `**Critical Actions - Outcome-Based Assessment:**\n`;
    for (const action of performance.completed_actions) {
      const level = action.competence_level?.toUpperCase() || 'N/A';
      formatted += `\n- ${action.action}\n`;
      formatted += `  Competence Level: ${level}\n`;
      formatted += `  Time: ${action.timestamp_minutes?.toFixed(1) || action.minutesMark?.toFixed(1) || 'N/A'} minutes\n`;
      formatted += `  Patient State at Action: ${action.patient_state_at_action || 'N/A'}\n`;
      formatted += `  Patient State After: ${action.patient_state_after || 'N/A'}\n`;
      formatted += `  Outcome: ${action.outcome_description || 'N/A'}\n`;
    }
    formatted += '\n';
  }

  // ===== V3.0: MISSED CRITICAL ACTIONS =====
  if (performance.missed_actions?.length > 0) {
    formatted += `**Missed Critical Actions:**\n`;
    for (const action of performance.missed_actions) {
      formatted += `- ${action.action} (${action.importance || 'standard'})\n`;
      if (action.clinical_anchor) {
        formatted += `  Clinical Anchor: "${action.clinical_anchor}"\n`;
      }
    }
    formatted += '\n';
  }

  // ===== V3.0: PROGRESS MILESTONES =====
  if (performance.progress_milestones) {
    const pm = performance.progress_milestones;
    formatted += `**Progress Milestones:**\n`;
    formatted += `- Completed: ${pm.completed}/${pm.totalMilestones}\n`;
    formatted += `- Completion Rate: ${(pm.completionRate * 100).toFixed(0)}%\n`;

    if (pm.milestones && pm.milestones.length > 0) {
      formatted += `\nCompleted Milestones:\n`;
      for (const milestone of pm.milestones) {
        if (milestone.completed) {
          formatted += `- ${milestone.name} (${milestone.timestampFormatted || milestone.timestamp?.toFixed(1) + ' min'})\n`;
        }
      }
    }
    formatted += '\n';
  }

  // ===== V3.0: PATIENT STATE PROGRESSION =====
  if (performance.patient_progression) {
    const pp = performance.patient_progression;
    formatted += `**Patient State Progression:**\n`;
    formatted += `- Initial State: ${pp.initial_state || 'initial'}\n`;
    formatted += `- Final State: ${pp.final_state}\n`;
    formatted += `- Worst State Reached: ${pp.worst_state_reached}\n`;
    formatted += `- Critical Treatment Given: ${pp.critical_treatment_given ? 'Yes' : 'No'}\n`;
    formatted += `- Duration: ${pp.duration_minutes?.toFixed(1) || 'N/A'} minutes\n`;

    if (pp.state_history && pp.state_history.length > 0) {
      formatted += `\nState Transition Timeline:\n`;
      for (const transition of pp.state_history) {
        formatted += `- ${transition.elapsedMinutes?.toFixed(1) || 'N/A'} min: ${transition.state}`;
        if (transition.reason) formatted += ` (${transition.reason})`;
        formatted += '\n';
      }
    }
    formatted += '\n';
  }

  // ===== LEGACY DATA (Backward Compatibility) =====

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
