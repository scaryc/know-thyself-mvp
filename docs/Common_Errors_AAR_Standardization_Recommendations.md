# Common Errors & AAR Teaching Points Standardization Recommendations

**Document Purpose:** Detailed recommendations for standardizing `common_errors` and `aar_teaching_points` fields across all scenario blueprints.

**Date:** 2026-01-07
**Status:** Recommendations for Implementation

---

## Executive Summary

Current audit reveals **significant structural inconsistencies** across the four scenarios (Asthma, Status Epilepticus, STEMI, TBI) that will impair:
- AAR Agent's ability to programmatically access teaching content
- Consistent student feedback generation
- Data analysis and quality metrics
- Future scenario development efficiency

**Key Finding:** While content quality is excellent, the structure varies dramatically between scenarios, making automated processing unreliable.

---

## Current State Analysis

### Structural Variations Identified

| Scenario | common_errors Location | Structure Type | Metadata Included | AAR Format |
|---|---|---|---|---|
| Asthma | Root level | Simple array | error_id, error, teaching_point | key_concepts, clinical_pearls, misconceptions |
| Status Epilepticus | Root level | Enhanced array | + frequency, severity | category-based topic blocks |
| STEMI | Root level | Simple array | error_id, error, teaching_point | key_concepts, pearls, misconceptions, evidence |
| TBI | Nested in aar_teaching_points | Object structure | + consequence, points, aar_flag | Topic-based detailed sections |

### Quantitative Overview

- **Total Common Errors Across Scenarios:** 36 errors
  - Asthma: 7 errors
  - Status Epilepticus: 10 errors
  - STEMI: 10 errors
  - TBI: 9 errors

- **AAR Teaching Points Organization:**
  - 3 scenarios use "key_concepts/clinical_pearls" structure
  - 1 scenario uses category-based topic blocks
  - 1 scenario uses deeply nested topic sections

---

## Problems with Current Inconsistency

### 1. **AAR Agent Processing Difficulty**

**Problem:**
```javascript
// Current code must handle multiple structures:
if (scenario.common_errors && Array.isArray(scenario.common_errors)) {
  // Works for Asthma, Status Epilepticus, STEMI
} else if (scenario.aar_teaching_points?.common_errors) {
  // Special case for TBI
}

// For AAR teaching points:
if (scenario.aar_teaching_points.key_concepts) {
  // Works for Asthma, STEMI
} else if (Array.isArray(scenario.aar_teaching_points)) {
  // Works for Status Epilepticus
} else if (scenario.aar_teaching_points.tbi_pathophysiology) {
  // Special case for TBI topic sections
}
```

**Impact:**
- Complex, brittle code
- Error-prone conditional logic
- Difficult to maintain
- Cannot reliably extract teaching points without scenario-specific parsing

### 2. **Metadata Gaps**

**Problem:** Only Status Epilepticus has `frequency` and `severity` metadata.

**Why This Matters:**
- **For AAR Agent:** Cannot prioritize which errors to emphasize in feedback
- **For Analytics:** Cannot identify most common errors across student cohorts
- **For Content Improvement:** Cannot determine which errors need better prevention (common errors) vs better detection (critical errors)

**Example Use Case:**
```
Student makes error E1 in Asthma scenario (delayed bronchodilator)
AAR Agent should know:
- How common is this error? (very_common → "Many students struggle with this")
- How severe? (critical → emphasize strongly, show consequences)
```

### 3. **Teaching Point Length Variation**

**Problem:** Teaching points range from 1 sentence to 8+ sentences.

**Status Epilepticus E1 Teaching Point:** 8 sentences (215 words)
**Asthma E7 Teaching Point:** 1 sentence (20 words)

**Why This Matters:**
- Inconsistent student cognitive load
- Some teaching points too brief to convey full reasoning
- Some teaching points overwhelming (information overload)
- AAR Agent cannot determine when to show full text vs summary

### 4. **Missing Linkages**

**Problem:** No explicit connections between:
- Common errors ↔ Challenge points (CPs)
- Common errors ↔ Critical decision points (CDPs)
- Common errors ↔ Secondary medications that trigger them

**Example:**
```json
// Asthma E2: "No oxygen despite critical hypoxia"
// CDP2: "oxygen_delivery_device_selection"
// These are clearly related but no explicit link
```

**Impact:**
- Cannot automatically suggest which CDPs to evaluate based on observed errors
- Cannot track if challenge points are effectively preventing common errors
- Missed opportunity for data-driven scenario improvement

---

## Standardization Recommendations

### Recommendation 1: Unified Common Errors Structure

**WHAT:**
```json
{
  "common_errors": [
    {
      "error_id": "E1",
      "error": "Brief description of what student did wrong (1 sentence)",
      "category": "assessment|treatment|medication|communication|safety",
      "frequency": "very_common|common|moderate|uncommon",
      "severity": "critical|dangerous|moderate|minor",
      "teaching_point": "Clear explanation of why this is wrong and what to do instead (2-4 sentences, 50-100 words)",
      "consequences": "What happens if this error occurs (patient impact)",
      "points_deducted": -15,
      "triggers_aar_flag": "critical_medication_error",
      "related_cdp_id": "CDP1",
      "related_cp_id": "CP2",
      "prevention_strategy": "What could prevent this error (for AAR Agent to suggest)"
    }
  ]
}
```

