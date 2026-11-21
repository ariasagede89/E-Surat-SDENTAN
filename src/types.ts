export type SifatSurat = 'Biasa' | 'Penting' | 'Sangat Penting' | 'Rahasia';
export type StatusSuratMasuk = 'Menunggu Tindak Lanjut' | 'Sedang Diproses' | 'Selesai';
export type JenisSuratKeluar =
  | 'surat_ijin_guru'
  | 'surat_keterangan'
  | 'surat_undangan'
  | 'surat_keputusan'
  | 'surat_tugas'
  | 'surat_pengantar'
  | 'surat_rekomendasi'
  | 'surat_permohonan'
  | 'surat_eksternal';

export type StatusSuratKeluar = 'Konsep' | 'Disetujui' | 'Terkirim' | 'Diarsipkan';

export interface SuratMasuk {
  id: string;
  noAgenda: string;
  noSurat: string;
  tglSurat: string;
  tglTerima: string;
  pengirim: string;
  perihal: string;
  sifat: SifatSurat;
  status: StatusSuratMasuk;
  tglTindakLanjut: string;
  petugasTindakLanjut?: string; // Nama orang/petugas yang menindaklanjuti
  tglSelesaiTindakLanjut?: string; // Tanggal tindak lanjut dilaksanakan
  catatanTindakLanjut?: string; // Keterangan hasil tindak lanjut
  disposisi: string;
  diteruskanKepada: string;
  catatan?: string;
  lampiranNama?: string;
  lampiranUrl?: string;
  lampiranUkuran?: string;
  lampiranTipe?: string;
  createdAt: string;
}

export interface SuratKeluar {
  id: string;
  jenisSurat: JenisSuratKeluar;
  noSurat: string;
  kodeKlasifikasi: string;
  namaKlasifikasi: string;
  tglSurat: string;
  tujuan: string;
  perihal: string;
  isiSurat?: string;
  dataKhusus?: Record<string, any>;
  status: StatusSuratKeluar;
  penandatangan: string;
  nipPenandatangan: string;
  jabatanPenandatangan: string;
  lampiranNama?: string;
  lampiranUrl?: string;
  lampiranUkuran?: string;
  lampiranTipe?: string;
  tempatArsip?: string;
  createdAt: string;
}

export interface ArsipSurat {
  id: string;
  noSurat: string;
  kodeKlasifikasi: string;
  perihal: string;
  tujuan: string;
  tglSurat: string;
  tglArsip: string;
  lokasiFisik: string;
  kategori: string;
  keterangan: string;
  lampiranNama?: string;
  lampiranUrl?: string;
  lampiranUkuran?: string;
  lampiranTipe?: string;
}

export type KategoriPTK = 'kepala_sekolah' | 'guru' | 'tu';

export interface Guru {
  id: string;
  nip: string;
  nuptk?: string;
  nama: string;
  jabatan: string;
  pangkatGol: string;
  status?: 'PNS' | 'PPPK' | 'Honorer' | 'GTT';
  jenisPtk?: KategoriPTK;
  noHp: string;
  email: string;
}

export type PTK = Guru;

export type DefaultKategoriLokerPtk = 'kepegawaian' | 'catatan' | 'pembelajaran';
export type KategoriLokerPtk = string;
export type VisibilitasLokerPtk = 'privat' | 'terbuka';

