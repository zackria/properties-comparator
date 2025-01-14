#!/usr/bin/env node

const fs = require('fs');

/**
 * Parses a properties file into an object.
 * @param {string} filePath - The path to the properties file.
 * @returns {Object} - An object containing key-value pairs.
 */
function parsePropertiesFile(filePath) {
    return fs.readFileSync(filePath, 'utf-8')
        .split(/\r?\n/)
        .filter(line => line.trim() && !line.startsWith('#'))
        .reduce((acc, line) => {
            const [key, value] = line.split('=');
            if (key && value !== undefined) {
                acc[key.trim()] = value.trim();
            }
            return acc;
        }, {});
}

/**
 * Compares properties across multiple files.
 * @param {string[]} filePaths - Array of file paths.
 */
function compareProperties(filePaths) {
    const propertiesList = filePaths.map(parsePropertiesFile);
    const allKeys = new Set(propertiesList.flatMap(Object.keys));

    console.log('Comparing properties across files:\n');

    allKeys.forEach(key => {
        const values = propertiesList.map(props => props[key]?.replace(/\s+/g, '') || 'N/A');
        const allMatch = values.every(value => value === values[0]);

        if (allMatch) {
            console.log(`Key: ${key} - Values match across all files.`);
        } else {
            console.log(`Key: ${key} - Mismatched values:`);
            values.forEach((value, index) => {
                console.log(`  File ${index + 1}: ${value}`);
            });
        }
    });
}

/**
 * CLI entry point for comparing properties files.
 */
function run() {
    const filePaths = process.argv.slice(2);

    if (filePaths.length === 0) {
        console.error('Please provide the paths to the properties files as command-line arguments.');
        process.exit(1);
    }

    if (filePaths.every(fs.existsSync)) {
        compareProperties(filePaths);
    } else {
        console.error('One or more properties files are missing. Ensure all specified properties files exist.');
    }
}

module.exports = {
    parsePropertiesFile,
    compareProperties,
    run,
};

// If the script is executed directly, run the CLI
if (require.main === module) {
    run();
}
