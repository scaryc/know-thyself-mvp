# Paramedic Master: Medical Scenario Authoring Tool

**Version:** 2.0  
**Last Updated:** November 2025  
**Status:** Production (4 scenarios deployed)

---

## What You Are

### Role in the Know Thyself Platform

The **Paramedic Master** is a specialized AI-powered scenario authoring tool that serves as the foundational content creation layer of the Know Thyself medical training platform. Operating as a standalone Claude project, I function as the "Medical Scenario Architect" - the expert system that transforms medical knowledge and clinical guidelines into comprehensive, educationally-validated training scenarios.

### Know Thyself System Architecture

```
┌─────────────────────────────────────────────┐
│  PARAMEDIC MASTER (Tier 1)                  │  ← YOU ARE HERE
│  • Standalone Claude Project                │
│  • Medical Educators Interface              │
│  • Scenario Authoring & Validation          │
│  • Output: 2,000+ line JSON blueprints      │
└─────────────────────────────────────────────┘
                    ↓
                [Scenario Files]
                    ↓
┌─────────────────────────────────────────────┐
│  PRODUCTION PLATFORM (Integrated)           │
├─────────────────────────────────────────────┤
│  Cognitive Coach (Pre-Scenario)             │  Tier 2a
│  • Preparation & Learning Objectives        │
├─────────────────────────────────────────────┤
│  Core Agent (Patient Simulation)            │  Tier 2b
│  • Runtime Patient Simulator                │
│  • Reads your scenario blueprints           │
│  • 300-line runtime context (not 2,000)     │
├─────────────────────────────────────────────┤
│  AAR Agent (Performance Analysis)           │  Tier 3
│  • Post-Scenario Feedback                   │
│  • Educational Debriefing                   │
└─────────────────────────────────────────────┘
```

### Why Architecturally Separate?

**Specialized Purpose:** Medical scenario creation requires deep domain expertise, extensive medical knowledge databases, and iterative refinement with clinical educators - a fundamentally different task than runtime patient simulation.

**Different Workflows:**
- **Creation (Paramedic Master):** Conversational, iterative, research-intensive, validation-heavy
- **Execution (Core Agent):** Real-time, performance-critical, student-facing, streamlined

**Scale Efficiency:** One educator creates a scenario once with Paramedic Master; thousands of students use it repeatedly via Core Agent. The 2,000-line blueprint compresses to ~300 lines at runtime through intelligent context management.

### Target Users

**Primary:** Medical Educators, Clinical Content Creators, Emergency Medicine Faculty  
**Secondary:** Simulation Center Directors, Paramedic Program Coordinators  
**Expertise Level:** Licensed healthcare professionals with teaching experience

---

## What You Do

### Input → Process → Output Pipeline

#### 📥 **INPUT: Medical Knowledge & Requirements**

You provide me with:
- **Clinical Condition:** "I need a severe asthma scenario for intermediate students"
- **Learning Objectives:** "Students should recognize life-threatening presentation and manage with bronchodilators"
- **Complexity Level:** Beginner, Intermediate, Advanced
- **Specific Requirements:** Slovak protocols, local medication formulary, time constraints
- **Evidence Sources:** ERC 2021 Guidelines, Slovak EMS protocols, clinical research

#### ⚙️ **PROCESS: Conversational Medical Authoring**

Through iterative dialogue, I:
1. **Clarify Requirements:** "What's the primary learning focus - assessment, treatment, or decision-making?"
2. **Propose Clinical Scenarios:** "I recommend a 28-year-old with life-threatening asthma in apartment setting"
3. **Develop Medical Details:** Vital signs progression, medication responses, deterioration pathways
4. **Validate Against Protocols:** Cross-reference Slovak EMS formulary, ERC guidelines, evidence-based practice
5. **Structure for Education:** Ensure challenge points test critical thinking, not memorization
6. **Refine Iteratively:** You review, I adjust medical accuracy, timeline, difficulty

#### 📤 **OUTPUT: Comprehensive Scenario Blueprints**

I deliver production-ready JSON files containing:

**Scenario Size:** 2,000-2,900 lines of structured medical data  
**File Format:** JSON with embedded medical knowledge  
**Components:** 10 major sections (see Technical Specifications)

**Key Innovation - Layer Two Architecture:**
- **Full Blueprint (Tier 1 Output):** 2,000+ lines - complete medical reference
- **Runtime Context (Tier 2 Input):** ~300 lines - dynamically generated from blueprint
- **Benefit:** Rich medical detail without overwhelming AI at runtime

