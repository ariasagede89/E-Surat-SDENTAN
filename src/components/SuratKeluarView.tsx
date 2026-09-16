import React, { useState } from 'react';
import {
  Send,
  Plus,
  Search,
  Sparkles,
  Printer,
  FileText,
  Eye,
  Edit,
  Trash2,
  Archive,
  X,
  UserCheck,
  Calendar,
  Check,
  Users,
  Award,
  FileSpreadsheet,
  RefreshCw,
  ArrowUpDown,
  Upload,
  Paperclip,
} from 'lucide-react';
import {
  SuratKeluar,
  ArsipSurat,
  PengaturanSekolah,
  JenisSuratKeluar,
  StatusSuratKeluar,
  Guru,
  Siswa,
  KlasifikasiMendagriItem,
  SubjekKeteranganItem,
  SkPointItem,
} from '../types';
import { formatTanggalIndonesia, exportToWord, buildSuratHtml } from '../utils/exportUtils';
import {
  generateNomorSurat,
  refreshNomorUrut,
  getNextNomorUrut,
  getHighestNomorUrut,
  extractNomorUrut,
  formatNomorUrut,
  compareSuratKeluarDesc,
  compareSuratKeluarAsc,
} from '../utils/numberGenerator';
import { formatDiktumLabel, getIndonesianOrdinalWord } from '../utils/diktumUtils';
import { readFileAsDataUrl, openOrDownloadDocument } from '../utils/fileUtils';

interface SuratKeluarViewProps {
  suratKeluarList: SuratKeluar[];
  arsipList: ArsipSurat[];
  guruList: Guru[];
  siswaList: Siswa[];
  sekolah: PengaturanSekolah;
  onAddSuratKeluar: (surat: Omit<SuratKeluar, 'id' | 'createdAt'>) => void;
  onUpdateSuratKeluar: (surat: SuratKeluar) => void;
  onDeleteSuratKeluar: (id: string) => void;
  onAddArsip: (arsip: Omit<ArsipSurat, 'id'>) => void;
  onUpdateArsip?: (arsip: ArsipSurat) => void;
  onDeleteArsip: (id: string) => void;
  onOpenAutoNumberModal: () => void;
  onPreviewSurat: (surat: SuratKeluar) => void;
  initialSelectedNumber?: { noSurat: string; klasifikasi: KlasifikasiMendagriItem } | null;
  onClearSelectedNumber?: () => void;
}

// Default konsideran SK
const defaultSkMenimbangList: SkPointItem[] = [
  {
    id: '1',
    poin: 'a.',
    isi: 'bahwa dalam rangka memperlancar proses belajar mengajar dan ketertiban administrasi di SD Negeri 1 Pekutatan, dipandang perlu menetapkan pembagian tugas guru;',
  },
  {
    id: '2',
    poin: 'b.',
    isi: 'bahwa berdasarkan pertimbangan sebagaimana dimaksud pada huruf a, perlu menetapkan Keputusan Kepala Sekolah.',
  },
];

const defaultSkMengingatList: SkPointItem[] = [
  {
    id: '1',
    poin: '1.',
    isi: 'Undang-Undang Nomor 20 Tahun 2003 tentang Sistem Pendidikan Nasional;',
  },
  {
    id: '2',
    poin: '2.',
    isi: 'Undang-Undang Nomor 14 Tahun 2005 tentang Guru dan Dosen;',
  },
  {
    id: '3',
    poin: '3.',
    isi: 'Permendagri Nomor 83 Tahun 2022 tentang Kode Klasifikasi Arsip di Lingkungan Kementerian Dalam Negeri dan Pemerintah Daerah;',
  },
  {
    id: '4',
    poin: '4.',
    isi: 'Program Kerja SD Negeri 1 Pekutatan Tahun Ajaran 2026/2027.',
  },
];

const defaultSkMemperhatikanList: SkPointItem[] = [
  {
    id: '1',
    poin: '1.',
    isi: 'Hasil Rapat Dewan Guru SD Negeri 1 Pekutatan;',
  },
  {
    id: '2',
    poin: '2.',
    isi: 'Kalender Pendidikan Provinsi Bali Tahun Ajaran 2026/2027.',
  },
];

