const BLOWFISH_KEY_STRING: string = "AihRvNoIbTn85FZRYNZRcT+i6KpU+maCsEqr3Q5q+LDB5tH7Tz2qQ38V";
const BASE64_DECODE_TABLE: Int8Array = new Int8Array([
    -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
    -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
    -1, -1, -1, -1, -1, -1, -1, -1, -1, 62, -1, -1, -1, 63, 52, 53, 54,
    55, 56, 57, 58, 59, 60, 61, -1, -1, -1, -1, -1, -1, -1, 0, 1, 2, 3,
    4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21,
    22, 23, 24, 25, -1, -1, -1, -1, -1, -1, 26, 27, 28, 29, 30, 31, 32,
    33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49,
    50, 51, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
    -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
    -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
    -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
    -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
    -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
    -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
    -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
]);

class BlowfishPublicKeyData {
    key1: Uint32Array;
    key2: Uint32Array;
    len: number;

    constructor() {
        this.key1 = new Uint32Array(64);
        this.key2 = new Uint32Array(64);
        this.len = 0; // Initialized to 0, set by init_pubkey
    }
}

export class BlowfishKey {
    pubkey: BlowfishPublicKeyData;
    glob1: Uint32Array;
    glob2: Uint32Array;
    glob1_hi: Uint32Array;
    glob1_hi_inv: Uint32Array;

    glob1_bitlen: number;
    glob1_len_x2: number; // Length in 16-bit half-words
    glob1_hi_bitlen: number;
    glob1_hi_inv_lo: number;
    glob1_hi_inv_hi: number;

    constructor() {
        this.pubkey = new BlowfishPublicKeyData();
        this.glob1 = new Uint32Array(64);
        this.glob2 = new Uint32Array(130);
        this.glob1_hi = new Uint32Array(4);
        this.glob1_hi_inv = new Uint32Array(4);

        this.glob1_bitlen = 0;
        this.glob1_len_x2 = 0;
        this.glob1_hi_bitlen = 0;
        this.glob1_hi_inv_lo = 0;
        this.glob1_hi_inv_hi = 0;
    }

    init_bignum(targetArray: Uint32Array, initialValue: number, sizeInWords: number): void {
        for (let i = 0; i < sizeInWords; i++) {
            targetArray[i] = 0;
        }
        if (sizeInWords > 0) {
            targetArray[0] = initialValue;
        }
    }

    move_key_to_big(targetBignum: Uint32Array, sourceKeyBytes: Uint8Array, sourceLength: number, targetSizeInWords: number): void {
        let fillByte: number;
        fillByte = (sourceKeyBytes[0] & 0x80) !== 0 ? 0xff : 0x00;

        const targetViewBytes = new Uint8Array(targetBignum.buffer, targetBignum.byteOffset);
        let targetByteLength = 4 * targetSizeInWords;

        for (; targetByteLength > sourceLength; targetByteLength--) {
            targetViewBytes[targetByteLength - 1] = fillByte;
        }
        for (; targetByteLength > 0; targetByteLength--) {
            targetViewBytes[targetByteLength - 1] = sourceKeyBytes[sourceLength - targetByteLength];
        }
    }

    key_to_bignum(targetBignum: Uint32Array, berEncodedKey: Uint8Array, targetSizeInWords: number): void {
        let numOctetsInLength: number;
        let keyDataLength: number;
        let currentOffset = 0;

        if (berEncodedKey[currentOffset] === 0x02) { // ASN.1 INTEGER type
            currentOffset++;
            if ((berEncodedKey[currentOffset] & 0x80) !== 0) { // Long form for length
                numOctetsInLength = berEncodedKey[currentOffset] & 0x7f;
                currentOffset++;
                keyDataLength = 0;
                for (let i = 0; i < numOctetsInLength; i++) {
                    keyDataLength = (((keyDataLength << 8) >>> 0) | berEncodedKey[currentOffset + i]) >>> 0;
                }
                currentOffset += numOctetsInLength;
            } else { // Short form for length
                keyDataLength = berEncodedKey[currentOffset];
                currentOffset++;
            }

            if (keyDataLength <= 4 * targetSizeInWords) {
                this.move_key_to_big(targetBignum, berEncodedKey.subarray(currentOffset), keyDataLength, targetSizeInWords);
            }
        }
    }