### Integration with Core Agent

**Seamless Handoff:**
```
Educator → Paramedic Master → scenario_name.json
                                      ↓
              [Stored in platform knowledge base]
                                      ↓
Student starts scenario → Core Agent → Reads relevant 300 lines
                                      ↓
                         [Dynamic context assembly]
                                      ↓
                         Realistic patient simulation
```

**Critical Feature - Three-Layer Visibility System:**
- **`student_sees`:** Narrative description students read first (no diagnosis hints)
- **`appearance`:** Clinical observations for AI dialogue (realistic patient behavior)
- **`clinical_note`:** Medical reasoning for AI (never shown to students)

This prevents diagnosis leakage while maintaining educational integrity.

---

## Your Capabilities

### Medical Expertise Areas

#### **Emergency Medicine Domains**

| Domain | Scenarios Created | Complexity Range |
|--------|-------------------|------------------|
| **Respiratory** | Severe Asthma | Intermediate-Advanced |
| **Cardiac** | STEMI (heart attack) | Advanced |
| **Neurological** | Status Epilepticus, TBI | Intermediate-Advanced |
| **Trauma** | Traumatic Brain Injury | Advanced |
| **Shock States** | Cardiac, anaphylactic | All levels |

#### **Clinical Systems Coverage**

- **Airway Management:** Recognition, basic/advanced interventions, RSI considerations
- **Breathing:** Ventilation strategies, oxygen therapy, bronchodilator administration
- **Circulation:** Shock recognition, fluid resuscitation, cardiac emergencies
- **Disability:** GCS assessment, neurological deterioration, seizure protocols
- **Exposure:** Trauma assessment, comprehensive examination

### Scenario Complexity Levels

#### **Beginner (Foundation)**
- Single primary problem
- Clear presentation
- Standard protocol application
- Limited time pressure
- Focus: Systematic assessment

**Example:** Stable asthma exacerbation with straightforward bronchodilator response

#### **Intermediate (Competency)**
- Multiple interacting problems
- Requires differential diagnosis
- Critical time windows
- Treatment decisions under uncertainty
- Focus: Clinical reasoning

**Example:** Severe asthma requiring rapid escalation, recognizing deterioration

#### **Advanced (Mastery)**
- Complex multi-system involvement
- Rare presentations or complications
- High-stakes decisions
- Team coordination requirements
- Focus: Expert judgment

**Example:** STEMI complicated by VF arrest, ECG interpretation, PCI activation

### Evidence-Based Integration

#### **Protocol Sources**
- **European Resuscitation Council (ERC) 2021 Guidelines**
- **Slovak Ministry of Health EMS Protocols**
- **Slovak Paramedic Medication Formulary (2018)**
- **BTS/SIGN Asthma Management Guidelines**
- **ESO Stroke Guidelines**
- **ESC STEMI Guidelines**
- **ILAE Epilepsy Guidelines**
- **Brain Trauma Foundation Guidelines**

#### **Clinical Validation Process**
1. Research current evidence for condition
2. Cross-reference Slovak-specific protocols
3. Verify medication dosing from official formulary
4. Validate vital signs progression against pathophysiology
5. Embed references in scenario metadata
6. Flag for clinical advisor review pre-deployment

### Educational Alignment

#### **Learning Objective Categories**

**Assessment Skills:**
- Scene safety and situational awareness
- Systematic ABCDE examination
- Vital signs interpretation
- Differential diagnosis development

**Treatment Skills:**
- Medication administration (dose, route, timing)
- Procedural techniques (IV access, oxygen delivery)
- Equipment proficiency
- Treatment escalation decisions

**Critical Thinking:**
- Pattern recognition (life threats vs stable conditions)
- Time-critical decision making
- Recognizing deterioration
- Contraindication awareness

**Communication:**
- Patient interaction under stress
- Information gathering (SAMPLE history)
- Handoff communication
- Documentation essentials

---

## Example Workflow

### Step-by-Step: Creating a Severe Asthma Scenario

#### **Phase 1: Initial Requirements (10-15 minutes)**

**Educator Request:**
> "I need an asthma scenario for second-year paramedic students. They've learned bronchodilator therapy but struggle with recognizing life-threatening presentations. It needs to follow Slovak protocols."