**WHY:**

1. **`category` field:** Enables AAR Agent to group errors by type ("You had 3 medication-related errors...")
2. **`frequency` field:** Normalizes student experience ("This is a common challenge, even for experienced providers...")
3. **`severity` field:** Guides AAR Agent emphasis (critical errors get detailed explanation + consequences)
4. **`teaching_point` length standard:** 50-100 words = comprehensive but not overwhelming
5. **`consequences` field:** Explicit patient impact makes errors concrete and memorable
6. **`points_deducted`:** Enables AAR to show scoring breakdown ("Delayed oxygen: -15 points")
7. **`triggers_aar_flag`:** Links to scenario flags for automated detection
8. **`related_cdp_id` / `related_cp_id`:** Explicit linkages enable data analysis
9. **`prevention_strategy`:** AAR Agent can suggest specific improvements

**MIGRATION PATH:**

**Status Epilepticus:** Already has frequency/severity → Add new fields
**Asthma/STEMI:** Add all metadata fields
**TBI:** Extract from nested location, add metadata

### Recommendation 2: Standardized AAR Teaching Points Structure

**WHAT:**
```json
{
  "aar_teaching_points": {
    "key_concepts": [
      {
        "concept": "Brief concept title (5-10 words)",
        "explanation": "What this concept means (2-3 sentences)",
        "clinical_relevance": "Why it matters in practice (1-2 sentences)",
        "related_errors": ["E1", "E4"]
      }
    ],

    "clinical_pearls": [
      {
        "pearl": "Specific clinical insight or tip (1 sentence)",
        "rationale": "Why this works or why it matters (1 sentence, optional)",
        "related_errors": ["E2"]
      }
    ],

    "common_misconceptions": [
      {
        "misconception": "WRONG: What students commonly believe",
        "correction": "CORRECT: What is actually true",
        "explanation": "Why the misconception is dangerous and the correction is important",
        "related_errors": ["E5"]
      }
    ],

    "evidence_based_updates": [
      {
        "topic": "Area of practice that has changed",
        "old_practice": "What was done previously",
        "current_practice": "What should be done now",
        "evidence": "Study/guideline supporting change (name, year, key finding)",
        "related_errors": ["E1"]
      }
    ],

    "advanced_concepts": [
      {
        "concept": "Complex topic for high-performing students",
        "explanation": "Detailed explanation with pathophysiology",
        "when_to_apply": "Clinical scenarios where this applies",
        "prerequisite_knowledge": ["key_concepts[0]"]
      }
    ]
  }
}
```

**WHY:**

1. **Standardized categories:** All scenarios use same 5 sections (some may be empty)
2. **`related_errors` field:** Explicit linkage enables AAR Agent to pull relevant teaching points when error detected
3. **Structured misconceptions:** WRONG/CORRECT format is clear and memorable
4. **Evidence-based updates:** Captures paradigm shifts (like oxygen in STEMI)
5. **Advanced concepts:** Separates basic vs advanced teaching for differentiation
6. **Consistent field naming:** `explanation`, `rationale`, `clinical_relevance` instead of varied names

**MIGRATION PATH:**

**Asthma/STEMI:** Already close to this structure → Add `related_errors` fields, convert to object format
**Status Epilepticus:** Convert category-based topics to key_concepts, extract pearls
**TBI:** Extract topic sections into appropriate categories, add linkages

### Recommendation 3: Teaching Point Length Standards

**WHAT:**

| Field | Target Length | Character Limit | Purpose |
|---|---|---|---|
| `error` | 1 sentence | 100 chars | Quick identification |
| `teaching_point` | 2-4 sentences | 50-100 words | Core explanation |
| `consequences` | 1-2 sentences | 50 words | Patient impact |
| `prevention_strategy` | 1-2 sentences | 50 words | Actionable advice |
| `key_concept.explanation` | 2-3 sentences | 75 words | Clear understanding |
| `pearl` | 1 sentence | 80 chars | Memorable insight |
| `misconception` | WRONG/CORRECT | 150 chars combined | Clear contrast |

**WHY:**

1. **Cognitive load management:** Students can absorb 50-100 word chunks effectively
2. **AAR readability:** Prevents wall-of-text feedback
3. **Consistent student experience:** Similar depth across all scenarios
4. **Mobile-friendly:** Shorter text renders better on small screens
5. **Translation-ready:** Bounded text easier to translate to Slovak

**IMPLEMENTATION:**

For teaching points currently >100 words:
- Keep full content in `detailed_explanation` field (optional)
- Create condensed version for `teaching_point` field
- AAR Agent can show summary by default, offer "Learn more" expansion

**Example:**

**Current (Status Epilepticus E1):** 215 words in teaching_point

