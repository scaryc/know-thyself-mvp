# **PATTERN RECOGNITION AAR DEVELOPMENT PLAN**
## **Know Thyself - Enhanced AAR Agent with Performance Pattern Analysis**

**Document Version:** 1.0  
**Date:** November 11, 2025  
**Project:** Know Thyself MVP - AI Healthcare Education Platform  
**Estimated Total Time:** 18-22 hours

---

## **PROJECT OVERVIEW**

### **Objective**
Implement automated performance pattern detection across all three training scenarios, enabling the AAR Agent to provide evidence-based, pattern-focused feedback that identifies recurring strengths and weaknesses in student performance.

### **Scope**
- 18 performance patterns across 7 categories
- Backend pattern analysis service
- Enhanced AAR context builder with pattern data
- Updated AAR Agent prompt for pattern-based feedback
- Pattern validation and testing infrastructure

### **Success Criteria**
- AAR Agent references specific patterns in Phase 3 (Pattern Analysis)
- Patterns accurately detect recurring behaviors across scenarios
- Feedback is actionable and evidence-based
- Implementation completes before student pilot testing

---

## **ARCHITECTURE OVERVIEW**

### **Component Structure**

```
Backend (Node.js/Express)
├── services/
│   └── patternAnalysisService.js (NEW)
│       ├── Pattern calculation algorithms
│       ├── Data aggregation across scenarios
│       └── Pattern formatting for AAR
│
├── services/aarService.js (MODIFIED)
│   ├── Enhanced buildAARContext() with patterns
│   └── Pattern integration logic
│
└── prompts/aarAgent.txt (MODIFIED)
    └── Pattern-based feedback instructions

Data Flow:
Session Complete (3 scenarios) 
  → Pattern Analysis Service calculates patterns
  → AAR Service builds context with patterns
  → AAR Agent uses patterns in conversation
  → Student receives pattern-based feedback
```

---

## **PATTERN IMPLEMENTATION LIST**

### **18 Patterns to Implement**

| ID | Pattern Name | Category | Complexity | Priority |
|----|-------------|----------|------------|----------|
| 1.2 | Assessment-to-Treatment Gap | Temporal | Medium | P1 |
| 2.1 | Consistent Strength Domain | Decision Quality | Low | P1 |
| 2.2 | Consistent Weakness Domain | Decision Quality | Low | P1 |
| 2.3 | High-Stakes Decision Making | Decision Quality | Medium | P2 |
| 3.1 | Systematic vs. Chaotic Assessment | Clinical Reasoning | Low | P1 |
| 3.2 | Reactive vs. Proactive Management | Clinical Reasoning | Medium | P2 |
| 3.3 | Reassessment Frequency | Clinical Reasoning | Medium | P2 |
| 3.4 | Differential Diagnosis Consideration | Clinical Reasoning | High | P3 |
| 4.1 | Medication Error Type | Error Patterns | Low | P1 |
| 4.2 | Error Recovery Ability | Error Patterns | Medium | P2 |
| 5.1 | Information Organization | Cognitive Load | High | P3 |
| 5.3 | Challenge Point Reasoning Quality | Cognitive Load | Low | P2 |
| 6.1 | State Transition Recognition | Patient Awareness | Medium | P2 |
| 6.3 | Deterioration Prevention | Patient Awareness | Low | P1 |
| 7.1 | Documentation Specificity | Communication | Medium | P3 |
| 7.2 | Patient-Centered Language | Communication | High | P3 |
| 8.1 | Consistency Index | Meta-Patterns | Medium | P2 |
| 8.4 | Risk Tolerance Profile | Meta-Patterns | High | P3 |

**Priority Levels:**
- **P1 (High):** Core patterns, easy to calculate, high educational value (implement first)
- **P2 (Medium):** Important patterns, moderate complexity (implement second)
- **P3 (Lower):** Advanced patterns, complex calculation, nice-to-have (implement last)

---

## **PHASE 1: CORE INFRASTRUCTURE (6-7 hours)**

### **Task 1.1: Pattern Analysis Service Foundation**
**Duration:** 2 hours  
**File:** `server/services/patternAnalysisService.js` (NEW)

**Implementation:**

```javascript
// Pattern Analysis Service - Analyzes performance across 3 scenarios
export class PatternAnalysisService {
  
  constructor() {
    this.patterns = {};
  }
  
  // Main entry point - analyzes all patterns
  analyzePerformancePatterns(allScenariosData) {
    // allScenariosData = array of 3 scenario performance objects
    // Each contains: criticalActionsLog, cdpEvaluations, stateHistory, etc.
    
    if (!allScenariosData || allScenariosData.length !== 3) {
      console.error('Pattern analysis requires exactly 3 completed scenarios');
      return this.getEmptyPatternSet();
    }
    
    return {
      temporal: {
        assessmentToTreatmentGap: this.analyzeAssessmentToTreatmentGap(allScenariosData)
      },
      decisionQuality: {
        consistentStrengths: this.analyzeConsistentStrengths(allScenariosData),
        consistentWeaknesses: this.analyzeConsistentWeaknesses(allScenariosData),
        highStakesPerformance: this.analyzeHighStakesPerformance(allScenariosData)
      },
      clinicalReasoning: {
        systematicAssessment: this.analyzeSystematicAssessment(allScenariosData),
        reactiveVsProactive: this.analyzeReactiveVsProactive(allScenariosData),
        reassessmentFrequency: this.analyzeReassessmentFrequency(allScenariosData),
        differentialConsideration: this.analyzeDifferentialConsideration(allScenariosData)
      },
      errorPatterns: {
        medicationErrorType: this.analyzeMedicationErrorType(allScenariosData),
        errorRecovery: this.analyzeErrorRecovery(allScenariosData)
      },
      cognitiveLoad: {
        informationOrganization: this.analyzeInformationOrganization(allScenariosData),
        challengePointQuality: this.analyzeChallengePointQuality(allScenariosData)
      },
      patientAwareness: {
        stateTransitionRecognition: this.analyzeStateTransitionRecognition(allScenariosData),
        deteriorationPrevention: this.analyzeDeteriorationPrevention(allScenariosData)
      },
      communication: {
        documentationSpecificity: this.analyzeDocumentationSpecificity(allScenariosData),
        patientCenteredLanguage: this.analyzePatientCenteredLanguage(allScenariosData)
      },
      metaPatterns: {
        consistencyIndex: this.analyzeConsistencyIndex(allScenariosData),
        riskToleranceProfile: this.analyzeRiskToleranceProfile(allScenariosData)
      },
      summary: this.generatePatternSummary(allScenariosData)
    };
  }
  
  // Helper: Returns empty pattern structure if data insufficient
  getEmptyPatternSet() {
    return {
      temporal: {},
      decisionQuality: {},
      clinicalReasoning: {},
      errorPatterns: {},
      cognitiveLoad: {},
      patientAwareness: {},
      communication: {},
      metaPatterns: {},
      summary: {
        patternsDetected: 0,
        readyForAnalysis: false,
        message: 'Insufficient data for pattern analysis'
      }
    };
  }
  
  // Helper: Format pattern for AAR context
  formatPatternForAAR(pattern) {
    if (!pattern || !pattern.detected) {
      return '';
    }
    
    return `
## ${pattern.patternName}
**Status:** ${pattern.detected ? 'DETECTED' : 'NOT DETECTED'}
${pattern.severity ? `**Severity:** ${pattern.severity}` : ''}
${pattern.isStrength ? `**Type:** STRENGTH` : ''}
${pattern.priority ? `**Priority:** ${pattern.priority}` : ''}

**Data:**
${JSON.stringify(pattern.data, null, 2)}

**Educational Focus:**
${pattern.educationalFocus || 'N/A'}

**AAR Talking Point:**
"${pattern.aarTalkingPoint || 'N/A'}"
`;
  }
  
  // Placeholder methods to be implemented in subsequent tasks
  analyzeAssessmentToTreatmentGap(data) { return { detected: false }; }
  analyzeConsistentStrengths(data) { return { detected: false }; }
  analyzeConsistentWeaknesses(data) { return { detected: false }; }
  analyzeHighStakesPerformance(data) { return { detected: false }; }
  analyzeSystematicAssessment(data) { return { detected: false }; }
  analyzeReactiveVsProactive(data) { return { detected: false }; }
  analyzeReassessmentFrequency(data) { return { detected: false }; }
  analyzeDifferentialConsideration(data) { return { detected: false }; }
  analyzeMedicationErrorType(data) { return { detected: false }; }
  analyzeErrorRecovery(data) { return { detected: false }; }
  analyzeInformationOrganization(data) { return { detected: false }; }
  analyzeChallengePointQuality(data) { return { detected: false }; }
  analyzeStateTransitionRecognition(data) { return { detected: false }; }
  analyzeDeteriorationPrevention(data) { return { detected: false }; }
  analyzeDocumentationSpecificity(data) { return { detected: false }; }
  analyzePatientCenteredLanguage(data) { return { detected: false }; }
  analyzeConsistencyIndex(data) { return { detected: false }; }
  analyzeRiskToleranceProfile(data) { return { detected: false }; }
  
  generatePatternSummary(data) {
    return {
      patternsDetected: 0,
      readyForAnalysis: true,
      message: 'Pattern analysis complete'
    };
  }
}

// Export singleton instance
export const patternAnalysisService = new PatternAnalysisService();
```

**Testing Checkpoint:**
- ✅ Service instantiates correctly
- ✅ Empty pattern set returns without errors
- ✅ formatPatternForAAR produces valid output

---

### **Task 1.2: Modify AAR Service to Include Patterns**
**Duration:** 1.5 hours  
**File:** `server/services/aarService.js` (MODIFY)

**Implementation:**

```javascript
import { patternAnalysisService } from './patternAnalysisService.js';

export class AARService {
  constructor() {
    this.aarSessions = new Map();
  }
  
  initializeAAR(sessionId, allScenariosPerformanceData) {
    // MODIFIED: Now receives data from ALL 3 scenarios, not just one
    
    // Calculate patterns from all 3 scenarios
    const patterns = patternAnalysisService.analyzePerformancePatterns(
      allScenariosPerformanceData
    );
    
    const aarSession = {
      sessionId: sessionId,
      performanceData: allScenariosPerformanceData,
      patterns: patterns, // NEW: Store calculated patterns
      phase: 'opening',
      currentScenarioIndex: 0,
      conversationHistory: [],
      startTime: Date.now()
    };
    
    this.aarSessions.set(sessionId, aarSession);
    return aarSession;
  }
  
  buildAARContext(sessionId) {
    const aar = this.aarSessions.get(sessionId);
    if (!aar) return '';
    
    const patterns = aar.patterns;
    
    // Build comprehensive context including all scenarios and patterns
    let context = `
# STUDENT PERFORMANCE DATA - ALL 3 SCENARIOS

## Overall Session Summary
- Total Scenarios: 3
- Total Session Time: ${this.calculateTotalTime(aar.performanceData)}
- Overall Score: ${this.calculateOverallScore(aar.performanceData)}
- Total Errors: ${this.countTotalErrors(aar.performanceData)}

`;
    
    // Add individual scenario summaries
    for (let i = 0; i < aar.performanceData.length; i++) {
      const scenario = aar.performanceData[i];
      context += this.buildScenarioSummary(scenario, i + 1);
    }
    
    // Add pattern analysis section
    context += `
---

# IDENTIFIED PERFORMANCE PATTERNS

**Pattern Analysis Status:** ${patterns.summary.readyForAnalysis ? 'COMPLETE' : 'INCOMPLETE'}
**Patterns Detected:** ${this.countDetectedPatterns(patterns)}

