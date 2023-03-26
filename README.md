## Documentation
TODO. You can read tests and source code for now.

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
