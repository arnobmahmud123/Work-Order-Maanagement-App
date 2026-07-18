import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface PreservationDB extends DBSchema {
  'offline-photos': {
    key: string;
    value: {
      id: string; // temp ID
      workOrderId: string;
      category: string;
      file: File;
      photoName: string;
      createdAt: number;
    };
  };
}

let dbPromise: Promise<IDBPDatabase<PreservationDB>> | null = null;

function getDB() {
  if (typeof window === 'undefined') return null;
  if (!dbPromise) {
    dbPromise = openDB<PreservationDB>('preservation-offline', 1, {
      upgrade(db) {
        db.createObjectStore('offline-photos', { keyPath: 'id' });
      },
    });
  }
  return dbPromise;
}

export async function addPhotoToQueue(photo: {
  id: string;
  workOrderId: string;
  category: string;
  file: File;
  photoName: string;
}) {
  const db = await getDB();
  if (!db) return;
  
  await db.put('offline-photos', {
    ...photo,
    createdAt: Date.now(),
  });
}

export async function getQueuedPhotos() {
  const db = await getDB();
  if (!db) return [];
  return db.getAll('offline-photos');
}

export async function removePhotoFromQueue(id: string) {
  const db = await getDB();
  if (!db) return;
  await db.delete('offline-photos', id);
}

export async function clearQueue() {
  const db = await getDB();
  if (!db) return;
  await db.clear('offline-photos');
}
