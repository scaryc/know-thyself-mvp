# **Layer 2 MVP Development Plan**
## **Know Thyself - Educational Features Implementation**

**Document Version:** 2.0  
**Date:** October 31, 2025  
**Project:** Know Thyself MVP - AI Healthcare Education Platform  
**Estimated Total Time:** 30-35 hours

---

## **Project Overview**

**Objective:** Implement critical Layer 2 features enabling meaningful student performance data collection, multi-scenario training flow, and complete three-agent workflow (Cognitive Coach → Core Agent → AAR Agent).

**Scope:** 
- State progression and auto-deterioration
- Critical actions tracking with timestamps
- CDP evaluation and medication error handling
- Toggleable Challenge Points (A/B testing ready)
- Multi-scenario infrastructure (3 scenarios per session)
- AAR Agent integration with performance review

**Timeline:** 30-35 hours total development + 6-8 hours testing

**Priority:** High - Required before student pilot testing

---

## **System Architecture**

### **Complete Agent Flow:**
```
Session Start
    ↓
Cognitive Coach Agent (2-5 minutes)
├── Pre-briefing questions
├── Mental preparation
└── Clinical reasoning warm-up
    ↓
    [TRANSITION TO SCENARIOS]
    ↓
Core Agent - Scenario 1 (10-20 minutes)
├── Initial state → treatments → state progression
├── Complete Scenario button appears after 10 min
└── Auto-force at 20 min maximum
    ↓
    [TRANSITION TO SCENARIO 2]
    ↓
Core Agent - Scenario 2 (10-20 minutes)
└── Different patient, new scenario
    ↓
    [TRANSITION TO SCENARIO 3]
    ↓
Core Agent - Scenario 3 (10-20 minutes)
└── Third scenario completes
    ↓
    [TRANSITION TO AAR]
    ↓
AAR Agent (10-15 minutes)
├── Performance review (popup chat style like Cognitive Coach)
├── CDP evaluations
├── Sustains/Improves/Apply feedback
└── Session complete
```

---

## **Phase 0: Scenario Transition System** 
**Estimated Time: 3-4 hours**
**Status:** Partially complete (from earlier work)

### **Task 0.1: Verify Current Implementation**
**Duration: 30 minutes**

**Files to check:**
- `src/App.tsx` - Scenario queue state variables
- `src/components/layout/Header.tsx` - Timer and Complete Scenario button
- `server/index.js` - Session structure

**Verification checklist:**
- ✅ scenarioQueue state exists in App.tsx
- ✅ currentScenarioIndex state exists
- ✅ completedScenarios state exists
- ✅ handleCompleteScenario function exists
- ✅ Timer logic in Header.tsx (10 min minimum, 20 min maximum)
- ✅ Complete Scenario button functional

**If missing any component:** Implement from earlier work before proceeding.

---

### **Task 0.2: Enhanced Scenario Transition Logic**
**Duration: 2 hours**

**File:** `src/App.tsx`

**Update handleCompleteScenario to track ALL 3 scenarios:**

```typescript
const handleCompleteScenario = async () => {
  // Mark current scenario as completed
  const currentScenario = scenarioQueue[currentScenarioIndex];
  setCompletedScenarios(prev => [...prev, currentScenario]);
  
  console.log(`Scenario ${currentScenarioIndex + 1} completed: ${currentScenario}`);
  
  // Check if there are more scenarios
  if (currentScenarioIndex < scenarioQueue.length - 1) {
    // Load next scenario
    const nextIndex = currentScenarioIndex + 1;
    const nextScenario = scenarioQueue[nextIndex];
    
    console.log(`Loading scenario ${nextIndex + 1} of ${scenarioQueue.length}: ${nextScenario}`);
    
    // Start next scenario (reusing same session)
    const response = await api.startSession(nextScenario);
    setCurrentScenarioIndex(nextIndex);
    setScenarioStartTime(Date.now());
    setCurrentVitals(null);
    setPatientNotes([]);
    setDispatchInfo(response.dispatchInfo);
    setPatientInfo(response.patientInfo);
    
    sessionStorage.setItem('initialScene', response.initialSceneDescription);
  } else {
    // ALL 3 SCENARIOS COMPLETED → Transition to AAR
    console.log('All scenarios completed! Transitioning to AAR Agent...');
    
    // Set AAR mode
    setIsAARMode(true);
    setIsActive(false);
    
    // Initialize AAR Agent
    const aarResponse = await api.startAAR(sessionId);
    
    // Clear scenario UI
    setDispatchInfo(null);
    setPatientInfo(null);
    setCurrentVitals(null);
    
    // Show AAR introduction in conversation
    sessionStorage.setItem('aarIntroduction', aarResponse.message);
  }
};
```

**Add new state variable:**
```typescript
const [isAARMode, setIsAARMode] = useState(false);
```

**Testing Checkpoint:**
- ✅ Complete Scenario 1 → Loads Scenario 2
- ✅ Complete Scenario 2 → Loads Scenario 3
- ✅ Complete Scenario 3 → Transitions to AAR (not crash)
- ✅ Console logs show correct progression

---

### **Task 0.3: UI Adjustments for AAR Mode**
**Duration: 1 hour**

**File:** `src/components/layout/Header.tsx`

**Add AAR mode detection:**

```typescript
interface HeaderProps {
  isActive: boolean;
  scenarioStartTime: number;
  dispatchInfo?: DispatchInfo;
  patientInfo?: PatientInfo;
  onCompleteScenario?: () => void;
  currentScenario?: number;
  totalScenarios?: number;
  isAARMode?: boolean; // NEW
}

function Header({ 
  isActive, 
  scenarioStartTime, 
  dispatchInfo, 
  patientInfo,
  onCompleteScenario,
  currentScenario,
  totalScenarios,
  isAARMode = false // NEW
}: HeaderProps) {
  
  // Don't show timer/button in AAR mode
  if (isAARMode) {
    return (
      <header className="h-16 bg-bg-secondary border-b border-border flex items-center justify-center px-6">
        <div className="flex items-center space-x-3">
          <span className="text-2xl">📊</span>
          <div>
            <div className="font-semibold text-lg">After Action Review</div>
            <div className="text-sm text-gray-400">Performance Analysis Session</div>
          </div>
        </div>
      </header>
    );
  }
  
  // Normal scenario header continues...
}
```

**File:** `src/App.tsx`

**Pass isAARMode to Header:**
```typescript
<Header 
  isActive={isActive} 
  scenarioStartTime={scenarioStartTime}
  dispatchInfo={dispatchInfo}
  patientInfo={patientInfo}
  onCompleteScenario={handleCompleteScenario}
  currentScenario={currentScenarioIndex + 1}
  totalScenarios={scenarioQueue.length}
  isAARMode={isAARMode} // NEW
/>
```

**Testing Checkpoint:**
- ✅ During scenarios: Normal header with timer
- ✅ In AAR mode: "After Action Review" header shows
- ✅ No timer or Complete button in AAR mode

---

## **Phase 1: Backend Foundation** 
**Estimated Time: 6-8 hours**

### **Task 1.1: Enhanced Session Structure**
**Duration: 1 hour**

**File:** `server/index.js`

**Modify session creation in POST /api/sessions/start:**

```javascript
const session = {
  sessionId: uuidv4(),
  scenario: loadedScenario,
  conversationHistory: [],
  patientState: loadedScenario.initial_vitals,
  vitals: loadedScenario.initial_vitals,
  
  // NEW FIELDS - Layer 2:
  currentState: 'initial', // initial | improving | deteriorating | critical
  scenarioStartTime: Date.now(),
  criticalActionsLog: [],
  criticalTreatmentsGiven: {
    oxygen: false,
    salbutamol: false,
    steroids: false
  },
  lastDeteriorationCheck: Date.now(),
  challengePointsEnabled: true, // Toggle for A/B testing
  challengePointsUsed: [],
  activeChallenge: null,
  stateHistory: [{
    state: 'initial',
    timestamp: Date.now(),
    vitals: loadedScenario.initial_vitals
  }]
};
```

**Testing Checkpoint:**
- ✅ Start session, verify all new fields present
- ✅ Check sessionStorage contains new fields

---

### **Task 1.2: Treatment Detection System**
**Duration: 2 hours**

**File:** `server/index.js` (add new utility functions)

