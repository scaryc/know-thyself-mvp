# Full Context AAR - Development Plan

**Document Purpose:** Complete implementation guide for Full Context AAR architecture  
**Version:** 2.0  
**Date:** January 2025  
**Target:** Claude Code implementation  
**Estimated Total Effort:** 8-11 hours

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Jan 2025 | Initial Full Context AAR plan |
| 2.0 | Jan 2025 | Added Phase 2: Checklist Matching (Tasks 9-11) |

---

## Executive Summary

### The Problem

Current AAR agent lacks sufficient context to provide meaningful, personalized feedback because:
1. **Strategy B prunes conversation history** during scenarios to manage token usage
2. **Full blueprint is not passed** to AAR context
3. **AAR sees only structured summaries**, not actual student dialogue
4. **Checklist performance data is never computed** — student actions aren't mapped to checklist items

### The Solution

**Two-Phase Implementation:**

**Phase 1 - Full Context AAR**: Load complete blueprints + complete conversation transcripts + structured performance data into AAR context at initialization.

**Phase 2 - Checklist Matching**: Pre-compute checklist completion, timing analysis, and scoring during scenarios so AAR has reliable structured data.

### Why Both Phases Are Needed

| Phase | Solves | Enables AAR to Answer |
|-------|--------|----------------------|
| Phase 1: Full Context | Dialogue context, blueprint access | "What did I say?", "Why did I hesitate?" |
| Phase 2: Checklist Matching | Performance analysis | "Was I too slow?", "What did I miss?", "How did I score?" |

Without Phase 2, AAR must analyze raw transcript on-the-fly—unreliable, token-intensive, inconsistent.

### Why This Works

- AAR is **post-scenario analysis**, not real-time conversation
- Data is **finite and bounded** (2 scenarios × ~25 exchanges each)
- Token cost is **acceptable** (~$0.10-0.15 per session)
- Claude's 200k context easily accommodates full data
- Pre-computed checklist data is **deterministic and testable**

---

## Architecture Overview

### During Scenario (Strategy B + Checklist Matching)

```
Student message
    ↓
Core Agent processes (Strategy B applies)
    ↓
Pruning happens for efficiency
    ↓
BUT: Append EVERY exchange to session.fullTranscript (NEW - Phase 1)
    ↓
Action detected → addMemoryAction() called
    ↓
NEW (Phase 2): Match action to checklist item
    ↓
NEW (Phase 2): Record to session.checklistResults with timing
    ↓
Structured memory continues tracking events
    ↓
Scenario continues...
```

### At Scenario End

```
Scenario ends (timer or completion)
    ↓
NEW (Phase 2): Generate checklist summary (completed + missed items)
    ↓
Create performance snapshot:
  - fullTranscript (complete, unpruned)
  - structuredMemory
  - cdpEvaluations
  - stateHistory
  - checklistResults (NEW - with timing and scoring)
  - checklistSummary (NEW - completed/missed/points)
  - blueprintId (reference)
    ↓
Push to session.scenarioPerformanceHistory[]
    ↓
Clear session for next scenario (Strategy B continues)
```

### At AAR Initialization

```
All scenarios complete
    ↓
Build AAR context:
  - Load full blueprints from files
  - Include full transcripts from performance history
  - Include structured performance data
  - Include checklistResults and checklistSummary (NEW)
  - Compute cross-scenario patterns
    ↓
Initialize AAR agent with complete context
    ↓
AAR can answer ANY question about performance
```

---

## Implementation Tasks

---

# PHASE 1: FULL CONTEXT AAR (6-8 hours)

---

### Task 1: Add Full Transcript Storage During Scenario

**File:** `server/index.js`

**Location:** Session initialization and message handling

**Changes:**

#### 1.1 Initialize fullTranscript in session

Find session creation (around line 200-250 depending on your version):

```javascript
// ADD to session initialization
const session = {
  // ... existing properties ...
  
  // NEW: Full transcript storage (survives Strategy B pruning)
  fullTranscript: [],
  
  // ... rest of session ...
};
```

#### 1.2 Append to fullTranscript on every exchange

Find the message handling endpoint (`/api/sessions/:id/message` or similar):

```javascript
// AFTER receiving user message, BEFORE any processing
session.fullTranscript.push({
  role: 'user',
  content: userMessage,
  timestamp: Date.now(),
  scenarioTime: getElapsedMinutes(session)
});

// AFTER receiving AI response, BEFORE returning to client
session.fullTranscript.push({
  role: 'assistant', 
  content: aiResponse,
  timestamp: Date.now(),
  scenarioTime: getElapsedMinutes(session)
});
```

**Important:** This must happen BEFORE Strategy B pruning and AFTER AI response generation.

#### 1.3 Helper function for elapsed time

```javascript
function getElapsedMinutes(session) {
  if (!session.scenarioStartTime) return 0;
  return Math.round((Date.now() - session.scenarioStartTime) / 60000 * 10) / 10; // One decimal
}
```

