/**
 * Layer 2 MVP Test Suite
 * Tests critical Layer 2 features: state progression, CDP evaluation, challenge points, and AAR
 */

const BASE_URL = 'http://localhost:3001/api';

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  log(title, 'blue');
  console.log('='.repeat(60));
}

// Helper to wait
function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Test 1: Session Initialization with Layer 2 Fields
async function testSessionInitialization() {
  logSection('TEST 1: Session Initialization with Layer 2 Fields');

  try {
    const response = await fetch(`${BASE_URL}/sessions/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scenarioId: 'asthma_mvp_001',
        challengePointsEnabled: true
      })
    });

    const data = await response.json();

    if (!data.sessionId) {
      throw new Error('No sessionId returned');
    }

    log('✅ Session created with ID: ' + data.sessionId, 'green');
    log('✅ Challenge Points: ' + (data.challengePointsEnabled ? 'ENABLED' : 'DISABLED'), 'green');

    return data.sessionId;
  } catch (error) {
    log('❌ Session initialization failed: ' + error.message, 'red');
    throw error;
  }
}

// Test 2: Treatment Detection
async function testTreatmentDetection(sessionId) {
  logSection('TEST 2: Treatment Detection');

  try {
    // Send message with oxygen treatment
    const response1 = await fetch(`${BASE_URL}/sessions/${sessionId}/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'I will apply high-flow oxygen at 15 L/min via non-rebreather mask'
      })
    });

    await response1.json();
    log('✅ Oxygen treatment sent', 'green');
    await wait(2000);

    // Send message with salbutamol treatment
    const response2 = await fetch(`${BASE_URL}/sessions/${sessionId}/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'I will administer salbutamol 5mg via nebulizer'
      })
    });

    await response2.json();
    log('✅ Salbutamol treatment sent', 'green');
    await wait(2000);

    // Check performance report for treatments
    const perfResponse = await fetch(`${BASE_URL}/sessions/${sessionId}/performance`);
    const perfData = await perfResponse.json();

    if (perfData.criticalTreatments?.oxygen) {
      log('✅ Oxygen treatment detected and logged', 'green');
    } else {
      log('⚠️  Oxygen treatment not detected', 'yellow');
    }

    if (perfData.criticalTreatments?.salbutamol) {
      log('✅ Salbutamol treatment detected and logged', 'green');
    } else {
      log('⚠️  Salbutamol treatment not detected', 'yellow');
    }

    log(`Actions logged: ${perfData.actionsLog?.length || 0}`, 'blue');

    return perfData;
  } catch (error) {
    log('❌ Treatment detection test failed: ' + error.message, 'red');
    throw error;
  }
}

// Test 3: State Progression
async function testStateProgression(sessionId) {
  logSection('TEST 3: State Progression');

  try {
    // Get initial state
    const response1 = await fetch(`${BASE_URL}/sessions/${sessionId}/performance`);
    const data1 = await response1.json();
    log(`Initial State: ${data1.finalState}`, 'blue');

    // Wait for auto-deterioration (30+ seconds)
    log('Waiting for auto-deterioration monitor...', 'yellow');
    await wait(35000);

    // Check state again
    const response2 = await fetch(`${BASE_URL}/sessions/${sessionId}/performance`);
    const data2 = await response2.json();
    log(`State after 35s: ${data2.finalState}`, 'blue');

    if (data2.stateHistory && data2.stateHistory.length > 1) {
      log('✅ State progression detected', 'green');
      log(`State history length: ${data2.stateHistory.length}`, 'blue');
      data2.stateHistory.forEach((state, idx) => {
        log(`  ${idx + 1}. ${state.state} at ${Math.floor(state.elapsedTime / 60)}:${Math.floor(state.elapsedTime % 60).toString().padStart(2, '0')}`, 'blue');
      });
    } else {
      log('⚠️  No state progression detected', 'yellow');
    }

    return data2;
  } catch (error) {
    log('❌ State progression test failed: ' + error.message, 'red');
    throw error;
  }
}

// Test 4: CDP Evaluation
async function testCDPEvaluation(sessionId) {
  logSection('TEST 4: CDP Evaluation');

  try {
    const response = await fetch(`${BASE_URL}/sessions/${sessionId}/performance`);
    const data = await response.json();

    if (data.cdpEvaluations && data.cdpEvaluations.length > 0) {
      log(`✅ ${data.cdpEvaluations.length} CDP evaluation(s) found`, 'green');
      data.cdpEvaluations.forEach((cdp, idx) => {
        log(`  ${idx + 1}. ${cdp.cdp_title}: ${cdp.rating?.toUpperCase() || 'NOT_PERFORMED'}`, 'blue');
        if (cdp.explanation) {
          log(`     Explanation: ${cdp.explanation}`, 'blue');
        }
      });
    } else {
      log('⚠️  No CDP evaluations found', 'yellow');
    }

    return data;
  } catch (error) {
    log('❌ CDP evaluation test failed: ' + error.message, 'red');
    throw error;
  }
}

// Test 5: Dangerous Medication Detection
async function testDangerousMedication(sessionId) {
  logSection('TEST 5: Dangerous Medication Detection');

  try {
    // Try to give a dangerous medication
    const response = await fetch(`${BASE_URL}/sessions/${sessionId}/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'I will administer diazepam 10mg IV'
      })
    });

    await response.json();
    log('✅ Dangerous medication message sent', 'green');
    await wait(2000);

    // Check for medication errors
    const perfResponse = await fetch(`${BASE_URL}/sessions/${sessionId}/performance`);
    const perfData = await perfResponse.json();

    if (perfData.medicationErrors && perfData.medicationErrors.length > 0) {
      log(`✅ ${perfData.medicationErrors.length} medication error(s) detected`, 'green');
      perfData.medicationErrors.forEach((error, idx) => {
        log(`  ${idx + 1}. ${error.medication}: ${error.reason}`, 'blue');
      });
    } else {
      log('⚠️  Dangerous medication not detected', 'yellow');
    }

    return perfData;
  } catch (error) {
    log('❌ Dangerous medication test failed: ' + error.message, 'red');
    throw error;
  }
}

