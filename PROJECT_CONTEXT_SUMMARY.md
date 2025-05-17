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
    *   `Crc32.ts`, `MixEntry.ts`, `BlowfishKey.ts`, `Blowfish.ts`, and **`MixFile.ts`** have been successfully migrated and MVP validated.

4.  **Virtual File System (VFS) Primitives Migration & Initial Testing:**
    *   Successfully migrated `extracted_modules_simple/data/vfs/VirtualFileSystem.js` to `src/data/vfs/VirtualFileSystem.ts`.
    *   Migrated its core dependencies:
        *   Error types: `FileNotFoundError.ts`, `IOError.ts` (confirmed pre-existing), `StorageQuotaError.ts`, `NameNotAllowedError.ts`.
        *   VFS components: `VirtualFile.ts`, `MemArchive.ts`.
        *   Data format handlers: `IdxEntry.ts`, `IdxFile.ts`, `AudioBagFile.ts`.
        *   Utilities: `EngineType.ts`, `logger.ts` (using `js-logger`).
    *   **`RealFileSystemDir.ts` and `RealFileSystem.ts` Migrated:** These components, wrapping the browser's File System Access API, have been migrated. They are used to interact with user-selected local directories.
    *   **Identified `fsalib.min.js` (`file-system-access` module):** This is a crucial library in the original project, loaded via SystemJS. It acts as a polyfill/wrapper for the native File System Access API and, importantly, **provides adapters for IndexedDB (database named "fileSystem") and potentially Cache API, allowing browser storage to be treated with a file-system-like interface.**
    *   **Understanding File Storage**: The original project appears to use a hybrid approach:
        *   **Local File System Access**: Via File System Access API (wrapped by `fsalib` or used natively), for operations like allowing the user to designate local directories for specific content types (e.g., replays, mods).
        *   **Browser Internal Storage (IndexedDB)**: For storing application-managed data like game resources, replay metadata, or other assets not directly tied to a user-selected local path. The `fsalib` IndexedDB adapter likely provides a `FileSystemHandle`-compatible interface to this storage.
    *   **`FileExplorerTest.tsx` Component Created for VFS/RFS Testing:**
        *   This component loads the original `file-explorer.js` and `file-explorer.css` (from `public/other/`).
        *   It allows users to select a local directory using `window.showDirectoryPicker()`.
        *   The selected `FileSystemDirectoryHandle` is used to initialize `RealFileSystem.ts`.
        *   `VirtualFileSystem.ts` is initialized with this `RealFileSystem` instance.
        *   `FileExplorer` UI is instantiated and its `onrefresh` callback is configured to list entries from the selected local directory via `RealFileSystem` and `FileSystemDirectoryHandle.entries()`.
        *   **Current Test Status**:
            *   Successfully displays contents of the selected local directory and its subdirectories.
            *   Navigation within the local directory in `FileExplorer` UI works.
            *   `onnewfolder` callback for creating folders in the local directory currently encounters a `NotFoundError`. User activation and document focus have been confirmed *not* to be the cause. Debugging is focused on path resolution within the `onnewfolder` callback and how `FileExplorer.js` path segments map to `FileSystemDirectoryHandle` operations.
            *   Basic stubs for `onopenfile` and `ondelete` are in place.

5.  **Next Immediate Steps & Goals:**
    *   **A. Resolve `NotFoundError` in `FileExplorerTest.tsx -> onnewfolder`**:
        *   Continue debugging the path resolution logic within `onnewfolder` when creating directories in the selected local file system. Ensure the `parentActualDirHandle` correctly points to the target directory where the new folder should be created.
        *   Verify how `FileExplorer.js` path segments (ID, name) for the root and subdirectories should be interpreted when interacting with `FileSystemDirectoryHandle` API.
    *   **B. Integrate and Test `fsalib.min.js` IndexedDB Adapter**:
        *   Determine the best way to load `fsalib.min.js` in the Vite-React environment (e.g., via `index.html` script tag or dynamic import).
        *   In `FileExplorerTest.tsx` (or a new test component), initialize the IndexedDB adapter from `window.FileSystemAccess.adapters.indexeddb()`. This should provide a root "directory handle" for the "fileSystem" IndexedDB database.
        *   Configure an instance of `FileExplorer` to use this IndexedDB-backed handle as its data source (i.e., its `onrefresh` callback will interact with this handle).
        *   Test browsing, creating, reading, and deleting files/folders within this IndexedDB-based virtual file system.
    *   **C. Unified `FileExplorer` Data Handling**:
        *   Refine `FileExplorerTest.tsx`'s `onrefresh` and other callbacks to intelligently switch between the real local `FileSystemDirectoryHandle` and the `fsalib`-provided IndexedDB/Cache API virtual handles based on the path or context.
        *   Implement full file operations (open, save, delete, rename, etc.) for both local and IndexedDB-backed storage via the `FileExplorer` interface.
    *   **D. Integrate `MixFile.ts` with `VirtualFileSystem.ts` for Browsing MIX Archives**:
        *   Modify `VirtualFileSystem.ts` and `FileExplorerTest.tsx`'s `onrefresh` logic so that when a `.mix` file is encountered (either in the local file system or IndexedDB), `vfs.addMixFile()` is called.
        *   The `FileExplorer` should then be able to navigate *into* the MIX file, with `onrefresh` fetching entries from the `MixFile` instance.
        *   `MixFile.ts` will need a method to list its internal entries in a format compatible with `ExplorerEntry`.

6.  **Future Major Goal (Post Resource Loading & Advanced VFS Testing):** Progress towards rendering the main game lobby/interface by migrating `Gui.js` functionality, leveraging the now more robust VFS.
    *   Analyze and migrate components like `MainMenu.js`, `RootController.js`.
    *   Address the custom JSX rendering system.
    *   Gradual un-mocking of `Application.ts` dependencies, replacing them with real migrated modules that use the VFS for resource access.

This summary should help anyone picking up this task to understand the progress and the immediate next steps, particularly concerning the dual nature of file storage (local FSA & IndexedDB via fsalib) and the plan to test both.