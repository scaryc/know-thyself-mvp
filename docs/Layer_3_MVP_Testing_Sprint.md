# Layer 3: MVP Testing Sprint - Development Plan

**Version**: 1.0
**Date**: November 6, 2024
**Purpose**: Enable controlled MVP testing session with 10-20 students
**Timeline**: 4-5 days development

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
- ✅ A/B groups are automatically balanced (50/50)
- ✅ Students can pause and resume sessions
- ✅ All data is automatically saved (no manual export needed)
- ✅ Instructor can monitor progress in real-time
- ✅ Data export is one-click to CSV
- ✅ System is robust (no data loss, can handle crashes)

### Testing Scenario

**Day of Testing**:
1. Instructor starts server and opens admin dashboard
2. Students arrive, open link: `http://localhost:3001`
3. Students register (name + email) → auto-assigned to Group A or B
4. Students complete training (60-90 min) independently
5. Sessions auto-save on completion
6. Instructor exports all data to CSV
7. Statistical analysis of Group A vs Group B

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
- ✅ System assigns Group A or B with 50/50 balancing
- ✅ Student starts training immediately
- ✅ Registration data persisted to disk
- ✅ Duplicate names handled (unique IDs)

#### UI Specification

**Registration Screen** (`/register`):

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
│  Note: Training takes 60-90 minutes. You can pause     │
│  anytime and resume later.                             │
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

**A/B Group Balancing**:
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

  // If unbalanced, assign to smaller group
  const group = groupCounts.A < groupCounts.B ? 'A' : 'B';
  groupCounts[group]++;
  return group;
}

// Result: Even with random arrivals, maintains ~50/50 split
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

### Feature 2: Pause Button

#### Requirements

**User Story**: As a student, I want to pause my training session if I need a break, and resume exactly where I left off.

**Acceptance Criteria**:
- ✅ Pause button visible in header at all times
- ✅ Clicking pause freezes session (no auto-deterioration)
- ✅ Pause modal shows with resume button
- ✅ Can pause multiple times
- ✅ Paused time tracked separately from active time
- ✅ Resume continues exactly where paused

#### UI Specification

**Header with Pause Button**:

```
┌────────────────────────────────────────────────────────────┐
│  Know Thyself    Scenario 2/3    Time: 45:23    [⏸ Pause] │
└────────────────────────────────────────────────────────────┘
```

**Pause Modal**:

```
Overlay with modal:

┌─────────────────────────────────────┐
│                                     │
│           ⏸️  Session Paused        │
│                                     │
│      Your progress has been saved   │
│                                     │
│       Take a break if needed!       │
│                                     │
│                                     │
│      Time paused: 00:45             │
│                                     │
│                                     │
│      ┌────────────────────┐         │
│      │  Resume Training   │         │
│      └────────────────────┘         │
│                                     │
└─────────────────────────────────────┘

(Click outside disabled - must click Resume)
```

**States**:

| State | Header Button | Auto-Deterioration | Vitals Polling | User Can |
|-------|---------------|-------------------|----------------|----------|
| Active | [⏸ Pause] | Running | Active | Send messages, see updates |
| Paused | Hidden | **Stopped** | **Stopped** | Only click Resume |

#### Backend Logic

**Session Pause State**:
```javascript
session = {
  // ... existing fields
  isPaused: false,
  pauseHistory: [
    { pausedAt: '2024-11-06T14:45:00Z', resumedAt: '2024-11-06T14:47:30Z', duration: 150 },
    { pausedAt: '2024-11-06T15:10:00Z', resumedAt: null, duration: null } // Currently paused
  ],
  totalPausedTime: 150, // seconds
  lastPauseTime: null
};
```

**Pause Endpoint Behavior**:
```javascript
// POST /api/sessions/:id/pause
session.isPaused = true;
session.lastPauseTime = Date.now();
session.pauseHistory.push({
  pausedAt: new Date().toISOString(),
  resumedAt: null,
  duration: null
});
```

**Resume Endpoint Behavior**:
```javascript
// POST /api/sessions/:id/resume
const pauseDuration = Date.now() - session.lastPauseTime;
session.totalPausedTime += pauseDuration / 1000; // Convert to seconds

// Update pause history
const currentPause = session.pauseHistory[session.pauseHistory.length - 1];
currentPause.resumedAt = new Date().toISOString();
currentPause.duration = Math.round(pauseDuration / 1000);

session.isPaused = false;
session.lastPauseTime = null;
```

**Auto-Deterioration Check**:
```javascript
// In auto-deterioration monitor (server/index.js)
setInterval(() => {
  for (const [sessionId, session] of sessions.entries()) {
    // SKIP paused sessions
    if (session.isPaused) continue; // ← NEW CHECK

    if (session.currentAgent === 'core' && session.scenario) {
      // Normal deterioration logic...
    }
  }
}, 30000);
```

---

### Feature 3: Session Resume (Browser Refresh Recovery)

#### Requirements

**User Story**: As a student, if my browser crashes or I accidentally refresh, I want to continue my session without losing progress.

**Acceptance Criteria**:
- ✅ Session ID stored in browser localStorage
- ✅ On page load, check for existing session
- ✅ If session exists and is active, auto-resume
- ✅ If session exists and is complete, show completion screen
- ✅ If session doesn't exist, show registration screen
- ✅ Works across browser refresh, tab close, even browser restart

