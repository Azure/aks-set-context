// Jest setup file to handle fs mocking
const fs = require('fs')

// Mock chmodSync to avoid the "Cannot redefine property" error
Object.defineProperty(fs, 'chmodSync', {
   value: jest.fn(),
   writable: true,
   configurable: true
})
