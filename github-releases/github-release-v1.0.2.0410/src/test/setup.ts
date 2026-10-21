import '@testing-library/jest-dom'
import { vi, beforeEach } from 'vitest'

// Mock localStorage for testing environment
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

// Mock sessionStorage
const sessionStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
};

Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock,
  writable: true,
});

// Mock window.location
Object.defineProperty(window, 'location', {
  value: {
    hostname: 'localhost',
    href: 'http://localhost:5173',
    origin: 'http://localhost:5173',
    pathname: '/',
    search: '',
    hash: '',
  },
  writable: true,
});

// Mock window.confirm and window.alert
Object.defineProperty(window, 'confirm', {
  value: vi.fn(() => true),
  writable: true,
});

Object.defineProperty(window, 'alert', {
  value: vi.fn(),
  writable: true,
});

// Mock window.prompt
Object.defineProperty(window, 'prompt', {
  value: vi.fn(() => null),
  writable: true,
});

// Mock fetch
global.fetch = vi.fn();

// Mock import.meta.env
Object.defineProperty(import.meta, 'env', {
  value: {
    NODE_ENV: 'test',
    VITE_DEV_TOKEN: 'test-token',
  },
  writable: true,
});

// Reset all mocks before each test
beforeEach(() => {
  vi.clearAllMocks();
  localStorageMock.getItem.mockReturnValue(null);
  localStorageMock.setItem.mockImplementation(() => {});
  localStorageMock.removeItem.mockImplementation(() => {});
  localStorageMock.clear.mockImplementation(() => {});
  
  sessionStorageMock.getItem.mockReturnValue(null);
  sessionStorageMock.setItem.mockImplementation(() => {});
  sessionStorageMock.removeItem.mockImplementation(() => {});
  sessionStorageMock.clear.mockImplementation(() => {});
  
  (global.fetch as any).mockResolvedValue({
    ok: true,
    json: async () => ({}),
    text: async () => '',
  });
});