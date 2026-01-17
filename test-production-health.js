#!/usr/bin/env node

/**
 * Production Cloud Infrastructure Health Check
 * Tests: Render.com (frontend + backend), Koyeb (backend), Supabase (database)
 *
 * Usage: node test-production-health.js
 * Note: Uses native fetch (Node 18+)
 */

import { PrismaClient } from '@prisma/client';

const COLORS = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

const log = {
  success: (msg) => console.log(`${COLORS.green}✓${COLORS.reset} ${msg}`),
  error: (msg) => console.log(`${COLORS.red}✗${COLORS.reset} ${msg}`),
  warning: (msg) => console.log(`${COLORS.yellow}⚠${COLORS.reset} ${msg}`),
  info: (msg) => console.log(`${COLORS.blue}ℹ${COLORS.reset} ${msg}`),
  section: (msg) => console.log(`\n${COLORS.bold}${msg}${COLORS.reset}\n${'='.repeat(60)}`)
};

// Configuration - Update these with your actual URLs
const CONFIG = {
  render: {
    backend: 'https://know-thyself-backend.onrender.com',
    frontend: 'https://know-thyself-frontend.onrender.com'
  },
  koyeb: {
    backend: 'https://your-koyeb-url.koyeb.app'  // Update if deployed
  },
  supabase: {
    url: process.env.DATABASE_URL
  }
};

/**
 * Test if a URL is reachable and healthy
 */