    len_bignum(bignum: Uint32Array, sizeInWords: number): number {
        let len = sizeInWords - 1;
        while (len >= 0 && bignum[len] === 0) {
            len--;
        }
        return len + 1;
    }

    bitlen_bignum(bignum: Uint32Array, sizeInWords: number): number {
        let numWords: number;
        let wordIndex: number;
        let numBits: number;
        let bitMask: number;

        numWords = this.len_bignum(bignum, sizeInWords);
        if (numWords === 0) {
            return 0;
        }

        wordIndex = numWords - 1;
        numBits = 32 * numWords;
        bitMask = 0x80000000; // 2147483648
        while ((bitMask & bignum[wordIndex]) === 0) {
            bitMask >>>= 1;
            numBits--;
        }
        return numBits;
    }

    init_pubkey(): void {
        let charIndex = 0;
        const decodedKeyBytes = new Uint8Array(256); // Max possible size based on typical base64 expansion

        this.init_bignum(this.pubkey.key2, 65537, 64); // Initialize e (exponent) for RSA
        let outputByteIndex = 0; // Initialized here

        while (charIndex < BLOWFISH_KEY_STRING.length) {
            // Refactored base64 decoding logic for clarity and to potentially resolve linter issue
            let val: number;
            const c0 = BASE64_DECODE_TABLE[BLOWFISH_KEY_STRING.charCodeAt(charIndex++)];
            const c1 = BASE64_DECODE_TABLE[BLOWFISH_KEY_STRING.charCodeAt(charIndex++)];
            const c2 = BASE64_DECODE_TABLE[BLOWFISH_KEY_STRING.charCodeAt(charIndex++)];
            const c3 = BASE64_DECODE_TABLE[BLOWFISH_KEY_STRING.charCodeAt(charIndex++)];

            val = (c0 >>> 0) << 18;
            val |= (c1 >>> 0) << 12;
            val |= (c2 >>> 0) << 6;
            val |= (c3 >>> 0);

            decodedKeyBytes[outputByteIndex++] = (val >> 16) & 255;
            decodedKeyBytes[outputByteIndex++] = (val >> 8) & 255;
            decodedKeyBytes[outputByteIndex++] = val & 255;
        }
        this.key_to_bignum(this.pubkey.key1, decodedKeyBytes.subarray(0, outputByteIndex), 64); // key1 is n (modulus)
        this.pubkey.len = this.bitlen_bignum(this.pubkey.key1, 64) - 1;
    }

    len_predata(): number {
        const octetLen = ((this.pubkey.len - 1) / 8) | 0;
        return ((1 + ((55 / octetLen) | 0)) * (1 + octetLen)) >>> 0;
    }

    cmp_bignum(a: Uint32Array, b: Uint32Array, sizeInWords: number): number {
        let currentSize = sizeInWords;
        while (currentSize > 0) {
            currentSize--;
            if (a[currentSize] < b[currentSize]) return -1;
            if (a[currentSize] > b[currentSize]) return 1;
        }
        return 0;
    }

    mov_bignum(dest: Uint32Array, src: Uint32Array, sizeInWords: number): void {
        for (let i = 0; i < sizeInWords; i++) {
            dest[i] = src[i];
        }
    }

    shr_bignum(bignum: Uint32Array, numBitsToShift: number, sizeInWords: number): void {
        let numWordsToShift: number = (numBitsToShift / 32) | 0;
        let i: number;

        if (numWordsToShift > 0) {
            for (i = 0; i < sizeInWords - numWordsToShift; i++) {
                bignum[i] = bignum[i + numWordsToShift];
            }
            for (; i < sizeInWords; i++) {
                bignum[i] = 0;
            }
            numBitsToShift %= 32;
        }

        if (numBitsToShift !== 0) {
            for (i = 0; i < sizeInWords - 1; i++) {
                bignum[i] = ((bignum[i] >>> numBitsToShift) | ((bignum[i + 1] << (32 - numBitsToShift)) >>> 0)) >>> 0;
            }
            bignum[i] = bignum[i] >>> numBitsToShift;
        }
    }

