#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");

/**
 * Parses a .properties file into an object.
 * Handles any file read/parse errors gracefully.
 * @param {string} filePath - The path to the properties file.
 * @returns {Object} - Key-value pairs, or {} on error.
 */
function parsePropertiesFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const lines = content.split(/\r?\n/);
    const result = {};

    for (let line of lines) {
      let trimmedLine = line.trim();

      // 1) Skip empty lines or lines that *start* with '#'
      if (!trimmedLine || trimmedLine.startsWith("#")) {
        continue;
      }

      // 2) Remove inline comment: anything after the first '#'
      const hashIndex = trimmedLine.indexOf("#");
      if (hashIndex !== -1) {
        trimmedLine = trimmedLine.slice(0, hashIndex).trim();
      }

      // 3) Split on the *first* '=' only
      const eqIndex = trimmedLine.indexOf("=");
      if (eqIndex === -1) {
        // No '=' => Not a valid key-value line
        continue;
      }

      const key = trimmedLine.slice(0, eqIndex).trim();
      const value = trimmedLine.slice(eqIndex + 1).trim();

      if (key) {
        result[key] = value;
      }
    }

    return result;
  } catch (err) {
    console.error(
      `Error reading/parsing .properties file (${filePath}):`,
      err.message
    );
    return {};
  }
}

/**
 * Flattens a nested object into a single-level object using dot-notation for nested keys.
 * @param {Object} obj - The object to flatten.
 * @param {string} [parentKey=''] - The current parent key (used in recursion).
 * @param {Object} [res={}] - The accumulator object.
 * @returns {Object} - A flattened key-value map.
 */
function flattenObject(obj, parentKey = "", res = {}) {
  for (const [key, value] of Object.entries(obj || {})) {
    const newKey = parentKey ? `${parentKey}.${key}` : key;
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      flattenObject(value, newKey, res);
    } else {
      // Ensure all values are strings for consistent comparison
      res[newKey] = String(value);
    }
  }
  return res;
}

/**
 * Parses a .yml or .yaml file into a flat key-value map.
 * Handles any file read/parse errors gracefully.
 * @param {string} filePath - The path to the YAML file.
 * @returns {Object} - A flattened key-value map, or {} on error.
 */
function parseYamlFile(filePath) {
  try {
    const fileContents = fs.readFileSync(filePath, "utf-8");
    const data = yaml.load(fileContents);
    return flattenObject(data);
  } catch (err) {
    console.error(
      `Error reading/parsing YAML file (${filePath}):`,
      err.message
    );
    return {};
  }
}

/**
 * Detects file extension and parses the file content into an object.
 * Currently supports .properties, .yaml, and .yml.
 * If extension is unsupported, logs a warning and returns {}.
 * @param {string} filePath - The path to the file.
 * @returns {Object} - Parsed content as a key-value map, or {} if unsupported.
 */
function parseFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();

  switch (ext) {
    case ".properties":
      return parsePropertiesFile(filePath);
    case ".yml":
    case ".yaml":
      return parseYamlFile(filePath);
    default:
      console.error(
        `Warning: Unsupported file extension "${ext}" for file "${filePath}". ` +
          `Only .properties, .yml, or .yaml are supported. This file will be treated as empty.`
      );
      return {};
  }
}

/**
 * Internal helper that compares key-value data from multiple files
 * and returns a structured result (without printing to console).
 *
 * @param {string[]} filePaths - Array of file paths.
 * @returns {{
 *    mismatchCount: number,
 *    mismatchDetails: {
 *        key: string,
 *        values: string[],
 *        matched: boolean
 *    }[]
 * }}
 */
function compareFileData(filePaths) {
  // Parse each file
  const parsedObjects = filePaths.map(parseFile);

  // Collect all unique keys
  const allKeys = new Set(parsedObjects.flatMap((obj) => Object.keys(obj)));

  const mismatchDetails = [];

  // Compare values for each key across files
  allKeys.forEach((key) => {
    const values = parsedObjects.map(
      (obj) => obj[key]?.replace(/\s+/g, "") || "N/A"
    );
    const matched = values.every((value) => value === values[0]);
    mismatchDetails.push({ key, values, matched });
  });

  // Count mismatches
  const mismatchCount = mismatchDetails.filter((d) => !d.matched).length;
  return { mismatchCount, mismatchDetails };
}

/**
 * Helper function: checks if all values match across the provided files.
 *
 * @param {string[]} filePaths - Array of file paths.
 * @returns {boolean} - True if all properties match across all files, false otherwise.
 */
function checkIfAllValuesMatch(filePaths) {
  const { mismatchCount } = compareFileData(filePaths);
  return mismatchCount === 0;
}

/**
 * Helper function: returns a list of fields (keys) that do not match.
 *
 * @param {string[]} filePaths - Array of file paths.
 * @returns {string[]} - List of mismatched keys.
 */
function getMismatchFields(filePaths) {
  const { mismatchDetails } = compareFileData(filePaths);
  return mismatchDetails
    .filter((detail) => !detail.matched)
    .map((detail) => detail.key);
}

/**
 * CLI function: compares properties/keys across multiple files,
 * prints details to the console, and provides a summary.
 *
 * @param {string[]} filePaths - Array of file paths.
 */
function compareFiles(filePaths) {
  console.log("Comparing properties/keys across files:\n");

  const { mismatchCount, mismatchDetails } = compareFileData(filePaths);

  // Print detail for each key
  mismatchDetails.forEach(({ key, values, matched }) => {
    if (matched) {
      console.log(`Key: ${key} - Values match: '${values[0]}'`);
    } else {
      console.log(`Key: ${key} - Mismatched values:`);
      values.forEach((value, idx) => {
        console.log(`  File ${idx + 1} (${filePaths[idx]}): ${value}`);
      });
    }
  });

  // Summary
  console.log("\n=== Summary ===");
  if (mismatchCount === 0) {
    console.log("All properties match across all files!");
  } else {
    console.log(`${mismatchCount} key(s) have mismatched values.`);
  }
}

/**
 * CLI entry point for comparing .properties and .yml/.yaml files.
 */
function run() {
  const filePaths = process.argv.slice(2);

  if (filePaths.length === 0) {
    console.error("Please provide file paths as command-line arguments.");
    process.exit(1);
  }

  // Optionally, check if all files exist
  const missing = filePaths.filter((fp) => !fs.existsSync(fp));
  if (missing.length > 0) {
    console.error(`The following file(s) do not exist: ${missing.join(", ")}`);
    // We continue anyway, or we can decide to exit.
    // For now, let's exit to avoid unexpected comparisons:
    process.exit(1);
  }

  compareFiles(filePaths);
}

module.exports = {
  parsePropertiesFile,
  parseYamlFile,
  parseFile,
  compareFileData,
  checkIfAllValuesMatch,
  getMismatchFields,
  compareFiles,
  run,
};
