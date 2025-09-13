import { Base64 } from '@/util/Base64';
import { binaryStringToUtf16, utf16ToBinaryString } from '@/util/string';

/**
 * 文件名编码器
 * 用于编码和解码游戏中的文件名，支持Base64编码
 */
export class FileNameEncoder {
  /**
   * 编码文件名
   * @param fileName 原始文件名
   * @returns 编码后的文件名
   */
  encode(fileName: string): string {
    // 如果文件名符合简单格式，直接返回
    if (fileName.match(/^[a-z0-9-_]+\.[a-z]{3}$/i)) {
      return fileName;
    }
    // 否则使用Base64编码
    return Base64.encode(utf16ToBinaryString(fileName));
  }

  /**
   * 解码文件名
   * @param encodedFileName 编码后的文件名
   * @returns 原始文件名
   */
  decode(encodedFileName: string): string {
    // 如果看起来像文件名（有扩展名），直接返回
    if (encodedFileName.match(/\.[a-z]{3}$/i)) {
      return encodedFileName;
    }
    // 否则假定是Base64编码，进行解码
    return binaryStringToUtf16(Base64.decode(encodedFileName));
  }
}
