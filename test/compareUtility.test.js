import fs from "fs";
import path from "path";
import {
  parsePropertiesFile,
  parseYamlFile,
  parseFile,
  compareFileData,
  checkIfAllValuesMatch,
  getMismatchFields,
  run,
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
      .mockImplementation(() => {});
    const result = parseYamlFile(file);
    expect(result).toEqual({});
    expect(consoleErrorMock).toHaveBeenCalledWith(
      expect.stringContaining("Error reading/parsing YAML file"),
      expect.stringContaining("unexpected end of the stream within a flow collection")
    );
    
    consoleErrorMock.mockRestore();
  });

  test("parseFile should handle unsupported file extensions", () => {
    const file = createTempFile("", ".txt");
    const consoleErrorMock = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});
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
    const existsSyncMock = jest.spyOn(fs, "existsSync").mockImplementation(() => false);
    const consoleErrorMock = jest.spyOn(console, "error").mockImplementation(() => {});
    const processExitMock = jest.spyOn(process, "exit").mockImplementation(() => {});
    const originalArgv = process.argv;
  
    try {
      process.argv = ["node", "compareUtility.js", "nonexistent1.properties", "nonexistent2.yaml"];
      run();
    } catch {}
  
    // Flatten all arguments passed to console.error
    const errorCalls = consoleErrorMock.mock.calls.flat();
    expect(
      errorCalls.some(msg =>
        typeof msg === 'string' && msg.includes("The following file(s) do not exist:")
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
    const consoleErrorMock = jest.spyOn(console, "error").mockImplementation(() => {});
    const processExitMock = jest.spyOn(process, "exit").mockImplementation(() => {});
    const originalArgv = process.argv;
  
    try {
      process.argv = ["node", "compareUtility.js", file];
      run();
    } catch {}
  
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
    const consoleTableMock = jest.spyOn(console, "table").mockImplementation(() => {});
    const consoleLogMock = jest.spyOn(console, "log").mockImplementation(() => {});
    const processExitMock = jest.spyOn(process, "exit").mockImplementation(() => {});
    const originalArgv = process.argv;
  
    try {
      process.argv = ["node", "compareUtility.js", file1, file2];
      run();
    } catch {}
  
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
  
});