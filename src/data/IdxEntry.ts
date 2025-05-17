export class IdxEntry {
  public filename: string = "";
  public offset: number = 0;
  public length: number = 0;
  public sampleRate: number = 0;
  public flags: number = 0;
  public chunkSize: number = 0; // Or whatever the actual type/use is, assuming number for now

  // constructor() {}
  // No explicit constructor needed if direct property assignment is done post-instantiation,
  // or if these default values are sufficient for initial state.
  // The original JS code `const a = new n.IdxEntry();` and then set properties.
} 