export const SuratKeluarView: React.FC<SuratKeluarViewProps> = ({
  suratKeluarList,
  arsipList,
  guruList,
  siswaList,
  sekolah,
  onAddSuratKeluar,
  onUpdateSuratKeluar,
  onDeleteSuratKeluar,
  onAddArsip,
  onUpdateArsip,
  onDeleteArsip,
  onOpenAutoNumberModal,
  onPreviewSurat,
  initialSelectedNumber,
  onClearSelectedNumber,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'buat_surat' | 'arsip_surat'>('buat_surat');
  const [showFormModal, setShowFormModal] = useState(false);
  const [showArsipModal, setShowArsipModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterJenis, setFilterJenis] = useState<string>('Semua');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  // Form State for Surat Keluar
  const [editingId, setEditingId] = useState<string | null>(null);
  const [jenisSurat, setJenisSurat] = useState<JenisSuratKeluar>('surat_tugas');
  const [noSurat, setNoSurat] = useState('');
  const [kodeKlasifikasi, setKodeKlasifikasi] = useState('893');
  const [namaKlasifikasi, setNamaKlasifikasi] = useState('Surat Perintah Tugas (SPT)');
  const [tglSurat, setTglSurat] = useState(new Date().toISOString().slice(0, 10));
  const [tujuan, setTujuan] = useState('');
  const [perihal, setPerihal] = useState('');
  const [status, setStatus] = useState<StatusSuratKeluar>('Konsep');

  // Khusus: Surat Ijin Guru
  const [ijinNamaGuru, setIjinNamaGuru] = useState('');
  const [ijinNipGuru, setIjinNipGuru] = useState('');
  const [ijinPangkat, setIjinPangkat] = useState('');
  const [ijinJabatan, setIjinJabatan] = useState('');
  const [ijinAlasan, setIjinAlasan] = useState('');
  const [ijinTglMulai, setIjinTglMulai] = useState('');
  const [ijinTglSelesai, setIjinTglSelesai] = useState('');
  const [ijinGuruPengganti, setIjinGuruPengganti] = useState('');
  const [ijinTipeDurasi, setIjinTipeDurasi] = useState<'satu_hari' | 'rentang'>('satu_hari');

  // Khusus: Surat Keterangan
  const [ketJenisSubjek, setKetJenisSubjek] = useState<'siswa' | 'guru'>('siswa');
  const [ketNama, setKetNama] = useState('');
  const [ketNisnNip, setKetNisnNip] = useState('');
  const [ketKelasJabatan, setKetKelasJabatan] = useState('');
  const [ketTempatTglLahir, setKetTempatTglLahir] = useState('');
  const [ketNamaOrtu, setKetNamaOrtu] = useState('');
  const [ketAlamat, setKetAlamat] = useState('');
  const [ketKeperluan, setKetKeperluan] = useState('');
  const [ketSubjekList, setKetSubjekList] = useState<SubjekKeteranganItem[]>([]);

  // Khusus: Surat Undangan
  const [undHariTanggal, setUndHariTanggal] = useState('');
  const [undWaktu, setUndWaktu] = useState('09.00 WITA - Selesai');
  const [undTempat, setUndTempat] = useState('Ruang Aula Serbaguna SDN 1 Pekutatan');
  const [undAcara, setUndAcara] = useState('');
  const [undCatatan, setUndCatatan] = useState('');
  const [undKataPengantar, setUndKataPengantar] = useState(
    'Sehubungan dengan rencana pelaksanaan kegiatan dan evaluasi program pembelajaran sekolah, dengan ini kami mengharap kehadiran Bapak/Ibu/Saudara pada pertemuan dinas yang akan dilaksanakan pada:'
  );
  const [undKalimatPenutup, setUndKalimatPenutup] = useState(
    'Mengingat sangat pentingnya acara tersebut di atas, kami sangat mengharapkan kehadiran Bapak/Ibu tepat pada waktunya. Atas perhatian dan kerja samanya kami ucapkan terima kasih.'
  );
  const [undTujuanList, setUndTujuanList] = useState<string[]>(['Dewan Guru SDN 1 Pekutatan']);

  // Khusus: SK Kepala Sekolah
  const [skTentang, setSkTentang] = useState('');
  const [skMenimbangList, setSkMenimbangList] = useState<SkPointItem[]>(defaultSkMenimbangList);
  const [skMengingatList, setSkMengingatList] = useState<SkPointItem[]>(defaultSkMengingatList);
  const [skMemperhatikanList, setSkMemperhatikanList] = useState<SkPointItem[]>(defaultSkMemperhatikanList);
  const [skDiktumList, setSkDiktumList] = useState<Array<{ id: string; label: string; isi: string }>>([
    { id: '1', label: 'Kesatu', isi: 'Menugaskan dan memberlakukan keputusan ini sebagaimana terlampir dalam lampiran keputusan ini.' },
    { id: '2', label: 'Kedua', isi: 'Segala biaya yang timbul akibat pelaksanaan keputusan ini dibebankan pada anggaran yang sesuai.' },
    { id: '3', label: 'Ketiga', isi: 'Keputusan ini berlaku sejak tanggal ditetapkan, dengan ketentuan apabila terdapat kekeliruan di kemudian hari akan diadakan perbaikan sebagaimana mestinya.' },
  ]);

  // Khusus: Surat Tugas
  const [sptDasar, setSptDasar] = useState('');
  const [sptKeperluan, setSptKeperluan] = useState('');
  const [sptTempat, setSptTempat] = useState('');
  const [sptTglMulai, setSptTglMulai] = useState('');
  const [sptTglSelesai, setSptTglSelesai] = useState('');
  const [sptWaktu, setSptWaktu] = useState('');
  const [sptPegawai, setSptPegawai] = useState<any[]>([]);

  // Delete Confirmation Modal State
  const [deleteConfirm, setDeleteConfirm] = useState<{
    type: 'surat' | 'arsip';
    id: string;
    noSurat: string;
  } | null>(null);

  // Arsip Form State
  const [editingArsipId, setEditingArsipId] = useState<string | null>(null);
  const [arsipNoSurat, setArsipNoSurat] = useState('');
  const [arsipKode, setArsipKode] = useState('');
  const [arsipPerihal, setArsipPerihal] = useState('');
  const [arsipTujuan, setArsipTujuan] = useState('');
  const [arsipTglSurat, setArsipTglSurat] = useState('');
  const [arsipTglArsip, setArsipTglArsip] = useState(new Date().toISOString().slice(0, 10));
  const [arsipLokasi, setArsipLokasi] = useState('Ordner 2026 / Lemari A');
  const [arsipKategori, setArsipKategori] = useState('Surat Keluar');
  const [arsipKeterangan, setArsipKeterangan] = useState('');
  const [arsipLampiranNama, setArsipLampiranNama] = useState('');
  const [arsipLampiranUrl, setArsipLampiranUrl] = useState('');
  const [arsipLampiranUkuran, setArsipLampiranUkuran] = useState('');
  const [arsipLampiranTipe, setArsipLampiranTipe] = useState('');
  const [isUploadingArsipDoc, setIsUploadingArsipDoc] = useState(false);

  // Helper untuk generate nomor otomatis sesuai Permendagri No. 83 Tahun 2022
  const hitungNomorOtomatis = (jenis: JenisSuratKeluar, tglVal: string = tglSurat) => {
    if (jenis === 'surat_ijin_guru') {
      return {
        nomor: '-',
        kode: '800.1.11.4',
        nama: 'Permohonan Izin / Cuti Guru (Permendagri 83/2022)',
      };
    }

    let kode = '800.1.11.1';
    let nama = 'Surat Perintah Tugas (SPT) (Permendagri 83/2022)';

    if (jenis === 'surat_keterangan') {
      kode = '400.3.12.1';
      nama = 'Surat Keterangan Peserta Didik / GTK (Permendagri 83/2022)';
    } else if (jenis === 'surat_undangan') {
      kode = '000.1.5';
      nama = 'Undangan Rapat / Pertemuan Dinas (Permendagri 83/2022)';
    } else if (jenis === 'surat_keputusan') {
      kode = '400.3.10';
      nama = 'SK Pembagian Tugas PTK / Kurikulum (Permendagri 83/2022)';
    }

    // Hitung nomor urut berikutnya dari data yang ada (Terkoneksi dengan Arsip Surat Keluar)
    const nextSeq = getNextNomorUrut(suratKeluarList, arsipList);
    const dateObj = tglVal ? new Date(tglVal) : new Date();
    const nomor = generateNomorSurat(kode, nextSeq, sekolah.kodeSuratSekolah || 'SDN1PKT', dateObj);

    return { nomor, kode, nama };
  };

  // Check if opened with pre-selected auto number
  React.useEffect(() => {
    if (initialSelectedNumber) {
      setNoSurat(initialSelectedNumber.noSurat);
      setKodeKlasifikasi(initialSelectedNumber.klasifikasi.kode);
      setNamaKlasifikasi(initialSelectedNumber.klasifikasi.uraian);
      setShowFormModal(true);
      if (onClearSelectedNumber) onClearSelectedNumber();
    }
  }, [initialSelectedNumber]);

  const openNewSurat = () => {
    setEditingId(null);
    const todayStr = new Date().toISOString().slice(0, 10);
    setTglSurat(todayStr);
    setJenisSurat('surat_tugas');

    // Penomoran otomatis langsung terisi tanpa harus membuka generator modal
    const auto = hitungNomorOtomatis('surat_tugas', todayStr);
    setNoSurat(auto.nomor);
    setKodeKlasifikasi(auto.kode);
    setNamaKlasifikasi(auto.nama);

    setTujuan('Dewan Guru SDN 1 Pekutatan');
    setPerihal('Surat Perintah Tugas Mengikuti Kegiatan Kedinasan');
    setStatus('Konsep');

    // Reset fields
    setIjinNamaGuru(guruList[0]?.nama || '');
    setIjinNipGuru(guruList[0]?.nip || '');
    setIjinPangkat(guruList[0]?.pangkatGol || '');
    setIjinJabatan(guruList[0]?.jabatan || 'Guru Kelas');
    setIjinAlasan('Upacara Adat / Yadnya di Pura');
    setIjinTglMulai(todayStr);
    setIjinTglSelesai(todayStr);
    setIjinTipeDurasi('satu_hari');
    setIjinGuruPengganti(guruList[1]?.nama || '');

    setKetJenisSubjek('siswa');
    setKetNama('');
    setKetNisnNip('');
    setKetKelasJabatan('');
    setKetTempatTglLahir('');
    setKetNamaOrtu('');
    setKetAlamat('');
    setKetKeperluan('Syarat Pencairan Beasiswa PIP');
    setKetSubjekList([]);

    setUndHariTanggal('Senin, 14 September 2026');
    setUndWaktu('09.00 WITA - Selesai');
    setUndTempat('Ruang Pertemuan SDN 1 Pekutatan');
    setUndAcara('Rapat Koordinasi Evaluasi Pembelajaran');
    setUndCatatan('Dimohon hadir tepat waktu.');
    setUndKataPengantar(
      'Sehubungan dengan rencana pelaksanaan kegiatan dan evaluasi program pembelajaran sekolah, dengan ini kami mengharap kehadiran Bapak/Ibu/Saudara pada pertemuan dinas yang akan dilaksanakan pada:'
    );
    setUndKalimatPenutup(
      'Mengingat sangat pentingnya acara tersebut di atas, kami sangat mengharapkan kehadiran Bapak/Ibu tepat pada waktunya. Atas perhatian dan kerja samanya kami ucapkan terima kasih.'
    );
    setUndTujuanList(['Dewan Guru SDN 1 Pekutatan']);

    setSkTentang('PEMBAGIAN TUGAS GURU TAHUN AJARAN 2026/2027');
    setSkMenimbangList(defaultSkMenimbangList);
    setSkMengingatList(defaultSkMengingatList);
    setSkMemperhatikanList(defaultSkMemperhatikanList);
    setSkDiktumList([
      { id: '1', label: 'Kesatu', isi: 'Menugaskan dan memberlakukan keputusan ini sebagaimana terlampir dalam lampiran keputusan ini.' },
      { id: '2', label: 'Kedua', isi: 'Segala biaya yang timbul akibat pelaksanaan keputusan ini dibebankan pada anggaran yang sesuai.' },
      { id: '3', label: 'Ketiga', isi: 'Keputusan ini berlaku sejak tanggal ditetapkan, dengan ketentuan apabila terdapat kekeliruan di kemudian hari akan diadakan perbaikan sebagaimana mestinya.' },
    ]);

    setSptDasar('Surat Dinas Pendidikan Kepemudaan dan Olahraga Kab. Jembrana');
    setSptKeperluan('Mengikuti Workshop Peningkatan Mutu Pembelajaran');
    setSptTempat('Kecamatan Pekutatan');
    setSptTglMulai(todayStr);
    setSptTglSelesai(todayStr);
    setSptWaktu('08.30 WITA - Selesai');
    setSptPegawai(
      guruList.length > 0
        ? [{ nama: guruList[0].nama, nip: guruList[0].nip, pangkatGol: guruList[0].pangkatGol, jabatan: guruList[0].jabatan }]
        : []
    );

    setShowFormModal(true);
  };

  const openEditSurat = (sk: SuratKeluar) => {
    setEditingId(sk.id);
    setJenisSurat(sk.jenisSurat);
    setNoSurat(sk.noSurat);
    setKodeKlasifikasi(sk.kodeKlasifikasi);
    setNamaKlasifikasi(sk.namaKlasifikasi);
    setTglSurat(sk.tglSurat);
    setTujuan(sk.tujuan);
    setPerihal(sk.perihal);
    setStatus(sk.status);

    const d = sk.dataKhusus || {};
    if (sk.jenisSurat === 'surat_ijin_guru') {
      setIjinNamaGuru(d.namaGuru || '');
      setIjinNipGuru(d.nipGuru || '');
      setIjinPangkat(d.pangkatGol || '');
      setIjinJabatan(d.jabatan || '');
      setIjinAlasan(d.alasan || '');
      setIjinTglMulai(d.tglMulai || '');
      setIjinTglSelesai(d.tglSelesai || '');
      const isMultiple = Boolean(d.tglSelesai && d.tglMulai && d.tglSelesai !== d.tglMulai);
      setIjinTipeDurasi(isMultiple ? 'rentang' : 'satu_hari');
      setIjinGuruPengganti(d.guruPengganti || '');
    } else if (sk.jenisSurat === 'surat_keterangan') {
      setKetJenisSubjek(d.jenisSubjek || 'siswa');
      setKetNama(d.namaSubjek || '');
      setKetNisnNip(d.nisnNip || '');
      setKetKelasJabatan(d.kelasJabatan || '');
      setKetTempatTglLahir(d.tempatTglLahir || '');
      setKetNamaOrtu(d.namaOrtu || '');
      setKetAlamat(d.alamat || '');
      setKetKeperluan(d.keperluan || '');
      if (Array.isArray(d.subjekList) && d.subjekList.length > 0) {
        setKetSubjekList(d.subjekList);
      } else if (d.namaSubjek) {
        setKetSubjekList([
          {
            id: '1',
            nama: d.namaSubjek,
            nisnNip: d.nisnNip || '',
            kelasJabatan: d.kelasJabatan || '',
            tempatTglLahir: d.tempatTglLahir || '',
            namaOrtu: d.namaOrtu || '',
            alamat: d.alamat || '',
          },
        ]);
      } else {
        setKetSubjekList([]);
      }
    } else if (sk.jenisSurat === 'surat_undangan') {
      setUndHariTanggal(d.hariTanggal || '');
      setUndWaktu(d.waktu || '');
      setUndTempat(d.tempat || '');
      setUndAcara(d.acara || '');
      setUndCatatan(d.catatanTambahan || '');
      setUndKataPengantar(
        d.kataPengantar ||
          'Sehubungan dengan rencana pelaksanaan kegiatan dan evaluasi program pembelajaran sekolah, dengan ini kami mengharap kehadiran Bapak/Ibu/Saudara pada pertemuan dinas yang akan dilaksanakan pada:'
      );
      setUndKalimatPenutup(
        d.kalimatPenutup ||
          'Mengingat sangat pentingnya acara tersebut di atas, kami sangat mengharapkan kehadiran Bapak/Ibu tepat pada waktunya. Atas perhatian dan kerja samanya kami ucapkan terima kasih.'
      );
      if (Array.isArray(d.tujuanList) && d.tujuanList.length > 0) {
        setUndTujuanList(d.tujuanList);
      } else if (sk.tujuan) {
        setUndTujuanList([sk.tujuan]);
      } else {
        setUndTujuanList(['Dewan Guru SDN 1 Pekutatan']);
      }
    } else if (sk.jenisSurat === 'surat_keputusan') {
      setSkTentang(d.tentang || '');

      // Menimbang
      if (Array.isArray(d.menimbangList) && d.menimbangList.length > 0) {
        setSkMenimbangList(d.menimbangList);
      } else if (d.menimbang) {
        const lines = d.menimbang.split('\n').map((l: string) => l.trim()).filter(Boolean);
        if (lines.length > 0) {
          setSkMenimbangList(
            lines.map((l: string, i: number) => {
              const m = l.match(/^([a-z0-9]+[\.\)])\s*(.*)$/i);
              return {
                id: String(Date.now() + i),
                poin: m ? m[1] : `${String.fromCharCode(97 + i)}.`,
                isi: m ? m[2] : l,
              };
            })
          );
        } else {
          setSkMenimbangList(defaultSkMenimbangList);
        }
      } else {
        setSkMenimbangList(defaultSkMenimbangList);
      }

      // Mengingat
      if (Array.isArray(d.mengingatList) && d.mengingatList.length > 0) {
        setSkMengingatList(d.mengingatList);
      } else if (d.mengingat) {
        const lines = d.mengingat.split('\n').map((l: string) => l.trim()).filter(Boolean);
        if (lines.length > 0) {
          setSkMengingatList(
            lines.map((l: string, i: number) => {
              const m = l.match(/^([a-z0-9]+[\.\)])\s*(.*)$/i);
              return {
                id: String(Date.now() + i + 10),
                poin: m ? m[1] : `${i + 1}.`,
                isi: m ? m[2] : l,
              };
            })
          );
        } else {
          setSkMengingatList(defaultSkMengingatList);
        }
      } else {
        setSkMengingatList(defaultSkMengingatList);
      }

      // Memperhatikan
      if (Array.isArray(d.memperhatikanList) && d.memperhatikanList.length > 0) {
        setSkMemperhatikanList(d.memperhatikanList);
      } else if (d.memperhatikan) {
        const lines = d.memperhatikan.split('\n').map((l: string) => l.trim()).filter(Boolean);
        if (lines.length > 0) {
          setSkMemperhatikanList(
            lines.map((l: string, i: number) => {
              const m = l.match(/^([a-z0-9]+[\.\)])\s*(.*)$/i);
              return {
                id: String(Date.now() + i + 20),
                poin: m ? m[1] : `${i + 1}.`,
                isi: m ? m[2] : l,
              };
            })
          );
        } else {
          setSkMemperhatikanList(defaultSkMemperhatikanList);
        }
      } else {
        setSkMemperhatikanList([]);
      }

      if (Array.isArray(d.diktumList) && d.diktumList.length > 0) {
        setSkDiktumList(
          d.diktumList.map((item: any, idx: number) => ({
            ...item,
            label: formatDiktumLabel(item.label, idx),
          }))
        );
      } else {
        setSkDiktumList([
          { id: '1', label: 'Kesatu', isi: d.memutuskan || 'Menugaskan dan memberlakukan keputusan ini sebagaimana terlampir dalam lampiran keputusan ini.' },
          { id: '2', label: 'Kedua', isi: 'Segala biaya yang timbul akibat pelaksanaan keputusan ini dibebankan pada anggaran yang sesuai.' },
          { id: '3', label: 'Ketiga', isi: 'Keputusan ini berlaku sejak tanggal ditetapkan, dengan ketentuan apabila terdapat kekeliruan di kemudian hari akan diadakan perbaikan sebagaimana mestinya.' },
        ]);
      }
    } else if (sk.jenisSurat === 'surat_tugas') {
      setSptDasar(d.dasarTugas || '');
      setSptKeperluan(d.tujuanTugas || '');
      setSptTempat(d.tempatTugas || '');
      setSptTglMulai(d.tglMulai || '');
      setSptTglSelesai(d.tglSelesai || '');
      setSptWaktu(d.waktu || '');
      setSptPegawai(d.pegawaiDitugaskan || []);
    }

    setShowFormModal(true);
  };

  const handleSaveSurat = (e: React.FormEvent) => {
    e.preventDefault();

    let finalTujuan = tujuan;
    let dataKhusus: any = {};

    if (jenisSurat === 'surat_ijin_guru') {
      const finalTglSelesai = ijinTipeDurasi === 'satu_hari' ? ijinTglMulai : (ijinTglSelesai || ijinTglMulai);
      dataKhusus = {
        namaGuru: ijinNamaGuru,
        nipGuru: ijinNipGuru,
        pangkatGol: ijinPangkat,
        jabatan: ijinJabatan,
        alasan: ijinAlasan,
        tglMulai: ijinTglMulai,
        tglSelesai: finalTglSelesai,
        guruPengganti: ijinGuruPengganti,
      };
      finalTujuan = 'Kepala SDN 1 Pekutatan';
    } else if (jenisSurat === 'surat_keterangan') {
      const activeSubjekList =
        ketSubjekList.length > 0
          ? ketSubjekList
          : ketNama
          ? [
              {
                id: '1',
                nama: ketNama,
                nisnNip: ketNisnNip,
                kelasJabatan: ketKelasJabatan,
                tempatTglLahir: ketTempatTglLahir,
                namaOrtu: ketNamaOrtu,
                alamat: ketAlamat,
              },
            ]
          : [];

      dataKhusus = {
        jenisSubjek: ketJenisSubjek,
        namaSubjek: activeSubjekList[0]?.nama || ketNama,
        nisnNip: activeSubjekList[0]?.nisnNip || ketNisnNip,
        kelasJabatan: activeSubjekList[0]?.kelasJabatan || ketKelasJabatan,
        tempatTglLahir: activeSubjekList[0]?.tempatTglLahir || ketTempatTglLahir,
        namaOrtu: activeSubjekList[0]?.namaOrtu || ketNamaOrtu,
        alamat: activeSubjekList[0]?.alamat || ketAlamat,
        keperluan: ketKeperluan,
        subjekList: activeSubjekList,
      };

      if (activeSubjekList.length > 0) {
        finalTujuan = activeSubjekList.map((s) => s.nama).join(', ');
      }
    } else if (jenisSurat === 'surat_undangan') {
      const cleanTujuan = undTujuanList.map((t) => t.trim()).filter(Boolean);
      const activeTujuanList = cleanTujuan.length > 0 ? cleanTujuan : [tujuan || 'Dewan Guru SDN 1 Pekutatan'];
      dataKhusus = {
        hariTanggal: undHariTanggal,
        waktu: undWaktu,
        tempat: undTempat,
        acara: undAcara,
        catatanTambahan: undCatatan,
        kataPengantar: undKataPengantar,
        kalimatPenutup: undKalimatPenutup,
        tujuanList: activeTujuanList,
      };
      finalTujuan = activeTujuanList.join(', ');
    } else if (jenisSurat === 'surat_keputusan') {
      const menimbangText = skMenimbangList.map((item) => `${item.poin} ${item.isi}`).join('\n');
      const mengingatText = skMengingatList.map((item) => `${item.poin} ${item.isi}`).join('\n');
      const memperhatikanText = skMemperhatikanList.map((item) => `${item.poin} ${item.isi}`).join('\n');

      const formattedDiktumList = skDiktumList.map((item, idx) => ({
        ...item,
        label: formatDiktumLabel(item.label, idx),
      }));

      dataKhusus = {
        nomorSK: noSurat,
        tentang: skTentang,
        menimbang: menimbangText,
        menimbangList: skMenimbangList,
        mengingat: mengingatText,
        mengingatList: skMengingatList,
        memperhatikan: memperhatikanText,
        memperhatikanList: skMemperhatikanList,
        diktumList: formattedDiktumList,
        memutuskan: formattedDiktumList[0]?.isi || '',
      };
    } else if (jenisSurat === 'surat_tugas') {
      dataKhusus = {
        dasarTugas: sptDasar,
        tujuanTugas: sptKeperluan,
        tempatTugas: sptTempat,
        tglMulai: sptTglMulai,
        tglSelesai: sptTglSelesai,
        waktu: sptWaktu,
        pegawaiDitugaskan: sptPegawai,
      };
    }

    if (editingId) {
      const existing = suratKeluarList.find((s) => s.id === editingId);
      if (existing) {
        onUpdateSuratKeluar({
          ...existing,
          jenisSurat,
          noSurat,
          kodeKlasifikasi,
          namaKlasifikasi,
          tglSurat,
          tujuan: finalTujuan,
          perihal,
          dataKhusus,
          status,
          penandatangan: sekolah.kepalaSekolah,
          nipPenandatangan: sekolah.nipKepalaSekolah,
          jabatanPenandatangan: 'Kepala Sekolah',
        });
      }
    } else {
      onAddSuratKeluar({
        jenisSurat,
        noSurat,
        kodeKlasifikasi,
        namaKlasifikasi,
        tglSurat,
        tujuan: finalTujuan,
        perihal,
        dataKhusus,
        status,
        penandatangan: sekolah.kepalaSekolah,
        nipPenandatangan: sekolah.nipKepalaSekolah,
        jabatanPenandatangan: 'Kepala Sekolah',
      });
    }

    setShowFormModal(false);
  };

  const handleOpenArsipModal = (sk?: SuratKeluar, existingArsip?: ArsipSurat) => {
    if (existingArsip) {
      setEditingArsipId(existingArsip.id);
      setArsipNoSurat(existingArsip.noSurat);
      setArsipKode(existingArsip.kodeKlasifikasi);
      setArsipPerihal(existingArsip.perihal);
      setArsipTujuan(existingArsip.tujuan || '');
      setArsipTglSurat(existingArsip.tglSurat);
      setArsipTglArsip(existingArsip.tglArsip || new Date().toISOString().slice(0, 10));
      setArsipKategori(existingArsip.kategori || 'Surat Keluar');
      setArsipLokasi(existingArsip.lokasiFisik || 'Ordner 2026 / Lemari A');
      setArsipKeterangan(existingArsip.keterangan || '');
      setArsipLampiranNama(existingArsip.lampiranNama || '');
      setArsipLampiranUrl(existingArsip.lampiranUrl || '');
      setArsipLampiranUkuran(existingArsip.lampiranUkuran || '');
      setArsipLampiranTipe(existingArsip.lampiranTipe || '');
    } else if (sk) {
      setEditingArsipId(null);
      setArsipNoSurat(sk.noSurat);
      setArsipKode(sk.kodeKlasifikasi);
      setArsipPerihal(sk.perihal);
      setArsipTujuan(sk.tujuan);
      setArsipTglSurat(sk.tglSurat);
      setArsipTglArsip(new Date().toISOString().slice(0, 10));
      setArsipKategori(sk.jenisSurat.replace(/_/g, ' ').toUpperCase());
      setArsipLokasi('Ordner 2026 / Lemari A Rak 2');
      setArsipKeterangan('Arsip resmi salinan SDN 1 Pekutatan');
      setArsipLampiranNama(sk.lampiranNama || '');
      setArsipLampiranUrl(sk.lampiranUrl || '');
      setArsipLampiranUkuran(sk.lampiranUkuran || '');
      setArsipLampiranTipe(sk.lampiranTipe || '');
    } else {
      setEditingArsipId(null);
      const nextSeq = getNextNomorUrut(suratKeluarList, arsipList);
      const defaultKode = '421.2';
      const today = new Date().toISOString().slice(0, 10);
      const autoNo = generateNomorSurat(defaultKode, nextSeq, sekolah.kodeSuratSekolah || 'SDN1PKT', new Date());
      setArsipNoSurat(autoNo);
      setArsipKode(defaultKode);
      setArsipPerihal('');
      setArsipTujuan('');
      setArsipTglSurat(today);
      setArsipTglArsip(today);
      setArsipKategori('Surat Keluar');
      setArsipLokasi('Ordner 2026 / Rak B');
      setArsipKeterangan('');
      setArsipLampiranNama('');
      setArsipLampiranUrl('');
      setArsipLampiranUkuran('');
      setArsipLampiranTipe('');
    }
    setShowArsipModal(true);
  };

  const handleSaveArsip = (e: React.FormEvent) => {
    e.preventDefault();
    if (!arsipNoSurat || !arsipPerihal) {
      alert('Nomor surat dan perihal arsip wajib diisi!');
      return;
    }

    if (editingArsipId && onUpdateArsip) {
      const existing = arsipList.find((a) => a.id === editingArsipId);
      if (existing) {
        onUpdateArsip({
          ...existing,
          noSurat: arsipNoSurat,
          kodeKlasifikasi: arsipKode,
          perihal: arsipPerihal,
          tujuan: arsipTujuan,
          tglSurat: arsipTglSurat,
          tglArsip: arsipTglArsip,
          lokasiFisik: arsipLokasi,
          kategori: arsipKategori,
          keterangan: arsipKeterangan,
          lampiranNama: arsipLampiranNama || undefined,
          lampiranUrl: arsipLampiranUrl || undefined,
          lampiranUkuran: arsipLampiranUkuran || undefined,
          lampiranTipe: arsipLampiranTipe || undefined,
        });
      }
    } else {
      onAddArsip({
        noSurat: arsipNoSurat,
        kodeKlasifikasi: arsipKode,
        perihal: arsipPerihal,
        tujuan: arsipTujuan,
        tglSurat: arsipTglSurat,
        tglArsip: arsipTglArsip,
        lokasiFisik: arsipLokasi,
        kategori: arsipKategori,
        keterangan: arsipKeterangan,
        lampiranNama: arsipLampiranNama || undefined,
        lampiranUrl: arsipLampiranUrl || undefined,
        lampiranUkuran: arsipLampiranUkuran || undefined,
        lampiranTipe: arsipLampiranTipe || undefined,
      });
    }

    setShowArsipModal(false);
  };

  const filteredSuratKeluar = suratKeluarList
    .filter((sk) => {
      const matchesSearch =
        sk.noSurat.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sk.perihal.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sk.tujuan.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesJenis = filterJenis === 'Semua' || sk.jenisSurat === filterJenis;
      return matchesSearch && matchesJenis;
    })
    .sort(sortOrder === 'desc' ? compareSuratKeluarDesc : compareSuratKeluarAsc);

  const sortedArsipList = [...arsipList].sort(
    sortOrder === 'desc' ? compareSuratKeluarDesc : compareSuratKeluarAsc
  );

  return (
    <div className="space-y-6">
      {/* View Header & Sub-Tabs */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Send className="w-5 h-5 text-emerald-700" />
            Manajemen Surat Keluar & Arsip
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Pembuatan 5 format surat dinas resmi, ekspor MS Word & PDF, penomoran Permendagri 83/2022, dan pengarsipan
          </p>
        </div>

        {/* Sub-tab switcher */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl">
          <button
            onClick={() => setActiveSubTab('buat_surat')}
            className={`px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
              activeSubTab === 'buat_surat'
                ? 'bg-white text-emerald-950 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>a. Buat Surat Keluar</span>
          </button>
          <button
            onClick={() => setActiveSubTab('arsip_surat')}
            className={`px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
              activeSubTab === 'arsip_surat'
                ? 'bg-white text-indigo-950 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Archive className="w-4 h-4" />
            <span>b. Arsip Surat Keluar</span>
          </button>
        </div>
      </div>

      {activeSubTab === 'buat_surat' ? (
        /* SUB-TAB A: BUAT SURAT KELUAR */
        <div className="space-y-4">
          {/* Action Bar with "Minta Nomor Otomatis" & "Buat Surat Baru" */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center gap-2 flex-1">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Cari nomor, perihal, tujuan..."
                  className="w-full text-xs sm:text-sm pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              <select
                value={filterJenis}
                onChange={(e) => setFilterJenis(e.target.value)}
                className="text-xs border border-slate-300 rounded-lg px-2.5 py-2 focus:ring-2 focus:ring-emerald-600 focus:outline-none bg-white hidden md:block"
              >
                <option value="Semua">Semua Jenis Surat</option>
                <option value="surat_ijin_guru">Surat Ijin Guru</option>
                <option value="surat_keterangan">Surat Keterangan</option>
                <option value="surat_undangan">Surat Undangan Dinas</option>
                <option value="surat_keputusan">Surat Keputusan (SK)</option>
                <option value="surat_tugas">Surat Tugas (SPT)</option>
              </select>

              <button
                type="button"
                onClick={() => setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'))}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-colors shrink-0 shadow-xs"
                title={
                  sortOrder === 'desc'
                    ? 'Urutan saat ini: Nomor urut tertinggi / surat terbaru di atas (Klik untuk membalik)'
                    : 'Urutan saat ini: Nomor urut terkecil / surat terlama di atas (Klik untuk membalik)'
                }
              >
                <ArrowUpDown className="w-3.5 h-3.5 text-emerald-600" />
                <span className="hidden sm:inline">
                  {sortOrder === 'desc' ? 'No. Tertinggi / Terbaru di Atas' : 'No. Terkecil / Terlama di Atas'}
                </span>
                <span className="sm:hidden">
                  {sortOrder === 'desc' ? 'Terbaru' : 'Terlama'}
                </span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={onOpenAutoNumberModal}
                className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs sm:text-sm rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition-colors"
                title="Minta Nomor Surat Otomatis Permendagri No. 83 Tahun 2022"
              >
                <Sparkles className="w-4 h-4" />
                <span>Minta No. Surat Otomatis</span>
              </button>

              <button
                onClick={openNewSurat}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white font-semibold text-xs sm:text-sm rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Buat Surat Keluar</span>
              </button>
            </div>
          </div>

          {/* List of Surat Keluar */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                    <th className="py-3 px-4 w-12 text-center">No</th>
                    <th
                      className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition-colors select-none"
                      onClick={() => setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'))}
                      title="Klik untuk mengubah urutan nomor urut surat"
                    >
                      <div className="flex items-center gap-1.5">
                        <span>Jenis & Nomor Surat</span>
                        <ArrowUpDown className="w-3.5 h-3.5 text-emerald-700" />
                        <span className="text-[10px] font-normal text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                          {sortOrder === 'desc' ? 'No. Tertinggi di Atas' : 'No. Terkecil di Atas'}
                        </span>
                      </div>
                    </th>
                    <th className="py-3 px-4">Perihal & Tujuan</th>
                    <th className="py-3 px-4">Tgl Surat</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-center w-48">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSuratKeluar.map((sk, idx) => {
                    const labelJenisMap: Record<JenisSuratKeluar, string> = {
                      surat_ijin_guru: 'Surat Ijin Guru',
                      surat_keterangan: 'Surat Keterangan',
                      surat_undangan: 'Surat Undangan Dinas',
                      surat_keputusan: 'Surat Keputusan (SK)',
                      surat_tugas: 'Surat Tugas (SPT)',
                    };

                    return (
                      <tr key={sk.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 text-center font-medium text-slate-500">
                          {idx + 1}
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200 block w-max">
                            {labelJenisMap[sk.jenisSurat] || sk.jenisSurat}
                          </span>
                          <span className="font-mono text-xs font-bold text-slate-900 block mt-1">
                            {sk.noSurat}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            Klasifikasi: {sk.kodeKlasifikasi}
                          </span>
                        </td>
                        <td className="py-3 px-4 max-w-xs">
                          <p className="font-semibold text-slate-900 leading-tight">
                            {sk.perihal}
                          </p>
                          <p className="text-xs text-slate-600 mt-1">
                            Tujuan: <span className="font-medium text-slate-800">{sk.tujuan}</span>
                          </p>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap text-xs text-slate-600">
                          {formatTanggalIndonesia(sk.tglSurat)}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span
                            className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                              sk.status === 'Terkirim'
                                ? 'bg-emerald-100 text-emerald-800'
                                : sk.status === 'Disetujui'
                                ? 'bg-blue-100 text-blue-800'
                                : sk.status === 'Diarsipkan'
                                ? 'bg-indigo-100 text-indigo-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {sk.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1">
                            {/* Tombol Lihat & Cetak Word/PDF */}
                            <button
                              onClick={() => onPreviewSurat(sk)}
                              className="p-1.5 text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Lihat Pratinjau & Cetak PDF"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            {/* Tombol Export MS Word */}
                            <button
                              onClick={() => {
                                const html = buildSuratHtml(sk, sekolah);
                                exportToWord(`Surat_${sk.jenisSurat}_${sk.noSurat.replace(/\//g, '_')}`, html);
                              }}
                              className="p-1.5 text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                              title="Download MS Word (.doc)"
                            >
                              <FileSpreadsheet className="w-4 h-4" />
                            </button>

                            {/* Tombol Arsipkan */}
                            <button
                              onClick={() => handleOpenArsipModal(sk)}
                              className="p-1.5 text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors"
                              title="Simpan ke Arsip Surat Keluar"
                            >
                              <Archive className="w-4 h-4" />
                            </button>

                            {/* Tombol Edit */}
                            <button
                              onClick={() => openEditSurat(sk)}
                              className="p-1.5 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                              title="Edit Surat"
                            >
                              <Edit className="w-4 h-4" />
                            </button>

                            {/* Tombol Hapus */}
                            <button
                              onClick={() => {
                                setDeleteConfirm({
                                  type: 'surat',
                                  id: sk.id,
                                  noSurat: sk.noSurat || sk.perihal,
                                });
                              }}
                              className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Hapus Surat"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {filteredSuratKeluar.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-xs text-slate-400">
                        Belum ada data surat keluar yang dibuat.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* SUB-TAB B: ARSIP SURAT KELUAR */
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Daftar Arsip Fisik & Digital Surat Keluar
              </h2>
              <p className="text-xs text-slate-500">
                Pencatatan penataan fisik di lemari, rak, box ordner, serta data ringkas dokumen
              </p>
            </div>
            <button
              onClick={() => handleOpenArsipModal()}
              className="px-4 py-2 bg-indigo-700 hover:bg-indigo-600 text-white font-semibold text-xs sm:text-sm rounded-xl shadow-xs flex items-center gap-1.5 transition-colors self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Arsip Baru</span>
            </button>
          </div>

          {/* Status Koneksi Penomoran Otomatis */}
          <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-sm border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-indigo-800/90 rounded-xl border border-indigo-700/60 shrink-0">
                <Sparkles className="w-5 h-5 text-indigo-200" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white">
                    Sinkronisasi Nomor Urut Otomatis Terhubung
                  </h3>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-semibold px-2 py-0.5 rounded-full border border-emerald-500/30">
                    Aktif
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-0.5 max-w-xl">
                  Nomor surat arsip manual yang diinput otomatis terhubung dengan penomoran surat keluar aplikasi. Nomor surat berikutnya akan berlanjut setelah nomor tertinggi sehingga dijamin tidak tumpang tindih.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0 bg-white/10 px-3.5 py-2 rounded-xl border border-white/10 text-xs">
              <div>
                <div className="text-[11px] text-slate-300">No. Urut Tertinggi:</div>
                <div className="font-mono font-bold text-white text-sm">
                  #{formatNomorUrut(getHighestNomorUrut(suratKeluarList, arsipList))}
                </div>
              </div>
              <div className="h-6 w-px bg-white/20"></div>
              <div>
                <div className="text-[11px] text-emerald-300 font-medium">No. Urut Berikutnya:</div>
                <div className="font-mono font-bold text-emerald-300 text-sm">
                  #{formatNomorUrut(getNextNomorUrut(suratKeluarList, arsipList))}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                    <th className="py-3 px-4 w-12 text-center">No</th>
                    <th
                      className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition-colors select-none"
                      onClick={() => setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'))}
                      title="Klik untuk mengubah urutan arsip surat keluar"
                    >
                      <div className="flex items-center gap-1.5">
                        <span>Nomor & Kode Arsip</span>
                        <ArrowUpDown className="w-3.5 h-3.5 text-indigo-700" />
                        <span className="text-[10px] font-normal text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded">
                          {sortOrder === 'desc' ? 'No. Tertinggi di Atas' : 'No. Terkecil di Atas'}
                        </span>
                      </div>
                    </th>
                    <th className="py-3 px-4">Perihal & Tujuan</th>
                    <th className="py-3 px-4">Tgl Surat & Arsip</th>
                    <th className="py-3 px-4">Lokasi Fisik (Rak/Box)</th>
                    <th className="py-3 px-4 text-center w-24">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sortedArsipList.map((ar, idx) => (
                    <tr key={ar.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 text-center font-medium text-slate-500">
                        {idx + 1}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono text-xs font-bold text-indigo-950">
                            {ar.noSurat}
                          </span>
                          {(() => {
                            const seq = extractNomorUrut(ar.noSurat);
                            return seq !== null ? (
                              <span className="text-[10px] bg-indigo-50 text-indigo-700 font-bold px-1.5 py-0.5 rounded border border-indigo-200 font-mono">
                                Urut #{formatNomorUrut(seq)}
                              </span>
                            ) : null;
                          })()}
                        </div>
                        <span className="text-[11px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 font-mono inline-block mt-1">
                          Kode: {ar.kodeKlasifikasi}
                        </span>
                      </td>
                      <td className="py-3 px-4 max-w-xs">
                        <p className="font-semibold text-slate-900 leading-tight">
                          {ar.perihal}
                        </p>
                        <p className="text-xs text-slate-600 mt-1">
                          Tujuan: <span className="font-medium">{ar.tujuan || '-'}</span>
                        </p>
                        {ar.keterangan && (
                          <p className="text-[11px] text-slate-500 italic mt-0.5">
                            {ar.keterangan}
                          </p>
                        )}
                        {/* Dokumen Lampiran Arsip */}
                        {ar.lampiranUrl ? (
                          <div className="mt-2 flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => openOrDownloadDocument(ar.lampiranNama || 'Dokumen_Arsip', ar.lampiranUrl!)}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-900 text-[11px] font-semibold hover:bg-indigo-100 transition-colors cursor-pointer"
                              title="Buka / Unduh Dokumen Arsip"
                            >
                              <Paperclip className="w-3 h-3 text-indigo-700" />
                              <span className="truncate max-w-[140px] sm:max-w-[180px]">{ar.lampiranNama || 'Dokumen Terlampir'}</span>
                              <Eye className="w-3 h-3 text-indigo-600" />
                            </button>
                          </div>
                        ) : (
                          <div className="mt-1.5">
                            <label className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-50 border border-slate-200 text-slate-600 hover:text-indigo-900 hover:border-indigo-300 hover:bg-indigo-50/50 text-[10px] font-medium transition-colors cursor-pointer">
                              <Upload className="w-3 h-3 text-slate-400" />
                              <span>Upload Dokumen (Opsional)</span>
                              <input
                                type="file"
                                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp"
                                className="hidden"
                                onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (!file || !onUpdateArsip) return;
                                  try {
                                    const res = await readFileAsDataUrl(file);
                                    onUpdateArsip({
                                      ...ar,
                                      lampiranNama: res.name,
                                      lampiranUrl: res.url,
                                      lampiranUkuran: res.size,
                                      lampiranTipe: res.type,
                                    });
                                  } catch (err: any) {
                                    alert(err.message || 'Gagal membaca file');
                                  }
                                }}
                              />
                            </label>
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-xs text-slate-600">
                        <div>Surat: {formatTanggalIndonesia(ar.tglSurat)}</div>
                        <div className="text-[11px] text-indigo-700 font-medium mt-0.5">
                          Diarsip: {formatTanggalIndonesia(ar.tglArsip)}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-block bg-amber-50 text-amber-900 border border-amber-200 px-2.5 py-1 rounded-lg text-xs font-medium">
                          {ar.lokasiFisik}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenArsipModal(undefined, ar)}
                            className="p-1.5 text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                            title="Edit Data Arsip"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setDeleteConfirm({
                                type: 'arsip',
                                id: ar.id,
                                noSurat: ar.noSurat || ar.perihal,
                              });
                            }}
                            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Hapus Arsip"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {arsipList.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-xs text-slate-400">
                        Belum ada surat yang diarsipkan.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL FORM: BUAT / EDIT SURAT KELUAR (5 FORMAT DINAS RESMI) */}
      {showFormModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="bg-emerald-950 px-6 py-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Send className="w-5 h-5 text-emerald-400" />
                <div>
                  <h2 className="text-base font-bold">
                    {editingId ? 'Edit Surat Keluar' : 'Buat Surat Keluar Baru'}
                  </h2>
                  <p className="text-[11px] text-emerald-200">
                    Format resmi kedinasan sekolah siap cetak Word (.doc) & PDF
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowFormModal(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleSaveSurat} className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4 text-xs sm:text-sm">
              {/* Selector Jenis Surat */}
              <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-2">
                <label className="block font-bold text-emerald-950 text-xs uppercase tracking-wide">
                  Pilih Format Surat yang Ingin Dibuat:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { id: 'surat_ijin_guru', label: '1. Permohonan Izin Tidak Masuk' },
                    { id: 'surat_keterangan', label: '2. Surat Keterangan' },
                    { id: 'surat_undangan', label: '3. Surat Undangan Dinas' },
                    { id: 'surat_keputusan', label: '4. Surat Keputusan (SK)' },
                    { id: 'surat_tugas', label: '5. Surat Perintah Tugas (SPT)' },
                  ].map((fmt) => (
                    <button
                      type="button"
                      key={fmt.id}
                      onClick={() => {
                        const newJenis = fmt.id as JenisSuratKeluar;
                        setJenisSurat(newJenis);
                        // Otomatisasi penomoran surat saat memilih jenis surat
                        const auto = hitungNomorOtomatis(newJenis, tglSurat);
                        setNoSurat(auto.nomor);
                        setKodeKlasifikasi(auto.kode);
                        setNamaKlasifikasi(auto.nama);

                        if (newJenis === 'surat_ijin_guru') {
                          setPerihal('Permohonan Izin Tidak Masuk Sekolah');
                          setTujuan('Kepala SDN 1 Pekutatan');
                        } else if (newJenis === 'surat_keterangan') {
                          setPerihal('Surat Keterangan Aktif Belajar Peserta Didik');
                        } else if (newJenis === 'surat_undangan') {
                          setPerihal('Undangan Rapat Dinas Dewan Guru');
                        } else if (newJenis === 'surat_keputusan') {
                          setPerihal('Keputusan Kepala Sekolah tentang Pembagian Tugas Mengajar');
                        } else if (newJenis === 'surat_tugas') {
                          setPerihal('Surat Perintah Tugas Mengikuti Kegiatan Kedinasan');
                        }
                      }}
                      className={`py-2 px-2.5 text-xs font-semibold rounded-lg text-left transition-all border ${
                        jenisSurat === fmt.id
                          ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-300'
                      }`}
                    >
                      {fmt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Nomor Surat & Tombol Segarkan Nomor Otomatis */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-semibold text-slate-700">
                      {jenisSurat === 'surat_ijin_guru' ? 'Nomor Surat (Pribadi)' : 'Nomor Surat (Otomatis) *'}
                    </label>
                    {jenisSurat !== 'surat_ijin_guru' && (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            const nextSeq = getNextNomorUrut(suratKeluarList, arsipList);
                            const dateObj = tglSurat ? new Date(tglSurat) : new Date();
                            const defaultKode =
                              jenisSurat === 'surat_undangan'
                                ? '000.1.5'
                                : jenisSurat === 'surat_keterangan'
                                ? '400.3.12.1'
                                : jenisSurat === 'surat_keputusan'
                                ? '400.3.10'
                                : '800.1.11.1';
                            const refreshed = refreshNomorUrut(
                              noSurat,
                              kodeKlasifikasi || defaultKode,
                              nextSeq,
                              sekolah.kodeSuratSekolah || 'SDN1PKT',
                              dateObj
                            );
                            setNoSurat(refreshed);
                          }}
                          className="text-[11px] text-emerald-700 hover:text-emerald-900 font-bold flex items-center gap-1 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200 transition-colors"
                          title="Segarkan nomor urut surat otomatis tersinkronisasi dengan Surat Keluar & Arsip (kode klasifikasi tetap dipertahankan)"
                        >
                          <RefreshCw className="w-3 h-3 text-emerald-600" />
                          <span>Segarkan Urut</span>
                        </button>
                        <button
                          type="button"
                          onClick={onOpenAutoNumberModal}
                          className="text-[11px] text-slate-500 hover:text-slate-800 underline"
                          title="Pilih Klasifikasi Manual"
                        >
                          Ubah Kode
                        </button>
                      </div>
                    )}
                  </div>
                  {jenisSurat === 'surat_ijin_guru' ? (
                    <div className="bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-600 italic">
                      Surat permohonan izin pribadi tidak menggunakan kop dinas dan nomor register surat dinas.
                    </div>
                  ) : (
                    <input
                      type="text"
                      required
                      value={noSurat}
                      onChange={(e) => setNoSurat(e.target.value)}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 font-mono font-bold text-slate-900 focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                    />
                  )}
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Tanggal Surat *
                  </label>
                  <input
                    type="date"
                    required
                    value={tglSurat}
                    onChange={(e) => {
                      const newTgl = e.target.value;
                      setTglSurat(newTgl);
                      if (jenisSurat !== 'surat_ijin_guru') {
                        const auto = hitungNomorOtomatis(jenisSurat, newTgl);
                        setNoSurat(auto.nomor);
                      }
                    }}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Tujuan / Penerima Surat *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Kepala Dinas / Nama Siswa / Bapak/Ibu Wali Murid"
                    value={tujuan}
                    onChange={(e) => setTujuan(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Status Surat
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as StatusSuratKeluar)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-600 focus:outline-none bg-white"
                  >
                    <option value="Konsep">Konsep (Draft)</option>
                    <option value="Disetujui">Disetujui Kepala Sekolah</option>
                    <option value="Terkirim">Terkirim Resmi</option>
                    <option value="Diarsipkan">Diarsipkan</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Perihal Surat *
                </label>
                <input
                  type="text"
                  required
                  value={perihal}
                  onChange={(e) => setPerihal(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              {/* ISIAN KHUSUS BERDASARKAN JENIS SURAT */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                {/* 1. SURAT PERMOHONAN TIDAK MASUK SEKOLAH (IJIN GURU) */}
                {jenisSurat === 'surat_ijin_guru' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-slate-900 text-xs uppercase flex items-center gap-1.5 text-emerald-800">
                        <UserCheck className="w-4 h-4" />
                        Surat Permohonan Tidak Masuk Sekolah
                      </h3>
                      <span className="text-[11px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-medium">
                        Permohonan Pribadi Guru ke Instansi
                      </span>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Pilih Guru yang Memohon Izin (Dari Database)
                      </label>
                      <select
                        onChange={(e) => {
                          const g = guruList.find((x) => x.id === e.target.value);
                          if (g) {
                            setIjinNamaGuru(g.nama);
                            setIjinNipGuru(g.nip);
                            setIjinPangkat(g.pangkatGol);
                            setIjinJabatan(g.jabatan);
                          }
                        }}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                      >
                        <option value="">-- Pilih Guru Pemohon dari Database --</option>
                        {guruList.map((g) => (
                          <option key={g.id} value={g.id}>
                            {g.nama} ({g.jabatan} - NIP: {g.nip})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Nama Pemohon *</label>
                        <input
                          type="text"
                          required
                          value={ijinNamaGuru}
                          onChange={(e) => setIjinNamaGuru(e.target.value)}
                          className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">NIP / NUPTK</label>
                        <input
                          type="text"
                          value={ijinNipGuru}
                          onChange={(e) => setIjinNipGuru(e.target.value)}
                          className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Pangkat / Golongan</label>
                        <input
                          type="text"
                          value={ijinPangkat}
                          onChange={(e) => setIjinPangkat(e.target.value)}
                          className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Jabatan / Tugas</label>
                        <input
                          type="text"
                          value={ijinJabatan}
                          onChange={(e) => setIjinJabatan(e.target.value)}
                          className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Pilihan Durasi Izin */}
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1.5">Pilihan Durasi Izin</label>
                      <div className="grid grid-cols-2 gap-3 mb-2">
                        <button
                          type="button"
                          onClick={() => {
                            setIjinTipeDurasi('satu_hari');
                            setIjinTglSelesai(ijinTglMulai);
                          }}
                          className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg border text-sm font-medium transition-all ${
                            ijinTipeDurasi === 'satu_hari'
                              ? 'bg-emerald-50 border-emerald-600 text-emerald-800 shadow-sm ring-1 ring-emerald-600'
                              : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${ijinTipeDurasi === 'satu_hari' ? 'border-emerald-600' : 'border-slate-400'}`}>
                            {ijinTipeDurasi === 'satu_hari' && <span className="w-2 h-2 rounded-full bg-emerald-600" />}
                          </span>
                          <span>Izin 1 Hari (Satu Hari)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setIjinTipeDurasi('rentang')}
                          className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg border text-sm font-medium transition-all ${
                            ijinTipeDurasi === 'rentang'
                              ? 'bg-emerald-50 border-emerald-600 text-emerald-800 shadow-sm ring-1 ring-emerald-600'
                              : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${ijinTipeDurasi === 'rentang' ? 'border-emerald-600' : 'border-slate-400'}`}>
                            {ijinTipeDurasi === 'rentang' && <span className="w-2 h-2 rounded-full bg-emerald-600" />}
                          </span>
                          <span>Lebih dari 1 Hari (Rentang)</span>
                        </button>
                      </div>
                    </div>

                    {ijinTipeDurasi === 'satu_hari' ? (
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Tanggal Izin *</label>
                        <input
                          type="date"
                          value={ijinTglMulai}
                          onChange={(e) => {
                            setIjinTglMulai(e.target.value);
                            setIjinTglSelesai(e.target.value);
                          }}
                          className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                        />
                        <p className="text-xs text-slate-500 mt-1">
                          Redaksi surat otomatis disesuaikan (menampilkan hari & tanggal izin tanpa rentang tanggal berulang).
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block font-semibold text-slate-700 mb-1">Tanggal Mulai Izin *</label>
                          <input
                            type="date"
                            value={ijinTglMulai}
                            onChange={(e) => setIjinTglMulai(e.target.value)}
                            className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block font-semibold text-slate-700 mb-1">Tanggal Selesai Izin *</label>
                          <input
                            type="date"
                            value={ijinTglSelesai}
                            onChange={(e) => setIjinTglSelesai(e.target.value)}
                            className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                          />
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Alasan Izin / Keperluan</label>
                      <input
                        type="text"
                        placeholder="Contoh: Menghadiri Upacara Adat / Yadnya di Pura Desa Pekutatan"
                        value={ijinAlasan}
                        onChange={(e) => setIjinAlasan(e.target.value)}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Guru Pengganti (Dari Database)</label>
                      <select
                        value={guruList.find((g) => g.nama === ijinGuruPengganti)?.id || ''}
                        onChange={(e) => {
                          const gp = guruList.find((g) => g.id === e.target.value);
                          if (gp) {
                            setIjinGuruPengganti(gp.nama);
                          }
                        }}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none mb-2"
                      >
                        <option value="">-- Pilih Guru Pengganti dari Database --</option>
                        {guruList.map((g) => (
                          <option key={g.id} value={g.id}>
                            {g.nama} ({g.jabatan})
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        placeholder="Atau ketik nama guru pengganti / pelimpahan tugas"
                        value={ijinGuruPengganti}
                        onChange={(e) => setIjinGuruPengganti(e.target.value)}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none text-xs"
                      />
                    </div>
                  </div>
                )}

                {/* 2. SURAT KETERANGAN SISWA & GURU */}
                {jenisSurat === 'surat_keterangan' && (
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2">
                      <h3 className="font-bold text-slate-900 text-xs uppercase flex items-center gap-1.5 text-emerald-800">
                        <Award className="w-4 h-4" />
                        Detail Surat Keterangan
                      </h3>

                      <div className="flex gap-4 items-center">
                        <label className="font-semibold text-slate-700 text-xs">Subjek:</label>
                        <label className="flex items-center gap-1.5 cursor-pointer text-xs">
                          <input
                            type="radio"
                            name="ketJenis"
                            checked={ketJenisSubjek === 'siswa'}
                            onChange={() => setKetJenisSubjek('siswa')}
                          />
                          <span className="font-medium">Siswa</span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer text-xs">
                          <input
                            type="radio"
                            name="ketJenis"
                            checked={ketJenisSubjek === 'guru'}
                            onChange={() => setKetJenisSubjek('guru')}
                          />
                          <span className="font-medium">Guru / PTK</span>
                        </label>
                      </div>
                    </div>

                    {/* Subjek Manager: 1 atau lebih orang */}
                    <div className="space-y-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <span className="font-bold text-xs text-slate-800 uppercase tracking-wide">
                            Daftar {ketJenisSubjek === 'siswa' ? 'Siswa / Peserta Didik' : 'Guru / Tendik'} yang Diterangkan
                          </span>
                          <span className="ml-2 text-[11px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                            {ketSubjekList.length > 0 ? `${ketSubjekList.length} Orang` : '1 Orang'}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const newId = String(Date.now());
                            if (ketSubjekList.length === 0) {
                              setKetSubjekList([
                                {
                                  id: '1',
                                  nama: ketNama || (ketJenisSubjek === 'siswa' ? 'Nama Siswa 1' : 'Nama Guru 1'),
                                  nisnNip: ketNisnNip,
                                  kelasJabatan: ketKelasJabatan,
                                  tempatTglLahir: ketTempatTglLahir,
                                  namaOrtu: ketNamaOrtu,
                                  alamat: ketAlamat,
                                },
                                {
                                  id: newId,
                                  nama: '',
                                  nisnNip: '',
                                  kelasJabatan: '',
                                  tempatTglLahir: '',
                                  namaOrtu: '',
                                  alamat: '',
                                },
                              ]);
                            } else {
                              setKetSubjekList([
                                ...ketSubjekList,
                                {
                                  id: newId,
                                  nama: '',
                                  nisnNip: '',
                                  kelasJabatan: '',
                                  tempatTglLahir: '',
                                  namaOrtu: '',
                                  alamat: '',
                                },
                              ]);
                            }
                          }}
                          className="text-xs bg-emerald-700 hover:bg-emerald-600 text-white font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors shadow-xs w-max"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>+ Tambah {ketJenisSubjek === 'siswa' ? 'Siswa' : 'Guru'} (Bisa &gt; 1 Orang)</span>
                        </button>
                      </div>

                      {ketSubjekList.length === 0 ? (
                        <div className="space-y-3 bg-white p-3 rounded-lg border border-slate-200">
                          {ketJenisSubjek === 'siswa' ? (
                            <div>
                              <label className="block font-semibold text-slate-700 mb-1 text-xs">
                                Pilih Siswa dari Database (Otomatis Mengisi Form di Bawah)
                              </label>
                              <select
                                onChange={(e) => {
                                  const s = siswaList.find((x) => x.id === e.target.value);
                                  if (s) {
                                    setKetNama(s.nama);
                                    setKetNisnNip(`${s.nisn} / NIS: ${s.nis}`);
                                    setKetKelasJabatan(`Kelas ${s.kelas}`);
                                    setKetTempatTglLahir(`${s.tempatLahir}, ${formatTanggalIndonesia(s.tglLahir)}`);
                                    setKetNamaOrtu(s.namaOrtu);
                                    setKetAlamat(s.alamat);
                                    setTujuan(s.nama);
                                  }
                                }}
                                className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none text-xs"
                              >
                                <option value="">-- Pilih Siswa dari Database --</option>
                                {siswaList.map((s) => (
                                  <option key={s.id} value={s.id}>
                                    {s.nama} (Kelas {s.kelas} - NISN: {s.nisn})
                                  </option>
                                ))}
                              </select>
                            </div>
                          ) : (
                            <div>
                              <label className="block font-semibold text-slate-700 mb-1 text-xs">
                                Pilih Guru / PTK dari Database (Otomatis Mengisi Form di Bawah)
                              </label>
                              <select
                                onChange={(e) => {
                                  const g = guruList.find((x) => x.id === e.target.value);
                                  if (g) {
                                    setKetNama(g.nama);
                                    setKetNisnNip(g.nip ? `NIP. ${g.nip}` : `NUPTK. ${g.nuptk || '-'}`);
                                    setKetKelasJabatan(g.jabatan || 'Guru Kelas');
                                    setKetTempatTglLahir(g.pendidikan ? `Pendidikan: ${g.pendidikan}` : '-');
                                    setKetNamaOrtu('-');
                                    setKetAlamat(sekolah.alamat || 'SDN 1 Pekutatan');
                                    setTujuan(g.nama);
                                  }
                                }}
                                className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none text-xs"
                              >
                                <option value="">-- Pilih Guru dari Database --</option>
                                {guruList.map((g) => (
                                  <option key={g.id} value={g.id}>
                                    {g.nama} - {g.jabatan} (NIP: {g.nip})
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="block font-semibold text-slate-700 mb-1 text-xs">Nama Lengkap *</label>
                              <input
                                type="text"
                                required
                                value={ketNama}
                                onChange={(e) => setKetNama(e.target.value)}
                                className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="block font-semibold text-slate-700 mb-1 text-xs">
                                {ketJenisSubjek === 'siswa' ? 'NISN / NIS' : 'NIP / NUPTK'}
                              </label>
                              <input
                                type="text"
                                value={ketNisnNip}
                                onChange={(e) => setKetNisnNip(e.target.value)}
                                className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="block font-semibold text-slate-700 mb-1 text-xs">Kelas / Jabatan</label>
                              <input
                                type="text"
                                value={ketKelasJabatan}
                                onChange={(e) => setKetKelasJabatan(e.target.value)}
                                className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="block font-semibold text-slate-700 mb-1 text-xs">Tempat, Tanggal Lahir / Keterangan</label>
                              <input
                                type="text"
                                value={ketTempatTglLahir}
                                onChange={(e) => setKetTempatTglLahir(e.target.value)}
                                className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                              />
                            </div>
                          </div>

                          {ketJenisSubjek === 'siswa' && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <label className="block font-semibold text-slate-700 mb-1 text-xs">Nama Orang Tua / Wali</label>
                                <input
                                  type="text"
                                  value={ketNamaOrtu}
                                  onChange={(e) => setKetNamaOrtu(e.target.value)}
                                  className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                                />
                              </div>
                              <div>
                                <label className="block font-semibold text-slate-700 mb-1 text-xs">Alamat Domisili</label>
                                <input
                                  type="text"
                                  value={ketAlamat}
                                  onChange={(e) => setKetAlamat(e.target.value)}
                                  className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {ketSubjekList.map((subj, index) => (
                            <div key={subj.id || index} className="p-3.5 bg-white border border-slate-200 rounded-xl space-y-3 shadow-2xs">
                              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                <span className="font-bold text-xs text-emerald-800 flex items-center gap-1.5">
                                  <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-[10px] font-bold">
                                    {index + 1}
                                  </span>
                                  Data {ketJenisSubjek === 'siswa' ? 'Siswa' : 'Guru'} #{index + 1}
                                </span>

                                <div className="flex items-center gap-2">
                                  {ketJenisSubjek === 'siswa' ? (
                                    <select
                                      onChange={(e) => {
                                        const s = siswaList.find((x) => x.id === e.target.value);
                                        if (s) {
                                          const updated = [...ketSubjekList];
                                          updated[index] = {
                                            ...updated[index],
                                            nama: s.nama,
                                            nisnNip: `${s.nisn} / NIS: ${s.nis}`,
                                            kelasJabatan: `Kelas ${s.kelas}`,
                                            tempatTglLahir: `${s.tempatLahir}, ${formatTanggalIndonesia(s.tglLahir)}`,
                                            namaOrtu: s.namaOrtu,
                                            alamat: s.alamat,
                                          };
                                          setKetSubjekList(updated);
                                        }
                                      }}
                                      className="text-xs border border-slate-300 rounded-md px-2 py-1 bg-slate-50 focus:ring-1 focus:ring-emerald-600"
                                    >
                                      <option value="">-- Ambil dari DB Siswa --</option>
                                      {siswaList.map((s) => (
                                        <option key={s.id} value={s.id}>
                                          {s.nama} ({s.kelas})
                                        </option>
                                      ))}
                                    </select>
                                  ) : (
                                    <select
                                      onChange={(e) => {
                                        const g = guruList.find((x) => x.id === e.target.value);
                                        if (g) {
                                          const updated = [...ketSubjekList];
                                          updated[index] = {
                                            ...updated[index],
                                            nama: g.nama,
                                            nisnNip: g.nip ? `NIP. ${g.nip}` : `NUPTK. ${g.nuptk || '-'}`,
                                            kelasJabatan: g.jabatan || 'Guru Kelas',
                                            tempatTglLahir: g.pendidikan ? `Pendidikan: ${g.pendidikan}` : '-',
                                            namaOrtu: '-',
                                            alamat: sekolah.alamat || 'SDN 1 Pekutatan',
                                          };
                                          setKetSubjekList(updated);
                                        }
                                      }}
                                      className="text-xs border border-slate-300 rounded-md px-2 py-1 bg-slate-50 focus:ring-1 focus:ring-emerald-600"
                                    >
                                      <option value="">-- Ambil dari DB Guru --</option>
                                      {guruList.map((g) => (
                                        <option key={g.id} value={g.id}>
                                          {g.nama} ({g.jabatan})
                                        </option>
                                      ))}
                                    </select>
                                  )}

                                  <button
                                    type="button"
                                    onClick={() => {
                                      const updated = ketSubjekList.filter((_, i) => i !== index);
                                      setKetSubjekList(updated);
                                      if (updated.length === 1) {
                                        setKetNama(updated[0].nama);
                                        setKetNisnNip(updated[0].nisnNip);
                                        setKetKelasJabatan(updated[0].kelasJabatan);
                                        setKetTempatTglLahir(updated[0].tempatTglLahir);
                                        setKetNamaOrtu(updated[0].namaOrtu || '');
                                        setKetAlamat(updated[0].alamat || '');
                                      }
                                    }}
                                    className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded"
                                    title="Hapus Orang Ini"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                  <label className="block font-semibold text-slate-700 mb-1 text-xs">Nama Lengkap *</label>
                                  <input
                                    type="text"
                                    required
                                    value={subj.nama}
                                    onChange={(e) => {
                                      const updated = [...ketSubjekList];
                                      updated[index] = { ...updated[index], nama: e.target.value };
                                      setKetSubjekList(updated);
                                    }}
                                    className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-xs focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                                  />
                                </div>
                                <div>
                                  <label className="block font-semibold text-slate-700 mb-1 text-xs">
                                    {ketJenisSubjek === 'siswa' ? 'NISN / NIS' : 'NIP / NUPTK'}
                                  </label>
                                  <input
                                    type="text"
                                    value={subj.nisnNip}
                                    onChange={(e) => {
                                      const updated = [...ketSubjekList];
                                      updated[index] = { ...updated[index], nisnNip: e.target.value };
                                      setKetSubjekList(updated);
                                    }}
                                    className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-xs focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                                  />
                                </div>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                  <label className="block font-semibold text-slate-700 mb-1 text-xs">Kelas / Jabatan</label>
                                  <input
                                    type="text"
                                    value={subj.kelasJabatan}
                                    onChange={(e) => {
                                      const updated = [...ketSubjekList];
                                      updated[index] = { ...updated[index], kelasJabatan: e.target.value };
                                      setKetSubjekList(updated);
                                    }}
                                    className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-xs focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                                  />
                                </div>
                                <div>
                                  <label className="block font-semibold text-slate-700 mb-1 text-xs">Tempat, Tanggal Lahir / Keterangan</label>
                                  <input
                                    type="text"
                                    value={subj.tempatTglLahir}
                                    onChange={(e) => {
                                      const updated = [...ketSubjekList];
                                      updated[index] = { ...updated[index], tempatTglLahir: e.target.value };
                                      setKetSubjekList(updated);
                                    }}
                                    className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-xs focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                                  />
                                </div>
                              </div>

                              {ketJenisSubjek === 'siswa' && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  <div>
                                    <label className="block font-semibold text-slate-700 mb-1 text-xs">Nama Orang Tua / Wali</label>
                                    <input
                                      type="text"
                                      value={subj.namaOrtu || ''}
                                      onChange={(e) => {
                                        const updated = [...ketSubjekList];
                                        updated[index] = { ...updated[index], namaOrtu: e.target.value };
                                        setKetSubjekList(updated);
                                      }}
                                      className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-xs focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                                    />
                                  </div>
                                  <div>
                                    <label className="block font-semibold text-slate-700 mb-1 text-xs">Alamat Domisili</label>
                                    <input
                                      type="text"
                                      value={subj.alamat || ''}
                                      onChange={(e) => {
                                        const updated = [...ketSubjekList];
                                        updated[index] = { ...updated[index], alamat: e.target.value };
                                        setKetSubjekList(updated);
                                      }}
                                      className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-xs focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Keperluan Pembuatan Keterangan *</label>
                      <input
                        type="text"
                        required
                        placeholder="Contoh: Pengurusan Rekening SimPel Beasiswa PIP / Kenaikan Pangkat / Pemberkasan Dinas"
                        value={ketKeperluan}
                        onChange={(e) => setKetKeperluan(e.target.value)}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                {/* 3. SURAT UNDANGAN DINAS */}
                {jenisSurat === 'surat_undangan' && (
                  <div className="space-y-4">
                    <h3 className="font-bold text-slate-900 text-xs uppercase flex items-center gap-1.5 text-emerald-800">
                      <Users className="w-4 h-4" />
                      Detail Surat Undangan Dinas
                    </h3>

                    {/* Penerima Lebih dari 1 Orang */}
                    <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <label className="font-bold text-xs text-slate-800 uppercase tracking-wide">
                            Daftar Tujuan / Penerima Undangan (Kepada Yth.)
                          </label>
                          <span className="ml-2 text-[11px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                            {undTujuanList.length} Penerima
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <select
                            onChange={(e) => {
                              if (e.target.value) {
                                const g = guruList.find((x) => x.id === e.target.value);
                                if (g) {
                                  setUndTujuanList([...undTujuanList, `${g.nama} (${g.jabatan})`]);
                                }
                                e.target.value = '';
                              }
                            }}
                            className="text-xs border border-slate-300 rounded-lg px-2 py-1 bg-white focus:ring-1 focus:ring-emerald-600"
                          >
                            <option value="">+ Tambah Guru / Tendik</option>
                            {guruList.map((g) => (
                              <option key={g.id} value={g.id}>
                                {g.nama} ({g.jabatan})
                              </option>
                            ))}
                          </select>

                          <button
                            type="button"
                            onClick={() => {
                              setUndTujuanList([...undTujuanList, '']);
                            }}
                            className="text-xs bg-emerald-700 hover:bg-emerald-600 text-white font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-xs transition-colors"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Tambah Penerima</span>
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        {undTujuanList.map((tuj, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <span className="text-xs font-mono font-bold text-slate-400 w-6 text-center">
                              {idx + 1}.
                            </span>
                            <input
                              type="text"
                              required={idx === 0}
                              placeholder="Contoh: Dewan Guru SDN 1 Pekutatan / Komite Sekolah / Tokoh Masyarakat"
                              value={tuj}
                              onChange={(e) => {
                                const updated = [...undTujuanList];
                                updated[idx] = e.target.value;
                                setUndTujuanList(updated);
                              }}
                              className="flex-1 border border-slate-300 rounded-lg px-3 py-1.5 bg-white text-xs focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                            />
                            {undTujuanList.length > 1 && (
                              <button
                                type="button"
                                onClick={() => {
                                  setUndTujuanList(undTujuanList.filter((_, i) => i !== idx));
                                }}
                                className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded transition-colors"
                                title="Hapus Penerima Ini"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                      <p className="text-[11px] text-slate-500 italic">
                        * Jika penerima lebih dari 1, cetakan surat akan otomatis memformat penomoran daftar penerima dengan rapi.
                      </p>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Template Kata Pengantar Surat (Bisa Diedit)
                      </label>
                      <textarea
                        rows={2}
                        value={undKataPengantar}
                        onChange={(e) => setUndKataPengantar(e.target.value)}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none text-xs"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Hari & Tanggal *</label>
                        <input
                          type="text"
                          required
                          placeholder="Contoh: Sabtu, 19 September 2026"
                          value={undHariTanggal}
                          onChange={(e) => setUndHariTanggal(e.target.value)}
                          className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Waktu *</label>
                        <input
                          type="text"
                          required
                          placeholder="Contoh: 09.00 WITA s.d. Selesai"
                          value={undWaktu}
                          onChange={(e) => setUndWaktu(e.target.value)}
                          className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Tempat Acara *</label>
                      <input
                        type="text"
                        required
                        value={undTempat}
                        onChange={(e) => setUndTempat(e.target.value)}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Agenda / Acara *</label>
                      <input
                        type="text"
                        required
                        placeholder="Uraian agenda rapat"
                        value={undAcara}
                        onChange={(e) => setUndAcara(e.target.value)}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Catatan Tambahan</label>
                      <input
                        type="text"
                        placeholder="Contoh: Dimohon hadir tepat waktu dan tidak diwakilkan"
                        value={undCatatan}
                        onChange={(e) => setUndCatatan(e.target.value)}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Template Kalimat Penutup Surat (Bisa Diedit)
                      </label>
                      <textarea
                        rows={2}
                        value={undKalimatPenutup}
                        onChange={(e) => setUndKalimatPenutup(e.target.value)}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none text-xs"
                      />
                    </div>
                  </div>
                )}

                {/* 4. SURAT KEPUTUSAN (SK) */}
                {jenisSurat === 'surat_keputusan' && (
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-100 pb-2">
                      <h3 className="font-bold text-slate-900 text-xs uppercase flex items-center gap-1.5 text-emerald-800">
                        <FileText className="w-4 h-4" />
                        Detail Surat Keputusan (SK)
                      </h3>
                      <span className="text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        Style: <strong>Bookman Old Style</strong> 12pt (Nomor SK 10pt)
                      </span>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1 text-xs">
                        Tentang (Perihal Ketetapan SK)
                      </label>
                      <input
                        type="text"
                        placeholder="PEMBAGIAN TUGAS GURU TAHUN AJARAN 2026/2027"
                        value={skTentang}
                        onChange={(e) => setSkTentang(e.target.value)}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none font-bold text-sm"
                      />
                    </div>

                    {/* Konsideran Menimbang */}
                    <div className="space-y-2 bg-slate-50/80 p-3 rounded-lg border border-slate-200">
                      <div className="flex items-center justify-between">
                        <label className="block font-semibold text-slate-800 text-xs flex items-center gap-1">
                          <span>Konsideran Menimbang</span>
                          <span className="text-[10px] text-slate-500 font-normal">({skMenimbangList.length} butir)</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            const nextPoin = `${String.fromCharCode(97 + skMenimbangList.length)}.`;
                            setSkMenimbangList([
                              ...skMenimbangList,
                              { id: String(Date.now()), poin: nextPoin, isi: '' },
                            ]);
                          }}
                          className="text-xs text-emerald-700 hover:text-emerald-900 font-bold flex items-center gap-1 bg-white hover:bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200 transition-colors shadow-2xs cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Tambah Menimbang</span>
                        </button>
                      </div>

                      <div className="space-y-2">
                        {skMenimbangList.map((item, idx) => (
                          <div key={item.id} className="flex gap-2 items-start bg-white p-2 rounded-lg border border-slate-200 shadow-2xs">
                            <input
                              type="text"
                              value={item.poin}
                              onChange={(e) => {
                                const updated = [...skMenimbangList];
                                updated[idx].poin = e.target.value;
                                setSkMenimbangList(updated);
                              }}
                              className="w-14 text-center font-bold text-xs border border-slate-300 rounded px-1 py-1.5 focus:ring-1 focus:ring-emerald-500 focus:outline-none bg-slate-50"
                              title="Poin / Huruf (misal a., b.)"
                            />
                            <textarea
                              rows={2}
                              value={item.isi}
                              onChange={(e) => {
                                const updated = [...skMenimbangList];
                                updated[idx].isi = e.target.value;
                                setSkMenimbangList(updated);
                              }}
                              className="flex-1 text-xs border border-slate-300 rounded px-2 py-1.5 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                              placeholder="bahwa dalam rangka memperlancar proses pembelajaran..."
                            />
                            {skMenimbangList.length > 1 && (
                              <button
                                type="button"
                                onClick={() => setSkMenimbangList(skMenimbangList.filter((_, i) => i !== idx))}
                                className="text-slate-400 hover:text-rose-600 p-1 transition-colors cursor-pointer"
                                title="Hapus Poin Menimbang"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Dasar Hukum Mengingat */}
                    <div className="space-y-2 bg-slate-50/80 p-3 rounded-lg border border-slate-200">
                      <div className="flex items-center justify-between">
                        <label className="block font-semibold text-slate-800 text-xs flex items-center gap-1">
                          <span>Dasar Hukum Mengingat</span>
                          <span className="text-[10px] text-slate-500 font-normal">({skMengingatList.length} butir)</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            const nextPoin = `${skMengingatList.length + 1}.`;
                            setSkMengingatList([
                              ...skMengingatList,
                              { id: String(Date.now()), poin: nextPoin, isi: '' },
                            ]);
                          }}
                          className="text-xs text-emerald-700 hover:text-emerald-900 font-bold flex items-center gap-1 bg-white hover:bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200 transition-colors shadow-2xs cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Tambah Mengingat</span>
                        </button>
                      </div>

                      <div className="space-y-2">
                        {skMengingatList.map((item, idx) => (
                          <div key={item.id} className="flex gap-2 items-start bg-white p-2 rounded-lg border border-slate-200 shadow-2xs">
                            <input
                              type="text"
                              value={item.poin}
                              onChange={(e) => {
                                const updated = [...skMengingatList];
                                updated[idx].poin = e.target.value;
                                setSkMengingatList(updated);
                              }}
                              className="w-14 text-center font-bold text-xs border border-slate-300 rounded px-1 py-1.5 focus:ring-1 focus:ring-emerald-500 focus:outline-none bg-slate-50"
                              title="Nomor Urut Dasar Hukum"
                            />
                            <textarea
                              rows={2}
                              value={item.isi}
                              onChange={(e) => {
                                const updated = [...skMengingatList];
                                updated[idx].isi = e.target.value;
                                setSkMengingatList(updated);
                              }}
                              className="flex-1 text-xs border border-slate-300 rounded px-2 py-1.5 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                              placeholder="Undang-Undang / Peraturan terkait..."
                            />
                            {skMengingatList.length > 1 && (
                              <button
                                type="button"
                                onClick={() => setSkMengingatList(skMengingatList.filter((_, i) => i !== idx))}
                                className="text-slate-400 hover:text-rose-600 p-1 transition-colors cursor-pointer"
                                title="Hapus Poin Mengingat"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Konsideran Memperhatikan */}
                    <div className="space-y-2 bg-slate-50/80 p-3 rounded-lg border border-slate-200">
                      <div className="flex items-center justify-between">
                        <label className="block font-semibold text-slate-800 text-xs flex items-center gap-1">
                          <span>Konsideran Memperhatikan</span>
                          <span className="text-[10px] text-slate-500 font-normal">({skMemperhatikanList.length} butir)</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            const nextPoin = `${skMemperhatikanList.length + 1}.`;
                            setSkMemperhatikanList([
                              ...skMemperhatikanList,
                              { id: String(Date.now()), poin: nextPoin, isi: '' },
                            ]);
                          }}
                          className="text-xs text-emerald-700 hover:text-emerald-900 font-bold flex items-center gap-1 bg-white hover:bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200 transition-colors shadow-2xs cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Tambah Memperhatikan</span>
                        </button>
                      </div>

                      <div className="space-y-2">
                        {skMemperhatikanList.map((item, idx) => (
                          <div key={item.id} className="flex gap-2 items-start bg-white p-2 rounded-lg border border-slate-200 shadow-2xs">
                            <input
                              type="text"
                              value={item.poin}
                              onChange={(e) => {
                                const updated = [...skMemperhatikanList];
                                updated[idx].poin = e.target.value;
                                setSkMemperhatikanList(updated);
                              }}
                              className="w-14 text-center font-bold text-xs border border-slate-300 rounded px-1 py-1.5 focus:ring-1 focus:ring-emerald-500 focus:outline-none bg-slate-50"
                              title="Nomor Urut"
                            />
                            <textarea
                              rows={2}
                              value={item.isi}
                              onChange={(e) => {
                                const updated = [...skMemperhatikanList];
                                updated[idx].isi = e.target.value;
                                setSkMemperhatikanList(updated);
                              }}
                              className="flex-1 text-xs border border-slate-300 rounded px-2 py-1.5 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                              placeholder="1. Hasil Rapat Dinas Dewan Guru..."
                            />
                            <button
                              type="button"
                              onClick={() => setSkMemperhatikanList(skMemperhatikanList.filter((_, i) => i !== idx))}
                              className="text-slate-400 hover:text-rose-600 p-1 transition-colors cursor-pointer"
                              title="Hapus Poin Memperhatikan"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                        {skMemperhatikanList.length === 0 && (
                          <p className="text-xs text-slate-500 italic p-2 text-center bg-white rounded border border-dashed border-slate-300">
                            Belum ada konsideran memperhatikan. Klik tombol &quot;+ Tambah Memperhatikan&quot; di atas jika dibutuhkan.
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Diktum Memutuskan */}
                    <div className="space-y-2 bg-slate-50/80 p-3 rounded-lg border border-slate-200">
                      <div className="flex items-center justify-between">
                        <label className="block font-semibold text-slate-800 text-xs flex items-center gap-1">
                          <span>Diktum Memutuskan (Fleksibel)</span>
                          <span className="text-[10px] text-slate-500 font-normal">({skDiktumList.length} diktum)</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            const nextLabel = getIndonesianOrdinalWord(skDiktumList.length + 1);
                            setSkDiktumList([
                              ...skDiktumList,
                              { id: String(Date.now()), label: nextLabel, isi: '' },
                            ]);
                          }}
                          className="text-xs text-emerald-700 hover:text-emerald-900 font-bold flex items-center gap-1 bg-white hover:bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200 transition-colors shadow-2xs cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Tambah Diktum</span>
                        </button>
                      </div>

                      <div className="space-y-2">
                        {skDiktumList.map((diktum, idx) => (
                          <div key={diktum.id} className="flex gap-2 items-start bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                            <input
                              type="text"
                              value={diktum.label}
                              onChange={(e) => {
                                const updated = [...skDiktumList];
                                updated[idx].label = e.target.value;
                                setSkDiktumList(updated);
                              }}
                              onBlur={() => {
                                const updated = [...skDiktumList];
                                updated[idx].label = formatDiktumLabel(updated[idx].label, idx);
                                setSkDiktumList(updated);
                              }}
                              placeholder="Keenam"
                              className="w-28 text-xs font-bold border border-slate-300 rounded px-2 py-1.5 focus:ring-1 focus:ring-emerald-500 focus:outline-none bg-slate-50"
                              title="Penamaan Diktum (Contoh: Keenam)"
                            />
                            <textarea
                              rows={2}
                              value={diktum.isi}
                              onChange={(e) => {
                                const updated = [...skDiktumList];
                                updated[idx].isi = e.target.value;
                                setSkDiktumList(updated);
                              }}
                              className="flex-1 text-xs border border-slate-300 rounded px-2 py-1.5 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                              placeholder="Isi ketetapan diktum..."
                            />
                            {skDiktumList.length > 1 && (
                              <button
                                type="button"
                                onClick={() => setSkDiktumList(skDiktumList.filter((_, i) => i !== idx))}
                                className="text-slate-400 hover:text-rose-600 p-1 transition-colors cursor-pointer"
                                title="Hapus Diktum"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* 5. SURAT TUGAS (SPT) */}
                {jenisSurat === 'surat_tugas' && (
                  <div className="space-y-3">
                    <h3 className="font-bold text-slate-900 text-xs uppercase flex items-center gap-1.5 text-emerald-800">
                      <Send className="w-4 h-4" />
                      Detail Surat Perintah Tugas (SPT)
                    </h3>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Dasar Surat / Instruksi Tugas</label>
                      <input
                        type="text"
                        placeholder="Contoh: Surat Undangan dari Dinas Dikpora Kab. Jembrana No: ..."
                        value={sptDasar}
                        onChange={(e) => setSptDasar(e.target.value)}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Untuk Keperluan / Menghadiri</label>
                      <input
                        type="text"
                        placeholder="Contoh: Mengikuti Bimbingan Teknis Kurikulum Merdeka Jenjang SD"
                        value={sptKeperluan}
                        onChange={(e) => setSptKeperluan(e.target.value)}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Tempat Pelaksanaan Tugas</label>
                        <input
                          type="text"
                          placeholder="Contoh: Aula Dinas Dikpora Jembrana"
                          value={sptTempat}
                          onChange={(e) => setSptTempat(e.target.value)}
                          className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Waktu Pelaksanaan</label>
                        <input
                          type="text"
                          placeholder="Contoh: 08.30 WITA s.d. Selesai"
                          value={sptWaktu}
                          onChange={(e) => setSptWaktu(e.target.value)}
                          className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Tanggal Mulai Tugas</label>
                        <input
                          type="date"
                          value={sptTglMulai}
                          onChange={(e) => setSptTglMulai(e.target.value)}
                          className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Tanggal Selesai Tugas</label>
                        <input
                          type="date"
                          value={sptTglSelesai}
                          onChange={(e) => setSptTglSelesai(e.target.value)}
                          className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Pegawai yang ditugaskan */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="font-semibold text-slate-700">Daftar Guru yang Ditugaskan:</label>
                        <button
                          type="button"
                          onClick={() => {
                            if (guruList.length > 0) {
                              setSptPegawai([...sptPegawai, { nama: guruList[0].nama, nip: guruList[0].nip, pangkatGol: guruList[0].pangkatGol, jabatan: guruList[0].jabatan }]);
                            }
                          }}
                          className="text-xs text-emerald-700 hover:text-emerald-900 font-bold"
                        >
                          + Tambah Guru
                        </button>
                      </div>

                      <div className="space-y-2">
                        {sptPegawai.map((p, idx) => (
                          <div key={idx} className="flex items-center gap-2 bg-white p-2 rounded-lg border border-slate-200">
                            <select
                              value={guruList.find((g) => g.nama === p.nama)?.id || ''}
                              onChange={(e) => {
                                const selected = guruList.find((g) => g.id === e.target.value);
                                if (selected) {
                                  const updated = [...sptPegawai];
                                  updated[idx] = {
                                    nama: selected.nama,
                                    nip: selected.nip,
                                    pangkatGol: selected.pangkatGol,
                                    jabatan: selected.jabatan,
                                  };
                                  setSptPegawai(updated);
                                }
                              }}
                              className="flex-1 text-xs border border-slate-300 rounded px-2 py-1.5 focus:outline-none"
                            >
                              {guruList.map((g) => (
                                <option key={g.id} value={g.id}>
                                  {g.nama} - {g.jabatan}
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              onClick={() => {
                                setSptPegawai(sptPegawai.filter((_, i) => i !== idx));
                              }}
                              className="text-rose-500 hover:text-rose-700 p-1"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2 -mx-5 -mb-5 sm:-mx-6 sm:-mb-6 rounded-b-2xl">
                <button
                  type="button"
                  onClick={() => setShowFormModal(false)}
                  className="px-4 py-2 font-medium text-slate-600 hover:text-slate-800 rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-semibold bg-emerald-800 hover:bg-emerald-700 text-white rounded-xl shadow-sm transition-colors"
                >
                  {editingId ? 'Simpan Perubahan' : 'Buat Surat Keluar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL FORM: ARSIP SURAT KELUAR */}
      {showArsipModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col">
            <div className="bg-indigo-950 px-6 py-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Archive className="w-5 h-5 text-indigo-300" />
                <h2 className="text-base font-bold">
                  {editingArsipId ? 'Edit Arsip Surat Keluar' : 'Arsipkan Surat Keluar'}
                </h2>
              </div>
              <button
                onClick={() => setShowArsipModal(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveArsip} className="p-5 space-y-3.5 text-xs sm:text-sm">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-semibold text-slate-700">Nomor Surat *</label>
                  <button
                    type="button"
                    onClick={() => {
                      const nextSeq = getNextNomorUrut(suratKeluarList, arsipList);
                      const dateObj = arsipTglSurat ? new Date(arsipTglSurat) : new Date();
                      const autoNo = generateNomorSurat(
                        arsipKode || '421.2',
                        nextSeq,
                        sekolah.kodeSuratSekolah || 'SDN1PKT',
                        dateObj
                      );
                      setArsipNoSurat(autoNo);
                    }}
                    className="text-[11px] text-indigo-700 hover:text-indigo-900 font-bold flex items-center gap-1 bg-indigo-50 hover:bg-indigo-100 px-2 py-0.5 rounded border border-indigo-200 transition-colors cursor-pointer"
                    title="Buat nomor surat otomatis berdasarkan nomor urut berikutnya"
                  >
                    <Sparkles className="w-3 h-3 text-indigo-600" />
                    <span>No. Urut Otomatis (#{formatNomorUrut(getNextNomorUrut(suratKeluarList, arsipList))})</span>
                  </button>
                </div>
                <input
                  type="text"
                  required
                  placeholder="Contoh: 421.2/044/SDN1PKT/IX/2026 atau 044..."
                  value={arsipNoSurat}
                  onChange={(e) => setArsipNoSurat(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 font-mono font-bold focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                />

                {/* Indikator Koneksi Nomor Urut */}
                {(() => {
                  const detectedSeq = extractNomorUrut(arsipNoSurat);
                  const highestSeq = getHighestNomorUrut(suratKeluarList, arsipList);
                  return (
                    <div className="mt-1.5 p-2 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-600 space-y-1">
                      <div className="flex items-center justify-between font-medium">
                        <span className="text-slate-500">Koneksi Sistem Urut:</span>
                        {detectedSeq !== null ? (
                          <span className="text-indigo-700 font-bold bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200 font-mono">
                            Urut Terdeteksi: #{formatNomorUrut(detectedSeq)}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Ketik nomor atau gunakan tombol otomatis</span>
                        )}
                      </div>
                      {detectedSeq !== null && detectedSeq > highestSeq && (
                        <p className="text-emerald-700 font-medium leading-relaxed">
                          ✓ Nomor ini akan menjadi acuan urut tertinggi (#{formatNomorUrut(detectedSeq)}). Surat berikutnya yang dibuat dari aplikasi otomatis berlanjut ke <strong>#{formatNomorUrut(detectedSeq + 1)}</strong> sehingga penomoran tidak akan tumpang tindih.
                        </p>
                      )}
                      {detectedSeq !== null && detectedSeq <= highestSeq && (
                        <p className="text-amber-700 leading-relaxed">
                          ℹ️ Nomor urut #{formatNomorUrut(detectedSeq)} ada dalam rentang arsip (nomor tertinggi saat ini: #{formatNomorUrut(highestSeq)}).
                        </p>
                      )}
                    </div>
                  );
                })()}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Kode Klasifikasi</label>
                  <input
                    type="text"
                    value={arsipKode}
                    onChange={(e) => setArsipKode(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 font-mono focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Kategori Arsip</label>
                  <input
                    type="text"
                    value={arsipKategori}
                    onChange={(e) => setArsipKategori(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Perihal *</label>
                <textarea
                  rows={2}
                  required
                  value={arsipPerihal}
                  onChange={(e) => setArsipPerihal(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tujuan Surat</label>
                <input
                  type="text"
                  value={arsipTujuan}
                  onChange={(e) => setArsipTujuan(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tgl Surat</label>
                  <input
                    type="date"
                    value={arsipTglSurat}
                    onChange={(e) => setArsipTglSurat(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tgl Pengarsipan</label>
                  <input
                    type="date"
                    value={arsipTglArsip}
                    onChange={(e) => setArsipTglArsip(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Lokasi Fisik Arsip (Lemari / Rak / Box Ordner) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Ordner 2026 - Lemari A Rak 1"
                  value={arsipLokasi}
                  onChange={(e) => setArsipLokasi(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 font-semibold text-indigo-950 focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Catatan Tambahan</label>
                <input
                  type="text"
                  placeholder="Keterangan kelengkapan berkas fisik..."
                  value={arsipKeterangan}
                  onChange={(e) => setArsipKeterangan(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                />
              </div>

              {/* Upload Dokumen Arsip Surat Keluar (Opsional) */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                    <Paperclip className="w-4 h-4 text-indigo-900" />
                    <span>Upload Berkas / Scan Surat Keluar</span>
                  </label>
                  <span className="text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200 px-2 py-0.5 rounded-md">
                    Opsional
                  </span>
                </div>

                {arsipLampiranUrl || arsipLampiranNama ? (
                  <div className="flex items-center justify-between p-3 bg-white border border-indigo-200 rounded-xl shadow-2xs">
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-900 flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="overflow-hidden">
                        <p className="text-xs font-bold text-slate-800 truncate max-w-[200px] sm:max-w-xs" title={arsipLampiranNama}>
                          {arsipLampiranNama}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {arsipLampiranUkuran || 'Berkas Terlampir'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => openOrDownloadDocument(arsipLampiranNama || 'Dokumen_Arsip', arsipLampiranUrl)}
                        className="px-2.5 py-1 text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-900 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                        title="Buka / Unduh Dokumen"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Lihat</span>
                      </button>
                      <label className="px-2.5 py-1 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors cursor-pointer flex items-center gap-1">
                        <Upload className="w-3.5 h-3.5" />
                        <span>Ganti</span>
                        <input
                          type="file"
                          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            try {
                              setIsUploadingArsipDoc(true);
                              const res = await readFileAsDataUrl(file);
                              setArsipLampiranNama(res.name);
                              setArsipLampiranUrl(res.url);
                              setArsipLampiranUkuran(res.size);
                              setArsipLampiranTipe(res.type);
                            } catch (err: any) {
                              alert(err.message || 'Gagal membaca file');
                            } finally {
                              setIsUploadingArsipDoc(false);
                            }
                          }}
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setArsipLampiranNama('');
                          setArsipLampiranUrl('');
                          setArsipLampiranUkuran('');
                          setArsipLampiranTipe('');
                        }}
                        className="p-1 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Hapus Lampiran"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 hover:border-indigo-400 hover:bg-indigo-50/40 rounded-xl p-3.5 cursor-pointer transition-colors bg-white">
                    <Upload className="w-5 h-5 text-slate-400 mb-1" />
                    <span className="text-xs font-semibold text-indigo-950">
                      {isUploadingArsipDoc ? 'Memproses berkas...' : 'Pilih atau Tarik Berkas Dokumen'}
                    </span>
                    <span className="text-[11px] text-slate-500 mt-0.5">
                      PDF, Word (.doc/docx), atau Gambar / Foto (Opsional)
                    </span>
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        try {
                          setIsUploadingArsipDoc(true);
                          const res = await readFileAsDataUrl(file);
                          setArsipLampiranNama(res.name);
                          setArsipLampiranUrl(res.url);
                          setArsipLampiranUkuran(res.size);
                          setArsipLampiranTipe(res.type);
                        } catch (err: any) {
                          alert(err.message || 'Gagal membaca file');
                        } finally {
                          setIsUploadingArsipDoc(false);
                        }
                      }}
                    />
                  </label>
                )}
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowArsipModal(false)}
                  className="px-4 py-2 font-medium text-slate-600 hover:text-slate-800 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-semibold bg-indigo-800 hover:bg-indigo-700 text-white rounded-xl shadow-sm"
                >
                  {editingArsipId ? 'Simpan Perubahan' : 'Simpan Arsip'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL KONFIRMASI HAPUS (KUSTOM TANPA WINDOW.CONFIRM) */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6">
              <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mb-4">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">
                Konfirmasi Hapus {deleteConfirm.type === 'surat' ? 'Surat Keluar' : 'Arsip'}
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Apakah Anda yakin ingin menghapus data{' '}
                <span className="font-semibold text-slate-800">"{deleteConfirm.noSurat}"</span>? Tindakan ini
                akan menghapus data secara permanen dari database Firebase.
              </p>
            </div>
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200/70 rounded-xl transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={async () => {
                  const target = deleteConfirm;
                  setDeleteConfirm(null);
                  if (target.type === 'surat') {
                    await onDeleteSuratKeluar(target.id);
                  } else {
                    await onDeleteArsip(target.id);
                  }
                }}
                className="px-4 py-2 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition-colors"
              >
                Ya, Hapus Data
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