**Standardized:**
```json
{
  "teaching_point": "Always check blood glucose before treating seizures, especially in diabetics. Hypoglycemia causes seizures and is immediately reversible with glucose - faster and safer than benzodiazepines. Giving diazepam without checking glucose misses the treatable cause.",

  "detailed_explanation": "The seizure may stop from benzodiazepine but patient remains hypoglycemic → prolonged confusion or recurrent seizures. ALWAYS check glucose in seizure patients - takes 30 seconds and could save a life. Correct sequence: (1) Position/airway, (2) Oxygen, (3) Check glucose, (4) Give glucose if <3.5, (5) Give benzodiazepine if seizure continues or if glucose normal. In this scenario, glucose IS the treatment."
}
```

### Recommendation 4: Explicit Error-CDP-CP Linkages

**WHAT:**

Add relationship mapping section to each scenario:

```json
{
  "error_cdp_cp_linkages": {
    "E1": {
      "common_error": "Delayed bronchodilator administration",
      "triggers_if": "salbutamol given >5 minutes after arrival",
      "related_cp": "CP1",
      "cp_name": "salbutamol_before_assessment",
      "related_cdp": "CDP1",
      "cdp_name": "bronchodilator_timing_and_assessment",
      "relationship": "CP1 attempts to prevent E1 by challenging assessment order. CDP1 evaluates quality of decision even if E1 avoided."
    }
  }
}
```

**WHY:**

1. **Data validation:** Ensures CPs actually prevent the errors they're designed to address
2. **AAR Agent intelligence:** Can say "The challenge point you encountered was designed to help prevent this exact error you made"
3. **Scenario improvement:** Analytics can show if CP1 reduces E1 frequency
4. **CDP relevance:** Only evaluate CDPs related to actions student actually took
5. **Curriculum mapping:** Identifies which errors need more challenge points

**USE CASE:**

```
Student makes E1 (delayed bronchodilator)
AAR Agent checks: Was CP1 (assessment challenge) triggered?
  - If NO: Student didn't even consider bronchodilator early enough to be challenged
  - If YES but student still made error: Challenge point wasn't effective, may need revision

AAR Agent evaluates CDP1 (timing and assessment decision)
Shows: "You were challenged to think through assessment before treatment (CP1),
        and your final decision on timing (CDP1) resulted in a 7-minute delay..."
```

### Recommendation 5: Standardized ECG Findings Structure (MVP - Structured Text)

**WHAT:**

For scenarios requiring ECG interpretation (STEMI, arrhythmias, chest pain), add standardized `ecg_findings` section:

```json
{
  "ecg_findings": {
    "available": true,
    "requires_equipment": "12-lead ECG monitor",
    "acquisition_time_seconds": 10,

    "findings_structured": {
      "rhythm_and_rate": {
        "rhythm": "Sinus rhythm",
        "regularity": "regular",
        "rate_bpm": 98
      },

      "st_segment_changes": [
        {
          "leads": ["V1", "V2", "V3", "V4"],
          "change_type": "elevation",
          "magnitude_mm": "3-4",
          "territory": "anterior"
        },
        {
          "leads": ["I", "aVL"],
          "change_type": "elevation",
          "magnitude_mm": "2",
          "territory": "lateral"
        },
        {
          "leads": ["II", "III", "aVF"],
          "change_type": "depression",
          "magnitude_mm": "1-2",
          "clinical_significance": "reciprocal_changes"
        }
      ],

      "other_findings": [
        "Hyperacute T waves in anterior leads",
        "No Q waves (acute phase)"
      ]
    },

    "interpretation": {
      "diagnosis": "ACUTE ANTERIOR STEMI",
      "mechanism": "LAD (left anterior descending) artery occlusion",
      "territory": "Anterior wall with high lateral extension",
      "severity": "Large territory at risk",
      "note": "FOR AGENT REFERENCE ONLY - Used by Core Agent to validate student interpretation and by AAR Agent for feedback. NOT shown to students."
    },

    "teaching_point": "Anterior STEMI with high lateral extension - large area of myocardium at risk. LAD supplies anterior wall, septum, and apex. The reciprocal changes (ST depression in inferior leads) confirm this is NOT pericarditis. Hyperacute T waves suggest very early MI (<1 hour). This patient needs emergency PCI NOW.",
    "teaching_point_note": "FOR AAR AGENT USE - Shown in AAR feedback, NOT during active scenario",

    "presentation_mode": "structured_text",
    "note": "Visual ECG display planned for future release"
  }
}
```

**WHY:**

**Current Problem:**
- ECG data exists in STEMI scenario but Core Agent has no instructions for handling it
- When student says "I perform 12-lead ECG," Core Agent improvises inconsistent text descriptions
- Cannot evaluate ECG interpretation quality - no way to assess if student took appropriate actions based on ECG findings
- Common Error E8 "Misinterpreted ECG" cannot be properly evaluated (e.g., failed to activate STEMI network despite STEMI findings)
- Learning objective "Perform and interpret 12-lead ECG rapidly" only partially achievable

