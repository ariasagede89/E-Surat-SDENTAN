import React, { useState, useRef } from 'react';
import {
  Users,
  GraduationCap,
  Upload,
  Download,
  Printer,
  Plus,
  Trash2,
  Edit,
  Search,
  CheckCircle2,
  FileSpreadsheet,
  X,
  AlertCircle,
  Calendar,
  CalendarDays,
  FileText,
  Info,
  RotateCcw,
  Check,
  Settings2,
  ChevronDown,
} from 'lucide-react';
import { Guru, Siswa, PengaturanSekolah, KategoriPTK, PaperSize } from '../types';
import {
  exportToCsv,
  buildAbsenGuruHtml,
  buildAbsenPTKHtml,
  buildAbsenSiswaHtml,
  printHtmlElement,
  printLandscapeHtml,
  exportAbsenPTKToWord,
} from '../utils/exportUtils';
import {
  parseSiswaCsv,
  parseGuruCsv,
  downloadSiswaTemplateCsv,
  downloadGuruTemplateCsv,
  sortSiswa,
  compareKelas,
} from '../utils/csvUtils';
import { KalenderKecilLibur, NAMA_BULAN_INDONESIA } from './KalenderKecilLibur';

interface GuruSiswaViewProps {
  guruList: Guru[];
  siswaList: Siswa[];
  sekolah: PengaturanSekolah;
  onAddGuru: (guru: Omit<Guru, 'id'>) => void;
  onUpdateGuru: (guru: Guru) => void;
  onDeleteGuru: (id: string) => void;
  onImportGuru: (gurus: Omit<Guru, 'id'>[]) => void;
  onAddSiswa: (siswa: Omit<Siswa, 'id'>) => void;
  onUpdateSiswa: (siswa: Siswa) => void;
  onDeleteSiswa: (id: string) => void;
  onImportSiswa: (siswas: Omit<Siswa, 'id'>[], mode?: 'merge' | 'replace' | 'append') => void;
  onClearAllSiswa?: () => void;
  onResetSiswaDefault?: () => void;
}