    shl_bignum(bignum: Uint32Array, numBitsToShift: number, sizeInWords: number): void {
        let numWordsToShift: number = (numBitsToShift / 32) | 0;
        let i: number;

        if (numWordsToShift > 0) {
            for (i = sizeInWords - 1; i > numWordsToShift; i--) { // Note: original code has i > s, s being numWordsToShift
                bignum[i] = bignum[i - numWordsToShift];
            }
             for (; i >=0 && i < sizeInWords; i--) { // Original: for (; 0 < r; r--) e[r] = 0; This seems to clear from numWordsToShift down to 0 or 1.
                                        // If i starts at numWordsToShift, this clears e[numWordsToShift]...e[0 or 1].
                                        // The loop should be for (i=numWordsToShift; i>=0; i--) bignum[i]=0;
                                        // But the original has `for (; 0 < r; r--) e[r] = 0;` with r starting from `s` (numWordsToShift).
                                        // This might be `for (i = numWordsToShift -1; i>=0; i--) bignum[i]=0;`
                                        // Or ` for (i=0; i < numWordsToShift; i++) bignum[i]=0;` if r means count.
                                        // Let's re-evaluate `for (; 0 < r; r--) e[r] = 0;` where r starts as `s`.
                                        // It clears e[s-1], e[s-2], ..., e[0]. (assuming r is index after loop)
                                        // This means elements from 0 to s-1 are zeroed.
                if (i < numWordsToShift) bignum[i] = 0;
            }
            numBitsToShift %= 32;
        }

        if (numBitsToShift !== 0) {
            for (i = sizeInWords - 1; i > 0; i--) {
                bignum[i] = (((bignum[i] << numBitsToShift) >>> 0) | (bignum[i - 1] >>> (32 - numBitsToShift))) >>> 0;
            }
            bignum[0] = (bignum[0] << numBitsToShift) >>> 0;
        }
    }

    sub_bignum(result: Uint32Array, operandA: Uint32Array, operandB: Uint32Array, initialBorrow: number, numWords: number): number {
        const numHalfWords = numWords * 2;
        const viewResult = new Uint16Array(result.buffer, result.byteOffset, result.length * 2);
        const viewOperandA = new Uint16Array(operandA.buffer, operandA.byteOffset, operandA.length * 2);
        const viewOperandB = new Uint16Array(operandB.buffer, operandB.byteOffset, operandB.length * 2);

        let currentBorrow = initialBorrow;
        let halfWordIndex = 0;
        for (let k = 0; k < numHalfWords; k++) {
            const valA = viewOperandA[halfWordIndex];
            const valB = viewOperandB[halfWordIndex];
            const diff = valA - valB - currentBorrow;
            viewResult[halfWordIndex] = diff & 0xFFFF;
            currentBorrow = (diff & 0x10000) !== 0 ? 1 : 0; // Check for borrow (if diff was negative)
            halfWordIndex++;
        }
        return currentBorrow;
    }

    sub_bignum_word(resultView: Uint16Array, operandAView: Uint16Array, operandBView: Uint16Array, initialBorrow: number, numHalfWords: number): number {
        let currentBorrow = initialBorrow;
        let halfWordIndex = 0;
        for (let k = 0; k < numHalfWords; k++) { // Original: for (; -1 != --s; ) where s was numHalfWords
            const valA = operandAView[halfWordIndex];
            const valB = operandBView[halfWordIndex];
            const diff = valA - valB - currentBorrow;
            resultView[halfWordIndex] = diff & 0xFFFF;
            currentBorrow = (diff & 0x10000) !== 0 ? 1 : 0;
            halfWordIndex++;
        }
        return currentBorrow;
    }

