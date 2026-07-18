import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist } from "serwist";

// This declares the value of `injectionPoint` to TypeScript.
// `injectionPoint` is the string that points to where the precache manifest should be injected.
declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: any;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
});

serwist.addEventListeners();

// Custom Sync event for background mutations
self.addEventListener('sync', (event: any) => {
  if (event.tag === 'sync-mutations') {
    event.waitUntil(processMutations());
  }
});

async function processMutations() {
  return new Promise<void>((resolve, reject) => {
    const request = indexedDB.open('work-order-db', 1);
    
    request.onsuccess = async (e: any) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('mutations')) {
        resolve();
        return;
      }
      
      const tx = db.transaction('mutations', 'readwrite');
      const store = tx.objectStore('mutations');
      const getAllReq = store.getAll();
      
      getAllReq.onsuccess = async () => {
        const mutations = getAllReq.result;
        for (const mutation of mutations) {
          try {
            const response = await fetch(mutation.url, {
              method: mutation.method,
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(mutation.body),
            });
            
            if (response.ok) {
              const deleteTx = db.transaction('mutations', 'readwrite');
              deleteTx.objectStore('mutations').delete(mutation.id);
            }
          } catch (err) {
            console.error('Failed to sync mutation:', err);
          }
        }
        resolve();
      };
      
      getAllReq.onerror = () => reject(getAllReq.error);
    };
    
    request.onerror = () => reject(request.error);
  });
}

