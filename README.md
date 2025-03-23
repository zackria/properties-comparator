# properties-comparator
This utility parses and compares **.properties** and **.yml or .yaml (YAML)** files. It reads each file as key-value pairs, compares the values for each key across multiple files, and produces detailed comparison reports.

Utility is available as NPM Package [https://www.npmjs.com/package/properties-comparator](https://www.npmjs.com/package/properties-comparator)

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


###  Install the Package
`npm install -g properties-comparator`


## Now you can run the script globally using:

```properties-comparator <filePath1> <filePath2>```


## HTML Report 
``` properties-comparator--format html --output report.html file1.properties file2.yaml ```

## Markdown Report 
``` properties-comparator -f markdown -o report.md file1.properties file2.yaml ```


## Compiled on npm@11.1.0 & node v22.13.0
`npm install -g npm@11.1.0`

### Check [Documentation](DOCUMENTATION.md) for more details

## Terminal View

![alt text](./screenshots/TerminalTable.png)


## HTML View

![alt text](./screenshots/HtmlReport.png)

## Markdown View

![alt text](./screenshots/MarkDownReport.png)

## Well Tested with 90+% code coverage

![alt text](./screenshots/TestCoverage.png)