---

### Task 2: Save Full Transcript to Performance Snapshot

**File:** `server/index.js`

**Location:** `/api/sessions/:id/next-scenario` endpoint (or wherever performance snapshot is created)

**Changes:**

Find where `scenarioPerformanceHistory.push()` happens:

```javascript
// MODIFY performance snapshot creation
const performanceSnapshot = {
  scenarioId: session.currentScenarioId,
  scenarioName: session.currentScenario?.metadata?.scenario_name || 'Unknown',
  
  // EXISTING structured data
  structuredMemory: { ...session.structuredMemory },
  cdpEvaluations: session.cdpEvaluations || [],
  stateHistory: session.stateHistory || [],
  criticalActionsLog: session.criticalActionsLog || [],
  medicationErrors: session.medicationErrors || [],
  score: session.score || null,
  
  // NEW: Full conversation transcript
  fullTranscript: [...session.fullTranscript],
  
  // NEW: Blueprint reference for loading at AAR time
  blueprintId: session.currentScenarioId,
  blueprintPath: session.currentScenario?._filePath || null,
  
  // Timing metadata
  startTime: session.scenarioStartTime,
  endTime: Date.now(),
  durationMinutes: Math.round((Date.now() - session.scenarioStartTime) / 60000 * 10) / 10
};

session.scenarioPerformanceHistory.push(performanceSnapshot);

// CLEAR fullTranscript for next scenario
session.fullTranscript = [];
```

---

### Task 3: Create Blueprint Loader Utility

**File:** `server/utils/blueprintLoader.js` (NEW FILE)

**Purpose:** Load full blueprint JSON files by ID or path

```javascript
// server/utils/blueprintLoader.js

import fs from 'fs';
import path from 'path';

const SCENARIOS_DIR = path.join(process.cwd(), 'scenarios', 'en');

/**
 * Load a full blueprint by scenario ID
 * @param {string} scenarioId - e.g., "asthma_patient_v2_0_final"
 * @returns {object|null} Full blueprint JSON or null if not found
 */
export function loadBlueprint(scenarioId) {
  try {
    // Try direct filename match
    const directPath = path.join(SCENARIOS_DIR, `${scenarioId}.json`);
    if (fs.existsSync(directPath)) {
      const content = fs.readFileSync(directPath, 'utf-8');
      return JSON.parse(content);
    }
    
    // Try searching directory for matching file
    const files = fs.readdirSync(SCENARIOS_DIR);
    const matchingFile = files.find(f => 
      f.includes(scenarioId) && f.endsWith('.json')
    );
    
    if (matchingFile) {
      const content = fs.readFileSync(path.join(SCENARIOS_DIR, matchingFile), 'utf-8');
      return JSON.parse(content);
    }
    
    console.warn(`Blueprint not found for scenario: ${scenarioId}`);
    return null;
  } catch (error) {
    console.error(`Error loading blueprint ${scenarioId}:`, error);
    return null;
  }
}

/**
 * Load multiple blueprints
 * @param {string[]} scenarioIds - Array of scenario IDs
 * @returns {object} Map of scenarioId -> blueprint
 */
export function loadBlueprints(scenarioIds) {
  const blueprints = {};
  for (const id of scenarioIds) {
    blueprints[id] = loadBlueprint(id);
  }
  return blueprints;
}

/**
 * Extract AAR-relevant sections from full blueprint
 * Reduces token usage while preserving essential educational content
 * @param {object} blueprint - Full blueprint JSON
 * @returns {object} Filtered blueprint with AAR-relevant sections
 */
export function extractAARRelevantContent(blueprint) {
  if (!blueprint) return null;
  
  return {
    metadata: blueprint.metadata || {},
    patient_profile: blueprint.patient_profile || {},
    
    // Educational content
    critical_decision_points: blueprint.critical_decision_points || {},
    critical_actions_checklist: blueprint.critical_actions_checklist || [],
    common_errors: blueprint.common_errors || [],
    challenge_points: blueprint.challenge_points || [],
    
    // State information for understanding patient progression
    patient_states: blueprint.patient_states || {},
    
    // Treatment information for understanding student actions
    medications_available: blueprint.medications_available || {},
    treatment_responses: blueprint.treatment_responses || {},
    
    // Optional: consequence templates if they exist
    consequence_templates: blueprint.consequence_templates || null,
    educational_gaps: blueprint.educational_gaps || null
  };
}
```

---

### Task 4: Create AAR Context Builder

**File:** `server/services/aarContextBuilder.js` (NEW FILE)

**Purpose:** Build comprehensive AAR context from all data sources

```javascript
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
        criticalActionsLog: perf.criticalActionsLog || [],
        medicationErrors: perf.medicationErrors || [],
        checklistResults: perf.checklistResults || [],
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
  contextString += `**Total Session Duration:** ${aarContext.sessionMetadata.totalDurationMinutes} minutes\n\n`;
  
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
      formatted += `- ${action.scenarioTime || action.time || '?'} min: ${action.action} (${action.category || 'general'})\n`;
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
    formatted += `**Final Score:** ${performance.score}%\n\n`;
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
```

