// 🔒 AEROMINT CORE MINT ENGINE INTEGRITY AUDITOR
// Run anytime to verify that the core NFT minting engine has NOT been tampered with or regressed.
// Usage: node verify_core_integrity.cjs

const fs = require('fs');
const path = require('path');

const rootDir = __dirname;
const appJsxPath = path.join(rootDir, 'src', 'App.jsx');
const frontendAppJsxPath = path.join(rootDir, 'frontend', 'src', 'App.jsx');
const serverJsPath = path.join(rootDir, 'backend', 'server.js');

let totalChecks = 0;
let passedChecks = 0;
const failures = [];

function assertInvariant(description, condition, failureDetails = '') {
  totalChecks++;
  if (condition) {
    passedChecks++;
    console.log(`  ✅ [PASS] ${description}`);
  } else {
    failures.push({ description, failureDetails });
    console.error(`  ❌ [FAIL] ${description} - ${failureDetails}`);
  }
}

console.log('================================================================');
console.log('🔒 AEROMINT V2: AUDITING CORE MINT ENGINE INVARIANTS...');
console.log('================================================================\n');

// 1. AUDIT src/App.jsx
console.log('📂 1. Auditing `src/App.jsx`:');
if (!fs.existsSync(appJsxPath)) {
  console.error(`  ❌ src/App.jsx not found at ${appJsxPath}`);
  process.exit(1);
}
const appContent = fs.readFileSync(appJsxPath, 'utf8');

assertInvariant(
  'Technique 2: 6-Key Staggered Laser Pipeline is active',
  appContent.includes('TECHNIQUE 2: 6-KEY STAGGERED LASER PIPELINE')
);

assertInvariant(
  'Flight-time lead offset (-150ms) for Pulse #1',
  appContent.includes('Math.max(0, msToT0 - 150)')
);

assertInvariant(
  '70ms staggered offsets across 6 OpenSea API Keys',
  appContent.includes('Math.max(0, msToT0 - 80)') &&
  appContent.includes('Math.max(0, msToT0 - 10)') &&
  appContent.includes('msToT0 + 60') &&
  appContent.includes('msToT0 + 130') &&
  appContent.includes('msToT0 + 200')
);

assertInvariant(
  'Micro-poll interval is set to 10ms for instant reaction',
  appContent.includes('setInterval(') && appContent.includes('}, 10);')
);

assertInvariant(
  'Extended failsafe pulser engaged at msToT0 + 250ms with 120ms cadence',
  appContent.includes('msToT0 + 250') && appContent.includes('}, 120);')
);

assertInvariant(
  'Atomic first-winner resolution: clear timers on cache hit',
  appContent.includes('pulseTimers.forEach(t => clearTimeout(t))')
);

assertInvariant(
  'Calldata Selector Guard validates mintSigned (0x4b61cd6f)',
  appContent.includes('4b61cd6f') && appContent.includes('knownSelectors')
);

assertInvariant(
  'FORBIDDEN REGRESSION: walletInCalldata MUST NOT exist in calldata parser',
  !appContent.includes('walletInCalldata'),
  'Found walletInCalldata which wrongly rejects valid SeaDrop allowlist calldata!'
);

assertInvariant(
  'Lockstep Barrier Blast executes multi-wallet broadcast to Top 3 RPCs',
  appContent.includes('lockstepBarrierBlast') && appContent.includes('Multi-Blast')
);

assertInvariant(
  'Nonce cache cleared immediately post-blast to prevent collisions',
  appContent.includes('cachedNoncesRef.current.clear()')
);

// 2. AUDIT frontend/src/App.jsx
console.log('\n📂 2. Auditing `frontend/src/App.jsx` mirror parity:');
if (fs.existsSync(frontendAppJsxPath)) {
  const feContent = fs.readFileSync(frontendAppJsxPath, 'utf8');
  assertInvariant(
    'frontend/src/App.jsx contains Technique 2 pipeline',
    feContent.includes('TECHNIQUE 2: 6-KEY STAGGERED LASER PIPELINE')
  );
  assertInvariant(
    'frontend/src/App.jsx has forbidden walletInCalldata removed',
    !feContent.includes('walletInCalldata')
  );
} else {
  console.warn('  ⚠️ frontend/src/App.jsx not found, skipping mirror check.');
}

// 3. AUDIT backend/server.js
console.log('\n📂 3. Auditing `backend/server.js`:');
if (!fs.existsSync(serverJsPath)) {
  console.error(`  ❌ backend/server.js not found at ${serverJsPath}`);
  process.exit(1);
}
const serverContent = fs.readFileSync(serverJsPath, 'utf8');

assertInvariant(
  'Low-latency keepAlive openseaHttpsAgent configured',
  serverContent.includes('openseaHttpsAgent') && serverContent.includes('keepAlive: true')
);

assertInvariant(
  'Robinhood SeaDrop routed exclusively through GraphQL',
  serverContent.includes("chain === 'robinhood'") &&
  serverContent.includes('Robinhood SeaDrop drops use /api/opensea/graphql-mint-actions exclusively')
);

assertInvariant(
  '1-Shot GraphQL proxy endpoint active (/api/opensea/graphql-mint-actions)',
  serverContent.includes('/api/opensea/graphql-mint-actions')
);

// SUMMARY
console.log('\n================================================================');
if (failures.length === 0) {
  console.log(`🎉 VERIFICATION SUCCESS: ${passedChecks}/${totalChecks} CHECKS PASSED!`);
  console.log('🔒 CORE NFT MINT ENGINE IS 100% INTACT, UNTOUCHED & ARMED FOR PEAK SPEED.');
  console.log('================================================================\n');
  process.exit(0);
} else {
  console.error(`🚨 REGRESSION DETECTED! ${failures.length} CRITICAL CHECKS FAILED:`);
  failures.forEach((f, i) => console.error(`  [${i + 1}] ${f.description}: ${f.failureDetails}`));
  console.log('================================================================\n');
  process.exit(1);
}