```javascript
// Detect treatment keywords in user messages
function detectTreatment(message, session) {
  const lowerMessage = message.toLowerCase();
  const treatments = {
    oxygen: ['oxygen', 'o2', 'non-rebreather', 'nebulizer oxygen', 'high flow'],
    salbutamol: ['salbutamol', 'ventolin', 'bronchodilator', 'nebulizer', 'albuterol'],
    steroids: ['steroid', 'corticosteroid', 'hydrocortisone', 'prednisone', 'syntophyllin'],
    
    // Dangerous medications (from secondary_medications_by_impact)
    dangerous: {
      apaurin: ['apaurin', 'diazepam'],
      tramal: ['tramal', 'tramadol'],
      tensiomin: ['tensiomin', 'metoprolol', 'beta blocker'],
      furosemid: ['furosemid', 'furosemide', 'lasix'],
      novalgin: ['novalgin', 'metamizole']
    }
  };
  
  const detected = [];
  
  // Check critical treatments
  for (const [key, keywords] of Object.entries(treatments)) {
    if (key !== 'dangerous') {
      for (const keyword of keywords) {
        if (lowerMessage.includes(keyword)) {
          detected.push({ type: key, keyword });
          break;
        }
      }
    }
  }
  
  // Check dangerous medications
  for (const [drug, keywords] of Object.entries(treatments.dangerous)) {
    for (const keyword of keywords) {
      if (lowerMessage.includes(keyword)) {
        detected.push({ 
          type: 'dangerous_medication', 
          drug: drug,
          keyword 
        });
        break;
      }
    }
  }
  
  return detected;
}

// Log critical action with timestamp
function logCriticalAction(session, action, category) {
  const timeSinceStart = (Date.now() - session.scenarioStartTime) / 1000; // seconds
  
  session.criticalActionsLog.push({
    action: action,
    category: category, // 'treatment' | 'assessment' | 'error' | 'challenge'
    timestamp: Date.now(),
    timeSinceStart: timeSinceStart,
    scenarioTime: formatTime(timeSinceStart)
  });
  
  console.log(`[Action Logged] ${action} at ${formatTime(timeSinceStart)}`);
}

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
```

**Modify POST /api/sessions/:id/message endpoint:**

```javascript
app.post('/api/sessions/:id/message', async (req, res) => {
  const session = sessions.get(req.params.id);
  const userMessage = req.body.message;
  
  // NEW: Detect treatments in message
  const detectedTreatments = detectTreatment(userMessage, session);
  
  for (const treatment of detectedTreatments) {
    if (treatment.type === 'oxygen') {
      session.criticalTreatmentsGiven.oxygen = true;
      logCriticalAction(session, 'oxygen_applied', 'treatment');
    }
    else if (treatment.type === 'salbutamol') {
      session.criticalTreatmentsGiven.salbutamol = true;
      logCriticalAction(session, 'salbutamol_administered', 'treatment');
    }
    else if (treatment.type === 'steroids') {
      session.criticalTreatmentsGiven.steroids = true;
      logCriticalAction(session, 'steroids_administered', 'treatment');
    }
    else if (treatment.type === 'dangerous_medication') {
      logCriticalAction(session, `dangerous_${treatment.drug}_given`, 'error');
    }
  }
  
  // Continue with existing Claude API call...
});
```

**Testing Checkpoint:**
- ✅ Send "I'll give oxygen" → verify oxygen flag = true
- ✅ Send "administer salbutamol" → verify salbutamol flag = true
- ✅ Send "give apaurin" → verify logged as error
- ✅ Check criticalActionsLog has correct timestamps

---

### **Task 1.3: State Progression Logic**
**Duration: 2-3 hours**

**File:** `server/index.js` (add new functions)

```javascript
// Calculate patient state based on treatments and time
function updatePatientState(session) {
  const timeSinceStart = (Date.now() - session.scenarioStartTime) / 1000 / 60; // minutes
  const { oxygen, salbutamol } = session.criticalTreatmentsGiven;
  
  const scenario = session.scenario;
  let newState = session.currentState;
  let newVitals = session.vitals;
  
  // IMPROVEMENT PATH: Both critical treatments given
  if (oxygen && salbutamol) {
    newState = 'improving';
    
    // Apply treatment responses from scenario JSON
    const oxygenResponse = scenario.treatment_responses?.oxygen;
    const salbutamolResponse = scenario.treatment_responses?.salbutamol;
    
    if (oxygenResponse && salbutamolResponse) {
      newVitals = {
        ...session.vitals,
        ...oxygenResponse.vital_changes,
        ...salbutamolResponse.vital_changes
      };
    }
  }
  
  // DETERIORATION PATH: No critical treatments
  else if (!oxygen && !salbutamol) {
    const noTreatmentProgression = scenario.no_treatment_progression;
    
    if (noTreatmentProgression) {
      if (timeSinceStart >= 10) {
        newState = 'critical';
        newVitals = noTreatmentProgression['10min']?.vitals || session.vitals;
      }
      else if (timeSinceStart >= 5) {
        newState = 'deteriorating';
        newVitals = noTreatmentProgression['5min']?.vitals || session.vitals;
      }
      else if (timeSinceStart >= 3) {
        newState = 'deteriorating';
        newVitals = noTreatmentProgression['3min']?.vitals || session.vitals;
      }
    }
  }
  
  // PARTIAL TREATMENT: Only one critical treatment
  else if (oxygen && !salbutamol) {
    if (timeSinceStart >= 7) {
      newState = 'deteriorating';
      newVitals = {
        ...session.vitals,
        SpO2: 91, // Some improvement from oxygen
        RR: 30,
        HR: 138
      };
    }
  }
  
  // Check if state changed
  if (newState !== session.currentState) {
    console.log(`[State Change] ${session.currentState} → ${newState} at ${formatTime(timeSinceStart * 60)}`);
    
    session.stateHistory.push({
      state: newState,
      timestamp: Date.now(),
      vitals: newVitals,
      timeSinceStart: timeSinceStart
    });
  }
  
  session.currentState = newState;
  session.vitals = newVitals;
  session.lastDeteriorationCheck = Date.now();
  
  return session;
}

// Background monitoring - check state every 30 seconds
setInterval(() => {
  for (const [sessionId, session] of sessions.entries()) {
    if (session.isActive !== false && session.scenario) {
      updatePatientState(session);
    }
  }
}, 30000);
```

**Testing Checkpoint:**
- ✅ Wait 3 min without treatment → state = 'deteriorating'
- ✅ Give oxygen + salbutamol → state = 'improving'
- ✅ Give only oxygen, wait 7 min → state = 'deteriorating'
- ✅ stateHistory tracks all transitions

---

### **Task 1.4: Enhanced Agent Context**
**Duration: 1 hour**

**File:** `server/index.js` (modify Claude API call)

```javascript
function buildAgentContext(session) {
  const scenario = session.scenario;
  const currentStateDescription = scenario.state_descriptions?.[session.currentState];
  
  if (!currentStateDescription) {
    return `Current vitals: ${JSON.stringify(session.vitals)}`;
  }
  
  const context = `
CURRENT PATIENT STATE: ${session.currentState.toUpperCase()}

WHAT STUDENT SEES:
${currentStateDescription.student_sees}

CURRENT VITALS:
- HR: ${session.vitals.HR} bpm
- RR: ${session.vitals.RR} /min
- SpO2: ${session.vitals.SpO2}%
- BP: ${session.vitals.BP_systolic}/${session.vitals.BP_diastolic} mmHg
- GCS: ${session.vitals.GCS}
- Temp: ${session.vitals.temperature}°C

TREATMENTS GIVEN SO FAR:
- Oxygen: ${session.criticalTreatmentsGiven.oxygen ? 'YES' : 'NO'}
- Salbutamol: ${session.criticalTreatmentsGiven.salbutamol ? 'YES' : 'NO'}
- Steroids: ${session.criticalTreatmentsGiven.steroids ? 'YES' : 'NO'}

TIME ELAPSED: ${formatTime((Date.now() - session.scenarioStartTime) / 1000)}

CLINICAL NOTE FOR AGENT:
${currentStateDescription.clinical_note}

Respond as the patient based on this state. Be realistic and match the severity described.
`;
  
  return context;
}

// Use in Claude API call (in Core Agent section)
const systemPrompt = buildAgentContext(session);
```

**Testing Checkpoint:**
- ✅ Agent uses "initial" state description at start
- ✅ Agent responses match "deteriorating" state when patient worsens
- ✅ Agent responses match "improving" state after treatments

---

### **Task 1.5: GET Session State Endpoint**
**Duration: 30 minutes**

**File:** `server/index.js`