---

### Task 5: Update AAR Initialization Endpoint

**File:** `server/index.js`

**Location:** `/api/sessions/:id/aar/start` endpoint

**Changes:**

```javascript
import { buildFullAARContext, formatAARContextForPrompt } from './services/aarContextBuilder.js';

// In the AAR start endpoint
app.post('/api/sessions/:id/aar/start', async (req, res) => {
  const session = sessions.get(req.params.id);
  
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }
  
  if (!session.scenarioPerformanceHistory || session.scenarioPerformanceHistory.length === 0) {
    return res.status(400).json({ error: 'No completed scenarios to review' });
  }
  
  try {
    // Build full AAR context
    const aarContext = buildFullAARContext(session);
    const formattedContext = formatAARContextForPrompt(aarContext);
    
    // Load AAR system prompt
    const aarSystemPrompt = fs.readFileSync('./prompts/aarAgent.txt', 'utf-8');
    
    // Combine system prompt with full context
    const fullSystemPrompt = `${aarSystemPrompt}\n\n${formattedContext}`;
    
    // Initialize AAR conversation
    session.aarMode = true;
    session.aarMessages = [];
    session.aarContext = aarContext; // Store for potential follow-up queries
    
    // Get opening message from Claude
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      system: fullSystemPrompt,
      messages: [
        { role: 'user', content: 'Begin the AAR session. Start with Phase 1: Opening.' }
      ]
    });
    
    const aarMessage = response.content[0].text;
    
    // Store in AAR message history
    session.aarMessages.push(
      { role: 'user', content: 'Begin the AAR session.' },
      { role: 'assistant', content: aarMessage }
    );
    
    res.json({
      success: true,
      message: aarMessage,
      scenariosReviewed: aarContext.totalScenarios,
      aarComplete: aarMessage.includes('[AAR_COMPLETE]')
    });
    
  } catch (error) {
    console.error('AAR initialization error:', error);
    res.status(500).json({ error: 'Failed to initialize AAR' });
  }
});
```

---

### Task 6: Update AAR Message Endpoint

**File:** `server/index.js`

**Location:** `/api/sessions/:id/aar/message` endpoint

**Changes:**

```javascript
app.post('/api/sessions/:id/aar/message', async (req, res) => {
  const session = sessions.get(req.params.id);
  const { message } = req.body;
  
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }
  
  if (!session.aarMode) {
    return res.status(400).json({ error: 'AAR session not started' });
  }
  
  try {
    // Add user message to history
    session.aarMessages.push({ role: 'user', content: message });
    
    // Rebuild context (in case we need it fresh)
    const formattedContext = formatAARContextForPrompt(session.aarContext);
    const aarSystemPrompt = fs.readFileSync('./prompts/aarAgent.txt', 'utf-8');
    const fullSystemPrompt = `${aarSystemPrompt}\n\n${formattedContext}`;
    
    // Send to Claude with full conversation history
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      system: fullSystemPrompt,
      messages: session.aarMessages
    });
    
    const aarResponse = response.content[0].text;
    
    // Store assistant response
    session.aarMessages.push({ role: 'assistant', content: aarResponse });
    
    // Check for completion
    const aarComplete = aarResponse.includes('[AAR_COMPLETE]');
    
    res.json({
      success: true,
      message: aarResponse.replace('[AAR_COMPLETE]', '').trim(),
      aarComplete
    });
    
  } catch (error) {
    console.error('AAR message error:', error);
    res.status(500).json({ error: 'Failed to process AAR message' });
  }
});
```

---

### Task 7: Update AAR Agent System Prompt

**File:** `server/prompts/aarAgent.txt`

**Add these sections to the existing prompt:**

