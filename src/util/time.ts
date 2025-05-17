/**
 * Pauses execution for a specified number of milliseconds.
 * @param milliseconds The number of milliseconds to sleep.
 */
export async function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(), milliseconds);
  });
}

/**
 * Creates a throttled version of an async function that only invokes the function 
 * at most once per every `delay` milliseconds.
 * 
 * @param func The async function to throttle.
 * @param delay The throttle delay in milliseconds.
 * @returns A new throttled async function.
 */
export function throttle<T extends (...args: any[]) => Promise<any>>(
  func: T,
  delay: number
): T {
  let inProgress = false;
  let lastCallTime = Number.NEGATIVE_INFINITY;

  const throttledFunc = async function (this: ThisParameterType<T>, ...args: Parameters<T>): Promise<ReturnType<T>> {
    if (inProgress) {
      // If a call is already in the "waiting for delay" phase, subsequent calls during this phase are dropped.
      // This matches the behavior of the original code where if `a` (inProgress) is true, nothing happens.
      // To queue or change this behavior, logic here would need modification.
      // console.warn("Throttle: Call dropped due to ongoing throttle delay");
      return Promise.resolve(undefined as any); // Or handle as per requirements, e.g., throw error or return a specific value
    }

    const currentTime = Date.now();
    const timeSinceLastCall = currentTime - lastCallTime;

    if (delay <= timeSinceLastCall) {
      lastCallTime = currentTime;
      return await func.apply(this, args);
    } else {
      inProgress = true;
      await sleep(delay - timeSinceLastCall);
      lastCallTime = Date.now(); // Update lastCallTime to after the sleep
      inProgress = false;
      return await func.apply(this, args);
    }
  } as T;

  return throttledFunc;
}

/**
 * A higher-order function to adapt the original Throttle decorator's intent.
 * It takes a delay and a method, and returns a new throttled method.
 * 
 * Usage:
 * class MyClass {
 *   myMethod = createThrottledMethod(async (params) => { ... }, 500);
 * }
 * 
 * Or, to apply to an existing method (less direct but possible):
 * const originalMethod = myInstance.myMethod.bind(myInstance);
 * myInstance.myMethod = createThrottledMethod(originalMethod, 500);
 * 
 * @param func The async function (method) to throttle.
 * @param delay The throttle delay in milliseconds.
 * @returns A new throttled async function.
 */
export function createThrottledMethod<T extends (...args: any[]) => Promise<any>>(
  func: T,
  delay: number
): T {
  // The throttle function itself handles the `this` context and arguments correctly.
  return throttle(func, delay);
} 