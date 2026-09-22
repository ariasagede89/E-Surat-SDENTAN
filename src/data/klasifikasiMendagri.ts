import { KlasifikasiMendagriItem } from '../types';

/**
 * Kode Klasifikasi Arsip resmi berdasarkan:
 * PERATURAN MENTERI DALAM NEGERI REPUBLIK INDONESIA NOMOR 83 TAHUN 2022
 * TENTANG KODE KLASIFIKASI ARSIP DI LINGKUNGAN KEMENTERIAN DALAM NEGERI DAN PEMERINTAH DAERAH
 * Mengacu Penuh pada Lampiran Resmi:
 * 1. 400.3.5: Pendidikan Dasar dan Menengah Pertama (Operasional Umum SD, Rapat Dinas & Kerja Sama) (400.3.5.1 s.d 400.3.5.6)
 * 2. 400.3.10: Pendidik dan Tenaga Pendidik (400.3.10.1 s.d 400.3.10.8)
 * 3. 400.3.11: Penilaian Pendidikan (400.3.11.1 s.d 400.3.11.3)
 * 4. 400.3.12: Data dan Statistik Pendidikan (400.3.12.1 s.d 400.3.12.2)
 * 5. 400.3.13: Prasarana dan Sarana Pendidikan (400.3.13.1 s.d 400.3.13.3)
 * 6. 800.1.11.1: Surat Perintah Dinas/Surat Tugas
 */
