# Know Thyself MVP - Layer 2 Testing Plan

**Version**: 1.0
**Date**: December 2024
**Purpose**: Comprehensive testing plan for Layer 2 MVP features before pilot testing

---

## Testing Overview

### Objectives
1. Verify all Layer 2 features function correctly
2. Ensure complete training flow (Cognitive Coach → 3 Scenarios → AAR)
3. Validate state progression and treatment detection
4. Test CDP evaluation accuracy
5. Verify Challenge Points system (A/B testing ready)
6. Ensure AAR Agent provides quality feedback
7. Identify bugs and performance issues

### Testing Timeline
- **Backend Tests**: 1-2 hours (automated)
- **Manual Integration Tests**: 3-4 hours
- **User Acceptance Testing**: 2-3 sessions with 1-2 test users

---

## 1. Backend Automated Tests

### Running the Test Suite

```bash
cd server
node test-layer2.js
```

### Expected Results
- ✅ All 9 tests should pass
- ✅ Session initialization with Layer 2 fields
- ✅ Treatment detection (oxygen, salbutamol, steroids)
- ✅ State progression (initial → deteriorating/improving)
- ✅ CDP evaluation with ratings
- ✅ Dangerous medication detection
- ✅ Challenge Points triggering
- ✅ AAR initialization and conversation
- ✅ Performance report generation

### Pass Criteria
- **Minimum**: 7/9 tests passing
- **Target**: 9/9 tests passing

---

## 2. Manual Integration Tests

### Test 2.1: Complete Training Flow

**Objective**: Verify end-to-end training session

**Steps**:
1. Start application (`npm start` in server, `npm run dev` in frontend)
2. Click "Start Training Session"
3. Complete Cognitive Coach phase (answer 2-3 questions)
4. Verify transition to Core Agent (dispatch info, patient info appear)
5. Complete Scenario 1:
   - Interact with patient
   - Give treatments
   - Wait for "Complete Scenario" button (after 10 min)
   - Click Complete
6. Verify Scenario 2 loads
7. Complete Scenario 2
8. Verify Scenario 3 loads
9. Complete Scenario 3
10. Verify AAR starts automatically
11. Complete AAR conversation
12. Verify Session Complete screen appears

**Expected Results**:
- ✅ Smooth transitions between all phases
- ✅ No crashes or errors
- ✅ Timer resets for each scenario
- ✅ AAR provides performance feedback
- ✅ Session Complete screen shows with "Start New Session" button

**Pass Criteria**: All steps complete without errors

---

### Test 2.2: State Progression

**Objective**: Verify patient state changes based on treatments

**Test Case A: No Treatment Path**:
1. Start session
2. Complete Cognitive Coach
3. Do NOT give any treatments
4. Wait 3 minutes → Check vitals (should show deterioration)
5. Wait 5 minutes → Check vitals (should show further deterioration)
6. Wait 10 minutes → Check vitals (should be critical)

**Expected Results**:
- ✅ Vitals worsen over time
- ✅ Patient responses reflect deteriorating condition
- ✅ State history shows: initial → deteriorating → critical

**Test Case B: Correct Treatment Path**:
1. Start session
2. Complete Cognitive Coach
3. Give oxygen within 2 minutes
4. Give salbutamol within 5 minutes
5. Check vitals after treatments

**Expected Results**:
- ✅ Vitals improve after treatments
- ✅ Patient responses show improvement
- ✅ State history shows: initial → improving

**Pass Criteria**: Both test cases show correct state progression

---

### Test 2.3: CDP Evaluation

**Objective**: Verify Critical Decision Points are evaluated correctly

**Steps**:
1. Start session (asthma scenario)
2. Complete Cognitive Coach
3. Test CDP1 (Bronchodilator Timing):
   - Give salbutamol within 5 minutes → Should rate "optimal"
   - OR give salbutamol after 5-10 minutes → Should rate "acceptable"
   - OR don't give salbutamol → Should rate "dangerous"
4. Test CDP2 (Oxygen Delivery):
   - Give oxygen within 2 minutes → Should rate "optimal"
   - OR give oxygen after 2-3 minutes → Should rate "acceptable"
5. Complete scenario
6. Check performance report (via AAR or browser dev tools)

**Expected Results**:
- ✅ CDP evaluations present in performance data
- ✅ Ratings match timing and actions
- ✅ Explanations are specific and accurate

**Pass Criteria**: CDP evaluations match expected ratings

---

### Test 2.4: Medication Safety

**Objective**: Verify dangerous medication detection

**Steps**:
1. Start session
2. Complete Cognitive Coach
3. Give a dangerous medication: "I will administer diazepam 10mg IV"
4. Observe patient response
5. Check performance report

