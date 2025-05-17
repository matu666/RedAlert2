# Project Context Summary (RA2Web React Decompile)

This document summarizes the current state of the RA2Web React decompile project.

## Overall Goal

The primary objective is to reverse-engineer an existing JavaScript project (presumably related to Red Alert 2 Web, based on filenames and dependencies) into a modern React application using Vite and TypeScript. The new React project is being developed in the `ra2web-react` directory.

## Source Project for Migration

The original JavaScript project files, which are the target for reverse engineering, are located in the `extracted_modules_simple/` directory within the `ra2web-react` workspace.

Key source files and directories for migration reside within `ra2web-react/extracted_modules_simple/`:
*   Files like `Application.js`, `BattleControlApi.js`, `main.js` etc.
*   Subdirectories: `data/`, `engine/`, `game/`, `gui/`, `network/`, `util/`, `worker/`.
*   The dependency map being referenced is `ra2web-react/extracted_modules_simple/module-dependencies.json`.

## Activities Performed So Far in `ra2web-react/`:

1.  **Initial Analysis:**
    *   Partially analyzed `extracted_modules_simple/module-dependencies.json`.
    *   Identified key areas and some external dependencies.

2.  **React Project Setup (Manual with Vite):**
    *   Created `package.json`, TypeScript configs (`tsconfig.json`, `tsconfig.node.json`), `vite.config.ts`, `index.html`, and basic `src/` structure (`App.tsx`, `main.tsx`, `vite-env.d.ts`).
    *   Added `.gitignore`.

3.  **Utility Modules Migration (from `extracted_modules_simple/util/` to `src/util/`):**
    *   `Base64.js` -> `Base64.ts`
    *   `string.js` -> `string.ts` (depends on `Base64.ts`)
    *   `math.js` -> `math.ts`
    *   `event.js` -> `event.ts` (provides `EventDispatcher`)
    *   `time.js` -> `time.ts` (provides `sleep`, `throttle`, `createThrottledMethod`)
    *   `typeGuard.js` -> `typeGuard.ts`
    *   `Routing.js` -> `Routing.ts`
    *   `BoxedVar.js` -> `BoxedVar.ts` (depends on `event.ts`)

4.  **Root-level Modules Migration (from `extracted_modules_simple/` to `src/`):**
    *   `version.js` -> `version.ts`
    *   Skipped `Config.js` for now due to its INI parsing dependency.

5.  **MVP - SplashScreen Display:**
    *   **Goal:** Execute the application's entry point (`main.js` -> `Application.js`) to display a minimal viable product (the splash screen).
    *   Analyzed `extracted_modules_simple/main.js`: it instantiates `Application` and calls its `main()` method.
    *   Analyzed `extracted_modules_simple/Application.js` (partially, due to size): identified its core responsibilities and heavy dependencies related to config, translations, GameRes, and UI initialization.
    *   Created `src/Application.ts` (MVP version):
        *   Includes many mocked internal classes/dependencies (e.g., `MockSplashScreen`, `MockLocalPrefs`, `MockConsoleVars`, `MockDevToolsApi`, `MockFullScreen`) to allow the `main()` method to proceed to display a splash screen.
        *   The `loadConfig()` and `loadTranslations()` methods within `Application.ts` are heavily mocked to provide minimal necessary data without full backend logic for these systems.
        *   The `main()` method in `Application.ts` is simplified to focus on initializing and rendering the `MockSplashScreen`, skipping complex GameRes loading, Sentry, logging, etc., for this MVP.
    *   Modified `index.html` to include `<div id="ra2web-root"></div>` for the `MockSplashScreen` to render into, alongside React's own `<div id="root"></div>`.
    *   Modified `src/App.tsx` to:
        *   Import and instantiate `Application` from `src/Application.ts`.
        *   Call the `app.main()` method within a `useEffect` hook to simulate the original application startup, ensuring `#ra2web-root` exists.
    *   **Outcome:** Successfully displayed the `MockSplashScreen` (a styled div with text managed by the `Application.ts` MVP code), confirming the basic application flow can be initiated from within the React host. Console logs confirm the mocked flow.

## Current Status & Next Steps:

1.  **MVP Achieved:** The first MVP (displaying a mock splash screen via the migrated `Application` class structure) is working.
2.  **Next Major Goal:** Progress towards rendering the main game lobby/interface. This will likely involve a phased approach:
    *   **Config Loading:** Migrate `Config.js` and its INI parsing dependencies (`data/IniFile.js`, `data/IniParser.js`, `data/IniSection.js`). This is a critical un-mocking step.
    *   **SplashScreen Refinement:** Migrate the actual `gui/component/SplashScreen.js` to `src/gui/component/SplashScreen.tsx` (as a React component) or `SplashScreen.ts` and integrate it properly, replacing `MockSplashScreen`.
    *   **Core UI Management (`Gui.js`):** Analyze and migrate `extracted_modules_simple/gui/Gui.js`. This module is likely responsible for overall UI orchestration, screen transitions, and rendering the main application shell (including the lobby).
    *   **String/Localization (`Strings.js`, `CsfFile.js`):** Migrate these to enable real text rendering instead of mock strings.
    *   **Gradual Un-mocking of `Application.ts`:** Incrementally replace mocked sections in `Application.ts` related to `GameRes` loading, error handling (Sentry), logging, and other services as their underlying modules are migrated.
    *   **Engine and GameRes:** Tackle parts of `engine/Engine.js` and the `GameRes` loading pipeline that are essential for displaying any game-related data or UI.

This summary should help anyone picking up this task to understand the progress and the immediate next steps. 