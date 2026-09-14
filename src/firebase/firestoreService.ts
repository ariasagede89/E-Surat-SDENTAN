import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  getDoc,
  writeBatch,
} from 'firebase/firestore';
import { getFirebaseInstance } from './config';
import {
  SuratMasuk,
  SuratKeluar,
  ArsipSurat,
  Guru,
  Siswa,
  PengaturanSekolah,
} from '../types';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
) {
  const errMsg = error instanceof Error ? error.message : String(error);
  const isOfflineOrUnavailable =
    errMsg.includes('unavailable') ||
    errMsg.includes('offline') ||
    errMsg.includes('Could not reach Cloud Firestore') ||
    errMsg.includes('failed-precondition');

  const errInfo: FirestoreErrorInfo = {
    error: errMsg,
    authInfo: {
      userId: null,
      email: null,
      emailVerified: null,
      isAnonymous: null,
      tenantId: null,
      providerInfo: [],
    },
    operationType,
    path,
  };

  if (isOfflineOrUnavailable) {
    console.warn(`[Firestore Offline Cache Active] (${operationType} at ${path}): Operasi beralih ke penyimpanan lokal browser.`);
  } else {
    console.error('Firestore Error: ', JSON.stringify(errInfo));
  }
  return errInfo;
}

/**
 * Subscribe to a collection in Firestore with real-time updates.
 */
export function subscribeToCollection<T extends { id: string }>(
  collectionName: string,
  onUpdate: (data: T[]) => void,
  onError?: (err: any) => void
): () => void {
  const { db, isOnline } = getFirebaseInstance();
  if (!db || !isOnline) {
    return () => {};
  }

  const colRef = collection(db, collectionName);
  const unsubscribe = onSnapshot(
    colRef,
    (snapshot) => {
      const items: T[] = [];
      snapshot.forEach((docSnap) => {
        items.push({ ...(docSnap.data() as T), id: docSnap.id });
      });
      // Exclude hardcoded dummy/template sample IDs so only real data from Firebase is displayed
      const DUMMY_IDS = new Set(['sm-1', 'sm-2', 'sk-1', 'sk-2', 'sk-3', 'sk-4', 'sk-5', 'arsip-1', 'arsip-2']);
      const sanitized = items.filter((item) => !DUMMY_IDS.has(item.id));
      onUpdate(sanitized);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, collectionName);
      if (onError) onError(error);
    }
  );

  return unsubscribe;
}

/**
 * Recursively strips undefined values from objects before writing to Firestore,
 * preventing 'Unsupported field value: undefined' errors.
 */
export function sanitizeForFirestore<T>(data: T): T {
  if (data === null || data === undefined) {
    return data;
  }
  if (Array.isArray(data)) {
    return data
      .filter((item) => item !== undefined)
      .map((item) => sanitizeForFirestore(item)) as unknown as T;
  }
  if (typeof data === 'object' && !(data instanceof Date)) {
    const sanitized: Record<string, any> = {};
    for (const [key, value] of Object.entries(data as Record<string, any>)) {
      if (value !== undefined) {
        sanitized[key] = sanitizeForFirestore(value);
      }
    }
    return sanitized as T;
  }
  return data;
}

/**
 * Save or update a single document in Firestore
 */
export async function syncDocToFirestore<T extends { id: string }>(
  collectionName: string,
  item: T
): Promise<boolean> {
  const { db, isOnline } = getFirebaseInstance();
  if (!db || !isOnline) return false;

  const path = `${collectionName}/${item.id}`;
  try {
    const docRef = doc(db, collectionName, item.id);
    const sanitizedItem = sanitizeForFirestore(item);
    await setDoc(docRef, sanitizedItem, { merge: true });
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    return false;
  }
}

/**
 * Delete a document from Firestore
 */
export async function removeDocFromFirestore(
  collectionName: string,
  id: string
): Promise<boolean> {
  const { db, isOnline } = getFirebaseInstance();
  if (!db || !isOnline) return false;

  const path = `${collectionName}/${id}`;
  try {
    const docRef = doc(db, collectionName, id);
    await deleteDoc(docRef);
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
    return false;
  }
}

/**
 * Sync Pengaturan Sekolah to /settings/identitas
 */
export async function syncSettingsToFirestore(
  settings: PengaturanSekolah
): Promise<boolean> {
  const { db, isOnline } = getFirebaseInstance();
  if (!db || !isOnline) return false;

  const path = 'settings/identitas';
  try {
    const docRef = doc(db, 'settings', 'identitas');
    const sanitizedSettings = sanitizeForFirestore(settings);
    await setDoc(docRef, sanitizedSettings, { merge: true });
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    return false;
  }
}

/**
 * Subscribe to Pengaturan Sekolah
 */
export function subscribeToSettings(
  onUpdate: (settings: PengaturanSekolah) => void
): () => void {
  const { db, isOnline } = getFirebaseInstance();
  if (!db || !isOnline) return () => {};

  const docRef = doc(db, 'settings', 'identitas');
  return onSnapshot(
    docRef,
    (snapshot) => {
      if (snapshot.exists()) {
        onUpdate(snapshot.data() as PengaturanSekolah);
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, 'settings/identitas');
    }
  );
}

export interface AdminAuthDoc {
  username: string;
  password: string;
  updatedAt?: string;
}

/**
 * Sync Admin credentials to /settings/adminAuth in Cloud Firestore
 */
export async function syncAdminAuthToFirestore(auth: AdminAuthDoc): Promise<boolean> {
  const { db, isOnline } = getFirebaseInstance();
  if (!db || !isOnline) return false;

  const path = 'settings/adminAuth';
  try {
    const docRef = doc(db, 'settings', 'adminAuth');
    const sanitized = sanitizeForFirestore(auth);
    await setDoc(docRef, sanitized, { merge: true });
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    return false;
  }
}

