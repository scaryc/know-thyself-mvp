/**
 * Database Service - Handles all database operations for sessions
 * Replaces in-memory Map storage with SQLite/PostgreSQL persistence
 */

import { PrismaClient } from '@prisma/client';

// Singleton pattern for Prisma client with proper connection management
let prisma;

function getPrismaClient() {
  if (!prisma) {
    // Build connection string with pgbouncer mode to avoid prepared statement conflicts
    let databaseUrl = process.env.DATABASE_URL;

    // Add pgbouncer=true to connection string if not present
    // This disables prepared statements and prevents "already exists" errors
    if (databaseUrl && !databaseUrl.includes('pgbouncer=')) {
      const separator = databaseUrl.includes('?') ? '&' : '?';
      databaseUrl = `${databaseUrl}${separator}pgbouncer=true`;
    }

    prisma = new PrismaClient({
      log: ['error', 'warn'],
      datasources: {
        db: {
          url: databaseUrl
        }
      }
    });

    // Handle connection errors
    prisma.$connect()
      .then(() => console.log('✅ Prisma connected successfully (pgbouncer mode)'))
      .catch((error) => {
        console.error('❌ Prisma connection error:', error);
        prisma = null; // Reset on error to allow retry
      });
  }
  return prisma;
}

class DatabaseService {

  // Get Prisma client on demand
  get client() {
    return getPrismaClient();
  }

  /**
   * Create a new session in database
   * @param {Object} sessionData - Session object from server
   * @returns {Promise<Object>} - Created session
   */
  async createSession(sessionData) {
    try {
      // Parse JSON fields for storage
      const session = await this.client.session.create({
        data: {
          id: sessionData.sessionId,

          // Student identity
          studentId: sessionData.studentId,
          studentName: sessionData.studentName,
          studentEmail: sessionData.studentEmail,
          group: sessionData.group,

          // Session metadata
          scenarioId: sessionData.scenarioId,
          status: 'IN_PROGRESS',
          currentAgent: sessionData.currentAgent || 'cognitive_coach',

          // Scenario progress
          currentScenarioIndex: sessionData.currentScenarioIndex || 0,
          scenarioQueue: JSON.stringify(sessionData.scenarioQueue || []),
          completedScenarios: JSON.stringify(sessionData.completedScenarios || []),
          sessionComplete: false,
          isAARMode: false,

          // Cognitive Coach
          cognitiveCoachState: sessionData.cognitiveCoach ? JSON.stringify(sessionData.cognitiveCoach) : null,

          // Performance tracking
          performanceScore: 0,
          optimalCount: 0,
          acceptableCount: 0,
          suboptimalCount: 0,
          dangerousCount: 0,
          cdpEvaluations: JSON.stringify([]),

          // Medication safety
          medicationErrors: JSON.stringify([]),
          medicationWarnings: JSON.stringify([]),
          safetyViolations: 0,

          // Challenge Points
          challengePointsEnabled: sessionData.challengePointsEnabled || false,
          challengePointsUsed: JSON.stringify([]),
          activeChallenge: null,

          // Critical actions
          criticalActionsLog: JSON.stringify([]),
          criticalTreatmentsGiven: JSON.stringify({}),

          // Patient state
          currentState: null,
          stateHistory: JSON.stringify([]),
          currentVitals: null,

          // Scenario data
          scenarioData: null,
          dispatchInfo: null,
          patientInfo: null,

          // Performance history
          scenarioPerformanceHistory: JSON.stringify([]),
          scenarioStartTime: sessionData.startTime ? sessionData.startTime.toString() : null,
        },
      });

      console.log('✅ Session created in database:', session.id);
      return session;
    } catch (error) {
      console.error('❌ Error creating session:', error);
      throw error;
    }
  }

  /**
   * Get session from database
   * @param {string} sessionId
   * @returns {Promise<Object|null>} - Session object or null
   */
  async getSession(sessionId) {
    try {
      const session = await this.client.session.findUnique({
        where: { id: sessionId },
        include: {
          messages: {
            orderBy: { timestamp: 'asc' }
          },
          vitalSignsLog: {
            orderBy: { timestamp: 'asc' }
          },
          performance: true
        }
      });

      return session;
    } catch (error) {
      console.error('❌ Error getting session:', error);
      throw error;
    }
  }

