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
    *   `string.js` -> `string.ts`
    *   `math.js` -> `math.ts`
    *   `event.js` -> `event.ts` (provides `EventDispatcher`)
    *   `time.js` -> `time.ts`
    *   `typeGuard.js` -> `typeGuard.ts`
    *   `Routing.js` -> `Routing.ts`
    *   `BoxedVar.js` -> `BoxedVar.ts`

4.  **Root-level Modules Migration (from `extracted_modules_simple/` to `src/`):**
    *   `version.js` -> `version.ts`

5.  **Data Handling & VFS Primitives Migration (to `src/data/` and `src/data/vfs/`):**
    *   `data/IniSection.js` -> `src/data/IniSection.ts`
    *   `data/IniParser.js` -> `src/data/IniParser.ts`
    *   `data/DataStream.js` -> `src/data/DataStream.ts`
    *   `data/vfs/IOError.js` -> `src/data/vfs/IOError.ts`
    *   `data/vfs/VirtualFile.js` -> `src/data/vfs/VirtualFile.ts`
    *   `data/IniFile.js` -> `src/data/IniFile.ts`
    *   `Config.js` (root) -> `src/Config.ts`

6.  **MVP - SplashScreen Display & Real Config Load:**
    *   Created `src/Application.ts` (MVP version) with mocked dependencies initially.
    *   Modified `index.html` and `src/App.tsx` to initialize and run this MVP `Application`.
    *   Successfully displayed a `MockSplashScreen`.
    *   **Integrated Real Config Loading:** 
        *   Modified `Application.ts` to fetch `/config.ini` (from `public/` dir).
        *   Used migrated `IniFile.ts` and `Config.ts` to parse and load the configuration.
        *   Replaced the mocked `this.config` in `Application.ts` with the instance loaded with real data.
    *   **Outcome:** Successfully loaded and parsed `config.ini`. Console logs and slight behavior changes (e.g., `devMode` affecting sleep, locale in mock strings) confirmed that `Application.ts` now uses real configuration data for its initial steps. The final MVP screen also dumps the loaded config for verification.

## Current Status & Next Steps:

1.  **Real Config Loading Achieved:** The application now loads and uses configuration from an external `config.ini` file.
2.  **Next Major Goal:** Progress towards rendering the main game lobby/interface. This will involve:
    *   **SplashScreen Refinement:** Migrate the actual `gui/component/SplashScreen.js` to `src/gui/component/SplashScreen.tsx` (as a React component) or `SplashScreen.ts` and integrate it properly, replacing `MockSplashScreen`. This will be the immediate next step to get a more faithful initial UI.
    *   **String/Localization (`Strings.js`, `CsfFile.js`):** Migrate these to enable real text rendering, especially for the SplashScreen and subsequent UI elements. This is a high priority after SplashScreen.
    *   **Core UI Management (`Gui.js`):** Analyze and migrate `extracted_modules_simple/gui/Gui.js`. This is crucial for rendering the main application shell and lobby.
    *   **Gradual Un-mocking of `Application.ts`:** Continue replacing mocked sections in `Application.ts` (e.g., `GameRes` loading, Sentry, logging) as their underlying modules are migrated and become necessary for further UI development.
    *   **Engine and GameRes:** Tackle parts of `engine/Engine.js` and the `GameRes` loading pipeline.

This summary should help anyone picking up this task to understand the progress and the immediate next steps. 