import { KlasifikasiMendagriItem } from '../types';

/**
 * Kode Klasifikasi Arsip resmi berdasarkan:
 * PERATURAN MENTERI DALAM NEGERI REPUBLIK INDONESIA NOMOR 83 TAHUN 2022
 * TENTANG KODE KLASIFIKASI ARSIP DI LINGKUNGAN KEMENTERIAN DALAM NEGERI DAN PEMERINTAH DAERAH
 * Khusus: Bidang Pendidikan Dasar (SD) dan Bidang Kepegawaian
 */
export const KLASIFIKASI_MENDAGRI_83_2022: KlasifikasiMendagriItem[] = [
  // --- BIDANG UMUM / TATA USAHA / RAPAT DINAS (000) ---
  {
    kode: '000.1.5',
    kategori: 'Tata Usaha & Pertemuan',
    uraian: 'Rapat Dinas / Rapat Kerja / Pertemuan Kedinasan',
    subUraian: 'Undangan rapat guru, rapat dinas sekolah, rapat koordinasi, notula/risalah rapat dinas',
  },
  {
    kode: '000.1.10',
    kategori: 'Tata Usaha & Pertemuan',
    uraian: 'Kerja Sama / Kemitraan Satuan Pendidikan',
    subUraian: 'Kerja sama dengan komite sekolah, paguyuban orang tua, puskesmas, instansi terkait',
  },

  // --- BIDANG PENDIDIKAN (400.3) ---
  {
    kode: '400.3.1',
    kategori: 'Pendidikan Dasar',
    uraian: 'Kebijakan Pendidikan Pemerintah Daerah',
    subUraian: 'Surat edaran dinas, instruksi kepala daerah/dinas terkait penyelenggaraan pendidikan',
  },
  {
    kode: '400.3.5',
    kategori: 'Pendidikan Dasar',
    uraian: 'Pendidikan Dasar dan Menengah Pertama (Sekolah Dasar)',
    subUraian: 'Penyelenggaraan dan tata kelola umum operasional Sekolah Dasar (SD)',
  },
  {
    kode: '400.3.5.1',
    kategori: 'Pendidikan Dasar',
    uraian: 'Kurikulum dan Bahan Ajar Sekolah Dasar',
    subUraian: 'Kurikulum Merdeka/KOSP, silabus, modul ajar, jadwal pelajaran, kalender pendidikan',
  },
  {
    kode: '400.3.5.2',
    kategori: 'Pendidikan Dasar',
    uraian: 'Bantuan Hibah / Block Grant Pendidikan',
    subUraian: 'Bantuan operasional atau hibah khusus sekolah',
  },
  {
    kode: '400.3.5.3',
    kategori: 'Pendidikan Dasar',
    uraian: 'Pelatihan, Bimtek, dan Sosialisasi Pendidikan Dasar',
    subUraian: 'Workshop guru, sosialisasi kurikulum, pengimbasan materi ajar',
  },
  {
    kode: '400.3.5.4',
    kategori: 'Pendidikan Dasar',
    uraian: 'Lomba, Penghargaan, dan Penganugerahan Siswa/Sekolah',
    subUraian: 'OSN, O2SN, FLS2N, FTBI, Porsenijar, kepramukaan, dan apresiasi prestasi sekolah',
  },
  {
    kode: '400.3.5.5',
    kategori: 'Pendidikan Dasar',
    uraian: 'Bantuan Operasional Satuan Pendidikan (BOS/BOSP)',
    subUraian: 'Pengelolaan dana BOSP, ARKAS, pertanggungjawaban anggaran operasional sekolah',
  },
  {
    kode: '400.3.5.6',
    kategori: 'Pendidikan Dasar',
    uraian: 'Bantuan Siswa Miskin / Program Indonesia Pintar (PIP)',
    subUraian: 'Surat rekomendasi PIP, verifikasi data siswa penerima bantuan, KIP',
  },
  {
    kode: '400.3.7',
    kategori: 'Pendidikan Dasar',
    uraian: 'Pembinaan Pendidik dan Tenaga Kependidikan',
    subUraian: 'Pembinaan mutu guru, pembagian tugas mengajar, supervisi pengawas',
  },
  {
    kode: '400.3.7.2',
    kategori: 'Pendidikan Dasar',
    uraian: 'Uji Kompetensi Guru (UKG) / Asesmen Kompetensi Guru',
    subUraian: 'Pelaksanaan UKG, pemetaan kompetensi pendidik',
  },
  {
    kode: '400.3.7.3',
    kategori: 'Pendidikan Dasar',
    uraian: 'Sertifikasi Pendidik / PPG',
    subUraian: 'Pendidikan Profesi Guru (PPG), pencairan tunjangan profesi guru (TPG)',
  },
  {
    kode: '400.3.7.4',
    kategori: 'Pendidikan Dasar',
    uraian: 'Penghargaan dan Apresiasi Guru Berprestasi',
    subUraian: 'Piagam penghargaan, guru teladan, inovasi pembelajaran',
  },
  {
    kode: '400.3.7.5',
    kategori: 'Pendidikan Dasar',
    uraian: 'Peningkatan Kesejahteraan Pendidik dan Tenaga Kependidikan',
    subUraian: 'Tunjangan khusus, insentif GTT/PTT, kesejahteraan guru',
  },
  {
    kode: '400.3.10',
    kategori: 'Pendidikan Dasar',
    uraian: 'Pendidik dan Tenaga Kependidikan (PTK) Sekolah Dasar',
    subUraian: 'SK Pembagian Tugas Mengajar, SK Tim Pengembang Kurikulum/BOS, penugasan PTK',
  },
  {
    kode: '400.3.10.1',
    kategori: 'Pendidikan Dasar',
    uraian: 'Pendataan dan Pemetaan Pendidik / Tenaga Kependidikan',
    subUraian: 'Data Dapodik GTK, info GTK, rekapitulasi data PTK sekolah',
  },
  {
    kode: '400.3.10.4',
    kategori: 'Pendidikan Dasar',
    uraian: 'Penilaian Prestasi Kerja Guru / SKP Pendidik',
    subUraian: 'Penilaian Kinerja Guru (PKG), Pengelolaan Kinerja PMM, E-Kinerja BKN',
  },
  {
    kode: '400.3.11',
    kategori: 'Pendidikan Dasar',
    uraian: 'Penilaian Pendidikan dan Kelulusan Siswa',
    subUraian: 'Pelaksanaan Asesmen Nasional (ANBK), Asesmen Sumatif, kelulusan, dan Surat Keterangan Lulus (SKL)',
  },
  {
    kode: '400.3.12',
    kategori: 'Pendidikan Dasar',
    uraian: 'Data dan Statistik Pendidikan',
    subUraian: 'Pengelolaan data pokok pendidikan, profil sekolah, pelaporan berkala',
  },
  {
    kode: '400.3.12.1',
    kategori: 'Pendidikan Dasar',
    uraian: 'Data Peserta Didik (Surat Keterangan Aktif / Pindah Siswa)',
    subUraian: 'Surat Keterangan Aktif Sekolah, Surat Keterangan Pindah/Mutasi Siswa, Surat Kelakuan Baik',
  },
  {
    kode: '400.3.12.2',
    kategori: 'Pendidikan Dasar',
    uraian: 'Data Satuan Pendidikan dan Akreditasi Sekolah',
    subUraian: 'Izin operasional, sertifikat akreditasi BAN-PDM, profil satuan pendidikan',
  },
  {
    kode: '400.3.13',
    kategori: 'Pendidikan Dasar',
    uraian: 'Prasarana dan Sarana Pendidikan',
    subUraian: 'Gedung sekolah, ruang kelas, perpustakaan, inventaris barang/aset sekolah',
  },

  // --- BIDANG KEPEGAWAIAN (800.1 & 800.2) ---
  {
    kode: '800.1.1',
    kategori: 'Kepegawaian',
    uraian: 'Formasi, Analisis Beban Kerja, dan Pengadaan Pegawai',
    subUraian: 'Usulan formasi guru ASN/PPPK, analisis kebutuhan tenaga pendidik',
  },
  {
    kode: '800.1.3',
    kategori: 'Kepegawaian',
    uraian: 'Mutasi Pegawai dan Kenaikan Pangkat Guru/PTK',
    subUraian: 'Usulan mutasi pendidik, perpindahan tugas guru, nota persetujuan mutasi',
  },
  {
    kode: '800.1.3.2',
    kategori: 'Kepegawaian',
    uraian: 'Kenaikan Pangkat / Golongan Ruang Pegawai',
    subUraian: 'Berkas usulan kenaikan pangkat PNS, kenaikan jenjang jabatan fungsional guru',
  },
  {
    kode: '800.1.4',
    kategori: 'Kepegawaian',
    uraian: 'Pengembangan Karir Pegawai',
    subUraian: 'Usulan tugas belajar, izin belajar, diklat fungsional, bimbingan teknis guru',
  },
  {
    kode: '800.1.4.5',
    kategori: 'Kepegawaian',
    uraian: 'Penetapan Angka Kredit (PAK) Jabatan Fungsional Guru',
    subUraian: 'Konversi predikat kinerja ke angka kredit, penetapan PAK guru',
  },
  {
    kode: '800.1.6',
    kategori: 'Kepegawaian',
    uraian: 'Disiplin Pegawai, Kode Etik, dan Pensiun',
    subUraian: 'Pembinaan disiplin, absensi kehadiran guru, usulan pensiun BUP/Janda/Duda',
  },
  {
    kode: '800.1.11',
    kategori: 'Kepegawaian',
    uraian: 'Administrasi Kepegawaian',
    subUraian: 'Surat dinas kepegawaian, surat keterangan guru/PTK, surat tugas kedinasan',
  },
  {
    kode: '800.1.11.1',
    kategori: 'Kepegawaian',
    uraian: 'Surat Perintah Tugas (SPT) / Surat Tugas Kedinasan',
    subUraian: 'Surat perintah tugas pelatihan, mengikuti rapat dinas, kepengawasan, dan pendampingan lomba',
  },
  {
    kode: '800.1.11.2',
    kategori: 'Kepegawaian',
    uraian: 'Cuti Sakit Pegawai / Guru',
    subUraian: 'Permohonan dan persetujuan cuti sakit dengan lampiran surat keterangan dokter',
  },
  {
    kode: '800.1.11.3',
    kategori: 'Kepegawaian',
    uraian: 'Cuti Melahirkan / Bersalin',
    subUraian: 'Permohonan dan persetujuan cuti melahirkan guru/tenaga kependidikan',
  },
  {
    kode: '800.1.11.4',
    kategori: 'Kepegawaian',
    uraian: 'Cuti Tahunan Pegawai',
    subUraian: 'Permohonan hak cuti tahunan pegawai',
  },
  {
    kode: '800.1.11.5',
    kategori: 'Kepegawaian',
    uraian: 'Cuti Alasan Penting / Permohonan Izin Tidak Masuk Sekolah',
    subUraian: 'Surat permohonan tidak masuk mengajar karena keperluan keluarga/keagamaan/upacara adat',
  },
  {
    kode: '800.1.11.8',
    kategori: 'Kepegawaian',
    uraian: 'Kartu Pegawai (Karpeg), KPE, Karis, Karsu, Taspen',
    subUraian: 'Pemberkasan pengurusan dokumen kartu identitas kepegawaian',
  },
  {
    kode: '800.1.11.11',
    kategori: 'Kepegawaian',
    uraian: 'Surat Keterangan Kesejahteraan Pegawai (KP4)',
    subUraian: 'Surat keterangan penambahan tunjangan keluarga/anak/istri',
  },
  {
    kode: '800.1.11.13',
    kategori: 'Kepegawaian',
    uraian: 'Kenaikan Gaji Berkala (KGB) Guru dan Pegawai',
    subUraian: 'Surat pengantar dan penetapan kenaikan gaji berkala (KGB) 2 tahunan',
  },
  {
    kode: '800.1.12',
    kategori: 'Kepegawaian',
    uraian: 'Kesejahteraan Pegawai dan Layanan Kesehatan',
    subUraian: 'BPJS Kesehatan, BPJS Ketenagakerjaan, bantuan kedukaan',
  },
  {
    kode: '800.1.13',
    kategori: 'Kepegawaian',
    uraian: 'Administrasi Perseorangan Pegawai (PNS / PPPK)',
    subUraian: 'Surat Pernyataan Melaksanakan Tugas (SPMT), berkas pengangkatan, SK penempatan',
  },
  {
    kode: '800.2.4',
    kategori: 'Kepegawaian',
    uraian: 'Penyelenggaraan Pendidikan dan Pelatihan (Diklat) Pegawai',
    subUraian: 'Sertifikat pelatihan, pengembangan keprofesian berkelanjutan (PKB) guru',
  },
];