/**
 * Subscribe to Admin credentials from /settings/adminAuth
 */
export function subscribeToAdminAuth(
  onUpdate: (auth: AdminAuthDoc) => void
): () => void {
  const { db, isOnline } = getFirebaseInstance();
  if (!db || !isOnline) return () => {};

  const docRef = doc(db, 'settings', 'adminAuth');
  return onSnapshot(
    docRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as AdminAuthDoc;
        if (data && data.username && data.password) {
          onUpdate(data);
        }
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, 'settings/adminAuth');
    }
  );
}

/**
 * Fetch Admin credentials directly from /settings/adminAuth
 */
export async function getAdminAuthFromFirestore(): Promise<AdminAuthDoc | null> {
  const { db, isOnline } = getFirebaseInstance();
  if (!db || !isOnline) return null;

  try {
    const docRef = doc(db, 'settings', 'adminAuth');
    const snapshot = await getDoc(docRef);
    if (snapshot.exists()) {
      const data = snapshot.data() as AdminAuthDoc;
      if (data && data.username && data.password) {
        return data;
      }
    }
  } catch (e) {
    handleFirestoreError(e, OperationType.GET, 'settings/adminAuth');
  }
  return null;
}

/**
 * Permanently purge demo/dummy documents that might have been seeded to Firestore previously
 */
export async function purgeDummyDocsFromFirestore(): Promise<number> {
  const { db, isOnline } = getFirebaseInstance();
  if (!db || !isOnline) return 0;

  const dummyMapping: Record<string, string[]> = {
    suratMasuk: ['sm-1', 'sm-2'],
    suratKeluar: ['sk-1', 'sk-2', 'sk-3', 'sk-4', 'sk-5'],
    arsipSurat: ['arsip-1', 'arsip-2'],
  };

  let count = 0;
  try {
    const batch = writeBatch(db);
    for (const [colName, ids] of Object.entries(dummyMapping)) {
      for (const id of ids) {
        const dRef = doc(db, colName, id);
        batch.delete(dRef);
        count++;
      }
    }
    await batch.commit();
    return count;
  } catch (err) {
    console.warn('[Firebase] Purge dummy docs:', err);
    return 0;
  }
}

/**
 * Delete all documents in a collection in Firestore
 */
export async function clearFirestoreCollection(collectionName: string): Promise<number> {
  const { db, isOnline } = getFirebaseInstance();
  if (!db || !isOnline) return 0;

  try {
    const colRef = collection(db, collectionName);
    const snap = await getDocs(colRef);
    if (snap.empty) return 0;

    const batch = writeBatch(db);
    let count = 0;
    snap.docs.forEach((docSnap) => {
      batch.delete(docSnap.ref);
      count++;
    });
    await batch.commit();
    return count;
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, collectionName);
    return 0;
  }
}

/**
 * Upload and sync all local data to Cloud Firestore
 */
export async function syncAllLocalDataToFirestore(data: {
  suratMasuk?: SuratMasuk[];
  suratKeluar?: SuratKeluar[];
  arsip?: ArsipSurat[];
  guru?: Guru[];
  siswa?: Siswa[];
  sekolah?: PengaturanSekolah;
}): Promise<{ totalSynced: number; errors: number; message: string }> {
  const { db, isOnline } = getFirebaseInstance();
  if (!db || !isOnline) {
    return {
      totalSynced: 0,
      errors: 1,
      message: 'Firestore tidak terhubung atau offline. Pastikan koneksi dan konfigurasi aktif.',
    };
  }

  let total = 0;
  let errCount = 0;

  try {
    // 1. Settings
    if (data.sekolah) {
      const ok = await syncSettingsToFirestore(data.sekolah);
      if (ok) total++;
      else errCount++;
    }

    // 2. Surat Masuk
    if (data.suratMasuk && data.suratMasuk.length > 0) {
      for (const sm of data.suratMasuk) {
        const ok = await syncDocToFirestore('suratMasuk', sm);
        if (ok) total++;
        else errCount++;
      }
    }

    // 3. Surat Keluar
    if (data.suratKeluar && data.suratKeluar.length > 0) {
      for (const sk of data.suratKeluar) {
        const ok = await syncDocToFirestore('suratKeluar', sk);
        if (ok) total++;
        else errCount++;
      }
    }

    // 4. Arsip Surat
    if (data.arsip && data.arsip.length > 0) {
      for (const ar of data.arsip) {
        const ok = await syncDocToFirestore('arsipSurat', ar);
        if (ok) total++;
        else errCount++;
      }
    }

    // 5. Guru / PTK
    if (data.guru && data.guru.length > 0) {
      for (const g of data.guru) {
        const ok = await syncDocToFirestore('guru', g);
        if (ok) total++;
        else errCount++;
      }
    }

    // 6. Siswa
    if (data.siswa && data.siswa.length > 0) {
      for (const s of data.siswa) {
        const ok = await syncDocToFirestore('siswa', s);
        if (ok) total++;
        else errCount++;
      }
    }

    return {
      totalSynced: total,
      errors: errCount,
      message: `Sinkronisasi selesai: ${total} dokumen berhasil disimpan ke Cloud Firestore${
        errCount > 0 ? `, ${errCount} gagal` : ''
      }.`,
    };
  } catch (err: any) {
    return {
      totalSynced: total,
      errors: errCount + 1,
      message: `Terjadi kendala saat sinkronisasi: ${err?.message || String(err)}`,
    };
  }
}
