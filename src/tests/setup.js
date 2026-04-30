import '@testing-library/jest-dom'

// jsdom doesn't implement IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor(callback) { this.callback = callback }
  observe() {}
  unobserve() {}
  disconnect() {}
}
