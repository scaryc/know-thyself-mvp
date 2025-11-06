# Layer 3: MVP Testing Sprint - Development Plan (Revised)

**Version**: 2.0
**Date**: November 6, 2024
**Purpose**: Enable controlled MVP testing session with 10-20 students
**Timeline**: 2-3 days development

---

## Table of Contents

1. [Overview](#overview)
2. [Feature Specifications](#feature-specifications)
3. [Database Schema](#database-schema)
4. [API Endpoints](#api-endpoints)
5. [Frontend Components](#frontend-components)
6. [Data Flow](#data-flow)
7. [Implementation Guide](#implementation-guide)
8. [Testing Checklist](#testing-checklist)
9. [Deployment Guide](#deployment-guide)

---

## Overview

### Goals

Enable a controlled testing session where:
- ✅ Students can self-register with just name/email
- ✅ A/B groups are **automatically balanced** (50/50)
- ✅ **Students MUST resume where they left off** if browser crashes/refreshes
- ✅ All data is automatically saved (no manual export needed)
- ✅ Data export is simple (CSV export function)
- ✅ System is robust (no data loss, can handle crashes)

### What Was Removed Based on Requirements

- ❌ **Pause Button** - Not needed (per your decision)
- ❌ **Admin Dashboard** - Not needed (per your decision)

### Core Features (4 Total)

1. **Student Registration System** - Simple name/email → auto ID/group
2. **Session Resume** - Browser refresh recovery (CRITICAL requirement)
3. **Auto-Save on Completion** - Data persistence to disk
4. **CSV Export** - One-click data export for analysis

### Testing Scenario

**Day of Testing**:
1. Instructor starts server
2. Students arrive, open link: `http://localhost:3001`
3. Students register (name + email) → auto-assigned to Group A or B
4. Students complete training (60-90 min) independently
5. If browser crashes → **automatically resumes where they left off**
6. Sessions auto-save on completion to disk
7. Instructor runs export script to get CSV
8. Statistical analysis of Group A vs Group B

**Participants**: 10-20 students simultaneously

---

## Feature Specifications

### Feature 1: Student Registration System

#### Requirements

**User Story**: As a student, I want to enter my name and start training immediately without needing a pre-assigned ID.

**Acceptance Criteria**:
- ✅ Student enters full name (required)
- ✅ Student enters email (optional)
- ✅ System generates unique student ID automatically
- ✅ System assigns Group A or B with **automatic 50/50 balancing**
- ✅ Student starts training immediately
- ✅ Registration data persisted to disk
- ✅ Duplicate names handled (unique IDs)

#### UI Specification

**Registration Screen** (`/`):

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│              🏥 KNOW THYSELF MVP                        │
│           Paramedic Training Simulation                 │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  Welcome! Please enter your information to begin:       │
│                                                         │
│  Full Name *                                            │
│  ┌───────────────────────────────────────────────┐     │
│  │ [e.g., Alice Smith]                           │     │
│  └───────────────────────────────────────────────┘     │
│                                                         │
│  Email Address (optional)                               │
│  ┌───────────────────────────────────────────────┐     │
│  │ [e.g., alice@example.com]                     │     │
│  └───────────────────────────────────────────────┘     │
│                                                         │
│  ☑️ I consent to data collection for research purposes │
│                                                         │
│            ┌────────────────────┐                       │
│            │  Start Training    │                       │
│            └────────────────────┘                       │
│                                                         │
│  Note: Training takes 60-90 minutes. If your browser   │
│  crashes, you can resume where you left off.           │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Validation Rules**:
- Name: Required, 2-100 characters, letters and spaces only
- Email: Optional, valid email format if provided
- Consent: Must be checked

**Error States**:
```
┌─────────────────────────────────────────┐
│  ⚠️ Please enter your full name         │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  ⚠️ Please enter a valid email address  │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  ⚠️ You must consent to data collection │
└─────────────────────────────────────────┘
```

#### Backend Logic

**Student ID Generation**:
```javascript
function generateStudentId(name) {
  // Create URL-safe name part
  const namePart = name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '_')      // Spaces to underscores
    .replace(/[^a-z0-9_]/g, '') // Remove special chars
    .substring(0, 30);          // Max 30 chars

  // Add unique suffix
  const timestamp = Date.now().toString(36); // Base-36 timestamp
  const random = Math.random().toString(36).substring(2, 7); // 5 random chars

  return `${namePart}_${timestamp}${random}`;
}

// Examples:
// "Alice Smith" → "alice_smith_lx3k9p2m7"
// "Bob Jones" → "bob_jones_lx3k9q4n1"
// "Alice Smith" (duplicate) → "alice_smith_lx3k9r8p5" (different suffix)
```

**A/B Group Automatic Balancing**:
```javascript
// Track group counts in memory
let groupCounts = { A: 0, B: 0 };

function assignGroup() {
  // If equal, randomly assign
  if (groupCounts.A === groupCounts.B) {
    const group = Math.random() < 0.5 ? 'A' : 'B';
    groupCounts[group]++;
    return group;
  }

  // If unbalanced, assign to smaller group to maintain balance
  const group = groupCounts.A < groupCounts.B ? 'A' : 'B';
  groupCounts[group]++;
  return group;
}

// Result: Even with random arrivals, maintains ~50/50 split
// Example: If A=5, B=7 → Next student gets A (to balance)
```

**Data Persistence**:
```javascript
// Save student registration to disk immediately
const studentData = {
  studentId: 'alice_smith_lx3k9p2m7',
  name: 'Alice Smith',
  email: 'alice@example.com',
  group: 'A',
  registeredAt: '2024-11-06T14:30:00Z',
  sessionId: null, // Will be set when session starts
  status: 'registered'
};

fs.writeFileSync(
  `data/students/${studentData.studentId}.json`,
  JSON.stringify(studentData, null, 2)
);
```

---

### Feature 2: Session Resume (Browser Refresh Recovery)

#### Requirements

**User Story**: As a student, if my browser crashes or I accidentally refresh, **I MUST continue my session without losing progress**.

**Acceptance Criteria**:
- ✅ Session ID stored in browser localStorage (survives refresh)
- ✅ On page load, check for existing session
- ✅ If session exists and is active, **automatically resume**
- ✅ If session exists and is complete, show completion screen
- ✅ If session doesn't exist, show registration screen
- ✅ Works across browser refresh, tab close, browser restart
- ✅ Restore exact state: current agent, scenario, conversation

#### Technical Implementation

**Data Storage** (Client-side - Browser Disk):

```javascript
// When session starts (after registration)
localStorage.setItem('kt_studentId', 'alice_smith_lx3k9p2m7');
localStorage.setItem('kt_sessionId', 'session_1762451094771_tochhcyil');
localStorage.setItem('kt_studentName', 'Alice Smith');
localStorage.setItem('kt_group', 'A');

// Structure in browser localStorage:
{
  "kt_studentId": "alice_smith_lx3k9p2m7",
  "kt_sessionId": "session_1762451094771_tochhcyil",
  "kt_studentName": "Alice Smith",
  "kt_group": "A"
}
```

**Why this works:**
- `localStorage` is saved to browser's hard drive
- Survives page refresh ✅
- Survives browser close/reopen ✅
- Survives browser crash ✅
- Only cleared by user manually clearing browser data

**App Load Logic** (Frontend):

```javascript
// In App.tsx useEffect on mount
useEffect(() => {
  async function checkExistingSession() {
    const savedSessionId = localStorage.getItem('kt_sessionId');

    if (!savedSessionId) {
      // No existing session - show registration
      setShowRegistration(true);
      return;
    }

    // Check if session still exists on server
    try {
      const response = await api.checkSession(savedSessionId);

      if (response.exists && !response.complete) {
        // Session is active - RESUME IT
        console.log('✅ Resuming existing session:', savedSessionId);

        // Restore session state
        setSessionId(savedSessionId);
        setIsActive(true);
        setCurrentAgent(response.currentAgent);
        setCurrentScenarioIndex(response.currentScenarioIndex);
        setIsAARMode(response.isAARMode);

        // Fetch current data
        if (response.currentAgent === 'core') {
          const vitals = await api.getVitals(savedSessionId);
          setCurrentVitals(vitals);
        }

        console.log(`📍 Resumed at: ${response.currentAgent}, Scenario ${response.currentScenarioIndex + 1}`);

      } else if (response.complete) {
        // Session was completed - show completion screen
        console.log('✅ Session already completed');
        setSessionComplete(true);

      } else {
        // Session not found (server restarted?) - clear and show registration
        console.log('⚠️ Session not found on server, clearing localStorage');
        clearLocalStorage();
        setShowRegistration(true);
      }

    } catch (error) {
      // Server error or session not found
      console.error('❌ Session check failed:', error);
      clearLocalStorage();
      setShowRegistration(true);
    }
  }

  checkExistingSession();
}, []); // Run once on mount

function clearLocalStorage() {
  localStorage.removeItem('kt_sessionId');
  localStorage.removeItem('kt_studentId');
  localStorage.removeItem('kt_studentName');
  localStorage.removeItem('kt_group');
}
```

**Backend Endpoint**:

```javascript
// GET /api/sessions/:sessionId/check
app.get('/api/sessions/:sessionId/check', (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = sessions.get(sessionId);

    if (!session) {
      return res.json({ exists: false });
    }

    // Check if session is complete
    const isComplete = session.sessionComplete === true;

    res.json({
      exists: true,
      complete: isComplete,
      currentAgent: session.currentAgent,
      currentScenarioIndex: session.currentScenarioIndex || 0,
      isAARMode: session.isAARMode || false,
      studentId: session.studentId,
      studentName: session.studentName
    });

  } catch (error) {
    console.error('Error checking session:', error);
    res.status(500).json({ error: error.message });
  }
});
```

**Resume Behavior Examples:**

| Scenario | What Happens |
|----------|--------------|
| Browser refreshes during Cognitive Coach | ✅ Resumes in Cognitive Coach, shows conversation history |
| Browser crashes during Scenario 2 | ✅ Resumes in Scenario 2, shows current vitals |
| Tab closes during AAR | ✅ Resumes in AAR, shows conversation history |
| Student closes browser completely | ✅ When reopened, resumes exactly where they were |
| Server restarts (session lost) | ⚠️ Shows error message, student must restart |

---

### Feature 3: Auto-Save on Completion

#### Requirements

**User Story**: As an instructor, I want student data automatically saved to disk when they complete training, so I don't lose data if the server crashes.

**Acceptance Criteria**:
- ✅ When AAR completes (student sees [AAR_COMPLETE]), auto-save triggers
- ✅ Data saved to: `data/students/STUDENT_ID.json`
- ✅ Also saved to: `data/backups/YYYY-MM-DD/STUDENT_ID.json`
- ✅ File includes all performance data
- ✅ Session remains in memory for later export
- ✅ Completion status marked in session

#### File Structure

```
data/
  students/
    alice_smith_lx3k9p2m7.json
    bob_jones_lx3k9q4n1.json
    carol_white_lx3k9r8p5.json
    ...

  backups/
    2024-11-06/
      alice_smith_lx3k9p2m7.json
      bob_jones_lx3k9q4n1.json
      ...
    2024-11-07/
      ...
```

#### Data Format

**Complete Student Data File**:

```json
{
  "studentId": "alice_smith_lx3k9p2m7",
  "studentName": "Alice Smith",
  "studentEmail": "alice@example.com",
  "group": "A",
  "sessionId": "session_1762451094771_tochhcyil",

  "timestamps": {
    "registered": "2024-11-06T14:30:00Z",
    "sessionStarted": "2024-11-06T14:32:15Z",
    "sessionCompleted": "2024-11-06T16:05:42Z",
    "totalElapsed": "93 minutes 27 seconds"
  },

  "performance": {
    "overallScore": 85,
    "grade": "B+",
    "cdpEvaluations": {
      "optimal": 5,
      "acceptable": 2,
      "suboptimal": 1,
      "dangerous": 0,
      "notPerformed": 0
    }
  },

  "scenarios": [
    {
      "scenarioId": "asthma_mvp_001",
      "scenarioTitle": "Severe Asthma Attack",
      "duration": "28 minutes",
      "finalState": "improving",
      "finalVitals": {
        "HR": 98,
        "RR": 20,
        "SpO2": 94,
        "BP": "135/85"
      }
    }
    // ... scenarios 2 and 3
  ],

  "criticalActions": [
    { "time": "0:45", "action": "Applied high-flow oxygen at 15 L/min", "rating": "optimal" },
    { "time": "2:30", "action": "Administered salbutamol 100mcg via MDI", "rating": "optimal" }
    // ... all actions
  ],

  "challengePoints": [
    {
      "trigger": "oxygen_administration",
      "question": "Excellent choice on high-flow oxygen. Why is this critical for this patient?",
      "studentResponse": "Patient has SpO2 of 88% and is in respiratory distress...",
      "evaluation": {
        "rating": "good",
        "rationale": "Student identified hypoxia correctly..."
      }
    }
    // ... if Group A
  ],

  "aarTranscript": [
    { "role": "assistant", "content": "Congratulations on completing...", "timestamp": "2024-11-06T16:00:00Z" },
    { "role": "user", "content": "I felt good about the asthma case...", "timestamp": "2024-11-06T16:01:15Z" }
    // ... full AAR conversation
  ],

  "metadata": {
    "version": "Layer2_MVP",
    "challengePointsEnabled": true,
    "scenariosCompleted": 3,
    "totalMessages": 47,
    "sessionComplete": true
  }
}
```

#### Backend Logic

**Trigger Point** (in AAR message endpoint):

```javascript
// POST /api/sessions/:sessionId/aar/message
const isComplete = aarMessage.includes('[AAR_COMPLETE]');

if (isComplete) {
  // Mark session as complete
  session.sessionComplete = true;
  session.completedAt = new Date().toISOString();

  // AUTO-SAVE to disk
  await saveStudentData(session);

  console.log('✅ Session complete and data saved:', session.studentId);
}
```

**Save Function**:

```javascript
async function saveStudentData(session) {
  const studentData = {
    studentId: session.studentId,
    studentName: session.studentName,
    studentEmail: session.studentEmail,
    group: session.group,
    sessionId: session.sessionId,

    timestamps: {
      registered: session.registeredAt,
      sessionStarted: session.sessionStartTime,
      sessionCompleted: session.completedAt,
      totalElapsed: formatDuration(session.totalElapsedTime)
    },

    performance: calculatePerformanceScore(session),
    scenarios: generateScenarioSummaries(session),
    criticalActions: session.criticalActionsLog || [],
    challengePoints: session.challengePointsUsed || [],
    aarTranscript: aarService.getConversationHistory(session.sessionId),

    metadata: {
      version: 'Layer2_MVP',
      challengePointsEnabled: session.challengePointsEnabled,
      scenariosCompleted: session.currentScenarioIndex + 1,
      totalMessages: session.conversationHistory?.length || 0,
      sessionComplete: true
    }
  };

  // Save to primary location
  const primaryPath = path.join(__dirname, '../data/students', `${session.studentId}.json`);
  await fs.promises.mkdir(path.dirname(primaryPath), { recursive: true });
  await fs.promises.writeFile(primaryPath, JSON.stringify(studentData, null, 2));

  // Save to backup location (organized by date)
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const backupDir = path.join(__dirname, '../data/backups', today);
  await fs.promises.mkdir(backupDir, { recursive: true });

  const backupPath = path.join(backupDir, `${session.studentId}.json`);
  await fs.promises.writeFile(backupPath, JSON.stringify(studentData, null, 2));

  console.log(`💾 Saved: ${primaryPath}`);
  console.log(`💾 Backup: ${backupPath}`);
}
```

---

### Feature 4: CSV Export

#### Requirements

**User Story**: As an instructor, I want to export all session data to CSV for statistical analysis in Excel or SPSS.

**Acceptance Criteria**:
- ✅ Export script run from command line
- ✅ CSV includes all key metrics
- ✅ One row per student
- ✅ Separate columns for Group A metrics (reasoning quality)
- ✅ Timestamp in filename
- ✅ Opens in Excel without formatting issues

#### CSV Format

**Columns** (in order):

```csv
StudentID,StudentName,Email,Group,RegisteredAt,SessionStarted,SessionCompleted,TotalTimeMinutes,FinalScore,Grade,CDPOptimal,CDPAcceptable,CDPSuboptimal,CDPDangerous,CDPNotPerformed,Scenario1State,Scenario1Time,Scenario2State,Scenario2Time,Scenario3State,Scenario3Time,ChallengesTriggered,AverageReasoningScore,OxygenTimingSeconds,SalbutamolTimingSeconds,SteroidsTimingSeconds,MedicationErrors,SafetyViolations,TotalActions,SessionComplete
```

**Example Rows**:

```csv
alice_smith_lx3k9p2m7,Alice Smith,alice@example.com,A,2024-11-06T14:30:00Z,2024-11-06T14:32:15Z,2024-11-06T16:05:42Z,93,85,B+,5,2,1,0,0,improving,28,stable,31,improving,29,3,75,120,240,300,0,0,45,true
bob_jones_lx3k9q4n1,Bob Jones,bob@example.com,B,2024-11-06T14:31:00Z,2024-11-06T14:33:10Z,2024-11-06T15:58:25Z,86,79,C+,4,3,1,0,0,stable,30,improving,28,stable,28,0,N/A,135,310,420,1,0,42,true
```

#### Implementation - Export Script

**File**: `server/export-data.js`

```javascript
/**
 * Export script to generate CSV from student data files
 * Usage: node export-data.js
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function exportToCSV() {
  console.log('🔍 Reading student data files...');

  const studentsDir = path.join(__dirname, '../data/students');

  try {
    const files = await fs.readdir(studentsDir);
    const jsonFiles = files.filter(f => f.endsWith('.json'));

    console.log(`Found ${jsonFiles.length} student files`);

    // Read all student data
    const students = [];
    for (const file of jsonFiles) {
      const filePath = path.join(studentsDir, file);
      const content = await fs.readFile(filePath, 'utf-8');
      const data = JSON.parse(content);
      students.push(data);
    }

    // Generate CSV header
    const header = [
      'StudentID', 'StudentName', 'Email', 'Group',
      'RegisteredAt', 'SessionStarted', 'SessionCompleted',
      'TotalTimeMinutes',
      'FinalScore', 'Grade',
      'CDPOptimal', 'CDPAcceptable', 'CDPSuboptimal', 'CDPDangerous', 'CDPNotPerformed',
      'Scenario1State', 'Scenario1Time',
      'Scenario2State', 'Scenario2Time',
      'Scenario3State', 'Scenario3Time',
      'ChallengesTriggered', 'AverageReasoningScore',
      'OxygenTimingSeconds', 'SalbutamolTimingSeconds', 'SteroidsTimingSeconds',
      'MedicationErrors', 'SafetyViolations',
      'TotalActions', 'SessionComplete'
    ].join(',');

    // Generate CSV rows
    const rows = students.map(student => {
      const scenarios = student.scenarios || [];
      const performance = student.performance || {};
      const cdp = performance.cdpEvaluations || {};

      return [
        student.studentId,
        `"${student.studentName}"`, // Quote names with commas
        student.studentEmail || '',
        student.group,
        student.timestamps?.registered || '',
        student.timestamps?.sessionStarted || '',
        student.timestamps?.sessionCompleted || '',
        extractMinutes(student.timestamps?.totalElapsed),
        performance.overallScore || 0,
        performance.grade || '',
        cdp.optimal || 0,
        cdp.acceptable || 0,
        cdp.suboptimal || 0,
        cdp.dangerous || 0,
        cdp.notPerformed || 0,
        scenarios[0]?.finalState || '',
        scenarios[0]?.duration || '',
        scenarios[1]?.finalState || '',
        scenarios[1]?.duration || '',
        scenarios[2]?.finalState || '',
        scenarios[2]?.duration || '',
        student.challengePoints?.length || 0,
        student.group === 'A' ? calculateAverageReasoning(student.challengePoints) : 'N/A',
        extractTreatmentTiming(student, 'oxygen'),
        extractTreatmentTiming(student, 'salbutamol'),
        extractTreatmentTiming(student, 'steroids'),
        student.criticalActions?.filter(a => a.category === 'medication_error').length || 0,
        student.metadata?.safetyViolations || 0,
        student.criticalActions?.length || 0,
        student.metadata?.sessionComplete ? 'true' : 'false'
      ].join(',');
    });

    const csv = [header, ...rows].join('\n');

    // Save CSV file
    const timestamp = new Date().toISOString().split('T')[0];
    const outputPath = path.join(__dirname, `../data/know_thyself_export_${timestamp}.csv`);
    await fs.writeFile(outputPath, csv);

    console.log(`✅ CSV exported successfully!`);
    console.log(`📄 File: ${outputPath}`);
    console.log(`📊 Total students: ${students.length}`);
    console.log(`📊 Group A: ${students.filter(s => s.group === 'A').length}`);
    console.log(`📊 Group B: ${students.filter(s => s.group === 'B').length}`);

  } catch (error) {
    console.error('❌ Export failed:', error);
  }
}

function extractMinutes(duration) {
  if (!duration) return 0;
  const match = duration.match(/(\d+)\s*minutes?/);
  return match ? parseInt(match[1]) : 0;
}

function extractTreatmentTiming(student, treatment) {
  const action = student.criticalActions?.find(a =>
    a.action.toLowerCase().includes(treatment)
  );
  return action ? Math.round(action.elapsedTime) : '';
}

function calculateAverageReasoning(challenges) {
  if (!challenges || challenges.length === 0) return 'N/A';

  const ratings = { excellent: 100, good: 75, basic: 50, poor: 25 };
  const scores = challenges
    .filter(c => c.evaluation)
    .map(c => ratings[c.evaluation.rating] || 0);

  if (scores.length === 0) return 'N/A';

  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  return Math.round(avg);
}

// Run export
exportToCSV();
```

**Usage:**

```bash
# After testing session, run export
cd server
node export-data.js

# Output:
# ✅ CSV exported successfully!
# 📄 File: ../data/know_thyself_export_2024-11-06.csv
# 📊 Total students: 20
# 📊 Group A: 10
# 📊 Group B: 10
```

---

## Database Schema

### Student Registry

**File**: `data/students/STUDENT_ID.json`

**Purpose**: Persisted student data (survives server restart)

**Schema**:
```typescript
interface StudentData {
  studentId: string;           // Unique identifier
  studentName: string;         // Full name
  studentEmail?: string;       // Optional email
  group: 'A' | 'B';           // A/B test group (automatic balancing)
  registeredAt: string;        // ISO timestamp
  sessionId: string | null;    // Current/last session
  status: 'registered' | 'active' | 'completed';
  sessionData?: CompleteSessionData; // Saved on completion
}
```

### Session Data (In-Memory)

**Storage**: `Map<sessionId, Session>`

**Enhanced Session Schema**:
```typescript
interface Session {
  // Identity
  sessionId: string;
  studentId: string;
  studentName: string;
  studentEmail?: string;
  group: 'A' | 'B';

  // Timestamps
  registeredAt: string;
  sessionStartTime: number;
  completedAt?: string;

  // Session state
  currentAgent: 'cognitive_coach' | 'core' | null;
  currentScenarioIndex: number;
  isAARMode: boolean;
  sessionComplete: boolean;

  // Existing Layer 2 fields
  challengePointsEnabled: boolean;  // Auto-set based on group
  challengePointsUsed: Array<any>;
  cdpEvaluations: Array<any>;
  criticalActionsLog: Array<any>;
  // ... all other existing fields
}
```

---

## API Endpoints

### New Endpoints

#### 1. Student Registration

**POST** `/api/student/register`

**Request Body**:
```json
{
  "name": "Alice Smith",
  "email": "alice@example.com",
  "consent": true
}
```

**Response**:
```json
{
  "success": true,
  "studentId": "alice_smith_lx3k9p2m7",
  "group": "A",
  "message": "Welcome, Alice! You've been assigned to Group A."
}
```

---

#### 2. Start Session (Modified)

**POST** `/api/sessions/start`

**Request Body**:
```json
{
  "studentId": "alice_smith_lx3k9p2m7",
  "scenarioId": "asthma_mvp_001"
}
```

**Backend automatically**:
- Looks up student data
- Sets `challengePointsEnabled` based on group (A=true, B=false)
- Creates session with student info

---

#### 3. Check Session Status

**GET** `/api/sessions/:sessionId/check`

**Response**:
```json
{
  "exists": true,
  "complete": false,
  "currentAgent": "core",
  "currentScenarioIndex": 1,
  "isAARMode": false,
  "studentId": "alice_smith_lx3k9p2m7",
  "studentName": "Alice Smith"
}
```

---

## Frontend Components

### New Components

#### 1. `StudentRegistration.tsx`

**Path**: `know-thyself-frontend/src/components/StudentRegistration.tsx`

**Purpose**: Registration form for students

**Props**: None

**Full Implementation**:

```typescript
import { useState } from 'react';

interface StudentRegistrationProps {
  onComplete: (data: { studentId: string; group: string }) => void;
}

function StudentRegistration({ onComplete }: StudentRegistrationProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  function isValidEmail(email: string): boolean {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    // Validation
    if (!name.trim() || name.trim().length < 2) {
      setError('Please enter your full name (at least 2 characters)');
      return;
    }

    if (email && !isValidEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    if (!consent) {
      setError('You must consent to data collection to participate');
      return;
    }

    // Register
    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:3001/api/student/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim() || null,
          consent
        })
      });

      const data = await response.json();

      if (!data.success) {
        setError(data.error || 'Registration failed');
        setIsLoading(false);
        return;
      }

      // Save to localStorage
      localStorage.setItem('kt_studentId', data.studentId);
      localStorage.setItem('kt_studentName', name.trim());
      localStorage.setItem('kt_group', data.group);

      // Notify parent
      onComplete(data);

    } catch (error) {
      console.error('Registration error:', error);
      setError('Network error. Please check your connection and try again.');
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-bg-secondary rounded-lg shadow-xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-text-primary mb-2">
            🏥 KNOW THYSELF MVP
          </h1>
          <p className="text-text-secondary">
            Paramedic Training Simulation
          </p>
        </div>

        <div className="border-t border-border-primary my-6"></div>

        <p className="text-text-secondary mb-6">
          Welcome! Please enter your information to begin:
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-text-primary mb-2">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Alice Smith"
              className="w-full px-4 py-2 bg-bg-primary border border-border-primary rounded-md text-text-primary focus:outline-none focus:border-blue-500"
              disabled={isLoading}
              required
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-text-primary mb-2">
              Email Address <span className="text-text-secondary text-xs">(optional)</span>
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g., alice@example.com"
              className="w-full px-4 py-2 bg-bg-primary border border-border-primary rounded-md text-text-primary focus:outline-none focus:border-blue-500"
              disabled={isLoading}
            />
          </div>

          <div className="flex items-start">
            <input
              id="consent"
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-1 mr-3"
              disabled={isLoading}
              required
            />
            <label htmlFor="consent" className="text-sm text-text-secondary">
              I consent to data collection for research purposes
            </label>
          </div>

          {error && (
            <div className="bg-red-900/20 border border-red-500 rounded-md p-3">
              <p className="text-red-400 text-sm">⚠️ {error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-semibold py-3 px-6 rounded-md transition-colors"
          >
            {isLoading ? 'Registering...' : 'Start Training'}
          </button>
        </form>

        <p className="text-text-secondary text-xs mt-6 text-center">
          Note: Training takes 60-90 minutes. If your browser crashes, you can resume where you left off.
        </p>
      </div>
    </div>
  );
}

export default StudentRegistration;
```

---

### Modified Components

#### 1. `App.tsx` - Add Session Resume Logic

**Changes**:
```typescript
import { useState, useEffect } from 'react';
import StudentRegistration from './components/StudentRegistration';
// ... other imports

function App() {
  // Existing state...

  // NEW: Registration state
  const [showRegistration, setShowRegistration] = useState(false);

  // NEW: Check for existing session on mount
  useEffect(() => {
    async function checkExistingSession() {
      const savedSessionId = localStorage.getItem('kt_sessionId');

      if (!savedSessionId) {
        // No existing session - show registration
        setShowRegistration(true);
        return;
      }

      console.log('Found saved session:', savedSessionId);

      // Check if session still exists on server
      try {
        const response = await fetch(`http://localhost:3001/api/sessions/${savedSessionId}/check`);
        const data = await response.json();

        if (data.exists && !data.complete) {
          // Session is active - RESUME IT
          console.log('✅ Resuming existing session');

          setSessionId(savedSessionId);
          setIsActive(true);
          setCurrentAgent(data.currentAgent);
          setCurrentScenarioIndex(data.currentScenarioIndex || 0);
          setIsAARMode(data.isAARMode || false);

          // Fetch current vitals if in core agent mode
          if (data.currentAgent === 'core') {
            const vitalsResponse = await fetch(`http://localhost:3001/api/sessions/${savedSessionId}/vitals`);
            const vitalsData = await vitalsResponse.json();
            setCurrentVitals(vitalsData.raw);
          }

        } else if (data.complete) {
          // Session was completed - show completion screen
          console.log('Session already completed');
          setSessionComplete(true);

        } else {
          // Session not found - show registration
          console.log('Session not found on server');
          clearLocalStorage();
          setShowRegistration(true);
        }

      } catch (error) {
        console.error('Session check failed:', error);
        clearLocalStorage();
        setShowRegistration(true);
      }
    }

    checkExistingSession();
  }, []);

  function clearLocalStorage() {
    localStorage.removeItem('kt_sessionId');
    localStorage.removeItem('kt_studentId');
    localStorage.removeItem('kt_studentName');
    localStorage.removeItem('kt_group');
  }

  // NEW: Handle registration completion
  async function handleRegistrationComplete(data: { studentId: string; group: string }) {
    console.log('Registration complete:', data);

    // Start session with student ID
    const response = await api.startSession('asthma_mvp_001', data.studentId);

    setSessionId(response.sessionId);
    setIsActive(true);
    setCurrentAgent(response.currentAgent || 'cognitive_coach');

    // Save session ID to localStorage
    localStorage.setItem('kt_sessionId', response.sessionId);

    // Hide registration
    setShowRegistration(false);
  }

  // Render registration screen if needed
  if (showRegistration) {
    return <StudentRegistration onComplete={handleRegistrationComplete} />;
  }

  // ... rest of existing render logic
}
```

---

## Data Flow

### Flow 1: Student Registration & Session Start

```
1. Student opens browser
   ↓
2. Opens: http://localhost:3001
   ↓
3. App checks localStorage for sessionId
   ├─ Found → Try to resume (Flow 2)
   └─ Not found → Show registration screen
   ↓
4. Student fills form:
   - Name: "Alice Smith"
   - Email: "alice@example.com"
   - Consent: ✓
   ↓
5. Click "Start Training"
   ↓
6. Frontend: POST /api/student/register
   ↓
7. Backend:
   - Generate studentId: "alice_smith_lx3k9p2m7"
   - Assign group (automatic balancing): "A"
   - Save to: data/students/alice_smith_lx3k9p2m7.json
   - Return: { studentId, group }
   ↓
8. Frontend receives response
   - Save to localStorage:
     * kt_studentId: "alice_smith_lx3k9p2m7"
     * kt_studentName: "Alice Smith"
     * kt_group: "A"
   ↓
9. Frontend: POST /api/sessions/start
   - Body: { studentId: "alice_smith_lx3k9p2m7" }
   ↓
10. Backend:
    - Load student data
    - Create session with:
      * sessionId: "session_123..."
      * challengePointsEnabled: true (because Group A)
      * studentId, studentName, group
    - Return session data
    ↓
11. Frontend receives session
    - Save sessionId to localStorage
    - Start Cognitive Coach
    ↓
12. Training begins!
```

---

### Flow 2: Browser Refresh / Session Resume (CRITICAL)

```
1. Browser refreshes (or crashes and reopens)
   ↓
2. App.tsx useEffect runs on mount
   ↓
3. Check localStorage for 'kt_sessionId'
   ├─ Not found → Show registration
   └─ Found: "session_123..."
   ↓
4. Frontend: GET /api/sessions/session_123.../check
   ↓
5. Backend checks if session exists
   ├─ Not found → return { exists: false }
   └─ Found → return:
      {
        exists: true,
        complete: false,
        currentAgent: "core",
        currentScenarioIndex: 1,
        isAARMode: false
      }
   ↓
6. Frontend receives response
   ├─ exists: false → Clear localStorage, show registration
   ├─ complete: true → Show completion screen
   └─ exists: true, complete: false → RESUME SESSION:
      - Set sessionId from localStorage
      - Set isActive = true
      - Restore currentAgent, currentScenarioIndex
      - Fetch current vitals
      ↓
7. Session continues exactly where it was!
   - Student sees same scenario
   - Same conversation state
   - Same progress

✅ NO DATA LOST, NO RESTART NEEDED!
```

---

### Flow 3: Session Completion & Auto-Save

```
1. Student completes AAR conversation
   ↓
2. AAR Agent sends message with [AAR_COMPLETE] marker
   ↓
3. Frontend: POST /api/sessions/:id/aar/message
   ↓
4. Backend detects [AAR_COMPLETE]
   - Strip marker from message
   - Set session.sessionComplete = true
   - Set session.completedAt = timestamp
   ↓
5. Backend calls saveStudentData(session)
   - Build complete data object
   - Save to: data/students/STUDENT_ID.json
   - Save to: data/backups/2024-11-06/STUDENT_ID.json
   - Log: "✅ Data saved"
   ↓
6. Backend returns: { aarComplete: true }
   ↓
7. Frontend receives response
   - Show completion screen
   - Keep sessionId in localStorage
   ↓
8. Data safely on disk ✅
   - Student can close browser
   - Data survives server restart
```

---

### Flow 4: Data Export

```
1. All students complete training
   ↓
2. Instructor runs export script:
   $ cd server
   $ node export-data.js
   ↓
3. Script:
   - Reads all files from data/students/
   - Extracts key metrics
   - Generates CSV rows
   - Saves to: data/know_thyself_export_2024-11-06.csv
   ↓
4. Output:
   ✅ CSV exported successfully!
   📄 File: ../data/know_thyself_export_2024-11-06.csv
   📊 Total students: 20
   📊 Group A: 10
   📊 Group B: 10
   ↓
5. Instructor:
   - Copies CSV to USB drive
   - Opens in Excel/SPSS
   - Runs statistical analysis (t-test)
```

---

## Implementation Guide

### Phase 1: Backend Foundation (Day 1)

#### Task 1.1: Student Registration Endpoint

**File**: `server/index.js`

**Code Location**: After existing session endpoints (~line 2950)

```javascript
// ============================================================================
// LAYER 3: STUDENT REGISTRATION (Task 1.1)
// ============================================================================

// Track group assignments (automatic balancing)
let groupCounts = { A: 0, B: 0 };

/**
 * POST /api/student/register
 * Register new student and assign to A/B group with automatic balancing
 */
app.post('/api/student/register', async (req, res) => {
  try {
    const { name, email, consent } = req.body;

    // Validation
    if (!name || name.trim().length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Please enter your full name (at least 2 characters)'
      });
    }

    if (email && !isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        error: 'Please enter a valid email address'
      });
    }

    if (!consent) {
      return res.status(400).json({
        success: false,
        error: 'You must consent to data collection to participate'
      });
    }

    // Generate student ID
    const studentId = generateStudentId(name);

    // Assign group (automatic balancing)
    const group = assignGroup();

    // Create student record
    const studentData = {
      studentId: studentId,
      studentName: name.trim(),
      studentEmail: email?.trim() || null,
      group: group,
      registeredAt: new Date().toISOString(),
      sessionId: null,
      status: 'registered'
    };

    // Save to disk
    const studentDir = path.join(__dirname, '../data/students');
    await fs.promises.mkdir(studentDir, { recursive: true });

    const studentFile = path.join(studentDir, `${studentId}.json`);
    await fs.promises.writeFile(studentFile, JSON.stringify(studentData, null, 2));

    console.log(`✅ Student registered: ${name} (${studentId}) - Group ${group}`);
    console.log(`   Group balance: A=${groupCounts.A}, B=${groupCounts.B}`);

    res.json({
      success: true,
      studentId: studentId,
      group: group,
      message: `Welcome, ${name}! You've been assigned to Group ${group}.`
    });

  } catch (error) {
    console.error('Error registering student:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Helper: Generate unique student ID from name
 */
function generateStudentId(name) {
  const namePart = name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .substring(0, 30);

  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 7);

  return `${namePart}_${timestamp}${random}`;
}

/**
 * Helper: Assign A/B group with automatic balancing
 */
function assignGroup() {
  if (groupCounts.A === groupCounts.B) {
    const group = Math.random() < 0.5 ? 'A' : 'B';
    groupCounts[group]++;
    return group;
  }

  const group = groupCounts.A < groupCounts.B ? 'A' : 'B';
  groupCounts[group]++;
  return group;
}

/**
 * Helper: Validate email format
 */
function isValidEmail(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}
```

---

#### Task 1.2: Modify Session Start to Accept Student ID

**File**: `server/index.js`

**Location**: Modify existing `/api/sessions/start` endpoint (~line 60)

**Changes**:
```javascript
app.post('/api/sessions/start', async (req, res) => {
  try {
    const { scenarioId = 'asthma_mvp_001', studentId } = req.body; // ← ADD studentId

    // NEW: Load student data if provided
    let studentData = null;
    if (studentId) {
      const studentFile = path.join(__dirname, '../data/students', `${studentId}.json`);
      try {
        const fileContent = await fs.promises.readFile(studentFile, 'utf-8');
        studentData = JSON.parse(fileContent);
      } catch (error) {
        console.warn('Student file not found:', studentId);
      }
    }

    // Determine challenge points based on group (automatic)
    const challengePointsEnabled = studentData
      ? studentData.group === 'A'  // ← Auto-set based on A/B group
      : req.body.challengePointsEnabled !== undefined
        ? req.body.challengePointsEnabled
        : true;

    console.log('🎓 Starting new session with Cognitive Coach');
    console.log('Challenge Points:', challengePointsEnabled ? 'ENABLED' : 'DISABLED');
    if (studentData) {
      console.log(`Student: ${studentData.studentName} (Group ${studentData.group})`);
    }

    // ... existing session creation code

    // NEW: Add student info to session
    session = {
      sessionId,
      scenarioId,

      // NEW: Student identity
      studentId: studentData?.studentId || null,
      studentName: studentData?.studentName || null,
      studentEmail: studentData?.studentEmail || null,
      group: studentData?.group || null,
      registeredAt: studentData?.registeredAt || null,

      // ... all existing session fields

      challengePointsEnabled: challengePointsEnabled, // ← Use determined value
      // ... rest of session initialization
    };

    sessions.set(sessionId, session);

    // NEW: Update student record with sessionId
    if (studentData) {
      studentData.sessionId = sessionId;
      studentData.status = 'active';
      const studentFile = path.join(__dirname, '../data/students', `${studentId}.json`);
      await fs.promises.writeFile(studentFile, JSON.stringify(studentData, null, 2));
    }

    // ... rest of existing code
  }
});
```

---

#### Task 1.3: Session Check Endpoint

**File**: `server/index.js`

**Code Location**: After AAR endpoints (~line 2920)

```javascript
// ============================================================================
// LAYER 3: SESSION RESUME (Task 1.3)
// ============================================================================

/**
 * GET /api/sessions/:sessionId/check
 * Check if session exists and get status (for browser refresh recovery)
 */
app.get('/api/sessions/:sessionId/check', (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = sessions.get(sessionId);

    if (!session) {
      return res.json({ exists: false });
    }

    res.json({
      exists: true,
      complete: session.sessionComplete || false,
      currentAgent: session.currentAgent,
      currentScenarioIndex: session.currentScenarioIndex || 0,
      isAARMode: session.isAARMode || false,
      studentId: session.studentId,
      studentName: session.studentName
    });

  } catch (error) {
    console.error('Error checking session:', error);
    res.status(500).json({ error: error.message });
  }
});
```

---

#### Task 1.4: Auto-Save Function

**File**: `server/index.js`

**Code Location**: Add helper function (~line 1450)

```javascript
/**
 * Save student data to disk when session completes
 */
async function saveStudentData(session) {
  const studentData = {
    studentId: session.studentId,
    studentName: session.studentName,
    studentEmail: session.studentEmail,
    group: session.group,
    sessionId: session.sessionId,

    timestamps: {
      registered: session.registeredAt,
      sessionStarted: new Date(session.sessionStartTime).toISOString(),
      sessionCompleted: session.completedAt,
      totalElapsed: formatDuration((Date.now() - session.sessionStartTime) / 1000)
    },

    performance: calculatePerformanceScore(session),
    scenarios: generateScenarioSummaries(session),
    criticalActions: session.criticalActionsLog || [],
    challengePoints: session.challengePointsUsed || [],
    aarTranscript: aarService.getConversationHistory(session.sessionId),

    metadata: {
      version: 'Layer2_MVP',
      challengePointsEnabled: session.challengePointsEnabled,
      scenariosCompleted: (session.currentScenarioIndex || 0) + 1,
      sessionComplete: true
    }
  };

  // Save to primary location
  const primaryPath = path.join(__dirname, '../data/students', `${session.studentId}.json`);
  await fs.promises.mkdir(path.dirname(primaryPath), { recursive: true });
  await fs.promises.writeFile(primaryPath, JSON.stringify(studentData, null, 2));

  // Save to backup location
  const today = new Date().toISOString().split('T')[0];
  const backupDir = path.join(__dirname, '../data/backups', today);
  await fs.promises.mkdir(backupDir, { recursive: true });

  const backupPath = path.join(backupDir, `${session.studentId}.json`);
  await fs.promises.writeFile(backupPath, JSON.stringify(studentData, null, 2));

  console.log(`💾 Saved: ${primaryPath}`);
  console.log(`💾 Backup: ${backupPath}`);
}

function formatDuration(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins} minutes ${secs} seconds`;
}
```

**Modify AAR message endpoint to trigger save**:

```javascript
// In POST /api/sessions/:sessionId/aar/message
const isComplete = aarMessage.includes('[AAR_COMPLETE]');

if (isComplete) {
  session.sessionComplete = true;
  session.completedAt = new Date().toISOString();

  // AUTO-SAVE to disk
  await saveStudentData(session);

  console.log('✅ Session complete and data saved:', session.studentId);
}
```

---

### Phase 2: Frontend (Day 2)

#### Task 2.1: Create StudentRegistration Component

**File**: `know-thyself-frontend/src/components/StudentRegistration.tsx`

*(Full implementation provided in Components section above)*

---

#### Task 2.2: Modify App.tsx for Session Resume

**File**: `know-thyself-frontend/src/App.tsx`

*(Full implementation provided in Components section above)*

---

#### Task 2.3: Update API Service

**File**: `know-thyself-frontend/src/services/api.ts`

**Add methods**:

```typescript
async registerStudent(name: string, email: string | null) {
  const response = await fetch(`${this.baseURL}/student/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, consent: true })
  });
  return response.json();
}