```text
# FULL CONTEXT ACCESS

You have complete access to:
1. **Full Blueprints** - All critical decision points, checklists, common errors, teaching points, and clinical anchors
2. **Full Transcripts** - Every exchange between student and AI during scenarios, with timestamps
3. **Structured Performance Data** - CDP evaluations, action logs, state history, medication errors
4. **Cross-Scenario Patterns** - Behavioral patterns detected across multiple scenarios

## Using Full Context

### Referencing Transcripts
When discussing student performance, quote directly from the transcript:
- "At minute 3, you said 'I'm not sure which oxygen device to use'—this shows appropriate uncertainty recognition"
- "The transcript shows you asked about SpO2 normals, which is a good learning instinct"

### Referencing Blueprints
Use blueprint content for educational depth:
- Reference clinical_anchor phrases for memorable takeaways
- Use common_errors teaching_points when explaining gaps
- Connect CDP evaluations to aar_teaching_point content

### Patient-Specific Feedback
Always personalize feedback to THIS patient and THIS scenario:
- Reference the patient by name when appropriate
- Cite actual vital signs from the scenario
- Describe actual patient responses from the transcript
- Connect student actions to patient outcomes visible in state history

AVOID generic statements like:
- "Oxygen should be given early"
- "Reassessment is important"

PREFER specific statements like:
- "Maria's SpO2 was 84% by the time you applied oxygen—2 minutes of additional hypoxic damage"
- "After salbutamol, you never rechecked her breathing. The transcript shows you moved directly to history taking"

### Using Clinical Anchors
When blueprints include clinical_anchor fields, use these memorable phrases in your feedback:
- They are carefully crafted by medical experts
- They are designed to be memorable and "sticky"
- Weave them naturally into your explanations

Example:
"Remember: 'Wheeze means air moving—concerning but alive. Silence means no air moving—minutes from arrest.' You recognized the wheeze but didn't escalate when it went silent."

## Answering Student Questions

With full context, you can answer ANY question about the student's performance:
- "Why did I hesitate there?" → Reference transcript for their actual words/questions
- "What should I have done differently?" → Reference blueprint checklist and timing targets
- "Was my reasoning correct?" → Reference CDP evaluations and transcript reasoning
- "Show me the moment things went wrong" → Quote specific transcript exchanges with timestamps
```

---

### Task 8: Add Import Statements

**File:** `server/index.js`

**Add at top of file:**

```javascript
import { buildFullAARContext, formatAARContextForPrompt } from './services/aarContextBuilder.js';
import { loadBlueprint } from './utils/blueprintLoader.js';
import { findChecklistMatch } from './utils/checklistMatcher.js';
```

---

# PHASE 2: CHECKLIST MATCHING (2-3 hours)

---

### Task 9: Create Checklist Matcher Utility

**File:** `server/utils/checklistMatcher.js` (NEW FILE)

**Purpose:** Match student actions to blueprint checklist items deterministically

```javascript
// server/utils/checklistMatcher.js

/**
 * Match a student action to a checklist item
 * Uses keyword matching with blueprint-defined or default keywords
 * 
 * @param {string} action - Detected action string from structured memory
 * @param {array} checklist - Blueprint's critical_actions_checklist
 * @returns {object|null} Matched checklist item with match confidence, or null
 */
export function findChecklistMatch(action, checklist) {
  if (!action || !checklist || checklist.length === 0) {
    return null;
  }
  
  const actionLower = action.toLowerCase();
  
  for (const item of checklist) {
    const keywords = getKeywordsForChecklistItem(item);
    const matchedKeyword = keywords.find(kw => actionLower.includes(kw.toLowerCase()));
    
    if (matchedKeyword) {
      return {
        ...item,
        matchedKeyword,
        matchConfidence: item.matching ? 'high' : 'medium'
      };
    }
  }
  
  return null;
}

/**
 * Get keywords for matching a checklist item
 * Priority: blueprint-defined keywords > generated keywords
 * 
 * @param {object} checklistItem - Single checklist item from blueprint
 * @returns {array} Array of keywords to match against
 */
function getKeywordsForChecklistItem(checklistItem) {
  // If blueprint has explicit matching config, use it
  if (checklistItem.matching?.keywords) {
    const allKeywords = [
      ...(checklistItem.matching.keywords || []),
      ...(checklistItem.matching.synonyms || []),
      ...(checklistItem.matching.tool_mappings || [])
    ];
    return allKeywords;
  }
  
  // Otherwise, generate keywords from action text and category
  return generateDefaultKeywords(checklistItem);
}

/**
 * Generate default keywords when blueprint doesn't specify them
 * @param {object} checklistItem - Checklist item
 * @returns {array} Generated keywords
 */
function generateDefaultKeywords(checklistItem) {
  const actionLower = checklistItem.action.toLowerCase();
  const category = checklistItem.category?.toLowerCase() || '';
  
  // Default keyword mappings for common medical actions
  const defaultMappings = {
    // Oxygen-related
    'oxygen': ['oxygen', 'o2', 'non-rebreather', 'nrb', 'nasal cannula', 'high-flow', 'mask'],
    'high-flow': ['high-flow', 'high flow', '15l', '15 l', 'non-rebreather'],
    
    // Medications
    'salbutamol': ['salbutamol', 'albuterol', 'ventolin', 'bronchodilator', 'nebulizer', 'neb'],
    'corticosteroid': ['steroid', 'corticosteroid', 'hydrocortisone', 'methylprednisolone', 'dexamethasone', 'prednisolone'],
    'adrenaline': ['adrenaline', 'epinephrine', 'epi'],
    'aspirin': ['aspirin', 'asa'],
    'nitro': ['nitro', 'nitroglycerin', 'gtn', 'nitrate'],
    
    // Assessment
    'abcde': ['abcde', 'abc', 'primary survey', 'systematic assessment'],
    'sample': ['sample', 'history', 'allergies', 'medications', 'past medical'],
    'vital': ['vitals', 'vital signs', 'blood pressure', 'bp', 'pulse', 'heart rate', 'hr', 'spo2', 'respiratory rate', 'rr'],
    'auscultation': ['auscultate', 'auscultation', 'listen', 'breath sounds', 'lung sounds', 'chest sounds'],
    
    // Scene/Safety
    'scene': ['scene', 'safety', 'safe', 'hazard', 'bsi', 'ppe'],
    
    // Monitoring
    'ecg': ['ecg', 'ekg', 'cardiac monitor', '12-lead', '12 lead', 'rhythm'],
    'monitor': ['monitor', 'reassess', 'recheck', 're-assess', 're-check'],
    
    // IV/Access
    'iv': ['iv', 'intravenous', 'cannula', 'access', 'line'],
    
    // Airway
    'airway': ['airway', 'bvm', 'bag valve', 'intubate', 'suction'],
    
    // C-spine
    'spine': ['c-spine', 'cspine', 'cervical', 'spine', 'immobilization', 'collar']
  };
  
  // Find matching default keywords
  for (const [key, keywords] of Object.entries(defaultMappings)) {
    if (actionLower.includes(key)) {
      return keywords;
    }
  }
  
  // Fallback: extract significant words from action (4+ characters)
  const words = actionLower
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length >= 4);
  
  return words.length > 0 ? words : [actionLower];
}

/**
 * Check if action should be excluded from matching (negations)
 * @param {string} action - Action string
 * @param {object} checklistItem - Checklist item with potential exclusion keywords
 * @returns {boolean} True if action should be excluded
 */
export function shouldExcludeAction(action, checklistItem) {
  const exclusionKeywords = checklistItem.matching?.exclusion_keywords || [
    "don't", "dont", "not yet", "haven't", "havent", "won't", "wont",
    "shouldn't", "shouldnt", "wouldn't", "wouldnt", "no ", "didn't", "didnt"
  ];
  
  const actionLower = action.toLowerCase();
  return exclusionKeywords.some(kw => actionLower.includes(kw));
}

/**
 * Calculate points based on timing
 * @param {object} checklistItem - Checklist item with points and time_target_minutes
 * @param {number} actualTime - Actual time action was performed (minutes)
 * @returns {number} Points earned
 */
export function calculatePoints(checklistItem, actualTime) {
  if (!checklistItem.points) return 0;
  
  const target = checklistItem.time_target_minutes;
  
  if (!target || actualTime <= target) {
    return checklistItem.points; // Full points if on time or no target
  }
  
  // Graduated scoring based on how late
  const minutesLate = actualTime - target;
  
  if (minutesLate <= 2) {
    return Math.round(checklistItem.points * 0.75); // 75% if 1-2 min late
  } else if (minutesLate <= 5) {
    return Math.round(checklistItem.points * 0.5); // 50% if 3-5 min late
  } else {
    return Math.round(checklistItem.points * 0.25); // 25% if >5 min late
  }
}

export default {
  findChecklistMatch,
  shouldExcludeAction,
  calculatePoints
};
```