export const KLASIFIKASI_MENDAGRI_83_2022: KlasifikasiMendagriItem[] = [
  // --- BIDANG PENDIDIKAN (400.3) SESUAI LAMPIRAN RESMI ---

  // 400.3.5 Pendidikan Dasar dan Menengah Pertama (Operasional Umum, Rapat Dinas, Kerja Sama)
  {
    kode: '400.3.5',
    kategori: 'Pendidikan Dasar',
    uraian: 'Pendidikan Dasar dan Menengah Pertama (Operasional Umum)',
    subUraian: 'Penyelenggaraan operasional umum SD, rapat dinas sekolah/dewan guru, kerja sama/kemitraan, dan administrasi umum',
  },
  {
    kode: '400.3.5.1',
    kategori: 'Pendidikan Dasar',
    uraian: 'Kurikulum, bahan ajar',
    subUraian: 'Kurikulum Merdeka/KOSP, modul ajar, bahan ajar, jadwal pelajaran, kalender pendidikan',
  },
  {
    kode: '400.3.5.2',
    kategori: 'Pendidikan Dasar',
    uraian: 'Block Grant',
    subUraian: 'Bantuan hibah / block grant operasional atau penguatan pembelajaran pendidikan dasar',
  },
  {
    kode: '400.3.5.3',
    kategori: 'Pendidikan Dasar',
    uraian: 'Pelatihan, Bimtek, sosialisasi,',
    subUraian: 'Pelatihan, bimbingan teknis (bimtek), sosialisasi kurikulum, dan workshop pembelajaran',
  },
  {
    kode: '400.3.5.4',
    kategori: 'Pendidikan Dasar',
    uraian: 'Lomba, penghargaan, penganugerahan',
    subUraian: 'OSN, O2SN, FLS2N, FTBI, porsenijar, kepramukaan, piagam apresiasi prestasi siswa/sekolah',
  },
  {
    kode: '400.3.5.5',
    kategori: 'Pendidikan Dasar',
    uraian: 'Bantuan operasional sekolah (BOS)',
    subUraian: 'Bantuan Operasional Satuan Pendidikan (BOSP/BOS), pelaporan ARKAS, pertanggungjawaban anggaran',
  },
  {
    kode: '400.3.5.6',
    kategori: 'Pendidikan Dasar',
    uraian: 'Bantuan Siswa Miskin',
    subUraian: 'Program Indonesia Pintar (PIP), rekomendasi PIP, verifikasi data penerima bantuan, KIP',
  },

  // 400.3.10 Pendidik dan Tenaga Pendidik
  {
    kode: '400.3.10',
    kategori: 'Pendidikan Dasar',
    uraian: 'Pendidik dan Tenaga Pendidik',
    subUraian: 'SK Pembagian Tugas Mengajar Guru, SK Tim Pengembang Kurikulum/BOS, penugasan PTK',
  },
  {
    kode: '400.3.10.1',
    kategori: 'Pendidikan Dasar',
    uraian: 'Pendataan dan Pemetaan',
    subUraian: 'Data Dapodik GTK, info GTK, rekapitulasi pemetaan pendidik dan tenaga kependidikan',
  },
  {
    kode: '400.3.10.2',
    kategori: 'Pendidikan Dasar',
    uraian: 'Uji Kompetensi Guru',
    subUraian: 'Pelaksanaan UKG, asesmen kompetensi guru, pemetaan kompetensi profesionalisme pendidik',
  },
  {
    kode: '400.3.10.3',
    kategori: 'Pendidikan Dasar',
    uraian: 'Setifikasi Guru',
    subUraian: 'Sertifikasi guru/pendidik, Pendidikan Profesi Guru (PPG), pencairan tunjangan profesi guru (TPG)',
  },
  {
    kode: '400.3.10.4',
    kategori: 'Pendidikan Dasar',
    uraian: 'Penilaian prestasi kerja guru dan pengawas sekolah',
    subUraian: 'Penilaian Kinerja Guru (PKG), Pengelolaan Kinerja PMM, SKP BKN, supervisi pengawas sekolah',
  },
  {
    kode: '400.3.10.5',
    kategori: 'Pendidikan Dasar',
    uraian: 'Penghargaan guru dan tenaga kependidikan',
    subUraian: 'Apresiasi guru berprestasi, guru penggerak, penghargaan dedikasi pendidik & tenaga kependidikan',
  },
  {
    kode: '400.3.10.6',
    kategori: 'Pendidikan Dasar',
    uraian: 'Peningkatan kesejahteraan guru dan tenaga pendidik',
    subUraian: 'Tunjangan khusus, insentif GTT/PTT, program peningkatan kesejahteraan guru dan tenaga kependidikan',
  },
  {
    kode: '400.3.10.7',
    kategori: 'Pendidikan Dasar',
    uraian: 'Block grant',
    subUraian: 'Bantuan hibah / block grant untuk kegiatan kelompok kerja guru (KKG/MGMP) dan PTK',
  },
  {
    kode: '400.3.10.8',
    kategori: 'Pendidikan Dasar',
    uraian: 'Bimbingan teknis/sosialisasi',
    subUraian: 'Bimbingan teknis (bimtek) dan sosialisasi peningkatan kompetensi PTK',
  },

  // 400.3.11 Penilaian Pendidikan
  {
    kode: '400.3.11',
    kategori: 'Pendidikan Dasar',
    uraian: 'Penilaian Pendidikan',
    subUraian: 'Asesmen Nasional (ANBK), evaluasi hasil belajar, kelulusan, dan Surat Keterangan Lulus (SKL)',
  },
  {
    kode: '400.3.11.1',
    kategori: 'Pendidikan Dasar',
    uraian: 'Penilaian Akademik',
    subUraian: 'Asesmen sumatif/formatif, ujian sekolah, nilai rapor siswa, kriteria ketuntasan tujuan pembelajaran',
  },
  {
    kode: '400.3.11.2',
    kategori: 'Pendidikan Dasar',
    uraian: 'Penilaian Non Akademik',
    subUraian: 'Penilaian projek penguatan profil pelajar Pancasila (P5), ekstrakurikuler, dan karakter siswa',
  },
  {
    kode: '400.3.11.3',
    kategori: 'Pendidikan Dasar',
    uraian: 'Analisis dan Sistem Informasi Penilaian',
    subUraian: 'Pengolahan hasil asesmen, aplikasi e-Rapor, sistem informasi penilaian sekolah',
  },

  // 400.3.12 Data dan Statistik Pendidikan
  {
    kode: '400.3.12',
    kategori: 'Pendidikan Dasar',
    uraian: 'Data dan Statistik Pendidikan',
    subUraian: 'Pengelolaan data pokok pendidikan (Dapodik), profil sekolah, rekapitulasi statistik pendidikan',
  },
  {
    kode: '400.3.12.1',
    kategori: 'Pendidikan Dasar',
    uraian: 'Data peserta didik, pendidik dan tenaga kependidikan',
    subUraian: 'Surat Keterangan Aktif Sekolah, Surat Keterangan Pindah/Mutasi Siswa, Rekomendasi Siswa/GTK',
  },
  {
    kode: '400.3.12.2',
    kategori: 'Pendidikan Dasar',
    uraian: 'Data Satuan Pendidikan dan Proses Pembelajaran',
    subUraian: 'NPSN, izin operasional satuan pendidikan, akreditasi sekolah (BAN-PDM), data rombel',
  },

  // 400.3.13 Prasarana dan Sarana Pendidikan
  {
    kode: '400.3.13',
    kategori: 'Pendidikan Dasar',
    uraian: 'Prasarana dan Sarana Pendidikan',
    subUraian: 'Gedung sekolah, ruang kelas, perpustakaan, inventaris barang dan aset satuan pendidikan',
  },
  {
    kode: '400.3.13.1',
    kategori: 'Pendidikan Dasar',
    uraian: 'Prasarana Pendidikan',
    subUraian: 'Tanah/lahan, gedung sekolah, ruang kelas, laboratorium komputer, UKS, toilet/sanitasi',
  },
  {
    kode: '400.3.13.2',
    kategori: 'Pendidikan Dasar',
    uraian: 'Sarana Pendidikan',
    subUraian: 'Meja kursi, papan tulis, chromebook, buku pelajaran, alat peraga dan peralatan pembelajaran',
  },
  {
    kode: '400.3.13.3',
    kategori: 'Pendidikan Dasar',
    uraian: 'Monitoring dan Evaluasi',
    subUraian: 'Monitoring dan evaluasi kondisi prasarana dan sarana pendidikan, laporan pemeliharaan aset',
  },

  // --- BIDANG KEPEGAWAIAN (800) SESUAI LAMPIRAN RESMI ---
  {
    kode: '800.1.11.1',
    kategori: 'Kepegawaian',
    uraian: 'Surat Perintah Dinas/Surat Tugas',
    subUraian: 'Surat Perintah Tugas (SPT) kedinasan, menghadiri rapat dinas, diklat, workshop, dan pendampingan lomba',
  },
  {
    kode: '800.1.11.5',
    kategori: 'Kepegawaian',
    uraian: 'Cuti Alasan Penting / Permohonan Izin Tidak Masuk Sekolah',
    subUraian: 'Permohonan izin tidak masuk mengajar karena keperluan keluarga/keagamaan/upacara adat',
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
    subUraian: 'Permohonan dan persetujuan cuti melahirkan guru / tenaga kependidikan',
  },
  {
    kode: '800.1.11.4',
    kategori: 'Kepegawaian',
    uraian: 'Cuti Tahunan Pegawai',
    subUraian: 'Permohonan hak cuti tahunan pegawai',
  },
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
    subUraian: 'Usulan mutasi pendidik, kenaikan jenjang jabatan fungsional guru',
  },
  {
    kode: '800.1.4',
    kategori: 'Kepegawaian',
    uraian: 'Pengembangan Karir Pegawai',
    subUraian: 'Usulan tugas belajar, izin belajar, diklat fungsional guru',
  },
  {
    kode: '800.1.6',
    kategori: 'Kepegawaian',
    uraian: 'Disiplin Pegawai, Kode Etik, dan Pensiun',
    subUraian: 'Pembinaan disiplin, absensi kehadiran guru, usulan pensiun BUP',
  },
  {
    kode: '800.1.11.13',
    kategori: 'Kepegawaian',
    uraian: 'Kenaikan Gaji Berkala (KGB) Guru dan Pegawai',
    subUraian: 'Surat pengantar dan penetapan kenaikan gaji berkala (KGB) 2 tahunan',
  },
  {
    kode: '800.1.13',
    kategori: 'Kepegawaian',
    uraian: 'Administrasi Perseorangan Pegawai (PNS / PPPK)',
    subUraian: 'Surat Pernyataan Melaksanakan Tugas (SPMT), berkas pengangkatan, SK penempatan',
  },
];

