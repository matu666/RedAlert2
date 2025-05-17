/**
 * Custom error type for I/O related errors, e.g., file not found, read error.
 */
export class IOError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "IOError";
    // If targeting ES5 or an environment without proper Error subclassing support:
    // Object.setPrototypeOf(this, IOError.prototype);
  }
} 