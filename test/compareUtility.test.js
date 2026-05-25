import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
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
  const unique = crypto.randomUUID();
  const fileName = `test_${unique}${ext}`;
  const filePath = path.join(__dirname, fileName);
  fs.writeFileSync(filePath, content, "utf8");
  tempFiles.push(filePath);
  return filePath;
}

/**
 * Create two temporary files with given contents and extension.
 * Returns [file1, file2].
 */
function createTwoTempFiles(content1, content2, ext = ".properties") {
  const f1 = createTempFile(content1, ext);
  const f2 = createTempFile(content2, ext);
  return [f1, f2];
}

/**
 * Mock console methods and return the mocks in an object.
 * Usage: const { log, error } = mockConsole('log','error');
 */
function mockConsole(...methods) {
  const mocks = {};
  for (const m of methods) {
    mocks[m] = jest.spyOn(console, m).mockImplementation(() => {});
  }
  return mocks;
}

/**
 * Restore mocks created by `mockConsole` or other spies.
 * Accepts an object of mocks or an array of mocks.
 */
function restoreMocks(mocks) {
  if (!mocks) return;
  if (Array.isArray(mocks)) {
    for (const m of mocks) m?.mockRestore();
  } else {
    for (const key of Object.keys(mocks)) {
      const m = mocks[key];
      m?.mockRestore?.();
    }
  }
}

/**
 * Spy on process.exit and return the mock. Call mockRestore when done.
 */
function mockProcessExit() {
  return jest.spyOn(process, "exit").mockImplementation(() => {});
}

/**
 * Temporarily set process.argv for a function call, restoring it afterwards.
 */
function runWithArgv(argv, fn) {
  const originalArgv = process.argv;
  try {
    process.argv = argv;
    fn();
  } catch {
    // swallow errors from run() which may call process.exit
  } finally {
    process.argv = originalArgv;
  }
}

/**
 * Common test file creators to reduce duplication.
 */
function createStandardPair(ext = ".properties") {
  return createTwoTempFiles(`key1=value1\nkey2=value2`, `key1=value1\nkey2=value3`, ext);
}

function createMatchingPair(ext = ".properties") {
  return createTwoTempFiles(`key1=value1\nkey2=value2`, `key1=value1\nkey2=value2`, ext);
}

function createSinglePair(ext = ".properties") {
  return createTwoTempFiles(`key1=value1`, `key1=value1`, ext);
}

function createOutputFile(ext) {
  return createTempFile("", ext);
}

function createStandardComparison() {
  const filePaths = createStandardPair();
  return { filePaths, comparisonData: compareFileData(filePaths) };
}

