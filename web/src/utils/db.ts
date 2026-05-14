import { openDB } from 'idb';
import type { DBSchema, IDBPDatabase } from 'idb';
import type { Measurement } from '../types';

interface MeasureDB extends DBSchema {
  measurements: {
    key: string;
    value: Measurement;
    indexes: {
      'by-timestamp': number;
    };
  };
}

let dbPromise: Promise<IDBPDatabase<MeasureDB>> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<MeasureDB>('measurement-app', 1, {
      upgrade(db) {
        const store = db.createObjectStore('measurements', { keyPath: 'id' });
        store.createIndex('by-timestamp', 'timestamp');
      },
    });
  }
  return dbPromise;
}

export async function saveMeasurement(m: Measurement): Promise<void> {
  const db = await getDB();
  await db.put('measurements', m);
}

export async function getMeasurements(): Promise<Measurement[]> {
  const db = await getDB();
  return db.getAllFromIndex('measurements', 'by-timestamp');
}

export async function getMeasurement(id: string): Promise<Measurement | undefined> {
  const db = await getDB();
  return db.get('measurements', id);
}

export async function deleteMeasurement(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('measurements', id);
}