---

### Task 10: Enhance addMemoryAction() for Checklist Tracking

**File:** `server/index.js`

**Location:** Find existing `addMemoryAction()` function (around line 2400-2420)

**Changes:** Modify to include checklist matching

```javascript
// REPLACE existing addMemoryAction function with this enhanced version

function addMemoryAction(session, action) {
  const elapsedMinutes = getElapsedMinutes(session);
  const checklist = session.currentScenario?.critical_actions_checklist || [];
  
  // NEW: Match action to checklist item
  const match = findChecklistMatch(action.action || action.type, checklist);
  
  // NEW: Check for exclusion (negations like "don't give oxygen")
  const isExcluded = match ? shouldExcludeAction(action.action || '', match) : false;
  
  // Build enriched action object
  const enrichedAction = {
    time: elapsedMinutes,
    timestamp: Date.now(),
    ...action,
    
    // NEW: Checklist mapping metadata
    checklistId: (!isExcluded && match) ? match.id : null,
    checklistAction: (!isExcluded && match) ? match.action : null,
    targetTime: match?.time_target_minutes || null,
    onTime: (!isExcluded && match) ? (elapsedMinutes <= match.time_target_minutes) : null,
    importance: match?.importance || null,
    matchConfidence: match?.matchConfidence || null
  };
  
  // Add to structured memory
  session.structuredMemory.criticalActions.push(enrichedAction);
  
  // NEW: Track in checklistResults for easy AAR access
  if (match && !isExcluded) {
    // Only add if not already tracked (avoid duplicates)
    const alreadyTracked = session.checklistResults?.find(r => r.id === match.id);
    
    if (!alreadyTracked) {
      // Initialize checklistResults if needed
      if (!session.checklistResults) {
        session.checklistResults = [];
      }
      
      session.checklistResults.push({
        id: match.id,
        action: match.action,
        category: match.category || 'general',
        completed: true,
        time: elapsedMinutes,
        target: match.time_target_minutes,
        onTime: elapsedMinutes <= match.time_target_minutes,
        minutesLate: Math.max(0, elapsedMinutes - match.time_target_minutes),
        points: calculatePoints(match, elapsedMinutes),
        maxPoints: match.points || 0,
        importance: match.importance,
        matchedAction: action.action || action.type,
        matchConfidence: match.matchConfidence
      });
    }
  }
}

// Helper function (add if not exists)
function getElapsedMinutes(session) {
  if (!session.scenarioStartTime) return 0;
  return Math.round((Date.now() - session.scenarioStartTime) / 60000 * 10) / 10;
}
```