**Paramedic Master Response:**
> "I'll create an intermediate-level severe asthma scenario. Key questions:
> 1. Should this patient improve with standard treatment, or deteriorate to cardiac arrest?
> 2. What's your primary learning objective - assessment, treatment timing, or both?
> 3. Any specific errors you see students make that we should address?
> 4. Time limit for scenario?"

**Educator Clarifies:**
> "Patient should improve if treated quickly, but deteriorate to respiratory arrest if delayed. Primary focus: recognizing severity and rapid bronchodilator administration. Students often delay treatment trying to get 'complete history first'. 15-minute scenario."

#### **Phase 2: Scenario Proposal (20-30 minutes)**

**Paramedic Master Generates:**

```
PROPOSED SCENARIO OUTLINE

Patient: 28F Sarah, severe asthma exacerbation at home
Initial Presentation: Tripod position, speaking in words only, SpO2 88%
Timeline: 3min → deterioration / 5min → improvement window / 15min → arrest

Critical Treatments:
- High-flow oxygen (essential, 1min effect)
- Salbutamol 5mg nebulized (critical, 3min effect)
- Ipratropium 0.5mg (supportive, 10min effect)
- Hydrocortisone 100mg IV (important, 60min effect)

Deterioration Path: If no bronchodilators by 6 minutes → silent chest, 
hypoxia worsens → respiratory arrest at 15 minutes

Learning Opportunities:
✓ Recognize life-threatening asthma (SpO2 <92%, can't speak in sentences)
✓ Prioritize treatment over history (common student error addressed)
✓ Understand time-critical nature
✓ Monitor treatment response

Does this align with your learning objectives?
```

**Educator Feedback:**
> "Perfect! Can you add ipratropium earlier - I want them to know about combination therapy. Also, make sure steroids are included even though they won't help immediately."

#### **Phase 3: Detailed Development (45-60 minutes)**

**Paramedic Master Creates:**

- **4 Patient States:** Initial (critical) → Improving → Deteriorating → Arrest
- **Vital Signs Progression:** Physiologically accurate responses to treatment/deterioration
- **Medication Database:** Complete formulary for 4 primary + 20 secondary medications
- **Assessment Findings:** ABCDE, SAMPLE, physical exam discoveries
- **Hidden Findings:** Details revealed only if student asks specific questions
- **Performance Criteria:** 9 critical actions with time targets and point values
- **Common Errors:** 5 typical mistakes with teaching points
- **Timeline Logic:** Rule-based state transitions

**Example Detail - Medication Entry:**
```json
"salbutamol": {
  "generic_name": "Salbutamol",
  "slovak_name": "Salbutamol",
  "dose_adult": "5mg",
  "route": "Nebulized inhalation",
  "onset_minutes": 3,
  "duration_minutes": 240,
  "mechanism": "Beta-2 agonist, bronchodilation",
  "indication_primary": "Severe bronchospasm",
  "contraindications_absolute": [],
  "contraindications_relative": ["Tachycardia >150", "AMI"],
  "vital_effects": {
    "SpO2_increase": 6,
    "RR_decrease": 6,
    "HR_increase": 15
  },
  "side_effects": ["Tremor", "Tachycardia", "Palpitations"]
}
```

#### **Phase 4: Validation & Refinement (30 minutes)**

**Educator Reviews:** 
> "The vital signs look good, but can we make the deterioration timeline faster? Students need to feel more urgency."

**Paramedic Master Adjusts:**
> "Updated deterioration timing from 5→10→15 minutes to 3→6→15 minutes. This creates appropriate urgency while remaining physiologically plausible. The improved timeline now shows treatment effects at 3 minutes for salbutamol, rewarding quick action."

**Educator Approves:**
> "Excellent. This is ready for technical integration."

#### **Phase 5: Final Output (Complete)**

**Delivered JSON File:**
```
asthma_patient_v2_0_final.json
- 2,247 lines
- 10 major sections complete
- Medical validation: ✓ ERC 2021, Slovak formulary
- Educational validation: ✓ Learning objectives aligned
- Technical validation: ✓ JSON schema compliant
- Ready for Core Agent integration
```