#### Technical Implementation

**Data Storage** (Client-side):

```javascript
// When session starts (after registration)
localStorage.setItem('kt_studentId', 'alice_smith_lx3k9p2m7');
localStorage.setItem('kt_sessionId', 'session_1762451094771_tochhcyil');
localStorage.setItem('kt_studentName', 'Alice Smith');
localStorage.setItem('kt_group', 'A');

// Structure:
{
  "kt_studentId": "alice_smith_lx3k9p2m7",
  "kt_sessionId": "session_1762451094771_tochhcyil",
  "kt_studentName": "Alice Smith",
  "kt_group": "A"
}
```

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
        console.log('Resuming existing session:', savedSessionId);

        // Restore session state
        setSessionId(savedSessionId);
        setIsActive(true);
        setCurrentAgent(response.currentAgent);
        setCurrentScenarioIndex(response.currentScenarioIndex);
        // ... restore other state

        // Fetch current data
        const vitals = await api.getVitals(savedSessionId);
        setCurrentVitals(vitals);

      } else if (response.complete) {
        // Session was completed - show completion screen
        setSessionComplete(true);

      } else {
        // Session not found (server restarted?) - clear and show registration
        clearLocalStorage();
        setShowRegistration(true);
      }

    } catch (error) {
      // Server error or session not found
      console.error('Session check failed:', error);
      clearLocalStorage();
      setShowRegistration(true);
    }
  }

  checkExistingSession();
}, []); // Run once on mount
```

**Backend Endpoint**:

```javascript
// GET /api/sessions/:sessionId/check
app.get('/api/sessions/:sessionId/check', (req, res) => {
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
    isPaused: session.isPaused || false,
    studentId: session.studentId,
    studentName: session.studentName
  });
});
```

---

### Feature 4: Auto-Save on Completion

#### Requirements

**User Story**: As an instructor, I want student data automatically saved to disk when they complete training, so I don't lose data if the server crashes.

**Acceptance Criteria**:
- ✅ When AAR completes (student sees [AAR_COMPLETE]), auto-save triggers
- ✅ Data saved to: `data/students/STUDENT_ID.json`
- ✅ Also saved to: `data/backups/YYYY-MM-DD/STUDENT_ID.json`
- ✅ File includes all performance data
- ✅ Session remains in memory for admin dashboard
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
    "totalElapsed": "93 minutes 27 seconds",
    "activeDuration": "88 minutes 12 seconds",
    "pausedDuration": "5 minutes 15 seconds"
  },

  "pauseHistory": [
    { "pausedAt": "2024-11-06T14:45:00Z", "resumedAt": "2024-11-06T14:47:30Z", "duration": 150 },
    { "pausedAt": "2024-11-06T15:10:00Z", "resumedAt": "2024-11-06T15:12:45Z", "duration": 165 }
  ],

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
    },
    // ... scenarios 2 and 3
  ],

  "criticalActions": [
    { "time": "0:45", "action": "Applied high-flow oxygen at 15 L/min", "rating": "optimal" },
    { "time": "2:30", "action": "Administered salbutamol 100mcg via MDI", "rating": "optimal" },
    // ... all actions
  ],

  "challengePoints": [
    {
      "trigger": "oxygen_administration",
      "question": "Excellent choice on high-flow oxygen. Why is this critical for this patient?",
      "studentResponse": "Patient has SpO2 of 88% and is in respiratory distress...",
      "evaluation": {
        "rating": "good",
        "rationale": "Student identified hypoxia and respiratory distress correctly..."
      }
    }
    // ... if Group A
  ],

  "aarTranscript": [
    { "role": "assistant", "content": "Congratulations on completing...", "timestamp": "2024-11-06T16:00:00Z" },
    { "role": "user", "content": "I felt good about the asthma case...", "timestamp": "2024-11-06T16:01:15Z" },
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
      totalElapsed: formatDuration(session.totalElapsedTime),
      activeDuration: formatDuration(session.totalElapsedTime - session.totalPausedTime),
      pausedDuration: formatDuration(session.totalPausedTime)
    },

    pauseHistory: session.pauseHistory || [],
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

### Feature 5: Admin Dashboard

#### Requirements

**User Story**: As an instructor, I want a simple dashboard to monitor all active student sessions and export data when testing is complete.

**Acceptance Criteria**:
- ✅ Dashboard accessible at `/admin` (no auth for MVP)
- ✅ Shows all active sessions with real-time status
- ✅ Shows completed sessions
- ✅ Displays key metrics (score, time, group)
- ✅ Auto-refreshes every 10 seconds
- ✅ One-click CSV export of all data
- ✅ Shows group balance (A vs B counts)

#### UI Specification

**Dashboard Layout** (`/admin`):

```html
┌───────────────────────────────────────────────────────────────────────┐
│  🏥 KNOW THYSELF - INSTRUCTOR DASHBOARD                               │
│                                                     [Refresh] [Export] │
├───────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  Testing Session: November 6, 2024  14:30 - ongoing                   │
│                                                                        │
│  📊 Overview                                                           │
│  ┌──────────────┬──────────────┬──────────────┬──────────────┐        │
│  │ Total        │ Active       │ Completed    │ Paused       │        │
│  │ 18           │ 12           │ 5            │ 1            │        │
│  └──────────────┴──────────────┴──────────────┴──────────────┘        │
│                                                                        │
│  ┌──────────────┬──────────────┐                                      │
│  │ Group A      │ Group B      │                                      │
│  │ 9            │ 9            │  (Balanced ✅)                        │
│  └──────────────┴──────────────┘                                      │
│                                                                        │
├───────────────────────────────────────────────────────────────────────┤
│  🟢 ACTIVE SESSIONS                                                    │
├───────────────────────────────────────────────────────────────────────┤
│  Student Name     │ Group │ Current Phase      │ Time    │ Score     │
│  ────────────────────────────────────────────────────────────────────│
│  Alice Smith      │  A    │ Core Agent - S2    │ 45:23   │  78%     │
│  Bob Jones        │  B    │ Core Agent - S3    │ 52:10   │  81%     │
│  Carol White      │  A    │ AAR Agent          │ 71:05   │  85%     │
│  David Lee        │  B    │ ⏸️ Paused (S2)      │ 38:47   │  72%     │
│  Eve Brown        │  A    │ Cognitive Coach    │ 12:33   │  --      │
│  ...                                                                  │
│                                                                        │
├───────────────────────────────────────────────────────────────────────┤
│  ✅ COMPLETED SESSIONS                                                 │
├───────────────────────────────────────────────────────────────────────┤
│  Student Name     │ Group │ Completed At │ Total Time │ Final Score │
│  ────────────────────────────────────────────────────────────────────│
│  Frank Miller     │  B    │ 15:58        │ 86 min     │  79%        │
│  Grace Park       │  A    │ 16:05        │ 87 min     │  91%        │
│  Henry Zhang      │  B    │ 16:12        │ 73 min     │  84%        │
│  ...                                                                  │
│                                                                        │
├───────────────────────────────────────────────────────────────────────┤
│  Last updated: 16:15:42  (auto-refresh in 8s)                        │
│                                                                        │
│  [Export All Data to CSV]                                             │
└───────────────────────────────────────────────────────────────────────┘
```

**Color Coding**:
- 🟢 Green: Active sessions
- 🟡 Yellow: Paused sessions
- ✅ Gray: Completed sessions

#### Implementation Details

**Frontend** (`know-thyself-frontend/src/pages/AdminDashboard.tsx`):

```typescript
interface SessionStatus {
  studentId: string;
  studentName: string;
  group: 'A' | 'B';
  currentPhase: string;
  elapsedTime: string;
  currentScore: number;
  isPaused: boolean;
  isComplete: boolean;
  completedAt?: string;
}

