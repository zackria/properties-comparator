#!/usr/bin/env node

import chalk from "chalk";
import fs from "fs";
import path from "path";
import yaml from "js-yaml";

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
 * Generates an HTML report for the comparison results.
 *
 * @param {Array} filePaths - Array of file paths that were compared
 * @param {Object} comparisonData - The output from compareFileData function
 * @returns {string} - HTML document as string
 */
function generateHtmlReport(filePaths, comparisonData) {
  const { mismatchCount, mismatchDetails } = comparisonData;
  const fileNames = filePaths.map((fp) => path.basename(fp));

  // Start HTML document
  let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Properties Comparison Report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; color: #333; }
    h1, h2 { color: #0066cc; }
    table { border-collapse: collapse; width: 100%; margin-bottom: 20px; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #f2f2f2; }
    tr:nth-child(even) { background-color: #f9f9f9; }
    tr:hover { background-color: #f2f2f2; }
    .mismatch { background-color: #ffe6e6; }
    .matched { background-color: #e6ffe6; }
    .value-mismatch { color: #cc0000; font-weight: bold; }
    .summary { margin: 20px 0; padding: 15px; border-radius: 5px; }
    .summary.success { background-color: #e6ffe6; border: 1px solid #99cc99; }
    .summary.error { background-color: #ffe6e6; border: 1px solid #cc9999; }
    .file-list { margin-bottom: 20px; }
  </style>
</head>
<body>
  <h1>Properties Comparison Report</h1>
  
  <div class="file-list">
    <h2>Files Compared:</h2>
    <ol>
      ${fileNames
        .map(
          (name, idx) => `<li>${name} <small>(${filePaths[idx]})</small></li>`
        )
        .join("\n      ")}
    </ol>
  </div>

  <h2>Comparison Results</h2>
  <table>
    <tr>
      <th>Key</th>
      <th>Matched</th>
      ${fileNames
        .map((name, idx) => `<th>File ${idx + 1}: ${name}</th>`)
        .join("\n      ")}
    </tr>`;

  // Add table rows for each key
  mismatchDetails.forEach(({ key, values, matched }) => {
    html += `\n    <tr class="${matched ? "matched" : "mismatch"}">
      <td>${key}</td>
      <td>${matched ? "Yes" : "No"}</td>`;

    // Add values from each file
    values.forEach((value, idx) => {
      const cellClass = matched ? "" : "value-mismatch";
      html += `\n      <td class="${cellClass}">${
        value === "N/A" ? "<em>N/A</em>" : value
      }</td>`;
    });

    html += `\n    </tr>`;
  });

  html += `\n  </table>

  <div class="summary ${mismatchCount === 0 ? "success" : "error"}">
    <h2>Summary</h2>`;

  if (mismatchCount === 0) {
    html += `\n    <p>All properties match across all files!</p>`;
  } else {
    html += `\n    <p>${mismatchCount} key(s) have mismatched values.</p>
    <p><strong>Mismatched keys:</strong> ${mismatchDetails
      .filter((detail) => !detail.matched)
      .map((detail) => detail.key)
      .join(", ")}</p>`;
  }

  html += `\n  </div>
</body>
</html>`;

  return html;
}

/**
 * Generates a Markdown report for the comparison results.
 *
 * @param {Array} filePaths - Array of file paths that were compared
 * @param {Object} comparisonData - The output from compareFileData function
 * @returns {string} - Markdown document as string
 */
function generateMarkdownReport(filePaths, comparisonData) {
  const { mismatchCount, mismatchDetails } = comparisonData;
  const fileNames = filePaths.map((fp) => path.basename(fp));

  let markdown = `# Properties Comparison Report\n\n`;

  // Files compared
  markdown += `## Files Compared\n\n`;
  filePaths.forEach((fp, idx) => {
    markdown += `${idx + 1}. ${fileNames[idx]} (${fp})\n`;
  });

  // Comparison results table
  markdown += `\n## Comparison Results\n\n`;

  // Table header
  markdown += `| Key | Matched | ${fileNames
    .map((name, idx) => `File ${idx + 1}: ${name}`)
    .join(" | ")} |\n`;
  markdown += `| --- | --- | ${fileNames.map(() => "---").join(" | ")} |\n`;

  // Table content
  mismatchDetails.forEach(({ key, values, matched }) => {
    markdown += `| ${key} | ${matched ? "Yes" : "No"} | ${values
      .map((v) => (v === "N/A" ? "*N/A*" : v))
      .join(" | ")} |\n`;
  });

  // Summary
  markdown += `\n## Summary\n\n`;
  if (mismatchCount === 0) {
    markdown += `✅ All properties match across all files!\n`;
  } else {
    markdown += `❌ ${mismatchCount} key(s) have mismatched values.\n\n`;
    markdown += `**Mismatched keys:** ${mismatchDetails
      .filter((detail) => !detail.matched)
      .map((detail) => detail.key)
      .join(", ")}\n`;
  }

  return markdown;
}

/**
 * CLI function: compares properties/keys across multiple files,
 * prints details to the console in a tabular format, and provides a summary.
 *
 * @param {string[]} filePaths - Array of file paths.
 * @param {Object} options - Options for the comparison.
 * @param {string} [options.format] - Output format ('console', 'html', or 'markdown').
 * @param {string} [options.outputFile] - Path to save the report (for html and markdown).
 */
function compareFiles(filePaths, options = {}) {
  const format = options.format || "console";
  const outputFile = options.outputFile;

  const comparisonData = compareFileData(filePaths);

  if (format === "console") {
    console.log("Comparing properties/keys across files:\n");

    // Prepare data for tabular output
    const tableData = comparisonData.mismatchDetails.map(
      ({ key, values, matched }) => {
        const valueColumns = values.reduce((acc, value, idx) => {
          acc[`File ${idx + 1}`] = value;
          return acc;
        }, {});
        return {
          Key: key,
          Matched: matched ? "Yes" : "No",
          ...valueColumns,
        };
      }
    );

    // Print the table
    console.table(tableData);

    // Custom print for mismatched rows
    console.log("\n=== Highlighted Mismatched Rows ===");
    comparisonData.mismatchDetails.forEach(({ key, values, matched }) => {
      if (!matched) {
        const coloredValues = values.map((value, idx) =>
          chalk.red(`File ${idx + 1}: ${value}`)
        );
        console.log(
          chalk.yellow(`Key: ${key}`),
          "|",
          coloredValues.join(" | ")
        );
      }
    });

    // Summary
    console.log("\n=== Summary ===");
    if (comparisonData.mismatchCount === 0) {
      console.log("All properties match across all files!");
    } else {
      console.log(
        `${comparisonData.mismatchCount} key(s) have mismatched values.`
      );
      const mismatchedKeys = comparisonData.mismatchDetails
        .filter((detail) => !detail.matched)
        .map((detail) => detail.key);
      console.log("Mismatched keys:", mismatchedKeys.join(", "));
    }
  } else if (format === "html") {
    const htmlReport = generateHtmlReport(filePaths, comparisonData);
    if (outputFile) {
      fs.writeFileSync(outputFile, htmlReport);
      console.log(`HTML report saved to: ${outputFile}`);
    } else {
      console.log(htmlReport);
    }
  } else if (format === "markdown") {
    const markdownReport = generateMarkdownReport(filePaths, comparisonData);
    if (outputFile) {
      fs.writeFileSync(outputFile, markdownReport);
      console.log(`Markdown report saved to: ${outputFile}`);
    } else {
      console.log(markdownReport);
    }
  } else {
    console.error(
      `Unsupported format: ${format}. Using console output instead.`
    );
    compareFiles(filePaths); // Fallback to console output
  }
}

/**
 * CLI entry point for comparing .properties and .yml/.yaml files.
 */
function run() {
  const args = process.argv.slice(2);
  const options = {
    format: "console",
    outputFile: null,
  };

  // Parse arguments for format and output file
  const filePaths = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--format" || args[i] === "-f") {
      if (i + 1 < args.length) {
        options.format = args[i + 1].toLowerCase();
        i++; // Skip the next argument as it's the format value
      }
    } else if (args[i] === "--output" || args[i] === "-o") {
      if (i + 1 < args.length) {
        options.outputFile = args[i + 1];
        i++; // Skip the next argument as it's the output file path
      }
    } else {
      // Not an option, treat as file path
      filePaths.push(path.resolve(args[i]));
    }
  }

  if (filePaths.length === 0) {
    console.error("Please provide file paths as command-line arguments.");
    console.error(
      "Usage: properties-comparator [options] file1 file2 [file3...]"
    );
    console.error("Options:");
    console.error(
      "  --format, -f <format>   Output format: console, html, or markdown"
    );
    console.error(
      "  --output, -o <file>     Output file for html or markdown reports"
    );
    process.exit(1);
  } else if (filePaths.length === 1) {
    console.error("Please provide at least two file paths for comparison.");
    process.exit(1);
  }

  const missing = filePaths.filter((fp) => !fs.existsSync(fp));
  if (missing.length > 0) {
    console.error(`The following file(s) do not exist: ${missing.join(", ")}`);
    process.exit(1);
  }

  compareFiles(filePaths, options);
}

export {
  parsePropertiesFile,
  parseYamlFile,
  parseFile,
  compareFileData,
  checkIfAllValuesMatch,
  getMismatchFields,
  compareFiles,
  generateHtmlReport,
  generateMarkdownReport,
};

// If the script is executed directly, run the CLI
if (import.meta.url === `file://${process.argv[1]}`) {
  run();
}
