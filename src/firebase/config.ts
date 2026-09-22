import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import {
  getFirestore,
  initializeFirestore,
  setLogLevel,
  Firestore,
  doc,
  getDoc,
  getDocFromServer,
  collection,
  getDocs,
  setDoc,
} from 'firebase/firestore';
import defaultConfig from '../../firebase-applet-config.json';
import { FirebaseAppConfig } from '../types';

// Set Firebase Firestore log level to error to avoid noisy offline/reconnect warnings
try {
  setLogLevel('error');
} catch {
  // ignore if not supported in environment
}

const STORAGE_KEY_FIREBASE_CONFIG = 'simas_firebase_custom_config';

export function getStoredFirebaseConfig(): FirebaseAppConfig {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_FIREBASE_CONFIG);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed === 'object' && parsed.projectId && parsed.apiKey) {
        return { ...(defaultConfig as FirebaseAppConfig), ...parsed };
      }
    }
  } catch (e) {
    console.warn('Error reading saved Firebase config:', e);
  }
  return defaultConfig as FirebaseAppConfig;
}

export function saveStoredFirebaseConfig(config: FirebaseAppConfig): void {
  localStorage.setItem(STORAGE_KEY_FIREBASE_CONFIG, JSON.stringify(config));
  cachedApp = null;
  cachedDb = null;
}

let cachedApp: FirebaseApp | null = null;
let cachedDb: Firestore | null = null;

export function isFirebaseConfigured(config?: FirebaseAppConfig): boolean {
  const conf = config || getStoredFirebaseConfig();
  return Boolean(
    conf.apiKey &&
    conf.apiKey.trim() !== '' &&
    conf.projectId &&
    conf.projectId.trim() !== '' &&
    !conf.apiKey.includes('YOUR_')
  );
}

export function getFirebaseInstance(): { app: FirebaseApp | null; db: Firestore | null; isOnline: boolean } {
  const config = getStoredFirebaseConfig();
  if (!isFirebaseConfigured(config)) {
    return { app: null, db: null, isOnline: false };
  }

  try {
    if (!cachedApp) {
      const existingApps = getApps();
      cachedApp = existingApps.length > 0 ? existingApps[0] : initializeApp(config);
    }
    if (!cachedDb && cachedApp) {
      try {
        cachedDb = initializeFirestore(
          cachedApp,
          {
            experimentalForceLongPolling: true,
          },
          config.firestoreDatabaseId || '(default)'
        );
      } catch {
        cachedDb = getFirestore(cachedApp, config.firestoreDatabaseId || '(default)');
      }
    }
    return { app: cachedApp, db: cachedDb, isOnline: true };
  } catch (err) {
    console.error('Failed to initialize Firebase:', err);
    return { app: null, db: null, isOnline: false };
  }
}

let hasValidatedBoot = false;
export async function validateFirestoreConnectionOnBoot(): Promise<void> {
  if (hasValidatedBoot) return;
  hasValidatedBoot = true;
  const { db } = getFirebaseInstance();
  if (!db) return;
  try {
    // Gunakan getDoc biasa yang didukung cache offline tanpa melempar error network
    await getDoc(doc(db, '_system_health', 'connection_probe'));
  } catch (error) {
    // Silent ignore during boot so offline mode continues seamlessly
    console.info('[Firestore] Berjalan dengan mode cache/offline lokal.');
  }
}

export async function testFirestoreConnection(configToTest?: FirebaseAppConfig): Promise<{ success: boolean; message: string }> {
  try {
    const config = configToTest || getStoredFirebaseConfig();
    if (!isFirebaseConfigured(config)) {
      return {
        success: false,
        message: 'Konfigurasi Firebase belum diisi atau masih kosong. Silakan masukkan API Key dan Project ID dari Firebase Console.'
      };
    }

    let tempApp: FirebaseApp;
    const existing = getApps().find(a => a.name === 'test-conn');
    if (existing) {
      tempApp = existing;
    } else {
      tempApp = initializeApp(config, 'test-conn');
    }

    let testDb: Firestore;
    try {
      testDb = initializeFirestore(
        tempApp,
        {
          experimentalForceLongPolling: true,
        },
        config.firestoreDatabaseId || '(default)'
      );
    } catch {
      testDb = getFirestore(tempApp, config.firestoreDatabaseId || '(default)');
    }

    // Attempt write and read to a test probe document
    const testDocRef = doc(testDb, '_system_health', 'connection_probe');
    await setDoc(testDocRef, {
      aplikasi: 'E-SURAT SDENTAN SDN 1 Pekutatan',
      lastPing: new Date().toISOString(),
      status: 'online'
    }, { merge: true });

    const serverDoc = await getDocFromServer(testDocRef);
    if (serverDoc.exists()) {
      return {
        success: true,
        message: `Koneksi Berhasil! Database Firestore "${config.projectId}" terhubung aktif.`
      };
    }

    return {
      success: true,
      message: 'Koneksi ke Firestore terjalin dengan sukses!'
    };
  } catch (error: any) {
    console.error('Firestore connection error:', error);
    let msg = error?.message || String(error);
    if (msg.includes('permission-denied') || msg.includes('insufficient permissions')) {
      msg = 'Izin ditolak (Permission Denied). Pastikan file firestore.rules di Firebase Console sudah disetel allow read, write.';
    } else if (msg.includes('offline') || msg.includes('network') || msg.includes('unavailable')) {
      msg = 'Gagal terhubung ke server Firebase. Periksa koneksi internet atau Project ID.';
    }
    return {
      success: false,
      message: `Gagal Terhubung: ${msg}`
    };
  }
}

export const testFirebaseConnection = testFirestoreConnection;