async function testEndpoint(url, name, options = {}) {
  const startTime = Date.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

  try {
    const response = await fetch(url, {
      method: options.method || 'GET',
      headers: options.headers || {},
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    const duration = Date.now() - startTime;
    const status = response.status;

    if (response.ok) {
      log.success(`${name}: ${status} OK (${duration}ms)`);

      // Try to parse response if JSON
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        if (data) {
          console.log(`  Response:`, JSON.stringify(data, null, 2).split('\n').map(l => `  ${l}`).join('\n'));
        }
      }

      return { success: true, status, duration, name };
    } else {
      log.error(`${name}: ${status} ${response.statusText} (${duration}ms)`);
      return { success: false, status, duration, name };
    }
  } catch (error) {
    const duration = Date.now() - startTime;

    if (error.name === 'AbortError' || error.code === 'ETIMEDOUT') {
      log.error(`${name}: Timeout after ${duration}ms`);
      log.warning(`  This might be normal if backend is spinning up (Render free tier)`);
    } else if (error.code === 'ENOTFOUND') {
      log.error(`${name}: DNS lookup failed - service not found`);
    } else {
      log.error(`${name}: ${error.message}`);
    }

    return { success: false, error: error.message, duration, name };
  }
}

/**
 * Test Supabase database connectivity
 */
async function testDatabase() {
  log.section('🗄️  SUPABASE DATABASE CHECK');

  if (!process.env.DATABASE_URL) {
    log.error('DATABASE_URL not set in environment');
    log.info('  Set DATABASE_URL in .env file to test database connection');
    return { success: false, error: 'No DATABASE_URL' };
  }

  const prisma = new PrismaClient();

  try {
    // Test connection
    log.info('Testing database connection...');
    await prisma.$connect();
    log.success('Database connection established');

    // Count records in each table
    log.info('Counting records in tables...');

    const sessionCount = await prisma.session.count();
    log.success(`Sessions: ${sessionCount} records`);

    const messageCount = await prisma.message.count();
    log.success(`Messages: ${messageCount} records`);

    const studentCount = await prisma.student.count();
    log.success(`Students: ${studentCount} records`);

    const performanceCount = await prisma.performanceData.count();
    log.success(`PerformanceData: ${performanceCount} records`);

    // Get most recent session
    if (sessionCount > 0) {
      const latestSession = await prisma.session.findFirst({
        orderBy: { startedAt: 'desc' },
        select: {
          id: true,
          studentName: true,
          language: true,
          scenarioId: true,
          status: true,
          startedAt: true
        }
      });

      log.info(`Most recent session:`);
      console.log(`  ID: ${latestSession.id}`);
      console.log(`  Student: ${latestSession.studentName || 'Anonymous'}`);
      console.log(`  Language: ${latestSession.language}`);
      console.log(`  Scenario: ${latestSession.scenarioId || 'Not started'}`);
      console.log(`  Status: ${latestSession.status}`);
      console.log(`  Started: ${latestSession.startedAt.toISOString()}`);
    }

    await prisma.$disconnect();
    return { success: true, sessionCount, messageCount, studentCount };

  } catch (error) {
    log.error(`Database error: ${error.message}`);
    await prisma.$disconnect();
    return { success: false, error: error.message };
  }
}

/**
 * Test Render.com services
 */
async function testRender() {
  log.section('🎨 RENDER.COM SERVICES CHECK');

  const results = [];

  // Test backend health endpoint
  log.info('Testing backend health endpoint...');
  const backendHealth = await testEndpoint(
    `${CONFIG.render.backend}/api/health`,
    'Render Backend Health'
  );
  results.push(backendHealth);

  // Test backend root
  log.info('\nTesting backend root endpoint...');
  const backendRoot = await testEndpoint(
    CONFIG.render.backend,
    'Render Backend Root'
  );
  results.push(backendRoot);

  // Test frontend
  log.info('\nTesting frontend...');
  const frontend = await testEndpoint(
    CONFIG.render.frontend,
    'Render Frontend'
  );
  results.push(frontend);

  return results;
}

/**
 * Test Koyeb service (if deployed)
 */
async function testKoyeb() {
  log.section('🚀 KOYEB SERVICE CHECK');

  if (CONFIG.koyeb.backend.includes('your-koyeb-url')) {
    log.warning('Koyeb URL not configured in script');
    log.info('  Update CONFIG.koyeb.backend if you have a Koyeb deployment');
    return [{ success: null, name: 'Koyeb', note: 'Not configured' }];
  }

  const results = [];

  // Test Koyeb backend health
  log.info('Testing Koyeb backend health endpoint...');
  const health = await testEndpoint(
    `${CONFIG.koyeb.backend}/api/health`,
    'Koyeb Backend Health'
  );
  results.push(health);

  return results;
}

/**
 * Test recent V3.0 scenario upgrades are deployed
 */
async function testScenarioUpgrades() {
  log.section('📋 V3.0 SCENARIO UPGRADES CHECK');

  log.info('Testing if recent SK scenario upgrades are accessible...');

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

  try {
    // Test if backend can serve scenario files
    const response = await fetch(`${CONFIG.render.backend}/api/scenarios/sk`, {
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const scenarios = await response.json();
      log.success(`Backend returns ${scenarios.length || 0} SK scenarios`);

      // Check for V3.0 scenarios
      const v3Scenarios = scenarios.filter(s => s.includes('v3_0'));
      if (v3Scenarios.length > 0) {
        log.success(`Found ${v3Scenarios.length} V3.0 scenarios:`);
        v3Scenarios.forEach(s => console.log(`  - ${s}`));
      } else {
        log.warning('No V3.0 scenarios found in response');
      }

      return { success: true, count: scenarios.length };
    } else {
      log.warning(`Scenario endpoint returned: ${response.status}`);
      log.info('  Endpoint might not exist yet - this is OK if not implemented');
      return { success: null, note: 'Endpoint not implemented' };
    }
  } catch (error) {
    log.warning(`Could not test scenarios: ${error.message}`);
    log.info('  This is OK - scenario listing endpoint may not be implemented');
    return { success: null, error: error.message };
  }
}

/**
 * Generate summary report
 */
function generateReport(renderResults, koyebResults, dbResult) {
  log.section('📊 HEALTH CHECK SUMMARY');

  const allResults = [...renderResults, ...koyebResults];
  const successful = allResults.filter(r => r.success === true).length;
  const failed = allResults.filter(r => r.success === false).length;
  const skipped = allResults.filter(r => r.success === null).length;

  console.log(`Total services checked: ${allResults.length}`);
  console.log(`${COLORS.green}✓ Successful: ${successful}${COLORS.reset}`);
  console.log(`${COLORS.red}✗ Failed: ${failed}${COLORS.reset}`);
  console.log(`${COLORS.yellow}⊘ Skipped: ${skipped}${COLORS.reset}`);

  if (dbResult.success) {
    console.log(`\n${COLORS.green}✓ Database: Connected${COLORS.reset}`);
    console.log(`  ${dbResult.sessionCount} sessions, ${dbResult.messageCount} messages`);
  } else {
    console.log(`\n${COLORS.red}✗ Database: Failed${COLORS.reset}`);
  }

  // Overall health
  console.log('\n' + '='.repeat(60));
  if (failed === 0 && dbResult.success) {
    log.success('ALL SYSTEMS OPERATIONAL ✓');
  } else if (failed > 0) {
    log.error(`${failed} service(s) failing - investigation needed`);
  } else {
    log.warning('Some services not fully tested - review above');
  }
}

/**
 * Main execution
 */
async function main() {
  console.log(`\n${COLORS.bold}${COLORS.blue}Know Thyself MVP - Production Health Check${COLORS.reset}`);
  console.log(`${new Date().toISOString()}\n`);

  // Run all tests
  const renderResults = await testRender();
  const koyebResults = await testKoyeb();
  const dbResult = await testDatabase();

  // Optional: Test scenario upgrades
  await testScenarioUpgrades();

  // Generate summary
  generateReport(renderResults, koyebResults, dbResult);

  console.log('\n');
}

main().catch(error => {
  log.error(`Fatal error: ${error.message}`);
  console.error(error);
  process.exit(1);
});
