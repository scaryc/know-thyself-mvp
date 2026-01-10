# Blueprint Structure Enhancement Guide

**Document Purpose:** Complete guide for enhancing simulation scenario blueprints to support Full Context AAR with Checklist Matching
**Version:** 2.2
**Date:** January 2025
**Context:** These enhancements support the Full Context AAR architecture (Phase 1) and Checklist Matching system (Phase 2)
**Integrated with:** AAR Agent prompt system for medical consequence usage and Core Agent ECG handling

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Jan 2025 | Initial clinical_anchor and consequence_template suggestions |
| 2.0 | Jan 2025 | Added checklist matching configuration (Phase 2 support) |
| 2.1 | Jan 2025 | Comprehensive consequence templates expansion: categories, variables, medical accuracy guidelines, complete examples, AAR integration |
| 2.2 | Jan 2025 | **PART 4: ECG FINDINGS STANDARDIZATION** - Complete ECG structure requirements, templates for all scenario types, Core Agent integration, migration guide |

---

## Executive Summary

Blueprint enhancements serve two purposes:

1. **Educational Quality** — Clinical anchors and teaching content for AAR feedback
2. **Technical Accuracy** — Matching configuration for reliable checklist tracking

With Full Context AAR, the agent has access to complete blueprints and transcripts. These enhancements ensure:
- Consistent, memorable educational messaging
- Accurate action-to-checklist matching
- Reliable performance scoring

---

## ⚠️ MVP CHANGE: Challenge Points Removed

**Effective Date:** January 2025

For the MVP, challenge points (Socratic questions during scenarios) have been removed from the system.

### What to Remove from New Blueprints:
1. **`challenge_points` section** — Do NOT include in new blueprints
2. **Challenge point references in `clinical_anchors`** — Remove any anchors specific to challenge points

### What to Keep:
- All other sections remain unchanged
- `matching` configuration for checklist items
- `clinical_anchors` in common_errors and CDPs
- `consequence_templates` for AAR feedback
- `ecg_findings` standardization

### Existing Blueprints:
Existing blueprints with `challenge_points` sections will be replaced with new blueprint structure.
The `challenge_points` data will simply be ignored by the system.

---

## Enhancement Categories

| Category | Purpose | Priority | Effort |
|----------|---------|----------|--------|
| Checklist Matching Config | Enable accurate action detection | **HIGH** | 15-20 min/scenario |
| Clinical Anchors | Memorable teaching phrases | **HIGH** | 30-45 min/scenario |
| Consequence Templates | Medical consequence explanations for AAR | **HIGH** | 45-60 min/scenario |
| **ECG Findings Standardization** | **Structured ECG for all scenarios** | **HIGH** | **20-30 min/scenario** |

---

# PART 1: CHECKLIST MATCHING CONFIGURATION

## Why Matching Configuration Matters

The checklist matcher (`findChecklistMatch()`) needs to recognize when a student performs an action. Students describe actions in many ways:

**Blueprint says:** "Apply high-flow oxygen"

**Student might say:**
- "Give oxygen" ✓
- "Start O2 mask" ✓ (abbreviation)
- "Apply NRB at 15L" ✓ (device name implies oxygen)
- "Put patient on high-flow" ✓ (oxygen implied)
- "15 liters via mask" ✓ (no oxygen keyword)

Without matching configuration, the system may miss valid actions or create false positives.

---

## Matching Configuration Structure

Add a `matching` object to each critical action checklist item:

```json
{
  "id": "CA3",
  "action": "Apply high-flow oxygen",
  "category": "treatment",
  "time_target_minutes": 2,
  "points": 15,
  "importance": "critical",
  
  "matching": {
    "keywords": ["oxygen", "o2"],
    "synonyms": ["non-rebreather", "nrb", "nasal cannula", "high-flow", "mask", "15l", "15 l"],
    "tool_mappings": ["administer_oxygen", "apply_oxygen"],
    "exclusion_keywords": ["don't", "dont", "not yet", "should i", "do i need"]
  }
}
```

### Field Definitions

| Field | Purpose | Examples |
|-------|---------|----------|
| `keywords` | Primary words that indicate this action | `["oxygen", "o2"]` |
| `synonyms` | Alternative terms, device names, abbreviations | `["nrb", "non-rebreather", "nasal cannula"]` |
| `tool_mappings` | Backend tool call names that map to this action | `["administer_oxygen"]` |
| `exclusion_keywords` | Phrases that indicate NOT doing the action | `["don't", "should i", "not yet"]` |

### Matching Priority

1. Check `exclusion_keywords` first — if found, reject match
2. Check `keywords` — primary match
3. Check `synonyms` — secondary match
4. Check `tool_mappings` — system-level match

---

## Enhanced Checklist Examples

### Asthma Scenario Checklist

```json
"critical_actions_checklist": [
  {
    "id": "CA1",
    "action": "Scene safety assessment",
    "category": "scene_safety",
    "time_target_minutes": 1,
    "points": 5,
    "importance": "essential",
    "matching": {
      "keywords": ["scene", "safety", "safe"],
      "synonyms": ["hazard", "danger", "secure", "bsi", "ppe", "gloves"],
      "exclusion_keywords": []
    }
  },
  {
    "id": "CA2",
    "action": "Recognize life-threatening asthma",
    "category": "assessment",
    "time_target_minutes": 2,
    "points": 15,
    "importance": "critical",
    "criteria": "Identifies SpO2 <92%, can't complete sentences, severe distress",
    "matching": {
      "keywords": ["life-threatening", "severe", "critical"],
      "synonyms": ["status asthmaticus", "respiratory failure", "hypoxia", "can't speak", "unable to speak", "tripod"],
      "exclusion_keywords": []
    }
  },
  {
    "id": "CA3",
    "action": "Apply high-flow oxygen",
    "category": "treatment",
    "time_target_minutes": 2,
    "points": 15,
    "importance": "critical",
    "matching": {
      "keywords": ["oxygen", "o2"],
      "synonyms": ["non-rebreather", "nrb", "nasal cannula", "high-flow", "high flow", "mask", "15l", "15 l", "15 liters"],
      "tool_mappings": ["administer_oxygen", "apply_oxygen"],
      "exclusion_keywords": ["don't", "dont", "not yet", "should i", "do i need", "stop oxygen", "remove"]
    }
  },
  {
    "id": "CA4",
    "action": "Administer salbutamol nebulizer",
    "category": "treatment",
    "time_target_minutes": 5,
    "points": 25,
    "importance": "critical",
    "criteria": "Correct dose (5mg), oxygen-driven nebulizer",
    "matching": {
      "keywords": ["salbutamol", "albuterol"],
      "synonyms": ["ventolin", "bronchodilator", "nebulizer", "neb", "beta agonist", "5mg", "5 mg"],
      "tool_mappings": ["administer_salbutamol", "give_nebulizer"],
      "exclusion_keywords": ["don't", "dont", "not yet", "hold", "wait"]
    }
  },
  {
    "id": "CA5",
    "action": "Administer corticosteroids",
    "category": "treatment",
    "time_target_minutes": 10,
    "points": 10,
    "importance": "important",
    "matching": {
      "keywords": ["steroid", "corticosteroid"],
      "synonyms": ["hydrocortisone", "methylprednisolone", "prednisolone", "dexamethasone", "solu-medrol", "100mg", "125mg"],
      "tool_mappings": ["administer_steroid", "give_corticosteroid"],
      "exclusion_keywords": ["don't", "dont", "not yet"]
    }
  },
  {
    "id": "CA6",
    "action": "Complete ABCDE assessment",
    "category": "assessment",
    "time_target_minutes": 5,
    "points": 10,
    "importance": "essential",
    "criteria": "All five components checked",
    "matching": {
      "keywords": ["abcde", "primary survey"],
      "synonyms": ["abc", "systematic assessment", "airway breathing circulation", "a b c d e"],
      "exclusion_keywords": []
    }
  },
  {
    "id": "CA7",
    "action": "Obtain SAMPLE history",
    "category": "assessment",
    "time_target_minutes": 8,
    "points": 5,
    "importance": "important",
    "matching": {
      "keywords": ["sample", "history"],
      "synonyms": ["allergies", "medications", "past medical", "last meal", "events", "symptoms"],
      "exclusion_keywords": []
    }
  },
  {
    "id": "CA8",
    "action": "Monitor and reassess",
    "category": "monitoring",
    "time_target_minutes": 10,
    "points": 5,
    "importance": "important",
    "criteria": "Check vitals after treatment, reassess breathing",
    "matching": {
      "keywords": ["reassess", "recheck", "monitor"],
      "synonyms": ["re-assess", "re-check", "check again", "vitals again", "repeat vitals", "how is she doing"],
      "tool_mappings": ["check_vitals", "measure_vitals"],
      "exclusion_keywords": []
    }
  }
]
```

