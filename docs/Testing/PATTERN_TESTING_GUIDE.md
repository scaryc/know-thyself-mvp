# Pattern Recognition Testing Guide

## Document Overview
**Version:** 1.0
**Date:** November 11, 2025
**Purpose:** Comprehensive testing procedures for Priority 1 (P1) pattern recognition features

This document provides detailed test procedures, mock data structures, and verification steps for all implemented performance patterns in the AAR (After Action Review) system.

---

## Table of Contents
1. [Testing Prerequisites](#testing-prerequisites)
2. [Mock Data Structure](#mock-data-structure)
3. [Pattern 1.2: Assessment-to-Treatment Gap](#pattern-12-assessment-to-treatment-gap)
4. [Pattern 2.1: Consistent Strength Domain](#pattern-21-consistent-strength-domain)
5. [Pattern 2.2: Consistent Weakness Domain](#pattern-22-consistent-weakness-domain)
6. [Pattern 3.1: Systematic Assessment](#pattern-31-systematic-assessment)
7. [Pattern 4.1: Medication Error Type](#pattern-41-medication-error-type)
8. [Pattern 6.3: Deterioration Prevention](#pattern-63-deterioration-prevention)
9. [Integration Testing](#integration-testing)
10. [Troubleshooting](#troubleshooting)

---

## Testing Prerequisites

### Required Files
- `server/services/patternAnalysisService.js` - Pattern analysis service
- `server/services/aarService.js` - AAR service with pattern integration
- `server/prompts/aarAgent.txt` - Updated AAR agent prompt

### Testing Environment
```bash
# Navigate to project directory
cd /home/user/know-thyself-mvp

# Ensure Node.js is available
node --version  # Should be v18 or higher

# Check file syntax
node -c server/services/patternAnalysisService.js
node -c server/services/aarService.js
```

### Import Pattern Service
```javascript
// In your test file
import { patternAnalysisService } from './server/services/patternAnalysisService.js';
```

---

## Mock Data Structure

### Complete Scenario Data Template

Each scenario should contain the following structure:

```javascript
const mockScenario = {
  scenarioId: 'Asthma-Exacerbation',
  totalTime: 420, // seconds
  finalState: 'improving', // or 'deteriorating', 'critical', 'initial'

  score: {
    percentage: 85,
    grade: 'B'
  },

  // Critical actions log - tracks all actions with timestamps
  criticalActionsLog: [
    {
      action: 'Check airway patency',
      category: 'assessment',
      timeSinceStart: 30 // seconds
    },
    {
      action: 'Assess respiratory rate and effort',
      category: 'assessment',
      timeSinceStart: 45
    },
    {
      action: 'Apply high-flow oxygen 15L/min',
      category: 'treatment',
      timeSinceStart: 120
    },
    {
      action: 'Administer Salbutamol nebulizer',
      category: 'treatment',
      timeSinceStart: 240
    }
  ],

  // CDP Evaluations - Critical Decision Point ratings
  cdpEvaluations: [
    {
      id: 'CDP-ASSESS-1',
      decision: 'Initial respiratory assessment',
      score: 'optimal', // 'optimal', 'acceptable', 'suboptimal', 'dangerous'
      reasoning: 'Systematic ABC approach completed within 2 minutes'
    },
    {
      id: 'CDP-BREATH-1',
      decision: 'Oxygen delivery decision',
      score: 'optimal',
      reasoning: 'High-flow oxygen appropriately selected for SpO2 88%'
    },
    {
      id: 'CDP-BREATH-2',
      decision: 'Bronchodilator timing',
      score: 'acceptable',
      reasoning: 'Salbutamol given at 4 minutes - acceptable but could be faster'
    }
  ],

  // Medication errors (if any)
  errors: [
    {
      action: 'Attempted to give Apaurin (benzodiazepine)',
      timeSinceStart: 180,
      type: 'contraindication'
    }
  ],

  // Patient state progression
  stateHistory: [
    {
      state: 'initial',
      timeSinceStart: 0
    },
    {
      state: 'deteriorating',
      timeSinceStart: 180
    },
    {
      state: 'improving',
      timeSinceStart: 300
    }
  ],

  // Checklist results
  checklistResults: [
    {
      action: 'High-flow oxygen',
      completed: true,
      timeSinceStart: 120,
      timeTarget: 120
    },
    {
      action: 'Bronchodilator',
      completed: true,
      timeSinceStart: 240,
      timeTarget: 300
    }
  ]
};
```

---

## Pattern 1.2: Assessment-to-Treatment Gap

### Pattern Description
Detects delays between problem recognition (assessment) and treatment initiation. Significant gaps suggest hesitation or uncertainty.

### Test Objective
Verify that the pattern correctly calculates time gaps between first assessment and first treatment actions.

### Test Data: Significant Gap Detected

```javascript
const testData_SignificantGap = [
  // Scenario 1: 4-minute gap
  {
    scenarioId: 'Asthma-1',
    criticalActionsLog: [
      { action: 'Check respiratory status', category: 'assessment', timeSinceStart: 60 },
      { action: 'Apply oxygen', category: 'treatment', timeSinceStart: 300 } // 5 min
    ]
  },
  // Scenario 2: 5-minute gap
  {
    scenarioId: 'Cardiac-1',
    criticalActionsLog: [
      { action: 'Assess chest pain', category: 'assessment', timeSinceStart: 45 },
      { action: 'Give aspirin', category: 'treatment', timeSinceStart: 345 } // 5.75 min
    ]
  },
  // Scenario 3: 3-minute gap
  {
    scenarioId: 'Trauma-1',
    criticalActionsLog: [
      { action: 'Scene assessment', category: 'assessment', timeSinceStart: 30 },
      { action: 'Control bleeding', category: 'treatment', timeSinceStart: 210 } // 3.5 min
    ]
  }
];

// Run test
const result = patternAnalysisService.analyzeAssessmentToTreatmentGap(testData_SignificantGap);

console.log('=== TEST: Significant Gap ===');
console.log('Detected:', result.detected); // Expected: true
console.log('Severity:', result.severity); // Expected: MODERATE or HIGH
console.log('Average Gap:', result.data.averageGapMinutes); // Expected: ~4 minutes
console.log('Talking Point:', result.aarTalkingPoint);
```

### Expected Results: Significant Gap
```javascript
{
  patternName: "Assessment-to-Treatment Gap",
  detected: true,
  priority: "P1",
  severity: "MODERATE", // or "HIGH" if avg > 5 min
  data: {
    averageGapSeconds: ~240,
    averageGapMinutes: ~4.0,
    scenarios: [
      { scenario: 'Asthma-1', gapMinutes: 4.0, ... },
      { scenario: 'Cardiac-1', gapMinutes: 5.0, ... },
      { scenario: 'Trauma-1', gapMinutes: 3.0, ... }
    ]
  },
  educationalFocus: "Student recognizes problems but hesitates to act...",
  aarTalkingPoint: "Looking across all three scenarios, I notice a pattern..."
}
```

### Test Data: No Significant Gap

```javascript
const testData_NoGap = [
  {
    scenarioId: 'Asthma-2',
    criticalActionsLog: [
      { action: 'Check respiratory', category: 'assessment', timeSinceStart: 30 },
      { action: 'Apply oxygen', category: 'treatment', timeSinceStart: 90 } // 1 min gap
    ]
  },
  {
    scenarioId: 'Cardiac-2',
    criticalActionsLog: [
      { action: 'Assess chest pain', category: 'assessment', timeSinceStart: 20 },
      { action: 'Give aspirin', category: 'treatment', timeSinceStart: 140 } // 2 min gap
    ]
  },
  {
    scenarioId: 'Trauma-2',
    criticalActionsLog: [
      { action: 'Scene assessment', category: 'assessment', timeSinceStart: 15 },
      { action: 'Control bleeding', category: 'treatment', timeSinceStart: 105 } // 1.5 min gap
    ]
  }
];

const result2 = patternAnalysisService.analyzeAssessmentToTreatmentGap(testData_NoGap);

console.log('=== TEST: No Significant Gap ===');
console.log('Detected:', result2.detected); // Expected: false (avg < 3 min)
console.log('Average Gap:', result2.data.averageGapMinutes); // Expected: ~1.5 minutes
```

### Expected Results: No Significant Gap
```javascript
{
  patternName: "Assessment-to-Treatment Gap",
  detected: false, // Not significant
  severity: "LOW",
  aarTalkingPoint: "Excellent decisiveness—you consistently acted quickly..."
}
```

### Verification Checklist
- [ ] Pattern detects gaps > 180 seconds (3 minutes) as significant
- [ ] Severity is HIGH for gaps > 300 seconds (5 minutes)
- [ ] Severity is MODERATE for gaps 180-300 seconds
- [ ] Average gap calculated correctly across all scenarios
- [ ] Handles missing criticalActionsLog gracefully
- [ ] Returns appropriate talking points for both detected and not detected

---

## Pattern 2.1: Consistent Strength Domain

### Pattern Description
Identifies clinical categories where student consistently performs optimally (≥67% optimal CDP ratings).

### Test Objective
Verify detection of clinical domains with consistently excellent performance.

### Test Data: Breathing Domain Strength

```javascript
const testData_StrengthDetected = [
  // Scenario 1
  {
    scenarioId: 'Asthma-1',
    cdpEvaluations: [
      { id: 'CDP1', decision: 'Oxygen delivery timing', score: 'optimal' },
      { id: 'CDP2', decision: 'Bronchodilator selection', score: 'optimal' },
      { id: 'CDP3', decision: 'Respiratory assessment', score: 'optimal' },
      { id: 'CDP4', decision: 'IV access decision', score: 'acceptable' } // circulation - not optimal
    ]
  },
  // Scenario 2
  {
    scenarioId: 'Asthma-2',
    cdpEvaluations: [
      { id: 'CDP1', decision: 'Initial oxygen therapy', score: 'optimal' },
      { id: 'CDP2', decision: 'Respiratory rate assessment', score: 'optimal' },
      { id: 'CDP3', decision: 'Cardiac monitoring', score: 'suboptimal' }
    ]
  },
  // Scenario 3
  {
    scenarioId: 'Trauma-1',
    cdpEvaluations: [
      { id: 'CDP1', decision: 'Breathing assessment in trauma', score: 'optimal' },
      { id: 'CDP2', decision: 'Oxygen therapy for shock', score: 'acceptable' },
      { id: 'CDP3', decision: 'Scene assessment', score: 'optimal' }
    ]
  }
];

const result = patternAnalysisService.analyzeConsistentStrengths(testData_StrengthDetected);

console.log('=== TEST: Consistent Strength ===');
console.log('Detected:', result.detected); // Expected: true
console.log('Primary Strength:', result.data.primaryStrength); // Expected: 'breathing'
console.log('Performance:', result.data.performance); // Expected: "5/6 optimal" or similar
console.log('Rate:', result.data.rate); // Expected: "83%" or similar
```

### Expected Results
```javascript
{
  patternName: "Consistent Strength Domain",
  detected: true,
  isStrength: true,
  priority: "P1",
  data: {
    primaryStrength: "breathing",
    performance: "5/6 optimal",
    rate: "83%",
    allStrengths: [...]
  },
  educationalFocus: "Consistent excellence in breathing - reliable foundation to build on",
  aarTalkingPoint: "Looking across all three scenarios, I see a consistent strength: your breathing was systematically excellent..."
}
```

### Test Data: No Consistent Strengths

```javascript
const testData_NoStrength = [
  {
    scenarioId: 'Test-1',
    cdpEvaluations: [
      { id: 'CDP1', decision: 'Oxygen timing', score: 'acceptable' },
      { id: 'CDP2', decision: 'Bronchodilator', score: 'suboptimal' }
    ]
  },
  {
    scenarioId: 'Test-2',
    cdpEvaluations: [
      { id: 'CDP1', decision: 'Assessment', score: 'acceptable' },
      { id: 'CDP2', decision: 'Treatment', score: 'acceptable' }
    ]
  },
  {
    scenarioId: 'Test-3',
    cdpEvaluations: [
      { id: 'CDP1', decision: 'Medication', score: 'suboptimal' }
    ]
  }
];

const result2 = patternAnalysisService.analyzeConsistentStrengths(testData_NoStrength);
console.log('Detected:', result2.detected); // Expected: false
```

### Verification Checklist
- [ ] Pattern detects ≥67% optimal rate in a category
- [ ] Requires at least 2 optimal CDPs in the category
- [ ] Correctly categorizes CDPs by domain (breathing, circulation, etc.)
- [ ] Returns highest performing domain as primary strength
- [ ] Handles missing cdpEvaluations gracefully
- [ ] Returns false when no domains meet threshold

---

## Pattern 2.2: Consistent Weakness Domain

### Pattern Description
Detects recurring knowledge gaps in specific clinical domains (≥50% poor performance).

### Test Objective
Verify detection of clinical categories with consistently suboptimal or dangerous performance.

### Test Data: Medication Weakness Detected

```javascript
const testData_WeaknessDetected = [
  {
    scenarioId: 'Asthma-1',
    cdpEvaluations: [
      { id: 'CDP1', decision: 'Medication dose calculation', score: 'suboptimal', reasoning: 'Incorrect dose' },
      { id: 'CDP2', decision: 'Drug selection', score: 'dangerous', reasoning: 'Contraindicated medication' },
      { id: 'CDP3', decision: 'Oxygen therapy', score: 'optimal', reasoning: 'Appropriate' }
    ]
  },
  {
    scenarioId: 'Cardiac-1',
    cdpEvaluations: [
      { id: 'CDP1', decision: 'Medication timing', score: 'suboptimal', reasoning: 'Delayed aspirin' },
      { id: 'CDP2', decision: 'Pharmacology knowledge', score: 'suboptimal', reasoning: 'Incorrect route' },
      { id: 'CDP3', decision: 'Assessment', score: 'optimal', reasoning: 'Systematic' }
    ]
  },
  {
    scenarioId: 'Trauma-1',
    cdpEvaluations: [
      { id: 'CDP1', decision: 'Pain medication selection', score: 'dangerous', reasoning: 'Contraindicated' },
      { id: 'CDP2', decision: 'Drug administration', score: 'acceptable', reasoning: 'Correct route' }
    ]
  }
];

const result = patternAnalysisService.analyzeConsistentWeaknesses(testData_WeaknessDetected);

console.log('=== TEST: Consistent Weakness ===');
console.log('Detected:', result.detected); // Expected: true
console.log('Severity:', result.severity); // Expected: HIGH (has dangerous scores)
console.log('Primary Weakness:', result.data.primaryWeakness); // Expected: 'medication'
console.log('Performance:', result.data.performance); // Expected: "5/7 suboptimal/dangerous"
console.log('Dangerous Count:', result.data.dangerousCount); // Expected: 2
```

### Expected Results
```javascript
{
  patternName: "Consistent Weakness Domain",
  detected: true,
  severity: "HIGH", // because dangerousCount > 0
  priority: "P1",
  data: {
    primaryWeakness: "medication",
    performance: "5/7 suboptimal/dangerous",
    rate: "71%",
    dangerousCount: 2,
    examples: [...],
    allWeaknesses: [...]
  },
  educationalFocus: "Consistent difficulty with medication - specific knowledge gap requiring targeted remediation",
  aarTalkingPoint: "I need to highlight a pattern of concern: medication decisions were rated Suboptimal or Dangerous in 5 out of 7 cases..."
}
```

### Verification Checklist
- [ ] Pattern detects ≥50% poor performance rate
- [ ] Requires at least 2 poor scores in the category
- [ ] Severity is HIGH when dangerous scores are present
- [ ] Correctly prioritizes dangerous errors over suboptimal
- [ ] Returns appropriate severity levels
- [ ] Handles scenarios with no weaknesses

---

## Pattern 3.1: Systematic Assessment

### Pattern Description
Analyzes if student follows ABC (Airway-Breathing-Circulation) assessment framework consistently.

### Test Objective
Verify detection of systematic vs chaotic assessment approaches.

### Test Data: Systematic Approach

```javascript
const testData_Systematic = [
  // Scenario 1: Perfect ABC order
  {
    scenarioId: 'Asthma-1',
    criticalActionsLog: [
      { action: 'Check airway patency', timeSinceStart: 20 },
      { action: 'Assess breathing rate and effort', timeSinceStart: 45 },
      { action: 'Check pulse and perfusion', timeSinceStart: 70 },
      { action: 'Check GCS', timeSinceStart: 90 },
      { action: 'Apply oxygen', timeSinceStart: 120 }
    ]
  },
  // Scenario 2: ABC with some 'other' actions mixed in
  {
    scenarioId: 'Cardiac-1',
    criticalActionsLog: [
      { action: 'Check for airway obstruction', timeSinceStart: 15 },
      { action: 'Get patient history', timeSinceStart: 40 }, // 'other'
      { action: 'Assess respiratory status', timeSinceStart: 60 },
      { action: 'Measure blood pressure', timeSinceStart: 85 },
      { action: 'Check heart rate', timeSinceStart: 100 }
    ]
  },
  // Scenario 3: Systematic ABC
  {
    scenarioId: 'Trauma-1',
    criticalActionsLog: [
      { action: 'Open airway with jaw thrust', timeSinceStart: 10 },
      { action: 'Check chest for breathing', timeSinceStart: 30 },
      { action: 'Assess circulation and shock', timeSinceStart: 55 },
      { action: 'Apply treatments', timeSinceStart: 90 }
    ]
  }
];

const result = patternAnalysisService.analyzeSystematicAssessment(testData_Systematic);

console.log('=== TEST: Systematic Assessment ===');
console.log('Detected:', result.detected); // Expected: true
console.log('Is Strength:', result.isStrength); // Expected: true
console.log('Systematic Count:', result.data.systematicScenarios); // Expected: 3
console.log('Consistency:', result.data.consistency); // Expected: "3/3"
```

### Test Data: Chaotic Approach

```javascript
const testData_Chaotic = [
  // Scenario 1: Out of order
  {
    scenarioId: 'Test-1',
    criticalActionsLog: [
      { action: 'Check heart rate', timeSinceStart: 20 }, // C before A/B
      { action: 'Assess breathing', timeSinceStart: 60 }, // B
      { action: 'Check airway', timeSinceStart: 90 } // A last
    ]
  },
  // Scenario 2: Missing components
  {
    scenarioId: 'Test-2',
    criticalActionsLog: [
      { action: 'Check airway', timeSinceStart: 15 },
      { action: 'Give medication', timeSinceStart: 60 }, // Missing B and C
      { action: 'Transport', timeSinceStart: 120 }
    ]
  },
  // Scenario 3: Another chaotic sequence
  {
    scenarioId: 'Test-3',
    criticalActionsLog: [
      { action: 'Measure BP', timeSinceStart: 30 }, // C first
      { action: 'History taking', timeSinceStart: 90 },
      { action: 'Check lungs', timeSinceStart: 150 } // B late, no A
    ]
  }
];

const result2 = patternAnalysisService.analyzeSystematicAssessment(testData_Chaotic);
console.log('Systematic Count:', result2.data.systematicScenarios); // Expected: 0 or 1
console.log('Is Strength:', result2.isStrength); // Expected: false
```

### Expected Results: Systematic
```javascript
{
  patternName: "Systematic vs. Chaotic Assessment",
  detected: true,
  isStrength: true,
  priority: "P1",
  data: {
    systematicScenarios: 3,
    chaoticScenarios: 0,
    consistency: "3/3",
    sequences: [...]
  },
  educationalFocus: "Strong systematic assessment approach - reliable ABC foundation",
  aarTalkingPoint: "Your systematic assessment approach was excellent—you followed an ABC structure in 3 out of 3 scenarios..."
}
```

### Verification Checklist
- [ ] Correctly identifies A/B/C actions from descriptions
- [ ] Detects ABC pattern even with 'other' actions mixed in
- [ ] Requires A, B, and C to all be present
- [ ] Verifies A comes before B, and B before C
- [ ] Marks as strength when ≥2 scenarios are systematic
- [ ] Handles missing action logs gracefully

---

## Pattern 4.1: Medication Error Type

### Pattern Description
Categorizes medication errors by type (contraindication, dosing, timing, route) and identifies the most common error pattern.

### Test Objective
Verify correct categorization and detection of recurring medication error types.

### Test Data: Contraindication Errors

```javascript
const testData_ContraindicationErrors = [
  {
    scenarioId: 'Asthma-1',
    errors: [
      { action: 'Gave beta-blocker Tensiomin in asthma', timeSinceStart: 180 },
      { action: 'Attempted Apaurin (benzodiazepine) for anxiety', timeSinceStart: 240 }
    ]
  },
  {
    scenarioId: 'Asthma-2',
    errors: [
      { action: 'Administered beta-blocker despite wheezing', timeSinceStart: 200 }
    ]
  },
  {
    scenarioId: 'Cardiac-1',
    errors: [
      { action: 'Gave benzodiazepine in respiratory distress', timeSinceStart: 150 }
    ]
  }
];

const result = patternAnalysisService.analyzeMedicationErrorType(testData_ContraindicationErrors);

console.log('=== TEST: Medication Errors ===');
console.log('Detected:', result.detected); // Expected: true
console.log('Severity:', result.severity); // Expected: HIGH (≥2 errors of same type)
console.log('Total Errors:', result.data.totalErrors); // Expected: 4
console.log('Most Common Type:', result.data.mostCommonType); // Expected: 'contraindication'
console.log('Error Count:', result.data.errorCount); // Expected: 4
```

### Expected Results
```javascript
{
  patternName: "Medication Error Type",
  detected: true,
  severity: "HIGH",
  priority: "P1",
  data: {
    totalErrors: 4,
    mostCommonType: "contraindication",
    errorCount: 4,
    errorsByType: {
      contraindication: [4 errors...]
    },
    allErrors: [...]
  },
  educationalFocus: "Recurring contraindication errors - specific pharmacology knowledge gap",
  aarTalkingPoint: "I need to address a safety concern: you made 4 medication errors across the scenarios, with 4 being contraindication errors..."
}
```

### Test Data: No Errors (Excellent Safety)

```javascript
const testData_NoErrors = [
  { scenarioId: 'Test-1', errors: [] },
  { scenarioId: 'Test-2', errors: [] },
  { scenarioId: 'Test-3', errors: [] }
];

const result2 = patternAnalysisService.analyzeMedicationErrorType(testData_NoErrors);
console.log('Detected:', result2.detected); // Expected: false
console.log('Message:', result2.data.message); // Expected: "No medication errors detected..."
```

### Verification Checklist
- [ ] Correctly categorizes contraindication errors
- [ ] Correctly categorizes dosing errors
- [ ] Correctly categorizes timing errors
- [ ] Correctly categorizes route errors
- [ ] Identifies most common error type
- [ ] Severity is HIGH when ≥2 errors of same type
- [ ] Handles scenarios with no errors (returns detected: false)
- [ ] Returns all error details in data structure

---

## Pattern 6.3: Deterioration Prevention

### Pattern Description
Tracks if patients reached critical state, measuring proactive vs reactive care approach.

### Test Objective
Verify detection of deterioration prevention patterns and critical state outcomes.

### Test Data: Critical States Reached (Poor Prevention)

```javascript
const testData_PoorPrevention = [
  // Scenario 1: Patient reached critical
  {
    scenarioId: 'Asthma-1',
    stateHistory: [
      { state: 'initial', timeSinceStart: 0 },
      { state: 'deteriorating', timeSinceStart: 180 },
      { state: 'critical', timeSinceStart: 360 },
      { state: 'improving', timeSinceStart: 480 }
    ]
  },
  // Scenario 2: Patient reached critical
  {
    scenarioId: 'Cardiac-1',
    stateHistory: [
      { state: 'initial', timeSinceStart: 0 },
      { state: 'deteriorating', timeSinceStart: 120 },
      { state: 'critical', timeSinceStart: 300 }
    ]
  },
  // Scenario 3: Patient stayed initial but deteriorated
  {
    scenarioId: 'Trauma-1',
    stateHistory: [
      { state: 'initial', timeSinceStart: 0 },
      { state: 'improving', timeSinceStart: 240 }
    ]
  }
];

const result = patternAnalysisService.analyzeDeteriorationPrevention(testData_PoorPrevention);

console.log('=== TEST: Deterioration Prevention ===');
console.log('Detected:', result.detected); // Expected: true
console.log('Is Strength:', result.isStrength); // Expected: false (only 1 prevented)
console.log('Severity:', result.severity); // Expected: HIGH (≥2 reached critical)
console.log('Prevented Count:', result.data.preventedDeteriorationCount); // Expected: 1
console.log('Critical Count:', result.data.reachedCriticalCount); // Expected: 2
```

### Expected Results: Poor Prevention
```javascript
{
  patternName: "Deterioration Prevention",
  detected: true,
  isStrength: false,
  severity: "HIGH",
  priority: "P1",
  data: {
    preventedDeteriorationCount: 1,
    reachedCriticalCount: 2,
    outcomes: [...]
  },
  educationalFocus: "Reactive care pattern - patients frequently reached critical state before stabilization",
  aarTalkingPoint: "I see a pattern in patient outcomes: in 2 out of 3 scenarios, the patient reached critical state..."
}
```

### Test Data: Good Prevention

```javascript
const testData_GoodPrevention = [
  {
    scenarioId: 'Asthma-2',
    stateHistory: [
      { state: 'initial', timeSinceStart: 0 },
      { state: 'improving', timeSinceStart: 180 }
    ]
  },
  {
    scenarioId: 'Cardiac-2',
    stateHistory: [
      { state: 'initial', timeSinceStart: 0 },
      { state: 'deteriorating', timeSinceStart: 90 },
      { state: 'improving', timeSinceStart: 240 }
    ]
  },
  {
    scenarioId: 'Trauma-2',
    stateHistory: [
      { state: 'initial', timeSinceStart: 0 },
      { state: 'improving', timeSinceStart: 150 }
    ]
  }
];

const result2 = patternAnalysisService.analyzeDeteriorationPrevention(testData_GoodPrevention);
console.log('Is Strength:', result2.isStrength); // Expected: true (all prevented)
console.log('Critical Count:', result2.data.reachedCriticalCount); // Expected: 0
```

### Expected Results: Good Prevention
```javascript
{
  patternName: "Deterioration Prevention",
  detected: true,
  isStrength: true,
  severity: "LOW",
  priority: "P1",
  data: {
    preventedDeteriorationCount: 3,
    reachedCriticalCount: 0,
    outcomes: [...]
  },
  aarTalkingPoint: "Excellent work preventing deterioration—in 3 scenarios, you kept the patient stable or improving without reaching critical state..."
}
```

### Verification Checklist
- [ ] Correctly identifies final state from stateHistory
- [ ] Detects if 'critical' state was reached at any point
- [ ] Marks as prevented if final state is 'improving' or 'initial' without critical
- [ ] Severity is HIGH when ≥2 scenarios reached critical
- [ ] Is marked as strength when ≥2 scenarios prevented deterioration
- [ ] Handles missing or empty stateHistory gracefully

---

## Integration Testing

### Full Pattern Analysis Test

Test the complete pattern analysis workflow with all patterns together:

```javascript
// Create comprehensive test data for all 3 scenarios
const fullTestData = [
  {
    scenarioId: 'Asthma-Complete',
    totalTime: 480,
    finalState: 'improving',
    score: { percentage: 82, grade: 'B' },

    criticalActionsLog: [
      { action: 'Check airway patency', category: 'assessment', timeSinceStart: 30 },
      { action: 'Assess breathing and SpO2', category: 'assessment', timeSinceStart: 60 },
      { action: 'Check pulse', category: 'assessment', timeSinceStart: 90 },
      { action: 'Apply oxygen 15L', category: 'treatment', timeSinceStart: 250 }
    ],

    cdpEvaluations: [
      { id: 'CDP1', decision: 'Respiratory assessment', score: 'optimal' },
      { id: 'CDP2', decision: 'Oxygen therapy', score: 'optimal' },
      { id: 'CDP3', decision: 'Bronchodilator timing', score: 'acceptable' },
      { id: 'CDP4', decision: 'Medication selection', score: 'suboptimal' }
    ],

    errors: [
      { action: 'Gave beta-blocker in asthma', timeSinceStart: 180 }
    ],

    stateHistory: [
      { state: 'initial', timeSinceStart: 0 },
      { state: 'deteriorating', timeSinceStart: 200 },
      { state: 'improving', timeSinceStart: 350 }
    ],

    checklistResults: [
      { action: 'Oxygen', completed: true, timeSinceStart: 250, timeTarget: 120 }
    ]
  },
  // Add 2 more complete scenarios...
  {
    scenarioId: 'Cardiac-Complete',
    // ... similar structure
  },
  {
    scenarioId: 'Trauma-Complete',
    // ... similar structure
  }
];

// Run full pattern analysis
const allPatterns = patternAnalysisService.analyzePerformancePatterns(fullTestData);

console.log('=== FULL PATTERN ANALYSIS ===');
console.log('Summary:', allPatterns.summary);
console.log('Temporal Patterns:', allPatterns.temporal);
console.log('Decision Quality:', allPatterns.decisionQuality);
console.log('Clinical Reasoning:', allPatterns.clinicalReasoning);
console.log('Error Patterns:', allPatterns.errorPatterns);
console.log('Patient Awareness:', allPatterns.patientAwareness);
```

### AAR Service Integration Test

Test pattern integration with AAR service:

```javascript
import aarService from './server/services/aarService.js';

// Initialize AAR with pattern analysis
const sessionId = 'test-session-123';
const aarSession = aarService.initializeAAR(sessionId, fullTestData);

console.log('=== AAR SERVICE TEST ===');
console.log('Patterns Detected:', aarService.countDetectedPatterns(aarSession.patterns));

// Build AAR context with patterns
const context = aarService.buildAARContext(sessionId);

console.log('Context Length:', context.length);
console.log('Contains Pattern Section:', context.includes('IDENTIFIED PERFORMANCE PATTERNS'));
console.log('Contains Instructions:', context.includes('AAR AGENT INSTRUCTIONS FOR PATTERN USAGE'));
```

### Expected AAR Context Output

The context should include:
1. Overall session summary (all 3 scenarios)
2. Individual scenario summaries
3. Pattern analysis section with detected patterns
4. AAR agent instructions for pattern usage

---

## Troubleshooting

### Common Issues

#### Issue 1: "Cannot find module"
**Symptom:** Import errors when running tests
**Solution:**
```bash
# Ensure ES modules are enabled
# Check package.json has: "type": "module"
# Use .js extension in imports
import { patternAnalysisService } from './server/services/patternAnalysisService.js';
```

#### Issue 2: Pattern not detected when it should be
**Symptom:** `detected: false` when test data should trigger detection
**Solution:**
- Verify data structure matches expected format
- Check threshold values (e.g., ≥180 seconds for gap, ≥67% for strengths)
- Ensure all required fields are present
- Check console for error messages

#### Issue 3: CDP categorization not working
**Symptom:** Strengths/weaknesses not detected correctly
**Solution:**
- CDP decisions must include keywords: 'oxygen', 'breathing', 'medication', etc.
- Check `categorizeCDP()` keyword mapping
- Add custom keywords to categoryMap if needed

#### Issue 4: ABC pattern not recognized
**Symptom:** Systematic assessment shows as chaotic
**Solution:**
- Action descriptions must include ABC keywords
- Ensure A, B, and C all present in first 5 minutes
- Check that A comes before B, and B before C in sequence

### Debugging Tips

```javascript
// Enable detailed logging
console.log('Input Data:', JSON.stringify(testData, null, 2));

// Check intermediate calculations
const gaps = []; // Add logging in pattern methods
console.log('Calculated Gaps:', gaps);

// Verify data structure
console.log('CDP Count:', testData[0].cdpEvaluations?.length);
console.log('Actions:', testData[0].criticalActionsLog?.length);
```

---

## Test Results Documentation Template

After running tests, document results:

```markdown
## Test Execution Report

**Date:** [Date]
**Tester:** [Name]
**Branch:** claude/explore-repository-011CV1zRoYBe4U11abjyHKsB

### Pattern 1.2: Assessment-to-Treatment Gap
- [ ] Test 1: Significant Gap - PASS/FAIL
- [ ] Test 2: No Significant Gap - PASS/FAIL
- [ ] Edge Case: Missing data - PASS/FAIL

### Pattern 2.1: Consistent Strength Domain
- [ ] Test 1: Strength Detected - PASS/FAIL
- [ ] Test 2: No Strength - PASS/FAIL

### Pattern 2.2: Consistent Weakness Domain
- [ ] Test 1: Weakness Detected - PASS/FAIL
- [ ] Test 2: No Weakness - PASS/FAIL

### Pattern 3.1: Systematic Assessment
- [ ] Test 1: Systematic Approach - PASS/FAIL
- [ ] Test 2: Chaotic Approach - PASS/FAIL

### Pattern 4.1: Medication Error Type
- [ ] Test 1: Errors Detected - PASS/FAIL
- [ ] Test 2: No Errors - PASS/FAIL

### Pattern 6.3: Deterioration Prevention
- [ ] Test 1: Poor Prevention - PASS/FAIL
- [ ] Test 2: Good Prevention - PASS/FAIL

### Integration Tests
- [ ] Full Pattern Analysis - PASS/FAIL
- [ ] AAR Service Integration - PASS/FAIL

### Issues Found
1. [Issue description]
2. [Issue description]

### Recommendations
1. [Recommendation]
2. [Recommendation]
```

---

## Next Steps

After completing P1 pattern testing:

1. **Verify all tests pass** - Document results in test report
2. **Create actual test files** - Convert this guide into executable test files
3. **Implement P2 patterns** - Move to medium priority patterns
4. **End-to-end testing** - Test with actual AAR agent interaction
5. **Performance testing** - Measure pattern analysis speed with real data

---

## Contact & Support

For questions or issues with testing:
- Review implementation in `server/services/patternAnalysisService.js`
- Check development plan: `docs/Pattern_Recognition_AAR_Development_Plan.md`
- Verify helper method implementations

**Remember:** All P1 patterns are fully implemented. This guide provides the testing framework to verify they work as designed.