`;
    
    // Add each pattern category
    if (patterns.temporal.assessmentToTreatmentGap) {
      context += this.formatPattern(patterns.temporal.assessmentToTreatmentGap);
    }
    
    if (patterns.decisionQuality.consistentStrengths) {
      context += this.formatPattern(patterns.decisionQuality.consistentStrengths);
    }
    
    if (patterns.decisionQuality.consistentWeaknesses) {
      context += this.formatPattern(patterns.decisionQuality.consistentWeaknesses);
    }
    
    if (patterns.decisionQuality.highStakesPerformance) {
      context += this.formatPattern(patterns.decisionQuality.highStakesPerformance);
    }
    
    if (patterns.clinicalReasoning.systematicAssessment) {
      context += this.formatPattern(patterns.clinicalReasoning.systematicAssessment);
    }
    
    if (patterns.clinicalReasoning.reactiveVsProactive) {
      context += this.formatPattern(patterns.clinicalReasoning.reactiveVsProactive);
    }
    
    if (patterns.clinicalReasoning.reassessmentFrequency) {
      context += this.formatPattern(patterns.clinicalReasoning.reassessmentFrequency);
    }
    
    if (patterns.clinicalReasoning.differentialConsideration) {
      context += this.formatPattern(patterns.clinicalReasoning.differentialConsideration);
    }
    
    if (patterns.errorPatterns.medicationErrorType) {
      context += this.formatPattern(patterns.errorPatterns.medicationErrorType);
    }
    
    if (patterns.errorPatterns.errorRecovery) {
      context += this.formatPattern(patterns.errorPatterns.errorRecovery);
    }
    
    if (patterns.cognitiveLoad.informationOrganization) {
      context += this.formatPattern(patterns.cognitiveLoad.informationOrganization);
    }
    
    if (patterns.cognitiveLoad.challengePointQuality) {
      context += this.formatPattern(patterns.cognitiveLoad.challengePointQuality);
    }
    
    if (patterns.patientAwareness.stateTransitionRecognition) {
      context += this.formatPattern(patterns.patientAwareness.stateTransitionRecognition);
    }
    
    if (patterns.patientAwareness.deteriorationPrevention) {
      context += this.formatPattern(patterns.patientAwareness.deteriorationPrevention);
    }
    
    if (patterns.communication.documentationSpecificity) {
      context += this.formatPattern(patterns.communication.documentationSpecificity);
    }
    
    if (patterns.communication.patientCenteredLanguage) {
      context += this.formatPattern(patterns.communication.patientCenteredLanguage);
    }
    
    if (patterns.metaPatterns.consistencyIndex) {
      context += this.formatPattern(patterns.metaPatterns.consistencyIndex);
    }
    
    if (patterns.metaPatterns.riskToleranceProfile) {
      context += this.formatPattern(patterns.metaPatterns.riskToleranceProfile);
    }
    
    // Add instructions for AAR agent
    context += `

---

# AAR AGENT INSTRUCTIONS FOR PATTERN USAGE

## Phase 3: Pattern Analysis - PRIMARY USE OF PATTERNS

When you reach Phase 3 (Pattern Analysis) after reviewing all 3 scenarios individually:

1. **Select 2-4 most significant patterns** from the data above
2. **Reference patterns BY NAME** when discussing cross-scenario performance
3. **Use the "AAR Talking Point"** as your starting framework for each pattern
4. **Connect patterns to specific examples** from the scenario data
5. **Ask student if pattern resonates** with their experience

## Pattern Selection Priority:

**MUST discuss if detected:**
- Any pattern marked "HIGH" severity
- Any pattern marked "HIGH" priority
- Consistent Weakness Domain (always address if detected)

**SHOULD discuss:**
- Consistent Strength Domain (build confidence)
- High-Stakes Performance (if gap detected)
- Reactive vs. Proactive (fundamental care approach)
- Deterioration Prevention (patient outcome focused)

**MAY discuss if relevant:**
- Other patterns based on student's self-identified concerns
- Patterns that explain biggest performance gaps
- Patterns with clear actionable improvements

## Example Pattern Usage in Phase 3:

"Looking across all three scenarios, I see [PATTERN NAME]. [Use AAR Talking Point]. For example, in the asthma scenario [specific example], and in the cardiac scenario [specific example]. Does this pattern match what you experienced?"

## What NOT to do:
- ❌ Don't list all patterns mechanically
- ❌ Don't use technical pattern names without explanation
- ❌ Don't overwhelm student with too many patterns
- ❌ Don't discuss patterns without connecting to specific scenario examples

## Current AAR Phase: ${aar.phase}
${aar.phase === 'scenario_review' ? `Currently reviewing scenario ${aar.currentScenarioIndex + 1} of 3` : ''}

Focus on individual scenario feedback until Phase 3, then shift to pattern-based analysis.
`;
    
    return context;
  }
  
  formatPattern(pattern) {
    return patternAnalysisService.formatPatternForAAR(pattern);
  }
  
  buildScenarioSummary(scenarioData, scenarioNumber) {
    return `
## Scenario ${scenarioNumber}: ${scenarioData.scenarioId || 'Unknown'}

**Time:** ${Math.floor(scenarioData.totalTime / 60)} minutes
**Score:** ${scenarioData.score?.percentage || 'N/A'}% (${scenarioData.score?.grade || 'N/A'})
**Final State:** ${scenarioData.finalState || 'Unknown'}

**Critical Actions Completed:**
${scenarioData.checklistResults?.map(item => 
  `- ${item.action}: ${item.completed ? '✅' : '❌'} ${item.completed && item.timeTarget ? `(${Math.floor(item.timeSinceStart / 60)}min, target ${item.timeTarget}min)` : ''}`
).join('\n') || 'No checklist data'}

**CDP Evaluations:**
${scenarioData.cdpEvaluations?.map(cdp => 
  `- ${cdp.decision}: ${cdp.score.toUpperCase()} - ${cdp.reasoning}`
).join('\n') || 'No CDP data'}

**Medication Errors:** ${scenarioData.errors?.length || 0}
${scenarioData.errors?.length > 0 ? scenarioData.errors.map(e => `  - ${e.action}`).join('\n') : ''}

**State Progression:**
${scenarioData.stateHistory?.map(s => 
  `- ${Math.floor(s.timeSinceStart)}min: ${s.state.toUpperCase()}`
).join('\n') || 'No state data'}

---
`;
  }
  
  calculateTotalTime(allScenarios) {
    const total = allScenarios.reduce((sum, s) => sum + (s.totalTime || 0), 0);
    return `${Math.floor(total / 60)} minutes`;
  }
  
  calculateOverallScore(allScenarios) {
    const scores = allScenarios.map(s => s.score?.percentage || 0);
    const avg = scores.reduce((sum, s) => sum + s, 0) / scores.length;
    return `${Math.round(avg)}%`;
  }
  
  countTotalErrors(allScenarios) {
    return allScenarios.reduce((sum, s) => sum + (s.errors?.length || 0), 0);
  }
  
  countDetectedPatterns(patterns) {
    let count = 0;
    
    const checkCategory = (category) => {
      for (const key in category) {
        if (category[key]?.detected) count++;
      }
    };
    
    checkCategory(patterns.temporal || {});
    checkCategory(patterns.decisionQuality || {});
    checkCategory(patterns.clinicalReasoning || {});
    checkCategory(patterns.errorPatterns || {});
    checkCategory(patterns.cognitiveLoad || {});
    checkCategory(patterns.patientAwareness || {});
    checkCategory(patterns.communication || {});
    checkCategory(patterns.metaPatterns || {});
    
    return count;
  }
  
  // Existing methods remain unchanged
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
}
```

**Testing Checkpoint:**
- ✅ AAR context includes pattern section
- ✅ All scenario data correctly aggregated
- ✅ Pattern instructions present in context
- ✅ Pattern formatting works correctly

---

### **Task 1.3: Modify AAR Endpoint to Aggregate Scenario Data**
**Duration:** 1 hour  
**File:** `server/index.js` (MODIFY)

**Implementation:**

```javascript
// MODIFY: POST /api/sessions/:id/aar/start endpoint

app.post('/api/sessions/:id/aar/start', async (req, res) => {
  const session = sessions.get(req.params.id);
  
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }
  
  // NEW: Collect performance data from ALL completed scenarios
  // Assuming session now tracks all completed scenarios in session.completedScenarios
  
  if (!session.completedScenarios || session.completedScenarios.length !== 3) {
    return res.status(400).json({ 
      error: 'AAR requires 3 completed scenarios',
      completedCount: session.completedScenarios?.length || 0
    });
  }
  
  // Build performance data array for all 3 scenarios
  const allScenariosData = session.completedScenarios.map(scenarioSession => {
    return {
      scenarioId: scenarioSession.scenario?.scenario_id,
      totalTime: (scenarioSession.endTime - scenarioSession.startTime) / 1000,
      score: scenarioSession.score,
      checklistResults: scenarioSession.checklistResults,
      cdpEvaluations: scenarioSession.cdpEvaluations,
      criticalActionsLog: scenarioSession.criticalActionsLog,
      errors: scenarioSession.errors,
      stateHistory: scenarioSession.stateHistory,
      criticalTreatmentsGiven: scenarioSession.criticalTreatmentsGiven,
      finalState: scenarioSession.currentState,
      vitals: scenarioSession.vitals
    };
  });
  
  // Initialize AAR with ALL scenarios data
  const aarSession = aarService.initializeAAR(req.params.id, allScenariosData);
  
  // Load AAR prompt
  const aarPrompt = fs.readFileSync('./prompts/aarAgent.txt', 'utf-8');
  
  // Build context with patterns
  const context = aarService.buildAARContext(req.params.id);
  
  // Get opening message from Claude
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2048,
    temperature: 0.4,
    system: aarPrompt + '\n\n' + context,
    messages: [
      { role: 'user', content: 'Start the AAR' }
    ]
  });
  
  const aarMessage = response.content[0].text;
  
  // Store conversation
  aarSession.conversationHistory.push(
    { role: 'user', content: 'Start the AAR' },
    { role: 'assistant', content: aarMessage }
  );
  
  res.json({
    message: aarMessage,
    phase: 'opening',
    aarActive: true
  });
});
```

**Testing Checkpoint:**
- ✅ AAR only starts with 3 completed scenarios
- ✅ All scenario data correctly passed to AAR service
- ✅ Pattern analysis runs automatically
- ✅ AAR context includes pattern data

---

### **Task 1.4: Update AAR Agent Prompt**
**Duration:** 1.5 hours  
**File:** `server/prompts/aarAgent.txt` (MODIFY)

**Add this new section after INSTRUCTION 3 and before INSTRUCTION 4:**

