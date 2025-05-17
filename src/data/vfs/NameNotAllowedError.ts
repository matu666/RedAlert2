import { IOError } from "./IOError";

export class NameNotAllowedError extends IOError {
  constructor(message: string = "File name is not allowed", cause?: Error) {
    super(message); // IOError constructor takes a message
    this.name = "NameNotAllowedError";
    if (cause && this instanceof Error) { // Ensure cause is set on Error instance
        (this as any).cause = cause; 
    }
    Object.setPrototypeOf(this, NameNotAllowedError.prototype);
  }
} 