```javascript
// GET current session state and vitals
app.get('/api/sessions/:id/state', (req, res) => {
  const session = sessions.get(req.params.id);
  
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }
  
  // Update state before sending
  if (session.scenario) {
    updatePatientState(session);
  }
  
  res.json({
    currentState: session.currentState,
    vitals: session.vitals,
    timeSinceStart: (Date.now() - session.scenarioStartTime) / 1000,
    criticalTreatmentsGiven: session.criticalTreatmentsGiven,
    stateHistory: session.stateHistory
  });
});
```

**Testing Checkpoint:**
- ✅ GET /api/sessions/:id/state returns current state
- ✅ Vitals match current progression

---

## **Phase 2: CDP & Medication Error Handling**
**Estimated Time: 4-5 hours**

### **Task 2.1: CDP Evaluation System**
**Duration: 2 hours**

**File:** `server/index.js` (add new functions)

```javascript
// Evaluate Critical Decision Points
function evaluateCDP(session, cdpId) {
  const scenario = session.scenario;
  const cdps = scenario.critical_decision_points?.available_evaluations;
  
  if (!cdps) return null;
  
  const cdp = cdps.find(c => c.id === cdpId);
  if (!cdp) return null;
  
  const actionsLog = session.criticalActionsLog;
  let score = 'suboptimal';
  let reasoning = '';
  
  // CDP1 - bronchodilator_timing_and_assessment
  if (cdpId === 'CDP1') {
    const salbutamolAction = actionsLog.find(a => a.action === 'salbutamol_administered');
    
    if (salbutamolAction) {
      if (salbutamolAction.timeSinceStart <= 300) {
        score = 'optimal';
        reasoning = 'Salbutamol administered within critical 5-minute window.';
      } else if (salbutamolAction.timeSinceStart <= 600) {
        score = 'acceptable';
        reasoning = 'Salbutamol given but delayed beyond optimal 5-minute target.';
      }
    } else {
      score = 'dangerous';
      reasoning = 'No bronchodilator administered despite life-threatening asthma.';
    }
  }
  
  // CDP2 - oxygen_delivery_device_selection
  if (cdpId === 'CDP2') {
    const oxygenAction = actionsLog.find(a => a.action === 'oxygen_applied');
    
    if (oxygenAction) {
      if (oxygenAction.timeSinceStart <= 120) {
        score = 'optimal';
        reasoning = 'High-flow oxygen applied immediately for critical hypoxia.';
      } else if (oxygenAction.timeSinceStart <= 180) {
        score = 'acceptable';
        reasoning = 'Oxygen given but slightly delayed.';
      } else {
        score = 'suboptimal';
        reasoning = 'Oxygen delayed >3 minutes despite SpO2 88%.';
      }
    } else {
      score = 'dangerous';
      reasoning = 'No oxygen given despite critical hypoxia.';
    }
  }
  
  // CDP3 - silent_chest_recognition (requires assessment tracking)
  if (cdpId === 'CDP3') {
    const chestAssessment = actionsLog.find(a => 
      a.action.includes('assessment') || a.action.includes('auscultation')
    );
    
    if (chestAssessment) {
      score = 'optimal';
      reasoning = 'Systematic chest assessment performed.';
    } else {
      score = 'suboptimal';
      reasoning = 'Limited or no chest assessment documented.';
    }
  }
  
  return {
    cdpId: cdpId,
    decision: cdp.decision,
    score: score,
    reasoning: reasoning,
    teachingPoint: cdp.aar_teaching_point
  };
}

// Evaluate all relevant CDPs
function evaluateAllCDPs(session) {
  const scenario = session.scenario;
  const cdps = scenario.critical_decision_points?.available_evaluations;
  
  if (!cdps) return [];
  
  const evaluations = [];
  for (const cdp of cdps) {
    const evaluation = evaluateCDP(session, cdp.id);
    if (evaluation) {
      evaluations.push(evaluation);
    }
  }
  
  return evaluations;
}
```

**Testing Checkpoint:**
- ✅ Give salbutamol at 2 min → CDP1 = 'optimal'
- ✅ Give salbutamol at 7 min → CDP1 = 'acceptable'
- ✅ Never give salbutamol → CDP1 = 'dangerous'
- ✅ Give oxygen at 1 min → CDP2 = 'optimal'

---

### **Task 2.2: Medication Error Detection**
**Duration: 2 hours**

**File:** `server/index.js`

```javascript
function handleMedicationResponse(session, treatment, userMessage) {
  const scenario = session.scenario;
  
  if (treatment.type !== 'dangerous_medication') {
    return null;
  }
  
  const drugName = treatment.drug;
  let medicationData = null;
  
  // Search in secondary_medications_by_impact
  const categories = ['critical_harm', 'worsens', 'neutral'];
  for (const category of categories) {
    const meds = scenario.secondary_medications_by_impact?.[category];
    if (meds) {
      const found = meds.find(med => med.name === drugName);
      if (found) {
        medicationData = found;
        break;
      }
    }
  }
  
  if (medicationData && medicationData.if_given) {
    const effects = medicationData.if_given;
    
    // Update vitals
    if (effects.vital_changes) {
      session.vitals = {
        ...session.vitals,
        ...effects.vital_changes
      };
    }
    
    // Change state
    if (effects.state_change) {
      session.currentState = effects.state_change;
    }
    
    // Log error
    logCriticalAction(session, `medication_error_${drugName}`, 'error');
    
    return {
      response: effects.patient_response,
      clinicalNote: effects.clinical_note,
      points: effects.points || 0,
      teachingPoint: medicationData.teaching_point
    };
  }
  
  return null;
}
```

**Modify POST /api/sessions/:id/message:**

```javascript
// After detecting treatments:
let medicationError = null;
for (const treatment of detectedTreatments) {
  const errorResponse = handleMedicationResponse(session, treatment, userMessage);
  if (errorResponse) {
    medicationError = errorResponse;
    break;
  }
}

// If dangerous medication given, return error response
if (medicationError) {
  return res.json({
    message: medicationError.response,
    clinicalNote: medicationError.clinicalNote,
    vitalsUpdated: true,
    vitals: session.vitals,
    medicationError: true
  });
}
```

**Testing Checkpoint:**
- ✅ Give "apaurin" → Patient deteriorates, respiratory depression
- ✅ Give "tensiomin" → Bronchospasm worsens
- ✅ Errors logged in criticalActionsLog

---

### **Task 2.3: Enhanced Performance Report**
**Duration: 1 hour**

**File:** `server/index.js`

```javascript
app.get('/api/sessions/:id/performance', (req, res) => {
  const session = sessions.get(req.params.id);
  
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }
  
  const cdpEvaluations = evaluateAllCDPs(session);
  const checklistResults = evaluateCriticalActionsChecklist(session);
  const score = calculateScore(session, checklistResults, cdpEvaluations);
  
  const report = {
    sessionId: session.sessionId,
    scenarioId: session.scenario?.scenario_id,
    totalTime: (Date.now() - session.scenarioStartTime) / 1000,
    finalState: session.currentState,
    
    criticalTreatments: session.criticalTreatmentsGiven,
    actionsLog: session.criticalActionsLog,
    stateHistory: session.stateHistory,
    
    checklistResults: checklistResults,
    cdpEvaluations: cdpEvaluations,
    
    score: score,
    errors: session.criticalActionsLog.filter(a => a.category === 'error'),
    
    summary: {
      oxygenGiven: session.criticalTreatmentsGiven.oxygen,
      oxygenTiming: getActionTiming(session, 'oxygen_applied'),
      salbutamolGiven: session.criticalTreatmentsGiven.salbutamol,
      salbutamolTiming: getActionTiming(session, 'salbutamol_administered'),
      patientOutcome: session.currentState
    }
  };
  
  res.json(report);
});

function getActionTiming(session, actionName) {
  const action = session.criticalActionsLog.find(a => a.action === actionName);
  return action ? action.timeSinceStart : null;
}

function evaluateCriticalActionsChecklist(session) {
  const scenario = session.scenario;
  const checklist = scenario.critical_actions_checklist;
  
  if (!checklist) return [];
  
  const results = [];
  
  for (const item of checklist) {
    let completed = false;
    let timingScore = 0;
    
    if (item.id === 'CA3') { // Oxygen
      completed = session.criticalTreatmentsGiven.oxygen;
      const timing = getActionTiming(session, 'oxygen_applied');
      if (timing && timing <= item.time_target_minutes * 60) {
        timingScore = item.points;
      } else if (timing) {
        timingScore = item.points * 0.5;
      }
    }
    else if (item.id === 'CA4') { // Salbutamol
      completed = session.criticalTreatmentsGiven.salbutamol;
      const timing = getActionTiming(session, 'salbutamol_administered');
      if (timing && timing <= item.time_target_minutes * 60) {
        timingScore = item.points;
      } else if (timing) {
        timingScore = item.points * 0.5;
      }
    }
    
    results.push({
      id: item.id,
      action: item.action,
      completed: completed,
      timeTarget: item.time_target_minutes,
      pointsEarned: timingScore,
      pointsPossible: item.points
    });
  }
  
  return results;
}

function calculateScore(session, checklistResults, cdpEvaluations) {
  let totalPoints = 0;
  let possiblePoints = 0;
  
  for (const item of checklistResults) {
    totalPoints += item.pointsEarned;
    possiblePoints += item.pointsPossible;
  }
  
  const errors = session.criticalActionsLog.filter(a => a.category === 'error');
  totalPoints -= errors.length * 10;
  
  const percentage = possiblePoints > 0 ? Math.max(0, (totalPoints / possiblePoints) * 100) : 0;
  
  return {
    totalPoints: totalPoints,
    possiblePoints: possiblePoints,
    percentage: Math.round(percentage),
    grade: percentage >= 90 ? 'Excellent' : 
           percentage >= 75 ? 'Good' : 
           percentage >= 60 ? 'Acceptable' : 
           'Needs Improvement'
  };
}
```

