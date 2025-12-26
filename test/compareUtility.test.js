import fs from "node:fs";
import path from "node:path";
import {
  parsePropertiesFile,
  parseYamlFile,
  parseFile,
  compareFileData,
  checkIfAllValuesMatch,
  getMismatchFields,
  compareFiles,
  generateHtmlReport,
  generateMarkdownReport,
  run,
  compareProperties,
} from "../src/compareUtility.js";

// This array will store all our temporary file paths
let tempFiles = [];

/**
 * Helper to create temp files for testing.
 * We'll push the generated paths into `tempFiles` for cleanup.
 */
function createTempFile(content, ext = ".properties") {
  const unique = `${Date.now()}_${Math.random()}`;
  const fileName = `test_${unique}${ext}`;
  const filePath = path.join(__dirname, fileName);
  fs.writeFileSync(filePath, content, "utf8");
  tempFiles.push(filePath);
  return filePath;
}

/**
 * Clean up *all* temp files after *all* tests and describes are done.
 * This must be at the top level so it catches files from both describe blocks.
 */
afterAll(() => {
  for (const filePath of tempFiles) {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
});

describe("compareUtility Tests", () => {
  test("parsePropertiesFile should handle valid .properties files", () => {
    const content = `key1=value1\nkey2=value2`;
    const file = createTempFile(content, ".properties");
    const result = parsePropertiesFile(file);
    expect(result).toEqual({ key1: "value1", key2: "value2" });
  });

  test("parsePropertiesFile should skip comments and empty lines", () => {
    const content = `# This is a comment\n\nkey1=value1\nkey2=value2 # Inline comment`;
    const file = createTempFile(content, ".properties");
    const result = parsePropertiesFile(file);
    expect(result).toEqual({ key1: "value1", key2: "value2" });
  });

  test("parseYamlFile should handle valid .yaml files", () => {
    const content = `key1: value1\nkey2:\n  nestedKey: nestedValue`;
    const file = createTempFile(content, ".yaml");
    const result = parseYamlFile(file);
    expect(result).toEqual({ key1: "value1", "key2.nestedKey": "nestedValue" });
  });

  test("parseYamlFile should return empty object on invalid YAML", () => {
    const content = `key1: value1\nkey2: { invalid_yaml`;
    const file = createTempFile(content, ".yaml");
    const consoleErrorMock = jest
      .spyOn(console, "error")
      .mockImplementation(() => { });
    const result = parseYamlFile(file);
    expect(result).toEqual({});
    expect(consoleErrorMock).toHaveBeenCalledWith(
      expect.stringContaining("Error reading/parsing YAML file"),
      expect.stringContaining(
        "unexpected end of the stream within a flow collection"
      )
    );

    consoleErrorMock.mockRestore();
  });

  test("parseFile should handle unsupported file extensions", () => {
    const file = createTempFile("", ".txt");
    const consoleErrorMock = jest
      .spyOn(console, "error")
      .mockImplementation(() => { });
    const result = parseFile(file);
    expect(result).toEqual({});
    expect(consoleErrorMock).toHaveBeenCalledWith(
      expect.stringContaining("Unsupported file extension")
    );
    consoleErrorMock.mockRestore();
  });

  test("compareFileData should handle identical files", () => {
    const file1 = createTempFile(`key1=value1\nkey2=value2`, ".properties");
    const file2 = createTempFile(`key1=value1\nkey2=value2`, ".properties");
    const { mismatchCount, mismatchDetails } = compareFileData([file1, file2]);
    expect(mismatchCount).toBe(0);
    expect(mismatchDetails).toEqual([
      { key: "key1", values: ["value1", "value1"], matched: true },
      { key: "key2", values: ["value2", "value2"], matched: true },
    ]);
  });

  test("compareFileData should detect mismatched keys", () => {
    const file1 = createTempFile(`key1=value1\nkey2=value2`, ".properties");
    const file2 = createTempFile(`key1=value1\nkey2=value3`, ".properties");
    const { mismatchCount, mismatchDetails } = compareFileData([file1, file2]);
    expect(mismatchCount).toBe(1);
    expect(mismatchDetails).toEqual([
      { key: "key1", values: ["value1", "value1"], matched: true },
      { key: "key2", values: ["value2", "value3"], matched: false },
    ]);
  });

  test("checkIfAllValuesMatch should return true for matching files", () => {
    const file1 = createTempFile(`key1=value1\nkey2=value2`, ".properties");
    const file2 = createTempFile(`key1=value1\nkey2=value2`, ".properties");
    const result = checkIfAllValuesMatch([file1, file2]);
    expect(result).toBe(true);
  });

  test("checkIfAllValuesMatch should return false for mismatched files", () => {
    const file1 = createTempFile(`key1=value1\nkey2=value2`, ".properties");
    const file2 = createTempFile(`key1=value1\nkey2=value3`, ".properties");
    const result = checkIfAllValuesMatch([file1, file2]);
    expect(result).toBe(false);
  });

  test("getMismatchFields should return mismatched keys", () => {
    const file1 = createTempFile(`key1=value1\nkey2=value2`, ".properties");
    const file2 = createTempFile(`key1=value1\nkey2=value3`, ".properties");
    const result = getMismatchFields([file1, file2]);
    expect(result).toEqual(["key2"]);
  });

  test("run should exit with error if files are missing", () => {
    // Force fs.existsSync to return false for any file in this test
    const existsSyncMock = jest
      .spyOn(fs, "existsSync")
      .mockImplementation(() => false);
    const consoleErrorMock = jest
      .spyOn(console, "error")
      .mockImplementation(() => { });
    const processExitMock = jest
      .spyOn(process, "exit")
      .mockImplementation(() => { });
    const originalArgv = process.argv;

    try {
      process.argv = [
        "node",
        "compareUtility.js",
        "nonexistent1.properties",
        "nonexistent2.yaml",
      ];
      run();
    } catch { }

    // Flatten all arguments passed to console.error
    const errorCalls = consoleErrorMock.mock.calls.flat();
    expect(
      errorCalls.some(
        (msg) =>
          typeof msg === "string" &&
          msg.includes("The following file(s) do not exist:")
      )
    ).toBe(true);

    expect(processExitMock).toHaveBeenCalledWith(1);

    process.argv = originalArgv;
    existsSyncMock.mockRestore();
    consoleErrorMock.mockRestore();
    processExitMock.mockRestore();
  });

  test("run should exit with error if only one file path is provided", () => {
    const file = createTempFile(`key1=value1\nkey2=value2`, ".properties");
    const consoleErrorMock = jest
      .spyOn(console, "error")
      .mockImplementation(() => { });
    const processExitMock = jest
      .spyOn(process, "exit")
      .mockImplementation(() => { });
    const originalArgv = process.argv;

    try {
      process.argv = ["node", "compareUtility.js", file];
      run();
    } catch { }

    expect(consoleErrorMock).toHaveBeenCalledWith(
      "Please provide at least two file paths for comparison."
    );
    expect(processExitMock).toHaveBeenCalledWith(1);

    process.argv = originalArgv;
    consoleErrorMock.mockRestore();
    processExitMock.mockRestore();
  });

  test("run should handle valid file paths with mismatched keys", () => {
    const file1 = createTempFile(`key1=value1\nkey2=value2`, ".properties");
    const file2 = createTempFile(`key1=value1\nkey2=value3`, ".properties");
    const consoleTableMock = jest
      .spyOn(console, "table")
      .mockImplementation(() => { });
    const consoleLogMock = jest
      .spyOn(console, "log")
      .mockImplementation(() => { });
    const processExitMock = jest
      .spyOn(process, "exit")
      .mockImplementation(() => { });
    const originalArgv = process.argv;

    try {
      process.argv = ["node", "compareUtility.js", file1, file2];
      run();
    } catch { }

    expect(consoleTableMock).toHaveBeenCalled();
    expect(consoleLogMock).toHaveBeenCalledWith(
      expect.stringContaining("1 key(s) have mismatched values.")
    );
    expect(processExitMock).not.toHaveBeenCalled();

    process.argv = originalArgv;
    consoleTableMock.mockRestore();
    consoleLogMock.mockRestore();
    processExitMock.mockRestore();
  });

  // New tests for report generation
  describe("Report Generation Tests", () => {
    test("generateHtmlReport should create valid HTML report", () => {
      const file1 = createTempFile(`key1=value1\nkey2=value2`, ".properties");
      const file2 = createTempFile(`key1=value1\nkey2=value3`, ".properties");
      const filePaths = [file1, file2];
      const comparisonData = compareFileData(filePaths);

      const htmlReport = generateHtmlReport(filePaths, comparisonData);

      // Check basic structure
      expect(htmlReport).toContain("<!DOCTYPE html>");
      expect(htmlReport).toContain('<html lang="en">');
      expect(htmlReport).toContain(
        "<title>Properties Comparison Report</title>"
      );

      // Check content
      expect(htmlReport).toContain("key1");
      expect(htmlReport).toContain("key2");
      expect(htmlReport).toContain("value1");
      expect(htmlReport).toContain("value2");
      expect(htmlReport).toContain("value3");
      expect(htmlReport).toContain("1 key(s) have mismatched values");
    });

    test("generateMarkdownReport should create valid Markdown report", () => {
      const file1 = createTempFile(`key1=value1\nkey2=value2`, ".properties");
      const file2 = createTempFile(`key1=value1\nkey2=value3`, ".properties");
      const filePaths = [file1, file2];
      const comparisonData = compareFileData(filePaths);

      const mdReport = generateMarkdownReport(filePaths, comparisonData);

      // Check structure
      expect(mdReport).toContain("# Properties Comparison Report");
      expect(mdReport).toContain("## Files Compared");
      expect(mdReport).toContain("## Comparison Results");

      // Check table format
      expect(mdReport).toContain("| Key | Matched |");

      // Check content
      expect(mdReport).toContain("key1");
      expect(mdReport).toContain("key2");
      expect(mdReport).toContain("value1");
      expect(mdReport).toContain("value2");
      expect(mdReport).toContain("value3");
      expect(mdReport).toContain("1 key(s) have mismatched values");
    });
  });

  describe("compareFiles Tests", () => {
    test("compareFiles should output to console by default", () => {
      const file1 = createTempFile(`key1=value1\nkey2=value2`, ".properties");
      const file2 = createTempFile(`key1=value1\nkey2=value3`, ".properties");

      const consoleLogMock = jest
        .spyOn(console, "log")
        .mockImplementation(() => { });
      const consoleTableMock = jest
        .spyOn(console, "table")
        .mockImplementation(() => { });

      compareFiles([file1, file2]);

      expect(consoleLogMock).toHaveBeenCalled();
      expect(consoleTableMock).toHaveBeenCalled();

      consoleLogMock.mockRestore();
      consoleTableMock.mockRestore();
    });

    test("compareFiles should generate HTML report when format is html", () => {
      const file1 = createTempFile(`key1=value1\nkey2=value2`, ".properties");
      const file2 = createTempFile(`key1=value1\nkey2=value3`, ".properties");
      const outputFile = createTempFile("", ".html");

      const consoleLogMock = jest
        .spyOn(console, "log")
        .mockImplementation(() => { });

      compareFiles([file1, file2], { format: "html", outputFile });

      // Verify file was written
      const fileContents = fs.readFileSync(outputFile, "utf8");
      expect(fileContents).toContain("<!DOCTYPE html>");
      expect(fileContents).toContain(
        "<title>Properties Comparison Report</title>"
      );

      expect(consoleLogMock).toHaveBeenCalledWith(
        `HTML report saved to: ${outputFile}`
      );

      consoleLogMock.mockRestore();
    });

    test("compareFiles should output HTML to console when no outputFile is provided", () => {
      const file1 = createTempFile(`key1=value1\nkey2=value2`, ".properties");
      const file2 = createTempFile(`key1=value1\nkey2=value3`, ".properties");

      const consoleLogMock = jest
        .spyOn(console, "log")
        .mockImplementation(() => { });

      compareFiles([file1, file2], { format: "html" });

      // Should log the HTML to console
      const calls = consoleLogMock.mock.calls.flat();
      const htmlOutput = calls.find(
        (arg) => typeof arg === "string" && arg.includes("<!DOCTYPE html>")
      );
      expect(htmlOutput).toBeDefined();

      consoleLogMock.mockRestore();
    });

    test("compareFiles should generate Markdown report when format is markdown", () => {
      const file1 = createTempFile(`key1=value1\nkey2=value2`, ".properties");
      const file2 = createTempFile(`key1=value1\nkey2=value3`, ".properties");
      const outputFile = createTempFile("", ".md");

      const consoleLogMock = jest
        .spyOn(console, "log")
        .mockImplementation(() => { });

      compareFiles([file1, file2], { format: "markdown", outputFile });

      // Verify file was written
      const fileContents = fs.readFileSync(outputFile, "utf8");
      expect(fileContents).toContain("# Properties Comparison Report");

      expect(consoleLogMock).toHaveBeenCalledWith(
        `Markdown report saved to: ${outputFile}`
      );

      consoleLogMock.mockRestore();
    });

    test("compareFiles should output Markdown to console when no outputFile is provided", () => {
      const file1 = createTempFile(`key1=value1\nkey2=value2`, ".properties");
      const file2 = createTempFile(`key1=value1\nkey2=value3`, ".properties");

      const consoleLogMock = jest
        .spyOn(console, "log")
        .mockImplementation(() => { });

      compareFiles([file1, file2], { format: "markdown" });

      // Should log the Markdown to console
      const calls = consoleLogMock.mock.calls.flat();
      const mdOutput = calls.find(
        (arg) =>
          typeof arg === "string" &&
          arg.includes("# Properties Comparison Report")
      );
      expect(mdOutput).toBeDefined();

      consoleLogMock.mockRestore();
    });

    test("compareFiles should fallback to console output for invalid format", () => {
      const file1 = createTempFile(`key1=value1\nkey2=value2`, ".properties");
      const file2 = createTempFile(`key1=value1\nkey2=value3`, ".properties");

      const consoleLogMock = jest
        .spyOn(console, "log")
        .mockImplementation(() => { });
      const consoleTableMock = jest
        .spyOn(console, "table")
        .mockImplementation(() => { });
      const consoleErrorMock = jest
        .spyOn(console, "error")
        .mockImplementation(() => { });

      compareFiles([file1, file2], { format: "invalid" });

      expect(consoleErrorMock).toHaveBeenCalledWith(
        expect.stringContaining("Unsupported format: invalid")
      );
      expect(consoleLogMock).toHaveBeenCalled();
      expect(consoleTableMock).toHaveBeenCalled();

      consoleLogMock.mockRestore();
      consoleTableMock.mockRestore();
      consoleErrorMock.mockRestore();
    });
  });

  describe("compareProperties Tests", () => {
    test("should compare two files and return comparison data", () => {
      const file1 = createTempFile(`key1=value1\nkey2=value2`, ".properties");
      const file2 = createTempFile(`key1=value1\nkey2=value3`, ".properties");

      const result = compareProperties(file1, file2);

      expect(result.mismatchCount).toBe(1);
      expect(result.mismatchDetails).toHaveLength(2);
      expect(result.mismatchDetails.find(d => d.key === 'key2').matched).toBe(false);
    });

    test("should generate JSON output when json option is true", () => {
      const file1 = createTempFile(`key1=value1`, ".properties");
      const file2 = createTempFile(`key1=value1`, ".properties");
      const outputFile = createTempFile("", ".json");

      const consoleLogMock = jest.spyOn(console, "log").mockImplementation(() => { });

      compareProperties(file1, file2, {
        output: outputFile,
        json: true
      });

      // Verify JSON was written
      const fileContents = fs.readFileSync(outputFile, "utf8");
      const jsonData = JSON.parse(fileContents);
      expect(jsonData.mismatchCount).toBe(0);

      consoleLogMock.mockRestore();
    });

    test("should generate HTML output based on file extension", () => {
      const file1 = createTempFile(`key1=value1\nkey2=value2`, ".properties");
      const file2 = createTempFile(`key1=value1\nkey2=value3`, ".properties");
      const outputFile = createTempFile("", ".html");

      compareProperties(file1, file2, { output: outputFile });

      // Verify HTML was written
      const fileContents = fs.readFileSync(outputFile, "utf8");
      expect(fileContents).toContain("<!DOCTYPE html>");
      expect(fileContents).toContain("Properties Comparison Report");
    });

    test("should generate Markdown output when file has .md extension", () => {
      const file1 = createTempFile(`key1=value1\nkey2=value2`, ".properties");
      const file2 = createTempFile(`key1=value1\nkey2=value3`, ".properties");
      const outputFile = createTempFile("", ".md");

      compareProperties(file1, file2, { output: outputFile });

      // Verify Markdown was written
      const fileContents = fs.readFileSync(outputFile, "utf8");
      expect(fileContents).toContain("# Properties Comparison Report");
    });

    test("should log output path when verbose option is true", () => {
      const file1 = createTempFile(`key1=value1`, ".properties");
      const file2 = createTempFile(`key1=value1`, ".properties");
      const outputFile = createTempFile("", ".html");

      const consoleLogMock = jest.spyOn(console, "log").mockImplementation(() => { });

      compareProperties(file1, file2, {
        output: outputFile,
        verbose: true
      });

      expect(consoleLogMock).toHaveBeenCalledWith(`Comparison report saved to ${outputFile}`);

      consoleLogMock.mockRestore();
    });
  });

  describe("Complete Workflow Tests", () => {
    test("run should parse command line arguments with format and output options", () => {
      const file1 = createTempFile(`key1=value1\nkey2=value2`, ".properties");
      const file2 = createTempFile(`key1=value1\nkey2=value3`, ".properties");
      const outputFile = createTempFile("", ".html");

      const consoleLogMock = jest
        .spyOn(console, "log")
        .mockImplementation(() => { });
      const originalArgv = process.argv;

      try {
        process.argv = [
          "node",
          "compareUtility.js",
          "--format",
          "html",
          "--output",
          outputFile,
          file1,
          file2,
        ];
        run();
      } catch { }

      // Verify output file was written
      const fileContents = fs.readFileSync(outputFile, "utf8");
      expect(fileContents).toContain("<!DOCTYPE html>");

      process.argv = originalArgv;
      consoleLogMock.mockRestore();
    });

    test("run should handle short option format (-f, -o)", () => {
      const file1 = createTempFile(`key1=value1\nkey2=value2`, ".properties");
      const file2 = createTempFile(`key1=value1\nkey2=value3`, ".properties");
      const outputFile = createTempFile("", ".md");

      const consoleLogMock = jest
        .spyOn(console, "log")
        .mockImplementation(() => { });
      const originalArgv = process.argv;

      try {
        process.argv = [
          "node",
          "compareUtility.js",
          "-f",
          "markdown",
          "-o",
          outputFile,
          file1,
          file2,
        ];
        run();
      } catch { }

      // Verify output file was written
      const fileContents = fs.readFileSync(outputFile, "utf8");
      expect(fileContents).toContain("# Properties Comparison Report");

      process.argv = originalArgv;
      consoleLogMock.mockRestore();
    });

    test("run should show usage when no arguments are provided", () => {
      const consoleErrorMock = jest
        .spyOn(console, "error")
        .mockImplementation(() => { });
      const processExitMock = jest
        .spyOn(process, "exit")
        .mockImplementation(() => { });
      const originalArgv = process.argv;

      try {
        process.argv = ["node", "compareUtility.js"];
        run();
      } catch { }

      expect(consoleErrorMock).toHaveBeenCalledWith(
        "Please provide file paths as command-line arguments."
      );
      expect(processExitMock).toHaveBeenCalledWith(1);

      process.argv = originalArgv;
      consoleErrorMock.mockRestore();
      processExitMock.mockRestore();
    });
  });
});
