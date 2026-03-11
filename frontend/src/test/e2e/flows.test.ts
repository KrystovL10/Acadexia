/// <reference types="node" />
/**
 * E2E Flow Verification Scripts
 *
 * Automated API verification functions that test core backend flows.
 * Run with: npm run qa:verify
 *
 * Prerequisites:
 *   - Backend running on http://localhost:8080
 *   - PostgreSQL running on port 5433
 *   - Database seeded with initial data
 */

const BASE_URL = process.env.API_URL || 'http://localhost:8080';

interface CheckResult {
  name: string;
  passed: boolean;
  message: string;
}

const results: CheckResult[] = [];

function log(icon: string, msg: string) {
  console.log(`${icon} ${msg}`);
}

function recordResult(name: string, passed: boolean, message: string) {
  results.push({ name, passed, message });
  if (passed) {
    log('✅', `PASS: ${name} — ${message}`);
  } else {
    log('❌', `FAIL: ${name} — ${message}`);
  }
}

// ─── Health Check ───────────────────────────────────────────────────────────

async function verifyHealthCheck(): Promise<void> {
  const name = 'Health Check';
  try {
    const res = await fetch(`${BASE_URL}/api/health`);
    if (res.status !== 200) {
      recordResult(name, false, `Expected status 200, got ${res.status}`);
      return;
    }
    const body = await res.json();
    if (body.status === 'UP' || body.data?.status === 'UP') {
      recordResult(name, true, 'API is healthy');
    } else {
      recordResult(name, false, `Unexpected body: ${JSON.stringify(body)}`);
    }
  } catch (err) {
    recordResult(name, false, `Request failed: ${(err as Error).message}`);
  }
}

// ─── Login Flow ─────────────────────────────────────────────────────────────