---

## Matching Configuration Guidelines

### 1. Keywords: Core Recognition Terms

Choose 1-3 primary keywords that MUST appear in any description of this action.

**Good keywords:**
- Specific medical terms: `oxygen`, `salbutamol`, `ECG`
- Action verbs: `intubate`, `defibrillate`
- Unique identifiers: `12-lead`, `c-spine`

**Bad keywords:**
- Generic terms: `give`, `check`, `do`
- Common words: `patient`, `treatment`

### 2. Synonyms: Expand Recognition

Include:
- Medical abbreviations: `o2`, `nrb`, `bvm`
- Brand names: `ventolin` for salbutamol
- Device names: `non-rebreather` implies oxygen
- Dosages: `5mg`, `15L` when specific to action
- Common phrasings: `high-flow`, `high flow`

### 3. Tool Mappings: System Integration

If your backend uses tool calls for actions, map them here:

```json
"tool_mappings": ["administer_oxygen", "apply_o2_therapy"]
```

This allows matching even when the AI internally calls a tool without the student explicitly naming the action.

### 4. Exclusion Keywords: Prevent False Positives

Critical for avoiding incorrect matches when students:
- Ask questions: "should I give oxygen?"
- Express uncertainty: "I'm not sure if oxygen is needed"
- Decline action: "don't give oxygen yet"
- Stop action: "remove the oxygen mask"

**Common exclusion patterns:**
```json
"exclusion_keywords": [
  "don't", "dont", "do not",
  "should i", "should we", "do i need",
  "not yet", "hold", "wait",
  "stop", "remove", "discontinue"
]
```

---

## Tiered Enhancement Strategy

Not all checklist items need equal attention. Focus effort on high-value items:

### Tier 1: Critical Items (Full Enhancement)

Items where misdetection has serious consequences:
- Oxygen administration
- Critical medications
- Airway interventions
- Defibrillation

**Effort:** Complete matching configuration with all fields

### Tier 2: Important Items (Standard Enhancement)

Items that matter but have less ambiguity:
- Assessment completeness
- History taking
- Monitoring

**Effort:** Keywords + key synonyms

### Tier 3: Supporting Items (Minimal Enhancement)

Items with straightforward detection:
- Scene safety
- Documentation

**Effort:** Keywords only (system uses defaults)

---

# PART 2: CLINICAL ANCHORS

## What Clinical Anchors Are

A `clinical_anchor` is a carefully crafted, memorable phrase that encapsulates a key clinical teaching point. These are "sticky" phrases designed to persist in student memory.

## Why They Matter

- Post-simulation, students retain 2-3 key insights maximum
- Emotional anchoring through vivid language creates stronger memories
- Consistent messaging across sessions reinforces learning
- Expert-crafted phrases are more effective than AI-generated variations

## Where to Add Clinical Anchors

### In `common_errors`:

```json
{
  "error_id": "E2",
  "error": "No oxygen despite critical hypoxia",
  "teaching_point": "SpO2 88% is critically low - brain cells die below 90%...",
  "clinical_anchor": "Time is tissue—every minute of hypoxia compounds damage that can't be undone."
}
```

### In CDP `aar_teaching_point`:

```json
{
  "id": "CDP3",
  "name": "silent_chest_recognition",
  "aar_teaching_point": "Silent chest is one of the most ominous findings...",
  "clinical_anchor": "Wheeze means air moving—concerning but alive. Silence means no air moving—minutes from arrest."
}
```

---

## Characteristics of Good Clinical Anchors

| Characteristic | Example | Why It Works |
|----------------|---------|--------------|
| **Contrast/paradox** | "Silence isn't golden—it's ominous" | Creates cognitive tension |
| **Rhythm/cadence** | "Wheeze = air moving. Silence = no air moving." | Parallel structure |
| **Vivid imagery** | "Throwing medication into a void" | Visual metaphors stick |
| **Clinical maxim format** | "Time is tissue" | Mimics medical aphorisms |
| **Patient-centric** | "Your patient's brain was accumulating damage" | Emotional weight |

## Guidelines for Creating Clinical Anchors

1. **One core idea per anchor** — don't pack multiple concepts
2. **Under 20 words** — brevity aids recall
3. **Action-oriented when possible** — tells student what to do/recognize
4. **Medically accurate** — must survive expert scrutiny
5. **Unique per concept** — avoid repetition across anchors

---

# PART 3: CONSEQUENCE TEMPLATES

## Why Consequence Templates Are Powerful

Medical consequences transform abstract feedback ("you were too slow") into visceral, memorable learning experiences ("during those 6 minutes, the patient's brain was accumulating hypoxic damage").

With Full Context AAR, the agent has access to:
- Complete transcripts showing what the student did
- Checklist data showing timing and gaps
- State history showing patient deterioration

Consequence templates provide:
1. **Medical Accuracy** — Expert-validated explanations of patient harm
2. **Educational Impact** — Visceral understanding of stakes and urgency
3. **Consistency** — Same messaging across students for same gaps
4. **Personalization** — Variables populated with actual scenario data

## When to Use Consequence Templates

