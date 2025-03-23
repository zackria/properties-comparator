#!/usr/bin/env node

import { program } from 'commander';
import { compareFiles } from './index.js';
import { readFileSync } from 'fs';
import path from 'path';

// Get version from package.json
let version = '1.0.0';

try {
  const packageJson = JSON.parse(readFileSync('./package.json', 'utf8'));
  version = packageJson.version;
} catch (err) {
  // Use default version if package.json can't be read
}

// Check if no arguments were provided
if (process.argv.length <= 2) {
  console.log(`properties-comparator v${version}`);
  console.log('Usage: properties-comparator [options] <file1> <file2> [file3...]');
  process.exit(0);
}

program
  .version(version)
  .description('Compare properties between multiple files')
  .option('-f, --format <format>', 'Output format: console, html, or markdown (default: console)')
  .option('-o, --output <path>', 'Output file path for results')
  .option('-v, --verbose', 'Show verbose output')
  .arguments('<files...>')
  .usage('[options] <file1> <file2> [file3...]')
  .action((files, options) => {
    if (files.length < 2) {
      console.error('Error: At least two files are required for comparison');
      program.help();
      process.exit(1);
    }

    try {
      // Resolve all file paths
      const resolvedPaths = files.map(file => path.resolve(file));
      
      // Prepare options for compareFiles
      const comparisonOptions = {
        format: options.format || 'console',
        outputFile: options.output,
        verbose: options.verbose // Pass verbose option to compareFiles
      };

      // Run the comparison
      compareFiles(resolvedPaths, comparisonOptions);
      
    } catch (error) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

program.parse(process.argv);
