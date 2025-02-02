# Node.js YAML and Properties File Comparison Utility

## Overview

This utility parses and compares **.properties** and **.yml or .yaml (YAML)** files. It reads each file as key-value pairs, compares the values for each key across multiple files, and logs the results.

### Features:
- Parse **.properties** files into key-value objects.
- Parse **.yml or .yaml** (YAML) files into flattened key-value objects (supports nested keys).
- Compare key values across multiple files (both **.properties** and **.yml or .yaml**).
- Log detailed comparison results, including mismatches.

---

## Installation

### Prerequisites
- Node.js installed on your system.
- Files in valid .properties or .yaml or .yml format.

---

## Usage

### Running the Script
Run the script using Node.js with file paths provided as command-line arguments:

```bash
node script.js <filePath1> <filePath2> [<filePath3> ...]
```

### Input Format
The properties files should follow the format:
```
key1=value1
key2=value2
# Comments are ignored
```

---

## Functions

### `parsePropertiesFile(filePath)`

Parses a properties file and returns an object representation of the key-value pairs.

#### Parameters:
- `filePath` (string): Path to the properties file.

#### Returns:
- (Object): An object containing key-value pairs from the properties file.

#### Example:
```javascript
const properties = parsePropertiesFile('/path/to/properties/file');
console.log(properties);
// Output: { key1: 'value1', key2: 'value2' }
```

---

### `compareProperties(filePaths)`

Compares properties across multiple properties files and logs the results.

#### Parameters:
- `filePaths` (string[]): Array of file paths to be compared.

#### Returns:
- None. Outputs comparison results to the console.

#### Example:
```bash
node script.js file1.properties file2.yaml file3.yml
```

#### Output Example:
```text
Comparing properties across files:

Key: key1 - Values match across all files.
Key: key2 - Mismatched values:
  File 1: value1
  File 2: value2
  File 3: value3
```

---

### Runtime Input Handling

The script expects file paths as command-line arguments:
- Extracted from `process.argv`.
- If no file paths are provided, it displays an error and exits:
  ```
  Please provide the paths to the properties files as command-line arguments.
  ```
- Verifies the existence of all specified files. If any file is missing:
  ```
  One or more properties files are missing. Ensure all specified properties files exist.
  ```

---

### Additional Functions

#### `parseFile(filePath)`
Detects file extension and parses `.properties`, `.yaml`, or `.yml` files. Returns an object with flattened key-value pairs or `{}` if unsupported.

#### `parseYamlFile(filePath)`
Parses a `.yml` or `.yaml` file into a flat key-value map. Returns an object with dot-notation keys for nested values.

#### `compareFileData(filePaths)`
Internally compares parsed data from multiple files. Returns an object with `mismatchCount` and detailed info for each key.

#### `checkIfAllValuesMatch(filePaths)`
Checks if all keys match across all provided files. Returns a boolean.

#### `getMismatchFields(filePaths)`
Returns an array of keys whose values differ across files.

#### `compareFiles(filePaths)`
Logs detailed comparison of key-value pairs across files. Prints a summary indicating mismatched keys.

#### `run()`
CLI entry point. Reads file paths, checks existence, and calls `compareFiles`.

---

## Error Handling

- **No File Paths Provided**: Logs an error and exits.
- **Missing Files**: Logs missing files and exits.
- **Empty or Malformed Properties Files**: Skips invalid lines.

---

## Example Properties Files

### File 1 (`file1.properties`):
```
key1=value1
key2=value2
```

### File 2 (`file2.properties`):
```
key1=value1
key2=value3
```

---

## Sample Execution

### Command:
```bash
node script.js file1.properties file2.properties
```

### Output:
```text
Comparing properties across files:

Key: key1 - Values match across all files.
Key: key2 - Mismatched values:
  File 1: value2
  File 2: value3
```

---

## Dependencies

- `fs` module (Node.js File System)
- `js-yaml` module (Node.js YAML library)

---

## Limitations

- Assumes properties are simple key-value pairs separated by `=`.
- Ignores keys without a corresponding value.
- Does not support multi-line properties.

---

## License

This script is licensed under the MIT License.

---

## Author

[Zack Dawood](http://www.zackdawood.com)