**Solution Benefits:**
1. **Consistent presentation:** All students see same structured ECG findings
2. **Independent analysis:** Findings presented without interpretation - students analyze silently
3. **Action-based evaluation:** Student competency assessed through their clinical actions (appropriate treatment, network activation, etc.)
4. **Educational value:** Students practice systematic ECG reading and demonstrate competency through appropriate decision-making
5. **Core Agent validation:** Interpretation in blueprint allows Core Agent to validate if student's actions are appropriate for ECG findings
6. **AAR feedback:** Teaching points and interpretation available for detailed AAR feedback after scenario
7. **MVP-appropriate:** Text-based solution (no UI changes), visual ECG deferred to future
8. **Realistic practice:** Mirrors real-world where providers analyze ECG and act, without needing to verbalize every interpretation

**CORE AGENT IMPLEMENTATION:**

Add ECG handling instructions to Core Agent prompt ([server/prompts/en/core-agent-ami.txt](server/prompts/en/core-agent-ami.txt)):

```markdown
## Special Assessment: 12-Lead ECG

When student performs 12-lead ECG (keywords: "ECG", "12-lead", "EKG", "perform ECG", "obtain ECG"):

**Step 1:** Access `ecg_findings` from scenario context

**Step 2:** Call `reveal_patient_info` with structured findings in this order:

1. **Rhythm and Rate** (always first):
   - category: "ecg_rhythm"
   - content: "Rhythm: [rhythm type] | Rate: [rate] bpm | Regularity: [regular/irregular]"

2. **ST Segment Changes** (critical for STEMI diagnosis):
   - category: "ecg_st_changes"
   - content: Format by territory with arrows for clarity
   - Example: "ST Changes: ↑3-4mm in V1-V4 (anterior) | ↑2mm in I, aVL (lateral) | ↓1-2mm in II, III, aVF (reciprocal)"

3. **Other Findings** (T waves, Q waves, etc.):
   - category: "ecg_other"
   - content: List other significant findings
   - Example: "Other Findings: Hyperacute T waves in anterior leads | No Q waves present"

**Step 3:** Describe the procedure in role-play text:

```
*You attach the 12-lead ECG electrodes to the patient's chest, arms, and legs.
The monitor processes the tracing and displays the results. You see clear
abnormalities across multiple leads.*
```

**Step 4:** Allow student to analyze findings and proceed with actions

**IMPORTANT:**
- Present ONLY the findings to student (rhythm, ST changes, other findings)
- DO NOT give interpretation to student - they analyze findings silently
- Student does NOT need to verbalize their interpretation - they can proceed directly with appropriate actions
- Use arrows for clarity: ↑ (elevation), ↓ (depression)
- Group leads by territory (anterior: V1-V4, lateral: I/aVL, inferior: II/III/aVF)
- Specify magnitude in mm (clinical relevance: ≥1mm significant, ≥2mm diagnostic for STEMI)
- The `interpretation` section is for Core Agent and AAR Agent reference only
- Core Agent validates student competency based on their actions (e.g., STEMI network activation after seeing STEMI pattern)
- If student asks "What's the interpretation?", redirect them to analyze the findings and decide on appropriate actions
```

**TIMING TRACKING:**

Add to scenario tracking (for performance scoring):

```javascript
// When student performs ECG
const ecg_performed_time = Date.now() - scenario_start_time;
trackCriticalAction('12_lead_ecg', ecg_performed_time);

// For STEMI: Target <4 minutes per Slovak protocol
// Award full points if <4 min, partial if <8 min, deduct if >8 min
```

**SCENARIOS REQUIRING ECG:**

| Scenario Type | ECG Required | Priority | Implementation Status |
|---|---|---|---|
| STEMI | Critical | HIGH | ✅ Has ecg_findings, needs Core Agent update |
| NSTEMI / Unstable Angina | Important | Medium | Future scenario |
| Arrhythmias (VF, VT, SVT, AF) | Critical | HIGH | Future scenario |
| Syncope evaluation | Important | Medium | Future scenario |
| Chest pain (non-cardiac) | Helpful | Low | Future scenario |
| Asthma | Not needed | N/A | No ECG section |
| Status Epilepticus | Optional | Very Low | No ECG section |
| TBI | Not needed | N/A | No ECG section |

**EXAMPLE STUDENT INTERACTION:**

```
Student: "I perform a 12-lead ECG"

Core Agent:
  → Calls reveal_patient_info three times (rhythm, ST changes, other findings)
  → Role-play text: *You attach the leads and acquire the tracing...*

Student sees in clinical notes:
  📋 Rhythm: Sinus rhythm | Rate: 98 bpm | Regularity: Regular
  📋 ST Changes: ↑3-4mm in V1-V4 (anterior) | ↑2mm in I, aVL (lateral) | ↓1-2mm in II, III, aVF (reciprocal)
  📋 Other Findings: Hyperacute T waves in anterior leads | No Q waves present

Student: [Analyzes findings silently, recognizes STEMI pattern]

Student: "I'm activating the STEMI network and calling PKI centrum"

Core Agent:
  → Internally validates: ECG shows STEMI → Student activated network → Appropriate action
  → Role-play text: *Good - you're activating the STEMI network. The dispatcher acknowledges...*

Student: "I give aspirin 200mg chewed and prepare for transport"

Core Agent:
  → Validates appropriate treatment sequence based on STEMI diagnosis
  → Role-play text: *The patient chews the aspirin tablets...*

[Note: Student analyzes ECG findings silently and takes appropriate actions. Core Agent validates
actions match ECG findings. AAR Agent later evaluates if student's actions were appropriate for
the ECG pattern shown. Interpretation is NEVER shown to student during scenario.]
```

