# Session Persistence and Database Development Plan
**Know Thyself Medical Training Platform - Data Persistence & Analysis Infrastructure**

**Document Version:** 1.0
**Date:** November 19, 2025
**Author:** Development Team
**Priority:** HIGH (Critical for 20+ concurrent students)

---

## Executive Summary

This development plan addresses two critical infrastructure needs for the Know Thyself platform:

### **Part 1: Active Session Persistence** ⚠️ CRITICAL
**Problem:** Sessions currently stored in-memory (Map) are lost on server restart/crash
**Impact:** 20 students × 30-minute sessions = High risk of data loss during testing
**Solution:** PostgreSQL database integration with Prisma ORM
**Effort:** 6-8 hours
**Priority:** CRITICAL for multi-student testing

### **Part 2: Python Data Analysis Script** 📊 HIGH
**Problem:** Student data saved as individual JSON files, difficult to analyze in aggregate
**Impact:** Cannot easily perform A/B testing analysis, statistical research, or cohort comparisons
**Solution:** Comprehensive Python script to extract, transform, and export research-ready datasets
**Effort:** 4-6 hours
**Priority:** HIGH for research analysis and thesis work

### **Combined Benefits**
- ✅ Zero data loss risk (active session persistence)
- ✅ Handles 20+ concurrent students safely
- ✅ Comprehensive research-grade data export
- ✅ A/B testing statistical analysis ready
- ✅ Publication-ready datasets (CSV, Excel, SPSS-compatible)

---

# PART 1: ACTIVE SESSION PERSISTENCE

## 1. Problem Analysis

### Current State: In-Memory Storage (RISKY)

**Location:** `server/index.js:32`
```javascript
const sessions = new Map();  // ❌ Lost on server restart
```

**Session Structure (30+ fields stored in RAM):**
```javascript
session = {
  sessionId, currentAgent, scenarioId,
  studentId, studentName, studentEmail, group,
  currentScenarioIndex, scenarioQueue, completedScenarios,
  scenarioPerformanceHistory, sessionComplete, isAARMode,
  messages, cognitiveCoach, cdpEvaluations,
  performanceScore, optimalCount, acceptableCount,
  medicationErrors, medicationWarnings, safetyViolations,
  challengePointsEnabled, challengePointsUsed,
  criticalActionsLog, stateHistory, vitals,
  scenarioEngine, currentState, startTime,
  // ... 30+ total fields
}
```

### Risk Assessment

| Scenario | Risk Level | Impact | Probability |
|----------|-----------|--------|-------------|
| **Server crash during 20-student session** | 🔴 CRITICAL | All active students lose 30min of work | MEDIUM (15%) |
| **Server restart required (updates, errors)** | 🔴 CRITICAL | All active sessions lost | HIGH (40%) |
| **Server timeout/memory issue** | 🟠 HIGH | Partial data loss | MEDIUM (20%) |
| **Power outage/hardware failure** | 🔴 CRITICAL | Complete data loss | LOW (5%) |

**Expected Loss Rate:** With 20 students, probability of at least 1 incident = **~60%**

### Target State: Database Persistence (SAFE)

**Architecture:**
```
┌─────────────────────────────────────────────────┐
│  Express Server (Stateless)                     │
│  - Handles API requests                         │
│  - Loads session from DB on each request        │
│  - Saves session back to DB after updates       │
└─────────────────────────────────────────────────┘
                    ↕ (reads/writes)
┌─────────────────────────────────────────────────┐
│  PostgreSQL Database (Persistent)               │
│  - Session table (main session data)            │
│  - Message table (conversation history)         │
│  - VitalSignsLog table (vital signs timeline)   │
│  - PerformanceData table (performance metrics)  │
└─────────────────────────────────────────────────┘
```

**Benefits:**
- ✅ Sessions survive server restart
- ✅ Automatic backups (database level)
- ✅ Concurrent access handling
- ✅ Transaction safety (ACID compliance)
- ✅ Scalable to 100+ students

---

## 2. Current vs Target Schema

### Existing Prisma Schema (Already Defined)

**File:** `prisma/schema.prisma`

```prisma
// Current schema (DEFINED but NOT CONNECTED)
model Session {
  id            String         @id @default(uuid())
  userId        String         @default("demo-user")
  scenarioType  String
  status        SessionStatus  @default(IN_PROGRESS)
  startedAt     DateTime       @default(now())
  completedAt   DateTime?

  messages      Message[]
  vitalSigns    VitalSignsLog[]
  performance   PerformanceData?
}

model Message {
  id          String   @id @default(uuid())
  sessionId   String
  role        String   // "user" or "assistant"
  content     String   @db.Text
  timestamp   DateTime @default(now())

  session     Session  @relation(fields: [sessionId], references: [id])
}

model VitalSignsLog {
  id            String   @id @default(uuid())
  sessionId     String
  timestamp     DateTime @default(now())

  bloodPressure String
  heartRate     Int
  respRate      Int
  spO2          Int
  painScore     Int

  session       Session  @relation(fields: [sessionId], references: [id])
}

model PerformanceData {
  id                      String  @id @default(uuid())
  sessionId               String  @unique

  totalMessages           Int
  hintsUsed               Int
  completionRate          Float
  assessmentCompleteness  Float
  criticalActions         Json
  safetyScore             Float

  session                 Session @relation(fields: [sessionId], references: [id])
}
```

### ⚠️ Schema Gap Analysis

**Current schema covers only ~20% of actual session data!**

**Missing Fields (Must Add):**

1. **Student Identity:**
   - `studentId` (critical for linking)
   - `studentName`
   - `studentEmail`
   - `group` (A/B testing)

2. **Session State:**
   - `currentAgent` (cognitive_coach, core_agent, aar_agent)
   - `currentScenarioIndex`
   - `scenarioQueue` (JSON array)
   - `completedScenarios` (JSON array)
   - `scenarioPerformanceHistory` (JSON - critical for AAR!)
   - `sessionComplete` (boolean)
   - `isAARMode` (boolean)

3. **Cognitive Coach State:**
   - `cognitiveCoachState` (JSON - selected questions, responses)

4. **Performance Tracking:**
   - `cdpEvaluations` (JSON array)
   - `performanceScore` (int)
   - `optimalCount`, `acceptableCount`, `suboptimalCount`, `dangerousCount` (int)
   - `medicationErrors`, `medicationWarnings` (JSON arrays)
   - `safetyViolations` (int)

5. **Challenge Points (A/B Testing):**
   - `challengePointsEnabled` (boolean - CRITICAL)
   - `challengePointsUsed` (JSON array - CRITICAL)
   - `activeChallenge` (JSON)

6. **Critical Actions:**
   - `criticalActionsLog` (JSON array)
   - `criticalTreatmentsGiven` (JSON)

7. **Patient State:**
   - `currentState` (string)
   - `stateHistory` (JSON array)
   - `vitals` (JSON - current vitals)

8. **Scenario Data:**
   - `scenarioId` (string)
   - `scenarioData` (JSON - full scenario blueprint)
   - `dispatchInfo` (JSON)
   - `patientInfo` (JSON)

---

## 3. Updated Schema Design

### New Comprehensive Schema

**File:** `prisma/schema.prisma` (UPDATED)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ============================================================================
// MAIN SESSION TABLE
// ============================================================================
model Session {
  id            String         @id @default(uuid())

  // Student Identity (Layer 3 - MVP Testing)
  studentId     String?
  studentName   String?
  studentEmail  String?
  group         String?        // "A" or "B" for A/B testing

  // Session Metadata
  scenarioId    String?
  status        SessionStatus  @default(IN_PROGRESS)
  startedAt     DateTime       @default(now())
  completedAt   DateTime?

  // Agent State
  currentAgent  String         @default("cognitive_coach")  // cognitive_coach, core_agent, aar_agent

  // Scenario Progress
  currentScenarioIndex  Int    @default(0)
  scenarioQueue         Json   // Array of scenario IDs
  completedScenarios    Json   @default("[]")  // Array of completed scenario data
  sessionComplete       Boolean @default(false)
  isAARMode             Boolean @default(false)

  // Cognitive Coach State
  cognitiveCoachState   Json?  // { selectedQuestions, currentQuestionIndex, responses, completed }

  // Performance Tracking (CDP System)
  performanceScore      Int    @default(0)
  optimalCount          Int    @default(0)
  acceptableCount       Int    @default(0)
  suboptimalCount       Int    @default(0)
  dangerousCount        Int    @default(0)
  cdpEvaluations        Json   @default("[]")  // Array of CDP evaluations

  // Medication Safety
  medicationErrors      Json   @default("[]")
  medicationWarnings    Json   @default("[]")
  safetyViolations      Int    @default(0)

  // Challenge Points System (A/B Testing - CRITICAL)
  challengePointsEnabled Boolean @default(false)
  challengePointsUsed    Json   @default("[]")
  activeChallenge        Json?

  // Critical Actions Tracking
  criticalActionsLog     Json   @default("[]")
  criticalTreatmentsGiven Json  @default("{}")

  // Patient State
  currentState          String?
  stateHistory          Json   @default("[]")
  currentVitals         Json?  // Current vital signs

  // Scenario Context
  scenarioData          Json?  // Full scenario blueprint (Layer 2)
  dispatchInfo          Json?
  patientInfo           Json?

  // Performance History (For AAR Agent)
  scenarioPerformanceHistory Json @default("[]")  // CRITICAL: Array of 3 scenario snapshots

  // Timestamp tracking
  scenarioStartTime     BigInt?  // Scenario-specific start time

  // Relations
  messages      Message[]
  vitalSignsLog VitalSignsLog[]
  performance   PerformanceData?

  @@index([studentId])
  @@index([status])
  @@index([group])  // For A/B testing queries
  @@index([startedAt])
}

