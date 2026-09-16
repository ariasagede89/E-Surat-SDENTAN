/**
 * Utilitas penomoran Diktum Surat Keputusan (SK)
 * Menjamin semua diktum menggunakan ejaan kata bahasa Indonesia bertingkat (bukan angka, misal 'Keenam' bukan 'ke-6')
 * dan dalam format Title Case (bukan huruf kapital semua).
 */

const BASIC_ORDINALS: Record<number, string> = {
  1: 'Kesatu',
  2: 'Kedua',
  3: 'Ketiga',
  4: 'Keempat',
  5: 'Kelima',
  6: 'Keenam',
  7: 'Ketujuh',
  8: 'Kedelapan',
  9: 'Kesembilan',
  10: 'Kesepuluh',
  11: 'Kesebelas',
};

const SATUAN_WORDS = ['', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan'];

/**
 * Mengubah nomor urut (1-based) menjadi tulisan kata bilangan bertingkat Title Case
 * Contoh:
 * 1 -> 'Kesatu'
 * 6 -> 'Keenam' (bukan 'ke-6' dan bukan 'KEENAM')
 * 12 -> 'Kedua belas'
 * 20 -> 'Kedua puluh'
 */
export function getIndonesianOrdinalWord(num: number): string {
  if (num <= 0) return 'Kesatu';

  if (BASIC_ORDINALS[num]) {
    return BASIC_ORDINALS[num];
  }

  if (num >= 12 && num <= 19) {
    const s = SATUAN_WORDS[num - 10];
    const raw = s === 'dua' ? 'Kedua belas' : `Ke${s} belas`;
    return raw;
  }

  if (num >= 20 && num <= 99) {
    const puluhan = Math.floor(num / 10);
    const sisa = num % 10;
    const puluhanWord = SATUAN_WORDS[puluhan] ? `Ke${SATUAN_WORDS[puluhan]} puluh` : 'Kepuluh';
    if (sisa === 0) {
      return puluhanWord;
    }
    return `${puluhanWord} ${SATUAN_WORDS[sisa]}`;
  }

  return `Ke-${num}`;
}

const ALL_CAPS_KNOWN_MAP: Record<string, string> = {
  'KESATU': 'Kesatu',
  'PERTAMA': 'Kesatu',
  'KEDUA': 'Kedua',
  'KETIGA': 'Ketiga',
  'KEEMPAT': 'Keempat',
  'KELIMA': 'Kelima',
  'KEENAM': 'Keenam',
  'KETUJUH': 'Ketujuh',
  'KEDELAPAN': 'Kedelapan',
  'KESEMBILAN': 'Kesembilan',
  'KESEPULUH': 'Kesepuluh',
  'KESEBELAS': 'Kesebelas',
  'KEDUA BELAS': 'Kedua belas',
  'KETIGA BELAS': 'Ketiga belas',
  'KEEMPAT BELAS': 'Keempat belas',
  'KELIMA BELAS': 'Kelima belas',
  'KEENAM BELAS': 'Keenam belas',
  'KETUJUH BELAS': 'Ketujuh belas',
  'KEDELAPAN BELAS': 'Kedelapan belas',
  'KESEMBILAN BELAS': 'Kesembilan belas',
  'KEDUA PULUH': 'Kedua puluh',
};

/**
 * Memastikan label diktum menggunakan tulisan kata dan bukan angka serta bukan huruf kapital semua.
 * Contoh:
 * 'KEENAM' -> 'Keenam'
 * 'Ke-6' atau 'ke-6' atau '6' -> 'Keenam'
 * 'KESATU' -> 'Kesatu'
 * 'ke-1' -> 'Kesatu'
 */
export function formatDiktumLabel(rawLabel: string | undefined, index: number): string {
  if (!rawLabel || !rawLabel.trim()) {
    return getIndonesianOrdinalWord(index + 1);
  }

  const trimmed = rawLabel.trim();

  // Pola angka seperti Ke-6, ke-6, Ke 6, KE-6, atau sekadar angka 6
  const numMatch = trimmed.match(/^(?:ke[\s-]*)?(\d+)$/i);
  if (numMatch) {
    const parsed = parseInt(numMatch[1], 10);
    if (!isNaN(parsed) && parsed > 0) {
      return getIndonesianOrdinalWord(parsed);
    }
  }

  // Cek kamus huruf kapital
  const upper = trimmed.toUpperCase();
  if (ALL_CAPS_KNOWN_MAP[upper]) {
    return ALL_CAPS_KNOWN_MAP[upper];
  }

  // Jika semua huruf kapital (misal 'KETETAPAN LAIN' atau 'KEENAM')
  if (trimmed === trimmed.toUpperCase() && trimmed.length > 2) {
    return trimmed
      .toLowerCase()
      .split(' ')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }

  return trimmed;
}