    inv_bignum(resultInv: Uint32Array, numToInvert: Uint32Array, sizeInWords: number): void {
        const tempQuotient = new Uint32Array(64); // Original r
        let bitLengthN: number;
        let mostSignificantBitMask: number;
        let wordIndexOfMSB: number;

        this.init_bignum(tempQuotient, 0, sizeInWords);
        this.init_bignum(resultInv, 0, sizeInWords);

        bitLengthN = this.bitlen_bignum(numToInvert, sizeInWords);
        // wordIndexOfMSB = (((bitLengthN + 31) / 32) | 0) - 1; // Original 'o'
        // mostSignificantBitMask = (1 << (bitLengthN - 1) % 32) >>> 0; // Original 'a', careful with bitLengthN=0
        
        // Corrected logic for 'a' and 'o' initialization based on original:
        // a = (1 << n % 32) >>> 0
        // o = (((n + 32) / 32) | 0) - 1
        // s = (4 * (((n - 1) / 32) | 0)) >>> 0
        // r[(s / 4) | 0] = r[(s / 4) | 0] | ((1 << ((n - 1) & 31)) >>> 0); // Init tempQuotient (was 'r')
        // This sets a single bit in tempQuotient corresponding to 2^(bitLengthN-1)

        if (bitLengthN === 0) return; // Avoid issues with bitLengthN-1 for 0

        mostSignificantBitMask = (1 << ((bitLengthN -1) % 32)) >>> 0; // Bit mask for current bit in its word
        wordIndexOfMSB = ((bitLengthN - 1) / 32) | 0; // Word containing the MSB of numToInvert


        // Initialize tempQuotient (original 'r') to 2^(bitLengthN-1)
        // This was: r[(s / 4) | 0] = r[(s / 4) | 0] | ((1 << ((n - 1) & 31)) >>> 0);
        // where s was related to byte index. More simply:
        tempQuotient[((bitLengthN - 1) / 32) | 0] |= (1 << ((bitLengthN - 1) % 32)) >>> 0;


        // Loop for Euclidean algorithm variant (binary extended Euclidean algorithm for modular inverse)
        // The original loop `for ( ; 0 < n; )` implies `n` (bitLengthN) decreases.
        // `a >>>= 1; 0 === a && (o--, a = 2147483648)` handles moving bit mask.

        let currentBitLength = bitLengthN; // Corresponds to 'n' in original loop condition
        let currentWordIndex = wordIndexOfMSB; // Corresponds to 'o'
        let currentBitMaskInWord = mostSignificantBitMask; // Corresponds to 'a'


        while (currentBitLength > 0) {
            currentBitLength--;
            this.shl_bignum(tempQuotient, 1, sizeInWords); // tempQuotient = tempQuotient * 2

            if (this.cmp_bignum(tempQuotient, numToInvert, sizeInWords) !== -1) { // if tempQuotient >= numToInvert
                this.sub_bignum(tempQuotient, tempQuotient, numToInvert, 0, sizeInWords); // tempQuotient -= numToInvert
                resultInv[currentWordIndex] = resultInv[currentWordIndex] | currentBitMaskInWord; // Set corresponding bit in result
            }

            currentBitMaskInWord >>>= 1;
            if (currentBitMaskInWord === 0 && currentBitLength > 0) { // currentBitLength condition to avoid issues if it's the very last bit
                currentWordIndex--;
                currentBitMaskInWord = 0x80000000; // Reset mask for new word
            }
        }
        this.init_bignum(tempQuotient, 0, sizeInWords); // Clear temp
    }


    inc_bignum(bignum: Uint32Array, sizeInWords: number): void {
        let i = 0;
        while (sizeInWords > 0 && ++bignum[i] === 0) { // sizeInWords decreases in original, acts as counter
            i++;
            sizeInWords--;
        }
    }