enum SessionStatus {
  IN_PROGRESS
  PAUSED
  COMPLETED
  ABANDONED
}

// ============================================================================
// MESSAGE TABLE (Conversation History)
// ============================================================================
model Message {
  id          String   @id @default(uuid())
  sessionId   String
  role        String   // "user" or "assistant"
  content     String   @db.Text
  timestamp   DateTime @default(now())

  session     Session  @relation(fields: [sessionId], references: [id], onDelete: Cascade)

  @@index([sessionId])
  @@index([timestamp])
}

// ============================================================================
// VITAL SIGNS LOG (Time-Series Data)
// ============================================================================
model VitalSignsLog {
  id            String   @id @default(uuid())
  sessionId     String
  timestamp     DateTime @default(now())

  // Vital signs snapshot
  heartRate     Int?
  respRate      Int?
  spO2          Int?
  systolic      Int?
  diastolic     Int?
  temperature   Float?
  gcs           Int?
  glucose       Float?

  // Patient state at this time
  patientState  String?

  session       Session  @relation(fields: [sessionId], references: [id], onDelete: Cascade)

  @@index([sessionId])
  @@index([timestamp])
}

// ============================================================================
// PERFORMANCE DATA (Final Scores)
// ============================================================================
model PerformanceData {
  id                      String  @id @default(uuid())
  sessionId               String  @unique

  // Overall metrics
  totalMessages           Int
  totalDuration           Int     // seconds
  scenariosCompleted      Int

  // CDP Performance
  overallScore            Int
  optimalTotal            Int
  acceptableTotal         Int
  suboptimalTotal         Int
  dangerousTotal          Int

  // Critical actions
  criticalActionsCompleted Int
  criticalActionsMissed    Int

  // Safety
  medicationErrorCount    Int
  medicationWarningCount  Int
  safetyScore             Float

  // A/B Testing metrics
  challengePointsCount    Int     // How many challenge points used

  // Analysis results (from pattern analysis)
  patternAnalysisResults  Json?   // Full pattern analysis from AAR

  session                 Session @relation(fields: [sessionId], references: [id], onDelete: Cascade)

  @@index([overallScore])
  @@index([scenariosCompleted])
}

// ============================================================================
// STUDENT TABLE (Optional - for future user management)
// ============================================================================
model Student {
  id            String   @id @default(uuid())
  studentId     String   @unique  // Generated ID
  name          String
  email         String?
  group         String   // "A" or "B"
  registeredAt  DateTime @default(now())

  @@index([studentId])
  @@index([group])
}
```

---

## 4. Implementation Plan - Part 1A: Database Setup

### Step 1: Database Setup (30 minutes)

#### 1.1 Install PostgreSQL

**Option A: Local Development (Recommended for testing)**
```bash
# Windows (using Chocolatey)
choco install postgresql

# Or download installer from:
# https://www.postgresql.org/download/windows/

# Start PostgreSQL service
net start postgresql
```

**Option B: Docker (Alternative)**
```bash
docker run --name postgres-knowthyself \
  -e POSTGRES_USER=knowthyself \
  -e POSTGRES_PASSWORD=dev_password_123 \
  -e POSTGRES_DB=knowthyself_dev \
  -p 5432:5432 \
  -d postgres:15
```

**Option C: Cloud Database (Production)**
- Supabase (Free tier: 500MB)
- Railway (Free tier available)
- Neon (Serverless PostgreSQL)

#### 1.2 Create Database

```sql
-- Connect to PostgreSQL
psql -U postgres

-- Create database
CREATE DATABASE knowthyself_dev;

-- Create user (if needed)
CREATE USER knowthyself_user WITH PASSWORD 'secure_password_here';
GRANT ALL PRIVILEGES ON DATABASE knowthyself_dev TO knowthyself_user;
```

#### 1.3 Configure Environment Variables

**File:** `.env`

```bash
# Database Connection
DATABASE_URL="postgresql://knowthyself_user:secure_password_here@localhost:5432/knowthyself_dev?schema=public"

# Existing variables
ANTHROPIC_API_KEY=your_api_key_here
PORT=3001
```

**Important:** Add `.env` to `.gitignore` if not already there!

#### 1.4 Update Prisma Schema

**Action:** Replace `prisma/schema.prisma` with the updated schema from Section 3

**File:** `prisma/schema.prisma`

```bash
# Copy the new comprehensive schema from Section 3 above
# Ensure all fields match current session structure
```

---

### Step 2: Prisma Setup and Migration (30 minutes)

#### 2.1 Generate Prisma Client

```bash
# Generate Prisma client from schema
npx prisma generate
```

**Expected Output:**
```
✔ Generated Prisma Client (5.x.x) to ./node_modules/@prisma/client
```

#### 2.2 Create Initial Migration

```bash
# Create migration from schema
npx prisma migrate dev --name initial_session_persistence

# This will:
# 1. Create migration files
# 2. Apply migration to database
# 3. Generate Prisma Client
```

**Expected Output:**
```
Applying migration `20251119_initial_session_persistence`
✅ Migration applied successfully

Database schema updated:
  - Created table "Session"
  - Created table "Message"
  - Created table "VitalSignsLog"
  - Created table "PerformanceData"
  - Created table "Student"
```

#### 2.3 Verify Database Schema

```bash
# Open Prisma Studio to inspect database
npx prisma studio

