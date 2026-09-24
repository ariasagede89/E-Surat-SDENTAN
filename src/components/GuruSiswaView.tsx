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
  ChevronLeft,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { Guru, Siswa, PengaturanSekolah, KategoriPTK, PaperSize } from '../types';
import {
  exportToCsv,
  exportToWord,
  buildAbsenGuruHtml,
  buildAbsenPTKHtml,
  buildAbsenSiswaHtml,
  printHtmlElement,
  printLandscapeHtml,
  printPortraitHtml,
  exportAbsenPTKToWord,
  exportAbsenSiswaToWord,
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
import {
  KalenderKecilAcuanUmur,
  formatTanggalIndonesiaLengkap,
  formatTanggalIndonesiaPendek,
  getTodayString,
} from './KalenderKecilAcuanUmur';

/**
 * Menghitung umur siswa dalam tahun berdasarkan tanggal lahir dan tanggal acuan (default: hari ini).
 * Mendukung format YYYY-MM-DD, DD-MM-YYYY, teks tanggal Indonesia ("12 Juni 2014"), dll.
 */
export function hitungUmurSiswa(tglLahir: string, acuanStrOrDate?: string | Date): number | null {
  if (!tglLahir) return null;
  const str = tglLahir.trim();
  let birthDate: Date | null = null;
  if (/^\d{4}[-/.]\d{1,2}[-/.]\d{1,2}/.test(str)) {
    const parts = str.split(/[-/.]/);
    birthDate = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  } else if (/^\d{1,2}[-/.]\d{1,2}[-/.]\d{4}/.test(str)) {
    const parts = str.split(/[-/.]/);
    birthDate = new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
  } else {
    const months: Record<string, number> = {
      januari: 0, februari: 1, maret: 2, april: 3, mei: 4, juni: 5,
      juli: 6, agustus: 7, september: 8, oktober: 9, november: 10, desember: 11,
      jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
    };
    const match = str.match(/(\d{1,2})\s+([a-zA-Z]+)\s+(\d{4})/);
    if (match) {
      const d = parseInt(match[1], 10);
      const mStr = match[2].toLowerCase();
      const y = parseInt(match[3], 10);
      if (months[mStr] !== undefined) {
        birthDate = new Date(y, months[mStr], d);
      }
    } else {
      const parsed = new Date(str);
      if (!isNaN(parsed.getTime())) {
        birthDate = parsed;
      }
    }
  }

  if (!birthDate || isNaN(birthDate.getTime())) return null;

  let refDate: Date;
  if (acuanStrOrDate instanceof Date) {
    refDate = acuanStrOrDate;
  } else if (typeof acuanStrOrDate === 'string' && acuanStrOrDate.trim()) {
    const parts = acuanStrOrDate.trim().split(/[-/.]/);
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        refDate = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      } else {
        refDate = new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
      }
    } else {
      const p = new Date(acuanStrOrDate);
      refDate = !isNaN(p.getTime()) ? p : new Date();
    }
  } else {
    refDate = new Date();
  }

  let age = refDate.getFullYear() - birthDate.getFullYear();
  const m = refDate.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && refDate.getDate() < birthDate.getDate())) {
    age--;
  }
  return age >= 0 && age < 100 ? age : null;
}

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
  const [filterJkSiswa, setFilterJkSiswa] = useState<'Semua' | 'L' | 'P'>('Semua');
  const [filterUmurSiswa, setFilterUmurSiswa] = useState<string>('Semua');
  const [filterUmurMin, setFilterUmurMin] = useState<string>('');
  const [filterUmurMax, setFilterUmurMax] = useState<string>('');
  const [tglAcuanUmur, setTglAcuanUmur] = useState<string>(getTodayString);
  const [showKalenderAcuan, setShowKalenderAcuan] = useState<boolean>(false);
  const [showDownloadSiswaMenu, setShowDownloadSiswaMenu] = useState(false);

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
  const [siswaOrientationCetak, setSiswaOrientationCetak] = useState<'portrait' | 'landscape'>('portrait'); // Pilihan utama: Potret
  const [siswaPaperSizeCetak, setSiswaPaperSizeCetak] = useState<PaperSize>('F4');
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
      orientation: siswaOrientationCetak,
      paperSize: siswaPaperSizeCetak,
    });

    if (siswaOrientationCetak === 'portrait') {
      printPortraitHtml(
        html,
        `Presensi Siswa Kelas ${siswaKelasCetak} - ${bulanNama} (Potret ${siswaPaperSizeCetak})`,
        siswaPaperSizeCetak
      );
    } else {
      printLandscapeHtml(
        html,
        `Presensi Siswa Kelas ${siswaKelasCetak} - ${bulanNama} (Lanskap ${siswaPaperSizeCetak})`,
        siswaPaperSizeCetak
      );
    }
  };

  const doExportWordAbsenSiswa = () => {
    exportAbsenSiswaToWord(
      siswaList,
      siswaKelasCetak,
      sekolah,
      {
        siswaList,
        kelas: siswaKelasCetak,
        sekolah,
        year: absenYear,
        month: absenMonth,
        holidays: absenHolidays,
        semester: siswaSemesterCetak,
        tahunAjaran: siswaTahunAjaranCetak,
        showKop: siswaShowKopCetak,
        orientation: siswaOrientationCetak,
        paperSize: siswaPaperSizeCetak,
      },
      siswaPaperSizeCetak,
      siswaOrientationCetak
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
  const [showUploadSiswaModal, setShowUploadSiswaModal] = useState<boolean>(false);
  const [showTemplateSiswaMenu, setShowTemplateSiswaMenu] = useState<boolean>(false);
  const [isDraggingFile, setIsDraggingFile] = useState<boolean>(false);
  const [previewSearch, setPreviewSearch] = useState<string>('');
  const [previewKelasFilter, setPreviewKelasFilter] = useState<string>('Semua');
  const [previewJkFilter, setPreviewJkFilter] = useState<string>('Semua');
  const [previewRowsPerPage, setPreviewRowsPerPage] = useState<number>(25);
  const [previewPage, setPreviewPage] = useState<number>(1);
  const [uploadError, setUploadError] = useState<string | null>(null);
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

  // Process and parse Siswa CSV file with automatic header mapping and error handling
  const processSiswaCsvFile = (file: File) => {
    setUploadError(null);
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      const res = parseSiswaCsv(text);
      if (!res.success || res.data.length === 0) {
        setUploadError(res.errors.join('\n') || 'File CSV tidak memiliki baris data siswa yang valid.');
        setShowUploadSiswaModal(true);
        return;
      }

      setImportSiswaPreview({
        filename: file.name,
        data: res.data,
        total: res.totalRows,
        detectedHeaders: res.detectedHeaders,
      });
      setImportMode('merge');
      setPreviewSearch('');
      setPreviewKelasFilter('Semua');
      setPreviewJkFilter('Semua');
      setPreviewPage(1);
      setShowUploadSiswaModal(true);
    };
    reader.onerror = () => {
      setUploadError('Gagal membaca file CSV. Pastikan file dalam kondisi baik.');
      setShowUploadSiswaModal(true);
    };
    reader.readAsText(file);
    if (fileInputSiswaRef.current) fileInputSiswaRef.current.value = '';
  };

  // Import Siswa via CSV (Header-aware, respects export structure, opens interactive preview)
  const handleUploadSiswaCsv = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processSiswaCsvFile(file);
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
      const term = searchTerm.toLowerCase();
      const matchesSearch =
        s.nama.toLowerCase().includes(term) ||
        s.nisn.includes(term) ||
        s.nis.includes(term) ||
        (s.alamat && s.alamat.toLowerCase().includes(term));
      const matchesKelas = filterKelasSiswa === 'Semua' || s.kelas === filterKelasSiswa;
      const matchesJk = filterJkSiswa === 'Semua' || s.jenisKelamin === filterJkSiswa;

      const umur = hitungUmurSiswa(s.tglLahir, tglAcuanUmur);
      let matchesUmur = true;
      if (filterUmurSiswa === 'kustom') {
        if (umur === null) {
          matchesUmur = false;
        } else {
          const min = filterUmurMin.trim() !== '' ? parseInt(filterUmurMin, 10) : null;
          const max = filterUmurMax.trim() !== '' ? parseInt(filterUmurMax, 10) : null;
          if (min !== null && !isNaN(min) && umur < min) {
            matchesUmur = false;
          }
          if (max !== null && !isNaN(max) && umur > max) {
            matchesUmur = false;
          }
        }
      } else if (filterUmurSiswa !== 'Semua') {
        if (umur === null) {
          matchesUmur = false;
        } else {
          matchesUmur = umur === parseInt(filterUmurSiswa, 10);
        }
      }

      return matchesSearch && matchesKelas && matchesJk && matchesUmur;
    })
  );

  const availableKelas = Array.from(new Set(siswaList.map((s) => s.kelas))).sort(compareKelas);
  const availableUmur: number[] = Array.from(
    new Set<number>(
      siswaList
        .map((s) => hitungUmurSiswa(s.tglLahir, tglAcuanUmur))
        .filter((u): u is number => u !== null)
    )
  ).sort((a, b) => a - b);

  // Export Data Siswa Berdasarkan Filter yang Diterapkan (Format CSV / Excel)
  const handleExportFilteredSiswa = (format: 'excel' | 'comma' = 'excel') => {
    if (filteredSiswa.length === 0) {
      alert('Tidak ada data siswa yang cocok dengan filter saat ini untuk diunduh.');
      return;
    }
    const data = filteredSiswa.map((s, idx) => {
      const umur = hitungUmurSiswa(s.tglLahir, tglAcuanUmur);
      return {
        No: idx + 1,
        NIS: s.nis,
        NISN: s.nisn,
        'Nama Siswa': s.nama,
        Kelas: s.kelas,
        'Jenis Kelamin': s.jenisKelamin === 'L' ? 'Laki-laki' : 'Perempuan',
        'Umur (Tahun)': umur !== null ? umur : '-',
        'Tempat Lahir': s.tempatLahir,
        'Tanggal Lahir': s.tglLahir,
        'Nama Orang Tua / Wali': s.namaOrtu,
        Alamat: s.alamat,
      };
    });

    let filterLabel = '';
    if (filterKelasSiswa !== 'Semua') filterLabel += `_Kelas_${filterKelasSiswa}`;
    if (filterJkSiswa !== 'Semua') filterLabel += `_JK_${filterJkSiswa}`;
    if (filterUmurSiswa === 'kustom') {
      const minText = filterUmurMin ? `${filterUmurMin}` : 'min';
      const maxText = filterUmurMax ? `${filterUmurMax}` : 'max';
      filterLabel += `_Umur_${minText}-${maxText}th`;
    } else if (filterUmurSiswa !== 'Semua') {
      filterLabel += `_Umur_${filterUmurSiswa}th`;
    }
    filterLabel += `_Acuan_${tglAcuanUmur}`;

    const delimiter = format === 'excel' ? ';' : ',';
    const suffix = format === 'excel' ? '_Excel' : '_Standar';

    exportToCsv(
      `Data_Siswa_SDN_1_Pekutatan${filterLabel || '_Semua'}${suffix}`,
      data,
      delimiter,
      true
    );
  };

  // Export Data Siswa Berdasarkan Filter yang Diterapkan (Format Dokumen Word .doc)
  const handleExportWordFilteredSiswa = () => {
    if (filteredSiswa.length === 0) {
      alert('Tidak ada data siswa yang cocok dengan filter saat ini.');
      return;
    }
    const tableRows = filteredSiswa
      .map((s, idx) => {
        const u = hitungUmurSiswa(s.tglLahir, tglAcuanUmur);
        return `
        <tr>
          <td style="text-align: center; padding: 6px 8px; border: 1px solid #333;">${idx + 1}</td>
          <td style="padding: 6px 8px; border: 1px solid #333; font-weight: bold;">${s.nama}</td>
          <td style="text-align: center; padding: 6px 8px; border: 1px solid #333;">${s.jenisKelamin === 'L' ? 'Laki-laki' : 'Perempuan'}</td>
          <td style="text-align: center; padding: 6px 8px; border: 1px solid #333;">${s.nisn}</td>
          <td style="text-align: center; padding: 6px 8px; border: 1px solid #333;">${s.nis}</td>
          <td style="text-align: center; padding: 6px 8px; border: 1px solid #333;">Kelas ${s.kelas}</td>
          <td style="text-align: center; padding: 6px 8px; border: 1px solid #333;">${u !== null ? `${u} Thn` : '-'}</td>
          <td style="padding: 6px 8px; border: 1px solid #333;">${s.tempatLahir}, ${s.tglLahir}</td>
          <td style="padding: 6px 8px; border: 1px solid #333;">${s.namaOrtu}</td>
          <td style="padding: 6px 8px; border: 1px solid #333;">${s.alamat}</td>
        </tr>
      `;
      })
      .join('');

    const html = `
      <div style="font-family: Arial, sans-serif; font-size: 11pt; color: #111;">
        <div style="text-align: center; margin-bottom: 18px;">
          <h2 style="margin: 0; font-size: 14pt; text-transform: uppercase;">DAFTAR DATA PESERTA DIDIK</h2>
          <h3 style="margin: 4px 0 0 0; font-size: 12pt; text-transform: uppercase;">${sekolah.nama || 'SDN 1 PEKUTATAN'}</h3>
          <p style="margin: 4px 0 0 0; font-size: 10pt; color: #555;">Kecamatan Pekutatan, Kabupaten Jembrana - Bali</p>
          <p style="margin: 4px 0 0 0; font-size: 9.5pt; color: #4338ca; font-weight: bold;">Acuan Perhitungan Umur: ${formatTanggalIndonesiaLengkap(tglAcuanUmur)}</p>
          <p style="margin: 4px 0 0 0; font-size: 10pt; font-weight: bold;">Total Data: ${filteredSiswa.length} Siswa</p>
        </div>
        <table style="width: 100%; border-collapse: collapse; font-size: 9.5pt;" border="1">
          <thead>
            <tr style="background-color: #f2f2f2; font-weight: bold; text-align: center;">
              <th style="padding: 8px; border: 1px solid #333; width: 35px;">No</th>
              <th style="padding: 8px; border: 1px solid #333;">Nama Siswa</th>
              <th style="padding: 8px; border: 1px solid #333; width: 75px;">JK</th>
              <th style="padding: 8px; border: 1px solid #333; width: 90px;">NISN</th>
              <th style="padding: 8px; border: 1px solid #333; width: 60px;">NIS</th>
              <th style="padding: 8px; border: 1px solid #333; width: 65px;">Kelas</th>
              <th style="padding: 8px; border: 1px solid #333; width: 55px;">Umur</th>
              <th style="padding: 8px; border: 1px solid #333;">Tempat, Tgl Lahir</th>
              <th style="padding: 8px; border: 1px solid #333;">Nama Orang Tua</th>
              <th style="padding: 8px; border: 1px solid #333;">Alamat</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
      </div>
    `;

    exportToWord(`Data_Siswa_SDN_1_Pekutatan_Terfilter`, html, 'F4', 'landscape');
  };

  // Preview Data Filtered & Paginated for Import Modal
  const previewData = importSiswaPreview?.data || [];
  const previewTotalL = previewData.filter((s) => s.jenisKelamin === 'L').length;
  const previewTotalP = previewData.filter((s) => s.jenisKelamin === 'P').length;
  const previewKelasCounts = previewData.reduce((acc, s) => {
    acc[s.kelas] = (acc[s.kelas] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const sortedPreviewKelas = Object.keys(previewKelasCounts).sort(compareKelas);

  const filteredImportPreview = previewData.filter((s) => {
    const term = previewSearch.trim().toLowerCase();
    const matchSearch =
      !term ||
      s.nama.toLowerCase().includes(term) ||
      s.nis.toLowerCase().includes(term) ||
      s.nisn.toLowerCase().includes(term) ||
      s.namaOrtu.toLowerCase().includes(term) ||
      s.alamat.toLowerCase().includes(term) ||
      s.tempatLahir.toLowerCase().includes(term);

    const matchKelas =
      previewKelasFilter === 'Semua' || s.kelas === previewKelasFilter;

    const matchJk =
      previewJkFilter === 'Semua' || s.jenisKelamin === previewJkFilter;

    return matchSearch && matchKelas && matchJk;
  });

  const totalPreviewRows = filteredImportPreview.length;
  const totalPreviewPages =
    previewRowsPerPage === -1
      ? 1
      : Math.max(1, Math.ceil(totalPreviewRows / previewRowsPerPage));
  const currentPreviewPage = Math.min(Math.max(1, previewPage), totalPreviewPages);
  const previewStartIndex =
    previewRowsPerPage === -1
      ? 0
      : (currentPreviewPage - 1) * previewRowsPerPage;
  const paginatedImportPreview =
    previewRowsPerPage === -1
      ? filteredImportPreview
      : filteredImportPreview.slice(
          previewStartIndex,
          previewStartIndex + previewRowsPerPage
        );

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
          {/* Action & Filter Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs space-y-3">
            {/* Baris 1: Filter Controls (Search, Kelas, JK, Umur) & Action Buttons */}
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2 flex-1">
                {/* Search */}
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Cari nama siswa, NISN, NIS..."
                    className="w-full text-xs sm:text-sm pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                  />
                </div>

                {/* Filter Kelas */}
                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 shadow-2xs">
                  <span className="text-[11px] font-semibold text-slate-500">Kelas:</span>
                  <select
                    value={filterKelasSiswa}
                    onChange={(e) => setFilterKelasSiswa(e.target.value)}
                    className="text-xs bg-transparent focus:outline-none font-bold text-slate-800 cursor-pointer"
                  >
                    <option value="Semua">Semua Kelas</option>
                    {availableKelas.map((k) => (
                      <option key={k} value={k}>
                        Kelas {k}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Filter Jenis Kelamin */}
                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 shadow-2xs">
                  <span className="text-[11px] font-semibold text-slate-500">JK:</span>
                  <select
                    value={filterJkSiswa}
                    onChange={(e) => setFilterJkSiswa(e.target.value as 'Semua' | 'L' | 'P')}
                    className="text-xs bg-transparent focus:outline-none font-bold text-slate-800 cursor-pointer"
                  >
                    <option value="Semua">Semua (L &amp; P)</option>
                    <option value="L">Laki-laki (L)</option>
                    <option value="P">Perempuan (P)</option>
                  </select>
                </div>

                {/* Filter Umur */}
                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 shadow-2xs">
                  <span className="text-[11px] font-semibold text-slate-500">Umur:</span>
                  <select
                    value={filterUmurSiswa}
                    onChange={(e) => {
                      setFilterUmurSiswa(e.target.value);
                      if (e.target.value !== 'kustom') {
                        setFilterUmurMin('');
                        setFilterUmurMax('');
                      }
                    }}
                    className="text-xs bg-transparent focus:outline-none font-bold text-slate-800 cursor-pointer"
                  >
                    <option value="Semua">Semua Umur</option>
                    <option value="kustom">Rentang Umur (Kustom)...</option>
                    {availableUmur.length > 0 && (
                      <optgroup label="Pilih Umur Spesifik">
                        {availableUmur.map((u) => (
                          <option key={u} value={String(u)}>
                            {u} Tahun
                          </option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                </div>

                {/* Input Rentang Umur Kustom */}
                {filterUmurSiswa === 'kustom' && (
                  <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-300 rounded-lg px-2.5 py-1 shadow-2xs text-xs animate-in fade-in">
                    <span className="text-[11px] font-semibold text-amber-900">Rentang:</span>
                    <input
                      type="number"
                      min="1"
                      max="30"
                      placeholder="Min"
                      value={filterUmurMin}
                      onChange={(e) => setFilterUmurMin(e.target.value)}
                      className="w-12 text-center text-xs py-1 px-1 border border-amber-300 rounded bg-white font-bold text-amber-950 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                      title="Batas Umur Minimum (Tahun)"
                    />
                    <span className="text-slate-500 text-xs font-medium">s/d</span>
                    <input
                      type="number"
                      min="1"
                      max="30"
                      placeholder="Max"
                      value={filterUmurMax}
                      onChange={(e) => setFilterUmurMax(e.target.value)}
                      className="w-12 text-center text-xs py-1 px-1 border border-amber-300 rounded bg-white font-bold text-amber-950 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                      title="Batas Umur Maksimum (Tahun)"
                    />
                    <span className="text-[11px] text-amber-900 font-semibold">Tahun</span>
                  </div>
                )}

                {/* Kalender Kecil Acuan Menghitung Umur */}
                {filterUmurSiswa !== 'Semua' && (
                  <div className="flex items-center animate-in fade-in slide-in-from-left-2">
                    <KalenderKecilAcuanUmur
                      value={tglAcuanUmur}
                      onChange={(val) => setTglAcuanUmur(val)}
                      isOpen={showKalenderAcuan}
                      onClose={() => setShowKalenderAcuan(false)}
                      onToggle={() => setShowKalenderAcuan(!showKalenderAcuan)}
                    />
                  </div>
                )}

                {/* Reset Filter Button */}
                {(searchTerm ||
                  filterKelasSiswa !== 'Semua' ||
                  filterJkSiswa !== 'Semua' ||
                  filterUmurSiswa !== 'Semua' ||
                  filterUmurMin !== '' ||
                  filterUmurMax !== '') && (
                  <button
                    onClick={() => {
                      setSearchTerm('');
                      setFilterKelasSiswa('Semua');
                      setFilterJkSiswa('Semua');
                      setFilterUmurSiswa('Semua');
                      setFilterUmurMin('');
                      setFilterUmurMax('');
                      setTglAcuanUmur(getTodayString());
                      setShowKalenderAcuan(false);
                    }}
                    className="text-xs text-rose-600 hover:text-rose-800 font-semibold px-2 py-1.5 rounded-lg hover:bg-rose-50 flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                    title="Reset Semua Filter"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset</span>
                  </button>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                {/* Tombol Upload Data Siswa */}
                <button
                  onClick={() => {
                    setShowUploadSiswaModal(true);
                    setUploadError(null);
                  }}
                  className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 font-semibold text-xs sm:text-sm rounded-xl border border-indigo-200 flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                  title="Unggah CSV (Otomatis membaca format ekspor &amp; tampilkan pratinjau tabel rapi)"
                >
                  <Upload className="w-4 h-4 text-indigo-700" />
                  <span>Upload Data Siswa</span>
                </button>

                {/* Tombol Unduh Format Template CSV Siswa */}
                <div className="relative">
                  <button
                    onClick={() => setShowTemplateSiswaMenu(!showTemplateSiswaMenu)}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs sm:text-sm rounded-xl border border-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="Unduh contoh format CSV siap isi sesuai standar ekspor"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-slate-600" />
                    <span>Unduh Format CSV</span>
                    <ChevronDown className="w-3.5 h-3.5 opacity-70" />
                  </button>

                  {showTemplateSiswaMenu && (
                    <>
                      <div
                        className="fixed inset-0 z-20"
                        onClick={() => setShowTemplateSiswaMenu(false)}
                      />
                      <div className="absolute left-0 mt-1.5 w-68 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-30 animate-in fade-in">
                        <div className="px-3.5 py-1.5 border-b border-slate-100">
                          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                            Pilih Format Template CSV
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            setShowTemplateSiswaMenu(false);
                            downloadSiswaTemplateCsv(';');
                          }}
                          className="w-full text-left px-3.5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-900 flex items-center gap-2.5 cursor-pointer transition-colors"
                        >
                          <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
                          <div>
                            <div className="font-bold text-slate-800">Format Excel (Titik Koma ';')</div>
                            <div className="text-[10px] text-slate-500 font-normal">
                              Sangat direkomendasikan untuk Ms. Excel (otomatis terbagi kolom rapi)
                            </div>
                          </div>
                        </button>
                        <button
                          onClick={() => {
                            setShowTemplateSiswaMenu(false);
                            downloadSiswaTemplateCsv(',');
                          }}
                          className="w-full text-left px-3.5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-indigo-50 hover:text-indigo-900 flex items-center gap-2.5 cursor-pointer transition-colors border-t border-slate-100"
                        >
                          <FileSpreadsheet className="w-4 h-4 text-indigo-600 shrink-0" />
                          <div>
                            <div className="font-bold text-slate-800">Format Standar (Koma ',')</div>
                            <div className="text-[10px] text-slate-500 font-normal">
                              Standar universal untuk Google Sheets &amp; Dapodik
                            </div>
                          </div>
                        </button>
                      </div>
                    </>
                  )}
                </div>

                {/* Menu Unduh Data Siswa Berdasarkan Filter */}
                <div className="relative">
                  <button
                    onClick={() => setShowDownloadSiswaMenu(!showDownloadSiswaMenu)}
                    className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs sm:text-sm rounded-xl shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="Menu Unduh Data Siswa Berdasarkan Filter"
                  >
                    <Download className="w-4 h-4" />
                    <span>Unduh Data Siswa ({filteredSiswa.length})</span>
                    <ChevronDown className="w-3.5 h-3.5 opacity-80" />
                  </button>

                  {showDownloadSiswaMenu && (
                    <>
                      <div
                        className="fixed inset-0 z-20"
                        onClick={() => setShowDownloadSiswaMenu(false)}
                      />
                      <div className="absolute right-0 mt-1.5 w-72 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-30 animate-in fade-in">
                        <div className="px-3.5 py-2 border-b border-slate-100">
                          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                            Unduh Data Terfilter
                          </div>
                          <div className="text-xs font-semibold text-emerald-800">
                            {filteredSiswa.length} dari {siswaList.length} siswa terpilih
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            setShowDownloadSiswaMenu(false);
                            handleExportFilteredSiswa('excel');
                          }}
                          className="w-full text-left px-3.5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-900 flex items-center gap-2.5 cursor-pointer transition-colors"
                        >
                          <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
                          <div>
                            <div className="font-bold text-slate-800">Unduh Format Excel (CSV ';')</div>
                            <div className="text-[10px] text-slate-500 font-normal">
                              Tersusun langsung dalam kolom tabel rapi di Microsoft Excel
                            </div>
                          </div>
                        </button>
                        <button
                          onClick={() => {
                            setShowDownloadSiswaMenu(false);
                            handleExportFilteredSiswa('comma');
                          }}
                          className="w-full text-left px-3.5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-indigo-50 hover:text-indigo-900 flex items-center gap-2.5 cursor-pointer transition-colors border-t border-slate-100"
                        >
                          <FileSpreadsheet className="w-4 h-4 text-indigo-600 shrink-0" />
                          <div>
                            <div className="font-bold text-slate-800">Unduh Format Standar (CSV ',')</div>
                            <div className="text-[10px] text-slate-500 font-normal">
                              Standar universal untuk Google Sheets &amp; Dapodik
                            </div>
                          </div>
                        </button>
                        <button
                          onClick={() => {
                            setShowDownloadSiswaMenu(false);
                            handleExportWordFilteredSiswa();
                          }}
                          className="w-full text-left px-3.5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-900 flex items-center gap-2.5 cursor-pointer transition-colors border-t border-slate-100"
                        >
                          <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                          <div>
                            <div className="font-bold text-slate-800">Unduh Dokumen Word (.doc)</div>
                            <div className="text-[10px] text-slate-500 font-normal">
                              Tabel cetak rapi siap arsip &amp; cetak resmi
                            </div>
                          </div>
                        </button>
                      </div>
                    </>
                  )}
                </div>

                {/* Tombol Cetak Absen Siswa */}
                <button
                  onClick={() =>
                    openCetakSiswaModal(
                      filterKelasSiswa !== 'Semua' ? filterKelasSiswa : (availableKelas[0] || '6A')
                    )
                  }
                  className="px-3.5 py-2 bg-blue-900 hover:bg-blue-800 text-white font-semibold text-xs sm:text-sm rounded-xl shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Cetak Presensi Siswa Bulanan (Format Potret Pilihan Utama / Lanskap &amp; Kostum Libur)"
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

            {/* Info Filter Status */}
            <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-700">
                  Menampilkan {filteredSiswa.length} dari {siswaList.length} siswa
                </span>
                {(filterKelasSiswa !== 'Semua' ||
                  filterJkSiswa !== 'Semua' ||
                  filterUmurSiswa !== 'Semua' ||
                  filterUmurMin !== '' ||
                  filterUmurMax !== '' ||
                  searchTerm) && (
                  <span className="text-[11px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-medium">
                    Filter aktif: {[
                      filterKelasSiswa !== 'Semua' ? `Kelas ${filterKelasSiswa}` : null,
                      filterJkSiswa !== 'Semua' ? (filterJkSiswa === 'L' ? 'Laki-laki' : 'Perempuan') : null,
                      filterUmurSiswa === 'kustom'
                        ? filterUmurMin || filterUmurMax
                          ? `Rentang Umur ${filterUmurMin || '0'} - ${filterUmurMax || '∞'} thn (Acuan: ${formatTanggalIndonesiaPendek(tglAcuanUmur)})`
                          : `Rentang Umur Kustom (Acuan: ${formatTanggalIndonesiaPendek(tglAcuanUmur)})`
                        : filterUmurSiswa !== 'Semua'
                        ? `Umur ${filterUmurSiswa} thn (Acuan: ${formatTanggalIndonesiaPendek(tglAcuanUmur)})`
                        : null,
                      searchTerm ? `"${searchTerm}"` : null,
                    ].filter(Boolean).join(', ')}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Table Data Siswa */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                    <th className="py-3 px-4 w-12 text-center">No</th>
                    <th className="py-3 px-4">Nama Siswa &amp; JK</th>
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
                    <th className="py-3 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => setShowKalenderAcuan(true)}
                        className="flex flex-col items-center mx-auto hover:text-indigo-700 transition-colors cursor-pointer group"
                        title="Klik untuk membuka kalender acuan perhitungan umur siswa"
                      >
                        <span className="flex items-center gap-1 group-hover:underline">
                          <span>Umur</span>
                          <Calendar className="w-3 h-3 text-indigo-500 opacity-70 group-hover:opacity-100" />
                        </span>
                        <span className="text-[9.5px] font-normal text-slate-500 whitespace-nowrap">
                          (per {formatTanggalIndonesiaPendek(tglAcuanUmur)})
                        </span>
                      </button>
                    </th>
                    <th className="py-3 px-4">Tempat, Tanggal Lahir</th>
                    <th className="py-3 px-4">Nama Orang Tua &amp; Alamat</th>
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
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        {(() => {
                          const u = hitungUmurSiswa(s.tglLahir, tglAcuanUmur);
                          return u !== null ? (
                            <span
                              className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-900 border border-amber-200"
                              title={`Umur ${u} tahun (dihitung per ${formatTanggalIndonesiaLengkap(tglAcuanUmur)})`}
                            >
                              {u} Thn
                            </span>
                          ) : (
                            <span className="text-slate-400 text-xs">-</span>
                          );
                        })()}
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
                      <td colSpan={8} className="py-8 text-center text-xs text-slate-400">
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
                <div className={`w-10 h-10 rounded-xl text-white flex items-center justify-center font-bold shadow-xs ${
                  siswaOrientationCetak === 'portrait' ? 'bg-emerald-700' : 'bg-blue-900'
                }`}>
                  <Printer className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <span>Cetak Presensi Peserta Didik Bulanan</span>
                    <span className={`px-2 py-0.5 text-[11px] font-bold rounded-full border ${
                      siswaOrientationCetak === 'portrait'
                        ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                        : 'bg-blue-100 text-blue-900 border-blue-200'
                    }`}>
                      {siswaOrientationCetak === 'portrait' ? 'Potret (Pilihan Utama)' : 'Lanskap'} • {siswaPaperSizeCetak}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Format baris: No, NISN/NIS, Nama Siswa, L/P, Tanggal (1..30/31), Rekapitulasi (S, I, A, Jml), dan Pengesahan
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

                {/* Kolom Kanan: Pengaturan Dokumen Presensi */}
                <div className="lg:col-span-5 space-y-4">
                  <div className="space-y-3">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                      2. Pengaturan Dokumen Presensi
                    </span>

                    {/* Pilihan Orientasi Cetak (Pilihan Utama: Potret) */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                          Orientasi Cetak:
                        </label>
                        <span className="text-[10.5px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          Potret: Pilihan Utama
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setSiswaOrientationCetak('portrait')}
                          className={`p-2.5 rounded-xl border text-left flex items-start gap-2.5 transition-all ${
                            siswaOrientationCetak === 'portrait'
                              ? 'bg-emerald-50 border-emerald-600 ring-2 ring-emerald-600/30'
                              : 'bg-white border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          <div className={`mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                            siswaOrientationCetak === 'portrait' ? 'border-emerald-700 bg-emerald-700' : 'border-slate-400'
                          }`}>
                            {siswaOrientationCetak === 'portrait' && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                              <span>Potret</span>
                              <span className="text-[10px] bg-emerald-600 text-white px-1.5 py-0.2 rounded-full font-bold">Utama</span>
                            </div>
                            <div className="text-[10.5px] text-slate-500 mt-0.5 leading-tight">Standar buku absen tegak, pas 1 lembar</div>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => setSiswaOrientationCetak('landscape')}
                          className={`p-2.5 rounded-xl border text-left flex items-start gap-2.5 transition-all ${
                            siswaOrientationCetak === 'landscape'
                              ? 'bg-blue-50 border-blue-600 ring-2 ring-blue-600/30'
                              : 'bg-white border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          <div className={`mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                            siswaOrientationCetak === 'landscape' ? 'border-blue-900 bg-blue-900' : 'border-slate-400'
                          }`}>
                            {siswaOrientationCetak === 'landscape' && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-slate-900">Lanskap</div>
                            <div className="text-[10.5px] text-slate-500 mt-0.5 leading-tight">Kolom tanggal lebih lebar memanjang</div>
                          </div>
                        </button>
                      </div>
                    </div>

                    {/* Ukuran Kertas */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Ukuran Kertas:
                      </label>
                      <select
                        value={siswaPaperSizeCetak}
                        onChange={(e) => setSiswaPaperSizeCetak(e.target.value as PaperSize)}
                        className="w-full text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-2 font-medium text-slate-800 focus:outline-none"
                      >
                        <option value="F4">F4 / Folio (215 × 330 mm) - Standar Kedinasan</option>
                        <option value="A4">A4 (210 × 297 mm)</option>
                      </select>
                    </div>

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
                        <span>Orientasi:</span>
                        <span className={`font-bold ${siswaOrientationCetak === 'portrait' ? 'text-emerald-700' : 'text-blue-900'}`}>
                          {siswaOrientationCetak === 'portrait' ? 'Potret (Tegak) - Pilihan Utama' : 'Lanskap (Melebar)'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Ukuran Kertas:</span>
                        <span className="font-semibold text-slate-900">
                          {siswaPaperSizeCetak === 'F4' ? 'F4 / Folio (215 × 330 mm)' : 'A4 (210 × 297 mm)'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Kop Surat:</span>
                        <span className={`font-semibold ${!siswaShowKopCetak ? 'text-emerald-700' : 'text-slate-900'}`}>
                          {!siswaShowKopCetak ? 'Tanpa KOP (Pilihan Utama)' : 'Resmi Kedinasan Pemkab Jembrana'}
                        </span>
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
                          No, NISN/NIS, Nama Siswa, L/P, Tanggal (1..{new Date(absenYear, absenMonth, 0).getDate()}), S, I, A, Jml
                        </span>
                      </div>
                      <div className="flex justify-between pt-1 border-t border-slate-200/80">
                        <span>Margin Dokumen (Word & PDF):</span>
                        <span className="font-bold text-slate-800">
                          Kiri 3cm, Kanan 1cm, Atas 1cm, Bawah 2cm
                        </span>
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
                onClick={() => setShowCetakAbsenSiswaModal(false)}
                className="px-4 py-2 text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Tutup
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={doExportWordAbsenSiswa}
                  className="px-4 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs sm:text-sm rounded-xl shadow-xs flex items-center gap-2 transition-all hover:border-slate-400"
                >
                  <FileSpreadsheet className="w-4 h-4 text-blue-600" />
                  <span>Unduh Word ({siswaOrientationCetak === 'portrait' ? 'Potret' : 'Lanskap'})</span>
                </button>
                <button
                  type="button"
                  onClick={doPrintAbsenSiswa}
                  className={`px-5 py-2.5 text-white font-bold text-xs sm:text-sm rounded-xl shadow-sm flex items-center gap-2 transition-all hover:shadow ${
                    siswaOrientationCetak === 'portrait'
                      ? 'bg-emerald-700 hover:bg-emerald-800'
                      : 'bg-blue-900 hover:bg-blue-800'
                  }`}
                >
                  <Printer className="w-4 h-4" />
                  <span>Cetak Presensi Siswa ({siswaOrientationCetak === 'portrait' ? 'Potret' : 'Lanskap'})</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Upload & Pratinjau Tabel Data Siswa */}
      {(showUploadSiswaModal || importSiswaPreview) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl overflow-hidden flex flex-col my-auto max-h-[92vh]">
            {!importSiswaPreview ? (
              /* ================= 1. DIALOG UNGGAH FILE CSV ================= */
              <>
                {/* Header Upload */}
                <div className="bg-indigo-950 px-6 py-4 text-white flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-800/80 border border-indigo-700 flex items-center justify-center text-indigo-200 shrink-0">
                      <Upload className="w-5 h-5 text-indigo-200" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold">Upload Data Siswa</h2>
                      <p className="text-xs text-indigo-200 mt-0.5">
                        Unggah file CSV untuk mengimpor atau memperbarui data siswa secara massal
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setShowUploadSiswaModal(false);
                      setUploadError(null);
                    }}
                    className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                    title="Tutup"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-6 space-y-5 overflow-y-auto flex-1">
                  {uploadError && (
                    <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 text-rose-900 text-xs animate-in fade-in">
                      <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-bold text-rose-950">Gagal Membaca File CSV</div>
                        <div className="mt-1 whitespace-pre-line leading-relaxed text-rose-800">
                          {uploadError}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Drag and drop zone */}
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDraggingFile(true);
                    }}
                    onDragLeave={() => setIsDraggingFile(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDraggingFile(false);
                      const file = e.dataTransfer.files?.[0];
                      if (file) {
                        processSiswaCsvFile(file);
                      }
                    }}
                    onClick={() => fileInputSiswaRef.current?.click()}
                    className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 ${
                      isDraggingFile
                        ? 'border-indigo-600 bg-indigo-50/70 scale-[1.01]'
                        : 'border-slate-300 hover:border-indigo-500 hover:bg-slate-50/80 bg-white'
                    }`}
                  >
                    <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700 shadow-2xs">
                      <FileSpreadsheet className="w-8 h-8" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-slate-800">
                        Tarik &amp; letakkan file CSV ke sini, atau{' '}
                        <span className="text-indigo-600 underline">Pilih File dari Komputer</span>
                      </p>
                      <p className="text-xs text-slate-500">
                        Mendukung file <span className="font-mono font-semibold">.csv</span> (pemisah titik koma ';' atau koma ',')
                      </p>
                    </div>
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-50 border border-indigo-200 rounded-lg text-xs font-semibold text-indigo-900 mt-1">
                      <Upload className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Pilih File CSV</span>
                    </div>
                  </div>

                  {/* Format Susunan Kolom Standar */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4.5 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <Info className="w-4 h-4 text-indigo-600" />
                        <span>Format Susunan Kolom Tabel CSV</span>
                      </h4>
                      <span className="text-[11px] text-slate-500">Otomatis terpetakan</span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Sistem cerdas kami otomatis mendeteksi kolom berdasarkan header berikut:
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                      {[
                        '1. No',
                        '2. NIS',
                        '3. NISN',
                        '4. Nama Siswa',
                        '5. Kelas',
                        '6. Jenis Kelamin (L/P)',
                        '7. Tempat Lahir',
                        '8. Tanggal Lahir',
                        '9. Nama Ortu / Wali',
                        '10. Alamat',
                      ].map((col, idx) => (
                        <div
                          key={idx}
                          className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg font-mono text-[11px] text-slate-700 shadow-2xs text-center"
                        >
                          {col}
                        </div>
                      ))}
                    </div>
                    <div className="text-[11px] text-emerald-900 bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex items-start gap-2.5 leading-relaxed">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span>
                        <strong>Kompatibilitas Penuh:</strong> File hasil ekspor dari menu <em>"Unduh Data Siswa"</em> dapat langsung diunggah kembali tanpa modifikasi. Awalan angka nol pada NIS/NISN akan terjaga dan umur siswa otomatis dihitung.
                      </span>
                    </div>
                  </div>

                  {/* Template download shortcuts */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                    <div className="text-xs text-slate-600 font-medium">
                      Belum memiliki format CSV? Unduh salah satu template contoh siap pakai:
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => downloadSiswaTemplateCsv(';')}
                        className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-lg shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer"
                        title="Unduh template Excel dengan titik koma"
                      >
                        <Download className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Template Excel (;)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => downloadSiswaTemplateCsv(',')}
                        className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-lg shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer"
                        title="Unduh template standar dengan koma"
                      >
                        <Download className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Template Standar (,)</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Footer Upload Dialog */}
                <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setShowUploadSiswaModal(false);
                      setUploadError(null);
                    }}
                    className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                  >
                    Tutup
                  </button>
                </div>
              </>
            ) : (
              /* ================= 2. PRATINJAU TABEL DATA SISWA ================= */
              <>
                {/* Header Pratinjau */}
                <div className="bg-indigo-950 px-6 py-4 text-white flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-800/80 border border-indigo-700 flex items-center justify-center text-indigo-200 shrink-0">
                      <FileSpreadsheet className="w-5 h-5 text-indigo-200" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-base font-bold">Pratinjau &amp; Validasi Tabel Data Siswa</h2>
                        <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 rounded-full text-[11px] font-semibold">
                          {importSiswaPreview.total} Siswa Terbaca
                        </span>
                      </div>
                      <p className="text-xs text-indigo-200 mt-0.5">
                        File:{' '}
                        <span className="font-mono font-semibold text-white bg-indigo-900/60 px-1.5 py-0.5 rounded">
                          {importSiswaPreview.filename}
                        </span>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputSiswaRef.current?.click()}
                      className="px-3 py-1.5 bg-indigo-800 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
                      title="Ganti File CSV Lain"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Ganti File</span>
                    </button>
                    <button
                      onClick={() => {
                        setImportSiswaPreview(null);
                        setShowUploadSiswaModal(false);
                      }}
                      className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                      title="Tutup"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
                  {/* Statistik Cepat Hasil Ekstraksi */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col justify-between">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        Total Siswa
                      </span>
                      <div className="text-xl font-extrabold text-slate-900 mt-1">
                        {importSiswaPreview.total}
                      </div>
                      <span className="text-[10px] text-slate-500 mt-0.5">Dalam file CSV</span>
                    </div>

                    <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3 flex flex-col justify-between">
                      <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">
                        Laki-laki (L)
                      </span>
                      <div className="text-xl font-extrabold text-blue-900 mt-1">
                        {previewTotalL}{' '}
                        <span className="text-xs font-normal text-blue-700">
                          ({importSiswaPreview.total ? Math.round((previewTotalL / importSiswaPreview.total) * 100) : 0}%)
                        </span>
                      </div>
                      <span className="text-[10px] text-blue-700 mt-0.5">Peserta didik putra</span>
                    </div>

                    <div className="bg-rose-50/70 border border-rose-200 rounded-xl p-3 flex flex-col justify-between">
                      <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider">
                        Perempuan (P)
                      </span>
                      <div className="text-xl font-extrabold text-rose-900 mt-1">
                        {previewTotalP}{' '}
                        <span className="text-xs font-normal text-rose-700">
                          ({importSiswaPreview.total ? Math.round((previewTotalP / importSiswaPreview.total) * 100) : 0}%)
                        </span>
                      </div>
                      <span className="text-[10px] text-rose-700 mt-0.5">Peserta didik putri</span>
                    </div>

                    <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3 flex flex-col justify-between">
                      <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
                        Sebaran Kelas
                      </span>
                      <div className="text-xs font-semibold text-emerald-950 mt-1 line-clamp-2">
                        {sortedPreviewKelas.length > 0
                          ? sortedPreviewKelas.map((k) => `Kls ${k} (${previewKelasCounts[k]})`).join(', ')
                          : 'Semua Kelas'}
                      </div>
                      <span className="text-[10px] text-emerald-700 mt-0.5">
                        {sortedPreviewKelas.length} rombel terdeteksi
                      </span>
                    </div>
                  </div>

                  {/* Mode Penyimpanan ke Sistem */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
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
                          <span className="font-bold">1. Gabung / Perbarui (Merge)</span>
                          <input
                            type="radio"
                            name="siswaImportMode"
                            checked={importMode === 'merge'}
                            onChange={() => setImportMode('merge')}
                            className="text-indigo-600 cursor-pointer"
                          />
                        </div>
                        <p className="text-[11px] text-slate-600 leading-relaxed">
                          Siswa dengan NIS sama diperbarui datanya, siswa baru langsung ditambahkan (Rekomendasi).
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
                          <span className="font-bold">2. Timpa Seluruh Data (Replace)</span>
                          <input
                            type="radio"
                            name="siswaImportMode"
                            checked={importMode === 'replace'}
                            onChange={() => setImportMode('replace')}
                            className="text-amber-600 cursor-pointer"
                          />
                        </div>
                        <p className="text-[11px] text-slate-600 leading-relaxed">
                          Hapus data lama &amp; ganti seutuhnya dengan file ini. Tepat jika data sebelumnya berantakan.
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
                          <span className="font-bold">3. Tambahkan Baru (Append)</span>
                          <input
                            type="radio"
                            name="siswaImportMode"
                            checked={importMode === 'append'}
                            onChange={() => setImportMode('append')}
                            className="text-indigo-600 cursor-pointer"
                          />
                        </div>
                        <p className="text-[11px] text-slate-600 leading-relaxed">
                          Masukkan seluruh baris sebagai siswa baru tanpa memeriksa nomor NIS yang sama.
                        </p>
                      </label>
                    </div>
                  </div>

                  {/* Toolbar Kontrol Tabel Pratinjau */}
                  <div className="bg-white border border-slate-200 rounded-xl p-3 flex flex-wrap items-center justify-between gap-2.5">
                    <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
                      {/* Search in preview */}
                      <div className="relative flex-1 min-w-[180px] max-w-xs">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                        <input
                          type="text"
                          value={previewSearch}
                          onChange={(e) => {
                            setPreviewSearch(e.target.value);
                            setPreviewPage(1);
                          }}
                          placeholder="Cari nama, NIS, NISN, ortu..."
                          className="w-full text-xs pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                        />
                        {previewSearch && (
                          <button
                            type="button"
                            onClick={() => {
                              setPreviewSearch('');
                              setPreviewPage(1);
                            }}
                            className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Filter Kelas */}
                      <select
                        value={previewKelasFilter}
                        onChange={(e) => {
                          setPreviewKelasFilter(e.target.value);
                          setPreviewPage(1);
                        }}
                        className="text-xs py-1.5 px-2.5 border border-slate-300 rounded-lg bg-white text-slate-700 font-medium focus:ring-2 focus:ring-indigo-600"
                      >
                        <option value="Semua">Semua Kelas</option>
                        {sortedPreviewKelas.map((k) => (
                          <option key={k} value={k}>
                            Kelas {k} ({previewKelasCounts[k]})
                          </option>
                        ))}
                      </select>

                      {/* Filter JK */}
                      <select
                        value={previewJkFilter}
                        onChange={(e) => {
                          setPreviewJkFilter(e.target.value);
                          setPreviewPage(1);
                        }}
                        className="text-xs py-1.5 px-2.5 border border-slate-300 rounded-lg bg-white text-slate-700 font-medium focus:ring-2 focus:ring-indigo-600"
                      >
                        <option value="Semua">Semua JK</option>
                        <option value="L">Laki-laki ({previewTotalL})</option>
                        <option value="P">Perempuan ({previewTotalP})</option>
                      </select>

                      {(previewSearch || previewKelasFilter !== 'Semua' || previewJkFilter !== 'Semua') && (
                        <button
                          type="button"
                          onClick={() => {
                            setPreviewSearch('');
                            setPreviewKelasFilter('Semua');
                            setPreviewJkFilter('Semua');
                            setPreviewPage(1);
                          }}
                          className="text-xs text-rose-600 hover:text-rose-800 font-semibold px-2 py-1 rounded hover:bg-rose-50 flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Reset</span>
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-600">
                      <span className="font-semibold text-slate-700">
                        {totalPreviewRows} dari {importSiswaPreview.total} siswa
                      </span>
                      <span className="text-slate-300">|</span>
                      <span>Tampilkan:</span>
                      <select
                        value={previewRowsPerPage}
                        onChange={(e) => {
                          setPreviewRowsPerPage(parseInt(e.target.value, 10));
                          setPreviewPage(1);
                        }}
                        className="text-xs py-1 px-2 border border-slate-300 rounded-md bg-white text-slate-700 font-semibold"
                      >
                        <option value="10">10 baris</option>
                        <option value="25">25 baris</option>
                        <option value="50">50 baris</option>
                        <option value="-1">Semua</option>
                      </select>
                    </div>
                  </div>

                  {/* ================= TABEL PRATINJAU RAPI ================= */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs bg-white">
                    <div className="overflow-x-auto max-h-[380px]">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold sticky top-0 z-10 shadow-2xs">
                            <th className="py-2.5 px-3 text-center w-12 bg-slate-100">No</th>
                            <th className="py-2.5 px-3 w-24 bg-slate-100">NIS</th>
                            <th className="py-2.5 px-3 w-28 bg-slate-100">NISN</th>
                            <th className="py-2.5 px-3.5 min-w-[170px] bg-slate-100">Nama Siswa</th>
                            <th className="py-2.5 px-2.5 text-center w-16 bg-slate-100">Kelas</th>
                            <th className="py-2.5 px-2.5 text-center w-16 bg-slate-100">L/P</th>
                            <th className="py-2.5 px-2.5 text-center w-20 bg-slate-100" title={`Umur dihitung berdasarkan acuan: ${formatTanggalIndonesiaPendek(tglAcuanUmur)}`}>
                              Umur
                            </th>
                            <th className="py-2.5 px-3 min-w-[150px] bg-slate-100">Tempat, Tgl Lahir</th>
                            <th className="py-2.5 px-3 min-w-[150px] bg-slate-100">Nama Ortu / Wali</th>
                            <th className="py-2.5 px-3 min-w-[180px] bg-slate-100">Alamat</th>
                            <th className="py-2.5 px-2.5 text-center w-20 bg-slate-100">Validasi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                          {paginatedImportPreview.length === 0 ? (
                            <tr>
                              <td colSpan={11} className="py-8 text-center text-slate-400">
                                <FileSpreadsheet className="w-8 h-8 mx-auto text-slate-300 mb-1" />
                                <p className="font-semibold text-slate-600">Tidak ada baris data yang cocok dengan filter pencarian.</p>
                                <p className="text-[11px] text-slate-400 mt-0.5">Coba ubah kata kunci atau reset filter.</p>
                              </td>
                            </tr>
                          ) : (
                            paginatedImportPreview.map((row, idx) => {
                              const globalIdx = previewStartIndex + idx + 1;
                              const umur = hitungUmurSiswa(row.tglLahir, tglAcuanUmur);
                              const isComplete = row.nama && row.nis && row.kelas;
                              return (
                                <tr key={idx} className="hover:bg-indigo-50/40 transition-colors odd:bg-slate-50/30">
                                  <td className="py-2 px-3 text-center text-slate-500 font-medium">{globalIdx}</td>
                                  <td className="py-2 px-3 font-mono font-bold text-slate-900">
                                    <span className="bg-slate-100 px-1.5 py-0.5 rounded text-[11px] border border-slate-200">
                                      {row.nis}
                                    </span>
                                  </td>
                                  <td className="py-2 px-3 font-mono text-indigo-900 font-semibold">
                                    {row.nisn && row.nisn !== '-' ? row.nisn : <span className="text-slate-400">-</span>}
                                  </td>
                                  <td className="py-2 px-3.5 font-bold text-slate-900">
                                    {row.nama}
                                  </td>
                                  <td className="py-2 px-2.5 text-center">
                                    <span className="bg-blue-100 text-blue-900 px-2 py-0.5 rounded-md font-bold text-[11px] border border-blue-200">
                                      {row.kelas}
                                    </span>
                                  </td>
                                  <td className="py-2 px-2.5 text-center font-bold">
                                    {row.jenisKelamin === 'L' ? (
                                      <span className="inline-block px-1.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded text-[11px]">
                                        L
                                      </span>
                                    ) : (
                                      <span className="inline-block px-1.5 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 rounded text-[11px]">
                                        P
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-2 px-2.5 text-center font-semibold">
                                    {umur !== null ? (
                                      <span className="text-indigo-950 bg-indigo-50 px-1.5 py-0.5 rounded text-[11px] border border-indigo-100">
                                        {umur} th
                                      </span>
                                    ) : (
                                      <span className="text-slate-400">-</span>
                                    )}
                                  </td>
                                  <td className="py-2 px-3 text-slate-700">
                                    <div className="font-medium text-slate-800">{row.tempatLahir || '-'}</div>
                                    <div className="text-[10px] text-slate-500 font-mono">{row.tglLahir}</div>
                                  </td>
                                  <td className="py-2 px-3 text-slate-800">
                                    {row.namaOrtu || '-'}
                                  </td>
                                  <td className="py-2 px-3 text-slate-600 max-w-[200px] truncate" title={row.alamat}>
                                    {row.alamat || '-'}
                                  </td>
                                  <td className="py-2 px-2.5 text-center">
                                    {isComplete ? (
                                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                        <Check className="w-3 h-3" />
                                        <span>Rapi</span>
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                                        <AlertCircle className="w-3 h-3" />
                                        <span>Cek</span>
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination Bar */}
                    {totalPreviewPages > 1 && (
                      <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div className="text-slate-500">
                          Menampilkan <span className="font-semibold text-slate-800">{previewStartIndex + 1}</span> -{' '}
                          <span className="font-semibold text-slate-800">
                            {Math.min(previewStartIndex + paginatedImportPreview.length, totalPreviewRows)}
                          </span>{' '}
                          dari <span className="font-semibold text-slate-800">{totalPreviewRows}</span> baris
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            disabled={currentPreviewPage <= 1}
                            onClick={() => setPreviewPage((p) => Math.max(1, p - 1))}
                            className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                            title="Halaman Sebelumnya"
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </button>

                          {Array.from({ length: totalPreviewPages }, (_, i) => i + 1)
                            .filter((p) => p === 1 || p === totalPreviewPages || Math.abs(p - currentPreviewPage) <= 1)
                            .map((p, idx, arr) => (
                              <React.Fragment key={p}>
                                {idx > 0 && p - arr[idx - 1] > 1 && (
                                  <span className="px-1 text-slate-400">...</span>
                                )}
                                <button
                                  type="button"
                                  onClick={() => setPreviewPage(p)}
                                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
                                    p === currentPreviewPage
                                      ? 'bg-indigo-700 text-white shadow-2xs'
                                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                                  }`}
                                >
                                  {p}
                                </button>
                              </React.Fragment>
                            ))}

                          <button
                            type="button"
                            disabled={currentPreviewPage >= totalPreviewPages}
                            onClick={() => setPreviewPage((p) => Math.min(totalPreviewPages, p + 1))}
                            className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                            title="Halaman Selanjutnya"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Pratinjau */}
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputSiswaRef.current?.click()}
                      className="px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer border border-slate-200 bg-white"
                    >
                      Pilih File CSV Lain
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setImportSiswaPreview(null);
                        setShowUploadSiswaModal(false);
                      }}
                      className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                    >
                      Batalkan
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onImportSiswa(importSiswaPreview.data, importMode);
                      setImportSiswaPreview(null);
                      setShowUploadSiswaModal(false);
                      alert(
                        `Berhasil menyimpan ${importSiswaPreview.total} data siswa dengan metode ${
                          importMode === 'merge' ? 'Gabung / Perbarui' : importMode === 'replace' ? 'Timpa Seluruh Data' : 'Tambah Baru'
                        }!`
                      );
                    }}
                    className="px-5 py-2.5 text-xs font-bold bg-indigo-700 hover:bg-indigo-600 text-white rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>
                      Simpan {importSiswaPreview.total} Data Siswa ke Sistem (
                      {importMode === 'merge' ? 'Gabung' : importMode === 'replace' ? 'Timpa' : 'Tambah'})
                    </span>
                  </button>
                </div>
              </>
            )}
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
