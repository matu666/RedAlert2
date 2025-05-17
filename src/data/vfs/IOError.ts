export class IOError extends Error {
  constructor(message?: string) {
    super(message);
    this.name = "IOError";

    // Set the prototype explicitly to allow instanceof checks
    // See: https://github.com/Microsoft/TypeScript/wiki/Breaking-Changes#extending-built-ins-like-error-array-and-map-may-no-longer-work
    Object.setPrototypeOf(this, IOError.prototype);
  }
} 