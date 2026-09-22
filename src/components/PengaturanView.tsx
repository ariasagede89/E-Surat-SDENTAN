import React, { useState } from 'react';
import {
  Settings,
  School,
  Database,
  Save,
  CheckCircle,
  AlertCircle,
  FileText,
  Key,
  Globe,
  RefreshCw,
  Trash2,
  Inbox,
  Send,
  Archive,
  Users,
  Upload,
  Image as ImageIcon,
  ShieldCheck,
  Lock,
  KeyRound,
  Eye,
  EyeOff,
  UserCheck,
  LogOut,
  Info,
} from 'lucide-react';
import { PengaturanSekolah, FirebaseConfig } from '../types';
import { KopSurat } from './KopSurat';
import { testFirebaseConnection, getStoredFirebaseConfig, saveStoredFirebaseConfig } from '../firebase/config';
import {
  getStoredAdminCredentials,
  saveAdminCredentialsAsync,
  saveAdminCredentials,
  saveAdminPassword,
  resetAdminPasswordToDefault,
  DEFAULT_ADMIN_USERNAME,
  DEFAULT_ADMIN_PASSWORD,
} from '../utils/authUtils';

interface PengaturanViewProps {
  sekolah: PengaturanSekolah;
  onSaveSekolah: (data: PengaturanSekolah) => void;
  firebaseConfig?: FirebaseConfig;
  onSaveFirebaseConfig?: (cfg: FirebaseConfig) => void;
  suratMasukCount?: number;
  suratKeluarCount?: number;
  arsipCount?: number;
  guruCount?: number;
  siswaCount?: number;
  onSyncAllLocalDataToFirestore?: () => Promise<{ totalSynced: number; errors: number; message: string }>;
  onClearSuratMasukFirestore?: () => Promise<void>;
  onClearSuratKeluarFirestore?: () => Promise<void>;
  onPurgeDummyData?: () => Promise<void>;
  onResetLocalCache?: () => void;
  onLogoutAdmin?: () => void;
}

