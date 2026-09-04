const fs = require('fs');
const path = require('path');

// Determine project root (one level up from tests/)
const projectRoot = path.resolve(__dirname, '..');

console.log('🔍 Checking dependency mismatch issue...\n');
console.log(`📁 Project root: ${projectRoot}\n`);

let allOk = true;

// 1. Read package.json
let packageJson;
try {
  packageJson = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8'));
  console.log('✅ package.json loaded');
} catch (err) {
  console.error('❌ Could not read package.json:', err.message);
  process.exit(1);
}

const deps = { ...(packageJson.dependencies || {}), ...(packageJson.devDependencies || {}) };

// 2. Check for groq-sdk and nodemailer in package.json
const requiredDeps = ['groq-sdk', 'nodemailer'];
for (const dep of requiredDeps) {
  if (packageJson.dependencies?.[dep]) {
    console.log(`✅ package.json includes "${dep}" (version: ${packageJson.dependencies[dep]})`);
  } else {
    console.error(`❌ package.json does NOT include "${dep}" in dependencies.`);
    allOk = false;
  }
}

// 3. Check that openai is not in package.json
if (deps.openai) {
  console.error('❌ package.json still contains "openai". Remove it.');
  allOk = false;
} else {
  console.log('✅ "openai" is not present in package.json');
}

// 4. Check node_modules (resolve from project root)
for (const dep of requiredDeps) {
  try {
    require.resolve(dep, { paths: [projectRoot] });
    console.log(`✅ node_modules/${dep} is installed and can be required`);
  } catch (err) {
    console.error(`❌ node_modules/${dep} is missing or cannot be required. Run "npm install".`);
    allOk = false;
  }
}

// 5. Check package-lock.json (if it exists)
const lockPath = path.join(projectRoot, 'package-lock.json');
if (fs.existsSync(lockPath)) {
  try {
    const lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
    const lockPackages = lock.packages || {};
    const rootPkg = lockPackages[''] || {};
    const lockDeps = { ...(rootPkg.dependencies || {}), ...(rootPkg.devDependencies || {}) };

    for (const dep of requiredDeps) {
      if (lockDeps[dep]) {
        console.log(`✅ package-lock.json includes "${dep}"`);
      } else {
        console.error(`❌ package-lock.json does NOT include "${dep}". Run "npm install".`);
        allOk = false;
      }
    }

    if (lockDeps.openai) {
      console.error('❌ package-lock.json still contains "openai".');
      allOk = false;
    } else {
      console.log('✅ "openai" is not present in package-lock.json');
    }
  } catch (err) {
    console.error('❌ Could not read package-lock.json:', err.message);
    allOk = false;
  }
} else {
  console.log('⚠️ package-lock.json not found. Run "npm install" to generate it.');
}

console.log('\n' + (allOk ? '✅ Issue fully resolved. All dependencies are correct.' : '❌ Some checks failed. Fix the issues above.'));
process.exit(allOk ? 0 : 1);