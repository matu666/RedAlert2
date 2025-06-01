// src/util/Routing.ts

type RouteController = (params: string[]) => void | Promise<void>;

interface RouteEntry {
  controller: RouteController;
}

export class Routing {
  private routes: Record<string, RouteEntry> = {};

  constructor() {}

  public addRoute(path: string, controller: RouteController): void {
    // Preserve wildcard route key "*" exactly as it is so that it can be matched later
    const normalizedPath = path === "*" ? "*" : (path.startsWith('/') ? path : `/${path}`);
    this.routes[normalizedPath] = { controller };
  }

  public init(): void {
    // Ensure this runs only in a browser environment
    if (typeof window !== 'undefined' && typeof location !== 'undefined') {
      window.addEventListener("hashchange", this.handleHashChange);
      this.router(); // Initial route check
    } else {
      console.warn("Routing.init: Cannot initialize routing outside of a browser environment.");
    }
  }

  // Use a bound method for the event listener to maintain `this` context
  private handleHashChange = (): void => {
    this.router();
  };

  public async router(): Promise<void> {
    if (typeof location === 'undefined') {
      return; // Not in a browser environment
    }

    const hashPath = location.hash.slice(1) || "/"; // Get path from hash, default to "/"

    // Original logic: if (t.match(/^\//)) { var [, i, ...r] = t.split("/"); ... }
    // This implies paths are expected like "#/segment1/param1/param2"
    // where "/segment1" is the route key and param1, param2 are parameters.

    if (hashPath.startsWith('/')) {
      const segments = hashPath.split('/'); // e.g., ["", "segment1", "param1", "param2"]
      const mainSegment = segments[1] || ''; // "segment1" or empty if path is just "/"
      const params = segments.slice(2);    // ["param1", "param2"]

      const routeKey = `/${mainSegment}`;

      // Handle wildcard route first if it exists
      const wildcardRoute = this.routes["*"]; // Original used "*" directly as key
      if (wildcardRoute) {
        // The original passed all segments after the first slash (including mainSegment if it wasn't the root)
        // For a path like #/foo/bar, original r was ["foo", "bar"]
        // Let's adjust to pass params as defined (segments after the main route segment)
        // Or, if wildcard is meant to capture the entire hashPath split: const wildcardParams = hashPath.split('/').slice(1);
        await wildcardRoute.controller(params); // Assuming params are what wildcard controller expects
      }

      const specificRoute = this.routes[routeKey];
      if (specificRoute && specificRoute.controller) {
        await specificRoute.controller(params);
      } else if (!wildcardRoute && routeKey !== "/") { // Avoid double call if wildcard handled root
        // Optional: Handle case where specific route is not found (and no wildcard)
        console.warn(`Routing: No controller found for route '${routeKey}'`);
        // You might want a default handler or redirect here, e.g., this.routes['/404']?.controller([]);
      }
    } else {
      // Path does not start with '/', could be a simple hash like #myAnchor
      // Or treat as an error/default route. Original code only processed paths starting with '/'.
      console.warn(`Routing: Path '${hashPath}' does not conform to expected format (e.g., #/path/to/resource)`);
      // Potentially call a default route if available: this.routes["/"]?.controller([]);
    }
  }

  public destroy(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener("hashchange", this.handleHashChange);
    }
  }
} 