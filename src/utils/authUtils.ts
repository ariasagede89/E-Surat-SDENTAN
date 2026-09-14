import { UserRole } from '../types';
import {
  syncAdminAuthToFirestore,
  getAdminAuthFromFirestore,
} from '../firebase/firestoreService';

export const DEFAULT_ADMIN_USERNAME = 'admin';
export const DEFAULT_ADMIN_PASSWORD = 'admin1234';

const STORAGE_ADMIN_CREDS_KEY = 'esurat_admin_creds';
const LEGACY_STORAGE_KEY = 'simas_admin_creds';
const SESSION_ROLE_KEY = 'esurat_user_role';
const LOCAL_REMEMBER_KEY = 'esurat_remember_admin';

export interface AdminCredentials {
  username: string;
  password: string;
}

let inMemoryCreds: AdminCredentials | null = null;

/**
 * Update kredensial di memory dan localStorage
 */
export function setCachedAdminCredentials(creds: AdminCredentials): void {
  inMemoryCreds = {
    username: creds.username.trim(),
    password: creds.password,
  };
  try {
    localStorage.setItem(STORAGE_ADMIN_CREDS_KEY, JSON.stringify(inMemoryCreds));
    localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(inMemoryCreds));
  } catch {
    // ignore
  }
}

/**
 * Mendapatkan kredensial akun admin (Kepala Sekolah & TU).
 * Bawaan default: nama = admin, password = admin1234
 */
export function getStoredAdminCredentials(): AdminCredentials {
  if (inMemoryCreds) {
    return inMemoryCreds;
  }
  try {
    const raw = localStorage.getItem(STORAGE_ADMIN_CREDS_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.username && parsed?.password) {
        inMemoryCreds = {
          username: parsed.username.trim(),
          password: parsed.password,
        };
        return inMemoryCreds;
      }
    }
  } catch {
    // Abaikan error parsing dan gunakan default
  }
  return {
    username: DEFAULT_ADMIN_USERNAME,
    password: DEFAULT_ADMIN_PASSWORD,
  };
}

/**
 * Menyimpan pembaharuan kredensial admin (username dan/atau password)
 * Menyimpan ke memory, localStorage, dan Cloud Firestore
 */
export async function saveAdminCredentialsAsync(
  newUsername?: string,
  newPassword?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const creds = { ...getStoredAdminCredentials() };

    if (newUsername !== undefined && newUsername.trim() !== '') {
      const trimmedUser = newUsername.trim();
      if (trimmedUser.length < 3) {
        return { success: false, error: 'Nama pengguna (username) minimal 3 karakter!' };
      }
      creds.username = trimmedUser;
    }

    if (newPassword !== undefined && newPassword !== '') {
      if (newPassword.length < 4) {
        return { success: false, error: 'Kata sandi (password) minimal 4 karakter!' };
      }
      creds.password = newPassword;
    }

    setCachedAdminCredentials(creds);

    // Sync ke Firestore secara asynchronous
    await syncAdminAuthToFirestore({
      username: creds.username,
      password: creds.password,
      updatedAt: new Date().toISOString(),
    });

    return { success: true };
  } catch (err) {
    return { success: false, error: 'Gagal menyimpan kredensial ke penyimpanan.' };
  }
}

/**
 * Menyimpan pembaharuan kredensial admin secara sinkron (fallback)
 */
export function saveAdminCredentials(
  newUsername?: string,
  newPassword?: string
): { success: boolean; error?: string } {
  try {
    const creds = { ...getStoredAdminCredentials() };

    if (newUsername !== undefined && newUsername.trim() !== '') {
      const trimmedUser = newUsername.trim();
      if (trimmedUser.length < 3) {
        return { success: false, error: 'Nama pengguna (username) minimal 3 karakter!' };
      }
      creds.username = trimmedUser;
    }

    if (newPassword !== undefined && newPassword !== '') {
      if (newPassword.length < 4) {
        return { success: false, error: 'Kata sandi (password) minimal 4 karakter!' };
      }
      creds.password = newPassword;
    }

    setCachedAdminCredentials(creds);

    // Kirim sinkronisasi ke Firestore tanpa memblokir
    syncAdminAuthToFirestore({
      username: creds.username,
      password: creds.password,
      updatedAt: new Date().toISOString(),
    }).catch((e) => console.warn('Sync admin auth error:', e));

    return { success: true };
  } catch (err) {
    return { success: false, error: 'Gagal menyimpan kredensial ke penyimpanan lokal.' };
  }
}

