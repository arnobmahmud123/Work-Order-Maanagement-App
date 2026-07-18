import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface WorkOrderDB extends DBSchema {
  workOrders: {
    key: string;
    value: any;
    indexes: { 'by-status': string };
  };
  mutations: {
    key: string;
    value: {
      id: string;
      url: string;
      method: string;
      body: any;
      timestamp: number;
    };
  };
}

let dbPromise: Promise<IDBPDatabase<WorkOrderDB>> | null = null;

export function getDB() {
  if (typeof window === 'undefined') return null;
  if (!dbPromise) {
    dbPromise = openDB<WorkOrderDB>('work-order-db', 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('workOrders')) {
          const woStore = db.createObjectStore('workOrders', { keyPath: 'id' });
          woStore.createIndex('by-status', 'status');
        }
        if (!db.objectStoreNames.contains('mutations')) {
          db.createObjectStore('mutations', { keyPath: 'id' });
        }
      },
    });
  }
  return dbPromise;
}

export async function saveWorkOrdersToIDB(workOrders: any[]) {
  const db = await getDB();
  if (!db) return;
  const tx = db.transaction('workOrders', 'readwrite');
  await Promise.all([
    ...workOrders.map((wo) => tx.store.put(wo)),
    tx.done,
  ]);
}

export async function getWorkOrdersFromIDB() {
  const db = await getDB();
  if (!db) return [];
  return db.getAll('workOrders');
}

export async function queueMutation(url: string, method: string, body: any) {
  const db = await getDB();
  if (!db) return;
  const id = crypto.randomUUID();
  await db.put('mutations', {
    id,
    url,
    method,
    body,
    timestamp: Date.now(),
  });
  
  // Try to register background sync if supported
  if ('serviceWorker' in navigator && 'SyncManager' in window) {
    try {
      const swRegistration = await navigator.serviceWorker.ready;
      // @ts-ignore
      await swRegistration.sync.register('sync-mutations');
    } catch (err) {
      console.error('Background Sync registration failed:', err);
    }
  }
}

export async function getPendingMutations() {
  const db = await getDB();
  if (!db) return [];
  return db.getAll('mutations');
}

export async function removeMutation(id: string) {
  const db = await getDB();
  if (!db) return;
  await db.delete('mutations', id);
}
