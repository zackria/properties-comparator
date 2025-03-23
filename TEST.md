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