# Or connect with psql
psql -U knowthyself_user -d knowthyself_dev
\dt  # List tables
\d "Session"  # Describe Session table
```

**Expected Tables:**
- Session (with ~40 columns)
- Message
- VitalSignsLog
- PerformanceData
- Student
- _prisma_migrations (auto-created)

---

## 5. Implementation Plan - Part 1B: Code Refactoring

### Step 3: Database Service Layer (2 hours)

#### 3.1 Create Database Service

**File:** `server/services/databaseService.js`

```javascript
/**
 * Database Service - Handles all database operations for sessions
 * Replaces in-memory Map storage with PostgreSQL persistence
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: ['error', 'warn'], // Enable logging for debugging
});

class DatabaseService {

  /**
   * Create a new session in database
   * @param {Object} sessionData - Session object from server
   * @returns {Promise<Object>} - Created session
   */
  async createSession(sessionData) {
    try {
      const session = await prisma.session.create({
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
          scenarioQueue: sessionData.scenarioQueue || [],
          completedScenarios: sessionData.completedScenarios || [],
          sessionComplete: false,
          isAARMode: false,

          // Cognitive Coach
          cognitiveCoachState: sessionData.cognitiveCoach || null,

          // Performance tracking
          performanceScore: 0,
          optimalCount: 0,
          acceptableCount: 0,
          suboptimalCount: 0,
          dangerousCount: 0,
          cdpEvaluations: [],

          // Medication safety
          medicationErrors: [],
          medicationWarnings: [],
          safetyViolations: 0,

          // Challenge Points
          challengePointsEnabled: sessionData.challengePointsEnabled || false,
          challengePointsUsed: [],
          activeChallenge: null,

          // Critical actions
          criticalActionsLog: [],
          criticalTreatmentsGiven: {},

          // Patient state
          currentState: null,
          stateHistory: [],
          currentVitals: null,

          // Scenario data
          scenarioData: null,
          dispatchInfo: null,
          patientInfo: null,

          // Performance history
          scenarioPerformanceHistory: [],
          scenarioStartTime: sessionData.startTime ? BigInt(sessionData.startTime) : null,
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
      const session = await prisma.session.findUnique({
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
      const session = await prisma.session.update({
        where: { id: sessionId },
        data: updates
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
      const message = await prisma.message.create({
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
      const vitalLog = await prisma.vitalSignsLog.create({
        data: {
          sessionId: sessionId,
          heartRate: vitals.heartRate,
          respRate: vitals.respiratoryRate,
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
      await prisma.session.update({
        where: { id: sessionId },
        data: {
          status: 'COMPLETED',
          sessionComplete: true,
          completedAt: new Date()
        }
      });

      // Save performance data
      const performance = await prisma.performanceData.create({
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
          patternAnalysisResults: performanceData.patternAnalysisResults || null
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
      const sessions = await prisma.session.findMany({
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
    await prisma.$disconnect();
  }
}

// Export singleton instance
export default new DatabaseService();
```

#### 3.2 Create Session Helper Functions

**File:** `server/services/sessionHelpers.js`

```javascript
/**
 * Session Helpers - Convert between database and in-memory formats
 */

/**
 * Convert database session to runtime session object
 * (Adds non-persisted runtime fields like scenarioEngine)
 */
export function dbToRuntimeSession(dbSession) {
  return {
    sessionId: dbSession.id,

    // Copy all database fields
    ...dbSession,

    // Convert BigInt to Number for JavaScript
    startTime: dbSession.scenarioStartTime ? Number(dbSession.scenarioStartTime) : Date.now(),

    // Convert JSON fields back to objects/arrays
    scenarioQueue: dbSession.scenarioQueue || [],
    completedScenarios: dbSession.completedScenarios || [],
    scenarioPerformanceHistory: dbSession.scenarioPerformanceHistory || [],
    cdpEvaluations: dbSession.cdpEvaluations || [],
    medicationErrors: dbSession.medicationErrors || [],
    medicationWarnings: dbSession.medicationWarnings || [],
    challengePointsUsed: dbSession.challengePointsUsed || [],
    criticalActionsLog: dbSession.criticalActionsLog || [],
    criticalTreatmentsGiven: dbSession.criticalTreatmentsGiven || {},
    stateHistory: dbSession.stateHistory || [],

    // Convert messages array to proper format
    messages: (dbSession.messages || []).map(m => ({
      role: m.role,
      content: m.content,
      timestamp: m.timestamp
    })),

    // Runtime-only fields (not in database)
    engine: null,  // Will be reconstructed when needed
    scenario: null,  // Will be loaded from scenarioData
    measuredVitals: null,  // Will be reconstructed

    // Cognitive coach state
    cognitiveCoach: dbSession.cognitiveCoachState || {
      selectedQuestions: [],
      currentQuestionIndex: 0,
      responses: [],
      startTime: Date.now(),
      completed: false
    }
  };
}

/**
 * Convert runtime session to database-safe format
 * (Removes runtime-only fields, converts to JSON)
 */
export function runtimeToDbSession(session) {
  return {
    // Student identity
    studentId: session.studentId,
    studentName: session.studentName,
    studentEmail: session.studentEmail,
    group: session.group,

    // Session metadata
    scenarioId: session.scenarioId,
    currentAgent: session.currentAgent,

    // Scenario progress
    currentScenarioIndex: session.currentScenarioIndex,
    scenarioQueue: session.scenarioQueue,
    completedScenarios: session.completedScenarios,
    sessionComplete: session.sessionComplete,
    isAARMode: session.isAARMode,

    // Cognitive Coach
    cognitiveCoachState: session.cognitiveCoach,

    // Performance tracking
    performanceScore: session.performanceScore || 0,
    optimalCount: session.optimalCount || 0,
    acceptableCount: session.acceptableCount || 0,
    suboptimalCount: session.suboptimalCount || 0,
    dangerousCount: session.dangerousCount || 0,
    cdpEvaluations: session.cdpEvaluations || [],

    // Medication safety
    medicationErrors: session.medicationErrors || [],
    medicationWarnings: session.medicationWarnings || [],
    safetyViolations: session.safetyViolations || 0,

    // Challenge Points
    challengePointsEnabled: session.challengePointsEnabled,
    challengePointsUsed: session.challengePointsUsed || [],
    activeChallenge: session.activeChallenge,

    // Critical actions
    criticalActionsLog: session.criticalActionsLog || [],
    criticalTreatmentsGiven: session.criticalTreatmentsGiven || {},

    // Patient state
    currentState: session.currentState,
    stateHistory: session.stateHistory || [],
    currentVitals: session.vitals || session.currentVitals,

    // Scenario data (store full blueprint if available)
    scenarioData: session.scenario || session.scenarioData,
    dispatchInfo: session.dispatchInfo,
    patientInfo: session.patientInfo,

    // Performance history
    scenarioPerformanceHistory: session.scenarioPerformanceHistory || [],

    // Timestamps
    scenarioStartTime: session.scenarioStartTime ? BigInt(session.scenarioStartTime) : null,
  };
}

/**
 * Extract fields that have changed (for efficient updates)
 */
export function getChangedFields(oldSession, newSession) {
  const changes = {};
  const dbFormat = runtimeToDbSession(newSession);

  for (const key in dbFormat) {
    if (JSON.stringify(oldSession[key]) !== JSON.stringify(dbFormat[key])) {
      changes[key] = dbFormat[key];
    }
  }

  return changes;
}
```

---

### Step 4: Refactor Server Code (3-4 hours)

#### 4.1 Update Server Imports

**File:** `server/index.js` (TOP OF FILE)

```javascript
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import ScenarioEngine from './services/scenarioEngine.js';

// ✅ NEW: Import database service
import db from './services/databaseService.js';
import { dbToRuntimeSession, runtimeToDbSession } from './services/sessionHelpers.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import cognitiveCoachPromptBuilder from './services/cognitiveCoachPrompt.js';
import cognitiveCoachService from './services/cognitiveCoachService.js';
import aarService from './services/aarService.js';

// Initialize
const app = express();
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Middleware
app.use(cors());
app.use(express.json());

// ❌ REMOVE: In-memory session storage
// const sessions = new Map();  // DELETE THIS LINE

// ✅ NEW: Session cache (optional - for performance)
// Keeps sessions in memory for faster access, but backed by database
const sessionCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get session from cache or database
 */
async function getSession(sessionId) {
  // Check cache first
  const cached = sessionCache.get(sessionId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.session;
  }

  // Load from database
  const dbSession = await db.getSession(sessionId);
  if (!dbSession) return null;

  // Convert to runtime format
  const session = dbToRuntimeSession(dbSession);

  // Cache it
  sessionCache.set(sessionId, {
    session: session,
    timestamp: Date.now()
  });

  return session;
}

/**
 * Save session to database (and update cache)
 */
async function saveSession(session) {
  const updates = runtimeToDbSession(session);
  await db.updateSession(session.sessionId, updates);

  // Update cache
  sessionCache.set(session.sessionId, {
    session: session,
    timestamp: Date.now()
  });
}
```

#### 4.2 Update Session Creation Endpoint

**File:** `server/index.js` - `POST /api/sessions/start`

```javascript
/**
 * POST /api/sessions/start
 * Start a new training session with Cognitive Coach
 */
app.post('/api/sessions/start', async (req, res) => {
  try {
    const { studentId, scenarioId, scenarioQueue } = req.body;

    // Validate inputs
    if (!studentId) {
      return res.status(400).json({ error: 'Student ID required' });
    }

    // Load student data (existing code)
    const studentFilePath = path.join(__dirname, '../data/students', `${studentId}.json`);
    let studentData = null;
    if (fs.existsSync(studentFilePath)) {
      studentData = JSON.parse(fs.readFileSync(studentFilePath, 'utf8'));
    }

    // Generate session ID
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;

    // Load scenario for Cognitive Coach questions
    const scenario = loadScenario(scenarioId);
    const learningObjectives = scenario.learning_objectives || [];
    const selectedQuestions = cognitiveCoachService.selectReflectionQuestions(learningObjectives);

    // Determine challenge points setting
    const challengePointsEnabled = studentData?.group === 'A';

    // ✅ NEW: Create session object
    const session = {
      sessionId,
      currentAgent: 'cognitive_coach',
      scenarioId: scenarioId,

      // Student identity
      studentId: studentData?.studentId || null,
      studentName: studentData?.studentName || null,
      studentEmail: studentData?.studentEmail || null,
      group: studentData?.group || null,

      // Session tracking
      currentScenarioIndex: 0,
      scenarioQueue: scenarioQueue || [],
      completedScenarios: [],
      scenarioPerformanceHistory: [],
      sessionComplete: false,
      isAARMode: false,
      dispatchInfo: null,
      patientInfo: null,

      // Cognitive Coach state
      cognitiveCoach: {
        selectedQuestions: selectedQuestions.map(q => q.questionID),
        currentQuestionIndex: 0,
        responses: [],
        startTime: Date.now(),
        completed: false
      },

      // Performance tracking
      cdpEvaluations: [],
      performanceScore: 0,
      optimalCount: 0,
      acceptableCount: 0,
      suboptimalCount: 0,
      dangerousCount: 0,

      // Medication safety
      medicationErrors: [],
      medicationWarnings: [],
      safetyViolations: 0,

      // Challenge Points
      challengePointsEnabled: challengePointsEnabled,
      challengePointsUsed: [],
      activeChallenge: null,

      // Messages and timing
      messages: [],
      startTime: Date.now()
    };

    // ✅ NEW: Save to database instead of Map
    await db.createSession(session);

    // Update student file (existing code)
    if (studentData) {
      try {
        studentData.sessionId = sessionId;
        studentData.status = 'active';
        fs.writeFileSync(studentFilePath, JSON.stringify(studentData, null, 2));
      } catch (error) {
        console.error('Error updating student file:', error);
      }
    }

    console.log('✅ Session created in database:', sessionId);

    // Generate initial Cognitive Coach greeting (existing code)
    try {
      const systemPrompt = cognitiveCoachPromptBuilder.buildCognitiveCoachPrompt(session);

      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system: systemPrompt,
        messages: []
      });

      const greeting = response.content[0].text;

      // ✅ NEW: Add message to database
      await db.addMessage(sessionId, 'assistant', greeting);

      // ✅ NEW: Update session messages in cache
      const updatedSession = await getSession(sessionId);
      updatedSession.messages.push({ role: 'assistant', content: greeting });
      await saveSession(updatedSession);

      return res.json({
        sessionId,
        message: greeting,
        questionsRemaining: selectedQuestions.length,
        challengePointsEnabled: challengePointsEnabled
      });

    } catch (error) {
      console.error('Error generating Cognitive Coach greeting:', error);
      return res.status(500).json({ error: 'Failed to initialize Cognitive Coach' });
    }

  } catch (error) {
    console.error('Error starting session:', error);
    res.status(500).json({ error: 'Failed to start session' });
  }
});
```

#### 4.3 Update Message Endpoint

**File:** `server/index.js` - `POST /api/sessions/:id/message`

```javascript
/**
 * POST /api/sessions/:id/message
 * Send message to current agent
 */
app.post('/api/sessions/:id/message', async (req, res) => {
  try {
    const { id } = req.params;
    const { message } = req.body;

    // ✅ NEW: Load session from database
    const session = await getSession(id);

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // ✅ NEW: Add user message to database
    await db.addMessage(id, 'user', message);
    session.messages.push({ role: 'user', content: message });

    // Route to correct agent (existing logic)
    let aiResponse;

    if (session.currentAgent === 'cognitive_coach') {
      // Cognitive Coach logic (existing code)
      // ... cognitive coach handling ...

      aiResponse = "...";  // Get response from Claude

      // ✅ NEW: Save assistant response to database
      await db.addMessage(id, 'assistant', aiResponse);
      session.messages.push({ role: 'assistant', content: aiResponse });

      // ✅ NEW: Update session state in database
      await saveSession(session);

    } else if (session.currentAgent === 'core_agent') {
      // Core Agent logic (existing code)
      // ... patient simulation handling ...

      aiResponse = "...";  // Get response from Claude

      // ✅ NEW: Save to database
      await db.addMessage(id, 'assistant', aiResponse);
      session.messages.push({ role: 'assistant', content: aiResponse });
      await saveSession(session);

    } else if (session.currentAgent === 'aar_agent') {
      // AAR Agent logic (existing code)
      // ... AAR handling ...

      aiResponse = "...";  // Get response from Claude

      // ✅ NEW: Save to database
      await db.addMessage(id, 'assistant', aiResponse);
      session.messages.push({ role: 'assistant', content: aiResponse });
      await saveSession(session);
    }

    res.json({ message: aiResponse });

  } catch (error) {
    console.error('Error processing message:', error);
    res.status(500).json({ error: 'Failed to process message' });
  }
});
```

#### 4.4 Update All Other Endpoints

**Pattern for all endpoints:**

```javascript
// ❌ OLD:
const session = sessions.get(sessionId);
if (!session) { ... }

// ✅ NEW:
const session = await getSession(sessionId);
if (!session) { ... }

// ... make changes to session ...

// ✅ NEW: Save changes
await saveSession(session);
```

**Endpoints to update:**
1. `GET /api/sessions/:sessionId/check` - Session resume
2. `POST /api/sessions/:id/begin-scenario` - Start scenario
3. `POST /api/sessions/:id/complete` - Complete scenario
4. `POST /api/sessions/:id/next-scenario` - Next scenario
5. `POST /api/sessions/:sessionId/action` - Student action
6. `GET /api/sessions/:sessionId/vitals` - Get vitals
7. `GET /api/sessions/:sessionId/state` - Get session state
8. `GET /api/sessions/:sessionId/performance` - Get performance
9. `DELETE /api/sessions/:sessionId` - Cleanup
10. `POST /api/sessions/:sessionId/aar/start` - Start AAR
11. `POST /api/sessions/:sessionId/aar/message` - AAR message
12. `GET /api/sessions/:sessionId/aar/status` - AAR status

**Time estimate:** ~2-3 hours to update all endpoints

---

## 6. Testing Plan - Part 1

### Test Phase 1: Database Connection (15 minutes)

```bash
# Test 1: Verify database connection
node -e "
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
prisma.\$connect()
  .then(() => console.log('✅ Database connected'))
  .catch(err => console.error('❌ Connection failed:', err))
  .finally(() => prisma.\$disconnect());
"

# Test 2: Verify tables exist
npx prisma studio
# Open browser, check tables are visible

# Test 3: Create test record
node -e "
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
prisma.session.create({
  data: {
    id: 'test_session_123',
    studentId: 'test_student',
    studentName: 'Test Student',
    currentAgent: 'cognitive_coach',
    scenarioQueue: ['asthma'],
    status: 'IN_PROGRESS'
  }
})
  .then(s => console.log('✅ Test session created:', s.id))
  .catch(err => console.error('❌ Failed:', err))
  .finally(() => prisma.\$disconnect());
"
```

### Test Phase 2: Single Session Flow (30 minutes)

**Test Script:**

```javascript
// tests/test-database-session.js
import db from '../server/services/databaseService.js';

async function testSessionFlow() {
  console.log('🧪 Testing database session flow...\n');

  try {
    // Test 1: Create session
    console.log('Test 1: Create session');
    const sessionData = {
      sessionId: `test_${Date.now()}`,
      studentId: 'alice_test',
      studentName: 'Alice Test',
      studentEmail: 'alice@test.com',
      group: 'A',
      scenarioId: 'asthma_patient_v2.0_final',
      currentAgent: 'cognitive_coach',
      scenarioQueue: ['asthma', 'stemi', 'epilepsy'],
      challengePointsEnabled: true,
      cognitiveCoach: {
        selectedQuestions: ['q1', 'q2'],
        currentQuestionIndex: 0,
        responses: [],
        completed: false
      },
      startTime: Date.now()
    };

    const created = await db.createSession(sessionData);
    console.log('✅ Session created:', created.id);

    // Test 2: Retrieve session
    console.log('\nTest 2: Retrieve session');
    const retrieved = await db.getSession(created.id);
    console.log('✅ Session retrieved:', retrieved.id);
    console.log('  Student:', retrieved.studentName);
    console.log('  Group:', retrieved.group);
    console.log('  Challenge Points:', retrieved.challengePointsEnabled);

    // Test 3: Add messages
    console.log('\nTest 3: Add messages');
    await db.addMessage(created.id, 'assistant', 'Hello! Welcome to the training.');
    await db.addMessage(created.id, 'user', 'Hi, I\'m ready to start.');
    await db.addMessage(created.id, 'assistant', 'Great! Let\'s begin...');
    const withMessages = await db.getSession(created.id);
    console.log('✅ Messages added:', withMessages.messages.length);

    // Test 4: Update session
    console.log('\nTest 4: Update session');
    await db.updateSession(created.id, {
      currentScenarioIndex: 1,
      performanceScore: 85,
      optimalCount: 5,
      acceptableCount: 2
    });
    const updated = await db.getSession(created.id);
    console.log('✅ Session updated:');
    console.log('  Scenario index:', updated.currentScenarioIndex);
    console.log('  Performance score:', updated.performanceScore);

    // Test 5: Log vital signs
    console.log('\nTest 5: Log vital signs');
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

    // Test 6: Complete session
    console.log('\nTest 6: Complete session');
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
    console.log('✅ Session completed:');
    console.log('  Status:', completed.status);
    console.log('  Performance saved:', completed.performance ? 'Yes' : 'No');

    console.log('\n✅ All tests passed!');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
  } finally {
    await db.disconnect();
  }
}

testSessionFlow();
```

**Run test:**
```bash
node tests/test-database-session.js
```

### Test Phase 3: Server Restart Persistence (15 minutes)

**Manual Test:**

1. Start server: `npm run server`
2. Create a session via API (use Postman or curl)
3. Send a few messages
4. **Restart server** (Ctrl+C, then restart)
5. Try to resume session - **should work!**

**Expected Result:**
- ✅ Session still exists after restart
- ✅ All messages preserved
- ✅ Can continue conversation

**If this works, database persistence is successful!**

### Test Phase 4: Concurrent Sessions (30 minutes)

**Test Script:**

```javascript
// tests/test-concurrent-sessions.js
import db from '../server/services/databaseService.js';

async function testConcurrentSessions() {
  console.log('🧪 Testing concurrent sessions...\n');

  const sessionIds = [];

  try {
    // Create 5 concurrent sessions
    console.log('Creating 5 concurrent sessions...');
    for (let i = 1; i <= 5; i++) {
      const session = await db.createSession({
        sessionId: `concurrent_test_${i}_${Date.now()}`,
        studentId: `student_${i}`,
        studentName: `Student ${i}`,
        group: i % 2 === 0 ? 'A' : 'B',
        scenarioId: 'asthma',
        currentAgent: 'cognitive_coach',
        scenarioQueue: ['asthma'],
        startTime: Date.now()
      });

      sessionIds.push(session.id);
      console.log(`✅ Session ${i} created:`, session.id);
    }

    // Verify all sessions exist
    console.log('\nVerifying all sessions exist...');
    for (const id of sessionIds) {
      const session = await db.getSession(id);
      if (!session) {
        throw new Error(`Session ${id} not found!`);
      }
      console.log(`✅ Session exists:`, id);
    }

    // Add messages to all sessions concurrently
    console.log('\nAdding messages to all sessions...');
    await Promise.all(
      sessionIds.map(id =>
        db.addMessage(id, 'user', 'Test message')
      )
    );
    console.log('✅ All messages added');

    // Verify message counts
    for (const id of sessionIds) {
      const session = await db.getSession(id);
      console.log(`✅ Session ${id}: ${session.messages.length} messages`);
    }

    console.log('\n✅ Concurrent session test passed!');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
  } finally {
    await db.disconnect();
  }
}

testConcurrentSessions();
```

**Run test:**
```bash
node tests/test-concurrent-sessions.js
```

---

## 7. Deployment Checklist - Part 1

### Pre-Deployment

- [ ] Database schema finalized and reviewed
- [ ] All migrations tested locally
- [ ] All endpoints updated to use database
- [ ] All tests passing (single session, concurrent, restart)
- [ ] Performance benchmarked (should be <100ms overhead)
- [ ] Environment variables documented
- [ ] Backup strategy defined

### Production Database Setup

**Option A: Supabase (Recommended for MVP)**

```bash
# 1. Create Supabase project at supabase.com
# 2. Get connection string from project settings
# 3. Update .env:
DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres"

# 4. Run migrations
npx prisma migrate deploy
```

**Option B: Railway**

```bash
# 1. Install Railway CLI
npm i -g @railway/cli

# 2. Login and create project
railway login
railway init

# 3. Add PostgreSQL
railway add postgresql

# 4. Link database
railway link

# 5. Get DATABASE_URL
railway variables

# 6. Run migrations
railway run npx prisma migrate deploy
```

### Monitoring and Maintenance

**Add health check endpoint:**

```javascript
// server/index.js
app.get('/api/health', async (req, res) => {
  try {
    await db.prisma.$queryRaw`SELECT 1`;
    const activeSessions = await db.getActiveSessions();

    res.json({
      status: 'healthy',
      database: 'connected',
      activeSessions: activeSessions.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      database: 'disconnected',
      error: error.message
    });
  }
});
```

**Access:** `http://localhost:3001/api/health`

---

# PART 2: PYTHON DATA ANALYSIS SCRIPT

## 1. Requirements Analysis

### Data Sources

**Input:** JSON files in `data/students/` directory

**Structure (per file):**
```json
{
  "studentId": "alice_smith_lx3k9p2m7",
  "studentName": "Alice Smith",
  "studentEmail": "alice@example.com",
  "group": "A",
  "sessionId": "session_...",
  "timestamps": {
    "registered": "2025-11-19T09:00:00Z",
    "sessionStarted": "2025-11-19T09:05:00Z",
    "sessionCompleted": "2025-11-19T10:15:00Z",
    "totalElapsed": "70 minutes 30 seconds"
  },
  "performance": {
    "overallScore": 87.5,
    "breakdown": { ... },
    "interpretation": "Good performance"
  },
  "scenarios": [
    {
      "scenarioId": "asthma_patient_v2.0_final",
      "scenarioTitle": "Acute Asthma Exacerbation",
      "duration": "20 minutes 15 seconds",
      "finalState": "improving",
      "finalVitals": { ... }
    }
  ],
  "criticalActions": [ ... ],
  "challengePoints": [ ... ],
  "aarTranscript": [ ... ],
  "metadata": { ... }
}
```

### Output Requirements

1. **Excel Workbook** (`student_data_analysis.xlsx`):
   - Sheet 1: Student Overview
   - Sheet 2: Overall Performance
   - Sheet 3: Scenario-Level Performance
   - Sheet 4: Pattern Analysis
   - Sheet 5: A/B Group Comparison
   - Sheet 6: Statistical Tests

2. **CSV Files** (for statistical software):
   - `students_overview.csv`
   - `scenario_performance.csv`
   - `critical_actions_timeline.csv`
   - `medications_administered.csv`
   - `challenge_points_usage.csv`

3. **Statistical Report** (`ab_testing_report.txt`):
   - Group comparison
   - t-test results
   - Effect sizes
   - Visualizations

---

## 2. Implementation Plan - Part 2

### Step 1: Setup Python Environment (15 minutes)

#### 1.1 Install Python Dependencies

**Create requirements file:**

**File:** `scripts/requirements.txt`

```txt
pandas>=2.0.0
numpy>=1.24.0
openpyxl>=3.1.0
scipy>=1.10.0
matplotlib>=3.7.0
seaborn>=0.12.0
python-dateutil>=2.8.0
```

**Install dependencies:**

```bash
# Create virtual environment (recommended)
python -m venv venv

# Activate (Windows)
venv\Scripts\activate

# Activate (Mac/Linux)
source venv/bin/activate

# Install packages
pip install -r scripts/requirements.txt
```

---

### Step 2: Create Data Extraction Script (2 hours)

**File:** `scripts/extract_student_data.py`

```python
"""
Student Data Extraction and Analysis Script
Extracts data from JSON files and exports to research-ready formats
"""

import json
import pandas as pd
import numpy as np
from pathlib import Path
from datetime import datetime
import warnings
warnings.filterwarnings('ignore')

class StudentDataExtractor:

    def __init__(self, data_dir='../data/students'):
        self.data_dir = Path(data_dir)
        self.students_data = []

    def load_all_students(self):
        """Load all student JSON files"""
        print("📂 Loading student data files...")

        json_files = list(self.data_dir.glob('*.json'))
        print(f"   Found {len(json_files)} student files")

        for file_path in json_files:
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    self.students_data.append(data)
            except Exception as e:
                print(f"   ⚠️  Error loading {file_path.name}: {e}")

        print(f"✅ Loaded {len(self.students_data)} student records\n")
        return self.students_data

    def extract_student_overview(self):
        """Extract student overview data"""
        print("📊 Extracting student overview...")

        records = []
        for student in self.students_data:
            record = {
                'student_id': student.get('studentId'),
                'student_name': student.get('studentName'),
                'student_email': student.get('studentEmail'),
                'ab_group': student.get('group'),
                'registered_at': student.get('timestamps', {}).get('registered'),
                'session_started': student.get('timestamps', {}).get('sessionStarted'),
                'session_completed': student.get('timestamps', {}).get('sessionCompleted'),
                'total_duration': student.get('timestamps', {}).get('totalElapsed'),
                'scenarios_completed': student.get('metadata', {}).get('scenariosCompleted', 0),
                'total_messages': student.get('metadata', {}).get('totalMessages', 0),
                'challenge_points_enabled': student.get('metadata', {}).get('challengePointsEnabled', False),
                'session_complete': student.get('metadata', {}).get('sessionComplete', False)
            }
            records.append(record)

        df = pd.DataFrame(records)
        print(f"✅ Extracted {len(df)} student overview records\n")
        return df

    def extract_overall_performance(self):
        """Extract overall performance metrics"""
        print("📊 Extracting overall performance...")

        records = []
        for student in self.students_data:
            perf = student.get('performance', {})
            breakdown = perf.get('breakdown', {})

            record = {
                'student_id': student.get('studentId'),
                'overall_score': perf.get('overallScore', 0),
                'performance_level': perf.get('interpretation', ''),
                'optimal_decisions': breakdown.get('optimal', 0),
                'acceptable_decisions': breakdown.get('acceptable', 0),
                'suboptimal_decisions': breakdown.get('suboptimal', 0),
                'dangerous_decisions': breakdown.get('dangerous', 0),
                'total_cdps': perf.get('totalCDPs', 0),
                'medication_errors': len(student.get('metadata', {}).get('medicationErrors', [])),
                'critical_actions_count': len(student.get('criticalActions', []))
            }
            records.append(record)

        df = pd.DataFrame(records)
        print(f"✅ Extracted {len(df)} performance records\n")
        return df

    def extract_scenario_performance(self):
        """Extract scenario-level performance data"""
        print("📊 Extracting scenario-level performance...")

        records = []
        for student in self.students_data:
            student_id = student.get('studentId')
            scenarios = student.get('scenarios', [])

            for idx, scenario in enumerate(scenarios):
                record = {
                    'student_id': student_id,
                    'scenario_number': idx + 1,
                    'scenario_id': scenario.get('scenarioId'),
                    'scenario_title': scenario.get('scenarioTitle'),
                    'duration': scenario.get('duration'),
                    'final_state': scenario.get('finalState'),
                    'final_hr': scenario.get('finalVitals', {}).get('heartRate'),
                    'final_rr': scenario.get('finalVitals', {}).get('respiratoryRate'),
                    'final_spo2': scenario.get('finalVitals', {}).get('spO2')
                }
                records.append(record)

        df = pd.DataFrame(records)
        print(f"✅ Extracted {len(df)} scenario performance records\n")
        return df

    def extract_critical_actions_timeline(self):
        """Extract critical actions timeline"""
        print("📊 Extracting critical actions timeline...")

        records = []
        for student in self.students_data:
            student_id = student.get('studentId')
            actions = student.get('criticalActions', [])

            for action in actions:
                record = {
                    'student_id': student_id,
                    'action_type': action.get('action'),
                    'action_name': action.get('name', ''),
                    'timestamp': action.get('timestamp'),
                    'details': str(action.get('details', {}))
                }
                records.append(record)

        df = pd.DataFrame(records)
        print(f"✅ Extracted {len(df)} critical action records\n")
        return df

    def extract_challenge_points_usage(self):
        """Extract challenge points usage (A/B testing key metric)"""
        print("📊 Extracting challenge points usage...")

        records = []
        for student in self.students_data:
            student_id = student.get('studentId')
            group = student.get('group')
            challenge_points = student.get('challengePoints', [])

            for idx, cp in enumerate(challenge_points):
                record = {
                    'student_id': student_id,
                    'ab_group': group,
                    'challenge_number': idx + 1,
                    'challenge_text': cp.get('text', ''),
                    'timestamp': cp.get('timestamp'),
                    'context': cp.get('context', '')
                }
                records.append(record)

        df = pd.DataFrame(records)
        print(f"✅ Extracted {len(df)} challenge point records\n")
        return df

    def extract_aar_transcripts(self):
        """Extract AAR conversation transcripts"""
        print("📊 Extracting AAR transcripts...")

        records = []
        for student in self.students_data:
            student_id = student.get('studentId')
            aar = student.get('aarTranscript', [])

            for idx, message in enumerate(aar):
                record = {
                    'student_id': student_id,
                    'message_number': idx + 1,
                    'role': message.get('role'),
                    'content': message.get('content', ''),
                    'timestamp': message.get('timestamp')
                }
                records.append(record)

        df = pd.DataFrame(records)
        print(f"✅ Extracted {len(df)} AAR messages\n")
        return df


class DataAnalyzer:

    def __init__(self, students_df, performance_df, scenarios_df):
        self.students_df = students_df
        self.performance_df = performance_df
        self.scenarios_df = scenarios_df

    def ab_group_comparison(self):
        """Compare Group A vs Group B performance"""
        print("📊 Performing A/B group comparison...")

        # Merge student and performance data
        merged = self.students_df.merge(
            self.performance_df,
            on='student_id',
            how='inner'
        )

        # Group statistics
        comparison = merged.groupby('ab_group').agg({
            'student_id': 'count',
            'overall_score': ['mean', 'std', 'min', 'max'],
            'total_cdps': 'mean',
            'optimal_decisions': 'mean',
            'medication_errors': 'sum',
            'scenarios_completed': 'mean'
        }).round(2)

        comparison.columns = ['_'.join(col).strip() for col in comparison.columns.values]

        print(f"✅ A/B comparison complete\n")
        return comparison

    def calculate_statistics(self):
        """Calculate statistical tests (t-test, effect size)"""
        print("📊 Calculating statistical tests...")

        from scipy import stats

        # Merge data
        merged = self.students_df.merge(
            self.performance_df,
            on='student_id',
            how='inner'
        )

        # Split by group
        group_a = merged[merged['ab_group'] == 'A']['overall_score']
        group_b = merged[merged['ab_group'] == 'B']['overall_score']

        # T-test
        t_stat, p_value = stats.ttest_ind(group_a, group_b)

        # Effect size (Cohen's d)
        mean_diff = group_a.mean() - group_b.mean()
        pooled_std = np.sqrt((group_a.std()**2 + group_b.std()**2) / 2)
        cohens_d = mean_diff / pooled_std if pooled_std > 0 else 0

        results = {
            'group_a_mean': group_a.mean(),
            'group_a_std': group_a.std(),
            'group_a_n': len(group_a),
            'group_b_mean': group_b.mean(),
            'group_b_std': group_b.std(),
            'group_b_n': len(group_b),
            't_statistic': t_stat,
            'p_value': p_value,
            'cohens_d': cohens_d,
            'significant': p_value < 0.05
        }

        print(f"✅ Statistical analysis complete")
        print(f"   t-statistic: {t_stat:.3f}")
        print(f"   p-value: {p_value:.4f}")
        print(f"   Cohen's d: {cohens_d:.3f}")
        print(f"   Significant: {'Yes' if results['significant'] else 'No'}\n")

        return results


class DataExporter:

    def __init__(self, output_dir='../data/exports'):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)

    def export_to_excel(self, dataframes, filename='student_data_analysis.xlsx'):
        """Export all dataframes to multi-sheet Excel workbook"""
        print(f"📝 Exporting to Excel: {filename}")

        output_path = self.output_dir / filename

        with pd.ExcelWriter(output_path, engine='openpyxl') as writer:
            for sheet_name, df in dataframes.items():
                df.to_excel(writer, sheet_name=sheet_name, index=False)
                print(f"   ✅ Sheet '{sheet_name}': {len(df)} rows")

        print(f"✅ Excel file saved: {output_path}\n")
        return output_path

    def export_to_csv(self, dataframes):
        """Export each dataframe to separate CSV file"""
        print(f"📝 Exporting to CSV files...")

        for name, df in dataframes.items():
            filename = f"{name}.csv"
            output_path = self.output_dir / filename
            df.to_csv(output_path, index=False, encoding='utf-8')
            print(f"   ✅ {filename}: {len(df)} rows")

        print(f"✅ CSV files saved to: {self.output_dir}\n")

    def export_statistical_report(self, stats, ab_comparison, filename='ab_testing_report.txt'):
        """Generate human-readable statistical report"""
        print(f"📝 Generating statistical report...")

        output_path = self.output_dir / filename

        with open(output_path, 'w', encoding='utf-8') as f:
            f.write("=" * 80 + "\n")
            f.write("KNOW THYSELF PLATFORM - A/B TESTING STATISTICAL REPORT\n")
            f.write("=" * 80 + "\n\n")

            f.write("GENERATED: " + datetime.now().strftime("%Y-%m-%d %H:%M:%S") + "\n\n")

            f.write("-" * 80 + "\n")
            f.write("1. GROUP COMPARISON SUMMARY\n")
            f.write("-" * 80 + "\n\n")
            f.write(ab_comparison.to_string())
            f.write("\n\n")

            f.write("-" * 80 + "\n")
            f.write("2. STATISTICAL SIGNIFICANCE TEST (Independent t-test)\n")
            f.write("-" * 80 + "\n\n")

            f.write(f"Group A (Challenge Points Enabled):\n")
            f.write(f"  N = {stats['group_a_n']}\n")
            f.write(f"  Mean Score = {stats['group_a_mean']:.2f}\n")
            f.write(f"  Std Dev = {stats['group_a_std']:.2f}\n\n")

            f.write(f"Group B (Standard Feedback):\n")
            f.write(f"  N = {stats['group_b_n']}\n")
            f.write(f"  Mean Score = {stats['group_b_mean']:.2f}\n")
            f.write(f"  Std Dev = {stats['group_b_std']:.2f}\n\n")

            f.write(f"Test Results:\n")
            f.write(f"  t-statistic = {stats['t_statistic']:.4f}\n")
            f.write(f"  p-value = {stats['p_value']:.4f}\n")
            f.write(f"  Significant at α=0.05? {'YES' if stats['significant'] else 'NO'}\n\n")

            f.write("-" * 80 + "\n")
            f.write("3. EFFECT SIZE ANALYSIS (Cohen's d)\n")
            f.write("-" * 80 + "\n\n")

            f.write(f"Cohen's d = {stats['cohens_d']:.3f}\n\n")

            effect_interpretation = ""
            d = abs(stats['cohens_d'])
            if d < 0.2:
                effect_interpretation = "Negligible effect"
            elif d < 0.5:
                effect_interpretation = "Small effect"
            elif d < 0.8:
                effect_interpretation = "Medium effect"
            else:
                effect_interpretation = "Large effect"

            f.write(f"Interpretation: {effect_interpretation}\n\n")

            f.write("-" * 80 + "\n")
            f.write("4. CONCLUSIONS\n")
            f.write("-" * 80 + "\n\n")

            mean_diff = stats['group_a_mean'] - stats['group_b_mean']

            if stats['significant']:
                f.write(f"✅ SIGNIFICANT DIFFERENCE DETECTED\n\n")
                f.write(f"Challenge Points (Group A) associated with a ")
                f.write(f"{abs(mean_diff):.2f} point ")
                f.write(f"{'improvement' if mean_diff > 0 else 'decrease'} ")
                f.write(f"in performance (p={stats['p_value']:.4f}).\n\n")
                f.write(f"Effect size: {effect_interpretation}\n\n")
            else:
                f.write(f"⚠️  NO SIGNIFICANT DIFFERENCE DETECTED\n\n")
                f.write(f"No statistically significant difference found between groups ")
                f.write(f"(p={stats['p_value']:.4f}).\n\n")
                f.write(f"Further research with larger sample size may be needed.\n\n")

            f.write("=" * 80 + "\n")

        print(f"✅ Statistical report saved: {output_path}\n")
        return output_path


def main():
    """Main execution function"""
    print("\n" + "=" * 80)
    print("KNOW THYSELF - STUDENT DATA EXTRACTION & ANALYSIS")
    print("=" * 80 + "\n")

    # Step 1: Extract data
    extractor = StudentDataExtractor(data_dir='../data/students')
    extractor.load_all_students()

    students_df = extractor.extract_student_overview()
    performance_df = extractor.extract_overall_performance()
    scenarios_df = extractor.extract_scenario_performance()
    actions_df = extractor.extract_critical_actions_timeline()
    challenge_df = extractor.extract_challenge_points_usage()
    aar_df = extractor.extract_aar_transcripts()

    # Step 2: Analyze data
    analyzer = DataAnalyzer(students_df, performance_df, scenarios_df)
    ab_comparison = analyzer.ab_group_comparison()
    statistics = analyzer.calculate_statistics()

    # Step 3: Export data
    exporter = DataExporter(output_dir='../data/exports')

    # Export to Excel (multi-sheet workbook)
    excel_data = {
        'Student Overview': students_df,
        'Overall Performance': performance_df,
        'Scenario Performance': scenarios_df,
        'Critical Actions': actions_df,
        'Challenge Points': challenge_df,
        'AAR Transcripts': aar_df,
        'AB Comparison': ab_comparison
    }
    exporter.export_to_excel(excel_data)

    # Export to CSV (separate files)
    csv_data = {
        'students_overview': students_df,
        'performance_metrics': performance_df,
        'scenario_performance': scenarios_df,
        'critical_actions_timeline': actions_df,
        'challenge_points_usage': challenge_df
    }
    exporter.export_to_csv(csv_data)

    # Export statistical report
    exporter.export_statistical_report(statistics, ab_comparison)

    print("\n" + "=" * 80)
    print("✅ DATA EXTRACTION AND ANALYSIS COMPLETE!")
    print("=" * 80 + "\n")
    print(f"📊 Total students analyzed: {len(students_df)}")
    print(f"📊 Total scenarios: {len(scenarios_df)}")
    print(f"📊 Total critical actions: {len(actions_df)}")
    print(f"\n📁 Output files saved to: data/exports/\n")


if __name__ == '__main__':
    main()
```

---

### Step 3: Create Visualization Script (Optional - 1 hour)

**File:** `scripts/visualize_data.py`

```python
"""
Data Visualization Script
Creates charts and graphs for A/B testing results
"""

import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from pathlib import Path

sns.set_style("whitegrid")
sns.set_palette("husl")

class DataVisualizer:

    def __init__(self, data_dir='../data/exports'):
        self.data_dir = Path(data_dir)
        self.output_dir = self.data_dir / 'visualizations'
        self.output_dir.mkdir(exist_ok=True)

    def plot_ab_comparison(self, students_df, performance_df):
        """Create box plot comparing Group A vs B performance"""
        print("📊 Creating A/B comparison plot...")

        # Merge data
        merged = students_df.merge(performance_df, on='student_id')

        # Create figure
        plt.figure(figsize=(10, 6))
        sns.boxplot(data=merged, x='ab_group', y='overall_score')
        plt.title('Performance Score by A/B Group', fontsize=16, fontweight='bold')
        plt.xlabel('Group', fontsize=12)
        plt.ylabel('Overall Score', fontsize=12)

        # Save
        output_path = self.output_dir / 'ab_comparison_boxplot.png'
        plt.savefig(output_path, dpi=300, bbox_inches='tight')
        print(f"✅ Saved: {output_path}\n")
        plt.close()

    def plot_performance_distribution(self, performance_df):
        """Create histogram of performance scores"""
        print("📊 Creating performance distribution plot...")

        plt.figure(figsize=(10, 6))
        plt.hist(performance_df['overall_score'], bins=20, edgecolor='black', alpha=0.7)
        plt.title('Distribution of Performance Scores', fontsize=16, fontweight='bold')
        plt.xlabel('Overall Score', fontsize=12)
        plt.ylabel('Frequency', fontsize=12)

        output_path = self.output_dir / 'performance_distribution.png'
        plt.savefig(output_path, dpi=300, bbox_inches='tight')
        print(f"✅ Saved: {output_path}\n")
        plt.close()

    def plot_scenario_difficulty(self, scenarios_df):
        """Create bar chart of scenario difficulty (average scores)"""
        print("📊 Creating scenario difficulty plot...")

        # This would need scenario-specific scores - placeholder
        plt.figure(figsize=(12, 6))
        scenario_summary = scenarios_df.groupby('scenario_title').size()
        scenario_summary.plot(kind='bar')
        plt.title('Scenarios Completed by Type', fontsize=16, fontweight='bold')
        plt.xlabel('Scenario', fontsize=12)
        plt.ylabel('Count', fontsize=12)
        plt.xticks(rotation=45, ha='right')

        output_path = self.output_dir / 'scenario_completion.png'
        plt.savefig(output_path, dpi=300, bbox_inches='tight')
        print(f"✅ Saved: {output_path}\n")
        plt.close()


def main():
    """Main visualization function"""
    print("\n" + "=" * 80)
    print("KNOW THYSELF - DATA VISUALIZATION")
    print("=" * 80 + "\n")

    # Load exported CSV files
    data_dir = Path('../data/exports')

    students_df = pd.read_csv(data_dir / 'students_overview.csv')
    performance_df = pd.read_csv(data_dir / 'performance_metrics.csv')
    scenarios_df = pd.read_csv(data_dir / 'scenario_performance.csv')

    # Create visualizations
    viz = DataVisualizer()
    viz.plot_ab_comparison(students_df, performance_df)
    viz.plot_performance_distribution(performance_df)
    viz.plot_scenario_difficulty(scenarios_df)

    print("=" * 80)
    print("✅ VISUALIZATION COMPLETE!")
    print(f"📁 Charts saved to: data/exports/visualizations/")
    print("=" * 80 + "\n")


if __name__ == '__main__':
    main()
```

---

### Step 4: Create Usage Documentation (15 minutes)

**File:** `scripts/README.md`

```markdown
# Data Analysis Scripts

## Overview

Python scripts for extracting, analyzing, and visualizing student performance data from the Know Thyself platform.

## Requirements

- Python 3.8+
- Dependencies listed in `requirements.txt`

## Installation

```bash
# Navigate to scripts directory
cd scripts

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

## Usage

### 1. Extract and Analyze Data

```bash
python extract_student_data.py
```

**Outputs:**
- `data/exports/student_data_analysis.xlsx` - Multi-sheet Excel workbook
- `data/exports/students_overview.csv` - Student overview data
- `data/exports/performance_metrics.csv` - Performance metrics
- `data/exports/scenario_performance.csv` - Scenario-level data
- `data/exports/critical_actions_timeline.csv` - Action timeline
- `data/exports/challenge_points_usage.csv` - Challenge points data
- `data/exports/ab_testing_report.txt` - Statistical analysis report

### 2. Create Visualizations (Optional)

```bash
python visualize_data.py
```

**Outputs:**
- `data/exports/visualizations/ab_comparison_boxplot.png`
- `data/exports/visualizations/performance_distribution.png`
- `data/exports/visualizations/scenario_completion.png`

## Output File Descriptions

### Excel Workbook

**Sheet 1: Student Overview**
- student_id, name, email, A/B group
- Timestamps (registration, start, completion)
- Session metadata

**Sheet 2: Overall Performance**
- Performance scores and metrics
- CDP breakdown (optimal, acceptable, suboptimal, dangerous)
- Medication errors

**Sheet 3: Scenario Performance**
- Individual scenario results
- Duration, final state, final vitals

**Sheet 4: Critical Actions**
- Timeline of all student actions
- Action types, timestamps

**Sheet 5: Challenge Points**
- Challenge point usage (A/B testing key metric)

**Sheet 6: AAR Transcripts**
- Full AAR conversation history

**Sheet 7: AB Comparison**
- Statistical comparison between groups

### Statistical Report

Text file containing:
- Group comparison summary
- t-test results
- Effect size (Cohen's d)
- Statistical conclusions

## Customization

Edit `extract_student_data.py` to:
- Add custom metrics
- Change statistical tests
- Modify export formats
- Add additional analyses

## Troubleshooting

**Error: No JSON files found**
- Ensure student data files exist in `data/students/`
- Check file path in script (default: `../data/students`)

**Error: Missing dependencies**
- Run `pip install -r requirements.txt`

**Error: Permission denied**
- Close Excel files before running script
- Check write permissions in `data/exports/`
```

---

## 3. Testing Plan - Part 2

### Test Phase 1: Script Execution (15 minutes)

**Create test data:**

```bash
# Ensure test student JSON file exists
# Use existing: data/students/peter_lacko_mhumiljm0avsg.json
# Or create mock data if needed
```

**Run extraction script:**

```bash
cd scripts
python extract_student_data.py
```

**Expected output:**
```
================================================================================
KNOW THYSELF - STUDENT DATA EXTRACTION & ANALYSIS
================================================================================

📂 Loading student data files...
   Found 1 student files
✅ Loaded 1 student records

📊 Extracting student overview...
✅ Extracted 1 student overview records

📊 Extracting overall performance...
✅ Extracted 1 performance records

... (more extraction steps) ...

📝 Exporting to Excel: student_data_analysis.xlsx
   ✅ Sheet 'Student Overview': 1 rows
   ✅ Sheet 'Overall Performance': 1 rows
✅ Excel file saved: ../data/exports/student_data_analysis.xlsx

================================================================================
✅ DATA EXTRACTION AND ANALYSIS COMPLETE!
================================================================================
```

**Verify output files:**

```bash
ls ../data/exports/
# Should see:
# - student_data_analysis.xlsx
# - students_overview.csv
# - performance_metrics.csv
# - scenario_performance.csv
# - ab_testing_report.txt
```

### Test Phase 2: Data Validation (15 minutes)

**Open Excel file:**
- Verify all sheets present
- Check data looks correct
- Ensure no errors in cells

**Open CSV files:**
- Verify can be imported to SPSS/R
- Check encoding (should be UTF-8)
- Verify column headers

**Review statistical report:**
- Check calculations are reasonable
- Verify t-test output (if 2+ students)

---

## 4. Usage Instructions - Part 2

### After Student Testing Session

**Step 1: Wait for all students to complete**

All student data files should be in `data/students/` directory with `sessionComplete: true`.

**Step 2: Run extraction script**

```bash
cd scripts
python extract_student_data.py
```

**Step 3: Review outputs**

Open `data/exports/student_data_analysis.xlsx` in Excel.

Review A/B testing report: `data/exports/ab_testing_report.txt`

**Step 4: Import to statistical software (if needed)**

**For SPSS:**
```
File → Import Data → CSV Data Source
Select: students_overview.csv
```

**For R:**
```r
students <- read.csv("data/exports/students_overview.csv")
performance <- read.csv("data/exports/performance_metrics.csv")

# A/B testing
library(dplyr)
t.test(overall_score ~ ab_group, data=performance)
```

**For Python/Pandas:**
```python
import pandas as pd
students = pd.read_csv('data/exports/students_overview.csv')
performance = pd.read_csv('data/exports/performance_metrics.csv')

# Merge and analyze
merged = students.merge(performance, on='student_id')
print(merged.groupby('ab_group')['overall_score'].describe())
```

---

## 5. Deployment Checklist - Part 2

### Pre-Analysis

- [ ] All students completed sessions
- [ ] All JSON files present in `data/students/`
- [ ] Python environment set up
- [ ] Dependencies installed
- [ ] Scripts tested with sample data

### Analysis Execution

- [ ] Run extraction script
- [ ] Verify all output files created
- [ ] Check Excel file opens correctly
- [ ] Review statistical report
- [ ] Validate data looks reasonable

### Post-Analysis

- [ ] Backup raw JSON files
- [ ] Archive exported files with date
- [ ] Share results with stakeholders
- [ ] Document any issues encountered

---

# COMBINED IMPLEMENTATION TIMELINE

## Day 1: Database Integration (6-8 hours)

**Morning (4 hours):**
- ✅ Database setup (PostgreSQL installation, configuration)
- ✅ Update Prisma schema
- ✅ Run migrations
- ✅ Create database service layer

**Afternoon (4 hours):**
- ✅ Refactor server code (update all endpoints)
- ✅ Create session helper functions
- ✅ Test single session flow
- ✅ Test server restart persistence

## Day 2: Testing & Python Scripts (4-6 hours)

**Morning (2 hours):**
- ✅ Test concurrent sessions
- ✅ Performance testing
- ✅ Fix any issues

**Afternoon (4 hours):**
- ✅ Set up Python environment
- ✅ Create data extraction script
- ✅ Create visualization script (optional)
- ✅ Test with existing data
- ✅ Document usage

**Total Estimated Time: 10-14 hours**

---

# SUCCESS CRITERIA

## Part 1: Active Session Persistence ✅

- [ ] Sessions survive server restart
- [ ] All session data persisted correctly
- [ ] No data loss during crashes
- [ ] Can handle 20+ concurrent sessions
- [ ] Performance acceptable (<100ms database overhead)
- [ ] All tests passing

## Part 2: Python Data Analysis ✅

- [ ] Script extracts all student data
- [ ] Excel workbook generated correctly
- [ ] CSV files importable to SPSS/R
- [ ] Statistical calculations correct
- [ ] A/B testing analysis complete
- [ ] Documentation clear and usable

---

# RISK MITIGATION

## Risks - Part 1

| Risk | Mitigation |
|------|-----------|
| Database connection fails | Test connection thoroughly, implement retry logic |
| Migration errors | Back up data before migration, test on dev first |
| Performance degradation | Use caching layer, optimize queries with indexes |
| Data loss during migration | Keep in-memory Map as fallback initially |

## Risks - Part 2

| Risk | Mitigation |
|------|-----------|
| JSON parsing errors | Validate JSON structure, handle missing fields gracefully |
| Incorrect calculations | Unit test all statistical functions |
| Incomplete data | Check for missing fields, report issues clearly |
| Python dependency issues | Use virtual environment, pin package versions |

---

# ROLLBACK PLAN

## If Database Integration Fails

1. **Keep in-memory Map as fallback:**
```javascript
// server/index.js
const USE_DATABASE = process.env.USE_DATABASE === 'true';

async function getSession(sessionId) {
  if (USE_DATABASE) {
    return await db.getSession(sessionId);
  } else {
    return sessions.get(sessionId);  // Fallback to Map
  }
}
```

2. **Environment variable toggle:**
```bash
# .env
USE_DATABASE=false  # Disable database, use Map
```

3. **Gradual migration:**
- Test with 1-2 students first
- Monitor for errors
- Switch fully only after validation

---

# MAINTENANCE

## Database Maintenance

**Weekly:**
- Check database size
- Review slow queries
- Verify backups working

**Monthly:**
- Analyze query performance
- Optimize indexes if needed
- Clean up abandoned sessions

**Commands:**

```sql
-- Check database size
SELECT pg_size_pretty(pg_database_size('knowthyself_dev'));

-- Find slow queries
SELECT query, mean_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Vacuum database
VACUUM ANALYZE;
```

## Python Scripts Maintenance

**After each cohort:**
- Archive exported data
- Update statistical methods if needed
- Add new metrics as required

---

# FUTURE ENHANCEMENTS

## Part 1: Database

- [ ] Add database caching (Redis)
- [ ] Implement database replication
- [ ] Add automated backups
- [ ] Create admin dashboard for session monitoring
- [ ] Add real-time session analytics

## Part 2: Data Analysis

- [ ] Automated weekly reports
- [ ] Real-time dashboard (web-based)
- [ ] Machine learning pattern detection
- [ ] Longitudinal cohort analysis
- [ ] Publication-ready figure generation

---

# APPENDIX A: Environment Variables Reference

```bash
# .env

# Database
DATABASE_URL="postgresql://user:password@localhost:5432/knowthyself_dev"
USE_DATABASE=true  # Toggle database persistence

# API Keys
ANTHROPIC_API_KEY=your_api_key_here

# Server
PORT=3001
NODE_ENV=development

# Features
ENABLE_CACHING=true
CACHE_TTL_MINUTES=5
LOG_LEVEL=info
```

---

# APPENDIX B: Database Schema Quick Reference

**Main Tables:**
- `Session` - Main session data (40+ columns)
- `Message` - Conversation history
- `VitalSignsLog` - Vital signs timeline
- `PerformanceData` - Final performance scores
- `Student` - Student registry (optional)

**Key Indexes:**
- `Session.studentId` - For student queries
- `Session.group` - For A/B testing queries
- `Session.status` - For active session queries
- `Message.sessionId` - For conversation retrieval
- `VitalSignsLog.timestamp` - For timeline queries

---

# APPENDIX C: Python Script Quick Reference

**Main Functions:**
- `load_all_students()` - Load JSON files
- `extract_student_overview()` - Student data
- `extract_overall_performance()` - Performance metrics
- `extract_scenario_performance()` - Scenario data
- `ab_group_comparison()` - A/B analysis
- `calculate_statistics()` - Statistical tests
- `export_to_excel()` - Export to Excel
- `export_to_csv()` - Export to CSV

---

**END OF DEVELOPMENT PLAN**

**Next Steps:**
1. Review this plan with stakeholders
2. Set up development environment
3. Begin Part 1 implementation (database)
4. Test thoroughly before production
5. Implement Part 2 (Python scripts) in parallel

**Questions? Contact development team.**

**Document Version:** 1.0
**Last Updated:** November 19, 2025