**Expected Results**:
- ✅ System detects dangerous medication
- ✅ Patient condition worsens
- ✅ Medication error logged in performance report
- ✅ AAR mentions the medication error

**Pass Criteria**: Dangerous medications are detected and logged

---

### Test 2.5: Challenge Points (A/B Testing)

**Test Case A: Challenges Enabled**:
1. Start session with challenges enabled (default)
2. Complete Cognitive Coach
3. Give vague treatment: "Give oxygen"
4. Expect challenge question: "Can you be more specific about oxygen delivery?"
5. Respond to challenge
6. Verify conversation continues

**Test Case B: Challenges Disabled**:
1. Modify session start to disable challenges (backend code: `challengePointsEnabled: false`)
2. Start session
3. Complete Cognitive Coach
4. Give same vague treatment: "Give oxygen"
5. Should NOT receive challenge question

**Expected Results**:
- ✅ Group A receives challenge questions
- ✅ Group B does not receive challenge questions
- ✅ Both groups can complete scenarios
- ✅ Challenge responses logged in Group A performance data

**Pass Criteria**: Challenge Points toggle works correctly

---

### Test 2.6: Vitals Polling

**Objective**: Verify vitals update automatically

**Steps**:
1. Start session
2. Complete Cognitive Coach
3. Observe Vitals Monitor panel
4. Give treatments
5. Wait 5-10 seconds without interacting
6. Observe vitals changes

**Expected Results**:
- ✅ Vitals update every 5 seconds
- ✅ Vitals reflect treatment effects
- ✅ No excessive console errors
- ✅ Polling stops during AAR mode

**Pass Criteria**: Vitals auto-update during scenarios

---

### Test 2.7: AAR Quality

**Objective**: Verify AAR Agent provides meaningful feedback

**Steps**:
1. Complete full training session (all 3 scenarios)
2. Engage with AAR Agent
3. Test AAR conversation flow:
   - Answer initial reflection question
   - Receive scenario-by-scenario feedback
   - Get sustains (strengths)
   - Get improves (areas for growth)
   - Get apply (teaching points)
4. Complete AAR until [AAR_COMPLETE] marker

**Expected Results**:
- ✅ AAR references specific actions from session
- ✅ Feedback includes timestamps and vitals
- ✅ Teaching points are relevant to scenario
- ✅ Tone is supportive and educational
- ✅ Session Complete screen appears after AAR

**Pass Criteria**: AAR provides specific, actionable feedback

---

### Test 2.8: Multi-Scenario Handling

**Objective**: Verify correct handling of 3 different scenarios

**Steps**:
1. Start session
2. Note which 3 scenarios are randomly selected
3. Complete all 3 scenarios
4. Verify each scenario:
   - Has different patient
   - Has different dispatch info
   - Has different clinical presentation
   - Timer resets to 0:00 at start
   - Vitals reset for new patient

**Expected Results**:
- ✅ 3 distinct scenarios load
- ✅ No data bleed between scenarios
- ✅ Each scenario tracked independently
- ✅ AAR references all 3 scenarios

**Pass Criteria**: All 3 scenarios load and function correctly

---

### Test 2.9: Session Reset

**Objective**: Verify session can be reset after completion

**Steps**:
1. Complete full training session
2. Reach Session Complete screen
3. Click "Start New Training Session"
4. Verify clean slate:
   - New session ID generated
   - Previous data cleared
   - New random 3 scenarios selected
   - Cognitive Coach restarts

**Expected Results**:
- ✅ New session starts fresh
- ✅ No data from previous session
- ✅ All features work in new session

**Pass Criteria**: New session starts without issues

---

### Test 2.10: Timer Functionality

**Objective**: Verify scenario timer works correctly

