export class CellTagsReader {
  read(entries: Map<string, number>, version: number): Array<{tagId: number, coords: {x: number, y: number}}> {
    const result: Array<{tagId: number, coords: {x: number, y: number}}> = [];
    
    for (const [key, tagId] of entries) {
      const coords = this.readCoords(Number(key), version);
      result.push({ tagId, coords });
    }
    
    return result;
  }

  readCoords(key: number, version: number): {x: number, y: number} {
    const divisor = version < 4 ? 128 : 1000;
    return {
      x: key % divisor,
      y: Math.floor(key / divisor)
    };
  }
}