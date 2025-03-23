# Automated testing with Jest 


## Run Your Tests
`npm init -y        # if you haven't created a package.json yet`
`npm install --save-dev jest`

`npm test`
or
`npx jest`


### Check jest.config.js for testing configuration

`npm test -- --coverage`


### Test Comparisons 

`node index.js ./test/config1.properties ./test/config1.yaml`

`node index.js ./test/config1.properties ./test/config2.yml`

`node index.js ./test/config1.properties ./test/config2.properties`

`node index.js ./test/config2.properties ./test/config2.yml`

`node index.js ./test/config3.txt ./test/config3.yml2`

`node index.js --format html --output report.html  ./test/config1.properties ./test/config2.yml`

`node index.js -f markdown -o report.md ./test/config1.properties ./test/config2.yml`

### NPM LINK Test

`properties-comparator ./test/config1.properties ./test/config1.yaml`

`properties-comparator ./test/config1.properties ./test/config2.yml`

`properties-comparator ./test/config1.properties ./test/config2.properties`

`properties-comparator ./test/config2.properties ./test/config2.yml`

`properties-comparator ./test/config3.txt ./test/config3.yml2`

`properties-comparator --format html --output report.html  ./test/config1.properties ./test/config2.yml`

`properties-comparator -f markdown -o report.md ./test/config1.properties ./test/config2.yml`


`properties-comparator ./test/config1.properties ./test/config2.yml ./test/config3.properties`

`properties-comparator -v ./test/config1.properties ./test/config2.yml ./test/config3.properties`


`properties-comparator -f html -o report.html ./test/config1.properties ./test/config1.yaml`

`properties-comparator -f html -o report.html ./test/config1.properties ./test/config2.yml`

`properties-comparator -f html -o report.html ./test/config1.properties ./test/config2.yml ./test/config3.properties`

`properties-comparator -f markdown -o report.md ./test/config1.properties ./test/config2.yml ./test/config3.properties`
