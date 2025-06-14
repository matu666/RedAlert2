import * as THREE from 'three';

// Attach THREE to the global window object so that libraries like
// shader-particle-engine (which expects a global THREE) can access it.
// Doing this in a dedicated module ensures it executes **before** any
// other imports that might rely on this side-effect.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
window.THREE = THREE;

export { THREE }; 