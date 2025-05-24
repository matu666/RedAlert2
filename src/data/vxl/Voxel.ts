export interface Voxel {
  x: number;
  y: number;
  z: number;
  colorIndex: number; // Index into a palette
  normalIndex?: number; // Index for precomputed normals, or normal itself
  // Add other properties as discovered from VXL format specifics or usage
  // For example, some VXL formats might store light intensity or other flags per voxel.
} 