```text
---

# **INSTRUCTION 3B: Using Performance Patterns in AAR**

## **Pattern-Based Feedback in Phase 3**

In Phase 3 (Pattern Analysis), you now have access to automatically detected performance patterns from the context data above. These patterns identify recurring behaviors, strengths, and weaknesses across all three scenarios.

### **How to Use Patterns:**

**1. Pattern Selection (Choose 2-4 patterns maximum)**

Review the IDENTIFIED PERFORMANCE PATTERNS section in your context. Select patterns based on:

**MUST discuss if present:**
- Any pattern with severity "HIGH"
- Any pattern with priority "HIGH" 
- "Consistent Weakness Domain" (always critical to address)
- "Deterioration Prevention" (patient safety focused)

**SHOULD discuss if present:**
- "Consistent Strength Domain" (builds confidence first)
- "High-Stakes Decision Making" (fundamental capability)
- "Reactive vs. Proactive Management" (care philosophy)
- "Systematic Assessment" (foundational skill)

**MAY discuss if relevant:**
- Patterns that align with student's self-identified concerns
- Patterns that explain the biggest performance gaps
- Patterns with clear, actionable improvement paths

**2. Pattern Integration Framework**

For EACH pattern you discuss, follow this structure:

**Step 1: Name the pattern**
"Looking across all three scenarios, I see a pattern in [PATTERN NAME]..."

**Step 2: Use the AAR Talking Point**
Use the pre-written "AAR Talking Point" from the context as your starting framework. Adapt slightly to the student's specific performance.

**Step 3: Connect to specific examples**
Reference actual scenario data: "In the asthma scenario, [specific example]. In the cardiac scenario, [specific example]."

**Step 4: Student reflection**
"Does this pattern match what you experienced? What do you think was happening?"

**Step 5: Brief teaching point**
Provide ONE actionable insight or suggestion, not a lecture.

### **Example Pattern Discussion:**

**GOOD:**
"Looking across all three scenarios, I see a pattern in your response timing. You consistently identified critical problems quickly—within the first 2 minutes each time. That recognition is excellent. But there was a 3-4 minute gap between identifying the problem and starting treatment. In the asthma case, you recognized critical hypoxia at 1:00 but didn't start high-flow oxygen until 4:30. In the cardiac case, you identified MI at 1:30 but didn't give aspirin until 5:00. What do you think was happening in those gaps? [Student responds] Right—and that's where we can focus: once ABC shows an immediate threat, act within 5 minutes. History can wait."

**BAD:**
"I see patterns 1.2, 2.1, 2.2, 3.1, and 6.3 in your data. Let me explain each one. Pattern 1.2 is Assessment-to-Treatment Gap which means... [continues mechanically listing patterns without engagement or examples]"

### **Pattern Discussion Rules:**

✅ **DO:**
- Reference patterns by their descriptive names, not technical IDs
- Connect every pattern to specific scenario examples
- Ask for student reflection before explaining
- Keep pattern discussions conversational, not mechanical
- Balance positive patterns (strengths) with developmental patterns (weaknesses)
- Limit to 2-4 patterns maximum—focus on most actionable

❌ **DON'T:**
- List all detected patterns mechanically
- Use technical pattern terminology without explanation
- Discuss patterns without scenario examples
- Overwhelm student with too many patterns
- Lecture about patterns—maintain dialogue
- Skip student reflection before teaching

### **Pattern Priority in Phase 3:**

**First:** Discuss 1-2 consistent strengths to build confidence
**Second:** Discuss 1-2 critical weaknesses with actionable improvement
**Third:** Connect patterns to action plan for Phase 4

### **Integrating Patterns with Existing AAR Structure:**

**Phase 1 (Opening):** No pattern discussion yet—just overall reflection

**Phase 2 (Scenario-by-Scenario):** 
- Reference individual scenario data (not patterns)
- Use CDP evaluations and specific actions
- Focus on what happened in THAT scenario

**Phase 3 (Pattern Analysis):** ← PRIMARY PATTERN USE
- NOW shift to cross-scenario patterns
- Reference patterns by name
- Use AAR Talking Points
- Connect to multiple scenario examples
- Focus on recurring behaviors

**Phase 4 (Action Plan):**
- Create action items based on patterns identified
- Focus on addressing pattern-based weaknesses
- Reinforce pattern-based strengths

**Phase 5 (Closing):**
- Summarize key patterns briefly
- Celebrate strength patterns
- Encourage focus on improvement patterns

---
```

**Testing Checkpoint:**
- ✅ AAR prompt includes pattern usage instructions
- ✅ Examples demonstrate proper pattern integration
- ✅ Clear distinction between phases maintained
- ✅ Pattern priority guidance included

---

## **PHASE 2: PRIORITY 1 PATTERNS (4-5 hours)**

### **Task 2.1: Implement P1 Temporal Pattern (1.2)**
**Duration:** 1 hour  
**File:** `server/services/patternAnalysisService.js`

```javascript
analyzeAssessmentToTreatmentGap(allScenariosData) {
  const gaps = [];
  
  for (const scenario of allScenariosData) {
    // Find first assessment action that identifies the critical condition
    const firstAssessment = scenario.criticalActionsLog
      .find(a => a.category === 'assessment' && a.timeSinceStart < 300); // within first 5 min
    
    // Find first treatment action
    const firstTreatment = scenario.criticalActionsLog
      .find(a => a.category === 'treatment');
    
    if (firstAssessment && firstTreatment) {
      const gap = firstTreatment.timeSinceStart - firstAssessment.timeSinceStart;
      
      gaps.push({
        scenarioId: scenario.scenarioId,
        assessmentTime: firstAssessment.timeSinceStart,
        treatmentTime: firstTreatment.timeSinceStart,
        gap: gap,
        assessmentAction: firstAssessment.action,
        treatmentAction: firstTreatment.action
      });
    }
  }
  
  if (gaps.length === 0) {
    return {
      patternName: "Assessment-to-Treatment Gap",
      detected: false,
      data: { message: "Insufficient data to calculate assessment-to-treatment gap" }
    };
  }
  
  const avgGap = gaps.reduce((sum, g) => sum + g.gap, 0) / gaps.length;
  const isSignificant = avgGap > 180; // >3 minutes is significant
  
  return {
    patternName: "Assessment-to-Treatment Gap",
    detected: isSignificant,
    severity: avgGap > 300 ? "HIGH" : avgGap > 180 ? "MODERATE" : "LOW",
    data: {
      averageGapSeconds: Math.round(avgGap),
      averageGapMinutes: Math.round(avgGap / 60 * 10) / 10,
      scenarios: gaps.map(g => ({
        scenario: g.scenarioId,
        gapMinutes: Math.round(g.gap / 60 * 10) / 10,
        assessment: g.assessmentAction,
        treatment: g.treatmentAction
      }))
    },
    educationalFocus: isSignificant 
      ? "Student recognizes problems but hesitates to act - confidence gap vs. knowledge gap"
      : "Student acts promptly after recognition - good clinical decisiveness",
    aarTalkingPoint: isSignificant
      ? `Looking across all three scenarios, I notice a pattern: you consistently identified critical findings quickly, but there was an average ${Math.round(avgGap/60)}-minute delay before starting treatment. In the ${gaps[0].scenarioId}, you recognized the problem at ${Math.round(gaps[0].assessmentTime/60)} minutes but didn't treat until ${Math.round(gaps[0].treatmentTime/60)} minutes. Let's discuss what was happening in those gaps—was it uncertainty, gathering more information, or protocol checking?`
      : `Excellent decisiveness—you consistently acted quickly after identifying problems, with an average gap of only ${Math.round(avgGap/60)} minutes between recognition and treatment. That's exactly what we want to see.`
  };
}
```

**Testing Checkpoint:**
- ✅ Calculates gap correctly from criticalActionsLog
- ✅ Handles missing data gracefully
- ✅ Generates appropriate talking points
- ✅ Test with 3 mock scenarios

---

### **Task 2.2: Implement P1 Decision Quality Patterns (2.1, 2.2)**
**Duration:** 1.5 hours  
**File:** `server/services/patternAnalysisService.js`

```javascript
// Helper method to categorize CDPs
categorizeCDP(cdpId, cdpDecision) {
  // Map CDP IDs to clinical categories
  const categoryMap = {
    'assessment': ['CDP1', 'assessment', 'initial_assessment', 'scene_assessment'],
    'airway': ['airway', 'intubation', 'airway_management'],
    'breathing': ['oxygen', 'bronchodilator', 'respiratory', 'breathing'],
    'circulation': ['IV', 'fluids', 'cardiac', 'circulation'],
    'medication': ['medication', 'drug', 'pharmacology'],
    'timing': ['timing', 'urgency', 'critical_window'],
    'prioritization': ['priority', 'triage', 'sequence']
  };
  
  const decisionLower = (cdpDecision || '').toLowerCase();
  const idLower = (cdpId || '').toLowerCase();
  
  for (const [category, keywords] of Object.entries(categoryMap)) {
    for (const keyword of keywords) {
      if (decisionLower.includes(keyword) || idLower.includes(keyword)) {
        return category;
      }
    }
  }
  
  return 'other';
}

analyzeConsistentStrengths(allScenariosData) {
  // Group CDPs by category
  const cdpByCategory = {};
  
  for (const scenario of allScenariosData) {
    if (!scenario.cdpEvaluations) continue;
    
    for (const cdp of scenario.cdpEvaluations) {
      const category = this.categorizeCDP(cdp.id, cdp.decision);
      
      if (!cdpByCategory[category]) {
        cdpByCategory[category] = [];
      }
      
      cdpByCategory[category].push({
        scenario: scenario.scenarioId,
        score: cdp.score,
        decision: cdp.decision
      });
    }
  }
  
  // Find categories with consistent optimal performance
  const strengths = [];
  
  for (const [category, cdps] of Object.entries(cdpByCategory)) {
    const optimalCount = cdps.filter(c => c.score === 'optimal').length;
    const totalCount = cdps.length;
    const optimalRate = optimalCount / totalCount;
    
    if (optimalCount >= 2 && optimalRate >= 0.67) { // At least 2/3 optimal
      strengths.push({
        category: category,
        optimalCount: optimalCount,
        totalCount: totalCount,
        rate: Math.round(optimalRate * 100),
        examples: cdps.filter(c => c.score === 'optimal').map(c => c.decision)
      });
    }
  }
  
  if (strengths.length === 0) {
    return {
      patternName: "Consistent Strength Domain",
      detected: false,
      data: { message: "No consistent strength domains identified across scenarios" }
    };
  }
  
  // Sort by rate, take top strength
  strengths.sort((a, b) => b.rate - a.rate);
  const primaryStrength = strengths[0];
  
  return {
    patternName: "Consistent Strength Domain",
    detected: true,
    isStrength: true,
    priority: "MEDIUM",
    data: {
      primaryStrength: primaryStrength.category,
      performance: `${primaryStrength.optimalCount}/${primaryStrength.totalCount} optimal`,
      rate: `${primaryStrength.rate}%`,
      allStrengths: strengths
    },
    educationalFocus: `Consistent excellence in ${primaryStrength.category} - reliable foundation to build on`,
    aarTalkingPoint: `Looking across all three scenarios, I see a consistent strength: your ${primaryStrength.category} was systematically excellent. You earned Optimal ratings in ${primaryStrength.optimalCount} out of ${primaryStrength.totalCount} ${primaryStrength.category} decisions—that's ${primaryStrength.rate}% optimal. That foundation is rock-solid and exactly what we want to see.`
  };
}

