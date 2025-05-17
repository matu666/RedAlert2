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
    *   `data/vfs/IOError.js` -> `src/data/vfs/IOError.ts` (recreated as needed)
    *   `data/vfs/VirtualFile.js` -> `src/data/vfs/VirtualFile.ts`
    *   `data/IniFile.js` -> `src/data/IniFile.ts`
    *   `Config.js` (root) -> `src/Config.ts`
    *   `data/Crc32.js` -> `src/data/Crc32.ts`
    *   `data/MixEntry.js` -> `src/data/MixEntry.ts`
    *   `data/encoding/BlowfishKey.js` -> `src/data/encoding/BlowfishKey.ts`
    *   `data/encoding/Blowfish.js` -> `src/data/encoding/Blowfish.ts`
    *   `data/MixFile.js` -> `src/data/MixFile.ts` (Migration and MVP validation complete)


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
        *   Migrated `extracted_modules_simple/data/CsfFile.js` to `src/data/CsfFile.ts`.
        *   Migrated `extracted_modules_simple/data/Strings.js` to `src/data/Strings.ts`.
        *   Updated `Application.ts` (`loadTranslations` method) for CSF and JSON loading.
    *   **Outcome:** The application now displays a React-based SplashScreen with text sourced from `general.csf` and `locale/*.json` files.

8.  **Deep Dive into Core UI and Resource Loading (Ongoing):**
    *   **Initial Target: `Gui.js` (Core UI Manager)**: Analysis of `extracted_modules_simple/Gui.js`.
    *   **Dependency Analysis Revealed Resource Loading Path**: Analysis of `Gui.js` and `MainMenu.js` showed dependency on resources loaded via `Engine.images.get()` and `Engine.palettes.get()`.
    *   **Shift in Focus to `Engine.js` and VFS**: Led to `engine/Engine.js` and its `VFS`.
    *   **MIX File Parsing and Decryption Identified as Prerequisite**: This involves `MixFile.js`, `BlowfishKey.js`, and `Blowfish.js`.
    *   **Current Focus (MIX/Crypto Migration)**: The migration effort has **successfully ported** the cryptographic (RSA via `BlowfishKey.ts`, Blowfish via `Blowfish.ts`) and file format parsing (`MixEntry.ts`, `Crc32.ts`, and now **`MixFile.ts`**) logic to TypeScript. The **`MixFile.ts` module has been MVP validated for loading MIX archives (tested with `public/ini.mix` in `Application.ts`)**. This is a necessary foundational step before game assets (like SHP/PAL for UI) can be reliably loaded and used by higher-level UI components.
    *   **CSS Integration**: Main legacy stylesheet and fonts integrated.

## Lessons Learned & Migration Methodology Notes

*   **Prioritize Original Logic**: Crucial for proprietary formats.
*   **CSS and Static Assets are Crucial for Visual Fidelity**: Integrate early.
*   **Incremental Debugging with Detailed Logging**: Invaluable for complex parsing.
*   **Validate Data Files with External Tools**: Identify issues with data vs. parser.
*   **Understand the "Why" Behind Original Structure**: Inform effective refactoring.
*   **MVP-focused Iteration**: For complex features like MIX loading, aim to get a minimal version working and verifiable quickly, then integrate it into the broader system.

## Current Status & Next Steps:

1.  **Real Config Loading Achieved.**
2.  **SplashScreen and Localization Foundation Established.**
3.  **Core Resource Loading Pipeline (MIX/Crypto) - Foundational Parts Migrated & Validated:**
    *   `Crc32.ts` and `MixEntry.ts` (including filename hashing) have been migrated and basic validation passed.
    *   `BlowfishKey.ts` (RSA and bignum arithmetic for Blowfish key decryption) is substantially migrated. User has provided a trusted version of this file.
    *   `Blowfish.ts` (Blowfish symmetric encryption) is considered complete, pending population of S-Box data by the user.
    *   **`MixFile.ts` has been successfully migrated to TypeScript.**
        *   **MVP Validation**: An MVP test in `Application.ts` confirmed that `MixFile.ts` can load `public/ini.mix`, parse its header/index, list file entries, and open an internal file (`rules.ini`).
    *   **Immediate Next Step**: Integrate `MixFile.ts` functionality into the broader resource loading pipeline. This likely involves:
        1.  Migrating `extracted_modules_simple/data/vfs/VirtualFileSystem.js` to `src/data/vfs/VirtualFileSystem.ts`, ensuring it correctly uses the new `MixFile.ts` for adding MIX archives.
        2.  Analyzing `extracted_modules_simple/engine/Engine.js` to understand how it uses the VFS and its resource collections (`images`, `palettes`, `iniFiles`, etc.).
        3.  Incrementally migrating `Engine.js` functionality or its dependencies to TypeScript, enabling it to use the migrated VFS and `MixFile` to load game resources from MIX archives.
    *   Once MIX reading is robustly integrated into `Engine.js` via the VFS, the focus can shift to loading specific game assets (like SHP/PAL for UI) and then back to `Gui.js` and its UI components.
4.  **Future Major Goal (Post Resource Loading):** Progress towards rendering the main game lobby/interface by migrating `Gui.js` functionality.
    *   Analyze and migrate components like `MainMenu.js`, `RootController.js`, and individual screen files.
    *   Address the custom JSX rendering system.
    *   Gradual un-mocking of `Application.ts` dependencies.

This summary should help anyone picking up this task to understand the progress and the immediate next steps.