| Situation | Use Template? | Why |
|-----------|--------------|-----|
| Critical timing delays (oxygen, defibrillation) | **YES** | Accuracy paramount, stakes high |
| Missed life-saving actions | **YES** | Must emphasize severity consistently |
| Common predictable gaps | **YES** | Consistency valuable for repeated teaching |
| Medication dosing errors | **YES** | Medical accuracy critical |
| Assessment gaps with serious consequences | **YES** | Connect gap to missed escalation |
| Minor delays or non-critical items | NO | Let AAR generate naturally |
| Unusual/rare situations | NO | Templates too rigid |
| Multi-factor complex issues | NO | Requires nuanced AAR analysis |

**Priority:** Focus template development on actions marked `importance: "critical"` in checklist.

---

## Consequence Categories

### 1. Timing Delays
**When:** Student performed action, but too late
**Purpose:** Show patient harm accumulating during delay

```json
"delayed_oxygen": {
  "gap_triggers": ["CA3_late"],
  "severity": "critical",
  "template": "During the {delay_minutes} minute delay, {patient_name}'s SpO2 remained at {final_spo2}%. Each minute of SpO2 <85% accelerates cerebral hypoxia—brain cells begin dying after 4-6 minutes. You were at the edge of irreversible harm.",
  "variables": ["delay_minutes", "patient_name", "final_spo2"],
  "medical_basis": "Cerebral hypoxia timeline per ILCOR guidelines"
}
```

### 2. Missed Critical Actions
**When:** Student never performed life-saving action
**Purpose:** Show what would happen without intervention

```json
"missed_oxygen": {
  "gap_triggers": ["CA3_missed"],
  "severity": "critical",
  "template": "Without oxygen, {patient_name}'s SpO2 of {final_spo2}% would continue dropping at ~2-4% per minute. At this trajectory, cardiac arrest occurs within 3-5 minutes. Oxygen was the only intervention keeping this patient viable.",
  "variables": ["patient_name", "final_spo2"],
  "medical_basis": "Hypoxic arrest progression rates"
}
```

### 3. Medication Errors
**When:** Wrong drug, wrong dose, or contraindicated medication
**Purpose:** Explain clinical impact of the specific error

```json
"underdose_salbutamol": {
  "gap_triggers": ["medication_error_salbutamol"],
  "severity": "important",
  "template": "You gave {actual_dose}mg instead of the correct {target_dose}mg dose. Half-dose bronchodilation delays airway opening by 3-5 minutes. In severe asthma, those minutes mean the difference between talking and intubating.",
  "variables": ["actual_dose", "target_dose"],
  "medical_basis": "Dose-response curves for beta-agonists"
}
```

### 4. Assessment Gaps
**When:** Student missed critical finding that should have changed approach
**Purpose:** Show what they failed to recognize and its implications

```json
"missed_silent_chest": {
  "gap_triggers": ["CDP_silent_chest_fail"],
  "severity": "critical",
  "template": "Silent chest is the most ominous sign in asthma—it means air isn't moving at all. You missed the 30-second assessment that would have changed your entire treatment approach from 'urgent' to 'imminent arrest.' This patient needed aggressive airway management, not just bronchodilators.",
  "variables": [],
  "medical_basis": "Silent chest as pre-arrest indicator"
}
```

### 5. Treatment Sequence Errors
**When:** Student did right things in wrong order
**Purpose:** Explain why sequence matters physiologically

```json
"delayed_reassessment": {
  "gap_triggers": ["CA8_late", "CA8_missed"],
  "severity": "important",
  "template": "Without reassessment after {treatment}, you never confirmed the treatment worked. {patient_name} could have been deteriorating while you moved on to history-taking. Treatment without reassessment is like throwing medication into a void—you never know if it landed.",
  "variables": ["treatment", "patient_name"],
  "medical_basis": "Closed-loop communication and reassessment protocols"
}
```

---

## Complete Template Structure

```json
"consequence_templates": {
  "template_id": {
    "gap_triggers": ["checklist_item_id_late", "checklist_item_id_missed"],
    "severity": "critical|important|moderate",
    "category": "timing_delay|missed_action|medication_error|assessment_gap|sequence_error",
    "template": "The consequence message with {variables}...",
    "variables": ["var1", "var2"],
    "medical_basis": "Citation or rationale for the consequence",
    "applies_to": ["checklist_item_ids that this template addresses"]
  }
}
```

### Field Definitions

| Field | Purpose | Required |
|-------|---------|----------|
| `gap_triggers` | Checklist IDs that trigger this template (e.g., `["CA3_late", "CA3_missed"]`) | YES |
| `severity` | Impact level: `critical`, `important`, `moderate` | YES |
| `category` | Type of consequence (see 5 categories above) | YES |
| `template` | The consequence message with variables | YES |
| `variables` | List of variables to be populated from scenario data | YES |
| `medical_basis` | Medical rationale or citation for accuracy review | YES |
| `applies_to` | Which checklist items this addresses | NO |

---

## Writing Effective Consequence Templates

### 1. Use Specific Medical Language

**Bad:**
"Delayed oxygen is dangerous and could hurt the patient."

**Good:**
"Each minute of SpO2 <85% accelerates cerebral hypoxia—brain cells begin dying after 4-6 minutes."

### 2. Quantify When Possible

**Bad:**
"The patient could have died."

**Good:**
"At this trajectory, cardiac arrest occurs within 3-5 minutes."

### 3. Make It Personal to the Patient

**Bad:**
"Oxygen should be given early in asthma."

**Good:**
"During the {delay_minutes} minute delay, {patient_name}'s brain was accumulating hypoxic damage."

### 4. Use Vivid, Memorable Language

**Bad:**
"You should have reassessed after treatment."

**Good:**
"Treatment without reassessment is like throwing medication into a void—you never know if it landed."

### 5. Balance Severity with Teaching

**Bad:**
"You almost killed the patient by being too slow."

**Good:**
"You were at the edge of irreversible harm. Here's why oxygen timing is measured in minutes, not comfort: [teaching point]."

### 6. Connect Timing to Physiology

**Bad:**
"You were 5 minutes late."

**Good:**
"During those 5 minutes, airway inflammation was compounding—each minute of delay exponentially increases the risk of complete obstruction."

---

## Variable System

Templates can use variables populated from scenario data. The AAR agent will replace these with actual values.

### Available Variables

| Variable | Source | Example Value |
|----------|--------|---------------|
| `{delay_minutes}` | checklistResults timing | `6.2` |
| `{patient_name}` | blueprint patient_profile | `Maria` |
| `{actual_time}` | checklistResults.time | `8.2` |
| `{target_time}` | checklistResults.target | `2` |
| `{initial_spo2}` | stateHistory (first state) | `88` |
| `{final_spo2}` | stateHistory (last state or at action time) | `84` |
| `{actual_dose}` | medication error log | `2.5mg` |
| `{target_dose}` | blueprint medications_available | `5mg` |
| `{treatment}` | Action name from checklist | `salbutamol` |
| `{state_before}` | Patient state before action | `deteriorating` |
| `{state_after}` | Patient state after action | `stable` |

