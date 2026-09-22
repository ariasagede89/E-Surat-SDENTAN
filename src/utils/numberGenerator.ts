import { KLASIFIKASI_MENDAGRI_83_2022 } from '../data/klasifikasiMendagri';
import { KlasifikasiMendagriItem } from '../types';

export const BULAN_ROMAWI: string[] = [
  '',
  'I',
  'II',
  'III',
  'IV',
  'V',
  'VI',
  'VII',
  'VIII',
  'IX',
  'X',
  'XI',
  'XII',
];

export function getBulanRomawi(date: Date = new Date()): string {
  const month = date.getMonth() + 1;
  return BULAN_ROMAWI[month] || 'I';
}

export function formatNomorUrut(num: number, digits: number = 3): string {
  return String(num).padStart(digits, '0');
}

/**
 * Ekstraksi nomor urut dari format nomor surat apapun (baik standar Permendagri maupun penomoran manual).
 * Mendukung format:
 * - 800.1.11.1/001/SDN1PKT/IX/2026 -> 1
 * - 893/042/SDN1PKT/IX/2026 -> 42
 * - 045/SDN1PKT/IX/2026 -> 45
 * - 421.2/046/2026 -> 46
 * - 47 atau No. 47 -> 47
 */
export function extractNomorUrut(noSurat: string): number | null {
  if (!noSurat || typeof noSurat !== 'string') return null;
  const trimmed = noSurat.trim();
  if (!trimmed || trimmed === '-') return null;

  // Format bergaris miring (/)
  if (trimmed.includes('/')) {
    const parts = trimmed.split('/').map((p) => p.trim());
    // Pola umum Permendagri: parts[1] adalah nomor urut (contoh: 421.2/042/SDN1PKT/IX/2026)
    if (parts.length >= 2) {
      const match1 = parts[1].match(/\b(\d{1,5})\b/) || parts[1].match(/(\d{1,5})/);
      if (match1) {
        const val = parseInt(match1[1], 10);
        if (!isNaN(val) && val > 0 && (val < 1990 || val > 2100)) {
          return val;
        }
      }
    }
    // Pola jika nomor urut di awal: parts[0] (contoh: 045/SDN1PKT/IX/2026)
    if (parts.length >= 1) {
      const match0 = parts[0].match(/\b(\d{1,5})\b/) || parts[0].match(/(\d{1,5})/);
      if (match0) {
        const val = parseInt(match0[1], 10);
        if (!isNaN(val) && val > 0 && (val < 1990 || val > 2100)) {
          return val;
        }
      }
    }
    // Periksa segmen lainnya yang mengandung angka 1-5 digit (selain tahun 1990-2100)
    for (const part of parts) {
      const m = part.match(/\b(\d{1,5})\b/) || part.match(/(\d{1,5})/);
      if (m) {
        const val = parseInt(m[1], 10);
        if (!isNaN(val) && val > 0 && (val < 1990 || val > 2100)) {
          return val;
        }
      }
    }
  }

  // Jika tanpa garis miring, cari digit angka berdiri sendiri (misal: "045" atau "No. 45")
  const match = trimmed.match(/\b(\d{1,5})\b/);
  if (match) {
    const val = parseInt(match[1], 10);
    if (!isNaN(val) && val > 0 && (val < 1990 || val > 2100)) {
      return val;
    }
  }

  return null;
}

/**
 * Mencari nomor urut tertinggi dari gabungan Surat Keluar dan Buku Arsip Surat Keluar.
 * Memastikan surat manual yang diarsipkan tidak akan membuat nomor urut tumpang tindih.
 */
export function getHighestNomorUrut(
  suratKeluarList: { noSurat?: string }[] = [],
  arsipList: { noSurat?: string }[] = [],
  filterYear?: number
): number {
  let maxSeq = 0;

  const checkItem = (item: { noSurat?: string }) => {
    if (!item || !item.noSurat) return;
    if (filterYear) {
      const yearStr = String(filterYear);
      if (item.noSurat.includes('/') && !item.noSurat.includes(yearStr)) {
        return;
      }
    }
    const seq = extractNomorUrut(item.noSurat);
    if (seq !== null && seq > maxSeq && seq < 10000) {
      maxSeq = seq;
    }
  };

  suratKeluarList.forEach(checkItem);
  arsipList.forEach(checkItem);

  return maxSeq;
}

