import type { Matrix4 } from 'three';

/**
 * Represents a section within an HVA file, typically corresponding to a VXL model part.
 */
export class Section {
  /**
   * The name of the section, usually up to 15 characters plus a null terminator.
   * This often matches a part name in a VXL file (e.g., "TURRET", "BARREL").
   */
  public name: string = "";

  /**
   * An array of transformation matrices, one for each frame of the animation.
   * Each Matrix4 defines the position, rotation, and scale of this section for a given frame.
   */
  public matrices: Matrix4[] = [];

  constructor() {
    // Properties are initialized with defaults.
  }
} 