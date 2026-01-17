/**
 * Deployment Readiness Verification Script
 * Checks if the codebase is ready for Koyeb + Vercel migration
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const RESET = '\x1b[0m';
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const BOLD = '\x1b[1m';

let passCount = 0;
let failCount = 0;
let warnCount = 0;

function checkPass(message) {
  console.log(`${GREEN}✓${RESET} ${message}`);
  passCount++;
}

function checkFail(message) {
  console.log(`${RED}✗${RESET} ${message}`);
  failCount++;
}

function checkWarn(message) {
  console.log(`${YELLOW}⚠${RESET} ${message}`);
  warnCount++;
}

function section(title) {
  console.log(`\n${BOLD}${BLUE}━━━ ${title} ━━━${RESET}`);
}

function fileExists(filePath) {
  return fs.existsSync(path.join(__dirname, filePath));
}

function readJsonFile(filePath) {
  try {
    const content = fs.readFileSync(path.join(__dirname, filePath), 'utf8');
    return JSON.parse(content);
  } catch (error) {
    return null;
  }
}

function readFile(filePath) {
  try {
    return fs.readFileSync(path.join(__dirname, filePath), 'utf8');
  } catch (error) {
    return null;
  }
}

console.log(`\n${BOLD}${BLUE}═══════════════════════════════════════════════════════${RESET}`);
console.log(`${BOLD}${BLUE}   Know Thyself MVP - Deployment Readiness Check${RESET}`);
console.log(`${BOLD}${BLUE}   Koyeb (Backend) + Vercel (Frontend) Migration${RESET}`);
console.log(`${BOLD}${BLUE}═══════════════════════════════════════════════════════${RESET}`);

// ============================================================================
// 1. REPOSITORY STRUCTURE
// ============================================================================
section('Repository Structure');

if (fileExists('package.json')) {
  checkPass('Root package.json exists');
} else {
  checkFail('Root package.json missing');
}

if (fileExists('know-thyself-frontend/package.json')) {
  checkPass('Frontend package.json exists');
} else {
  checkFail('Frontend package.json missing');
}

if (fileExists('server/index.js')) {
  checkPass('Backend server file exists (server/index.js)');
} else {
  checkFail('Backend server file missing');
}

if (fileExists('prisma/schema.prisma')) {
  checkPass('Prisma schema exists');
} else {
  checkFail('Prisma schema missing');
}

// ============================================================================
// 2. BACKEND CONFIGURATION
// ============================================================================
section('Backend Configuration');

const rootPkg = readJsonFile('package.json');
if (rootPkg && rootPkg.scripts && rootPkg.scripts.server) {
  checkPass(`Backend start script defined: "${rootPkg.scripts.server}"`);
  if (rootPkg.scripts.server === 'node server/index.js') {
    checkPass('Backend script matches expected command');
  } else {
    checkWarn(`Backend script differs from expected: "${rootPkg.scripts.server}"`);
  }
} else {
  checkFail('Backend start script (npm run server) not found');
}

if (rootPkg && rootPkg.dependencies && rootPkg.dependencies['@prisma/client']) {
  checkPass('Prisma client dependency found');
} else {
  checkFail('Prisma client dependency missing');
}

if (rootPkg && rootPkg.dependencies && rootPkg.dependencies['@anthropic-ai/sdk']) {
  checkPass('Anthropic SDK dependency found');
} else {
  checkFail('Anthropic SDK dependency missing');
}

if (rootPkg && rootPkg.dependencies && rootPkg.dependencies.express) {
  checkPass('Express dependency found');
} else {
  checkFail('Express dependency missing');
}

// Check server code for PORT configuration
const serverContent = readFile('server/index.js');
if (serverContent && serverContent.includes('process.env.PORT')) {
  checkPass('Server uses PORT environment variable');
} else {
  checkWarn('Server may not use PORT environment variable');
}

// ============================================================================
// 3. FRONTEND CONFIGURATION
// ============================================================================
section('Frontend Configuration');

const frontendPkg = readJsonFile('know-thyself-frontend/package.json');
if (frontendPkg && frontendPkg.scripts && frontendPkg.scripts.build) {
  checkPass(`Frontend build script defined: "${frontendPkg.scripts.build}"`);
  if (frontendPkg.scripts.build.includes('vite build')) {
    checkPass('Frontend uses Vite build');
  } else {
    checkWarn(`Frontend build command differs: "${frontendPkg.scripts.build}"`);
  }
} else {
  checkFail('Frontend build script not found');
}

if (fileExists('know-thyself-frontend/vite.config.ts') || fileExists('know-thyself-frontend/vite.config.js')) {
  checkPass('Vite config file exists');
} else {
  checkFail('Vite config file missing');
}

if (fileExists('know-thyself-frontend/.env')) {
  checkPass('Frontend .env file exists');
  const frontendEnv = readFile('know-thyself-frontend/.env');
  if (frontendEnv && frontendEnv.includes('VITE_API_URL')) {
    checkPass('VITE_API_URL defined in frontend .env');
  } else {
    checkWarn('VITE_API_URL not found in frontend .env');
  }
} else {
  checkWarn('Frontend .env file not found (will be set in Vercel)');
}

// ============================================================================
// 4. ENVIRONMENT VARIABLES
// ============================================================================
section('Environment Variables Check');

if (fileExists('.env')) {
  checkPass('Root .env file exists');
  const rootEnv = readFile('.env');

  if (rootEnv && rootEnv.includes('DATABASE_URL')) {
    checkPass('DATABASE_URL defined');
  } else {
    checkFail('DATABASE_URL not found in .env');
  }

  if (rootEnv && rootEnv.includes('ANTHROPIC_API_KEY')) {
    checkPass('ANTHROPIC_API_KEY defined');
  } else {
    checkFail('ANTHROPIC_API_KEY not found in .env');
  }
} else {
  checkWarn('Root .env file not found (will be set in Koyeb)');
}

if (fileExists('.env.example')) {
  checkPass('.env.example file exists (good for documentation)');
} else {
  checkWarn('.env.example file not found');
}

// ============================================================================
// 5. GIT CONFIGURATION
// ============================================================================
section('Git Configuration');

if (fileExists('.git')) {
  checkPass('Git repository initialized');
} else {
  checkFail('Not a git repository');
}

if (fileExists('.gitignore')) {
  checkPass('.gitignore exists');
  const gitignore = readFile('.gitignore');
  if (gitignore && gitignore.includes('.env')) {
    checkPass('.env is in .gitignore (security)');
  } else {
    checkWarn('.env not in .gitignore - security risk!');
  }
} else {
  checkWarn('.gitignore not found');
}

// ============================================================================
// 6. KOYEB SPECIFIC CHECKS
// ============================================================================
section('Koyeb Deployment Requirements');

console.log(`${BLUE}ℹ${RESET} Build command should be: ${BOLD}npm install && npx prisma generate${RESET}`);
console.log(`${BLUE}ℹ${RESET} Run command should be: ${BOLD}npx prisma db push --accept-data-loss --skip-generate && npm run server${RESET}`);
console.log(`${BLUE}ℹ${RESET} Port should be: ${BOLD}8000${RESET}`);
console.log(`${BLUE}ℹ${RESET} Region recommended: ${BOLD}Frankfurt (fra)${RESET}`);

if (rootPkg && rootPkg.dependencies && rootPkg.dependencies.prisma) {
  checkPass('Prisma is in dependencies (can run in production)');
} else {
  checkWarn('Prisma should be in dependencies, not devDependencies for Koyeb');
}

// ============================================================================
// 7. VERCEL SPECIFIC CHECKS
// ============================================================================
section('Vercel Deployment Requirements');

console.log(`${BLUE}ℹ${RESET} Root directory should be: ${BOLD}know-thyself-frontend${RESET}`);
console.log(`${BLUE}ℹ${RESET} Framework preset: ${BOLD}Vite${RESET}`);
console.log(`${BLUE}ℹ${RESET} Build command: ${BOLD}npm run build${RESET}`);
console.log(`${BLUE}ℹ${RESET} Output directory: ${BOLD}dist${RESET}`);

if (frontendPkg && frontendPkg.dependencies && frontendPkg.dependencies.react) {
  checkPass('React dependency found in frontend');
} else {
  checkFail('React dependency missing in frontend');
}

if (frontendPkg && frontendPkg.devDependencies && frontendPkg.devDependencies.vite) {
  checkPass('Vite dependency found in frontend');
} else {
  checkFail('Vite dependency missing in frontend');
}

// ============================================================================
// 8. FINAL SUMMARY
// ============================================================================
console.log(`\n${BOLD}${BLUE}═══════════════════════════════════════════════════════${RESET}`);
console.log(`${BOLD}${BLUE}   Summary${RESET}`);
console.log(`${BOLD}${BLUE}═══════════════════════════════════════════════════════${RESET}\n`);

console.log(`${GREEN}✓ Passed:  ${passCount}${RESET}`);
console.log(`${YELLOW}⚠ Warnings: ${warnCount}${RESET}`);
console.log(`${RED}✗ Failed:  ${failCount}${RESET}`);

if (failCount === 0) {
  console.log(`\n${GREEN}${BOLD}🎉 Your codebase is ready for deployment!${RESET}`);
  console.log(`\n${BOLD}Next Steps:${RESET}`);
  console.log(`1. Push your code to GitHub (scaryc/know-thyself-mvp)`);
  console.log(`2. Follow KNOW_THYSELF_MIGRATION_PLAN.md Phase 1 (Koyeb Backend)`);
  console.log(`3. Follow KNOW_THYSELF_MIGRATION_PLAN.md Phase 2 (Vercel Frontend)`);
  console.log(`4. Run end-to-end tests to verify deployment`);
} else {
  console.log(`\n${RED}${BOLD}⚠️ Please fix the failed checks before deploying${RESET}`);
}

if (warnCount > 0) {
  console.log(`\n${YELLOW}${BOLD}Note:${RESET} Warnings are not critical but should be reviewed`);
}

console.log(`\n${BOLD}${BLUE}═══════════════════════════════════════════════════════${RESET}\n`);

process.exit(failCount > 0 ? 1 : 0);
