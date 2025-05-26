import React, { useEffect, useRef, useState } from 'react';
import { Application, SplashScreenUpdateCallback } from './Application'; // Adjust path if needed
import SplashScreenComponent from './gui/component/SplashScreen'; // Renamed to avoid conflict
import type { ComponentProps } from 'react';
import GameResourcesViewer from './gui/component/GameResourcesViewer'; // Import the new component
import { GlslGenerationTest } from './test/GlslGenerationTest'; // Import the test component

function App() {
  const appRef = useRef<Application | null>(null);
  const appInitialized = useRef<boolean>(false); // Prevent double initialization in StrictMode
  const [splashScreenProps, setSplashScreenProps] = useState<ComponentProps<typeof SplashScreenComponent> | null>(null);
  const [showTestMode, setShowTestMode] = useState(false); // New state for test mode

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
        } catch (error) {
          console.error("Error running Application.main():", error);
          // Optionally set an error state here to display in UI
        }
      } else {
        console.warn('App.tsx: #ra2web-root not found yet, retrying...');
        setTimeout(startApp, 100); // Retry if not found
      }
    };

    // Check if we should skip normal app initialization for test mode
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('test') === 'glsl') {
      setShowTestMode(true);
      return; // Skip normal app initialization
    }

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

  // If in test mode, show the test component
  if (showTestMode) {
    return (
      <div className="App">
        <div style={{ 
          position: 'fixed', 
          top: '10px', 
          right: '10px', 
          zIndex: 1000 
        }}>
          <button 
            onClick={() => {
              window.location.href = window.location.pathname; // Remove query params
            }}
            style={{
              background: '#6c757d',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            返回正常模式
          </button>
        </div>
        <GlslGenerationTest />
      </div>
    );
  }

  return (
    <div className="App">
      {splashScreenProps && splashScreenProps.parentElement && (
        <SplashScreenComponent {...splashScreenProps} />
      )}
    </div>
  );
}

export default App; 