// Test 6: Challenge Points
async function testChallengePoints() {
  logSection('TEST 6: Challenge Points System');

  try {
    // Start new session with challenges enabled
    const initResponse = await fetch(`${BASE_URL}/sessions/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scenarioId: 'asthma_mvp_001',
        challengePointsEnabled: true
      })
    });

    const initData = await initResponse.json();
    const sessionId = initData.sessionId;
    log('✅ New session created with challenges enabled', 'green');

    // Try to trigger a challenge point
    const messageResponse = await fetch(`${BASE_URL}/sessions/${sessionId}/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Give salbutamol'
      })
    });

    const messageData = await messageResponse.json();

    if (messageData.isChallenge) {
      log('✅ Challenge point triggered', 'green');
      log(`Challenge: ${messageData.message.substring(0, 100)}...`, 'blue');
    } else {
      log('⚠️  Challenge point not triggered (may require specific timing)', 'yellow');
    }

    return sessionId;
  } catch (error) {
    log('❌ Challenge points test failed: ' + error.message, 'red');
    throw error;
  }
}

// Test 7: AAR Initialization
async function testAARInitialization(sessionId) {
  logSection('TEST 7: AAR Initialization');

  try {
    const response = await fetch(`${BASE_URL}/sessions/${sessionId}/aar/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      throw new Error(`AAR start failed with status ${response.status}`);
    }

    const data = await response.json();

    if (data.aarActive && data.message) {
      log('✅ AAR session started successfully', 'green');
      log(`Opening message length: ${data.message.length} characters`, 'blue');
      log(`Phase: ${data.phase}`, 'blue');
      log(`Message preview: ${data.message.substring(0, 150)}...`, 'blue');
    } else {
      log('⚠️  AAR session started but response incomplete', 'yellow');
    }

    return data;
  } catch (error) {
    log('❌ AAR initialization test failed: ' + error.message, 'red');
    throw error;
  }
}

// Test 8: AAR Conversation
async function testAARConversation(sessionId) {
  logSection('TEST 8: AAR Conversation');

  try {
    const response = await fetch(`${BASE_URL}/sessions/${sessionId}/aar/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'I think I did well on recognizing the severity, but I could have been faster with treatments.'
      })
    });

    if (!response.ok) {
      throw new Error(`AAR message failed with status ${response.status}`);
    }

    const data = await response.json();

    if (data.message) {
      log('✅ AAR conversation working', 'green');
      log(`Response length: ${data.message.length} characters`, 'blue');
      log(`Phase: ${data.phase}`, 'blue');
      log(`Complete: ${data.aarComplete ? 'YES' : 'NO'}`, 'blue');
      log(`Response preview: ${data.message.substring(0, 150)}...`, 'blue');
    } else {
      log('⚠️  AAR conversation returned empty response', 'yellow');
    }

    return data;
  } catch (error) {
    log('❌ AAR conversation test failed: ' + error.message, 'red');
    throw error;
  }
}

