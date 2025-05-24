import type { Voxel } from './Voxel';

/**
 * Represents a vertical span of voxels in a VXL file section.
 */
export interface Span {
  voxels: Voxel[];
  startIndex: number; // Starting Z index of this span, or similar marker
  endIndex: number;   // Ending Z index of this span, or count of voxels
  // Other properties like y, x_start, x_end might be part of how spans are organized
  // but the original Section.js just iterates `this.spans[n].voxels`.
  // This suggests `Span` objects are pre-populated with their Voxel arrays.
} 