**QUALITY ASSURANCE:**

When standardizing ECG findings:
- [ ] `ecg_findings` section present in scenarios requiring ECG
- [ ] `findings_structured` contains rhythm_and_rate, st_segment_changes, other_findings
- [ ] ST changes specify: leads (array), change_type (elevation/depression), magnitude_mm, territory
- [ ] `interpretation` section exists for Core Agent/AAR Agent reference (NOT shown to students)
- [ ] `teaching_point` explains clinical significance (for AAR feedback, NOT shown during scenario)
- [ ] `presentation_mode` set to "structured_text" for MVP
- [ ] Core Agent prompt updated with ECG handling instructions (findings only, no interpretation to students)
- [ ] Core Agent uses interpretation internally to validate if student's actions are appropriate for ECG findings
- [ ] AAR Agent uses interpretation and teaching_point for feedback after scenario
- [ ] Timing tracking added for performance evaluation
- [ ] Common Error E8 "Misinterpreted ECG" can now be properly evaluated based on student's actions (e.g., failed to activate STEMI network despite STEMI on ECG, or activated for non-STEMI pattern)

**FUTURE ENHANCEMENT (Post-MVP):**

When visual ECG display is implemented:
- Add `image_url` field pointing to ECG graphic
- Change `presentation_mode` to "visual" or "interactive"
- Add `allows_measurement` boolean for ST segment measurement practice
- Consider dynamic ECG showing evolution (hyperacute → acute → subacute) and post-treatment changes

---

**KEY PRINCIPLE - Silent Analysis and Action-Based Evaluation:**

Students receive structured ECG findings but NO interpretation. They:
1. **Analyze silently** - Review the findings and recognize patterns
2. **Act appropriately** - Take clinical actions based on their analysis (activate STEMI network, give treatments, etc.)
3. **Are evaluated by actions** - Competency assessed by whether actions match ECG findings

**NOT required:**
- ❌ Verbalizing interpretation ("This is anterior STEMI with...")
- ❌ Requesting interpretation from Core Agent
- ❌ Explaining their reasoning during scenario

**Evaluation sources:**
- ✅ Core Agent validates actions in real-time (appropriate for ECG pattern?)
- ✅ AAR Agent evaluates action sequence post-scenario (did student recognize STEMI and activate network?)
- ✅ Common Error E8 triggered if actions don't match ECG findings (e.g., no STEMI activation despite ST elevations)

This approach mirrors real clinical practice where providers analyze diagnostic tests silently and act on their findings.

---

## Implementation Priority

### Phase 1: Critical Standardization (Week 1)
**Goal:** Make all scenarios parseable by AAR Agent

1. ✅ Add `frequency` and `severity` to all common_errors
2. ✅ Extract TBI common_errors from nested location to root level
3. ✅ Ensure all common_errors have `error_id`, `error`, `teaching_point`
4. ✅ Add `category` field to all errors
5. ✅ **Add structured ECG findings to STEMI scenario** (Recommendation 5)
6. ✅ **Update Core Agent prompt with ECG handling instructions**

**Rationale:** Enables basic AAR Agent functionality across all scenarios + ECG interpretation for STEMI

### Phase 2: Enhanced Metadata (Week 2)
**Goal:** Improve AAR Agent feedback quality

1. ✅ Add `consequences` field to all errors
2. ✅ Add `points_deducted` to all errors
3. ✅ Standardize teaching_point length (50-100 words)
4. ✅ Add `related_errors` to AAR teaching points

**Rationale:** Enables richer, more specific feedback

### Phase 3: Advanced Linkages (Week 3)
**Goal:** Enable data-driven improvements

1. ✅ Add `related_cdp_id` and `related_cp_id` to errors
2. ✅ Create `error_cdp_cp_linkages` mapping section
3. ✅ Add `prevention_strategy` to errors
4. ✅ Implement `detailed_explanation` for long teaching points

**Rationale:** Enables analytics and continuous improvement

### Phase 4: AAR Teaching Points Restructure (Week 4)
**Goal:** Comprehensive standardization

1. ✅ Convert all AAR teaching points to standard 5-category structure
2. ✅ Add `advanced_concepts` sections
3. ✅ Ensure all misconceptions use WRONG/CORRECT format
4. ✅ Add evidence citations to all evidence_based_updates

**Rationale:** Complete structural consistency

---

## Migration Examples

### Example 1: Asthma E2 Enhancement

**Current:**
```json
{
  "error_id": "E2",
  "error": "No oxygen despite critical hypoxia",
  "teaching_point": "SpO2 88% is critically low - brain cells die below 90%. Oxygen is immediately life-saving and must be applied within 2 minutes"
}
```

