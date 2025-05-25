// 原始string函数实现，直接从原项目转换

export function binaryStringToUint8Array(e) {
  var t = e.length;
  let i = new Uint8Array(t);
  for (let r = 0; r < t; r++) i[r] = e.charCodeAt(r);
  return i;
} 