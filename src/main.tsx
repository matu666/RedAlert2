import React from 'react'
import ReactDOM from 'react-dom/client'
// 如果您有全局 CSS，可以在这里导入，例如:
// import './index.css' 

// In your test file or main.tsx

import './setupThreeGlobal';

import App from './App.tsx'

import { MixEntry } from './data/MixEntry';
import { Crc32 } from './data/Crc32';
import { binaryStringToUint8Array } from './util/string';

// --------------- Test code (for development) ---------------
console.log("--- Hashing Test Start (with debug logging) ---");

// Filename length 7 (4k+3)
MixEntry.hashFilename("ART.INI", true); 
// Expected: "ART.INI" -> "ART.INI" + String.fromCharCode(3)
// R=1, paddingCharSourceIndex=4 (char 'N')
// numPaddingChars = 0. No second stage padding.
// Final processedName: "ART.INI\u0003"

console.log("---");

// Filename length 1 (4k+1)
MixEntry.hashFilename("A", true);
// Expected: "A" -> "A" + String.fromCharCode(1)
// R=0, paddingCharSourceIndex=0 (char 'A')
// numPaddingChars = 2.
// Final processedName: "A\u0001AA"

console.log("---");

// Filename length 5 (4k+1)
MixEntry.hashFilename("RULES.INI", true); // Actually "RULES.INI" is 9 chars, let's use "ABCDE"
MixEntry.hashFilename("ABCDE", true);
// Expected: "ABCDE" -> "ABCDE" + String.fromCharCode(1)
// R=1, paddingCharSourceIndex=4 (char 'E')
// numPaddingChars = 2.
// Final processedName: "ABCDE\u0001EE"

console.log("---");

// Filename length 4 (4k)
MixEntry.hashFilename("RA2.", true); // Example "RA2."
// Expected: No padding.
// Final processedName: "RA2."


console.log("--- Standard CRC32 Test (for Crc32 class itself) ---");
const testData = binaryStringToUint8Array("123456789"); // ASCII: 31 32 33 34 35 36 37 38 39
const crcDirect = Crc32.calculateCrc(testData);
const knownStandardCRC32 = 0xCBF43926; // This is the widely known CRC32 for "123456789"

console.log(`CRC32 for "123456789": ${crcDirect} (0x${crcDirect.toString(16).toUpperCase()})`);
console.log(`Expected Standard CRC32: ${knownStandardCRC32} (0x${knownStandardCRC32.toString(16).toUpperCase()})`);

if (crcDirect === knownStandardCRC32) {
    console.log("Crc32.calculateCrc matches known standard CRC32 value for \"123456789\"!");
} else {
    console.error("Crc32.calculateCrc MISMATCH against known standard!");
}


console.log("--- Hashing Test End ---");

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
) 