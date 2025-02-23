import { browser } from '@wdio/globals';
import { readFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

interface TestSuite {
  js: string[];
  iframe: [string, string][];
}

export async function loadWPTTests(): Promise<string[]> {
  // First navigate to the WPT root to ensure we have access
  await browser.url('/');
  console.log('Navigated to WPT root');

  const manifestPath = process.env.WPT_MANIFEST ?? path.join(__dirname, '../wpt-manifest.json');
  console.log('Loading manifest from:', manifestPath);
  
  const manifestBuffer = await readFile(manifestPath);
  const manifest = JSON.parse(manifestBuffer.toString());

  const TEST_FOLDERS = ['dom/observable/tentative'];
  const js: string[] = [];

  for (const folder_path of TEST_FOLDERS) {
    console.log('Processing folder:', folder_path);
    
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
    console.log('Found HTML tests:', htmlTests ? Object.keys(htmlTests).length : 0);

    if (htmlTests) {
      js.push(
        ...Object.keys(htmlTests)
          .filter(name => name.includes('.html'))
          .map(name => `/${folder_path}/${name}`)
      );
    }
  }

  console.log('Total tests found:', js.length);
  return js;
}

  export async function runWPTTest(testPath: string): Promise<{
  passed: number;
  failed: number;
  failureMessages: string[];
}> {
  console.log(`Running test: ${testPath}`);
  
  // Navigate to the test page
  await browser.url(testPath);
  console.log('Navigated to test page');

  // Wait for test completion by c`hecking for the results div
  const resultsElem = await $('#results');
  await resultsElem.waitForExist({ timeout: 30000 });
  console.log('Test results found');

  // Get test results
  const testResults = await browser.execute(() => {
    // @ts-ignore - tests is added by WPT's testharness.js
    return window.tests?.map(test => ({
      name: test.name,
      status: test.status,
      message: test.message,
      stack: test.stack
    })) ?? [];
  });

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

  return { passed, failed, failureMessages };
} 
