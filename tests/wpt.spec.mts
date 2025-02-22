import { expect } from '@wdio/globals';
import { readFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

interface TestSuite {
  js: string[];
  iframe: [string, string][];
}

interface WPTTestResult {
  status: number;
  message: string;
  stack: string | null;
  name: string;
}

interface WPTTestResults {
  tests: WPTTestResult[];
  status: {
    status: number;
    message: string | null;
    stack: string | null;
  };
  message: string | null;
}

const TEST_FOLDERS: string[] = ['dom/observable/tentative'];

// Tests that check DOM implementation details instead of user-facing behavior
const TEST_BLOCKLIST = [
  // Add any tests you want to block here
];

const TEST_FILTERS = TEST_BLOCKLIST.length > 0 ? [new RegExp(TEST_BLOCKLIST.join('|'))] : [];

const SUBTEST_FILTERS: RegExp[] = [
  // Add any subtest filters here
];

console.log('TEST_FOLDERS', TEST_FOLDERS);
async function getTests(manifestPath: string): Promise<TestSuite> {
  const manifestBuffer = await readFile(manifestPath);
  const manifest = JSON.parse(manifestBuffer.toString());
  console.log('Manifest:', manifest);
  const js: string[] = [];
  const iframe: [string, string][] = [];

  for (const folder_path of TEST_FOLDERS) {
    console.log('Folder path:', folder_path);
    function getValue(obj: any, path: string): any {
      const paths = path.split('/');
      let current = obj;
      for (const segment of paths) {
        if (current && typeof current === 'object' && segment in current) {
          current = current[segment];
        } else {
          return undefined;
        }
      }
      return current;
    }

    const htmlTests = getValue(manifest.items.testharness, folder_path);

    if (htmlTests) {
    js.push(
        ...Object.keys(htmlTests)
          .filter((name) => !TEST_FILTERS.some((filter) => filter.test(name)))
          .filter(name => name.includes('.html'))
          .map((name) => `/${folder_path}/${name}`),
      );
    }
  }
  console.log('JS:', js);
  return { js, iframe };
}

let testSuite: TestSuite;
const manifestPath = process.env.WPT_MANIFEST ?? path.join(__dirname, '../wpt-manifest.json');
console.log('Manifest path:', manifestPath);
testSuite = await getTests(manifestPath);
console.log('Test suite loaded:', testSuite);

// await browser.url(testSuite.js[0]);

describe('Web Platform Tests', () => {
  console.log('testSuite', testSuite);
  
  for (const testPath of testSuite?.js ?? []) {
    console.log('testPath', testPath);
    it(`should run test: ${testPath}`, async () => {
      try {
        // Navigate to the test page
        console.log(`Navigating to ${testPath}`);
        await browser.url(testPath);
        
        // Log the current URL to verify navigation
        const currentUrl = await browser.getUrl();
        console.log('Current URL:', currentUrl);
        
        // Wait for test completion by checking for the test-results div
        console.log('Waiting for results element...');
        const resultsElem = await $('#results');
        await resultsElem.waitForExist({ timeout: 30000 });
        
        console.log('Results element found, getting test results...');
        // Get all test results
        const testResults = await browser.execute(() => {
          // @ts-ignore - tests is added by WPT's testharness.js
          return window.tests?.map(test => ({
            name: test.name,
            status: test.status,
            message: test.message,
            stack: test.stack
          })) ?? [];
        });
        
        console.log('Raw test results:', testResults);

        // Process results
        let passed = 0;
        let failed = 0;
        let failureMessages: string[] = [];

        for (const result of testResults) {
          if (result.status === 0) { // PASS in WPT
            passed++;
          } else if (result.status === 1 || result.status === 2 || result.status === 3) { // FAIL, TIMEOUT, or NOTRUN
            failed++;
            failureMessages.push(`${result.name}: ${result.message}`);
          }
        }

        // Log results
        console.log(`Test ${testPath} completed:`, { passed, failed });
        if (failureMessages.length > 0) {
          console.log('Failures:', failureMessages);
        }
        
        // Assert no failures
        expect(failed).toBe(0, `Test had ${failed} failures:\n${failureMessages.join('\n')}`);
        expect(passed).toBeGreaterThan(0, 'Test should have at least one passing assertion');
      } catch (error) {
        console.error(`Failed to run test ${testPath}:`, error);
        throw error;
      }
    });
  }
}); 
