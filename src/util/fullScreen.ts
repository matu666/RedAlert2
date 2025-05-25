export type FullScreenChangeHandler = (isFullScreen: boolean) => void;

export function setupFullScreenChangeListener(
  document: Document,
  handler: FullScreenChangeHandler
): (() => void) | undefined {
  if (!document.fullscreenEnabled) {
    console.warn("Browser fullscreen API not available.");
    return undefined;
  }

  let canF11Request = true;

  const fullscreenChangeHandler = () => {
    const isFullScreen = !!document.fullscreenElement;
    if (isFullScreen) {
      canF11Request = false;
    } else {
      // Delay re-enabling F11 to avoid conflicts
      setTimeout(() => (canF11Request = true), 100);
    }
    handler(isFullScreen);
  };

  const keyUpHandler = async (event: KeyboardEvent) => {
    // F11 key code is 122
    if (event.keyCode === 122 && canF11Request && !document.fullscreenElement) {
      try {
        await document.documentElement.requestFullscreen();
      } catch (error) {
        console.warn("Full screen permission denied by user.");
      }
    }
  };

  document.addEventListener("fullscreenchange", fullscreenChangeHandler);
  document.addEventListener("keyup", keyUpHandler);

  // Return cleanup function
  return () => {
    document.removeEventListener("fullscreenchange", fullscreenChangeHandler);
    document.removeEventListener("keyup", keyUpHandler);
  };
} 