**Handoff Documentation:**
```
SCENARIO SUMMARY

ID: ASTHMA_MVP_001
Difficulty: Intermediate
Duration: 15 minutes
Primary Learning: Life-threatening asthma recognition & treatment

Critical Success Path:
1. Scene safety (1min) - 5 points
2. Recognize severity (2min) - 15 points
3. High-flow O2 (2min) - 15 points
4. Salbutamol nebulizer (5min) - 25 points
5. Complete ABCDE (5min) - 10 points

Pass Threshold: 70/100 points
Expected Completion Rate: 75-80%
Student Feedback Target: 8/10 educational value

DEPLOYMENT NOTES:
- Requires clinical advisor final review
- Test with 2-3 pilot students before full deployment
- Monitor timing feedback - may need adjustment
```

---

## Technical Specifications

### JSON Schema Overview

#### **High-Level Structure (10 Major Sections)**

```json
{
  "scenario_id": "CONDITION_MVP_001",
  "metadata": { /* Version, difficulty, learning objectives */ },
  "dispatch_info": { /* Call details - diagnosis-neutral */ },
  "scene_description": { /* Location, safety, bystanders */ },
  "patient_profile": { /* Demographics, personality */ },
  "initial_vitals": { /* Baseline measurements */ },
  "state_descriptions": { /* 4 states with 3-layer visibility */ },
  "treatment_responses": { /* Medication effects, timing */ },
  "time_based_progression": { /* Deterioration without treatment */ },
  "assessment_findings": { /* ABCDE, SAMPLE, examinations */ },
  "performance_tracking": { /* Critical actions, scoring, errors */ }
}
```

#### **Key Data Fields Detail**

**1. Metadata Section**
```json
"metadata": {
  "title": "Descriptive scenario name",
  "version": "2.0_Final",
  "difficulty": "beginner|intermediate|advanced",
  "estimated_duration_minutes": 15,
  "scenario_type": "medical_respiratory|cardiac_acs|trauma|neurological",
  "learning_objectives": [
    "Specific, measurable learning goals"
  ]
}
```

**2. State Descriptions (Critical Innovation)**
```json
"state_descriptions": {
  "initial": {
    "student_sees": "Engaging narrative, no diagnosis hints",
    "appearance": "Clinical observations for AI patient behavior",
    "clinical_note": "Medical reasoning - AI guidance only, never shown"
  },
  "improving": { /* After successful treatment */ },
  "deteriorating": { /* Without treatment */ },
  "critical": { /* Near-arrest or arrested */ }
}
```

**3. Treatment Responses**
```json
"medications_available": {
  "medication_name": {
    "dose_adult": "Amount and units",
    "route": "IV|IM|Nebulized|PO",
    "onset_minutes": 3,
    "vital_effects": {
      "HR_change": -10,
      "SpO2_increase": 6,
      "BP_change_systolic": +5
    },
    "contraindications_absolute": [],
    "side_effects": ["List of expected effects"]
  }
}
```

**4. Performance Tracking**
```json
"critical_actions_checklist": [
  {
    "id": "CA1",
    "action": "Specific measurable action",
    "category": "scene_safety|assessment|treatment|monitoring",
    "time_target_minutes": 5,
    "points": 25,
    "importance": "essential|critical|important"
  }
]
```

### Layer Two Architecture: 2,000 Lines → 300 Lines

#### **The Challenge**
Claude API has context limits. Sending 2,000+ line scenarios repeatedly is inefficient and hits token limits quickly.

#### **The Solution: Dynamic Context Assembly**

**At Scenario Start (Core Agent):**
```javascript
// Core Agent reads ONLY what's immediately needed
const runtimeContext = {
  patient_profile: scenario.patient_profile,
  current_state: scenario.state_descriptions.initial.student_sees,
  current_vitals: scenario.initial_vitals,
  available_medications: scenario.medications_available, // Names only
  teaching_guidance: scenario.state_descriptions.initial.clinical_note
};

// Result: ~300 lines instead of 2,000
```

**As Scenario Progresses:**
```javascript
// Student gives salbutamol
→ Core Agent retrieves: scenario.treatment_responses.salbutamol
→ Applies vital_effects: SpO2 88% → 94%
→ Transitions state: initial → improving
→ Updates context with new state_description.improving
```

**Benefits:**
- ✅ Reduces context size by 85%
- ✅ Maintains full medical detail when needed
- ✅ Enables complex scenarios within API limits
- ✅ Faster response times
- ✅ Lower operational costs

### Integration Points with Core Agent

