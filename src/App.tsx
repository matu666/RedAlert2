import React, { useEffect, useRef } from 'react';
import { Application } from './Application'; // Adjust path if needed

function App() {
  const appRef = useRef<Application | null>(null);
  const appInitialized = useRef<boolean>(false); // Prevent double initialization in StrictMode

  useEffect(() => {
    if (appInitialized.current) {
      return;
    }
    appInitialized.current = true;

    console.log('App.tsx: useEffect - Initializing Application');
    const app = new Application();
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
      console.log('App.tsx: useEffect cleanup - Application might be destroyed here if it had a destroy method.');
      // if (appRef.current && typeof appRef.current.destroy === 'function') {
      //   appRef.current.destroy();
      // }
    };
  }, []); // Empty dependency array ensures this runs only once on mount

  return (
    <div className="App">
      {/* 
        The main React app UI could go here. 
        For the MVP, Application.ts will directly manipulate #ra2web-root.
        We might eventually want Application's UI parts to be React components rendered here.
      */}
      <p style={{ textAlign: 'center', marginTop: '20px' }}>
        React App Shell is running. <br />
        The legacy application logic (SplashScreen MVP) should be managing the '#ra2web-root' div separately.
      </p>
    </div>
  );
}

export default App; 