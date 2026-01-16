# Performance Assessment System V3.0 - Implementation Guide

**Document Purpose:** Comprehensive technical specification for implementing the new three-tier performance assessment system that replaces point-based scoring with outcome-based evaluation, progress milestones, and safety gates.

**Version:** 3.0  
**Date:** January 2025  
**Target Systems:** Blueprint Structure, Core Agent, AAR Agent, UI (Clinical Notes), Backend Runtime

**Strategic Design Principles:**
- **Simplicity** - Easy to understand and maintain
- **Robustness** - Works reliably across all scenarios
- **Scalability** - New scenarios automatically compatible

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Progress Milestones (Universal)](#2-progress-milestones-universal)
3. [Safety Gate (Critical Failures)](#3-safety-gate-critical-failures)
4. [Outcome-Based Competence Assessment](#4-outcome-based-competence-assessment)
5. [Agent Integration Specifications](#5-agent-integration-specifications)
6. [Blueprint Structure Changes](#6-blueprint-structure-changes)
7. [UI Implementation](#7-ui-implementation)
8. [Backend Runtime Changes](#8-backend-runtime-changes)
9. [Implementation Checklist](#9-implementation-checklist)

---

## 1. System Overview

### 1.1 Previous System (Deprecated)

| Aspect | Problem |
|--------|---------|
| Point-based scoring (e.g., "35 points for epinephrine") | Creates anxiety, arbitrary values |
| Fixed time thresholds (e.g., "<3 min = optimal") | Ignores learning curve, arbitrary |
| Numerical feedback | Illusion of precision without meaning |
| Recognition requires verbalization | Students may act correctly but not speak |
| Point deductions for all errors | Treats minor and critical errors equally |

### 1.2 New System (V3.0)

**Three-Tier Assessment Framework:**

```
┌─────────────────────────────────────────────────────────────┐
│ TIER 1: PROGRESS MILESTONES (Universal)                     │
│ Purpose: Real-time positive reinforcement                   │
│ When: During scenario execution (silent tracking)           │
│ Display: Clinical Notes panel (checkmarks)                  │
│ Review: AAR uses for positive reinforcement only            │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ TIER 2: SAFETY GATE (Critical Failures)                     │
│ Purpose: Track patient-harming errors silently              │
│ When: During scenario (tracked, NOT interrupted)            │
│ Review: AAR Agent addresses in debriefing (HIGH PRIORITY)   │
│ Note: Scenario continues naturally, even to patient death   │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ TIER 3: COMPETENCE ASSESSMENT (Outcome-Based)               │
│ Purpose: Evaluate action-outcome relationship               │
│ When: End of scenario (AAR evaluation)                      │
│ Levels: Exemplary / Competent / Developing / Novice         │
│ Basis: Patient state progression, NOT absolute time         │
└─────────────────────────────────────────────────────────────┘
```

### 1.3 Key Philosophy Shift

| FROM (Deprecated) | TO (V3.0) |
|-------------------|-----------|
| "Did you complete action X within Y minutes?" | "What happened to the patient as a result of your actions?" |
| Arbitrary time thresholds | Patient state progression |
| Point accumulation | Outcome-based levels |
| Verbalization required for recognition | Actions demonstrate recognition |
| All errors equal (point deductions) | Safety-critical vs. optimization areas |

---

## 2. Progress Milestones (Universal)

### 2.1 Why: Psychological Reinforcement Through Gamification

**Problem Solved:**
Point accumulation creates anxiety and split attention. Students monitor their "score" instead of immersing in patient care. This disrupts the educational goal of developing clinical intuition.

**Solution:**
Progress milestones provide immediate, positive feedback without numerical pressure.

**Psychological Benefits:**

| Benefit | Explanation |
|---------|-------------|
| **Dopamine micro-hits** | Each milestone completion triggers positive reinforcement |
| **Progress visibility** | Student sees they're on track without anxiety |
| **Reduced cognitive load** | No need to calculate or worry about points |
| **Immersion maintenance** | Focus stays on patient, not score |
| **Habit reinforcement** | Reinforces systematic ABCDE approach |

**Gamification Principle:**
Similar to video game achievements - acknowledge progress without punishment for non-optimal paths. Milestones are **POSITIVE ONLY** - never used to criticize or penalize.

### 2.2 What: Universal Milestone Definitions

Six universal milestones that apply to ALL scenarios:

| ID | Milestone Name | Description | Maps To (Typical) |
|----|----------------|-------------|-------------------|
| **UM1** | Scene Secured | Scene safety established, BSI taken | CA1 (Scene safety) |
| **UM2** | Emergency Recognized | Primary problem identified | CA2 (Recognition) |
| **UM3** | Breathing Supported | Airway/breathing intervention initiated | Oxygen/airway action |
| **UM4** | Critical Treatment | Primary life-saving treatment given | Primary medication |
| **UM5** | Assessment Complete | ABCDE/SAMPLE/secondary exam done | Assessment actions |
| **UM6** | Monitoring Established | Ongoing reassessment initiated | Monitoring action |

**Key Characteristic:** These are UNIVERSAL - same 6 milestones for anaphylaxis, asthma, TBI, hemorrhagic shock, status epilepticus, opioid overdose. Only the mapping to specific critical actions differs.

### 2.3 How: Milestone Tracking Logic

**Tracking is AUTOMATIC and SILENT:**
- Core Agent detects milestone-triggering actions
- Logs completion timestamp to backend
- NEVER mentions milestones to student during scenario
- UI updates Clinical Notes panel silently

**Trigger Logic:**
```
When student performs action:
  → Check if action ID matches any milestone mapping
  → If match found AND milestone not already completed:
      → Mark milestone as completed
      → Log timestamp
      → Update UI (Clinical Notes)
  → Continue scenario naturally (no verbal acknowledgment)
```

### 2.4 Where: UI Display (Clinical Notes Panel)

**Location:** Clinical Notes panel, positioned BELOW the Vital Signs panel

**Visual Design - Progressive Reveal:**
```
┌─────────────────────────────────────────┐
│ 📋 PROGRESS TRACKER                     │
├─────────────────────────────────────────┤
│ ✓ Scene Secured              [00:15]    │
│ ✓ Emergency Recognized       [00:45]    │
│ ✓ Breathing Supported        [01:30]    │
│                                         │
│   (more items appear as completed)      │
└─────────────────────────────────────────┘
```

**UI Rules - CRITICAL:**
- **PROGRESSIVE REVEAL ONLY** - Milestones appear ONLY when completed
- **NO EMPTY BOXES** - Do not show uncompleted milestones (would hint at what to do)
- **NO PREVIEW** - Student should not see a "checklist" of expected actions
- Completed milestone: ✓ with name and timestamp [MM:SS]
- Panel starts empty or with header only
- Each completion adds a new line to the panel
- **NEVER** shows negative indicators (no red X, no "FAILED", no "MISSING")
- Panel is informational only - no gamification sounds or animations
- Subtle appearance - should not distract from patient care

**Why Progressive Reveal:**
Showing empty checkboxes (☐) would effectively tell students "here's what you need to do" - defeating the purpose of autonomous clinical decision-making. Students should decide what to do based on patient assessment, not based on a visible checklist.

### 2.5 Blueprint Structure Changes for Milestones

**Add to each scenario blueprint:**

```json
{
  "progress_milestones": {
    "enabled": true,
    "display_location": "clinical_notes_panel",
    "milestone_definitions": {
      "UM1": {
        "name": "Scene Secured",
        "description": "Scene safety established, BSI taken"
      },
      "UM2": {
        "name": "Emergency Recognized", 
        "description": "Primary problem identified"
      },
      "UM3": {
        "name": "Breathing Supported",
        "description": "Airway/breathing intervention initiated"
      },
      "UM4": {
        "name": "Critical Treatment",
        "description": "Primary life-saving treatment given"
      },
      "UM5": {
        "name": "Assessment Complete",
        "description": "ABCDE/SAMPLE/secondary exam completed"
      },
      "UM6": {
        "name": "Monitoring Established",
        "description": "Ongoing reassessment initiated"
      }
    },
    "milestone_mappings": {
      "UM1": { "trigger_actions": ["CA1"] },
      "UM2": { "trigger_actions": ["CA2"] },
      "UM3": { "trigger_actions": ["CA4"] },
      "UM4": { "trigger_actions": ["CA3"] },
      "UM5": { "trigger_actions": ["CA6", "CA7"] },
      "UM6": { "trigger_actions": ["CA8"] }
    }
  }
}
```

**Mapping Examples by Scenario:**

| Scenario | UM3 (Breathing) | UM4 (Critical Treatment) |
|----------|-----------------|--------------------------|
| Anaphylaxis | CA4 (Oxygen) | CA3 (Epinephrine IM) |
| Asthma | CA3 (Oxygen) | CA4 (Salbutamol) |
| TBI | CA3 (Oxygen) | CA4 (Position/airway) |
| Hemorrhagic Shock | CA3 (Oxygen) | CA4 (TXA/Tourniquet) |
| Status Epilepticus | CA3 (Oxygen) | CA5 (Glucose/Diazepam) |
| Opioid Overdose | CA4 (BVM) | CA3 (Naloxone) |

### 2.6 Core Agent Instructions for Milestones

**Add to Core Agent system prompt:**

```markdown
## Progress Milestone Tracking

You have access to a progress milestone system that tracks student's systematic approach.
This tracking is AUTOMATIC and SILENT - you NEVER mention milestones to the student.

When an action is completed, check if it triggers a milestone:
- If action triggers milestone → Log completion to backend
- Continue scenario naturally - no acknowledgment to student

**Example:**
Student: "I'm applying high-flow oxygen via non-rebreather mask."
You: "The patient accepts the oxygen mask. Her breathing remains labored but SpO2 begins 
climbing: 88%... 90%... 92%."
*[System silently logs: UM3 completed at 01:30]*

NEVER say: "Milestone achieved!", "Progress checkpoint reached!", or acknowledge tracking.
Keep focus entirely on patient simulation.
```

### 2.7 AAR Agent Instructions for Milestones

**Add to AAR Agent system prompt:**

```markdown
## Using Milestone Data in Feedback

You have access to milestone completion data showing the student's systematic approach.

**How to Use:**
- **Acknowledge systematic approach:** "I noticed you followed a systematic approach - 
  scene safety first, then recognition, then breathing support. That's excellent structure."
- **Identify strengths:** "Your progression through the critical steps was well-sequenced."

**CRITICAL RULE - POSITIVE ONLY:**
- NEVER criticize missing milestones
- NEVER say "You failed to establish monitoring"
- If milestone missing, address the underlying skill in competence feedback instead
  (e.g., "Let's discuss reassessment practices" - not "UM6 was not completed")

Milestones exist for POSITIVE reinforcement ONLY.
```

---

## 3. Safety Gate (Critical Failures)

### 3.1 Why: Distinguish Patient-Harming Errors from Optimization Areas

**Problem Solved:**
In point-based systems, all errors are treated equally. Missing a documentation item (-5 points) had the same conceptual weight as giving a contraindicated medication (-5 points), even though the consequences are vastly different.

**Solution:**
Separate **critical failures** (patient harm) from **suboptimal actions** (improvement areas). This creates a clear distinction:

| Category | Description | Handling |
|----------|-------------|----------|
| 🔴 **Safety Violations** | Actions that directly harm or would kill patient | Safety Gate - HIGH PRIORITY in AAR |
| 🟡 **Development Areas** | Actions that could be optimized but didn't cause direct harm | Competence Assessment - normal feedback |

**Educational Philosophy:**
Students need to understand the difference between "I could have done better" and "I almost killed the patient." Safety Gate makes this distinction explicit and ensures critical errors receive appropriate attention.

### 3.2 What: Critical Failure Categories

**Definition:**
A critical failure is an action (or omission) that **directly causes or would cause serious patient harm or death** in the absence of hospital rescue.

**Three Types:**

#### Type 1: Omission Failures
Life-saving treatment never provided when clearly indicated.

| Scenario | Critical Omission |
|----------|-------------------|
| Anaphylaxis | Epinephrine never given |
| Opioid Overdose | Naloxone never given (RR < 8) |
| Status Epilepticus | Glucose never checked/given in hypoglycemic seizure |
| Hemorrhagic Shock | Hemorrhage control never attempted |
| Asthma | Bronchodilator never given in life-threatening asthma |
| TBI | Airway never secured in GCS ≤ 8 |

#### Type 2: Commission Failures
Dangerous action performed that directly harms patient.

| Action | Harm Caused |
|--------|-------------|
| IV epinephrine in anaphylaxis | Arrhythmia, cardiac arrest |
| Sedatives in severe asthma | Respiratory depression, arrest |
| Excessive fluids in hemorrhagic shock | Dilutional coagulopathy |
| OPA forced during active seizure | Dental/oral trauma |
| Hypotonic fluids in TBI | Cerebral edema |

#### Type 3: Contraindication Failures
Medication given despite clear contraindication stated in history.

| Scenario | Contraindication Violation |
|----------|---------------------------|
| Beta-blocker allergy | Giving beta-blocker |
| Asthma + beta-blocker | Giving non-selective beta-blocker |
| Active bleeding + anticoagulants | Additional anticoagulation |

### 3.3 How: Safety Gate Tracking Logic

**CRITICAL DESIGN DECISION:**
Safety Gate failures are **tracked silently** during scenario execution. The scenario **continues naturally** - even if it means patient death. The Core Agent does NOT interrupt the scenario to warn about critical failures.

**Rationale:**
1. Interrupting breaks immersion and educational realism
2. Students learn more from experiencing consequences than from warnings
3. Real emergencies don't have "are you sure?" prompts
4. AAR debriefing is the appropriate place for teaching

**Tracking Flow:**
```
During Scenario (Core Agent):
  → Monitor for critical failure conditions
  → If failure detected:
      → Log failure to safety_gate_failures array
      → Record: failure_id, type, timestamp, description
      → CONTINUE SCENARIO NATURALLY
      → Let patient deteriorate/die if that's the consequence
  → Never interrupt, warn, or prompt student about failure

After Scenario (AAR Agent):
  → Check safety_gate.passed status
  → If failures exist:
      → Address IMMEDIATELY as HIGHEST PRIORITY
      → Use direct, serious tone
      → Explain patient outcome and clinical rationale
      → Ensure student understands severity
```

### 3.4 Where: Blueprint Structure for Safety Gate

**Add to each scenario blueprint:**

```json
{
  "safety_gate": {
    "enabled": true,
    "tracking_mode": "silent",
    "interrupt_scenario": false,
    
    "critical_failures": [
      {
        "id": "SF1",
        "type": "omission",
        "description": "Epinephrine never administered",
        "detection_criteria": {
          "condition": "scenario_end AND epinephrine_given == false",
          "patient_state_required": "anaphylaxis_confirmed"
        },
        "patient_outcome": "Airway obstruction progresses to arrest without epinephrine",
        "aar_teaching_point": "Epinephrine is the ONLY first-line treatment for anaphylaxis. Antihistamines and steroids are adjuncts, not replacements. Without epinephrine, this patient dies."
      },
      {
        "id": "SF2",
        "type": "commission",
        "description": "IV epinephrine given (should be IM)",
        "detection_criteria": {
          "condition": "epinephrine_route == 'IV'",
          "exception": "cardiac_arrest_present"
        },
        "patient_outcome": "High risk of fatal arrhythmia from IV bolus",
        "aar_teaching_point": "IV epinephrine in anaphylaxis (non-arrest) causes dangerous arrhythmias. IM route is safer, effective, and standard of care. IV is only for arrest or continuous infusion by specialists."
      },
      {
        "id": "SF3",
        "type": "contraindication",
        "description": "Medication given despite stated allergy",
        "detection_criteria": {
          "condition": "medication_given IN patient.allergies"
        },
        "patient_outcome": "Allergic reaction on top of existing emergency",
        "aar_teaching_point": "Always verify allergies before any medication. This patient clearly stated the allergy in their history."
      }
    ]
  }
}
```

### 3.5 Core Agent Instructions for Safety Gate

**Add to Core Agent system prompt:**

```markdown
## Safety Gate Monitoring

You silently monitor for critical failures during scenario execution.

**Types of Critical Failures:**
1. OMISSION: Life-saving treatment never provided
2. COMMISSION: Dangerous action that harms patient
3. CONTRAINDICATION: Medication given despite stated allergy

**Your Role:**
- Detect when critical failure conditions are met
- Log failure to backend (failure_id, type, timestamp)
- CONTINUE SCENARIO NATURALLY - do not interrupt or warn
- Let patient deteriorate/die if that's the realistic outcome
- Never say "Are you sure?" or "That might be dangerous"

**Example - Commission Failure:**
Student: "I'm giving epinephrine 1mg IV push"
You: "You administer epinephrine IV. Within seconds, the patient's 
heart rate becomes irregular - monitor shows ventricular tachycardia..."
*[System logs: SF2 - IV epinephrine in non-arrest]*

The scenario continues with realistic consequences. AAR Agent will address this.
```

### 3.6 AAR Agent Instructions for Safety Gate

**Add to AAR Agent system prompt:**

```markdown
## Safety Gate: Critical Failure Review

**HIGHEST PRIORITY IN DEBRIEFING**

When safety_gate.passed == false, address failures FIRST before any other feedback.

**Delivery Approach:**
- Use direct, serious (not harsh) tone
- State clearly what happened and what the consequence was
- Explain the clinical rationale
- Ask reasoning question to understand student's thinking
- Provide correct approach for future

**Template:**
"Before we discuss the overall scenario, I need to address something critical.
[Describe what happened]. [Explain patient outcome]. [Explain correct approach]. 
This is a critical learning point - what was your thinking at that moment?"

**Example:**
"Before we discuss the rest of the scenario, I need to address the epinephrine 
administration. You gave it IV, which caused the ventricular tachycardia we saw.
In anaphylaxis without cardiac arrest, epinephrine must be given IM - 0.5mg to 
the lateral thigh. IV push causes dangerous peak concentrations that trigger 
arrhythmias. What led you to choose the IV route?"

**After addressing Safety Gate failures:**
- Acknowledge if student handled other aspects well
- Don't let one critical failure overshadow all learning
- But ensure the critical failure is clearly understood as serious
```

---

## 4. Outcome-Based Competence Assessment

### 4.1 Why: Patient State Matters More Than Arbitrary Time

**Problems with Time-Based Assessment:**
1. **Time thresholds are arbitrary** - "3 minutes" vs "4 minutes" has no clinical meaning
2. **Ignores learning curve** - New users need time to learn system interface
3. **Most guidelines don't have hard times** - "As soon as possible" ≠ "exactly 3 minutes"
4. **Penalizes thoughtful care** - Student who takes time to think gets "developing" rating
5. **Creates points anxiety** - Same problem as point-based scoring

**Solution:**
Assess based on **relationship between action and patient state**, not absolute timing.

**New Question:**
- **OLD:** "Did you give epinephrine within 3 minutes?"
- **NEW:** "What state was the patient in when you gave epinephrine, and what happened after?"

### 4.2 What: Competence Level Definitions

Four levels based on patient state progression:

| Level | Criteria | Meaning |
|-------|----------|---------|
| **EXEMPLARY** | Action performed while patient in "initial" state + patient improved | Optimal care - prevented deterioration entirely |
| **COMPETENT** | Action performed in "initial" or "early deteriorating" + patient stabilized | Safe, effective care - minor optimization possible |
| **DEVELOPING** | Action performed in "deteriorating" or "critical" state + patient eventually improved | Care delayed - patient reached high-risk state before treatment |
| **NOVICE** | Action never performed OR dangerous execution OR patient serious harm | Unsafe care - remediation needed |

**Key Insight:**
Assessment is tied to PATIENT STATE PROGRESSION, not clock time. The patient's state is driven by the deterioration timeline (5/9/13 minutes), but assessment evaluates whether the student acted before or after deterioration occurred.

### 4.3 Patient State Definitions

All scenarios use consistent state definitions:

| State | Description | Typical Timing (if untreated) |
|-------|-------------|-------------------------------|
| **initial** | Presenting symptoms, stable enough for assessment | 0-5 minutes |
| **early_deteriorating** | First signs of worsening, still responsive to treatment | 5-7 minutes |
| **deteriorating** | Clear worsening, requires immediate intervention | 7-9 minutes |
| **critical** | Life-threatening, imminent arrest/death without intervention | 9-13 minutes |
| **arrest** | Cardiac/respiratory arrest | 13+ minutes |
| **improving** | Positive response to treatment | After effective treatment |
| **stable** | Stabilized, not worsening | After effective treatment |

### 4.4 Solving the Verbalization Problem

**Original Concern:**
"What if the student recognizes the condition correctly but doesn't verbalize? They might just start treating without saying 'I recognize anaphylaxis.'"

**Solution: Actions Speak Louder Than Words**

**Principle:**
Judge based on **what the student DOES**, not what they SAY. If student applies oxygen and gives epinephrine in correct sequence, they recognized anaphylaxis - even if they never said the word.

**Three-Tiered Recognition Detection:**

```
1. ACTION-BASED RECOGNITION (Primary)
   Student performed correct action sequence → Recognition DEMONSTRATED
   Example: Applied oxygen + gave epinephrine = recognized anaphylaxis

2. VERBAL RECOGNITION (Secondary)  
   Student explicitly stated diagnosis → Recognition VERBALIZED
   Example: "This is anaphylaxis, I need to give epinephrine"

3. NO RECOGNITION (Failure)
   Student performed wrong actions OR asked "what should I do?"
   Example: Gave antihistamine only, never gave epinephrine
```

**Implementation:**
```javascript
function assessRecognition(actions, transcript) {
  // Primary: Did actions demonstrate understanding?
  if (correctActionSequencePerformed(actions)) {
    return 'DEMONSTRATED' // Even if never verbalized
  }
  
  // Secondary: Did student verbalize diagnosis?
  if (diagnosisTermsInTranscript(transcript)) {
    return 'VERBALIZED'
  }
  
  // Neither: Recognition not demonstrated
  return 'NOT_DEMONSTRATED'
}
```

**Benefit:**
Students who think carefully and act correctly aren't penalized for not narrating their thought process. The system accommodates both "thinkers" and "verbalizers."

### 4.5 Competence Assessment Algorithm

```javascript
function assessCompetence(action, patientStateAtAction, patientStateAfter, technique) {
  // Check if action was never performed
  if (!action.performed) {
    return 'NOVICE'
  }

  // Check for dangerous execution
  if (technique === 'dangerous' || action.caused_harm) {
    return 'NOVICE'
  }

  // Assess based on patient state trajectory
  if (patientStateAtAction === 'initial' && 
      (patientStateAfter === 'improving' || patientStateAfter === 'stable')) {
    // Prevented deterioration entirely
    return 'EXEMPLARY'
  }

  if ((patientStateAtAction === 'initial' || patientStateAtAction === 'early_deteriorating') &&
      (patientStateAfter === 'improving' || patientStateAfter === 'stable')) {
    // Stabilized before major deterioration
    return 'COMPETENT'
  }

  if ((patientStateAtAction === 'deteriorating' || patientStateAtAction === 'critical') &&
      patientStateAfter === 'improving') {
    // Patient was in high-risk state before treatment
    return 'DEVELOPING'
  }

  // Default if unclear
  return 'DEVELOPING'
}
```

### 4.6 Blueprint Structure for Competence Assessment

**REMOVE from critical actions:**
- `time_target_minutes` (deprecated)
- `points` (deprecated)

**ADD to each critical action:**

```json
{
  "id": "CA3",
  "action": "Administer epinephrine IM",
  "category": "treatment",
  "importance": "critical",
  "dosing": {
    "medication": "epinephrine",
    "dose": "0.5mg",
    "route": "IM",
    "location": "lateral thigh"
  },
  
  "competence_assessment": {
    "method": "outcome_based",
    
    "exemplary": {
      "patient_state_at_action": ["initial"],
      "patient_state_after": ["improving", "stable"],
      "outcome_description": "Prevented deterioration entirely",
      "feedback_template": "Excellent timing - epinephrine given early, patient never reached critical state. This is textbook anaphylaxis management."
    },
    
    "competent": {
      "patient_state_at_action": ["initial", "early_deteriorating"],
      "patient_state_after": ["improving", "stable"],
      "outcome_description": "Patient stabilized with minor deterioration",
      "feedback_template": "Effective treatment - patient improved. Some initial worsening occurred but you intervened before critical state."
    },
    
    "developing": {
      "patient_state_at_action": ["deteriorating", "critical"],
      "patient_state_after": ["improving"],
      "outcome_description": "High-risk state reached before treatment",
      "feedback_template": "The patient reached a critical state before receiving epinephrine. While treatment eventually worked, earlier recognition and action would have prevented the dangerous period. What delayed your decision?"
    },
    
    "novice": {
      "criteria": [
        "Epinephrine never administered",
        "IV route used (except in arrest)",
        "Wrong medication given instead",
        "Patient reached arrest state"
      ],
      "outcome_description": "Serious harm or would die without hospital rescue",
      "feedback_template": "This is addressed as a Safety Gate issue - epinephrine is the only first-line treatment for anaphylaxis."
    }
  },
  
  "assessment_data_required": [
    "action_timestamp",
    "patient_state_at_action",
    "patient_state_after_action",
    "technique_correctness",
    "dose_correctness",
    "route_correctness"
  ]
}
```

---

## 5. Agent Integration Specifications

### 5.1 Core Agent: Data Collection Role

**Primary Responsibilities:**

| Responsibility | Description |
|----------------|-------------|
| Patient simulation | Realistic, immersive patient responses |
| State tracking | Monitor and log patient state continuously |
| Action context logging | Record state AT each student action |
| Effect tracking | Record state AFTER treatment effects |
| Milestone detection | Silently log milestone completions |
| Safety Gate detection | Silently log critical failures |
| Data package generation | Create comprehensive data for AAR |

**What Core Agent Does NOT Do:**

| Avoided Action | Reason |
|----------------|--------|
| ❌ Evaluate competence levels | That's AAR Agent's role |
| ❌ Provide assessment feedback during scenario | Breaks immersion |
| ❌ Mention milestones or safety gates | Should be invisible to student |
| ❌ Interrupt scenario for warnings | Reduces learning from consequences |
| ❌ Calculate scores or points | Deprecated system |

**Core Agent Focus:**
100% immersive, realistic patient simulation. All assessment is background process.

### 5.1.1 Compatibility with Existing Core Agent Prompt

**V3.0 changes are ADDITIVE, not replacement.** The existing Core Agent prompt (core-agent-ami.txt) remains largely unchanged. V3.0 adds silent tracking capabilities that work alongside existing functionality.

**Existing Core Agent Features (UNCHANGED):**

| Feature | Location | Status |
|---------|----------|--------|
| Patient simulation with third-person descriptions | Instruction 1 | ✅ Keep |
| Function tools (`update_vitals`, `reveal_patient_info`) | Instruction 2, 3 | ✅ Keep |
| Treatment response handling | Instruction 5 | ✅ Keep |
| Deterioration progression (`no_treatment_progression`) | Instruction 5 | ✅ Keep |
| ECG findings presentation | Instruction 3B | ✅ Keep |
| SAMPLE history progressive disclosure | Instruction 4 | ✅ Keep |

**V3.0 Additions (ADD to Core Agent):**

| Addition | Purpose | Implementation |
|----------|---------|----------------|
| Milestone detection | Track systematic approach | Add instruction block for silent logging |
| Safety Gate monitoring | Detect critical failures | Add instruction block for failure detection |
| Patient state naming | Enable outcome-based assessment | Map existing deterioration to named states |
| Action context logging | Record state at each action | Enhance existing action handling |

**Core Agent Prompt Additions Template:**

Add this section to the Core Agent prompt:

```markdown
## V3.0 Assessment Support (Silent Tracking)

### Patient State Tracking
You track patient state using these named states that map to the deterioration timeline:
- "initial" (0-5 min untreated) - Presenting symptoms, stable for assessment
- "early_deteriorating" (5-7 min) - First signs of worsening
- "deteriorating" (7-9 min) - Clear worsening, needs immediate intervention  
- "critical" (9-13 min) - Life-threatening, imminent arrest
- "improving" - Positive response to treatment
- "stable" - Stabilized after treatment

When logging actions, internally note the patient state at that moment.

### Milestone Detection (Silent)
When student completes these actions, log milestone completion to backend:
- Scene safety → UM1
- Recognition of emergency → UM2  
- Oxygen/airway intervention → UM3
- Primary treatment given → UM4
- Assessment completed → UM5
- Monitoring initiated → UM6

NEVER mention milestones to student. Continue natural dialogue.

### Safety Gate Detection (Silent)
Monitor for critical failures but DO NOT interrupt scenario:
- Omissions: Life-saving treatment never given when indicated
- Commissions: Dangerous actions (e.g., IV epinephrine in non-arrest)
- Contraindications: Medication given despite stated allergy

If detected: Log failure, continue scenario naturally. Let consequences unfold.
NEVER warn student or say "Are you sure?"
```

**Key Principle: Silent Integration**

The Core Agent's PRIMARY job remains patient simulation. V3.0 tracking happens in the background:

```
Student action → Core Agent responds naturally → [Silent: log state, check milestones, check safety gate]
```

The student experience is unchanged - they interact with a realistic patient, not a tracking system.

### 5.2 AAR Agent: Assessment & Feedback Role

**Primary Responsibilities:**

| Responsibility | Description |
|----------------|-------------|
| Competence evaluation | Apply outcome-based levels using Core Agent data |
| Safety Gate review | Address critical failures with highest priority |
| Milestone acknowledgment | Reference completions for positive reinforcement |
| Feedback delivery | SUSTAIN/IMPROVE/APPLY structured feedback |
| Reasoning questions | Understand student's clinical thinking |
| Action planning | Create concrete improvement steps |

**AAR Debriefing Structure:**

```
1. SAFETY GATE CHECK (Highest Priority)
   ↓ If failures exist → Address immediately
   
2. OVERALL PERFORMANCE SUMMARY
   ↓ Passed / Developing / Needs Support
   
3. ACTION-BY-ACTION REVIEW
   ↓ SUSTAIN: Exemplary/Competent actions
   ↓ IMPROVE: Developing actions  
   ↓ APPLY: Clinical teaching points
   
4. MILESTONE ACKNOWLEDGMENT (Positive Only)
   ↓ "Your systematic approach was evident..."
   
5. PATTERN ANALYSIS
   ↓ Cross-scenario themes if applicable
   
6. REASONING QUESTIONS
   ↓ "What was your thinking when..."
   
7. ACTION PLAN
   ↓ Concrete steps for improvement
```

### 5.2.1 Integration with Existing Blueprint Features

The AAR Agent leverages several existing blueprint features. Here's how each feature maps to the debriefing phases:

**Blueprint Feature Reference:**

| Blueprint Feature | Description | Used In Phase |
|-------------------|-------------|---------------|
| `teaching_points` | Educational content for each critical action | Phase 3 (APPLY feedback) |
| `clinical_anchor` | Memorable phrases for sticky learning | Phase 3 (SUSTAIN/IMPROVE) |
| `consequence_templates` | Medical consequence explanations with variables | Phase 3 (IMPROVE feedback) |
| `common_errors` | Error-specific teaching content | Phase 3 (IMPROVE feedback) |
| `aar_teaching_point` | CDP-specific teaching content | Phase 3 (APPLY feedback) |

**Phase 3 Detailed Flow - Using Blueprint Features:**

```
FOR EACH Critical Action:
│
├── IF Competence Level = EXEMPLARY or COMPETENT:
│   └── SUSTAIN Feedback:
│       ├── Reference patient outcome (what went right)
│       ├── Use `clinical_anchor` from action for memorable takeaway
│       └── Acknowledge specific technique/timing
│
├── IF Competence Level = DEVELOPING:
│   └── IMPROVE Feedback:
│       ├── Use `consequence_templates` to explain patient harm
│       │   └── Populate template variables with actual scenario data:
│       │       - {patient_state_at_action} = state when student acted
│       │       - {patient_name} = patient's name
│       │       - {spo2_at_action} = SpO2 when action was taken
│       │       - {initial_spo2} = starting SpO2 value
│       ├── Use `clinical_anchor` for memorable teaching point
│       ├── Reference `common_errors.teaching_point` if error matches
│       └── Ask reasoning question: "What was your thinking?"
│
└── IF Competence Level = NOVICE (and not Safety Gate):
    └── Address as development need with `teaching_points`
```

**Example: IMPROVE Feedback Using Blueprint Features (Outcome-Based)**

```
Blueprint Data:
- consequence_template: "When you applied oxygen, {patient_name} was already in 
  {patient_state_at_action} state with SpO2 of {spo2_at_action}%. The deterioration 
  from initial presentation ({initial_spo2}%) represents preventable hypoxic damage."
- clinical_anchor: "Time is tissue—every minute of hypoxia compounds damage that 
  can't be undone."
- common_error E2 teaching_point: "SpO2 88% is critically low - brain cells die 
  below 90%"

Scenario Data (from stateTracker):
- patient_state_at_action: "deteriorating"
- patient_name: Maria
- spo2_at_action: 82
- initial_spo2: 88

AAR Agent Output:
"Let's talk about oxygen timing. When you applied oxygen, Maria was already in 
a deteriorating state with SpO2 of 82%. The drop from her initial 88% to 82% 
represents preventable hypoxic damage—that's brain cells dying that didn't 
need to die.

Remember: Time is tissue—every minute of hypoxia compounds damage that can't 
be undone.

What was your assessment that led to prioritizing other interventions first?"
```

**Note:** This approach focuses on PATIENT STATE ("deteriorating", "critical") rather than arbitrary time thresholds ("6.2 minutes late"). The feedback is grounded in clinical reality—what happened to the patient—not arbitrary targets.

**Phase 1 (Safety Gate) - Using Blueprint Features:**

```
IF safety_gate.passed == false:
│
└── FOR EACH critical_failure in safety_gate.failures:
    ├── State what happened clearly and directly
    ├── Use `aar_teaching_point` from Safety Gate definition
    ├── Reference patient outcome (what would have happened)
    ├── Use `clinical_anchor` if available for the failure type
    └── Ask reasoning question to understand student's thinking
```

**Phase 4 (Milestones) - Positive Reinforcement Only:**

```
IF milestones completed in systematic order:
└── "I noticed you followed a systematic approach—scene safety first, then 
    recognition, then breathing support, then treatment. That's excellent 
    structure that will serve you well in chaotic real-world situations."

IF most milestones completed:
└── Reference specific milestones as evidence of good practice

NEVER criticize missing milestones - address underlying skills in Phase 3 instead
```

**Clinical Anchor Usage Guidelines:**

| Situation | How to Use Clinical Anchor |
|-----------|---------------------------|
| SUSTAIN (positive) | "This is exactly right because [anchor]" |
| IMPROVE (gap) | "Remember: [anchor]" after explaining the gap |
| Teaching moment | Weave naturally into explanation |
| Pattern summary | Use as memorable takeaway at end |

**Consequence Template Variable Sources (Outcome-Based):**

| Variable | Source | Description |
|----------|--------|-------------|
| `{patient_name}` | `blueprint.patient_profile.name` | Patient's name |
| `{patient_state_at_action}` | `stateTracker.getStateAtTime(action.timestamp)` | State when student acted |
| `{spo2_at_action}` | `stateTracker.vitals_at_action.SpO2` | SpO2 when action taken |
| `{initial_spo2}` | `blueprint.initial_vitals.SpO2` | Starting SpO2 |
| `{hr_at_action}` | `stateTracker.vitals_at_action.HR` | Heart rate when action taken |
| `{initial_hr}` | `blueprint.initial_vitals.HR` | Starting heart rate |
| `{medication_given}` | `action.medication` | What medication was given |
| `{dose_given}` | `action.dose` | What dose was given |
| `{route_given}` | `action.route` | Administration route |
| `{action_timestamp}` | `action.timestamp` | When action occurred (for reference only) |

**REMOVED (Time-Based - Deprecated):**
- ~~`{delay_minutes}`~~ - Was `action.timestamp - target_time` - arbitrary
- ~~`{target_time}`~~ - Removed from blueprints entirely

**Why Patient-State Variables Are Better:**

| Time-Based (Old) | Patient-State (New) |
|------------------|---------------------|
| "You were 6.2 minutes late" | "Patient was in deteriorating state" |
| Arbitrary threshold | Clinical reality |
| Punitive feeling | Educational focus |
| "You failed to meet target" | "Here's what happened to patient" |

### 5.3 Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│ SCENARIO EXECUTION (Core Agent)                                 │
│                                                                 │
│ 1. Student performs action                                      │
│ 2. Core Agent logs:                                             │
│    - Action ID, timestamp                                       │
│    - Patient state AT action                                    │
│    - Vital signs AT action                                      │
│    - Technique assessment                                       │
│                                                                 │
│ 3. Core Agent applies treatment effect:                         │
│    - Updates patient state                                      │
│    - Logs state AFTER action                                    │
│    - Logs vitals AFTER action                                   │
│                                                                 │
│ 4. Background systems (SILENT):                                 │
│    - MilestoneTracker: Check if action triggers milestone       │
│    - SafetyGate: Check if action is critical failure            │
│                                                                 │
│ 5. Scenario continues naturally...                              │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ SCENARIO END - ASSESSMENT DATA PACKAGE                          │
│                                                                 │
│ {                                                               │
│   "milestones": [                                               │
│     { "id": "UM1", "completed": true, "timestamp": 0.25 },      │
│     { "id": "UM2", "completed": true, "timestamp": 0.75 },      │
│     { "id": "UM3", "completed": true, "timestamp": 1.50 },      │
│     { "id": "UM4", "completed": true, "timestamp": 3.25 },      │
│     { "id": "UM5", "completed": true, "timestamp": 5.00 },      │
│     { "id": "UM6", "completed": false, "timestamp": null }      │
│   ],                                                            │
│   "safety_gate": {                                              │
│     "passed": true,                                             │
│     "failures": []                                              │
│   },                                                            │
│   "critical_actions": [                                         │
│     {                                                           │
│       "action_id": "CA3",                                       │
│       "performed": true,                                        │
│       "timestamp": 3.25,                                        │
│       "patient_state_at_action": "initial",                     │
│       "patient_state_after": "improving",                       │
│       "technique": "correct",                                   │
│       "computed_level": "EXEMPLARY"                             │
│     },                                                          │
│     ...                                                         │
│   ]                                                             │
│ }                                                               │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ AAR AGENT DEBRIEFING                                            │
│                                                                 │
│ Phase 1: Check Safety Gate                                      │
│   IF failures → Address immediately (high priority)             │
│                                                                 │
│ Phase 2: Overall Reflection                                     │
│   Ask student for self-assessment                               │
│                                                                 │
│ Phase 3: Action-by-Action Review                                │
│   For each critical action:                                     │
│   - If EXEMPLARY/COMPETENT → SUSTAIN feedback                   │
│   - If DEVELOPING → IMPROVE feedback + reasoning question       │
│   - Reference milestones for positive reinforcement             │
│                                                                 │
│ Phase 4: Pattern Analysis                                       │
│   Cross-scenario themes                                         │
│                                                                 │
│ Phase 5: Action Plan                                            │
│   Concrete improvement steps                                    │
└─────────────────────────────────────────────────────────────────┘
```

---

## 6. Blueprint Structure Changes

### 6.1 Summary of Changes

| Section | Change Type | Description |
|---------|-------------|-------------|
| `progress_milestones` | ADD | New section for universal milestones |
| `safety_gate` | ADD | New section for critical failures |
| `critical_actions_checklist` | MODIFY | Remove points/time, add competence_assessment |
| `scenario_states` | ADD | Define patient state definitions and timing |
| `scoring` section | REMOVE | Deprecated - delete entirely |

### 6.2 Before/After Example

**BEFORE (V2.0):**
```json
{
  "critical_actions_checklist": [
    {
      "id": "CA3",
      "action": "Administer epinephrine IM",
      "category": "treatment",
      "time_target_minutes": 3,
      "points": 35,
      "importance": "critical",
      "criteria": "0.5mg IM into lateral thigh"
    }
  ],
  "scoring": {
    "total_points": 100,
    "passing_score": 70,
    "performance_levels": {
      "exemplary": { "min": 90 },
      "competent": { "min": 70 },
      "developing": { "min": 50 }
    }
  }
}
```

**AFTER (V3.0):**
```json
{
  "progress_milestones": {
    "enabled": true,
    "milestone_definitions": { ... },
    "milestone_mappings": { ... }
  },
  
  "safety_gate": {
    "enabled": true,
    "tracking_mode": "silent",
    "critical_failures": [ ... ]
  },
  
  "scenario_states": {
    "initial": { "timing": "0-5 min", "description": "..." },
    "early_deteriorating": { "timing": "5-7 min", "description": "..." },
    "deteriorating": { "timing": "7-9 min", "description": "..." },
    "critical": { "timing": "9-13 min", "description": "..." }
  },
  
  "critical_actions_checklist": [
    {
      "id": "CA3",
      "action": "Administer epinephrine IM",
      "category": "treatment",
      "importance": "critical",
      "dosing": {
        "medication": "epinephrine",
        "dose": "0.5mg",
        "route": "IM",
        "location": "lateral thigh"
      },
      "competence_assessment": {
        "method": "outcome_based",
        "exemplary": { ... },
        "competent": { ... },
        "developing": { ... },
        "novice": { ... }
      }
    }
  ]
}
```

---

## 7. UI Implementation

### 7.1 Progress Tracker Component

**Location:** Clinical Notes panel, below Vital Signs panel

**Component Structure (Progressive Reveal):**
```jsx
<ProgressTracker>
  <Header>📋 PROGRESS TRACKER</Header>
  <MilestoneList>
    {/* Only render COMPLETED milestones - no preview of uncompleted */}
    {milestones
      .filter(m => m.completed)
      .map(m => (
        <MilestoneItem
          key={m.id}
          name={m.name}
          timestamp={m.timestamp}
        />
      ))}
  </MilestoneList>
</ProgressTracker>
```

**Styling Rules - PROGRESSIVE REVEAL:**
- **ONLY show completed milestones** - never show uncompleted items
- Completed milestone: ✓ with green/positive color + timestamp [MM:SS]
- Panel starts empty (or shows header only)
- Each completion adds a new line
- NO empty boxes or placeholders (would hint at expected actions)
- NO negative indicators (no red, no X marks, no "FAILED", no "MISSING")
- Subtle, non-distracting appearance
- Mobile responsive

### 7.2 Real-Time Updates

**Update Trigger:**
When Core Agent logs milestone completion via backend API.

**Update Behavior - Progressive Addition:**
- New milestone item appears (slides in or fades in)
- Timestamp displays with the new item
- Smooth, subtle animation
- NO sound effects
- NO popup notifications
- NO gamification animations (no confetti, no badges)

**Important: Panel Growth Pattern**
The panel GROWS as milestones complete:
- Start: Empty panel (or header only)
- After UM1: One item visible
- After UM2: Two items visible
- etc.

Student never sees "what's coming next"

### 7.3 Accessibility

- Screen reader compatible
- Sufficient color contrast
- Keyboard navigable (if interactive)
- ARIA labels for milestone status

---

## 8. Backend Runtime Changes

### 8.1 New Tracking Modules

**milestoneTracker.js:**
```javascript
class MilestoneTracker {
  constructor(scenarioBlueprint) {
    this.milestones = initializeMilestones(scenarioBlueprint)
    this.mappings = scenarioBlueprint.progress_milestones.milestone_mappings
  }
  
  checkAction(actionId) {
    for (const [milestoneId, mapping] of Object.entries(this.mappings)) {
      if (mapping.trigger_actions.includes(actionId)) {
        this.completeMilestone(milestoneId)
      }
    }
  }
  
  completeMilestone(milestoneId) {
    if (!this.milestones[milestoneId].completed) {
      this.milestones[milestoneId].completed = true
      this.milestones[milestoneId].timestamp = getCurrentScenarioTime()
      emitMilestoneUpdate(milestoneId) // UI update
    }
  }
  
  getSummary() {
    return Object.values(this.milestones)
  }
}
```

**safetyGateMonitor.js:**
```javascript
class SafetyGateMonitor {
  constructor(scenarioBlueprint) {
    this.criticalFailures = scenarioBlueprint.safety_gate.critical_failures
    this.failures = []
  }
  
  checkForFailure(action, patientState, medicationGiven) {
    for (const failure of this.criticalFailures) {
      if (this.meetsFailureCriteria(failure, action, patientState, medicationGiven)) {
        this.logFailure(failure)
      }
    }
  }
  
  checkEndOfScenarioOmissions(actionsPerformed) {
    // Check for omission failures at scenario end
    for (const failure of this.criticalFailures) {
      if (failure.type === 'omission') {
        if (!actionsPerformed.includes(failure.required_action)) {
          this.logFailure(failure)
        }
      }
    }
  }
  
  logFailure(failure) {
    this.failures.push({
      id: failure.id,
      type: failure.type,
      description: failure.description,
      timestamp: getCurrentScenarioTime(),
      teaching_point: failure.aar_teaching_point
    })
  }
  
  getSummary() {
    return {
      passed: this.failures.length === 0,
      failures: this.failures
    }
  }
}
```

### 8.2 Patient State Tracking

**stateTracker.js:**
```javascript
class PatientStateTracker {
  constructor(scenarioBlueprint) {
    this.states = scenarioBlueprint.scenario_states
    this.currentState = 'initial'
    this.stateHistory = []
    this.deteriorationTimeline = scenarioBlueprint.deterioration_timeline
  }
  
  updateStateBasedOnTime(elapsedMinutes, treatmentEffective) {
    if (treatmentEffective) {
      this.transitionTo('improving')
    } else {
      // Natural deterioration
      if (elapsedMinutes >= 13) this.transitionTo('critical')
      else if (elapsedMinutes >= 9) this.transitionTo('deteriorating')
      else if (elapsedMinutes >= 5) this.transitionTo('early_deteriorating')
    }
  }
  
  getStateAtTime(timestamp) {
    // Return what state patient was in at given timestamp
    // Used for competence assessment
  }
  
  getCurrentState() {
    return this.currentState
  }
}
```

### 8.3 Assessment Data Package Generation

**assessmentPackager.js:**
```javascript
function generateAssessmentPackage(scenarioSession) {
  return {
    scenario_id: scenarioSession.scenarioId,
    duration_minutes: scenarioSession.duration,
    
    milestones: scenarioSession.milestoneTracker.getSummary(),
    
    safety_gate: scenarioSession.safetyGateMonitor.getSummary(),
    
    critical_actions: scenarioSession.actionsPerformed.map(action => ({
      action_id: action.id,
      performed: true,
      timestamp: action.timestamp,
      patient_state_at_action: scenarioSession.stateTracker.getStateAtTime(action.timestamp),
      patient_state_after: action.resultingState,
      technique: action.techniqueAssessment,
      computed_level: computeCompetenceLevel(action, scenarioSession)
    })),
    
    actions_not_performed: getMissingCriticalActions(scenarioSession),
    
    transcript_summary: scenarioSession.getTranscriptSummary()
  }
}
```

---

## 9. Implementation Checklist

### Phase 1: Blueprint Updates

- [ ] Add `progress_milestones` section to all 6 scenarios
  - [ ] Define UM1-UM6 universal milestones
  - [ ] Map critical actions to milestones
  - [ ] Test milestone trigger logic

- [ ] Add `safety_gate` section to all 6 scenarios
  - [ ] Define 2-4 critical failures per scenario
  - [ ] Specify detection criteria
  - [ ] Write AAR teaching points

- [ ] Add `scenario_states` section to all 6 scenarios
  - [ ] Define state descriptions
  - [ ] Link to 5/9/13 deterioration timeline

- [ ] Update `critical_actions_checklist` in all 6 scenarios
  - [ ] Remove `points` field
  - [ ] Remove `time_target_minutes` field
  - [ ] Add `competence_assessment` section per action
  - [ ] Define patient state requirements for each level
  - [ ] Write level-specific feedback templates

- [ ] Remove deprecated `scoring` section from all scenarios

### Phase 2: Backend Implementation

- [ ] Create `milestoneTracker.js`
  - [ ] Implement milestone completion logic
  - [ ] Add real-time UI update emission
  - [ ] Generate milestone summary

- [ ] Create `safetyGateMonitor.js`
  - [ ] Implement critical failure detection
  - [ ] Add silent logging (no interruption)
  - [ ] Generate safety gate summary

- [ ] Create `stateTracker.js`
  - [ ] Track patient state continuously
  - [ ] Support state queries by timestamp
  - [ ] Track post-treatment effects

- [ ] Create `assessmentPackager.js`
  - [ ] Generate comprehensive data package
  - [ ] Include all required fields for AAR
  - [ ] Test data flow to AAR Agent

### Phase 3: Core Agent Updates

- [ ] Update Core Agent system prompt
  - [ ] Add milestone tracking instructions (silent)
  - [ ] Add safety gate detection instructions (silent, no interrupt)
  - [ ] Add patient state tracking instructions
  - [ ] Add action context logging instructions
  - [ ] Emphasize "continue naturally" even with failures

- [ ] Test Core Agent behavior
  - [ ] Milestones tracked but not mentioned
  - [ ] Critical failures detected but scenario continues
  - [ ] Patient deterioration/death handled naturally
  - [ ] No assessment feedback during scenario

### Phase 4: AAR Agent Updates

- [ ] Update AAR Agent system prompt
  - [ ] Add Safety Gate priority instructions
  - [ ] Add milestone positive-only instructions
  - [ ] Add outcome-based assessment instructions
  - [ ] Add competence level feedback templates
  - [ ] Add reasoning question framework
  - [ ] Add instructions for using existing blueprint features:
    - [ ] `clinical_anchor` usage in SUSTAIN/IMPROVE feedback
    - [ ] `consequence_templates` with variable population
    - [ ] `teaching_points` from common_errors and CDPs
    - [ ] `aar_teaching_point` from Safety Gate definitions

- [ ] Test AAR Agent behavior
  - [ ] Critical failures addressed first
  - [ ] Competence levels explained with patient context
  - [ ] Clinical anchors woven naturally into feedback
  - [ ] Consequence templates populated with actual scenario data
  - [ ] Milestones used for positive reinforcement only
  - [ ] Reasoning questions asked appropriately

### Phase 5: UI Implementation

- [ ] Create Progress Tracker component (PROGRESSIVE REVEAL)
  - [ ] Add to Clinical Notes panel
  - [ ] Implement progressive reveal (only show completed milestones)
  - [ ] NO empty boxes or placeholders for uncompleted milestones
  - [ ] Implement real-time addition of new milestone items
  - [ ] Style according to specifications
  - [ ] Test mobile responsiveness

- [ ] Test UI behavior
  - [ ] Panel starts empty
  - [ ] New milestones appear only when completed
  - [ ] No preview of "what to do next"
  - [ ] Timestamps display correctly
  - [ ] No negative indicators shown
  - [ ] Accessibility compliance

### Phase 6: Integration Testing

- [ ] End-to-end scenario execution
  - [ ] Run each scenario type
  - [ ] Verify milestone tracking works
  - [ ] Verify safety gate detection works
  - [ ] Verify data package generation
  - [ ] Verify AAR receives correct data

- [ ] Edge case testing
  - [ ] Scenario with all milestones completed
  - [ ] Scenario with critical failure
  - [ ] Scenario with patient death
  - [ ] Very fast completion
  - [ ] Very slow completion

### Phase 7: Documentation

- [ ] Update system documentation
  - [ ] Architecture diagrams
  - [ ] Data flow documentation
  - [ ] API specifications

- [ ] Update scenario authoring guide
  - [ ] Explain new blueprint structure
  - [ ] Provide templates
  - [ ] Define competence assessment criteria

---

## Summary: What Changed and Why

| Aspect | Old System (V2.0) | New System (V3.0) | Why Changed |
|--------|-------------------|-------------------|-------------|
| **Scoring** | Point accumulation | Outcome-based levels | Points create anxiety, arbitrary values |
| **Timing** | Fixed time thresholds | Patient state relative | Time thresholds are arbitrary, ignore learning curve |
| **Feedback** | Numerical score | Narrative + competence level | Scores don't explain what to improve |
| **Recognition** | Verbalization required | Action-demonstrated | Students may act correctly without narrating |
| **Critical Errors** | Point deduction | Safety Gate (high priority) | Need to distinguish "could improve" from "dangerous" |
| **Progress** | Points earned display | Universal milestones | Positive reinforcement without numerical pressure |
| **Assessment Location** | During scenario | Post-scenario (AAR) | Keep focus on patient during scenario |

**Core Principles Maintained:**
- ✅ Simplicity - Universal milestones, consistent framework
- ✅ Robustness - Works reliably across all scenarios  
- ✅ Scalability - New scenarios automatically compatible
- ✅ Medical accuracy - Based on patient outcomes
- ✅ Educational value - Clear, actionable feedback

---

**Document Version:** 3.0  
**Last Updated:** January 2025  
**Author:** Paramedic Master Training Platform Development Team

---

*This document serves as the authoritative reference for implementing the V3.0 assessment system. All blueprint modifications, code changes, and agent prompt updates should follow these specifications.*
