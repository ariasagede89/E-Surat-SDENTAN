import React, { useState, useEffect } from 'react';
import {
  X,
  Copy,
  Check,
  Sparkles,
  BookOpen,
  UserCheck,
  Search,
  ArrowRight,
  ArrowLeft,
  FileText,
  ExternalLink,
  Upload,
  Paperclip,
  CheckCircle,
  AlertCircle,
  Building,
  Calendar,
  Tag,
  Trash2,
} from 'lucide-react';
import {
  cariKlasifikasi,
  generateNomorSurat,
  getBulanRomawi,
  getNextNomorUrut,
  formatNomorUrut,
  resolveYear,
} from '../utils/numberGenerator';
import {
  KlasifikasiMendagriItem,
  PengaturanSekolah,
  SuratKeluar,
  ArsipSurat,
  Guru,
} from '../types';
import { resolveKepalaSekolahData } from '../utils/exportUtils';
import { readFileAsDataUrl, UploadedFileResult } from '../utils/fileUtils';

interface AutoNumberModalProps {
  isOpen: boolean;
  onClose: () => void;
  sekolah: PengaturanSekolah;
  totalSuratKeluar?: number;
  suratKeluarList?: SuratKeluar[];
  arsipList?: ArsipSurat[];
  guruList?: Guru[];
  onSelectNumber?: (noSurat: string, klasifikasi: KlasifikasiMendagriItem) => void;
  onAddSuratKeluar?: (surat: Omit<SuratKeluar, 'id' | 'createdAt'>) => void;
  onAddArsip?: (arsip: Omit<ArsipSurat, 'id'>) => void;
  onSuccessNotice?: (msg: string) => void;
  onNavigateToSuratKeluar?: () => void;
}