analyzeConsistentWeaknesses(allScenariosData) {
  // Group CDPs by category
  const cdpByCategory = {};
  
  for (const scenario of allScenariosData) {
    if (!scenario.cdpEvaluations) continue;
    
    for (const cdp of scenario.cdpEvaluations) {
      const category = this.categorizeCDP(cdp.id, cdp.decision);
      
      if (!cdpByCategory[category]) {
        cdpByCategory[category] = [];
      }
      
      cdpByCategory[category].push({
        scenario: scenario.scenarioId,
        score: cdp.score,
        decision: cdp.decision,
        reasoning: cdp.reasoning
      });
    }
  }
  
  // Find categories with consistent suboptimal/dangerous performance
  const weaknesses = [];
  
  for (const [category, cdps] of Object.entries(cdpByCategory)) {
    const poorCount = cdps.filter(c => c.score === 'suboptimal' || c.score === 'dangerous').length;
    const dangerousCount = cdps.filter(c => c.score === 'dangerous').length;
    const totalCount = cdps.length;
    const poorRate = poorCount / totalCount;
    
    if (poorCount >= 2 && poorRate >= 0.5) { // At least 2 poor scores and 50%+ poor
      weaknesses.push({
        category: category,
        poorCount: poorCount,
        dangerousCount: dangerousCount,
        totalCount: totalCount,
        rate: Math.round(poorRate * 100),
        examples: cdps.filter(c => c.score !== 'optimal').map(c => ({
          decision: c.decision,
          score: c.score,
          scenario: c.scenario
        }))
      });
    }
  }
  
  if (weaknesses.length === 0) {
    return {
      patternName: "Consistent Weakness Domain",
      detected: false,
      data: { message: "No consistent weakness domains identified" }
    };
  }
  
  // Sort by severity (dangerous count first, then poor rate)
  weaknesses.sort((a, b) => {
    if (b.dangerousCount !== a.dangerousCount) {
      return b.dangerousCount - a.dangerousCount;
    }
    return b.rate - a.rate;
  });
  
  const primaryWeakness = weaknesses[0];
  
  return {
    patternName: "Consistent Weakness Domain",
    detected: true,
    severity: primaryWeakness.dangerousCount > 0 ? "HIGH" : "MODERATE",
    priority: "HIGH",
    data: {
      primaryWeakness: primaryWeakness.category,
      performance: `${primaryWeakness.poorCount}/${primaryWeakness.totalCount} suboptimal/dangerous`,
      rate: `${primaryWeakness.rate}%`,
      dangerousCount: primaryWeakness.dangerousCount,
      examples: primaryWeakness.examples,
      allWeaknesses: weaknesses
    },
    educationalFocus: `Consistent difficulty with ${primaryWeakness.category} - specific knowledge gap requiring targeted remediation`,
    aarTalkingPoint: primaryWeakness.dangerousCount > 0
      ? `I need to highlight a pattern of concern: ${primaryWeakness.category} decisions were rated Suboptimal or Dangerous in ${primaryWeakness.poorCount} out of ${primaryWeakness.totalCount} cases across the scenarios. This suggests a specific knowledge gap that needs immediate attention. Let's discuss what's challenging about ${primaryWeakness.category} decisions for you.`
      : `I see a pattern in ${primaryWeakness.category}—this area earned Suboptimal ratings in ${primaryWeakness.poorCount} out of ${primaryWeakness.totalCount} decisions. This suggests a specific area where we can focus your learning. Let's talk about what makes ${primaryWeakness.category} challenging for you.`
  };
}
```

**Testing Checkpoint:**
- ✅ Correctly categorizes CDPs
- ✅ Identifies strength domains with ≥2/3 optimal
- ✅ Identifies weakness domains with ≥50% poor
- ✅ Generates appropriate severity levels

---

### **Task 2.3: Implement P1 Clinical Reasoning Pattern (3.1)**
**Duration:** 1 hour  
**File:** `server/services/patternAnalysisService.js`

```javascript
analyzeSystematicAssessment(allScenariosData) {
  const assessmentSequences = [];
  
  for (const scenario of allScenariosData) {
    if (!scenario.criticalActionsLog) continue;
    
    // Get first 5-8 actions to analyze initial approach
    const initialActions = scenario.criticalActionsLog
      .filter(a => a.timeSinceStart < 300) // First 5 minutes
      .slice(0, 8);
    
    // Categorize each action
    const actionSequence = initialActions.map(a => this.categorizeActionType(a.action));
    
    // Check if follows ABC pattern
    const isSystematic = this.followsABCPattern(actionSequence);
    
    assessmentSequences.push({
      scenario: scenario.scenarioId,
      sequence: actionSequence,
      systematic: isSystematic,
      firstActions: initialActions.map(a => a.action)
    });
  }
  
  const systematicCount = assessmentSequences.filter(s => s.systematic).length;
  
  return {
    patternName: "Systematic vs. Chaotic Assessment",
    detected: true,
    isStrength: systematicCount >= 2,
    priority: systematicCount >= 2 ? "MEDIUM" : "HIGH",
    data: {
      systematicScenarios: systematicCount,
      chaoticScenarios: 3 - systematicCount,
      consistency: `${systematicCount}/3`,
      sequences: assessmentSequences
    },
    educationalFocus: systematicCount >= 2
      ? "Strong systematic assessment approach - reliable ABC foundation"
      : "Assessment approach inconsistent - needs structured framework practice",
    aarTalkingPoint: systematicCount >= 2
      ? `Your systematic assessment approach was excellent—you followed an ABC structure in ${systematicCount} out of 3 scenarios. That disciplined approach is exactly what makes a reliable paramedic. Even under pressure, you maintained that systematic framework.`
      : `I notice your assessment approach varied significantly. In ${assessmentSequences.find(s => s.systematic)?.scenario || 'one scenario'}, you followed ABC systematically, but in the other scenarios, the sequence was more chaotic. A consistent systematic approach—checking Airway, then Breathing, then Circulation every time—would serve you better and help you avoid missing critical findings.`
  };
}

// Helper methods
categorizeActionType(action) {
  const actionLower = action.toLowerCase();
  
  if (actionLower.includes('airway') || actionLower.includes('mouth') || 
      actionLower.includes('obstruction') || actionLower.includes('jaw')) {
    return 'A';
  }
  if (actionLower.includes('breath') || actionLower.includes('lung') || 
      actionLower.includes('respiratory') || actionLower.includes('spo2') ||
      actionLower.includes('oxygen') || actionLower.includes('chest')) {
    return 'B';
  }
  if (actionLower.includes('pulse') || actionLower.includes('bp') ||
      actionLower.includes('circulation') || actionLower.includes('heart') ||
      actionLower.includes('perfusion') || actionLower.includes('shock')) {
    return 'C';
  }
  if (actionLower.includes('disability') || actionLower.includes('gcs') ||
      actionLower.includes('conscious') || actionLower.includes('neuro')) {
    return 'D';
  }
  
  return 'other';
}

followsABCPattern(actionSequence) {
  // Find indices of A, B, C in sequence
  const aIndex = actionSequence.findIndex(a => a === 'A');
  const bIndex = actionSequence.findIndex(a => a === 'B');
  const cIndex = actionSequence.findIndex(a => a === 'C');
  
  // Check if ABC appears in order (allowing for 'other' actions in between)
  if (aIndex === -1 || bIndex === -1 || cIndex === -1) {
    return false; // Missing essential components
  }
  
  return aIndex < bIndex && bIndex < cIndex;
}
```

**Testing Checkpoint:**
- ✅ Correctly categorizes actions as A/B/C/D/other
- ✅ Detects ABC pattern correctly
- ✅ Handles missing ABC components
- ✅ Generates appropriate feedback

---

### **Task 2.4: Implement P1 Error and Patient Awareness Patterns (4.1, 6.3)**
**Duration:** 1.5 hours  
**File:** `server/services/patternAnalysisService.js`

```javascript
analyzeMedicationErrorType(allScenariosData) {
  const allErrors = [];
  
  for (const scenario of allScenariosData) {
    if (!scenario.errors || scenario.errors.length === 0) continue;
    
    for (const error of scenario.errors) {
      // Categorize error type based on action
      const errorType = this.categorizeMedicationError(error);
      allErrors.push({
        scenario: scenario.scenarioId,
        type: errorType,
        action: error.action,
        timing: error.timeSinceStart
      });
    }
  }
  
  if (allErrors.length === 0) {
    return {
      patternName: "Medication Error Type",
      detected: false,
      data: { 
        message: "No medication errors detected - excellent safety profile",
        totalErrors: 0
      }
    };
  }
  
  // Group errors by type
  const errorsByType = {};
  for (const error of allErrors) {
    if (!errorsByType[error.type]) {
      errorsByType[error.type] = [];
    }
    errorsByType[error.type].push(error);
  }
  
  // Find most common error type
  let mostCommonType = null;
  let maxCount = 0;
  
  for (const [type, errors] of Object.entries(errorsByType)) {
    if (errors.length > maxCount) {
      mostCommonType = type;
      maxCount = errors.length;
    }
  }
  
  return {
    patternName: "Medication Error Type",
    detected: true,
    severity: maxCount >= 2 ? "HIGH" : "MODERATE",
    priority: "HIGH",
    data: {
      totalErrors: allErrors.length,
      mostCommonType: mostCommonType,
      errorCount: maxCount,
      errorsByType: errorsByType,
      allErrors: allErrors
    },
    educationalFocus: `Recurring ${mostCommonType} errors - specific pharmacology knowledge gap`,
    aarTalkingPoint: `I need to address a safety concern: you made ${allErrors.length} medication errors across the scenarios, with ${maxCount} being ${mostCommonType} errors. This suggests a specific gap in pharmacology knowledge. Let's discuss why ${mostCommonType} is particularly important to understand—these errors can cause immediate patient harm.`
  };
}

categorizeMedicationError(error) {
  const actionLower = error.action.toLowerCase();
  
  // Contraindication errors
  if (actionLower.includes('beta') || actionLower.includes('blocker') ||
      actionLower.includes('apaurin') || actionLower.includes('benzodiazepine')) {
    return 'contraindication';
  }
  
  // Dosing errors
  if (actionLower.includes('dose') || actionLower.includes('mg') || 
      actionLower.includes('overdose')) {
    return 'dosing';
  }
  
  // Timing errors
  if (actionLower.includes('delay') || actionLower.includes('late')) {
    return 'timing';
  }
  
  // Route errors
  if (actionLower.includes('route') || actionLower.includes('IV') || 
      actionLower.includes('IM')) {
    return 'route';
  }
  
  return 'other';
}