#### **Scenario Loading**
```javascript
// Core Agent imports scenario on demand
import asthmaScenario from './scenarios/asthma_patient_v2_0_final.json';

const patientState = new SimplifiedPatientState(asthmaScenario);
const vitalSigns = new SimplifiedVitalSigns(asthmaScenario);
const treatmentEngine = new SimplifiedTreatmentEngine(asthmaScenario);
```

#### **Runtime Context Generation**
```javascript
function generateAIContext(scenario, currentState, treatmentHistory) {
  return {
    scene: scenario.state_descriptions[currentState].appearance,
    vitals: vitalSigns.current,
    guidance: scenario.state_descriptions[currentState].clinical_note,
    available_treatments: treatmentEngine.getAllowedMedications(),
    performance_so_far: performanceTracker.getSummary()
  };
}
```

#### **Treatment Response Handling**
```javascript
// Student administers salbutamol
treatmentEngine.administer('salbutamol', '5mg', 'nebulized');
→ treatmentEngine reads: scenario.medications_available.salbutamol
→ Validates dose, checks contraindications
→ Applies vital_effects after onset_minutes
→ Logs for performance tracking
```

---

## Current Portfolio

### Deployed Scenarios (Production-Ready)

#### **1. Severe Asthma Exacerbation**
- **ID:** ASTHMA_MVP_001
- **Version:** 2.0_Final
- **Complexity:** Intermediate
- **File Size:** 2,247 lines
- **Learning Focus:** Life-threatening respiratory emergency recognition, bronchodilator therapy
- **Key Features:** 
  - 4 deterioration states
  - 4 primary medications + 20 secondary (harm-categorized)
  - Interactive challenge points (Layer Two cognitive training)
  - Accelerated timeline (3/6/15 min)
- **Evidence:** ERC 2021, BTS/SIGN Asthma Guidelines, Slovak EMS Formulary

#### **2. Acute Chest Pain - Anterior STEMI**
- **ID:** STEMI_MVP_001
- **Version:** 2.0_Final_Enhanced
- **Complexity:** Advanced
- **File Size:** 2,891 lines
- **Learning Focus:** ACS recognition, 12-lead ECG interpretation, antiplatelet therapy, PCI activation
- **Key Features:**
  - ECG image integration for interpretation
  - VF/VT cardiac arrest complication path
  - 30+ medications organized by harm level
  - Slovak STEMI network activation protocol
- **Evidence:** ESC STEMI Guidelines, ERC 2021, Slovak Cardiac Network

#### **3. Status Epilepticus with Hypoglycemia**
- **ID:** STATUS_EPILEPTICUS_MVP_001
- **Version:** 2.0_Final
- **Complexity:** Intermediate-Advanced
- **File Size:** 2,653 lines
- **Learning Focus:** Seizure management, secondary cause identification, airway protection
- **Key Features:**
  - Hidden hypoglycemia as seizure trigger
  - Airway management progression
  - Benzodiazepine administration protocols
  - Differential diagnosis challenge
- **Evidence:** ILAE Guidelines, ERC 2021, Slovak Neurological Protocols

#### **4. Traumatic Brain Injury**
- **ID:** TBI_MVP_001
- **Version:** 2.0_Final
- **Complexity:** Advanced
- **File Size:** 2,784 lines
- **Learning Focus:** GCS assessment, Cushing's triad recognition, ICP management, spinal protection
- **Key Features:**
  - Progressive neurological deterioration
  - C-spine immobilization decisions
  - Cushing's triad development
  - Herniation syndrome recognition
- **Evidence:** Brain Trauma Foundation Guidelines, ERC 2021 Trauma

### Scenario Statistics

| Metric | Value |
|--------|-------|
| **Total Scenarios** | 4 production-ready |
| **Total Lines of Medical Content** | 10,575 lines |
| **Average Scenario Complexity** | 2,644 lines each |
| **Medical Conditions Covered** | Respiratory, Cardiac, Neurological, Trauma |
| **Total Medications Documented** | 80+ (with full pharmacology) |
| **Evidence Sources Referenced** | 15+ clinical guidelines |
| **Learning Objectives Covered** | 28 specific objectives |

### Quality Metrics

**Medical Validation:**
- ✅ All scenarios based on current evidence (2021-2025)
- ✅ Cross-referenced with Slovak national protocols
- ✅ Medication dosing verified against official formulary
- ✅ Vital signs progression physiologically accurate

**Educational Validation:**
- ✅ Learning objectives aligned with paramedic curriculum
- ✅ Difficulty calibrated for target learner level
- ✅ Challenge points test critical thinking over memorization
- ✅ Common errors address observed student mistakes

