import { IniSection } from './IniSection';

export class IniParser {
  // Regex to match section headers or key-value pairs
  // Group 1: Section name (e.g., "SectionName" from "[SectionName]")
  // Group 2: Key (e.g., "Key" from "Key=Value")
  // Group 3: Value part including equals (e.g., "=Value" from "Key=Value", or empty if "Key")
  // Group 4: Value itself (e.g., "Value" from "Key=Value", or empty if "Key=")
  // Updated Regex: Correctly captures key, and value (even if empty after equals)
  private readonly lineRegex = /^\s*\[([^\]]+)\]\s*$|^\s*([^;=#][^=]*?)\s*(?:=\s*(.*)?)?\s*$/;
  private readonly commentRegex = /^\s*[;#]/;
  private readonly arrayKeyRegex = /^(.*)\[\]$/;

  public parse(iniString: string): Record<string, IniSection> {
    const sections: Record<string, IniSection> = {};
    let currentSectionName: string = "__ROOT__"; // Default section for keys before any [section] header
    sections[currentSectionName] = new IniSection(currentSectionName);
    let currentSectionObj: IniSection = sections[currentSectionName];

    const lines = iniString.split(/[\r\n]+/g);

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine || this.commentRegex.test(trimmedLine)) {
        continue;
      }

      // Match behavior with original parser: allow trailing comments after section headers
      // Example: "[APSplash] ; comment" should be treated as a valid section header.
      let processedLine = trimmedLine;
      if (processedLine.startsWith('[')) {
        processedLine = processedLine.replace(/]\s*(\/\/|;|#).*$/, ']');
      }

      const match = processedLine.match(this.lineRegex);

      if (match) {
        if (match[1] !== undefined) { // Section header: [SectionName]
          currentSectionName = this.stripQuotesAndComments(match[1]);
          if (!sections[currentSectionName]) {
            sections[currentSectionName] = new IniSection(currentSectionName);
          }
          currentSectionObj = sections[currentSectionName];
        } else if (match[2] !== undefined) { // Key-value pair or Key only
          let key = this.stripQuotesAndComments(match[2]);
          // match[3] will be undefined if there is no '=' sign (key only)
          // match[3] will be an empty string if 'key=' (empty value)
          // match[3] will be the value string if 'key=value'
          let value = match[3] !== undefined ? this.stripQuotesAndComments(match[3]) : ""; // Treat key-only as empty string value
          
          const arrayKeyMatch = key.match(this.arrayKeyRegex);
          if (arrayKeyMatch) {
            key = arrayKeyMatch[1]; // Actual key name without []
            const existingEntry = currentSectionObj.get(key);
            if (Array.isArray(existingEntry)) {
              existingEntry.push(value);
            } else if (existingEntry !== undefined) {
              currentSectionObj.set(key, [existingEntry, value]);
            } else {
              currentSectionObj.set(key, [value]);
            }
          } else {
            currentSectionObj.set(key, value);
          }
        }
      } else {
        // Line does not match section or key=value, could be malformed or continuation (not typical INI)
        // console.warn(`[IniParser] Skipping malformed line: ${trimmedLine}`);
      }
    }

    // The complex dot-separated key post-processing from the original parser is omitted here.
    // That logic was to refactor a flat object into nested objects based on dot notation in keys/section names.
    // Our IniSection class itself can store nested sections, and IniFile will likely manage this hierarchy
    // by creating IniSection instances for names like "Parent.Child" directly or by iterating.
    // Standard INI parsing usually results in sections, and keys within them. Complex nesting from flat
    // keys like "Parent.child.key=value" under a [RootSection] is non-standard and better handled by specific loader logic.

    return sections;
  }

  /**
   * Strips leading/trailing whitespace, removes surrounding quotes (single or double),
   * and removes trailing comments (starting with ; or #).
   * This is a simplified version of the original 'unsafe' method, focusing on common INI value cleanup.
   */
  private stripQuotesAndComments(str: string): string {
    let currentStr = str.trim();

    // Remove quotes if string is quoted
    if ( (currentStr.startsWith('"') && currentStr.endsWith('"')) || 
         (currentStr.startsWith('\'') && currentStr.endsWith('\'')) ) {
      currentStr = currentStr.substring(1, currentStr.length - 1);
    }

    // Remove trailing comments. A comment starts with ; or #, unless it's within quotes (handled above).
    // This regex looks for ; or # NOT preceded by a backslash (for potential escaping, though not fully handled here)
    // and takes everything before it.
    // For simplicity, we assume standard INI where comments are line-based or clearly after values.
    // A more robust solution would consider escaped comment characters if that's a feature of the INI dialect.
    const commentMatch = currentStr.match(/^([^;#]*)(?:[;#]|$)/);
    if (commentMatch && commentMatch[1] !== undefined) {
      currentStr = commentMatch[1].trim();
    }
    
    // The original 'unsafe' also had a peculiar escape handling for \, ;, #.
    // Example: `\a` became `\\a`, but `\;` became `;`.
    // This is non-standard. Standard INI typically doesn't have complex in-value escaping beyond quotes.
    // If such specific escaping is needed, this method would need to replicate that exact logic.
    // For now, this simplified version should cover most standard INI cases.

    return currentStr;
  }
} 