// jest.config.js
module.exports = {
    // Tell Jest to collect coverage information
    collectCoverage: true,
    // Or specify which files to collect coverage from
    collectCoverageFrom: ['src/**/*.js'], // adjust for your source folder
  
    // Optionally set coverage thresholds
    coverageThreshold: {
      global: {
        branches: 80,
        functions: 80,
        lines: 80,
        statements: 80,
      },
    },
  
    // Customize output directory or coverage reporters if desired
    coverageDirectory: 'coverage',
    coverageReporters: ['json', 'lcov', 'text', 'clover'],
  };
  