/**
 * Cari item klasifikasi berdasarkan kode atau kata kunci
 */
export function cariKlasifikasi(
  keyword: string,
  kategori?: 'Pendidikan Dasar' | 'Kepegawaian' | 'Semua'
): KlasifikasiMendagriItem[] {
  let list = KLASIFIKASI_MENDAGRI_83_2022;

  if (kategori && kategori !== 'Semua') {
    list = list.filter((item) => item.kategori === kategori);
  }

  const q = keyword.trim().toLowerCase();
  if (!q) return list;

  return list.filter(
    (item) =>
      item.kode.toLowerCase().includes(q) ||
      item.uraian.toLowerCase().includes(q) ||
      item.kategori.toLowerCase().includes(q) ||
      (item.subUraian && item.subUraian.toLowerCase().includes(q))
  );
}

/**
 * Mengambil kode klasifikasi default untuk jenis surat tertentu berdasarkan Permendagri 83/2022
 * Mengacu Penuh pada Lampiran Resmi:
 * - Surat Tugas: 800.1.11.1 (Surat Perintah Dinas/Surat Tugas)
 * - Surat Keterangan Siswa/PTK: 400.3.12.1 (Data peserta didik, pendidik dan tenaga kependidikan)
 * - Surat Keputusan (SK Pembagian Tugas Guru/PTK): 400.3.10 (Pendidik dan Tenaga Pendidik)
 * - Surat Pengantar: 400.3.5 (Pendidikan Dasar dan Menengah Pertama - Operasional Umum)
 * - Surat Rekomendasi Siswa/PTK: 400.3.12.1 (Data peserta didik, pendidik dan tenaga kependidikan)
 * - Surat Undangan / Rapat Dinas: 400.3.5 (Pendidikan Dasar dan Menengah Pertama - Operasional Umum & Rapat Dinas)
 * - Surat Izin/Cuti Guru: 800.1.11.5 (Cuti Alasan Penting / Permohonan Izin Tidak Masuk Sekolah)
 * - Surat Edaran Kurikulum: 400.3.5.1 (Kurikulum, bahan ajar)
 */
