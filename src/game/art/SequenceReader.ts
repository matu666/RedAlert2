import { SequenceType } from './SequenceType';

const FACING_MAP = new Map([
  ['E', 5],
  ['S', 3], 
  ['W', 1],
  ['N', 7]
]);

export class SequenceReader {
  readIni(entries: Map<string, string>): Map<SequenceType, any> {
    const sequences = new Map();
    
    for (const [key, value] of entries) {
      const type = SequenceType[key];
      if (type !== undefined) {
        const parts = value.split(',');
        const sequence = {
          type,
          startFrame: Number(parts[0]),
          frameCount: Number(parts[1]), 
          facingMult: Number(parts[2]),
          onlyFacing: parts[3] ? FACING_MAP.get(parts[3]) : undefined
        };
        sequences.set(type, sequence);
      }
    }
    
    return sequences;
  }
}