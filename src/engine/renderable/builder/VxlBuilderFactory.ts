import { VxlBatchedBuilder } from "./VxlBatchedBuilder";
import { VxlNonBatchedBuilder } from "./VxlNonBatchedBuilder";
import { VxlGeometryPool } from "./vxlGeometry/VxlGeometryPool";
import { Camera } from "three";

export class VxlBuilderFactory {
  constructor(
    private vxlGeometryPool: VxlGeometryPool,
    private useBatching: boolean,
    private camera: Camera
  ) {}

  create(
    vxlData: ArrayBuffer,
    palette: Uint8Array,
    shadowQuality: number,
    flyerHelperMode: number
  ): VxlBatchedBuilder | VxlNonBatchedBuilder {
    return this.useBatching
      ? new VxlBatchedBuilder(
          vxlData,
          palette,
          shadowQuality,
          flyerHelperMode,
          this.vxlGeometryPool,
          this.camera
        )
      : new VxlNonBatchedBuilder(
          vxlData,
          palette,
          flyerHelperMode,
          this.vxlGeometryPool,
          this.camera
        );
  }
}