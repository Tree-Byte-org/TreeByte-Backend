// Global test setup
global.console = {
  ...console,
  // Suppress console.log in tests
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};