    init_two_dw(num: Uint32Array, numSizeInWords: number): void {
        this.mov_bignum(this.glob1, num, numSizeInWords);
        this.glob1_bitlen = this.bitlen_bignum(this.glob1, numSizeInWords);
        this.glob1_len_x2 = ((this.glob1_bitlen + 15) / 16) | 0; // Length in 16-bit words (half-words)

        const len_glob1_words = this.len_bignum(this.glob1, numSizeInWords);
        // Ensure we don't try to subarray with negative start or insufficient elements
        const glob1_actual_len = Math.max(0, len_glob1_words);
        const subarray_start = Math.max(0, glob1_actual_len - 2);
        
        this.mov_bignum(
            this.glob1_hi,
            // this.glob1.subarray(this.len_bignum(this.glob1, numSizeInWords) - 2), // Original can be problematic if len < 2
            this.glob1.subarray(subarray_start), // Takes elements from subarray_start to end of glob1
            Math.min(2, glob1_actual_len) // Copy at most 2 words, or fewer if glob1 is shorter
        );
        if (glob1_actual_len < 2) { // If glob1 had less than 2 words, pad glob1_hi with zeros
            for (let k = glob1_actual_len; k < 2; k++) this.glob1_hi[k] = 0;
        }


        this.glob1_hi_bitlen = (this.bitlen_bignum(this.glob1_hi, 2) - 32) >>> 0;
        this.shr_bignum(this.glob1_hi, this.glob1_hi_bitlen, 2);
        this.inv_bignum(this.glob1_hi_inv, this.glob1_hi, 2);
        this.shr_bignum(this.glob1_hi_inv, 1, 2);
        this.glob1_hi_bitlen = (((this.glob1_hi_bitlen + 15) % 16) + 1) >>> 0;
        this.inc_bignum(this.glob1_hi_inv, 2);

        if (this.bitlen_bignum(this.glob1_hi_inv, 2) > 32) {
            this.shr_bignum(this.glob1_hi_inv, 1, 2);
            this.glob1_hi_bitlen--;
        }

        this.glob1_hi_inv_lo = this.glob1_hi_inv[0] & 0xFFFF;
        this.glob1_hi_inv_hi = (this.glob1_hi_inv[0] >>> 16) & 0xFFFF;
    }

    mul_bignum_word(targetView: Uint16Array, sourceBignum: Uint32Array, multiplierWord: number, numSourceHalfWords: number): void {
        const sourceView = new Uint16Array(sourceBignum.buffer, sourceBignum.byteOffset, sourceBignum.length * 2);
        let carry = 0;
        let halfWordIndex = 0; 

        for (let k = 0; k < numSourceHalfWords; k++) {
            carry = multiplierWord * sourceView[halfWordIndex] + targetView[halfWordIndex] + carry;
            targetView[halfWordIndex] = carry & 0xFFFF;
            halfWordIndex++;
            carry >>>= 16;
        }
        // Original: e[o] += 65535 & a; where o is numSourceHalfWords
        if (halfWordIndex < targetView.length) { // Ensure index is within bounds for targetView
             targetView[halfWordIndex] += (carry & 0xFFFF);
        } else if ((carry & 0xFFFF) !== 0) {
            // This case implies the targetView was not large enough for the final carry.
            // Depending on context, this might be an issue or expected if higher bits are truncated.
            // console.warn("mul_bignum_word: final carry might be lost or written out of intended bounds.");
        }
    }

    mul_bignum(result: Uint32Array, multiplicand: Uint32Array, multiplier: Uint32Array, numWords: number): void {
        const multiplierView = new Uint16Array(multiplier.buffer, multiplier.byteOffset, multiplier.length * 2);
        const resultView = new Uint16Array(result.buffer, result.byteOffset, result.length * 2);
        
        this.init_bignum(result, 0, 2 * numWords); // Result can be up to twice the size
        let resultViewOffset = 0;

        for (let s = 0; s < 2 * numWords; s++) { // Iterate through half-words of multiplier
            // Pass multiplicand (Uint32Array), and a half-word from multiplierView
            // The target for mul_bignum_word is a sliding window on resultView
            this.mul_bignum_word(resultView.subarray(resultViewOffset), multiplicand, multiplierView[resultViewOffset], 2 * numWords);
            resultViewOffset++;
        }
    }