export const GuruSiswaView: React.FC<GuruSiswaViewProps> = ({
  guruList,
  siswaList,
  sekolah,
  onAddGuru,
  onUpdateGuru,
  onDeleteGuru,
  onImportGuru,
  onAddSiswa,
  onUpdateSiswa,
  onDeleteSiswa,
  onImportSiswa,
  onClearAllSiswa,
  onResetSiswaDefault,
}) => {
  const [activeTab, setActiveTab] = useState<'guru' | 'siswa'>('guru');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterKelasSiswa, setFilterKelasSiswa] = useState<string>('Semua');

  // Helper Hari Libur Default (Hari Minggu)
  const getInitialSundays = (year: number, month: number) => {
    const h: Record<number, string> = {};
    const totalDays = new Date(year, month, 0).getDate();
    for (let d = 1; d <= totalDays; d++) {
      const dayOfWeek = new Date(year, month - 1, d).getDay();
      if (dayOfWeek === 0) {
        h[d] = 'Hari Minggu';
      }
    }
    return h;
  };

  // State Cetak Absen & Kalender Libur
  const [showCetakAbsenGuruModal, setShowCetakAbsenGuruModal] = useState(false);
  const [showCetakAbsenSiswaModal, setShowCetakAbsenSiswaModal] = useState(false);

  const [absenYear, setAbsenYear] = useState(2026);
  const [absenMonth, setAbsenMonth] = useState(9); // September
  const [absenHolidays, setAbsenHolidays] = useState<Record<number, string>>(() =>
    getInitialSundays(2026, 9)
  );

  // Opsi Cetak PTK (Pendidik & Tenaga Kependidikan)
  // Format kolektif terbagi rapi per lembar F4 Landscape (Format Standar Kedinasan: 5 PTK per lembar)
  const [ptkCetakMode, setPtkCetakMode] = useState<'kolektif_per_lembar' | 'rekap_bulanan' | 'kolektif'>('kolektif_per_lembar');
  const [ptkFilterCetak, setPtkFilterCetak] = useState<'semua' | 'kepala_sekolah' | 'guru' | 'tu'>('semua');
  const [ptkPerPageCetak, setPtkPerPageCetak] = useState<number>(5);
  const [ptkPaperSizeCetak, setPtkPaperSizeCetak] = useState<PaperSize>('F4');
  const [ptkShowKopCetak, setPtkShowKopCetak] = useState<boolean>(false); // Pilihan utama: Tanpa KOP

  // Opsi Cetak Siswa
  const [siswaKelasCetak, setSiswaKelasCetak] = useState<string>('6A');
  const [siswaSemesterCetak, setSiswaSemesterCetak] = useState<string>('Ganjil');
  const [siswaTahunAjaranCetak, setSiswaTahunAjaranCetak] = useState<string>('2026/2027');
  const [siswaShowKopCetak, setSiswaShowKopCetak] = useState<boolean>(false); // Pilihan utama: Tanpa KOP

  const handleMonthChange = (newMonth: number) => {
    setAbsenMonth(newMonth);
    setAbsenHolidays(getInitialSundays(absenYear, newMonth));
  };

  const handleYearChange = (newYear: number) => {
    setAbsenYear(newYear);
    setAbsenHolidays(getInitialSundays(newYear, absenMonth));
  };

  const handleToggleHoliday = (day: number, note?: string) => {
    setAbsenHolidays((prev) => {
      const copy = { ...prev };
      if (copy[day]) {
        delete copy[day];
      } else {
        copy[day] = note || 'Hari Libur';
      }
      return copy;
    });
  };

  const handleSetHolidayPreset = (preset: 'minggu' | 'sabtu_minggu' | 'reset') => {
    const totalDays = new Date(absenYear, absenMonth, 0).getDate();
    const newHolidays: Record<number, string> = {};
    if (preset === 'reset') {
      setAbsenHolidays({});
      return;
    }
    for (let d = 1; d <= totalDays; d++) {
      const dayOfWeek = new Date(absenYear, absenMonth - 1, d).getDay();
      if (dayOfWeek === 0) {
        newHolidays[d] = 'Hari Minggu';
      } else if (preset === 'sabtu_minggu' && dayOfWeek === 6) {
        newHolidays[d] = 'Hari Sabtu';
      }
    }
    setAbsenHolidays(newHolidays);
  };

  const openCetakGuruModal = () => {
    setShowCetakAbsenGuruModal(true);
  };

  const openCetakSiswaModal = (preselectedKelas?: string) => {
    if (preselectedKelas) {
      setSiswaKelasCetak(preselectedKelas);
    }
    setShowCetakAbsenSiswaModal(true);
  };

  const doPrintAbsenGuru = () => {
    const bulanNama = `${NAMA_BULAN_INDONESIA[absenMonth - 1]} ${absenYear}`;
    const html = buildAbsenGuruHtml(guruList, sekolah, {
      guruList,
      sekolah,
      year: absenYear,
      month: absenMonth,
      bulanNama,
      holidays: absenHolidays,
      mode: ptkCetakMode,
      ptkPerPage: ptkPerPageCetak,
      filterKategori: ptkFilterCetak,
      showKop: ptkShowKopCetak,
    });
    printLandscapeHtml(
      html,
      `Presensi PTK - ${bulanNama} (${ptkPaperSizeCetak} Landscape)`,
      ptkPaperSizeCetak
    );
  };

  const doExportWordAbsenGuru = () => {
    const bulanNama = `${NAMA_BULAN_INDONESIA[absenMonth - 1]} ${absenYear}`;
    exportAbsenPTKToWord(
      guruList,
      sekolah,
      {
        guruList,
        sekolah,
        year: absenYear,
        month: absenMonth,
        bulanNama,
        holidays: absenHolidays,
        mode: ptkCetakMode,
        ptkPerPage: ptkPerPageCetak,
        filterKategori: ptkFilterCetak,
        showKop: ptkShowKopCetak,
      },
      ptkPaperSizeCetak
    );
  };

  const doPrintAbsenSiswa = () => {
    const bulanNama = `${NAMA_BULAN_INDONESIA[absenMonth - 1]} ${absenYear}`;
    const html = buildAbsenSiswaHtml(siswaList, siswaKelasCetak, sekolah, {
      siswaList,
      kelas: siswaKelasCetak,
      sekolah,
      year: absenYear,
      month: absenMonth,
      bulanNama,
      holidays: absenHolidays,
      semester: siswaSemesterCetak,
      tahunAjaran: siswaTahunAjaranCetak,
      showKop: siswaShowKopCetak,
    });
    printLandscapeHtml(
      html,
      `Presensi Siswa Kelas ${siswaKelasCetak} - ${bulanNama}`
    );
  };

  // Modals
  const [showGuruModal, setShowGuruModal] = useState(false);
  const [showSiswaModal, setShowSiswaModal] = useState(false);

  // Form Guru/PTK State
  const [guruId, setGuruId] = useState<string | null>(null);
  const [gNama, setGNama] = useState('');
  const [gNip, setGNip] = useState('');
  const [gNuptk, setGNuptk] = useState('');
  const [gJenisPtk, setGJenisPtk] = useState<KategoriPTK>('guru');
  const [gStatus, setGStatus] = useState<string>('PNS');
  const [gPangkat, setGPangkat] = useState('');
  const [gJabatan, setGJabatan] = useState('');
  const [gEmail, setGEmail] = useState('');
  const [gNoHp, setGNoHp] = useState('');

  // Filter Kategori PTK di Tabel
  const [filterKategoriPTK, setFilterKategoriPTK] = useState<'semua' | 'kepala_sekolah' | 'guru' | 'tu'>('semua');

  // Form Siswa State
  const [siswaId, setSiswaId] = useState<string | null>(null);
  const [sNis, setSNis] = useState('');
  const [sNisn, setSNisn] = useState('');
  const [sNama, setSNama] = useState('');
  const [sKelas, setSKelas] = useState('1');
  const [sJenisKelamin, setSJenisKelamin] = useState<'L' | 'P'>('L');
  const [sTempatLahir, setSTempatLahir] = useState('Jembrana');
  const [sTglLahir, setSTglLahir] = useState('2014-05-12');
  const [sNamaOrtu, setSNamaOrtu] = useState('');
  const [sAlamat, setSAlamat] = useState('Pekutatan');

  // Internal Delete Confirmation State (solves iframe window.confirm blocking)
  const [deleteConfirm, setDeleteConfirm] = useState<{
    type: 'guru' | 'siswa';
    id: string;
    nama: string;
  } | null>(null);

  // Import Siswa Preview State & Options
  const [importSiswaPreview, setImportSiswaPreview] = useState<{
    filename: string;
    data: Omit<Siswa, 'id'>[];
    total: number;
    detectedHeaders: string[];
  } | null>(null);
  const [importMode, setImportMode] = useState<'merge' | 'replace' | 'append'>('merge');
  const [showDataOptionsDropdown, setShowDataOptionsDropdown] = useState(false);
  const [showResetConfirmModal, setShowResetConfirmModal] = useState(false);
  const [showClearConfirmModal, setShowClearConfirmModal] = useState(false);

  const fileInputGuruRef = useRef<HTMLInputElement>(null);
  const fileInputSiswaRef = useRef<HTMLInputElement>(null);

  // Export Data PTK CSV
  const handleExportGuru = () => {
    const data = guruList.map((g, idx) => ({
      No: idx + 1,
      NIP: g.nip,
      NUPTK: g.nuptk || '-',
      'Nama Lengkap': g.nama,
      'Jenis PTK':
        g.jenisPtk === 'kepala_sekolah'
          ? 'Kepala Sekolah'
          : g.jenisPtk === 'tu'
          ? 'Tata Usaha (TU)'
          : 'Guru',
      Status: g.status || 'PNS',
      'Pangkat / Golongan': g.pangkatGol,
      Jabatan: g.jabatan,
      Email: g.email || '-',
      'No Handphone': g.noHp || '-',
    }));
    exportToCsv('Data_PTK_SDN_1_Pekutatan', data);
  };

  // Export Data Siswa CSV
  const handleExportSiswa = () => {
    const sorted = sortSiswa<Siswa>(siswaList);
    const data = sorted.map((s, idx) => ({
      No: idx + 1,
      NIS: s.nis,
      NISN: s.nisn,
      'Nama Siswa': s.nama,
      Kelas: s.kelas,
      'Jenis Kelamin': s.jenisKelamin,
      'Tempat Lahir': s.tempatLahir,
      'Tanggal Lahir': s.tglLahir,
      'Nama Orang Tua / Wali': s.namaOrtu,
      Alamat: s.alamat,
    }));
    exportToCsv('Data_Siswa_SDN_1_Pekutatan', data);
  };

  // Import PTK via CSV (Header-aware & robust parser)
  const handleUploadGuruCsv = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      const res = parseGuruCsv(text);
      if (!res.success || res.data.length === 0) {
        alert(res.errors.join('\n') || 'File CSV kosong atau format data PTK tidak sesuai.');
        return;
      }

      onImportGuru(res.data);
      alert(`Berhasil mengimpor ${res.data.length} data PTK!`);
    };
    reader.readAsText(file);
    if (fileInputGuruRef.current) fileInputGuruRef.current.value = '';
  };

  // Import Siswa via CSV (Header-aware, respects export structure, opens interactive preview)
  const handleUploadSiswaCsv = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      const res = parseSiswaCsv(text);
      if (!res.success || res.data.length === 0) {
        alert(res.errors.join('\n') || 'File CSV tidak memiliki baris data siswa yang valid.');
        return;
      }

      // Open preview modal with detected columns and data
      setImportSiswaPreview({
        filename: file.name,
        data: res.data,
        total: res.totalRows,
        detectedHeaders: res.detectedHeaders,
      });
      setImportMode('merge');
    };
    reader.readAsText(file);
    if (fileInputSiswaRef.current) fileInputSiswaRef.current.value = '';
  };

  // Cetak Absen Guru (Membuka Dialog Cetak dengan Kalender Libur)
  const handlePrintAbsenGuru = () => {
    openCetakGuruModal();
  };

  // Cetak Absen Siswa (Membuka Dialog Cetak dengan Kalender Libur)
  const handlePrintAbsenSiswa = () => {
    openCetakSiswaModal(filterKelasSiswa !== 'Semua' ? filterKelasSiswa : (availableKelas[0] || '6A'));
  };

  const openGuruModal = (guru?: Guru) => {
    if (guru) {
      setGuruId(guru.id);
      setGNama(guru.nama);
      setGNip(guru.nip);
      setGNuptk(guru.nuptk || '');
      setGJenisPtk(
        guru.jenisPtk ||
          (guru.jabatan?.toLowerCase().includes('kepala sekolah')
            ? 'kepala_sekolah'
            : guru.jabatan?.toLowerCase().includes('tu') ||
              guru.jabatan?.toLowerCase().includes('tata usaha') ||
              guru.jabatan?.toLowerCase().includes('operator') ||
              guru.jabatan?.toLowerCase().includes('administrasi')
            ? 'tu'
            : 'guru')
      );
      setGStatus(guru.status || 'PNS');
      setGPangkat(guru.pangkatGol);
      setGJabatan(guru.jabatan);
      setGEmail(guru.email || '');
      setGNoHp(guru.noHp || '');
    } else {
      setGuruId(null);
      setGNama('');
      setGNip('');
      setGNuptk('');
      setGJenisPtk('guru');
      setGStatus('PNS');
      setGPangkat('Penata Muda Tk. I / III-b');
      setGJabatan('Guru Kelas');
      setGEmail('');
      setGNoHp('');
    }
    setShowGuruModal(true);
  };

  const handleSaveGuru = (e: React.FormEvent) => {
    e.preventDefault();
    if (!gNama || !gNip) {
      alert('Nama PTK dan NIP wajib diisi!');
      return;
    }

    if (guruId) {
      onUpdateGuru({
        id: guruId,
        nama: gNama,
        nip: gNip,
        nuptk: gNuptk.trim() || '',
        jenisPtk: gJenisPtk,
        status: gStatus,
        pangkatGol: gPangkat,
        jabatan: gJabatan,
        email: gEmail,
        noHp: gNoHp,
      });
    } else {
      onAddGuru({
        nama: gNama,
        nip: gNip,
        nuptk: gNuptk.trim() || '',
        jenisPtk: gJenisPtk,
        status: gStatus,
        pangkatGol: gPangkat,
        jabatan: gJabatan,
        email: gEmail,
        noHp: gNoHp,
      });
    }
    setShowGuruModal(false);
  };

  const openSiswaModal = (siswa?: Siswa) => {
    if (siswa) {
      setSiswaId(siswa.id);
      setSNis(siswa.nis);
      setSNisn(siswa.nisn);
      setSNama(siswa.nama);
      setSKelas(siswa.kelas);
      setSJenisKelamin(siswa.jenisKelamin);
      setSTempatLahir(siswa.tempatLahir);
      setSTglLahir(siswa.tglLahir);
      setSNamaOrtu(siswa.namaOrtu);
      setSAlamat(siswa.alamat);
    } else {
      setSiswaId(null);
      setSNis(String(1000 + siswaList.length + 1));
      setSNisn(`00${Math.floor(10000000 + Math.random() * 90000000)}`);
      setSNama('');
      setSKelas('1');
      setSJenisKelamin('L');
      setSTempatLahir('Jembrana');
      setSTglLahir('2014-05-12');
      setSNamaOrtu('');
      setSAlamat('Pekutatan, Jembrana');
    }
    setShowSiswaModal(true);
  };

  const handleSaveSiswa = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sNama || !sNisn) {
      alert('Nama siswa dan NISN wajib diisi!');
      return;
    }

    if (siswaId) {
      onUpdateSiswa({
        id: siswaId,
        nis: sNis,
        nisn: sNisn,
        nama: sNama,
        kelas: sKelas,
        jenisKelamin: sJenisKelamin,
        tempatLahir: sTempatLahir,
        tglLahir: sTglLahir,
        namaOrtu: sNamaOrtu,
        alamat: sAlamat,
      });
    } else {
      onAddSiswa({
        nis: sNis,
        nisn: sNisn,
        nama: sNama,
        kelas: sKelas,
        jenisKelamin: sJenisKelamin,
        tempatLahir: sTempatLahir,
        tglLahir: sTglLahir,
        namaOrtu: sNamaOrtu,
        alamat: sAlamat,
      });
    }
    setShowSiswaModal(false);
  };

  const filteredGuru = guruList.filter((g) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      g.nama.toLowerCase().includes(term) ||
      g.nip.includes(term) ||
      (g.nuptk && g.nuptk.includes(term)) ||
      g.jabatan.toLowerCase().includes(term);
    const matchesKategori =
      filterKategoriPTK === 'semua' || g.jenisPtk === filterKategoriPTK;
    return matchesSearch && matchesKategori;
  });

  const filteredSiswa = sortSiswa<Siswa>(
    siswaList.filter((s) => {
      const matchesSearch =
        s.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.nisn.includes(searchTerm) ||
        s.nis.includes(searchTerm);
      const matchesKelas = filterKelasSiswa === 'Semua' || s.kelas === filterKelasSiswa;
      return matchesSearch && matchesKelas;
    })
  );

  const availableKelas = Array.from(new Set(siswaList.map((s) => s.kelas))).sort(compareKelas);

  return (
    <div className="space-y-6">
      {/* Header View */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-700" />
            Data PTK & Siswa SDN 1 Pekutatan
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Database Pendidik & Tenaga Kependidikan (PTK: Kepala Sekolah, Guru, Tata Usaha), Peserta Didik, Impor/Ekspor Excel/CSV, dan Cetak Presensi Resmi
          </p>
        </div>

        {/* Sub-Tabs: a. Data PTK, b. Data Siswa */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl">
          <button
            onClick={() => {
              setActiveTab('guru');
              setSearchTerm('');
            }}
            className={`px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'guru'
                ? 'bg-white text-indigo-950 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>a. DATA PTK ({guruList.length})</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('siswa');
              setSearchTerm('');
            }}
            className={`px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'siswa'
                ? 'bg-white text-indigo-950 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            <span>b. Data Siswa ({siswaList.length})</span>
          </button>
        </div>
      </div>

      {/* Hidden File Inputs for CSV Import */}
      <input
        type="file"
        ref={fileInputGuruRef}
        onChange={handleUploadGuruCsv}
        accept=".csv,.txt"
        className="hidden"
      />
      <input
        type="file"
        ref={fileInputSiswaRef}
        onChange={handleUploadSiswaCsv}
        accept=".csv,.txt"
        className="hidden"
      />

      {activeTab === 'guru' ? (
        /* ================= TAB A: DATA PTK ================= */
        <div className="space-y-4">
          {/* Action Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Cari nama PTK, NIP, jabatan..."
                  className="w-full text-xs sm:text-sm pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                />
              </div>

              {/* Filter Kategori PTK */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs font-semibold">
                <button
                  onClick={() => setFilterKategoriPTK('semua')}
                  className={`px-2.5 py-1.5 rounded-md transition-colors ${
                    filterKategoriPTK === 'semua'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Semua ({guruList.length})
                </button>
                <button
                  onClick={() => setFilterKategoriPTK('kepala_sekolah')}
                  className={`px-2.5 py-1.5 rounded-md transition-colors ${
                    filterKategoriPTK === 'kepala_sekolah'
                      ? 'bg-blue-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Kepala Sekolah ({guruList.filter((g) => g.jenisPtk === 'kepala_sekolah').length})
                </button>
                <button
                  onClick={() => setFilterKategoriPTK('guru')}
                  className={`px-2.5 py-1.5 rounded-md transition-colors ${
                    filterKategoriPTK === 'guru'
                      ? 'bg-emerald-800 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Guru ({guruList.filter((g) => g.jenisPtk === 'guru').length})
                </button>
                <button
                  onClick={() => setFilterKategoriPTK('tu')}
                  className={`px-2.5 py-1.5 rounded-md transition-colors ${
                    filterKategoriPTK === 'tu'
                      ? 'bg-amber-700 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  TU ({guruList.filter((g) => g.jenisPtk === 'tu').length})
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Tombol Upload Data PTK */}
              <button
                onClick={() => fileInputGuruRef.current?.click()}
                className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 font-semibold text-xs sm:text-sm rounded-xl border border-indigo-200 flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                title="Unggah CSV (Otomatis membaca format ekspor & header)"
              >
                <Upload className="w-4 h-4 text-indigo-700" />
                <span>Upload Data PTK</span>
              </button>

              {/* Tombol Unduh Format Template CSV PTK */}
              <button
                onClick={downloadGuruTemplateCsv}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs sm:text-sm rounded-xl border border-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Unduh contoh format CSV PTK siap isi"
              >
                <FileSpreadsheet className="w-4 h-4 text-slate-600" />
                <span>Unduh Format PTK</span>
              </button>

              {/* Tombol Ekspor Data PTK */}
              <button
                onClick={handleExportGuru}
                className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold text-xs sm:text-sm rounded-xl border border-emerald-200 flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Ekspor CSV / Excel"
              >
                <Download className="w-4 h-4 text-emerald-700" />
                <span>Ekspor Data PTK</span>
              </button>

              {/* Tombol Cetak & Unduh Presensi PTK (Landscape F4) */}
              <button
                onClick={handlePrintAbsenGuru}
                className="px-3.5 py-2 bg-blue-900 hover:bg-blue-800 text-white font-semibold text-xs sm:text-sm rounded-xl shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Cetak Format Lembar Presensi PTK Landscape F4 / Unduh Ms. Word"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak Presensi PTK (Landscape F4)</span>
              </button>

              {/* Tambah Manual PTK */}
              <button
                onClick={() => openGuruModal()}
                className="px-3.5 py-2 bg-indigo-700 hover:bg-indigo-600 text-white font-semibold text-xs sm:text-sm rounded-xl shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ Tambah PTK</span>
              </button>
            </div>
          </div>

          {/* Table Data PTK */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                    <th className="py-3 px-4 w-12 text-center">No</th>
                    <th className="py-3 px-4">Nama Lengkap & NIP</th>
                    <th className="py-3 px-4">Kategori & Status</th>
                    <th className="py-3 px-4">Pangkat / Golongan</th>
                    <th className="py-3 px-4">Jabatan</th>
                    <th className="py-3 px-4">Kontak (HP/Email)</th>
                    <th className="py-3 px-4 text-center w-28">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredGuru.map((g, idx) => {
                    const isKS = g.jenisPtk === 'kepala_sekolah';
                    const isTU = g.jenisPtk === 'tu';
                    return (
                      <tr key={g.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 text-center font-medium text-slate-500">
                          {idx + 1}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-bold text-slate-900 block">{g.nama}</span>
                          <div className="flex flex-wrap gap-x-2 text-xs text-slate-500 font-mono">
                            <span>NIP: {g.nip}</span>
                            {g.nuptk && <span className="text-indigo-700 font-semibold">| NUPTK: {g.nuptk}</span>}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex flex-col gap-1 items-start">
                            <span
                              className={`px-2 py-0.5 rounded-md font-bold text-[11px] ${
                                isKS
                                  ? 'bg-blue-100 text-blue-900 border border-blue-200'
                                  : isTU
                                  ? 'bg-amber-100 text-amber-900 border border-amber-200'
                                  : 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                              }`}
                            >
                              {isKS ? 'Kepala Sekolah' : isTU ? 'Tata Usaha (TU)' : 'Guru'}
                            </span>
                            <span className="text-[10px] text-slate-500 font-medium">
                              {g.status || 'PNS'}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-700 font-medium">
                          {g.pangkatGol}
                        </td>
                        <td className="py-3 px-4">
                          <span className="bg-slate-100 text-slate-800 font-semibold px-2 py-0.5 rounded text-xs">
                            {g.jabatan}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-600">
                          <div>{g.noHp || '-'}</div>
                          <div className="text-[11px] text-slate-400">{g.email || '-'}</div>
                        </td>
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => openGuruModal(g)}
                              className="p-1.5 text-slate-700 hover:bg-slate-100 rounded-lg"
                              title="Edit Data PTK"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDeleteConfirm({ type: 'guru', id: g.id, nama: g.nama })}
                              className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Hapus Data PTK"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredGuru.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-xs text-slate-400">
                        Belum ada data PTK yang sesuai dengan pencarian atau filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* ================= TAB B: DATA SISWA ================= */
        <div className="space-y-4">
          {/* Action Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Cari nama siswa, NISN, NIS..."
                  className="w-full text-xs sm:text-sm pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                />
              </div>

              <select
                value={filterKelasSiswa}
                onChange={(e) => setFilterKelasSiswa(e.target.value)}
                className="text-xs border border-slate-300 rounded-lg px-2.5 py-2 focus:ring-2 focus:ring-indigo-600 focus:outline-none bg-white"
              >
                <option value="Semua">Semua Kelas</option>
                {availableKelas.map((k) => (
                  <option key={k} value={k}>
                    Kelas {k}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Tombol Upload Data Siswa */}
              <button
                onClick={() => fileInputSiswaRef.current?.click()}
                className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 font-semibold text-xs sm:text-sm rounded-xl border border-indigo-200 flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                title="Unggah CSV (Otomatis membaca format ekspor & mencegah data berantakan)"
              >
                <Upload className="w-4 h-4 text-indigo-700" />
                <span>Upload Data Siswa</span>
              </button>

              {/* Tombol Unduh Format Template CSV Siswa */}
              <button
                onClick={downloadSiswaTemplateCsv}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs sm:text-sm rounded-xl border border-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Unduh contoh format CSV siap isi sesuai standar ekspor"
              >
                <FileSpreadsheet className="w-4 h-4 text-slate-600" />
                <span>Unduh Format CSV</span>
              </button>

              {/* Tombol Ekspor Data Siswa */}
              <button
                onClick={handleExportSiswa}
                className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold text-xs sm:text-sm rounded-xl border border-emerald-200 flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Ekspor CSV / Excel"
              >
                <Download className="w-4 h-4 text-emerald-700" />
                <span>Ekspor Data Siswa</span>
              </button>

              {/* Tombol Cetak Absen Siswa */}
              <button
                onClick={() =>
                  openCetakSiswaModal(
                    filterKelasSiswa !== 'Semua' ? filterKelasSiswa : (availableKelas[0] || '6A')
                  )
                }
                className="px-3.5 py-2 bg-blue-900 hover:bg-blue-800 text-white font-semibold text-xs sm:text-sm rounded-xl shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Cetak Presensi Siswa Bulanan (Format Landscape & Kostum Libur)"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak Absen Siswa</span>
              </button>

              {/* Tombol Opsi Data (Reset / Bersihkan) */}
              {(onResetSiswaDefault || onClearAllSiswa) && (
                <div className="relative">
                  <button
                    onClick={() => setShowDataOptionsDropdown(!showDataOptionsDropdown)}
                    className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl border border-slate-200 flex items-center gap-1 transition-colors cursor-pointer"
                    title="Opsi Pemulihan / Pembersihan Data Siswa"
                  >
                    <Settings2 className="w-4 h-4 text-slate-600" />
                    <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                  </button>
                  {showDataOptionsDropdown && (
                    <div className="absolute right-0 mt-1.5 w-64 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-30">
                      {onResetSiswaDefault && (
                        <button
                          onClick={() => {
                            setShowDataOptionsDropdown(false);
                            setShowResetConfirmModal(true);
                          }}
                          className="w-full text-left px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                        >
                          <RotateCcw className="w-4 h-4 text-amber-600" />
                          <span>Kembalikan Data Awal SDN 1</span>
                        </button>
                      )}
                      {onClearAllSiswa && (
                        <button
                          onClick={() => {
                            setShowDataOptionsDropdown(false);
                            setShowClearConfirmModal(true);
                          }}
                          className="w-full text-left px-3.5 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-2 cursor-pointer border-t border-slate-100"
                        >
                          <Trash2 className="w-4 h-4 text-rose-500" />
                          <span>Kosongkan Seluruh Siswa</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Tambah Manual */}
              <button
                onClick={() => openSiswaModal()}
                className="px-3.5 py-2 bg-indigo-700 hover:bg-indigo-600 text-white font-semibold text-xs sm:text-sm rounded-xl shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Siswa</span>
              </button>
            </div>
          </div>

          {/* Table Data Siswa */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                    <th className="py-3 px-4 w-12 text-center">No</th>
                    <th className="py-3 px-4">Nama Siswa & JK</th>
                    <th className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <span>NISN / NIS</span>
                        <span className="text-[10px] font-normal bg-slate-200/70 text-slate-600 px-1 py-0.5 rounded" title="Diurutkan berdasarkan NIS (Kecil ke Besar)">
                          NIS ↑
                        </span>
                      </div>
                    </th>
                    <th className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <span>Kelas</span>
                        <span className="text-[10px] font-normal bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded" title="Diurutkan dari kelas terkecil ke terbesar">
                          1 → 6
                        </span>
                      </div>
                    </th>
                    <th className="py-3 px-4">Tempat, Tanggal Lahir</th>
                    <th className="py-3 px-4">Nama Orang Tua & Alamat</th>
                    <th className="py-3 px-4 text-center w-28">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSiswa.map((s, idx) => (
                    <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 text-center font-medium text-slate-500">
                        {idx + 1}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-900 block">{s.nama}</span>
                        <span className="text-[11px] text-slate-500">
                          {s.jenisKelamin === 'L' ? 'Laki-laki' : 'Perempuan'}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-xs">
                        <span className="font-bold text-indigo-950 block">{s.nisn}</span>
                        <span className="text-slate-500">NIS: {s.nis}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="bg-blue-100 text-blue-900 font-bold px-2 py-0.5 rounded text-xs">
                          Kelas {s.kelas}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-600">
                        {s.tempatLahir}, {s.tglLahir}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-600">
                        <div className="font-medium text-slate-800">{s.namaOrtu}</div>
                        <div className="text-[11px] text-slate-500">{s.alamat}</div>
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => openSiswaModal(s)}
                            className="p-1.5 text-slate-700 hover:bg-slate-100 rounded-lg"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirm({ type: 'siswa', id: s.id, nama: s.nama })}
                            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Hapus"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredSiswa.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-xs text-slate-400">
                        Belum ada data siswa yang cocok dengan filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL FORM: PTK (Kepala Sekolah, Guru, TU) */}
      {showGuruModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col my-auto">
            <div className="bg-indigo-950 px-6 py-4 text-white flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold">
                  {guruId ? 'Edit Data PTK' : 'Tambah Data PTK Baru'}
                </h2>
                <p className="text-[11px] text-indigo-200 mt-0.5">
                  Pendidik dan Tenaga Kependidikan: Kepala Sekolah, Guru, atau TU
                </p>
              </div>
              <button
                onClick={() => setShowGuruModal(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveGuru} className="p-5 space-y-4 text-xs sm:text-sm">
              {/* Pilihan Kategori PTK (Kepala Sekolah, Guru, TU) */}
              <div>
                <label className="block font-bold text-slate-800 mb-1.5">
                  Kategori PTK *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setGJenisPtk('kepala_sekolah');
                      if (!guruId && (!gJabatan || gJabatan === 'Guru Kelas' || gJabatan === 'Staf Tata Usaha')) {
                        setGJabatan('Kepala Sekolah');
                        setGPangkat('Pembina Tk. I / IV-b');
                      }
                    }}
                    className={`py-2 px-3 rounded-xl border text-center transition-all ${
                      gJenisPtk === 'kepala_sekolah'
                        ? 'bg-blue-900 text-white border-blue-900 font-bold shadow-xs'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    Kepala Sekolah
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setGJenisPtk('guru');
                      if (!guruId && (!gJabatan || gJabatan === 'Kepala Sekolah' || gJabatan === 'Staf Tata Usaha')) {
                        setGJabatan('Guru Kelas');
                        setGPangkat('Penata Muda Tk. I / III-b');
                      }
                    }}
                    className={`py-2 px-3 rounded-xl border text-center transition-all ${
                      gJenisPtk === 'guru'
                        ? 'bg-emerald-800 text-white border-emerald-800 font-bold shadow-xs'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    Guru
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setGJenisPtk('tu');
                      if (!guruId && (!gJabatan || gJabatan === 'Guru Kelas' || gJabatan === 'Kepala Sekolah')) {
                        setGJabatan('Staf Tata Usaha / Operator');
                        setGPangkat('Pengatur / II-c');
                      }
                    }}
                    className={`py-2 px-3 rounded-xl border text-center transition-all ${
                      gJenisPtk === 'tu'
                        ? 'bg-amber-700 text-white border-amber-700 font-bold shadow-xs'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    Tata Usaha (TU)
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Nama Lengkap & Gelar *
                </label>
                <input
                  type="text"
                  required
                  placeholder={
                    gJenisPtk === 'kepala_sekolah'
                      ? 'Contoh: I Ketut Sujana, S.Pd., M.Pd.'
                      : gJenisPtk === 'tu'
                      ? 'Contoh: Ni Putu Wulandari, A.Md.'
                      : 'Contoh: I Made Dwi Artha, S.Pd.SD'
                  }
                  value={gNama}
                  onChange={(e) => setGNama(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 font-semibold text-slate-900 focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    NIP (Nomor Induk Pegawai) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="198005122008011005"
                    value={gNip}
                    onChange={(e) => setGNip(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 font-mono focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    NUPTK (Nomor Unik Pendidik/PTK)
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: 1234567890123456"
                    value={gNuptk}
                    onChange={(e) => setGNuptk(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 font-mono focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Status Kepegawaian</label>
                  <select
                    value={gStatus}
                    onChange={(e) => setGStatus(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                  >
                    <option value="PNS">PNS</option>
                    <option value="PPPK">PPPK</option>
                    <option value="Honorer / Non-ASN">Honorer / Non-ASN</option>
                    <option value="GTT / PTT">GTT / PTT</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Pangkat / Golongan</label>
                  <input
                    type="text"
                    placeholder="Pembina, IV/a"
                    value={gPangkat}
                    onChange={(e) => setGPangkat(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Jabatan / Tugas</label>
                  <input
                    type="text"
                    placeholder={
                      gJenisPtk === 'kepala_sekolah'
                        ? 'Kepala Sekolah'
                        : gJenisPtk === 'tu'
                        ? 'Staf Tata Usaha / Operator'
                        : 'Guru Kelas / Guru Mapel'
                    }
                    value={gJabatan}
                    onChange={(e) => setGJabatan(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    placeholder="nama@guru.sd.belajar.id"
                    value={gEmail}
                    onChange={(e) => setGEmail(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">No Handphone (WhatsApp)</label>
                  <input
                    type="text"
                    placeholder="081234567890"
                    value={gNoHp}
                    onChange={(e) => setGNoHp(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowGuruModal(false)}
                  className="px-4 py-2 font-medium text-slate-600 hover:text-slate-800 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-semibold bg-indigo-800 hover:bg-indigo-700 text-white rounded-xl shadow-sm"
                >
                  Simpan Guru
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL FORM: SISWA */}
      {showSiswaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col">
            <div className="bg-indigo-950 px-6 py-4 text-white flex items-center justify-between">
              <h2 className="text-base font-bold">
                {siswaId ? 'Edit Data Siswa' : 'Tambah Siswa Baru'}
              </h2>
              <button
                onClick={() => setShowSiswaModal(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSiswa} className="p-5 space-y-3.5 text-xs sm:text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">NISN *</label>
                  <input
                    type="text"
                    required
                    placeholder="0012345678"
                    value={sNisn}
                    onChange={(e) => setSNisn(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 font-mono focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">NIS Sekolah</label>
                  <input
                    type="text"
                    value={sNis}
                    onChange={(e) => setSNis(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 font-mono focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nama Lengkap Siswa *</label>
                <input
                  type="text"
                  required
                  placeholder="Nama Peserta Didik"
                  value={sNama}
                  onChange={(e) => setSNama(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 font-semibold text-slate-900 focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Kelas</label>
                  <select
                    value={sKelas}
                    onChange={(e) => setSKelas(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                  >
                    <option value="1">Kelas 1</option>
                    <option value="2">Kelas 2</option>
                    <option value="3">Kelas 3</option>
                    <option value="4">Kelas 4</option>
                    <option value="5">Kelas 5</option>
                    <option value="6">Kelas 6</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Jenis Kelamin</label>
                  <select
                    value={sJenisKelamin}
                    onChange={(e) => setSJenisKelamin(e.target.value as 'L' | 'P')}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                  >
                    <option value="L">Laki-laki (L)</option>
                    <option value="P">Perempuan (P)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tempat Lahir</label>
                  <input
                    type="text"
                    value={sTempatLahir}
                    onChange={(e) => setSTempatLahir(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tanggal Lahir</label>
                  <input
                    type="date"
                    value={sTglLahir}
                    onChange={(e) => setSTglLahir(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nama Orang Tua / Wali</label>
                <input
                  type="text"
                  value={sNamaOrtu}
                  onChange={(e) => setSNamaOrtu(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Alamat Tempat Tinggal</label>
                <input
                  type="text"
                  value={sAlamat}
                  onChange={(e) => setSAlamat(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowSiswaModal(false)}
                  className="px-4 py-2 font-medium text-slate-600 hover:text-slate-800 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-semibold bg-indigo-800 hover:bg-indigo-700 text-white rounded-xl shadow-sm"
                >
                  Simpan Siswa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Internal Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mb-4 mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 text-center mb-2">
              Konfirmasi Hapus Data
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 text-center mb-6">
              Apakah Anda yakin ingin menghapus data{' '}
              <span className="font-semibold text-slate-900">
                {deleteConfirm.type === 'guru' ? 'Guru' : 'Siswa'}: &quot;{deleteConfirm.nama}&quot;
              </span>
              ? Tindakan ini akan menghapus data dari database.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  if (deleteConfirm.type === 'guru') {
                    onDeleteGuru(deleteConfirm.id);
                  } else {
                    onDeleteSiswa(deleteConfirm.id);
                  }
                  setDeleteConfirm(null);
                }}
                className="px-5 py-2 text-xs sm:text-sm font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-xs transition-colors"
              >
                Ya, Hapus Data
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL CETAK ABSEN GURU (LANDSCAPE) ================= */}
      {showCetakAbsenGuruModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-4xl w-full my-auto shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150">
            {/* Header Modal */}
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-900 text-white flex items-center justify-center font-bold shadow-xs">
                  <Printer className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <span>Cetak Presensi PTK (Pendidik & Tenaga Kependidikan)</span>
                    <span className="px-2 py-0.5 text-[11px] font-semibold bg-blue-100 text-blue-900 rounded-full border border-blue-200">
                      Landscape F4 ({ptkPaperSizeCetak})
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Format bulanan resmi kedinasan, orientasi Landscape F4/Folio, kalender kostum libur, dan unduh Ms. Word (.doc)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCetakAbsenGuruModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Modal */}
            <div className="p-5 overflow-y-auto space-y-5">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                {/* Kolom Kiri: Kalender Kecil Kostum Libur */}
                <div className="lg:col-span-7 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-red-600" />
                      1. Tentukan Hari Libur (Kalender Interaktif)
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Bulan: {NAMA_BULAN_INDONESIA[absenMonth - 1]} {absenYear}
                    </span>
                  </div>

                  <KalenderKecilLibur
                    year={absenYear}
                    month={absenMonth}
                    onYearChange={handleYearChange}
                    onMonthChange={handleMonthChange}
                    holidays={absenHolidays}
                    onToggleHoliday={handleToggleHoliday}
                    onSetPreset={handleSetHolidayPreset}
                  />

                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 space-y-1">
                    <div className="font-bold flex items-center gap-1">
                      <Info className="w-3.5 h-3.5 text-amber-700" />
                      Petunjuk Kostum Hari Libur:
                    </div>
                    <p className="text-[11px] leading-relaxed text-amber-800">
                      Klik tanggal untuk menandai hari libur (merah) atau mengembalikan jadi hari masuk (putih).
                      Baris tanggal libur pada lembar presensi otomatis diberi arsir warna dan keterangan <strong>LIBUR</strong>.
                    </p>
                  </div>
                </div>

                {/* Kolom Kanan: Opsi Format Cetak & Ringkasan */}
                <div className="lg:col-span-5 space-y-4">
                  {/* Filter Subjek PTK */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                      2. Filter Subjek PTK yang Dicetak
                    </label>
                    <div className="grid grid-cols-2 gap-1.5 bg-slate-100 p-1.5 rounded-xl text-xs font-medium">
                      <button
                        type="button"
                        onClick={() => setPtkFilterCetak('semua')}
                        className={`py-1.5 px-2 rounded-lg text-center transition-colors ${
                          ptkFilterCetak === 'semua'
                            ? 'bg-white text-slate-900 font-bold shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Semua PTK ({guruList.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setPtkFilterCetak('guru')}
                        className={`py-1.5 px-2 rounded-lg text-center transition-colors ${
                          ptkFilterCetak === 'guru'
                            ? 'bg-emerald-800 text-white font-bold shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Hanya Guru ({guruList.filter((g) => g.jenisPtk === 'guru').length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setPtkFilterCetak('tu')}
                        className={`py-1.5 px-2 rounded-lg text-center transition-colors ${
                          ptkFilterCetak === 'tu'
                            ? 'bg-amber-700 text-white font-bold shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Hanya TU ({guruList.filter((g) => g.jenisPtk === 'tu').length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setPtkFilterCetak('kepala_sekolah')}
                        className={`py-1.5 px-2 rounded-lg text-center transition-colors ${
                          ptkFilterCetak === 'kepala_sekolah'
                            ? 'bg-blue-900 text-white font-bold shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Kepala Sekolah ({guruList.filter((g) => g.jenisPtk === 'kepala_sekolah').length})
                      </button>
                    </div>
                  </div>

                  {/* Opsi Kop Surat (Pilihan Utama: Tanpa KOP) */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                      3. Pilihan Kop Surat
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setPtkShowKopCetak(false)}
                        className={`p-2.5 rounded-xl border text-left flex items-start gap-2 transition-all ${
                          !ptkShowKopCetak
                            ? 'bg-blue-50 border-blue-600 ring-1 ring-blue-600'
                            : 'bg-white border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <div className={`mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                          !ptkShowKopCetak ? 'border-blue-900 bg-blue-900' : 'border-slate-400'
                        }`}>
                          {!ptkShowKopCetak && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-900 flex items-center gap-1">
                            <span>Tanpa KOP</span>
                            <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1 py-0.2 rounded font-semibold">Pilihan Utama</span>
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">Tabel lebih lega & kolom leluasa</div>
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPtkShowKopCetak(true)}
                        className={`p-2.5 rounded-xl border text-left flex items-start gap-2 transition-all ${
                          ptkShowKopCetak
                            ? 'bg-blue-50 border-blue-600 ring-1 ring-blue-600'
                            : 'bg-white border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <div className={`mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                          ptkShowKopCetak ? 'border-blue-900 bg-blue-900' : 'border-slate-400'
                        }`}>
                          {ptkShowKopCetak && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-900">Dengan KOP Resmi</div>
                          <div className="text-[11px] text-slate-500 mt-0.5">Kop Pemkab & Disdikpora</div>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Opsi Ukuran Kertas & Orientasi */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                      4. Ukuran Kertas (Orientasi Landscape)
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setPtkPaperSizeCetak('F4')}
                        className={`p-2.5 rounded-xl border text-left flex items-start gap-2 transition-all ${
                          ptkPaperSizeCetak === 'F4'
                            ? 'bg-blue-50 border-blue-600 ring-1 ring-blue-600'
                            : 'bg-white border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <div className={`mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                          ptkPaperSizeCetak === 'F4' ? 'border-blue-900 bg-blue-900' : 'border-slate-400'
                        }`}>
                          {ptkPaperSizeCetak === 'F4' && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-900 flex items-center gap-1">
                            <span>F4 / Folio</span>
                            <span className="text-[10px] bg-blue-200 text-blue-900 px-1 py-0.2 rounded font-semibold">Utama</span>
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">21.5 × 33.0 cm (Landscape)</div>
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPtkPaperSizeCetak('A4')}
                        className={`p-2.5 rounded-xl border text-left flex items-start gap-2 transition-all ${
                          ptkPaperSizeCetak === 'A4'
                            ? 'bg-blue-50 border-blue-600 ring-1 ring-blue-600'
                            : 'bg-white border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <div className={`mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                          ptkPaperSizeCetak === 'A4' ? 'border-blue-900 bg-blue-900' : 'border-slate-400'
                        }`}>
                          {ptkPaperSizeCetak === 'A4' && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-900">A4 Standar</div>
                          <div className="text-[11px] text-slate-500 mt-0.5">21.0 × 29.7 cm (Landscape)</div>
                        </div>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">
                      5. Format Lembar Presensi
                    </label>
                    <div className="space-y-2">
                      {/* Opsi 1: Format Kolektif per Lembar (Rekomendasi Utama) */}
                      <label
                        className={`p-3 rounded-xl border flex items-start gap-2.5 cursor-pointer transition-all ${
                          ptkCetakMode === 'kolektif_per_lembar'
                            ? 'bg-blue-50/70 border-blue-600 ring-1 ring-blue-600'
                            : 'bg-white border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="ptkCetakMode"
                          checked={ptkCetakMode === 'kolektif_per_lembar'}
                          onChange={() => setPtkCetakMode('kolektif_per_lembar')}
                          className="mt-0.5 text-blue-900 focus:ring-blue-900"
                        />
                        <div className="text-xs">
                          <div className="flex items-center gap-1.5">
                            <p className="font-bold text-slate-900">Format Harian Terbagi Rapi (Rekomendasi Utama)</p>
                            <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded">Rapi & Presisi</span>
                          </div>
                          <p className="text-slate-600 mt-0.5 leading-relaxed">
                            Setiap kelipatan 5 PTK memerlukan 1 halaman kertas ({ptkPerPageCetak} PTK per lembar F4 Landscape, misal 10 PTK = 2 halaman, 15 PTK = 3 halaman, dst.). NIP tertera rapi di bawah nama PTK.
                          </p>
                        </div>
                      </label>

                      {/* Selector Jumlah PTK per Lembar if kolektif_per_lembar */}
                      {ptkCetakMode === 'kolektif_per_lembar' && (
                        <div className="pl-6 pt-0.5 pb-1 flex items-center gap-2">
                          <span className="text-[11px] font-semibold text-slate-600">
                            Jumlah PTK per lembar:
                          </span>
                          <select
                            value={ptkPerPageCetak}
                            onChange={(e) => setPtkPerPageCetak(Number(e.target.value))}
                            className="text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1 font-medium text-slate-800 focus:ring-2 focus:ring-blue-800 focus:outline-none"
                          >
                            <option value={5}>5 PTK per lembar (Kelipatan 5: 1 Halaman / 5 PTK)</option>
                            <option value={4}>4 PTK per lembar</option>
                            <option value={3}>3 PTK per lembar</option>
                          </select>
                        </div>
                      )}

                      {/* Opsi 2: Format Matriks Rekapitulasi Bulanan Resmi (Semua PTK 1 Lembar) */}
                      <label
                        className={`p-3 rounded-xl border flex items-start gap-2.5 cursor-pointer transition-all ${
                          ptkCetakMode === 'rekap_bulanan'
                            ? 'bg-blue-50/70 border-blue-600 ring-1 ring-blue-600'
                            : 'bg-white border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="ptkCetakMode"
                          checked={ptkCetakMode === 'rekap_bulanan'}
                          onChange={() => setPtkCetakMode('rekap_bulanan')}
                          className="mt-0.5 text-blue-900 focus:ring-blue-900"
                        />
                        <div className="text-xs">
                          <div className="flex items-center gap-1.5">
                            <p className="font-bold text-slate-900">Format Matriks Rekapitulasi (Semua PTK 1 Lembar)</p>
                            <span className="text-[10px] bg-blue-100 text-blue-900 font-bold px-1.5 py-0.2 rounded">Resmi Kedinasan</span>
                          </div>
                          <p className="text-slate-600 mt-0.5 leading-relaxed">
                            Menampilkan seluruh nama PTK dalam 1 halaman Landscape F4 dengan matriks tanggal 1 s.d. 31, kolom rekapitulasi kehadiran (H, S, I, DL, TK), dan paraf.
                          </p>
                        </div>
                      </label>

                      {/* Opsi 3: Format Kolektif All-in-One Memanjang */}
                      <label
                        className={`p-3 rounded-xl border flex items-start gap-2.5 cursor-pointer transition-all ${
                          ptkCetakMode === 'kolektif'
                            ? 'bg-blue-50/70 border-blue-600 ring-1 ring-blue-600'
                            : 'bg-white border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="ptkCetakMode"
                          checked={ptkCetakMode === 'kolektif'}
                          onChange={() => setPtkCetakMode('kolektif')}
                          className="mt-0.5 text-blue-900 focus:ring-blue-900"
                        />
                        <div className="text-xs">
                          <p className="font-bold text-slate-900">Format Harian Seluruh PTK Sekaligus (All-in-One)</p>
                          <p className="text-slate-500 mt-0.5 leading-relaxed">
                            Semua nama PTK berjejer ke samping dalam 1 tabel memanjang (jika PTK &gt; 4 orang kolom akan menyempit).
                          </p>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Ringkasan Cetak */}
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
                    <span className="font-bold text-slate-800 uppercase tracking-wider block text-[11px]">
                      Ringkasan Dokumen Presensi
                    </span>
                    <div className="space-y-1 text-slate-600 text-[11.5px]">
                      <div className="flex justify-between">
                        <span>Kop Surat:</span>
                        <span className={`font-semibold ${!ptkShowKopCetak ? 'text-emerald-700' : 'text-slate-900'}`}>
                          {!ptkShowKopCetak ? 'Tanpa KOP (Pilihan Utama)' : 'Resmi Kedinasan Pemkab Jembrana'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Ukuran & Orientasi:</span>
                        <span className="font-bold text-blue-900">
                          {ptkPaperSizeCetak === 'F4' ? 'F4 / Folio (33.0 × 21.5 cm)' : 'A4 (29.7 × 21.0 cm)'} Landscape
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Subjek PTK Terpilih:</span>
                        <span className="font-bold text-indigo-900">
                          {ptkFilterCetak === 'semua'
                            ? `Seluruh PTK (${guruList.length} orang)`
                            : ptkFilterCetak === 'guru'
                            ? `Hanya Guru (${guruList.filter((g) => g.jenisPtk === 'guru').length} orang)`
                            : ptkFilterCetak === 'tu'
                            ? `Hanya TU (${guruList.filter((g) => g.jenisPtk === 'tu').length} orang)`
                            : `Kepala Sekolah (${guruList.filter((g) => g.jenisPtk === 'kepala_sekolah').length} orang)`}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Bulan / Tahun:</span>
                        <span className="font-semibold text-slate-900">
                          {NAMA_BULAN_INDONESIA[absenMonth - 1]} {absenYear}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Hari Kerja Efektif:</span>
                        <span className="font-bold text-emerald-700">
                          {Math.max(0, new Date(absenYear, absenMonth, 0).getDate() - Object.keys(absenHolidays).length)} Hari ({Object.keys(absenHolidays).length} Hari Libur)
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Format Tampilan:</span>
                        <span className="font-semibold text-blue-900">
                          {ptkCetakMode === 'kolektif_per_lembar'
                            ? `Harian Terbagi (${ptkPerPageCetak} PTK / Lembar)`
                            : ptkCetakMode === 'rekap_bulanan'
                            ? 'Matriks Rekapitulasi (1 Lembar)'
                            : 'All-in-One'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Sub-Kolom Presensi:</span>
                        <span className="font-semibold text-slate-800">
                          {ptkCetakMode === 'rekap_bulanan' ? 'Tgl 1..31 & Rekap H/S/I/DL/TK' : 'Pagi, TTD, Sore, TTD'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Format Dokumen:</span>
                        <span className="font-semibold text-slate-900">Cetak Langsung / PDF & Ms. Word (.doc)</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Modal */}
            <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setShowCetakAbsenGuruModal(false)}
                className="px-4 py-2 text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Tutup
              </button>
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={doExportWordAbsenGuru}
                  className="px-4 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-950 font-bold text-xs sm:text-sm rounded-xl border border-blue-300 shadow-xs flex items-center gap-2 transition-all hover:shadow"
                  title="Unduh Lembar Presensi PTK ke file Microsoft Word (.doc) Landscape F4"
                >
                  <FileText className="w-4 h-4 text-blue-800" />
                  <span>Unduh Ms. Word (.doc)</span>
                </button>
                <button
                  type="button"
                  onClick={doPrintAbsenGuru}
                  className="px-5 py-2.5 bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs sm:text-sm rounded-xl shadow-sm flex items-center gap-2 transition-all hover:shadow"
                  title="Cetak Langsung Presensi PTK Landscape F4"
                >
                  <Printer className="w-4 h-4" />
                  <span>Cetak Presensi PTK (Landscape {ptkPaperSizeCetak})</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL CETAK ABSEN SISWA (LANDSCAPE) ================= */}
      {showCetakAbsenSiswaModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-4xl w-full my-auto shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150">
            {/* Header Modal */}
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-900 text-white flex items-center justify-center font-bold shadow-xs">
                  <Printer className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <span>Cetak Presensi Peserta Didik Bulanan</span>
                    <span className="px-2 py-0.5 text-[11px] font-semibold bg-blue-100 text-blue-900 rounded-full border border-blue-200">
                      Landscape A4
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Format baris: No, Nama Siswa (NISN/NIS, L/P), Tanggal (1..30/31), Rekapitulasi (S, I, A, Jml), dan Tanda Tangan Resmi
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCetakAbsenSiswaModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Modal */}
            <div className="p-5 overflow-y-auto space-y-5">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                {/* Kolom Kiri: Kalender Kecil Kostum Libur */}
                <div className="lg:col-span-7 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-red-600" />
                      1. Tentukan Hari Libur Sekolah (Kalender Interaktif)
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Bulan: {NAMA_BULAN_INDONESIA[absenMonth - 1]} {absenYear}
                    </span>
                  </div>

                  <KalenderKecilLibur
                    year={absenYear}
                    month={absenMonth}
                    onYearChange={handleYearChange}
                    onMonthChange={handleMonthChange}
                    holidays={absenHolidays}
                    onToggleHoliday={handleToggleHoliday}
                    onSetPreset={handleSetHolidayPreset}
                  />

                  <div className="p-3 bg-red-50 rounded-xl border border-red-200 text-xs text-red-900 space-y-1">
                    <div className="font-bold flex items-center gap-1">
                      <Info className="w-3.5 h-3.5 text-red-700" />
                      Penandaan Hari Libur Siswa:
                    </div>
                    <p className="text-[11px] leading-relaxed text-red-800">
                      Kolom tanggal yang ditandai libur pada kalender kecil otomatis diarsir merah muda dengan kode <strong>'L'</strong> pada tabel absensi siswa.
                    </p>
                  </div>
                </div>

                {/* Kolom Kanan: Pengaturan Kelas & Semester */}
                <div className="lg:col-span-5 space-y-4">
                  <div className="space-y-3">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                      2. Pengaturan Presensi Kelas
                    </span>

                    {/* Pilih Kelas */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Pilih Kelas:
                      </label>
                      <select
                        value={siswaKelasCetak}
                        onChange={(e) => setSiswaKelasCetak(e.target.value)}
                        className="w-full text-xs sm:text-sm bg-white border border-slate-300 rounded-xl px-3 py-2 font-bold text-slate-900 focus:ring-2 focus:ring-blue-800 focus:outline-none"
                      >
                        <option value="Semua">Semua Kelas</option>
                        {availableKelas.map((k) => (
                          <option key={k} value={k}>
                            Kelas {k} ({siswaList.filter((s) => s.kelas === k).length} Siswa)
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Opsi Kop Surat Siswa (Pilihan Utama: Tanpa KOP) */}
                    <div>
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                        Pilihan Kop Surat:
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setSiswaShowKopCetak(false)}
                          className={`p-2 rounded-xl border text-left flex items-start gap-2 transition-all ${
                            !siswaShowKopCetak
                              ? 'bg-blue-50 border-blue-600 ring-1 ring-blue-600'
                              : 'bg-white border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          <div className={`mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                            !siswaShowKopCetak ? 'border-blue-900 bg-blue-900' : 'border-slate-400'
                          }`}>
                            {!siswaShowKopCetak && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                          </div>
                          <div>
                            <div className="text-xs font-bold text-slate-900 flex items-center gap-1">
                              <span>Tanpa KOP</span>
                              <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1 py-0.2 rounded font-semibold">Utama</span>
                            </div>
                            <div className="text-[10.5px] text-slate-500 mt-0.5">Tabel presensi maksimal</div>
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => setSiswaShowKopCetak(true)}
                          className={`p-2 rounded-xl border text-left flex items-start gap-2 transition-all ${
                            siswaShowKopCetak
                              ? 'bg-blue-50 border-blue-600 ring-1 ring-blue-600'
                              : 'bg-white border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          <div className={`mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                            siswaShowKopCetak ? 'border-blue-900 bg-blue-900' : 'border-slate-400'
                          }`}>
                            {siswaShowKopCetak && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                          </div>
                          <div>
                            <div className="text-xs font-bold text-slate-900">Dengan KOP</div>
                            <div className="text-[10.5px] text-slate-500 mt-0.5">Kop Resmi Pemkab</div>
                          </div>
                        </button>
                      </div>
                    </div>

                    {/* Semester & Tahun Ajaran */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Semester:
                        </label>
                        <select
                          value={siswaSemesterCetak}
                          onChange={(e) => setSiswaSemesterCetak(e.target.value)}
                          className="w-full text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-2 font-medium text-slate-800 focus:outline-none"
                        >
                          <option value="Ganjil">Semester Ganjil</option>
                          <option value="Genap">Semester Genap</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Tahun Ajaran:
                        </label>
                        <input
                          type="text"
                          value={siswaTahunAjaranCetak}
                          onChange={(e) => setSiswaTahunAjaranCetak(e.target.value)}
                          className="w-full text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-2 font-medium text-slate-800 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Ringkasan Cetak Siswa */}
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
                    <span className="font-bold text-slate-800 uppercase tracking-wider block text-[11px]">
                      Ringkasan Dokumen Presensi Siswa
                    </span>
                    <div className="space-y-1 text-slate-600 text-[11.5px]">
                      <div className="flex justify-between">
                        <span>Kop Surat:</span>
                        <span className={`font-semibold ${!siswaShowKopCetak ? 'text-emerald-700' : 'text-slate-900'}`}>
                          {!siswaShowKopCetak ? 'Tanpa KOP (Pilihan Utama)' : 'Resmi Kedinasan Pemkab Jembrana'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Format Halaman:</span>
                        <span className="font-semibold text-slate-900">A4 Landscape (Memanjang)</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Kelas Dicetak:</span>
                        <span className="font-bold text-blue-900">
                          {siswaKelasCetak === 'Semua' ? 'Semua Kelas' : `Kelas ${siswaKelasCetak}`} ({siswaKelasCetak === 'Semua' ? siswaList.length : siswaList.filter((s) => s.kelas === siswaKelasCetak).length} Siswa)
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Periode:</span>
                        <span className="font-semibold text-slate-900">
                          {NAMA_BULAN_INDONESIA[absenMonth - 1]} {absenYear}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Hari Efektif Belajar:</span>
                        <span className="font-bold text-emerald-700">
                          {Math.max(0, new Date(absenYear, absenMonth, 0).getDate() - Object.keys(absenHolidays).length)} Hari ({Object.keys(absenHolidays).length} Hari Libur)
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Format Kolom:</span>
                        <span className="font-semibold text-slate-900">
                          No, Nama Siswa, Tanggal (1..{new Date(absenYear, absenMonth, 0).getDate()}), S, I, A, Jml
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Modal */}
            <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowCetakAbsenSiswaModal(false)}
                className="px-4 py-2 text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={doPrintAbsenSiswa}
                className="px-5 py-2.5 bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs sm:text-sm rounded-xl shadow-sm flex items-center gap-2 transition-all hover:shadow"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak Presensi Siswa (Landscape)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Pratinjau & Konfirmasi Impor Data Siswa */}
      {importSiswaPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden flex flex-col my-auto max-h-[90vh]">
            {/* Modal Header */}
            <div className="bg-indigo-950 px-6 py-4 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-800/80 border border-indigo-700 flex items-center justify-center text-indigo-200 shrink-0">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold">Pratinjau Impor Data Siswa</h2>
                  <p className="text-xs text-indigo-200 mt-0.5">
                    File: <span className="font-mono font-semibold text-white">{importSiswaPreview.filename}</span> • <span className="text-emerald-300 font-bold">{importSiswaPreview.total} siswa terdeteksi</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setImportSiswaPreview(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                title="Batalkan"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1">
              {/* Status Verification Notice */}
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="text-xs text-emerald-950 space-y-1">
                  <p className="font-bold text-emerald-900">
                    Format Kolom Berhasil Dipetakan Sesuai Standar Ekspor!
                  </p>
                  <p className="text-emerald-800 leading-relaxed">
                    Sistem secara cerdas mendeteksi kolom NIS, NISN, Nama, Kelas, JK, Tempat/Tgl Lahir, Nama Ortu, dan Alamat. Posisi data tidak akan tertukar atau berantakan.
                  </p>
                </div>
              </div>

              {/* Import Mode Selection */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2.5">
                <label className="text-xs font-bold text-slate-800 block">
                  Pilih Cara Penyimpanan ke Sistem:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <label
                    className={`p-3 rounded-xl border text-xs cursor-pointer transition-all flex flex-col justify-between ${
                      importMode === 'merge'
                        ? 'bg-indigo-50 border-indigo-400 ring-2 ring-indigo-300 text-indigo-950'
                        : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold">1. Gabung / Perbarui</span>
                      <input
                        type="radio"
                        name="siswaImportMode"
                        checked={importMode === 'merge'}
                        onChange={() => setImportMode('merge')}
                        className="text-indigo-600 cursor-pointer"
                      />
                    </div>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      Siswa dengan NIS sama diperbarui datanya, siswa baru langsung ditambahkan.
                    </p>
                  </label>

                  <label
                    className={`p-3 rounded-xl border text-xs cursor-pointer transition-all flex flex-col justify-between ${
                      importMode === 'replace'
                        ? 'bg-amber-50 border-amber-400 ring-2 ring-amber-300 text-amber-950'
                        : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold">2. Timpa Seluruh Data</span>
                      <input
                        type="radio"
                        name="siswaImportMode"
                        checked={importMode === 'replace'}
                        onChange={() => setImportMode('replace')}
                        className="text-amber-600 cursor-pointer"
                      />
                    </div>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      Hapus data lama & ganti dengan file ini. Sangat tepat bila data siswa sebelumnya berantakan.
                    </p>
                  </label>

                  <label
                    className={`p-3 rounded-xl border text-xs cursor-pointer transition-all flex flex-col justify-between ${
                      importMode === 'append'
                        ? 'bg-indigo-50 border-indigo-400 ring-2 ring-indigo-300 text-indigo-950'
                        : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold">3. Tambahkan Baru Saja</span>
                      <input
                        type="radio"
                        name="siswaImportMode"
                        checked={importMode === 'append'}
                        onChange={() => setImportMode('append')}
                        className="text-indigo-600 cursor-pointer"
                      />
                    </div>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      Masukkan semua baris sebagai siswa baru tanpa memeriksa NIS yang sama.
                    </p>
                  </label>
                </div>
              </div>

              {/* Table Preview */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-slate-700">
                    Pratinjau {Math.min(10, importSiswaPreview.data.length)} dari {importSiswaPreview.total} Siswa Terbaca:
                  </h4>
                  <span className="text-[11px] text-slate-500">
                    Pastikan kolom telah sesuai urutan
                  </span>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                  <div className="overflow-x-auto max-h-56">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold sticky top-0">
                          <th className="py-2.5 px-3 text-center w-10">No</th>
                          <th className="py-2.5 px-3">NIS</th>
                          <th className="py-2.5 px-3">NISN</th>
                          <th className="py-2.5 px-3">Nama Siswa</th>
                          <th className="py-2.5 px-3 text-center">Kelas</th>
                          <th className="py-2.5 px-3 text-center">L/P</th>
                          <th className="py-2.5 px-3">Tempat Lahir</th>
                          <th className="py-2.5 px-3">Tgl Lahir</th>
                          <th className="py-2.5 px-3">Nama Ortu / Wali</th>
                          <th className="py-2.5 px-3">Alamat</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {importSiswaPreview.data.slice(0, 10).map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="py-2 px-3 text-center text-slate-400">{idx + 1}</td>
                            <td className="py-2 px-3 font-mono font-bold text-slate-800">{row.nis}</td>
                            <td className="py-2 px-3 font-mono text-indigo-900">{row.nisn}</td>
                            <td className="py-2 px-3 font-semibold text-slate-900">{row.nama}</td>
                            <td className="py-2 px-3 text-center">
                              <span className="bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded font-bold text-[11px]">
                                {row.kelas}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-center font-bold">
                              {row.jenisKelamin === 'L' ? (
                                <span className="text-blue-700">L</span>
                              ) : (
                                <span className="text-rose-700">P</span>
                              )}
                            </td>
                            <td className="py-2 px-3 text-slate-700">{row.tempatLahir}</td>
                            <td className="py-2 px-3 text-slate-600 font-mono text-[11px]">{row.tglLahir}</td>
                            <td className="py-2 px-3 text-slate-800">{row.namaOrtu}</td>
                            <td className="py-2 px-3 text-slate-600 max-w-[180px] truncate" title={row.alamat}>
                              {row.alamat}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
              <button
                type="button"
                onClick={() => setImportSiswaPreview(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                Batalkan
              </button>
              <button
                type="button"
                onClick={() => {
                  onImportSiswa(importSiswaPreview.data, importMode);
                  setImportSiswaPreview(null);
                }}
                className="px-5 py-2.5 text-xs font-bold bg-indigo-700 hover:bg-indigo-600 text-white rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Simpan {importSiswaPreview.total} Data Siswa</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Kembalikan Data Awal Siswa */}
      {showResetConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 text-amber-600">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                <RotateCcw className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Kembalikan Data Siswa Awal?</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Tindakan ini akan mengatur ulang data siswa ke data bawaan resmi SDN 1 Pekutatan (10 siswa sampel teruji) dan menghapus data siswa yang saat ini berantakan.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowResetConfirmModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={() => {
                  setShowResetConfirmModal(false);
                  if (onResetSiswaDefault) onResetSiswaDefault();
                }}
                className="px-4 py-2 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-xl transition-colors cursor-pointer shadow-xs"
              >
                Ya, Kembalikan Data Awal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Kosongkan Seluruh Data Siswa */}
      {showClearConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Kosongkan Seluruh Data Siswa?</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Semua data siswa di sistem akan dihapus. Anda dapat mengunggah file CSV baru yang bersih setelahnya.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowClearConfirmModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={() => {
                  setShowClearConfirmModal(false);
                  if (onClearAllSiswa) onClearAllSiswa();
                }}
                className="px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl transition-colors cursor-pointer shadow-xs"
              >
                Ya, Kosongkan Data
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