/**
 * Cari item klasifikasi berdasarkan kode atau kata kunci
 */
export function cariKlasifikasi(keyword: string): KlasifikasiMendagriItem[] {
  const q = keyword.trim().toLowerCase();
  if (!q) return KLASIFIKASI_MENDAGRI_83_2022;
  return KLASIFIKASI_MENDAGRI_83_2022.filter(
    (item) =>
      item.kode.toLowerCase().includes(q) ||
      item.uraian.toLowerCase().includes(q) ||
      item.kategori.toLowerCase().includes(q) ||
      (item.subUraian && item.subUraian.toLowerCase().includes(q))
  );
}

/**
 * Mengambil kode klasifikasi default untuk jenis surat tertentu berdasarkan Permendagri 83/2022
 */
export function getKodeDefaultByJenis(jenis: string): { kode: string; nama: string } {
  switch (jenis) {
    case 'surat_ijin_guru':
      return {
        kode: '800.1.11.5',
        nama: 'Cuti Alasan Penting / Permohonan Izin Tidak Masuk Sekolah',
      };
    case 'surat_tugas':
      return {
        kode: '800.1.11.1',
        nama: 'Surat Perintah Tugas (SPT) / Surat Tugas Kedinasan',
      };
    case 'surat_undangan':
      return {
        kode: '000.1.5',
        nama: 'Rapat Dinas / Rapat Kerja / Pertemuan Kedinasan',
      };
    case 'surat_keputusan':
      return {
        kode: '400.3.10',
        nama: 'Pendidik dan Tenaga Kependidikan (PTK) Sekolah Dasar (SK Pembagian Tugas)',
      };
    case 'surat_keterangan':
      return {
        kode: '400.3.12.1',
        nama: 'Data Peserta Didik (Surat Keterangan Aktif / Pindah Siswa / GTK)',
      };
    case 'surat_pengantar':
      return {
        kode: '400.3.5',
        nama: 'Penyelenggaraan dan Tata Kelola Sekolah Dasar',
      };
    case 'surat_edaran':
      return {
        kode: '400.3.5.1',
        nama: 'Kurikulum, Pembelajaran dan Kalender Pendidikan',
      };
    default:
      return {
        kode: '400.3.5',
        nama: 'Pendidikan Dasar dan Menengah Pertama (Sekolah Dasar)',
      };
  }
}
