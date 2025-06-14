import * as THREE from 'three';
import { Octree } from '@brakebein/threeoctree';

export class FrustumCuller {
  /**
   * Perform frustum culling on the provided octree.
   *
   * NOTE: The original JavaScript implementation used the legacy `three-octree` structure where
   * `node.box` contained a ready-made THREE.Box3 and `node.children` was an array of child nodes.
   * The React migration switched to the actively maintained `@brakebein/threeoctree` package whose
   * internal node representation differs:
   *   • Every node exposes its spatial information via `position` (Vector3) and `radius` (number).
   *   • Child nodes are referenced via the integer list `nodesIndices` and the map `nodesByIndex`.
   *   • There is no built-in Box3 instance – we must build one on the fly when required.
   *
   * The logic below rebuilds the original behaviour while translating to the new API.  The runtime
   * crash (`Cannot read properties of undefined (reading 'min')`) was caused by passing `undefined`
   * to `Frustum.intersectsBox` because `node.box` no longer exists.  We now compute an axis-aligned
   * bounding box from `position` ± `radius` once per node and cache it under a symbol-keyed property
   * to avoid allocations during subsequent frames.
   */
  cull<T extends THREE.Mesh = THREE.Mesh>(octree: Octree<T>, frustum: THREE.Frustum): any[] {
    const visibleNodes: any[] = [];

    const traverse = (node: any): void => {
      // Lazily create & cache a Box3 on the node instance.
      // We use a symbol to minimise the risk of clashing with library fields.
      const BOX_KEY: unique symbol = Symbol.for('__ra2web_box');
      let box = (node as any)[BOX_KEY] as THREE.Box3 | undefined;

      if (!box) {
        const r = node.radius + (node.overlap ?? 0);
        const pos = node.position;
        box = new THREE.Box3(
          new THREE.Vector3(pos.x - r, pos.y - r, pos.z - r),
          new THREE.Vector3(pos.x + r, pos.y + r, pos.z + r)
        );
        (node as any)[BOX_KEY] = box;
      }

      if (frustum.intersectsBox(box)) {
        (node as any).visible = true;

        // Recursively process children if any – translate from the new API data structures.
        if (Array.isArray(node.nodesIndices) && node.nodesIndices.length > 0) {
          for (const index of node.nodesIndices) {
            const child = node.nodesByIndex[index];
            if (child) {
              traverse(child);
            }
          }
        }

        visibleNodes.push(node);
      } else {
        (node as any).visible = false;
      }
    };

    traverse(octree.root);
    return visibleNodes;
  }
}