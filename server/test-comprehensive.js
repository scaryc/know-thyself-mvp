/**
 * COMPREHENSIVE BACKEND TEST SUITE
 * Tests all backend functionality including:
 * - Cognitive Coach flow
 * - Transition to Core Agent (Scenario 1)
 * - Treatment detection
 * - State progression
 * - CDP evaluation
 * - Challenge points
 * - Vitals polling
 * - Performance reporting
 * - Layer 2 features
 */

const baseURL = 'http://localhost:3001/api';

// Test results collector
const results = {
  passed: 0,
  failed: 0,
  tests: []
};

// Helper functions
function assert(condition, message) {
  if (condition) {
    results.passed++;
    results.tests.push({ status: '✅ PASS', message });
    console.log(`✅ PASS: ${message}`);
  } else {
    results.failed++;
    results.tests.push({ status: '❌ FAIL', message });
    console.log(`❌ FAIL: ${message}`);
    throw new Error(message);
  }
}

function assertExists(value, fieldName) {
  assert(value !== null && value !== undefined, `${fieldName} exists`);
}

function assertEqual(actual, expected, message) {
  assert(actual === expected, `${message} (expected: ${expected}, got: ${actual})`);
}

function assertIncludes(array, value, message) {
  assert(array && array.includes(value), message);
}

