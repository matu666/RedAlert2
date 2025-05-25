import { IndexedBitmap } from "../../../data/Bitmap";
import { TextureAtlas } from "../../gfx/TextureAtlas";

export class ShpTextureAtlas {
  fromShpFile(shpFile) {
    let bitmaps = [];
    for (let i = 0; i < shpFile.numImages; i++) {
      const image = shpFile.getImage(i);
      bitmaps.push(new IndexedBitmap(image.width, image.height, image.imageData));
    }
    
    let atlas = new TextureAtlas();
    atlas.pack(bitmaps);
    this.images = bitmaps;
    this.atlas = atlas;
    return this;
  }

  getTextureArea(imageIndex) {
    return this.atlas.getImageRect(this.images[imageIndex]);
  }

  getTexture() {
    return this.atlas.getTexture();
  }

  dispose() {
    this.atlas.dispose();
  }
}