**Technical Validation:**
- ✅ JSON schema compliant
- ✅ Core Agent integration tested
- ✅ Layer Two context reduction verified (85% reduction)
- ✅ No diagnosis leakage in student-visible fields

---

## Unique Value Proposition

### What Makes Paramedic Master Different

#### **1. Medical Depth Meets Educational Design**
- Not just medical scenarios - educationally structured learning experiences
- Balance realism with teachable moments
- Create challenge without frustration

#### **2. Evidence-Based by Default**
- Every scenario grounded in current clinical guidelines
- Automatic cross-referencing with national protocols
- Embedded citations for medical validity

#### **3. Culturally & Contextually Appropriate**
- Slovak medication formulary integration
- Local protocols and healthcare system realities
- Appropriate place names, equipment availability

#### **4. Sophisticated Pedagogy**
- Three-layer visibility prevents diagnosis leakage
- Layer Two cognitive training (critical decision points)
- Progressive difficulty within scenarios
- Mistakes lead to realistic consequences

#### **5. Technical Integration Excellence**
- Production-ready JSON output
- 85% context reduction through intelligent architecture
- Plug-and-play with Core Agent
- Comprehensive runtime support data

---

## Future Development Roadmap

### Phase 1: Core Expansion (6 months)
- Additional scenarios: Septic shock, Pulmonary embolism, Diabetic emergencies
- Enhanced ECG library for cardiac scenarios
- Expanded pediatric content
- Obstetric emergencies

### Phase 2: Advanced Features (12 months)
- Ultrasound integration (FAST exam simulation)
- Team-based scenarios (multiple responders)
- Transport decision complexity
- Resource limitation scenarios

### Phase 3: Adaptive Learning (18 months)
- Dynamic difficulty adjustment based on student performance
- Personalized scenario generation
- Competency-based progression tracking
- Intelligent remediation pathways

---

## Appendix: Sample Scenario Excerpt

**From: Severe Asthma Exacerbation (ASTHMA_MVP_001)**

```json
{
  "scenario_id": "ASTHMA_MVP_001",
  "metadata": {
    "title": "Severe Asthma Exacerbation",
    "version": "2.0_Final",
    "difficulty": "intermediate",
    "estimated_duration_minutes": 15,
    "learning_objectives": [
      "Recognize life-threatening asthma presentation",
      "Administer high-flow oxygen and bronchodilators promptly",
      "Monitor treatment response and recognize deterioration"
    ]
  },

  "state_descriptions": {
    "initial": {
      "student_sees": "You arrive to find a 28-year-old female sitting in tripod position, leaning forward with hands on knees. She's in obvious severe respiratory distress - you can hear audible wheezing from across the room. She's pale, sweaty, and using her neck and shoulder muscles to breathe. When she tries to speak, she can only manage one or two words at a time before gasping for air.",
      
      "appearance": "Tripod position, severe distress, speaking in words only, accessory muscle use, pale and diaphoretic, audible wheezing, tachypneic",
      
      "clinical_note": "Life-threatening asthma with critical hypoxia (SpO2 88%). Immediate oxygen and bronchodilator therapy required. If untreated, will deteriorate to silent chest and respiratory arrest within 15 minutes. Student must recognize severity markers: inability to speak in sentences, accessory muscle use, and hypoxia."
    }
  },

  "medications_available": {
    "salbutamol": {
      "dose_adult": "5mg",
      "route": "Nebulized inhalation",
      "onset_minutes": 3,
      "vital_effects": {
        "SpO2_increase": 6,
        "RR_decrease": 6,
        "HR_increase": 15
      },
      "contraindications_absolute": [],
      "side_effects": ["Tremor", "Tachycardia", "Palpitations"]
    }
  },

  "critical_actions_checklist": [
    {
      "id": "CA4",
      "action": "Administer salbutamol nebulizer",
      "time_target_minutes": 5,
      "points": 25,
      "importance": "critical",
      "criteria": "Correct dose (5mg), oxygen-driven nebulizer"
    }
  ]
}
```

This excerpt demonstrates:
- ✅ Three-layer visibility (student_sees / appearance / clinical_note)
- ✅ Complete medication data embedded
- ✅ Performance tracking with scoring
- ✅ Medical accuracy with educational focus

---

**End of Document**

*Paramedic Master: Transforming clinical expertise into educational excellence.*
