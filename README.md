## Documentation
Docs available here: [docs](https://github.com/breeeew/atomar/tree/master/docs)

Also, I recommend you to read tests and source code for deeper knowledge.

## Development and publishing

Use lerna to manage the packages.

### Install and link dependencies
```bash
npx lerna bootstrap
```

### Compile
```bash
npx lerna run compile
```

### Test
```bash
npx lerna run test
```

### Publish
```bash
git commit ...
npx lerna version
npx lerna publish from-package
```
