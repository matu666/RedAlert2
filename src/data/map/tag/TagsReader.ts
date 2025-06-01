import { TagRepeatType } from './TagRepeatType';

export class TagsReader {
  read(entries: Map<string, string>): Array<{
    id: string;
    repeatType: number;
    name: string;
    triggerId: string;
  }> {
    const result: Array<{
      id: string;
      repeatType: number;
      name: string;
      triggerId: string;
    }> = [];

    for (const [id, value] of entries) {
      const parts = value.split(',');
      
      if (parts.length < 3) {
        console.warn(`Invalid tag ${id}=${value}. Skipping.`);
        continue;
      }

      const repeatType = Number(parts[0]);
      
      if (TagRepeatType[repeatType] === undefined) {
        console.warn(`Invalid repeat value ${repeatType} for tag id ${id}. Skipping.`);
        continue;
      }

      result.push({
        id,
        repeatType,
        name: parts[1],
        triggerId: parts[2]
      });
    }

    return result;
  }
}