export const PengaturanView: React.FC<PengaturanViewProps> = ({
  sekolah,
  onSaveSekolah,
  firebaseConfig,
  onSaveFirebaseConfig,
  suratMasukCount = 0,
  suratKeluarCount = 0,
  arsipCount = 0,
  guruCount = 0,
  siswaCount = 0,
  onSyncAllLocalDataToFirestore,
  onClearSuratMasukFirestore,
  onClearSuratKeluarFirestore,
  onPurgeDummyData,
  onResetLocalCache,
  onLogoutAdmin,
}) => {
  const [formData, setFormData] = useState<PengaturanSekolah>(sekolah);
  const [activeTab, setActiveTab] = useState<'identitas' | 'kop' | 'database' | 'keamanan'>('identitas');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [clearingAction, setClearingAction] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Admin auth credential states
  const [adminCreds, setAdminCreds] = useState(() => getStoredAdminCredentials());
  const [editAdminUsername, setEditAdminUsername] = useState(() => getStoredAdminCredentials().username);
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [confirmAdminPassword, setConfirmAdminPassword] = useState('');
  const [showAdminPass, setShowAdminPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [showCurrentActivePass, setShowCurrentActivePass] = useState(false);
  const [savingCreds, setSavingCreds] = useState(false);
  const [authSaveSuccess, setAuthSaveSuccess] = useState(false);
  const [authError, setAuthError] = useState('');

  const handleSaveAdminCreds = async (): Promise<boolean> => {
    setAuthError('');
    const trimmedUser = editAdminUsername.trim();
    if (!trimmedUser) {
      setAuthError('Nama pengguna (username) tidak boleh kosong!');
      return false;
    }
    if (trimmedUser.length < 3) {
      setAuthError('Nama pengguna (username) minimal 3 karakter!');
      return false;
    }

    if (newAdminPassword || confirmAdminPassword) {
      if (!newAdminPassword) {
        setAuthError('Kata sandi baru tidak boleh kosong!');
        return false;
      }
      if (newAdminPassword.length < 4) {
        setAuthError('Kata sandi baru minimal 4 karakter!');
        return false;
      }
      if (newAdminPassword !== confirmAdminPassword) {
        setAuthError('Konfirmasi kata sandi tidak cocok dengan kata sandi baru!');
        return false;
      }
    }

    setSavingCreds(true);
    try {
      const res = await saveAdminCredentialsAsync(trimmedUser, newAdminPassword || undefined);
      if (res.success) {
        const updated = getStoredAdminCredentials();
        setAdminCreds(updated);
        setEditAdminUsername(updated.username);
        setNewAdminPassword('');
        setConfirmAdminPassword('');
        setAuthSaveSuccess(true);
        setTimeout(() => setAuthSaveSuccess(false), 5000);
        return true;
      } else {
        setAuthError(res.error || 'Gagal memperbarui kredensial.');
        return false;
      }
    } catch {
      setAuthError('Terjadi kesalahan saat menyimpan kredensial.');
      return false;
    } finally {
      setSavingCreds(false);
    }
  };

  const handleResetAdminCreds = async () => {
    if (confirm('Kembalikan nama pengguna dan kata sandi admin ke pengaturan awal sistem (admin / admin1234)?')) {
      setSavingCreds(true);
      await resetAdminPasswordToDefault();
      const def = getStoredAdminCredentials();
      setAdminCreds(def);
      setEditAdminUsername(def.username);
      setNewAdminPassword('');
      setConfirmAdminPassword('');
      setAuthError('');
      setAuthSaveSuccess(true);
      setSavingCreds(false);
      setTimeout(() => setAuthSaveSuccess(false), 5000);
    }
  };

  React.useEffect(() => {
    setFormData(sekolah);
  }, [sekolah]);

  // Firebase Config State initialized from stored config or defaults
  const initialFb = firebaseConfig || getStoredFirebaseConfig();
  const [fbProjectId, setFbProjectId] = useState(initialFb.projectId || 'simas-24c34');
  const [fbApiKey, setFbApiKey] = useState(initialFb.apiKey || '');
  const [fbAuthDomain, setFbAuthDomain] = useState(initialFb.authDomain || 'simas-24c34.firebaseapp.com');
  const [fbStorageBucket, setFbStorageBucket] = useState(initialFb.storageBucket || 'simas-24c34.firebasestorage.app');
  const [fbMessagingSenderId, setFbMessagingSenderId] = useState(initialFb.messagingSenderId || '787216152833');
  const [fbAppId, setFbAppId] = useState(initialFb.appId || '1:787216152833:web:aecdd21edd3d6667a40300');
  const [testingFirebase, setTestingFirebase] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const getCurrentFbConfig = (): FirebaseConfig => ({
    projectId: fbProjectId.trim(),
    apiKey: fbApiKey.trim(),
    authDomain: fbAuthDomain.trim(),
    storageBucket: fbStorageBucket.trim(),
    messagingSenderId: fbMessagingSenderId.trim(),
    appId: fbAppId.trim(),
    firestoreDatabaseId: '(default)',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSekolah(formData);

    const cfg = getCurrentFbConfig();
    saveStoredFirebaseConfig(cfg);
    if (onSaveFirebaseConfig) {
      onSaveFirebaseConfig(cfg);
    }

    // Jika pengguna sedang mengubah username atau password, simpan juga otomatis
    if (
      editAdminUsername.trim() !== adminCreds.username ||
      newAdminPassword.trim() !== ''
    ) {
      const ok = await handleSaveAdminCreds();
      if (!ok) {
        return; // Hentikan jika ada kesalahan input password
      }
    }

    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleTestFb = async () => {
    setTestingFirebase(true);
    setTestResult(null);
    try {
      const currentConfig = getCurrentFbConfig();
      saveStoredFirebaseConfig(currentConfig);
      const res = await testFirebaseConnection(currentConfig);
      setTestResult(res);
      if (res.success && onSaveFirebaseConfig) {
        onSaveFirebaseConfig(currentConfig);
      }
    } catch (err: any) {
      setTestResult({ success: false, message: err.message || 'Gagal tersambung' });
    } finally {
      setTestingFirebase(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Settings className="w-5 h-5 text-slate-700" />
            Pengaturan Sistem E-SURAT SDENTAN
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Konfigurasi identitas resmi SDN 1 Pekutatan, kop surat dinas, penomoran, dan koneksi Google Firebase
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl">
          <button
            onClick={() => setActiveTab('identitas')}
            className={`px-3.5 py-1.5 text-xs sm:text-sm font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'identitas'
                ? 'bg-white text-blue-950 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <School className="w-4 h-4" />
            <span>Identitas Sekolah</span>
          </button>
          <button
            onClick={() => setActiveTab('kop')}
            className={`px-3.5 py-1.5 text-xs sm:text-sm font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'kop'
                ? 'bg-white text-blue-950 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Kop Surat</span>
          </button>
          <button
            onClick={() => setActiveTab('database')}
            className={`px-3.5 py-1.5 text-xs sm:text-sm font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'database'
                ? 'bg-white text-blue-950 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>Google Firebase</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('keamanan')}
            className={`px-3.5 py-1.5 text-xs sm:text-sm font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'keamanan'
                ? 'bg-white text-blue-950 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Hak Akses & Admin</span>
          </button>
        </div>
      </div>

      {saveSuccess && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 p-4 rounded-xl flex items-center gap-2 text-xs sm:text-sm animate-fade-in">
          <CheckCircle className="w-5 h-5 text-emerald-600" />
          <span>Pengaturan berhasil disimpan dan diperbarui di sistem!</span>
        </div>
      )}

      {/* Main Settings Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* TAB 1: IDENTITAS SEKOLAH */}
        {activeTab === 'identitas' && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2">
              <School className="w-4 h-4 text-blue-900" />
              Identitas Resmi Sekolah & Kepala Sekolah
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Satuan Pendidikan *
                </label>
                <input
                  type="text"
                  required
                  value={formData.namaSekolah}
                  onChange={(e) => setFormData({ ...formData, namaSekolah: e.target.value })}
                  className="w-full text-xs sm:text-sm border border-slate-300 rounded-xl px-3 py-2 font-bold text-slate-900 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  NPSN (Nomor Pokok Sekolah Nasional) *
                </label>
                <input
                  type="text"
                  required
                  value={formData.npsn}
                  onChange={(e) => setFormData({ ...formData, npsn: e.target.value })}
                  className="w-full text-xs sm:text-sm border border-slate-300 rounded-xl px-3 py-2 font-mono focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Alamat Lengkap Sekolah *
              </label>
              <input
                type="text"
                required
                value={formData.alamat}
                onChange={(e) => setFormData({ ...formData, alamat: e.target.value })}
                className="w-full text-xs sm:text-sm border border-slate-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-600 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Kode Pos
                </label>
                <input
                  type="text"
                  value={formData.kodePos}
                  onChange={(e) => setFormData({ ...formData, kodePos: e.target.value })}
                  className="w-full text-xs sm:text-sm border border-slate-300 rounded-xl px-3 py-2 font-mono focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nomor Telepon / Kontak
                </label>
                <input
                  type="text"
                  value={formData.telepon}
                  onChange={(e) => setFormData({ ...formData, telepon: e.target.value })}
                  className="w-full text-xs sm:text-sm border border-slate-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email Resmi Sekolah
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full text-xs sm:text-sm border border-slate-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-3 border-t border-slate-100">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Kepala Sekolah *
                </label>
                <input
                  type="text"
                  required
                  value={formData.kepalaSekolah}
                  onChange={(e) => setFormData({ ...formData, kepalaSekolah: e.target.value })}
                  className="w-full text-xs sm:text-sm border border-slate-300 rounded-xl px-3 py-2 font-semibold text-slate-900 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  NIP Kepala Sekolah *
                </label>
                <input
                  type="text"
                  required
                  value={formData.nipKepalaSekolah}
                  onChange={(e) => setFormData({ ...formData, nipKepalaSekolah: e.target.value })}
                  className="w-full text-xs sm:text-sm border border-slate-300 rounded-xl px-3 py-2 font-mono focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Pangkat / Golongan *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Penata, III/c"
                  value={formData.pangkatKepalaSekolah || ''}
                  onChange={(e) => setFormData({ ...formData, pangkatKepalaSekolah: e.target.value })}
                  className="w-full text-xs sm:text-sm border border-slate-300 rounded-xl px-3 py-2 font-medium text-slate-800 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Singkatan Kode Surat Sekolah *
                </label>
                <input
                  type="text"
                  required
                  placeholder="SDN1PKT"
                  value={formData.kodeSuratSekolah}
                  onChange={(e) => setFormData({ ...formData, kodeSuratSekolah: e.target.value })}
                  className="w-full text-xs sm:text-sm border border-slate-300 rounded-xl px-3 py-2 font-mono font-bold text-blue-900 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Digunakan dalam nomor: [Kode]/[No]/<strong>SDN1PKT</strong>/[Romawi]/[Th]
                </span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: KOP SURAT */}
        {activeTab === 'kop' && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-5">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-900" />
                Pengaturan Kop Surat Sekolah
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Unggah gambar kop surat resmi sekolah berformat JPG atau PNG untuk digunakan pada seluruh naskah dinas.
              </p>
            </div>

            <div className="space-y-4">
              {formData.kopImageUrl ? (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                      <CheckCircle className="w-4 h-4 text-emerald-600" />
                      Gambar Kop Surat Aktif Terpasang
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const updated = { ...formData, kopImageUrl: '' };
                        setFormData(updated);
                        onSaveSekolah(updated);
                      }}
                      className="text-xs font-semibold text-rose-600 hover:text-rose-800 hover:bg-rose-50 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 border border-rose-200"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Hapus Gambar Kop
                    </button>
                  </div>

                  <div className="p-3 bg-white border border-slate-200 rounded-lg overflow-hidden flex items-center justify-center">
                    <img
                      src={formData.kopImageUrl}
                      alt="Pratinjau Kop Surat"
                      className="max-h-36 w-auto object-contain"
                    />
                  </div>

                  <div>
                    <label className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-900 hover:bg-blue-800 text-white rounded-xl text-xs font-semibold cursor-pointer transition-colors shadow-xs">
                      <Upload className="w-4 h-4" />
                      <span>Ganti Gambar Kop Surat (JPG / PNG)</span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/jpg"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            const base64 = event.target?.result as string;
                            const updated = { ...formData, kopImageUrl: base64 };
                            setFormData(updated);
                            onSaveSekolah(updated);
                            setSaveSuccess(true);
                            setTimeout(() => setSaveSuccess(false), 3000);
                          };
                          reader.readAsDataURL(file);
                        }}
                      />
                    </label>
                  </div>
                </div>
              ) : (
                <div className="border-2 border-dashed border-slate-300 hover:border-blue-700 rounded-2xl p-8 text-center bg-slate-50/60 transition-colors">
                  <div className="w-14 h-14 bg-blue-50 text-blue-900 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <Upload className="w-7 h-7" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-800 mb-1">
                    Unggah Kop Surat Resmi Sekolah
                  </h3>
                  <p className="text-xs text-slate-500 mb-4 max-w-md mx-auto">
                    Format file gambar yang didukung: <strong>JPG, JPEG, atau PNG</strong>. Disarankan gambar berkualitas jernih dengan orientasi lanskap horizontal.
                  </p>
                  <label className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-900 hover:bg-blue-800 text-white rounded-xl text-xs font-semibold cursor-pointer transition-colors shadow-sm">
                    <Upload className="w-4 h-4" />
                    <span>Pilih & Upload Kop Surat (JPG / PNG)</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/jpg"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          const base64 = event.target?.result as string;
                          const updated = { ...formData, kopImageUrl: base64 };
                          setFormData(updated);
                          onSaveSekolah(updated);
                          setSaveSuccess(true);
                          setTimeout(() => setSaveSuccess(false), 3000);
                        };
                        reader.readAsDataURL(file);
                      }}
                    />
                  </label>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: DATABASE GOOGLE FIREBASE */}
        {activeTab === 'database' && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-5">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Database className="w-4 h-4 text-amber-600" />
                Integrasi Cloud Google Firebase Firestore
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Persistensi data cloud real-time untuk Surat Masuk, Surat Keluar, Arsip, Guru, dan Siswa
              </p>
            </div>

            <div className="p-4 rounded-xl bg-blue-50/80 border border-blue-200 flex items-start gap-3">
              <Globe className="w-5 h-5 text-blue-700 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-blue-900 space-y-1">
                <p className="font-bold">Status Penyimpanan Data Saat Ini: Tersinkronisasi Cerdas</p>
                <p>
                  Aplikasi telah dilengkapi dengan file konfigurasi <code className="bg-white px-1.5 py-0.5 rounded font-mono text-blue-950 font-bold border border-blue-200">firebase-blueprint.json</code> dan aturan keamanan <code className="bg-white px-1.5 py-0.5 rounded font-mono text-blue-950 font-bold border border-blue-200">firestore.rules</code>. Jika Firebase Project ID terhubung, data akan tersimpan langsung ke Firestore Cloud. Jika sedang offline, sistem otomatis menyimpan ke cache local browser sehingga data tidak hilang.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Firebase Project ID
                </label>
                <input
                  type="text"
                  value={fbProjectId}
                  onChange={(e) => setFbProjectId(e.target.value)}
                  className="w-full text-xs sm:text-sm border border-slate-300 rounded-xl px-3 py-2 font-mono focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Firebase Auth Domain
                </label>
                <input
                  type="text"
                  value={fbAuthDomain}
                  onChange={(e) => setFbAuthDomain(e.target.value)}
                  className="w-full text-xs sm:text-sm border border-slate-300 rounded-xl px-3 py-2 font-mono focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Firebase Web API Key
              </label>
              <input
                type="text"
                placeholder="AIzaSy..."
                value={fbApiKey}
                onChange={(e) => setFbApiKey(e.target.value)}
                className="w-full text-xs sm:text-sm border border-slate-300 rounded-xl px-3 py-2 font-mono focus:ring-2 focus:ring-blue-600 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Storage Bucket
                </label>
                <input
                  type="text"
                  value={fbStorageBucket}
                  onChange={(e) => setFbStorageBucket(e.target.value)}
                  className="w-full text-xs sm:text-sm border border-slate-300 rounded-xl px-3 py-2 font-mono focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Messaging Sender ID
                </label>
                <input
                  type="text"
                  value={fbMessagingSenderId}
                  onChange={(e) => setFbMessagingSenderId(e.target.value)}
                  className="w-full text-xs sm:text-sm border border-slate-300 rounded-xl px-3 py-2 font-mono focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  App ID
                </label>
                <input
                  type="text"
                  value={fbAppId}
                  onChange={(e) => setFbAppId(e.target.value)}
                  className="w-full text-xs sm:text-sm border border-slate-300 rounded-xl px-3 py-2 font-mono focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleTestFb}
                disabled={testingFirebase}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors shadow-xs"
              >
                {testingFirebase ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Menguji Koneksi Firestore...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Uji & Sinkronkan Firestore Cloud</span>
                  </>
                )}
              </button>
            </div>

            {testResult && (
              <div
                className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                  testResult.success
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                    : 'bg-amber-50 border-amber-300 text-amber-900'
                }`}
              >
                {testResult.success ? (
                  <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                )}
                <span>{testResult.message}</span>
              </div>
            )}

            {/* Panel Kontrol & Pembersihan Data Firestore */}
            <div className="mt-6 pt-6 border-t border-slate-200 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Database className="w-4 h-4 text-blue-600" />
                    <span>Data Riil Aktif di Cloud Firestore (simas-24c34)</span>
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Aplikasi ini menampilkan data langsung dan eksklusif dari Firebase. Penambahan data dummy otomatis telah dinonaktifkan.
                  </p>
                </div>
              </div>

              {actionNotice && (
                <div className="p-3 bg-blue-50 border border-blue-200 text-blue-800 rounded-xl text-xs flex items-center justify-between">
                  <span>{actionNotice}</span>
                  <button
                    type="button"
                    onClick={() => setActionNotice(null)}
                    className="text-blue-600 hover:text-blue-900 font-bold ml-2"
                  >
                    Tutup
                  </button>
                </div>
              )}

              {/* Real-time Document Counts */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center">
                  <div className="flex items-center justify-center text-blue-600 mb-1">
                    <Inbox className="w-4 h-4" />
                  </div>
                  <div className="text-lg font-bold text-slate-900">{suratMasukCount}</div>
                  <div className="text-[11px] text-slate-500">Surat Masuk</div>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center">
                  <div className="flex items-center justify-center text-emerald-600 mb-1">
                    <Send className="w-4 h-4" />
                  </div>
                  <div className="text-lg font-bold text-slate-900">{suratKeluarCount}</div>
                  <div className="text-[11px] text-slate-500">Surat Keluar</div>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center">
                  <div className="flex items-center justify-center text-indigo-600 mb-1">
                    <Archive className="w-4 h-4" />
                  </div>
                  <div className="text-lg font-bold text-slate-900">{arsipCount}</div>
                  <div className="text-[11px] text-slate-500">Buku Arsip</div>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center">
                  <div className="flex items-center justify-center text-amber-600 mb-1">
                    <Users className="w-4 h-4" />
                  </div>
                  <div className="text-lg font-bold text-slate-900">{guruCount}</div>
                  <div className="text-[11px] text-slate-500">Guru/Staf</div>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center col-span-2 sm:col-span-1">
                  <div className="flex items-center justify-center text-purple-600 mb-1">
                    <School className="w-4 h-4" />
                  </div>
                  <div className="text-lg font-bold text-slate-900">{siswaCount}</div>
                  <div className="text-[11px] text-slate-500">Siswa</div>
                </div>
              </div>

              {/* Action Buttons for Cleaning / Resetting / Uploading */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {onSyncAllLocalDataToFirestore && (
                  <button
                    type="button"
                    disabled={clearingAction !== null}
                    onClick={async () => {
                      setClearingAction('syncAll');
                      const res = await onSyncAllLocalDataToFirestore();
                      setClearingAction(null);
                      setActionNotice(res.message);
                    }}
                    className="px-3.5 py-2 bg-blue-900 hover:bg-blue-800 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors shadow-xs"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>{clearingAction === 'syncAll' ? 'Menyinkronkan Data...' : 'Sinkronkan Semua Data ke Cloud'}</span>
                  </button>
                )}

                {onPurgeDummyData && (
                  <button
                    type="button"
                    disabled={clearingAction !== null}
                    onClick={async () => {
                      setClearingAction('purge');
                      await onPurgeDummyData();
                      setClearingAction(null);
                      setActionNotice('Data dummy contoh bawaan berhasil dibersihkan dari Cloud Firestore.');
                    }}
                    className="px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-amber-700" />
                    <span>Bersihkan Data Dummy Contoh</span>
                  </button>
                )}

                {onClearSuratMasukFirestore && (
                  <button
                    type="button"
                    disabled={clearingAction !== null}
                    onClick={async () => {
                      if (confirm('PERINGATAN: Apakah Anda yakin ingin mengosongkan seluruh Surat Masuk di Cloud Firestore? Tindakan ini tidak dapat dibatalkan.')) {
                        setClearingAction('clearSM');
                        await onClearSuratMasukFirestore();
                        setClearingAction(null);
                        setActionNotice('Seluruh dokumen Surat Masuk di Cloud Firestore telah dihapus.');
                      }
                    }}
                    className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-900 border border-rose-200 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                    <span>Hapus Semua Surat Masuk</span>
                  </button>
                )}

                {onClearSuratKeluarFirestore && (
                  <button
                    type="button"
                    disabled={clearingAction !== null}
                    onClick={async () => {
                      if (confirm('PERINGATAN: Apakah Anda yakin ingin mengosongkan seluruh Surat Keluar di Cloud Firestore? Tindakan ini tidak dapat dibatalkan.')) {
                        setClearingAction('clearSK');
                        await onClearSuratKeluarFirestore();
                        setClearingAction(null);
                        setActionNotice('Seluruh dokumen Surat Keluar di Cloud Firestore telah dihapus.');
                      }
                    }}
                    className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-900 border border-rose-200 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                    <span>Hapus Semua Surat Keluar</span>
                  </button>
                )}

                {onResetLocalCache && (
                  <button
                    type="button"
                    onClick={() => {
                      onResetLocalCache();
                      setActionNotice('Cache browser telah dibersihkan. Data dimuat ulang langsung dari Firestore.');
                    }}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors ml-auto"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-slate-600" />
                    <span>Reset Cache Browser</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: HAK AKSES & AKUN ADMIN */}
        {activeTab === 'keamanan' && (
          <div className="space-y-6">
            {/* Status Info Card */}
            <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-blue-950 text-white p-6 rounded-2xl border border-blue-800/40 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-blue-600/30 border border-blue-400/40 flex items-center justify-center text-amber-300">
                  <ShieldCheck className="w-7 h-7" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-base text-white">
                      Status Sesi: Administrator
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400 text-slate-950">
                      Kepala Sekolah & TU
                    </span>
                  </div>
                  <p className="text-xs text-blue-200 mt-0.5">
                    Anda memiliki hak akses penuh untuk mengubah identitas sekolah, kop surat, database Firebase, dan keamanan.
                  </p>
                </div>
              </div>

              {onLogoutAdmin && (
                <button
                  type="button"
                  onClick={onLogoutAdmin}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-all self-stretch sm:self-auto justify-center"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Keluar ke Mode Guru</span>
                </button>
              )}
            </div>

            {/* Arsitektur Dua Model Akses */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Card 1: Model Guru (Tanpa Login) */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
                <div className="flex items-center gap-2 text-slate-900 border-b border-slate-100 pb-2">
                  <UserCheck className="w-4 h-4 text-emerald-600" />
                  <h3 className="text-sm font-bold">1. Model Guru (Tanpa Login)</h3>
                  <span className="ml-auto text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                    Aktif Otomatis
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Begitu membuka website E-SURAT SDENTAN, aplikasi langsung siap digunakan oleh para guru dan staf tanpa perlu login terlebih dahulu.
                </p>
                <div className="space-y-1.5 text-xs text-slate-700">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    <span>Akses Beranda, Agenda & Statistik</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    <span>Pencatatan Surat Masuk & Disposisi</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    <span>Pembuatan Surat Keluar & Nomor Otomatis</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    <span>Presensi Harian PTK & Siswa (Cetak F4)</span>
                  </div>
                  <div className="flex items-center gap-2 font-semibold text-rose-600">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                    <span>Menu Pengaturan dikunci (Tidak dapat diakses Guru)</span>
                  </div>
                </div>
              </div>

              {/* Card 2: Model Administrator */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
                <div className="flex items-center gap-2 text-slate-900 border-b border-slate-100 pb-2">
                  <Lock className="w-4 h-4 text-blue-800" />
                  <h3 className="text-sm font-bold">2. Akun Admin (Kepala Sekolah & TU)</h3>
                  <span className="ml-auto text-[10px] bg-blue-100 text-blue-900 font-bold px-2 py-0.5 rounded-full">
                    Akses Dilindungi
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Diperlukan untuk mengelola menu <strong>Pengaturan</strong> agar data instansi, kop surat, dan database aman dari perubahan tidak sengaja.
                </p>
                <div className="space-y-2 text-xs bg-slate-50 p-3 rounded-xl border border-slate-200/60">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Nama Pengguna (Username) Aktif:</span>
                    <span className="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                      {adminCreds.username}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Kata Sandi (Password) Aktif:</span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200 tracking-wider">
                        {showCurrentActivePass ? adminCreds.password : '••••••••'}
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowCurrentActivePass(!showCurrentActivePass)}
                        className="text-slate-400 hover:text-slate-700 p-1 rounded hover:bg-slate-200 transition-colors"
                        title={showCurrentActivePass ? 'Sembunyikan password aktif' : 'Lihat password aktif'}
                      >
                        {showCurrentActivePass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Tingkat Kewenangan:</span>
                    <span className="font-semibold text-blue-800">
                      Kepala Sekolah & Tata Usaha (Full Access)
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Manajemen Kredensial Administrator */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-amber-600" />
                  <span>Ubah Nama Pengguna & Kata Sandi Administrator</span>
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Sesuaikan nama pengguna (username) dan kata sandi (password) sesuai kebutuhan keamanan sekolah Anda.
                </p>
              </div>

              {authSaveSuccess && (
                <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-xl text-xs text-emerald-900 flex items-start gap-2.5 animate-fade-in">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold">Kredensial Administrator Berhasil Diperbarui & Disimpan!</div>
                    <div className="text-emerald-800 mt-0.5">
                      Username: <strong className="font-mono bg-emerald-100 px-1 py-0.5 rounded">{adminCreds.username}</strong> | Kata sandi baru telah aktif dan tersinkronisasi ke Cloud.
                    </div>
                  </div>
                </div>
              )}

              {authError && (
                <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl text-xs text-rose-900 flex items-center gap-2 animate-fade-in">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span className="font-medium">{authError}</span>
                </div>
              )}

              <div className="space-y-4 pt-1">
                {/* 1. Nama Pengguna (Username) - Bisa Diedit */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nama Pengguna (Username) Admin
                  </label>
                  <div className="relative max-w-md">
                    <input
                      type="text"
                      value={editAdminUsername}
                      onChange={(e) => setEditAdminUsername(e.target.value)}
                      placeholder="Masukkan nama pengguna baru"
                      className="w-full text-xs sm:text-sm border border-slate-300 bg-white text-slate-900 rounded-xl px-3 py-2 font-medium focus:ring-2 focus:ring-blue-800 focus:outline-none"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Username saat ini: <strong className="text-slate-800 font-mono">{adminCreds.username}</strong> (minimal 3 karakter).
                  </p>
                </div>

                {/* 2. Kata Sandi Baru & Konfirmasi */}
                <div className="pt-3 border-t border-slate-100">
                  <div className="mb-2">
                    <h4 className="text-xs font-bold text-slate-800">
                      Ganti Kata Sandi (Password):
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Kosongkan isian kata sandi di bawah jika Anda hanya ingin mengubah nama pengguna tanpa mengganti kata sandi.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Kata Sandi Baru (Min. 4 Karakter)
                      </label>
                      <div className="relative">
                        <input
                          type={showAdminPass ? 'text' : 'password'}
                          value={newAdminPassword}
                          onChange={(e) => setNewAdminPassword(e.target.value)}
                          placeholder="Masukkan kata sandi baru"
                          className="w-full text-xs sm:text-sm border border-slate-300 rounded-xl px-3 pr-10 py-2 text-slate-900 focus:ring-2 focus:ring-blue-800 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setShowAdminPass(!showAdminPass)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          {showAdminPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Konfirmasi Kata Sandi Baru
                      </label>
                      <div className="relative">
                        <input
                          type={showConfirmPass ? 'text' : 'password'}
                          value={confirmAdminPassword}
                          onChange={(e) => setConfirmAdminPassword(e.target.value)}
                          placeholder="Ulangi kata sandi baru"
                          className="w-full text-xs sm:text-sm border border-slate-300 rounded-xl px-3 pr-10 py-2 text-slate-900 focus:ring-2 focus:ring-blue-800 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPass(!showConfirmPass)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          {showConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    disabled={savingCreds}
                    onClick={handleSaveAdminCreds}
                    className="px-5 py-2.5 bg-blue-800 hover:bg-blue-700 disabled:bg-blue-400 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-2 transition-all cursor-pointer"
                  >
                    {savingCreds ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Menyimpan...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        <span>Simpan Perubahan Kredensial</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    disabled={savingCreds}
                    onClick={handleResetAdminCreds}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="Kembalikan username dan password ke setelan awal bawaan"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Reset ke Bawaan Sistem</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Submit Bar */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="submit"
            className="px-6 py-2.5 bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md flex items-center gap-2 transition-all transform active:scale-98"
          >
            <Save className="w-4 h-4" />
            <span>Simpan Semua Pengaturan</span>
          </button>
        </div>
      </form>
    </div>
  );
};