### Using Variables in Templates

```json
"template": "You applied {treatment} at {actual_time} minutes (target: {target_time} minutes). During the {delay_minutes} minute delay, {patient_name}'s SpO2 remained at {final_spo2}%..."
```

AAR agent populates:
```
"You applied oxygen at 8.2 minutes (target: 2 minutes). During the 6.2 minute delay, Maria's SpO2 remained at 84%..."
```

---

## Medical Accuracy Guidelines

Consequence templates must be medically accurate because:
1. Students trust simulation feedback as authoritative
2. Inaccurate consequences teach wrong physiology
3. Overstated consequences reduce credibility

### Accuracy Checklist

- [ ] **Timing claims verified** — Use evidence-based timeframes (e.g., ILCOR, AHA guidelines)
- [ ] **Physiological explanations correct** — Review with medical expert
- [ ] **Risk quantification conservative** — Don't exaggerate percentages or timeframes
- [ ] **Terminology precise** — Use correct medical terms
- [ ] **Citations available** — Document medical basis for review

### Common Pitfalls

❌ **Overstating:** "You would have killed the patient"
✅ **Accurate:** "Risk of cardiac arrest increased significantly"

❌ **Vague:** "This is dangerous"
✅ **Specific:** "Each minute of SpO2 <85% accelerates cerebral hypoxia"

❌ **Absolute:** "The patient will die without X"
✅ **Probabilistic:** "Without X, cardiac arrest occurs within 3-5 minutes in 70% of cases"

---

## Complete Example: Asthma Scenario Consequences

```json
"consequence_templates": {
  "delayed_oxygen": {
    "gap_triggers": ["CA3_late"],
    "severity": "critical",
    "category": "timing_delay",
    "template": "You applied oxygen at {actual_time} minutes—{delay_minutes} minutes past the {target_time}-minute target. During that delay, {patient_name}'s SpO2 remained at {final_spo2}%. Each minute of SpO2 <85% accelerates cerebral hypoxia—brain cells begin dying after 4-6 minutes. You were at the edge of irreversible harm.",
    "variables": ["actual_time", "delay_minutes", "target_time", "patient_name", "final_spo2"],
    "medical_basis": "ILCOR cerebral hypoxia timelines",
    "applies_to": ["CA3"]
  },

  "missed_oxygen": {
    "gap_triggers": ["CA3_missed"],
    "severity": "critical",
    "category": "missed_action",
    "template": "You never applied oxygen despite {patient_name}'s SpO2 of {final_spo2}%. Without oxygen, SpO2 continues dropping at ~2-4% per minute in severe asthma. At this trajectory, cardiac arrest occurs within 3-5 minutes. Oxygen was the only intervention keeping this patient viable.",
    "variables": ["patient_name", "final_spo2"],
    "medical_basis": "Hypoxic arrest progression in acute asthma",
    "applies_to": ["CA3"]
  },

  "delayed_salbutamol": {
    "gap_triggers": ["CA4_late"],
    "severity": "critical",
    "category": "timing_delay",
    "template": "Salbutamol was given at {actual_time} minutes (target: {target_time} minutes). During those {delay_minutes} minutes, {patient_name}'s airways were progressively constricting. In severe asthma, bronchodilator isn't just treatment—it's buying time before the airways slam shut. Every minute of delay exponentially increases the risk of complete obstruction.",
    "variables": ["actual_time", "target_time", "delay_minutes", "patient_name"],
    "medical_basis": "Asthma airway constriction progression",
    "applies_to": ["CA4"]
  },

  "missed_steroids": {
    "gap_triggers": ["CA5_missed"],
    "severity": "important",
    "category": "missed_action",
    "template": "You never administered corticosteroids. Without steroids, inflammation rebounds 4-6 hours post-treatment. {patient_name}'s risk of relapse requiring intubation increased from 5% to 40%—turning a successful field treatment into a potential ICU admission. Steroids don't help now—they prevent the 3 AM relapse that kills patients at home.",
    "variables": ["patient_name"],
    "medical_basis": "Steroid prevention of asthma relapse (GINA guidelines)",
    "applies_to": ["CA5"]
  },

  "missed_silent_chest": {
    "gap_triggers": ["CDP_silent_chest_fail"],
    "severity": "critical",
    "category": "assessment_gap",
    "template": "You didn't recognize the silent chest. Silent chest is the most ominous sign in asthma—it means air isn't moving at all. Wheeze is noisy but air is moving. Silence is quiet but nothing's moving—that's pre-arrest. You missed the 30-second assessment that would have changed your entire treatment approach from 'urgent' to 'imminent arrest.'",
    "variables": [],
    "medical_basis": "Silent chest as pre-arrest indicator",
    "applies_to": ["CDP3"]
  },

  "no_reassessment": {
    "gap_triggers": ["CA8_missed", "CA8_late"],
    "severity": "important",
    "category": "sequence_error",
    "template": "You never reassessed {patient_name} after giving {treatment}. Without reassessment, you never confirmed the treatment worked. The patient could have been deteriorating while you moved on to history-taking. Treatment without reassessment is like throwing medication into a void—you never know if it landed.",
    "variables": ["patient_name", "treatment"],
    "medical_basis": "Closed-loop communication protocols",
    "applies_to": ["CA8"]
  },

  "underdose_salbutamol": {
    "gap_triggers": ["medication_error_salbutamol"],
    "severity": "important",
    "category": "medication_error",
    "template": "You gave {actual_dose}mg salbutamol instead of the correct {target_dose}mg dose. Half-dose bronchodilation delays airway opening by 3-5 minutes. In severe asthma, those minutes mean the difference between talking and intubating. Dose precision matters when seconds count.",
    "variables": ["actual_dose", "target_dose"],
    "medical_basis": "Salbutamol dose-response curves",
    "applies_to": ["CA4"]
  }
}
```

---

## Integration with Checklist Matching

Consequence templates work seamlessly with checklist matching:

1. **During scenario:** checklistMatcher tracks actions and timing → `checklistResults` populated
2. **At scenario end:** `generateChecklistSummary()` identifies completed/missed/late items
3. **At AAR start:** AAR agent receives:
   - `checklistSummary` (gaps identified)
   - `consequence_templates` (explanations for gaps)
   - Full scenario data (variables for templates)
4. **During AAR:** Agent matches gap_triggers to actual gaps and uses appropriate template

### Mapping Triggers to Checklist Events

| Trigger Suffix | Meaning | When It Fires |
|----------------|---------|---------------|
| `_late` | Action completed but past target time | `checklistResults.onTime === false` |
| `_missed` | Action never completed | Item in `checklistSummary.missed` |
| `_error` | Action completed incorrectly | Item in `medicationErrors` or error log |

Example:
- Checklist item ID: `CA3` (oxygen)
- Template triggers: `["CA3_late", "CA3_missed"]`
- AAR checks:
  - If `CA3` in `checklistResults` with `onTime: false` → use `delayed_oxygen` template
  - If `CA3` in `checklistSummary.missed` → use `missed_oxygen` template

