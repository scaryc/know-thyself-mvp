# Slovak Translation & Development Plan
## Know Thyself MVP - Paramedic Training Simulation

**Document Version**: 1.0
**Date**: 2025-01-24
**Project**: Complete localization for Slovak paramedic student testing

---

## Executive Summary

### Project Scope
Complete translation and localization of the Know Thyself MVP medical simulation platform from English to Slovak language to enable testing with Slovak paramedic students.

### Total Translation Volume
- **~7,200 lines** of English content requiring professional translation
- **~15 files** requiring modification
- **Zero existing i18n infrastructure** - complete system build required

### Timeline Estimate
- **Development**: 28-36 hours
- **Translation**: 40-60 hours
- **Testing & Review**: 20-30 hours
- **Total**: 88-126 hours

### Critical Decisions Applied 

1. **Language Selection**: Students choose language at registration
2. **Medical Terminology**: Not constrained to specific textbook (handled by translator)
3. **Patient Address Style**: Formal (vy) throughout all scenarios
4. **Vital Signs Units**: Keep existing units (mmHg, °C, mmol/L, etc.)
5. **Code Comments**: Remain in English for international maintenance

---

## Table of Contents

1. [Translation Scope Breakdown](#translation-scope-breakdown)
2. [Technical Infrastructure Requirements](#technical-infrastructure-requirements)
3. [Phase-by-Phase Implementation Plan](#phase-by-phase-implementation-plan)
4. [Special Instructions for Slovak Translation](#special-instructions-for-slovak-translation)
5. [File-by-File Translation Checklist](#file-by-file-translation-checklist)
6. [Testing & Quality Assurance](#testing--quality-assurance)
7. [Risk Management](#risk-management)
8. [Resources Required](#resources-required)

---

## Translation Scope Breakdown

### 1. Agent Prompts (1,375 lines) - CRITICAL PRIORITY

These files control how AI agents communicate with students. They require both translation AND Slovak-specific instructions.

#### 1.1 Core Agent - Patient Simulator
- **File**: `server/prompts/core-agent-ami.txt`
- **Lines**: 259
- **Complexity**: HIGH
- **Content**:
  - System instructions for patient simulation behavior
  - Response structure guidelines (third person description + first person dialogue)
  - Tool usage instructions (update_vitals, reveal_patient_info)
  - Clinical note formatting rules
  - Example dialogues

**Special Requirements**:
- Add Slovak grammar instructions:
  - Use formal address (vy, nie ty) for all patient dialogue
  - Third-person pronouns (on/ona/oni) usage
  - Natural Slovak sentence structure in distress situations
- Patient speech must sound authentic for:
  - Elderly patients (Miroslav - STEMI)
  - Young adults (Sarah - Asthma)
  - Different distress levels

#### 1.2 Cognitive Coach Agent
- **File**: `server/prompts/cognitiveCoachAgent.txt`
- **Lines**: 664
- **Complexity**: MEDIUM
- **Content**:
  - Warm-up introduction ("Before we jump into scenarios...")
  - Question presentation frameworks
  - Feedback templates ("Good - you're weighing immediate threat...")
  - Mental organization techniques ("Simplify and Focus")
  - Phase transition messages
  - Coaching response patterns

**Special Requirements**:
- Coaching tone must be encouraging yet professional in Slovak
- Educational terminology appropriate for university-level students
- Feedback must align with Slovak paramedic training pedagogy

#### 1.3 After Action Review (AAR) Agent
- **File**: `server/prompts/aarAgent.txt`
- **Lines**: 452
- **Complexity**: MEDIUM
- **Content**:
  - Opening greetings and instructions
  - SUSTAIN/IMPROVE/APPLY feedback frameworks
  - Pattern analysis descriptions
  - Action plan templates
  - Clinical teaching points
  - Closing encouragement messages

**Special Requirements**:
- Professional feedback language
- Clinical teaching terminology in Slovak
- Maintain constructive tone in Slovak

---

### 2. Scenario Files (5,177 lines) - CRITICAL PRIORITY

Four complete patient simulation scenarios requiring medical translation accuracy.

#### 2.1 Asthma Patient
- **File**: `scenarios/asthma_patient_v2.0_final.json`
- **Lines**: 1,269
- **Patient**: Sarah (young adult female)
- **Key Medical Content**:
  - Severe respiratory distress presentation
  - Albuterol/salbutamol administration
  - Respiratory assessment terminology
  - Peak flow measurements
  - Accessory muscle usage descriptions

#### 2.2 STEMI Patient
- **File**: `scenarios/stemi_patient_v2_0_final.json`
- **Lines**: 1,415
- **Patient**: Miroslav (elderly male)  Already Slovak name!
- **Key Medical Content**:
  - Cardiac chest pain descriptions
  - 12-lead ECG terminology
  - STEMI network activation language
  - Cardiac arrest progression
  - Nitroglycerin administration

#### 2.3 Status Epilepticus Patient
- **File**: `scenarios/status_epilepticus_patient_v2_0_final.json`
- **Lines**: 1,295
- **Key Medical Content**:
  - Seizure activity descriptions (tonic-clonic, posturing)
  - Neurological assessment terminology (GCS, pupils)
  - Anti-epileptic medications (benzodiazepines)
  - Post-ictal state descriptions
  - Airway management language

#### 2.4 Traumatic Brain Injury (TBI) Patient
- **File**: `scenarios/tbi_patient_v2_0_final.json`
- **Lines**: 1,198
- **Patient**: Ján (male)  Already Slovak name!
- **Key Medical Content**:
  - Fall mechanism descriptions
  - Glasgow Coma Scale scoring
  - Cushing's triad (bradycardia, hypertension, irregular breathing)
  - C-spine precaution terminology
  - Herniation syndrome signs
  - Mannitol/hypertonic saline terminology

#### Scenario Translation Components (All 4 Files)

Each scenario contains:

1. **Metadata** (5-10 lines each)
   - Title, version, changelog
   - Learning objectives

2. **Dispatch Information** (20-30 lines each)
   - Call type/priority
   - Location description
   - Caller information
   - Additional dispatch notes

3. **Scene Description** (30-50 lines each)
   - Environmental details
   - Safety considerations
   - Bystander information
   - Access notes

4. **Patient Profile** (15-25 lines each)
   - Name, age, gender
   - Personality description
   - Background information

5. **Patient States** (200-400 lines per scenario)
   - INITIAL state
   - IMPROVING state
   - DETERIORATING state
   - CRITICAL state (if applicable)

   Each state includes:
   - `student_sees`: Narrative clinical description
   - `appearance`: Brief summary
   - `clinical_note`: Instructor guidance
   - Patient dialogue examples

6. **Assessment Findings** (100-150 lines per scenario)
   - SAMPLE history
   - Physical exam findings
   - Vital signs interpretations
   - Symptom descriptions

7. **Treatment Responses** (400-600 lines per scenario)
   - 30+ medications per scenario
   - Each medication includes:
     - `patient_says`: Patient verbal response (must be natural Slovak!)
     - `clinical_effect`: Physiological description
     - `teaching_point`: Educational note for AAR

8. **Challenge Points** (50-100 lines per scenario)
   - Socratic questions for students
   - Guidance prompts
   - Critical thinking triggers

9. **Decision Point Rubrics** (100-150 lines per scenario)
   - Optimal action criteria
   - Acceptable action criteria
   - Suboptimal action criteria
   - Associated teaching points

10. **No-Treatment Progressions** (50-80 lines per scenario)
    - Time-based deterioration descriptions
    - Warning signs of decline

11. **AAR Teaching Points** (80-120 lines per scenario)
    - Key learning objectives
    - Common mistakes analysis
    - Best practice summaries

**Critical Translation Notes for Scenarios**:
- Patient dialogue must use formal address (vy)
- Medical terminology must match Slovak paramedic education
- Medication names: Use Slovak generic names where applicable
- Vital signs: Keep same units (confirmed in decisions)
- Cultural context: Slovak emergency medical culture

---

### 3. Cognitive Coach Questions (362 lines) - HIGH PRIORITY

#### File Details
- **File**: `server/data/cognitiveCoachQuestions.json`
- **Questions**: 20 (CC001-CC020)
- **Lines**: 362
- **Complexity**: MEDIUM

#### Question Categories

1. **Treatment Complications** (CC001-CC004)
   - COPD + high-flow oxygen dilemma
   - Allergic reaction to protocol medication
   - Hypotension from pain medication
   - Pediatric medication dosing uncertainty

2. **Patient Communication** (CC005-CC008)
   - Anxious patient refusing treatment
   - Language barrier scenarios
   - Confused elderly patient
   - Family interference

3. **Unpredictable Situations** (CC009-CC012)
   - Equipment failure mid-treatment
   - Sudden deterioration
   - Multiple casualties
   - Transport delay scenarios

4. **Ethical Dilemmas** (CC013-CC016)
   - DNR orders with reversible conditions
   - Family wishes vs. patient needs
   - Resource allocation
   - Consent issues

5. **Time Pressure Decisions** (CC017-CC020)
   - Rapid sequence intubation decision
   - On-scene vs. transport priorities
   - Critical medication timing
   - Backup call decisions

#### Translation Components per Question

Each question (20 total) contains:

1. **`setup`** (50-150 words)
   - Full scenario description
   - Clinical context
   - Dilemma presentation

2. **`expectedGoodReasoning`** (30-80 words)
   - Criteria for good clinical reasoning
   - Key considerations students should mention

3. **`commonFlawedReasoning`** (30-80 words)
   - Typical mistakes
   - Cognitive traps descriptions

4. **`coachFollowUp`** (40-100 words)
   - Feedback template
   - Guiding questions

**Translation Notes**:
- Must reflect Slovak paramedic protocols
- Cultural context for ethical dilemmas
- Professional language for university students

---

### 4. Frontend UI Components (200 lines) - HIGH PRIORITY

Student-facing interface text requiring translation.

#### 4.1 Registration Component
- **File**: `know-thyself-frontend/src/components/Registration.tsx`
- **Lines**: ~60
- **Content**:
  - Page title: "KNOW THYSELF MVP"
  - Subtitle: "Paramedic Training Simulation"
  - Welcome message
  - Form labels:
    - "Full Name" + placeholder
    - "Email Address" + placeholder
    - Consent checkbox text
    - **NEW: Language selection dropdown** P
  - Button text: "Start Training" / "Registering..."
  - Error messages (9 different validation errors)
  - Information note about session duration

**New Feature Required**: Language selection dropdown
- Options: "English" / "Slovak" (or "English" / "Slovenina")
- Default: English
- Stored in session data

#### 4.2 Session Complete Component
- **File**: `know-thyself-frontend/src/components/SessionComplete.tsx`
- **Lines**: ~30
- **Content**:
  - Heading: "Training Session Complete"
  - Completion message
  - Button: "Start New Training Session"
  - Data saved confirmation

#### 4.3 Header Component
- **File**: `know-thyself-frontend/src/components/layout/Header.tsx`
- **Lines**: ~50
- **Content**:
  - App name: "Know Thyself"
  - Phase labels:
    - "Cognitive Warm-Up Phase"
    - "Preparing..."
    - "DISPATCH"
    - "SCENARIO X of 3"
    - "After Action Review"
    - "Performance Analysis Session"
  - Timer display
  - "Complete Scenario" button
  - "ACTIVE" badge

#### 4.4 Vitals Monitor
- **File**: `know-thyself-frontend/src/components/clinical/VitalsMonitor.tsx`
- **Lines**: ~40
- **Content**:
  - Heading: "Vital Signs Monitor"
  - Vital sign labels:
    - HR (Heart Rate)
    - RR (Respiratory Rate)
    - BP (Blood Pressure)
    - SpO‚ (Oxygen Saturation)
    - Temp (Temperature)
    - GCS (Glasgow Coma Scale)
    - Glucose (Blood Sugar)
  - Units: bpm, /min, mmHg, %, °C, mmol/L  Keep as-is
  - Status badges: "TACHY", "HIGH", "LOW", "Hypertensive"

**Translation Note**: Medical abbreviations (HR, RR, BP, SpO‚, GCS) should match what Slovak paramedics use.

#### 4.5 Patient Notes Panel
- **File**: `know-thyself-frontend/src/components/clinical/PatientNotes.tsx`
- **Lines**: ~20
- **Content**:
  - Heading: "Clinical Notes"
  - Empty state message: "Clinical notes will appear here as you gather patient information"

---

### 5. Server API Messages (50 lines) - MEDIUM PRIORITY

User-visible error and status messages in backend.

#### File
- **File**: `server/index.js`
- **Lines**: ~50 strings scattered throughout

#### Message Categories

1. **Registration Responses**
   - "Student registered successfully"
   - "Registration failed"
   - "Invalid student data"

2. **Session Messages**
   - "Session created successfully"
   - "Session not found"
   - "Session already completed"
   - "Invalid session ID"

3. **Dangerous Medication Warnings**
   - "DANGEROUS MEDICATION DETECTED"
   - "This medication is contraindicated"
   - "High-risk intervention attempted"

4. **State Transition Messages**
   - "State Transition: INITIAL ’ IMPROVING"
   - "State Transition: INITIAL ’ DETERIORATING"
   - "Critical treatments given"
   - "No oxygen after X minutes"
   - "Patient responding well to treatment"

5. **Performance Tracking**
   - "Optimal decision"
   - "Acceptable decision"
   - "Suboptimal decision"
   - "Dangerous decision"

**Translation Note**: These are primarily for debugging/logging, but some may be visible to students. All user-facing messages must be translated.

---

### 6. Database Schema Comments (Optional) - LOW PRIORITY

#### File
- **File**: `prisma/schema.prisma`
- **Decision**:  Keep comments in English (as per critical decision #5)

**No action required** - code comments remain in English for international maintenance.

---

## Technical Infrastructure Requirements

### 1. i18n Library Installation

#### Frontend Dependencies
```bash
npm install react-i18next i18next i18next-http-backend
```

#### Configuration Files to Create
- `know-thyself-frontend/src/i18n/config.ts` - i18next configuration
- `know-thyself-frontend/src/i18n/resources.ts` - Translation resource loader

### 2. Directory Structure

Create the following directory structure:

```
know-thyself-mvp/
   locales/
      en/
         ui.json                    # Frontend UI strings
         api.json                   # API messages
         common.json                # Shared strings
      sk/
          ui.json                    # Slovak UI strings
          api.json                   # Slovak API messages
          common.json                # Slovak shared strings
   server/
      prompts/
         en/
            core-agent-ami.txt
            cognitiveCoachAgent.txt
            aarAgent.txt
         sk/
             core-agent-ami.txt
             cognitiveCoachAgent.txt
             aarAgent.txt
      data/
          en/
             cognitiveCoachQuestions.json
          sk/
              cognitiveCoachQuestions.json
   scenarios/
      en/
         asthma_patient_v2.0_final.json
         stemi_patient_v2_0_final.json
         status_epilepticus_patient_v2_0_final.json
         tbi_patient_v2_0_final.json
      sk/
          asthma_patient_v2.0_final.json
          stemi_patient_v2_0_final.json
          status_epilepticus_patient_v2_0_final.json
          tbi_patient_v2_0_final.json
```

### 3. Database Schema Updates

#### Add Language Field to Session Model

```prisma
model Session {
  // ... existing fields ...
  language String @default("en") // "en" or "sk"
}
```

**Migration required**: Yes - add language column to sessions table

### 4. Backend Loading System

#### Create Language Loader Utilities

Files to create:
- `server/utils/languageLoader.js` - Dynamic prompt/scenario loading
- `server/middleware/languageMiddleware.js` - Extract language from session

#### Functions Required:
```javascript
loadPrompt(agentType, language)        // Load agent prompt based on language
loadScenario(scenarioId, language)     // Load scenario JSON based on language
loadQuestions(language)                 // Load cognitive coach questions
getTranslation(key, language)          // Get API message translation
```

### 5. Frontend Language Context

#### Create Language Provider

Files to create:
- `know-thyself-frontend/src/contexts/LanguageContext.tsx`
- `know-thyself-frontend/src/hooks/useTranslation.ts`

#### Features:
- Language selection in registration
- Store language preference in localStorage
- Pass language to all API calls
- Automatic UI translation switching

### 6. API Endpoints Updates

#### Modify Existing Endpoints:

1. **POST /api/register**
   - Accept `language` parameter
   - Store in session data
   - Default to "en" if not provided

2. **POST /api/session**
   - Load scenario based on session language
   - Load cognitive questions based on language

3. **POST /api/chat**
   - Load appropriate agent prompt based on language
   - Pass language context to AI

4. **GET /api/session/:sessionId**
   - Return language preference with session data

---

## Phase-by-Phase Implementation Plan

### PHASE 1: Infrastructure Setup (16-20 hours development)

#### Sprint 1.1: Frontend i18n Setup (4-5 hours)

**Tasks**:
- [ ] Install i18next packages in frontend
- [ ] Create `i18n/config.ts` with configuration
- [ ] Create `LanguageContext` and provider
- [ ] Create `useTranslation` hook
- [ ] Wrap App with i18n provider

**Deliverable**: Frontend ready for translated strings

#### Sprint 1.2: Create Directory Structure (2 hours)

**Tasks**:
- [ ] Create `/locales/en/` and `/locales/sk/` directories
- [ ] Create `/server/prompts/en/` and `/server/prompts/sk/` directories
- [ ] Create `/server/data/en/` and `/server/data/sk/` directories
- [ ] Create `/scenarios/en/` and `/scenarios/sk/` directories
- [ ] Move existing English content to `/en/` subdirectories

**Deliverable**: Organized directory structure

#### Sprint 1.3: Database Schema Update (1-2 hours)

**Tasks**:
- [ ] Add `language` field to Session model in schema.prisma
- [ ] Create migration: `npx prisma migrate dev --name add_language_field`
- [ ] Update Prisma client: `npx prisma generate`
- [ ] Test migration in development

**Deliverable**: Database supports language preference storage

#### Sprint 1.4: Backend Language Loader (5-6 hours)

**Tasks**:
- [ ] Create `server/utils/languageLoader.js`
- [ ] Implement `loadPrompt(agentType, language)` function
- [ ] Implement `loadScenario(scenarioId, language)` function
- [ ] Implement `loadQuestions(language)` function
- [ ] Implement `getTranslation(key, language)` function
- [ ] Add error handling for missing translations
- [ ] Add fallback to English if Slovak translation missing

**Deliverable**: Dynamic content loading based on language

#### Sprint 1.5: API Endpoints Update (4-5 hours)

**Tasks**:
- [ ] Update POST `/api/register` to accept `language` parameter
- [ ] Update session creation to store language preference
- [ ] Update POST `/api/session` to load language-specific scenario
- [ ] Update POST `/api/chat` to load language-specific prompts
- [ ] Update GET `/api/session/:sessionId` to return language
- [ ] Add language middleware for all protected routes
- [ ] Test all endpoints with language parameter

**Deliverable**: API fully supports language switching

---

### PHASE 2: Content Translation (40-60 hours translation)

**Note**: This phase requires professional medical translator with Slovak paramedic knowledge.

#### Sprint 2.1: Extract English Strings (4 hours development)

**Tasks**:
- [ ] Extract all UI strings from React components to `locales/en/ui.json`
- [ ] Extract all API messages to `locales/en/api.json`
- [ ] Create translation keys for all strings
- [ ] Update React components to use `useTranslation` hook
- [ ] Test that English still works with i18n keys

**Deliverable**: All strings externalized and ready for translation

#### Sprint 2.2: Translate Agent Prompts (12-16 hours translation)

**Professional translator tasks**:

- [ ] **Core Agent** (`server/prompts/sk/core-agent-ami.txt`) - 8-10 hours
  - Translate all instructions
  - Add Slovak grammar rules (formal vy, pronouns)
  - Adapt patient dialogue examples to natural Slovak
  - Add notes about Slovak medical terminology usage
  - Review: Slovak paramedic instructor

- [ ] **Cognitive Coach** (`server/prompts/sk/cognitiveCoachAgent.txt`) - 12-15 hours
  - Translate coaching introduction
  - Translate feedback frameworks
  - Adapt pedagogical language for Slovak students
  - Ensure encouraging tone in Slovak
  - Review: Slovak medical education expert

- [ ] **AAR Agent** (`server/prompts/sk/aarAgent.txt`) - 8-10 hours
  - Translate AAR frameworks (SUSTAIN/IMPROVE/APPLY)
  - Translate teaching point templates
  - Adapt clinical education language
  - Review: Slovak paramedic instructor

**Deliverable**: Three Slovak agent prompt files

#### Sprint 2.3: Translate Scenario Files (24-30 hours translation)

**Professional translator tasks**:

Each scenario requires 6-8 hours of careful medical translation:

- [ ] **Asthma Patient** (`scenarios/sk/asthma_patient_v2.0_final.json`) - 6-8 hours
  - Translate dispatch info, scene description
  - Translate patient dialogue (Sarah) - young adult female, formal vy
  - Translate assessment findings with Slovak medical terms
  - Translate 30+ medication responses (patient_says must sound natural!)
  - Translate teaching points
  - **Medical review**: Respiratory terminology accuracy

- [ ] **STEMI Patient** (`scenarios/sk/stemi_patient_v2_0_final.json`) - 7-9 hours
  - Translate dispatch info, scene description
  - Translate patient dialogue (Miroslav) - elderly male, formal vy
  - Translate cardiac terminology (crushing chest pain, radiation, etc.)
  - Translate ECG terminology
  - Translate 30+ medication responses
  - Translate teaching points
  - **Medical review**: Cardiac terminology accuracy, STEMI protocols

- [ ] **Status Epilepticus Patient** (`scenarios/sk/status_epilepticus_patient_v2_0_final.json`) - 6-8 hours
  - Translate dispatch info, scene description
  - Translate seizure activity descriptions (tonic-clonic, posturing)
  - Translate neurological assessment terms (GCS, pupils, reflexes)
  - Translate 30+ medication responses
  - Translate teaching points
  - **Medical review**: Neurological terminology accuracy

- [ ] **TBI Patient** (`scenarios/sk/tbi_patient_v2_0_final.json`) - 6-8 hours
  - Translate dispatch info, scene description
  - Translate patient dialogue (Ján) - male, formal vy
  - Translate trauma terminology (fall mechanism, C-spine, herniation)
  - Translate Cushing's triad descriptions
  - Translate 30+ medication responses
  - Translate teaching points
  - **Medical review**: Trauma terminology accuracy

**Special Instructions for Translator**:
1. All patient dialogue must use formal address (vy)
2. Medication names: Use Slovak generic names where applicable
3. Vital signs units: Keep as-is (mmHg, °C, mmol/L)
4. `patient_says` fields must sound natural - not literal translation
5. Medical terminology must match Slovak paramedic curriculum
6. Teaching points must align with Slovak EMS protocols

**Deliverable**: Four complete Slovak scenario files

#### Sprint 2.4: Translate Cognitive Coach Questions (8-10 hours translation)

**Professional translator tasks**:

- [ ] Translate all 20 questions (`server/data/sk/cognitiveCoachQuestions.json`)
  - CC001-CC004: Treatment complications (4 questions)
  - CC005-CC008: Patient communication (4 questions)
  - CC009-CC012: Unpredictable situations (4 questions)
  - CC013-CC016: Ethical dilemmas (4 questions)
  - CC017-CC020: Time pressure decisions (4 questions)

For each question:
- [ ] Translate `setup` (scenario description)
- [ ] Translate `expectedGoodReasoning` criteria
- [ ] Translate `commonFlawedReasoning` descriptions
- [ ] Translate `coachFollowUp` templates

**Special Instructions**:
- Scenarios must reflect Slovak medical culture
- Ethical dilemmas must align with Slovak medical ethics
- Protocols referenced must be Slovak EMS protocols

**Deliverable**: 20 Slovak cognitive coach questions

#### Sprint 2.5: Translate UI Components (4-6 hours translation)

**Professional translator tasks**:

- [ ] Translate `locales/sk/ui.json` (all frontend strings)
  - Registration form labels and placeholders
  - Error messages (9 validation errors)
  - Button text
  - Phase labels
  - Vital signs labels (check Slovak medical abbreviations)
  - Status badges
  - Success/completion messages

- [ ] Translate `locales/sk/api.json` (API messages)
  - Success messages
  - Error messages
  - Warning messages
  - State transition messages

**Special Instructions**:
- Professional but friendly tone
- University-level language
- Medical abbreviations must match Slovak standards

**Deliverable**: Two Slovak locale JSON files

---

### PHASE 3: Integration & Testing (12-16 hours development)

#### Sprint 3.1: Frontend Integration (4-5 hours)

**Tasks**:
- [ ] Add language selection dropdown to Registration component
  - Options: "English" / "Slovenina"
  - Store selection in component state
  - Pass to registration API call
- [ ] Replace all hardcoded strings with `t()` function calls
- [ ] Test language switching in development
- [ ] Verify Slovak characters render correctly (UTF-8)
- [ ] Test all UI components in Slovak

**Deliverable**: Frontend fully functional in both languages

#### Sprint 3.2: Backend Integration (3-4 hours)

**Tasks**:
- [ ] Test prompt loading for both languages
- [ ] Test scenario loading for both languages
- [ ] Test question loading for both languages
- [ ] Verify fallback to English if Slovak missing
- [ ] Test API message translations
- [ ] Verify UTF-8 encoding in database storage

**Deliverable**: Backend correctly serves Slovak content

#### Sprint 3.3: AI Agent Testing (5-7 hours)

**Critical testing phase - AI agents responding in Slovak**:

**Core Agent Testing**:
- [ ] Create test session with Slovak language
- [ ] Test patient responses in Slovak
  - Verify formal address (vy) used consistently
  - Check natural Slovak dialogue (not robotic)
  - Test different emotional states (calm, distressed, critical)
- [ ] Test clinical note generation in Slovak
- [ ] Test tool usage (update_vitals, reveal_patient_info)
- [ ] Test state transitions with Slovak descriptions

**Cognitive Coach Testing**:
- [ ] Test warm-up question presentation in Slovak
- [ ] Test feedback generation in Slovak
  - Check coaching tone
  - Verify pedagogical language appropriate
- [ ] Test question progression
- [ ] Test transition to scenarios

**AAR Agent Testing**:
- [ ] Test AAR introduction in Slovak
- [ ] Test pattern analysis in Slovak
- [ ] Test SUSTAIN/IMPROVE/APPLY feedback in Slovak
- [ ] Test teaching point presentation
- [ ] Test action plan generation

**Known Risks**:
- AI may occasionally respond in English (prompt adherence issue)
- Medical terminology may not always be correct
- Formal/informal address may slip in long conversations

**Mitigation**:
- Strengthen language instructions in prompts
- Add explicit Slovak grammar rules
- Test extensively and refine prompts

**Deliverable**: All three AI agents function correctly in Slovak

---

### PHASE 4: Review & Pilot Testing (20-30 hours)

#### Sprint 4.1: Medical Accuracy Review (8-12 hours)

**Reviewer**: Slovak paramedic instructor or experienced Slovak paramedic

**Review Checklist**:

**Scenario Medical Review**:
- [ ] **Asthma scenario**
  - Respiratory assessment terminology correct
  - Medication names match Slovak protocols
  - Treatment response descriptions accurate
  - Teaching points align with Slovak EMS education
- [ ] **STEMI scenario**
  - Cardiac terminology correct
  - ECG interpretation language accurate
  - STEMI protocol references correct
  - Medication administration terminology matches Slovak practice
- [ ] **Status Epilepticus scenario**
  - Seizure descriptions medically accurate
  - Neurological assessment terms correct
  - Anti-epileptic medication names correct
  - GCS terminology matches Slovak scoring
- [ ] **TBI scenario**
  - Trauma terminology correct
  - C-spine management language appropriate
  - Cushing's triad description accurate
  - Herniation syndrome terminology correct

**General Medical Review**:
- [ ] Vital signs terminology correct
- [ ] Medical abbreviations match Slovak standards
- [ ] Treatment protocols align with Slovak EMS guidelines
- [ ] Clinical reasoning language appropriate for paramedic level

**Deliverable**: Medical accuracy certification or list of corrections needed

#### Sprint 4.2: Language Quality Review (4-6 hours)

**Reviewer**: Native Slovak speaker with medical background

**Review Checklist**:
- [ ] Patient dialogue sounds natural (not literal translation)
- [ ] Formal address (vy) used consistently
- [ ] No awkward grammatical constructions
- [ ] Medical terminology usage natural for Slovak paramedics
- [ ] Coaching language encouraging and professional
- [ ] AAR feedback constructive and clear
- [ ] UI text clear and user-friendly

**Deliverable**: Language quality certification or list of corrections needed

#### Sprint 4.3: Corrections & Refinements (4-6 hours)

**Tasks**:
- [ ] Implement medical accuracy corrections
- [ ] Implement language quality corrections
- [ ] Re-test AI agents after prompt changes
- [ ] Update scenario files based on feedback
- [ ] Verify all changes don't break English version

**Deliverable**: Refined Slovak content ready for pilot

#### Sprint 4.4: Pilot Testing with Slovak Students (4-6 hours)

**Pilot Plan**:
- **Participants**: 2-3 Slovak paramedic students
- **Duration**: 60-90 minutes per student (full session)
- **Method**: Observed sessions with think-aloud protocol

**Test Protocol**:
1. **Registration** (2 minutes)
   - Select Slovak language
   - Complete registration form
   - Verify UI in Slovak

2. **Cognitive Warm-Up** (15-20 minutes)
   - Complete 5 warm-up questions
   - Provide feedback on question clarity
   - Assess coaching language quality

3. **Scenario 1** (15-20 minutes)
   - Complete one full scenario
   - Interact with patient in Slovak
   - Assess dialogue naturalness
   - Check medical terminology comprehension

4. **Scenarios 2 & 3** (30-40 minutes)
   - Complete remaining scenarios
   - Note any language issues
   - Check for consistency

5. **After Action Review** (10-15 minutes)
   - Complete AAR phase
   - Assess feedback clarity
   - Check understanding of teaching points

**Feedback Collection**:
- [ ] Post-session questionnaire
  - Language clarity (1-5 scale)
  - Medical terminology appropriateness (1-5 scale)
  - Patient dialogue naturalness (1-5 scale)
  - Overall experience (1-5 scale)
  - Open feedback on language issues
- [ ] Interview questions
  - Which parts were confusing?
  - Was medical terminology correct?
  - Did patient speech sound natural?
  - Any suggestions for improvement?

**Deliverable**: Pilot test report with recommendations

#### Sprint 4.5: Final Refinements (2-4 hours)

**Tasks**:
- [ ] Implement pilot feedback
- [ ] Final testing of all changes
- [ ] Performance verification (no slowdowns from language loading)
- [ ] Documentation of known issues
- [ ] Preparation for larger-scale Slovak student testing

**Deliverable**: Production-ready Slovak version

---

## Special Instructions for Slovak Translation

### 1. Formal Address (Vy) Requirements

**Rule**: All communication with patients and students must use formal address.

**Implementation**:
- Patient dialogue: Always "vy" (never "ty")
- Verbs conjugated for formal second person
- Example (Slovak):
  -  Correct: "Ako sa **cítite**?" (How do **you** [formal] feel?)
  - L Incorrect: "Ako sa **cítia**?" (How do **you** [informal] feel?)

**Add to Core Agent Prompt**:
```
IMPORTANT: When simulating patient speech in Slovak, ALWAYS use formal address (vy form).
- Use "vy" not "ty"
- Conjugate verbs appropriately: cítite (not cítia), máte (not máa), viete (not viea)
- This reflects professional paramedic-patient interaction in Slovak culture.
```

### 2. Slovak Grammar Rules for AI Agents

**Add to Core Agent Prompt**:

```
SLOVAK LANGUAGE GUIDELINES:

1. FORMAL ADDRESS (VY):
   - Always use formal "vy" when patient speaks to paramedic
   - Verbs: cítite, máte, viete, potrebujete, mô~ete

2. THIRD-PERSON DESCRIPTION:
   - Use correct pronouns: on (he), ona (she), oni (they)
   - Gender agreement for adjectives

3. NATURAL DISTRESS EXPRESSIONS:
   - Calm: "Bolí ma to." (It hurts.)
   - Distressed: "Ve>mi ma to bolí!" (It hurts a lot!)
   - Critical: "Nemô~em dýchae! Pomô~te mi!" (I can't breathe! Help me!)

4. MEDICAL TERMS:
   - Use Slovak medical terminology, not English
   - Example: "dýchanie" not "breathing", "bolese" not "pain"
```

### 3. Medical Terminology Guidance

**For Translator**:

| English | Slovak | Notes |
|---------|--------|-------|
| Blood pressure | Krvný tlak | Standard term |
| Heart rate | Srdcová frekvencia / Pulz | Both acceptable |
| Respiratory rate | Dychová frekvencia | Standard term |
| Oxygen saturation | Saturácia kyslíkom | Standard term |
| Glasgow Coma Scale | Glasgowská kóma akála | Same abbreviation (GCS) |
| SAMPLE history | SAMPLE anamnéza | Acronym kept, may need explanation |
| Chest pain | Bolese na hrudníku | Standard |
| Shortness of breath | Dýchavinose | Standard |
| Seizure | Záchvat / KUe | Context-dependent |
| Traumatic brain injury | Traumatické poranenie mozgu | Standard |

**Note**: Translator should verify terms with Slovak paramedic textbooks.

### 4. Medication Name Handling

**Guidelines**:
- Use **generic names** in Slovak when possible
- If brand names used, use Slovak market names

**Examples**:
| English Generic | Slovak Generic | Notes |
|----------------|----------------|-------|
| Albuterol | Salbutamol | Preferred in Europe |
| Epinephrine | Epinefrín / Adrenalín | Both used |
| Nitroglycerin | Nitroglycerín | Same |
| Aspirin | Kyselina acetylsalicylová / Aspirín | Medical term / common name |
| Morphine | Morfín | Same |

**Add to scenarios**: Check all medication names with Slovak pharmacology references.

### 5. Vital Signs Units (Keep As-Is)

**Confirmed**: Keep existing units as specified in critical decisions.

| Parameter | Unit | Slovak Term |
|-----------|------|-------------|
| Blood Pressure | mmHg | mmHg (same) |
| Heart Rate | bpm | úderov/min |
| Respiratory Rate | /min | dychov/min |
| Temperature | °C | °C (same) |
| SpO‚ | % | % (same) |
| Glucose | mmol/L | mmol/L (same) |
| GCS | points | bodov |

### 6. Cultural Context Considerations

**Emergency Medical Culture in Slovakia**:
- Professional distance maintained (formal address)
- Family often present and vocal
- Patient may defer to paramedic authority
- Religious considerations (Catholicism prevalent)

**Adapt scenarios to reflect**:
- Slovak locations (cities, streets) where appropriate
- Slovak bystander behaviors
- Slovak emergency number (112) if mentioned

### 7. UTF-8 Character Encoding

**Slovak Special Characters**:
á, ä, , , é, í, :, >, H, ó, ô, U, a, e, ú, ý, ~

**Technical Requirements**:
- Database: Ensure UTF-8 encoding (already set in PostgreSQL)
- JSON files: Save with UTF-8 encoding (no BOM)
- API responses: Content-Type: application/json; charset=utf-8
- Frontend: meta charset="utf-8"

**Test strings**:
```
"da~ká dýchavinose, bolese na hrudníku, aok."
"Príaerná bolese hlavy, nevo>nose, zmätenose."
```

### 8. AI Prompt Strengthening Techniques

**To ensure AI stays in Slovak**:

**Add to ALL agent prompts**:
```
  CRITICAL: You MUST respond ONLY in Slovak language.
- All your responses must be in Slovak
- Patient dialogue must be in Slovak
- Clinical notes must be in Slovak
- If you're uncertain of a Slovak term, use your best judgment
- NEVER switch to English mid-conversation
```

**Add reinforcement at end of prompts**:
```
REMINDER: Respond in SLOVAK language only. This is a Slovak-language training session.
```

---

## File-by-File Translation Checklist

### Priority 1: Critical (Student-Facing)

#### Agent Prompts

- [ ] `server/prompts/en/core-agent-ami.txt` ’ `server/prompts/sk/core-agent-ami.txt`
  - **Lines**: 259
  - **Complexity**: HIGH
  - **Estimated time**: 8-10 hours
  - **Reviewer**: Slovak paramedic instructor
  - **Special notes**: Add Slovak grammar rules, formal address instructions

- [ ] `server/prompts/en/cognitiveCoachAgent.txt` ’ `server/prompts/sk/cognitiveCoachAgent.txt`
  - **Lines**: 664
  - **Complexity**: MEDIUM
  - **Estimated time**: 12-15 hours
  - **Reviewer**: Slovak medical education expert
  - **Special notes**: Pedagogical language, encouraging tone

- [ ] `server/prompts/en/aarAgent.txt` ’ `server/prompts/sk/aarAgent.txt`
  - **Lines**: 452
  - **Complexity**: MEDIUM
  - **Estimated time**: 8-10 hours
  - **Reviewer**: Slovak paramedic instructor
  - **Special notes**: Clinical teaching terminology

#### Scenarios

- [ ] `scenarios/en/asthma_patient_v2.0_final.json` ’ `scenarios/sk/asthma_patient_v2.0_final.json`
  - **Lines**: 1,269
  - **Patient**: Sarah (young adult female)
  - **Estimated time**: 6-8 hours
  - **Medical review**: Respiratory terminology
  - **Key focus**: Natural patient dialogue, medication responses

- [ ] `scenarios/en/stemi_patient_v2_0_final.json` ’ `scenarios/sk/stemi_patient_v2_0_final.json`
  - **Lines**: 1,415
  - **Patient**: Miroslav  Slovak name
  - **Estimated time**: 7-9 hours
  - **Medical review**: Cardiac terminology, ECG terms
  - **Key focus**: STEMI protocol language

- [ ] `scenarios/en/status_epilepticus_patient_v2_0_final.json` ’ `scenarios/sk/status_epilepticus_patient_v2_0_final.json`
  - **Lines**: 1,295
  - **Estimated time**: 6-8 hours
  - **Medical review**: Neurological terms, GCS
  - **Key focus**: Seizure descriptions

- [ ] `scenarios/en/tbi_patient_v2_0_final.json` ’ `scenarios/sk/tbi_patient_v2_0_final.json`
  - **Lines**: 1,198
  - **Patient**: Ján  Slovak name
  - **Estimated time**: 6-8 hours
  - **Medical review**: Trauma terminology
  - **Key focus**: C-spine, herniation language

#### Cognitive Questions

- [ ] `server/data/en/cognitiveCoachQuestions.json` ’ `server/data/sk/cognitiveCoachQuestions.json`
  - **Lines**: 362
  - **Questions**: 20 complete questions
  - **Estimated time**: 8-10 hours
  - **Reviewer**: Slovak paramedic instructor
  - **Key focus**: Slovak medical culture, protocols

#### Frontend Components

- [ ] `know-thyself-frontend/src/components/Registration.tsx`
  - Extract strings to `locales/en/ui.json`
  - Translate to `locales/sk/ui.json`
  - Add language selection dropdown
  - **Estimated time**: 2 hours (dev) + 1 hour (translation)

- [ ] `know-thyself-frontend/src/components/SessionComplete.tsx`
  - Extract strings to `locales/en/ui.json`
  - Translate to `locales/sk/ui.json`
  - **Estimated time**: 1 hour (dev) + 0.5 hour (translation)

- [ ] `know-thyself-frontend/src/components/layout/Header.tsx`
  - Extract strings to `locales/en/ui.json`
  - Translate to `locales/sk/ui.json`
  - **Estimated time**: 1 hour (dev) + 0.5 hour (translation)

- [ ] `know-thyself-frontend/src/components/clinical/VitalsMonitor.tsx`
  - Extract strings to `locales/en/ui.json`
  - Translate to `locales/sk/ui.json`
  - Verify Slovak medical abbreviations
  - **Estimated time**: 1 hour (dev) + 1 hour (translation + review)

- [ ] `know-thyself-frontend/src/components/clinical/PatientNotes.tsx`
  - Extract strings to `locales/en/ui.json`
  - Translate to `locales/sk/ui.json`
  - **Estimated time**: 0.5 hour (dev) + 0.5 hour (translation)

#### API Messages

- [ ] `server/index.js`
  - Extract messages to `locales/en/api.json`
  - Translate to `locales/sk/api.json`
  - Update code to use translation function
  - **Estimated time**: 3 hours (dev) + 2 hours (translation)

---

### Priority 2: Important (System Messages)

- [ ] Error messages in `server/services/*.js`
  - Extract to `locales/en/api.json`
  - Translate to `locales/sk/api.json`
  - **Estimated time**: 2 hours (dev) + 1 hour (translation)

---

### Priority 3: Optional (Documentation)

- [ ] `docs/USER_GUIDE.md` (if students will see it)
  - Create `docs/USER_GUIDE_SK.md`
  - **Estimated time**: 4-6 hours (translation)
  - **Decision needed**: Will Slovak students see documentation?

---

## Testing & Quality Assurance

### 1. Unit Testing

**Frontend Tests**:
- [ ] Test language selection in registration
- [ ] Test language context provider
- [ ] Test translation hook
- [ ] Test UI component rendering in both languages
- [ ] Test fallback to English if translation missing

**Backend Tests**:
- [ ] Test prompt loading for both languages
- [ ] Test scenario loading for both languages
- [ ] Test question loading for both languages
- [ ] Test translation function for API messages
- [ ] Test fallback to English if file missing

### 2. Integration Testing

- [ ] **End-to-End Slovak Session**:
  1. Register with Slovak language selection
  2. Start session - verify Slovak scenario loads
  3. Complete cognitive warm-up - verify Slovak questions
  4. Complete Scenario 1 - verify Slovak patient dialogue
  5. Complete Scenario 2 - verify consistency
  6. Complete Scenario 3 - verify consistency
  7. Complete AAR - verify Slovak feedback
  8. Verify all data saved correctly

- [ ] **End-to-End English Session** (regression test):
  1. Register with English language
  2. Complete full session
  3. Verify nothing broken by Slovak changes

### 3. AI Response Quality Testing

**Test Matrix** (3 agents × 2 languages = 6 combinations):

#### Core Agent Slovak Testing:
- [ ] Patient dialogue naturalness
  - Test 10 different interactions
  - Rate naturalness 1-5 for each
  - Check formal address (vy) consistency
- [ ] Medical terminology accuracy
  - Verify 20 common medical terms used correctly
- [ ] Clinical note quality
  - Generate 5 clinical notes, review accuracy
- [ ] State transition descriptions
  - Test all 4 states × 4 scenarios = 16 tests

#### Cognitive Coach Slovak Testing:
- [ ] Question presentation clarity
  - Test all 20 questions
  - Rate clarity 1-5 for each
- [ ] Feedback quality
  - Test 10 different student responses
  - Rate feedback appropriateness 1-5
- [ ] Coaching tone
  - Verify encouraging yet professional

#### AAR Agent Slovak Testing:
- [ ] Pattern analysis quality
  - Test with 3 different student performance profiles
  - Rate analysis depth 1-5
- [ ] Teaching point clarity
  - Review 10 different teaching points
  - Rate clarity 1-5
- [ ] Action plan relevance
  - Verify action plans specific and actionable

### 4. Medical Accuracy Verification

**Verification Protocol**:
- [ ] **Slovak Paramedic Instructor Review** (8-12 hours)
  - Review all 4 scenarios for medical accuracy
  - Verify terminology matches Slovak curriculum
  - Check treatment protocols align with Slovak EMS
  - Verify assessment procedures correct
  - Review teaching points for appropriateness

**Verification Checklist**:
- [ ] Vital signs terminology correct
- [ ] Assessment procedure language matches training
- [ ] Medication names recognized by Slovak paramedics
- [ ] Treatment protocols match Slovak guidelines
- [ ] Clinical reasoning language appropriate for student level
- [ ] No outdated or incorrect medical information

### 5. Linguistic Quality Verification

**Native Speaker Review** (4-6 hours):
- [ ] Grammar check all translated content
- [ ] Verify natural Slovak sentence structure
- [ ] Check formal address consistency
- [ ] Verify no literal translations (should be adapted)
- [ ] Check medical terminology usage natural
- [ ] Verify no awkward phrasings

### 6. Performance Testing

- [ ] Load time comparison (English vs Slovak)
  - Target: <5% difference
- [ ] Scenario loading time with language selection
  - Target: <500ms
- [ ] Agent response time with Slovak prompts
  - Target: Similar to English (~2-5 seconds)
- [ ] Database query performance with language filter
  - Target: No significant impact

### 7. UTF-8 Encoding Verification

- [ ] Test all Slovak special characters display correctly:
  - á, ä, , , é, í, :, >, H, ó, ô, U, a, e, ú, ý, ~
- [ ] Test in all UI components
- [ ] Test in database storage and retrieval
- [ ] Test in API responses
- [ ] Test in generated PDF reports (if applicable)

### 8. User Acceptance Testing (Pilot)

**Pilot Group**: 2-3 Slovak paramedic students

**Test Protocol**:
1. **Pre-Session Briefing** (5 minutes)
   - Explain purpose: testing Slovak language quality
   - Encourage honest feedback
   - Think-aloud protocol

2. **Full Session Completion** (60-90 minutes)
   - Complete all phases
   - Researcher observes, takes notes
   - Note any confusion or issues

3. **Post-Session Questionnaire** (10 minutes)
   - **Language Clarity**: How clear was the Slovak language? (1-5)
   - **Medical Terminology**: Was medical terminology appropriate? (1-5)
   - **Patient Dialogue**: Did patient speech sound natural? (1-5)
   - **Coaching Quality**: Was coaching feedback helpful? (1-5)
   - **Overall Experience**: Overall satisfaction (1-5)
   - **Open Feedback**: What could be improved?

4. **Semi-Structured Interview** (15 minutes)
   - Which parts were confusing?
   - Any medical terminology you didn't understand?
   - Did patient speech sound realistic?
   - Any suggestions for improvement?

**Success Criteria**:
- Average ratings e 4.0/5.0 on all metrics
- No critical medical terminology errors reported
- No major comprehension issues
- Students would recommend to peers

**Failure Criteria (requires revision)**:
- Any rating < 3.0/5.0
- Medical terminology errors identified
- Students report confusion or frustration
- Patient dialogue sounds "robotic" or "translated"

---

## Risk Management

### High-Risk Issues

#### Risk 1: AI Agent Language Drift
**Description**: AI may occasionally respond in English despite Slovak prompts

**Likelihood**: MEDIUM
**Impact**: HIGH (breaks immersion for students)

**Mitigation**:
- Add explicit language enforcement to all prompts
- Include reinforcement statements throughout prompts
- Test extensively with various student inputs
- Add system message reminders in context

**Contingency**:
- If occurs >5% of responses, strengthen prompts further
- Add language validation in backend (flag non-Slovak responses)
- Consider fine-tuning if issue persists

#### Risk 2: Medical Terminology Inaccuracy
**Description**: Translation may use incorrect or outdated Slovak medical terms

**Likelihood**: MEDIUM
**Impact**: HIGH (undermines educational value)

**Mitigation**:
- Require professional medical translator
- Mandatory Slovak paramedic instructor review
- Cross-reference with Slovak paramedic textbooks
- Pilot test with Slovak students

**Contingency**:
- Maintain terminology correction log
- Quick update process for terminology fixes
- Glossary of approved Slovak medical terms

#### Risk 3: Patient Dialogue Sounds Unnatural
**Description**: Literal translation makes patient speech sound robotic

**Likelihood**: MEDIUM
**Impact**: MEDIUM (reduces realism)

**Mitigation**:
- Emphasize natural adaptation (not literal translation)
- Native Slovak speaker review
- Pilot test with Slovak students for feedback
- Iterative refinement based on feedback

**Contingency**:
- Re-translate problematic dialogues
- Work with Slovak paramedic to rewrite naturally
- May require 2-3 iterations to get right

### Medium-Risk Issues

#### Risk 4: Translation Timeline Overrun
**Description**: Translation takes longer than 40-60 hour estimate

**Likelihood**: MEDIUM
**Impact**: MEDIUM (delays Slovak student testing)

**Mitigation**:
- Break translation into smaller sprints
- Prioritize critical content (scenarios first)
- Build buffer time into schedule
- Consider parallel translation by multiple translators

**Contingency**:
- Release in phases (Phase 1: 1-2 scenarios, Phase 2: all scenarios)
- Extend timeline as needed
- Increase translator hours if available

#### Risk 5: i18n Infrastructure Bugs
**Description**: Technical issues with language switching, loading, or encoding

**Likelihood**: LOW-MEDIUM
**Impact**: MEDIUM (may block testing)

**Mitigation**:
- Thorough testing in Phase 1
- Use established i18n library (react-i18next)
- UTF-8 encoding verification
- Fallback to English if Slovak fails

**Contingency**:
- Debug and fix before Phase 2 translation
- Detailed error logging
- Rollback plan to English-only version

#### Risk 6: Performance Degradation
**Description**: Language loading adds latency to system

**Likelihood**: LOW
**Impact**: LOW-MEDIUM (poor user experience)

**Mitigation**:
- Performance testing in Phase 3
- Optimize file loading (caching)
- Lazy loading of translations
- Monitor response times

**Contingency**:
- Implement caching strategies
- Pre-load translations on session start
- Optimize file sizes

### Low-Risk Issues

#### Risk 7: Inconsistent Terminology Across Scenarios
**Description**: Same term translated differently in different scenarios

**Likelihood**: MEDIUM
**Impact**: LOW (confusing but not critical)

**Mitigation**:
- Create terminology glossary upfront
- Single translator for consistency
- Terminology review across all scenarios
- Automated consistency checking

**Contingency**:
- Post-translation consistency audit
- Update to standardized terms
- Add to glossary for future reference

#### Risk 8: Missing Translations
**Description**: Some strings not translated (missed during extraction)

**Likelihood**: MEDIUM
**Impact**: LOW (English fallback works)

**Mitigation**:
- Comprehensive string extraction
- Automated checking for missing keys
- Fallback to English prevents breakage
- Testing catches missing translations

**Contingency**:
- Maintain log of missing translations
- Translate as discovered
- Release minor updates

---

## Resources Required

### 1. Personnel

#### Development Team
- **Frontend Developer** (16-20 hours)
  - i18n setup
  - Language selection implementation
  - UI string extraction and integration
  - Testing

- **Backend Developer** (12-16 hours)
  - Language loader implementation
  - API endpoint updates
  - Database migration
  - Testing

#### Translation Team
- **Professional Medical Translator** (40-60 hours)
  - Slovak native speaker
  - Medical background or experience
  - Paramedic terminology knowledge preferred
  - **Estimated cost**: ¬2,000-¬3,000 (¬50/hour × 40-60 hours)

#### Review Team
- **Slovak Paramedic Instructor** (12-16 hours)
  - Medical accuracy review
  - Terminology verification
  - Teaching point review
  - **Estimated cost**: ¬600-¬800 (¬50/hour × 12-16 hours)

- **Native Slovak Speaker** (4-6 hours)
  - Linguistic quality review
  - Grammar check
  - Natural language verification
  - **Estimated cost**: ¬200-¬300 (¬50/hour × 4-6 hours)

#### Testing Team
- **QA Tester** (8-12 hours)
  - End-to-end testing
  - Regression testing
  - Bug documentation
  - **Estimated cost**: ¬320-¬480 (¬40/hour × 8-12 hours)

- **Slovak Paramedic Students** (3 students × 2 hours)
  - Pilot testing
  - Feedback session
  - **Estimated cost**: ¬180 (¬30/hour × 3 students × 2 hours) or volunteer

### 2. Technology

#### Software/Services
- **i18n Library**: react-i18next (free)
- **Development Environment**: Existing (no additional cost)
- **Testing Tools**: Existing (no additional cost)
- **Translation Memory Tool** (optional): Recommended for consistency
  - Options: OmegaT (free), memoQ (paid), Trados (paid)
  - **Cost**: ¬0-¬500 (if using paid tool)

#### Infrastructure
- **No additional infrastructure required**
- Existing development/staging/production environments sufficient

### 3. Timeline & Availability

#### Development Team
- **Availability needed**: 2-3 weeks (part-time) or 1 week (full-time)
- **Scheduling**: Phases 1 and 3

#### Translation Team
- **Availability needed**: 2-3 weeks (part-time) or 1 week (full-time)
- **Scheduling**: Phase 2 (can start after Phase 1.1-1.2 complete)
- **Critical**: Must have medical translator with Slovak paramedic knowledge

#### Review Team
- **Availability needed**: 2-3 days (distributed over Phase 4)
- **Scheduling**: Phase 4 (after translation complete)

#### Pilot Test Participants
- **Availability needed**: 2 hours per student
- **Scheduling**: Phase 4 (after review complete)
- **Critical**: Must be Slovak paramedic students (current or recent)

### 4. Budget Summary

| Item | Cost Estimate |
|------|---------------|
| **Professional Medical Translator** | ¬2,000-¬3,000 |
| **Slovak Paramedic Instructor Review** | ¬600-¬800 |
| **Native Slovak Speaker Review** | ¬200-¬300 |
| **QA Testing** | ¬320-¬480 |
| **Pilot Test Participants** | ¬180 (or volunteer) |
| **Translation Tools** (optional) | ¬0-¬500 |
| **Development Team** | Internal cost (28-36 hours) |
| **Total External Costs** | **¬3,300-¬5,260** |

---

## Success Metrics

### Phase 1: Infrastructure (Pass/Fail)
- [ ]  i18n library installed and configured
- [ ]  Language selection dropdown functional
- [ ]  Database stores language preference
- [ ]  Backend loads content based on language
- [ ]  No breaking changes to English version

### Phase 2: Translation (Completion %)
- [ ]  100% of agent prompts translated
- [ ]  100% of scenario files translated
- [ ]  100% of cognitive questions translated
- [ ]  100% of UI strings translated
- [ ]  100% of API messages translated

### Phase 3: Integration (Pass/Fail + Performance)
- [ ]  All Slovak content loads correctly
- [ ]  AI agents respond in Slovak
- [ ]  No UTF-8 encoding issues
- [ ]  Performance within 5% of English version
- [ ]  Regression tests pass for English

### Phase 4: Quality (Ratings + Feedback)
- [ ]  Medical accuracy review rating: 4.5+/5.0
- [ ]  Language quality review rating: 4.5+/5.0
- [ ]  Pilot test average satisfaction: 4.0+/5.0
- [ ]  No critical issues identified
- [ ]  All major issues resolved

### Production Readiness Criteria
- [ ]  All 4 phases complete
- [ ]  All success metrics met
- [ ]  No critical bugs open
- [ ]  Documentation updated
- [ ]  Slovak paramedic instructor approval
- [ ]  Pilot test participants recommend system

---

## Next Steps

### Immediate Actions (Week 1)

1. **Secure Resources**
   - [ ] Identify and hire professional Slovak medical translator
   - [ ] Identify Slovak paramedic instructor for review
   - [ ] Confirm development team availability

2. **Kick-off Planning**
   - [ ] Schedule Phase 1 sprint planning
   - [ ] Create detailed task breakdown in project management tool
   - [ ] Set up communication channels (Slack/Teams)
   - [ ] Schedule weekly progress meetings

3. **Begin Phase 1**
   - [ ] Install i18n packages
   - [ ] Create directory structure
   - [ ] Start database migration

### Short-Term Goals (Weeks 2-3)

1. **Complete Phase 1**
   - [ ] Finish infrastructure setup
   - [ ] Test language switching
   - [ ] Move English content to /en/ directories

2. **Begin Phase 2**
   - [ ] Translator starts with Core Agent prompt
   - [ ] Begin scenario translation
   - [ ] Extract UI strings

### Medium-Term Goals (Weeks 4-6)

1. **Complete Phase 2**
   - [ ] All content translated
   - [ ] First pass medical review
   - [ ] Corrections implemented

2. **Begin Phase 3**
   - [ ] Integration testing
   - [ ] AI agent testing
   - [ ] Bug fixes

### Long-Term Goals (Weeks 7-8)

1. **Complete Phase 3**
   - [ ] All integration complete
   - [ ] Performance optimized

2. **Complete Phase 4**
   - [ ] Final reviews complete
   - [ ] Pilot testing done
   - [ ] Final refinements

3. **Production Release**
   - [ ] Deploy Slovak version
   - [ ] Monitor initial Slovak student sessions
   - [ ] Iterate based on real-world usage

---

## Appendix

### A. Useful Slovak Medical Resources

**Recommended References for Translator**:
1. Slovak Paramedic Textbooks (latest editions)
2. Slovak Emergency Medical Services Protocols
3. Slovenská komora záchranárov (Slovak Chamber of Paramedics) terminology guides
4. Medical terminology databases (Slovak medical universities)

### B. Translation Tools Recommendations

**Recommended Translation Memory Tools**:
1. **OmegaT** (Free)
   - Open-source
   - Terminology management
   - Consistency checking
   - Good for JSON files

2. **memoQ** (Paid - ¬50-100/month)
   - Professional translation tool
   - Excellent terminology management
   - Quality assurance features
   - Better for large projects

3. **DeepL Pro** (Paid - ¬25/month)
   - Machine translation for initial draft
   - **Must be reviewed by professional translator**
   - Good for consistency in terminology
   - Not sufficient alone for medical content

### C. Contact Information

**Project Lead**: [Name]
**Email**: [Email]
**Phone**: [Phone]

**Development Team Lead**: [Name]
**Email**: [Email]

**Medical Translator**: [TBD]
**Email**: [TBD]

**Slovak Paramedic Reviewer**: [TBD]
**Email**: [TBD]

---

## Document Change Log

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-01-24 | [Author] | Initial comprehensive plan created |

---

## Approval Signatures

**Project Lead**: __________________ Date: __________

**Development Lead**: __________________ Date: __________

**Medical Translator**: __________________ Date: __________

**Slovak Paramedic Reviewer**: __________________ Date: __________

---

**END OF DOCUMENT**