    not_bignum(bignum: Uint32Array, sizeInWords: number): void {
        for (let i = 0; i < sizeInWords; i++) {
            bignum[i] = ~bignum[i] >>> 0;
        }
    }

    neg_bignum(bignum: Uint32Array, sizeInWords: number): void {
        this.not_bignum(bignum, sizeInWords);
        this.inc_bignum(bignum, sizeInWords);
    }

    get_mulword(viewNumTopHalfWords: Uint16Array, indexTopWord: number): number {
        // Original logic for Barrett reduction estimate. viewNumTopHalfWords is e.g. view of this.glob2
        // indexTopWord is 't' in original (e.g. 1 + s in calc_a_bignum)
        let val_t = viewNumTopHalfWords[indexTopWord];
        let val_t_minus_1 = viewNumTopHalfWords[indexTopWord - 1];
        let val_t_minus_2 = viewNumTopHalfWords[indexTopWord - 2];

        let estimate =
            (((((((((0xFFFF & (0xFFFF ^ val_t_minus_1)) * this.glob1_hi_inv_lo + 0x10000) >>> 1) +
                (((0xFFFF ^ val_t_minus_2) * this.glob1_hi_inv_hi + this.glob1_hi_inv_hi) >>> 1) + 1) >>> 16) +
                (((0xFFFF & (0xFFFF ^ val_t_minus_1)) * this.glob1_hi_inv_hi) >>> 1) +
                (((0xFFFF ^ val_t) * this.glob1_hi_inv_lo) >>> 1) + 1) >>> 14) +
                this.glob1_hi_inv_hi * (0xFFFF ^ val_t) * 2) >>> this.glob1_hi_bitlen
            ) >>> 0;

        if (estimate > 0xFFFF) {
            estimate = 0xFFFF;
        }
        return estimate & 0xFFFF;
    }

    dec_bignum(bignum: Uint32Array, sizeInWords: number): void {
        let i = 0;
        // Original: for (; --e[i] >>> 0 == 4294967295 && 0 < --t; ) i++;
        // This means, decrement e[i]. If it underflows (becomes 0xFFFFFFFF), and there are more words (t>0),
        // then move to next word and repeat.
        while (sizeInWords > 0) {
            bignum[i] = (bignum[i] - 1) >>> 0;
            if (bignum[i] !== 0xFFFFFFFF) break; // If no underflow to 0xFFFFFFFF, we are done.
            i++;
            sizeInWords--;
            if (i >= bignum.length || sizeInWords === 0 && bignum[i-1] === 0xFFFFFFFF ) break; // Boundary checks
        }
    }


