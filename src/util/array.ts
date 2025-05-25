/**
 * 从数组末尾开始查找满足条件的元素
 * @param array 要搜索的数组
 * @param predicate 判断函数
 * @returns 找到的元素，如果没找到则返回undefined
 */
export function findReverse<T>(
  array: T[], 
  predicate: (value: T, index: number, array: T[]) => boolean
): T | undefined {
  for (let i = array.length - 1; i >= 0; i--) {
    if (predicate(array[i], i, array)) {
      return array[i];
    }
  }
  return undefined;
}

/**
 * 从数组末尾开始查找满足条件的元素的索引
 * @param array 要搜索的数组
 * @param predicate 判断函数
 * @returns 找到的元素索引，如果没找到则返回-1
 */
export function findIndexReverse<T>(
  array: T[], 
  predicate: (value: T, index: number, array: T[]) => boolean
): number {
  for (let i = array.length - 1; i >= 0; i--) {
    if (predicate(array[i], i, array)) {
      return i;
    }
  }
  return -1;
}

/**
 * 比较两个数组是否相等（浅比较）
 * @param array1 第一个数组
 * @param array2 第二个数组
 * @returns 如果数组相等返回true，否则返回false
 */
export function equals<T>(array1: T[], array2: T[]): boolean {
  if (array1.length !== array2.length) {
    return false;
  }
  
  for (let i = 0, length = array1.length; i < length; i++) {
    if (array1[i] !== array2[i]) {
      return false;
    }
  }
  
  return true;
}
  