**Standardized:**
```json
{
  "error_id": "E2",
  "error": "Failed to apply oxygen despite critical hypoxia (SpO2 88%)",
  "category": "treatment",
  "frequency": "common",
  "severity": "critical",
  "teaching_point": "SpO2 88% is critically low - brain cells begin dying below 90%. Oxygen is immediately life-saving, equivalent to CPR in cardiac arrest. Must be applied within 2 minutes of arrival.",
  "consequences": "Continued hypoxia causes irreversible brain damage, worsens bronchospasm (hypoxia triggers bronchoconstriction), increases risk of respiratory arrest. Even brief hypoxia significantly worsens outcomes.",
  "points_deducted": -15,
  "triggers_aar_flag": "critical_hypoxia",
  "related_cdp_id": "CDP2",
  "related_cp_id": "CP2",
  "prevention_strategy": "Recognize SpO2 <90% as immediate life threat. Apply oxygen within first 60 seconds while preparing other treatments. Use high-flow device (non-rebreather 15L/min) for SpO2 <90%."
}
```

### Example 2: Status Epilepticus AAR Restructure

**Current:**
```json
"aar_teaching_points": [
  {
    "category": "critical_thinking",
    "title": "WHY is patient seizing? - Treating cause vs suppressing symptoms",
    "key_concept": "Always ask 'why is this happening?' before reflexively treating symptoms...",
    "clinical_impact": "Checking glucose takes 30 seconds...",
    "evidence": "Hypoglycemia <3.0 mmol/L causes seizures..."
  }
]
```

**Standardized:**
```json
"aar_teaching_points": {
  "key_concepts": [
    {
      "concept": "Treat the cause, not just the symptom - Why is patient seizing?",
      "explanation": "Always ask 'why is this happening?' before reflexively treating. In this case: Type 1 diabetic + didn't eat + took insulin = HYPOGLYCEMIA → seizure. Treating hypoglycemia stops seizure by fixing the cause, not just suppressing it.",
      "clinical_relevance": "Checking glucose takes 30 seconds. Giving glucose (if low) stops seizure in 2-4 minutes - faster and safer than benzodiazepine alone. Plus you've fixed the underlying problem.",
      "related_errors": ["E1", "E4", "E9"]
    }
  ],

  "clinical_pearls": [
    {
      "pearl": "VITAMINS mnemonic for seizure causes: Vascular, Infection, Trauma, Aura (epilepsy), Metabolic (HYPOGLYCEMIA), Iatrogenic, Neoplasm, Syncope",
      "rationale": "Systematic approach prevents anchoring bias and missed diagnoses",
      "related_errors": ["E1", "E9"]
    }
  ],

  "evidence_based_updates": [
    {
      "topic": "Glucose administration in seizures",
      "old_practice": "Treat seizure with benzodiazepine first, check glucose later if seizure doesn't stop",
      "current_practice": "Check glucose immediately in all seizure patients (30-second test). Give glucose if <3.5 mmol/L before or alongside benzodiazepine",
      "evidence": "Multiple studies show hypoglycemic seizures terminate faster with glucose than benzodiazepines. Glucose <3.0 mmol/L causes seizures in diabetics. Always check glucose in altered mental status.",
      "related_errors": ["E1"]
    }
  ]
}
```

### Example 3: TBI Common Errors Extraction

**Current (nested in aar_teaching_points):**
```json
"aar_teaching_points": {
  "common_errors": {
    "sedating_tbi_patient": "Never give benzodiazepines..."
  }
}
```

**Standardized (moved to root level):**
```json
"common_errors": [
  {
    "error_id": "E3",
    "error": "Gave benzodiazepines or excessive opioids to TBI patient",
    "category": "medication",
    "frequency": "common",
    "severity": "dangerous",
    "teaching_point": "Never give benzodiazepines or high-dose opioids to TBI patients unless treating specific indication (active seizure, severe agitation requiring chemical restraint). Sedation masks neurological deterioration - you cannot distinguish sedation from herniation if GCS is dropping.",
    "consequences": "Lost ability to assess neurological status. Cannot detect deterioration until catastrophic (respiratory arrest, herniation). Sedatives also cause respiratory depression, worsening hypoxia and secondary brain injury.",
    "points_deducted": -15,
    "triggers_aar_flag": "inappropriate_sedation",
    "related_cdp_id": "CDP3",
    "related_cp_id": null,
    "prevention_strategy": "Maintain ability to assess neurologically. For anxiety: use calm voice and explanation, not benzodiazepines. Patient's level of consciousness is your only window into brain status - don't fog that window."
  }
]
```

---

## Quality Assurance Checklist

Use this checklist when standardizing each scenario:

### Common Errors Section
- [ ] All errors at root level (not nested)
- [ ] Every error has: error_id, error, category, frequency, severity, teaching_point
- [ ] Teaching points are 50-100 words
- [ ] All consequences clearly state patient impact
- [ ] Points_deducted values are negative integers
- [ ] Categories use standard values: assessment|treatment|medication|communication|safety
- [ ] Frequency uses: very_common|common|moderate|uncommon
- [ ] Severity uses: critical|dangerous|moderate|minor
- [ ] Related CDP/CP IDs match actual CDP/CP definitions
- [ ] Prevention strategies are specific and actionable