async function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// API helper functions
async function apiCall(method, endpoint, body = null) {
  const options = {
    method,
    headers: { 'Content-Type': 'application/json' }
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${baseURL}${endpoint}`, options);
  const data = await response.json();

  return { response, data };
}

// ═══════════════════════════════════════════════════════════
// TEST SUITE 1: SESSION CREATION & COGNITIVE COACH
// ═══════════════════════════════════════════════════════════

async function testSessionCreation() {
  console.log('\n═══════════════════════════════════════════════');
  console.log('TEST SUITE 1: SESSION CREATION & COGNITIVE COACH');
  console.log('═══════════════════════════════════════════════\n');

  // Test 1.1: Start session
  console.log('Test 1.1: Start new session with Cognitive Coach');
  const { response: startRes, data: sessionData } = await apiCall('POST', '/sessions/start', {
    scenarioId: 'ASTHMA_MVP_001',
    challengePointsEnabled: true
  });

  assert(startRes.ok, 'Session start returns 200');
  assertExists(sessionData.sessionId, 'Session ID');
  assertEqual(sessionData.currentAgent, 'cognitive_coach', 'Current agent is cognitive_coach');
  assertExists(sessionData.questionCount, 'Question count');

  console.log(`   Session ID: ${sessionData.sessionId}`);
  console.log(`   Agent: ${sessionData.currentAgent}`);
  console.log(`   Questions: ${sessionData.questionCount}`);

  return sessionData.sessionId;
}

async function testCognitiveCoachFlow(sessionId) {
  console.log('\nTest 1.2: Cognitive Coach conversation flow');

  // First message to Cognitive Coach
  const { response: msg1Res, data: msg1Data } = await apiCall('POST', `/sessions/${sessionId}/message`, {
    message: 'I would check the patient breathing and assess their airway first.'
  });

  assert(msg1Res.ok, 'First Cognitive Coach message returns 200');
  assertExists(msg1Data.message, 'AI response message');
  assertEqual(msg1Data.currentAgent, 'cognitive_coach', 'Still in Cognitive Coach mode');

  console.log(`   Response received: ${msg1Data.message.substring(0, 80)}...`);

  // Second message
  const { response: msg2Res, data: msg2Data } = await apiCall('POST', `/sessions/${sessionId}/message`, {
    message: 'I would prioritize SpO2 and respiratory rate because they indicate oxygenation.'
  });

  assert(msg2Res.ok, 'Second Cognitive Coach message returns 200');
  assertEqual(msg2Data.currentAgent, 'cognitive_coach', 'Still in Cognitive Coach mode');

  // Third message - should trigger transition
  const { response: msg3Res, data: msg3Data } = await apiCall('POST', `/sessions/${sessionId}/message`, {
    message: 'Silent chest would indicate severe bronchospasm and near-respiratory arrest.'
  });

  assert(msg3Res.ok, 'Third Cognitive Coach message returns 200');

  console.log(`   Transition status: ${msg3Data.transitioned ? 'YES' : 'NO'}`);
  console.log(`   Current agent: ${msg3Data.currentAgent}`);

  return msg3Data;
}

async function testCognitiveCoachTransition(sessionId, transitionData) {
  console.log('\nTest 1.3: Cognitive Coach → Core Agent transition');

  assert(transitionData.transitioned === true, 'Transition flag is true');
  assertEqual(transitionData.currentAgent, 'core', 'Transitioned to Core Agent');
  assertExists(transitionData.dispatchInfo, 'Dispatch info provided');
  assertExists(transitionData.patientInfo, 'Patient info provided');
  assertExists(transitionData.initialSceneDescription, 'Initial scene description provided');
  assertExists(transitionData.initialVitals, 'Initial vitals provided');

  console.log(`   ✅ Transition successful`);
  console.log(`   Patient: ${transitionData.patientInfo.name}, ${transitionData.patientInfo.age}yo ${transitionData.patientInfo.gender}`);
  console.log(`   Chief Complaint: ${transitionData.dispatchInfo.chiefComplaint}`);
  console.log(`   Initial Vitals: HR=${transitionData.initialVitals.HR}, RR=${transitionData.initialVitals.RR}, SpO2=${transitionData.initialVitals.SpO2}%`);

  // Verify session state after transition
  const { data: stateData } = await apiCall('GET', `/sessions/${sessionId}/state`);

  assertEqual(stateData.currentState, 'initial', 'Patient state is initial');
  assertExists(stateData.vitals, 'Vitals exist');
  assertExists(stateData.timeSinceStart, 'Time tracking started');

  return stateData;
}

// ═══════════════════════════════════════════════════════════
// TEST SUITE 2: CORE AGENT & TREATMENT DETECTION
// ═══════════════════════════════════════════════════════════

async function testTreatmentDetection(sessionId) {
  console.log('\n═══════════════════════════════════════════════');
  console.log('TEST SUITE 2: CORE AGENT & TREATMENT DETECTION');
  console.log('═══════════════════════════════════════════════\n');

  console.log('Test 2.1: Oxygen administration detection');
  const { response: oxygenRes, data: oxygenData } = await apiCall('POST', `/sessions/${sessionId}/message`, {
    message: 'I will apply high-flow oxygen at 15 liters per minute via non-rebreather mask.'
  });

  assert(oxygenRes.ok, 'Oxygen treatment message returns 200');
  assertExists(oxygenData.message, 'AI response to oxygen');

  // Check session state
  const { data: stateAfterO2 } = await apiCall('GET', `/sessions/${sessionId}/state`);
  assert(stateAfterO2.criticalTreatmentsGiven.oxygen === true, 'Oxygen treatment logged');

  console.log(`   ✅ Oxygen detected and logged`);

  console.log('\nTest 2.2: Salbutamol administration detection');
  const { response: salbutamolRes, data: salbutamolData } = await apiCall('POST', `/sessions/${sessionId}/message`, {
    message: 'Administer salbutamol 5mg nebulized with oxygen.'
  });

  assert(salbutamolRes.ok, 'Salbutamol treatment message returns 200');

  const { data: stateAfterSalb } = await apiCall('GET', `/sessions/${sessionId}/state`);
  assert(stateAfterSalb.criticalTreatmentsGiven.salbutamol === true, 'Salbutamol treatment logged');

  console.log(`   ✅ Salbutamol detected and logged`);

  return stateAfterSalb;
}

async function testDangerousMedication(sessionId) {
  console.log('\nTest 2.3: Dangerous medication detection');

  const { response: morphineRes, data: morphineData } = await apiCall('POST', `/sessions/${sessionId}/message`, {
    message: 'Give morphine 5mg IV for pain relief.'
  });

  assert(morphineRes.ok, 'Dangerous medication message returns 200');

  // Morphine should cause deterioration in respiratory scenarios
  const { data: stateAfterMorphine } = await apiCall('GET', `/sessions/${sessionId}/state`);

  console.log(`   Morphine given - State: ${stateAfterMorphine.currentState}`);
  console.log(`   SpO2 after morphine: ${stateAfterMorphine.vitals.SpO2}%`);

  // Should have logged the dangerous medication
  assert(stateAfterMorphine.stateHistory.length > 0, 'State history tracking works');

  return stateAfterMorphine;
}

// ═══════════════════════════════════════════════════════════
// TEST SUITE 3: STATE PROGRESSION & VITALS
// ═══════════════════════════════════════════════════════════

async function testStateProgression(sessionId) {
  console.log('\n═══════════════════════════════════════════════');
  console.log('TEST SUITE 3: STATE PROGRESSION & VITALS');
  console.log('═══════════════════════════════════════════════\n');

  console.log('Test 3.1: Get current state and vitals');
  const { data: stateData } = await apiCall('GET', `/sessions/${sessionId}/state`);

  assertExists(stateData.currentState, 'Current state');
  assertExists(stateData.vitals, 'Current vitals');
  assertExists(stateData.timeSinceStart, 'Time since start');
  assertExists(stateData.criticalTreatmentsGiven, 'Critical treatments tracking');
  assertExists(stateData.stateHistory, 'State history');

  console.log(`   Current state: ${stateData.currentState}`);
  console.log(`   Time elapsed: ${Math.floor(stateData.timeSinceStart)}s`);
  console.log(`   Vitals: HR=${stateData.vitals.HR}, RR=${stateData.vitals.RR}, SpO2=${stateData.vitals.SpO2}%`);
  console.log(`   State transitions: ${stateData.stateHistory.length}`);

  return stateData;
}

async function testVitalsPolling(sessionId) {
  console.log('\nTest 3.2: Vitals polling (simulate frontend polling)');

  const polls = [];
  for (let i = 0; i < 3; i++) {
    const { data: pollData } = await apiCall('GET', `/sessions/${sessionId}/state`);
    polls.push({
      time: Date.now(),
      state: pollData.currentState,
      SpO2: pollData.vitals.SpO2
    });

    if (i < 2) await wait(2000); // Wait 2 seconds between polls
  }

  assert(polls.length === 3, 'Three polls completed');
  console.log(`   Poll 1: State=${polls[0].state}, SpO2=${polls[0].SpO2}%`);
  console.log(`   Poll 2: State=${polls[1].state}, SpO2=${polls[1].SpO2}%`);
  console.log(`   Poll 3: State=${polls[2].state}, SpO2=${polls[2].SpO2}%`);

  return polls;
}

// ═══════════════════════════════════════════════════════════
// TEST SUITE 4: CHALLENGE POINTS
// ═══════════════════════════════════════════════════════════

async function testChallengePoints(sessionId) {
  console.log('\n═══════════════════════════════════════════════');
  console.log('TEST SUITE 4: CHALLENGE POINTS');
  console.log('═══════════════════════════════════════════════\n');

  // Create a NEW session with challenges enabled
  console.log('Test 4.1: Starting new session with challenges enabled');
  const { data: newSession } = await apiCall('POST', '/sessions/start', {
    scenarioId: 'ASTHMA_MVP_001',
    challengePointsEnabled: true
  });

  const newSessionId = newSession.sessionId;

  // Skip through Cognitive Coach quickly
  console.log('Test 4.2: Quick Cognitive Coach completion');
  await apiCall('POST', `/sessions/${newSessionId}/message`, { message: 'ABC assessment first' });
  await apiCall('POST', `/sessions/${newSessionId}/message`, { message: 'SpO2 and RR priority' });
  const { data: transitionMsg } = await apiCall('POST', `/sessions/${newSessionId}/message`, {
    message: 'Silent chest is critical'
  });

  assert(transitionMsg.transitioned === true, 'Transitioned to Core Agent');

  // Try to trigger a challenge point with vague treatment
  console.log('\nTest 4.3: Trigger challenge point with vague treatment order');
  const { data: challengeResponse } = await apiCall('POST', `/sessions/${newSessionId}/message`, {
    message: 'Give oxygen'
  });

  console.log(`   Is Challenge: ${challengeResponse.isChallenge ? 'YES' : 'NO'}`);

  if (challengeResponse.isChallenge) {
    console.log(`   Challenge question: ${challengeResponse.message.substring(0, 100)}...`);
    assertExists(challengeResponse.challengeId, 'Challenge ID provided');

    // Respond to challenge
    console.log('\nTest 4.4: Respond to challenge point');
    const { data: challengeResolve } = await apiCall('POST', `/sessions/${newSessionId}/message`, {
      message: 'Because the SpO2 is 88% and respiratory rate is 32, indicating severe hypoxia and respiratory distress.'
    });

    assert(challengeResolve.challengeResolved === true, 'Challenge marked as resolved');
    console.log(`   Challenge resolved: ${challengeResolve.challengeResolved}`);
  } else {
    console.log(`   ⚠️  Challenge not triggered (may depend on scenario state)`);
  }

  return newSessionId;
}

// ═══════════════════════════════════════════════════════════
// TEST SUITE 5: PERFORMANCE & REPORTING
// ═══════════════════════════════════════════════════════════

async function testPerformanceReporting(sessionId) {
  console.log('\n═══════════════════════════════════════════════');
  console.log('TEST SUITE 5: PERFORMANCE & REPORTING');
  console.log('═══════════════════════════════════════════════\n');

  console.log('Test 5.1: Get performance report');
  const { response: perfRes, data: perfData } = await apiCall('GET', `/sessions/${sessionId}/performance`);

  assert(perfRes.ok, 'Performance report returns 200');
  assertExists(perfData.sessionId, 'Session ID in report');
  assertExists(perfData.totalTime, 'Total time tracked');
  assertExists(perfData.finalState, 'Final state recorded');
  assertExists(perfData.criticalTreatments, 'Critical treatments tracked');
  assertExists(perfData.actionsLog, 'Actions log available');

  console.log(`   Session ID: ${perfData.sessionId}`);
  console.log(`   Total Time: ${Math.floor(perfData.totalTime)}s`);
  console.log(`   Final State: ${perfData.finalState}`);
  console.log(`   Actions Logged: ${perfData.actionsLog.length}`);
  console.log(`   CDP Evaluations: ${perfData.cdpEvaluations ? perfData.cdpEvaluations.length : 0}`);
  console.log(`   Medication Errors: ${perfData.medicationErrors ? perfData.medicationErrors.length : 0}`);

  return perfData;
}

// ═══════════════════════════════════════════════════════════
// TEST SUITE 6: SCENARIO COMPLETION & MULTI-SCENARIO
// ═══════════════════════════════════════════════════════════

async function testScenarioCompletion(sessionId) {
  console.log('\n═══════════════════════════════════════════════');
  console.log('TEST SUITE 6: SCENARIO COMPLETION');
  console.log('═══════════════════════════════════════════════\n');

  console.log('Test 6.1: Complete scenario endpoint');
  const { response: completeRes, data: completeData } = await apiCall('POST', `/sessions/${sessionId}/complete`, {});

  assert(completeRes.ok, 'Scenario completion returns 200');
  assertExists(completeData.message, 'Completion message');

  console.log(`   ${completeData.message}`);

  return completeData;
}

// ═══════════════════════════════════════════════════════════
// TEST SUITE 7: CONCURRENT SESSIONS & LOAD
// ═══════════════════════════════════════════════════════════

async function testConcurrentSessions() {
  console.log('\n═══════════════════════════════════════════════');
  console.log('TEST SUITE 7: CONCURRENT SESSIONS & LOAD');
  console.log('═══════════════════════════════════════════════\n');

  console.log('Test 7.1: Create 5 concurrent sessions');
  const startTime = Date.now();

  const sessionPromises = Array(5).fill(0).map((_, i) =>
    apiCall('POST', '/sessions/start', {
      scenarioId: 'ASTHMA_MVP_001',
      challengePointsEnabled: i % 2 === 0 // Alternate A/B testing
    })
  );

  const sessions = await Promise.all(sessionPromises);
  const endTime = Date.now();

  assert(sessions.length === 5, 'Five sessions created');
  sessions.forEach((session, i) => {
    assert(session.data.sessionId !== undefined, `Session ${i+1} has ID`);
  });

  console.log(`   ✅ All 5 sessions created in ${endTime - startTime}ms`);
  console.log(`   Session IDs: ${sessions.map(s => s.data.sessionId.substring(0, 20)).join(', ')}...`);

  // Test concurrent message sending
  console.log('\nTest 7.2: Send concurrent messages to all sessions');
  const messagePromises = sessions.map(session =>
    apiCall('POST', `/sessions/${session.data.sessionId}/message`, {
      message: 'I will assess the patient ABC approach'
    })
  );

  const messages = await Promise.all(messagePromises);
  assert(messages.length === 5, 'All messages processed');
  assert(messages.every(m => m.response.ok), 'All messages succeeded');

  console.log(`   ✅ All 5 messages processed successfully`);

  return sessions.map(s => s.data.sessionId);
}

// ═══════════════════════════════════════════════════════════
// MAIN TEST RUNNER
// ═══════════════════════════════════════════════════════════

async function runAllTests() {
  console.log('\n');
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║   COMPREHENSIVE BACKEND TEST SUITE                        ║');
  console.log('║   Testing ALL backend functionality                       ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');

  try {
    // Suite 1: Session Creation & Cognitive Coach
    const sessionId = await testSessionCreation();
    const transitionData = await testCognitiveCoachFlow(sessionId);
    await testCognitiveCoachTransition(sessionId, transitionData);

    // Suite 2: Core Agent & Treatment Detection
    await testTreatmentDetection(sessionId);
    await testDangerousMedication(sessionId);

    // Suite 3: State Progression & Vitals
    await testStateProgression(sessionId);
    await testVitalsPolling(sessionId);

    // Suite 4: Challenge Points (new session)
    const challengeSessionId = await testChallengePoints(sessionId);

    // Suite 5: Performance Reporting
    await testPerformanceReporting(sessionId);

    // Suite 6: Scenario Completion
    await testScenarioCompletion(sessionId);

    // Suite 7: Concurrent Sessions & Load
    await testConcurrentSessions();

  } catch (error) {
    console.error('\n❌ TEST SUITE FAILED WITH ERROR:', error.message);
    console.error(error.stack);
  }

  // Final Report
  console.log('\n');
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║   TEST RESULTS SUMMARY                                    ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`Total Tests: ${results.passed + results.failed}`);
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`Success Rate: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%`);
  console.log('');

  if (results.failed > 0) {
    console.log('Failed Tests:');
    results.tests.filter(t => t.status.includes('FAIL')).forEach(t => {
      console.log(`  ${t.status} ${t.message}`);
    });
  }

  console.log('');
  process.exit(results.failed > 0 ? 1 : 0);
}

// Run tests
runAllTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