/**
 * Mendapatkan nomor urut berikutnya yang terhubung antara Surat Keluar dan Arsip Surat Keluar.
 */
export function getNextNomorUrut(
  suratKeluarList: { noSurat?: string }[] = [],
  arsipList: { noSurat?: string }[] = [],
  filterYear?: number
): number {
  const highest = getHighestNomorUrut(suratKeluarList, arsipList, filterYear);
  return highest + 1;
}

export function generateNomorSurat(
  kodeKlasifikasi: string,
  noUrut: number,
  kodeSekolah: string = 'SDN1PKT',
  tanggal: Date = new Date()
): string {
  const romawi = getBulanRomawi(tanggal);
  const tahun = tanggal.getFullYear();
  const urutFormatted = formatNomorUrut(noUrut);

  return `${kodeKlasifikasi}/${urutFormatted}/${kodeSekolah}/${romawi}/${tahun}`;
}

/**
 * Segarkan nomor surat: Hanya memperbarui nomor urut tanpa mengubah kode klasifikasi,
 * kode sekolah, bulan romawi, dan tahun.
 */
export function refreshNomorUrut(
  currentNomor: string,
  defaultKodeKlasifikasi: string,
  noUrutBaru: number,
  kodeSekolah: string = 'SDN1PKT',
  tanggal: Date = new Date()
): string {
  const romawi = getBulanRomawi(tanggal);
  const tahun = tanggal.getFullYear();
  const urutFormatted = formatNomorUrut(noUrutBaru);

  let kode = defaultKodeKlasifikasi;
  if (currentNomor && currentNomor.includes('/')) {
    const parts = currentNomor.split('/');
    if (parts[0] && parts[0].trim() !== '') {
      kode = parts[0].trim();
    }
  }

  return `${kode}/${urutFormatted}/${kodeSekolah}/${romawi}/${tahun}`;
}

export { cariKlasifikasi, getKodeDefaultByJenis } from '../data/klasifikasiMendagri';

export function getKlasifikasiByKode(kode: string): KlasifikasiMendagriItem | undefined {
  return KLASIFIKASI_MENDAGRI_83_2022.find((k) => k.kode === kode);
}

/**
 * Membandingkan dua surat keluar atau arsip agar surat terbaru / nomor urut tertinggi berada di posisi paling atas (Descending).
 */
export function compareSuratKeluarDesc(
  a: { noSurat?: string; tglSurat?: string; createdAt?: string },
  b: { noSurat?: string; tglSurat?: string; createdAt?: string }
): number {
  const seqA = extractNomorUrut(a.noSurat || '');
  const seqB = extractNomorUrut(b.noSurat || '');

  // 1. Ekstraksi tahun surat (dari tglSurat, createdAt, atau nomor surat)
  const getYear = (item: { noSurat?: string; tglSurat?: string; createdAt?: string }): number => {
    if (item.tglSurat) {
      const y = new Date(item.tglSurat).getFullYear();
      if (!isNaN(y) && y > 1900) return y;
    }
    if (item.createdAt) {
      const y = new Date(item.createdAt).getFullYear();
      if (!isNaN(y) && y > 1900) return y;
    }
    if (item.noSurat) {
      const match = item.noSurat.match(/\b(20\d{2})\b/);
      if (match) return parseInt(match[1], 10);
    }
    return 0;
  };

  const yearA = getYear(a);
  const yearB = getYear(b);
  if (yearA > 0 && yearB > 0 && yearA !== yearB) {
    return yearB - yearA; // Tahun lebih baru di atas
  }

  // 2. Jika keduanya memiliki nomor urut yang valid dan berbeda: nomor urut lebih tinggi berada di atas
  if (seqA !== null && seqB !== null && seqA !== seqB) {
    return seqB - seqA;
  }

  // 3. Bandingkan tanggal surat (YYYY-MM-DD): tanggal lebih baru di atas
  const dateA = a.tglSurat ? new Date(a.tglSurat).getTime() : 0;
  const dateB = b.tglSurat ? new Date(b.tglSurat).getTime() : 0;
  if (!isNaN(dateA) && !isNaN(dateB) && dateA !== dateB) {
    return dateB - dateA;
  }

  // 4. Bandingkan timestamp pembuatan (createdAt) jika ada: yang baru dibuat di atas
  const createA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
  const createB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
  if (!isNaN(createA) && !isNaN(createB) && createA !== createB) {
    return createB - createA;
  }

  // 5. Jika salah satu punya nomor urut dan tanggal serta createdAt sama
  if (seqA !== null && seqB === null) return -1;
  if (seqA === null && seqB !== null) return 1;

  return 0;
}