export interface LokerPtkItem {
  id: string;
  ptkId: string;
  ptkNama: string;
  kategori: KategoriLokerPtk;
  visibilitas?: VisibilitasLokerPtk;
  judul: string;
  tanggal: string; // YYYY-MM-DD
  isiCatatan?: string;
  fileNama?: string;
  fileTipe?: string;
  fileUkuran?: string;
  fileUrl?: string;
  linkEksternal?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LokerPtkAccess {
  id: string; // sanitized ptkId
  ptkId: string;
  ptkNama: string;
  isProtected: boolean;
  passwordHash: string;
  passwordHint?: string;
  defaultVisibilitas?: VisibilitasLokerPtk;
  cardColor?: string;
  customFolders?: string[];
  updatedAt: string;
}

export interface Siswa {
  id: string;
  nisn: string;
  nis: string;
  nama: string;
  kelas: string;
  jenisKelamin: 'L' | 'P';
  tempatLahir: string;
  tglLahir: string;
  namaOrtu: string;
  alamat: string;
}

export type StatusPresensi = 'H' | 'S' | 'I' | 'A';

export interface Ekstrakurikuler {
  id: string;
  nama: string;
  pembina: string;
  hari: string;
  waktu?: string;
  tempat?: string;
  keterangan?: string;
  pesertaIds: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface PresensiSiswaDoc {
  id: string;
  tanggal: string; // YYYY-MM-DD
  kelas: string;
  records: Record<string, StatusPresensi>;
  catatan?: string;
  updatedAt: string;
}

export interface PresensiEkstraDoc {
  id: string;
  ekstraId: string;
  tanggal: string; // YYYY-MM-DD
  materi?: string;
  records: Record<string, StatusPresensi>;
  updatedAt: string;
}

export interface SptSiswaItem {
  id?: string;
  nama: string;
  nisn: string;
  kelas: string;
  sekolah?: string;
  keterangan?: string;
}

export interface PengaturanSekolah {
  namaSekolah: string;
  npsn: string;
  nss: string;
  instansiBaris1: string;
  instansiBaris2: string;
  instansiBaris3: string;
  alamat: string;
  desa: string;
  kecamatan: string;
  kabupaten: string;
  provinsi: string;
  kodePos: string;
  telepon: string;
  email: string;
  website: string;
  kepalaSekolah: string;
  nipKepalaSekolah: string;
  pangkatKepalaSekolah: string;
  kodeSuratSekolah: string;
  logoUrl?: string;
  kopImageUrl?: string;
  capSekolahUrl?: string;
  ttdKepalaSekolahUrl?: string;
}

export interface FirebaseAppConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  firestoreDatabaseId?: string;
}

export type FirebaseConfig = FirebaseAppConfig;

export interface KlasifikasiMendagriItem {
  kode: string;
  kategori: 'Pendidikan Dasar' | 'Kepegawaian' | string;
  uraian: string;
  subUraian?: string;
}

export type PaperSize = 'A4' | 'F4';

export interface SkPointItem {
  id: string;
  poin: string; // e.g. "a.", "b." atau "1.", "2."
  isi: string;
}

export interface SubjekKeteranganItem {
  id: string;
  nama: string;
  nisnNip: string;
  kelasJabatan: string;
  tempatTglLahir?: string;
  namaOrtu?: string;
  alamat?: string;
}

export interface RekomendasiSiswaItem {
  id: string;
  nama: string;
  nisn: string;
  kelas: string;
  tempatTglLahir?: string;
  namaOrtu?: string;
  alamat?: string;
}

export interface RekomendasiPtkItem {
  id: string;
  nama: string;
  nip: string;
  nuptk?: string;
  pangkatGol: string;
  jabatan: string;
  unitKerja?: string;
}

export type UserRole = 'guru' | 'admin';

export interface AdminAuthConfig {
  username: string;
  passwordHash?: string;
  lastLogin?: string;
}

export interface SkTableColumn {
  id: string;
  label: string;
  width?: string;
  align?: 'left' | 'center' | 'right';
  key?: string;
}

export interface SkLampiranRow {
  id: string;
  no?: string | number;
  nama?: string;
  nip?: string;
  pangkatGol?: string;
  jabatan?: string;
  nipOrJabatan?: string;
  tugas?: string;
  keterangan?: string;
  cols?: Record<string, string>;
}

export interface SkUraianItem {
  id: string;
  nomor?: string;
  judul?: string;
  teks: string;
}

export interface SkLampiranItem {
  id: string;
  label?: string; // e.g. "LAMPIRAN I", "LAMPIRAN II"
  subjudul?: string;
  pengantar?: string;
  mode?: 'tabel' | 'teks' | 'kombinasi';
  // Pengaturan kolom dinamis
  columns?: SkTableColumn[];
  tabelHeader?: {
    col1?: string;
    col2?: string;
    col3?: string;
    col4?: string;
    col5?: string;
  };
  tabel?: SkLampiranRow[];
  isiTeks?: string;
  uraianList?: SkUraianItem[];
  catatan?: string;
}

export interface SkLampiranData {
  adaLampiran?: boolean;
  lampiranKeterangan?: string;
  lampiranNomor?: string;
  lampiranTentang?: string;
  // Dukungan banyak lampiran (Lampiran I, II, dst.)
  lampiranList?: SkLampiranItem[];
  // Kompatibilitas mundur lampiran tunggal
  lampiranSubjudul?: string;
  lampiranPengantar?: string;
  lampiranMode?: 'tabel' | 'teks' | 'kombinasi';
  lampiranTabelHeader?: {
    col1?: string;
    col2?: string;
    col3?: string;
    col4?: string;
    col5?: string;
  };
  lampiranTabel?: SkLampiranRow[];
  isiTeks?: string;
  lampiranIsiTeks?: string;
  lampiranCatatan?: string;
}


