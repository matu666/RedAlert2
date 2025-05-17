import React, { useEffect, useRef, useState } from 'react';
import { Application, SplashScreenUpdateCallback } from './Application'; // Adjust path if needed
import SplashScreenComponent from './gui/component/SplashScreen'; // Renamed to avoid conflict
import type { ComponentProps } from 'react';
import FileExplorerTest from './components/FileExplorerTest'; // Import the test component

function App() {
  const appRef = useRef<Application | null>(null);
  const appInitialized = useRef<boolean>(false); // Prevent double initialization in StrictMode
  const [splashScreenProps, setSplashScreenProps] = useState<ComponentProps<typeof SplashScreenComponent> | null>(null);
  const [appMainFinished, setAppMainFinished] = useState(false); // New state to track if app.main() has run

  useEffect(() => {
    if (appInitialized.current) {
      return;
    }
    appInitialized.current = true;

    console.log('App.tsx: useEffect - Initializing Application');

    const handleSplashScreenUpdate: SplashScreenUpdateCallback = (props) => {
      console.log('App.tsx: SplashScreen update callback received', props);
      setSplashScreenProps(props);
    };

    const app = new Application(handleSplashScreenUpdate);
    appRef.current = app;
    
    const startApp = async () => {
      if (document.getElementById('ra2web-root')) {
        console.log('App.tsx: #ra2web-root found, calling app.main()');
        try {
          await app.main();
          console.log('App.tsx: app.main() completed.');
          setAppMainFinished(true); // Signal that app.main() is done
        } catch (error) {
          console.error("Error running Application.main():", error);
          // Optionally set an error state here to display in UI
        }
      } else {
        console.warn('App.tsx: #ra2web-root not found yet, retrying...');
        setTimeout(startApp, 100); // Retry if not found
      }
    };

    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        startApp();
    } else {
        document.addEventListener('DOMContentLoaded', startApp);
    }

    // Cleanup function if needed, e.g., app.destroy()
    return () => {
      console.log('App.tsx: useEffect cleanup');
      setSplashScreenProps(null); 
      // Potentially call appRef.current?.destroy() if Application has a cleanup method
    };
  }, []); // Empty dependency array ensures this runs only once on mount

  return (
    <div className="App">
      {splashScreenProps && splashScreenProps.parentElement && (
        <SplashScreenComponent {...splashScreenProps} />
      )}
      {/* Render FileExplorerTest only after splash screen is done AND app.main() has finished */}
      {!splashScreenProps && appMainFinished && (
        <FileExplorerTest />
      )}
      {/* Message if app.main() hasn't finished yet but splash is gone (should be brief) */}
      {!splashScreenProps && !appMainFinished && (
        <p style={{ textAlign: 'center', marginTop: '20px' }}>
          Application main logic running...
        </p>
      )}
    </div>
  );
}

export default App; 