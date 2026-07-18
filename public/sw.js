const CACHE_NAME = 'wo-cache-v1';
const API_URL = '/api/work-orders';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Cache the work orders GET API
  if (url.pathname === API_URL && event.request.method === 'GET') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
  }
});

// Sync event for background mutations
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-mutations') {
    event.waitUntil(processMutations());
  }
});

async function processMutations() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('work-order-db', 1);
    
    request.onsuccess = async (e) => {
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