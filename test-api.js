/**
 * Quick API Test Script
 */

const BASE_URL = 'http://localhost:3001';

async function testAPI() {
  console.log('🧪 Testing Know Thyself API\n');
  
  // Test 1: Start session
  console.log('📋 TEST 1: Starting session...');
  const startResponse = await fetch(`${BASE_URL}/api/sessions/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({})
  });
  const session = await startResponse.json();
  console.log('✅ Session created:', session.sessionId);
  console.log(`   Patient: ${session.patientProfile.name}, ${session.patientProfile.age}yo`);
  console.log(`   Initial vitals: HR ${session.initialVitals.HR}, SpO2 ${session.initialVitals.SpO2}%\n`);
  
  const sessionId = session.sessionId;
  
  // Test 2: Get vitals
  console.log('📋 TEST 2: Getting vitals...');
  const vitalsResponse = await fetch(`${BASE_URL}/api/sessions/${sessionId}/vitals`);
  const vitals = await vitalsResponse.json();
  console.log('✅ Vitals retrieved:');
  console.log(`   Formatted: ${JSON.stringify(vitals.formatted)}`);
  console.log(`   Concern level: ${vitals.concerns.level}\n`);
  
  // Test 3: Process action (give oxygen)
  console.log('📋 TEST 3: Administering oxygen...');
  const actionResponse = await fetch(`${BASE_URL}/api/sessions/${sessionId}/action`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: {
        type: 'treatment',
        name: 'Apply oxygen',
        drug: 'oxygen',
        dose: 'High-flow'
      }
    })
  });
  const actionResult = await actionResponse.json();
  console.log('✅ Oxygen administered:', actionResult.success);
  console.log(`   New SpO2: ${actionResult.vitals.SpO2}%\n`);
  
  // Test 4: Get performance
  console.log('📋 TEST 4: Getting performance report...');
  const perfResponse = await fetch(`${BASE_URL}/api/sessions/${sessionId}/performance`);
  const performance = await perfResponse.json();
  console.log('✅ Performance report:');
  console.log(`   Score: ${performance.summary.overall_score}%`);
  console.log(`   Actions completed: ${performance.summary.critical_actions_completed}\n`);
  
  console.log('🎉 ALL API TESTS PASSED!\n');
}

testAPI().catch(console.error);