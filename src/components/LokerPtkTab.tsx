import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  FolderLock,
  FileText,
  Briefcase,
  StickyNote,
  BookOpen,
  Plus,
  Search,
  Upload,
  Download,
  Eye,
  EyeOff,
  Edit,
  Trash2,
  X,
  ExternalLink,
  AlertCircle,
  Calendar,
  Paperclip,
  Check,
  Lock,
  Unlock,
  KeyRound,
  Globe,
  ArrowLeft,
  HelpCircle,
  RotateCcw,
  ShieldAlert,
  Settings,
  Palette,
  Folder,
  FolderPlus,
} from 'lucide-react';
import {
  Guru,
  DefaultKategoriLokerPtk,
  KategoriLokerPtk,
  LokerPtkItem,
  LokerPtkAccess,
  VisibilitasLokerPtk,
  UserRole,
} from '../types';
import { KalenderKecilInput, getTodayIsoString } from './KalenderKecilPicker';
import { formatTanggalIndonesia } from '../utils/exportUtils';
import { hashLokerPassword } from '../utils/authUtils';
import { LokerFilePreview } from './LokerFilePreview';

interface LokerPtkTabProps {
  guruList: Guru[];
  lokerPtkList: LokerPtkItem[];
  lokerPtkAccessList: LokerPtkAccess[];
  userRole?: UserRole;
  onAddLokerPtk: (
    item: Omit<LokerPtkItem, 'id' | 'createdAt' | 'updatedAt'>
  ) => Promise<void> | void;
  onUpdateLokerPtk: (item: LokerPtkItem) => Promise<void> | void;
  onDeleteLokerPtk: (id: string) => Promise<void> | void;
  onSaveLokerPtkAccess: (access: LokerPtkAccess) => Promise<void> | void;
  onDeleteLokerLocker?: (ptkId: string) => Promise<void> | void;
}

const MAX_FILE_BYTES = 650 * 1024;
const SESSION_UNLOCKED_KEY = 'simas_loker_unlocked_ptk';

const KATEGORI_CONFIG: Record<
  DefaultKategoriLokerPtk,
  {
    label: string;
    shortLabel: string;
    badgeClass: string;
    contoh: string;
  }
> = {
  kepegawaian: {
    label: 'Administrasi Kepegawaian',
    shortLabel: 'Kepegawaian',
    badgeClass: 'bg-blue-50 text-blue-800 border-blue-200',
    contoh: 'Contoh: SK Pangkat, PKG, Sertifikat...',
  },
  catatan: {
    label: 'Catatan Penting',
    shortLabel: 'Catatan Penting',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
    contoh: 'Contoh: Agenda Rapat, Memo Pribadi...',
  },
  pembelajaran: {
    label: 'Administrasi Pembelajaran',
    shortLabel: 'Pembelajaran',
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    contoh: 'Contoh: Modul Ajar, Prota, Promes...',
  },
};