**Steps**:
1. Start session, complete Cognitive Coach
2. Note timer at scenario start: 00:00
3. Wait and observe timer counting up
4. At 10:00, verify "Complete Scenario" button appears
5. Continue scenario (don't click Complete)
6. At 20:00, verify auto-force complete
7. Verify timer resets for next scenario

**Expected Results**:
- ✅ Timer counts up from 00:00
- ✅ Complete button appears at 10:00
- ✅ Auto-complete at 20:00
- ✅ Timer resets for each new scenario

**Pass Criteria**: Timer behaves as specified

---

## 3. User Acceptance Testing (UAT)

### UAT Setup

**Participants**: 1-2 paramedic students or instructors
**Duration**: 30-45 minutes per session
**Environment**: Staging/production-like setup

### UAT Scenarios

#### Scenario 1: First-Time User Experience
**Objective**: Evaluate onboarding and initial experience

**Tasks**:
1. Open application (no prior instructions)
2. Start training session
3. Complete Cognitive Coach
4. Complete at least 1 scenario
5. Attempt to give treatments
6. Complete scenario

**Observation Points**:
- Is UI intuitive?
- Do they understand Cognitive Coach purpose?
- Do they know how to give treatments?
- Do they understand vitals monitor?
- Do they find Complete Scenario button?

#### Scenario 2: Challenge Points Response
**Objective**: Evaluate student reaction to Socratic questioning

**Tasks**:
1. Give vague treatment command
2. Receive challenge question
3. Respond with reasoning

**Observation Points**:
- Do they understand the challenge?
- Does it interrupt flow negatively?
- Is feedback helpful?
- Does it encourage deeper thinking?

#### Scenario 3: AAR Experience
**Objective**: Evaluate AAR quality and usefulness

**Tasks**:
1. Complete all 3 scenarios
2. Engage with AAR Agent
3. Receive performance feedback

**Observation Points**:
- Is feedback specific enough?
- Is tone appropriate?
- Do they learn from feedback?
- Is AAR too long/short?
- Would they use this for training?

### UAT Feedback Collection

**Post-Session Survey**:
1. How intuitive was the interface? (1-5 scale)
2. Did you understand the Cognitive Coach purpose? (Yes/No)
3. Were Challenge Points helpful or disruptive? (Likert scale)
4. Did AAR feedback feel personalized? (Yes/No)
5. Would you use this for training? (Yes/No)
6. What was most confusing?
7. What worked best?
8. What needs improvement?

---

## 4. Performance Testing

### Load Testing

**Objective**: Verify system handles concurrent users

**Test Setup**:
- Simulate 5-10 concurrent sessions
- Run full training flow for each
- Monitor server resources

**Metrics to Track**:
- Response time < 2 seconds
- No memory leaks
- No session interference
- Database (if applicable) performance

**Pass Criteria**: System stable with 10 concurrent users

---

## 5. Bug Tracking

### Critical Bugs (Must Fix Before Pilot)
- Session crashes
- AAR fails to start
- Data loss between scenarios
- Challenge Points breaking flow
- Vitals not updating

### High Priority Bugs (Should Fix)
- CDP evaluation inaccuracies
- Treatment detection misses
- AAR feedback generic
- UI glitches
- Timer issues

### Medium Priority Bugs (Nice to Fix)
- Minor UI polish
- Console warnings
- Performance optimization

---

## 6. Test Results Documentation

### Test Results Template

```markdown
## Test Session: [Date]
**Tester**: [Name]
**Duration**: [Time]
**Environment**: [Local/Staging/Production]

### Tests Completed
- [ ] Backend Automated Tests: [X/9 passed]
- [ ] Complete Training Flow
- [ ] State Progression
- [ ] CDP Evaluation
- [ ] Medication Safety
- [ ] Challenge Points
- [ ] Vitals Polling
- [ ] AAR Quality
- [ ] Multi-Scenario Handling
- [ ] Session Reset
- [ ] Timer Functionality

### Bugs Found
1. [Bug description, severity, steps to reproduce]
2. [Bug description, severity, steps to reproduce]

### Overall Assessment
- Readiness for Pilot: [Ready/Not Ready/Ready with Reservations]
- Critical Issues: [Number]
- Recommendations: [List]

### Notes
[Any additional observations]
```

---

## 7. Sign-Off Criteria

### Ready for Pilot Testing When:
- ✅ Backend automated tests: 9/9 passing
- ✅ All critical manual tests pass
- ✅ Zero critical bugs
- ✅ < 3 high priority bugs
- ✅ UAT feedback positive (>4/5 average)
- ✅ Performance acceptable (10 concurrent users)
- ✅ AAR provides specific, actionable feedback
- ✅ Complete training flow works end-to-end

---

## 8. Testing Schedule

### Week 1: Backend & Integration Testing
- Day 1-2: Run automated tests, fix critical bugs
- Day 3-4: Manual integration testing
- Day 5: Fix identified bugs

### Week 2: UAT & Performance Testing
- Day 1-2: UAT sessions with test users
- Day 3: Incorporate feedback, fix bugs
- Day 4: Performance testing
- Day 5: Final verification, sign-off

---

## 9. Contact & Support

**Technical Issues**: Review server logs and browser console
**Bug Reports**: Document in GitHub Issues
**Test Results**: Store in `/docs/test-results/`

---

**Document Status**: Ready for Use
**Last Updated**: December 2024
**Next Review**: After pilot testing completion
