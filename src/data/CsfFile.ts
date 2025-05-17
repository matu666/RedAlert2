import { DataStream } from './DataStream';
import { VirtualFile } from './vfs/VirtualFile';

// STRW in little-endian (W RTS)
const strwChars = Array.from("STRW");
const CSF_LABEL_HAS_VALUE_MAGIC = new Uint32Array(new Uint8Array(strwChars.map((e: string) => e.charCodeAt(0)).reverse()).buffer)[0];

const xorDecodeArray = (arr: Uint8Array): Uint8Array => {
  // In the original code, it's `~e >>> 0`. 
  // `~e` performs bitwise NOT. `>>> 0` converts to unsigned 32-bit int.
  // For Uint8Array, simple bitwise NOT should suffice for each byte if that's the intent.
  // However, the original mapping suggests each *byte* is inverted.
  return arr.map(byte => ~byte & 0xFF); 
};

const byteArrayToUnicodeString = (arr: Uint8Array): string => {
  let result = "";
  for (let i = 0; i < arr.length; i += 2) {
    // CSF files use little-endian UTF-16 (UCS-2 subset typically)
    result += String.fromCharCode(arr[i] | (arr[i + 1] << 8));
  }
  return result;
};

export enum CsfLanguage {
  EnglishUS = 0,
  EnglishUK = 1,
  German = 2,
  French = 3,
  Spanish = 4,
  Italian = 5,
  Japanese = 6,
  Jabberwockie = 7, // Typically a placeholder/test language
  Korean = 8,
  Unknown = 9, // Original had 9 for unknown, used in some files
  // Tiberian Sun and RA2 also use specific numbers for Chinese that might not be contiguous
  ChineseCN = 100, // Value used in some community tools/seen in files
  ChineseTW = 101, // Value used in some community tools/seen in files
  // Add other languages if known from specific game versions
}

export const csfLocaleMap = new Map<CsfLanguage, string>([
  [CsfLanguage.EnglishUS, "en-US"],
  [CsfLanguage.EnglishUK, "en-GB"],
  [CsfLanguage.German, "de-DE"],
  [CsfLanguage.French, "fr-FR"],
  [CsfLanguage.Spanish, "es-ES"],
  [CsfLanguage.Italian, "it-IT"],
  [CsfLanguage.Japanese, "ja-JP"],
  [CsfLanguage.Korean, "ko-KR"],
  [CsfLanguage.ChineseCN, "zh-CN"],
  [CsfLanguage.ChineseTW, "zh-TW"],
  // Jabberwockie usually doesn't have a standard locale
]);

export class CsfFile {
  public language: CsfLanguage = CsfLanguage.Unknown;
  public data: { [key: string]: string } = {}; // Store labels and their string values

  constructor(virtualFile?: VirtualFile) {
    if (virtualFile) {
      this.fromVirtualFile(virtualFile);
    }
  }

