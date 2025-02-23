/// <reference types="@wdio/globals/types" />
import { expect } from '@wdio/globals';
import { readFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'node:fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outputPath = path.join(__dirname, 'test-results.html');

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

describe('Web Platform Tests', async () => {
  console.log('testSuite', testSuite);
    
  for (const testPath of testSuite?.js ?? []) {
    console.log('testPath', testPath);
    it(`${testPath}`, async () => {
      // console.log('result', result);

      await browser.url(testSuite.js[0]);

      console.log('Waiting for results element...');
      
      const resultsElem = await $('#results');
      await resultsElem.waitForExist({ timeout: 30000 });

      const summaryElem = await $('#summary');
      const summaryText = await summaryElem.getText();
      console.log('Summary text:', summaryText);

      expect(summaryText.toLowerCase()).toContain('harness status: ok');
      expect(summaryText.toLowerCase()).not.toContain('fail');
      expect(summaryText.toLowerCase()).not.toContain('timeout');
      expect(summaryText.toLowerCase()).not.toContain('not run');
      expect(summaryText.toLowerCase()).toContain('pass');

      fs.writeFileSync(outputPath, htmlContent);
      
      console.log('HTML content written to:', outputPath);

      console.log('Results element found, getting test results...');

      const promises = [
        (async () => {
          const result = await resultsElem.$('.pass');
          console.log('Pass query complete');
          return result;
        })(),
        (async () => {
          const result = await resultsElem.$('.fail');
          console.log('Fail query complete');
          return result;
        })(),
        (async () => {
          const result = await resultsElem.$('.timeout');
          console.log('Timeout query complete');
          return result;
        })(),
        (async () => {
          const result = await resultsElem.$('.notrun');
          console.log('Not run query complete');
          return result;
        })()
      ];

      const [passingResults, failingResults, timeoutResults, notrunResults] = await Promise.all(promises);

      console.log('Passing results:', passingResults);
      console.log('Failing results:', failingResults);
      console.log('Timeout results:', timeoutResults);
      console.log('Not run results:', notrunResults);
      
      // Get all test results
      // const testResults = await browser.execute(() => {
      //   // @ts-ignore - tests is added by WPT's testharness.js
      //   return window.tests?.map(test => ({
      //     name: test.name,
      //     status: test.status,
      //     message: test.message,
      //     stack: test.stack
      //   })) ?? [];
    });

    // console.log('Raw test results:', testResults);
        
    //   console.log('Raw test results:', testResults);

    //   // Process results
    //   let passed = 0;
    //   let failed = 0;
    //   let failureMessages: string[] = [];

    //   for (const result of testResults) {
    //     if (result.status === 0) { // PASS in WPT
    //       passed++;
    //     } else if (result.status === 1 || result.status === 2 || result.status === 3) { // FAIL, TIMEOUT, or NOTRUN
    //       failed++;
    //       failureMessages.push(`${result.name}: ${result.message}`);
    //     }
    //   }

    //   // Log results
    //   console.log(`Test ${testPath} completed:`, { passed, failed });
    //   if (failureMessages.length > 0) {
    //     console.log('Failures:', failureMessages);
    //   }
        
    //   // Assert no failures
    //   expect(failed).toBe(0, `Test had ${failed} failures:\n${failureMessages.join('\n')}`);
    //   expect(passed).toBeGreaterThan(0, 'Test should have at least one passing assertion');
    // } catch (error) {
    //   console.error(`Failed to run test ${testPath}:`, error);
    //   throw error;
    // }
  }
}); 
