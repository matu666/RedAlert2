import { SequenceType } from './SequenceType';
import { IniSection } from '@/data/IniSection';

const FACING_MAP = new Map([
  ['E', 5],
  ['S', 3], 
  ['W', 1],
  ['N', 7]
]);

export class SequenceReader {
  /**
   * Reads an INI subsection that describes infantry sequences.
   * In the original implementation the function received the raw INI section
   * object. After the TypeScript migration our INI abstraction wraps the
   * key/value pairs in {@link IniSection}. This helper therefore accepts **either**
   * an {@link IniSection} instance or the plain `Map<string,string>` that was
   * used previously and normalises it into an iterable {@link Map} before
   * processing.
   */
  readIni(section: IniSection | Map<string, string>): Map<SequenceType, any> {
    // Normalise to a Map so the rest of the logic stays unchanged
    const entries: Map<string, string> = section instanceof IniSection ? (section.entries as Map<string, string>) : section;

    const sequences = new Map<SequenceType, any>();

    for (const [key, value] of entries) {
      const type = SequenceType[key];
      if (type !== undefined && typeof value === 'string') {
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