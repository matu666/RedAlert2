export class StorageQuotaError extends Error {
  public cause?: Error; // Optionally store the cause if provided

  constructor(message: string = "Storage quota exceeded", cause?: Error) {
    super(message);
    this.name = "StorageQuotaError";
    if (cause) {
      this.cause = cause;
    }
    Object.setPrototypeOf(this, StorageQuotaError.prototype);
  }
} 