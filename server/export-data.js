/**
 * Export script to generate CSV from student data files
 * Layer 3: Feature 4 - CSV Export
 *
 * Usage: node export-data.js
 * Output: CSV file in data/ directory with timestamp
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Main export function
 */
async function exportToCSV() {
  console.log('🔍 Reading student data files...');

  const studentsDir = path.join(__dirname, '../data/students');

  try {
    // Check if directory exists
    try {
      await fs.access(studentsDir);
    } catch (error) {
      console.error('❌ Error: data/students directory not found');
      console.log('💡 Make sure students have completed sessions first');
      return;
    }

    // Read all JSON files
    const files = await fs.readdir(studentsDir);
    const jsonFiles = files.filter(f => f.endsWith('.json'));

    if (jsonFiles.length === 0) {
      console.log('⚠️  No student data files found');
      console.log('💡 Students must complete AAR sessions for data to be saved');
      return;
    }

    console.log(`📁 Found ${jsonFiles.length} student file(s)`);

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
        escapeCSV(student.studentId),
        escapeCSV(student.studentName),
        escapeCSV(student.studentEmail || ''),
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
        extractDuration(scenarios[0]?.duration),
        scenarios[1]?.finalState || '',
        extractDuration(scenarios[1]?.duration),
        scenarios[2]?.finalState || '',
        extractDuration(scenarios[2]?.duration),
        student.challengePoints?.length || 0,
        student.group === 'A' ? calculateAverageReasoning(student.challengePoints) : 'N/A',
        extractTreatmentTiming(student, 'oxygen'),
        extractTreatmentTiming(student, 'salbutamol'),
        extractTreatmentTiming(student, 'steroids'),
        countMedicationErrors(student),
        student.metadata?.safetyViolations || 0,
        student.criticalActions?.length || 0,
        student.metadata?.sessionComplete ? 'true' : 'false'
      ].join(',');
    });

    const csv = [header, ...rows].join('\n');

    // Save CSV file with timestamp
    const timestamp = new Date().toISOString().split('T')[0];
    const outputPath = path.join(__dirname, `../data/know_thyself_export_${timestamp}.csv`);
    await fs.writeFile(outputPath, csv);

    console.log('\n✅ CSV exported successfully!');
    console.log(`📄 File: ${outputPath}`);
    console.log(`\n📊 Summary:`);
    console.log(`   Total students: ${students.length}`);
    console.log(`   Group A: ${students.filter(s => s.group === 'A').length}`);
    console.log(`   Group B: ${students.filter(s => s.group === 'B').length}`);

    // Calculate basic stats
    const completedSessions = students.filter(s => s.metadata?.sessionComplete);
    console.log(`   Completed sessions: ${completedSessions.length}`);

    if (completedSessions.length > 0) {
      const avgScore = Math.round(
        completedSessions.reduce((sum, s) => sum + (s.performance?.overallScore || 0), 0) / completedSessions.length
      );
      console.log(`   Average score: ${avgScore}`);
    }

    console.log('\n💡 You can now open this CSV in Excel or SPSS for analysis');

  } catch (error) {
    console.error('❌ Export failed:', error);
    console.error(error.stack);
  }
}

/**
 * Helper: Extract minutes from duration string like "93 minutes 27 seconds"
 */
function extractMinutes(duration) {
  if (!duration) return 0;
  const match = duration.match(/(\d+)\s*minutes?/);
  return match ? parseInt(match[1]) : 0;
}

/**
 * Helper: Extract duration string or number to consistent format
 */
function extractDuration(duration) {
  if (!duration) return '';
  // If it's already a string like "28 minutes", return it
  if (typeof duration === 'string') return duration;
  // If it's a number, return it
  if (typeof duration === 'number') return duration;
  return '';
}

/**
 * Helper: Extract treatment timing in seconds from critical actions
 */
function extractTreatmentTiming(student, treatment) {
  const action = student.criticalActions?.find(a =>
    a.action && a.action.toLowerCase().includes(treatment)
  );

  if (!action) return '';

  // Return elapsed time if available
  if (action.elapsedTime !== undefined) {
    return Math.round(action.elapsedTime);
  }

  return '';
}

/**
 * Helper: Calculate average reasoning score for Group A students
 */
function calculateAverageReasoning(challenges) {
  if (!challenges || challenges.length === 0) return 'N/A';

  // Rating to numeric score mapping
  const ratings = {
    excellent: 100,
    good: 75,
    basic: 50,
    poor: 25
  };

  const scores = challenges
    .filter(c => c.evaluation && c.evaluation.rating)
    .map(c => ratings[c.evaluation.rating.toLowerCase()] || 0);

  if (scores.length === 0) return 'N/A';

  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  return Math.round(avg);
}

/**
 * Helper: Count medication errors from critical actions
 */
function countMedicationErrors(student) {
  if (!student.criticalActions) return 0;

  return student.criticalActions.filter(a =>
    a.action === 'medication_error' ||
    a.action === 'dangerous_medication_given' ||
    a.category === 'medication_error'
  ).length;
}

/**
 * Helper: Escape CSV fields (handle commas and quotes)
 */
function escapeCSV(field) {
  if (field === null || field === undefined) return '';

  const str = String(field);

  // If contains comma, quote, or newline, wrap in quotes and escape existing quotes
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }

  return str;
}

// Run export
exportToCSV();