analyzeDeteriorationPrevention(allScenariosData) {
  const outcomes = [];
  
  for (const scenario of allScenariosData) {
    if (!scenario.stateHistory || scenario.stateHistory.length === 0) continue;
    
    // Check final state
    const finalState = scenario.stateHistory[scenario.stateHistory.length - 1];
    const reachedCritical = scenario.stateHistory.some(s => s.state === 'critical');
    const reachedDeteriorating = scenario.stateHistory.some(s => s.state === 'deteriorating');
    
    outcomes.push({
      scenario: scenario.scenarioId,
      finalState: finalState.state,
      reachedCritical: reachedCritical,
      reachedDeteriorating: reachedDeteriorating,
      prevented: finalState.state === 'improving' || 
                 (finalState.state === 'initial' && !reachedCritical)
    });
  }
  
  const preventedCount = outcomes.filter(o => o.prevented).length;
  const criticalCount = outcomes.filter(o => o.reachedCritical).length;
  
  return {
    patternName: "Deterioration Prevention",
    detected: true,
    isStrength: preventedCount >= 2,
    severity: criticalCount >= 2 ? "HIGH" : criticalCount === 1 ? "MODERATE" : "LOW",
    priority: criticalCount >= 2 ? "HIGH" : "MEDIUM",
    data: {
      preventedDeteriorationCount: preventedCount,
      reachedCriticalCount: criticalCount,
      outcomes: outcomes
    },
    educationalFocus: preventedCount >= 2
      ? "Excellent proactive care - consistently prevented patient deterioration"
      : "Reactive care pattern - patients frequently reached critical state before stabilization",
    aarTalkingPoint: criticalCount >= 2
      ? `I see a pattern in patient outcomes: in ${criticalCount} out of 3 scenarios, the patient reached critical state. Our goal is to prevent that deterioration through early, aggressive treatment. ${outcomes.filter(o => o.reachedCritical).map(o => `In the ${o.scenario}, the patient reached critical state`).join(', ')}. Let's discuss how earlier intervention could have prevented these outcomes.`
      : `Excellent work preventing deterioration—in ${preventedCount} scenarios, you kept the patient stable or improving without reaching critical state. That proactive approach is exactly what we're looking for.`
  };
}
```

**Testing Checkpoint:**
- ✅ Correctly categorizes medication errors
- ✅ Detects deterioration patterns from state history
- ✅ Generates appropriate severity levels
- ✅ Provides actionable feedback

---

## **PHASE 3: PRIORITY 2 PATTERNS (5-6 hours)**

### **Task 3.1: Implement P2 Decision Quality Pattern (2.3)**
**Duration:** 1 hour  
**File:** `server/services/patternAnalysisService.js`

```javascript
analyzeHighStakesPerformance(allScenariosData) {
  const highStakesCDPs = [];
  const regularCDPs = [];
  
  for (const scenario of allScenariosData) {
    if (!scenario.cdpEvaluations) continue;
    
    for (const cdp of scenario.cdpEvaluations) {
      // Determine if high-stakes based on teaching point or score
      const isHighStakes = 
        (cdp.teachingPoint && 
         (cdp.teachingPoint.toLowerCase().includes('life-threatening') ||
          cdp.teachingPoint.toLowerCase().includes('critical') ||
          cdp.teachingPoint.toLowerCase().includes('arrest'))) ||
        cdp.score === 'dangerous';
      
      const cdpData = {
        scenario: scenario.scenarioId,
        decision: cdp.decision,
        score: cdp.score,
        isOptimal: cdp.score === 'optimal'
      };
      
      if (isHighStakes) {
        highStakesCDPs.push(cdpData);
      } else {
        regularCDPs.push(cdpData);
      }
    }
  }
  
  if (highStakesCDPs.length === 0) {
    return {
      patternName: "High-Stakes Decision Making",
      detected: false,
      data: { message: "Insufficient high-stakes decisions to analyze" }
    };
  }
  
  const highStakesOptimal = highStakesCDPs.filter(c => c.isOptimal).length;
  const regularOptimal = regularCDPs.filter(c => c.isOptimal).length;
  
  const highStakesRate = highStakesCDPs.length > 0 ? highStakesOptimal / highStakesCDPs.length : 0;
  const regularRate = regularCDPs.length > 0 ? regularOptimal / regularCDPs.length : 0;
  
  const performanceGap = regularRate - highStakesRate;
  const hasSignificantGap = performanceGap > 0.3; // 30% drop
  
  return {
    patternName: "High-Stakes Decision Making",
    detected: hasSignificantGap,
    severity: performanceGap > 0.5 ? "HIGH" : performanceGap > 0.3 ? "MODERATE" : "LOW",
    priority: hasSignificantGap ? "HIGH" : "MEDIUM",
    data: {
      highStakesPerformance: `${Math.round(highStakesRate * 100)}%`,
      regularPerformance: `${Math.round(regularRate * 100)}%`,
      performanceGap: `${Math.round(performanceGap * 100)}%`,
      highStakesCount: highStakesCDPs.length,
      regularCount: regularCDPs.length,
      highStakesOptimalCount: highStakesOptimal,
      regularOptimalCount: regularOptimal
    },
    educationalFocus: hasSignificantGap
      ? "Performance degrades significantly under highest pressure - pressure management and confidence building needed"
      : "Consistent performance across all decision types - handles pressure well",
    aarTalkingPoint: hasSignificantGap
      ? `Interesting pattern: your performance on routine decisions was ${Math.round(regularRate * 100)}% optimal, but dropped to ${Math.round(highStakesRate * 100)}% on life-threatening decisions. That's a ${Math.round(performanceGap * 100)}% performance gap. You clearly have the knowledge—the challenge seems to be applying it under maximum pressure. How did you feel during those critical moments? What was different?`
      : `Strong performance under pressure—your decision quality remained consistent whether dealing with routine or life-threatening situations (${Math.round(regularRate * 100)}% vs ${Math.round(highStakesRate * 100)}% optimal). That mental resilience is exactly what emergency medicine requires.`
  };
}
```

---

### **Task 3.2: Implement P2 Clinical Reasoning Patterns (3.2, 3.3)**
**Duration:** 1.5 hours  
**File:** `server/services/patternAnalysisService.js`

```javascript
analyzeReactiveVsProactive(allScenariosData) {
  const treatmentTimings = [];
  
  for (const scenario of allScenariosData) {
    if (!scenario.stateHistory || !scenario.criticalActionsLog) continue;
    
    // Find when patient first deteriorated
    const firstDeterioration = scenario.stateHistory
      .find(s => s.state === 'deteriorating' || s.state === 'critical');
    
    // Find when first critical treatment was given
    const firstCriticalTreatment = scenario.criticalActionsLog
      .find(a => a.category === 'treatment' && 
                 (a.action.toLowerCase().includes('oxygen') ||
                  a.action.toLowerCase().includes('salbutamol') ||
                  a.action.toLowerCase().includes('aspirin') ||
                  a.action.toLowerCase().includes('epinephrine') ||
                  a.action.toLowerCase().includes('iv')));
    
    if (firstCriticalTreatment) {
      const deteriorationTime = firstDeterioration ? firstDeterioration.timeSinceStart : Infinity;
      const treatmentTime = firstCriticalTreatment.timeSinceStart;
      const isProactive = treatmentTime < deteriorationTime;
      
      treatmentTimings.push({
        scenario: scenario.scenarioId,
        treatmentTime: treatmentTime,
        deteriorationTime: deteriorationTime === Infinity ? 'never' : deteriorationTime,
        proactive: isProactive,
        treatment: firstCriticalTreatment.action
      });
    }
  }
  
  if (treatmentTimings.length === 0) {
    return {
      patternName: "Reactive vs. Proactive Management",
      detected: false,
      data: { message: "Insufficient data to determine care style" }
    };
  }
  
  const proactiveCount = treatmentTimings.filter(t => t.proactive).length;
  const isProactive = proactiveCount >= 2;
  
  return {
    patternName: "Reactive vs. Proactive Management",
    detected: true,
    isStrength: isProactive,
    priority: isProactive ? "MEDIUM" : "HIGH",
    data: {
      careStyle: isProactive ? "PROACTIVE" : "REACTIVE",
      proactiveScenarios: proactiveCount,
      reactiveScenarios: 3 - proactiveCount,
      timings: treatmentTimings
    },
    educationalFocus: isProactive
      ? "Anticipatory care style - treats before crisis develops"
      : "Reactive care style - tends to treat after deterioration begins",
    aarTalkingPoint: !isProactive
      ? `I notice you tended to treat after the patient was already deteriorating. In ${3 - proactiveCount} scenarios, critical treatments came after the patient had already reached deteriorating or critical state. ${treatmentTimings.filter(t => !t.proactive).map(t => `In the ${t.scenario}, ${t.treatment} came at ${Math.round(t.treatmentTime/60)} minutes, after deterioration at ${Math.round(t.deteriorationTime/60)} minutes`).join('. ')}. The goal is to anticipate and prevent that deterioration. What signals could you use to trigger earlier treatment?`
      : `Excellent proactive approach—you treated before deterioration occurred in ${proactiveCount} scenarios. That anticipatory style prevents crises rather than just responding to them. You're thinking ahead, which is exactly what strong paramedics do.`
  };
}

analyzeReassessmentFrequency(allScenariosData) {
  const reassessmentData = [];
  
  for (const scenario of allScenariosData) {
    if (!scenario.criticalActionsLog) continue;
    
    const treatments = scenario.criticalActionsLog
      .filter(a => a.category === 'treatment');
    
    const assessments = scenario.criticalActionsLog
      .filter(a => a.category === 'assessment');
    
    let reassessmentCount = 0;
    
    // For each treatment, check if there's a follow-up assessment within 5 minutes
    for (const treatment of treatments) {
      const followUpAssessment = assessments.find(a => 
        a.timeSinceStart > treatment.timeSinceStart &&
        a.timeSinceStart < treatment.timeSinceStart + 300 // Within 5 minutes
      );
      
      if (followUpAssessment) {
        reassessmentCount++;
      }
    }
    
    const reassessmentRate = treatments.length > 0 ? reassessmentCount / treatments.length : 0;
    
    reassessmentData.push({
      scenario: scenario.scenarioId,
      treatmentsGiven: treatments.length,
      reassessmentsMade: reassessmentCount,
      rate: reassessmentRate
    });
  }
  
  if (reassessmentData.length === 0) {
    return {
      patternName: "Reassessment Frequency",
      detected: false,
      data: { message: "Insufficient treatment data to analyze reassessment" }
    };
  }
  
  const avgRate = reassessmentData.reduce((sum, r) => sum + r.rate, 0) / reassessmentData.length;
  const isAdequate = avgRate >= 0.5;
  
  return {
    patternName: "Reassessment Frequency",
    detected: true,
    isStrength: avgRate >= 0.7,
    priority: avgRate < 0.4 ? "HIGH" : "MEDIUM",
    data: {
      adequacy: avgRate >= 0.7 ? "EXCELLENT" : avgRate >= 0.4 ? "ADEQUATE" : "INSUFFICIENT",
      averageRate: `${Math.round(avgRate * 100)}%`,
      byScenario: reassessmentData
    },
    educationalFocus: avgRate < 0.4
      ? "Missing feedback loop - not consistently checking if treatments are working"
      : avgRate >= 0.7 
        ? "Excellent closed-loop practice - consistently verifying treatment effectiveness"
        : "Adequate reassessment - could be more consistent",
    aarTalkingPoint: avgRate < 0.4
      ? `You gave treatments but didn't consistently check if they were working. Only ${Math.round(avgRate * 100)}% of treatments were followed by reassessment within 5 minutes. That's a critical gap—we need to close the loop and verify our interventions are effective. For example, if you give oxygen, you should recheck SpO2. If you give pain medication, you should recheck pain score. This feedback loop tells you if you're helping the patient or need to change your approach.`
      : `Excellent practice checking your treatments—${Math.round(avgRate * 100)}% of your interventions were followed by reassessment. That closed-loop approach is exactly what we want. You treat, you reassess, you adjust. That's clinical medicine done right.`
  };
}
```

---

### **Task 3.3: Implement P2 Cognitive Load and Meta-Patterns (5.3, 8.1)**
**Duration:** 1.5 hours  
**File:** `server/services/patternAnalysisService.js`

```javascript
analyzeChallengePointQuality(allScenariosData) {
  // This requires challenge point data from scenarios
  // Assuming it's stored in scenario.challengePointsUsed
  
  const allChallengeResponses = [];
  
  for (const scenario of allScenariosData) {
    if (!scenario.challengePointsUsed || scenario.challengePointsUsed.length === 0) continue;
    
    for (const cp of scenario.challengePointsUsed) {
      allChallengeResponses.push({
        scenario: scenario.scenarioId,
        quality: cp.quality, // 'good_reasoning' | 'protocol_only' | 'struggling'
        question: cp.question
      });
    }
  }
  
  if (allChallengeResponses.length === 0) {
    return {
      patternName: "Challenge Point Reasoning Quality",
      detected: false,
      data: { message: "No challenge point data available (feature may be disabled)" }
    };
  }
  
  const goodReasoningCount = allChallengeResponses.filter(r => r.quality === 'good_reasoning').length;
  const protocolOnlyCount = allChallengeResponses.filter(r => r.quality === 'protocol_only').length;
  const strugglingCount = allChallengeResponses.filter(r => r.quality === 'struggling').length;
  const total = allChallengeResponses.length;
  
  const goodRate = goodReasoningCount / total;
  
  return {
    patternName: "Challenge Point Reasoning Quality",
    detected: true,
    isStrength: goodRate >= 0.6,
    priority: "MEDIUM",
    data: {
      totalChallenges: total,
      goodReasoningCount: goodReasoningCount,
      protocolOnlyCount: protocolOnlyCount,
      strugglingCount: strugglingCount,
      goodReasoningRate: `${Math.round(goodRate * 100)}%`,
      distribution: {
        good: Math.round(goodRate * 100),
        protocol: Math.round((protocolOnlyCount / total) * 100),
        struggling: Math.round((strugglingCount / total) * 100)
      }
    },
    educationalFocus: goodRate >= 0.6
      ? "Strong clinical reasoning - consistently goes beyond protocols to understand WHY"
      : protocolOnlyCount > goodReasoningCount
        ? "Protocol-focused reasoning - needs to develop deeper clinical thinking"
        : "Struggling with clinical reasoning under pressure - needs fundamentals reinforcement",
    aarTalkingPoint: goodRate >= 0.6
      ? `When you were challenged to explain your reasoning, ${Math.round(goodRate * 100)}% of your responses showed good clinical thinking—you went beyond just citing protocols to explain WHY. That depth of understanding is what makes an excellent paramedic. You're not just following recipes; you're understanding the medicine.`
      : protocolOnlyCount > goodReasoningCount
        ? `I noticed that when challenged to explain your reasoning, you primarily referenced protocols (${Math.round((protocolOnlyCount / total) * 100)}% of responses). Protocols are important, but understanding WHY the protocol says what it says makes you more adaptable when cases don't fit the textbook. Let's work on developing that deeper clinical thinking.`
        : `When challenged to explain your reasoning, you struggled more than expected (${Math.round((strugglingCount / total) * 100)}% of responses). This suggests we need to strengthen your foundational understanding. It's okay not to know everything, but we want to build your confidence in thinking through clinical problems systematically.`
  };
}