/**
 * Membandingkan dua surat masuk agar surat dengan nomor urut / agenda terbaru berada di posisi paling atas (Descending).
 * Mengutamakan nomor urut agenda (misal AG-2026/092 > AG-2026/091), tanggal terima, tanggal surat, dan waktu input.
 */
export function compareSuratMasukDesc(
  a: { noAgenda?: string; noSurat?: string; tglTerima?: string; tglSurat?: string; createdAt?: string },
  b: { noAgenda?: string; noSurat?: string; tglTerima?: string; tglSurat?: string; createdAt?: string }
): number {
  // 1. Ekstraksi nomor urut agenda (misal "AG-2026/092" -> 92)
  const seqAgendaA = extractNomorUrut(a.noAgenda || '');
  const seqAgendaB = extractNomorUrut(b.noAgenda || '');

  // Ekstraksi tahun dari agenda atau tglTerima
  const getYear = (item: { noAgenda?: string; tglTerima?: string; tglSurat?: string; createdAt?: string }): number => {
    if (item.noAgenda) {
      const match = item.noAgenda.match(/\b(20\d{2})\b/);
      if (match) return parseInt(match[1], 10);
    }
    if (item.tglTerima) {
      const y = new Date(item.tglTerima).getFullYear();
      if (!isNaN(y) && y > 1900) return y;
    }
    if (item.tglSurat) {
      const y = new Date(item.tglSurat).getFullYear();
      if (!isNaN(y) && y > 1900) return y;
    }
    if (item.createdAt) {
      const y = new Date(item.createdAt).getFullYear();
      if (!isNaN(y) && y > 1900) return y;
    }
    return 0;
  };

  const yearA = getYear(a);
  const yearB = getYear(b);
  if (yearA > 0 && yearB > 0 && yearA !== yearB) {
    return yearB - yearA; // Tahun lebih baru di atas
  }

  // Jika kedua agenda memiliki nomor urut valid dan berbeda: nomor urut lebih tinggi berada di atas
  if (seqAgendaA !== null && seqAgendaB !== null && seqAgendaA !== seqAgendaB) {
    return seqAgendaB - seqAgendaA;
  }

  // 2. Jika nomor agenda tidak membedakan, periksa nomor surat
  const seqSuratA = extractNomorUrut(a.noSurat || '');
  const seqSuratB = extractNomorUrut(b.noSurat || '');
  if (seqSuratA !== null && seqSuratB !== null && seqSuratA !== seqSuratB) {
    return seqSuratB - seqSuratA;
  }

  // 3. Bandingkan tanggal terima (terbaru di atas)
  const dateTerimaA = a.tglTerima ? new Date(a.tglTerima).getTime() : 0;
  const dateTerimaB = b.tglTerima ? new Date(b.tglTerima).getTime() : 0;
  if (!isNaN(dateTerimaA) && !isNaN(dateTerimaB) && dateTerimaA !== dateTerimaB) {
    return dateTerimaB - dateTerimaA;
  }

  // 4. Bandingkan tanggal surat
  const dateSuratA = a.tglSurat ? new Date(a.tglSurat).getTime() : 0;
  const dateSuratB = b.tglSurat ? new Date(b.tglSurat).getTime() : 0;
  if (!isNaN(dateSuratA) && !isNaN(dateSuratB) && dateSuratA !== dateSuratB) {
    return dateSuratB - dateSuratA;
  }

  // 5. Bandingkan timestamp pembuatan (createdAt)
  const createA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
  const createB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
  if (!isNaN(createA) && !isNaN(createB) && createA !== createB) {
    return createB - createA;
  }

  if (seqAgendaA !== null && seqAgendaB === null) return -1;
  if (seqAgendaA === null && seqAgendaB !== null) return 1;

  return 0;
}

/**
 * Membandingkan dua surat keluar atau arsip dari nomor urut terkecil / tanggal terlama (Ascending).
 */
export function compareSuratKeluarAsc(
  a: { noSurat?: string; tglSurat?: string; createdAt?: string },
  b: { noSurat?: string; tglSurat?: string; createdAt?: string }
): number {
  return compareSuratKeluarDesc(b, a);
}
