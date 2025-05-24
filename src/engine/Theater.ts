import { TileSets } from '../game/theater/TileSets';
import { PaletteType } from './type/PaletteType'; // Assuming PaletteType.ts will be in ./type/
import type { TheaterType, TheaterSettings } from './TheaterType'; // Assuming TheaterType.ts exists
import type { Palette } from '../data/Palette';
import type { LazyResourceCollection } from './LazyResourceCollection';
import type { TmpFile } from '../data/TmpFile';
import type { IniFile } from '../data/IniFile';
import type { FileSystem } from '../data/vfs/FileSystem'; // For TileSets.loadTileData, will be 'any' for now if not found

export class Theater {
  public type: TheaterType;
  public settings: TheaterSettings;
  private palettes: LazyResourceCollection<Palette>; // Assuming PaletteCollection is LazyResourceCollection<Palette>
  public isoPalette: Palette;
  public ovlPalette: Palette;
  public unitPalette: Palette;
  public animPalette: Palette;
  public libPalette: Palette;
  public tileSets: TileSets;

  static factory(
    type: TheaterType,
    theaterIni: IniFile, // Type for theaterIni
    settings: TheaterSettings,
    tileDataCollection: any, // Type for tileDataCollection, originally TmpFileCollection
    palettesCollection: LazyResourceCollection<Palette>,
  ): Theater {
    const isoPalette = palettesCollection.get(settings.isoPaletteName);
    if (!isoPalette) {
      throw new Error(`Missing palette "${settings.isoPaletteName}"`);
    }
    const overlayPalette = palettesCollection.get(settings.overlayPaletteName);
    if (!overlayPalette) {
      throw new Error(`Missing palette "${settings.overlayPaletteName}"`);
    }
    const unitPalette = palettesCollection.get(settings.unitPaletteName);
    if (!unitPalette) {
      throw new Error(`Missing palette "${settings.unitPaletteName}"`);
    }
    const animPalette = palettesCollection.get("anim.pal");
    if (!animPalette) {
      throw new Error("Missing anim palette");
    }
    const libPalette = palettesCollection.get(settings.libPaletteName);
    if (!libPalette) {
      throw new Error("Missing lib palette " + settings.libPaletteName);
    }

    const tileSetsInstance = new TileSets(theaterIni);
    // Assuming tileDataCollection is the VFS or a similar interface expected by loadTileData
    tileSetsInstance.loadTileData(tileDataCollection as FileSystem, settings.extension);

    return new Theater(
      type,
      settings,
      palettesCollection,
      isoPalette,
      overlayPalette,
      unitPalette,
      animPalette,
      libPalette,
      tileSetsInstance,
    );
  }

  constructor(
    type: TheaterType,
    settings: TheaterSettings,
    palettes: LazyResourceCollection<Palette>,
    isoPalette: Palette,
    ovlPalette: Palette,
    unitPalette: Palette,
    animPalette: Palette,
    libPalette: Palette,
    tileSets: TileSets,
  ) {
    this.type = type;
    this.settings = settings;
    this.palettes = palettes;
    this.isoPalette = isoPalette;
    this.ovlPalette = ovlPalette;
    this.unitPalette = unitPalette;
    this.animPalette = animPalette;
    this.libPalette = libPalette;
    this.tileSets = tileSets;
  }

  getPalette(type: PaletteType, customPaletteName?: string): Palette {
    switch (type) {
      case PaletteType.Anim:
        return this.animPalette;
      case PaletteType.Overlay:
        return this.ovlPalette;
      case PaletteType.Unit:
        return this.unitPalette;
      case PaletteType.Custom:
        if (customPaletteName === "lib") return this.libPalette;
        if (!customPaletteName) throw new Error('Custom palette name required for PaletteType.Custom');
        const customPalette = this.palettes.get(customPaletteName + ".pal");
        if (!customPalette) {
          throw new Error(`Custom palette "${customPaletteName}" not found`);
        }
        return customPalette;
      default:
        // Original code had: `r.PaletteType.Iso; return this.isoPalette;`
        // Assuming PaletteType.Iso was the intended default if nothing else matched.
        return this.isoPalette;
    }
  }
}
