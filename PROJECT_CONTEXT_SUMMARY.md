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

7.  **SplashScreen and Localization Implementation:**
    *   **SplashScreen Migration:**
        *   Migrated `extracted_modules_simple/gui/component/SplashScreen.js` to a React functional component `src/gui/component/SplashScreen.tsx`.
        *   Refactored `Application.ts` to remove `MockSplashScreen`.
        *   Integrated the new `SplashScreen.tsx` into `App.tsx` by passing props from `Application.ts` via a callback mechanism, allowing `Application.ts` to control its visibility and content (loading text, copyright, etc.).
    *   **Localization System (CSF and JSON):**
        *   Migrated `extracted_modules_simple/data/CsfFile.js` to `src/data/CsfFile.ts`, implementing CSF (Compiled String File) parsing logic. This included handling potential encoding issues and structural variations observed in provided CSF files.
        *   Migrated `extracted_modules_simple/data/Strings.js` to `src/data/Strings.ts`, which uses `CsfFile.ts` and the `sprintf-js` library for string formatting. Added `sprintf-js` as a project dependency.
        *   Updated `Application.ts` (`loadTranslations` method) to:
            *   Load a CSF file specified in `public/config.ini` (e.g., `general.csf`).
            *   Detect language from CSF or `config.ini`.
            *   Subsequently, load a corresponding JSON locale file (e.g., `public/res/locale/zh-CN.json`) based on the determined locale and version.
            *   Merge strings from both CSF and JSON sources into the `Strings` instance, with JSON values potentially overriding CSF values.
        *   Ensured `Application.ts` uses the new `Strings` instance for all user-facing text, including the SplashScreen.
    *   **Outcome:** The application now displays a React-based SplashScreen with text sourced from `general.csf` and `locale/*.json` files. Chinese characters from CSF are correctly decoded and displayed.

8.  **Deep Dive into Core UI and Resource Loading (Ongoing):**
    *   **Initial Target: `Gui.js` (Core UI Manager)**: Began analysis of `extracted_modules_simple/Gui.js` (located at the root of `extracted_modules_simple/`). This is a large, central module responsible for overall UI management, screen transitions, and integration of various UI components and services.
    *   **Dependency Analysis Revealed Resource Loading Path**: Analysis of `Gui.js` and its primary UI component `MainMenu.js` showed a dependency on image resources (SHP/PAL files) loaded via `Engine.images.get()` and `Engine.palettes.get()`.
    *   **Shift in Focus to `Engine.js` and VFS**: Tracing these resource loading calls led to `engine/Engine.js`. This static class manages global resources and a Virtual File System (`VFS`). It was discovered that `Engine.vfs` is responsible for accessing file data, including a crucial capability: loading and extracting files from MIX archives (e.g., `ra2.mix`, `language.mix`).
    *   **MIX File Parsing and Decryption Identified as Prerequisite**: To render UI elements that depend on SHP/PAL (and other game resources), the system must first be able to read from MIX files. This involves:
        *   Parsing the MIX file format itself (`MixFile.js`).
        *   Handling MIX file header/index encryption, which uses RSA to protect a Blowfish key (`BlowfishKey.js`), and then Blowfish to decrypt the index (`Blowfish.js`).
    *   **Current Focus (MIX/Crypto Migration)**: The migration effort is currently focused on accurately porting the cryptographic (RSA via `BlowfishKey.ts`, Blowfish via `Blowfish.ts`) and file format parsing (`MixEntry.ts`, `Crc32.ts`, and ultimately `MixFile.ts`) logic to TypeScript. This is a necessary foundational step before game assets (like SHP/PAL for UI) can be reliably loaded and used by higher-level UI components (whether custom JSX-rendered or new React components).
    *   **CSS Integration**: Identified and integrated the main legacy stylesheet (`main.site/style.css` as `public/css/main-legacy.css`) and font definitions (`main.site/res/fonts/fonts.css` as `public/res/fonts/fonts.css`) into the React project's `index.html` to improve visual consistency with the original application.

## Lessons Learned & Migration Methodology Notes

*   **Prioritize Original Logic**: When migrating legacy JavaScript modules, especially those dealing with proprietary or poorly documented formats (e.g., CSF files), prioritize closely understanding and replicating the behavior of the original code, even if it seems unconventional or not aligned with modern "best practices." Attempts to re-interpret based on general specifications without fully grasping the original implementation's nuances can lead to significant delays. The original code often contains implicit knowledge or workarounds for specific data quirks.
*   **CSS and Static Assets are Crucial for Visual Fidelity**: Do not underestimate the impact of global CSS files and static assets (fonts, images referenced in CSS) on the application's appearance. Ensure these are correctly identified, located (considering base paths in original deployment vs. local dev setup), and integrated into the new project early to maintain visual consistency and avoid confusion. Check original `index.html` for clues on asset loading.
*   **Incremental Debugging with Detailed Logging**: For complex parsing or stateful logic, instrumenting the code (both original, if possible, and migrated TypeScript) with detailed, step-by-step logging of state, pointers, and data read is invaluable for pinpointing discrepancies and understanding control flow.
*   **Validate Data Files with External Tools**: When dealing with binary or custom file formats (like CSF), using trusted third-party tools to inspect and validate the files being used for testing can quickly identify if the issue lies with the data file itself (corruption, non-standard format) or the parser logic.
*   **Understand the "Why" Behind Original Structure**: Before drastically refactoring a legacy module's structure (e.g., a large `Gui.js` orchestrator), first aim to understand *why* it was structured that way and what problems it was solving. This informs a more effective and less risky phased migration to new patterns (e.g., React components and hooks).

## Current Status & Next Steps:

1.  **Real Config Loading Achieved.**
2.  **SplashScreen and Localization Foundation Established.**
3.  **Core Resource Loading Pipeline (MIX/Crypto) - In Progress:**
    *   `Crc32.ts` and `MixEntry.ts` (including filename hashing) have been migrated and basic validation passed.
    *   `BlowfishKey.ts` (RSA and bignum arithmetic for Blowfish key decryption) is substantially migrated, with remaining complex bignum functions being completed. User has provided a trusted version of this file.
    *   `Blowfish.ts` (Blowfish symmetric encryption) is considered complete, pending population of S-Box data by the user.
    *   **Immediate Next Step**: Complete and verify `BlowfishKey.ts`. Then, migrate `MixFile.ts` to integrate these cryptographic components and enable reading from MIX archives. Once MIX reading is functional, the focus can return to `Engine.js` resource collections (images, palettes) and then back to `Gui.js` and its UI components.
4.  **Future Major Goal (Post Resource Loading):** Progress towards rendering the main game lobby/interface by migrating `Gui.js` functionality.
    *   Analyze and migrate components like `MainMenu.js`, `RootController.js`, and individual screen files.
    *   Address the custom JSX rendering system (`JsxRenderer.js`, `UiObject.js`, `HtmlView.js`) by either re-implementing visuals with React/DOM/R3F or finding ways to bridge/reuse existing rendering logic if it relies heavily on Three.js for non-DOM elements.
    *   Gradual un-mocking of `Application.ts` dependencies.
    *   Tackle `engine/Engine.js` parts related to game state and `GameRes` loading pipeline.

This summary should help anyone picking up this task to understand the progress and the immediate next steps. 