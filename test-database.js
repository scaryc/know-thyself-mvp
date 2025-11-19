/**
 * Test script for database service
 * Verifies that session persistence works correctly
 */

import db from './server/services/databaseService.js';
import { dbToRuntimeSession, runtimeToDbSession } from './server/services/sessionHelpers.js';

async function testDatabaseService() {
  console.log('\n🧪 Testing Database Service\n');
  console.log('=' .repeat(60));

  try {
    // Test 1: Create session
    console.log('\n1️⃣  Creating test session...');
    const testSessionData = {
      sessionId: `test_${Date.now()}`,
      studentId: 'test_student_001',
      studentName: 'Test Student',
      studentEmail: 'test@example.com',
      group: 'A',
      scenarioId: 'asthma_patient_v2.0_final',
      currentAgent: 'cognitive_coach',
      scenarioQueue: ['asthma', 'stemi', 'epilepsy'],
      challengePointsEnabled: true,
      cognitiveCoach: {
        selectedQuestions: ['q1', 'q2', 'q3'],
        currentQuestionIndex: 0,
        responses: [],
        completed: false
      },
      startTime: Date.now()
    };

    const created = await db.createSession(testSessionData);
    console.log('✅ Session created with ID:', created.id);

    // Test 2: Retrieve session
    console.log('\n2️⃣  Retrieving session...');
    const retrieved = await db.getSession(created.id);
    if (retrieved) {
      console.log('✅ Session retrieved successfully');
      console.log('   Student:', retrieved.studentName);
      console.log('   Group:', retrieved.group);
      console.log('   Challenge Points:', retrieved.challengePointsEnabled);
    } else {
      throw new Error('Failed to retrieve session');
    }

    // Test 3: Convert to runtime format
    console.log('\n3️⃣  Converting to runtime format...');
    const runtimeSession = dbToRuntimeSession(retrieved);
    console.log('✅ Conversion successful');
    console.log('   Scenario Queue:', runtimeSession.scenarioQueue);
    console.log('   Cognitive Coach Questions:', runtimeSession.cognitiveCoach?.selectedQuestions?.length || 0);

    // Test 4: Add messages
    console.log('\n4️⃣  Adding messages...');
    await db.addMessage(created.id, 'assistant', 'Hello! Welcome to the training session.');
    await db.addMessage(created.id, 'user', 'Hi, I\'m ready to start.');
    await db.addMessage(created.id, 'assistant', 'Great! Let\'s begin with the cognitive coach...');

    const withMessages = await db.getSession(created.id);
    console.log('✅ Messages added:', withMessages.messages.length);

    // Test 5: Update session
    console.log('\n5️⃣  Updating session...');
    await db.updateSession(created.id, {
      currentScenarioIndex: 1,
      performanceScore: 85,
      optimalCount: 5,
      acceptableCount: 2,
      currentAgent: 'core_agent'
    });

    const updated = await db.getSession(created.id);
    console.log('✅ Session updated');
    console.log('   Current Agent:', updated.currentAgent);
    console.log('   Scenario Index:', updated.currentScenarioIndex);
    console.log('   Performance Score:', updated.performanceScore);

    // Test 6: Log vital signs
    console.log('\n6️⃣  Logging vital signs...');
    await db.logVitalSigns(created.id, {
      heartRate: 112,
      respiratoryRate: 28,
      spO2: 91,
      bloodPressure: { systolic: 145, diastolic: 88 },
      temperature: 37.2,
      gcs: 15,
      glucose: 5.5,
      state: 'initial'
    });

    const withVitals = await db.getSession(created.id);
    console.log('✅ Vitals logged:', withVitals.vitalSignsLog.length, 'entries');

    // Test 7: Get active sessions
    console.log('\n7️⃣  Getting active sessions...');
    const activeSessions = await db.getActiveSessions();
    console.log('✅ Active sessions found:', activeSessions.length);

    // Test 8: Complete session
    console.log('\n8️⃣  Completing session...');
    await db.completeSession(created.id, {
      totalMessages: withMessages.messages.length,
      totalDuration: 1800,
      scenariosCompleted: 3,
      overallScore: 87,
      optimalTotal: 15,
      acceptableTotal: 5,
      suboptimalTotal: 2,
      dangerousTotal: 0,
      criticalActionsCompleted: 18,
      criticalActionsMissed: 3,
      medicationErrorCount: 0,
      medicationWarningCount: 1,
      safetyScore: 95.0,
      challengePointsCount: 4
    });

    const completed = await db.getSession(created.id);
    console.log('✅ Session completed');
    console.log('   Status:', completed.status);
    console.log('   Has Performance Data:', completed.performance ? 'Yes' : 'No');

    console.log('\n' + '='.repeat(60));
    console.log('✅ ALL TESTS PASSED!\n');
    console.log('Database file location: prisma/dev.db');
    console.log('Session ID for verification:', created.id);
    console.log('='.repeat(60) + '\n');

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    console.error(error);
  } finally {
    await db.disconnect();
    console.log('\n👋 Database connection closed\n');
  }
}

// Run the test
testDatabaseService();