function AdminDashboard() {
  const [sessions, setSessions] = useState<SessionStatus[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  useEffect(() => {
    // Initial fetch
    fetchSessions();

    // Auto-refresh every 10 seconds
    const interval = setInterval(() => {
      fetchSessions();
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  async function fetchSessions() {
    const response = await fetch('/api/admin/sessions');
    const data = await response.json();
    setSessions(data.sessions);
    setLastUpdate(new Date());
  }

  async function exportCSV() {
    const response = await fetch('/api/admin/export');
    const blob = await response.blob();

    // Download file
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `know_thyself_data_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  }

  // Render dashboard...
}
```

**Backend Endpoint** (GET `/api/admin/sessions`):

```javascript
app.get('/api/admin/sessions', (req, res) => {
  const allSessions = Array.from(sessions.values());

  const sessionStatuses = allSessions.map(session => {
    const elapsedSeconds = session.sessionStartTime
      ? Math.floor((Date.now() - session.sessionStartTime) / 1000) - (session.totalPausedTime || 0)
      : 0;

    const minutes = Math.floor(elapsedSeconds / 60);
    const seconds = elapsedSeconds % 60;

    return {
      studentId: session.studentId,
      studentName: session.studentName,
      studentEmail: session.studentEmail,
      group: session.group,
      currentPhase: getCurrentPhase(session),
      elapsedTime: `${minutes}:${String(seconds).padStart(2, '0')}`,
      currentScore: calculatePerformanceScore(session).percentage || 0,
      isPaused: session.isPaused || false,
      isComplete: session.sessionComplete || false,
      completedAt: session.completedAt
    };
  });

  // Separate active and completed
  const active = sessionStatuses.filter(s => !s.isComplete);
  const completed = sessionStatuses.filter(s => s.isComplete);

  // Count groups
  const groupA = sessionStatuses.filter(s => s.group === 'A').length;
  const groupB = sessionStatuses.filter(s => s.group === 'B').length;

  res.json({
    total: sessionStatuses.length,
    active: active.length,
    completed: completed.length,
    paused: active.filter(s => s.isPaused).length,
    groupA: groupA,
    groupB: groupB,
    sessions: sessionStatuses,
    activeSessions: active,
    completedSessions: completed
  });
});

function getCurrentPhase(session) {
  if (session.sessionComplete) return 'Complete';
  if (session.isPaused) return `⏸️ Paused (S${session.currentScenarioIndex + 1})`;
  if (session.currentAgent === 'cognitive_coach') return 'Cognitive Coach';
  if (session.currentAgent === 'core' && session.scenario) {
    return `Core Agent - S${session.currentScenarioIndex + 1}`;
  }
  if (session.isAARMode) return 'AAR Agent';
  return 'Unknown';
}
```

---

### Feature 6: CSV Export

#### Requirements

**User Story**: As an instructor, I want to export all session data to CSV for statistical analysis in Excel or SPSS.

**Acceptance Criteria**:
- ✅ One-click export from admin dashboard
- ✅ CSV includes all key metrics
- ✅ One row per student
- ✅ Separate columns for Group A metrics (reasoning quality)
- ✅ Timestamp in filename
- ✅ Opens in Excel without formatting issues

#### CSV Format

**Columns** (in order):

```csv
StudentID,StudentName,Email,Group,RegisteredAt,SessionStarted,SessionCompleted,TotalTimeMinutes,ActiveTimeMinutes,PausedTimeMinutes,PauseCount,FinalScore,Grade,CDPOptimal,CDPAcceptable,CDPSuboptimal,CDPDangerous,CDPNotPerformed,Scenario1State,Scenario1Time,Scenario2State,Scenario2Time,Scenario3State,Scenario3Time,ChallengesTriggered,AverageReasoningScore,OxygenTimingSeconds,SalbutamolTimingSeconds,SteroidsTimingSeconds,MedicationErrors,SafetyViolations,TotalActions,SessionComplete
```

**Example Rows**:

```csv
alice_smith_lx3k9p2m7,Alice Smith,alice@example.com,A,2024-11-06T14:30:00Z,2024-11-06T14:32:15Z,2024-11-06T16:05:42Z,93,88,5,2,85,B+,5,2,1,0,0,improving,28,stable,31,improving,29,3,75,120,240,300,0,0,45,true
bob_jones_lx3k9q4n1,Bob Jones,bob@example.com,B,2024-11-06T14:31:00Z,2024-11-06T14:33:10Z,2024-11-06T15:58:25Z,86,86,0,0,79,C+,4,3,1,0,0,stable,30,improving,28,stable,28,0,N/A,135,310,420,1,0,42,true
```

#### Backend Implementation

**Export Endpoint** (GET `/api/admin/export`):

```javascript
app.get('/api/admin/export', async (req, res) => {
  const allSessions = Array.from(sessions.values());

  // Generate CSV header
  const header = [
    'StudentID', 'StudentName', 'Email', 'Group',
    'RegisteredAt', 'SessionStarted', 'SessionCompleted',
    'TotalTimeMinutes', 'ActiveTimeMinutes', 'PausedTimeMinutes', 'PauseCount',
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
  const rows = allSessions.map(session => {
    const performance = calculatePerformanceScore(session);
    const totalTime = session.completedAt
      ? Math.round((new Date(session.completedAt) - new Date(session.sessionStartTime)) / 60000)
      : 0;
    const pausedTime = Math.round((session.totalPausedTime || 0) / 60);
    const activeTime = totalTime - pausedTime;

    const treatmentTiming = analyzeTreatmentTiming(session);

    return [
      session.studentId,
      `"${session.studentName}"`, // Quote names with commas
      session.studentEmail || '',
      session.group,
      session.registeredAt || '',
      session.sessionStartTime || '',
      session.completedAt || '',
      totalTime,
      activeTime,
      pausedTime,
      (session.pauseHistory || []).length,
      performance.percentage || 0,
      performance.grade || '',
      session.optimalCount || 0,
      session.acceptableCount || 0,
      session.suboptimalCount || 0,
      session.dangerousCount || 0,
      session.notPerformedCount || 0,
      // Scenario data would be extracted from session history
      // ... (simplified for example)
      session.challengePointsEnabled ? (session.challengePointsUsed || []).length : 0,
      session.challengePointsEnabled ? calculateAverageReasoning(session) : 'N/A',
      getTreatmentTiming(treatmentTiming, 'oxygen'),
      getTreatmentTiming(treatmentTiming, 'salbutamol'),
      getTreatmentTiming(treatmentTiming, 'steroids'),
      (session.medicationErrors || []).length,
      session.safetyViolations || 0,
      (session.criticalActionsLog || []).length,
      session.sessionComplete ? 'true' : 'false'
    ].join(',');
  });

  const csv = [header, ...rows].join('\n');

  // Set headers for file download
  const filename = `know_thyself_data_${new Date().toISOString().split('T')[0]}.csv`;
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(csv);
});
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
  group: 'A' | 'B';           // A/B test group
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

  // Pause tracking
  isPaused: boolean;
  lastPauseTime: number | null;
  totalPausedTime: number; // seconds
  pauseHistory: Array<{
    pausedAt: string;
    resumedAt: string | null;
    duration: number | null;
  }>;

  // Session state
  currentAgent: 'cognitive_coach' | 'core' | null;
  currentScenarioIndex: number;
  isAARMode: boolean;
  sessionComplete: boolean;

  // Existing Layer 2 fields
  challengePointsEnabled: boolean;
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
  "email": "alice@example.com", // optional
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

**Error Responses**:
```json
// 400 - Validation error
{
  "success": false,
  "error": "Name is required"
}

// 400 - No consent
{
  "success": false,
  "error": "You must consent to data collection"
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

**Backend Logic**:
```javascript
// Look up student data
const studentData = loadStudentData(studentId);

// Create session with student info
const session = {
  sessionId: generateSessionId(),
  studentId: studentData.studentId,
  studentName: studentData.name,
  studentEmail: studentData.email,
  group: studentData.group,
  challengePointsEnabled: studentData.group === 'A', // Auto-set based on group
  // ... rest of session initialization
};
```

---

#### 3. Pause Session

**POST** `/api/sessions/:sessionId/pause`

**Request Body**: None

**Response**:
```json
{
  "success": true,
  "isPaused": true,
  "message": "Session paused successfully"
}
```

---

#### 4. Resume Session

**POST** `/api/sessions/:sessionId/resume`

**Request Body**: None

**Response**:
```json
{
  "success": true,
  "isPaused": false,
  "pauseDuration": 150, // seconds
  "message": "Session resumed successfully"
}
```

---

#### 5. Check Session Status

**GET** `/api/sessions/:sessionId/check`

**Response**:
```json
{
  "exists": true,
  "complete": false,
  "currentAgent": "core",
  "currentScenarioIndex": 1,
  "isPaused": false,
  "studentId": "alice_smith_lx3k9p2m7",
  "studentName": "Alice Smith"
}
```

---

#### 6. Admin - List All Sessions

**GET** `/api/admin/sessions`

**Response**:
```json
{
  "total": 18,
  "active": 12,
  "completed": 5,
  "paused": 1,
  "groupA": 9,
  "groupB": 9,
  "sessions": [
    {
      "studentId": "alice_smith_lx3k9p2m7",
      "studentName": "Alice Smith",
      "group": "A",
      "currentPhase": "Core Agent - S2",
      "elapsedTime": "45:23",
      "currentScore": 78,
      "isPaused": false,
      "isComplete": false
    }
    // ... more sessions
  ],
  "activeSessions": [...],
  "completedSessions": [...]
}
```

---

#### 7. Admin - Export CSV

**GET** `/api/admin/export`

**Response**: CSV file download

**Headers**:
```
Content-Type: text/csv
Content-Disposition: attachment; filename="know_thyself_data_2024-11-06.csv"
```

---

## Frontend Components

### New Components

#### 1. `StudentRegistration.tsx`

**Path**: `know-thyself-frontend/src/components/StudentRegistration.tsx`

**Purpose**: Registration form for students

**Props**: None

**State**:
```typescript
const [name, setName] = useState('');
const [email, setEmail] = useState('');
const [consent, setConsent] = useState(false);
const [error, setError] = useState('');
const [isLoading, setIsLoading] = useState(false);
```

**Functions**:
```typescript
async function handleSubmit() {
  // Validate
  if (!name.trim()) {
    setError('Please enter your full name');
    return;
  }

  if (email && !isValidEmail(email)) {
    setError('Please enter a valid email address');
    return;
  }

  if (!consent) {
    setError('You must consent to data collection');
    return;
  }

  // Register
  setIsLoading(true);
  try {
    const response = await api.registerStudent(name, email);

    // Save to localStorage
    localStorage.setItem('kt_studentId', response.studentId);
    localStorage.setItem('kt_studentName', name);
    localStorage.setItem('kt_group', response.group);

    // Proceed to start session
    onRegistrationComplete(response);

  } catch (error) {
    setError('Registration failed. Please try again.');
  } finally {
    setIsLoading(false);
  }
}
```

---

#### 2. `PauseButton.tsx`

**Path**: `know-thyself-frontend/src/components/PauseButton.tsx`

**Purpose**: Pause/resume button in header

**Props**:
```typescript
interface PauseButtonProps {
  sessionId: string;
  isPaused: boolean;
  onPause: () => void;
  onResume: () => void;
}
```

**Rendering**:
```typescript
function PauseButton({ sessionId, isPaused, onPause, onResume }: PauseButtonProps) {
  const [showModal, setShowModal] = useState(false);
  const [pausedDuration, setPausedDuration] = useState(0);

  useEffect(() => {
    if (isPaused) {
      setShowModal(true);

      // Update paused timer
      const interval = setInterval(() => {
        setPausedDuration(d => d + 1);
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [isPaused]);

  async function handlePause() {
    await api.pauseSession(sessionId);
    onPause();
  }

  async function handleResume() {
    await api.resumeSession(sessionId);
    setShowModal(false);
    setPausedDuration(0);
    onResume();
  }

  return (
    <>
      {!isPaused && (
        <button onClick={handlePause} className="pause-button">
          ⏸ Pause
        </button>
      )}

      {showModal && (
        <PauseModal
          pausedDuration={pausedDuration}
          onResume={handleResume}
        />
      )}
    </>
  );
}
```

---

#### 3. `AdminDashboard.tsx`

**Path**: `know-thyself-frontend/src/pages/AdminDashboard.tsx`

**Purpose**: Instructor monitoring dashboard

**Features**:
- Real-time session list
- Auto-refresh every 10 seconds
- Export button
- Group balance display

*(Full implementation shown in Feature 5 section above)*

---

### Modified Components

#### 1. `App.tsx` - Add Session Resume Logic

**Changes**:
```typescript
// Add state for registration
const [showRegistration, setShowRegistration] = useState(false);

// On mount, check for existing session
useEffect(() => {
  async function checkExistingSession() {
    const savedSessionId = localStorage.getItem('kt_sessionId');

    if (!savedSessionId) {
      setShowRegistration(true);
      return;
    }

    // Check if session exists
    const response = await api.checkSession(savedSessionId);

    if (response.exists && !response.complete) {
      // Resume session
      await resumeSession(response);
    } else if (response.complete) {
      setSessionComplete(true);
    } else {
      clearLocalStorage();
      setShowRegistration(true);
    }
  }

  checkExistingSession();
}, []);

// Render registration if needed
if (showRegistration) {
  return <StudentRegistration onComplete={handleRegistrationComplete} />;
}
```

---

#### 2. `Header.tsx` - Add Pause Button

**Changes**:
```typescript
<Header>
  <Logo />
  <ScenarioProgress current={currentScenarioIndex} total={3} />
  <Timer startTime={scenarioStartTime} />

  {/* NEW: Pause button */}
  {sessionId && isActive && (
    <PauseButton
      sessionId={sessionId}
      isPaused={isPaused}
      onPause={() => setIsPaused(true)}
      onResume={() => setIsPaused(false)}
    />
  )}
</Header>
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
   ├─ Found → Try to resume (Flow 3)
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
   - Assign group (balanced): "A"
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
   - Body: { studentId: "alice_smith_lx3k9p2m7", scenarioId: "asthma_mvp_001" }
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

### Flow 2: Pause & Resume

```
PAUSE:
1. Student clicks [⏸ Pause] button
   ↓
2. Frontend: POST /api/sessions/:id/pause
   ↓
3. Backend:
   - Set session.isPaused = true
   - Record pause timestamp
   - Add to pauseHistory
   ↓
4. Frontend receives confirmation
   - Show pause modal
   - Stop vitals polling
   - Disable message input
   ↓
5. Student sees pause screen

RESUME:
1. Student clicks [Resume Training]
   ↓
2. Frontend: POST /api/sessions/:id/resume
   ↓
3. Backend:
   - Calculate pause duration
   - Add to totalPausedTime
   - Set session.isPaused = false
   - Update pauseHistory
   ↓
4. Frontend receives confirmation
   - Hide pause modal
   - Resume vitals polling
   - Enable message input
   ↓
5. Training continues exactly where paused
```

---

### Flow 3: Browser Refresh / Session Resume

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
        isPaused: false
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
      - Fetch conversation history (if possible)
      ↓
7. Session continues exactly where it was!
   - Student sees same scenario
   - Same conversation state
   - Same progress
```

---

### Flow 4: Session Completion & Auto-Save

```
1. Student completes AAR conversation
   ↓
2. AAR Agent sends message with [AAR_COMPLETE] marker
   ↓
3. Frontend: POST /api/sessions/:id/aar/message
   - Body: { message: "..." }
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
   - Clear "active session" state
   - Keep sessionId in localStorage (for viewing results)
   ↓
8. Data safely on disk ✅
   - Student can close browser
   - Data survives server restart
```

---

### Flow 5: Instructor Data Export

```
1. Instructor opens admin dashboard
   - URL: http://localhost:3001/admin
   ↓
2. Dashboard loads
   - Fetch: GET /api/admin/sessions
   - Display all sessions (active + completed)
   - Auto-refresh every 10 seconds
   ↓
3. All students complete training
   - Dashboard shows: "Active: 0, Completed: 20"
   ↓
4. Instructor clicks [Export All Data to CSV]
   ↓
5. Frontend: GET /api/admin/export
   ↓
6. Backend:
   - Iterate all sessions (from memory + disk)
   - Generate CSV rows
   - Format with proper headers
   - Return as downloadable file
   ↓
7. Browser downloads: know_thyself_data_2024-11-06.csv
   ↓
8. Instructor saves to USB drive
   ↓
9. Opens in Excel for analysis:
   - Group A: n=10, mean score = 83%
   - Group B: n=10, mean score = 79%
   - Run t-test for significance
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

// Track group assignments
let groupCounts = { A: 0, B: 0 };

/**
 * POST /api/student/register
 * Register new student and assign to A/B group
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

    // Assign group (balanced)
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
 * Helper: Assign A/B group with balancing
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

    // Determine challenge points based on group
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

#### Task 1.3: Pause/Resume Endpoints

**File**: `server/index.js`

**Code Location**: After AAR endpoints (~line 2920)

```javascript
// ============================================================================
// LAYER 3: PAUSE/RESUME FUNCTIONALITY (Task 1.3)
// ============================================================================

/**
 * POST /api/sessions/:sessionId/pause
 * Pause an active session
 */
app.post('/api/sessions/:sessionId/pause', (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = sessions.get(sessionId);

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (session.isPaused) {
      return res.json({
        success: true,
        isPaused: true,
        message: 'Session is already paused'
      });
    }

    // Pause session
    session.isPaused = true;
    session.lastPauseTime = Date.now();

    if (!session.pauseHistory) {
      session.pauseHistory = [];
    }

    session.pauseHistory.push({
      pausedAt: new Date().toISOString(),
      resumedAt: null,
      duration: null
    });

    console.log(`⏸️  Session paused: ${sessionId} (${session.studentName})`);

    res.json({
      success: true,
      isPaused: true,
      message: 'Session paused successfully'
    });

  } catch (error) {
    console.error('Error pausing session:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/sessions/:sessionId/resume
 * Resume a paused session
 */
app.post('/api/sessions/:sessionId/resume', (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = sessions.get(sessionId);

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (!session.isPaused) {
      return res.json({
        success: true,
        isPaused: false,
        message: 'Session is not paused'
      });
    }

    // Calculate pause duration
    const pauseDuration = Date.now() - session.lastPauseTime;
    const pauseDurationSeconds = Math.round(pauseDuration / 1000);

    // Update total paused time
    if (!session.totalPausedTime) {
      session.totalPausedTime = 0;
    }
    session.totalPausedTime += pauseDurationSeconds;

    // Update pause history
    const currentPause = session.pauseHistory[session.pauseHistory.length - 1];
    currentPause.resumedAt = new Date().toISOString();
    currentPause.duration = pauseDurationSeconds;

    // Resume session
    session.isPaused = false;
    session.lastPauseTime = null;

    console.log(`▶️  Session resumed: ${sessionId} (${session.studentName}) - Paused for ${pauseDurationSeconds}s`);

    res.json({
      success: true,
      isPaused: false,
      pauseDuration: pauseDurationSeconds,
      message: 'Session resumed successfully'
    });

  } catch (error) {
    console.error('Error resuming session:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/sessions/:sessionId/check
 * Check if session exists and get status
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
      isPaused: session.isPaused || false,
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

#### Task 1.4: Modify Auto-Deterioration to Skip Paused Sessions

**File**: `server/index.js`

**Location**: Auto-deterioration monitor (~line 2917)

**Changes**:
```javascript
setInterval(() => {
  for (const [sessionId, session] of sessions.entries()) {
    // SKIP paused sessions
    if (session.isPaused) continue; // ← ADD THIS CHECK

    // Only check active Core Agent scenarios
    if (session.currentAgent === 'core' && session.scenario && session.currentState !== 'aar') {
      // ... existing deterioration logic
    }
  }
}, 30000);
```

---

### Phase 2: Frontend - Registration & Pause (Day 2)

#### Task 2.1: Create StudentRegistration Component

**File**: `know-thyself-frontend/src/components/StudentRegistration.tsx`

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
          Note: Training takes 60-90 minutes. You can pause anytime and resume later.
        </p>
      </div>
    </div>
  );
}

export default StudentRegistration;
```

---

#### Task 2.2: Create PauseButton Component

**File**: `know-thyself-frontend/src/components/PauseButton.tsx`

```typescript
import { useState, useEffect } from 'react';

interface PauseButtonProps {
  sessionId: string;
  isPaused: boolean;
  onPause: () => void;
  onResume: () => void;
}

function PauseButton({ sessionId, isPaused, onPause, onResume }: PauseButtonProps) {
  const [showModal, setShowModal] = useState(false);
  const [pausedSeconds, setPausedSeconds] = useState(0);

  useEffect(() => {
    if (isPaused) {
      setShowModal(true);
      setPausedSeconds(0);

      const interval = setInterval(() => {
        setPausedSeconds(s => s + 1);
      }, 1000);

      return () => clearInterval(interval);
    } else {
      setShowModal(false);
      setPausedSeconds(0);
    }
  }, [isPaused]);

  async function handlePause() {
    try {
      const response = await fetch(`http://localhost:3001/api/sessions/${sessionId}/pause`, {
        method: 'POST'
      });

      const data = await response.json();

      if (data.success) {
        onPause();
      }
    } catch (error) {
      console.error('Pause error:', error);
    }
  }

  async function handleResume() {
    try {
      const response = await fetch(`http://localhost:3001/api/sessions/${sessionId}/resume`, {
        method: 'POST'
      });

      const data = await response.json();

      if (data.success) {
        onResume();
      }
    } catch (error) {
      console.error('Resume error:', error);
    }
  }

  const minutes = Math.floor(pausedSeconds / 60);
  const seconds = pausedSeconds % 60;
  const timeString = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  return (
    <>
      {!isPaused && (
        <button
          onClick={handlePause}
          className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-md flex items-center gap-2 transition-colors"
        >
          <span>⏸</span>
          <span>Pause</span>
        </button>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-bg-secondary border border-border-primary rounded-lg shadow-2xl p-8 max-w-md w-full">
            <div className="text-center">
              <div className="text-6xl mb-4">⏸️</div>
              <h2 className="text-2xl font-bold text-text-primary mb-4">
                Session Paused
              </h2>
              <p className="text-text-secondary mb-6">
                Your progress has been saved
              </p>
              <p className="text-text-secondary mb-8">
                Take a break if needed!
              </p>

              <div className="bg-bg-primary border border-border-primary rounded-md p-4 mb-8">
                <p className="text-text-secondary text-sm mb-2">Time paused</p>
                <p className="text-3xl font-mono text-text-primary">{timeString}</p>
              </div>

              <button
                onClick={handleResume}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-md transition-colors"
              >
                Resume Training
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default PauseButton;
```

---

#### Task 2.3: Modify App.tsx for Registration & Session Resume

**File**: `know-thyself-frontend/src/App.tsx`

**Key Changes**:

```typescript
import { useState, useEffect } from 'react';
import StudentRegistration from './components/StudentRegistration';
import PauseButton from './components/PauseButton';
// ... other imports

function App() {
  // Existing state...

  // NEW: Registration state
  const [showRegistration, setShowRegistration] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

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
          console.log('Resuming existing session');

          setSessionId(savedSessionId);
          setIsActive(true);
          setCurrentAgent(data.currentAgent);
          setCurrentScenarioIndex(data.currentScenarioIndex || 0);
          setIsPaused(data.isPaused || false);
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

  // ... rest of render logic

  return (
    <div>
      <Header>
        {/* ... existing header content */}

        {/* NEW: Pause button */}
        {sessionId && isActive && !isAARMode && (
          <PauseButton
            sessionId={sessionId}
            isPaused={isPaused}
            onPause={() => setIsPaused(true)}
            onResume={() => setIsPaused(false)}
          />
        )}
      </Header>

      {/* ... rest of app */}
    </div>
  );
}
```

---

### Phase 3: Admin Dashboard & Export (Day 3-4)

*(Due to length constraints, this would be implemented following the specifications in Feature 5 and Feature 6 sections above)*

**Key Files to Create**:
1. `know-thyself-frontend/src/pages/AdminDashboard.tsx`
2. Backend endpoint: `GET /api/admin/sessions`
3. Backend endpoint: `GET /api/admin/export`

---

## Testing Checklist

### Pre-Testing (1 week before)

- [ ] **Development Complete**
  - [ ] All 6 features implemented
  - [ ] Code reviewed
  - [ ] No critical bugs

- [ ] **Environment Setup**
  - [ ] Server runs on localhost:3001
  - [ ] Frontend builds without errors
  - [ ] data/ directory created with proper permissions
  - [ ] Anthropic API key configured

- [ ] **Test with Fake Students**
  - [ ] Create 3 fake student registrations
  - [ ] Verify Group A/B assignment (should be balanced)
  - [ ] Test pause/resume functionality
  - [ ] Test browser refresh (session resumes)
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
- [ ] Open admin dashboard: `http://localhost:3001/admin`
- [ ] Verify data/ directory is empty (fresh start)
- [ ] Prepare USB drive for backup
- [ ] Write link on whiteboard: `http://localhost:3001`

#### Student Arrival (15 minutes)

- [ ] Students seated at computers
- [ ] Brief explanation given (5 min)
- [ ] Students open link
- [ ] Monitor registration on admin dashboard

#### During Testing (60-90 minutes)

- [ ] Monitor admin dashboard every 10 minutes
- [ ] Check for any students stuck or paused for long time
- [ ] Note any issues in logbook
- [ ] Do NOT intervene unless technical issue

#### After Testing

- [ ] Wait for all students to complete
- [ ] Admin dashboard shows: Active = 0, Completed = 20
- [ ] Click "Export All Data to CSV"
- [ ] **IMMEDIATELY copy CSV to USB drive**
- [ ] **Copy entire data/students/ folder to USB drive**
- [ ] Verify both backups complete
- [ ] Thank students

### Post-Testing

- [ ] **Data Verification**
  - [ ] Open CSV in Excel
  - [ ] Verify 20 rows (one per student)
  - [ ] Check Group A count = ~10
  - [ ] Check Group B count = ~10
  - [ ] No missing data fields

- [ ] **Analysis**
  - [ ] Calculate Group A mean score
  - [ ] Calculate Group B mean score
  - [ ] Run t-test for significance
  - [ ] Analyze CDP quality distribution
  - [ ] Compare treatment timing

- [ ] **Cleanup**
  - [ ] Archive data/students/ folder (date-stamped)
  - [ ] Clear sessions from memory (restart server)
  - [ ] Keep backups safe

---

## Deployment Guide

### Local Deployment (Testing Day)

#### Prerequisites

```bash
# Node.js 18+ installed
node --version  # Should be v18.x or higher

# npm installed
npm --version  # Should be 9.x or higher

# Git (for version control)
git --version
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
# Admin dashboard: http://localhost:3001/admin
# Student link: http://localhost:3001
```

#### Firewall Configuration (if needed)

If students can't access from other computers:

```bash
# Allow port 3001 through firewall
sudo ufw allow 3001/tcp

# Get your local IP address
ip addr show | grep "inet "
# Example: 192.168.1.100

# Students use: http://192.168.1.100:3001
```

---

### Troubleshooting

#### Issue: Students can't connect

**Symptoms**: Browser shows "can't reach this page"

**Solutions**:
1. Check server is running: `curl http://localhost:3001`
2. Check firewall: `sudo ufw status`
3. Get correct IP: `hostname -I`
4. Try: `http://[YOUR-IP]:3001` instead of localhost

---

#### Issue: Data not saving

**Symptoms**: Admin dashboard empty, no files in data/students/

**Solutions**:
1. Check directory permissions: `ls -la data/`
2. Check server logs for errors
3. Manually test: `curl http://localhost:3001/api/admin/sessions`

---

#### Issue: Group assignment unbalanced

**Symptoms**: Group A has 15, Group B has 5

**Cause**: Server was restarted mid-session (lost groupCounts)

**Solutions**:
1. For testing: Accept imbalance, note in report
2. For production: Persist groupCounts to disk

---

## Summary

This development plan provides:

✅ **Complete technical specifications** for 6 features
✅ **API endpoint definitions** with request/response examples
✅ **Database schemas** for student and session data
✅ **Frontend components** with full code implementations
✅ **Data flow diagrams** for all key scenarios
✅ **Step-by-step implementation guide** organized by phase
✅ **Comprehensive testing checklist** for validation
✅ **Deployment instructions** for testing day

**Timeline**: 4-5 days of focused development

**Outcome**: Robust MVP testing system that supports:
- 10-20 concurrent students
- Self-service registration
- A/B testing with balanced groups
- Pause/resume capability
- Automatic data collection
- One-click CSV export
- No data loss (multi-layer backup)

**Ready to implement?** Start with Phase 1 (Backend Foundation) and proceed sequentially through phases.