### AAR Teaching Points Section
- [ ] Uses standard 5 categories: key_concepts, clinical_pearls, common_misconceptions, evidence_based_updates, advanced_concepts
- [ ] All items have related_errors arrays
- [ ] Misconceptions use "WRONG:" / "CORRECT:" format
- [ ] Evidence updates include old_practice, current_practice, evidence fields
- [ ] Key concepts have concept, explanation, clinical_relevance fields
- [ ] No category is completely empty (at minimum 1 item per category)
- [ ] Advanced concepts clearly marked and separate from basics
- [ ] All teaching points link back to at least one common error

### Cross-References
- [ ] All CDP IDs referenced in errors exist in critical_decision_points section
- [ ] All CP IDs referenced in errors exist in challenge_points section
- [ ] All error IDs in related_errors arrays exist in common_errors section
- [ ] Error_cdp_cp_linkages section created with mappings
- [ ] No orphaned errors (every error referenced somewhere in AAR teaching points)

### Length Compliance
- [ ] Error descriptions <100 characters
- [ ] Teaching points 50-100 words (use detailed_explanation if longer)
- [ ] Consequences <50 words
- [ ] Prevention strategies <50 words
- [ ] Key concept explanations <75 words
- [ ] Clinical pearls <80 characters
- [ ] Misconception pairs <150 characters combined

---

## Expected Benefits

### For AAR Agent Development
1. **Simplified code:** Single parsing function works for all scenarios
2. **Reliable data access:** No scenario-specific conditional logic
3. **Rich feedback generation:** Access to severity, frequency, consequences, prevention strategies
4. **Intelligent prioritization:** Can emphasize critical/very_common errors
5. **Contextual teaching:** Can pull related teaching points automatically

### For Analytics & Improvement
1. **Cross-scenario analysis:** Compare error frequencies across scenarios
2. **Challenge point effectiveness:** Measure if CPs reduce related errors
3. **Content gaps identification:** Find errors without prevention strategies
4. **Student progression tracking:** Identify which errors improve with practice
5. **Evidence-based updates:** Track paradigm shifts across medical education

### For Content Creators
1. **Clear template:** New scenarios follow established pattern
2. **Quality standards:** Length limits ensure consistent depth
3. **Linkage validation:** Explicit relationships prevent orphaned content
4. **Reusable components:** Common errors can inform challenge point design
5. **Translation support:** Bounded field lengths simplify Slovak translation

### For Students
1. **Consistent experience:** Similar feedback depth across all scenarios
2. **Actionable guidance:** Prevention strategies tell them what to do differently
3. **Normalized expectations:** Frequency data ("this is common") reduces anxiety
4. **Evidence-based learning:** Updates section shows evolving medical practice
5. **Progressive difficulty:** Advanced concepts available for high performers

---

## Appendix A: Complete Field Definitions

### common_errors Fields

| Field | Type | Required | Values | Purpose |
|---|---|---|---|---|
| error_id | string | Yes | "E1", "E2", ... | Unique identifier within scenario |
| error | string | Yes | 1 sentence, <100 chars | What student did wrong |
| category | string | Yes | assessment, treatment, medication, communication, safety | Error type for grouping |
| frequency | string | Yes | very_common, common, moderate, uncommon | How often students make this error |
| severity | string | Yes | critical, dangerous, moderate, minor | Patient impact severity |
| teaching_point | string | Yes | 2-4 sentences, 50-100 words | Why wrong, what to do instead |
| consequences | string | Yes | 1-2 sentences, <50 words | Patient impact if error occurs |
| points_deducted | integer | Yes | Negative integer | Scoring impact |
| triggers_aar_flag | string | No | Flag name from scenario | Links to automated detection |
| related_cdp_id | string | No | "CDP1", "CDP2", ... | Related critical decision point |
| related_cp_id | string | No | "CP1", "CP2", ... | Related challenge point |
| prevention_strategy | string | Yes | 1-2 sentences, <50 words | How to avoid this error |
| detailed_explanation | string | No | Extended explanation | For complex topics >100 words |

### aar_teaching_points.key_concepts Fields

| Field | Type | Required | Purpose |
|---|---|---|---|
| concept | string | Yes | Brief title (5-10 words) |
| explanation | string | Yes | What it means (2-3 sentences, <75 words) |
| clinical_relevance | string | Yes | Why it matters (1-2 sentences) |
| related_errors | array | Yes | Error IDs that connect to this concept |

### aar_teaching_points.clinical_pearls Fields

| Field | Type | Required | Purpose |
|---|---|---|---|
| pearl | string | Yes | Specific tip (1 sentence, <80 chars) |
| rationale | string | No | Why it works (1 sentence) |
| related_errors | array | Yes | Error IDs that connect to this pearl |

### aar_teaching_points.common_misconceptions Fields

| Field | Type | Required | Purpose |
|---|---|---|---|
| misconception | string | Yes | "WRONG: belief" (<75 chars) |
| correction | string | Yes | "CORRECT: truth" (<75 chars) |
| explanation | string | Yes | Why misconception is dangerous (2-3 sentences) |
| related_errors | array | Yes | Error IDs that stem from this misconception |

### aar_teaching_points.evidence_based_updates Fields

