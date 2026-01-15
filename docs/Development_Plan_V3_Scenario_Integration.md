# Development Plan: V3.0 Scenario Integration

**Document Version:** 1.0
**Created:** January 2025
**Status:** Ready for Implementation
**Estimated Effort:** ~300 lines of code changes

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Background: Why These Changes Are Needed](#2-background-why-these-changes-are-needed)
3. [Part 3: Medication Safety Direct Integration](#3-part-3-medication-safety-direct-integration)
4. [Part 3 Bonus: V3.0 Rich Data in Core Agent](#4-part-3-bonus-v30-rich-data-in-core-agent)
5. [Part 4: Consequence Template Population](#5-part-4-consequence-template-population)
6. [Implementation Order](#6-implementation-order)
7. [Testing Strategy](#7-testing-strategy)
8. [Risk Assessment](#8-risk-assessment)

---

## 1. Executive Summary

### What We're Doing

We are updating the Know Thyself MVP system to fully utilize the new V3.0 scenario blueprint structure. The V3.0 scenarios contain richer, more detailed data that the current codebase cannot access due to structural mismatches.

### Three Key Changes

| Change | Problem Solved | Benefit |
|--------|---------------|---------|
| **Medication Safety Direct Integration** | Current code looks for `dangerous_medications` array, but V3.0 uses `secondary_medications_by_impact` | Dangerous medications will be detected and flagged |
| **V3.0 Rich Data in Core Agent** | V3.0 has `patient_response` and `vital_changes` for each medication error, but Core Agent doesn't use them | More realistic, educational AI responses |
| **Consequence Template Population** | V3.0 has `consequence_templates` with variables, but they're never populated with actual data | AAR Agent can show personalized medical consequences |

### Expected Outcomes

1. **Medication errors will be detected** - Students giving dangerous medications will receive immediate feedback
2. **Core Agent responses will be more realistic** - AI will describe specific adverse reactions from V3.0 data
3. **AAR will show personalized consequences** - "You gave oxygen at 7.2 minutes, during those 4.2 minutes of delay, Maria's SpO2 remained at 88%..."

---

## 2. Background: Why These Changes Are Needed

### 2.1 The Structure Mismatch Problem

When we created the V3.0 scenarios with the Blueprint Structure Enhancement Guide v2, we introduced a better, richer data structure. However, the existing code was written for an older structure.

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
                                                   "points": -20
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

We considered two approaches:

| Approach | Description | Verdict |
|----------|-------------|---------|
| **Adapter** | Create function to convert V3.0 → legacy format | ❌ Rejected |
| **Direct Integration** | Rewrite code to read V3.0 structure directly | ✅ Chosen |

**Why Direct Integration Wins:**

1. **Durability** - No translation layer to maintain; changes in V3.0 don't require adapter updates
2. **Robustness** - Single data source; fails obviously if structure changes
3. **Simplicity** - Just change where code looks for data, no complex mapping
4. **Scalability** - V3.0 structure already has all needed fields
5. **Rich Data Access** - Can use V3.0's `patient_response`, `vital_changes`, `clinical_note` directly

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
  "points": -20,
  "aar_flag": "dangerous_medication"
}
```

**Currently:** This data is completely ignored. Core Agent makes up its own response.

**After Changes:** Core Agent receives exact `patient_response` text and `vital_changes` to create accurate, educational feedback.

### 2.4 The Consequence Template Problem

V3.0 scenarios have consequence templates designed to show students the medical impact of their delays:

```json
{
  "gap_trigger": "CA3_late",
  "template": "Oxygen was applied at {actual_time} minutes—{delay_minutes} minutes past the 2-minute critical window. During those {delay_minutes} minutes, {patient_name}'s SpO2 remained at {initial_spo2}%...",
  "variables": {
    "actual_time": "checklistResults.CA3.time",
    "delay_minutes": "calculated",
    "patient_name": "patient_profile.name",
    "initial_spo2": "initial_vitals.SpO2"
  }
}
```

**Currently:** Templates are extracted but variables are never populated. AAR Agent receives raw templates with `{placeholders}`.

**After Changes:** At scenario end, templates are populated with actual data:
> "Oxygen was applied at 7.2 minutes—4.2 minutes past the 2-minute critical window. During those 4.2 minutes, Maria's SpO2 remained at 88%..."

---

## 3. Part 3: Medication Safety Direct Integration

### 3.1 Objective

Replace the current medication safety system with direct integration that reads V3.0's `secondary_medications_by_impact` structure.

### 3.2 Current State Analysis

**File:** `server/index.js`

**Current Function:** `checkMedicationSafety()` (lines 1577-1641)

```javascript
function checkMedicationSafety(session, userMessage) {
  const scenario = session.scenario;
  const dangerousMeds = scenario.dangerous_medications || [];  // ← Always empty!

  if (dangerousMeds.length === 0) return null;  // ← Always returns here
  // ... rest never executes
}
```

**Call Site:** Line 2748
```javascript
const dangerousMedications = checkMedicationSafety(session, message);
```

### 3.3 New Function: `checkMedicationSafety_V3()`

**Purpose:** Directly read V3.0 medication structure and return rich error data.

**Location:** After current `checkMedicationSafety()` (after line 1641)

**Pseudocode:**

```
FUNCTION checkMedicationSafety_V3(session, userMessage):
    IF no scenario loaded THEN return null

    secondaryMeds = scenario.secondary_medications_by_impact
    IF no secondaryMeds THEN return null

    lowerMessage = userMessage.toLowerCase()
    detectedIssues = []

    // Process CRITICAL HARM medications (most dangerous)
    FOR each med IN secondaryMeds.critical_harm:
        IF detectMedicationMention(med, lowerMessage):
            issue = createMedicationIssue(med, "critical_harm")
            applyVitalChanges(session, med.if_given.vital_changes)
            updatePatientState(session, med.if_given.state_change)
            addDangerousCDP(session, med)
            detectedIssues.push(issue)

    // Process WORSENS medications (harmful but not immediately life-threatening)
    FOR each med IN secondaryMeds.worsens:
        IF detectMedicationMention(med, lowerMessage):
            issue = createMedicationIssue(med, "worsens")
            applyVitalChanges(session, med.if_given.vital_changes)
            detectedIssues.push(issue)

    // Track NEUTRAL medications (for teaching opportunities only)
    FOR each med IN secondaryMeds.neutral:
        IF detectMedicationMention(med, lowerMessage):
            session.medicationWarnings.push(createWarning(med))

    RETURN detectedIssues if any, else null
```

### 3.4 Helper Functions

#### 3.4.1 `detectMedicationMention(med, lowerMessage)`

**Purpose:** Check if medication is mentioned in user message.

**Why Needed:** V3.0 doesn't have a `keywords` array. We need to check `name`, `generic_name`, and common brand variants.

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

#### 3.4.2 `createMedicationIssue(med, detection, session, severity)`

**Purpose:** Create structured issue object with all V3.0 rich data.

**Output Structure:**
```javascript
{
  // Core identification
  medication: "Diazepam",
  matchedName: "apaurin",

  // Severity and reason
  severity: "critical_harm",
  reason: "Respiratory depressant in patient with respiratory failure",

  // V3.0 Rich Data for Core Agent
  patient_response: "Patient becomes drowsy, breathing slows further...",
  vital_changes: { SpO2: 73, RR: 18, GCS: 10 },
  clinical_note: "Benzodiazepine causes respiratory depression.",

  // AAR Data
  points: -20,
  aar_flag: "dangerous_medication",
  teaching_point: "Never give sedatives to patients in respiratory failure.",

  // Timing
  timestamp: Date.now(),
  elapsedMinutes: 5.2
}
```

#### 3.4.3 `applyVitalChanges(session, vitalChanges)`

**Purpose:** Update session.currentVitals with V3.0 specified changes.

**Why Needed:** When dangerous medication given, vitals should immediately reflect the adverse effect.

#### 3.4.4 `addDangerousCDPForMedication(session, med)`

**Purpose:** Add automatic 'dangerous' CDP evaluation for medication errors.

**Why Needed:** Medication errors should count as dangerous CDP performance for AAR scoring.

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
| `server/index.js` | Lines 1642-1750 (new) | ADD: New functions |
| `server/index.js` | Line 2748 | MODIFY: Call site |

---

## 4. Part 3 Bonus: V3.0 Rich Data in Core Agent

### 4.1 Objective

When a medication error is detected, provide Core Agent with V3.0's `patient_response` and `vital_changes` so the AI can generate accurate, educational responses.

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

**Location:** After current `buildMedicationSafetyContext()` (after line 1333)

**Output Format:**

```
=== CRITICAL MEDICATION EVENT ===
MEDICATION GIVEN: Diazepam (matched: "apaurin")
SEVERITY: CRITICAL_HARM

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
The patient's condition should WORSEN noticeably.
Stay in character but make the adverse reaction clear and concerning.
This is a critical teaching moment about medication safety.
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
| `server/index.js` | Lines 1334-1380 (new) | ADD: `buildMedicationSafetyContext_V3()` |
| `server/index.js` | Chat handler context building | MODIFY: Use new function when V3.0 data present |

---

## 5. Part 4: Consequence Template Population

### 5.1 Objective

Pre-compute populated consequence templates at scenario end, storing them in `performanceSnapshot` for AAR Agent to use.

### 5.2 Current State

**Consequence templates exist in V3.0 scenarios:**
```json
{
  "gap_trigger": "CA3_late",
  "template": "Oxygen was applied at {actual_time} minutes—{delay_minutes} minutes past...",
  "variables": { ... }
}
```

**Current Flow:**
1. `blueprintLoader.extractAARRelevantContent()` extracts raw templates
2. AAR Agent receives templates with `{placeholders}`
3. AAR Agent must figure out which gaps occurred and populate variables (unreliable)

**Problem:** Variables are never populated with actual scenario data.

### 5.3 Option A: Pre-compute at Scenario End (Chosen)

**Why Option A over Option B (AAR time)?**

| Criteria | Option A: Scenario End | Option B: AAR Build |
|----------|------------------------|---------------------|
| **Simplicity** | Compute once | Re-compute every AAR request |
| **Robustness** | Data captured at exact moment | Blueprint reload could fail |
| **Data Integrity** | checklistResults accurate at scenario end | Data might be stale |
| **Debugging** | Can inspect in performanceSnapshot | Computed on-the-fly |

### 5.4 New Function: `populateConsequenceTemplates()`

**Purpose:** Populate V3.0 consequence templates with actual scenario data.

**Location:** Before scenario completion handler (around line 3490)

**Parameters:**

| Parameter | Type | Source |
|-----------|------|--------|
| scenario | Object | session.scenario |
| checklistResults | Array | session.checklistResults |
| checklistSummary | Object | Generated at scenario end |

**Pseudocode:**

```
FUNCTION populateConsequenceTemplates(scenario, checklistResults, checklistSummary):
    templates = scenario.consequence_templates
    IF no templates THEN return []

    populated = []

    FOR each template IN templates:
        // Check if this gap occurred
        gapAnalysis = analyzeGap(template, checklistResults, checklistSummary)

        IF NOT gapAnalysis.gapOccurred THEN continue

        // Start with template text
        populatedText = template.template

        // Replace all variables
        populatedText = replaceVariable(populatedText, "{patient_name}", scenario.patient_profile.name)
        populatedText = replaceVariable(populatedText, "{actual_time}", gapAnalysis.actualTime)
        populatedText = replaceVariable(populatedText, "{target_time}", gapAnalysis.targetTime)
        populatedText = replaceVariable(populatedText, "{delay_minutes}", gapAnalysis.delayMinutes)
        populatedText = replaceVariable(populatedText, "{initial_spo2}", scenario.initial_vitals.SpO2)
        populatedText = replaceVariable(populatedText, "{initial_hr}", scenario.initial_vitals.HR)
        populatedText = replaceVariable(populatedText, "{initial_rr}", scenario.initial_vitals.RR)

        // Add to results
        populated.push({
            checklist_item_id: template.checklist_item_id,
            gap_type: template.gap_type,
            severity: template.severity,
            populated_consequence: populatedText,
            medical_basis: template.medical_basis,
            gap_details: gapAnalysis
        })

    RETURN populated
```

### 5.5 Helper Function: `analyzeGap()`

**Purpose:** Determine if a specific gap (missed/delayed) occurred.

**Logic by Gap Type:**

| Gap Type | Detection | Data Extracted |
|----------|-----------|----------------|
| `missed_action` | checklist_item_id in checklistSummary.missed | None needed |
| `delayed_action` | Item in checklistResults with minutesLate > 0 | actualTime, targetTime, delayMinutes |
| `wrong_sequence` | Compare timestamps of related items | sequenceOrder |

### 5.6 Variables Supported

| Variable | Source | Example Value |
|----------|--------|---------------|
| `{patient_name}` | scenario.patient_profile.name | "Maria" |
| `{actual_time}` | checklistResults[].time | "7.2" |
| `{target_time}` | checklistItem.time_target_minutes | "3" |
| `{delay_minutes}` | checklistResults[].minutesLate | "4.2" |
| `{initial_spo2}` | scenario.initial_vitals.SpO2 | "88" |
| `{initial_hr}` | scenario.initial_vitals.HR | "125" |
| `{initial_bp}` | scenario.initial_vitals.BP_systolic | "88" |
| `{initial_rr}` | scenario.initial_vitals.RR | "32" |
| `{initial_gcs}` | scenario.initial_vitals.GCS | "14" |
| `{action_name}` | checklistItem.action | "Apply high-flow oxygen" |

### 5.7 Integration: Add to performanceSnapshot

**Location:** `server/index.js` lines 3524-3567

**Current Code (line 3549-3551):**
```javascript
// Phase 2: Checklist results and summary
checklistResults: session.checklistResults || [],
checklistSummary: checklistSummary,
```

**Add After:**
```javascript
// Phase 3: Pre-computed consequence templates
populatedConsequences: populateConsequenceTemplates(
  session.scenario,
  session.checklistResults,
  checklistSummary
),
```

### 5.8 AAR Context Builder Update

**File:** `server/services/aarContextBuilder.js`

**What to Add:** New section in formatted AAR context for "Medical Consequences"

**Example Output:**

```markdown
## Medical Consequences of Performance Gaps

### Delayed Oxygen (CA3)
**Severity:** HIGH
**What Happened:** Oxygen was applied at 7.2 minutes—4.2 minutes past the 3-minute
critical window. During those 4.2 minutes, Maria's SpO2 remained at 88%. Each minute
of SpO2 <85% accelerates cerebral hypoxia—brain cells begin dying after 4-6 minutes.

**Medical Basis:** Each minute of SpO2 <85% accelerates cerebral hypoxia...


### Missed Bronchodilator (CA4)
**Severity:** CRITICAL
**What Happened:** No bronchodilator was given. Maria had life-threatening asthma
with severe bronchospasm, yet the primary treatment was never administered. Without
bronchodilation, her airways remained critically narrowed, making respiratory failure inevitable.

**Medical Basis:** Failure to administer bronchodilator in life-threatening asthma
is a critical omission...
```

### 5.9 Files to Modify

| File | Location | Change Type |
|------|----------|-------------|
| `server/index.js` | Lines 3490-3520 (new) | ADD: `analyzeGap()` |
| `server/index.js` | Lines 3520-3570 (new) | ADD: `populateConsequenceTemplates()` |
| `server/index.js` | Line 3551 | MODIFY: Add to performanceSnapshot |
| `server/services/aarContextBuilder.js` | formatAARContextForPrompt() | MODIFY: Add consequences section |

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
│  Step 2: createMedicationIssue()                                        │
│       ↓                                                                  │
│  Step 3: applyVitalChanges()                                            │
│       ↓                                                                  │
│  Step 4: addDangerousCDPForMedication()                                 │
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
│  PART 4: Consequence Templates (Independent)                            │
│  ───────────────────────────────────────────                            │
│                                                                          │
│  Step 9: analyzeGap()                                                   │
│       ↓                                                                  │
│  Step 10: populateConsequenceTemplates()  ←── Uses step 9               │
│       ↓                                                                  │
│  Step 11: Add to performanceSnapshot                                    │
│       ↓                                                                  │
│  Step 12: Update aarContextBuilder.js                                   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 6.2 Recommended Sequence

| Order | Step | File | Estimated Lines |
|-------|------|------|-----------------|
| 1 | `detectMedicationMention()` | index.js | 30 |
| 2 | `createMedicationIssue()` | index.js | 25 |
| 3 | `applyVitalChanges()` | index.js | 15 |
| 4 | `addDangerousCDPForMedication()` | index.js | 20 |
| 5 | `checkMedicationSafety_V3()` | index.js | 60 |
| 6 | Update call site | index.js | 10 |
| 7 | `buildMedicationSafetyContext_V3()` | index.js | 40 |
| 8 | Update context building | index.js | 10 |
| 9 | `analyzeGap()` | index.js | 30 |
| 10 | `populateConsequenceTemplates()` | index.js | 50 |
| 11 | Add to performanceSnapshot | index.js | 5 |
| 12 | Update AAR context | aarContextBuilder.js | 30 |

**Total:** ~325 lines

---

## 7. Testing Strategy

### 7.1 Unit Tests

#### Part 3: Medication Safety

| Test ID | Test Case | Input | Expected |
|---------|-----------|-------|----------|
| MS-01 | V3.0 critical_harm detection | "I'll give apaurin" in asthma | Detects diazepam, returns rich data |
| MS-02 | Brand name matching | "Give valium" | Matches diazepam via brand variants |
| MS-03 | Worsens category | "Give salbutamol" in anaphylaxis | Detects from worsens, lower severity |
| MS-04 | Neutral tracking | "Check glucose" in opioid OD | Logged as warning, not error |
| MS-05 | Vital changes applied | Give critical_harm med | session.currentVitals updated |
| MS-06 | CDP auto-rating | Give critical_harm med | CDP evaluation with 'dangerous' score |
| MS-07 | No false positives | "Should I give oxygen?" | No medication error detected |

#### Part 4: Consequence Templates

| Test ID | Test Case | Input | Expected |
|---------|-----------|-------|----------|
| CT-01 | No gaps | All actions on time | Empty array |
| CT-02 | Delayed action | CA3 at 7 min (target 3) | 1 consequence with populated text |
| CT-03 | Missed action | CA4 never done | 1 consequence for missed |
| CT-04 | Multiple gaps | CA3 late + CA5 missed | 2 consequences |
| CT-05 | Variable replacement | Any gap | All {variables} replaced |
| CT-06 | No templates | Legacy scenario | Empty array, no error |

### 7.2 Integration Tests

| Test ID | Test Case | Steps | Expected |
|---------|-----------|-------|----------|
| INT-01 | Full medication flow | Give diazepam in asthma | Error detected → Vitals change → CDP added → Core Agent shows adverse effect |
| INT-02 | Full consequence flow | Complete scenario with late oxygen | performanceSnapshot has populatedConsequences → AAR shows personalized feedback |
| INT-03 | Legacy compatibility | Use v2.0 scenario | Falls back to legacy functions, no errors |

### 7.3 Scenario Coverage

| Scenario | Critical Harm Meds to Test | Consequence Templates to Test |
|----------|---------------------------|------------------------------|
| Asthma v3.0 | diazepam (apaurin) | CA3_late, CA4_late, CA3_missed, CA4_missed |
| Anaphylaxis v3.0 | beta_blocker, salbutamol_alone | CA3_late, CA3_missed |
| Opioid OD v3.0 | excessive_naloxone, flumazenil | CA4_missed, CA5_late, CA4_after_CA5 |
| Status Epilepticus v3.0 | insulin, excessive_benzo | CA4_missed, CA5_missed, CA4_late |
| TBI v3.0 | - | CA2_missed, CA3_late, CA5_missed |
| Hemorrhagic Shock v3.0 | excessive_fluids | CA4_missed, CA4_late, CA8_late |

---

## 8. Risk Assessment

### 8.1 Risk Matrix

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Legacy scenario breakage | Low | Medium | Keep legacy functions, add fallback |
| Brand name mapping incomplete | Medium | Low | Start with known meds, expand as needed |
| Variable replacement edge cases | Low | Low | Use "N/A" for missing values |
| Performance impact | Low | Low | Population is O(n) on small arrays |
| AAR context too long | Low | Medium | Limit to 3 most severe consequences |

### 8.2 Rollback Plan

All changes are additive:
- New functions don't replace old ones
- Call sites check for V3.0 structure first, fall back to legacy
- If issues occur, simply bypass new functions

### 8.3 Success Criteria

| Criteria | Measurement |
|----------|-------------|
| Medication errors detected | >95% of dangerous meds caught in testing |
| Core Agent accuracy | Adverse effects match V3.0 patient_response |
| Consequence personalization | All {variables} replaced with actual data |
| No regression | Legacy scenarios still work |
| Performance | No noticeable latency increase |

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
          "points": -20,
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

### consequence_templates

```json
{
  "consequence_templates": [
    {
      "gap_trigger": "CA3_late",
      "checklist_item_id": "CA3",
      "gap_type": "delayed_action",
      "template": "Oxygen was applied at {actual_time} minutes—{delay_minutes} minutes past the {target_time}-minute critical window...",
      "variables": {
        "actual_time": "checklistResults.CA3.time",
        "target_time": "3",
        "delay_minutes": "calculated",
        "patient_name": "patient_profile.name"
      },
      "severity": "high",
      "medical_basis": "Each minute of SpO2 <85% accelerates cerebral hypoxia..."
    }
  ]
}
```

---

## Appendix B: File Change Summary

| File | Total Lines Changed | Changes |
|------|--------------------:|---------|
| `server/index.js` | ~280 | 6 new functions, 2 modified sections |
| `server/services/aarContextBuilder.js` | ~30 | 1 new section in formatter |
| **Total** | **~310** | |

---

*Document prepared for Know Thyself MVP V3.0 Integration*