function readFile(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function expectContainsAll(text, expectedValues) {
  expectedValues.forEach((value) => expect(text).toContain(value));
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
    const [file1, file2] = createMatchingPair();
    const { mismatchCount, mismatchDetails } = compareFileData([file1, file2]);
    expect(mismatchCount).toBe(0);
    expect(mismatchDetails).toEqual([
      { key: "key1", values: ["value1", "value1"], matched: true },
      { key: "key2", values: ["value2", "value2"], matched: true },
    ]);
  });

  test("compareFileData should detect mismatched keys", () => {
    const [file1, file2] = createStandardPair();
    const { mismatchCount, mismatchDetails } = compareFileData([file1, file2]);
    expect(mismatchCount).toBe(1);
    expect(mismatchDetails).toEqual([
      { key: "key1", values: ["value1", "value1"], matched: true },
      { key: "key2", values: ["value2", "value3"], matched: false },
    ]);
  });

  test("checkIfAllValuesMatch should return true for matching files", () => {
    const [file1, file2] = createMatchingPair();
    const result = checkIfAllValuesMatch([file1, file2]);
    expect(result).toBe(true);
  });

  test("checkIfAllValuesMatch should return false for mismatched files", () => {
    const [file1, file2] = createStandardPair();
    const result = checkIfAllValuesMatch([file1, file2]);
    expect(result).toBe(false);
  });

  test("getMismatchFields should return mismatched keys", () => {
    const [file1, file2] = createStandardPair();
    const result = getMismatchFields([file1, file2]);
    expect(result).toEqual(["key2"]);
  });

  test("run should exit with error if files are missing", () => {
    // Force fs.existsSync to return false for any file in this test
    const existsSyncMock = jest.spyOn(fs, "existsSync").mockImplementation(() => false);
    const { error: consoleErrorMock } = mockConsole("error");
    const processExitMock = mockProcessExit();

    runWithArgv([
      "node",
      "compareUtility.js",
      "nonexistent1.properties",
      "nonexistent2.yaml",
    ], () => run());

    // Flatten all arguments passed to console.error
    const errorCalls = consoleErrorMock.mock.calls.flat();
    expect(
      errorCalls.some(
        (msg) => typeof msg === "string" && msg.includes("The following file(s) do not exist:")
      )
    ).toBe(true);

    expect(processExitMock).toHaveBeenCalledWith(1);

    existsSyncMock.mockRestore();
    restoreMocks({ error: consoleErrorMock });
    processExitMock.mockRestore();
  });

  test("run should exit with error if only one file path is provided", () => {
    const file = createTempFile(`key1=value1\nkey2=value2`, ".properties");
    const { error: consoleErrorMock } = mockConsole("error");
    const processExitMock = mockProcessExit();

    runWithArgv(["node", "compareUtility.js", file], () => run());

    expect(consoleErrorMock).toHaveBeenCalledWith("Please provide at least two file paths for comparison.");
    expect(processExitMock).toHaveBeenCalledWith(1);

    restoreMocks({ error: consoleErrorMock });
    processExitMock.mockRestore();
  });

  test("run should handle valid file paths with mismatched keys", () => {
    const [file1, file2] = createStandardPair();
    const { table: consoleTableMock, log: consoleLogMock } = mockConsole("table", "log");
    const processExitMock = mockProcessExit();

    runWithArgv(["node", "compareUtility.js", file1, file2], () => run());

    expect(consoleTableMock).toHaveBeenCalled();
    expect(consoleLogMock).toHaveBeenCalledWith(expect.stringContaining("1 key(s) have mismatched values."));
    expect(processExitMock).not.toHaveBeenCalled();

    restoreMocks({ table: consoleTableMock, log: consoleLogMock });
    processExitMock.mockRestore();
  });

  // New tests for report generation
  describe("Report Generation Tests", () => {
    const reportCases = [
      {
        name: "generateHtmlReport should create valid HTML report",
        generate: generateHtmlReport,
        expected: [
          "<!DOCTYPE html>",
          '<html lang="en">',
          "<title>Properties Comparison Report</title>",
        ],
      },
      {
        name: "generateMarkdownReport should create valid Markdown report",
        generate: generateMarkdownReport,
        expected: [
          "# Properties Comparison Report",
          "## Files Compared",
          "## Comparison Results",
          "| Key | Matched |",
        ],
      },
    ];

    test.each(reportCases)("$name", ({ generate, expected }) => {
      const { filePaths, comparisonData } = createStandardComparison();
      const report = generate(filePaths, comparisonData);

      expectContainsAll(report, [
        ...expected,
        "key1",
        "key2",
        "value1",
        "value2",
        "value3",
        "1 key(s) have mismatched values",
      ]);
    });
  });

  describe("compareFiles Tests", () => {
    const compareCases = [
      {
        name: "console default",
        opts: {},
        expect: (mocks, out) => {
          expect(mocks.log).toHaveBeenCalled();
          expect(mocks.table).toHaveBeenCalled();
        },
      },
      {
        name: "html file",
        opts: { format: "html", outputExt: ".html" },
        expect: (mocks, out) => {
          const contents = readFile(out);
          expect(contents).toContain("<!DOCTYPE html>");
          expect(contents).toContain("<title>Properties Comparison Report</title>");
          expect(mocks.log).toHaveBeenCalledWith(`HTML report saved to: ${out}`);
        },
      },
      {
        name: "html console",
        opts: { format: "html" },
        expect: (mocks) => {
          const calls = mocks.log.mock.calls.flat();
          const html = calls.find((c) => typeof c === "string" && c.includes("<!DOCTYPE html>"));
          expect(html).toBeDefined();
        },
      },
      {
        name: "markdown file",
        opts: { format: "markdown", outputExt: ".md" },
        expect: (mocks, out) => {
          const contents = readFile(out);
          expect(contents).toContain("# Properties Comparison Report");
          expect(mocks.log).toHaveBeenCalledWith(`Markdown report saved to: ${out}`);
        },
      },
      {
        name: "markdown console",
        opts: { format: "markdown" },
        expect: (mocks) => {
          const calls = mocks.log.mock.calls.flat();
          const md = calls.find((c) => typeof c === "string" && c.includes("# Properties Comparison Report"));
          expect(md).toBeDefined();
        },
      },
      {
        name: "invalid format",
        opts: { format: "invalid" },
        expect: (mocks) => {
          expect(mocks.error).toHaveBeenCalledWith(expect.stringContaining("Unsupported format: invalid"));
          expect(mocks.log).toHaveBeenCalled();
          expect(mocks.table).toHaveBeenCalled();
        },
      },
    ];

    test.each(compareCases)('$name', (c) => {
      const [file1, file2] = createStandardPair();
      const mocks = mockConsole("log", "table", "error");

      let out = null;
      const opts = {};
      if (c.opts.format) opts.format = c.opts.format;
      if (c.opts.outputExt) {
        out = createOutputFile(c.opts.outputExt);
        opts.outputFile = out;
      }

      compareFiles([file1, file2], opts);

      c.expect(mocks, out);

      restoreMocks(mocks);
    });
  });

  describe("compareProperties Tests", () => {
    test("should compare two files and return comparison data", () => {
      const [file1, file2] = createStandardPair();

      const result = compareProperties(file1, file2);

      expect(result.mismatchCount).toBe(1);
      expect(result.mismatchDetails).toHaveLength(2);
      expect(result.mismatchDetails.find(d => d.key === 'key2').matched).toBe(false);
    });

    test("should generate JSON output when json option is true", () => {
      const [file1, file2] = createSinglePair();
      const outputFile = createOutputFile(".json");

      const { log: consoleLogMock } = mockConsole("log");

      compareProperties(file1, file2, { output: outputFile, json: true });

      // Verify JSON was written
      const fileContents = readFile(outputFile);
      const jsonData = JSON.parse(fileContents);
      expect(jsonData.mismatchCount).toBe(0);

      restoreMocks({ log: consoleLogMock });
    });

    test.each([
      [".html", ["<!DOCTYPE html>", "Properties Comparison Report"]],
      [".md", ["# Properties Comparison Report"]],
    ])("should generate %s output based on file extension", (ext, expected) => {
      const [file1, file2] = createStandardPair();
      const outputFile = createOutputFile(ext);

      compareProperties(file1, file2, { output: outputFile });

      expectContainsAll(readFile(outputFile), expected);
    });

    test("should log output path when verbose option is true", () => {
      const [file1, file2] = createSinglePair();
      const outputFile = createOutputFile(".html");

      const { log: consoleLogMock } = mockConsole("log");

      compareProperties(file1, file2, { output: outputFile, verbose: true });

      expect(consoleLogMock).toHaveBeenCalledWith(`Comparison report saved to ${outputFile}`);

      restoreMocks({ log: consoleLogMock });
    });
  });

  describe("Complete Workflow Tests", () => {
    test.each([
      {
        name: "long option format",
        args: ["--format", "html", "--output"],
        outputExt: ".html",
        expectedContent: "<!DOCTYPE html>",
      },
      {
        name: "short option format",
        args: ["-f", "markdown", "-o"],
        outputExt: ".md",
        expectedContent: "# Properties Comparison Report",
      },
    ])("run should handle $name", ({ args, outputExt, expectedContent }) => {
      const [file1, file2] = createStandardPair();
      const outputFile = createOutputFile(outputExt);

      const { log: consoleLogMock } = mockConsole("log");

      runWithArgv([
        "node",
        "compareUtility.js",
        ...args,
        outputFile,
        file1,
        file2,
      ], () => run());

      expect(readFile(outputFile)).toContain(expectedContent);

      restoreMocks({ log: consoleLogMock });
    });

    test("run should show usage when no arguments are provided", () => {
      const { error: consoleErrorMock } = mockConsole("error");
      const processExitMock = mockProcessExit();

      runWithArgv(["node", "compareUtility.js"], () => run());

      expect(consoleErrorMock).toHaveBeenCalledWith("Please provide file paths as command-line arguments.");
      expect(processExitMock).toHaveBeenCalledWith(1);

      restoreMocks({ error: consoleErrorMock });
      processExitMock.mockRestore();
    });
  });
});