async checkSession(sessionId: string) {
  const response = await fetch(`${this.baseURL}/sessions/${sessionId}/check`);
  return response.json();
}

async startSession(scenarioId: string, studentId?: string) {
  const response = await fetch(`${this.baseURL}/sessions/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scenarioId, studentId })
  });
  return response.json();
}
```

---

### Phase 3: Export Script (Day 3)

#### Task 3.1: Create Export Script

**File**: `server/export-data.js`

*(Full implementation provided in CSV Export section above)*

---

## Testing Checklist

### Pre-Testing (1 week before)

- [ ] **Development Complete**
  - [ ] Student registration endpoint working
  - [ ] Session resume logic working
  - [ ] Auto-save on completion working
  - [ ] Export script tested

- [ ] **Environment Setup**
  - [ ] Server runs on localhost:3001
  - [ ] Frontend builds without errors
  - [ ] data/ directory created with proper permissions
  - [ ] Anthropic API key configured

- [ ] **Test with Fake Students**
  - [ ] Create 3 fake student registrations
  - [ ] Verify Group A/B automatic balancing
  - [ ] Test browser refresh (session resumes) ✅ CRITICAL
  - [ ] Complete full session to AAR
  - [ ] Verify data saved to disk
  - [ ] Test CSV export
  - [ ] Clear all test data

- [ ] **Load Testing**
  - [ ] Run 20 concurrent fake sessions
  - [ ] Monitor server CPU/memory
  - [ ] Verify no crashes
  - [ ] Check Anthropic API rate limits

### Day of Testing

#### Setup (30 minutes before)

- [ ] Start server: `cd server && npm start`
- [ ] Verify data/ directory is empty (fresh start)
- [ ] Prepare USB drive for backup
- [ ] Write link on whiteboard: `http://localhost:3001`

#### Student Arrival (15 minutes)

- [ ] Students seated at computers
- [ ] Brief explanation given (5 min)
- [ ] Students open link
- [ ] Verify students can register

#### During Testing (60-90 minutes)

- [ ] Monitor data/students/ folder periodically
- [ ] Check for any students stuck
- [ ] Note any issues in logbook
- [ ] Do NOT intervene unless technical issue

#### After Testing

- [ ] Wait for all students to complete
- [ ] Check data/students/ folder (should have 20 files)
- [ ] Run export: `cd server && node export-data.js`
- [ ] **IMMEDIATELY copy CSV to USB drive**
- [ ] **Copy entire data/students/ folder to USB drive**
- [ ] Verify both backups complete
- [ ] Thank students

### Post-Testing

- [ ] **Data Verification**
  - [ ] Open CSV in Excel
  - [ ] Verify 20 rows (one per student)
  - [ ] Check Group A count ≈ 10
  - [ ] Check Group B count ≈ 10
  - [ ] No missing data fields

- [ ] **Analysis**
  - [ ] Calculate Group A mean score
  - [ ] Calculate Group B mean score
  - [ ] Run t-test for significance
  - [ ] Analyze CDP quality distribution
  - [ ] Compare treatment timing

---

## Deployment Guide

### Local Deployment (Testing Day)

#### Prerequisites

```bash
# Node.js 18+ installed
node --version  # Should be v18.x or higher

# npm installed
npm --version  # Should be 9.x or higher
```

#### Setup Steps

```bash
# 1. Navigate to project
cd /home/user/know-thyself-mvp

# 2. Install backend dependencies
cd server
npm install

# 3. Configure environment
cp .env.example .env
# Edit .env and add ANTHROPIC_API_KEY

# 4. Create data directory
mkdir -p ../data/students
mkdir -p ../data/backups

# 5. Install frontend dependencies
cd ../know-thyself-frontend
npm install

# 6. Build frontend
npm run build

# 7. Start server (from server directory)
cd ../server
npm start

# Server running on http://localhost:3001
# Student link: http://localhost:3001
```

#### Network Access (if students on different computers)

```bash
# Get your local IP address
ip addr show | grep "inet "
# Example: 192.168.1.100

# Students use: http://192.168.1.100:3001

# If needed, allow port through firewall
sudo ufw allow 3001/tcp
```

---

## Summary

### Features Implemented (4 Total)

1. ✅ **Student Registration** - Name/email → auto ID/group (automatic balancing)
2. ✅ **Session Resume** - Browser refresh recovery (CRITICAL requirement met)
3. ✅ **Auto-Save** - Data persistence to disk with backup
4. ✅ **CSV Export** - Command-line export script

### Features Removed (Per Your Requirements)

- ❌ Pause Button - Not needed
- ❌ Admin Dashboard - Not needed

### Timeline

**Estimated Development**: 2-3 days

**Breakdown**:
- Day 1: Backend (registration, session check, auto-save)
- Day 2: Frontend (registration component, session resume)
- Day 3: Export script + testing

### Key Benefits

✅ **Automatic A/B Balancing** - No manual group assignment needed
✅ **Session Resume** - Students MUST resume where they left off (requirement met)
✅ **Robust Data Collection** - Multi-layer backup prevents data loss
✅ **Simple Export** - One command generates CSV for analysis
✅ **Flexible** - Handles no-shows and extras automatically

---

## File Location

**Development Plan**: `/home/user/know-thyself-mvp/docs/Layer_3_MVP_Testing_Sprint.md`

Ready to implement when you give the go-ahead! 🎯
