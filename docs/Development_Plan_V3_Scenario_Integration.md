# Development Plan: V3.0 Scenario Integration

**Document Version:** 2.0
**Created:** January 2025
**Last Updated:** January 2025
**Status:** Ready for Implementation
**Estimated Effort:** ~320 lines of code changes

**Alignment:** This document is fully aligned with the **Performance Assessment System V3.0 Implementation Guide** and uses outcome-based, patient-state assessment philosophy.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Background: Why These Changes Are Needed](#2-background-why-these-changes-are-needed)
3. [Part 3: Medication Safety Direct Integration](#3-part-3-medication-safety-direct-integration)
4. [Part 3 Bonus: V3.0 Rich Data in Core Agent](#4-part-3-bonus-v30-rich-data-in-core-agent)
5. [Part 4: Outcome-Based Consequence Feedback](#5-part-4-outcome-based-consequence-feedback)
6. [Implementation Order](#6-implementation-order)
7. [Testing Strategy](#7-testing-strategy)
8. [Risk Assessment](#8-risk-assessment)

---

## 1. Executive Summary

### What We're Doing

We are updating the Know Thyself MVP system to fully utilize the new V3.0 scenario blueprint structure. The V3.0 scenarios contain richer, more detailed data that the current codebase cannot access due to structural mismatches.

### Philosophy Alignment

This plan follows the **outcome-based assessment philosophy** from the Performance Assessment System V3.0:

| Principle | Implementation |
|-----------|----------------|
| **No points** | Severity levels (critical_harm, worsens) instead of point deductions |
| **No arbitrary time thresholds** | Patient state at action time determines assessment |
| **Patient outcomes matter** | Feedback describes what happened to the patient |
| **Safety Gate integration** | Dangerous medications are Safety Gate failures |

### Three Key Changes

| Change | Problem Solved | Benefit |
|--------|---------------|---------|
| **Medication Safety Direct Integration** | Current code looks for `dangerous_medications` array, but V3.0 uses `secondary_medications_by_impact` | Dangerous medications detected as Safety Gate failures |
| **V3.0 Rich Data in Core Agent** | V3.0 has `patient_response` and `vital_changes` for each medication error, but Core Agent doesn't use them | More realistic, educational AI responses showing patient deterioration |
| **Outcome-Based Consequence Feedback** | V3.0 consequence templates need patient-state variables | AAR Agent shows what happened to patient, not arbitrary time comparisons |

### Expected Outcomes

1. **Medication errors detected as Safety Gate failures** - Critical medication errors trigger Safety Gate, addressed with HIGH PRIORITY in AAR
2. **Core Agent shows realistic patient deterioration** - AI describes specific adverse reactions using V3.0 data
3. **AAR shows patient-focused feedback** - "When you applied oxygen, Maria was in a deteriorating state with SpO2 of 82%..." (not "You were 4.2 minutes late")

---

## 2. Background: Why These Changes Are Needed

### 2.1 The Structure Mismatch Problem

When we created the V3.0 scenarios, we introduced a better, richer data structure. However, the existing code was written for an older structure.

**Medication Safety Mismatch:**

```
CURRENT CODE EXPECTS:                    V3.0 SCENARIOS HAVE:
─────────────────────                    ────────────────────
{                                        {
  "dangerous_medications": [               "secondary_medications_by_impact": {
    {                                        "critical_harm": [
      "medication": "Diazepam",                {
      "keywords": ["diazepam", "apaurin"],       "name": "apaurin",
      "reason": "...",                           "generic_name": "Diazepam",
      "severity": "high"                         "why_dangerous": "...",
    }                                            "if_given": {
  ]                                                "vital_changes": {...},
}                                                  "patient_response": "...",
                                                   "state_change": "critical"
                                                 }
                                               }
                                             ],
                                             "worsens": [...],
                                             "neutral": [...]
                                           }
                                         }
```

**Result:** `scenario.dangerous_medications` returns `undefined`, so `checkMedicationSafety()` always returns `null`. Medication errors are NEVER detected.

### 2.2 Why Direct Integration Over Adapter?

| Approach | Description | Verdict |
|----------|-------------|---------|
| **Adapter** | Create function to convert V3.0 → legacy format | Rejected |
| **Direct Integration** | Rewrite code to read V3.0 structure directly | Chosen |

**Why Direct Integration Wins:**

1. **Durability** - No translation layer to maintain
2. **Robustness** - Single data source; fails obviously if structure changes
3. **Simplicity** - Just change where code looks for data
4. **Rich Data Access** - Can use V3.0's `patient_response`, `vital_changes`, `state_change` directly
5. **Safety Gate Integration** - Maps directly to V3.0's severity levels

### 2.3 The Unused Rich Data Problem

V3.0 scenarios contain detailed information about what happens when dangerous medications are given:

```json
"if_given": {
  "vital_changes": {
    "SpO2": 73,
    "RR": 18,
    "GCS": 10
  },
  "patient_response": "Patient becomes drowsy, breathing slows further, oxygen level plummets. The benzodiazepine has suppressed her already-failing respiratory drive.",
  "clinical_note": "Benzodiazepine causes respiratory depression. Critical medication error.",
  "state_change": "critical",
  "aar_flag": "dangerous_medication"
}
```

**Currently:** This data is completely ignored. Core Agent makes up its own response.

**After Changes:** Core Agent receives exact `patient_response` text and `vital_changes` to create accurate, educational feedback. The `state_change` triggers Safety Gate tracking.

### 2.4 Outcome-Based Feedback Philosophy

**DEPRECATED (Time-Based):**
> "Oxygen was applied at 7.2 minutes—4.2 minutes past the 3-minute critical window."

**NEW (Outcome-Based):**
> "When oxygen was applied, Maria was in a deteriorating state with SpO2 of 82%. The drop from initial 88% represents preventable hypoxic damage."

| Old Approach | New Approach |
|--------------|--------------|
| Focus on arbitrary time thresholds | Focus on patient state at action |
| Punitive ("you were X minutes late") | Educational ("here's what happened to the patient") |
| Creates anxiety | Creates understanding |
| `{delay_minutes}`, `{target_time}` | `{patient_state_at_action}`, `{spo2_at_action}` |

---

## 3. Part 3: Medication Safety Direct Integration

### 3.1 Objective

Replace the current medication safety system with direct integration that:
1. Reads V3.0's `secondary_medications_by_impact` structure
2. Logs critical_harm medications as **Safety Gate failures**
3. Returns rich data for Core Agent responses

### 3.2 Current State Analysis

**File:** `server/index.js`

**Current Function:** `checkMedicationSafety()` (lines 1577-1641)

```javascript
function checkMedicationSafety(session, userMessage) {
  const scenario = session.scenario;
  const dangerousMeds = scenario.dangerous_medications || [];  // Always empty!

  if (dangerousMeds.length === 0) return null;  // Always returns here
  // ... rest never executes
}
```

### 3.3 New Function: `checkMedicationSafety_V3()`

**Purpose:** Directly read V3.0 medication structure, detect dangerous medications, and log Safety Gate failures.

**Location:** After current `checkMedicationSafety()` (after line 1641)

**Pseudocode:**

```
FUNCTION checkMedicationSafety_V3(session, userMessage):
    IF no scenario loaded THEN return null

    secondaryMeds = scenario.secondary_medications_by_impact
    IF no secondaryMeds THEN return null

    lowerMessage = userMessage.toLowerCase()
    detectedIssues = []

    // Process CRITICAL HARM medications (Safety Gate failures)
    FOR each med IN secondaryMeds.critical_harm:
        IF detectMedicationMention(med, lowerMessage):
            issue = createMedicationIssue(med, "critical_harm", session)
            applyVitalChanges(session, med.if_given.vital_changes)
            updatePatientState(session, med.if_given.state_change)
            logSafetyGateFailure(session, med)  // NEW: Safety Gate integration
            detectedIssues.push(issue)

    // Process WORSENS medications (tracked but not Safety Gate)
    FOR each med IN secondaryMeds.worsens:
        IF detectMedicationMention(med, lowerMessage):
            issue = createMedicationIssue(med, "worsens", session)
            applyVitalChanges(session, med.if_given.vital_changes)
            detectedIssues.push(issue)

    // Track NEUTRAL medications (for teaching opportunities only)
    FOR each med IN secondaryMeds.neutral:
        IF detectMedicationMention(med, lowerMessage):
            session.medicationNotes.push(createNote(med))

    RETURN detectedIssues if any, else null
```

### 3.4 Helper Functions

#### 3.4.1 `detectMedicationMention(med, lowerMessage)`

**Purpose:** Check if medication is mentioned in user message.

**Brand Name Mapping:**

```javascript
const BRAND_VARIANTS = {
  'diazepam': ['apaurin', 'valium', 'seduxen'],
  'morphine': ['morphin', 'mst', 'oramorph'],
  'propranolol': ['inderal'],
  'metoprolol': ['betaloc', 'lopressor'],
  'flumazenil': ['anexate'],
  'naloxone': ['narcan', 'nyxoid'],
  'epinephrine': ['adrenaline', 'adrenalin', 'epipen', 'jext'],
  'salbutamol': ['albuterol', 'ventolin'],
  'insulin': ['novorapid', 'lantus', 'humalog', 'actrapid'],
  'hydrocortisone': ['solu-cortef'],
  'methylprednisolone': ['solu-medrol'],
  'midazolam': ['dormicum'],
  'lorazepam': ['ativan'],
  'fentanyl': ['durogesic', 'actiq'],
  'ketamine': ['ketalar'],
  'atropine': ['atropin']
};
```

**Logic:**
1. Check if `med.name` is in message
2. Check if `med.generic_name` is in message
3. Check brand variants based on generic name

#### 3.4.2 `createMedicationIssue(med, severity, session)`

**Purpose:** Create structured issue object with V3.0 rich data (NO POINTS).

**Output Structure:**
```javascript
{
  // Core identification
  medication: "Diazepam",
  matchedName: "apaurin",

  // Severity (NOT points)
  severity: "critical_harm",  // or "worsens"
  reason: "Respiratory depressant in patient with respiratory failure",

  // V3.0 Rich Data for Core Agent
  patient_response: "Patient becomes drowsy, breathing slows further...",
  vital_changes: { SpO2: 73, RR: 18, GCS: 10 },
  clinical_note: "Benzodiazepine causes respiratory depression.",
  state_change: "critical",

  // Safety Gate Data (for AAR)
  is_safety_gate_failure: true,  // if critical_harm
  aar_teaching_point: "Never give sedatives to patients in respiratory failure.",

  // Context
  patient_state_at_action: session.currentPatientState,
  timestamp: Date.now(),
  elapsedMinutes: getElapsedMinutes(session)
}
```

**Note:** No `points` field - assessment is by severity level and Safety Gate status.

#### 3.4.3 `applyVitalChanges(session, vitalChanges)`

**Purpose:** Update session.currentVitals with V3.0 specified changes.

**Why Needed:** When dangerous medication given, vitals should immediately reflect the adverse effect.

#### 3.4.4 `logSafetyGateFailure(session, med)` (NEW)

**Purpose:** Add medication error as Safety Gate commission failure.

**Replaces:** `addDangerousCDPForMedication()` (deprecated - used points)

**Implementation:**
```javascript
function logSafetyGateFailure(session, med) {
  if (!session.safetyGateFailures) {
    session.safetyGateFailures = [];
  }

  session.safetyGateFailures.push({
    id: `SF_MED_${med.generic_name.toUpperCase()}`,
    type: "commission",
    description: `${med.generic_name} administered - ${med.why_dangerous}`,
    timestamp: Date.now(),
    elapsedMinutes: getElapsedMinutes(session),
    patient_outcome: med.if_given.patient_response,
    aar_teaching_point: med.teaching_point,
    vital_changes: med.if_given.vital_changes
  });
}
```

### 3.5 Call Site Update

**Location:** Line 2748

**Change:**
```javascript
// Before:
const dangerousMedications = checkMedicationSafety(session, message);

// After:
let dangerousMedications = null;
if (session.scenario?.secondary_medications_by_impact) {
  dangerousMedications = checkMedicationSafety_V3(session, message);
} else {
  dangerousMedications = checkMedicationSafety(session, message);  // Legacy fallback
}
```

### 3.6 Files to Modify

| File | Location | Change Type |
|------|----------|-------------|
| `server/index.js` | Lines 1642-1760 (new) | ADD: New functions |
| `server/index.js` | Line 2748 | MODIFY: Call site |

---

## 4. Part 3 Bonus: V3.0 Rich Data in Core Agent

### 4.1 Objective

When a medication error is detected, provide Core Agent with V3.0's `patient_response` and `vital_changes` so the AI can generate accurate, educational responses showing patient deterioration.

### 4.2 Current State

**Current Function:** `buildMedicationSafetyContext()` (lines 1314-1333)

```javascript
function buildMedicationSafetyContext(dangerousMedications) {
  // Only uses: medication, reason, severity, contraindication
  // Does NOT use: patient_response, vital_changes, clinical_note
}
```

**Result:** Core Agent receives generic instructions like "show negative consequences" but doesn't know WHAT those consequences should be.

### 4.3 New Function: `buildMedicationSafetyContext_V3()`

**Purpose:** Build detailed context for Core Agent using V3.0 rich data.

**Output Format:**

```
=== CRITICAL MEDICATION EVENT (SAFETY GATE FAILURE) ===
MEDICATION GIVEN: Diazepam (matched: "apaurin")
SEVERITY: CRITICAL_HARM

PATIENT STATE BEFORE: deteriorating
PATIENT STATE AFTER: critical

PATIENT RESPONSE (USE THIS IN YOUR REPLY):
Patient becomes drowsy, breathing slows further, oxygen level plummets.
The benzodiazepine has suppressed her already-failing respiratory drive.

VITAL SIGN CHANGES (REFLECT THESE):
- SpO2: drops to 73%
- RR: drops to 18
- GCS: drops to 10

CLINICAL NOTE:
Benzodiazepine causes respiratory depression. Critical medication error.

INSTRUCTION:
Your next response must show these adverse effects happening.
Use the patient response text above as guidance.
The patient's condition should WORSEN to critical state.
Stay in character but make the adverse reaction clear and concerning.
Continue the scenario naturally - do not interrupt or warn the student.
This will be addressed as a Safety Gate failure in AAR debriefing.
```

### 4.4 Why This Matters

**Without V3.0 Rich Data:**
- Core Agent: "The patient seems to be getting worse..." (vague)
- Student learns: Something bad happened (not educational)

**With V3.0 Rich Data:**
- Core Agent: "Patient becomes drowsy, her breathing slows to 18 per minute, SpO2 plummets to 73%..."
- Student learns: Specific mechanism of benzodiazepine harm in respiratory failure

### 4.5 Integration Point

**Location:** Where AI context is built for Core Agent response (around chat handler)

**Logic:**
```javascript
if (dangerousMedications && dangerousMedications.length > 0) {
  // Check if V3.0 rich data is present
  const hasRichData = dangerousMedications[0].patient_response !== undefined;

  if (hasRichData) {
    medicationContext = buildMedicationSafetyContext_V3(dangerousMedications[0]);
  } else {
    medicationContext = buildMedicationSafetyContext(dangerousMedications);
  }
}
```

### 4.6 Files to Modify

| File | Location | Change Type |
|------|----------|-------------|
| `server/index.js` | Lines 1334-1390 (new) | ADD: `buildMedicationSafetyContext_V3()` |
| `server/index.js` | Chat handler context building | MODIFY: Use new function when V3.0 data present |

---

## 5. Part 4: Outcome-Based Consequence Feedback

### 5.1 Objective

Pre-compute **outcome-based** consequence feedback at scenario end using patient state data, storing in `performanceSnapshot` for AAR Agent.

**Key Change:** This section is completely rewritten to use **patient state** instead of **time-based** assessment.

### 5.2 Philosophy: Patient State Over Time

| DEPRECATED (Time-Based) | NEW (Outcome-Based) |
|-------------------------|---------------------|
| "Oxygen applied 4.2 minutes late" | "When oxygen was applied, patient was in deteriorating state" |
| `{delay_minutes}`, `{target_time}` | `{patient_state_at_action}`, `{spo2_at_action}` |
| Arbitrary thresholds | Patient condition determines assessment |
| Punitive tone | Educational focus on patient outcomes |

### 5.3 New Function: `buildOutcomeBasedFeedback()`

**Purpose:** Generate patient-focused consequence feedback using state data.

**Location:** Before scenario completion handler (around line 3490)

**Parameters:**

| Parameter | Type | Source |
|-----------|------|--------|
| scenario | Object | session.scenario |
| actionLog | Array | session.actionLog with patient state at each action |
| stateHistory | Array | session.patientStateHistory |

**Pseudocode:**

```
FUNCTION buildOutcomeBasedFeedback(scenario, actionLog, stateHistory):
    feedback = []

    FOR each criticalAction IN scenario.critical_actions_checklist:
        actionRecord = findActionInLog(actionLog, criticalAction.id)

        IF actionRecord == null:
            // Omission - action never performed
            feedback.push(buildOmissionFeedback(criticalAction, scenario, stateHistory))
        ELSE:
            // Action performed - assess based on patient state
            patientStateAtAction = actionRecord.patient_state_at_action
            patientStateAfter = actionRecord.patient_state_after

            level = assessCompetenceLevel(patientStateAtAction, patientStateAfter)

            IF level == "DEVELOPING" OR level == "NOVICE":
                feedback.push(buildStateFeedback(
                    criticalAction,
                    patientStateAtAction,
                    patientStateAfter,
                    actionRecord,
                    scenario
                ))

    RETURN feedback
```

### 5.4 Helper Function: `assessCompetenceLevel()`

**Purpose:** Determine competence level based on patient state (NOT time).

**Implementation:**
```javascript
function assessCompetenceLevel(patientStateAtAction, patientStateAfter, technique) {
  // Check for dangerous execution
  if (technique === 'dangerous') {
    return 'NOVICE';
  }

  // Assess based on patient state trajectory
  if (patientStateAtAction === 'initial' &&
      (patientStateAfter === 'improving' || patientStateAfter === 'stable')) {
    return 'EXEMPLARY';  // Prevented deterioration entirely
  }

  if ((patientStateAtAction === 'initial' || patientStateAtAction === 'early_deteriorating') &&
      (patientStateAfter === 'improving' || patientStateAfter === 'stable')) {
    return 'COMPETENT';  // Stabilized before major deterioration
  }

  if ((patientStateAtAction === 'deteriorating' || patientStateAtAction === 'critical') &&
      patientStateAfter === 'improving') {
    return 'DEVELOPING';  // Patient was in high-risk state before treatment
  }

  return 'DEVELOPING';
}
```

### 5.5 Helper Function: `buildStateFeedback()`

**Purpose:** Generate outcome-based feedback text.

**Output Structure:**
```javascript
{
  action_id: "CA3",
  action_name: "Apply high-flow oxygen",
  competence_level: "DEVELOPING",

  // Patient state data
  patient_state_at_action: "deteriorating",
  patient_state_after: "improving",

  // Vital signs at action
  vitals_at_action: {
    SpO2: 82,
    HR: 135,
    RR: 38
  },

  // Populated feedback text (outcome-based)
  feedback_text: "When you applied oxygen, Maria was in a deteriorating state with SpO2 of 82%. The drop from her initial 88% to 82% represents preventable hypoxic damage—that's brain cells dying that didn't need to die.",

  // Clinical anchor for sticky learning
  clinical_anchor: "Time is tissue—every minute of hypoxia compounds damage that can't be undone.",

  // Teaching point
  teaching_point: "In life-threatening asthma, oxygen should be applied while patient is still in initial state to prevent deterioration."
}
```

### 5.6 Outcome-Based Variables

**SUPPORTED (Patient-State Based):**

| Variable | Source | Example Value |
|----------|--------|---------------|
| `{patient_name}` | scenario.patient_profile.name | "Maria" |
| `{patient_state_at_action}` | actionRecord.patient_state_at_action | "deteriorating" |
| `{patient_state_after}` | actionRecord.patient_state_after | "improving" |
| `{spo2_at_action}` | actionRecord.vitals_at_action.SpO2 | "82" |
| `{initial_spo2}` | scenario.initial_vitals.SpO2 | "88" |
| `{hr_at_action}` | actionRecord.vitals_at_action.HR | "135" |
| `{initial_hr}` | scenario.initial_vitals.HR | "125" |
| `{rr_at_action}` | actionRecord.vitals_at_action.RR | "38" |
| `{initial_rr}` | scenario.initial_vitals.RR | "32" |
| `{gcs_at_action}` | actionRecord.vitals_at_action.GCS | "13" |
| `{action_name}` | criticalAction.action | "Apply high-flow oxygen" |

**DEPRECATED (Time-Based - Do NOT use):**

| Variable | Status |
|----------|--------|
| ~~`{delay_minutes}`~~ | REMOVED - arbitrary time comparison |
| ~~`{target_time}`~~ | REMOVED - arbitrary threshold |
| ~~`{actual_time}`~~ | REMOVED - use patient state instead |
| ~~`{minutes_late}`~~ | REMOVED - punitive time comparison |

### 5.7 Integration: Add to performanceSnapshot

**Location:** `server/index.js` lines 3524-3567

**Add to performanceSnapshot:**
```javascript
// Outcome-based assessment data
outcomeBasedFeedback: buildOutcomeBasedFeedback(
  session.scenario,
  session.actionLog,
  session.patientStateHistory
),

// Safety Gate results
safetyGate: {
  passed: (session.safetyGateFailures || []).length === 0,
  failures: session.safetyGateFailures || []
},
```

### 5.8 AAR Context Builder Update

**File:** `server/services/aarContextBuilder.js`

**New Section: Patient Outcome Summary**

```markdown
## Patient Outcome Assessment

### Safety Gate Status: PASSED / FAILED
[If failed, list critical failures - addressed FIRST in debriefing]

### Action-by-Action Assessment

#### CA3: Apply High-Flow Oxygen
**Competence Level:** DEVELOPING
**Patient State at Action:** deteriorating (SpO2: 82%, HR: 135)
**Patient State After:** improving

**Outcome Feedback:**
When you applied oxygen, Maria was in a deteriorating state with SpO2 of 82%.
The drop from her initial 88% to 82% represents preventable hypoxic damage.

**Clinical Anchor:** Time is tissue—every minute of hypoxia compounds damage
that can't be undone.

**Reasoning Question to Ask:**
"What was your assessment that led to prioritizing other interventions first?"
```

### 5.9 Files to Modify

| File | Location | Change Type |
|------|----------|-------------|
| `server/index.js` | Lines 3490-3520 (new) | ADD: `assessCompetenceLevel()` |
| `server/index.js` | Lines 3520-3580 (new) | ADD: `buildOutcomeBasedFeedback()`, `buildStateFeedback()` |
| `server/index.js` | Line 3551 | MODIFY: Add to performanceSnapshot |
| `server/services/aarContextBuilder.js` | formatAARContextForPrompt() | MODIFY: Add outcome-based section |

---

## 6. Implementation Order

### 6.1 Dependency Graph

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        IMPLEMENTATION ORDER                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  PART 3: Medication Safety (No Dependencies)                            │
│  ─────────────────────────────────────────────                          │
│                                                                          │
│  Step 1: detectMedicationMention()                                      │
│       ↓                                                                  │
│  Step 2: createMedicationIssue()  ←── NO POINTS, uses severity          │
│       ↓                                                                  │
│  Step 3: applyVitalChanges()                                            │
│       ↓                                                                  │
│  Step 4: logSafetyGateFailure()  ←── NEW: replaces CDP rating           │
│       ↓                                                                  │
│  Step 5: checkMedicationSafety_V3()  ←── Uses steps 1-4                 │
│       ↓                                                                  │
│  Step 6: Update call site (line 2748)                                   │
│                                                                          │
│  PART 3 BONUS: Rich Data in Core Agent (Depends on Part 3)              │
│  ─────────────────────────────────────────────────────────              │
│                                                                          │
│  Step 7: buildMedicationSafetyContext_V3()                              │
│       ↓                                                                  │
│  Step 8: Update context building in chat handler                        │
│                                                                          │
│  PART 4: Outcome-Based Feedback (Independent)                           │
│  ─────────────────────────────────────────────                          │
│                                                                          │
│  Step 9: assessCompetenceLevel()  ←── Patient state based               │
│       ↓                                                                  │
│  Step 10: buildStateFeedback()                                          │
│       ↓                                                                  │
│  Step 11: buildOutcomeBasedFeedback()  ←── Uses steps 9-10              │
│       ↓                                                                  │
│  Step 12: Add to performanceSnapshot                                    │
│       ↓                                                                  │
│  Step 13: Update aarContextBuilder.js                                   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 6.2 Recommended Sequence

| Order | Step | File | Estimated Lines |
|-------|------|------|-----------------|
| 1 | `detectMedicationMention()` | index.js | 30 |
| 2 | `createMedicationIssue()` (no points) | index.js | 25 |
| 3 | `applyVitalChanges()` | index.js | 15 |
| 4 | `logSafetyGateFailure()` | index.js | 25 |
| 5 | `checkMedicationSafety_V3()` | index.js | 60 |
| 6 | Update call site | index.js | 10 |
| 7 | `buildMedicationSafetyContext_V3()` | index.js | 45 |
| 8 | Update context building | index.js | 10 |
| 9 | `assessCompetenceLevel()` | index.js | 25 |
| 10 | `buildStateFeedback()` | index.js | 35 |
| 11 | `buildOutcomeBasedFeedback()` | index.js | 40 |
| 12 | Add to performanceSnapshot | index.js | 10 |
| 13 | Update AAR context | aarContextBuilder.js | 35 |

**Total:** ~365 lines

---

## 7. Testing Strategy

### 7.1 Unit Tests

#### Part 3: Medication Safety

| Test ID | Test Case | Input | Expected |
|---------|-----------|-------|----------|
| MS-01 | V3.0 critical_harm detection | "I'll give apaurin" in asthma | Detects diazepam, returns rich data |
| MS-02 | Brand name matching | "Give valium" | Matches diazepam via brand variants |
| MS-03 | Worsens category | "Give salbutamol" in anaphylaxis | Detects from worsens, not Safety Gate |
| MS-04 | Neutral tracking | "Check glucose" in opioid OD | Logged as note, not error |
| MS-05 | Vital changes applied | Give critical_harm med | session.currentVitals updated |
| MS-06 | Safety Gate logging | Give critical_harm med | safetyGateFailures array updated |
| MS-07 | No points in output | Any medication detection | No `points` field in issue object |
| MS-08 | No false positives | "Should I give oxygen?" | No medication error detected |

#### Part 4: Outcome-Based Feedback

| Test ID | Test Case | Input | Expected |
|---------|-----------|-------|----------|
| OF-01 | Exemplary action | Action in initial state, patient improved | Level = EXEMPLARY |
| OF-02 | Competent action | Action in early_deteriorating, patient stable | Level = COMPETENT |
| OF-03 | Developing action | Action in deteriorating state | Level = DEVELOPING |
| OF-04 | Omission | Critical action never performed | Omission feedback generated |
| OF-05 | Patient state variables | Any DEVELOPING action | Feedback uses patient state, NOT time |
| OF-06 | No time variables | Any feedback | No `{delay_minutes}` or `{target_time}` |
| OF-07 | Clinical anchor included | DEVELOPING feedback | Clinical anchor present |

### 7.2 Integration Tests

| Test ID | Test Case | Steps | Expected |
|---------|-----------|-------|----------|
| INT-01 | Full medication flow | Give diazepam in asthma | Error detected → Vitals change → Safety Gate logged → Core Agent shows adverse effect |
| INT-02 | Full outcome flow | Complete scenario with delayed oxygen | performanceSnapshot has outcomeBasedFeedback with patient state data |
| INT-03 | Safety Gate in AAR | Medication error occurred | AAR context shows Safety Gate failure with HIGH PRIORITY |
| INT-04 | Legacy compatibility | Use v2.0 scenario | Falls back to legacy functions, no errors |

### 7.3 Scenario Coverage

| Scenario | Safety Gate Medications to Test | Outcome Feedback to Test |
|----------|--------------------------------|--------------------------|
| Asthma v3.0 | diazepam (apaurin) | Oxygen in deteriorating state |
| Anaphylaxis v3.0 | beta_blocker | Epinephrine in critical state |
| Opioid OD v3.0 | flumazenil | Naloxone in initial vs deteriorating |
| Status Epilepticus v3.0 | insulin | Glucose/Diazepam timing |
| TBI v3.0 | hypotonic fluids | Airway in deteriorating state |
| Hemorrhagic Shock v3.0 | excessive_fluids | TXA/tourniquet in critical state |

---

## 8. Risk Assessment

### 8.1 Risk Matrix

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Legacy scenario breakage | Low | Medium | Keep legacy functions, add fallback |
| Brand name mapping incomplete | Medium | Low | Start with known meds, expand as needed |
| Patient state not tracked | Medium | Medium | Add state tracking if missing |
| Performance impact | Low | Low | Assessment is O(n) on small arrays |
| AAR context too long | Low | Medium | Limit to 3 most significant items |

### 8.2 Rollback Plan

All changes are additive:
- New functions don't replace old ones
- Call sites check for V3.0 structure first, fall back to legacy
- If issues occur, simply bypass new functions

### 8.3 Success Criteria

| Criteria | Measurement |
|----------|-------------|
| Medication errors detected | >95% of dangerous meds caught in testing |
| Safety Gate logging | All critical_harm meds create Safety Gate entries |
| No points in system | Zero references to point values in new code |
| Outcome-based feedback | All feedback uses patient state, not time |
| Core Agent accuracy | Adverse effects match V3.0 patient_response |
| No regression | Legacy scenarios still work |

---

## Appendix A: V3.0 Scenario Structure Reference

### secondary_medications_by_impact

```json
{
  "secondary_medications_by_impact": {
    "critical_harm": [
      {
        "name": "apaurin",
        "generic_name": "Diazepam",
        "class": "Benzodiazepine",
        "why_dangerous": "Respiratory depressant in patient with respiratory failure",
        "if_given": {
          "vital_changes": { "SpO2": 73, "RR": 18, "GCS": 10 },
          "patient_response": "Patient becomes drowsy...",
          "clinical_note": "Benzodiazepine causes respiratory depression.",
          "state_change": "critical",
          "aar_flag": "dangerous_medication"
        },
        "teaching_point": "Never give sedatives to patients in respiratory failure."
      }
    ],
    "worsens": [...],
    "neutral": [...]
  }
}
```

**Note:** No `points` field - severity is indicated by category (critical_harm, worsens, neutral).

### Patient State Definitions

| State | Description | Competence Implication |
|-------|-------------|------------------------|
| `initial` | Presenting symptoms, stable for assessment | Action here = EXEMPLARY |
| `early_deteriorating` | First signs of worsening | Action here = COMPETENT |
| `deteriorating` | Clear worsening, needs immediate intervention | Action here = DEVELOPING |
| `critical` | Life-threatening, imminent arrest | Action here = DEVELOPING |
| `improving` | Positive response to treatment | Post-treatment state |
| `stable` | Stabilized after treatment | Post-treatment state |

---

## Appendix B: File Change Summary

| File | Total Lines Changed | Changes |
|------|--------------------:|---------|
| `server/index.js` | ~300 | 7 new functions, 2 modified sections |
| `server/services/aarContextBuilder.js` | ~35 | 1 new section in formatter |
| **Total** | **~335** | |

---

## Appendix C: Alignment with Performance Assessment V3.0

This document is fully aligned with the Performance Assessment System V3.0 Implementation Guide:

| Performance Assessment Principle | This Document's Implementation |
|----------------------------------|--------------------------------|
| Three-Tier Assessment | Safety Gate (Tier 2) + Competence Levels (Tier 3) |
| No Points | `createMedicationIssue()` has no points field |
| No Time Thresholds | `buildOutcomeBasedFeedback()` uses patient state |
| Safety Gate for Critical Failures | `logSafetyGateFailure()` for medication errors |
| Outcome-Based Competence | `assessCompetenceLevel()` uses patient state |
| Patient State Variables | `{patient_state_at_action}`, `{spo2_at_action}`, etc. |
| Silent Tracking | Core Agent continues naturally after medication error |
| AAR Priority | Safety Gate failures addressed first in AAR |

---

*Document prepared for Know Thyself MVP V3.0 Integration*
*Aligned with Performance Assessment System V3.0 Implementation Guide*
