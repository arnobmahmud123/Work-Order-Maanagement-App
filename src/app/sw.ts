import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist, BackgroundSyncPlugin, NetworkOnly } from "serwist";

// This declares the value of `injectionPoint` to TypeScript.
// `injectionPoint` is the string that points to where the precache manifest should be injected.
declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: any;

// Create a BackgroundSyncPlugin instance that will queue failed mutations
const bgSyncPlugin = new BackgroundSyncPlugin("mutation-queue", {
  maxRetentionTime: 24 * 60, // Retry for max of 24 Hours (specified in minutes)
});

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    ...defaultCache,
    {
      matcher: ({ request, url }) => {
        // Match API requests that modify data
        return url.pathname.startsWith('/api/') && 
          ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method);
      },
      handler: new NetworkOnly({
        plugins: [bgSyncPlugin],
      }),
    }
  ],
});

serwist.addEventListeners();

