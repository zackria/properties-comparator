# Node.js YAML and Properties File Comparison Utility

## Overview

This utility parses and compares **.properties** and **.yml or .yaml (YAML)** files. It reads each file as key-value pairs, compares the values for each key across multiple files, and produces detailed comparison reports.

### Features:
- Parse **.properties** files into key-value objects.
- Parse **.yml or .yaml** (YAML) files into flattened key-value objects (supports nested keys).
- Compare key values across multiple files (both **.properties** and **.yml or .yaml**).
- Generate reports in multiple formats:
  - Console output with color-coded highlighting
  - HTML reports with CSS styling
  - Markdown reports
- Save reports to files or display in console
- Flexible command-line interface with options

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
node compareUtility.js [options] <filePath1> <filePath2> [<filePath3> ...]
```

### Command-Line Options
```
Options:
  --format, -f <format>   Output format: console, html, or markdown
  --output, -o <file>     Output file for html or markdown reports
```

### Examples
```bash
# Basic comparison with console output
node compareUtility.js file1.properties file2.yaml

# Generate HTML report and save to output.html
node compareUtility.js --format html --output output.html file1.properties file2.yaml

# Short form options
node compareUtility.js -f markdown -o report.md file1.properties file2.properties file3.yml
```

### Input Format
The properties files should follow the format:
```
key1=value1
key2=value2
# Comments are ignored
```

YAML files should follow standard YAML format. Nested structures will be flattened with dot notation:
```yaml
key1: value1
key2:
  nestedKey: nestedValue  # Will be accessible as "key2.nestedKey"
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

### `parseYamlFile(filePath)`

Parses a .yml or .yaml file into a flat key-value map using dot notation for nested keys.

#### Parameters:
- `filePath` (string): Path to the YAML file.

#### Returns:
- (Object): A flattened object containing key-value pairs from the YAML file.

#### Example:
```javascript
const data = parseYamlFile('/path/to/yaml/file');
console.log(data);
// Output: { 'key1': 'value1', 'key2.nestedKey': 'nestedValue' }
```

---

### `parseFile(filePath)`

Detects file extension and parses the file content into an object.

#### Parameters:
- `filePath` (string): Path to the file (.properties, .yml, or .yaml).

#### Returns:
- (Object): Parsed content as a key-value map, or {} if unsupported.

---

### `compareFileData(filePaths)`

Internal helper that compares key-value data from multiple files and returns structured results.

#### Parameters:
- `filePaths` (string[]): Array of file paths.

#### Returns:
- (Object): An object containing mismatch count and detailed comparison information.

---

### `checkIfAllValuesMatch(filePaths)`

Checks if all values match across the provided files.

#### Parameters:
- `filePaths` (string[]): Array of file paths.

#### Returns:
- (boolean): True if all properties match across all files, false otherwise.

---

### `getMismatchFields(filePaths)`

Returns a list of fields (keys) that do not match across the provided files.

#### Parameters:
- `filePaths` (string[]): Array of file paths.

#### Returns:
- (string[]): List of mismatched keys.

---

### `generateHtmlReport(filePaths, comparisonData)`

Generates an HTML report for the comparison results.

#### Parameters:
- `filePaths` (string[]): Array of file paths that were compared.
- `comparisonData` (Object): The output from compareFileData function.

#### Returns:
- (string): HTML document as string.

---

### `generateMarkdownReport(filePaths, comparisonData)`

Generates a Markdown report for the comparison results.

#### Parameters:
- `filePaths` (string[]): Array of file paths that were compared.
- `comparisonData` (Object): The output from compareFileData function.

#### Returns:
- (string): Markdown document as string.

---

### `compareFiles(filePaths, options)`

Compares properties/keys across multiple files and generates a report based on options.

#### Parameters:
- `filePaths` (string[]): Array of file paths.
- `options` (Object): Options for comparison output.
  - `format` (string): Output format ('console', 'html', or 'markdown').
  - `outputFile` (string): Path to save the report (for html and markdown).

#### Example:
```javascript
// Compare with console output
compareFiles(['file1.properties', 'file2.yaml']);

// Generate HTML report
compareFiles(['file1.properties', 'file2.yaml'], { 
  format: 'html', 
  outputFile: 'report.html' 
});
```

---

### `run()`

CLI entry point. Parses command-line arguments and runs the comparison.

---

## Output Formats

### Console Output
The default output format provides:
- A table showing all keys and their values across files
- Highlighted mismatched rows for easy identification
- A summary of mismatched keys

### HTML Report
Generates a visually appealing HTML report with:
- CSS styling
- Color-coded cells for matches and mismatches
- Summary section with quick statistics
- Responsive design

### Markdown Report
Creates a Markdown document with:
- File list with paths
- Comparison table
- Summary section with mismatched keys highlighted

---

## Error Handling

- **No File Paths Provided**: Logs an error and exits.
- **Only One File Provided**: Logs an error about needing at least two files and exits.
- **Missing Files**: Logs missing files and exits.
- **Unsupported File Extensions**: Logs a warning and treats as empty file.
- **Invalid YAML**: Logs error details and treats as empty file.
- **Invalid Format Option**: Falls back to console output with warning.

---

## Example Scenarios

### Basic Comparison

#### Command:
```bash
node compareUtility.js file1.properties file2.properties
```

#### Output:
```
Comparing properties/keys across files:

┌─────────┬─────┬────────────┬────────────┐
│ (index) │ Key │ Matched    │ ...        │
├─────────┼─────┼────────────┼────────────┤
│ 0       │ ... │ 'Yes'      │ ...        │
│ 1       │ ... │ 'No'       │ ...        │
└─────────┴─────┴────────────┴────────────┘

=== Highlighted Mismatched Rows ===
Key: key2 | File 1: value2 | File 2: value3

=== Summary ===
1 key(s) have mismatched values.
Mismatched keys: key2
```

### HTML Report Generation

#### Command:
```bash
node compareUtility.js -f html -o report.html file1.properties file2.yaml
```

#### Output:
```
HTML report saved to: report.html
```

### Markdown Report Generation

#### Command:
```bash
node compareUtility.js -f markdown -o report.md file1.properties file2.properties
```

#### Output:
```
Markdown report saved to: report.md
```

---

## Dependencies

- `fs` module (Node.js File System)
- `path` module (Node.js Path)
- `js-yaml` module (YAML parsing)
- `chalk` module (Terminal styling)

---

## Limitations

- Assumes properties are simple key-value pairs separated by `=`
- Does not support multi-line properties in .properties files
- Flattens all nested YAML structures to dot notation

---

## License

This utility is licensed under the MIT License.

---

## Author

[Zack Dawood](http://www.zackdawood.com)
