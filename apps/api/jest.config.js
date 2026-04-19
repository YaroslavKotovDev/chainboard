/** @type {import('jest').Config} */
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir:              'src',
  testRegex:            '.*\\.spec\\.ts$',
  transform:            { '^.+\\.(t|j)s$': 'ts-jest' },
  collectCoverageFrom:  ['**/*.(t|j)s'],
  coverageDirectory:    '../coverage',
  testEnvironment:      'node',
  moduleNameMapper: {
    '^@chainboard/types$':  '<rootDir>/../../../packages/types/src/index.ts',
    '^@chainboard/utils$':  '<rootDir>/../../../packages/utils/src/index.ts',
  },
};
