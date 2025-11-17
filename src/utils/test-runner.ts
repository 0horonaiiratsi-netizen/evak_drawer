/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

// Simple test runner to avoid external dependencies for this project.

let currentSuite = '';
let testsRun = 0;
let testsPassed = 0;

const EPSILON = 1e-6; // Small tolerance for float comparisons

export function suite(name: string, fn: () => void) {
    currentSuite = name;
    console.log(`%c[SUITE] ${name}`, 'color: #f0f0f0; font-weight: bold;');
    fn();
    currentSuite = '';
}

export function test(name: string, fn: () => void) {
    testsRun++;
    try {
        fn();
        console.log(`%c  ✓ PASS: ${name}`, 'color: #4CAF50;');
        testsPassed++;
    } catch (e: any) {
        console.error(`%c  ✗ FAIL: ${name}`, 'color: #F44336; font-weight: bold;');
        console.error(e.message);
    }
}

function fail(message: string) {
    throw new Error(message);
}

export function assert(condition: boolean, message: string) {
    if (!condition) {
        fail(message);
    }
}

export function assertEqual<T>(actual: T, expected: T, message: string) {
    // Simple deep equal for objects/arrays for this project's needs
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        fail(`${message}\nExpected: ${JSON.stringify(expected)}\nActual:   ${JSON.stringify(actual)}`);
    }
}

export function assertAlmostEqual(actual: number, expected: number, message: string, tolerance: number = EPSILON) {
    if (Math.abs(actual - expected) > tolerance) {
        fail(`${message}\nExpected: ${expected}\nActual:   ${actual}`);
    }
}

export function printTestSummary() {
    console.log('--- Test Summary ---');
    if (testsPassed === testsRun) {
        console.log(`%cAll ${testsRun} tests passed!`, 'color: #4CAF50; font-weight: bold;');
    } else {
        console.error(`%c${testsRun - testsPassed} of ${testsRun} tests failed.`, 'color: #F44336; font-weight: bold;');
    }
}
