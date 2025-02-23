import type { Options } from '@wdio/types';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

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

// Ensure we have the required env vars
const BROWSERSTACK_USERNAME = process.env.BROWSERSTACK_USERNAME;
const BROWSERSTACK_ACCESS_KEY = process.env.BROWSERSTACK_ACCESS_KEY;

console.log('Current env values:');
console.log('BROWSERSTACK_USERNAME:', BROWSERSTACK_USERNAME);
console.log('BROWSERSTACK_ACCESS_KEY:', BROWSERSTACK_ACCESS_KEY?.slice(0, 4) + '...');

if (!BROWSERSTACK_USERNAME || !BROWSERSTACK_ACCESS_KEY || 
    BROWSERSTACK_USERNAME === 'placeholder' || 
    BROWSERSTACK_ACCESS_KEY === 'placeholder') {
    throw new Error('Valid BROWSERSTACK_USERNAME and BROWSERSTACK_ACCESS_KEY must be set in .env.local file');
}

export const config: Options.Testrunner = {
    specs: [
        './tests/basic.spec.ts'
    ],
    maxInstances: 1,
    capabilities: [{
        browserName: 'chrome',
        'bstack:options': {
            os: 'Windows',
            osVersion: '11',
            buildName: 'Local Test Build',
            local: true,
            networkLogs: true,
            debug: true
        }
    }],
    logLevel: 'info',
    bail: 0,
    baseUrl: 'http://localhost:8080',
    waitforTimeout: 10000,
    connectionRetryTimeout: 120000,
    connectionRetryCount: 3,
    services: [
        ['browserstack', {
            browserstackLocal: true
        }]
    ],
    framework: 'mocha',
    reporters: ['spec'],
    mochaOpts: {
        ui: 'bdd',
        timeout: 60000
    },
    user: BROWSERSTACK_USERNAME,
    key: BROWSERSTACK_ACCESS_KEY,

    // Typescript specific settings
    autoCompileOpts: {
        tsNodeOpts: {
            project: './tests/tsconfig.json'
        }
    }
} 