analyzeConsistencyIndex(allScenariosData) {
  // Calculate variance in key metrics across scenarios
  
  // Collect scores
  const scores = allScenariosData
    .filter(s => s.score && s.score.percentage !== undefined)
    .map(s => s.score.percentage);
  
  if (scores.length < 3) {
    return {
      patternName: "Consistency Index",
      detected: false,
      data: { message: "Insufficient scoring data to calculate consistency" }
    };
  }
  
  // Calculate mean and standard deviation
  const mean = scores.reduce((sum, s) => sum + s, 0) / scores.length;
  const variance = scores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / scores.length;
  const stdDev = Math.sqrt(variance);
  
  // Calculate coefficient of variation (CV) - normalized measure of variability
  const cv = (stdDev / mean) * 100;
  
  // Consistency categories:
  // CV < 15% = Very Consistent
  // CV 15-25% = Moderately Consistent
  // CV > 25% = Inconsistent
  
  const isConsistent = cv < 25;
  
  return {
    patternName: "Consistency Index",
    detected: true,
    isStrength: cv < 15,
    priority: cv > 25 ? "HIGH" : "MEDIUM",
    data: {
      consistency: cv < 15 ? "VERY CONSISTENT" : cv < 25 ? "MODERATELY CONSISTENT" : "INCONSISTENT",
      coefficientOfVariation: Math.round(cv),
      standardDeviation: Math.round(stdDev),
      meanScore: Math.round(mean),
      scores: scores,
      interpretation: cv < 15 
        ? "Performance is reliable and predictable"
        : cv < 25
          ? "Performance shows some variability but within acceptable range"
          : "Performance is highly variable - suggests context-dependent competence"
    },
    educationalFocus: cv < 15
      ? "Highly reliable performer - consistent quality across different scenarios"
      : cv > 25
        ? "Performance varies significantly by scenario type - competence is context-dependent"
        : "Moderate performance variability - generally consistent with some fluctuation",
    aarTalkingPoint: cv > 25
      ? `Your performance varied significantly across the three scenarios: ${scores.map((s, i) => `Scenario ${i+1}: ${s}%`).join(', ')}. That's a ${Math.round(stdDev)} point standard deviation. This suggests your competence is context-dependent—you perform well in some situations but struggle in others. Let's identify what scenarios challenge you most so we can target that practice.`
      : cv < 15
        ? `Your performance was remarkably consistent across all three scenarios: ${scores.map((s, i) => `${s}%`).join(', ')} (average ${Math.round(mean)}%). That reliability is exactly what we want to see in emergency medicine. You can be counted on to deliver consistent quality regardless of the situation.`
        : `Your performance showed moderate consistency across scenarios: ${scores.map((s, i) => `${s}%`).join(', ')}. There's some variability (${Math.round(stdDev)} point range), but overall you're reasonably reliable. As you gain more experience, that consistency will tighten up even further.`
  };
}
```

---

### **Task 3.4: Implement P2 Patient Awareness Pattern (6.1)**
**Duration:** 1 hour  
**File:** `server/services/patternAnalysisService.js`

```javascript
analyzeStateTransitionRecognition(allScenariosData) {
  const recognitionData = [];
  
  for (const scenario of allScenariosData) {
    if (!scenario.stateHistory || !scenario.criticalActionsLog) continue;
    
    // Find state transitions
    const transitions = [];
    for (let i = 1; i < scenario.stateHistory.length; i++) {
      const prevState = scenario.stateHistory[i - 1];
      const currState = scenario.stateHistory[i];
      
      if (prevState.state !== currState.state) {
        transitions.push({
          from: prevState.state,
          to: currState.state,
          time: currState.timeSinceStart
        });
      }
    }
    
    // For each transition, check if student acknowledged it
    for (const transition of transitions) {
      // Look for assessment action within 2 minutes after transition
      const acknowledgment = scenario.criticalActionsLog.find(a =>
        a.category === 'assessment' &&
        a.timeSinceStart > transition.time &&
        a.timeSinceStart < transition.time + 120 // Within 2 minutes
      );
      
      recognitionData.push({
        scenario: scenario.scenarioId,
        transition: `${transition.from} → ${transition.to}`,
        transitionTime: transition.time,
        recognized: !!acknowledgment,
        recognitionAction: acknowledgment?.action
      });
    }
  }
  
  if (recognitionData.length === 0) {
    return {
      patternName: "State Transition Recognition",
      detected: false,
      data: { message: "No state transitions occurred to analyze" }
    };
  }
  
  const recognizedCount = recognitionData.filter(r => r.recognized).length;
  const recognitionRate = recognizedCount / recognitionData.length;
  
  return {
    patternName: "State Transition Recognition",
    detected: true,
    isStrength: recognitionRate >= 0.6,
    priority: recognitionRate < 0.4 ? "HIGH" : "MEDIUM",
    data: {
      totalTransitions: recognitionData.length,
      recognizedCount: recognizedCount,
      missedCount: recognitionData.length - recognizedCount,
      recognitionRate: `${Math.round(recognitionRate * 100)}%`,
      transitions: recognitionData
    },
    educationalFocus: recognitionRate >= 0.6
      ? "Good situational awareness - recognizes when patient condition changes"
      : "Poor situational awareness - often misses when patient condition changes",
    aarTalkingPoint: recognitionRate < 0.6
      ? `I notice you missed ${recognitionData.length - recognizedCount} out of ${recognitionData.length} state changes in the patients. ${recognitionData.filter(r => !r.recognized).map(r => `In ${r.scenario}, when the patient transitioned from ${r.transition} at ${Math.round(r.transitionTime/60)} minutes, you didn't reassess to notice the change`).slice(0, 2).join('. ')}. Recognizing when your patient is getting better or worse is critical—it tells you if your treatments are working or if you need to escalate care. This requires active monitoring, not just treating and walking away.`
      : `Excellent situational awareness—you recognized ${Math.round(recognitionRate * 100)}% of patient state changes and adjusted your care accordingly. That's exactly the kind of adaptive thinking emergency medicine requires.`
  };
}
```

---

## **PHASE 4: PRIORITY 3 PATTERNS (5-6 hours)**

### **Task 4.1: Implement P3 Clinical Reasoning Pattern (3.4)**
**Duration:** 1.5 hours  
**File:** `server/services/patternAnalysisService.js`

```javascript
analyzeDifferentialConsideration(allScenariosData) {
  // This is a complex pattern requiring analysis of student messages for evidence of differential thinking
  // For MVP, we'll use proxy indicators: multiple assessment types, challenge point responses
  
  const differentialEvidence = [];
  
  for (const scenario of allScenariosData) {
    if (!scenario.criticalActionsLog) continue;
    
    // Count different types of assessments
    const assessmentTypes = new Set();
    const assessments = scenario.criticalActionsLog.filter(a => a.category === 'assessment');
    
    for (const assessment of assessments) {
      const type = this.categorizeAssessmentType(assessment.action);
      if (type !== 'other') {
        assessmentTypes.add(type);
      }
    }
    
    // Check for challenge point responses about differential thinking
    let consideredAlternatives = false;
    if (scenario.challengePointsUsed) {
      consideredAlternatives = scenario.challengePointsUsed.some(cp =>
        cp.quality === 'good_reasoning' &&
        (cp.question.toLowerCase().includes('differential') ||
         cp.question.toLowerCase().includes('alternative') ||
         cp.question.toLowerCase().includes('could'))
      );
    }
    
    const diversityScore = assessmentTypes.size;
    const hasGoodDifferential = diversityScore >= 4 || consideredAlternatives;
    
    differentialEvidence.push({
      scenario: scenario.scenarioId,
      assessmentDiversity: diversityScore,
      assessmentTypes: Array.from(assessmentTypes),
      consideredAlternatives: consideredAlternatives,
      hasGoodDifferential: hasGoodDifferential
    });
  }
  
  const goodDifferentialCount = differentialEvidence.filter(e => e.hasGoodDifferential).length;
  const avgDiversity = differentialEvidence.reduce((sum, e) => sum + e.assessmentDiversity, 0) / differentialEvidence.length;
  
  return {
    patternName: "Differential Diagnosis Consideration",
    detected: true,
    isStrength: goodDifferentialCount >= 2,
    priority: goodDifferentialCount === 0 ? "HIGH" : "MEDIUM",
    data: {
      scenariosWithGoodDifferential: goodDifferentialCount,
      averageAssessmentDiversity: Math.round(avgDiversity * 10) / 10,
      byScenario: differentialEvidence
    },
    educationalFocus: goodDifferentialCount >= 2
      ? "Good differential thinking - considers multiple possibilities before committing"
      : goodDifferentialCount === 1
        ? "Inconsistent differential thinking - sometimes considers alternatives, sometimes tunnels"
        : "Premature closure risk - tends to commit to first impression without considering alternatives",
    aarTalkingPoint: goodDifferentialCount === 0
      ? `I notice you tended to commit to your first impression quickly without much assessment to rule out other possibilities. The average assessment diversity across scenarios was ${Math.round(avgDiversity)}, suggesting narrow focus. In emergency medicine, premature closure—jumping to the first diagnosis that fits—is a major cause of errors. Even when you're confident, it's worth asking "What else could this be?" and doing targeted assessments to rule out dangerous alternatives.`
      : goodDifferentialCount >= 2
        ? `Excellent differential thinking—you consistently performed diverse assessments (average ${Math.round(avgDiversity)} different assessment types per scenario) and, based on your challenge responses, considered alternative diagnoses before committing. That broader thinking prevents premature closure and catches the unusual cases that don't fit the textbook.`
        : `Your differential thinking was inconsistent. In ${differentialEvidence.find(e => e.hasGoodDifferential)?.scenario || 'one scenario'}, you demonstrated good consideration of alternatives, but in others you focused more narrowly. Developing that habit of always asking "What else could this be?" will make you a more complete diagnostician.`
  };
}