/**
 * Menyimpan pembaharuan kata sandi admin
 */
export function saveAdminPassword(newPassword: string): boolean {
  const res = saveAdminCredentials(undefined, newPassword);
  return res.success;
}

/**
 * Reset kata sandi admin ke bawaan (admin1234)
 */
export async function resetAdminPasswordToDefault(): Promise<void> {
  const def = {
    username: DEFAULT_ADMIN_USERNAME,
    password: DEFAULT_ADMIN_PASSWORD,
  };
  setCachedAdminCredentials(def);
  try {
    localStorage.removeItem(STORAGE_ADMIN_CREDS_KEY);
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    // ignore
  }
  syncAdminAuthToFirestore({
    username: def.username,
    password: def.password,
    updatedAt: new Date().toISOString(),
  }).catch(() => {});
}

/**
 * Verifikasi login akun admin secara sinkron (cek cache lokal)
 */
export function verifyAdminLogin(userInput: string, passInput: string): boolean {
  const creds = getStoredAdminCredentials();
  const inputUser = (userInput || '').trim().toLowerCase();
  const targetUser = creds.username.toLowerCase();

  return inputUser === targetUser && passInput === creds.password;
}

/**
 * Verifikasi login akun admin secara asinkron (cek cache lokal + cloud Firestore)
 */
export async function verifyAdminLoginAsync(userInput: string, passInput: string): Promise<boolean> {
  // Cek cache lokal terlebih dahulu (cepat)
  if (verifyAdminLogin(userInput, passInput)) {
    return true;
  }

  // Jika gagal, cek ke Cloud Firestore untuk memastikan tidak ada perubahan di perangkat/tab lain
  try {
    const cloudAuth = await getAdminAuthFromFirestore();
    if (cloudAuth && cloudAuth.username && cloudAuth.password) {
      setCachedAdminCredentials(cloudAuth);
      const inputUser = (userInput || '').trim().toLowerCase();
      const targetUser = cloudAuth.username.toLowerCase();
      if (inputUser === targetUser && passInput === cloudAuth.password) {
        return true;
      }
    }
  } catch (e) {
    console.warn('Error verifying admin with Firestore:', e);
  }

  return false;
}

/**
 * Mendapatkan role pengguna saat ini.
 * Default mutlak: 'guru' (Begitu buka web, langsung tersedia Mode Guru tanpa login).
 */
export function getActiveUserRole(): UserRole {
  try {
    const sessionRole = sessionStorage.getItem(SESSION_ROLE_KEY) || sessionStorage.getItem('simas_user_role');
    if (sessionRole === 'admin') {
      return 'admin';
    }

    const rememberedRole = localStorage.getItem(LOCAL_REMEMBER_KEY) || localStorage.getItem('simas_remember_admin');
    if (rememberedRole === 'admin') {
      return 'admin';
    }
  } catch {
    // fallback
  }

  return 'guru';
}

/**
 * Menyimpan role sesi saat ini
 */
export function setActiveUserRole(role: UserRole, remember: boolean = false): void {
  try {
    sessionStorage.setItem(SESSION_ROLE_KEY, role);
    if (role === 'admin' && remember) {
      localStorage.setItem(LOCAL_REMEMBER_KEY, 'admin');
    } else {
      localStorage.removeItem(LOCAL_REMEMBER_KEY);
      localStorage.removeItem('simas_remember_admin');
    }
  } catch {
    // fallback
  }
}

/**
 * Logout dari akun Admin dan kembali ke Mode Guru
 */
export function logoutAdmin(): void {
  try {
    sessionStorage.setItem(SESSION_ROLE_KEY, 'guru');
    localStorage.removeItem(LOCAL_REMEMBER_KEY);
    localStorage.removeItem('simas_remember_admin');
  } catch {
    // fallback
  }
}
