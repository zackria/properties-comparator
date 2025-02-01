const fs = require('fs');
const path = require('path');
const {
  parsePropertiesFile,
  parseYamlFile,
  parseFile,
  compareFileData,
  checkIfAllValuesMatch,
  getMismatchFields
  // compareFiles // We usually test the logic, not the CLI directly
} = require('../src/compareUtility');

// This array will store all our temporary file paths
let tempFiles = [];

/**
 * Helper to create temp files for testing.
 * We'll push the generated paths into `tempFiles` for cleanup.
 */
function createTempFile(content, ext = '.properties') {
  const unique = `${Date.now()}_${Math.random()}`;
  const fileName = `test_${unique}${ext}`;
  const filePath = path.join(__dirname, fileName);
  fs.writeFileSync(filePath, content, 'utf8');
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


describe('compareUtility Tests', () => {
  
  
  test('compareFileData should identify mismatches correctly (basic properties)', () => {
    const file1Content = `key1=abc\nkey2=def`;
    const file2Content = `key1=abc\nkey2=xyz`;

    const file1 = createTempFile(file1Content);
    const file2 = createTempFile(file2Content);

    const { mismatchCount, mismatchDetails } = compareFileData([file1, file2]);
    expect(mismatchCount).toBe(1);

    const mismatch = mismatchDetails.find(m => m.key === 'key2');
    expect(mismatch).toBeDefined();
    expect(mismatch.matched).toBe(false);
    expect(mismatch.values).toEqual(['def', 'xyz']);
  });

  test('parseFile should return an empty object for unsupported extensions', () => {
    // Mock console.error so it does nothing
    const consoleErrorMock = jest.spyOn(console, 'error').mockImplementation(() => {});
  
    try {
      const content = 'some random content';
      const tempFile = createTempFile(content, '.txt'); // Not supported by parseFile
  
      const result = parseFile(tempFile);
      expect(result).toEqual({});
    } finally {
      // Restore original console.error so other tests aren't affected
      consoleErrorMock.mockRestore();
    }
  });
  

  // Renamed the test to avoid duplication
  test('compareFileData should identify mismatches correctly (another scenario)', () => {
    // Provide content in a single line or carefully controlled multiline
    const file1Content = `key1=abc\nkey2=def`;
    const file2Content = `key1=abc\nkey2=xyz`;
  
    const file1 = createTempFile(file1Content, '.properties');
    const file2 = createTempFile(file2Content, '.properties');
  
    const { mismatchCount, mismatchDetails } = compareFileData([file1, file2]);
    expect(mismatchCount).toBe(1);
  
    const mismatch = mismatchDetails.find(m => m.key === 'key2');
    expect(mismatch.matched).toBe(false);
    expect(mismatch.values).toEqual(['def', 'xyz']);
  });
  

  test('checkIfAllValuesMatch should return true if files match', () => {
    const file1Content = `key1=value1\nkey2=value2`;
    const file2Content = `key1=value1\nkey2=value2`;

    const file1 = createTempFile(file1Content, '.properties');
    const file2 = createTempFile(file2Content, '.properties');

    const result = checkIfAllValuesMatch([file1, file2]);
    expect(result).toBe(true);
  });

  test('getMismatchFields should return only mismatched keys', () => {
    const file1Content = `key1=value1\nkey2=value2`;
    const file2Content = `key1=value1\nkey2=DIFFERENT`;

    const file1 = createTempFile(file1Content, '.properties');
    const file2 = createTempFile(file2Content, '.properties');

    const mismatches = getMismatchFields([file1, file2]);
    expect(mismatches).toEqual(['key2']);
  });

});


describe('Additional coverage tests', () => {
  test('parsePropertiesFile should ignore lines with no "="', () => {
    const content = `# comment\nNOSPLIT\nkey1=value1`;
    const file = createTempFile(content, '.properties');
    const result = parsePropertiesFile(file);
    expect(result).toEqual({ key1: 'value1' });
  });

  test('parseYamlFile should handle nested keys', () => {
    const ymlContent = `level1:\n  level2:\n    key: value\n`;
    const file = createTempFile(ymlContent, '.yml');
    const result = parseYamlFile(file);
    expect(result).toEqual({ 'level1.level2.key': 'value' });
  });

  test('parseFile should parse .yml files', () => {
    const ymlContent = `someKey: someValue`;
    const file = createTempFile(ymlContent, '.yml');
    const result = parseFile(file);
    expect(result).toEqual({ someKey: 'someValue' });
  });

  test('compareFileData should detect multiple mismatches', () => {
    const f1 = createTempFile(`a=1\nb=2`, '.properties');
    const f2 = createTempFile(`a=1\nb=3\nc=4`, '.properties');
    const { mismatchCount, mismatchDetails } = compareFileData([f1, f2]);

    expect(mismatchCount).toBe(2);
    expect(mismatchDetails.find(m => m.key === 'b').matched).toBe(false);
  });

  test('checkIfAllValuesMatch should return false on mismatch', () => {
    const f1 = createTempFile(`k=1`, '.properties');
    const f2 = createTempFile(`k=2`, '.properties');
    expect(checkIfAllValuesMatch([f1, f2])).toBe(false);
  });

  test('getMismatchFields should handle partial key sets', () => {
    const f1 = createTempFile(`x=1\ny=2`, '.properties');
    const f2 = createTempFile(`x=1`, '.properties');
    const mismatches = getMismatchFields([f1, f2]);
    expect(mismatches).toEqual(['y']);
  });
});
