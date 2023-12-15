/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
module.exports = {
    preset: 'ts-jest/presets/default-esm',
    testEnvironment: 'node',
    extensionsToTreatAsEsm: ['.ts', '.tsx'],
    moduleNameMapper: {
        "@atomrx/atom": "<rootDir>/../atom/src",
        "@atomrx/utils": "<rootDir>/../utils/src",
        "@atomrx/lens": "<rootDir>/../lens/src",
        "@atomrx/form": "<rootDir>/../form/src",
        "@atomrx/react": "<rootDir>/../react/src",
        "@atomrx/wrapped": "<rootDir>/../wrapped/src",
    },
    globals: {
        'ts-jest': {
            useESM: true,
        },
    },
}
