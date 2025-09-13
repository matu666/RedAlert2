/**
 * 地图名称传统编码器
 * 用于编码和解码传统格式的地图名称，使用特殊的位移算法
 */
export class MapNameLegacyEncoder {
  /**
   * 编码地图名称
   * @param mapName 原始地图名称
   * @returns 编码后的字符串
   */
  encode(mapName: string): string {
    const bytes: number[] = [];
    let extraIndex = 0;

    mapName.split('').forEach((char, index) => {
      const code = char.charCodeAt(0) << (2 * index - 7 * extraIndex);
      const byte1 = code & 127;
      const byte2 = (code >> 7) & 127;
      const byte3 = (code >> 14) & 127;
      
      if (byte3) {
        extraIndex++;
      }
      bytes.push(byte1, byte2);
      if (byte3) {
        bytes.push(byte3);
      }
    });

    // 添加终止字节
    bytes.push(0, 0);
    if (mapName.length >= 2) {
      bytes.push(0);
    }

    // 异或处理
    const xorBytes = bytes.map(byte => byte ^ 128);
    return xorBytes.map(byte => String.fromCharCode(byte)).join('');
  }

  /**
   * 解码地图名称
   * @param encodedMapName 编码后的地图名称
   * @returns 原始地图名称
   */
  decode(encodedMapName: string): string {
    let bytes = encodedMapName.split('').map(char => char.charCodeAt(0));
    
    // 异或处理
    bytes = bytes.map(byte => byte ^ 128);
    
    // 移除尾部的0字节
    while (bytes.length > 0 && bytes[bytes.length - 1] === 0) {
      bytes.pop();
    }

    const result: number[] = [];
    let extraCount = 0;
    let charIndex = 0;

    while (bytes.length > 0) {
      const currentPos = result.length;
      const byte1 = bytes.shift()!;
      const byte2 = bytes.shift()!;
      let byte3 = 0;
      let hasExtra = false;

      // 检查是否需要第三个字节
      if ((bytes.length > 0 && [1, 2, 3].includes(bytes[0])) || currentPos > extraCount + 3) {
        byte3 = bytes.shift()!;
        extraCount = currentPos;
        hasExtra = true;
      }

      // 重构字符代码
      const combined = ((byte3 << 14) | (byte2 << 7) | byte1) >> (2 * currentPos - 7 * extraCount);
      result.push(combined & 127);
      
      if (hasExtra) {
        charIndex++;
      }
    }

    return result.map(code => String.fromCharCode(code)).join('');
  }
}