**Testing Checkpoint:**
- ✅ Performance report generates successfully
- ✅ CDP evaluations show correct scores
- ✅ Checklist shows timing-based points
- ✅ Errors deduct points appropriately

---

## **Phase 3: Challenge Points System**
**Estimated Time: 3-4 hours**

### **Task 3.1: Challenge Point Detection**
**Duration: 2 hours**

**File:** `server/index.js`

```javascript
function checkForChallengePoint(session, userMessage) {
  if (!session.challengePointsEnabled) return null;
  if (session.challengePointsUsed.length >= 2) return null;
  
  const scenario = session.scenario;
  const challengePoints = scenario.challenge_points?.available_challenges || [];
  
  for (const cp of challengePoints) {
    if (session.challengePointsUsed.includes(cp.id)) continue;
    
    if (cp.trigger.type === 'treatment_mentioned') {
      const keywords = cp.trigger.keywords;
      const lowerMessage = userMessage.toLowerCase();
      
      for (const keyword of keywords) {
        if (lowerMessage.includes(keyword)) {
          if (shouldSkipChallenge(session, cp)) continue;
          return cp;
        }
      }
    }
    
    if (cp.trigger.type === 'vague_treatment_order') {
      const lowerMessage = userMessage.toLowerCase();
      const hasKeyword = cp.trigger.keywords.some(k => lowerMessage.includes(k));
      const isVague = hasKeyword &&
                     !lowerMessage.includes('liters') &&
                     !lowerMessage.includes('l/min') &&
                     !lowerMessage.includes('non-rebreather');
      
      if (isVague) return cp;
    }
  }
  
  return null;
}

function shouldSkipChallenge(session, challengePoint) {
  if (challengePoint.skip_if?.already_assessed_severity) {
    const hasAssessment = session.criticalActionsLog.some(
      a => a.action.includes('assessment')
    );
    if (hasAssessment) return true;
  }
  return false;
}
```

**Modify POST /api/sessions/:id/message:**

```javascript
// Check for Challenge Point response first
if (session.activeChallenge) {
  const feedback = handleChallengeResponse(
    session,
    session.activeChallenge,
    userMessage
  );
  
  session.activeChallenge = null;
  
  if (feedback) {
    return res.json({
      message: feedback,
      challengeResolved: true
    });
  }
}

// Check for new Challenge Point
const challengePoint = checkForChallengePoint(session, userMessage);

if (challengePoint) {
  session.challengePointsUsed.push(challengePoint.id);
  session.activeChallenge = challengePoint.id;
  
  logCriticalAction(session, `challenge_point_${challengePoint.id}`, 'challenge');
  
  return res.json({
    message: challengePoint.challenge_text,
    isChallenge: true,
    challengeId: challengePoint.id
  });
}

// Normal processing continues...
```

**Testing Checkpoint:**
- ✅ Say "give salbutamol" → Get challenged
- ✅ Say "give oxygen" vaguely → Get challenged
- ✅ After 2 challenges, no more trigger
- ✅ Toggle off: No challenges occur

---

### **Task 3.2: Challenge Response Evaluation**
**Duration: 1 hour**

**File:** `server/index.js`

```javascript
function evaluateChallengeResponse(session, challengeId, studentResponse) {
  const scenario = session.scenario;
  const cp = scenario.challenge_points?.available_challenges.find(c => c.id === challengeId);
  
  if (!cp) return null;
  
  const lowerResponse = studentResponse.toLowerCase();
  let quality = 'struggling';
  
  for (const acceptable of cp.acceptable_responses) {
    if (lowerResponse.includes(acceptable.toLowerCase().substring(0, 20))) {
      quality = 'good_reasoning';
      break;
    }
  }
  
  if (lowerResponse.includes('protocol') || lowerResponse.includes('guideline')) {
    quality = 'protocol_only';
  }
  
  const resolution = cp.resolution[`if_${quality}`] || cp.resolution.if_struggling;
  
  return resolution;
}

function handleChallengeResponse(session, challengeId, userMessage) {
  const feedback = evaluateChallengeResponse(session, challengeId, userMessage);
  
  if (feedback) {
    const quality = determineQuality(session, challengeId, userMessage);
    logCriticalAction(session, `challenge_response_${quality}`, 'challenge');
    return feedback;
  }
  
  return null;
}

function determineQuality(session, challengeId, response) {
  const lowerResponse = response.toLowerCase();
  
  if (lowerResponse.includes('rr') || 
      lowerResponse.includes('spo2') || 
      lowerResponse.includes('respiratory rate')) {
    return 'good_reasoning';
  }
  
  if (lowerResponse.includes('protocol')) {
    return 'protocol_only';
  }
  
  return 'struggling';
}
```

**Testing Checkpoint:**
- ✅ Good reasoning → Positive feedback
- ✅ Protocol only → Deeper probe
- ✅ Struggling → Guidance provided
- ✅ Responses logged

---

## **Phase 4: AAR Agent Implementation**
**Estimated Time: 5-6 hours**

### **Task 4.1: AAR Agent System Prompt**
**Duration: 2 hours**

**File:** Create `server/prompts/aarAgent.txt`