**Also:** Initialize `checklistResults` in session creation:

```javascript
// In session initialization (around line 200-250)
const session = {
  // ... existing properties ...
  
  fullTranscript: [],        // From Phase 1
  checklistResults: [],      // NEW: Phase 2
  
  // ... rest of session ...
};
```

---

### Task 11: Generate Checklist Summary at Scenario End

**File:** `server/index.js`

**Location:** In `/api/sessions/:id/next-scenario` endpoint, before creating performance snapshot

**Add new function:**

```javascript
/**
 * Generate comprehensive checklist summary at scenario end
 * Includes completed items, missed items, and scoring
 * 
 * @param {object} session - Current session
 * @returns {object} Checklist summary
 */
function generateChecklistSummary(session) {
  const checklist = session.currentScenario?.critical_actions_checklist || [];
  const completed = session.checklistResults || [];
  
  // Identify missed items (in checklist but not in completed)
  const missed = checklist
    .filter(item => !completed.find(c => c.id === item.id))
    .map(item => ({
      id: item.id,
      action: item.action,
      category: item.category || 'general',
      completed: false,
      target: item.time_target_minutes,
      importance: item.importance,
      points: 0,
      maxPoints: item.points || 0
    }));
  
  // Calculate totals
  const totalPoints = completed.reduce((sum, c) => sum + (c.points || 0), 0);
  const maxPoints = checklist.reduce((sum, c) => sum + (c.points || 0), 0);
  const onTimeCount = completed.filter(c => c.onTime).length;
  const lateCount = completed.filter(c => !c.onTime).length;
  
  // Identify critical misses
  const criticalMissed = missed.filter(m => m.importance === 'critical');
  const essentialMissed = missed.filter(m => m.importance === 'essential');
  
  return {
    // Item lists
    completed: completed.sort((a, b) => a.time - b.time),
    missed: missed,
    
    // Counts
    totalItems: checklist.length,
    completedCount: completed.length,
    missedCount: missed.length,
    onTimeCount,
    lateCount,
    
    // Scoring
    totalPoints,
    maxPoints,
    percentageScore: maxPoints > 0 ? Math.round((totalPoints / maxPoints) * 100) : 0,
    
    // Critical analysis
    criticalMissed: criticalMissed.map(m => m.action),
    essentialMissed: essentialMissed.map(m => m.action),
    hasCriticalMisses: criticalMissed.length > 0,
    
    // Timing analysis
    averageDelay: lateCount > 0 
      ? Math.round(completed.filter(c => !c.onTime).reduce((sum, c) => sum + c.minutesLate, 0) / lateCount * 10) / 10
      : 0
  };
}
```

**Modify performance snapshot creation:**

```javascript
// In /next-scenario endpoint, REPLACE the performanceSnapshot creation

// Generate checklist summary before creating snapshot
const checklistSummary = generateChecklistSummary(session);

const performanceSnapshot = {
  scenarioId: session.currentScenarioId,
  scenarioName: session.currentScenario?.metadata?.scenario_name || 'Unknown',
  
  // Existing structured data
  structuredMemory: { ...session.structuredMemory },
  cdpEvaluations: session.cdpEvaluations || [],
  stateHistory: session.stateHistory || [],
  criticalActionsLog: session.criticalActionsLog || [],
  medicationErrors: session.medicationErrors || [],
  score: session.score || null,
  
  // Phase 1: Full transcript
  fullTranscript: [...session.fullTranscript],
  blueprintId: session.currentScenarioId,
  blueprintPath: session.currentScenario?._filePath || null,
  
  // Phase 2: Checklist results (NEW)
  checklistResults: [...(session.checklistResults || [])],
  checklistSummary: checklistSummary,
  
  // Timing metadata
  startTime: session.scenarioStartTime,
  endTime: Date.now(),
  durationMinutes: Math.round((Date.now() - session.scenarioStartTime) / 60000 * 10) / 10
};

session.scenarioPerformanceHistory.push(performanceSnapshot);

// Clear for next scenario
session.fullTranscript = [];
session.checklistResults = [];  // NEW: Clear checklist results too
```

---

### Task 12: Update AAR Context Builder for Checklist Data

**File:** `server/services/aarContextBuilder.js`

**Location:** Modify `formatPerformanceData()` function to include checklist summary

**Add this section to `formatPerformanceData()`:**