export function getKodeDefaultByJenis(jenis: string): { kode: string; nama: string } {
  switch (jenis) {
    case 'surat_tugas':
      return {
        kode: '800.1.11.1',
        nama: 'Surat Perintah Dinas/Surat Tugas',
      };
    case 'surat_keterangan':
      return {
        kode: '400.3.12.1',
        nama: 'Data peserta didik, pendidik dan tenaga kependidikan',
      };
    case 'surat_keputusan':
      return {
        kode: '400.3.10',
        nama: 'Pendidik dan Tenaga Pendidik',
      };
    case 'surat_pengantar':
      return {
        kode: '400.3.5',
        nama: 'Pendidikan Dasar dan Menengah Pertama (Operasional Umum)',
      };
    case 'surat_rekomendasi':
      return {
        kode: '400.3.12.1',
        nama: 'Data peserta didik, pendidik dan tenaga kependidikan',
      };
    case 'surat_undangan':
      return {
        kode: '400.3.5',
        nama: 'Pendidikan Dasar dan Menengah Pertama (Operasional Umum & Rapat Dinas)',
      };
    case 'surat_ijin_guru':
      return {
        kode: '800.1.11.5',
        nama: 'Cuti Alasan Penting / Permohonan Izin Tidak Masuk Sekolah',
      };
    case 'surat_edaran':
      return {
        kode: '400.3.5.1',
        nama: 'Kurikulum, bahan ajar',
      };
    default:
      return {
        kode: '400.3.5',
        nama: 'Pendidikan Dasar dan Menengah Pertama (Operasional Umum)',
      };
  }
}