categorizeAssessmentType(action) {
  const actionLower = action.toLowerCase();
  
  if (actionLower.includes('lung') || actionLower.includes('chest auscultation') || 
      actionLower.includes('breath sounds')) return 'respiratory';
  if (actionLower.includes('heart') || actionLower.includes('cardiac') || 
      actionLower.includes('pulse')) return 'cardiac';
  if (actionLower.includes('neuro') || actionLower.includes('gcs') || 
      actionLower.includes('pupils')) return 'neurological';
  if (actionLower.includes('skin') || actionLower.includes('perfusion') || 
      actionLower.includes('capillary')) return 'perfusion';
  if (actionLower.includes('abdomen') || actionLower.includes('palpation')) return 'abdominal';
  if (actionLower.includes('history') || actionLower.includes('interview')) return 'history';
  if (actionLower.includes('vital') || actionLower.includes('bp') || 
      actionLower.includes('spo2')) return 'vitals';
  
  return 'other';
}
```

---

### **Task 4.2: Implement P3 Cognitive Load Pattern (5.1)**
**Duration:** 1.5 hours  
**File:** `server/services/patternAnalysisService.js`

```javascript
analyzeInformationOrganization(allScenariosData) {
  // This pattern requires analyzing student message structure and quality
  // We'll use proxy indicators: action sequence logic, error rate over time
  
  const organizationData = [];
  
  for (const scenario of allScenariosData) {
    if (!scenario.criticalActionsLog) continue;
    
    // Analyze early vs. late performance
    const totalTime = scenario.totalTime;
    const midpoint = totalTime / 2;
    
    const earlyActions = scenario.criticalActionsLog.filter(a => a.timeSinceStart < midpoint);
    const lateActions = scenario.criticalActionsLog.filter(a => a.timeSinceStart >= midpoint);
    
    // Count errors in each half
    const earlyErrors = earlyActions.filter(a => a.category === 'error').length;
    const lateErrors = lateActions.filter(a => a.category === 'error').length;
    
    // Check if systematic approach maintained
    const earlySequence = earlyActions.slice(0, 5).map(a => this.categorizeActionType(a.action));
    const lateSequence = lateActions.slice(0, 5).map(a => this.categorizeActionType(a.action));
    
    const earlySystematic = this.followsABCPattern(earlySequence);
    const lateSystematic = this.followsABCPattern(lateSequence);
    
    // Calculate organization score
    const deteriorationScore = (lateErrors > earlyErrors) ? 1 : 0;
    const systematicLossScore = (earlySystematic && !lateSystematic) ? 1 : 0;
    const organizationScore = 2 - (deteriorationScore + systematicLossScore);
    
    organizationData.push({
      scenario: scenario.scenarioId,
      earlyErrors: earlyErrors,
      lateErrors: lateErrors,
      earlySystematic: earlySystematic,
      lateSystematic: lateSystematic,
      organizationScore: organizationScore,
      showsCognitiveOverload: organizationScore < 2
    });
  }
  
  const overloadCount = organizationData.filter(o => o.showsCognitiveOverload).length;
  const avgOrganizationScore = organizationData.reduce((sum, o) => sum + o.organizationScore, 0) / organizationData.length;
  
  return {
    patternName: "Information Organization",
    detected: true,
    isStrength: avgOrganizationScore >= 1.5,
    severity: avgOrganizationScore < 1.0 ? "HIGH" : avgOrganizationScore < 1.5 ? "MODERATE" : "LOW",
    priority: overloadCount >= 2 ? "HIGH" : "MEDIUM",
    data: {
      averageOrganizationScore: Math.round(avgOrganizationScore * 10) / 10,
      scenariosShowingOverload: overloadCount,
      organizationQuality: avgOrganizationScore >= 1.5 ? "GOOD" : avgOrganizationScore >= 1.0 ? "ADEQUATE" : "POOR",
      byScenario: organizationData
    },
    educationalFocus: avgOrganizationScore < 1.5
      ? "Performance degrades over time within scenarios - cognitive load management needed"
      : "Maintains organization under sustained pressure - good mental stamina",
    aarTalkingPoint: overloadCount >= 2
      ? `I notice a pattern in ${overloadCount} scenarios: your performance was stronger early in the case but degraded as time went on. ${organizationData.filter(o => o.showsCognitiveOverload).map(o => `In ${o.scenario}, you had ${o.earlyErrors} errors early but ${o.lateErrors} errors later, ${o.earlySystematic && !o.lateSystematic ? 'and you lost your systematic approach' : ''}`).slice(0, 2).join('; ')}. This suggests cognitive overload—as information accumulated, your ability to organize it decreased. We talked about the "Simplify and Focus" technique in the warm-up. When you feel that complexity building, that's when to return to your basic frameworks: ABC assessment, treat what's killing them now. Your brain organizes better with simple structures you know cold.`
      : `Strong mental organization—you maintained systematic thinking and low error rates throughout the scenarios, even as complexity increased. That cognitive stamina is impressive and critical for long or complex calls.`
  };
}
```

---

### **Task 4.3: Implement P3 Communication Patterns (7.1, 7.2)**
**Duration:** 1.5 hours  
**File:** `server/services/patternAnalysisService.js`

```javascript
analyzeDocumentationSpecificity(allScenariosData) {
  // This requires analyzing student messages for specificity
  // For MVP, we'll analyze action descriptions for specific vs. vague language
  
  const specificityData = [];
  
  for (const scenario of allScenariosData) {
    if (!scenario.criticalActionsLog) continue;
    
    let specificCount = 0;
    let vagueCount = 0;
    
    for (const action of scenario.criticalActionsLog) {
      if (action.category !== 'treatment') continue;
      
      const isSpecific = this.isActionSpecific(action.action);
      
      if (isSpecific) {
        specificCount++;
      } else {
        vagueCount++;
      }
    }
    
    const totalTreatments = specificCount + vagueCount;
    const specificityRate = totalTreatments > 0 ? specificCount / totalTreatments : 0;
    
    specificityData.push({
      scenario: scenario.scenarioId,
      specificCount: specificCount,
      vagueCount: vagueCount,
      specificityRate: specificityRate
    });
  }
  
  if (specificityData.length === 0) {
    return {
      patternName: "Documentation Specificity",
      detected: false,
      data: { message: "Insufficient treatment data to analyze specificity" }
    };
  }
  
  const avgSpecificityRate = specificityData.reduce((sum, s) => sum + s.specificityRate, 0) / specificityData.length;
  
  return {
    patternName: "Documentation Specificity",
    detected: true,
    isStrength: avgSpecificityRate >= 0.7,
    priority: avgSpecificityRate < 0.4 ? "MEDIUM" : "LOW",
    data: {
      averageSpecificityRate: `${Math.round(avgSpecificityRate * 100)}%`,
      specificityQuality: avgSpecificityRate >= 0.7 ? "EXCELLENT" : avgSpecificityRate >= 0.5 ? "ADEQUATE" : "POOR",
      byScenario: specificityData
    },
    educationalFocus: avgSpecificityRate >= 0.7
      ? "Excellent documentation specificity - professional-level communication"
      : "Documentation needs more specificity - too many vague descriptions",
    aarTalkingPoint: avgSpecificityRate < 0.5
      ? `Your treatment documentation could be more specific. About ${Math.round((1 - avgSpecificityRate) * 100)}% of your treatment descriptions were vague—things like "give oxygen" instead of "15L via non-rebreather mask." In professional documentation and hospital handoff, specificity matters. It tells the receiving team exactly what you did, helps with quality assurance, and protects you legally. Practice being specific: drug name, dose, route, time, response.`
      : `Excellent documentation specificity—${Math.round(avgSpecificityRate * 100)}% of your treatment descriptions included specific details like doses, routes, and delivery methods. That professional-level documentation will serve you well in the field and during hospital handoffs.`
  };
}

isActionSpecific(action) {
  const actionLower = action.toLowerCase();
  
  // Check for specific indicators
  const hasNumbers = /\d/.test(action);
  const hasRoute = actionLower.includes('iv') || actionLower.includes('im') || 
                   actionLower.includes('po') || actionLower.includes('sl') ||
                   actionLower.includes('nebulized') || actionLower.includes('inhaled');
  const hasDose = actionLower.includes('mg') || actionLower.includes('mcg') || 
                  actionLower.includes('ml') || actionLower.includes('l/min') ||
                  actionLower.includes('liters');
  const hasDevice = actionLower.includes('mask') || actionLower.includes('cannula') || 
                    actionLower.includes('tube') || actionLower.includes('needle');
  
  // Specific if has at least 2 of these indicators
  const specificityScore = [hasNumbers, hasRoute, hasDose, hasDevice].filter(Boolean).length;
  
  return specificityScore >= 2;
}

analyzePatientCenteredLanguage(allScenariosData) {
  // This is challenging to implement without NLP
  // For MVP, we'll use challenge point responses as proxy
  
  const communicationData = [];
  
  for (const scenario of allScenariosData) {
    if (!scenario.challengePointsUsed) continue;
    
    // Look for challenge points about communication
    const communicationChallenges = scenario.challengePointsUsed.filter(cp =>
      cp.question.toLowerCase().includes('patient') ||
      cp.question.toLowerCase().includes('communication') ||
      cp.question.toLowerCase().includes('explain') ||
      cp.question.toLowerCase().includes('anxious')
    );
    
    if (communicationChallenges.length > 0) {
      const goodCommunication = communicationChallenges.some(cp => 
        cp.quality === 'good_reasoning'
      );
      
      communicationData.push({
        scenario: scenario.scenarioId,
        challengesPresent: true,
        goodCommunication: goodCommunication
      });
    }
  }
  
  if (communicationData.length === 0) {
    return {
      patternName: "Patient-Centered Language",
      detected: false,
      data: { 
        message: "No patient communication challenges present to analyze this pattern",
        note: "This pattern requires communication-focused challenge points"
      }
    };
  }
  
  const goodCommunicationCount = communicationData.filter(d => d.goodCommunication).length;
  const rate = goodCommunicationCount / communicationData.length;
  
  return {
    patternName: "Patient-Centered Language",
    detected: true,
    isStrength: rate >= 0.6,
    priority: "LOW",
    data: {
      scenariosWithCommunicationChallenges: communicationData.length,
      goodCommunicationCount: goodCommunicationCount,
      rate: `${Math.round(rate * 100)}%`
    },
    educationalFocus: rate >= 0.6
      ? "Good patient-centered communication - considers patient perspective"
      : "Communication needs work - tends toward technical focus over patient perspective",
    aarTalkingPoint: rate >= 0.6
      ? `When challenged about patient communication, ${Math.round(rate * 100)}% of your responses showed good patient-centered thinking—you considered how the patient feels, used accessible language, and demonstrated empathy. That bedside manner matters as much as your clinical skills.`
      : `When challenged about patient communication, you tended to focus more on technical aspects than the patient's perspective. Remember, patients are scared and don't speak medical. Taking 30 seconds to explain what you're doing in plain language, acknowledging their fear, and including them in decisions builds trust and improves outcomes.`
  };
}
```

---

### **Task 4.4: Implement P3 Meta-Pattern (8.4)**
**Duration:** 1.5 hours  
**File:** `server/services/patternAnalysisService.js`

```javascript
analyzeRiskToleranceProfile(allScenariosData) {
  // Analyze treatment choices to determine if student is risk-averse or aggressive
  
  const treatmentChoices = [];
  
  for (const scenario of allScenariosData) {
    if (!scenario.criticalActionsLog) continue;
    
    const treatments = scenario.criticalActionsLog.filter(a => a.category === 'treatment');
    
    // Classify each treatment as conservative, appropriate, or aggressive
    for (const treatment of treatments) {
      const classification = this.classifyTreatmentRisk(treatment, scenario);
      if (classification !== 'unknown') {
        treatmentChoices.push({
          scenario: scenario.scenarioId,
          treatment: treatment.action,
          classification: classification,
          timing: treatment.timeSinceStart
        });
      }
    }
  }
  
  if (treatmentChoices.length === 0) {
    return {
      patternName: "Risk Tolerance Profile",
      detected: false,
      data: { message: "Insufficient treatment data to determine risk profile" }
    };
  }
  
  const conservativeCount = treatmentChoices.filter(t => t.classification === 'conservative').length;
  const appropriateCount = treatmentChoices.filter(t => t.classification === 'appropriate').length;
  const aggressiveCount = treatmentChoices.filter(t => t.classification === 'aggressive').length;
  
  const total = treatmentChoices.length;
  
  // Determine profile
  let profile;
  let concern = false;
  
  if (conservativeCount / total > 0.6) {
    profile = "RISK-AVERSE";
    concern = true;
  } else if (aggressiveCount / total > 0.4) {
    profile = "AGGRESSIVE";
    concern = true;
  } else {
    profile = "BALANCED";
    concern = false;
  }
  
  return {
    patternName: "Risk Tolerance Profile",
    detected: true,
    severity: concern ? "MODERATE" : "LOW",
    priority: concern ? "MEDIUM" : "LOW",
    data: {
      profile: profile,
      conservativeRate: `${Math.round((conservativeCount / total) * 100)}%`,
      appropriateRate: `${Math.round((appropriateCount / total) * 100)}%`,
      aggressiveRate: `${Math.round((aggressiveCount / total) * 100)}%`,
      distribution: {
        conservative: conservativeCount,
        appropriate: appropriateCount,
        aggressive: aggressiveCount
      }
    },
    educationalFocus: profile === "RISK-AVERSE"
      ? "Tends toward conservative treatment - may under-treat critical patients"
      : profile === "AGGRESSIVE"
        ? "Tends toward aggressive treatment - may over-treat or take unnecessary risks"
        : "Balanced risk tolerance - appropriately matches treatment intensity to patient condition",
    aarTalkingPoint: profile === "RISK-AVERSE"
      ? `I notice a pattern in your treatment choices: ${Math.round((conservativeCount / total) * 100)}% were conservative approaches. In emergency medicine, being cautious is generally good, but there's a risk of under-treating critical patients. For example, [specific example from data]. When someone's life is threatened, we sometimes need to be more aggressive with our interventions. The risk of treating is lower than the risk of not treating.`
      : profile === "AGGRESSIVE"
        ? `I notice you tend toward aggressive treatment choices (${Math.round((aggressiveCount / total) * 100)}% of treatments). While confidence is good, we need to match treatment intensity to actual patient condition. Every intervention carries risk, so we want to use the minimum effective treatment. For example, [specific example from data]. Remember: first, do no harm.`
        : `Your treatment choices showed good balance—${Math.round((appropriateCount / total) * 100)}% were appropriate for the patient's condition, neither overly conservative nor unnecessarily aggressive. That clinical judgment of matching treatment intensity to patient need is exactly what we're looking for.`
  };
}