```javascript
function formatPerformanceData(performance) {
  let formatted = '';
  
  // NEW: Checklist Summary (add at the beginning for prominence)
  if (performance.checklistSummary) {
    const cs = performance.checklistSummary;
    formatted += `**Checklist Performance:**\n`;
    formatted += `- Score: ${cs.totalPoints}/${cs.maxPoints} points (${cs.percentageScore}%)\n`;
    formatted += `- Completed: ${cs.completedCount}/${cs.totalItems} actions\n`;
    formatted += `- On Time: ${cs.onTimeCount}, Late: ${cs.lateCount}\n`;
    
    if (cs.hasCriticalMisses) {
      formatted += `- ⚠️ CRITICAL ACTIONS MISSED: ${cs.criticalMissed.join(', ')}\n`;
    }
    if (cs.essentialMissed.length > 0) {
      formatted += `- Essential actions missed: ${cs.essentialMissed.join(', ')}\n`;
    }
    if (cs.averageDelay > 0) {
      formatted += `- Average delay (late actions): ${cs.averageDelay} minutes\n`;
    }
    formatted += '\n';
  }
  
  // NEW: Detailed Checklist Results
  if (performance.checklistResults?.length > 0) {
    formatted += `**Checklist Details (Completed):**\n`;
    for (const item of performance.checklistResults) {
      const timing = item.onTime 
        ? `✅ on time` 
        : `⚠️ ${item.minutesLate.toFixed(1)} min late`;
      formatted += `- ${item.id}: ${item.action}\n`;
      formatted += `  Time: ${item.time.toFixed(1)} min (target: ${item.target} min) - ${timing}\n`;
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
  
  // ... rest of existing formatPerformanceData code (CDP Evaluations, etc.) ...
```

---

### Task 13: Update AAR Prompt for Checklist Usage

**File:** `server/prompts/aarAgent.txt`

**Add this section after the "Using Full Context" section:**

```text
## Using Checklist Data

You have pre-computed checklist performance data. USE IT for accurate, specific feedback.

### Checklist Summary
For each scenario, you have:
- `checklistSummary.percentageScore` - Overall checklist completion percentage
- `checklistSummary.completedCount` / `totalItems` - How many actions completed
- `checklistSummary.criticalMissed` - List of critical actions NOT performed
- `checklistSummary.averageDelay` - Average minutes late for delayed actions

### Checklist Details
For each completed action:
- `time` - When student performed it (minutes)
- `target` - When it should have been performed
- `onTime` - Boolean: was it within target?
- `minutesLate` - How many minutes after target
- `points` - Points earned (reduced if late)

### How to Use Checklist Data

**For "What did I miss?" questions:**
Reference `checklistSummary.missed` array directly:
"You missed 3 critical actions: C-spine stabilization, 12-lead ECG, and reassessment after treatment."

**For "Was I too slow?" questions:**
Reference specific checklist items:
"Oxygen was given at 8.2 minutes—that's 6.2 minutes past the 2-minute target. You earned 7/15 points due to the delay."

**For scoring discussions:**
"Your checklist score was 65%: 52 out of 80 possible points. The main point losses were from delayed oxygen (-8 points) and missed reassessment (-5 points)."

**IMPORTANT:** Trust the checklist data. It was computed deterministically from the transcript. Don't try to re-analyze timing from the raw transcript—use the pre-computed results.
```

---

## Testing Plan

### Phase 1 Tests

### Test 1: Transcript Storage

1. Start a scenario session
2. Send 5-10 messages
3. Check `session.fullTranscript` contains all exchanges
4. Verify timestamps and scenarioTime are populated

### Test 2: Performance Snapshot

1. Complete a scenario (trigger next-scenario)
2. Check `session.scenarioPerformanceHistory[0]`
3. Verify it contains:
   - `fullTranscript` with all messages
   - `blueprintId`
   - All existing performance data

### Test 3: Blueprint Loading

1. Call `loadBlueprint('asthma_patient_v2_0_final')`
2. Verify full blueprint JSON is returned
3. Test `extractAARRelevantContent()` returns filtered object

### Test 4: AAR Context Building

1. Complete 2 scenarios
2. Call `buildFullAARContext(session)`
3. Verify context contains:
   - Both scenarios with blueprints
   - Both full transcripts
   - All performance data
   - Cross-scenario patterns

### Test 5: Full AAR Flow

1. Complete 2 scenarios
2. Call `/api/sessions/:id/aar/start`
3. Verify AAR responds with scenario-specific content
4. Ask "What did I say when the patient got worse?"
5. Verify AAR quotes from transcript

### Phase 2 Tests

### Test 6: Checklist Matching

1. Call `findChecklistMatch('applying oxygen via non-rebreather', asthmaChecklist)`
2. Verify returns CA3 (oxygen action)
3. Test with variations: "o2", "high-flow", "nrb"
4. Test exclusion: "don't give oxygen yet" should return null or be excluded

### Test 7: Checklist Results Population

