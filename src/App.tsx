import React, { useState, useEffect } from 'react';
import {
  Home,
  Inbox,
  Send,
  Users,
  Filter,
  Settings,
  Sparkles,
  School,
  Menu,
  X,
  FileText,
  ShieldCheck,
  Check,
  Database,
  CheckCircle,
  AlertCircle,
  Cloud,
  Lock,
  LogOut,
  UserCheck,
} from 'lucide-react';
import {
  isFirebaseConfigured,
  getStoredFirebaseConfig,
  validateFirestoreConnectionOnBoot,
} from './firebase/config';
import {
  subscribeToCollection,
  syncDocToFirestore,
  removeDocFromFirestore,
  syncSettingsToFirestore,
  subscribeToSettings,
  subscribeToAdminAuth,
  purgeDummyDocsFromFirestore,
  clearFirestoreCollection,
  syncAllLocalDataToFirestore,
} from './firebase/firestoreService';
import {
  SuratMasuk,
  SuratKeluar,
  ArsipSurat,
  Guru,
  Siswa,
  PengaturanSekolah,
  KlasifikasiMendagriItem,
  UserRole,
} from './types';
import {
  initialSekolah,
  initialSuratMasuk,
  initialSuratKeluar,
  initialArsipSurat,
  initialGuru,
  initialSiswa,
} from './data/initialData';
import { compareSuratKeluarDesc, compareSuratMasukDesc } from './utils/numberGenerator';
import { sortSiswa } from './utils/csvUtils';
import { getActiveUserRole, logoutAdmin, setCachedAdminCredentials } from './utils/authUtils';
import { BerandaView } from './components/BerandaView';
import { SuratMasukView } from './components/SuratMasukView';
import { SuratKeluarView } from './components/SuratKeluarView';
import { GuruSiswaView } from './components/GuruSiswaView';
import { FilterSuratView } from './components/FilterSuratView';
import { PengaturanView } from './components/PengaturanView';
import { AutoNumberModal } from './components/AutoNumberModal';
import { SuratModal } from './components/SuratModal';
import { AdminLoginModal } from './components/AdminLoginModal';

type MenuTab =
  | 'beranda'
  | 'surat_masuk'
  | 'surat_keluar'
  | 'guru_siswa'
  | 'filter'
  | 'pengaturan';

function normalizePTK(guru: Guru): Guru {
  if (guru.jenisPtk) return guru;
  const jab = (guru.jabatan || '').toLowerCase();
  if (jab.includes('kepala sekolah')) {
    return { ...guru, jenisPtk: 'kepala_sekolah' };
  }
  if (
    jab.includes('tata usaha') ||
    jab.includes(' tu') ||
    jab.includes('operator') ||
    jab.includes('administrasi') ||
    jab.includes('penjaga') ||
    jab.includes('pustakawan')
  ) {
    return { ...guru, jenisPtk: 'tu' };
  }
  return { ...guru, jenisPtk: 'guru' };
}