classifyTreatmentRisk(treatment, scenario) {
  // This is a simplified classification
  // In production, this would reference the scenario's treatment guidelines
  
  const actionLower = treatment.action.toLowerCase();
  const patientState = this.getPatientStateAtTime(scenario, treatment.timeSinceStart);
  
  // Conservative: minimal intervention when more aggressive treatment indicated
  if (patientState === 'critical' || patientState === 'deteriorating') {
    if (actionLower.includes('monitor') || actionLower.includes('observe') ||
        actionLower.includes('position') || actionLower.includes('comfort')) {
      return 'conservative';
    }
  }
  
  // Aggressive: invasive intervention when less aggressive would suffice
  if (patientState === 'initial' || patientState === 'improving') {
    if (actionLower.includes('intubation') || actionLower.includes('cricothyrotomy') ||
        actionLower.includes('needle decompression') || 
        (actionLower.includes('epinephrine') && !actionLower.includes('anaphylaxis'))) {
      return 'aggressive';
    }
  }
  
  // Appropriate: treatment matches severity
  if ((patientState === 'critical' || patientState === 'deteriorating') &&
      (actionLower.includes('oxygen') || actionLower.includes('medication') ||
       actionLower.includes('iv') || actionLower.includes('treatment'))) {
    return 'appropriate';
  }
  
  if ((patientState === 'initial' || patientState === 'improving') &&
      (actionLower.includes('oxygen') || actionLower.includes('monitor') ||
       actionLower.includes('assess'))) {
    return 'appropriate';
  }
  
  return 'unknown';
}

getPatientStateAtTime(scenario, timeSinceStart) {
  if (!scenario.stateHistory) return 'unknown';
  
  // Find the state at the given time
  for (let i = scenario.stateHistory.length - 1; i >= 0; i--) {
    if (scenario.stateHistory[i].timeSinceStart <= timeSinceStart) {
      return scenario.stateHistory[i].state;
    }
  }
  
  return 'unknown';
}
```

---

## **PHASE 5: TESTING & VALIDATION (2-3 hours)**

### **Task 5.1: Create Test Data Generator**
**Duration:** 1 hour  
**File:** `server/tests/patternTestData.js` (NEW)

```javascript
// Generate mock scenario data for pattern testing

export function generateMockScenarioData(profile) {
  // Profiles: 'excellent', 'struggling', 'inconsistent'
  
  const scenarios = [];
  
  for (let i = 0; i < 3; i++) {
    scenarios.push({
      scenarioId: `Scenario ${i + 1}`,
      totalTime: 600 + Math.random() * 600, // 10-20 minutes
      score: generateScore(profile, i),
      checklistResults: generateChecklist(profile),
      cdpEvaluations: generateCDPs(profile, i),
      criticalActionsLog: generateActionsLog(profile, i),
      errors: generateErrors(profile, i),
      stateHistory: generateStateHistory(profile, i),
      criticalTreatmentsGiven: { oxygen: true, salbutamol: true, steroids: false },
      finalState: profile === 'excellent' ? 'improving' : profile === 'struggling' ? 'critical' : ['initial', 'improving', 'critical'][i],
      vitals: { HR: 90, RR: 20, SpO2: 95, BP: '120/80', GCS: 15, Temp: 37 }
    });
  }
  
  return scenarios;
}

function generateScore(profile, scenarioIndex) {
  const baseScores = {
    'excellent': [92, 95, 94],
    'struggling': [65, 70, 68],
    'inconsistent': [90, 65, 88]
  };
  
  return {
    percentage: baseScores[profile][scenarioIndex],
    grade: baseScores[profile][scenarioIndex] >= 90 ? 'A' : 
           baseScores[profile][scenarioIndex] >= 80 ? 'B' : 
           baseScores[profile][scenarioIndex] >= 70 ? 'C' : 'D'
  };
}

// Additional helper functions for test data generation...
```

---

### **Task 5.2: Integration Testing**
**Duration:** 1-1.5 hours  
**File:** `server/tests/patternAnalysis.test.js` (NEW)

```javascript
import { patternAnalysisService } from '../services/patternAnalysisService.js';
import { generateMockScenarioData } from './patternTestData.js';

// Test each pattern category
describe('Pattern Analysis Service', () => {
  
  test('Excellent student profile', () => {
    const data = generateMockScenarioData('excellent');
    const patterns = patternAnalysisService.analyzePerformancePatterns(data);
    
    console.log('Excellent Student Patterns:', JSON.stringify(patterns, null, 2));
    
    // Expectations for excellent student
    expect(patterns.decisionQuality.consistentStrengths.detected).toBe(true);
    expect(patterns.patientAwareness.deteriorationPrevention.isStrength).toBe(true);
    expect(patterns.metaPatterns.consistencyIndex.data.consistency).toBe('VERY CONSISTENT');
  });
  
  test('Struggling student profile', () => {
    const data = generateMockScenarioData('struggling');
    const patterns = patternAnalysisService.analyzePerformancePatterns(data);
    
    console.log('Struggling Student Patterns:', JSON.stringify(patterns, null, 2));
    
    // Expectations for struggling student
    expect(patterns.decisionQuality.consistentWeaknesses.detected).toBe(true);
    expect(patterns.temporal.assessmentToTreatmentGap.detected).toBe(true);
    expect(patterns.patientAwareness.deteriorationPrevention.severity).toBe('HIGH');
  });
  
  test('Inconsistent student profile', () => {
    const data = generateMockScenarioData('inconsistent');
    const patterns = patternAnalysisService.analyzePerformancePatterns(data);
    
    console.log('Inconsistent Student Patterns:', JSON.stringify(patterns, null, 2));
    
    // Expectations for inconsistent student
    expect(patterns.metaPatterns.consistencyIndex.data.consistency).toBe('INCONSISTENT');
  });
});
```

**Run tests:**
```bash
npm test -- patternAnalysis.test.js
```

---

### **Task 5.3: AAR Agent Testing**
**Duration:** 30-45 minutes

**Manual Testing Checklist:**

1. **Start AAR with mock data:**
   - POST to `/api/sessions/:id/aar/start` with 3 completed scenarios
   - Verify pattern analysis runs
   - Check AAR context includes pattern data

2. **Test AAR conversation:**
   - Verify Phase 3 (Pattern Analysis) references patterns by name
   - Check AAR uses "AAR Talking Point" language
   - Confirm patterns connected to specific scenario examples
   - Validate 2-4 patterns discussed (not all 18)

3. **Test different student profiles:**
   - Excellent student → focuses on strengths, minor improvements
   - Struggling student → focuses on critical weaknesses
   - Inconsistent student → highlights variability

**Expected AAR Outputs:**

```
Phase 3 Example (Excellent Student):
"Looking across all three scenarios, I see a consistent strength: your systematic assessment approach was excellent—you followed ABC structure in 3 out of 3 scenarios. That disciplined approach is exactly what makes a reliable paramedic..."

Phase 3 Example (Struggling Student):
"I need to highlight a pattern of concern: medication selection decisions were rated Suboptimal or Dangerous in 2 out of 3 cases. This suggests a specific pharmacology knowledge gap that needs immediate attention. Let's discuss what's challenging about medication decisions for you..."
```

---

## **TIMELINE SUMMARY**

| Phase | Tasks | Duration | Priority | Cumulative |
|-------|-------|----------|----------|------------|
| **Phase 1** | Core Infrastructure | 6-7 hours | CRITICAL | 6-7h |
| **Phase 2** | P1 Patterns (6 patterns) | 4-5 hours | HIGH | 10-12h |
| **Phase 3** | P2 Patterns (7 patterns) | 5-6 hours | MEDIUM | 15-18h |
| **Phase 4** | P3 Patterns (5 patterns) | 5-6 hours | LOWER | 20-24h |
| **Phase 5** | Testing & Validation | 2-3 hours | CRITICAL | 22-27h |

**Total Estimated Time:** 18-22 hours (conservative estimate with buffer)

**Recommended Implementation Order:**
1. **Week 1:** Phase 1 + Phase 2 (Core + P1 patterns)
2. **Week 2:** Phase 3 + Phase 5 (P2 patterns + Testing)
3. **Week 3:** Phase 4 (P3 patterns - polish)

---

## **SUCCESS METRICS**

### **Technical Validation**
- ✅ All 18 patterns calculate without errors
- ✅ Pattern detection accuracy >85% on test data
- ✅ AAR context builds successfully with patterns
- ✅ AAR Agent references 2-4 patterns in Phase 3

### **Educational Validation**
- ✅ Patterns generate actionable feedback
- ✅ AAR Talking Points are specific and evidence-based
- ✅ Students can understand pattern explanations
- ✅ Patterns distinguish between student profiles (excellent/struggling/inconsistent)

### **Integration Validation**
- ✅ Patterns integrate seamlessly into existing AAR flow
- ✅ No performance degradation (AAR start time <3 seconds)
- ✅ Pattern data visible in AAR context
- ✅ AAR Agent uses patterns appropriately (not mechanically)

---

## **RISK MITIGATION**

### **Risk 1: Insufficient Data Quality**
**Mitigation:** Implement robust null checking and fallback messages for missing data

### **Risk 2: Pattern Calculation Performance**
**Mitigation:** Optimize algorithms, cache results, limit to essential calculations

### **Risk 3: AAR Agent Overwhelm**
**Mitigation:** Clear priority instructions, limit to 2-4 patterns, provide examples

### **Risk 4: Pattern Inaccuracy**
**Mitigation:** Extensive testing with diverse student profiles, validation with real data

---

## **NEXT STEPS AFTER IMPLEMENTATION**

1. **Pilot Testing:** Test with 5-10 paramedic students
2. **Pattern Refinement:** Adjust thresholds based on real data
3. **AAR Prompt Tuning:** Refine based on actual AAR conversations
4. **Documentation:** User guide for instructors on interpreting patterns
5. **Data Collection:** Begin collecting pattern data for research

---

## **DOCUMENTATION DELIVERABLES**

1. **This Development Plan** (current document)
2. **Pattern Analysis Service Code** (`patternAnalysisService.js`)
3. **Test Data & Test Suite** (`patternTestData.js`, `patternAnalysis.test.js`)
4. **Updated AAR Service** (`aarService.js`)
5. **Updated AAR Prompt** (`aarAgent.txt`)
6. **Integration Guide** (How to use patterns in AAR)

---

**END OF DEVELOPMENT PLAN**

**Status:** Ready for Implementation  
**Estimated Completion:** 3 weeks with part-time development  
**Next Action:** Begin Phase 1 Task 1.1 - Pattern Analysis Service Foundation