| Field | Type | Required | Purpose |
|---|---|---|---|
| topic | string | Yes | Area of practice that changed |
| old_practice | string | Yes | What was done before |
| current_practice | string | Yes | What should be done now |
| evidence | string | Yes | Study/guideline with year and key finding |
| related_errors | array | Yes | Errors from using old practice |

### aar_teaching_points.advanced_concepts Fields

| Field | Type | Required | Purpose |
|---|---|---|---|
| concept | string | Yes | Complex topic title |
| explanation | string | Yes | Detailed explanation with pathophysiology |
| when_to_apply | string | Yes | Clinical scenarios where this applies |
| prerequisite_knowledge | array | No | References to key_concepts needed first |
| related_errors | array | No | Advanced errors (if any) |

---

## Appendix B: Validation Schema (JSON Schema)

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "common_errors": {
      "type": "array",
      "minItems": 5,
      "items": {
        "type": "object",
        "required": ["error_id", "error", "category", "frequency", "severity", "teaching_point", "consequences", "points_deducted", "prevention_strategy"],
        "properties": {
          "error_id": {
            "type": "string",
            "pattern": "^E[0-9]+$"
          },
          "error": {
            "type": "string",
            "maxLength": 100
          },
          "category": {
            "type": "string",
            "enum": ["assessment", "treatment", "medication", "communication", "safety"]
          },
          "frequency": {
            "type": "string",
            "enum": ["very_common", "common", "moderate", "uncommon"]
          },
          "severity": {
            "type": "string",
            "enum": ["critical", "dangerous", "moderate", "minor"]
          },
          "teaching_point": {
            "type": "string",
            "minLength": 50,
            "maxLength": 600
          },
          "consequences": {
            "type": "string",
            "maxLength": 300
          },
          "points_deducted": {
            "type": "integer",
            "maximum": 0
          },
          "prevention_strategy": {
            "type": "string",
            "maxLength": 300
          },
          "related_cdp_id": {
            "type": "string",
            "pattern": "^CDP[0-9]+$"
          },
          "related_cp_id": {
            "type": "string",
            "pattern": "^CP[0-9]+$"
          }
        }
      }
    },
    "aar_teaching_points": {
      "type": "object",
      "required": ["key_concepts", "clinical_pearls", "common_misconceptions", "evidence_based_updates"],
      "properties": {
        "key_concepts": {
          "type": "array",
          "items": {
            "type": "object",
            "required": ["concept", "explanation", "clinical_relevance", "related_errors"],
            "properties": {
              "related_errors": {
                "type": "array",
                "items": {"type": "string", "pattern": "^E[0-9]+$"}
              }
            }
          }
        }
      }
    }
  }
}
```

---

## Appendix C: Migration Script Pseudo-code

```javascript
// Pseudo-code for automated migration assistance

function standardizeCommonErrors(scenario) {
  let errors = extractErrors(scenario); // Handle TBI nested case

  return errors.map(error => {
    return {
      error_id: error.error_id,
      error: truncate(error.error, 100),
      category: inferCategory(error),
      frequency: promptForFrequency(error),
      severity: inferSeverity(error),
      teaching_point: standardizeLength(error.teaching_point, 50, 100),
      consequences: extractConsequences(error) || promptForConsequences(error),
      points_deducted: error.points || inferPointsFromSeverity(error.severity),
      triggers_aar_flag: findAARFlag(error, scenario),
      related_cdp_id: findRelatedCDP(error, scenario),
      related_cp_id: findRelatedCP(error, scenario),
      prevention_strategy: generatePreventionStrategy(error),
      detailed_explanation: error.teaching_point.length > 600 ? error.teaching_point : null
    };
  });
}

function inferCategory(error) {
  const keywords = {
    assessment: ['assess', 'examination', 'check', 'GCS', 'vital signs'],
    treatment: ['oxygen', 'position', 'intervention', 'c-spine'],
    medication: ['aspirin', 'benzodiazepine', 'dose', 'drug', 'administer'],
    communication: ['activate', 'call', 'notify', 'explain'],
    safety: ['c-spine', 'scene safety', 'contraindication']
  };

  for (let [category, words] of Object.entries(keywords)) {
    if (words.some(word => error.error.toLowerCase().includes(word))) {
      return category;
    }
  }

  return promptForCategory(error);
}

function inferSeverity(error) {
  const criticalKeywords = ['death', 'arrest', 'herniation', 'catastrophic', 'never event'];
  const dangerousKeywords = ['respiratory depression', 'hypoxia', 'hypotension', 'dangerous'];

  const text = (error.error + ' ' + error.teaching_point).toLowerCase();

  if (criticalKeywords.some(kw => text.includes(kw))) return 'critical';
  if (dangerousKeywords.some(kw => text.includes(kw))) return 'dangerous';
  if (error.points && error.points < -15) return 'critical';
  if (error.points && error.points < -10) return 'dangerous';

  return promptForSeverity(error);
}

// Similar functions for other inferences...
```

---

## Document Revision History

| Version | Date | Changes |
|---|---|---|
| 1.0 | 2026-01-07 | Initial recommendations based on 4-scenario audit |