function getKategoriMeta(kat: KategoriLokerPtk): {
  label: string;
  shortLabel: string;
  badgeClass: string;
  contoh: string;
} {
  if (kat === 'kepegawaian' || kat === 'catatan' || kat === 'pembelajaran') {
    return KATEGORI_CONFIG[kat];
  }
  return {
    label: kat || 'Lainnya',
    shortLabel: kat || 'Lainnya',
    badgeClass: 'bg-violet-50 text-violet-800 border-violet-200',
    contoh: `Contoh: Berkas ${kat || 'folder'}...`,
  };
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function isSafeHttpUrl(url: string): boolean {
  return /^https?:\/\/.+/i.test(url.trim());
}

function getItemVisibilitas(item: LokerPtkItem): VisibilitasLokerPtk {
  return item.visibilitas === 'terbuka' ? 'terbuka' : 'privat';
}

interface LockerColorTheme {
  id: string;
  label: string;
  cardBg: string;
  accentBar: string;
  swatchClass: string;
  badgeSurface: string;
  buttonClass: string;
}

const LOCKER_COLOR_THEMES: LockerColorTheme[] = [
  {
    id: 'indigo',
    label: 'Biru Indigo',
    cardBg: 'bg-gradient-to-br from-indigo-50/90 via-white to-blue-50/60 border-indigo-200/90',
    accentBar: 'bg-gradient-to-r from-indigo-600 to-blue-500',
    swatchClass: 'bg-indigo-600',
    badgeSurface: 'bg-white/85',
    buttonClass: 'bg-indigo-700 hover:bg-indigo-600 text-white',
  },
  {
    id: 'sky',
    label: 'Biru Langit',
    cardBg: 'bg-gradient-to-br from-sky-50/90 via-white to-cyan-50/60 border-sky-200/90',
    accentBar: 'bg-gradient-to-r from-sky-500 to-cyan-500',
    swatchClass: 'bg-sky-500',
    badgeSurface: 'bg-white/85',
    buttonClass: 'bg-sky-600 hover:bg-sky-500 text-white',
  },
  {
    id: 'emerald',
    label: 'Hijau Zamrud',
    cardBg: 'bg-gradient-to-br from-emerald-50/90 via-white to-teal-50/60 border-emerald-200/90',
    accentBar: 'bg-gradient-to-r from-emerald-600 to-teal-500',
    swatchClass: 'bg-emerald-500',
    badgeSurface: 'bg-white/85',
    buttonClass: 'bg-emerald-600 hover:bg-emerald-500 text-white',
  },
  {
    id: 'teal',
    label: 'Hijau Toska',
    cardBg: 'bg-gradient-to-br from-teal-50/90 via-white to-cyan-50/60 border-teal-200/90',
    accentBar: 'bg-gradient-to-r from-teal-600 to-emerald-500',
    swatchClass: 'bg-teal-500',
    badgeSurface: 'bg-white/85',
    buttonClass: 'bg-teal-600 hover:bg-teal-500 text-white',
  },
  {
    id: 'amber',
    label: 'Kuning Emas',
    cardBg: 'bg-gradient-to-br from-amber-50/90 via-white to-orange-50/60 border-amber-200/90',
    accentBar: 'bg-gradient-to-r from-amber-500 to-orange-500',
    swatchClass: 'bg-amber-400',
    badgeSurface: 'bg-white/85',
    buttonClass: 'bg-amber-400 hover:bg-amber-500 text-slate-950',
  },
  {
    id: 'rose',
    label: 'Merah Mawar',
    cardBg: 'bg-gradient-to-br from-rose-50/90 via-white to-pink-50/60 border-rose-200/90',
    accentBar: 'bg-gradient-to-r from-rose-500 to-pink-500',
    swatchClass: 'bg-rose-500',
    badgeSurface: 'bg-white/85',
    buttonClass: 'bg-rose-600 hover:bg-rose-500 text-white',
  },
  {
    id: 'violet',
    label: 'Ungu Violet',
    cardBg: 'bg-gradient-to-br from-violet-50/90 via-white to-purple-50/60 border-violet-200/90',
    accentBar: 'bg-gradient-to-r from-violet-600 to-purple-500',
    swatchClass: 'bg-violet-500',
    badgeSurface: 'bg-white/85',
    buttonClass: 'bg-violet-600 hover:bg-violet-500 text-white',
  },
  {
    id: 'white',
    label: 'Putih Elegan',
    cardBg: 'bg-gradient-to-br from-white via-slate-50/60 to-slate-100/70 border-slate-200/90',
    accentBar: 'bg-gradient-to-r from-slate-600 to-slate-400',
    swatchClass: 'bg-white border-slate-300',
    badgeSurface: 'bg-white',
    buttonClass: 'bg-white hover:bg-slate-100 text-slate-900 border border-slate-300',
  },
];

function getLockerColorTheme(colorId?: string): LockerColorTheme {
  return (
    LOCKER_COLOR_THEMES.find((t) => t.id === colorId) || LOCKER_COLOR_THEMES[0]
  );
}

export const LokerPtkTab: React.FC<LokerPtkTabProps> = ({
  guruList,
  lokerPtkList,
  lokerPtkAccessList,
  userRole = 'guru',
  onAddLokerPtk,
  onUpdateLokerPtk,
  onDeleteLokerPtk,
  onSaveLokerPtkAccess,
  onDeleteLokerLocker,
}) => {
  const isAdmin = userRole === 'admin';

  // null = tampilan lobi daftar loker; string = loker PTK yang sedang dibuka
  const [openedPtkId, setOpenedPtkId] = useState<string | null>(null);
  const [lobbySearch, setLobbySearch] = useState('');

  // Filter di dalam Loker PTK
  const [activeKategori, setActiveKategori] = useState<'semua' | KategoriLokerPtk>('semua');
  const [filterVisibilitas, setFilterVisibilitas] = useState<'semua' | VisibilitasLokerPtk>('semua');
  const [itemSearch, setItemSearch] = useState('');

  // ID PTK yang sudah dibuka kuncinya di sesi ini
  const [unlockedPtkIds, setUnlockedPtkIds] = useState<string[]>(() => {
    try {
      const raw = sessionStorage.getItem(SESSION_UNLOCKED_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore
    }
    return [];
  });

  useEffect(() => {
    try {
      sessionStorage.setItem(SESSION_UNLOCKED_KEY, JSON.stringify(unlockedPtkIds));
    } catch {
      // ignore
    }
  }, [unlockedPtkIds]);

  // Unlock password gate state
  const [unlockPasswordInput, setUnlockPasswordInput] = useState('');
  const [showUnlockPassword, setShowUnlockPassword] = useState(false);
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [showPasswordHint, setShowPasswordHint] = useState(false);
  const [isVerifyingUnlock, setIsVerifyingUnlock] = useState(false);

  // Modal "Buat Loker" (untuk membuat loker baru & langsung mengatur passwordnya)
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createPtkId, setCreatePtkId] = useState('');
  const [createUsePassword, setCreateUsePassword] = useState(true);
  const [createPassword, setCreatePassword] = useState('');
  const [createConfirmPassword, setCreateConfirmPassword] = useState('');
  const [createHint, setCreateHint] = useState('');
  const [createDefaultVisibilitas, setCreateDefaultVisibilitas] =
    useState<VisibilitasLokerPtk>('privat');
  const [showCreatePasswords, setShowCreatePasswords] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [isCreatingLocker, setIsCreatingLocker] = useState(false);

  // Modal "Kelola Password" di dalam Loker yang sudah terbuka
  const [showAccessModal, setShowAccessModal] = useState(false);
  const [accessActionMode, setAccessActionMode] = useState<'set_or_change' | 'remove'>(
    'set_or_change'
  );
  const [accOldPassword, setAccOldPassword] = useState('');
  const [accNewPassword, setAccNewPassword] = useState('');
  const [accConfirmPassword, setAccConfirmPassword] = useState('');
  const [accHint, setAccHint] = useState('');
  const [accDefaultVisibilitas, setAccDefaultVisibilitas] =
    useState<VisibilitasLokerPtk>('privat');
  const [showAccPasswords, setShowAccPasswords] = useState(false);
  const [accessError, setAccessError] = useState<string | null>(null);
  const [isSavingAccess, setIsSavingAccess] = useState(false);

  // Modal Tambah / Edit Berkas & Catatan
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingItem, setEditingItem] = useState<LokerPtkItem | null>(null);
  const [formKategori, setFormKategori] = useState<KategoriLokerPtk>('kepegawaian');
  const [formVisibilitas, setFormVisibilitas] = useState<VisibilitasLokerPtk>('privat');
  const [formJudul, setFormJudul] = useState('');
  const [formTanggal, setFormTanggal] = useState(getTodayIsoString);
  const [formIsiCatatan, setFormIsiCatatan] = useState('');
  const [formFileNama, setFormFileNama] = useState('');
  const [formFileTipe, setFormFileTipe] = useState('');
  const [formFileUkuran, setFormFileUkuran] = useState('');
  const [formFileUrl, setFormFileUrl] = useState('');
  const [formLinkEksternal, setFormLinkEksternal] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Modal Pratinjau & Hapus
  const [previewItem, setPreviewItem] = useState<LokerPtkItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<LokerPtkItem | null>(null);

  // Toggle Akses Loker (Kunci Terbuka <-> Privat)
  const [isTogglingRoomAccess, setIsTogglingRoomAccess] = useState(false);

  // Modal cepat Pasang Password saat loker belum berpassword dipindahkan aturan
  const [quickLockPtk, setQuickLockPtk] = useState<Guru | null>(null);
  const [quickLockTargetVis, setQuickLockTargetVis] = useState<VisibilitasLokerPtk>('privat');
  const [quickLockActionSource, setQuickLockActionSource] = useState<'lobby' | 'room'>('lobby');
  const [quickLockPassword, setQuickLockPassword] = useState('');
  const [quickLockConfirmPassword, setQuickLockConfirmPassword] = useState('');
  const [quickLockHint, setQuickLockHint] = useState('');
  const [showQuickLockPasswords, setShowQuickLockPasswords] = useState(false);
  const [quickLockError, setQuickLockError] = useState<string | null>(null);
  const [isSavingQuickLock, setIsSavingQuickLock] = useState(false);

  // Modal Konfirmasi Password setiap kali memindahkan Kunci Terbuka <-> Privat
  const [ruleChangePending, setRuleChangePending] = useState<{
    ptk: Guru;
    targetVis: VisibilitasLokerPtk;
    source: 'lobby' | 'room';
  } | null>(null);
  const [ruleChangePassword, setRuleChangePassword] = useState('');
  const [showRuleChangePassword, setShowRuleChangePassword] = useState(false);
  const [ruleChangeError, setRuleChangeError] = useState<string | null>(null);
  const [isSavingRuleChange, setIsSavingRuleChange] = useState(false);

  // Modal Masukkan Password untuk melihat/mengunduh berkas Privat di dalam loker yang statusnya Terbuka
  const [showPrivateUnlockModal, setShowPrivateUnlockModal] = useState(false);
  const [privateUnlockPassword, setPrivateUnlockPassword] = useState('');
  const [showPrivateUnlockPass, setShowPrivateUnlockPass] = useState(false);
  const [privateUnlockError, setPrivateUnlockError] = useState<string | null>(null);
  const [isVerifyingPrivateUnlock, setIsVerifyingPrivateUnlock] = useState(false);

  // Modal Reset Password Loker (Khusus Akun Admin)
  const [resetTargetPtk, setResetTargetPtk] = useState<Guru | null>(null);
  const [resetMode, setResetMode] = useState<'remove' | 'set_temp'>('remove');
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetConfirmPassword, setResetConfirmPassword] = useState('');
  const [resetHint, setResetHint] = useState('');
  const [showResetPasswords, setShowResetPasswords] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [resetSuccessToast, setResetSuccessToast] = useState<string | null>(null);

  // Modal Hapus Loker PTK (wajib masukkan password loker jika berpassword)
  const [deleteLockerTarget, setDeleteLockerTarget] = useState<Guru | null>(null);
  const [deleteLockerPassword, setDeleteLockerPassword] = useState('');
  const [showDeleteLockerPassword, setShowDeleteLockerPassword] = useState(false);
  const [deleteLockerError, setDeleteLockerError] = useState<string | null>(null);
  const [isDeletingLocker, setIsDeletingLocker] = useState(false);

  // Modal Pengaturan Loker PTK (Gear: warna background, reset password, hapus loker)
  const [settingsTargetPtk, setSettingsTargetPtk] = useState<Guru | null>(null);
  const [isSavingCardColor, setIsSavingCardColor] = useState(false);

  // Modal Tambah & Kelola Folder di dalam Loker
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [folderError, setFolderError] = useState<string | null>(null);
  const [isSavingFolders, setIsSavingFolders] = useState(false);

  // Modal Ubah Status Berkas (Privat <-> Terbuka) dengan password tanpa masuk ke akun pemilik
  const [itemVisChangePending, setItemVisChangePending] = useState<{
    item: LokerPtkItem;
    targetVis: VisibilitasLokerPtk;
  } | null>(null);
  const [itemVisPassword, setItemVisPassword] = useState('');
  const [showItemVisPassword, setShowItemVisPassword] = useState(false);
  const [itemVisError, setItemVisError] = useState<string | null>(null);
  const [isSavingItemVis, setIsSavingItemVis] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const toastTimerRef = useRef<number | null>(null);

  const showSuccessNotification = (message: string, durationMs = 4000) => {
    setResetSuccessToast(message);
    if (toastTimerRef.current !== null) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => {
      setResetSuccessToast(null);
      toastTimerRef.current = null;
    }, durationMs);
  };

  useEffect(() => {
    return () => {
      if (toastTimerRef.current !== null) {
        window.clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  const accessByPtkId = useMemo(() => {
    const map: Record<string, LokerPtkAccess> = {};
    lokerPtkAccessList.forEach((acc) => {
      if (acc && acc.ptkId) {
        map[acc.ptkId] = acc;
      }
    });
    return map;
  }, [lokerPtkAccessList]);

  // PTK yang sudah memiliki loker (terdaftar di lokerPtkAccessList atau sudah punya berkas di lokerPtkList)
  const activeLockerPtks = useMemo(() => {
    const ptkIdsWithItems = new Set(lokerPtkList.map((item) => item.ptkId));
    return guruList.filter((g) => Boolean(accessByPtkId[g.id]) || ptkIdsWithItems.has(g.id));
  }, [guruList, accessByPtkId, lokerPtkList]);

  // PTK yang belum memiliki loker (untuk pilihan di modal "Buat Loker")
  const availablePtksForNewLocker = useMemo(() => {
    const activeIds = new Set(activeLockerPtks.map((g) => g.id));
    return guruList.filter((g) => !activeIds.has(g.id));
  }, [guruList, activeLockerPtks]);

  const filteredLobbyLockers = useMemo(() => {
    const q = lobbySearch.trim().toLowerCase();
    if (!q) return activeLockerPtks;
    return activeLockerPtks.filter(
      (g) =>
        g.nama.toLowerCase().includes(q) ||
        g.jabatan.toLowerCase().includes(q) ||
        (g.nip && g.nip.toLowerCase().includes(q))
    );
  }, [activeLockerPtks, lobbySearch]);

  // Jika PTK yang sedang dibuka dihapus dari guruList, kembali ke lobi
  useEffect(() => {
    if (openedPtkId && !guruList.some((g) => g.id === openedPtkId)) {
      setOpenedPtkId(null);
    }
  }, [guruList, openedPtkId]);

  // Reset input unlock saat berpindah loker
  useEffect(() => {
    setUnlockPasswordInput('');
    setUnlockError(null);
    setShowPasswordHint(false);
    setShowUnlockPassword(false);
    setShowPrivateUnlockModal(false);
    setRuleChangePending(null);
    setItemVisChangePending(null);
    setActiveKategori('semua');
    setFilterVisibilitas('semua');
    setItemSearch('');
  }, [openedPtkId]);

  const openedPtk = useMemo(
    () => (openedPtkId ? guruList.find((g) => g.id === openedPtkId) || null : null),
    [guruList, openedPtkId]
  );

  const currentAccess = openedPtkId ? accessByPtkId[openedPtkId] || null : null;
  const isProtected = Boolean(currentAccess?.isProtected && currentAccess?.passwordHash);
  const isOwnerUnlocked = isProtected
    ? Boolean(openedPtkId && unlockedPtkIds.includes(openedPtkId))
    : true;
  // Status Loker (independen dari status per-berkas): Kunci Terbuka vs Privat
  const effectiveRoomVisibilitas: VisibilitasLokerPtk = currentAccess
    ? currentAccess.defaultVisibilitas === 'terbuka'
      ? 'terbuka'
      : 'privat'
    : 'terbuka';
  // Pengunjung boleh masuk ke dalam loker jika status loker Terbuka atau pemilik sudah verifikasi password
  const canEnterRoom = effectiveRoomVisibilitas === 'terbuka' || isOwnerUnlocked;
  // Berkas Privat selalu butuh verifikasi password loker untuk dilihat/diunduh (walaupun loker berstatus Terbuka)
  const canAccessPrivat =
    isProtected && Boolean(openedPtkId && unlockedPtkIds.includes(openedPtkId));
  // Pengelolaan (tambah/edit/hapus/kelola password) oleh pemilik terverifikasi
  const canManageRoom = isProtected ? isOwnerUnlocked : true;

  const ptkLockerItems = useMemo(() => {
    if (!openedPtkId) return [];
    return lokerPtkList
      .filter((item) => item.ptkId === openedPtkId)
      .sort((a, b) => {
        const cmpDate = (b.tanggal || '').localeCompare(a.tanggal || '');
        if (cmpDate !== 0) return cmpDate;
        return (b.updatedAt || '').localeCompare(a.updatedAt || '');
      });
  }, [lokerPtkList, openedPtkId]);

  const publicItems = useMemo(
    () => ptkLockerItems.filter((i) => getItemVisibilitas(i) === 'terbuka'),
    [ptkLockerItems]
  );

  const privateItems = useMemo(
    () => ptkLockerItems.filter((i) => getItemVisibilitas(i) === 'privat'),
    [ptkLockerItems]
  );

  const customFoldersForOpenedPtk = useMemo(() => {
    if (!openedPtkId) return [];
    const seen = new Set<string>(['kepegawaian', 'catatan', 'pembelajaran']);
    const folders: string[] = [];

    const addIfValid = (raw: string) => {
      const clean = raw.trim();
      if (!clean) return;
      const lower = clean.toLowerCase();
      if (
        seen.has(lower) ||
        lower === 'administrasi kepegawaian' ||
        lower === 'adm. kepegawaian' ||
        lower === 'catatan penting' ||
        lower === 'administrasi pembelajaran' ||
        lower === 'adm. pembelajaran'
      ) {
        return;
      }
      seen.add(lower);
      folders.push(clean);
    };

    (currentAccess?.customFolders || []).forEach(addIfValid);
    ptkLockerItems.forEach((item) => addIfValid(item.kategori));
    return folders;
  }, [openedPtkId, currentAccess?.customFolders, ptkLockerItems]);

  const allFoldersForOpenedPtk = useMemo(
    () => [
      { id: 'kepegawaian', label: KATEGORI_CONFIG.kepegawaian.label, shortLabel: 'Adm. Kepegawaian', isCustom: false },
      { id: 'catatan', label: KATEGORI_CONFIG.catatan.label, shortLabel: 'Catatan Penting', isCustom: false },
      { id: 'pembelajaran', label: KATEGORI_CONFIG.pembelajaran.label, shortLabel: 'Adm. Pembelajaran', isCustom: false },
      ...customFoldersForOpenedPtk.map((name) => ({
        id: name,
        label: name,
        shortLabel: name,
        isCustom: true,
      })),
    ],
    [customFoldersForOpenedPtk]
  );

  const countsByKategori = useMemo(() => {
    const counts: Record<string, number> = {
      semua: ptkLockerItems.length,
      kepegawaian: 0,
      catatan: 0,
      pembelajaran: 0,
    };
    allFoldersForOpenedPtk.forEach((f) => {
      if (!(f.id in counts)) counts[f.id] = 0;
    });
    ptkLockerItems.forEach((item) => {
      counts[item.kategori] = (counts[item.kategori] || 0) + 1;
    });
    return counts;
  }, [ptkLockerItems, allFoldersForOpenedPtk]);

  const filteredItems = useMemo(() => {
    const q = itemSearch.trim().toLowerCase();
    return ptkLockerItems.filter((item) => {
      const vis = getItemVisibilitas(item);
      const matchKat = activeKategori === 'semua' || item.kategori === activeKategori;
      const matchVis = filterVisibilitas === 'semua' || vis === filterVisibilitas;
      // Saat belum verifikasi password, jangan bocorkan isiCatatan/fileNama berkas privat via pencarian
      const isMaskedPrivat = vis === 'privat' && !canAccessPrivat;
      const matchSearch =
        !q ||
        item.judul.toLowerCase().includes(q) ||
        (!isMaskedPrivat &&
          ((item.isiCatatan && item.isiCatatan.toLowerCase().includes(q)) ||
            (item.fileNama && item.fileNama.toLowerCase().includes(q))));
      return matchKat && matchVis && matchSearch;
    });
  }, [ptkLockerItems, canAccessPrivat, activeKategori, filterVisibilitas, itemSearch]);

  const openCreateLockerModal = () => {
    const defaultTarget = availablePtksForNewLocker[0]?.id || '';
    setCreatePtkId(defaultTarget);
    setCreateUsePassword(true);
    setCreatePassword('');
    setCreateConfirmPassword('');
    setCreateHint('');
    setCreateDefaultVisibilitas('privat');
    setShowCreatePasswords(false);
    setCreateError(null);
    setShowCreateModal(true);
  };

  const handleCreateLockerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);

    const targetPtk = guruList.find((g) => g.id === createPtkId);
    if (!targetPtk) {
      setCreateError('Pilih nama PTK pemilik loker.');
      return;
    }

    if (createUsePassword) {
      if (createPassword.length < 4) {
        setCreateError('Password minimal 4 karakter.');
        return;
      }
      if (createPassword !== createConfirmPassword) {
        setCreateError('Konfirmasi password tidak sesuai.');
        return;
      }
    }

    setIsCreatingLocker(true);
    try {
      const sanitizedId = targetPtk.id.replace(/[^a-zA-Z0-9_-]/g, '_');
      const passwordHash = createUsePassword
        ? await hashLokerPassword(targetPtk.id, createPassword)
        : '';

      await onSaveLokerPtkAccess({
        id: sanitizedId,
        ptkId: targetPtk.id,
        ptkNama: targetPtk.nama,
        isProtected: createUsePassword,
        passwordHash,
        passwordHint: createUsePassword ? createHint.trim() : '',
        defaultVisibilitas: createDefaultVisibilitas,
        updatedAt: new Date().toISOString(),
      });

      if (createUsePassword) {
        setUnlockedPtkIds((prev) =>
          prev.includes(targetPtk.id) ? prev : [...prev, targetPtk.id]
        );
      }

      setShowCreateModal(false);
      setOpenedPtkId(targetPtk.id);
    } finally {
      setIsCreatingLocker(false);
    }
  };

  const handleUnlockRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!openedPtkId || !currentAccess) return;
    setUnlockError(null);

    if (!unlockPasswordInput) {
      setUnlockError('Masukkan password terlebih dahulu.');
      return;
    }

    setIsVerifyingUnlock(true);
    try {
      const hashed = await hashLokerPassword(openedPtkId, unlockPasswordInput);
      if (hashed === currentAccess.passwordHash) {
        setUnlockedPtkIds((prev) =>
          prev.includes(openedPtkId) ? prev : [...prev, openedPtkId]
        );
        setUnlockPasswordInput('');
        setUnlockError(null);
      } else {
        setUnlockError('Password salah.');
      }
    } finally {
      setIsVerifyingUnlock(false);
    }
  };

  const handleLockRoom = () => {
    if (openedPtkId) {
      setUnlockedPtkIds((prev) => prev.filter((id) => id !== openedPtkId));
    }
    setPreviewItem(null);
    setShowFormModal(false);
    setShowAccessModal(false);
    setItemVisChangePending(null);
  };

  const handleBackToLobby = () => {
    // Selalu reset verifikasi pemilik saat keluar ke lobi agar akses berkas privat & masuk loker privat tetap terlindungi
    if (openedPtkId) {
      setUnlockedPtkIds((prev) => prev.filter((id) => id !== openedPtkId));
    }
    setPreviewItem(null);
    setShowFormModal(false);
    setShowAccessModal(false);
    setShowPrivateUnlockModal(false);
    setShowFolderModal(false);
    setNewFolderName('');
    setFolderError(null);
    setItemVisChangePending(null);
    setOpenedPtkId(null);
  };

  const handleOpenPreview = (item: LokerPtkItem) => {
    if (getItemVisibilitas(item) === 'privat' && !canAccessPrivat) {
      if (isProtected) {
        setPrivateUnlockPassword('');
        setPrivateUnlockError(null);
        setShowPrivateUnlockPass(false);
        setShowPrivateUnlockModal(true);
      }
      return;
    }
    setPreviewItem(item);
  };

  const openPrivateUnlockModal = () => {
    setPrivateUnlockPassword('');
    setPrivateUnlockError(null);
    setShowPrivateUnlockPass(false);
    setShowPrivateUnlockModal(true);
  };

  const handlePrivateUnlockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!openedPtkId || !currentAccess) return;
    setPrivateUnlockError(null);

    if (!privateUnlockPassword) {
      setPrivateUnlockError('Masukkan password terlebih dahulu.');
      return;
    }

    setIsVerifyingPrivateUnlock(true);
    try {
      const hashed = await hashLokerPassword(openedPtkId, privateUnlockPassword);
      if (hashed === currentAccess.passwordHash) {
        setUnlockedPtkIds((prev) =>
          prev.includes(openedPtkId) ? prev : [...prev, openedPtkId]
        );
        setPrivateUnlockPassword('');
        setPrivateUnlockError(null);
        setShowPrivateUnlockModal(false);
      } else {
        setPrivateUnlockError('Password salah.');
      }
    } finally {
      setIsVerifyingPrivateUnlock(false);
    }
  };

  const openQuickLockModal = (
    ptk: Guru,
    source: 'lobby' | 'room',
    targetVis: VisibilitasLokerPtk = 'privat'
  ) => {
    setQuickLockPtk(ptk);
    setQuickLockTargetVis(targetVis);
    setQuickLockActionSource(source);
    setQuickLockPassword('');
    setQuickLockConfirmPassword('');
    setQuickLockHint('');
    setShowQuickLockPasswords(false);
    setQuickLockError(null);
  };

  const handleQuickLockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickLockPtk) return;
    setQuickLockError(null);

    if (quickLockPassword.length < 4) {
      setQuickLockError('Password minimal 4 karakter.');
      return;
    }
    if (quickLockPassword !== quickLockConfirmPassword) {
      setQuickLockError('Konfirmasi password tidak sesuai.');
      return;
    }

    setIsSavingQuickLock(true);
    try {
      const targetPtk = quickLockPtk;
      const sanitizedId = targetPtk.id.replace(/[^a-zA-Z0-9_-]/g, '_');
      const nowIso = new Date().toISOString();
      const nextHash = await hashLokerPassword(targetPtk.id, quickLockPassword);

      const existingAcc = accessByPtkId[targetPtk.id];
      await onSaveLokerPtkAccess({
        id: sanitizedId,
        ptkId: targetPtk.id,
        ptkNama: targetPtk.nama,
        isProtected: true,
        passwordHash: nextHash,
        passwordHint: quickLockHint.trim(),
        defaultVisibilitas: quickLockTargetVis,
        ...(existingAcc?.cardColor ? { cardColor: existingAcc.cardColor } : {}),
        ...(existingAcc?.customFolders ? { customFolders: existingAcc.customFolders } : {}),
        updatedAt: nowIso,
      });

      if (quickLockActionSource === 'lobby') {
        setUnlockedPtkIds((prev) => prev.filter((id) => id !== targetPtk.id));
      } else {
        setUnlockedPtkIds((prev) =>
          prev.includes(targetPtk.id) ? prev : [...prev, targetPtk.id]
        );
      }
      showSuccessNotification(
        quickLockTargetVis === 'privat'
          ? `Berhasil! Password aktif dan status loker ${targetPtk.nama} disetel Privat.`
          : `Berhasil! Password aktif dan status loker ${targetPtk.nama} disetel Kunci Terbuka.`
      );
      setQuickLockPtk(null);
    } finally {
      setIsSavingQuickLock(false);
    }
  };

  const requestPtkLockerVisibilitasChange = (
    targetPtk: Guru,
    targetVis: VisibilitasLokerPtk,
    source: 'lobby' | 'room'
  ) => {
    if (isTogglingRoomAccess || isSavingRuleChange) return;

    const acc = accessByPtkId[targetPtk.id];
    const hasLock = Boolean(acc?.isProtected && acc?.passwordHash);
    const currentRoomStatus: VisibilitasLokerPtk = acc
      ? acc.defaultVisibilitas === 'terbuka'
        ? 'terbuka'
        : 'privat'
      : 'terbuka';

    if (currentRoomStatus === targetVis && hasLock) {
      return;
    }

    // Jika belum memiliki password, pasang password terlebih dahulu
    if (!hasLock) {
      openQuickLockModal(targetPtk, source, targetVis);
      return;
    }

    // Setiap kali memindahkan Kunci Terbuka <-> Privat wajib memasukkan password PTK
    setRuleChangePending({ ptk: targetPtk, targetVis, source });
    setRuleChangePassword('');
    setShowRuleChangePassword(false);
    setRuleChangeError(null);
  };

  const handleRuleChangeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ruleChangePending) return;
    setRuleChangeError(null);

    const { ptk: targetPtk, targetVis, source } = ruleChangePending;
    const acc = accessByPtkId[targetPtk.id];
    if (!acc || !acc.passwordHash) {
      setRuleChangeError('Loker belum memiliki password.');
      return;
    }
    if (!ruleChangePassword) {
      setRuleChangeError('Masukkan password loker terlebih dahulu.');
      return;
    }

    setIsSavingRuleChange(true);
    try {
      const hashed = await hashLokerPassword(targetPtk.id, ruleChangePassword);
      if (hashed !== acc.passwordHash) {
        setRuleChangeError('Password salah.');
        return;
      }

      const sanitizedId = targetPtk.id.replace(/[^a-zA-Z0-9_-]/g, '_');
      const nowIso = new Date().toISOString();

      // Hanya mengubah status loker (Kunci Terbuka <-> Privat); status masing-masing berkas tetap terjaga terpisah
      await onSaveLokerPtkAccess({
        id: sanitizedId,
        ptkId: targetPtk.id,
        ptkNama: targetPtk.nama,
        isProtected: true,
        passwordHash: acc.passwordHash,
        passwordHint: acc.passwordHint || '',
        defaultVisibilitas: targetVis,
        ...(acc.cardColor ? { cardColor: acc.cardColor } : {}),
        ...(acc.customFolders ? { customFolders: acc.customFolders } : {}),
        updatedAt: nowIso,
      });

      if (source === 'lobby') {
        // Dari lobi: kunci kembali sesi agar berkas privat tetap butuh password
        setUnlockedPtkIds((prev) => prev.filter((id) => id !== targetPtk.id));
      } else {
        // Dari dalam loker: pemilik baru saja memverifikasi password
        setUnlockedPtkIds((prev) =>
          prev.includes(targetPtk.id) ? prev : [...prev, targetPtk.id]
        );
      }

      setRuleChangePending(null);
      setRuleChangePassword('');
      showSuccessNotification(
        targetVis === 'privat'
          ? `Berhasil! Status loker ${targetPtk.nama} diubah menjadi Privat.`
          : `Berhasil! Status loker ${targetPtk.nama} diubah menjadi Kunci Terbuka.`
      );
    } finally {
      setIsSavingRuleChange(false);
    }
  };

  const handleChangeRoomVisibilitas = (targetVis: VisibilitasLokerPtk) => {
    if (!openedPtk) return;
    requestPtkLockerVisibilitasChange(openedPtk, targetVis, 'room');
  };

  const openAdminResetModal = (ptk: Guru) => {
    if (!isAdmin) return;
    setResetTargetPtk(ptk);
    setResetMode('remove');
    setResetNewPassword('');
    setResetConfirmPassword('');
    setResetHint('');
    setShowResetPasswords(false);
    setResetError(null);
  };

  const handleAdminResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin || !resetTargetPtk) return;
    setResetError(null);

    const targetAcc = accessByPtkId[resetTargetPtk.id];
    const sanitizedId = resetTargetPtk.id.replace(/[^a-zA-Z0-9_-]/g, '_');
    const nowIso = new Date().toISOString();

    if (resetMode === 'set_temp') {
      if (resetNewPassword.length < 4) {
        setResetError('Password baru minimal 4 karakter.');
        return;
      }
      if (resetNewPassword !== resetConfirmPassword) {
        setResetError('Konfirmasi password tidak sesuai.');
        return;
      }
    }

    setIsResettingPassword(true);
    try {
      if (resetMode === 'remove') {
        await onSaveLokerPtkAccess({
          id: sanitizedId,
          ptkId: resetTargetPtk.id,
          ptkNama: resetTargetPtk.nama,
          isProtected: false,
          passwordHash: '',
          passwordHint: '',
          defaultVisibilitas: targetAcc?.defaultVisibilitas || 'privat',
          ...(targetAcc?.cardColor ? { cardColor: targetAcc.cardColor } : {}),
          ...(targetAcc?.customFolders ? { customFolders: targetAcc.customFolders } : {}),
          updatedAt: nowIso,
        });
      } else {
        const nextHash = await hashLokerPassword(resetTargetPtk.id, resetNewPassword);
        await onSaveLokerPtkAccess({
          id: sanitizedId,
          ptkId: resetTargetPtk.id,
          ptkNama: resetTargetPtk.nama,
          isProtected: true,
          passwordHash: nextHash,
          passwordHint: resetHint.trim(),
          defaultVisibilitas: targetAcc?.defaultVisibilitas || 'privat',
          ...(targetAcc?.cardColor ? { cardColor: targetAcc.cardColor } : {}),
          ...(targetAcc?.customFolders ? { customFolders: targetAcc.customFolders } : {}),
          updatedAt: nowIso,
        });
      }

      setUnlockedPtkIds((prev) => prev.filter((id) => id !== resetTargetPtk.id));
      const ptkNama = resetTargetPtk.nama;
      setResetTargetPtk(null);
      showSuccessNotification(
        resetMode === 'remove'
          ? `Berhasil! Password loker ${ptkNama} berhasil direset (kunci dibuka).`
          : `Berhasil! Password baru loker ${ptkNama} berhasil disetel oleh Admin.`,
        4500
      );
    } finally {
      setIsResettingPassword(false);
    }
  };

  const openDeleteLockerModal = (ptk: Guru) => {
    setDeleteLockerTarget(ptk);
    setDeleteLockerPassword('');
    setShowDeleteLockerPassword(false);
    setDeleteLockerError(null);
  };

  const handleConfirmDeleteLocker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deleteLockerTarget || !onDeleteLokerLocker) return;
    setDeleteLockerError(null);

    const acc = accessByPtkId[deleteLockerTarget.id];
    const hasLock = Boolean(acc?.isProtected && acc?.passwordHash);

    if (hasLock) {
      if (!deleteLockerPassword) {
        setDeleteLockerError('Masukkan password loker terlebih dahulu untuk menghapus loker.');
        return;
      }
      setIsDeletingLocker(true);
      try {
        const hashed = await hashLokerPassword(deleteLockerTarget.id, deleteLockerPassword);
        if (hashed !== acc.passwordHash) {
          setDeleteLockerError('Password loker salah. Loker tidak dapat dihapus.');
          return;
        }
        await onDeleteLokerLocker(deleteLockerTarget.id);
        setUnlockedPtkIds((prev) => prev.filter((id) => id !== deleteLockerTarget.id));
        if (openedPtkId === deleteLockerTarget.id) {
          setOpenedPtkId(null);
        }
        const nama = deleteLockerTarget.nama;
        setDeleteLockerTarget(null);
        setDeleteLockerPassword('');
        showSuccessNotification(`Berhasil! Loker ${nama} beserta seluruh isinya berhasil dihapus.`);
      } finally {
        setIsDeletingLocker(false);
      }
      return;
    }

    setIsDeletingLocker(true);
    try {
      await onDeleteLokerLocker(deleteLockerTarget.id);
      setUnlockedPtkIds((prev) => prev.filter((id) => id !== deleteLockerTarget.id));
      if (openedPtkId === deleteLockerTarget.id) {
        setOpenedPtkId(null);
      }
      const nama = deleteLockerTarget.nama;
      setDeleteLockerTarget(null);
      showSuccessNotification(`Berhasil! Loker ${nama} berhasil dihapus.`);
    } finally {
      setIsDeletingLocker(false);
    }
  };

  const handleSelectLockerColor = async (ptk: Guru, colorId: string) => {
    if (isSavingCardColor) return;
    setIsSavingCardColor(true);
    try {
      const acc = accessByPtkId[ptk.id];
      const sanitizedId = ptk.id.replace(/[^a-zA-Z0-9_-]/g, '_');
      await onSaveLokerPtkAccess({
        id: acc?.id || sanitizedId,
        ptkId: ptk.id,
        ptkNama: ptk.nama,
        isProtected: Boolean(acc?.isProtected),
        passwordHash: acc?.passwordHash || '',
        passwordHint: acc?.passwordHint || '',
        defaultVisibilitas: acc?.defaultVisibilitas || 'terbuka',
        cardColor: colorId,
        ...(acc?.customFolders ? { customFolders: acc.customFolders } : {}),
        updatedAt: new Date().toISOString(),
      });
      showSuccessNotification(`Berhasil! Warna tombol loker ${ptk.nama} berhasil diperbarui.`);
    } finally {
      setIsSavingCardColor(false);
    }
  };

  const openFolderModal = () => {
    if (!canManageRoom || !openedPtk) return;
    setNewFolderName('');
    setFolderError(null);
    setShowFolderModal(true);
  };

  const handleAddCustomFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!openedPtk || isSavingFolders) return;
    setFolderError(null);

    const cleanName = newFolderName.trim();
    if (!cleanName) {
      setFolderError('Nama folder wajib diisi.');
      return;
    }
    if (cleanName.length > 60) {
      setFolderError('Nama folder maksimal 60 karakter.');
      return;
    }

    const lower = cleanName.toLowerCase();
    const reserved = [
      'semua',
      'kepegawaian',
      'adm. kepegawaian',
      'administrasi kepegawaian',
      'catatan',
      'catatan penting',
      'pembelajaran',
      'adm. pembelajaran',
      'administrasi pembelajaran',
    ];
    if (
      reserved.includes(lower) ||
      customFoldersForOpenedPtk.some((f) => f.toLowerCase() === lower)
    ) {
      setFolderError('Nama folder sudah ada di loker ini.');
      return;
    }

    if (customFoldersForOpenedPtk.length >= 20) {
      setFolderError('Maksimal 20 folder tambahan per loker.');
      return;
    }

    setIsSavingFolders(true);
    try {
      const sanitizedId = openedPtk.id.replace(/[^a-zA-Z0-9_-]/g, '_');
      const nextCustomFolders = [...customFoldersForOpenedPtk, cleanName];
      await onSaveLokerPtkAccess({
        id: currentAccess?.id || sanitizedId,
        ptkId: openedPtk.id,
        ptkNama: openedPtk.nama,
        isProtected: Boolean(currentAccess?.isProtected),
        passwordHash: currentAccess?.passwordHash || '',
        passwordHint: currentAccess?.passwordHint || '',
        defaultVisibilitas: currentAccess?.defaultVisibilitas || 'terbuka',
        ...(currentAccess?.cardColor ? { cardColor: currentAccess.cardColor } : {}),
        customFolders: nextCustomFolders,
        updatedAt: new Date().toISOString(),
      });
      setNewFolderName('');
      if (showFormModal) {
        setFormKategori(cleanName);
      }
      showSuccessNotification(`Berhasil! Folder "${cleanName}" berhasil ditambahkan.`);
    } finally {
      setIsSavingFolders(false);
    }
  };

  const handleDeleteCustomFolder = async (folderName: string) => {
    if (!openedPtk || isSavingFolders) return;
    setFolderError(null);

    const itemCount = ptkLockerItems.filter((i) => i.kategori === folderName).length;
    if (itemCount > 0) {
      setFolderError(
        `Folder "${folderName}" masih berisi ${itemCount} berkas. Hapus atau pindahkan berkas terlebih dahulu.`
      );
      return;
    }

    setIsSavingFolders(true);
    try {
      const sanitizedId = openedPtk.id.replace(/[^a-zA-Z0-9_-]/g, '_');
      const nextCustomFolders = customFoldersForOpenedPtk.filter((f) => f !== folderName);
      await onSaveLokerPtkAccess({
        id: currentAccess?.id || sanitizedId,
        ptkId: openedPtk.id,
        ptkNama: openedPtk.nama,
        isProtected: Boolean(currentAccess?.isProtected),
        passwordHash: currentAccess?.passwordHash || '',
        passwordHint: currentAccess?.passwordHint || '',
        defaultVisibilitas: currentAccess?.defaultVisibilitas || 'terbuka',
        ...(currentAccess?.cardColor ? { cardColor: currentAccess.cardColor } : {}),
        customFolders: nextCustomFolders,
        updatedAt: new Date().toISOString(),
      });
      if (activeKategori === folderName) {
        setActiveKategori('semua');
      }
      if (formKategori === folderName) {
        setFormKategori('kepegawaian');
      }
      showSuccessNotification(`Berhasil! Folder "${folderName}" berhasil dihapus.`);
    } finally {
      setIsSavingFolders(false);
    }
  };

  const requestItemVisibilitasChange = async (item: LokerPtkItem) => {
    if (!openedPtk) return;
    const currentVis = getItemVisibilitas(item);
    const targetVis: VisibilitasLokerPtk = currentVis === 'privat' ? 'terbuka' : 'privat';

    // Jika loker belum punya password, pasang password terlebih dahulu
    if (!isProtected || !currentAccess?.passwordHash) {
      if (targetVis === 'privat') {
        openQuickLockModal(openedPtk, 'room', effectiveRoomVisibilitas);
        return;
      }
      await onUpdateLokerPtk({
        ...item,
        visibilitas: targetVis,
        updatedAt: new Date().toISOString(),
      });
      showSuccessNotification(
        `Berhasil! Status file "${item.judul}" berhasil diubah menjadi Terbuka.`
      );
      return;
    }

    // Minta password loker agar bisa mengubah status file tanpa masuk ke akun pemilik
    setItemVisChangePending({ item, targetVis });
    setItemVisPassword('');
    setShowItemVisPassword(false);
    setItemVisError(null);
  };

  const handleItemVisChangeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemVisChangePending || !openedPtk || !currentAccess?.passwordHash) return;
    setItemVisError(null);

    if (!itemVisPassword) {
      setItemVisError('Masukkan password loker terlebih dahulu.');
      return;
    }

    setIsSavingItemVis(true);
    try {
      const hashed = await hashLokerPassword(openedPtk.id, itemVisPassword);
      if (hashed !== currentAccess.passwordHash) {
        setItemVisError('Password loker salah.');
        return;
      }

      const { item, targetVis } = itemVisChangePending;
      await onUpdateLokerPtk({
        ...item,
        visibilitas: targetVis,
        updatedAt: new Date().toISOString(),
      });

      // Tidak memasukkan ke unlockedPtkIds agar tetap tanpa masuk ke akun pemilik
      setItemVisChangePending(null);
      setItemVisPassword('');
      showSuccessNotification(
        `Berhasil! Status file "${item.judul}" berhasil diubah menjadi ${
          targetVis === 'privat' ? 'Privat' : 'Terbuka'
        }.`
      );
    } finally {
      setIsSavingItemVis(false);
    }
  };

  const openAccessModal = () => {
    setAccessActionMode('set_or_change');
    setAccOldPassword('');
    setAccNewPassword('');
    setAccConfirmPassword('');
    setAccHint(currentAccess?.passwordHint || '');
    setAccDefaultVisibilitas(currentAccess?.defaultVisibilitas || 'privat');
    setShowAccPasswords(false);
    setAccessError(null);
    setShowAccessModal(true);
  };

  const handleSaveAccessSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!openedPtk) return;
    setAccessError(null);

    const sanitizedId = openedPtk.id.replace(/[^a-zA-Z0-9_-]/g, '_');

    if (accessActionMode === 'remove') {
      if (!isProtected || !currentAccess) return;
      if (!accOldPassword) {
        setAccessError('Masukkan password saat ini.');
        return;
      }
      setIsSavingAccess(true);
      try {
        const oldHash = await hashLokerPassword(openedPtk.id, accOldPassword);
        if (oldHash !== currentAccess.passwordHash) {
          setAccessError('Password saat ini salah.');
          return;
        }
        await onSaveLokerPtkAccess({
          id: sanitizedId,
          ptkId: openedPtk.id,
          ptkNama: openedPtk.nama,
          isProtected: false,
          passwordHash: '',
          passwordHint: '',
          defaultVisibilitas: accDefaultVisibilitas,
          ...(currentAccess?.cardColor ? { cardColor: currentAccess.cardColor } : {}),
          ...(currentAccess?.customFolders
            ? { customFolders: currentAccess.customFolders }
            : {}),
          updatedAt: new Date().toISOString(),
        });
        setShowAccessModal(false);
      } finally {
        setIsSavingAccess(false);
      }
      return;
    }

    const wantsPasswordUpdate =
      !isProtected
        ? accNewPassword.trim() !== '' || accConfirmPassword.trim() !== ''
        : accNewPassword.trim() !== '' || accConfirmPassword.trim() !== '';

    if (isProtected && wantsPasswordUpdate && !accOldPassword) {
      setAccessError('Masukkan password saat ini.');
      return;
    }

    if (wantsPasswordUpdate) {
      if (accNewPassword.length < 4) {
        setAccessError('Password baru minimal 4 karakter.');
        return;
      }
      if (accNewPassword !== accConfirmPassword) {
        setAccessError('Konfirmasi password baru tidak sesuai.');
        return;
      }
    }

    setIsSavingAccess(true);
    try {
      let nextHash = currentAccess?.passwordHash || '';
      if (isProtected && currentAccess && wantsPasswordUpdate) {
        const oldHash = await hashLokerPassword(openedPtk.id, accOldPassword);
        if (oldHash !== currentAccess.passwordHash) {
          setAccessError('Password saat ini salah.');
          return;
        }
      }

      if (wantsPasswordUpdate && accNewPassword) {
        nextHash = await hashLokerPassword(openedPtk.id, accNewPassword);
      }

      await onSaveLokerPtkAccess({
        id: sanitizedId,
        ptkId: openedPtk.id,
        ptkNama: openedPtk.nama,
        isProtected: Boolean(nextHash),
        passwordHash: nextHash,
        passwordHint: nextHash ? accHint.trim() : '',
        defaultVisibilitas: accDefaultVisibilitas,
        ...(currentAccess?.cardColor ? { cardColor: currentAccess.cardColor } : {}),
        ...(currentAccess?.customFolders
          ? { customFolders: currentAccess.customFolders }
          : {}),
        updatedAt: new Date().toISOString(),
      });

      if (nextHash) {
        setUnlockedPtkIds((prev) =>
          prev.includes(openedPtk.id) ? prev : [...prev, openedPtk.id]
        );
      }
      setShowAccessModal(false);
    } finally {
      setIsSavingAccess(false);
    }
  };

  const handleToggleItemVisibilitas = async (item: LokerPtkItem) => {
    await requestItemVisibilitasChange(item);
  };

  const openAddModal = (defaultKategori?: KategoriLokerPtk) => {
    if (!canManageRoom || !openedPtkId) return;
    setEditingItem(null);
    setFormKategori(
      defaultKategori || (activeKategori === 'semua' ? 'kepegawaian' : activeKategori)
    );
    setFormVisibilitas(
      isProtected ? currentAccess?.defaultVisibilitas || 'privat' : 'terbuka'
    );
    setFormJudul('');
    setFormTanggal(getTodayIsoString());
    setFormIsiCatatan('');
    setFormFileNama('');
    setFormFileTipe('');
    setFormFileUkuran('');
    setFormFileUrl('');
    setFormLinkEksternal('');
    setFormError(null);
    setShowFormModal(true);
  };

  const openEditModal = (item: LokerPtkItem) => {
    if (!canManageRoom) return;
    setEditingItem(item);
    setFormKategori(item.kategori);
    setFormVisibilitas(getItemVisibilitas(item));
    setFormJudul(item.judul);
    setFormTanggal(item.tanggal || getTodayIsoString());
    setFormIsiCatatan(item.isiCatatan || '');
    setFormFileNama(item.fileNama || '');
    setFormFileTipe(item.fileTipe || '');
    setFormFileUkuran(item.fileUkuran || '');
    setFormFileUrl(item.fileUrl || '');
    setFormLinkEksternal(item.linkEksternal || '');
    setFormError(null);
    setShowFormModal(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_BYTES) {
      setFormError(
        `Ukuran berkas (${formatFileSize(
          file.size
        )}) melebihi batas 650 KB. Gunakan tautan eksternal.`
      );
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      if (!result) {
        setFormError('Gagal membaca berkas.');
        return;
      }
      setFormFileNama(file.name);
      setFormFileTipe(file.type || 'application/octet-stream');
      setFormFileUkuran(formatFileSize(file.size));
      setFormFileUrl(result);
      if (!formJudul.trim()) {
        setFormJudul(file.name.replace(/\.[^/.]+$/, ''));
      }
    };
    reader.onerror = () => {
      setFormError('Gagal membaca berkas dari perangkat.');
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemoveUploadedFile = () => {
    setFormFileNama('');
    setFormFileTipe('');
    setFormFileUkuran('');
    setFormFileUrl('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!openedPtk) return;
    if (!formJudul.trim()) {
      setFormError('Judul wajib diisi.');
      return;
    }
    if (!formTanggal.trim()) {
      setFormError('Tanggal wajib diisi.');
      return;
    }
    if (formLinkEksternal.trim() && !isSafeHttpUrl(formLinkEksternal)) {
      setFormError('Tautan harus diawali https:// atau http://');
      return;
    }
    if (!formIsiCatatan.trim() && !formFileUrl && !formLinkEksternal.trim()) {
      setFormError('Isi catatan, berkas, atau tautan tidak boleh kosong semua.');
      return;
    }

    setIsSaving(true);
    try {
      if (editingItem) {
        const statusChanged = getItemVisibilitas(editingItem) !== formVisibilitas;
        await onUpdateLokerPtk({
          ...editingItem,
          ptkId: openedPtk.id,
          ptkNama: openedPtk.nama,
          kategori: formKategori,
          visibilitas: formVisibilitas,
          judul: formJudul.trim(),
          tanggal: formTanggal,
          isiCatatan: formIsiCatatan.trim() || undefined,
          fileNama: formFileNama || undefined,
          fileTipe: formFileTipe || undefined,
          fileUkuran: formFileUkuran || undefined,
          fileUrl: formFileUrl || undefined,
          linkEksternal: formLinkEksternal.trim() || undefined,
          updatedAt: new Date().toISOString(),
        });
        showSuccessNotification(
          statusChanged
            ? `Berhasil! Status file "${formJudul.trim()}" berhasil diubah menjadi ${
                formVisibilitas === 'privat' ? 'Privat' : 'Terbuka'
              }.`
            : `Berhasil! Perubahan file "${formJudul.trim()}" berhasil disimpan.`
        );
      } else {
        await onAddLokerPtk({
          ptkId: openedPtk.id,
          ptkNama: openedPtk.nama,
          kategori: formKategori,
          visibilitas: formVisibilitas,
          judul: formJudul.trim(),
          tanggal: formTanggal,
          isiCatatan: formIsiCatatan.trim() || undefined,
          fileNama: formFileNama || undefined,
          fileTipe: formFileTipe || undefined,
          fileUkuran: formFileUkuran || undefined,
          fileUrl: formFileUrl || undefined,
          linkEksternal: formLinkEksternal.trim() || undefined,
        });
        showSuccessNotification(`Berhasil! File "${formJudul.trim()}" berhasil ditambahkan.`);
      }
      setShowFormModal(false);
    } finally {
      setIsSaving(false);
    }
  };

  const renderKategoriIcon = (kat: KategoriLokerPtk, className = 'w-4 h-4') => {
    if (kat === 'kepegawaian') return <Briefcase className={className} />;
    if (kat === 'catatan') return <StickyNote className={className} />;
    if (kat === 'pembelajaran') return <BookOpen className={className} />;
    return <Folder className={className} />;
  };

  if (guruList.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 p-10 text-center space-y-2 shadow-xs">
        <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center mx-auto">
          <FolderLock className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-bold text-slate-900">Belum Ada Data PTK</h3>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {resetSuccessToast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-5 right-5 z-[60] max-w-sm bg-emerald-600 text-white border border-emerald-500 rounded-2xl p-3.5 shadow-xl flex items-start justify-between gap-3 text-xs font-semibold"
        >
          <div className="flex items-start gap-2.5">
            <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center shrink-0 mt-0.5">
              <Check className="w-4 h-4 text-white" />
            </div>
            <div className="space-y-0.5 leading-snug">
              <div className="font-bold text-white">Berhasil</div>
              <div className="text-emerald-50 font-medium">{resetSuccessToast}</div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setResetSuccessToast(null)}
            className="p-1 text-emerald-100 hover:text-white hover:bg-white/15 rounded-lg cursor-pointer shrink-0"
            aria-label="Tutup notifikasi"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {!openedPtk ? (
        /* ==================== TAMPILAN LOBI: DAFTAR LOKER & TOMBOL BUAT LOKER ==================== */
        <>
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-950 text-white flex items-center justify-center shrink-0">
                <FolderLock className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900">
                  Loker Room PTK
                </h2>
                <p className="text-xs text-slate-500">
                  {activeLockerPtks.length} loker tersedia
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              {activeLockerPtks.length > 0 && (
                <div className="relative sm:w-60">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={lobbySearch}
                    onChange={(e) => setLobbySearch(e.target.value)}
                    placeholder="Cari nama PTK..."
                    className="w-full text-xs sm:text-sm pl-9 pr-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                  />
                </div>
              )}

              <button
                type="button"
                onClick={openCreateLockerModal}
                disabled={availablePtksForNewLocker.length === 0}
                className="px-4 py-2.5 bg-indigo-700 hover:bg-indigo-600 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Buat Loker</span>
              </button>
            </div>
          </div>

          {filteredLobbyLockers.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredLobbyLockers.map((ptk) => {
                const acc = accessByPtkId[ptk.id];
                const hasLock = Boolean(acc?.isProtected && acc?.passwordHash);
                const items = lokerPtkList.filter((i) => i.ptkId === ptk.id);
                const countPrivat = items.filter((i) => getItemVisibilitas(i) === 'privat').length;
                const countTerbuka = items.filter(
                  (i) => getItemVisibilitas(i) === 'terbuka'
                ).length;

                // Status Loker di lobi: hanya melihat pengaturan loker (bukan isi berkas)
                const cardRoomStatus: VisibilitasLokerPtk = acc
                  ? acc.defaultVisibilitas === 'terbuka'
                    ? 'terbuka'
                    : 'privat'
                  : 'terbuka';
                const isCardPrivat = cardRoomStatus === 'privat';
                const theme = getLockerColorTheme(acc?.cardColor);

                return (
                  <div
                    key={ptk.id}
                    className={`rounded-2xl border shadow-xs hover:shadow-md transition-all overflow-hidden flex flex-col justify-between ${theme.cardBg}`}
                  >
                    {/* Strip warna folder bagian atas */}
                    <div className={`h-2 w-full ${theme.accentBar}`} />

                    <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between gap-4">
                      <div className="space-y-3.5">
                        <div className="flex items-start justify-between gap-2">
                          <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-2xs ${
                              isCardPrivat
                                ? 'bg-rose-100/90 text-rose-700 border border-rose-200'
                                : 'bg-white/90 text-indigo-700 border border-indigo-200'
                            }`}
                          >
                            {isCardPrivat ? (
                              <Lock className="w-5 h-5" />
                            ) : (
                              <FolderLock className="w-5 h-5" />
                            )}
                          </div>

                          <div className="flex items-center gap-1.5">
                            {/* Pengaturan Kunci Terbuka / Privat pada tampilan awal loker PTK (selalu butuh password saat memindah) */}
                            <div className="inline-flex items-center gap-0.5 bg-white/90 border border-slate-200/90 p-0.5 rounded-lg shadow-2xs">
                              <button
                                type="button"
                                disabled={isTogglingRoomAccess || isSavingRuleChange}
                                onClick={() =>
                                  requestPtkLockerVisibilitasChange(ptk, 'terbuka', 'lobby')
                                }
                                title="Ubah aturan loker ke Kunci Terbuka (Wajib Password)"
                                className={`px-2 py-1 rounded-md text-[11px] font-bold inline-flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-60 ${
                                  !isCardPrivat
                                    ? 'bg-emerald-600 text-white shadow-xs'
                                    : 'text-slate-600 hover:bg-slate-100'
                                }`}
                              >
                                <Unlock className="w-3 h-3" />
                                <span>Kunci Terbuka</span>
                              </button>
                              <button
                                type="button"
                                disabled={isTogglingRoomAccess || isSavingRuleChange}
                                onClick={() =>
                                  requestPtkLockerVisibilitasChange(ptk, 'privat', 'lobby')
                                }
                                title="Ubah aturan loker ke Privat (Wajib Password)"
                                className={`px-2 py-1 rounded-md text-[11px] font-bold inline-flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-60 ${
                                  isCardPrivat
                                    ? 'bg-rose-600 text-white shadow-xs'
                                    : 'text-slate-600 hover:bg-slate-100'
                                }`}
                              >
                                <Lock className="w-3 h-3" />
                                <span>Privat</span>
                              </button>
                            </div>

                            {/* Tombol Pengaturan Loker (ikon gear saja tanpa teks) */}
                            <button
                              type="button"
                              onClick={() => setSettingsTargetPtk(ptk)}
                              title="Pengaturan Loker"
                              aria-label="Pengaturan Loker"
                              className="p-1.5 rounded-lg bg-white/90 hover:bg-white text-slate-600 hover:text-slate-900 border border-slate-200/90 shadow-2xs transition-colors cursor-pointer shrink-0"
                            >
                              <Settings className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        <div>
                          <h3 className="text-sm sm:text-base font-bold text-slate-900 truncate">
                            {ptk.nama}
                          </h3>
                          <p className="text-xs text-slate-600 truncate mt-0.5">{ptk.jabatan}</p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold">
                          <span
                            className={`px-2.5 py-1 rounded-lg ${theme.badgeSurface} text-slate-700 border border-slate-200/90`}
                          >
                            Privat: {countPrivat}
                          </span>
                          <span
                            className={`px-2.5 py-1 rounded-lg ${theme.badgeSurface} text-emerald-800 border border-emerald-200/90`}
                          >
                            Terbuka: {countTerbuka}
                          </span>
                        </div>
                      </div>

                      <div>
                        <button
                          type="button"
                          onClick={() => setOpenedPtkId(ptk.id)}
                          className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer ${theme.buttonClass}`}
                        >
                          {isCardPrivat && hasLock ? (
                            <>
                              <KeyRound className="w-3.5 h-3.5" />
                              <span>Masuk Loker</span>
                            </>
                          ) : (
                            <>
                              <FolderLock className="w-3.5 h-3.5" />
                              <span>Buka Loker</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center space-y-4 shadow-xs">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center mx-auto">
                <FolderLock className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900">
                  {lobbySearch ? 'Loker Tidak Ditemukan' : 'Belum Ada Loker PTK'}
                </h3>
              </div>
              {!lobbySearch && availablePtksForNewLocker.length > 0 && (
                <button
                  type="button"
                  onClick={openCreateLockerModal}
                  className="px-5 py-2.5 bg-indigo-700 hover:bg-indigo-600 text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs inline-flex items-center gap-2 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Buat Loker</span>
                </button>
              )}
            </div>
          )}
        </>
      ) : (
        /* ==================== TAMPILAN DALAM LOKER PTK ==================== */
        <>

          {/* Header Bar Loker PTK */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col xl:flex-row xl:items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={handleBackToLobby}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer shrink-0"
                title="Kembali ke Daftar Loker"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 truncate">
                    {openedPtk.nama}
                  </h2>
                  {isProtected && (
                    isOwnerUnlocked ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200">
                        <Unlock className="w-3 h-3" />
                        <span>Pemilik Terverifikasi</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                        <Lock className="w-3 h-3" />
                        <span>Mode Pengunjung</span>
                      </span>
                    )
                  )}
                </div>
                <p className="text-xs text-slate-500 truncate">{openedPtk.jabatan}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Kontrol Kunci Terbuka <-> Privat (wajib masukkan password saat memindahkan) */}
              <div className="inline-flex items-center gap-1 bg-slate-100 border border-slate-200 p-1 rounded-xl">
                <button
                  type="button"
                  disabled={isTogglingRoomAccess || isSavingRuleChange}
                  onClick={() => handleChangeRoomVisibilitas('terbuka')}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-60 ${
                    effectiveRoomVisibilitas === 'terbuka'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-700 hover:bg-white'
                  }`}
                >
                  <Unlock className="w-3.5 h-3.5" />
                  <span>Kunci Terbuka</span>
                </button>
                <button
                  type="button"
                  disabled={isTogglingRoomAccess || isSavingRuleChange}
                  onClick={() => handleChangeRoomVisibilitas('privat')}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-60 ${
                    effectiveRoomVisibilitas === 'privat'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'text-slate-700 hover:bg-white'
                  }`}
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Privat</span>
                </button>
              </div>

              {isProtected && !isOwnerUnlocked && canEnterRoom && (
                <button
                  type="button"
                  onClick={openPrivateUnlockModal}
                  className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <KeyRound className="w-4 h-4 text-amber-300" />
                  <span>Masuk Pemilik</span>
                </button>
              )}

              {canManageRoom && (
                <>
                  <button
                    type="button"
                    onClick={openAccessModal}
                    className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <KeyRound className="w-4 h-4 text-indigo-700" />
                    <span>Kelola Password</span>
                  </button>

                  {isProtected && (
                    <button
                      type="button"
                      onClick={handleLockRoom}
                      className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Lock className="w-4 h-4" />
                      <span>Kunci</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => openAddModal()}
                    className="px-4 py-2 bg-indigo-700 hover:bg-indigo-600 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Tambah Berkas</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {!isProtected && (effectiveRoomVisibilitas === 'privat' || privateItems.length > 0) && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex flex-wrap items-center justify-between gap-2 text-xs text-amber-900">
              <span className="font-medium">
                Pasang password untuk membuka &amp; melindungi berkas Privat dari pengunjung.
              </span>
              <button
                type="button"
                onClick={() => openQuickLockModal(openedPtk, 'room', effectiveRoomVisibilitas)}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-xs cursor-pointer"
              >
                Pasang Password
              </button>
            </div>
          )}

          {/* Gerbang Password jika Status Loker Privat & Pemilik Belum Verifikasi */}
          {!canEnterRoom && (
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 sm:p-8">
              <div className="max-w-sm mx-auto text-center space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center justify-center mx-auto">
                  <Lock className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-slate-900">Masukkan Password Loker</h3>

                <form onSubmit={handleUnlockRoom} className="space-y-3 text-left">
                  {unlockError && (
                    <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-800 text-xs font-medium">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>{unlockError}</span>
                    </div>
                  )}

                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <KeyRound className="w-4 h-4" />
                    </div>
                    <input
                      type={showUnlockPassword ? 'text' : 'password'}
                      value={unlockPasswordInput}
                      onChange={(e) => setUnlockPasswordInput(e.target.value)}
                      placeholder="Password loker..."
                      className="w-full pl-10 pr-11 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                    />
                    <button
                      type="button"
                      onClick={() => setShowUnlockPassword((p) => !p)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showUnlockPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>

                  {currentAccess?.passwordHint && (
                    <div className="space-y-1">
                      <button
                        type="button"
                        onClick={() => setShowPasswordHint((p) => !p)}
                        className="text-[11px] font-semibold text-indigo-700 hover:underline inline-flex items-center gap-1 cursor-pointer"
                      >
                        <HelpCircle className="w-3.5 h-3.5" />
                        <span>Petunjuk Password</span>
                      </button>
                      {showPasswordHint && (
                        <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 font-medium">
                          {currentAccess.passwordHint}
                        </div>
                      )}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isVerifyingUnlock}
                    className="w-full py-2.5 bg-indigo-700 hover:bg-indigo-600 disabled:opacity-60 text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <Unlock className="w-4 h-4" />
                    <span>{isVerifyingUnlock ? 'Memeriksa...' : 'Buka Loker'}</span>
                  </button>
                </form>

                {isAdmin && isProtected && (
                  <div className="pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => openAdminResetModal(openedPtk)}
                      className="w-full py-2 px-3 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reset Password Loker (Admin)</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Filter & Daftar Berkas (hanya tampil jika status loker Kunci Terbuka atau pemilik sudah verifikasi password) */}
          {canEnterRoom && (ptkLockerItems.length > 0 || canManageRoom) && (
            <>
              <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  <div className="flex flex-wrap items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => setActiveKategori('semua')}
                      className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                        activeKategori === 'semua'
                          ? 'bg-white text-slate-900 shadow-xs font-bold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Semua ({countsByKategori.semua || 0})
                    </button>
                    {allFoldersForOpenedPtk.map((folder) => {
                      const isActive = activeKategori === folder.id;
                      const activeStyle =
                        folder.id === 'kepegawaian'
                          ? 'bg-blue-900 text-white shadow-xs font-bold'
                          : folder.id === 'catatan'
                          ? 'bg-amber-600 text-white shadow-xs font-bold'
                          : folder.id === 'pembelajaran'
                          ? 'bg-emerald-700 text-white shadow-xs font-bold'
                          : 'bg-violet-700 text-white shadow-xs font-bold';
                      return (
                        <button
                          key={folder.id}
                          type="button"
                          onClick={() => setActiveKategori(folder.id)}
                          className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                            isActive ? activeStyle : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          {renderKategoriIcon(folder.id, 'w-3.5 h-3.5')}
                          <span>
                            {folder.shortLabel} ({countsByKategori[folder.id] || 0})
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {canManageRoom && (
                    <button
                      type="button"
                      onClick={openFolderModal}
                      className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                      title="Tambah atau kelola folder di dalam loker"
                    >
                      <FolderPlus className="w-3.5 h-3.5" />
                      <span>Tambah Folder</span>
                    </button>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <select
                    value={filterVisibilitas}
                    onChange={(e) =>
                      setFilterVisibilitas(e.target.value as 'semua' | VisibilitasLokerPtk)
                    }
                    aria-label="Filter Status Akses Berkas"
                    className="text-xs font-bold text-slate-800 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-600 cursor-pointer"
                  >
                    <option value="semua">Semua ({ptkLockerItems.length})</option>
                    <option value="privat">Privat ({privateItems.length})</option>
                    <option value="terbuka">Terbuka ({publicItems.length})</option>
                  </select>

                  <div className="relative flex-1 sm:w-56">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={itemSearch}
                      onChange={(e) => setItemSearch(e.target.value)}
                      placeholder="Cari berkas..."
                      className="w-full text-xs sm:text-sm pl-9 pr-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {filteredItems.length > 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs divide-y divide-slate-200/80 overflow-hidden">
                  {filteredItems.map((item, idx) => {
                    const cfg = getKategoriMeta(item.kategori);
                    const vis = getItemVisibilitas(item);
                    const isPrivat = vis === 'privat';
                    const isVisitorBlockedPrivat = isPrivat && !canAccessPrivat;
                    const canManageThisItem = canManageRoom && !isVisitorBlockedPrivat;
                    const hasSafeLink =
                      !isVisitorBlockedPrivat &&
                      Boolean(item.linkEksternal && isSafeHttpUrl(item.linkEksternal));

                    return (
                      <div
                        key={item.id}
                        className={`p-3.5 sm:px-5 sm:py-4 transition-colors flex flex-col lg:flex-row lg:items-center justify-between gap-3 ${
                          isVisitorBlockedPrivat
                            ? 'bg-slate-50/60 hover:bg-slate-50'
                            : 'hover:bg-slate-50/80'
                        }`}
                      >
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          <span className="text-xs font-bold text-slate-400 w-5 text-center pt-2 shrink-0 hidden sm:inline-block">
                            {idx + 1}
                          </span>
                          <div
                            className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 mt-0.5 ${cfg.badgeClass}`}
                          >
                            {renderKategoriIcon(item.kategori, 'w-4 h-4')}
                          </div>

                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-sm font-bold text-slate-900 leading-snug">
                                {item.judul}
                              </h3>

                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[11px] font-bold ${cfg.badgeClass}`}
                              >
                                <span>{cfg.shortLabel}</span>
                              </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                              <span className="inline-flex items-center gap-1 text-[11px]">
                                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                <span>{formatTanggalIndonesia(item.tanggal) || item.tanggal}</span>
                              </span>

                              {!isVisitorBlockedPrivat && item.fileNama && (
                                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-indigo-800 bg-indigo-50 border border-indigo-200/80 px-2 py-0.5 rounded-md max-w-full">
                                  <Paperclip className="w-3 h-3 shrink-0" />
                                  <span className="truncate max-w-[220px] sm:max-w-[320px]">
                                    {item.fileNama}
                                  </span>
                                  {item.fileUkuran && (
                                    <span className="text-[10px] text-indigo-600/90 font-normal shrink-0">
                                      ({item.fileUkuran})
                                    </span>
                                  )}
                                </span>
                              )}
                            </div>

                            {isVisitorBlockedPrivat ? (
                              <p className="text-xs text-rose-700 font-medium flex items-center gap-1.5 pt-0.5">
                                <Lock className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                                <span>
                                  Berkas Privat — Masukkan password untuk melihat atau mengunduh.
                                </span>
                              </p>
                            ) : (
                              item.isiCatatan && (
                                <p className="text-xs text-slate-600 line-clamp-1 pt-0.5">
                                  {item.isiCatatan}
                                </p>
                              )
                            )}
                          </div>
                        </div>

                        {isVisitorBlockedPrivat ? (
                          <div className="flex flex-wrap items-center gap-2 shrink-0 pl-0 sm:pl-8 lg:pl-0">
                            <button
                              type="button"
                              onClick={() => requestItemVisibilitasChange(item)}
                              title="Klik untuk ubah status Privat / Terbuka (Wajib Password)"
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-800 border-rose-200 transition-colors cursor-pointer"
                            >
                              <Lock className="w-3.5 h-3.5" />
                              <span>Privat</span>
                            </button>
                            {isProtected ? (
                              <button
                                type="button"
                                onClick={openPrivateUnlockModal}
                                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                              >
                                <KeyRound className="w-3.5 h-3.5 text-amber-300" />
                                <span>Masukkan Password</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() =>
                                  openQuickLockModal(openedPtk, 'room', effectiveRoomVisibilitas)
                                }
                                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                              >
                                <KeyRound className="w-3.5 h-3.5" />
                                <span>Pasang Password</span>
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="flex flex-wrap items-center gap-1.5 shrink-0 pl-0 sm:pl-8 lg:pl-0">
                            <button
                              type="button"
                              onClick={() => handleToggleItemVisibilitas(item)}
                              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-bold transition-colors cursor-pointer ${
                                isPrivat
                                  ? 'bg-rose-50 hover:bg-rose-100 text-rose-800 border-rose-200'
                                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200'
                              }`}
                              title="Klik untuk ubah status Privat / Terbuka (Wajib Password)"
                            >
                              {isPrivat ? (
                                <Lock className="w-3.5 h-3.5" />
                              ) : (
                                <Globe className="w-3.5 h-3.5" />
                              )}
                              <span>{isPrivat ? 'Privat' : 'Terbuka'}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleOpenPreview(item)}
                              className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5 text-indigo-600" />
                              <span>Buka</span>
                            </button>

                            {item.fileUrl && item.fileNama && (
                              <a
                                href={item.fileUrl}
                                download={item.fileNama}
                                className="px-3 py-1.5 bg-indigo-700 hover:bg-indigo-600 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1.5 transition-colors"
                              >
                                <Download className="w-3.5 h-3.5" />
                                <span>Unduh</span>
                              </a>
                            )}

                            {hasSafeLink && (
                              <a
                                href={item.linkEksternal}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1.5 transition-colors"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                                <span>Link</span>
                              </a>
                            )}

                            {canManageThisItem && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => openEditModal(item)}
                                  className="p-1.5 text-slate-600 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer"
                                  title="Edit"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeleteTarget(item)}
                                  className="p-1.5 text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg transition-colors cursor-pointer"
                                  title="Hapus"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-slate-200/80 p-10 text-center space-y-3 shadow-xs">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
                    <FolderLock className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {itemSearch || filterVisibilitas !== 'semua'
                      ? 'Berkas Tidak Ditemukan'
                      : 'Loker Masih Kosong'}
                  </h3>
                  {canManageRoom && !itemSearch && filterVisibilitas === 'semua' && (
                    <button
                      type="button"
                      onClick={() => openAddModal()}
                      className="px-4 py-2 bg-indigo-700 hover:bg-indigo-600 text-white text-xs font-bold rounded-xl shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Tambah Berkas</span>
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* ==================== MODAL BUAT LOKER & PASSWORD BARU ==================== */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col my-auto max-h-[94vh]">
            <div className="bg-indigo-950 px-6 py-4 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <FolderLock className="w-5 h-5 text-indigo-300" />
                <h2 className="text-base font-bold">Buat Loker PTK</h2>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={handleCreateLockerSubmit}
              className="p-5 sm:p-6 space-y-4 text-xs sm:text-sm overflow-y-auto"
            >
              {createError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-800 text-xs font-medium">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{createError}</span>
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nama PTK *</label>
                <select
                  value={createPtkId}
                  onChange={(e) => setCreatePtkId(e.target.value)}
                  required
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 bg-white text-slate-900 font-semibold focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                >
                  {availablePtksForNewLocker.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.nama} — {g.jabatan}
                    </option>
                  ))}
                </select>
              </div>

              {/* Kelola Password */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-1.5">
                    <KeyRound className="w-4 h-4 text-indigo-700" />
                    <span>Kunci dengan Password</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setCreateUsePassword((p) => !p)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                      createUsePassword
                        ? 'bg-indigo-700 text-white border-indigo-700'
                        : 'bg-white text-slate-600 border-slate-300'
                    }`}
                  >
                    {createUsePassword ? 'Aktif' : 'Nonaktif'}
                  </button>
                </div>

                {createUsePassword && (
                  <div className="space-y-3 pt-1">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1 text-xs">
                          Password *
                        </label>
                        <div className="relative">
                          <input
                            type={showCreatePasswords ? 'text' : 'password'}
                            value={createPassword}
                            onChange={(e) => setCreatePassword(e.target.value)}
                            placeholder="Min. 4 karakter"
                            required={createUsePassword}
                            className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 pr-9 text-sm focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => setShowCreatePasswords((p) => !p)}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                          >
                            {showCreatePasswords ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 mb-1 text-xs">
                          Konfirmasi Password *
                        </label>
                        <input
                          type={showCreatePasswords ? 'text' : 'password'}
                          value={createConfirmPassword}
                          onChange={(e) => setCreateConfirmPassword(e.target.value)}
                          placeholder="Ulangi password"
                          required={createUsePassword}
                          className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-sm focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1 text-xs">
                        Petunjuk Password (Opsional)
                      </label>
                      <input
                        type="text"
                        value={createHint}
                        onChange={(e) => setCreateHint(e.target.value)}
                        placeholder="Petunjuk singkat jika lupa..."
                        className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs sm:text-sm focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Status Loker */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5 text-xs">
                  Status Loker
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCreateDefaultVisibilitas('privat')}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                      createDefaultVisibilitas === 'privat'
                        ? 'bg-rose-50 border-rose-400 text-rose-900'
                        : 'bg-slate-50 border-slate-200 text-slate-700'
                    }`}
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>Privat</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCreateDefaultVisibilitas('terbuka')}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                      createDefaultVisibilitas === 'terbuka'
                        ? 'bg-emerald-50 border-emerald-400 text-emerald-900'
                        : 'bg-slate-50 border-slate-200 text-slate-700'
                    }`}
                  >
                    <Unlock className="w-3.5 h-3.5" />
                    <span>Kunci Terbuka</span>
                  </button>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isCreatingLocker}
                  className="px-5 py-2 font-bold bg-indigo-700 hover:bg-indigo-600 disabled:opacity-60 text-white rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>{isCreatingLocker ? 'Membuat...' : 'Buat Loker'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== MODAL KELOLA PASSWORD LOKER YANG SUDAH DIBUKA ==================== */}
      {showAccessModal && openedPtk && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col my-auto max-h-[94vh]">
            <div className="bg-indigo-950 px-6 py-4 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <KeyRound className="w-5 h-5 text-indigo-300" />
                <div>
                  <h2 className="text-base font-bold">Kelola Password &amp; Akses</h2>
                  <p className="text-[11px] text-indigo-200">{openedPtk.nama}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAccessModal(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={handleSaveAccessSettings}
              className="p-5 sm:p-6 space-y-4 text-xs sm:text-sm overflow-y-auto"
            >
              {accessError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-800 text-xs font-medium">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{accessError}</span>
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1.5 text-xs">
                  Status Loker
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAccDefaultVisibilitas('privat')}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                      accDefaultVisibilitas === 'privat'
                        ? 'bg-rose-50 border-rose-400 text-rose-900'
                        : 'bg-slate-50 border-slate-200 text-slate-700'
                    }`}
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>Privat</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAccDefaultVisibilitas('terbuka')}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                      accDefaultVisibilitas === 'terbuka'
                        ? 'bg-emerald-50 border-emerald-400 text-emerald-900'
                        : 'bg-slate-50 border-slate-200 text-slate-700'
                    }`}
                  >
                    <Unlock className="w-3.5 h-3.5" />
                    <span>Kunci Terbuka</span>
                  </button>
                </div>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-slate-900 text-xs sm:text-sm">
                    {isProtected ? 'Pengaturan Password' : 'Pasang Password'}
                  </span>
                  {isProtected && (
                    <div className="flex items-center gap-1 bg-white border border-slate-200 p-0.5 rounded-lg text-[11px] font-bold">
                      <button
                        type="button"
                        onClick={() => {
                          setAccessActionMode('set_or_change');
                          setAccessError(null);
                        }}
                        className={`px-2.5 py-1 rounded-md cursor-pointer ${
                          accessActionMode === 'set_or_change'
                            ? 'bg-indigo-700 text-white'
                            : 'text-slate-600'
                        }`}
                      >
                        Ubah
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAccessActionMode('remove');
                          setAccessError(null);
                        }}
                        className={`px-2.5 py-1 rounded-md cursor-pointer ${
                          accessActionMode === 'remove'
                            ? 'bg-rose-600 text-white'
                            : 'text-rose-700'
                        }`}
                      >
                        Hapus
                      </button>
                    </div>
                  )}
                </div>

                {isProtected && (
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1 text-xs">
                      Password Saat Ini {accessActionMode === 'remove' ? '*' : ''}
                    </label>
                    <div className="relative">
                      <input
                        type={showAccPasswords ? 'text' : 'password'}
                        value={accOldPassword}
                        onChange={(e) => setAccOldPassword(e.target.value)}
                        placeholder="Password saat ini..."
                        className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 pr-10 text-sm focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowAccPasswords((p) => !p)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showAccPasswords ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {accessActionMode === 'set_or_change' && (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1 text-xs">
                          Password Baru
                        </label>
                        <div className="relative">
                          <input
                            type={showAccPasswords ? 'text' : 'password'}
                            value={accNewPassword}
                            onChange={(e) => setAccNewPassword(e.target.value)}
                            placeholder="Min. 4 karakter"
                            className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 pr-9 text-sm focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                          />
                          {!isProtected && (
                            <button
                              type="button"
                              onClick={() => setShowAccPasswords((p) => !p)}
                              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                            >
                              {showAccPasswords ? (
                                <EyeOff className="w-4 h-4" />
                              ) : (
                                <Eye className="w-4 h-4" />
                              )}
                            </button>
                          )}
                        </div>
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 mb-1 text-xs">
                          Konfirmasi Password
                        </label>
                        <input
                          type={showAccPasswords ? 'text' : 'password'}
                          value={accConfirmPassword}
                          onChange={(e) => setAccConfirmPassword(e.target.value)}
                          placeholder="Ulangi password"
                          className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-sm focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1 text-xs">
                        Petunjuk Password (Opsional)
                      </label>
                      <input
                        type="text"
                        value={accHint}
                        onChange={(e) => setAccHint(e.target.value)}
                        placeholder="Petunjuk singkat jika lupa..."
                        className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs sm:text-sm focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                      />
                    </div>
                  </>
                )}
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAccessModal(false)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSavingAccess}
                  className={`px-5 py-2 font-bold text-white rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-60 ${
                    accessActionMode === 'remove'
                      ? 'bg-rose-600 hover:bg-rose-700'
                      : 'bg-indigo-700 hover:bg-indigo-600'
                  }`}
                >
                  <Check className="w-4 h-4" />
                  <span>
                    {isSavingAccess
                      ? 'Menyimpan...'
                      : accessActionMode === 'remove'
                      ? 'Hapus Password'
                      : 'Simpan'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== MODAL TAMBAH / EDIT BERKAS ==================== */}
      {showFormModal && openedPtk && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col my-auto max-h-[94vh]">
            <div className="bg-indigo-950 px-6 py-4 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <FolderLock className="w-5 h-5 text-indigo-300" />
                <div>
                  <h2 className="text-base font-bold">
                    {editingItem ? 'Edit Isi Loker' : 'Tambah ke Loker'}
                  </h2>
                  <p className="text-[11px] text-indigo-200">{openedPtk.nama}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowFormModal(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={handleSubmitForm}
              className="p-5 sm:p-6 space-y-4 text-xs sm:text-sm overflow-y-auto"
            >
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-800 text-xs font-medium">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tanggal *</label>
                  <KalenderKecilInput
                    value={formTanggal}
                    onChange={setFormTanggal}
                    required
                    accentColor="indigo"
                    title="Pilih Tanggal"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Akses Berkas *</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setFormVisibilitas('privat')}
                      className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                        formVisibilitas === 'privat'
                          ? 'bg-rose-50 border-rose-400 text-rose-900'
                          : 'bg-slate-50 border-slate-200 text-slate-700'
                      }`}
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>Privat</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormVisibilitas('terbuka')}
                      className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                        formVisibilitas === 'terbuka'
                          ? 'bg-emerald-50 border-emerald-400 text-emerald-900'
                          : 'bg-slate-50 border-slate-200 text-slate-700'
                      }`}
                    >
                      <Globe className="w-3.5 h-3.5" />
                      <span>Terbuka</span>
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <label className="block font-semibold text-slate-700">Folder / Kategori *</label>
                  <button
                    type="button"
                    onClick={openFolderModal}
                    className="text-xs font-bold text-indigo-700 hover:text-indigo-800 inline-flex items-center gap-1 cursor-pointer"
                  >
                    <FolderPlus className="w-3.5 h-3.5" />
                    <span>+ Folder Baru</span>
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {allFoldersForOpenedPtk.map((folder) => {
                    const active = formKategori === folder.id;
                    return (
                      <button
                        key={folder.id}
                        type="button"
                        onClick={() => setFormKategori(folder.id)}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2 ${
                          active
                            ? 'bg-indigo-700 text-white border-indigo-700 shadow-xs'
                            : 'bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-200'
                        }`}
                      >
                        {renderKategoriIcon(folder.id, 'w-4 h-4 shrink-0')}
                        <span className="text-xs font-bold leading-tight truncate">
                          {folder.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Judul *</label>
                <input
                  type="text"
                  required
                  value={formJudul}
                  onChange={(e) => setFormJudul(e.target.value)}
                  placeholder={getKategoriMeta(formKategori).contoh}
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 font-semibold text-slate-900 focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Catatan / Keterangan
                </label>
                <textarea
                  rows={3}
                  value={formIsiCatatan}
                  onChange={(e) => setFormIsiCatatan(e.target.value)}
                  placeholder="Tuliskan catatan atau ringkasan..."
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 focus:ring-2 focus:ring-indigo-600 focus:outline-none leading-relaxed"
                />
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200/90 rounded-xl space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-xs font-bold text-slate-800">
                    Upload Berkas (Maks. 650 KB)
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.webp,.txt"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>{formFileUrl ? 'Ganti Berkas' : 'Pilih Berkas'}</span>
                  </button>
                </div>

                {formFileNama && (
                  <div className="flex items-center justify-between gap-2 bg-white border border-indigo-200 rounded-xl px-3 py-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="w-4 h-4 text-indigo-700 shrink-0" />
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-900 truncate">
                          {formFileNama}
                        </div>
                        {formFileUkuran && (
                          <div className="text-[10px] text-slate-500">{formFileUkuran}</div>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveUploadedFile}
                      className="p-1 text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                      title="Hapus Lampiran"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                <input
                  type="url"
                  value={formLinkEksternal}
                  onChange={(e) => setFormLinkEksternal(e.target.value)}
                  placeholder="Atau tautan Google Drive (https://...)"
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowFormModal(false)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 font-bold bg-indigo-700 hover:bg-indigo-600 disabled:opacity-60 text-white rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>{isSaving ? 'Menyimpan...' : 'Simpan'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== MODAL PRATINJAU ==================== */}
      {previewItem && (canAccessPrivat || getItemVisibilitas(previewItem) === 'terbuka') && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden flex flex-col my-auto max-h-[94vh]">
            <div className="bg-indigo-950 px-6 py-4 text-white flex items-center justify-between shrink-0">
              <div className="min-w-0 pr-4">
                <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold text-indigo-200">
                  <span>{getKategoriMeta(previewItem.kategori).label}</span>
                  <span
                    className={`px-2 py-0.5 rounded font-bold ${
                      getItemVisibilitas(previewItem) === 'privat'
                        ? 'bg-rose-500/30 text-rose-100'
                        : 'bg-emerald-500/30 text-emerald-100'
                    }`}
                  >
                    {getItemVisibilitas(previewItem) === 'privat' ? 'Privat' : 'Terbuka'}
                  </span>
                </div>
                <h2 className="text-base font-bold truncate mt-0.5">{previewItem.judul}</h2>
              </div>
              <button
                type="button"
                onClick={() => setPreviewItem(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 sm:p-6 space-y-4 overflow-y-auto text-xs sm:text-sm">
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 rounded-lg font-semibold">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  <span>{formatTanggalIndonesia(previewItem.tanggal) || previewItem.tanggal}</span>
                </span>
                {previewItem.fileNama && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 text-indigo-900 rounded-lg font-semibold border border-indigo-200">
                    <Paperclip className="w-3.5 h-3.5" />
                    <span>
                      {previewItem.fileNama}
                      {previewItem.fileUkuran ? ` (${previewItem.fileUkuran})` : ''}
                    </span>
                  </span>
                )}
              </div>

              {previewItem.isiCatatan && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-slate-800 whitespace-pre-wrap leading-relaxed">
                  {previewItem.isiCatatan}
                </div>
              )}

              {previewItem.fileUrl && (
                <LokerFilePreview
                  fileUrl={previewItem.fileUrl}
                  fileNama={previewItem.fileNama}
                  fileTipe={previewItem.fileTipe}
                  judul={previewItem.judul}
                />
              )}

              {previewItem.linkEksternal && isSafeHttpUrl(previewItem.linkEksternal) && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between gap-2">
                  <span className="text-xs text-blue-900 truncate underline">
                    {previewItem.linkEksternal}
                  </span>
                  <a
                    href={previewItem.linkEksternal}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 bg-blue-700 hover:bg-blue-600 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1.5 shrink-0"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Buka Link</span>
                  </a>
                </div>
              )}
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2 shrink-0">
              {previewItem.fileUrl && previewItem.fileNama && (
                <a
                  href={previewItem.fileUrl}
                  download={previewItem.fileNama}
                  className="px-4 py-2 text-xs font-bold bg-indigo-700 hover:bg-indigo-600 text-white rounded-xl inline-flex items-center gap-1.5"
                >
                  <Download className="w-4 h-4" />
                  <span>Unduh</span>
                </a>
              )}
              <button
                type="button"
                onClick={() => setPreviewItem(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 rounded-xl cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== MODAL KONFIRMASI HAPUS ==================== */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mb-4 mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 text-center mb-2">
              Hapus Item?
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 text-center mb-6">
              Hapus <strong className="text-slate-900">&quot;{deleteTarget.judul}&quot;</strong>?
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteLokerPtk(deleteTarget.id);
                  setDeleteTarget(null);
                }}
                className="px-5 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-xs cursor-pointer"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ==================== MODAL RESET PASSWORD LOKER (KHUSUS ADMIN) ==================== */}
      {isAdmin && resetTargetPtk && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden flex flex-col my-auto max-h-[94vh]">
            <div className="bg-amber-900 px-6 py-4 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <ShieldAlert className="w-5 h-5 text-amber-200" />
                <div>
                  <h2 className="text-base font-bold">Reset Password Loker</h2>
                  <p className="text-[11px] text-amber-100">{resetTargetPtk.nama}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setResetTargetPtk(null)}
                className="p-1 text-amber-200 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={handleAdminResetSubmit}
              className="p-5 sm:p-6 space-y-4 text-xs sm:text-sm overflow-y-auto"
            >
              {resetError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-800 text-xs font-medium">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{resetError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setResetMode('remove');
                    setResetError(null);
                  }}
                  className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                    resetMode === 'remove'
                      ? 'bg-amber-50 border-amber-500 text-amber-950'
                      : 'bg-slate-50 border-slate-200 text-slate-700'
                  }`}
                >
                  <Unlock className="w-3.5 h-3.5" />
                  <span>Hapus Password</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setResetMode('set_temp');
                    setResetError(null);
                  }}
                  className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                    resetMode === 'set_temp'
                      ? 'bg-indigo-50 border-indigo-500 text-indigo-950'
                      : 'bg-slate-50 border-slate-200 text-slate-700'
                  }`}
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Password Baru</span>
                </button>
              </div>

              {resetMode === 'remove' ? (
                <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl text-xs text-amber-950 leading-relaxed">
                  Password loker <strong>{resetTargetPtk.nama}</strong> akan dihapus sehingga PTK dapat masuk kembali dan membuat password baru.
                </div>
              ) : (
                <div className="space-y-3 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1 text-xs">
                      Password Baru *
                    </label>
                    <div className="relative">
                      <input
                        type={showResetPasswords ? 'text' : 'password'}
                        value={resetNewPassword}
                        onChange={(e) => setResetNewPassword(e.target.value)}
                        placeholder="Min. 4 karakter"
                        required
                        className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 pr-10 text-sm focus:ring-2 focus:ring-amber-600 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowResetPasswords((p) => !p)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showResetPasswords ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1 text-xs">
                      Konfirmasi Password Baru *
                    </label>
                    <input
                      type={showResetPasswords ? 'text' : 'password'}
                      value={resetConfirmPassword}
                      onChange={(e) => setResetConfirmPassword(e.target.value)}
                      placeholder="Ulangi password baru"
                      required
                      className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-sm focus:ring-2 focus:ring-amber-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1 text-xs">
                      Petunjuk Password (Opsional)
                    </label>
                    <input
                      type="text"
                      value={resetHint}
                      onChange={(e) => setResetHint(e.target.value)}
                      placeholder="Petunjuk singkat..."
                      className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs sm:text-sm focus:ring-2 focus:ring-amber-600 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setResetTargetPtk(null)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isResettingPassword}
                  className="px-5 py-2 font-bold bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>{isResettingPassword ? 'Memproses...' : 'Reset Password'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* ==================== MODAL PASANG PASSWORD LOKER PRIVAT ==================== */}
      {quickLockPtk && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden flex flex-col my-auto max-h-[94vh]">
            <div className="bg-indigo-950 px-6 py-4 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <Lock className="w-5 h-5 text-rose-300" />
                <div>
                  <h2 className="text-base font-bold">
                    {quickLockTargetVis === 'privat'
                      ? 'Pasang Password Loker Privat'
                      : 'Pasang Password Loker'}
                  </h2>
                  <p className="text-[11px] text-indigo-200">{quickLockPtk.nama}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setQuickLockPtk(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={handleQuickLockSubmit}
              className="p-5 sm:p-6 space-y-4 text-xs sm:text-sm overflow-y-auto"
            >
              {quickLockError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-800 text-xs font-medium">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{quickLockError}</span>
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1 text-xs">
                  Password Loker *
                </label>
                <div className="relative">
                  <input
                    type={showQuickLockPasswords ? 'text' : 'password'}
                    value={quickLockPassword}
                    onChange={(e) => setQuickLockPassword(e.target.value)}
                    placeholder="Min. 4 karakter"
                    required
                    className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 pr-10 text-sm focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowQuickLockPasswords((p) => !p)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showQuickLockPasswords ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1 text-xs">
                  Konfirmasi Password *
                </label>
                <input
                  type={showQuickLockPasswords ? 'text' : 'password'}
                  value={quickLockConfirmPassword}
                  onChange={(e) => setQuickLockConfirmPassword(e.target.value)}
                  placeholder="Ulangi password"
                  required
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-sm focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1 text-xs">
                  Petunjuk Password (Opsional)
                </label>
                <input
                  type="text"
                  value={quickLockHint}
                  onChange={(e) => setQuickLockHint(e.target.value)}
                  placeholder="Petunjuk singkat jika lupa..."
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs sm:text-sm focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setQuickLockPtk(null)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSavingQuickLock}
                  className={`px-5 py-2 font-bold disabled:opacity-60 text-white rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer ${
                    quickLockTargetVis === 'privat'
                      ? 'bg-rose-600 hover:bg-rose-700'
                      : 'bg-emerald-600 hover:bg-emerald-700'
                  }`}
                >
                  <Lock className="w-4 h-4" />
                  <span>
                    {isSavingQuickLock
                      ? 'Menyimpan...'
                      : quickLockTargetVis === 'privat'
                      ? 'Aktifkan Privat'
                      : 'Simpan & Kunci Terbuka'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* ==================== MODAL KONFIRMASI PASSWORD PINDAH ATURAN LOKER ==================== */}
      {ruleChangePending && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden flex flex-col my-auto max-h-[94vh]">
            <div className="bg-indigo-950 px-6 py-4 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <KeyRound className="w-5 h-5 text-indigo-300" />
                <div>
                  <h2 className="text-base font-bold">
                    Ubah ke {ruleChangePending.targetVis === 'privat' ? 'Privat' : 'Kunci Terbuka'}
                  </h2>
                  <p className="text-[11px] text-indigo-200">{ruleChangePending.ptk.nama}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRuleChangePending(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={handleRuleChangeSubmit}
              className="p-5 sm:p-6 space-y-4 text-xs sm:text-sm overflow-y-auto"
            >
              {ruleChangeError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-800 text-xs font-medium">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{ruleChangeError}</span>
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1 text-xs">
                  Masukkan Password Loker *
                </label>
                <div className="relative">
                  <input
                    type={showRuleChangePassword ? 'text' : 'password'}
                    value={ruleChangePassword}
                    onChange={(e) => setRuleChangePassword(e.target.value)}
                    placeholder="Password loker PTK..."
                    required
                    autoFocus
                    className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 pr-10 text-sm focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRuleChangePassword((p) => !p)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showRuleChangePassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {accessByPtkId[ruleChangePending.ptk.id]?.passwordHint && (
                <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 font-medium">
                  Petunjuk: {accessByPtkId[ruleChangePending.ptk.id]?.passwordHint}
                </div>
              )}

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRuleChangePending(null)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSavingRuleChange}
                  className={`px-5 py-2 font-bold text-white rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-60 ${
                    ruleChangePending.targetVis === 'privat'
                      ? 'bg-rose-600 hover:bg-rose-700'
                      : 'bg-emerald-600 hover:bg-emerald-700'
                  }`}
                >
                  <Check className="w-4 h-4" />
                  <span>{isSavingRuleChange ? 'Memeriksa...' : 'Simpan Perubahan'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== MODAL VERIFIKASI PASSWORD BERKAS PRIVAT ==================== */}
      {showPrivateUnlockModal && openedPtk && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden flex flex-col my-auto max-h-[94vh]">
            <div className="bg-indigo-950 px-6 py-4 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <Lock className="w-5 h-5 text-amber-300" />
                <div>
                  <h2 className="text-base font-bold">Buka Berkas Privat</h2>
                  <p className="text-[11px] text-indigo-200">{openedPtk.nama}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPrivateUnlockModal(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={handlePrivateUnlockSubmit}
              className="p-5 sm:p-6 space-y-4 text-xs sm:text-sm overflow-y-auto"
            >
              {privateUnlockError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-800 text-xs font-medium">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{privateUnlockError}</span>
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1 text-xs">
                  Password Loker *
                </label>
                <div className="relative">
                  <input
                    type={showPrivateUnlockPass ? 'text' : 'password'}
                    value={privateUnlockPassword}
                    onChange={(e) => setPrivateUnlockPassword(e.target.value)}
                    placeholder="Masukkan password loker..."
                    required
                    autoFocus
                    className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 pr-10 text-sm focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPrivateUnlockPass((p) => !p)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPrivateUnlockPass ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {currentAccess?.passwordHint && (
                <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 font-medium">
                  Petunjuk: {currentAccess.passwordHint}
                </div>
              )}

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowPrivateUnlockModal(false)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isVerifyingPrivateUnlock}
                  className="px-5 py-2 font-bold bg-indigo-700 hover:bg-indigo-600 disabled:opacity-60 text-white rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Unlock className="w-4 h-4" />
                  <span>{isVerifyingPrivateUnlock ? 'Memeriksa...' : 'Buka Akses'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== MODAL HAPUS LOKER PTK (WAJIB PASSWORD) ==================== */}
      {deleteLockerTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden flex flex-col my-auto max-h-[94vh]">
            <div className="bg-rose-900 px-6 py-4 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <Trash2 className="w-5 h-5 text-rose-200" />
                <div>
                  <h2 className="text-base font-bold">Hapus Loker PTK</h2>
                  <p className="text-[11px] text-rose-200">{deleteLockerTarget.nama}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDeleteLockerTarget(null)}
                className="p-1 text-rose-200 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={handleConfirmDeleteLocker}
              className="p-5 sm:p-6 space-y-4 text-xs sm:text-sm overflow-y-auto"
            >
              {(() => {
                const targetAcc = accessByPtkId[deleteLockerTarget.id];
                const hasLock = Boolean(targetAcc?.isProtected && targetAcc?.passwordHash);
                const itemCount = lokerPtkList.filter(
                  (i) => i.ptkId === deleteLockerTarget.id
                ).length;

                return (
                  <>
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 space-y-1">
                      <p className="font-bold">
                        Perhatian: Loker beserta seluruh berkas/catatan di dalamnya ({itemCount} item)
                        akan dihapus permanen.
                      </p>
                      <p>
                        {hasLock
                          ? 'Untuk keamanan, masukkan password loker ini untuk melanjutkan penghapusan.'
                          : 'Loker ini belum diproteksi password. Konfirmasi di bawah untuk menghapus loker.'}
                      </p>
                    </div>

                    {deleteLockerError && (
                      <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl flex items-center gap-2 text-rose-800 text-xs font-medium">
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                        <span>{deleteLockerError}</span>
                      </div>
                    )}

                    {hasLock && (
                      <>
                        <div>
                          <label className="block font-semibold text-slate-700 mb-1 text-xs">
                            Masukkan Password Loker *
                          </label>
                          <div className="relative">
                            <input
                              type={showDeleteLockerPassword ? 'text' : 'password'}
                              value={deleteLockerPassword}
                              onChange={(e) => setDeleteLockerPassword(e.target.value)}
                              placeholder="Password loker PTK..."
                              required
                              autoFocus
                              className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 pr-10 text-sm focus:ring-2 focus:ring-rose-600 focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => setShowDeleteLockerPassword((p) => !p)}
                              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                            >
                              {showDeleteLockerPassword ? (
                                <EyeOff className="w-4 h-4" />
                              ) : (
                                <Eye className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </div>

                        {targetAcc?.passwordHint && (
                          <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 font-medium">
                            Petunjuk: {targetAcc.passwordHint}
                          </div>
                        )}
                      </>
                    )}
                  </>
                );
              })()}

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setDeleteLockerTarget(null)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isDeletingLocker}
                  className="px-5 py-2 font-bold bg-rose-600 hover:bg-rose-700 disabled:opacity-60 text-white rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>{isDeletingLocker ? 'Menghapus...' : 'Hapus Loker'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== MODAL PENGATURAN LOKER PTK (GEAR) ==================== */}
      {settingsTargetPtk && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden flex flex-col my-auto max-h-[94vh]">
            <div className="bg-slate-900 px-6 py-4 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <Settings className="w-5 h-5 text-indigo-300" />
                <div>
                  <h2 className="text-base font-bold">Pengaturan Loker PTK</h2>
                  <p className="text-[11px] text-slate-300">{settingsTargetPtk.nama}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSettingsTargetPtk(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {(() => {
              const targetAcc = accessByPtkId[settingsTargetPtk.id];
              const hasLock = Boolean(targetAcc?.isProtected && targetAcc?.passwordHash);
              const activeColorId = targetAcc?.cardColor || LOCKER_COLOR_THEMES[0].id;

              return (
                <div className="p-5 sm:p-6 space-y-5 text-xs sm:text-sm overflow-y-auto">
                  {/* 1. Pilih Warna Tombol Buka Loker */}
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-2 font-bold text-slate-800 text-xs uppercase tracking-wider">
                      <Palette className="w-4 h-4 text-indigo-600" />
                      <span>1. Warna Tombol Loker</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {LOCKER_COLOR_THEMES.map((theme) => {
                        const isSelected = activeColorId === theme.id;
                        return (
                          <button
                            key={theme.id}
                            type="button"
                            disabled={isSavingCardColor}
                            onClick={() => handleSelectLockerColor(settingsTargetPtk, theme.id)}
                            className={`flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border text-left text-xs font-semibold transition-all cursor-pointer disabled:opacity-60 ${
                              isSelected
                                ? 'border-indigo-600 bg-indigo-50/70 text-indigo-950 ring-1 ring-indigo-600'
                                : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                            }`}
                          >
                            <span className="flex items-center gap-2 min-w-0">
                              <span
                                className={`w-4 h-4 rounded-full shrink-0 border border-black/10 ${theme.swatchClass}`}
                              />
                              <span className="truncate">{theme.label}</span>
                            </span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 2 & 3. Tombol Reset Password & Hapus Loker */}
                  <div className="pt-4 border-t border-slate-200 space-y-2.5">
                    <div className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                      2. Pengelolaan Loker
                    </div>

                    {hasLock && isAdmin && (
                      <button
                        type="button"
                        onClick={() => {
                          const ptk = settingsTargetPtk;
                          setSettingsTargetPtk(null);
                          openAdminResetModal(ptk);
                        }}
                        className="w-full px-4 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                      >
                        <RotateCcw className="w-4 h-4" />
                        <span>Reset Password Loker</span>
                      </button>
                    )}

                    {hasLock && !isAdmin && (
                      <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-600 font-medium">
                        Reset password loker hanya tersedia apabila login menggunakan akun Admin.
                      </div>
                    )}

                    {onDeleteLokerLocker && (
                      <button
                        type="button"
                        onClick={() => {
                          const ptk = settingsTargetPtk;
                          setSettingsTargetPtk(null);
                          openDeleteLockerModal(ptk);
                        }}
                        className="w-full px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>Hapus Loker PTK</span>
                      </button>
                    )}
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setSettingsTargetPtk(null)}
                      className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                    >
                      Tutup
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ==================== MODAL UBAH STATUS FILE (PRIVAT <-> TERBUKA, WAJIB PASSWORD) ==================== */}
      {itemVisChangePending && openedPtk && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden flex flex-col my-auto max-h-[94vh]">
            <div className="bg-indigo-950 px-6 py-4 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                {itemVisChangePending.targetVis === 'privat' ? (
                  <Lock className="w-5 h-5 text-rose-300" />
                ) : (
                  <Globe className="w-5 h-5 text-emerald-300" />
                )}
                <div>
                  <h2 className="text-base font-bold">
                    Ubah Status File ke{' '}
                    {itemVisChangePending.targetVis === 'privat' ? 'Privat' : 'Terbuka'}
                  </h2>
                  <p className="text-[11px] text-indigo-200 truncate max-w-[260px]">
                    {itemVisChangePending.item.judul}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setItemVisChangePending(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={handleItemVisChangeSubmit}
              className="p-5 sm:p-6 space-y-4 text-xs sm:text-sm overflow-y-auto"
            >
              {itemVisError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-800 text-xs font-medium">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{itemVisError}</span>
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1 text-xs">
                  Masukkan Password Loker *
                </label>
                <div className="relative">
                  <input
                    type={showItemVisPassword ? 'text' : 'password'}
                    value={itemVisPassword}
                    onChange={(e) => setItemVisPassword(e.target.value)}
                    placeholder="Password loker PTK..."
                    required
                    autoFocus
                    className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 pr-10 text-sm focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowItemVisPassword((p) => !p)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showItemVisPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {currentAccess?.passwordHint && (
                <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 font-medium">
                  Petunjuk: {currentAccess.passwordHint}
                </div>
              )}

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setItemVisChangePending(null)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSavingItemVis}
                  className={`px-5 py-2 font-bold text-white rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-60 ${
                    itemVisChangePending.targetVis === 'privat'
                      ? 'bg-rose-600 hover:bg-rose-700'
                      : 'bg-emerald-600 hover:bg-emerald-700'
                  }`}
                >
                  <Check className="w-4 h-4" />
                  <span>{isSavingItemVis ? 'Memeriksa...' : 'Simpan Perubahan'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* ==================== MODAL TAMBAH & KELOLA FOLDER DI DALAM LOKER ==================== */}
      {showFolderModal && openedPtk && (
        <div className="fixed inset-0 z-[55] flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden flex flex-col my-auto max-h-[94vh]">
            <div className="bg-indigo-950 px-6 py-4 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <FolderPlus className="w-5 h-5 text-indigo-300" />
                <div>
                  <h2 className="text-base font-bold">Pengaturan Folder Loker</h2>
                  <p className="text-[11px] text-indigo-200">{openedPtk.nama}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowFolderModal(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 sm:p-6 space-y-5 text-xs sm:text-sm overflow-y-auto">
              {folderError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-800 text-xs font-medium">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{folderError}</span>
                </div>
              )}

              <form onSubmit={handleAddCustomFolder} className="space-y-2.5">
                <label className="block font-semibold text-slate-700 text-xs">
                  Tambah Folder Baru *
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    placeholder="Contoh: Sertifikat, PKG, Tugas Tambahan..."
                    maxLength={60}
                    autoFocus
                    className="flex-1 bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs sm:text-sm focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={isSavingFolders}
                    className="px-4 py-2 bg-indigo-700 hover:bg-indigo-600 disabled:opacity-60 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{isSavingFolders ? 'Menyimpan...' : 'Tambah'}</span>
                  </button>
                </div>
              </form>

              <div className="space-y-2 pt-3 border-t border-slate-200">
                <div className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                  Daftar Folder di Loker Ini
                </div>

                <div className="space-y-1.5">
                  {allFoldersForOpenedPtk.map((folder) => {
                    const count = countsByKategori[folder.id] || 0;
                    return (
                      <div
                        key={folder.id}
                        className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/70"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-indigo-700 shrink-0">
                            {renderKategoriIcon(folder.id, 'w-4 h-4')}
                          </span>
                          <span className="text-xs font-bold text-slate-900 truncate">
                            {folder.label}
                          </span>
                          <span className="text-[11px] font-semibold text-slate-500 shrink-0">
                            ({count} berkas)
                          </span>
                        </div>

                        {folder.isCustom ? (
                          <button
                            type="button"
                            disabled={isSavingFolders}
                            onClick={() => handleDeleteCustomFolder(folder.id)}
                            title={
                              count > 0
                                ? 'Kosongkan berkas terlebih dahulu untuk menghapus folder'
                                : 'Hapus folder'
                            }
                            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer disabled:opacity-50 shrink-0"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        ) : (
                          <span className="text-[10px] font-semibold text-slate-500 px-2 py-0.5 bg-white border border-slate-200 rounded-md shrink-0">
                            Bawaan
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowFolderModal(false)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
