
## Link your package locally for testing:

###  Test Locally 
`npm link`

`npm unlink -g`

`npm link properties-comparator`

## Now you can run the script globally using:

```properties-comparator <filePath1> <filePath2>```


## Publish the Package
### Login to npm (if you haven't already):
`npm login`

### Publish the package:
`npm publish`


###  Install the Package Globally
Once published, you (or anyone) can install the package globally using:
`npm install -g properties-comparator`

### Check [Documentation](DOCUMENTATION.md) for more details



```bash
npm view properties-comparator versions --json && npm dist-tag ls properties-comparator || true


# show available published versions
npm view properties-comparator versions --json

# show which version is tagged as "latest"
npm dist-tag ls properties-comparator

# show the single latest version
npm view properties-comparator version

# fetch raw registry JSON (inspect dist-tags)
curl -s https://registry.npmjs.org/properties-comparator | jq '.\"dist-tags\"'

npm login
npm publish

npm dist-tag add properties-comparator@1.0.7 latest
```