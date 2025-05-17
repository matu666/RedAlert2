# Project Context Summary (RA2Web React Decompile)

This document summarizes the current state of the RA2Web React decompile project.

## Overall Goal

The primary objective is to reverse-engineer an existing JavaScript project (presumably related to Red Alert 2 Web, based on filenames and dependencies) into a modern React application using Vite and TypeScript. The new React project is being developed in the `ra2web-react` directory.

## Source Project for Migration

The original JavaScript project files, which are the target for reverse engineering, are located in the `extracted_modules_simple/` directory. This directory is understood to be a sibling to the `ra2web-react/` directory (both likely under a common parent like `ra2web-decompile/`).

Key source files and directories for migration reside within `extracted_modules_simple/`:
*   Files like `Application.js`, `BattleControlApi.js`, etc.
*   Subdirectories: `data/`, `engine/`, `game/`, `gui/`, `network/`, `util/`, `worker/`.
*   The dependency map that was analyzed is `extracted_modules_simple/module-dependencies.json`.

## Activities Performed So Far in `ra2web-react/`:

1.  **Initial Analysis (of source in `extracted_modules_simple/`):**
    *   Located and partially analyzed `extracted_modules_simple/module-dependencies.json` to understand the original project's structure and dependencies.
    *   Identified key areas in the original project: `data/` (file parsing, VFS), `util/` (utilities), `engine/` (game engine), `game/` (game logic), `network/` (networking), and `gui/` (UI components).
    *   Noted potential external dependencies like `js-logger`, `wavefile`, `sprintf-js`.

2.  **React Project Setup (Manual with Vite in `ra2web-react/`):**
    *   An attempt to use `create-react-app` (intended for `ra2web-react/` but mistakenly run in `extracted_modules_simple/`) highlighted that the source directory was non-empty.
    *   A manual setup for a React + Vite + TypeScript project was subsequently performed directly within the `ra2web-react/` directory.
    *   The following new files/directories were created in `ra2web-react/`:
        *   `package.json` (with React, ReactDOM, Vite, TypeScript dependencies)
        *   `tsconfig.json`
        *   `tsconfig.node.json`
        *   `vite.config.ts`
        *   `index.html` (root HTML file)
        *   `src/` directory containing:
            *   `main.tsx` (React app entry point)
            *   `App.tsx` (basic root component)
            *   `vite-env.d.ts` (Vite TypeScript environment types)
        *   `.gitignore` (with common ignores for Node/React/Vite projects)

## Current Status & Next Steps for User:

1.  **Install Dependencies:** The user needs to navigate to the `ra2web-react/` directory in their terminal and run `npm install` (or `yarn install`) to install the dependencies defined in `package.json`.
2.  **Start Development Server:** After installing dependencies, the user should run `npm run dev` (or `yarn dev`) from the `ra2web-react/` directory to start the Vite development server. This should verify that the basic React app renders correctly (e.g., shows "Hello from React + Vite!").
3.  **Begin Migration:** Once the React project setup is confirmed to be working, the next phase will be to plan and execute the migration of modules from the `extracted_modules_simple/` directory into the new React structure in `ra2web-react/`.

This summary should help anyone picking up this task to understand the progress and the immediate next steps. 