export const AutoNumberModal: React.FC<AutoNumberModalProps> = ({
  isOpen,
  onClose,
  sekolah,
  totalSuratKeluar = 0,
  suratKeluarList = [],
  arsipList = [],
  guruList = [],
  onSelectNumber,
  onAddSuratKeluar,
  onAddArsip,
  onSuccessNotice,
  onNavigateToSuratKeluar,
}) => {
  // Step Navigation: 'pilih_nomor' (Generator) vs 'form_eksternal' (Catat Surat Eksternal)
  const [step, setStep] = useState<'pilih_nomor' | 'form_eksternal'>('pilih_nomor');

  // Generator State
  const [activeKategori, setActiveKategori] = useState<
    'Semua' | 'Pendidikan Dasar' | 'Kepegawaian'
  >('Semua');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItem, setSelectedItem] = useState<KlasifikasiMendagriItem>(() => {
    return cariKlasifikasi('', 'Pendidikan Dasar')[0];
  });
  const [tanggalSurat, setTanggalSurat] = useState(() => new Date().toISOString().slice(0, 10));

  const calculateSeq = (dateStr?: string) => {
    const targetDate = dateStr || tanggalSurat;
    const targetYear = resolveYear(targetDate);
    return getNextNomorUrut(suratKeluarList, arsipList, targetYear);
  };

  const [nomorUrut, setNomorUrut] = useState(() => calculateSeq());
  const [copied, setCopied] = useState(false);

  // Form State untuk Surat Eksternal (Luar Sistem)
  const resolvedKepsek = resolveKepalaSekolahData(sekolah, guruList);
  const [extPerihal, setExtPerihal] = useState('');
  const [extTujuan, setExtTujuan] = useState('');
  const [extPenandatanganNama, setExtPenandatanganNama] = useState(resolvedKepsek.nama);
  const [extPenandatanganNip, setExtPenandatanganNip] = useState(resolvedKepsek.nip);
  const [extPenandatanganJabatan, setExtPenandatanganJabatan] = useState(resolvedKepsek.jabatan);
  const [extKeterangan, setExtKeterangan] = useState('');
  const [extLokasiFisik, setExtLokasiFisik] = useState('Map Arsip Surat Keluar Eksternal');
  const [extSimpanArsip, setExtSimpanArsip] = useState(true);
  const [extFile, setExtFile] = useState<UploadedFileResult | null>(null);
  const [extFileLoading, setExtFileLoading] = useState(false);
  const [extError, setExtError] = useState('');
  const [isSubmittingExt, setIsSubmittingExt] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setNomorUrut(calculateSeq());
      setStep('pilih_nomor');
      setExtPerihal('');
      setExtTujuan('');
      setExtKeterangan('');
      setExtFile(null);
      setExtError('');
      setIsSubmittingExt(false);
      setExtPenandatanganNama(resolvedKepsek.nama);
      setExtPenandatanganNip(resolvedKepsek.nip);
      setExtPenandatanganJabatan(resolvedKepsek.jabatan);
    }
  }, [isOpen, suratKeluarList, arsipList, totalSuratKeluar]);

  if (!isOpen) return null;

  const filteredItems = cariKlasifikasi(searchTerm, activeKategori);
  const dateObj = new Date(tanggalSurat);
  const nomorSuratOtomatis = generateNomorSurat(
    selectedItem.kode,
    nomorUrut,
    sekolah.kodeSuratSekolah || 'SDN1PKT',
    dateObj
  );

  const handleCopy = () => {
    navigator.clipboard.writeText(nomorSuratOtomatis);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Pilihan 1: Gunakan untuk Buat Surat (Sesuai Template di Sistem)
  const handleUseForTemplate = () => {
    if (onSelectNumber) {
      onSelectNumber(nomorSuratOtomatis, selectedItem);
    }
    if (onNavigateToSuratKeluar) {
      onNavigateToSuratKeluar();
    }
    onClose();
  };

  // Pilihan 2: Buka Form Pencatatan Surat Eksternal
  const handleOpenExternalForm = () => {
    setExtPerihal(selectedItem.uraian || '');
    setExtError('');
    setStep('form_eksternal');
  };

  // File Upload Handler untuk Berkas Eksternal
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setExtFileLoading(true);
    setExtError('');
    try {
      const res = await readFileAsDataUrl(file, 15);
      setExtFile(res);
    } catch (err: any) {
      setExtError(err?.message || 'Gagal membaca berkas dokumen.');
    } finally {
      setExtFileLoading(false);
    }
  };

  // Simpan & Catat Surat Eksternal ke Sistem
  const handleSaveExternal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!extPerihal.trim()) {
      setExtError('Perihal surat eksternal wajib diisi!');
      return;
    }
    if (!extTujuan.trim()) {
      setExtError('Tujuan / penerima surat eksternal wajib diisi!');
      return;
    }

    setIsSubmittingExt(true);
    setExtError('');

    try {
      const newSurat: Omit<SuratKeluar, 'id' | 'createdAt'> = {
        jenisSurat: 'surat_eksternal',
        noSurat: nomorSuratOtomatis,
        kodeKlasifikasi: selectedItem.kode,
        namaKlasifikasi: selectedItem.uraian,
        tglSurat: tanggalSurat,
        tujuan: extTujuan.trim(),
        perihal: extPerihal.trim(),
        isiSurat: extKeterangan.trim(),
        status: 'Terkirim',
        penandatangan: extPenandatanganNama || resolvedKepsek.nama,
        nipPenandatangan: extPenandatanganNip || resolvedKepsek.nip,
        jabatanPenandatangan: extPenandatanganJabatan || resolvedKepsek.jabatan,
        lampiranNama: extFile?.name,
        lampiranUrl: extFile?.url,
        lampiranUkuran: extFile?.size,
        lampiranTipe: extFile?.type,
        dataKhusus: {
          isEksternal: true,
          keterangan:
            extKeterangan.trim() ||
            'Surat dibuat di luar sistem (format eksternal / mandiri). Nomor resmi diagendakan ke sistem.',
          lokasiFisik: extLokasiFisik.trim() || 'Map Arsip Surat Keluar Eksternal',
        },
      };

      if (onAddSuratKeluar) {
        onAddSuratKeluar(newSurat);
      }

      // Jika opsi simpan arsip dicentang, sekaligus agendakan ke Buku Arsip
      if (extSimpanArsip && onAddArsip) {
        onAddArsip({
          noSurat: nomorSuratOtomatis,
          kodeKlasifikasi: selectedItem.kode,
          perihal: extPerihal.trim(),
          tujuan: extTujuan.trim(),
          tglSurat: tanggalSurat,
          tglArsip: new Date().toISOString().slice(0, 10),
          lokasiFisik: extLokasiFisik.trim() || 'Map Arsip Surat Keluar Eksternal',
          kategori: 'Surat Eksternal',
          keterangan:
            extKeterangan.trim() ||
            'Surat keluar eksternal dibuat di luar sistem, tercatat resmi dalam agenda penomoran.',
          lampiranNama: extFile?.name,
          lampiranUrl: extFile?.url,
          lampiranUkuran: extFile?.size,
          lampiranTipe: extFile?.type,
        });
      }

      if (onSuccessNotice) {
        onSuccessNotice(
          `Nomor surat ${nomorSuratOtomatis} berhasil dicatat ke sistem sebagai Surat Eksternal!`
        );
      }

      if (onNavigateToSuratKeluar) {
        onNavigateToSuratKeluar();
      }

      onClose();
    } catch (err: any) {
      setExtError(err?.message || 'Terjadi kesalahan saat mencatat surat eksternal.');
    } finally {
      setIsSubmittingExt(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden flex flex-col max-h-[92vh] animate-fade-in">
        {/* ======================================================== */}
        {/* STEP 1: GENERATOR & PEMILIHAN PENGGUNAAN NOMOR SURAT     */}
        {/* ======================================================== */}
        {step === 'pilih_nomor' && (
          <>
            {/* Header Modal */}
            <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 px-6 py-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-800/80 rounded-xl text-amber-300 shadow-xs">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold">Minta Nomor Surat Otomatis</h2>
                  <p className="text-xs text-blue-200">
                    Sesuai Permendagri No. 83 Th 2022 (Pendidikan Dasar & Kepegawaian)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-blue-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Tutup"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Live Result Preview Box */}
            <div className="p-4 sm:p-5 bg-gradient-to-b from-blue-50/90 to-indigo-50/50 border-b border-blue-100">
              <div className="text-xs font-semibold text-blue-950 mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-blue-700" />
                  <span>Nomor Surat Resmi Dihasilkan:</span>
                </span>
                <span className="text-[11px] text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full font-mono font-semibold">
                  Bulan Romawi: {getBulanRomawi(dateObj)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-white border-2 border-blue-300 rounded-xl px-4 py-2.5 font-mono font-bold text-sm sm:text-lg text-blue-950 shadow-inner select-all truncate">
                  {nomorSuratOtomatis}
                </div>
                <button
                  type="button"
                  onClick={handleCopy}
                  className={`px-3 py-2.5 rounded-xl font-medium text-xs sm:text-sm flex items-center gap-1.5 transition-all shadow-sm cursor-pointer shrink-0 ${
                    copied
                      ? 'bg-emerald-600 text-white'
                      : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 hover:border-slate-400'
                  }`}
                  title="Salin Nomor Surat"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? 'Tersalin' : 'Salin'}</span>
                </button>
              </div>

              <div className="mt-2 text-xs text-slate-600 flex flex-wrap gap-2 items-center">
                <span className="font-semibold text-blue-900">Perihal Klasifikasi:</span>
                <span className="bg-white px-2 py-0.5 rounded border border-slate-200 font-medium text-slate-800">
                  [{selectedItem.kode}] {selectedItem.uraian}
                </span>
              </div>
            </div>

            {/* Form Settings for Date, Number, & Classification */}
            <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-blue-700" />
                    <span>Tanggal Surat</span>
                  </label>
                  <input
                    type="date"
                    value={tanggalSurat}
                    onChange={(e) => {
                      const newTgl = e.target.value;
                      setTanggalSurat(newTgl);
                      setNomorUrut(calculateSeq(newTgl));
                    }}
                    className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                  <p className="text-[11px] text-blue-700 mt-1 font-medium">
                    Tahun Surat: {dateObj.getFullYear()} (Penomoran mulai 001 di setiap awal tahun)
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                    <span>Nomor Urut Surat Keluar (Th {dateObj.getFullYear()})</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      value={nomorUrut}
                      onChange={(e) => setNomorUrut(parseInt(e.target.value) || 1)}
                      className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 font-mono bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setNomorUrut(calculateSeq(tanggalSurat))}
                      className="text-xs text-blue-700 hover:text-blue-900 whitespace-nowrap bg-blue-50 hover:bg-blue-100 font-semibold px-2.5 py-2 rounded-lg border border-blue-200 transition-colors cursor-pointer"
                      title={`Hitung otomatis nomor urut berikutnya untuk tahun ${dateObj.getFullYear()}`}
                    >
                      Otomatis #{formatNomorUrut(calculateSeq(tanggalSurat))}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 italic">
                    * Otomatis membaca nomor tertinggi dari Surat Keluar & Buku Arsip.
                  </p>
                </div>
              </div>

              {/* Classification Selection Tabs */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-blue-700" />
                    <span>Pilih Kode Klasifikasi Permendagri 83/2022</span>
                  </label>
                  <span className="text-xs text-slate-500 font-medium">
                    Ditemukan: {filteredItems.length} kode
                  </span>
                </div>

                {/* Filter Buttons */}
                <div className="flex gap-1.5 p-1 bg-slate-100 rounded-xl mb-2.5">
                  <button
                    type="button"
                    onClick={() => setActiveKategori('Semua')}
                    className={`flex-1 py-1.5 px-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                      activeKategori === 'Semua'
                        ? 'bg-white text-blue-950 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Semua
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveKategori('Pendidikan Dasar')}
                    className={`flex-1 py-1.5 px-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer ${
                      activeKategori === 'Pendidikan Dasar'
                        ? 'bg-white text-blue-950 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    Pendidikan Dasar (400.3)
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveKategori('Kepegawaian')}
                    className={`flex-1 py-1.5 px-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer ${
                      activeKategori === 'Kepegawaian'
                        ? 'bg-white text-blue-950 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    Kepegawaian (800)
                  </button>
                </div>

                {/* Search Input */}
                <div className="relative mb-2.5">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Cari kode (misal: 400.3.5, 400.3.10, 800.1.11.1) atau nama urusan..."
                    className="w-full text-xs sm:text-sm pl-9 pr-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>

                {/* List of Codes */}
                <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 max-h-44 sm:max-h-52 overflow-y-auto">
                  {filteredItems.map((item) => {
                    const isSelected = selectedItem.kode === item.kode;
                    return (
                      <button
                        type="button"
                        key={item.kode}
                        onClick={() => setSelectedItem(item)}
                        className={`w-full text-left p-2.5 transition-colors flex items-start gap-3 cursor-pointer ${
                          isSelected
                            ? 'bg-blue-50/90 border-l-4 border-blue-600'
                            : 'hover:bg-slate-50'
                        }`}
                      >
                        <span
                          className={`font-mono font-bold text-xs px-2 py-0.5 rounded shrink-0 ${
                            item.kategori === 'Pendidikan Dasar'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {item.kode}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-slate-800 leading-tight">
                            {item.uraian}
                          </p>
                          {item.subUraian && (
                            <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                              {item.subUraian}
                            </p>
                          )}
                        </div>
                      </button>
                    );
                  })}
                  {filteredItems.length === 0 && (
                    <div className="p-4 text-center text-xs text-slate-400">
                      Tidak ada kode klasifikasi yang cocok dengan kata kunci.
                    </div>
                  )}
                </div>
              </div>

              {/* ============================================================= */}
              {/* KETIKA NOMOR SURAT DIAJUKAN: PILIHAN CARA PENGGUNAAN NOMOR   */}
              {/* ============================================================= */}
              <div className="pt-2">
                <div className="p-4 bg-gradient-to-r from-slate-50 via-blue-50/50 to-indigo-50/40 border border-slate-200/90 rounded-2xl space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <span className="text-xs font-bold text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-amber-500" />
                      <span>Ajukan & Pilih Penggunaan Nomor Surat Ini:</span>
                    </span>
                    <span className="text-[11px] text-blue-800 font-semibold bg-blue-100/90 px-2 py-0.5 rounded-md w-max">
                      Kedua pilihan tetap dicatat ke buku agenda
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* PILIHAN 1: Buat Surat Sesuai Template di Sistem */}
                    <button
                      type="button"
                      onClick={handleUseForTemplate}
                      className="p-3.5 bg-white hover:bg-emerald-50/50 border-2 border-emerald-500 hover:border-emerald-600 rounded-xl text-left transition-all shadow-xs group cursor-pointer flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200">
                            Template Sistem
                          </span>
                          <FileText className="w-4 h-4 text-emerald-600 group-hover:scale-110 transition-transform" />
                        </div>
                        <div className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-emerald-950">
                          Gunakan untuk Buat Surat
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                          Buat surat sesuai template di sistem (Surat Tugas, Undangan, Keterangan, SK, Pengantar, Rekomendasi).
                        </p>
                      </div>
                      <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-emerald-700">
                        <span>Pilih Template Sistem</span>
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </button>

                    {/* PILIHAN 2: Buat Surat Eksternal (Tidak Ada di Sistem) */}
                    <button
                      type="button"
                      onClick={handleOpenExternalForm}
                      className="p-3.5 bg-white hover:bg-indigo-50/50 border-2 border-indigo-500 hover:border-indigo-600 rounded-xl text-left transition-all shadow-xs group cursor-pointer flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-md bg-indigo-100 text-indigo-800 border border-indigo-200">
                            Luar Sistem
                          </span>
                          <ExternalLink className="w-4 h-4 text-indigo-600 group-hover:scale-110 transition-transform" />
                        </div>
                        <div className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-indigo-950">
                          Gunakan untuk Buat Surat Eksternal
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                          Buat surat tidak ada di sistem (dibuat di MS Word / fisik / format khusus). Nomor langsung dicatat resmi.
                        </p>
                      </div>
                      <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-indigo-700">
                        <span>Catat Surat Eksternal</span>
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs sm:text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
              >
                Tutup
              </button>
              <div className="text-xs text-slate-500 italic hidden sm:block">
                Pilih salah satu tombol di atas untuk mengajukan dan mencatat nomor surat ini.
              </div>
            </div>
          </>
        )}

        {/* ======================================================== */}
        {/* STEP 2: FORM PENCATATAN SURAT EKSTERNAL (LUAR SISTEM)    */}
        {/* ======================================================== */}
        {step === 'form_eksternal' && (
          <form onSubmit={handleSaveExternal} className="flex flex-col h-full max-h-[92vh]">
            {/* Header Modal Form Eksternal */}
            <div className="bg-gradient-to-r from-indigo-900 via-blue-900 to-slate-900 px-6 py-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setStep('pilih_nomor')}
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                  title="Kembali ke Pemilihan Nomor"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                  <h2 className="text-base sm:text-lg font-bold">Catat Surat Keluar Eksternal</h2>
                  <p className="text-xs text-blue-200">
                    Mencatat naskah surat di luar template sistem agar nomor urut agenda resmi tetap terjaga
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-blue-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Tutup"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Banner Nomor Surat yang Sedang Dicatat */}
            <div className="p-4 bg-indigo-50/90 border-b border-indigo-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-[10px] font-bold text-indigo-900 uppercase tracking-wider block">
                  Nomor Surat Resmi yang Digunakan:
                </span>
                <span className="font-mono font-bold text-sm sm:text-base text-indigo-950">
                  {nomorSuratOtomatis}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="px-2.5 py-1 rounded-md bg-white border border-indigo-200 font-medium text-slate-800">
                  [{selectedItem.kode}] {selectedItem.uraian}
                </span>
                <span className="px-2.5 py-1 rounded-md bg-indigo-100 text-indigo-900 font-semibold font-mono">
                  {tanggalSurat}
                </span>
              </div>
            </div>

            {/* Body Form */}
            <div className="p-5 overflow-y-auto flex-1 space-y-4 text-xs sm:text-sm">
              {extError && (
                <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl text-xs text-rose-800 flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span className="font-medium">{extError}</span>
                </div>
              )}

              {/* Perihal Surat Eksternal */}
              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Perihal / Hal Surat Eksternal <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={extPerihal}
                  onChange={(e) => setExtPerihal(e.target.value)}
                  placeholder="Contoh: Permohonan Bantuan Dana Renovasi Ruang Kelas / Surat Kerjasama Kegiatan"
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 bg-white text-slate-900 font-medium focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Tuliskan perihal surat yang dibuat di luar sistem untuk keperluan buku agenda surat keluar.
                </p>
              </div>

              {/* Tujuan / Penerima */}
              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Tujuan / Penerima Surat <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={extTujuan}
                  onChange={(e) => setExtTujuan(e.target.value)}
                  placeholder="Contoh: Kepala Dinas Lingkungan Hidup Kab. Jembrana / Camat Pekutatan"
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 bg-white text-slate-900 font-medium focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                />
              </div>

              {/* Penandatangan */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">
                    Pejabat Penandatangan
                  </label>
                  <select
                    value={extPenandatanganNama}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === resolvedKepsek.nama) {
                        setExtPenandatanganNama(resolvedKepsek.nama);
                        setExtPenandatanganNip(resolvedKepsek.nip);
                        setExtPenandatanganJabatan(resolvedKepsek.jabatan);
                      } else {
                        const foundGuru = guruList.find((g) => g.nama === val);
                        if (foundGuru) {
                          setExtPenandatanganNama(foundGuru.nama);
                          setExtPenandatanganNip(foundGuru.nip);
                          setExtPenandatanganJabatan(foundGuru.jabatan);
                        } else {
                          setExtPenandatanganNama(val);
                        }
                      }
                    }}
                    className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-xs focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                  >
                    <option value={resolvedKepsek.nama}>
                      {resolvedKepsek.nama} (Kepala Sekolah - {resolvedKepsek.nip})
                    </option>
                    {guruList
                      .filter((g) => g.nama !== resolvedKepsek.nama)
                      .map((g) => (
                        <option key={g.id} value={g.nama}>
                          {g.nama} ({g.jabatan} - NIP. {g.nip || '-'})
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Jabatan Penandatangan
                  </label>
                  <input
                    type="text"
                    value={extPenandatanganJabatan}
                    onChange={(e) => setExtPenandatanganJabatan(e.target.value)}
                    placeholder="Kepala Sekolah"
                    className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-xs focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                  />
                </div>
              </div>

              {/* Keterangan Naskah / Dokumen Fisik */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Keterangan Naskah / Lokasi Dokumen Fisik <span className="text-slate-400 font-normal">(Opsional)</span>
                </label>
                <textarea
                  rows={2}
                  value={extKeterangan}
                  onChange={(e) => setExtKeterangan(e.target.value)}
                  placeholder="Contoh: Dokumen diketik menggunakan template Word khusus oleh staf TU, naskah fisik disimpan di lemari arsip surat keluar."
                  className="w-full border border-slate-300 rounded-xl p-2.5 bg-white text-xs focus:ring-2 focus:ring-indigo-600 focus:outline-none leading-relaxed"
                />
              </div>

              {/* Upload Berkas Dokumen (Opsional) */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <label className="block font-semibold text-slate-700 text-xs">
                  Unggah Salinan / Scan Berkas Surat Eksternal <span className="text-slate-400 font-normal">(Opsional)</span>
                </label>
                <p className="text-[11px] text-slate-500">
                  Anda dapat melampirkan berkas PDF, Word (.docx), atau foto scan dokumen surat ini (maks. 15MB).
                </p>

                {extFile ? (
                  <div className="flex items-center justify-between p-2.5 bg-white border border-indigo-200 rounded-lg">
                    <div className="flex items-center gap-2 min-w-0">
                      <Paperclip className="w-4 h-4 text-indigo-600 shrink-0" />
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-800 text-xs truncate">{extFile.name}</p>
                        <p className="text-[10px] text-slate-500 font-mono">{extFile.size}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setExtFile(null)}
                      className="p-1 text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                      title="Hapus Berkas"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div>
                    <input
                      type="file"
                      id="input-file-eksternal"
                      onChange={handleFileUpload}
                      className="hidden"
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    />
                    <label
                      htmlFor="input-file-eksternal"
                      className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-slate-300 hover:border-indigo-400 rounded-lg text-xs font-semibold text-slate-700 hover:text-indigo-800 transition-colors cursor-pointer shadow-2xs"
                    >
                      <Upload className="w-3.5 h-3.5 text-indigo-600" />
                      <span>{extFileLoading ? 'Membaca berkas...' : 'Pilih Berkas Lampiran'}</span>
                    </label>
                  </div>
                )}
              </div>

              {/* Checkbox Simpan ke Buku Arsip */}
              <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-xl">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={extSimpanArsip}
                    onChange={(e) => setExtSimpanArsip(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-700 border-slate-300 focus:ring-indigo-600 mt-0.5 cursor-pointer"
                  />
                  <div className="text-xs">
                    <span className="font-bold text-slate-800 block">
                      Sekaligus simpan ke Buku Agenda Arsip Surat Keluar (Direkomendasikan)
                    </span>
                    <span className="text-slate-500 text-[11px] block mt-0.5">
                      Nomor surat akan langsung tercatat di tabel Surat Keluar dan Buku Arsip Digital sekolah.
                    </span>
                  </div>
                </label>
              </div>
            </div>

            {/* Footer Form Eksternal */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setStep('pilih_nomor')}
                className="px-4 py-2 text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Kembali</span>
              </button>

              <button
                type="submit"
                disabled={isSubmittingExt}
                className="px-5 py-2.5 text-xs sm:text-sm font-bold bg-indigo-700 hover:bg-indigo-800 disabled:opacity-50 text-white rounded-xl shadow-sm flex items-center gap-2 transition-colors cursor-pointer"
              >
                <CheckCircle className="w-4 h-4" />
                <span>{isSubmittingExt ? 'Mencatat Nomor...' : 'Simpan & Catat Nomor ke Sistem'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