  /**
   * Update session in database
   * @param {string} sessionId
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} - Updated session
   */
  async updateSession(sessionId, updates) {
    try {
      // Convert any JSON fields to strings
      const processedUpdates = {};
      for (const [key, value] of Object.entries(updates)) {
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          processedUpdates[key] = JSON.stringify(value);
        } else if (Array.isArray(value)) {
          processedUpdates[key] = JSON.stringify(value);
        } else {
          processedUpdates[key] = value;
        }
      }

      const session = await this.client.session.update({
        where: { id: sessionId },
        data: processedUpdates
      });

      return session;
    } catch (error) {
      console.error('❌ Error updating session:', error);
      throw error;
    }
  }

  /**
   * Add message to conversation history
   * @param {string} sessionId
   * @param {string} role - "user" or "assistant"
   * @param {string} content - Message content
   * @returns {Promise<Object>} - Created message
   */
  async addMessage(sessionId, role, content) {
    try {
      const message = await this.client.message.create({
        data: {
          sessionId: sessionId,
          role: role,
          content: content
        }
      });

      return message;
    } catch (error) {
      console.error('❌ Error adding message:', error);
      throw error;
    }
  }

  /**
   * Log vital signs snapshot
   * @param {string} sessionId
   * @param {Object} vitals - Vital signs data
   * @returns {Promise<Object>} - Created vital signs log
   */
  async logVitalSigns(sessionId, vitals) {
    try {
      const vitalLog = await this.client.vitalSignsLog.create({
        data: {
          sessionId: sessionId,
          heartRate: vitals.heartRate,
          respRate: vitals.respiratoryRate || vitals.respRate,
          spO2: vitals.spO2,
          systolic: vitals.bloodPressure?.systolic,
          diastolic: vitals.bloodPressure?.diastolic,
          temperature: vitals.temperature,
          gcs: vitals.gcs,
          glucose: vitals.glucose,
          patientState: vitals.state
        }
      });

      return vitalLog;
    } catch (error) {
      console.error('❌ Error logging vital signs:', error);
      throw error;
    }
  }

  /**
   * Mark session as complete and save performance data
   * @param {string} sessionId
   * @param {Object} performanceData
   * @returns {Promise<Object>}
   */
  async completeSession(sessionId, performanceData) {
    try {
      // Update session status
      await this.client.session.update({
        where: { id: sessionId },
        data: {
          status: 'COMPLETED',
          sessionComplete: true,
          completedAt: new Date()
        }
      });

      // Save performance data
      const performance = await this.client.performanceData.create({
        data: {
          sessionId: sessionId,
          totalMessages: performanceData.totalMessages || 0,
          totalDuration: performanceData.totalDuration || 0,
          scenariosCompleted: performanceData.scenariosCompleted || 0,
          overallScore: performanceData.overallScore || 0,
          optimalTotal: performanceData.optimalTotal || 0,
          acceptableTotal: performanceData.acceptableTotal || 0,
          suboptimalTotal: performanceData.suboptimalTotal || 0,
          dangerousTotal: performanceData.dangerousTotal || 0,
          criticalActionsCompleted: performanceData.criticalActionsCompleted || 0,
          criticalActionsMissed: performanceData.criticalActionsMissed || 0,
          medicationErrorCount: performanceData.medicationErrorCount || 0,
          medicationWarningCount: performanceData.medicationWarningCount || 0,
          safetyScore: performanceData.safetyScore || 0,
          challengePointsCount: performanceData.challengePointsCount || 0,
          patternAnalysisResults: performanceData.patternAnalysisResults ? JSON.stringify(performanceData.patternAnalysisResults) : null
        }
      });

      console.log('✅ Session completed:', sessionId);
      return { session: true, performance };
    } catch (error) {
      console.error('❌ Error completing session:', error);
      throw error;
    }
  }

  /**
   * Get all active sessions (for monitoring)
   * @returns {Promise<Array>}
   */
  async getActiveSessions() {
    try {
      const sessions = await this.client.session.findMany({
        where: {
          status: 'IN_PROGRESS'
        },
        select: {
          id: true,
          studentId: true,
          studentName: true,
          currentAgent: true,
          currentScenarioIndex: true,
          startedAt: true
        },
        orderBy: {
          startedAt: 'desc'
        }
      });

      return sessions;
    } catch (error) {
      console.error('❌ Error getting active sessions:', error);
      throw error;
    }
  }

  /**
   * Cleanup: Close database connection
   */
  async disconnect() {
    if (prisma) {
      await prisma.$disconnect();
      prisma = null; // Reset after disconnect
    }
  }

  /**
   * Get Prisma client instance (for direct queries if needed)
   */
  get prisma() {
    return this.client;
  }
}

// Export singleton instance
export default new DatabaseService();