```text
# ROLE
You are an After Action Review (AAR) Agent for medical training simulations. Your role is to conduct a structured, educational performance review with paramedic students after they complete 3 emergency scenarios.

# OBJECTIVES
1. Analyze student performance across all 3 scenarios
2. Provide constructive feedback using Sustains/Improves/Apply framework
3. Identify patterns in clinical reasoning and decision-making
4. Deliver teaching points from scenario CDP evaluations
5. Encourage reflection and self-assessment

# PERFORMANCE DATA AVAILABLE
You have access to:
- Critical actions log (what they did, when they did it)
- CDP evaluations (optimal/acceptable/suboptimal/dangerous ratings)
- Medication errors and safety violations
- State progression (how patients responded to treatments)
- Challenge Point interactions (if enabled)
- Final scores and checklist completion

# AAR STRUCTURE

## Phase 1: Opening (1-2 exchanges)
Greet the student warmly and acknowledge completion of all 3 scenarios.
Example: "Congratulations on completing your training session! You worked through three challenging emergency scenarios. Before we dive into the review, how do you feel about your performance overall?"

Encourage self-reflection before providing feedback.

## Phase 2: Scenario-by-Scenario Review (3-5 exchanges per scenario)
For each of the 3 scenarios:

1. **Ask student reflection first**: "What went well in the [asthma/cardiac/trauma] scenario? What would you do differently?"

2. **Provide Sustains (Strengths)**:
   - Highlight 2-3 things they did well
   - Reference specific actions from criticalActionsLog
   - Example: "You applied high-flow oxygen within 90 seconds - excellent recognition of critical hypoxia"

3. **Provide Improves (Areas for Growth)**:
   - Identify 2-3 opportunities for improvement
   - Reference CDP evaluations and missed critical actions
   - Be specific about what to change
   - Example: "Salbutamol was delayed until 8 minutes. In life-threatening asthma, aim for bronchodilator within 5 minutes"

4. **Provide Apply (Teaching Points)**:
   - Share 1-2 key clinical pearls from scenario's aar_teaching_points
   - Connect to real-world practice
   - Example: "Remember: Silent chest is worse than loud wheeze. Silence means no air moving - that's pre-arrest"

## Phase 3: Pattern Analysis (2-3 exchanges)
Identify themes across all 3 scenarios:
- Consistent strengths (systematic assessment, timely treatments)
- Recurring challenges (delayed interventions, diagnostic confusion)
- Growth trajectory (improvement from Scenario 1 to 3?)

## Phase 4: Action Plan (1-2 exchanges)
Help student create specific action plan:
- 2-3 concrete things to practice or study
- Resources or techniques to improve weak areas
- Encouragement and positive reinforcement

## Phase 5: Closing (1 exchange)
Summarize key takeaways, celebrate progress, encourage continued learning.

# TONE AND STYLE
- Supportive and educational, never punitive
- Use "you" language (not "the student" or "they")
- Balance positive reinforcement with constructive criticism
- Be specific with examples from their performance data
- Use medical terminology appropriately (they're paramedic students)
- Conversational yet professional

# RESPONSE FORMATTING
- Use short paragraphs (2-3 sentences max)
- Use bullet points sparingly, prefer conversational flow
- Bold key concepts: **critical hypoxia**, **bronchodilator timing**
- Use emojis sparingly for emphasis: ✅ (strength), 💡 (teaching point)

# DATA INTERPRETATION GUIDELINES

**CDP Scores:**
- Optimal = Excellent clinical judgment, highlight as strength
- Acceptable = Good but room for improvement, gentle coaching
- Suboptimal = Clear teaching opportunity, explain what to do differently
- Dangerous = Serious safety concern, address firmly but supportively

**Critical Actions Timing:**
- Within target = Commend
- 1-2 minutes late = Note for improvement
- >5 minutes late = Significant concern, teaching point
- Not done = Critical gap, must address

**Medication Errors:**
- Dangerous medications = Address immediately, explain why dangerous
- Unnecessary medications = Discuss diagnostic reasoning
- Use as teaching moments, not punitive examples

**State Progression:**
- Improving = Effective treatments, validate approach
- Deteriorating despite treatment = Discuss missed interventions
- Critical state = Discuss escalation and recognition

# CHALLENGE POINTS (if enabled)
If student had Challenge Points:
- Acknowledge their reasoning process
- Discuss quality of responses (good_reasoning vs protocol_only)
- Connect to deeper clinical thinking

# CONVERSATION MANAGEMENT
- Keep exchanges focused: 1-2 scenarios per message
- Ask questions to encourage reflection
- Wait for student input before moving to next topic
- Allow natural conversation flow (don't rush through checklist)
- Total AAR should take 10-15 minutes (~8-12 exchanges)

# COMPLETION MARKER
When AAR is complete, include: [AAR_COMPLETE]

# EXAMPLE EXCHANGES

**Opening:**
You: "Great work completing all three scenarios! That was intensive training. Before we review your performance, take a moment - how do you feel you did overall? What stood out to you?"

**Scenario Review:**
You: "Let's talk about the asthma scenario first. ✅ **Strengths**: You immediately recognized life-threatening asthma (SpO2 88%, can't speak in sentences) and applied high-flow oxygen within 2 minutes - excellent. You also gave salbutamol within 5 minutes, hitting the critical window.

💡 **Teaching Point**: You identified the **silent chest** during your assessment. Remember, that's one of the most ominous findings in asthma - it means almost no air is moving. It's actually worse than loud wheezing. Your quick escalation after finding that was spot-on.

What would you do differently if you encountered a similar patient?"

**Pattern Analysis:**
You: "Looking across all three scenarios, I notice a consistent strength: you're systematic with your ABC assessment. Every scenario, you checked airway, breathing, and circulation in that order. That discipline is excellent and will serve you well in real practice.

One area for growth: you tend to delay treatments slightly while gathering information. In Scenario 1, salbutamol at 5 minutes was good - but in Scenario 2, waiting 8 minutes for aspirin in suspected MI is risky. Practice trusting your initial assessment and acting faster when you identify time-critical interventions."

Remember: You are educational, specific, supportive, and evidence-based. Your goal is to help students become better paramedics through thoughtful reflection and targeted feedback.
```

**Testing Checkpoint:**
- ✅ Prompt loads successfully
- ✅ Structure is clear and organized
- ✅ Tone is supportive yet educational

---

### **Task 4.2: AAR Service Layer**
**Duration: 1.5 hours**

**File:** Create `server/services/aarService.js`

```javascript
// AAR Service - manages AAR session state and data
export class AARService {
  constructor() {
    this.aarSessions = new Map();
  }
  
  initializeAAR(sessionId, performanceData) {
    const aarSession = {
      sessionId: sessionId,
      performanceData: performanceData,
      phase: 'opening', // opening | scenario_review | pattern_analysis | action_plan | closing
      currentScenarioIndex: 0,
      conversationHistory: [],
      startTime: Date.now()
    };
    
    this.aarSessions.set(sessionId, aarSession);
    return aarSession;
  }
  
  getAAR(sessionId) {
    return this.aarSessions.get(sessionId);
  }
  
  updatePhase(sessionId, newPhase) {
    const aar = this.aarSessions.get(sessionId);
    if (aar) {
      aar.phase = newPhase;
    }
  }
  
  advanceScenario(sessionId) {
    const aar = this.aarSessions.get(sessionId);
    if (aar) {
      aar.currentScenarioIndex++;
    }
  }
  
  buildAARContext(sessionId) {
    const aar = this.aarSessions.get(sessionId);
    if (!aar) return '';
    
    const data = aar.performanceData;
    
    const context = `
# STUDENT PERFORMANCE DATA

## Overall Summary
- Total Time: ${Math.floor(data.totalTime / 60)} minutes
- Final Score: ${data.score.percentage}% (${data.score.grade})
- Scenarios Completed: 3
- Total Errors: ${data.errors.length}

## Critical Actions Completed
${data.checklistResults.map(item => 
  `- ${item.action}: ${item.completed ? '✅' : '❌'} ${item.completed && item.timeTarget ? `(${Math.floor(item.timeSinceStart / 60)}min, target ${item.timeTarget}min)` : ''}`
).join('\n')}

## CDP Evaluations
${data.cdpEvaluations.map(cdp => 
  `### ${cdp.decision}
   Score: ${cdp.score.toUpperCase()}
   Reasoning: ${cdp.reasoning}
   Teaching Point: ${cdp.teachingPoint}`
).join('\n\n')}

## Critical Actions Timeline
${data.actionsLog.map(action => 
  `- ${action.scenarioTime}: ${action.action} (${action.category})`
).join('\n')}

## Medication Errors
${data.errors.length > 0 ? 
  data.errors.map(err => `- ${err.action} at ${err.scenarioTime}`).join('\n') 
  : 'None'}

## State Progression History
${data.stateHistory.map(state => 
  `- ${Math.floor(state.timeSinceStart)}min: ${state.state.toUpperCase()}`
).join('\n')}

# CURRENT AAR PHASE: ${aar.phase}
${aar.phase === 'scenario_review' ? `Currently reviewing scenario ${aar.currentScenarioIndex + 1} of 3` : ''}

Use this data to provide specific, evidence-based feedback. Reference actual timing and actions.
`;
    
    return context;
  }
}
```

**File:** `server/index.js` (import at top)

```javascript
import { AARService } from './services/aarService.js';

const aarService = new AARService();
```

**Testing Checkpoint:**
- ✅ AAR service initializes correctly
- ✅ Context builder generates performance summary
- ✅ Phase tracking works

---

### **Task 4.3: AAR API Endpoints**
**Duration: 1.5 hours**

**File:** `server/index.js`