---

## How AAR Agent Uses Consequences

The AAR agent receives explicit instructions (see AAR prompt) to:

1. **Identify gaps** from checklistSummary (missed/late items)
2. **Match to templates** using gap_triggers
3. **Populate variables** from scenario data
4. **Deliver consequences** with appropriate gravity
5. **Balance with encouragement** (show harm avoided by good decisions)
6. **End with teaching** (not just fear)

### AAR Consequence Usage Pattern

```
Student Question: "Was I too slow with oxygen?"

AAR Response:
1. State the gap: "Yes, you applied oxygen at 8.2 minutes (target: 2 minutes)"
2. Use consequence template: "During those 6.2 minutes, Maria's SpO2 remained at 84%. Each minute of SpO2 <85% accelerates cerebral hypoxia—brain cells begin dying after 4-6 minutes. You were at the edge of irreversible harm."
3. Add teaching: "Here's why oxygen timing is measured in minutes, not comfort..."
4. Show what went right: "However, you did recognize the severity early, which prevented..."
```

---

# COMPLETE EXAMPLE: ENHANCED ASTHMA BLUEPRINT SECTIONS

## Enhanced `common_errors`:

```json
"common_errors": [
  {
    "error_id": "E1",
    "error": "Delayed bronchodilator administration",
    "teaching_point": "Salbutamol must be given within 5 minutes for life-threatening asthma",
    "clinical_anchor": "In severe asthma, bronchodilator isn't just treatment—it's buying time before the airways slam shut."
  },
  {
    "error_id": "E2",
    "error": "No oxygen despite critical hypoxia",
    "teaching_point": "SpO2 88% is critically low - brain cells die below 90%",
    "clinical_anchor": "Time is tissue—every minute of hypoxia compounds damage that can't be undone."
  },
  {
    "error_id": "E3",
    "error": "Forgot corticosteroids",
    "teaching_point": "Steroids prevent relapse 4-6 hours later",
    "clinical_anchor": "Steroids don't help now—they prevent the 3 AM relapse that kills patients at home."
  },
  {
    "error_id": "E4",
    "error": "Incomplete systematic assessment",
    "teaching_point": "ABCDE prevents missing critical findings",
    "clinical_anchor": "Chaos kills. Thirty seconds of systematic assessment saves thirty minutes of scattered corrections."
  },
  {
    "error_id": "E5",
    "error": "Didn't recognize silent chest",
    "teaching_point": "Silent chest = pre-arrest",
    "clinical_anchor": "Wheeze is noisy but air is moving. Silence is quiet but nothing's moving—that's pre-arrest."
  },
  {
    "error_id": "E6",
    "error": "Vague treatment orders",
    "teaching_point": "Specific orders prevent errors",
    "clinical_anchor": "Vague orders create vague outcomes. Precision in orders creates precision in care."
  },
  {
    "error_id": "E7",
    "error": "No reassessment after treatment",
    "teaching_point": "Treatment without reassessment is incomplete",
    "clinical_anchor": "Treatment without reassessment is like throwing medication into a void—you never know if it landed."
  }
]
```

---

# MAINTENANCE GUIDELINES

## When Creating New Scenarios

1. ✅ Add `matching` config to ALL checklist items (prioritize critical items)
2. ✅ Write `clinical_anchor` for all `common_errors`
3. ✅ Write `clinical_anchor` for all CDPs
4. ✅ Add `consequence_templates` for critical gaps (timing delays, missed critical actions)
5. ✅ Define consequence variables and populate from scenario data

## When Updating Existing Scenarios

1. Add `matching` config to checklist items (Tier 1 first)
2. Add `clinical_anchor` to existing structures
3. Test matching accuracy with sample phrases

## Quality Review Checklist

### Matching Configuration
- [ ] All critical checklist items have `matching` config
- [ ] Keywords are specific (not generic)
- [ ] Synonyms include abbreviations and device names
- [ ] Exclusion keywords prevent false positives from questions

### Clinical Anchors
- [ ] Each anchor is under 20 words
- [ ] Each anchor contains one core idea
- [ ] Anchors use vivid language or memorable structure
- [ ] Anchors are medically accurate
- [ ] No duplicate anchors within scenario

### Consequence Templates
- [ ] Templates written for all critical checklist items (importance: "critical")
- [ ] Gap triggers correctly mapped to checklist item IDs (_late, _missed, _error suffixes)
- [ ] Variables defined and match available scenario data sources
- [ ] Medical basis documented with citations/rationale
- [ ] Language is specific, quantified, and patient-focused
- [ ] Severity balanced with teaching (not purely punitive)
- [ ] Templates reviewed for medical accuracy by expert

---

## Estimated Enhancement Effort

| Task | Time per Scenario |
|------|-------------------|
| Matching config (Tier 1 items) | 15-20 min |
| Matching config (all items) | 30-45 min |
| Clinical anchors | 30-45 min |
| Consequence templates (critical items) | 45-60 min |
| Consequence templates (comprehensive) | 60-90 min |
| **ECG findings standardization** | **20-30 min** |
| Medical accuracy review | 15-30 min |
| **Total (comprehensive)** | **2.5-3.5 hours** |

---

## Summary: What Enables What

| Enhancement | Enables |
|-------------|---------|
| Matching keywords | "Did I complete X?" — accurate yes/no |
| Matching synonyms | Recognition of various phrasings |
| Exclusion keywords | Prevents false positives from questions |
| Clinical anchors | Memorable teaching moments in AAR feedback |
| Consequence templates | Medical consequence explanations showing patient harm from gaps |
| Consequence variables | Personalized feedback using actual scenario data |
| Gap triggers | Automatic matching of consequences to student errors |
| **ECG findings structured** | **Consistent ECG presentation across all scenarios** |
| **ECG interpretation** | **Core Agent validation of student actions, AAR feedback** |
| **ECG templates** | **Appropriate ECG for scenario type (critical/supportive/non-indicated)** |

---

# PART 4: ECG FINDINGS STANDARDIZATION

## Why ECG Should Be in All Scenarios

Students often perform ECG as part of their systematic assessment, even when not clinically indicated. Making ECG available in ALL scenarios:

1. **Supports complete assessment practice** — Students learn when ECG is/isn't indicated
2. **Provides teaching opportunities** — Normal ECG confirms non-cardiac etiology
3. **Prevents confusion** — Students can perform ECG without system errors
4. **Mirrors reality** — In field practice, providers may perform ECG to rule out conditions

### Scenario Categories

| Scenario Type | ECG Significance | Example Scenarios |
|---------------|------------------|-------------------|
| **ECG Critical** | Diagnostic tool, changes treatment | STEMI, Arrhythmias, Syncope |
| **ECG Supportive** | Rules out cardiac causes | Chest pain (non-cardiac), Shortness of breath |
| **ECG Non-Indicated** | Not clinically relevant, but available | Asthma, Status Epilepticus, TBI, Trauma |