1. Start scenario session
2. Trigger action detection for "oxygen applied"
3. Check `session.checklistResults` contains entry with:
   - `id: 'CA3'`
   - `completed: true`
   - `time` populated
   - `onTime` calculated correctly

### Test 8: Checklist Summary Generation

1. Complete scenario with some actions completed, some missed
2. Call `generateChecklistSummary(session)`
3. Verify:
   - `completed` array has correct items
   - `missed` array has uncompleted items
   - `percentageScore` calculated correctly
   - `criticalMissed` identifies critical importance items

### Test 9: AAR with Checklist Data

1. Complete 2 scenarios
2. Start AAR
3. Ask "What critical actions did I miss?"
4. Verify AAR references `checklistSummary.criticalMissed`
5. Ask "Was I too slow with oxygen?"
6. Verify AAR cites exact timing from checklistResults

---

## Token Usage Estimates

| Component | Tokens (per scenario) |
|-----------|----------------------|
| Blueprint (filtered) | ~3,000-4,000 |
| Transcript (25 exchanges) | ~3,000-5,000 |
| Performance data | ~500-1,000 |
| **Per scenario total** | ~6,500-10,000 |
| **2 scenarios** | ~13,000-20,000 |
| System prompt | ~2,000 |
| **Total input** | ~15,000-22,000 |

**Cost estimate:** ~$0.05-0.08 input + ~$0.05-0.10 output = **~$0.10-0.18 per AAR session**

This is well within acceptable range for a premium educational product.

---

## File Summary

### New Files to Create

| File | Purpose | Phase |
|------|---------|-------|
| `server/utils/blueprintLoader.js` | Load and filter blueprints | Phase 1 |
| `server/services/aarContextBuilder.js` | Build full AAR context | Phase 1 |
| `server/utils/checklistMatcher.js` | Match actions to checklist items | Phase 2 |

### Files to Modify

| File | Changes | Phase |
|------|---------|-------|
| `server/index.js` | Add fullTranscript storage, update AAR endpoints | Phase 1 |
| `server/index.js` | Enhance addMemoryAction(), add generateChecklistSummary() | Phase 2 |
| `server/services/aarContextBuilder.js` | Add checklist data formatting | Phase 2 |
| `server/prompts/aarAgent.txt` | Add full context + checklist instructions | Both |

---

## Implementation Order

### Phase 1: Full Context AAR (6-8 hours)

1. **Task 1** - Add fullTranscript storage (30 min)
2. **Task 2** - Save transcript to performance snapshot (30 min)
3. **Task 3** - Create blueprint loader (45 min)
4. **Task 4** - Create AAR context builder (1.5 hrs)
5. **Task 5** - Update AAR start endpoint (45 min)
6. **Task 6** - Update AAR message endpoint (30 min)
7. **Task 7** - Update AAR prompt (30 min)
8. **Task 8** - Add imports, test Phase 1 (1 hr)

### Phase 2: Checklist Matching (2-3 hours)

9. **Task 9** - Create checklist matcher utility (45 min)
10. **Task 10** - Enhance addMemoryAction() (30 min)
11. **Task 11** - Add generateChecklistSummary() (30 min)
12. **Task 12** - Update AAR context builder for checklist data (30 min)
13. **Task 13** - Update AAR prompt for checklist usage (15 min)
14. **Testing** - Test Phase 2 (30 min)

**Total estimated time: 8-11 hours**

---

## Success Criteria

### Phase 1: Full Context
- [ ] Full transcript survives Strategy B pruning
- [ ] Performance snapshot includes complete transcript
- [ ] AAR can quote specific student messages
- [ ] AAR references blueprint content appropriately
- [ ] AAR provides patient-specific feedback
- [ ] Token usage is within estimates

### Phase 2: Checklist Matching
- [ ] Actions are matched to checklist items during scenario
- [ ] checklistResults populated with timing data
- [ ] checklistSummary generated at scenario end
- [ ] AAR can answer "What did I miss?" with specific items
- [ ] AAR can answer "Was I too slow?" with exact timing
- [ ] AAR cites pre-computed data, not re-analyzing transcript

### Overall
- [ ] No regression in scenario performance
- [ ] AAR quality improvement measurable in student feedback
- [ ] Complete data gap problem solved (dialogue + checklist)

---

## What AAR Can Now Answer

| Question | Data Source | Answer Type |
|----------|-------------|-------------|
| "What did I say when patient got worse?" | Transcript | Quoted text |
| "Why did I hesitate?" | Transcript | Narrative analysis |
| "Did I complete oxygen?" | checklistResults | ✅ Yes at 8 min (target 2 min) |
| "Was I too slow?" | checklistResults | Yes, 6 minutes late |
| "What did I miss?" | checklistSummary.missed | CA7, CA8 |
| "How did I score?" | checklistSummary | 65/100 points |
| "What's the teaching point for this?" | Blueprint clinical_anchor | Memorable phrase |