```javascript
// POST /api/sessions/:id/aar/start - Initialize AAR
app.post('/api/sessions/:id/aar/start', async (req, res) => {
  const session = sessions.get(req.params.id);
  
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }
  
  // Get performance data
  const performanceData = {
    totalTime: (Date.now() - session.scenarioStartTime) / 1000,
    score: calculateScore(session, 
      evaluateCriticalActionsChecklist(session),
      evaluateAllCDPs(session)
    ),
    checklistResults: evaluateCriticalActionsChecklist(session),
    cdpEvaluations: evaluateAllCDPs(session),
    actionsLog: session.criticalActionsLog,
    errors: session.criticalActionsLog.filter(a => a.category === 'error'),
    stateHistory: session.stateHistory
  };
  
  // Initialize AAR
  const aarSession = aarService.initializeAAR(req.params.id, performanceData);
  
  // Load AAR prompt
  const aarPrompt = fs.readFileSync('./prompts/aarAgent.txt', 'utf-8');
  
  // Build context
  const context = aarService.buildAARContext(req.params.id);
  
  // Get opening message from Claude
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2048,
    system: aarPrompt + '\n\n' + context,
    messages: [
      { role: 'user', content: 'Start the AAR' }
    ]
  });
  
  const aarMessage = response.content[0].text;
  
  aarSession.conversationHistory.push({
    role: 'assistant',
    content: aarMessage,
    timestamp: Date.now()
  });
  
  res.json({
    message: aarMessage,
    phase: aarSession.phase,
    aarActive: true
  });
});

// POST /api/sessions/:id/aar/message - Continue AAR conversation
app.post('/api/sessions/:id/aar/message', async (req, res) => {
  const aarSession = aarService.getAAR(req.params.id);
  
  if (!aarSession) {
    return res.status(404).json({ error: 'AAR session not found' });
  }
  
  const userMessage = req.body.message;
  
  // Add user message to history
  aarSession.conversationHistory.push({
    role: 'user',
    content: userMessage,
    timestamp: Date.now()
  });
  
  // Load prompt and context
  const aarPrompt = fs.readFileSync('./prompts/aarAgent.txt', 'utf-8');
  const context = aarService.buildAARContext(req.params.id);
  
  // Build message history for Claude
  const messages = aarSession.conversationHistory.map(msg => ({
    role: msg.role,
    content: msg.content
  }));
  
  // Get Claude response
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2048,
    system: aarPrompt + '\n\n' + context,
    messages: messages
  });
  
  let aarMessage = response.content[0].text;
  
  // Check for completion
  const isComplete = aarMessage.includes('[AAR_COMPLETE]');
  if (isComplete) {
    aarMessage = aarMessage.replace('[AAR_COMPLETE]', '').trim();
    aarService.updatePhase(req.params.id, 'complete');
  }
  
  // Add response to history
  aarSession.conversationHistory.push({
    role: 'assistant',
    content: aarMessage,
    timestamp: Date.now()
  });
  
  res.json({
    message: aarMessage,
    phase: aarSession.phase,
    aarComplete: isComplete
  });
});
```

**Testing Checkpoint:**
- ✅ POST /api/sessions/:id/aar/start returns opening message
- ✅ POST /api/sessions/:id/aar/message continues conversation
- ✅ Performance data accessible to AAR agent
- ✅ Completion marker detected

---

### **Task 4.4: AAR Frontend Integration**
**Duration: 1 hour**

**File:** `src/services/api.ts`