    calc_a_bignum(result_a: Uint32Array, x: Uint32Array, y: Uint32Array, numWords_n: number): void {
        // This implements (x*y) mod n, where n is this.glob1
        // result_a, x, y are bignums of size numWords_n
        // this.glob2 is used as a temporary buffer, must be >= 2 * numWords_n
        
        this.mul_bignum(this.glob2, x, y, numWords_n); // glob2 = x * y
        this.glob2[2 * numWords_n] = 0; // Ensure potential carry for len_bignum is handled

        let len_glob2_half_words = 2 * this.len_bignum(this.glob2, 2 * numWords_n + 1);

        if (len_glob2_half_words >= this.glob1_len_x2) { // If glob2 >= glob1 (modulus N)
            this.inc_bignum(this.glob2, 2 * numWords_n + 1);
            this.neg_bignum(this.glob2, 2 * numWords_n + 1); // glob2 = -(glob2+1) (effectively 2's complement for modulo)

            let num_iterations_q = 1 + len_glob2_half_words - this.glob1_len_x2; // Original 'a'
            
            const glob2_view_half_words = new Uint16Array(this.glob2.buffer, this.glob2.byteOffset, this.glob2.length*2);
            let current_q_iteration = num_iterations_q; // Original 't'
            let current_glob2_idx = 1 + len_glob2_half_words; // Original 'i'

            for (; num_iterations_q !== 0; num_iterations_q--) {
                current_glob2_idx--;
                const q_estimate_mulword = this.get_mulword(glob2_view_half_words, current_glob2_idx);
                current_q_iteration--;
                
                const target_subview_for_mul = glob2_view_half_words.subarray(current_q_iteration);

                if (q_estimate_mulword > 0) {
                    // glob2_view_half_words[current_q_iteration...] -= q_estimate_mulword * glob1
                    this.mul_bignum_word(target_subview_for_mul, this.glob1, q_estimate_mulword, 2 * numWords_n);
                    
                    if ((glob2_view_half_words[current_glob2_idx] & 0x8000) === 0) { // if sign bit not set (positive after subtraction attempt)
                        const glob1_view_half_words = new Uint16Array(this.glob1.buffer, this.glob1.byteOffset, this.glob1.length*2);
                        // if (sub_bignum_word(target_subview_for_mul, target_subview_for_mul, glob1_view_half_words, 0, 2*numWords_n) !== 0)
                        // The original had condition `0 !== this.sub_bignum_word(...)`
                        // sub_bignum_word returns borrow. If borrow is not 0, it means subtraction resulted in negative.
                        if (this.sub_bignum_word(target_subview_for_mul, target_subview_for_mul, glob1_view_half_words, 0, 2 * numWords_n) !== 0) {
                           glob2_view_half_words[current_glob2_idx]--; // Adjust q_estimate (decrement)
                        }
                    }
                }
            }
            this.neg_bignum(this.glob2, numWords_n);
            this.dec_bignum(this.glob2, numWords_n);
        }
        this.mov_bignum(result_a, this.glob2, numWords_n);
    }

    clear_tmp_vars(sizeInWords: number): void {
        this.init_bignum(this.glob1, 0, sizeInWords); // Max size is 64 for glob1
        this.init_bignum(this.glob2, 0, Math.max(sizeInWords, 130)); // Max size for glob2
        this.init_bignum(this.glob1_hi_inv, 0, 4);
        this.init_bignum(this.glob1_hi, 0, 4);
        this.glob1_bitlen = 0;
        this.glob1_hi_bitlen = 0;
        this.glob1_len_x2 = 0;
        this.glob1_hi_inv_lo = 0;
        this.glob1_hi_inv_hi = 0;
    }