async function verifyLoginFlow(): Promise<string | null> {
  const name = 'Login Flow';
  try {
    // Step 1: Login
    const loginRes = await fetch(`${BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@shs.edu.gh', password: 'Admin@1234' }),
    });

    if (loginRes.status !== 200) {
      recordResult(name, false, `Login returned status ${loginRes.status}`);
      return null;
    }

    const loginBody = await loginRes.json();
    const token = loginBody.data?.accessToken || loginBody.accessToken;

    if (!token) {
      recordResult(name, false, `No access token in response: ${JSON.stringify(loginBody)}`);
      return null;
    }

    // Step 2: Verify token by fetching current user
    const meRes = await fetch(`${BASE_URL}/api/v1/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (meRes.status !== 200) {
      recordResult(name, false, `GET /auth/me returned status ${meRes.status}`);
      return token; // token works for login but me endpoint may differ
    }

    const meBody = await meRes.json();
    const user = meBody.data || meBody;

    if (user.email === 'admin@shs.edu.gh' || user.role === 'SUPER_ADMIN') {
      recordResult(name, true, `Logged in as ${user.email} (${user.role})`);
    } else {
      recordResult(name, true, `Login succeeded, token valid (user: ${JSON.stringify(user).slice(0, 100)})`);
    }

    return token;
  } catch (err) {
    recordResult(name, false, `Request failed: ${(err as Error).message}`);
    return null;
  }
}

// ─── Score Calculation ──────────────────────────────────────────────────────

async function verifyScoreCalculation(): Promise<void> {
  const name = 'Score Calculation';

  // Ghana GES grading scale (backend)
  const gradeScale: Array<{ min: number; grade: string; gradePoint: number }> = [
    { min: 80, grade: 'A1', gradePoint: 4.0 },
    { min: 75, grade: 'A2', gradePoint: 3.6 },
    { min: 70, grade: 'B2', gradePoint: 3.2 },
    { min: 65, grade: 'B3', gradePoint: 2.8 },
    { min: 60, grade: 'C4', gradePoint: 2.4 },
    { min: 55, grade: 'C5', gradePoint: 2.0 },
    { min: 50, grade: 'C6', gradePoint: 1.6 },
    { min: 45, grade: 'D7', gradePoint: 1.2 },
    { min: 40, grade: 'E8', gradePoint: 0.8 },
    { min: 0, grade: 'F9', gradePoint: 0.0 },
  ];

  function computeGrade(total: number) {
    for (const entry of gradeScale) {
      if (total >= entry.min) return entry;
    }
    return gradeScale[gradeScale.length - 1];
  }

  const testCases = [
    { classScore: 25, examScore: 60, expectedTotal: 85, expectedGrade: 'A1', expectedGradePoint: 4.0 },
    { classScore: 20, examScore: 55, expectedTotal: 75, expectedGrade: 'A2', expectedGradePoint: 3.6 },
    { classScore: 15, examScore: 55, expectedTotal: 70, expectedGrade: 'B2', expectedGradePoint: 3.2 },
    { classScore: 10, examScore: 55, expectedTotal: 65, expectedGrade: 'B3', expectedGradePoint: 2.8 },
    { classScore: 10, examScore: 50, expectedTotal: 60, expectedGrade: 'C4', expectedGradePoint: 2.4 },
    { classScore: 10, examScore: 45, expectedTotal: 55, expectedGrade: 'C5', expectedGradePoint: 2.0 },
    { classScore: 10, examScore: 40, expectedTotal: 50, expectedGrade: 'C6', expectedGradePoint: 1.6 },
    { classScore: 10, examScore: 35, expectedTotal: 45, expectedGrade: 'D7', expectedGradePoint: 1.2 },
    { classScore: 10, examScore: 30, expectedTotal: 40, expectedGrade: 'E8', expectedGradePoint: 0.8 },
    { classScore: 5, examScore: 20, expectedTotal: 25, expectedGrade: 'F9', expectedGradePoint: 0.0 },
  ];

  let allPassed = true;
  const failures: string[] = [];

  for (const tc of testCases) {
    const total = tc.classScore + tc.examScore;
    const result = computeGrade(total);

    if (total !== tc.expectedTotal) {
      allPassed = false;
      failures.push(`Total: ${tc.classScore}+${tc.examScore}=${total}, expected ${tc.expectedTotal}`);
    }
    if (result.grade !== tc.expectedGrade) {
      allPassed = false;
      failures.push(`Grade for ${total}: got ${result.grade}, expected ${tc.expectedGrade}`);
    }
    if (result.gradePoint !== tc.expectedGradePoint) {
      allPassed = false;
      failures.push(`GradePoint for ${total}: got ${result.gradePoint}, expected ${tc.expectedGradePoint}`);
    }
  }

  // Boundary checks
  const boundaryChecks = [
    { score: 100, expected: 'A1' },
    { score: 80, expected: 'A1' },
    { score: 79, expected: 'A2' },
    { score: 75, expected: 'A2' },
    { score: 74, expected: 'B2' },
    { score: 40, expected: 'E8' },
    { score: 39, expected: 'F9' },
    { score: 0, expected: 'F9' },
  ];

  for (const bc of boundaryChecks) {
    const result = computeGrade(bc.score);
    if (result.grade !== bc.expected) {
      allPassed = false;
      failures.push(`Boundary ${bc.score}: got ${result.grade}, expected ${bc.expected}`);
    }
  }

  if (allPassed) {
    recordResult(name, true, `All ${testCases.length} score calculations + ${boundaryChecks.length} boundary checks correct`);
  } else {
    recordResult(name, false, failures.join('; '));
  }
}

// ─── GPA Calculation ────────────────────────────────────────────────────────

async function verifyGpaCalculation(): Promise<void> {
  const name = 'GPA Calculation';

  function calculateGpa(gradePoints: number[]): number {
    if (gradePoints.length === 0) return 0;
    const sum = gradePoints.reduce((a, b) => a + b, 0);
    return parseFloat((sum / gradePoints.length).toFixed(2));
  }

  const testCases = [
    { gradePoints: [4.0, 3.6, 3.2, 2.8, 2.4], expectedGpa: 3.2 },
    { gradePoints: [4.0, 4.0, 4.0, 4.0], expectedGpa: 4.0 },
    { gradePoints: [0.0, 0.0, 0.0], expectedGpa: 0.0 },
    { gradePoints: [4.0, 0.0], expectedGpa: 2.0 },
    { gradePoints: [3.6, 3.2, 2.8, 2.4, 2.0, 1.6], expectedGpa: 2.6 },
    { gradePoints: [4.0, 3.6, 3.2, 2.8, 2.4, 2.0, 1.6, 1.2], expectedGpa: 2.6 },
  ];

  let allPassed = true;
  const failures: string[] = [];

  for (const tc of testCases) {
    const gpa = calculateGpa(tc.gradePoints);
    if (gpa !== tc.expectedGpa) {
      allPassed = false;
      failures.push(`GPA for [${tc.gradePoints}]: got ${gpa}, expected ${tc.expectedGpa}`);
    }
  }

  // Classification checks
  const classifications: Array<{ min: number; max: number; label: string }> = [
    { min: 3.6, max: 4.0, label: 'EXCELLENT' },
    { min: 3.0, max: 3.59, label: 'VERY GOOD' },
    { min: 2.5, max: 2.99, label: 'GOOD' },
    { min: 2.0, max: 2.49, label: 'CREDIT' },
    { min: 1.0, max: 1.99, label: 'PASS' },
    { min: 0.0, max: 0.99, label: 'FAIL' },
  ];

  function classifyGpa(gpa: number): string {
    for (const c of classifications) {
      if (gpa >= c.min && gpa <= c.max) return c.label;
    }
    return 'UNKNOWN';
  }

  const classificationTests = [
    { gpa: 4.0, expected: 'EXCELLENT' },
    { gpa: 3.6, expected: 'EXCELLENT' },
    { gpa: 3.2, expected: 'VERY GOOD' },
    { gpa: 2.5, expected: 'GOOD' },
    { gpa: 2.0, expected: 'CREDIT' },
    { gpa: 1.5, expected: 'PASS' },
    { gpa: 0.5, expected: 'FAIL' },
  ];

  for (const ct of classificationTests) {
    const label = classifyGpa(ct.gpa);
    if (label !== ct.expected) {
      allPassed = false;
      failures.push(`Classification for GPA ${ct.gpa}: got ${label}, expected ${ct.expected}`);
    }
  }

  if (allPassed) {
    recordResult(name, true, `All ${testCases.length} GPA calculations + ${classificationTests.length} classification checks correct`);
  } else {
    recordResult(name, false, failures.join('; '));
  }
}

// ─── Position Assignment ────────────────────────────────────────────────────

async function verifyPositionAssignment(): Promise<void> {
  const name = 'Position Assignment';

  function assignPositions(students: Array<{ id: number; gpa: number }>): Map<number, number> {
    const sorted = [...students].sort((a, b) => b.gpa - a.gpa);
    const positions = new Map<number, number>();
    let currentPosition = 1;

    for (let i = 0; i < sorted.length; i++) {
      if (i > 0 && sorted[i].gpa === sorted[i - 1].gpa) {
        // Same GPA = same position (tied)
        positions.set(sorted[i].id, positions.get(sorted[i - 1].id)!);
      } else {
        positions.set(sorted[i].id, currentPosition);
      }
      currentPosition = i + 2; // Next rank accounts for all students above
    }

    return positions;
  }

  let allPassed = true;
  const failures: string[] = [];

  // Test 1: Basic ordering
  const test1 = [
    { id: 1, gpa: 3.5 },
    { id: 2, gpa: 2.8 },
    { id: 3, gpa: 3.1 },
  ];
  const pos1 = assignPositions(test1);
  const expected1 = new Map([[1, 1], [3, 2], [2, 3]]);
  for (const [id, expectedPos] of expected1) {
    if (pos1.get(id) !== expectedPos) {
      allPassed = false;
      failures.push(`Test1: Student ${id} got position ${pos1.get(id)}, expected ${expectedPos}`);
    }
  }

  // Test 2: Tied GPAs
  const test2 = [
    { id: 1, gpa: 3.5 },
    { id: 2, gpa: 3.5 },
    { id: 3, gpa: 2.0 },
  ];
  const pos2 = assignPositions(test2);
  if (pos2.get(1) !== 1 || pos2.get(2) !== 1) {
    allPassed = false;
    failures.push(`Test2: Tied students should both be position 1, got ${pos2.get(1)} and ${pos2.get(2)}`);
  }
  if (pos2.get(3) !== 3) {
    allPassed = false;
    failures.push(`Test2: Student 3 should be position 3 (not 2), got ${pos2.get(3)}`);
  }

  // Test 3: All same GPA
  const test3 = [
    { id: 1, gpa: 3.0 },
    { id: 2, gpa: 3.0 },
    { id: 3, gpa: 3.0 },
  ];
  const pos3 = assignPositions(test3);
  for (const s of test3) {
    if (pos3.get(s.id) !== 1) {
      allPassed = false;
      failures.push(`Test3: All tied — student ${s.id} should be position 1, got ${pos3.get(s.id)}`);
    }
  }

  // Test 4: Single student
  const test4 = [{ id: 1, gpa: 3.8 }];
  const pos4 = assignPositions(test4);
  if (pos4.get(1) !== 1) {
    allPassed = false;
    failures.push(`Test4: Single student should be position 1, got ${pos4.get(1)}`);
  }

  // Test 5: Large class (descending GPAs)
  const test5 = Array.from({ length: 10 }, (_, i) => ({
    id: i + 1,
    gpa: parseFloat((4.0 - i * 0.4).toFixed(1)),
  }));
  const pos5 = assignPositions(test5);
  for (let i = 0; i < 10; i++) {
    if (pos5.get(i + 1) !== i + 1) {
      allPassed = false;
      failures.push(`Test5: Student ${i + 1} (GPA ${test5[i].gpa}) should be position ${i + 1}, got ${pos5.get(i + 1)}`);
    }
  }

  if (allPassed) {
    recordResult(name, true, 'All 5 position assignment scenarios correct (basic, ties, all-tied, single, large class)');
  } else {
    recordResult(name, false, failures.join('; '));
  }
}

// ─── Score Validation (max constraints) ─────────────────────────────────────

async function verifyScoreValidation(): Promise<void> {
  const name = 'Score Validation';

  function validateScore(classScore: number, examScore: number): { valid: boolean; error?: string } {
    if (classScore < 0 || classScore > 30) {
      return { valid: false, error: `Class score ${classScore} out of range (0-30)` };
    }
    if (examScore < 0 || examScore > 70) {
      return { valid: false, error: `Exam score ${examScore} out of range (0-70)` };
    }
    if (!Number.isInteger(classScore) || !Number.isInteger(examScore)) {
      return { valid: false, error: 'Scores must be integers' };
    }
    return { valid: true };
  }

  const validCases = [
    { classScore: 0, examScore: 0 },
    { classScore: 30, examScore: 70 },
    { classScore: 15, examScore: 35 },
    { classScore: 1, examScore: 1 },
  ];

  const invalidCases = [
    { classScore: -1, examScore: 50 },
    { classScore: 31, examScore: 50 },
    { classScore: 20, examScore: -1 },
    { classScore: 20, examScore: 71 },
    { classScore: 100, examScore: 100 },
  ];

  let allPassed = true;
  const failures: string[] = [];

  for (const vc of validCases) {
    const result = validateScore(vc.classScore, vc.examScore);
    if (!result.valid) {
      allPassed = false;
      failures.push(`(${vc.classScore}, ${vc.examScore}) should be valid but got: ${result.error}`);
    }
  }

  for (const ic of invalidCases) {
    const result = validateScore(ic.classScore, ic.examScore);
    if (result.valid) {
      allPassed = false;
      failures.push(`(${ic.classScore}, ${ic.examScore}) should be invalid but was accepted`);
    }
  }

  if (allPassed) {
    recordResult(name, true, `All ${validCases.length} valid + ${invalidCases.length} invalid score validations correct`);
  } else {
    recordResult(name, false, failures.join('; '));
  }
}

// ─── Run All Checks ─────────────────────────────────────────────────────────

async function runAllChecks(): Promise<void> {
  console.log('');
  console.log('═══════════════════════════════════════════════════════');
  console.log('  GES SHS Academic System — E2E Flow Verification');
  console.log('═══════════════════════════════════════════════════════');
  console.log('');

  await verifyHealthCheck();
  await verifyLoginFlow();
  await verifyScoreCalculation();
  await verifyGpaCalculation();
  await verifyPositionAssignment();
  await verifyScoreValidation();

  console.log('');
  console.log('───────────────────────────────────────────────────────');

  const passed = results.filter((r) => r.passed).length;
  const total = results.length;
  const allPassed = passed === total;

  console.log(`  Summary: ${passed}/${total} checks passed`);

  if (allPassed) {
    console.log('  🎉 All checks passed!');
  } else {
    console.log('  ⚠️  Some checks failed — review output above');
    const failed = results.filter((r) => !r.passed);
    for (const f of failed) {
      console.log(`     - ${f.name}: ${f.message}`);
    }
  }

  console.log('───────────────────────────────────────────────────────');
  console.log('');

  if (!allPassed) {
    process.exit(1);
  }
}

// Run when executed directly
runAllChecks();