export default function App() {
  const [activeTab, setActiveTab] = useState<MenuTab>('beranda');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Akses Pengguna: Bawaan 'guru' tanpa login saat web dibuka.
  // Akun Admin (Kepala Sekolah & TU) login dengan user: admin, pass: admin1234
  const [userRole, setUserRole] = useState<UserRole>(() => getActiveUserRole());
  const [isAdminLoginModalOpen, setIsAdminLoginModalOpen] = useState(false);
  const [loginNoticeMessage, setLoginNoticeMessage] = useState<string>('');

  // Hardcoded template demo IDs to ignore when Firebase is active
  const DUMMY_IDS = new Set([
    'sm-1',
    'sm-2',
    'sk-1',
    'sk-2',
    'sk-3',
    'sk-4',
    'sk-5',
    'arsip-1',
    'arsip-2',
  ]);

  // Core Data States: If Firebase is connected, start clean and rely strictly on Firestore
  const [sekolah, setSekolah] = useState<PengaturanSekolah>(() => {
    const saved = localStorage.getItem('simas_sekolah');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.kepalaSekolah === 'I Wayan Sudiarta, S.Pd., M.Pd.') {
          parsed.kepalaSekolah = 'Gede Ariasa, S.Pd';
          parsed.nipKepalaSekolah = '198906232014031002';
          parsed.email = 'sdnegeri1pekutatan@gmail.com';
          parsed.instansiBaris3 = 'SATUAN PENDIDIKAN FORMAL';
          parsed.alamat = 'Jalan Cempaka No. 2, Br. Dangin Pangkung, Desa Pekutatan (82262)';
          localStorage.setItem('simas_sekolah', JSON.stringify(parsed));
        }
        return parsed;
      } catch {
        return initialSekolah;
      }
    }
    return initialSekolah;
  });

  const [suratMasukList, setSuratMasukList] = useState<SuratMasuk[]>(() => {
    if (isFirebaseConfigured()) {
      const saved = localStorage.getItem('simas_surat_masuk');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          return Array.isArray(parsed)
            ? parsed.filter((s: any) => !DUMMY_IDS.has(s.id)).sort(compareSuratMasukDesc)
            : [];
        } catch {
          return [];
        }
      }
      return [];
    }
    const saved = localStorage.getItem('simas_surat_masuk');
    const items = saved ? JSON.parse(saved) : initialSuratMasuk;
    return Array.isArray(items) ? [...items].sort(compareSuratMasukDesc) : [];
  });

  const [suratKeluarList, setSuratKeluarList] = useState<SuratKeluar[]>(() => {
    if (isFirebaseConfigured()) {
      const saved = localStorage.getItem('simas_surat_keluar');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          return Array.isArray(parsed)
            ? parsed.filter((s: any) => !DUMMY_IDS.has(s.id)).sort(compareSuratKeluarDesc)
            : [];
        } catch {
          return [];
        }
      }
      return [];
    }
    const saved = localStorage.getItem('simas_surat_keluar');
    let items = saved ? JSON.parse(saved) : initialSuratKeluar;
    if (Array.isArray(items)) {
      items = items.map((s: SuratKeluar) =>
        s.id === 'sk-5' && s.tglSurat === '2026-09-01' ? { ...s, tglSurat: '2026-09-11' } : s
      );
      return items.sort(compareSuratKeluarDesc);
    }
    return [];
  });

  const [arsipList, setArsipList] = useState<ArsipSurat[]>(() => {
    if (isFirebaseConfigured()) {
      const saved = localStorage.getItem('simas_arsip');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          return Array.isArray(parsed)
            ? parsed.filter((s: any) => !DUMMY_IDS.has(s.id)).sort(compareSuratKeluarDesc)
            : [];
        } catch {
          return [];
        }
      }
      return [];
    }
    const saved = localStorage.getItem('simas_arsip');
    const items = saved ? JSON.parse(saved) : initialArsipSurat;
    return Array.isArray(items) ? [...items].sort(compareSuratKeluarDesc) : [];
  });

  const [guruList, setGuruList] = useState<Guru[]>(() => {
    const saved = localStorage.getItem('simas_guru');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const normalized = parsed.map(normalizePTK);
          const hasTU = normalized.some((g) => g.jenisPtk === 'tu');
          if (!hasTU) {
            const tuDefaults = initialGuru.filter((g) => g.jenisPtk === 'tu');
            return [...normalized, ...tuDefaults];
          }
          return normalized;
        }
      } catch {
        // fallback
      }
    }
    return initialGuru.map(normalizePTK);
  });

  const [siswaList, setSiswaList] = useState<Siswa[]>(() => {
    if (isFirebaseConfigured()) {
      const saved = localStorage.getItem('simas_siswa');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          return Array.isArray(parsed) ? sortSiswa(parsed) : [];
        } catch {
          return [];
        }
      }
      return [];
    }
    const saved = localStorage.getItem('simas_siswa');
    return saved ? sortSiswa(JSON.parse(saved)) : sortSiswa(initialSiswa);
  });

  // Modals & Navigation Helpers
  const [isAutoNumberModalOpen, setIsAutoNumberModalOpen] = useState(false);
  const [previewSuratKeluar, setPreviewSuratKeluar] = useState<SuratKeluar | null>(null);
  const [editingSuratMasuk, setEditingSuratMasuk] = useState<SuratMasuk | null>(null);
  const [selectedAutoNumber, setSelectedAutoNumber] = useState<{
    noSurat: string;
    klasifikasi: KlasifikasiMendagriItem;
  } | null>(null);

  // Real-time Cloud Sync Toast Notifications
  const [toastNotification, setToastNotification] = useState<{
    id: number;
    type: 'success' | 'info' | 'error';
    message: string;
  } | null>(null);

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    const id = Date.now();
    setToastNotification({ id, type, message });
    setTimeout(() => {
      setToastNotification((prev) => (prev?.id === id ? null : prev));
    }, 4500);
  };

  // Firebase Real-time State & Synchronization
  const [firebaseActive, setFirebaseActive] = useState<boolean>(() => isFirebaseConfigured());

  useEffect(() => {
    if (!isFirebaseConfigured()) {
      setFirebaseActive(false);
      return;
    }
    setFirebaseActive(true);

    // Validate connection to Firestore on boot
    validateFirestoreConnectionOnBoot().catch(() => {});

    // Purge any lingering dummy template documents from Firestore
    purgeDummyDocsFromFirestore().catch(() => {});

    // Real-time Firestore subscriptions: strictly display what is in Firestore (including empty [])
    const unsubSM = subscribeToCollection<SuratMasuk>('suratMasuk', (items) => {
      setSuratMasukList([...items].sort(compareSuratMasukDesc));
    });
    const unsubSK = subscribeToCollection<SuratKeluar>('suratKeluar', (items) => {
      setSuratKeluarList([...items].sort(compareSuratKeluarDesc));
    });
    const unsubArsip = subscribeToCollection<ArsipSurat>('arsipSurat', (items) => {
      setArsipList([...items].sort(compareSuratKeluarDesc));
    });
    const unsubGuru = subscribeToCollection<Guru>('guru', (items) => {
      setGuruList(items.map(normalizePTK));
    });
    const unsubSiswa = subscribeToCollection<Siswa>('siswa', (items) => {
      setSiswaList(sortSiswa(items));
    });
    const unsubSettings = subscribeToSettings((data) => {
      if (data && data.namaSekolah) {
        if (data.kepalaSekolah === 'I Wayan Sudiarta, S.Pd., M.Pd.') {
          data.kepalaSekolah = 'Gede Ariasa, S.Pd';
          data.nipKepalaSekolah = '198906232014031002';
          data.email = 'sdnegeri1pekutatan@gmail.com';
          data.instansiBaris3 = 'SATUAN PENDIDIKAN FORMAL';
          data.alamat = 'Jalan Cempaka No. 2, Br. Dangin Pangkung, Desa Pekutatan (82262)';
        }
        setSekolah(data);
      }
    });

    const unsubAdminAuth = subscribeToAdminAuth((data) => {
      if (data && data.username && data.password) {
        setCachedAdminCredentials({
          username: data.username,
          password: data.password,
        });
      }
    });

    return () => {
      unsubSM();
      unsubSK();
      unsubArsip();
      unsubGuru();
      unsubSiswa();
      unsubSettings();
      unsubAdminAuth();
    };
  }, [firebaseActive]);

  // Sync to LocalStorage (offline resilient backup)
  useEffect(() => {
    localStorage.setItem('simas_sekolah', JSON.stringify(sekolah));
  }, [sekolah]);

  useEffect(() => {
    localStorage.setItem('simas_surat_masuk', JSON.stringify(suratMasukList));
  }, [suratMasukList]);

  useEffect(() => {
    localStorage.setItem('simas_surat_keluar', JSON.stringify(suratKeluarList));
  }, [suratKeluarList]);

  useEffect(() => {
    localStorage.setItem('simas_arsip', JSON.stringify(arsipList));
  }, [arsipList]);

  useEffect(() => {
    localStorage.setItem('simas_guru', JSON.stringify(guruList));
  }, [guruList]);

  useEffect(() => {
    localStorage.setItem('simas_siswa', JSON.stringify(siswaList));
  }, [siswaList]);

  // Handlers for Surat Masuk with Firestore Sync
  const handleAddSuratMasuk = async (newItem: Omit<SuratMasuk, 'id' | 'createdAt'>) => {
    const id = 'sm_' + Date.now();
    const created: SuratMasuk = { ...newItem, id, createdAt: new Date().toISOString() };
    setSuratMasukList((prev) => [created, ...prev].sort(compareSuratMasukDesc));
    const ok = await syncDocToFirestore('suratMasuk', created);
    if (ok) {
      showToast('Surat Masuk berhasil disimpan ke Cloud Firestore', 'success');
    } else {
      showToast('Surat Masuk disimpan di penyimpanan lokal browser', 'info');
    }
  };

  const handleUpdateSuratMasuk = async (updated: SuratMasuk) => {
    setSuratMasukList((prev) => prev.map((s) => (s.id === updated.id ? updated : s)).sort(compareSuratMasukDesc));
    const ok = await syncDocToFirestore('suratMasuk', updated);
    if (ok) {
      showToast('Perubahan Surat Masuk disimpan ke Cloud Firestore', 'success');
    }
  };

  const handleDeleteSuratMasuk = async (id: string) => {
    setSuratMasukList((prev) => prev.filter((s) => s.id !== id));
    await removeDocFromFirestore('suratMasuk', id);
    showToast('Surat Masuk dihapus dari Cloud Firestore', 'info');
  };

  // Handlers for Surat Keluar with Firestore Sync
  const handleAddSuratKeluar = async (newItem: Omit<SuratKeluar, 'id' | 'createdAt'>) => {
    const id = 'sk_' + Date.now();
    const created: SuratKeluar = { ...newItem, id, createdAt: new Date().toISOString() };
    setSuratKeluarList((prev) => [created, ...prev].sort(compareSuratKeluarDesc));
    const ok = await syncDocToFirestore('suratKeluar', created);
    if (ok) {
      showToast('Surat Keluar berhasil disimpan ke Cloud Firestore', 'success');
    } else {
      showToast('Surat Keluar disimpan di penyimpanan lokal browser', 'info');
    }
  };

  const handleUpdateSuratKeluar = async (updated: SuratKeluar) => {
    setSuratKeluarList((prev) => prev.map((s) => (s.id === updated.id ? updated : s)).sort(compareSuratKeluarDesc));
    const ok = await syncDocToFirestore('suratKeluar', updated);
    if (ok) {
      showToast('Perubahan Surat Keluar disimpan ke Cloud Firestore', 'success');
    }
  };

  const handleDeleteSuratKeluar = async (id: string) => {
    setSuratKeluarList((prev) => prev.filter((s) => s.id !== id));
    await removeDocFromFirestore('suratKeluar', id);
    showToast('Surat Keluar dihapus dari Cloud Firestore', 'info');
  };

  // Handlers for Arsip with Firestore Sync
  const handleAddArsip = async (newItem: Omit<ArsipSurat, 'id'>) => {
    const id = 'ar_' + Date.now();
    const created: ArsipSurat = { ...newItem, id };
    setArsipList((prev) => [created, ...prev].sort(compareSuratKeluarDesc));
    const ok = await syncDocToFirestore('arsipSurat', created);
    if (ok) {
      showToast('Buku Arsip berhasil disimpan ke Cloud Firestore', 'success');
    } else {
      showToast('Buku Arsip disimpan di penyimpanan lokal browser', 'info');
    }
  };

  const handleDeleteArsip = async (id: string) => {
    setArsipList((prev) => prev.filter((a) => a.id !== id));
    await removeDocFromFirestore('arsipSurat', id);
    showToast('Dokumen arsip dihapus dari Cloud Firestore', 'info');
  };

  const handleUpdateArsip = async (updated: ArsipSurat) => {
    setArsipList((prev) => prev.map((a) => (a.id === updated.id ? updated : a)).sort(compareSuratKeluarDesc));
    const ok = await syncDocToFirestore('arsipSurat', updated);
    if (ok) {
      showToast('Perubahan arsip disimpan ke Cloud Firestore', 'success');
    }
  };

  // Dedicated data cleaning and sync actions
  const handleClearSuratMasukFirestore = async () => {
    await clearFirestoreCollection('suratMasuk');
    setSuratMasukList([]);
    localStorage.setItem('simas_surat_masuk', JSON.stringify([]));
    showToast('Semua data Surat Masuk di Firestore telah dibersihkan', 'info');
  };

  const handleClearSuratKeluarFirestore = async () => {
    await clearFirestoreCollection('suratKeluar');
    setSuratKeluarList([]);
    localStorage.setItem('simas_surat_keluar', JSON.stringify([]));
    showToast('Semua data Surat Keluar di Firestore telah dibersihkan', 'info');
  };

  const handlePurgeDummyData = async () => {
    await purgeDummyDocsFromFirestore();
    setSuratMasukList((prev) => prev.filter((s) => !DUMMY_IDS.has(s.id)));
    setSuratKeluarList((prev) => prev.filter((s) => !DUMMY_IDS.has(s.id)));
    setArsipList((prev) => prev.filter((a) => !DUMMY_IDS.has(a.id)));
    showToast('Data dummy contoh telah dibersihkan', 'info');
  };

  const handleResetLocalCache = () => {
    localStorage.removeItem('simas_surat_masuk');
    localStorage.removeItem('simas_surat_keluar');
    localStorage.removeItem('simas_arsip');
    setSuratMasukList([]);
    setSuratKeluarList([]);
    setArsipList([]);
    showToast('Cache browser telah direset', 'info');
  };

  // Handlers for Guru with Firestore Sync
  const handleAddGuru = async (item: Omit<Guru, 'id'>) => {
    const id = 'g_' + Date.now();
    const created = { ...item, id };
    setGuruList((prev) => [...prev, created]);
    const ok = await syncDocToFirestore('guru', created);
    if (ok) {
      showToast(`Data PTK ${created.nama} berhasil tersimpan ke Cloud Firestore!`, 'success');
    } else {
      showToast(`Data PTK ${created.nama} disimpan di penyimpanan lokal browser`, 'info');
    }
  };

  const handleUpdateGuru = async (item: Guru) => {
    setGuruList((prev) => prev.map((g) => (g.id === item.id ? item : g)));
    const ok = await syncDocToFirestore('guru', item);
    if (ok) {
      showToast(`Data PTK ${item.nama} berhasil diperbarui di Cloud Firestore!`, 'success');
    }

    // Jika PTK yang diperbarui adalah Kepala Sekolah, sinkronkan langsung ke Pengaturan Sekolah
    if (item.jenisPtk === 'kepala_sekolah' || /kepala\s+sekolah/i.test(item.jabatan || '')) {
      const updatedSekolah: PengaturanSekolah = {
        ...sekolah,
        kepalaSekolah: item.nama,
        nipKepalaSekolah: item.nip,
        pangkatKepalaSekolah: item.pangkatGol || sekolah.pangkatKepalaSekolah,
      };
      setSekolah(updatedSekolah);
      syncSettingsToFirestore(updatedSekolah);
    }
  };

  const handleDeleteGuru = async (id: string) => {
    setGuruList((prev) => prev.filter((g) => g.id !== id));
    await removeDocFromFirestore('guru', id);
    showToast('Data PTK dihapus dari Cloud Firestore', 'info');
  };

  const handleImportGuru = async (imported: Omit<Guru, 'id'>[]) => {
    const withIds: Guru[] = imported.map((g, idx) => ({ ...g, id: 'g_imp_' + Date.now() + '_' + idx }));
    setGuruList((prev) => [...prev, ...withIds]);
    showToast(`Menyimpan ${withIds.length} data PTK ke Cloud Firestore...`, 'info');
    let successCount = 0;
    for (const g of withIds) {
      const ok = await syncDocToFirestore('guru', g);
      if (ok) successCount++;
    }
    showToast(`Berhasil menyimpan ${successCount} dari ${withIds.length} PTK ke Cloud Firestore`, 'success');
  };

  // Handlers for Siswa with Firestore Sync
  const handleAddSiswa = async (item: Omit<Siswa, 'id'>) => {
    const id = 's_' + Date.now();
    const created = { ...item, id };
    setSiswaList((prev) => sortSiswa([...prev, created]));
    const ok = await syncDocToFirestore('siswa', created);
    if (ok) {
      showToast(`Data Siswa ${created.nama} berhasil tersimpan ke Cloud Firestore!`, 'success');
    } else {
      showToast(`Data Siswa ${created.nama} disimpan di penyimpanan lokal browser`, 'info');
    }
  };

  const handleUpdateSiswa = async (item: Siswa) => {
    setSiswaList((prev) => sortSiswa(prev.map((s) => (s.id === item.id ? item : s))));
    const ok = await syncDocToFirestore('siswa', item);
    if (ok) {
      showToast(`Data Siswa ${item.nama} berhasil diperbarui di Cloud Firestore!`, 'success');
    }
  };

  const handleDeleteSiswa = async (id: string) => {
    setSiswaList((prev) => prev.filter((s) => s.id !== id));
    await removeDocFromFirestore('siswa', id);
    showToast('Data Siswa dihapus dari Cloud Firestore', 'info');
  };

  const handleImportSiswa = async (
    imported: Omit<Siswa, 'id'>[],
    mode: 'merge' | 'replace' | 'append' = 'merge'
  ) => {
    if (mode === 'replace') {
      const withIds: Siswa[] = sortSiswa(imported.map((s, idx) => ({ ...s, id: 'siswa-' + (idx + 1) })));
      setSiswaList(withIds);
      showToast(`Mengganti data dengan ${withIds.length} siswa baru...`, 'info');

      await clearFirestoreCollection('siswa');
      let successCount = 0;
      for (const s of withIds) {
        const ok = await syncDocToFirestore('siswa', s);
        if (ok) successCount++;
      }
      showToast(`Berhasil memperbarui data dengan ${successCount} siswa`, 'success');
      return;
    }

    if (mode === 'merge') {
      const updatedList = [...siswaList];
      const itemsToSync: Siswa[] = [];

      imported.forEach((newItem, idx) => {
        const matchIdx = updatedList.findIndex(
          (existing) =>
            (newItem.nis && existing.nis === newItem.nis) ||
            (newItem.nisn && newItem.nisn !== '-' && existing.nisn === newItem.nisn)
        );

        if (matchIdx >= 0) {
          const merged: Siswa = {
            ...updatedList[matchIdx],
            ...newItem,
          };
          updatedList[matchIdx] = merged;
          itemsToSync.push(merged);
        } else {
          const created: Siswa = {
            ...newItem,
            id: 's_imp_' + Date.now() + '_' + idx,
          };
          updatedList.push(created);
          itemsToSync.push(created);
        }
      });

      setSiswaList(sortSiswa(updatedList));
      showToast(`Menyinkronkan ${itemsToSync.length} data siswa...`, 'info');
      let successCount = 0;
      for (const s of itemsToSync) {
        const ok = await syncDocToFirestore('siswa', s);
        if (ok) successCount++;
      }
      showToast(`Berhasil memperbarui / menambah ${successCount} data siswa`, 'success');
      return;
    }

    // append mode
    const withIds: Siswa[] = imported.map((s, idx) => ({ ...s, id: 's_imp_' + Date.now() + '_' + idx }));
    setSiswaList((prev) => sortSiswa([...prev, ...withIds]));
    showToast(`Menyimpan ${withIds.length} siswa ke basis data...`, 'info');
    let successCount = 0;
    for (const s of withIds) {
      const ok = await syncDocToFirestore('siswa', s);
      if (ok) successCount++;
    }
    showToast(`Berhasil menyimpan ${successCount} dari ${withIds.length} siswa`, 'success');
  };

  const handleClearAllSiswa = async () => {
    setSiswaList([]);
    await clearFirestoreCollection('siswa');
    showToast('Seluruh data siswa berhasil dikosongkan', 'info');
  };

  const handleResetSiswaDefault = async () => {
    setSiswaList(sortSiswa(initialSiswa));
    await clearFirestoreCollection('siswa');
    for (const s of initialSiswa) {
      await syncDocToFirestore('siswa', s);
    }
    showToast('Data siswa berhasil dikembalikan ke data awal SDN 1 Pekutatan', 'success');
  };

  // Handler for Pengaturan Sekolah with Firestore Sync
  const handleSaveSekolah = async (updated: PengaturanSekolah) => {
    setSekolah(updated);
    const ok = await syncSettingsToFirestore(updated);
    if (ok) {
      showToast('Identitas dan Pengaturan Sekolah berhasil disimpan ke Cloud Firestore!', 'success');
    } else {
      showToast('Pengaturan disimpan di penyimpanan lokal browser', 'info');
    }

    // Sinkronkan data kepala sekolah ke PTK Kepala Sekolah
    const kepsekIndex = guruList.findIndex(
      (g) => g.jenisPtk === 'kepala_sekolah' || /kepala\s+sekolah/i.test(g.jabatan || '')
    );
    if (kepsekIndex >= 0) {
      const kepsekGuru = guruList[kepsekIndex];
      const updatedGuru: Guru = {
        ...kepsekGuru,
        nama: updated.kepalaSekolah || kepsekGuru.nama,
        nip: updated.nipKepalaSekolah || kepsekGuru.nip,
        pangkatGol: updated.pangkatKepalaSekolah || kepsekGuru.pangkatGol,
      };
      setGuruList((prev) => prev.map((g, idx) => (idx === kepsekIndex ? updatedGuru : g)));
      syncDocToFirestore('guru', updatedGuru);
    }
  };

  // Handler to bulk sync all local state to Cloud Firestore
  const handleSyncAllDataToCloud = async () => {
    showToast('Sedang menyinkronkan seluruh data lokal ke Cloud Firestore...', 'info');
    const res = await syncAllLocalDataToFirestore({
      suratMasuk: suratMasukList,
      suratKeluar: suratKeluarList,
      arsip: arsipList,
      guru: guruList,
      siswa: siswaList,
      sekolah,
    });
    if (res.errors === 0) {
      showToast(res.message, 'success');
    } else {
      showToast(res.message, res.totalSynced > 0 ? 'info' : 'error');
    }
    return res;
  };

  // Navigation from Beranda
  const handleOpenAutoNumber = () => {
    setIsAutoNumberModalOpen(true);
  };

  const handleSelectNumberForSurat = (
    noSurat: string,
    klasifikasi: KlasifikasiMendagriItem
  ) => {
    setSelectedAutoNumber({ noSurat, klasifikasi });
    setActiveTab('surat_keluar');
  };

  const handleNavigateToDisposisi = (sm: SuratMasuk) => {
    setEditingSuratMasuk(sm);
    setActiveTab('surat_masuk');
  };

  // Handlers untuk Autentikasi Admin & Mode Guru
  const handleAdminLoginSuccess = () => {
    setUserRole('admin');
    setIsAdminLoginModalOpen(false);
    setActiveTab('pengaturan');
    showToast('Berhasil masuk sebagai Administrator (Kepala Sekolah & TU)', 'success');
  };

  const handleLogoutAdmin = () => {
    logoutAdmin();
    setUserRole('guru');
    if (activeTab === 'pengaturan') {
      setActiveTab('beranda');
    }
    showToast('Kembali ke Mode Guru (Tanpa Login). Menu Pengaturan dikunci.', 'info');
  };

  const handleNavigateTab = (tabId: MenuTab) => {
    if (tabId === 'pengaturan' && userRole !== 'admin') {
      setLoginNoticeMessage(
        'Menu Pengaturan hanya dapat diakses oleh Administrator (Kepala Sekolah & TU). Mode Guru tidak mengakses pengaturan.'
      );
      setIsAdminLoginModalOpen(true);
      return;
    }
    setActiveTab(tabId);
  };

  // Navigation item definitions
  const navItems = [
    { id: 'beranda' as const, label: 'Beranda', icon: Home, isLocked: false },
    { id: 'surat_masuk' as const, label: 'Surat Masuk', icon: Inbox, isLocked: false },
    { id: 'surat_keluar' as const, label: 'Surat Keluar', icon: Send, isLocked: false },
    { id: 'guru_siswa' as const, label: 'Data PTK & Siswa', icon: Users, isLocked: false },
    { id: 'filter' as const, label: 'Filter & Laporan', icon: Filter, isLocked: false },
    { id: 'pengaturan' as const, label: 'Pengaturan', icon: Settings, isLocked: userRole !== 'admin' },
  ];

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-800 flex flex-col font-sans antialiased">
      {/* Top Navbar */}
      <header className="bg-slate-900 text-white sticky top-0 z-40 shadow-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <span className="font-extrabold text-lg sm:text-xl tracking-tight text-white">
              E-SURAT SDENTAN
            </span>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavigateTab(item.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm ring-1 ring-blue-500'
                      : item.isLocked
                      ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/70'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                  title={item.isLocked ? 'Menu Pengaturan dikunci untuk Mode Guru. Klik untuk login Admin.' : undefined}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                  {item.isLocked && <Lock className="w-3 h-3 text-amber-400/80 ml-0.5" />}
                </button>
              );
            })}
          </nav>

          {/* Right Action: Cloud Status & Quick Number Button */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700/80 text-[11px]">
              <span className={`w-2 h-2 rounded-full ${firebaseActive ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></span>
              <span className="font-medium text-slate-300">
                {firebaseActive ? 'Firestore Online' : 'Mode Lokal'}
              </span>
            </div>
            <button
              onClick={handleOpenAutoNumber}
              className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs rounded-lg shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
              title="Minta Nomor Surat Baru"
            >
              <Sparkles className="w-3.5 h-3.5 text-slate-950" />
              <span className="hidden sm:inline">Minta No. Surat</span>
            </button>

            {/* Mobile Menu Toggle Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
              aria-label="Buka Menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-slate-900 border-t border-slate-800 px-4 py-3 space-y-1">
            <div className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavigateTab(item.id)}
                    className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors ${
                      isActive
                        ? 'bg-blue-600 text-white'
                        : item.isLocked
                        ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </div>
                    {item.isLocked && (
                      <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded border border-amber-500/40">
                        Admin
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {activeTab === 'beranda' && (
          <BerandaView
            suratMasukList={suratMasukList}
            suratKeluarList={suratKeluarList}
            sekolah={sekolah}
            userRole={userRole}
            onOpenAutoNumber={handleOpenAutoNumber}
            onNavigateTab={(tab) => handleNavigateTab(tab as MenuTab)}
            onPreviewSuratKeluar={(sk) => setPreviewSuratKeluar(sk)}
            onEditSuratMasuk={handleNavigateToDisposisi}
            onOpenAdminLogin={() => {
              setLoginNoticeMessage('');
              setIsAdminLoginModalOpen(true);
            }}
          />
        )}

        {activeTab === 'surat_masuk' && (
          <SuratMasukView
            suratMasukList={suratMasukList}
            sekolah={sekolah}
            onAddSuratMasuk={handleAddSuratMasuk}
            onUpdateSuratMasuk={handleUpdateSuratMasuk}
            onDeleteSuratMasuk={handleDeleteSuratMasuk}
            editingItem={editingSuratMasuk}
            onClearEditing={() => setEditingSuratMasuk(null)}
          />
        )}

        {activeTab === 'surat_keluar' && (
          <SuratKeluarView
            suratKeluarList={suratKeluarList}
            arsipList={arsipList}
            guruList={guruList}
            siswaList={siswaList}
            sekolah={sekolah}
            onAddSuratKeluar={handleAddSuratKeluar}
            onUpdateSuratKeluar={handleUpdateSuratKeluar}
            onDeleteSuratKeluar={handleDeleteSuratKeluar}
            onAddArsip={handleAddArsip}
            onUpdateArsip={handleUpdateArsip}
            onDeleteArsip={handleDeleteArsip}
            onOpenAutoNumberModal={handleOpenAutoNumber}
            onPreviewSurat={(sk) => setPreviewSuratKeluar(sk)}
            initialSelectedNumber={selectedAutoNumber}
            onClearSelectedNumber={() => setSelectedAutoNumber(null)}
          />
        )}

        {activeTab === 'guru_siswa' && (
          <GuruSiswaView
            guruList={guruList}
            siswaList={siswaList}
            sekolah={sekolah}
            onAddGuru={handleAddGuru}
            onUpdateGuru={handleUpdateGuru}
            onDeleteGuru={handleDeleteGuru}
            onImportGuru={handleImportGuru}
            onAddSiswa={handleAddSiswa}
            onUpdateSiswa={handleUpdateSiswa}
            onDeleteSiswa={handleDeleteSiswa}
            onImportSiswa={handleImportSiswa}
            onClearAllSiswa={handleClearAllSiswa}
            onResetSiswaDefault={handleResetSiswaDefault}
          />
        )}

        {activeTab === 'filter' && (
          <FilterSuratView
            suratMasukList={suratMasukList}
            suratKeluarList={suratKeluarList}
            sekolah={sekolah}
            onPreviewSuratKeluar={(sk) => setPreviewSuratKeluar(sk)}
          />
        )}

        {activeTab === 'pengaturan' &&
          (userRole === 'admin' ? (
            <PengaturanView
              sekolah={sekolah}
              onSaveSekolah={handleSaveSekolah}
              firebaseConfig={getStoredFirebaseConfig()}
              onSaveFirebaseConfig={(cfg) => {
                setFirebaseActive(isFirebaseConfigured(cfg));
              }}
              suratMasukCount={suratMasukList.length}
              suratKeluarCount={suratKeluarList.length}
              arsipCount={arsipList.length}
              guruCount={guruList.length}
              siswaCount={siswaList.length}
              onClearSuratMasukFirestore={handleClearSuratMasukFirestore}
              onClearSuratKeluarFirestore={handleClearSuratKeluarFirestore}
              onPurgeDummyData={handlePurgeDummyData}
              onResetLocalCache={handleResetLocalCache}
              onSyncAllLocalDataToFirestore={handleSyncAllDataToCloud}
              onLogoutAdmin={handleLogoutAdmin}
            />
          ) : (
            <div className="bg-white p-8 sm:p-12 rounded-2xl border border-slate-200/80 shadow-xs text-center max-w-xl mx-auto space-y-5 my-8">
              <div className="w-16 h-16 bg-amber-100 border border-amber-200 rounded-2xl mx-auto flex items-center justify-center text-amber-700 shadow-xs">
                <Lock className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-bold text-slate-900">
                  Menu Pengaturan Terkunci
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Saat ini aplikasi berjalan dalam <strong>Mode Guru</strong> (akses langsung tanpa login). Sesuai pengaturan hak akses, <strong>Mode Guru tidak mengakses pengaturan</strong>.
                </p>
                <p className="text-xs text-slate-500">
                  Untuk mengonfigurasi Identitas Sekolah, Format Kop Surat Kedinasan, Akun Administrator, atau Basis Data Cloud Firebase, silakan masuk sebagai Admin (Kepala Sekolah & TU).
                </p>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setActiveTab('beranda')}
                  className="w-full sm:w-auto px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-all cursor-pointer"
                >
                  Kembali ke Beranda
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLoginNoticeMessage(
                      'Silakan masuk dengan akun Administrator (Kepala Sekolah & TU) untuk membuka menu Pengaturan.'
                    );
                    setIsAdminLoginModalOpen(true);
                  }}
                  className="w-full sm:w-auto px-6 py-2.5 bg-blue-800 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4 text-amber-300" />
                  <span>Masuk Akun Admin</span>
                </button>
              </div>
            </div>
          ))}
      </main>

      {/* Real-time Cloud Sync Toast Banner */}
      {toastNotification && (
        <div
          id="sync-toast-notification"
          className="fixed bottom-6 right-6 z-50 max-w-md animate-fade-in shadow-xl rounded-2xl p-4 border flex items-start gap-3 transition-all duration-300 backdrop-blur-md bg-white/95"
          style={{
            borderColor:
              toastNotification.type === 'success'
                ? '#10b981'
                : toastNotification.type === 'error'
                ? '#f43f5e'
                : '#3b82f6',
          }}
        >
          <div
            className={`p-1.5 rounded-xl flex-shrink-0 ${
              toastNotification.type === 'success'
                ? 'bg-emerald-100 text-emerald-700'
                : toastNotification.type === 'error'
                ? 'bg-rose-100 text-rose-700'
                : 'bg-blue-100 text-blue-700'
            }`}
          >
            {toastNotification.type === 'success' ? (
              <CheckCircle className="w-5 h-5" />
            ) : toastNotification.type === 'error' ? (
              <AlertCircle className="w-5 h-5" />
            ) : (
              <Cloud className="w-5 h-5" />
            )}
          </div>
          <div className="flex-1 text-xs">
            <div className="font-bold text-slate-800 flex items-center justify-between">
              <span>
                {toastNotification.type === 'success'
                  ? 'Cloud Firestore Tersimpan'
                  : toastNotification.type === 'error'
                  ? 'Gagal Sinkronisasi'
                  : 'Status Sinkronisasi'}
              </span>
              <button
                type="button"
                onClick={() => setToastNotification(null)}
                className="text-slate-400 hover:text-slate-600 ml-2"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-slate-600 mt-0.5 leading-relaxed">{toastNotification.message}</p>
          </div>
        </div>
      )}

      {/* Persistent Footer */}
      <footer className="bg-white border-t border-slate-200/80 py-4 mt-8 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
          <div>
            <span className="font-semibold text-slate-700">E-SURAT SDENTAN</span> — Sistem Informasi Administrasi Surat SDN 1 Pekutatan
          </div>
          <div className="flex items-center gap-4 text-[11px] text-slate-400">
            <span>Standar Permendagri No. 83 Th 2022</span>
            <span>•</span>
            <span>Kecamatan Pekutatan, Kab. Jembrana</span>
          </div>
        </div>
      </footer>

      {/* Global Modal: Generator Nomor Surat Otomatis Permendagri 83/2022 */}
      <AutoNumberModal
        isOpen={isAutoNumberModalOpen}
        onClose={() => setIsAutoNumberModalOpen(false)}
        sekolah={sekolah}
        totalSuratKeluar={suratKeluarList.length}
        suratKeluarList={suratKeluarList}
        arsipList={arsipList}
        onSelectNumber={handleSelectNumberForSurat}
      />

      {/* Global Modal: Pratinjau Surat & Cetak MS Word / PDF */}
      <SuratModal
        surat={previewSuratKeluar}
        sekolah={sekolah}
        guruList={guruList}
        onClose={() => setPreviewSuratKeluar(null)}
      />

      {/* Global Modal: Login Administrator (Kepala Sekolah & TU) */}
      <AdminLoginModal
        isOpen={isAdminLoginModalOpen}
        onClose={() => setIsAdminLoginModalOpen(false)}
        onSuccess={handleAdminLoginSuccess}
        messageNotice={loginNoticeMessage}
      />
    </div>
  );
}