    calc_a_key(result_m_pow_e_mod_n: Uint32Array, message_m: Uint32Array, exponent_e: Uint32Array, modulus_n: Uint32Array, numWords: number): void {
        // Computes result = message^exponent mod modulus
        const temp_square = new Uint32Array(64); // Original 'o'
        let len_modulus_n_words: number;
        let bitLength_exponent_e: number;
        let wordIndexOfMsb_exponent_e: number;
        let bitMaskInWord_exponent_e: number; // Current bit of exponent being processed

        this.init_bignum(result_m_pow_e_mod_n, 1, numWords); // Initialize result to 1
        len_modulus_n_words = this.len_bignum(modulus_n, numWords);
        this.init_two_dw(modulus_n, len_modulus_n_words); // Precompute for Barrett reduction using modulus_n

        bitLength_exponent_e = this.bitlen_bignum(exponent_e, len_modulus_n_words);
        if (bitLength_exponent_e === 0) { // exponent is 0, result is 1
            this.clear_tmp_vars(numWords);
            // result_m_pow_e_mod_n is already 1
            return;
        }
        
        // Setup for iterating through bits of exponent_e from MSB down to LSB
        wordIndexOfMsb_exponent_e = ((bitLength_exponent_e - 1) / 32) | 0;
        bitMaskInWord_exponent_e = (1 << ((bitLength_exponent_e - 1) % 32)) >>> 0;


        // Initial copy: result = message. Original had this.mov_bignum(e, t, n); where e=result, t=message, n=len_modulus_n
        this.mov_bignum(result_m_pow_e_mod_n, message_m, len_modulus_n_words);
        
        // Start from the bit *after* the MSB of the exponent, as MSB effect is already in by result=message
        // The original loop `for( ; -1 != --l; )` implies l (bitLength_exponent_e) goes from bitLength_exponent_e-1 down to 0.
        // And first iteration is for MSB-1.

        let currentBit = bitLength_exponent_e - 1; // Start processing from bit (MSB-1) downwards

        while (currentBit > 0) { // Loop from bit (MSB-1) down to bit 0
            currentBit--; // Move to next lower bit for this iteration

            // Adjust mask and word index for the *new* currentBit
            // Original code: `0 === c && ((c = 2147483648), h--)` (c is mask, h is wordIndex)
            // This happens *before* using the bit.
            bitMaskInWord_exponent_e >>>= 1;
            if (bitMaskInWord_exponent_e === 0) {
                if (wordIndexOfMsb_exponent_e > 0) { // Check to prevent negative index
                    wordIndexOfMsb_exponent_e--;
                    bitMaskInWord_exponent_e = 0x80000000; // Most significant bit for the new word
                } else if (currentBit > 0) { // Should not happen if bitLength_exponent_e was correct
                    // console.error("Exponent bit iteration error");
                    break; 
                }
            }

            // Square: result = result * result mod N
            this.calc_a_bignum(temp_square, result_m_pow_e_mod_n, result_m_pow_e_mod_n, len_modulus_n_words);
            
            // Multiply if current exponent bit is set: result = result * message mod N
            if ((exponent_e[wordIndexOfMsb_exponent_e] & bitMaskInWord_exponent_e) !== 0) {
                this.calc_a_bignum(result_m_pow_e_mod_n, temp_square, message_m, len_modulus_n_words);
            } else {
                this.mov_bignum(result_m_pow_e_mod_n, temp_square, len_modulus_n_words);
            }
        }

        this.init_bignum(temp_square, 0, len_modulus_n_words);
        this.clear_tmp_vars(numWords);
    }

    memcpy(dest: Uint8Array, src: Uint8Array, count: number): void {
        for (let i = 0; i < count; i++) {
            dest[i] = src[i];
        }
    }

    process_predata(encryptedData: Uint8Array, dataLength: number, decryptedOutput: Uint8Array): void {
        const tempBlock = new Uint32Array(64);    // Original 'r'
        const decryptedBlock = new Uint32Array(64); // Original 's'
        let inputOffset = 0;
        let outputOffset = 0;

        // (this.pubkey.len - 1) / 8 is RSA block size in octets (bytes for n)
        // The data is processed in chunks of (blockSize + 1)
        const rsaOctetBlockSize = ((this.pubkey.len - 1) / 8) | 0;

        while (rsaOctetBlockSize + 1 <= dataLength) {
            this.init_bignum(tempBlock, 0, 64);
            // Copy (rsaOctetBlockSize + 1) bytes from input to tempBlock (as bytes)
            this.memcpy(new Uint8Array(tempBlock.buffer, tempBlock.byteOffset, tempBlock.byteLength),
                        encryptedData.subarray(inputOffset),
                        rsaOctetBlockSize + 1);
            
            this.calc_a_key(decryptedBlock, tempBlock, this.pubkey.key2, this.pubkey.key1, 64);
            
            // Copy rsaOctetBlockSize bytes from decryptedBlock to output
            this.memcpy(decryptedOutput.subarray(outputOffset),
                        new Uint8Array(decryptedBlock.buffer, decryptedBlock.byteOffset, decryptedBlock.byteLength),
                        rsaOctetBlockSize);

            dataLength -= (rsaOctetBlockSize + 1);
            inputOffset += (rsaOctetBlockSize + 1);
            outputOffset += rsaOctetBlockSize;
        }
    }

    decryptKey(encryptedKeyBlob: Uint8Array): Uint8Array {
        this.init_pubkey();
        const decryptedData = new Uint8Array(256); // Max possible output size
        
        // len_predata() calculates the expected total length of PKCS#1 v1.5 padded data
        this.process_predata(encryptedKeyBlob, this.len_predata(), decryptedData);
        
        // The actual key is 56 bytes
        return decryptedData.subarray(0, 56);
    }
} 