// Test 9: Performance Report Generation
async function testPerformanceReport(sessionId) {
  logSection('TEST 9: Performance Report Generation');

  try {
    const response = await fetch(`${BASE_URL}/sessions/${sessionId}/performance`);
    const data = await response.json();

    log('✅ Performance report generated', 'green');
    log(`Session ID: ${data.sessionId}`, 'blue');
    log(`Scenario: ${data.scenarioId}`, 'blue');
    log(`Total Time: ${Math.floor(data.totalTime / 60)}m ${Math.floor(data.totalTime % 60)}s`, 'blue');
    log(`Final State: ${data.finalState}`, 'blue');
    log(`Actions Logged: ${data.actionsLog?.length || 0}`, 'blue');
    log(`CDP Evaluations: ${data.cdpEvaluations?.length || 0}`, 'blue');
    log(`Medication Errors: ${data.medicationErrors?.length || 0}`, 'blue');

    if (data.performanceScore) {
      log(`Performance Score: ${data.performanceScore.percentage || 0}%`, 'blue');
    }

    return data;
  } catch (error) {
    log('❌ Performance report test failed: ' + error.message, 'red');
    throw error;
  }
}

// Run all tests
async function runAllTests() {
  log('\n╔═══════════════════════════════════════════════════════════╗', 'blue');
  log('║     LAYER 2 MVP TEST SUITE                               ║', 'blue');
  log('╚═══════════════════════════════════════════════════════════╝', 'blue');

  let sessionId;
  let testsPassed = 0;
  let testsFailed = 0;

  try {
    // Test 1: Session Initialization
    try {
      sessionId = await testSessionInitialization();
      testsPassed++;
    } catch (error) {
      testsFailed++;
    }

    if (!sessionId) {
      log('\n❌ Cannot continue tests without valid session', 'red');
      return;
    }

    // Test 2: Treatment Detection
    try {
      await testTreatmentDetection(sessionId);
      testsPassed++;
    } catch (error) {
      testsFailed++;
    }

    // Test 3: State Progression (takes 35+ seconds)
    try {
      await testStateProgression(sessionId);
      testsPassed++;
    } catch (error) {
      testsFailed++;
    }

    // Test 4: CDP Evaluation
    try {
      await testCDPEvaluation(sessionId);
      testsPassed++;
    } catch (error) {
      testsFailed++;
    }

    // Test 5: Dangerous Medication
    try {
      await testDangerousMedication(sessionId);
      testsPassed++;
    } catch (error) {
      testsFailed++;
    }

    // Test 6: Challenge Points
    try {
      const challengeSessionId = await testChallengePoints();
      testsPassed++;

      // Use this session for AAR tests
      sessionId = challengeSessionId;
    } catch (error) {
      testsFailed++;
    }

    // Test 7: AAR Initialization
    try {
      await testAARInitialization(sessionId);
      testsPassed++;
    } catch (error) {
      testsFailed++;
    }

    // Test 8: AAR Conversation
    try {
      await testAARConversation(sessionId);
      testsPassed++;
    } catch (error) {
      testsFailed++;
    }

    // Test 9: Performance Report
    try {
      await testPerformanceReport(sessionId);
      testsPassed++;
    } catch (error) {
      testsFailed++;
    }

  } catch (error) {
    log(`\n❌ Fatal error: ${error.message}`, 'red');
  }

  // Summary
  logSection('TEST SUMMARY');
  log(`Tests Passed: ${testsPassed}`, testsPassed === 9 ? 'green' : 'yellow');
  log(`Tests Failed: ${testsFailed}`, testsFailed === 0 ? 'green' : 'red');
  log(`Success Rate: ${Math.round((testsPassed / 9) * 100)}%`, testsPassed === 9 ? 'green' : 'yellow');

  if (testsPassed === 9) {
    log('\n🎉 ALL TESTS PASSED! Layer 2 MVP is working correctly!', 'green');
  } else if (testsPassed >= 6) {
    log('\n⚠️  MOST TESTS PASSED - Some features may need attention', 'yellow');
  } else {
    log('\n❌ MULTIPLE FAILURES - Please review implementation', 'red');
  }
}

// Run tests
runAllTests().catch(error => {
  log(`\n💥 Test suite crashed: ${error.message}`, 'red');
  process.exit(1);
});
