import dotenv from 'dotenv';
import type { Options } from '@wdio/types';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { browser } from '@wdio/globals';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Try to load .env.local first
const envLocalPath = path.join(__dirname, '.env.local');
const envPath = path.join(__dirname, '.env');

console.log('Looking for env files:');
console.log('- .env.local:', fs.existsSync(envLocalPath));
console.log('- .env:', fs.existsSync(envPath));

// Load .env first as base
dotenv.config({ path: envPath });

// Then override with .env.local if it exists
if (fs.existsSync(envLocalPath)) {
    const envLocalResult = dotenv.config({ path: envLocalPath, override: true });
    if (envLocalResult.error) {
        console.error('Error loading .env.local:', envLocalResult.error);
    }
}

const BROWSERSTACK_USERNAME = process.env.BROWSERSTACK_USERNAME;
const BROWSERSTACK_ACCESS_KEY = process.env.BROWSERSTACK_ACCESS_KEY;

if (!BROWSERSTACK_USERNAME || !BROWSERSTACK_ACCESS_KEY || 
    BROWSERSTACK_USERNAME === 'placeholder' || 
    BROWSERSTACK_ACCESS_KEY === 'placeholder') {
    throw new Error('Valid BROWSERSTACK_USERNAME and BROWSERSTACK_ACCESS_KEY must be set in .env.local file');
}

export const config: Options.Testrunner = {
    runner: 'local',
    autoCompileOpts: {
        autoCompile: true,
        tsNodeOpts: {
            project: './tsconfig.json',
            transpileOnly: true
        }
    },
    specs: [
        './tests/wpt.spec.ts'
    ],
    exclude: [],
    maxInstances: 1, // Run tests sequentially for better debugging
    capabilities: [{
        browserName: 'chrome',
        'bstack:options': {
            os: 'Windows',
            osVersion: '11',
            browserVersion: 'latest',
            buildName: 'RxJS WPT Tests',
            projectName: 'RxJS',
            local: true,
            debug: true,
            networkLogs: true,
            consoleLogs: 'verbose',
            seleniumVersion: '4.0.0'
        }
    }],
    logLevel: 'info',
    bail: 0,
    baseUrl: 'https://web-platform.test:9000',
    waitforTimeout: 60000,
    connectionRetryTimeout: 120000,
    connectionRetryCount: 3,
    services: [
        ['browserstack', {
            browserstackLocal: true,
            opts: {
                forceLocal: true,
                localIdentifier: `wpt_${Date.now()}`,
                verbose: true,
                force: true,
                onlyAutomate: true,
                // Map localhost:9000 to web-platform.test:9000
                hosts: [{
                    name: 'web-platform.test',
                    port: 9000,
                    sslFlag: 1 // Enable SSL
                }],
                // Force all traffic through local testing
                forceProxy: true,
                // Use localhost as the source
                localProxyHost: 'localhost',
                localProxyPort: 9000,
                // Additional options for better local testing
                forcedStop: true,
                forceStart: true,
                binarypath: process.env.BROWSERSTACK_BINARY_PATH, // Optional: if you have a specific binary path
                // SSL Settings
                ssl: true
            }
        }]
    ],
    user: BROWSERSTACK_USERNAME,
    key: BROWSERSTACK_ACCESS_KEY,
    framework: 'mocha',
    reporters: ['spec'],
    mochaOpts: {
        ui: 'bdd',
        timeout: 120000
    },

    // Hooks
    before: async function (capabilities, specs) {
        // Add any setup needed before tests run
        console.log('Starting WPT test run...');
        // Log the environment for debugging
        console.log('Environment:', {
            baseUrl: this.baseUrl,
            capabilities: capabilities
        });
    },
    afterTest: async function(test, context, { error, result, duration, passed, retries }) {
        if (!passed) {
            // Log additional info for failed tests
            console.log('Test failed:', test.title);
            console.log('Error:', error);
            
            try {
                // Log the page source and URL for debugging
                const currentUrl = await browser.getUrl();
                const debugInfo = {
                    url: currentUrl,
                    timestamp: new Date().toISOString(),
                    error: error?.message
                };
                const debugPath = path.join(__dirname, 'test-results', `${test.title.replace(/\s+/g, '_')}_debug.json`);
                fs.mkdirSync(path.dirname(debugPath), { recursive: true });
                fs.writeFileSync(debugPath, JSON.stringify(debugInfo, null, 2));
            } catch (e) {
                console.error('Failed to save debug info:', e);
            }
        }
    }
}; 
