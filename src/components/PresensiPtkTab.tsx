import React, { useState, useMemo, useRef } from 'react';
import {
  Printer,
  Search,
  Eye,
  Edit,
  Trash2,
  X,
  UserCheck,
  Calendar,
  FileSpreadsheet,
  FileText,
  ArrowUpDown,
  PenTool,
  Stamp,
  Check,
  ClipboardCheck,
  Lock,
  CheckCircle2,
  Clock,
  RotateCcw,
  Upload,
  Paperclip,
  ChevronDown,
  ChevronUp,
  Download,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import {
  Guru,
  PengaturanSekolah,
  SuratKeluar,
  ArsipSurat,
  StatusSuratKeluar,
  PaperSize,
  UserRole,
} from '../types';
import {
  formatTanggalIndonesia,
  exportToWord,
  buildSuratHtml,
  formatNamaSekolahIsi,
  resolveKepalaSekolahData,
} from '../utils/exportUtils';
import {
  compareSuratKeluarDesc,
  compareSuratKeluarAsc,
  getNextNomorUrut,
  generateNomorSurat,
} from '../utils/numberGenerator';
import { stripRichTags } from '../utils/richTextUtils';
import { RichTextField } from './RichTextField';
import { KalenderKecilInput } from './KalenderKecilPicker';
import { LokerFilePreview } from './LokerFilePreview';

interface PresensiPtkTabProps {
  guruList: Guru[];
  sekolah: PengaturanSekolah;
  suratKeluarList: SuratKeluar[];
  arsipList?: ArsipSurat[];
  userRole?: UserRole;
  onAddSuratKeluar: (item: Omit<SuratKeluar, 'id' | 'createdAt'>) => Promise<void> | void;
  onUpdateSuratKeluar: (item: SuratKeluar) => Promise<void> | void;
  onDeleteSuratKeluar: (id: string) => Promise<void> | void;
  onPreviewSuratKeluar: (surat: SuratKeluar) => void;
  onOpenCetakPresensiPtk: () => void;
}

function getDurasiHariIzin(tglMulai?: string, tglSelesai?: string): number {
  if (!tglMulai) return 1;
  if (!tglSelesai || tglMulai === tglSelesai) return 1;
  try {
    const d1 = new Date(tglMulai.split('T')[0]);
    const d2 = new Date(tglSelesai.split('T')[0]);
    const diff = Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return diff > 0 ? diff : 1;
  } catch {
    return 1;
  }
}

function isSuratIjinApproved(status?: StatusSuratKeluar): boolean {
  return status === 'Disetujui' || status === 'Terkirim' || status === 'Diarsipkan';
}

function isKepalaSekolahGuru(guru?: Guru | null, fallbackJabatan?: string): boolean {
  if (guru) {
    if (guru.jenisPtk === 'kepala_sekolah') return true;
    if (/kepala\s+sekolah|^kepala\s+sd/i.test(guru.jabatan || '')) return true;
  }
  if (fallbackJabatan && /kepala\s+sekolah|^kepala\s+sd/i.test(fallbackJabatan)) {
    return true;
  }
  return false;
}

const MAX_BUKTI_BYTES = 650 * 1024;

function formatBuktiSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export const PresensiPtkTab: React.FC<PresensiPtkTabProps> = ({
  guruList,
  sekolah,
  suratKeluarList,
  arsipList = [],
  userRole = 'guru',
  onAddSuratKeluar,
  onUpdateSuratKeluar,
  onDeleteSuratKeluar,
  onPreviewSuratKeluar,
  onOpenCetakPresensiPtk,
}) => {
  const isAdmin = userRole === 'admin';
  const canUseTtdCap = isAdmin;
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'Semua' | 'Konsep' | 'Disetujui'>('Semua');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  // Form Inline Buat / Edit Surat Ijin PTK (langsung di halaman Presensi PTK)
  const formSectionRef = useRef<HTMLDivElement>(null);
  const buktiInputRef = useRef<HTMLInputElement>(null);
  const [isFormOpen, setIsFormOpen] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tglSurat, setTglSurat] = useState(() => new Date().toISOString().slice(0, 10));
  const [selectedPtkId, setSelectedPtkId] = useState('');
  const [fallbackPtk, setFallbackPtk] = useState<{
    namaGuru: string;
    nipGuru: string;
    pangkatGol: string;
    jabatan: string;
  } | null>(null);
  const [ijinAlasan, setIjinAlasan] = useState('');
  const [ijinTglMulai, setIjinTglMulai] = useState(() => new Date().toISOString().slice(0, 10));
  const [ijinTglSelesai, setIjinTglSelesai] = useState(() => new Date().toISOString().slice(0, 10));
  const [ijinGuruPengganti, setIjinGuruPengganti] = useState('');
  const [selectedPlhId, setSelectedPlhId] = useState('');
  const [kepsekNoSurat, setKepsekNoSurat] = useState('');
  const [ijinTipeDurasi, setIjinTipeDurasi] = useState<'satu_hari' | 'rentang'>('satu_hari');

  const selectedPtkObj = useMemo(
    () => guruList.find((g) => g.id === selectedPtkId) || null,
    [guruList, selectedPtkId]
  );
  const isPemohonKepsek = useMemo(
    () => isKepalaSekolahGuru(selectedPtkObj, fallbackPtk?.jabatan),
    [selectedPtkObj, fallbackPtk]
  );

  const buildAutoKepsekNoSurat = (tanggalStr: string, alasanText: string) => {
    const dateObj = tanggalStr ? new Date(tanggalStr) : new Date();
    const validDate = !isNaN(dateObj.getTime()) ? dateObj : new Date();
    const isSakit = /sakit/i.test(stripRichTags(alasanText || ''));
    const kode = isSakit ? '800.1.11.2' : '800.1.11.1';
    const namaKlas = isSakit
      ? 'Cuti Sakit Pegawai / Guru'
      : 'Surat Perintah Dinas/Surat Tugas';
    const nextSeq = getNextNomorUrut(suratKeluarList, arsipList, validDate);
    const noSurat = generateNomorSurat(kode, nextSeq, sekolah.kodeSuratSekolah || 'SDN1PKT', validDate);
    return { noSurat, kode, namaKlas };
  };

  // Opsional Upload Bukti (Surat Dokter / Surat Tugas / dll)
  const [buktiNama, setBuktiNama] = useState('');
  const [buktiUrl, setBuktiUrl] = useState('');
  const [buktiUkuran, setBuktiUkuran] = useState('');
  const [buktiTipe, setBuktiTipe] = useState('');
  const [buktiError, setBuktiError] = useState('');
  const [formSuccessMsg, setFormSuccessMsg] = useState('');

  // Pratinjau Bukti Lampiran
  const [previewBukti, setPreviewBukti] = useState<{
    nama: string;
    url: string;
    tipe?: string;
    ukuran?: string;
    pemohon?: string;
  } | null>(null);

  // Delete confirmation modal
  const [deleteTarget, setDeleteTarget] = useState<SuratKeluar | null>(null);

  // Word download modal
  const [downloadWordTarget, setDownloadWordTarget] = useState<SuratKeluar | null>(null);
  const [wordTempelTtd, setWordTempelTtd] = useState<boolean>(false);
  const [wordTempelCap, setWordTempelCap] = useState<boolean>(false);
  const [wordPaperSize, setWordPaperSize] = useState<PaperSize>('A4');

  const suratIjinList = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return suratKeluarList
      .filter((sk) => sk.jenisSurat === 'surat_ijin_guru')
      .filter((sk) => {
        if (filterStatus === 'Disetujui' && !isSuratIjinApproved(sk.status)) return false;
        if (filterStatus === 'Konsep' && isSuratIjinApproved(sk.status)) return false;
        if (!q) return true;
        const d = sk.dataKhusus || {};
        return (
          (sk.noSurat || '').toLowerCase().includes(q) ||
          (d.namaGuru || '').toLowerCase().includes(q) ||
          (d.nipGuru || '').toLowerCase().includes(q) ||
          (d.jabatan || '').toLowerCase().includes(q) ||
          stripRichTags(d.alasan || '').toLowerCase().includes(q) ||
          stripRichTags(sk.perihal || '').toLowerCase().includes(q) ||
          (d.guruPengganti || '').toLowerCase().includes(q) ||
          (d.plhNama || '').toLowerCase().includes(q) ||
          (sk.lampiranNama || '').toLowerCase().includes(q)
        );
      })
      .sort(sortOrder === 'desc' ? compareSuratKeluarDesc : compareSuratKeluarAsc);
  }, [suratKeluarList, searchTerm, filterStatus, sortOrder]);

  const scrollToInlineForm = () => {
    setTimeout(() => {
      formSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 60);
  };

  const resetFormToNew = (shouldScroll = false) => {
    const todayStr = new Date().toISOString().slice(0, 10);
    setEditingId(null);
    setTglSurat(todayStr);
    setSelectedPtkId('');
    setFallbackPtk(null);
    setIjinAlasan('');
    setIjinTglMulai(todayStr);
    setIjinTglSelesai(todayStr);
    setIjinTipeDurasi('satu_hari');
    setIjinGuruPengganti('');
    setSelectedPlhId('');
    setKepsekNoSurat('');
    setBuktiNama('');
    setBuktiUrl('');
    setBuktiUkuran('');
    setBuktiTipe('');
    setBuktiError('');
    setIsFormOpen(true);
    if (shouldScroll) {
      setFormSuccessMsg('');
      scrollToInlineForm();
    }
  };

  const openEditIjin = (sk: SuratKeluar) => {
    const d = sk.dataKhusus || {};
    const matchedGuru = guruList.find(
      (g) =>
        (d.ptkId && g.id === d.ptkId) ||
        (d.nipGuru && g.nip && g.nip === d.nipGuru) ||
        (d.namaGuru && g.nama === d.namaGuru)
    );
    const isKepsek = isKepalaSekolahGuru(matchedGuru, d.jabatan);
    const savedPengganti = d.plhNama || d.guruPengganti || '';
    const matchedPlh = guruList.find(
      (g) =>
        (d.plhPtkId && g.id === d.plhPtkId) ||
        (savedPengganti && g.nama === savedPengganti)
    );

    setEditingId(sk.id);
    setTglSurat(sk.tglSurat || new Date().toISOString().slice(0, 10));
    setSelectedPtkId(matchedGuru?.id || '');
    setFallbackPtk(
      matchedGuru
        ? null
        : {
            namaGuru: d.namaGuru || '',
            nipGuru: d.nipGuru || '',
            pangkatGol: d.pangkatGol || '',
            jabatan: d.jabatan || '',
          }
    );
    setIjinAlasan(d.alasan || '');
    setIjinTglMulai(d.tglMulai || sk.tglSurat || '');
    setIjinTglSelesai(d.tglSelesai || d.tglMulai || sk.tglSurat || '');
    const isMultiple = Boolean(d.tglSelesai && d.tglMulai && d.tglSelesai !== d.tglMulai);
    setIjinTipeDurasi(isMultiple ? 'rentang' : 'satu_hari');
    setIjinGuruPengganti(savedPengganti);
    setSelectedPlhId(matchedPlh?.id || '');
    setKepsekNoSurat(
      isKepsek
        ? sk.noSurat && sk.noSurat !== '-'
          ? sk.noSurat
          : buildAutoKepsekNoSurat(sk.tglSurat, d.alasan || '').noSurat
        : ''
    );
    setBuktiNama(sk.lampiranNama || '');
    setBuktiUrl(sk.lampiranUrl || '');
    setBuktiUkuran(sk.lampiranUkuran || '');
    setBuktiTipe(sk.lampiranTipe || '');
    setBuktiError('');
    setFormSuccessMsg('');
    setIsFormOpen(true);
    scrollToInlineForm();
  };

  const handleBuktiFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (file.size > MAX_BUKTI_BYTES) {
      setBuktiError(
        `Ukuran file "${file.name}" (${formatBuktiSize(file.size)}) melebihi batas maksimal 650 KB.`
      );
      return;
    }

    setBuktiError('');
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setBuktiNama(file.name);
        setBuktiUrl(reader.result);
        setBuktiUkuran(formatBuktiSize(file.size));
        setBuktiTipe(file.type || '');
      }
    };
    reader.onerror = () => {
      setBuktiError('Gagal membaca file bukti. Silakan coba pilih ulang.');
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveBukti = () => {
    setBuktiNama('');
    setBuktiUrl('');
    setBuktiUkuran('');
    setBuktiTipe('');
    setBuktiError('');
  };

  const handleSaveIjin = async (e: React.FormEvent) => {
    e.preventDefault();
    const selectedGuru = guruList.find((g) => g.id === selectedPtkId);
    const namaGuru = (selectedGuru?.nama || fallbackPtk?.namaGuru || '').trim();
    if (!namaGuru) return;

    const finalTglSelesai =
      ijinTipeDurasi === 'satu_hari' ? ijinTglMulai : ijinTglSelesai || ijinTglMulai;
    const resolvedKepsek = resolveKepalaSekolahData(sekolah, guruList);
    const isKepsek = isKepalaSekolahGuru(selectedGuru, fallbackPtk?.jabatan);

    const plhGuru =
      guruList.find((g) => g.id === selectedPlhId) ||
      guruList.find((g) => g.nama === ijinGuruPengganti);

    const existingRecord = editingId ? suratKeluarList.find((s) => s.id === editingId) : undefined;
    const existingDataKhusus = existingRecord?.dataKhusus || {};

    const autoNoMeta = isKepsek ? buildAutoKepsekNoSurat(tglSurat, ijinAlasan) : null;
    const finalNoSurat = isKepsek
      ? kepsekNoSurat.trim() || autoNoMeta!.noSurat
      : '-';
    const finalKodeKlasifikasi = isKepsek
      ? autoNoMeta!.kode
      : existingRecord?.kodeKlasifikasi || '800.1.11.5';
    const finalNamaKlasifikasi = isKepsek
      ? autoNoMeta!.namaKlas
      : existingRecord?.namaKlasifikasi ||
        'Cuti Alasan Penting / Permohonan Izin Tidak Masuk Sekolah';

    const finalDataKhusus = {
      ptkId: selectedGuru?.id || '',
      namaGuru,
      nipGuru: (selectedGuru?.nip || fallbackPtk?.nipGuru || '').trim(),
      pangkatGol: (selectedGuru?.pangkatGol || fallbackPtk?.pangkatGol || '').trim(),
      jabatan: (selectedGuru?.jabatan || fallbackPtk?.jabatan || 'Guru Kelas').trim(),
      alasan: ijinAlasan,
      tglMulai: ijinTglMulai,
      tglSelesai: finalTglSelesai,
      guruPengganti: (plhGuru?.nama || ijinGuruPengganti || '').trim(),
      isKepalaSekolah: isKepsek,
      plhPtkId: isKepsek ? plhGuru?.id || existingDataKhusus.plhPtkId || '' : '',
      plhNama: isKepsek
        ? (plhGuru?.nama || ijinGuruPengganti || existingDataKhusus.plhNama || '').trim()
        : '',
      plhNip: isKepsek
        ? (plhGuru?.nip || existingDataKhusus.plhNip || '').trim()
        : '',
      plhJabatan: isKepsek
        ? (plhGuru?.jabatan || existingDataKhusus.plhJabatan || 'Guru Kelas').trim()
        : '',
      plhPangkatGol: isKepsek
        ? (plhGuru?.pangkatGol || existingDataKhusus.plhPangkatGol || '').trim()
        : '',
      pangkatPenandatangan: resolvedKepsek.pangkat,
      pangkatKepalaSekolah: resolvedKepsek.pangkat,
    };

    // Tujuan & Perihal disesuaikan bila pemohon adalah Kepala Sekolah vs PTK biasa
    const schoolNameIsi = formatNamaSekolahIsi(sekolah.namaSekolah);
    const finalTujuan = isKepsek
      ? `Dewan Guru dan Staf ${schoolNameIsi}`
      : `Kepala ${schoolNameIsi}`;
    const finalPerihal = isKepsek
      ? 'Surat Pemberitahuan dan Penugasan Plh. Kepala Sekolah'
      : 'Permohonan Izin Tidak Masuk Sekolah';

    if (editingId && existingRecord) {
      const nextStatus: StatusSuratKeluar = isAdmin
        ? existingRecord.status || 'Konsep'
        : 'Konsep';
      await onUpdateSuratKeluar({
        ...existingRecord,
        jenisSurat: 'surat_ijin_guru',
        noSurat: finalNoSurat,
        kodeKlasifikasi: finalKodeKlasifikasi,
        namaKlasifikasi: finalNamaKlasifikasi,
        tglSurat,
        tujuan: finalTujuan,
        perihal: finalPerihal,
        dataKhusus: finalDataKhusus,
        status: nextStatus,
        penandatangan: isKepsek ? namaGuru : resolvedKepsek.nama,
        nipPenandatangan: isKepsek
          ? (selectedGuru?.nip || resolvedKepsek.nip)
          : resolvedKepsek.nip,
        jabatanPenandatangan: resolvedKepsek.jabatan,
        lampiranNama: buktiNama || '',
        lampiranUrl: buktiUrl || '',
        lampiranUkuran: buktiUkuran || '',
        lampiranTipe: buktiTipe || '',
      });
      setFormSuccessMsg(`Perubahan pengajuan surat ijin atas nama ${namaGuru} berhasil disimpan.`);
    } else {
      await onAddSuratKeluar({
        jenisSurat: 'surat_ijin_guru',
        noSurat: finalNoSurat,
        kodeKlasifikasi: finalKodeKlasifikasi,
        namaKlasifikasi: finalNamaKlasifikasi,
        tglSurat,
        tujuan: finalTujuan,
        perihal: finalPerihal,
        dataKhusus: finalDataKhusus,
        status: 'Konsep',
        penandatangan: isKepsek ? namaGuru : resolvedKepsek.nama,
        nipPenandatangan: isKepsek
          ? (selectedGuru?.nip || resolvedKepsek.nip)
          : resolvedKepsek.nip,
        jabatanPenandatangan: resolvedKepsek.jabatan,
        lampiranNama: buktiNama || '',
        lampiranUrl: buktiUrl || '',
        lampiranUkuran: buktiUkuran || '',
        lampiranTipe: buktiTipe || '',
      });
      setFormSuccessMsg(`Pengajuan surat ijin atas nama ${namaGuru} berhasil dikirim.`);
    }

    resetFormToNew(false);
    setIsFormOpen(false);
  };

  const handleToggleApproval = async (sk: SuratKeluar, approve: boolean) => {
    if (!isAdmin) return;
    await onUpdateSuratKeluar({
      ...sk,
      status: approve ? 'Disetujui' : 'Konsep',
    });
  };

  return (
    <div className="space-y-4">
      {/* 1. Bar Aksi Utama Presensi PTK: Buat Surat Ijin Guru & Cetak Presensi PTK */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-700 text-white flex items-center justify-center shrink-0">
            <ClipboardCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              Presensi &amp; Surat Izin PTK
            </h2>
            <p className="text-xs text-slate-500">
              {suratIjinList.length} surat ijin PTK tercatat
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <button
            type="button"
            onClick={onOpenCetakPresensiPtk}
            className="px-5 py-2.5 bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Blangko Presensi PTK</span>
          </button>
        </div>
      </div>

      {/* 2. Form Inline Buat / Edit Surat Ijin PTK (Langsung di Halaman Presensi PTK) */}
      <div
        ref={formSectionRef}
        className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden scroll-mt-4"
      >
        <div
          className={`px-5 py-3.5 text-white flex flex-wrap items-center justify-between gap-2 ${
            editingId ? 'bg-amber-900' : 'bg-emerald-950'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <UserCheck className="w-5 h-5 text-emerald-300 shrink-0" />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold">
                  Form Pengajuan Surat Ijin
                </h3>
                {editingId && (
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-500/30 text-amber-100 border border-amber-300/30">
                    Mode Edit
                  </span>
                )}
              </div>
              <p className="text-[11px] text-emerald-100/90">
                {isPemohonKepsek
                  ? 'Mode Kepala Sekolah: Menggunakan Kop & Nomor Surat Sekolah serta format Penugasan Pelaksana Harian (Plh.)'
                  : `Ditujukan kepada Kepala ${formatNamaSekolahIsi(sekolah.namaSekolah)} • Dapat dicetak setelah disetujui Kepala Sekolah`}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsFormOpen((prev) => !prev)}
            className="px-3 py-1.5 text-xs font-semibold bg-white/10 hover:bg-white/20 text-white rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            {isFormOpen ? (
              <>
                <ChevronUp className="w-4 h-4" />
                <span>Sembunyikan Form</span>
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4" />
                <span>Tampilkan Form</span>
              </>
            )}
          </button>
        </div>

        {formSuccessMsg && (
          <div className="mx-5 mt-4 px-4 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between gap-2 text-xs font-semibold text-emerald-900">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{formSuccessMsg}</span>
            </div>
            <button
              type="button"
              onClick={() => setFormSuccessMsg('')}
              className="p-1 text-emerald-700 hover:bg-emerald-100 rounded-lg cursor-pointer"
              title="Tutup pesan"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {isFormOpen && (
          <form onSubmit={handleSaveIjin} className="p-5 sm:p-6 space-y-5 text-xs sm:text-sm">
            <div className={`grid grid-cols-1 ${isPemohonKepsek ? 'lg:grid-cols-3' : 'lg:grid-cols-2'} gap-4 sm:gap-5`}>
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">
                  Pilih PTK yang Memohon Izin (Dari Database) *
                </label>
                <select
                  required={!fallbackPtk}
                  value={selectedPtkId}
                  onChange={(e) => {
                    const nextId = e.target.value;
                    setSelectedPtkId(nextId);
                    if (nextId) setFallbackPtk(null);
                    const picked = guruList.find((g) => g.id === nextId);
                    if (isKepalaSekolahGuru(picked)) {
                      if (!kepsekNoSurat) {
                        setKepsekNoSurat(buildAutoKepsekNoSurat(tglSurat, ijinAlasan).noSurat);
                      }
                      if (selectedPlhId === nextId) {
                        setSelectedPlhId('');
                        setIjinGuruPengganti('');
                      }
                    } else {
                      setKepsekNoSurat('');
                    }
                  }}
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 bg-white text-slate-900 font-semibold focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                >
                  <option value="">
                    {fallbackPtk
                      ? `${fallbackPtk.namaGuru} (Data Tersimpan)`
                      : '-- Pilih PTK Pemohon dari Database --'}
                  </option>
                  {guruList.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.nama} — {g.jabatan}
                      {g.nip ? ` (NIP: ${g.nip})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">
                  Tanggal Surat *
                </label>
                <KalenderKecilInput
                  required
                  value={tglSurat}
                  accentColor="emerald"
                  title="Pilih Tanggal Surat"
                  onChange={(nextDate) => {
                    setTglSurat(nextDate);
                    if (isPemohonKepsek && !editingId) {
                      setKepsekNoSurat(buildAutoKepsekNoSurat(nextDate, ijinAlasan).noSurat);
                    }
                  }}
                  className="sm:py-2.5 shadow-2xs"
                />
              </div>

              {isPemohonKepsek && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block font-semibold text-slate-700">
                      Nomor Surat Sekolah *
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        setKepsekNoSurat(buildAutoKepsekNoSurat(tglSurat, ijinAlasan).noSurat)
                      }
                      className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 inline-flex items-center gap-1 cursor-pointer"
                      title="Generate ulang nomor surat sekolah otomatis"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Otomatis</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    value={kepsekNoSurat}
                    onChange={(e) => setKepsekNoSurat(e.target.value)}
                    placeholder="Contoh: 800.1.11.2/001/SDN1PKT/XI/2026"
                    className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 bg-white text-slate-900 font-mono text-xs sm:text-sm focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  />
                </div>
              )}
            </div>

            <div className="p-4 sm:p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-4 sm:space-y-5">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
                <div className="space-y-4">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1.5">
                      Pilihan Durasi Izin
                    </label>
                    <div className="grid grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        onClick={() => {
                          setIjinTipeDurasi('satu_hari');
                          setIjinTglSelesai(ijinTglMulai);
                        }}
                        className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs sm:text-sm font-medium transition-all cursor-pointer ${
                          ijinTipeDurasi === 'satu_hari'
                            ? 'bg-emerald-50 border-emerald-600 text-emerald-800 shadow-sm ring-1 ring-emerald-600'
                            : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <span
                          className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                            ijinTipeDurasi === 'satu_hari'
                              ? 'border-emerald-600'
                              : 'border-slate-400'
                          }`}
                        >
                          {ijinTipeDurasi === 'satu_hari' && (
                            <span className="w-2 h-2 rounded-full bg-emerald-600" />
                          )}
                        </span>
                        <span>Izin 1 Hari (Satu Hari)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setIjinTipeDurasi('rentang')}
                        className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs sm:text-sm font-medium transition-all cursor-pointer ${
                          ijinTipeDurasi === 'rentang'
                            ? 'bg-emerald-50 border-emerald-600 text-emerald-800 shadow-sm ring-1 ring-emerald-600'
                            : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <span
                          className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                            ijinTipeDurasi === 'rentang'
                              ? 'border-emerald-600'
                              : 'border-slate-400'
                          }`}
                        >
                          {ijinTipeDurasi === 'rentang' && (
                            <span className="w-2 h-2 rounded-full bg-emerald-600" />
                          )}
                        </span>
                        <span>Lebih dari 1 Hari (Rentang)</span>
                      </button>
                    </div>
                  </div>

                  {ijinTipeDurasi === 'satu_hari' ? (
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1.5">
                        Tanggal Izin *
                      </label>
                      <KalenderKecilInput
                        required
                        value={ijinTglMulai}
                        accentColor="emerald"
                        title="Pilih Tanggal Izin"
                        onChange={(val) => {
                          setIjinTglMulai(val);
                          setIjinTglSelesai(val);
                        }}
                        className="rounded-xl py-2.5"
                      />
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1.5">
                          Tanggal Mulai Izin *
                        </label>
                        <KalenderKecilInput
                          required
                          value={ijinTglMulai}
                          accentColor="emerald"
                          title="Pilih Tanggal Mulai Izin"
                          onChange={setIjinTglMulai}
                          className="rounded-xl py-2.5"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1.5">
                          Tanggal Selesai Izin *
                        </label>
                        <KalenderKecilInput
                          required
                          value={ijinTglSelesai}
                          accentColor="emerald"
                          title="Pilih Tanggal Selesai Izin"
                          onChange={setIjinTglSelesai}
                          className="rounded-xl py-2.5"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block font-semibold text-slate-700">
                      {isPemohonKepsek
                        ? 'Pelaksana Harian (Plh.) Kepala Sekolah *'
                        : 'Guru Pengganti (Opsional)'}
                    </label>
                    <span className="text-[11px] text-slate-500 italic">
                      {isPemohonKepsek
                        ? 'Pilih guru/PTK sebagai Plh. Kepsek'
                        : 'Kosongkan jika tidak ada'}
                    </span>
                  </div>
                  <select
                    required={isPemohonKepsek && !ijinGuruPengganti}
                    value={
                      selectedPlhId ||
                      guruList.find((g) => g.nama === ijinGuruPengganti)?.id ||
                      (ijinGuruPengganti ? `__legacy__:${ijinGuruPengganti}` : '')
                    }
                    onChange={(e) => {
                      const val = e.target.value;
                      if (!val) {
                        setSelectedPlhId('');
                        setIjinGuruPengganti('');
                        return;
                      }
                      if (val.startsWith('__legacy__:')) {
                        setSelectedPlhId('');
                        setIjinGuruPengganti(val.replace('__legacy__:', ''));
                        return;
                      }
                      const gp = guruList.find((g) => g.id === val);
                      if (gp) {
                        setSelectedPlhId(gp.id);
                        setIjinGuruPengganti(gp.nama);
                      }
                    }}
                    className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  >
                    <option value="">
                      {isPemohonKepsek
                        ? '-- Pilih Pelaksana Harian (Plh.) Kepala Sekolah --'
                        : '-- Tanpa Guru Pengganti (Tidak Ada) --'}
                    </option>
                    {ijinGuruPengganti &&
                      !guruList.some((g) => g.nama === ijinGuruPengganti) && (
                        <option value={`__legacy__:${ijinGuruPengganti}`}>
                          {ijinGuruPengganti} (Tersimpan)
                        </option>
                      )}
                    {guruList
                      .filter((g) => g.id !== selectedPtkId)
                      .map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.nama} ({g.jabatan}
                          {g.nip ? ` • NIP: ${g.nip}` : ''})
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 items-start">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1.5">
                    Alasan Izin / Keperluan
                  </label>
                  <RichTextField
                    multiline={false}
                    placeholder="Contoh: Sakit, Upacara Adat / Yadnya, Tugas Dinas..."
                    value={ijinAlasan}
                    onChange={setIjinAlasan}
                  />
                </div>

                {/* Upload Bukti (Opsional): Surat Dokter / Surat Tugas / dll */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block font-semibold text-slate-700">
                      Upload Bukti Pendukung (Opsional)
                    </label>
                    <span className="text-[11px] text-slate-500">
                      Surat Dokter / Surat Tugas • Maks. 650 KB
                    </span>
                  </div>

                  <input
                    ref={buktiInputRef}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,application/pdf,image/*,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    onChange={handleBuktiFileChange}
                    className="hidden"
                  />

                  {!buktiUrl ? (
                    <button
                      type="button"
                      onClick={() => buktiInputRef.current?.click()}
                      className="w-full px-4 py-2.5 border border-dashed border-slate-300 hover:border-emerald-500 hover:bg-emerald-50/50 bg-white rounded-xl flex items-center justify-center gap-2 text-xs sm:text-sm font-semibold text-slate-700 transition-colors cursor-pointer"
                    >
                      <Upload className="w-4 h-4 text-emerald-700 shrink-0" />
                      <span>Pilih File Bukti (PDF, Foto/Gambar, atau Word)</span>
                    </button>
                  ) : (
                    <div className="px-3.5 py-2 bg-white border border-emerald-200 rounded-xl flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Paperclip className="w-4 h-4 text-emerald-700 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-800 truncate">{buktiNama}</p>
                          {buktiUkuran && (
                            <p className="text-[10.5px] text-slate-500">{buktiUkuran}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() =>
                            setPreviewBukti({
                              nama: buktiNama || 'Bukti Surat Ijin',
                              url: buktiUrl,
                              tipe: buktiTipe,
                              ukuran: buktiUkuran,
                            })
                          }
                          className="px-2.5 py-1 text-[11px] font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Lihat</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => buktiInputRef.current?.click()}
                          className="px-2.5 py-1 text-[11px] font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg cursor-pointer"
                        >
                          Ganti
                        </button>
                        <button
                          type="button"
                          onClick={handleRemoveBukti}
                          className="p-1 text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                          title="Hapus Lampiran Bukti"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}

                  {buktiError && (
                    <p className="mt-1.5 text-[11px] font-semibold text-rose-600 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{buktiError}</span>
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-end gap-2.5">
              {editingId && (
                <button
                  type="button"
                  onClick={() => resetFormToNew(false)}
                  className="px-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Batal Edit
                </button>
              )}
              <button
                type="submit"
                className="px-6 py-2.5 text-xs sm:text-sm font-bold bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>{editingId ? 'Simpan Perubahan' : 'Kirim Pengajuan'}</span>
              </button>
            </div>
          </form>
        )}
      </div>

      {/* 2. Bar Pencarian & Filter Daftar Surat Ijin Guru */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari nama PTK, alasan izin, pengganti..."
              className="w-full text-xs sm:text-sm pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-600 focus:outline-none"
            />
          </div>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as 'Semua' | 'Konsep' | 'Disetujui')}
            className="text-xs border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-teal-600 focus:outline-none bg-white font-semibold text-slate-700"
          >
            <option value="Semua">Semua Persetujuan</option>
            <option value="Konsep">Menunggu Persetujuan</option>
            <option value="Disetujui">Disetujui Kepsek</option>
          </select>
        </div>

        <button
          type="button"
          onClick={() => setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'))}
          className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer shrink-0"
        >
          <ArrowUpDown className="w-3.5 h-3.5 text-teal-700" />
          <span>{sortOrder === 'desc' ? 'Terbaru di Atas' : 'Terlama di Atas'}</span>
        </button>
      </div>

      {/* 3. Tabel Daftar / Agenda Surat Ijin Guru */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
          <h3 className="text-xs sm:text-sm font-bold text-slate-800 uppercase tracking-wide flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-teal-700" />
            <span>Daftar Surat Ijin PTK</span>
          </h3>
          <span className="text-xs font-semibold text-slate-500">
            Menampilkan {suratIjinList.length} data
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[11px] sm:text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold text-[10.5px] uppercase tracking-wider">
                <th className="py-2.5 px-3 w-10 text-center">No</th>
                <th className="py-2.5 px-3">Nama Pemohon &amp; Jabatan</th>
                <th className="py-2.5 px-3">Tanggal &amp; Durasi Izin</th>
                <th className="py-2.5 px-3">Alasan &amp; Guru Pengganti</th>
                <th className="py-2.5 px-3">Persetujuan Kepsek</th>
                <th className="py-2.5 px-3 text-center w-48">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {suratIjinList.map((sk, idx) => {
                const d = sk.dataKhusus || {};
                const tglMulai = d.tglMulai || sk.tglSurat;
                const tglSelesai = d.tglSelesai || tglMulai;
                const isSatuHari = !tglSelesai || tglMulai === tglSelesai;
                const durasi = getDurasiHariIzin(tglMulai, tglSelesai);
                const alasanBersih = stripRichTags(d.alasan || sk.perihal || '-');
                const approved = isSuratIjinApproved(sk.status);
                const isKepsekRow =
                  Boolean(d.isKepalaSekolah) ||
                  /kepala\s+sekolah|^kepala\s+sd/i.test(d.jabatan || '');
                const penggantiNama = d.plhNama || d.guruPengganti || '';

                return (
                  <tr key={sk.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-3 text-center font-medium text-slate-400">
                      {idx + 1}
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-bold text-slate-900 text-xs">
                          {d.namaGuru || '-'}
                        </span>
                        {isKepsekRow && (
                          <span className="px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wide rounded bg-blue-100 text-blue-800 border border-blue-200">
                            Plh. Kepsek
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-500 block">
                        {d.jabatan || 'Guru'}
                        {d.nipGuru ? ` • NIP: ${d.nipGuru}` : ''}
                      </span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        Tgl Surat: {formatTanggalIndonesia(sk.tglSurat)}
                        {isKepsekRow && sk.noSurat && sk.noSurat !== '-'
                          ? ` • No: ${sk.noSurat}`
                          : ''}
                      </span>
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                        <Calendar className="w-3.5 h-3.5 text-teal-700 shrink-0" />
                        <span>
                          {isSatuHari
                            ? formatTanggalIndonesia(tglMulai)
                            : `${formatTanggalIndonesia(tglMulai)} s.d. ${formatTanggalIndonesia(
                                tglSelesai
                              )}`}
                        </span>
                      </div>
                      <span className="inline-block mt-1 px-2 py-0.5 text-[10px] font-bold rounded-md bg-teal-50 text-teal-800 border border-teal-200">
                        {durasi} Hari
                      </span>
                    </td>
                    <td className="py-3 px-3 max-w-xs">
                      <p className="font-medium text-slate-800 leading-snug">{alasanBersih}</p>
                      {penggantiNama && (
                        <p className="text-[11px] text-slate-500 mt-1">
                          {isKepsekRow ? 'Plh. Kepala Sekolah:' : 'Guru Pengganti:'}{' '}
                          <span className="font-semibold text-slate-700">{penggantiNama}</span>
                        </p>
                      )}
                      {sk.lampiranUrl && (
                        <button
                          type="button"
                          onClick={() =>
                            setPreviewBukti({
                              nama: sk.lampiranNama || 'Bukti Pendukung',
                              url: sk.lampiranUrl || '',
                              tipe: sk.lampiranTipe,
                              ukuran: sk.lampiranUkuran,
                              pemohon: d.namaGuru,
                            })
                          }
                          className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 text-[10.5px] font-semibold bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-md transition-colors cursor-pointer"
                          title="Lihat file bukti yang diupload"
                        >
                          <Paperclip className="w-3 h-3 shrink-0" />
                          <span className="truncate max-w-[190px]">
                            Bukti: {sk.lampiranNama || 'Lampiran'}
                          </span>
                        </button>
                      )}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      {approved ? (
                        <span className="inline-flex items-center gap-1 text-[10.5px] font-bold px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>Disetujui Kepsek</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10.5px] font-bold px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200">
                          <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span>Menunggu Persetujuan</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        {isAdmin && (
                          approved ? (
                            <button
                              type="button"
                              onClick={() => handleToggleApproval(sk, false)}
                              className="p-1.5 text-amber-700 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                              title="Batalkan Persetujuan Kepala Sekolah"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleToggleApproval(sk, true)}
                              className="px-2.5 py-1 text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-2xs inline-flex items-center gap-1 transition-colors cursor-pointer"
                              title="Setujui Surat Ijin PTK (Akun Admin / Kepala Sekolah)"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Setujui</span>
                            </button>
                          )
                        )}
                        <button
                          type="button"
                          onClick={() => onPreviewSuratKeluar(sk)}
                          className="p-1.5 text-blue-700 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          title={
                            approved
                              ? 'Lihat Pratinjau & Cetak PDF'
                              : 'Lihat Pratinjau (Cetak PDF aktif setelah disetujui Kepala Sekolah)'
                          }
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          disabled={!approved}
                          onClick={() => {
                            if (!approved) return;
                            setWordTempelTtd(false);
                            setWordTempelCap(false);
                            setWordPaperSize('A4');
                            setDownloadWordTarget(sk);
                          }}
                          className={`p-1.5 rounded-lg transition-colors ${
                            approved
                              ? 'text-emerald-700 hover:bg-emerald-50 cursor-pointer'
                              : 'text-slate-300 cursor-not-allowed'
                          }`}
                          title={
                            approved
                              ? 'Download MS Word (.doc)'
                              : 'Terkunci: Menunggu persetujuan Kepala Sekolah untuk mencetak/unduh'
                          }
                        >
                          <FileSpreadsheet className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditIjin(sk)}
                          className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          title="Edit Surat Ijin"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(sk)}
                          className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Hapus Surat Ijin"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {suratIjinList.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-xs text-slate-400">
                    Belum ada surat ijin PTK yang tercatat.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ==================== MODAL PRATINJAU BUKTI PENDUKUNG ==================== */}
      {previewBukti && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[92vh] overflow-hidden flex flex-col">
            <div className="bg-slate-900 px-5 py-3.5 text-white flex items-center justify-between shrink-0 gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <Paperclip className="w-4 h-4 text-emerald-400 shrink-0" />
                <div className="min-w-0">
                  <h3 className="text-sm font-bold truncate">{previewBukti.nama}</h3>
                  <p className="text-[11px] text-slate-300 truncate">
                    {previewBukti.pemohon ? `Pemohon: ${previewBukti.pemohon}` : 'Pratinjau Bukti Pendukung'}
                    {previewBukti.ukuran ? ` • ${previewBukti.ukuran}` : ''}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={previewBukti.url}
                  download={previewBukti.nama || 'bukti_surat_ijin'}
                  className="px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg inline-flex items-center gap-1.5 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Unduh</span>
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewBukti(null)}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto bg-slate-100 p-3 sm:p-4">
              <LokerFilePreview
                fileUrl={previewBukti.url}
                fileNama={previewBukti.nama}
                fileTipe={previewBukti.tipe}
                judul={previewBukti.nama}
              />
            </div>
          </div>
        </div>
      )}

      {/* ==================== MODAL KONFIRMASI HAPUS ==================== */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="p-6">
              <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mb-4">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">
                Hapus Surat Ijin PTK?
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Hapus surat izin atas nama{' '}
                <strong className="text-slate-900">
                  {deleteTarget.dataKhusus?.namaGuru || deleteTarget.perihal}
                </strong>
                ?
              </p>
            </div>
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200/70 rounded-xl transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={async () => {
                  const target = deleteTarget;
                  setDeleteTarget(null);
                  await onDeleteSuratKeluar(target.id);
                }}
                className="px-4 py-2 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                Ya, Hapus Data
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== MODAL UNDUH MS WORD SURAT IJIN ==================== */}
      {downloadWordTarget && isSuratIjinApproved(downloadWordTarget.status) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <FileText className="w-5 h-5 text-amber-400 shrink-0" />
                <div className="min-w-0">
                  <h3 className="text-sm font-bold truncate">Unduh Dokumen Surat Ijin PTK</h3>
                  <p className="text-[11px] text-slate-300 truncate">
                    Pemohon: {downloadWordTarget.dataKhusus?.namaGuru || '-'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDownloadWordTarget(null)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div className="space-y-2.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Opsi Kolom TTD Kepala Sekolah
                </label>

                {!canUseTtdCap && (
                  <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2 text-amber-900 text-xs font-medium">
                    <Lock className="w-4 h-4 text-amber-700 shrink-0" />
                    <span>
                      Tempel Cap dan TTD Kepala Sekolah pada Surat Ijin PTK hanya dapat dilakukan jika login akun Admin / Kepsek.
                    </span>
                  </div>
                )}

                <button
                  type="button"
                  disabled={!canUseTtdCap || !sekolah?.ttdKepalaSekolahUrl}
                  onClick={() =>
                    canUseTtdCap &&
                    sekolah?.ttdKepalaSekolahUrl &&
                    setWordTempelTtd((prev) => !prev)
                  }
                  className={`w-full px-4 py-3 rounded-xl border text-xs sm:text-sm font-semibold flex items-center justify-between transition-all ${
                    !canUseTtdCap || !sekolah?.ttdKepalaSekolahUrl
                      ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                      : wordTempelTtd
                      ? 'bg-blue-50 text-blue-950 border-blue-600 ring-1 ring-blue-600 cursor-pointer'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 cursor-pointer'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <PenTool className="w-4 h-4 text-blue-800" />
                    <span>Tempel TTD Kepala Sekolah</span>
                  </div>
                  {!canUseTtdCap ? (
                    <span className="text-[11px] font-normal text-amber-700">
                      Khusus Admin / Kepsek
                    </span>
                  ) : !sekolah?.ttdKepalaSekolahUrl ? (
                    <span className="text-[11px] font-normal text-slate-400">Belum diupload</span>
                  ) : (
                    <span
                      className={`w-5 h-5 rounded flex items-center justify-center border ${
                        wordTempelTtd
                          ? 'bg-blue-900 text-white border-blue-900'
                          : 'bg-white border-slate-300'
                      }`}
                    >
                      {wordTempelTtd && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  disabled={!canUseTtdCap || !sekolah?.capSekolahUrl}
                  onClick={() =>
                    canUseTtdCap &&
                    sekolah?.capSekolahUrl &&
                    setWordTempelCap((prev) => !prev)
                  }
                  className={`w-full px-4 py-3 rounded-xl border text-xs sm:text-sm font-semibold flex items-center justify-between transition-all ${
                    !canUseTtdCap || !sekolah?.capSekolahUrl
                      ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                      : wordTempelCap
                      ? 'bg-indigo-50 text-indigo-950 border-indigo-600 ring-1 ring-indigo-600 cursor-pointer'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 cursor-pointer'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Stamp className="w-4 h-4 text-indigo-700" />
                    <span>Tempel Cap Sekolah</span>
                  </div>
                  {!canUseTtdCap ? (
                    <span className="text-[11px] font-normal text-amber-700">
                      Khusus Admin / Kepsek
                    </span>
                  ) : !sekolah?.capSekolahUrl ? (
                    <span className="text-[11px] font-normal text-slate-400">Belum diupload</span>
                  ) : (
                    <span
                      className={`w-5 h-5 rounded flex items-center justify-center border ${
                        wordTempelCap
                          ? 'bg-indigo-700 text-white border-indigo-700'
                          : 'bg-white border-slate-300'
                      }`}
                    >
                      {wordTempelCap && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </span>
                  )}
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Ukuran Kertas
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setWordPaperSize('A4')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      wordPaperSize === 'A4'
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    A4 (210 × 297 mm)
                  </button>
                  <button
                    type="button"
                    onClick={() => setWordPaperSize('F4')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      wordPaperSize === 'F4'
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    F4 / Folio (215 × 330 mm)
                  </button>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2.5">
              <button
                type="button"
                onClick={() => {
                  const sk = downloadWordTarget;
                  setDownloadWordTarget(null);
                  onPreviewSuratKeluar(sk);
                }}
                className="px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200/70 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Eye className="w-4 h-4" />
                <span>Pratinjau / PDF</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setDownloadWordTarget(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200/70 rounded-xl transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const sk = downloadWordTarget;
                    const html = buildSuratHtml(sk, sekolah, guruList, undefined, {
                      tempelTtd:
                        canUseTtdCap && wordTempelTtd && Boolean(sekolah?.ttdKepalaSekolahUrl),
                      tempelCap:
                        canUseTtdCap && wordTempelCap && Boolean(sekolah?.capSekolahUrl),
                    });
                    const isKepsekDoc =
                      Boolean(sk.dataKhusus?.isKepalaSekolah) ||
                      /kepala\s+sekolah|^kepala\s+sd/i.test(sk.dataKhusus?.jabatan || '');
                    const rawTargetName = isKepsekDoc
                      ? sk.dataKhusus?.plhNama || sk.dataKhusus?.guruPengganti || 'Kepsek'
                      : sk.dataKhusus?.namaGuru || 'PTK';
                    const safeName = rawTargetName.replace(/[^a-zA-Z0-9_-]+/g, '_');
                    exportToWord(
                      isKepsekDoc ? `Surat_Penugasan_Plh_${safeName}` : `Surat_Ijin_${safeName}`,
                      html,
                      wordPaperSize
                    );
                    setDownloadWordTarget(null);
                  }}
                  className="px-4 py-2 text-xs font-bold text-white bg-blue-700 hover:bg-blue-600 rounded-xl shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <FileText className="w-4 h-4" />
                  <span>Download Word (.doc)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
