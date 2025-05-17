import React, { useEffect, useRef, useState } from 'react';
import { Application, SplashScreenUpdateCallback } from './Application'; // Adjust path if needed
import SplashScreenComponent from './gui/component/SplashScreen'; // Renamed to avoid conflict
import type { ComponentProps } from 'react';

function App() {
  const appRef = useRef<Application | null>(null);
  const appInitialized = useRef<boolean>(false); // Prevent double initialization in StrictMode
  const [splashScreenProps, setSplashScreenProps] = useState<ComponentProps<typeof SplashScreenComponent> | null>(null);

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
    
    // Ensure DOM is ready for ra2web-root element
    // setTimeout is a bit of a hack here, ideally DOMContentLoaded or similar should be handled by Application itself
    // but main.js had similar logic.
    const startApp = () => {
      if (document.getElementById('ra2web-root')) {
        console.log('App.tsx: #ra2web-root found, calling app.main()');
        app.main().catch(error => {
          console.error("Error running Application.main():", error);
        });
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
      // Cleanup splash screen explicitly when App unmounts or re-initializes (though not expected for root App)
      setSplashScreenProps(null); 
    };
  }, []); // Empty dependency array ensures this runs only once on mount

  return (
    <div className="App">
      {splashScreenProps && splashScreenProps.parentElement && (
        <SplashScreenComponent {...splashScreenProps} />
      )}
      {/* The main content of the app will go here, potentially hidden while splash is active */}
      {!splashScreenProps && (
         <p style={{ textAlign: 'center', marginTop: '20px' }}>
            React App Shell is running. <br />
            (SplashScreen finished or not active)
            {/* The Application.ts post-splash message will appear in #ra2web-root directly */} 
          </p>
      )}
    </div>
  );
}

export default App; 