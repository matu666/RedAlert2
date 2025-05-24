import type { TileSet } from "./TileSet"; // Forward declaration
import type { TileSetAnim } from "./TileSetAnim"; // Forward declaration
import type { TmpFile } from "../../data/TmpFile";
// import type { TmpImage } from "../../data/TmpImage"; // TmpImage might not exist yet, error is fine for now

export class TileSetEntry {
  public owner: TileSet;
  public index: number; // Index within the owner TileSet
  public files: TmpFile[] = []; // TMP files associated with this tile entry
  public animation?: TileSetAnim;

  constructor(owner: TileSet, indexInSet: number) {
    this.owner = owner;
    this.index = indexInSet;
  }

  addFile(file: TmpFile): void {
    this.files.push(file);
  }

  setAnimation(animation: TileSetAnim): void {
    this.animation = animation;
  }

  getAnimation(): TileSetAnim | undefined {
    return this.animation;
  }

  /**
   * Gets a TmpFile, potentially randomly selecting from available files.
   * This method mirrors the original JavaScript logic, including a potentially erroneous
   * usage of the second parameter as a function.
   * @param subTileIndex The desired sub-tile index within the TmpFile.
   * @param originalTParam Corresponds to the 'frame' number passed from TileSets.js, which was then used as a function.
   * @param preferNonDamaged Defaults to false. If true and the selected TmpFile's specific image is damaged,
   *                         it tries to return the first or second file (index 0 or 1) instead.
   * @returns A TmpFile or undefined if no files are available.
   */
  getTmpFile(
    subTileIndex: number,
    originalTParam: number, // Changed from randomIndexSelector to reflect original usage where 'frame' (a number) was passed
    preferNonDamaged: boolean = false,
  ): TmpFile | undefined {
    if (this.files.length > 0) {
      // Original JS: var r = this.files[t(0, this.files.length - 1)];
      // Here, originalTParam was 'frame' (a number) but used as a function.
      // We replicate this potentially erroneous call using 'as any'.
      const selectedFileIndex = (originalTParam as any)(0, this.files.length - 1);
      let fileToReturn = this.files[selectedFileIndex];

      if (
        preferNonDamaged &&
        fileToReturn && // Ensure fileToReturn is not undefined after problematic selectedFileIndex
        subTileIndex < fileToReturn.images.length &&
        (fileToReturn.images[subTileIndex] as any).hasDamagedData // Use 'as any' to access property like original JS
      ) {
        const fallbackIndex = Math.min(preferNonDamaged ? 1 : 0, this.files.length - 1);
        return this.files[fallbackIndex];
      }
      return fileToReturn;
    }
    return undefined;
  }
} 