  public fromVirtualFile(file: VirtualFile): void {
    const stream = file.stream;
    if (!stream) {
      console.error("[CsfFile] VirtualFile does not have a valid stream.");
      return;
    }
    console.log(`[CsfFile] Parsing CSF file: ${file.filename}`);

    // CSF Header Structure:
    // char[4] csfMagic = " CSF" (0x20465343 in little-endian)
    // int32 version = 3 (or 2 for older)
    // int32 numLabels
    // int32 numValues (unused or lang count? typically same as numLabels)
    // int32 language (unused or 0, real lang is in each label or end)
    // int32 reserved (or actual language ID)

    stream.readInt32(); // Magic " CSF"
    stream.readInt32(); // Version
    const numLabels = stream.readInt32();
    stream.readInt32(); // numValues (often unused or same as numLabels)
    stream.readInt32(); // unused field / often 0
    this.language = stream.readInt32() as CsfLanguage; // Language ID from header
    console.log(`[CsfFile] Header parsed. Stream position: ${stream.position}, Declared labels: ${numLabels}, Declared lang ID: ${this.language}`);

    for (let i = 0; i < numLabels; i++) {
      if (stream.position + 4 > stream.byteLength) {
        console.error(`[CsfFile] Entry ${i}/${numLabels}: Not enough data for LBL magic. Stopping.`);
        break;
      }
      stream.readInt32(); // "LBL " magic
      
      if (stream.position + 4 > stream.byteLength) {
        console.error(`[CsfFile] Entry ${i}/${numLabels}: Not enough data for numPairs. Stopping.`);
        break;
      }
      const numPairs = stream.readInt32();
      
      if (stream.position + 4 > stream.byteLength) {
        console.error(`[CsfFile] Entry ${i}/${numLabels}: Not enough data for labelNameLength. Stopping.`);
        break;
      }
      const labelNameLength = stream.readInt32();

      if (labelNameLength < 0) { // Basic check for negative length
        console.error(`[CsfFile] Entry ${i}/${numLabels}: Invalid negative labelNameLength ${labelNameLength}. Stopping parse.`);
        break;
      }
      const MAX_REASONABLE_LABEL_LENGTH = 1024; 
      if (labelNameLength > MAX_REASONABLE_LABEL_LENGTH || stream.position + labelNameLength > stream.byteLength) {
        console.error(`[CsfFile] Entry ${i}/${numLabels}: labelNameLength ${labelNameLength} is invalid or would read past EOF. Pos: ${stream.position}, Total: ${stream.byteLength}. Stopping.`);
        break;
      }
      const labelName = stream.readString(labelNameLength);

      if (numPairs !== 1) {
        console.warn(`[CsfFile] Entry ${i}/${numLabels}: Label '${labelName}' has ${numPairs} pairs (expected 1). Treating as empty string.`);
        this.data[labelName.toUpperCase()] = "";
        continue; 
      }

      // Value Parsing (numPairs === 1)
      if (stream.position + 4 > stream.byteLength) { 
          console.error(`[CsfFile] Entry ${i}/${numLabels} ('${labelName}'): Not enough data for valueFlagsOrMagic. Stopping.`);
          break;
      }
      const valueFlagsOrMagic = stream.readInt32(); 

      if (stream.position + 4 > stream.byteLength) { 
          console.error(`[CsfFile] Entry ${i}/${numLabels} ('${labelName}'): Not enough data for charsOrPairsLength. Stopping.`);
          break;
      }
      const charsOrPairsLength = stream.readInt32(); 

      if (charsOrPairsLength < 0) {
          console.error(`[CsfFile] Entry ${i}/${numLabels} ('${labelName}'): Negative charsOrPairsLength ${charsOrPairsLength}. Stopping.`);
          break;
      }
      const bytesToReadForValue = charsOrPairsLength * 2;
      if (bytesToReadForValue < 0) { 
        console.error(`[CsfFile] Entry ${i}/${numLabels} ('${labelName}'): Negative bytesToReadForValue ${bytesToReadForValue}. Stopping.`);
        break;
      }
      if (stream.position + bytesToReadForValue > stream.byteLength) {
          console.error(`[CsfFile] Entry ${i}/${numLabels} ('${labelName}'): bytesToReadForValue ${bytesToReadForValue} would read past EOF. Pos: ${stream.position}, Total: ${stream.byteLength}. Stopping.`);
          break;
      }

      let actualValueString = "";
      if (bytesToReadForValue > 0) {
          const valueBytesRaw = stream.readUint8Array(bytesToReadForValue);
          const valueBytesDecoded = xorDecodeArray(valueBytesRaw);
          actualValueString = byteArrayToUnicodeString(valueBytesDecoded);
      }
      this.data[labelName.toUpperCase()] = actualValueString;

      if (valueFlagsOrMagic === CSF_LABEL_HAS_VALUE_MAGIC) { 
          if (stream.position + 4 > stream.byteLength) {
              // This is a warning because the main value is already read. File might end abruptly after a STRW value.
              console.warn(`[CsfFile] Entry ${i}/${numLabels} ('${labelName}'): Not enough data for extraWstrLenBytes field (STRW). Assuming no extra string.`);
          } else {
              const extraWstrLenBytes = stream.readInt32();
              if (extraWstrLenBytes < 0) {
                   console.error(`[CsfFile] Entry ${i}/${numLabels} ('${labelName}'): Invalid STRW extraWstrLenBytes ${extraWstrLenBytes}. Stopping.`);
                   break;
              }
              if (extraWstrLenBytes > 0) {
                  if (stream.position + extraWstrLenBytes > stream.byteLength) {
                      console.error(`[CsfFile] Entry ${i}/${numLabels} ('${labelName}'): STRW extraWstrLenBytes ${extraWstrLenBytes} would read past EOF. Stopping.`);
                      break;
                  }
                  stream.readString(extraWstrLenBytes); // Read and discard
              }
          }
      }
    }

    if (this.language === CsfLanguage.Unknown || this.language === 0) {
      // Language ID 0 is often used as a default/English or placeholder in some CSF files.
      // If still unknown, try to autodetect.
      this.autoDetectLocale();
    }
    console.log(`[CsfFile] Finished parsing ${file.filename}. Loaded ${Object.keys(this.data).length} labels. Detected/Set language: ${CsfLanguage[this.language]} (${this.getIsoLocale() || 'N/A'})`);
  }

  private autoDetectLocale(): void {
    // Original only checked for Chinese based on "THEME:Intro"
    const introTheme = this.data["THEME:INTRO"]; // Keys are stored uppercase
    if (introTheme === "開場") {
      this.language = CsfLanguage.ChineseTW;
    } else if (introTheme === "开场") {
      this.language = CsfLanguage.ChineseCN;
    } else if (introTheme) { 
        // If THEME:INTRO exists but is not Chinese, assume EnglishUS as a fallback if language is still Unknown
        // This is a heuristic. Better to rely on config or explicit language setting.
        if (this.language === CsfLanguage.Unknown || this.language === 0)
        {
            this.language = CsfLanguage.EnglishUS;
        }
    }
  }

  public getIsoLocale(): string | undefined {
    return csfLocaleMap.get(this.language);
  }
} 