```typescript
class ApiService {
  // ... existing methods ...
  
  async startAAR(sessionId: string) {
    const response = await fetch(`${this.baseURL}/sessions/${sessionId}/aar/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    return response.json();
  }
  
  async sendAARMessage(sessionId: string, message: string) {
    const response = await fetch(`${this.baseURL}/sessions/${sessionId}/aar/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message })
    });
    return response.json();
  }
}
```

**File:** `src/components/conversation/ConversationPanel.tsx`

**Modify handleSend to detect AAR mode:**

```typescript
const handleSend = async () => {
  if (!input.trim() || isLoading) return;
  
  const userMessage: Message = {
    role: 'user',
    content: input,
    timestamp: Date.now()
  };
  setMessages(prev => [...prev, userMessage]);
  setInput('');
  setIsLoading(true);
  
  try {
    let response;
    
    // Check if in AAR mode (passed as prop from App.tsx)
    if (isAARMode) {
      response = await api.sendAARMessage(sessionId, input);
      
      // Check if AAR completed
      if (response.aarComplete) {
        // Show completion message
        console.log('AAR session complete');
      }
    } else {
      // Normal Core Agent message
      response = await api.sendMessage(sessionId, input);
      
      // Handle challenge points
      if (response.isChallenge) {
        setActiveChallenge(true);
      } else if (response.challengeResolved) {
        setActiveChallenge(false);
      }
    }
    
    const aiResponse: Message = {
      role: 'assistant',
      content: response.message,
      timestamp: Date.now(),
      isChallenge: response.isChallenge || false
    };
    setMessages(prev => [...prev, aiResponse]);
    
    // ... rest of existing code ...
  } catch (error) {
    console.error('Failed to send message:', error);
  } finally {
    setIsLoading(false);
  }
};
```

**File:** `src/App.tsx`

**Pass isAARMode to ConversationPanel:**

```typescript
<ConversationPanel
  sessionId={sessionId}
  onVitalsUpdate={handleVitalsUpdate}
  onNotesUpdate={handleNotesUpdate}
  isAARMode={isAARMode} // NEW
/>
```

**Add AAR initialization in handleCompleteScenario:**

```typescript
// When all 3 scenarios complete:
setIsAARMode(true);
setIsActive(false);

const aarResponse = await api.startAAR(sessionId);

// Add AAR introduction to conversation
const aarIntroMessage: Message = {
  role: 'assistant',
  content: aarResponse.message,
  timestamp: Date.now()
};

// This will require moving messages state up to App.tsx
// Or using sessionStorage to pass AAR intro to ConversationPanel
sessionStorage.setItem('aarIntroduction', aarResponse.message);
```

**Testing Checkpoint:**
- ✅ Complete 3 scenarios → AAR starts automatically
- ✅ AAR conversation flows naturally
- ✅ Header shows "After Action Review"
- ✅ Performance data accessible in AAR responses

---

## **Phase 5: Frontend Enhancements**
**Estimated Time: 2-3 hours**

### **Task 5.1: Challenge Point UI**
**Duration: 1 hour**

**File:** `src/components/conversation/ConversationPanel.tsx`

```typescript
// Add challenge styling to messages
<div className={`max-w-[80%] p-4 rounded-lg ${
  msg.role === 'user'
    ? 'bg-accent text-white'
    : msg.isChallenge
    ? 'bg-yellow-900 text-yellow-100 border-2 border-yellow-600'
    : 'bg-bg-secondary text-gray-300'
}`}>
  {msg.isChallenge && (
    <div className="flex items-center space-x-2 mb-2 text-yellow-300">
      <span>💭</span>
      <span className="text-xs font-semibold">CHALLENGE QUESTION</span>
    </div>
  )}
  {msg.content}
</div>
```

**Testing Checkpoint:**
- ✅ Challenge messages visually distinct
- ✅ Challenge badge shows
- ✅ No visual changes when challenges disabled

---

### **Task 5.2: Session Complete Screen**
**Duration: 1 hour**

**File:** Create `src/components/SessionComplete.tsx`

```typescript
interface SessionCompleteProps {
  onStartNewSession: () => void;
}

function SessionComplete({ onStartNewSession }: SessionCompleteProps) {
  return (
    <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
      <div className="text-center max-w-2xl p-8 bg-bg-secondary rounded-lg">
        <div className="text-6xl mb-4">🎉</div>
        <h2 className="text-3xl font-bold mb-4">
          Training Session Complete
        </h2>
        <p className="text-gray-400 mb-8">
          You've completed all 3 emergency scenarios and the After Action Review.
          Great work!
        </p>
        
        <div className="space-y-4">
          <button
            onClick={onStartNewSession}
            className="px-8 py-4 bg-accent hover:bg-blue-600 rounded-lg text-lg font-semibold transition-colors"
          >
            Start New Session
          </button>
          
          <div className="text-sm text-gray-500">
            Your performance data has been saved for review.
          </div>
        </div>
      </div>
    </div>
  );
}

export default SessionComplete;
```

**File:** `src/App.tsx`

```typescript
const [sessionComplete, setSessionComplete] = useState(false);

// In handleCompleteScenario, after AAR completes:
// (detect aarComplete from AAR message endpoint)
if (aarComplete) {
  setSessionComplete(true);
}

// In render:
{sessionComplete && (
  <SessionComplete onStartNewSession={handleResetSession} />
)}
```

**Testing Checkpoint:**
- ✅ After AAR completes, session complete screen shows
- ✅ Can start new session
- ✅ UI resets properly

---

### **Task 5.3: Vitals Polling Enhancement**
**Duration: 30 minutes**

**File:** `src/components/clinical/VitalsMonitor.tsx`

```typescript
useEffect(() => {
  if (!sessionId || isAARMode) return; // Don't poll during AAR
  
  const interval = setInterval(async () => {
    const stateData = await api.getSessionState(sessionId);
    setVitals(stateData.vitals);
  }, 5000); // Poll every 5 seconds
  
  return () => clearInterval(interval);
}, [sessionId, isAARMode]);
```

**Testing Checkpoint:**
- ✅ Vitals update during scenarios
- ✅ Polling stops during AAR mode
- ✅ No performance issues from polling

---

## **Phase 6: Testing & Validation**
**Estimated Time: 6-8 hours**

### **Task 6.1: Unit Testing**
**Duration: 3 hours**

**Create:** `test-layer2-complete.js`

```javascript
async function testCompleteFlow() {
  console.log('=== Testing Complete Training Flow ===\n');
  
  // 1. Start session
  const session1 = await api.startSession('asthma_mvp_001');
  console.log('✓ Scenario 1 started');
  
  // 2. Complete Scenario 1
  await sendMessage(session1.sessionId, 'Apply oxygen');
  await sendMessage(session1.sessionId, 'Give salbutamol');
  await wait(10 * 60 * 1000); // Wait 10 minutes
  await completeScenario();
  console.log('✓ Scenario 1 completed');
  
  // 3. Verify Scenario 2 loads
  const session2State = await getSessionState(session1.sessionId);
  assert(session2State.scenarioId === 'cardiac_mvp_002');
  console.log('✓ Scenario 2 loaded');
  
  // 4. Complete Scenario 2
  await completeScenario();
  console.log('✓ Scenario 2 completed');
  
  // 5. Complete Scenario 3
  await completeScenario();
  console.log('✓ Scenario 3 completed');
  
  // 6. Verify AAR starts
  const aarStart = await startAAR(session1.sessionId);
  assert(aarStart.aarActive === true);
  console.log('✓ AAR initiated');
  
  // 7. Test AAR conversation
  await sendAARMessage(session1.sessionId, 'I think I did well on assessment');
  console.log('✓ AAR conversation works');
  
  console.log('\n✅ Complete flow test passed!');
}

async function testStateProgression() {
  console.log('\n=== Testing State Progression ===\n');
  
  const session = await startSession('asthma_mvp_001');
  
  // No treatment - should deteriorate
  await wait(3 * 60 * 1000);
  let state = await getSessionState(session.sessionId);
  assert(state.currentState === 'deteriorating');
  console.log('✓ Deterioration at 3min');
  
  // Give treatments - should improve
  await sendMessage(session.sessionId, 'oxygen');
  await sendMessage(session.sessionId, 'salbutamol');
  await wait(2000);
  state = await getSessionState(session.sessionId);
  assert(state.currentState === 'improving');
  console.log('✓ Improvement after treatments');
}

async function testChallengePoints() {
  console.log('\n=== Testing Challenge Points ===\n');
  
  // Enable challenges
  const session = await startSession('asthma_mvp_001', { challengePointsEnabled: true });
  
  // Trigger challenge
  const response = await sendMessage(session.sessionId, 'give salbutamol');
  assert(response.isChallenge === true);
  console.log('✓ Challenge triggered');
  
  // Respond to challenge
  const response2 = await sendMessage(session.sessionId, 'RR is 32, SpO2 88%');
  assert(response2.challengeResolved === true);
  console.log('✓ Challenge resolved');
}

// Run all tests
async function runAllTests() {
  await testCompleteFlow();
  await testStateProgression();
  await testChallengePoints();
  console.log('\n🎉 All tests passed!');
}

runAllTests();
```

**Testing Checkpoint:**
- ✅ Complete flow test passes
- ✅ State progression test passes
- ✅ Challenge points test passes
- ✅ No crashes or errors

---

### **Task 6.2: End-to-End Scenario Testing**
**Duration: 3 hours**

**Test Cases:**

**1. Optimal Performance Path:**
- Complete all 3 scenarios with excellent timing
- Give all critical treatments within windows
- Receive optimal CDP scores
- **Expected:** 90-100% score, improving states

**2. Suboptimal with Challenges:**
- Enable Challenge Points
- Respond with protocol-only answers
- Delayed treatments
- **Expected:** 60-75% score, mixed CDP ratings

**3. Dangerous Path:**
- Give dangerous medication
- Miss critical treatments
- Patient deteriorates to critical
- **Expected:** <50% score, dangerous CDP ratings

**4. Multi-Scenario Progression:**
- Verify all 3 scenarios load correctly
- Different patients each time
- Timer resets
- **Expected:** Smooth transitions

**5. AAR Functionality:**
- Complete 3 scenarios
- AAR starts automatically
- Performance data accurate
- Conversation natural
- **Expected:** Structured review, specific feedback

**Testing Checkpoint:**
- ✅ All test cases complete
- ✅ Edge cases handled
- ✅ No UI glitches
- ✅ Data accuracy verified

---

### **Task 6.3: A/B Testing Setup Verification**
**Duration: 1 hour**

**Verify Challenge Points Toggle:**

```javascript
// Group A: Challenges enabled
const sessionA = await startSession('asthma_mvp_001', { 
  challengePointsEnabled: true 
});

// Group B: Challenges disabled  
const sessionB = await startSession('asthma_mvp_001', { 
  challengePointsEnabled: false 
});

// Verify behaviors differ
// Group A should receive challenges
// Group B should not
```

**CSV Export Test:**

```javascript
// Complete several sessions with different configurations
// Export data
const csvData = await fetch('/api/sessions/export');

// Verify CSV contains:
// - challengePointsEnabled flag
// - CDP scores
// - Timing data
// - Error counts
```

**Testing Checkpoint:**
- ✅ Challenge toggle works
- ✅ Both groups tracked separately
- ✅ CSV export functional
- ✅ Ready for student pilot testing

---

### **Task 6.4: Performance & Load Testing**
**Duration: 1 hour**

**Test concurrent sessions:**

```javascript
// Simulate 10 concurrent students
const sessions = [];
for (let i = 0; i < 10; i++) {
  sessions.push(await startSession('asthma_mvp_001'));
}

// All students interact simultaneously
await Promise.all(sessions.map(s => 
  sendMessage(s.sessionId, 'Check patient')
));

// Verify:
// - No slowdowns
// - No session interference
// - Memory stable
```

**Testing Checkpoint:**
- ✅ System handles 10+ concurrent users
- ✅ No performance degradation
- ✅ No memory leaks
- ✅ Response times acceptable (<2 seconds)

---

## **Phase 7: Documentation**
**Estimated Time: 2-3 hours**

### **Task 7.1: API Documentation**
**Duration: 1 hour**

**Create:** `docs/API_LAYER2.md`

```markdown
# Layer 2 API Documentation

## Scenario Management

### Complete Scenario
**Endpoint:** Triggered via `handleCompleteScenario()` in frontend

**Flow:**
1. Mark scenario complete
2. Check if more scenarios remain
3. If yes: Load next scenario
4. If no: Transition to AAR

## AAR Endpoints

### POST /api/sessions/:id/aar/start
Initialize After Action Review

**Response:**
```json
{
  "message": "Opening AAR message",
  "phase": "opening",
  "aarActive": true
}
```

### POST /api/sessions/:id/aar/message
Continue AAR conversation

**Request:**
```json
{
  "message": "Student response"
}
```

**Response:**
```json
{
  "message": "AAR agent response",
  "phase": "scenario_review",
  "aarComplete": false
}
```

## Challenge Points Configuration

Set `challengePointsEnabled: true/false` in session initialization to enable/disable Socratic questioning for A/B testing.

## Performance Data

### GET /api/sessions/:id/performance
Returns complete performance report with:
- CDP evaluations
- Critical actions checklist
- Timing data
- Medication errors
- Final score

## Data Export

### GET /api/sessions/export
Downloads CSV with all session data for analysis.
```

---

### **Task 7.2: User Guide**
**Duration: 1 hour**

**Create:** `docs/USER_GUIDE.md`

```markdown
# Know Thyself Training Platform - User Guide

## Training Session Flow

### 1. Cognitive Coach (2-5 minutes)
- Answer 2-3 challenge questions
- Warm up clinical reasoning
- Mental preparation technique

### 2. Scenario Training (30-60 minutes)
- Complete 3 emergency scenarios
- Each scenario: 10-20 minutes
- Timer shows elapsed time
- "Complete Scenario" button appears after 10 minutes
- Auto-force at 20 minutes maximum

### 3. After Action Review (10-15 minutes)
- Performance analysis
- Structured feedback (Sustains/Improves/Apply)
- Pattern identification
- Action plan development

## UI Elements

### Header
- **During Scenarios:** Shows patient info, timer, Complete Scenario button
- **During AAR:** Shows "After Action Review" banner

### Timer
- Counts up from 00:00
- Shows scenario time (e.g., 05:23 / 20:00)
- Green color after 10 minutes (button enabled)

### Complete Scenario Button
- Appears after 10 minutes minimum
- Click to move to next scenario
- After 3rd scenario: Automatically starts AAR

### Vitals Monitor
- Updates automatically every 5 seconds
- Color-coded warnings (red for critical values)
- Shows: HR, RR, SpO2, BP, GCS, Temp

## Tips for Best Performance

1. **Start with systematic assessment:** ABC approach
2. **Act on critical findings immediately:** SpO2 <90%, severe distress
3. **Be specific with treatments:** "Non-rebreather at 15 L/min" not "give oxygen"
4. **Reassess after treatments:** Check vitals 3-5 minutes post-intervention
5. **Consider severity:** Match urgency to patient condition

## Challenge Points (if enabled)

If you receive a challenge question:
- Think through your reasoning
- Explain your clinical judgment
- Reference specific patient findings
- Avoid protocol-only responses

## After Training

Your performance data is automatically saved and reviewed in the AAR session. Focus on:
- **Sustains:** What you did well
- **Improves:** Areas for growth
- **Apply:** Clinical pearls to remember
```

---

### **Task 7.3: Instructor Guide**
**Duration: 1 hour**

**Create:** `docs/INSTRUCTOR_GUIDE.md`

```markdown
# Instructor Guide - Layer 2 MVP

## A/B Testing Setup

### Configuring Challenge Points

To enable Challenge Points for Group A:
```javascript
challengePointsEnabled: true
```

To disable for Group B (control):
```javascript
challengePointsEnabled: false
```

### Research Questions

**Primary:**
- Do Challenge Points improve CDP scores?
- Do Challenge Points increase training time?

**Secondary:**
- Student satisfaction differences?
- Self-reported learning differences?

## Performance Metrics

### Automatic Collection
- Critical action timing
- CDP scores (optimal/acceptable/suboptimal/dangerous)
- State progression (improving/deteriorating)
- Medication errors
- Challenge responses (if enabled)

### Data Export
1. Navigate to `/api/sessions/export`
2. Download CSV file
3. Import to Excel/SPSS/R for analysis

### Key Metrics to Analyze
- **Oxygen timing:** Target <2 minutes
- **Salbutamol timing:** Target <5 minutes
- **CDP scores:** Distribution across groups
- **Final patient state:** Improving vs. deteriorating
- **Error frequency:** Dangerous medications given

## Interpreting CDP Scores

### Optimal
- Excellent clinical judgment
- Timing within targets
- Systematic approach
- **Action:** Highlight as exemplary

### Acceptable
- Good performance
- Minor timing delays
- Some omissions
- **Action:** Gentle coaching

### Suboptimal
- Clear gaps in knowledge/skill
- Significant delays
- Missed critical actions
- **Action:** Targeted teaching

### Dangerous
- Patient harm potential
- Contraindicated medications
- Critical omissions
- **Action:** Remediation required

## AAR Session Management

### What AAR Agent Provides
- Scenario-by-scenario review
- Pattern analysis across scenarios
- Specific performance examples
- Actionable improvement plans

### When to Intervene
- AAR agent handles 95% of feedback
- Instructor intervention needed if:
  - Student extremely defensive
  - Technical issues during AAR
  - Need for face-to-face discussion

## Common Issues

### "Complete Scenario button not appearing"
- Button only appears after 10 minutes
- Check timer is running
- Verify isActive state

### "AAR not starting after 3rd scenario"
- Ensure all 3 scenarios marked complete
- Check console for errors
- Verify performance data generated

### "Challenge Points not triggering"
- Verify challengePointsEnabled = true
- Check keyword detection working
- Max 2 challenges per session

## Support Resources
- Technical issues: [support contact]
- Content questions: [clinical advisor]
- Research data: [export endpoint]
```

---

## **Timeline Summary**

| Phase | Tasks | Duration | Cumulative |
|-------|-------|----------|------------|
| Phase 0: Scenario Transitions | 0.1-0.3 | 3-4 hours | 3-4 hours |
| Phase 1: Backend Foundation | 1.1-1.5 | 6-8 hours | 9-12 hours |
| Phase 2: CDP & Medication | 2.1-2.3 | 4-5 hours | 13-17 hours |
| Phase 3: Challenge Points | 3.1-3.2 | 3-4 hours | 16-21 hours |
| Phase 4: AAR Agent | 4.1-4.4 | 5-6 hours | 21-27 hours |
| Phase 5: Frontend | 5.1-5.3 | 2-3 hours | 23-30 hours |
| Phase 6: Testing | 6.1-6.4 | 6-8 hours | 29-38 hours |
| Phase 7: Documentation | 7.1-7.3 | 2-3 hours | 31-41 hours |

**Total Estimated Time: 31-41 hours**

---

## **Success Criteria**

### **Must Have (Go/No-Go):**
- ✅ Complete 3 scenarios successfully
- ✅ Scenario transitions work
- ✅ State progression (initial → deteriorating/improving)
- ✅ Critical actions logged with timestamps
- ✅ CDP evaluations generate
- ✅ Medication errors detected
- ✅ Challenge Points toggle (A/B ready)
- ✅ AAR starts after scenario 3
- ✅ AAR provides structured feedback
- ✅ Performance data accurate
- ✅ CSV export functional

### **Should Have:**
- ✅ All JSON scenario features utilized
- ✅ Challenge response evaluation
- ✅ AAR conversation natural and educational
- ✅ Session complete screen
- ✅ UI polish (header states, visual feedback)

### **Nice to Have (Post-MVP):**
- Enhanced AAR visualizations
- Real-time state indicators in UI
- Detailed analytics dashboard
- Instructor intervention tools

---

## **Risk Mitigation**

### **High Risk: AAR Agent Quality**
- **Risk:** AAR feedback generic or unhelpful
- **Mitigation:** Extensive prompt testing, pilot with students
- **Fallback:** Instructor review session backup

### **Medium Risk: State Progression Complexity**
- **Risk:** Logic bugs in state transitions
- **Mitigation:** Unit testing, clear state machine
- **Fallback:** Simplify to binary (stable/unstable)

### **Medium Risk: Multi-Scenario Data Persistence**
- **Risk:** Data lost between scenarios
- **Mitigation:** Session-level tracking, not scenario-level
- **Fallback:** Store each scenario separately

### **Low Risk: Performance with Polling**
- **Risk:** Frontend slows with state polling
- **Mitigation:** 5-second intervals, skip during AAR
- **Fallback:** Increase interval to 10 seconds

---

## **Post-Implementation Checklist**

Before student pilot testing:
- [ ] All phases complete
- [ ] Unit tests pass
- [ ] End-to-end flows validated
- [ ] A/B testing verified
- [ ] CSV export tested
- [ ] Documentation complete
- [ ] AAR agent tested with real scenarios
- [ ] Scenario 2 & 3 JSON files created
- [ ] Performance baseline established
- [ ] Error handling robust
- [ ] Logging sufficient
- [ ] Backup/recovery plan in place

---

## **Next Steps After Implementation**

### **Phase 8: Content Creation (Parallel Track)**
**Duration: 10-15 hours**
- Paramedic Master Agent creates Scenario 2 (cardiac)
- Paramedic Master Agent creates Scenario 3 (trauma)
- Clinical validation of all scenarios
- Slovak language versions

### **Phase 9: Pilot Testing**
**Duration: 2-4 weeks**
- Recruit 10-20 students
- Split into Group A (challenges) and Group B (control)
- Monitor completion rates
- Collect feedback
- Gather performance data

### **Phase 10: Analysis & Iteration**
**Duration: 1-2 weeks**
- Statistical analysis of A/B test
- Student feedback review
- Identify bugs/issues
- Refine AAR prompts
- Adjust Challenge Points

### **Phase 11: Scale Preparation**
**Duration: 3-4 weeks**
- Database migration (replace in-memory sessions)
- User authentication system
- Instructor dashboard
- Prepare for 50-100 students
- Performance optimization

---

**Document Status:** Complete and Ready for Implementation  
**Last Updated:** October 31, 2025  
**Version:** 2.0  
**Prepared By:** AI Strategic Development Assistant  
**Review Status:** Ready for engineering team

---

**END OF DEVELOPMENT PLAN**