**Key Principle:** Even in non-indicated scenarios, provide normal ECG findings so students can complete assessment without errors.

---

## ECG Structure Requirements

The Core Agent expects a specific structure to present ECG findings to students. This structure MUST be present in all scenarios.

**See detailed specification:** [Common_Errors_AAR_Standardization_Recommendations.md - Recommendation 5](Common_Errors_AAR_Standardization_Recommendations.md#recommendation-5-standardized-ecg-findings-structure-mvp---structured-text)

### Required Structure

```json
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

  "teaching_point": "Anterior STEMI with high lateral extension - large area of myocardium at risk...",
  "teaching_point_note": "FOR AAR AGENT USE - Shown in AAR feedback, NOT during active scenario",

  "presentation_mode": "structured_text",
  "note": "Visual ECG display planned for future release"
}
```

### Field Definitions

| Field | Purpose | Required | Values |
|-------|---------|----------|--------|
| `available` | Is ECG available in this scenario | YES | `true` or `false` |
| `requires_equipment` | Equipment needed | YES | `"12-lead ECG monitor"` |
| `acquisition_time_seconds` | Realistic time to perform | YES | `10` typical |
| `findings_structured` | Structured findings object | YES | See below |
| `interpretation` | Agent reference only | YES | For validation/AAR |
| `teaching_point` | Educational content | YES | For AAR feedback |
| `presentation_mode` | Display method | YES | `"structured_text"` for MVP |

### findings_structured Components

#### rhythm_and_rate (Required)
```json
"rhythm_and_rate": {
  "rhythm": "Sinus rhythm|Sinus tachycardia|Atrial fibrillation|etc.",
  "regularity": "regular|irregular",
  "rate_bpm": 98
}
```

**Core Agent displays:** `"Rhythm: Sinus rhythm | Rate: 98 bpm | Regularity: Regular"`

#### st_segment_changes (Array - can be empty)
```json
"st_segment_changes": [
  {
    "leads": ["V1", "V2", "V3", "V4"],
    "change_type": "elevation|depression|normal",
    "magnitude_mm": "3-4",
    "territory": "anterior|lateral|inferior|septal"
  }
]
```

**Core Agent displays:** `"ST Changes: ↑3-4mm in V1-V4 (anterior) | ↑2mm in I, aVL (lateral)"`

**If no ST changes:** Use empty array `[]` or single entry with `"change_type": "normal"`

#### other_findings (Array - can be empty)
```json
"other_findings": [
  "Hyperacute T waves in anterior leads",
  "No Q waves present",
  "Normal PR interval"
]
```

**Core Agent displays:** `"Other Findings: Hyperacute T waves in anterior leads | No Q waves present"`

---

## ECG Templates by Scenario Type

### Template 1: ECG Critical Scenarios (STEMI, Arrhythmias)

**Use when:** ECG is THE diagnostic tool and drives treatment decisions

```json
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
    "note": "FOR AGENT REFERENCE ONLY"
  },

  "teaching_point": "Anterior STEMI with high lateral extension - large area of myocardium at risk. LAD supplies anterior wall, septum, and apex. The reciprocal changes (ST depression in inferior leads) confirm this is NOT pericarditis. Hyperacute T waves suggest very early MI (<1 hour). This patient needs emergency PCI NOW.",
  "teaching_point_note": "FOR AAR AGENT USE",

  "presentation_mode": "structured_text",
  "clinical_anchor": "ST elevation ≥2mm in contiguous leads = STEMI = activate network = save myocardium",
  "note": "Visual ECG display planned for future release"
}
```

---

### Template 2: ECG Supportive Scenarios (Non-Cardiac Chest Pain)

**Use when:** ECG helps rule out cardiac causes but is not diagnostic

```json
"ecg_findings": {
  "available": true,
  "requires_equipment": "12-lead ECG monitor",
  "acquisition_time_seconds": 10,

  "findings_structured": {
    "rhythm_and_rate": {
      "rhythm": "Sinus rhythm",
      "regularity": "regular",
      "rate_bpm": 85
    },

    "st_segment_changes": [],

    "other_findings": [
      "Normal PR interval (120-200ms)",
      "Normal QRS duration (<120ms)",
      "No ST segment changes",
      "No T wave inversions",
      "No Q waves"
    ]
  },

  "interpretation": {
    "diagnosis": "NORMAL ECG",
    "mechanism": "No acute cardiac pathology",
    "territory": "N/A",
    "severity": "Non-diagnostic",
    "note": "FOR AGENT REFERENCE ONLY - Normal ECG rules out STEMI and significant arrhythmias. Does NOT rule out NSTEMI, PE, aortic dissection, or other non-ECG diagnoses."
  },

  "teaching_point": "Normal ECG helps rule out STEMI and life-threatening arrhythmias, but does NOT rule out all cardiac causes. NSTEMI, PE, and aortic dissection can all present with normal ECG. Clinical assessment remains paramount.",
  "teaching_point_note": "FOR AAR AGENT USE",

  "presentation_mode": "structured_text",
  "clinical_anchor": "Normal ECG rules out STEMI, not all cardiac emergencies",
  "note": "Visual ECG display planned for future release"
}
```

---

### Template 3: ECG Non-Indicated Scenarios (Asthma, TBI, Trauma)

**Use when:** ECG not clinically relevant, but student may perform it

```json
"ecg_findings": {
  "available": true,
  "requires_equipment": "12-lead ECG monitor",
  "acquisition_time_seconds": 10,

  "findings_structured": {
    "rhythm_and_rate": {
      "rhythm": "Sinus tachycardia",
      "regularity": "regular",
      "rate_bpm": 112
    },

    "st_segment_changes": [],

    "other_findings": [
      "Sinus tachycardia appropriate for clinical state (stress response)",
      "Normal PR interval",
      "Normal QRS duration",
      "No ST segment changes",
      "No acute findings"
    ]
  },

  "interpretation": {
    "diagnosis": "SINUS TACHYCARDIA - APPROPRIATE FOR CLINICAL STATE",
    "mechanism": "Physiologic stress response to respiratory distress / pain / hypovolemia",
    "territory": "N/A",
    "severity": "Non-pathologic",
    "note": "FOR AGENT REFERENCE ONLY - Sinus tachycardia is expected and appropriate given the patient's clinical state. Not a primary cardiac issue. Focus treatment on underlying cause."
  },

  "teaching_point": "Sinus tachycardia (HR 100-120) is an appropriate physiologic response to respiratory distress, pain, anxiety, or hypovolemia. It's not an arrhythmia to treat—it's a sign the body is compensating. Treat the underlying cause (give bronchodilator for asthma, fluid for shock, pain control for trauma), not the heart rate. ECG was not clinically indicated in this scenario, but confirms no concurrent cardiac pathology.",
  "teaching_point_note": "FOR AAR AGENT USE - Gentle teaching that ECG wasn't necessary, but findings are reassuring",

  "presentation_mode": "structured_text",
  "clinical_anchor": "Treat the cause of tachycardia, not the tachycardia itself",
  "note": "Visual ECG display planned for future release"
}
```

---

## Lead Grouping Reference

When documenting ST changes, use anatomically correct lead grouping:

| Territory | Leads | Artery |
|-----------|-------|--------|
| **Anterior** | V1, V2, V3, V4 | LAD (proximal) |
| **Septal** | V1, V2 | LAD (septal branches) |
| **Apical** | V3, V4 | LAD (mid) |
| **Lateral** | I, aVL, V5, V6 | Circumflex or LAD |
| **High Lateral** | I, aVL | Circumflex (proximal) |
| **Inferior** | II, III, aVF | RCA or Circumflex |
| **Posterior** | V1-V2 (reciprocal depression) | RCA or Circumflex |
| **Right Ventricular** | V1, V4R | RCA (right ventricular branches) |

### ST Change Documentation Format

```json
{
  "leads": ["V1", "V2", "V3", "V4"],
  "change_type": "elevation",
  "magnitude_mm": "3-4",
  "territory": "anterior"
}
```

**Core Agent displays:** `↑3-4mm in V1-V4 (anterior)`

---

## Common ECG Patterns by Scenario

### STEMI Scenarios

**Anterior STEMI (LAD occlusion):**
- ST elevation: V1-V4
- Often includes: I, aVL (high lateral)
- Reciprocal: ST depression in II, III, aVF

**Inferior STEMI (RCA occlusion):**
- ST elevation: II, III, aVF
- Reciprocal: ST depression in I, aVL
- Check for RV involvement: V4R

**Lateral STEMI (Circumflex occlusion):**
- ST elevation: I, aVL, V5, V6
- Reciprocal: ST depression in II, III, aVF

### Arrhythmia Scenarios (Future)

**Atrial Fibrillation:**
```json
"rhythm_and_rate": {
  "rhythm": "Atrial fibrillation",
  "regularity": "irregularly irregular",
  "rate_bpm": 145
}
```

**Ventricular Tachycardia:**
```json
"rhythm_and_rate": {
  "rhythm": "Ventricular tachycardia",
  "regularity": "regular",
  "rate_bpm": 180
}
```

### Normal Variants for Non-Cardiac Scenarios

**Sinus Tachycardia (stress response):**
- Rate: 100-120 bpm
- Note: "Appropriate for clinical state"

**Normal Sinus Rhythm:**
- Rate: 60-100 bpm
- All findings normal

---

## How Core Agent Presents ECG

When student performs ECG, Core Agent:

1. **Checks availability:** `if ecg_findings.available === true`

2. **Calls reveal_patient_info 3 times:**
   ```
   Category: "ecg_rhythm"
   Content: "Rhythm: Sinus rhythm | Rate: 98 bpm | Regularity: Regular"

   Category: "ecg_st_changes"
   Content: "ST Changes: ↑3-4mm in V1-V4 (anterior) | ↑2mm in I, aVL (lateral) | ↓1-2mm in II, III, aVF (reciprocal)"

   Category: "ecg_other"
   Content: "Other Findings: Hyperacute T waves in anterior leads | No Q waves present"
   ```

3. **Describes procedure in role-play:**
   ```
   *You attach the 12-lead ECG electrodes to the patient's chest, arms, and legs.
   The monitor processes the tracing and displays the results. You see clear
   abnormalities across multiple leads.*
   ```

4. **Student analyzes silently** — NO interpretation given to student

5. **Student acts on findings** — Core Agent validates actions internally using `interpretation` section

**Critical:** The `interpretation` section is NEVER shown to students. It's used by:
- **Core Agent:** To validate if student's actions match ECG findings
- **AAR Agent:** To provide feedback after scenario

---

## ECG in Checklist Items

If ECG is critical for diagnosis (STEMI scenarios), add to checklist:

```json
{
  "id": "CA3",
  "action": "Perform 12-lead ECG",
  "category": "assessment",
  "time_target_minutes": 4,
  "points": 20,
  "importance": "critical",
  "criteria": "12-lead ECG acquired within 4 minutes per Slovak protocol",
  "matching": {
    "keywords": ["ecg", "ekg", "12-lead"],
    "synonyms": ["electrocardiogram", "12 lead", "twelve lead", "cardiac monitor"],
    "tool_mappings": ["perform_ecg", "obtain_ecg"],
    "exclusion_keywords": ["don't", "should i", "not yet"]
  }
}
```

If ECG is supportive/optional, consider adding as lower-importance item or omitting from checklist.

---

## ECG in Common Errors

If students commonly misinterpret ECG or fail to perform it, add common error:

```json
{
  "error_id": "E8",
  "error": "Misinterpreted ECG or didn't recognize STEMI pattern",
  "frequency": "common",
  "severity": "critical",
  "category": "assessment",
  "teaching_point": "Anterior STEMI shows ST elevation ≥2mm in two or more contiguous precordial leads (V1-V4). This patient: 3-4mm ST elevation in V1-V4. Reciprocal ST depression in inferior leads (II, III, aVF) confirms true STEMI. Must master ECG interpretation - it's THE key diagnostic tool.",
  "consequences": "Failed to activate STEMI network = 20-40 minute delay to PCI = increased infarct size = worse outcomes. ST elevation V1-V4 = LAD occlusion = anterior MI = large territory at risk.",
  "clinical_anchor": "ST elevation ≥2mm in contiguous leads = STEMI = activate network = save myocardium",
  "prevention_strategy": "Systematic ECG interpretation: Rate → Rhythm → Axis → Intervals → ST segments → T waves → Q waves. For chest pain, focus on ST segments first. Anterior = V1-V4. Lateral = I, aVL. Inferior = II, III, aVF."
}
```

---

## Quality Assurance Checklist for ECG

When adding/updating ECG in blueprint:

### Structure
- [ ] `ecg_findings` section present
- [ ] `available` set to `true`
- [ ] `requires_equipment` specified
- [ ] `acquisition_time_seconds` = 10 (typical)
- [ ] `presentation_mode` = "structured_text"

### findings_structured
- [ ] `rhythm_and_rate` object complete (rhythm, regularity, rate_bpm)
- [ ] `st_segment_changes` array present (empty `[]` if none)
- [ ] Each ST change has: leads (array), change_type, magnitude_mm, territory
- [ ] `other_findings` array present (can be empty `[]`)

### interpretation
- [ ] `diagnosis` clear and concise
- [ ] `mechanism` explains pathophysiology
- [ ] `territory` specified (or "N/A")
- [ ] `severity` appropriate
- [ ] `note` states "FOR AGENT REFERENCE ONLY"

### teaching_point
- [ ] Explains clinical significance
- [ ] Appropriate for AAR feedback
- [ ] `teaching_point_note` states "FOR AAR AGENT USE"

### Clinical Accuracy
- [ ] Lead groupings anatomically correct
- [ ] ST elevation magnitudes realistic (≥1mm significant, ≥2mm diagnostic)
- [ ] Interpretation matches findings
- [ ] Territory matches occluded artery
- [ ] Normal variants appropriate for patient state

### Scenario Appropriateness
- [ ] ECG findings match clinical scenario (STEMI has abnormal ECG, Asthma has normal or sinus tach)
- [ ] Teaching point appropriate for scenario type
- [ ] If ECG critical, included in checklist
- [ ] If ECG supportive/non-indicated, teaching point acknowledges this

---

## Example Scenarios with ECG

### STEMI (ECG Critical)
- **Findings:** ST elevations, reciprocal changes, hyperacute T waves
- **Interpretation:** "ACUTE ANTERIOR STEMI"
- **Teaching:** "This patient needs emergency PCI NOW"
- **Checklist:** CA3 - Perform 12-lead ECG (4 minutes, critical)

### Asthma (ECG Non-Indicated)
- **Findings:** Sinus tachycardia (112 bpm), no ST changes
- **Interpretation:** "Sinus tachycardia - appropriate for respiratory distress"
- **Teaching:** "Tachycardia is compensatory. Treat the asthma, not the heart rate. ECG not clinically indicated but confirms no cardiac pathology."
- **Checklist:** Not included (optional assessment)

### TBI (ECG Non-Indicated)
- **Findings:** Sinus rhythm (78 bpm), normal
- **Interpretation:** "Normal ECG - no cardiac involvement"
- **Teaching:** "ECG not indicated in isolated head injury. Focus on neurological assessment (GCS, pupils, C-spine). Normal ECG is reassuring but not diagnostically useful here."
- **Checklist:** Not included

### Status Epilepticus (ECG Supportive)
- **Findings:** Sinus tachycardia (105 bpm), normal ST segments
- **Interpretation:** "Sinus tachycardia - stress response to seizure"
- **Teaching:** "Tachycardia expected post-seizure (catecholamine surge). ECG helps rule out arrhythmia as seizure cause. Normal ECG supports primary seizure disorder, not cardiac syncope."
- **Checklist:** Optional assessment item

---

## Migration Guide: Converting Old ECG Structure

If your blueprint has old ECG structure (flat array of findings):

### Old Structure (Current STEMI blueprint)
```json
"ecg_findings": {
  "note": "ECG integration for visual display - for MVP, describe findings to student",
  "rhythm": "Sinus rhythm",
  "rate": 98,
  "findings": [
    "ST elevation 3-4mm in leads V1, V2, V3, V4 (anterior wall)",
    "ST elevation 2mm in leads I and aVL (high lateral involvement)",
    "Reciprocal ST depression in leads II, III, aVF (inferior leads)",
    "Tall peaked T waves in anterior leads (hyperacute T waves)",
    "No Q waves yet (acute MI, Q waves develop later)"
  ],
  "interpretation": "ACUTE ANTERIOR STEMI - LAD occlusion",
  "teaching_point": "Anterior STEMI with high lateral extension..."
}
```

### New Structure (Required)
```json
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
    "note": "FOR AGENT REFERENCE ONLY"
  },

  "teaching_point": "Anterior STEMI with high lateral extension - large area of myocardium at risk. LAD supplies anterior wall, septum, and apex. The reciprocal changes (ST depression in inferior leads) confirm this is NOT pericarditis. Hyperacute T waves suggest very early MI (<1 hour). This patient needs emergency PCI NOW.",
  "teaching_point_note": "FOR AAR AGENT USE",

  "presentation_mode": "structured_text",
  "note": "Visual ECG display planned for future release"
}
```

---

## Summary: ECG Enhancement Workflow

1. **Determine ECG Role:**
   - Critical: STEMI, arrhythmias → Abnormal findings
   - Supportive: Non-cardiac chest pain → Normal findings
   - Non-indicated: Asthma, TBI → Normal with compensatory changes

2. **Use Appropriate Template:**
   - Template 1: ECG Critical
   - Template 2: ECG Supportive
   - Template 3: ECG Non-Indicated

3. **Customize Fields:**
   - `rhythm_and_rate`: Match patient clinical state
   - `st_segment_changes`: Document lead-by-lead if abnormal
   - `other_findings`: List other relevant findings
   - `interpretation`: Clear diagnosis for agent reference
   - `teaching_point`: Scenario-appropriate educational content

4. **Add to Checklist (if critical):**
   - Include ECG performance as checklist item
   - Add matching configuration
   - Set appropriate time target

5. **Link to Common Errors (if applicable):**
   - Misinterpreted ECG
   - Delayed ECG performance
   - Failed to act on ECG findings

6. **Quality Review:**
   - Structure matches Core Agent expectations
   - Clinical accuracy verified
   - Teaching points appropriate for scenario type
   - All required fields present

---

## Related Documentation

- **Full Context AAR Development Plan** — Implementation architecture
- **Common Errors & AAR Standardization Recommendations** ([docs/Common_Errors_AAR_Standardization_Recommendations.md](Common_Errors_AAR_Standardization_Recommendations.md)) — Detailed standardization specifications including ECG Recommendation 5
- **AAR Agent Prompt** (`server/prompts/en/aarAgent.txt`) — Agent instructions for using consequences
- **Core Agent Prompt** (`server/prompts/en/core-agent-ami.txt`) — ECG handling instructions (Instruction 3B)
- **Checklist Matcher** (`server/utils/checklistMatcher.js`) — Action detection system
- **AAR Context Builder** (`server/services/aarContextBuilder.js`) — Data assembly for AAR

---

## Quick Start Checklist for Blueprint Authors

When enhancing or creating a blueprint:

1. **Checklist Items** (15-45 min)
   - [ ] Add `matching` config with keywords, synonyms, exclusions
   - [ ] Prioritize critical importance items

2. **Clinical Anchors** (30-45 min)
   - [ ] Write memorable phrases for common_errors
   - [ ] Add anchors to CDP aar_teaching_points

3. **Consequence Templates** (45-90 min)
   - [ ] Identify critical gaps (missed/late critical actions)
   - [ ] Write template for each gap using 5 categories as guide
   - [ ] Define variables and test population logic
   - [ ] Document medical_basis for accuracy review
   - [ ] Review for appropriate severity and teaching balance

4. **ECG Findings Standardization** (20-30 min)
   - [ ] Add `ecg_findings` section with structured format
   - [ ] Choose appropriate template (Critical/Supportive/Non-Indicated)
   - [ ] Populate `rhythm_and_rate`, `st_segment_changes`, `other_findings`
   - [ ] Write `interpretation` for agent reference (NOT shown to students)
   - [ ] Write scenario-appropriate `teaching_point` for AAR
   - [ ] Verify lead groupings and clinical accuracy

5. **Quality Assurance** (15-30 min)
   - [ ] Medical expert reviews consequence accuracy
   - [ ] Test matching with sample student phrases
   - [ ] Verify Core Agent can access ECG structure
   - [ ] Verify AAR agent can access all enhancements

**Result:** Production-ready blueprint that enables Full Context AAR with accurate performance tracking, memorable teaching moments, medically-accurate consequence explanations, and consistent ECG presentation across all scenarios.
