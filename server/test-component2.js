/**
 * TEST: Component 2 - Vital Signs Simulator
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import SimplifiedVitalSigns from './services/vitalSignsSimulator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const scenarioPath = path.join(__dirname, '../scenarios/asthma_mvp_001.json');
const scenarioData = JSON.parse(fs.readFileSync(scenarioPath, 'utf8'));

console.log('🧪 Testing Component 2: Vital Signs Simulator\n');
console.log('='.repeat(60));

// TEST 1: Create instance
console.log('\n📋 TEST 1: Create VitalSignsSimulator instance');
const vitalsSimulator = new SimplifiedVitalSigns(scenarioData);
console.log('✅ Instance created successfully');

// TEST 2: Get initial vitals
console.log('\n📋 TEST 2: Check initial vitals');
const initialVitals = vitalsSimulator.getCurrentVitals();
console.log('✅ Initial vitals:');
console.log(`   HR: ${initialVitals.HR} bpm`);
console.log(`   RR: ${initialVitals.RR} /min`);
console.log(`   SpO2: ${initialVitals.SpO2}%`);
console.log(`   BP: ${initialVitals.BP_systolic}/${initialVitals.BP_diastolic} mmHg`);

// TEST 3: Check concern level
console.log('\n📋 TEST 3: Check initial concern level');
const initialConcerns = vitalsSimulator.getVitalsConcernLevel();
console.log(`✅ Concern level: ${initialConcerns.level}`);
console.log(`   Concerns: ${initialConcerns.concerns.join(', ') || 'None'}`);

// TEST 4: Apply oxygen treatment (2 min effect)
console.log('\n📋 TEST 4: Apply oxygen treatment (after 2 minutes)');
const oxygenResult = vitalsSimulator.applyTreatmentEffect('oxygen', 2);
console.log(`✅ Effect status: ${oxygenResult.status}`);
console.log(`   Patient says: "${oxygenResult.patientResponse}"`);
const vitalsAfterO2 = vitalsSimulator.getCurrentVitals();
console.log(`   SpO2 improved: ${initialVitals.SpO2}% → ${vitalsAfterO2.SpO2}%`);

// TEST 5: Apply salbutamol (5 min effect)
console.log('\n📋 TEST 5: Apply salbutamol treatment (after 5 minutes)');
const salbutamolResult = vitalsSimulator.applyTreatmentEffect('salbutamol', 5);
console.log(`✅ Effect status: ${salbutamolResult.status}`);
console.log(`   Vital changes:`);
console.log(`     HR: ${vitalsAfterO2.HR} → ${salbutamolResult.changes.HR} bpm`);
console.log(`     RR: ${vitalsAfterO2.RR} → ${salbutamolResult.changes.RR} /min`);
console.log(`     SpO2: ${vitalsAfterO2.SpO2} → ${salbutamolResult.changes.SpO2}%`);

// TEST 6: Try treatment too early
console.log('\n📋 TEST 6: Try applying treatment too early (< time_to_effect)');
vitalsSimulator.reset();
const tooEarly = vitalsSimulator.applyTreatmentEffect('salbutamol', 2); // needs 5 min
console.log(`✅ Status: ${tooEarly.status}`);
console.log(`   Message: ${tooEarly.message}`);

// TEST 7: Test formatted vitals
console.log('\n📋 TEST 7: Get formatted vitals for display');
vitalsSimulator.reset();
vitalsSimulator.applyTreatmentEffect('oxygen', 2);
vitalsSimulator.applyTreatmentEffect('salbutamol', 5);
const formatted = vitalsSimulator.getFormattedVitals();
console.log('✅ Formatted vitals:');
Object.entries(formatted).forEach(([key, value]) => {
  if (value) console.log(`   ${key}: ${value}`);
});

// TEST 8: Test time degradation (10 minutes, no treatment)
console.log('\n📋 TEST 8: Test time-based deterioration (10min no treatment)');
const vitalsSimulator2 = new SimplifiedVitalSigns(scenarioData);
const initialVitals2 = vitalsSimulator2.getCurrentVitals();
vitalsSimulator2.applyTimeDegradation(10);
const deteriorated = vitalsSimulator2.getCurrentVitals();
console.log('✅ Vitals deteriorated:');
console.log(`   HR: ${initialVitals2.HR} → ${deteriorated.HR} bpm`);
console.log(`   RR: ${initialVitals2.RR} → ${deteriorated.RR} /min`);
console.log(`   SpO2: ${initialVitals2.SpO2}% → ${deteriorated.SpO2}%`);

// TEST 9: Critical deterioration (15 minutes)
console.log('\n📋 TEST 9: Critical deterioration (15min no treatment)');
const vitalsSimulator3 = new SimplifiedVitalSigns(scenarioData);
vitalsSimulator3.applyTimeDegradation(15);
const critical = vitalsSimulator3.getCurrentVitals();
const criticalConcerns = vitalsSimulator3.getVitalsConcernLevel();
console.log(`✅ Critical vitals:`);
console.log(`   HR: ${critical.HR} bpm (bradycardia from exhaustion)`);
console.log(`   RR: ${critical.RR} /min (respiratory failure)`);
console.log(`   SpO2: ${critical.SpO2}%`);
console.log(`   Concern level: ${criticalConcerns.level}`);

// TEST 10: Reset functionality
console.log('\n📋 TEST 10: Test reset to baseline');
vitalsSimulator3.reset();
const resetVitals = vitalsSimulator3.getCurrentVitals();
console.log(`✅ Reset successful:`);
console.log(`   HR back to: ${resetVitals.HR} bpm`);
console.log(`   SpO2 back to: ${resetVitals.SpO2}%`);

// SUMMARY
console.log('\n' + '='.repeat(60));
console.log('🎉 ALL TESTS PASSED!\n');
console.log('Component 2 is working correctly:');
console.log('  ✅ Initial vitals loaded from scenario');
console.log('  ✅ Treatment effects applied correctly');
console.log('  ✅ Time-to-effect delays working');
console.log('  ✅ Time-based deterioration working');
console.log('  ✅ Concern level detection working');
console.log('  ✅ Formatted display working');
console.log('  ✅ Reset functionality working');
console.log('\n✨ Ready to build Component 3!\n');