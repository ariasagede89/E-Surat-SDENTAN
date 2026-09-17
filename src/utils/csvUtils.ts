import { Siswa, Guru, KategoriPTK } from '../types';

/**
 * Parses a single CSV line with full RFC-4180 quote support,
 * custom delimiter auto-detection, and un-nesting of Excel-wrapped columns.
 */
export function parseCsvLine(line: string, explicitDelimiter?: string): string[] {
  if (!line) return [];
  const text = line.trim();
  if (!text) return [];

  // If the entire row was wrapped in outer quotes by Excel (e.g. "1,""1001"",""..."")
  let processed = text;
  if (processed.startsWith('"') && processed.endsWith('"')) {
    const inner = processed.slice(1, -1);
    if (
      inner.includes('","') ||
      inner.includes('";"') ||
      inner.includes('""') ||
      (inner.includes(',') && !inner.startsWith('"')) ||
      (inner.includes(';') && !inner.startsWith('"'))
    ) {
      processed = inner.replace(/""/g, '"');
    }
  }

  // Detect delimiter for this line if not explicitly provided
  let delim = explicitDelimiter;
  if (!delim) {
    let cComma = 0;
    let cSemi = 0;
    let cTab = 0;
    let inQ = false;
    for (let i = 0; i < processed.length; i++) {
      if (processed[i] === '"') {
        inQ = !inQ;
      } else if (!inQ) {
        if (processed[i] === ',') cComma++;
        else if (processed[i] === ';') cSemi++;
        else if (processed[i] === '\t') cTab++;
      }
    }

    // If all were 0 (e.g. still inside unescaped quotes), count ignoring quotes
    if (cComma === 0 && cSemi === 0 && cTab === 0) {
      for (let i = 0; i < processed.length; i++) {
        if (processed[i] === ',') cComma++;
        else if (processed[i] === ';') cSemi++;
        else if (processed[i] === '\t') cTab++;
      }
    }

    if (cSemi > cComma && cSemi > cTab) delim = ';';
    else if (cTab > cComma && cTab > cSemi) delim = '\t';
    else delim = ',';
  }

  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < processed.length; i++) {
    const ch = processed[i];
    const nextCh = processed[i + 1];

    if (inQuotes) {
      if (ch === '"') {
        if (nextCh === '"') {
          // Escaped quote inside quotes
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === delim) {
        result.push(current.trim().replace(/^"|"$/g, ''));
        current = '';
      } else {
        current += ch;
      }
    }
  }

  result.push(current.trim().replace(/^"|"$/g, ''));
  return result;
}

/**
 * Robust CSV parser compliant with RFC-4180.
 * Handles:
 * - Auto-detection of delimiter: comma (,), semicolon (;), or tab (\t)
 * - Quoted fields with commas, semicolons, and internal double-quotes ("")
 * - Multiline entries inside quotes
 * - Windows (\r\n) and Unix (\n) line breaks
 * - Strips UTF-8 BOM (\ufeff)
 * - Auto-expands rows where Excel packed everything into a single column
 */
export function parseCsvRows(csvText: string): string[][] {
  if (!csvText || !csvText.trim()) return [];

  // Strip BOM
  let text = csvText.replace(/^\ufeff/, '').trim();

  // Strip "sep=;" or "sep=," header if present from Excel
  const lines = text.split(/\r?\n/);
  if (lines.length > 0 && /^sep=[,;\t]/i.test(lines[0].trim())) {
    text = lines.slice(1).join('\n');
  }

  // Detect primary delimiter by checking the first few lines
  const sampleLines = text.split(/\r?\n/).slice(0, 5);
  const countChar = (str: string, ch: string) => {
    let count = 0;
    let inQuotes = false;
    for (let i = 0; i < str.length; i++) {
      if (str[i] === '"') inQuotes = !inQuotes;
      else if (str[i] === ch && !inQuotes) count++;
    }
    return count;
  };

  let commaCount = 0;
  let semiCount = 0;
  let tabCount = 0;

  for (const line of sampleLines) {
    commaCount += countChar(line, ',');
    semiCount += countChar(line, ';');
    tabCount += countChar(line, '\t');
  }

  // Fallback if all 0
  if (commaCount === 0 && semiCount === 0 && tabCount === 0) {
    for (const line of sampleLines) {
      for (const ch of line) {
        if (ch === ',') commaCount++;
        else if (ch === ';') semiCount++;
        else if (ch === '\t') tabCount++;
      }
    }
  }

  let delimiter = ',';
  if (semiCount > commaCount && semiCount > tabCount) {
    delimiter = ';';
  } else if (tabCount > commaCount && tabCount > semiCount) {
    delimiter = '\t';
  }

  // Parse state machine across whole text
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const nextCh = text[i + 1];

    if (inQuotes) {
      if (ch === '"') {
        if (nextCh === '"') {
          // Escaped quote
          currentCell += '"';
          i++;
        } else {
          // End of quote
          inQuotes = false;
        }
      } else {
        currentCell += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === delimiter) {
        currentRow.push(currentCell.trim());
        currentCell = '';
      } else if (ch === '\r') {
        if (nextCh === '\n') i++;
        currentRow.push(currentCell.trim());
        rows.push(currentRow);
        currentRow = [];
        currentCell = '';
      } else if (ch === '\n') {
        currentRow.push(currentCell.trim());
        rows.push(currentRow);
        currentRow = [];
        currentCell = '';
      } else {
        currentCell += ch;
      }
    }
  }

  // Push remainder
  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    rows.push(currentRow);
  }

  // Post-processing: If rows were parsed as a single column (Excel Column A paste/export issue),
  // unpack them individually!
  const cleanedRows: string[][] = [];
  for (const row of rows) {
    if (!row.some((c) => c.length > 0)) continue;

    if (row.length === 1) {
      const singleCell = row[0];
      if (
        singleCell.includes(',') ||
        singleCell.includes(';') ||
        singleCell.includes('\t')
      ) {
        cleanedRows.push(parseCsvLine(singleCell));
        continue;
      }
    }
    cleanedRows.push(row);
  }

  return cleanedRows;
}

/**
 * Normalizes date string into YYYY-MM-DD format if possible
 */
export function normalizeDateString(raw: string): string {
  if (!raw) return '';
  const trimmed = raw.trim();

  // If already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  // If DD/MM/YYYY or DD-MM-YYYY
  const dmy = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dmy) {
    const day = dmy[1].padStart(2, '0');
    const month = dmy[2].padStart(2, '0');
    const year = dmy[3];
    return `${year}-${month}-${day}`;
  }

  // If YYYY/MM/DD
  const ymd = trimmed.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
  if (ymd) {
    const year = ymd[1];
    const month = ymd[2].padStart(2, '0');
    const day = ymd[3].padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  return trimmed;
}

/**
 * Normalizes gender to 'L' or 'P'
 */
export function normalizeJenisKelamin(raw: string): 'L' | 'P' {
  if (!raw) return 'L';
  const clean = raw.trim().toLowerCase();
  if (
    clean === 'p' ||
    clean === 'perempuan' ||
    clean === 'wanita' ||
    clean === 'female' ||
    clean === '2'
  ) {
    return 'P';
  }
  return 'L';
}

/**
 * Normalizes header string to lowercase alphanumeric
 */
function normalizeHeaderName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Intelligent parser for Siswa CSV.
 * Directly handles the export format:
 * "No","NIS","NISN","Nama Siswa","Kelas","Jenis Kelamin","Tempat Lahir","Tanggal Lahir","Nama Orang Tua / Wali","Alamat"
 * and handles Excel single-column wrapping, semicolon delimiters, and packed rows.
 */
export function parseSiswaCsv(csvText: string): {
  success: boolean;
  data: Omit<Siswa, 'id'>[];
  totalRows: number;
  errors: string[];
  detectedHeaders: string[];
} {
  const rawRows = parseCsvRows(csvText);
  if (rawRows.length === 0) {
    return {
      success: false,
      data: [],
      totalRows: 0,
      errors: ['File CSV kosong atau tidak memiliki data.'],
      detectedHeaders: [],
    };
  }

  // Ensure every row is unrolled if it contains nested CSV text
  const rows: string[][] = rawRows.map((r) => {
    if (r.length === 1 && (r[0].includes(',') || r[0].includes(';') || r[0].includes('\t'))) {
      return parseCsvLine(r[0]);
    }
    return r;
  });

  const firstRow = rows[0];
  const detectedHeaders = firstRow.map((c) => c.replace(/^"|"$/g, '').trim());

  // Check if first row is header
  let hasHeader = false;
  let colMap: Record<string, number> = {};

  firstRow.forEach((col, idx) => {
    const clean = normalizeHeaderName(col);
    // Prioritize specific fields first so generic "nama" doesn't catch "nama orang tua"
    if (clean.includes('ortu') || clean.includes('orangtua') || clean.includes('wali')) {
      colMap['namaOrtu'] = idx;
      hasHeader = true;
    } else if (
      clean.includes('jeniskelamin') ||
      clean === 'jk' ||
      clean === 'lp' ||
      clean === 'gender' ||
      clean === 'sex' ||
      clean === 'kelamin'
    ) {
      colMap['jenisKelamin'] = idx;
      hasHeader = true;
    } else if (
      clean.includes('tanggallahir') ||
      clean.includes('tgllahir') ||
      clean.includes('tgllhr') ||
      clean.includes('tgl_lahir')
    ) {
      colMap['tglLahir'] = idx;
      hasHeader = true;
    } else if (
      clean.includes('tempatlahir') ||
      clean.includes('tmplahir') ||
      clean.includes('tmp_lahir') ||
      clean === 'tempat'
    ) {
      colMap['tempatLahir'] = idx;
      hasHeader = true;
    } else if (clean === 'nisn') {
      colMap['nisn'] = idx;
      hasHeader = true;
    } else if (clean === 'nis' || clean === 'noinduk' || clean === 'nomorinduk') {
      colMap['nis'] = idx;
      hasHeader = true;
    } else if (clean === 'no' || clean === 'nomor' || clean === 'nourut') {
      colMap['no'] = idx;
      hasHeader = true;
    } else if (clean.includes('kelas') || clean.includes('rombel') || clean.includes('tingkat')) {
      colMap['kelas'] = idx;
      hasHeader = true;
    } else if (clean.includes('alamat') || clean.includes('domisili') || clean.includes('alamatrumah')) {
      colMap['alamat'] = idx;
      hasHeader = true;
    } else if (
      (clean.includes('nama') || clean.includes('siswa')) &&
      !clean.includes('ortu') &&
      !clean.includes('wali') &&
      !clean.includes('orangtua')
    ) {
      colMap['nama'] = idx;
      hasHeader = true;
    }
  });

  const dataRows: string[][] = [];
  if (hasHeader) {
    for (let i = 1; i < rows.length; i++) {
      dataRows.push(rows[i]);
    }
  } else {
    // If no header found, determine column positions based on length
    const colCount = firstRow.length;
    if (colCount >= 10) {
      // Standard export with No: No, NIS, NISN, Nama, Kelas, JK, Tempat, Tgl, Ortu, Alamat
      colMap = {
        no: 0,
        nis: 1,
        nisn: 2,
        nama: 3,
        kelas: 4,
        jenisKelamin: 5,
        tempatLahir: 6,
        tglLahir: 7,
        namaOrtu: 8,
        alamat: 9,
      };
    } else if (colCount >= 9) {
      // Standard export without No: NIS, NISN, Nama, Kelas, JK, Tempat, Tgl, Ortu, Alamat
      colMap = {
        nis: 0,
        nisn: 1,
        nama: 2,
        kelas: 3,
        jenisKelamin: 4,
        tempatLahir: 5,
        tglLahir: 6,
        namaOrtu: 7,
        alamat: 8,
      };
    } else {
      // Minimal fallback
      colMap = {
        nis: 0,
        nisn: 1,
        nama: 2,
        kelas: 3,
      };
    }
    for (let i = 0; i < rows.length; i++) {
      dataRows.push(rows[i]);
    }
  }

  const result: Omit<Siswa, 'id'>[] = [];
  const errors: string[] = [];

  dataRows.forEach((row, rowIdx) => {
    // Skip completely empty rows
    if (row.every((c) => !c || c.trim() === '')) return;

    let getVal = (key: string): string => {
      const idx = colMap[key];
      if (idx !== undefined && idx < row.length) {
        return row[idx]?.replace(/^"|"$/g, '').trim() || '';
      }
      return '';
    };

    let nis = getVal('nis');
    let nisn = getVal('nisn');
    let nama = getVal('nama');
    let kelas = getVal('kelas');
    let jkRaw = getVal('jenisKelamin');
    let tempatLahir = getVal('tempatLahir');
    let tglLahirRaw = getVal('tglLahir');
    let namaOrtu = getVal('namaOrtu');
    let alamat = getVal('alamat');

    // DEEP RESCUE 1: Check if 'nama' or 'row[0]' contains an entire unparsed CSV line
    // (e.g. 1,"1001","0077376879","I Made Sotong","1","L","Jembrana","2014-05-12","-","Pekutatan, Jembrana")
    const candidatePacked = (nama.includes(',') && (nama.includes('"') || /^\d+,/.test(nama))) ? nama :
      (row[0] && row[0].includes(',') && (row[0].includes('"') || /^\d+,/.test(row[0]))) ? row[0] : '';

    if (candidatePacked) {
      const rescued = parseCsvLine(candidatePacked);
      if (rescued.length >= 6) {
        let rIdx = 0;
        // If first token is purely numeric counter like 1, 2, 3, advance
        if (/^\d{1,4}$/.test(rescued[0]) && /^\d{3,15}$/.test(rescued[1])) {
          rIdx = 1; // rescued[1] is NIS
        }
        nis = rescued[rIdx] || nis;
        nisn = rescued[rIdx + 1] || nisn;
        nama = rescued[rIdx + 2] || nama;
        kelas = rescued[rIdx + 3] || kelas;
        jkRaw = rescued[rIdx + 4] || jkRaw;
        tempatLahir = rescued[rIdx + 5] || tempatLahir;
        tglLahirRaw = rescued[rIdx + 6] || tglLahirRaw;
        namaOrtu = rescued[rIdx + 7] || namaOrtu;
        alamat = rescued[rIdx + 8] || alamat;
      }
    }

    // Clean up kelas if prefixed with "Kelas "
    if (kelas.toLowerCase().startsWith('kelas ')) {
      kelas = kelas.substring(6).trim();
    }

    // Require at least Nama or NIS to be valid
    if (!nama && !nis && !nisn) {
      errors.push(`Baris ${rowIdx + (hasHeader ? 2 : 1)}: Dilewati karena data kosong.`);
      return;
    }

    result.push({
      nis: nis || `100${rowIdx + 1}`,
      nisn: nisn || '-',
      nama: nama || `Siswa ${rowIdx + 1}`,
      kelas: kelas || '1',
      jenisKelamin: normalizeJenisKelamin(jkRaw),
      tempatLahir: tempatLahir || 'Jembrana',
      tglLahir: normalizeDateString(tglLahirRaw) || '2014-01-01',
      namaOrtu: namaOrtu || '-',
      alamat: alamat || 'Pekutatan, Jembrana',
    });
  });

  const sortedResult = sortSiswa(result);

  return {
    success: sortedResult.length > 0,
    data: sortedResult,
    totalRows: sortedResult.length,
    errors,
    detectedHeaders,
  };
}

/**
 * Computes a numeric rank for school class names, supporting:
 * - Pure digits: "1", "2", "3", "4", "5", "6"
 * - Prefix: "Kelas 1", "Kls 1"
 * - Suffix: "1A", "1B", "6C"
 * - Roman numerals: "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"
 */
export function parseKelasRank(raw: string): number {
  if (!raw) return 9999;
  const str = String(raw).trim().toUpperCase();
  const clean = str.replace(/^(KELAS|KLS)\s*/i, '').trim();

  const romanMap: Record<string, number> = {
    I: 1,
    II: 2,
    III: 3,
    IV: 4,
    V: 5,
    VI: 6,
    VII: 7,
    VIII: 8,
    IX: 9,
    X: 10,
    XI: 11,
    XII: 12,
  };

  const matchRoman = clean.match(/^(XII|XI|X|IX|VIII|VII|VI|V|IV|III|II|I)([A-Z]?)$/);
  if (matchRoman) {
    const base = romanMap[matchRoman[1]] || 0;
    const sub = matchRoman[2] ? (matchRoman[2].charCodeAt(0) - 64) * 0.01 : 0;
    return base + sub;
  }

  const numMatch = clean.match(/^(\d+)(.*)$/);
  if (numMatch) {
    const base = parseInt(numMatch[1], 10);
    const suffix = numMatch[2].trim();
    const sub = suffix ? (suffix.charCodeAt(0) - 64) * 0.01 : 0;
    return base + (isNaN(sub) ? 0 : sub);
  }

  return 9999;
}

/**
 * Compares two class names in ascending order (1 to 6 / I to XII)
 */
export function compareKelas(a: string, b: string): number {
  const rankA = parseKelasRank(a);
  const rankB = parseKelasRank(b);
  if (rankA !== rankB) {
    return rankA - rankB;
  }
  if (rankA === 9999 && rankB === 9999) {
    return String(a || '').localeCompare(String(b || ''), undefined, { numeric: true, sensitivity: 'base' });
  }
  return 0;
}

/**
 * Compares two NIS strings naturally in ascending order
 */
export function compareNis(a: string, b: string): number {
  const strA = String(a || '').trim();
  const strB = String(b || '').trim();

  const numA = Number(strA.replace(/[^0-9]/g, ''));
  const numB = Number(strB.replace(/[^0-9]/g, ''));

  if (!isNaN(numA) && !isNaN(numB) && strA.length > 0 && strB.length > 0 && numA !== numB) {
    return numA - numB;
  }

  return strA.localeCompare(strB, undefined, { numeric: true, sensitivity: 'base' });
}

/**
 * Sorts student records from smallest to largest by class, then by NIS
 */
export function sortSiswa<T extends { kelas: string; nis: string } = Siswa>(list: T[]): T[] {
  return [...list].sort((a, b) => {
    const kComp = compareKelas(a.kelas, b.kelas);
    if (kComp !== 0) return kComp;
    return compareNis(a.nis, b.nis);
  });
}

/**
 * Intelligent parser for Guru / PTK CSV
 */
export function parseGuruCsv(csvText: string): {
  success: boolean;
  data: Omit<Guru, 'id'>[];
  totalRows: number;
  errors: string[];
} {
  const rawRows = parseCsvRows(csvText);
  if (rawRows.length === 0) {
    return {
      success: false,
      data: [],
      totalRows: 0,
      errors: ['File CSV kosong atau tidak memiliki data.'],
    };
  }

  // Ensure every row is unrolled if it contains nested CSV text
  const rows: string[][] = rawRows.map((r) => {
    if (r.length === 1 && (r[0].includes(',') || r[0].includes(';') || r[0].includes('\t'))) {
      return parseCsvLine(r[0]);
    }
    return r;
  });

  const firstRow = rows[0];
  let hasHeader = false;
  let colMap: Record<string, number> = {};

  firstRow.forEach((col, idx) => {
    const clean = normalizeHeaderName(col);
    if (clean === 'no' || clean === 'nomor') {
      colMap['no'] = idx;
      hasHeader = true;
    } else if (clean === 'nip') {
      colMap['nip'] = idx;
      hasHeader = true;
    } else if (clean === 'nuptk') {
      colMap['nuptk'] = idx;
      hasHeader = true;
    } else if (clean.includes('jenisptk') || clean === 'ptk') {
      colMap['jenisPtk'] = idx;
      hasHeader = true;
    } else if (clean === 'status' || clean === 'kepegawaian') {
      colMap['status'] = idx;
      hasHeader = true;
    } else if (clean.includes('pangkat') || clean.includes('gol')) {
      colMap['pangkatGol'] = idx;
      hasHeader = true;
    } else if (clean.includes('jabatan')) {
      colMap['jabatan'] = idx;
      hasHeader = true;
    } else if (clean.includes('email')) {
      colMap['email'] = idx;
      hasHeader = true;
    } else if (clean.includes('hp') || clean.includes('telepon') || clean.includes('handphone') || clean.includes('wa')) {
      colMap['noHp'] = idx;
      hasHeader = true;
    } else if (clean.includes('nama') || clean.includes('guru')) {
      colMap['nama'] = idx;
      hasHeader = true;
    }
  });

  const dataRows = hasHeader ? rows.slice(1) : rows;

  // Fallback map if headerless
  if (!hasHeader) {
    if (firstRow.length >= 10) {
      colMap = {
        no: 0,
        nip: 1,
        nuptk: 2,
        nama: 3,
        jenisPtk: 4,
        status: 5,
        pangkatGol: 6,
        jabatan: 7,
        email: 8,
        noHp: 9,
      };
    } else {
      colMap = {
        nip: 0,
        nuptk: 1,
        nama: 2,
        jenisPtk: 3,
        status: 4,
        pangkatGol: 5,
        jabatan: 6,
        email: 7,
        noHp: 8,
      };
    }
  }

  const result: Omit<Guru, 'id'>[] = [];
  const errors: string[] = [];

  dataRows.forEach((row, rowIdx) => {
    if (row.every((c) => !c || c.trim() === '')) return;

    let getVal = (key: string): string => {
      const idx = colMap[key];
      if (idx !== undefined && idx < row.length) {
        return row[idx]?.replace(/^"|"$/g, '').trim() || '';
      }
      return '';
    };

    let nip = getVal('nip');
    let nuptk = getVal('nuptk');
    let nama = getVal('nama');
    let rawJenis = getVal('jenisPtk').toLowerCase();
    let rawJabatan = getVal('jabatan').toLowerCase();
    let status = getVal('status') || 'PNS';
    let pangkatGol = getVal('pangkatGol') || 'Penata Muda / III-a';
    let jabatan = getVal('jabatan') || 'Guru Kelas';
    let email = getVal('email');
    let noHp = getVal('noHp');

    // Deep rescue candidate
    const candidatePacked = (nama.includes(',') && (nama.includes('"') || /^\d+,/.test(nama))) ? nama :
      (row[0] && row[0].includes(',') && (row[0].includes('"') || /^\d+,/.test(row[0]))) ? row[0] : '';

    if (candidatePacked) {
      const rescued = parseCsvLine(candidatePacked);
      if (rescued.length >= 6) {
        let rIdx = 0;
        if (/^\d{1,3}$/.test(rescued[0])) rIdx = 1;
        nip = rescued[rIdx] || nip;
        nuptk = rescued[rIdx + 1] || nuptk;
        nama = rescued[rIdx + 2] || nama;
        rawJenis = (rescued[rIdx + 3] || rawJenis).toLowerCase();
        status = rescued[rIdx + 4] || status;
        pangkatGol = rescued[rIdx + 5] || pangkatGol;
        jabatan = rescued[rIdx + 6] || jabatan;
        rawJabatan = jabatan.toLowerCase();
        email = rescued[rIdx + 7] || email;
        noHp = rescued[rIdx + 8] || noHp;
      }
    }

    if (!nama && !nip) {
      errors.push(`Baris ${rowIdx + (hasHeader ? 2 : 1)} dilewati karena kosong.`);
      return;
    }

    let jenisPtk: KategoriPTK = 'guru';
    if (rawJenis.includes('kepala') || rawJabatan.includes('kepala sekolah')) {
      jenisPtk = 'kepala_sekolah';
    } else if (
      rawJenis.includes('tu') ||
      rawJenis.includes('tata usaha') ||
      rawJabatan.includes('tu') ||
      rawJabatan.includes('administrasi') ||
      rawJabatan.includes('operator')
    ) {
      jenisPtk = 'tu';
    }

    let finalStatus: 'PNS' | 'PPPK' | 'Honorer' | 'GTT' = 'PNS';
    const sUpper = (status || '').toUpperCase();
    if (sUpper.includes('PPPK') || sUpper.includes('P3K')) {
      finalStatus = 'PPPK';
    } else if (sUpper.includes('HONOR')) {
      finalStatus = 'Honorer';
    } else if (sUpper.includes('GTT')) {
      finalStatus = 'GTT';
    } else if (sUpper.includes('PNS')) {
      finalStatus = 'PNS';
    }

    result.push({
      nip: nip || '-',
      nuptk: nuptk || undefined,
      nama: nama || `PTK ${rowIdx + 1}`,
      jenisPtk,
      status: finalStatus,
      pangkatGol: pangkatGol || 'Penata Muda / III-a',
      jabatan: jabatan || 'Guru Kelas',
      email: email || '',
      noHp: noHp || '',
    });
  });

  return {
    success: result.length > 0,
    data: result,
    totalRows: result.length,
    errors,
  };
}

/**
 * Downloads a preformatted CSV template for Siswa
 */
export function downloadSiswaTemplateCsv(): void {
  const headers = [
    'No',
    'NIS',
    'NISN',
    'Nama Siswa',
    'Kelas',
    'Jenis Kelamin',
    'Tempat Lahir',
    'Tanggal Lahir',
    'Nama Orang Tua / Wali',
    'Alamat',
  ];

  const sampleRows = [
    [
      '1',
      '1001',
      '0077376879',
      'I Putu Pasek',
      '1',
      'L',
      'Jembrana',
      '2014-05-12',
      'I Made Sotong',
      'Pekutatan, Jembrana',
    ],
    [
      '2',
      '1002',
      '0077376880',
      'Ni Kadek Ayu Lestari',
      '1',
      'P',
      'Jembrana',
      '2014-08-20',
      'I Ketut Wijaya',
      'Banjar Yeh Kuning, Pekutatan',
    ],
    [
      '3',
      '1003',
      '0077376881',
      'I Komang Bagus Arya',
      '2',
      'L',
      'Negara',
      '2013-11-15',
      'I Wayan Wardana',
      'Banjar Pasar, Pekutatan',
    ],
  ];

  const csvRows = [
    headers.map((h) => `"${h}"`).join(','),
    ...sampleRows.map((r) =>
      r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')
    ),
  ];

  const csvContent = '\ufeff' + csvRows.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'Format_Template_Data_Siswa_SDN_1_Pekutatan.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Downloads a preformatted CSV template for PTK (Guru / Staf)
 */
export function downloadGuruTemplateCsv(): void {
  const headers = [
    'No',
    'NIP',
    'NUPTK',
    'Nama Lengkap',
    'Jenis PTK',
    'Status',
    'Pangkat / Golongan',
    'Jabatan',
    'Email',
    'No Handphone',
  ];

  const sampleRows = [
    [
      '1',
      '197505102000031002',
      '1234567890123456',
      'I Wayan Sudarma, S.Pd., M.Pd.',
      'Kepala Sekolah',
      'PNS',
      'Pembina Tk. I / IV-b',
      'Kepala Sekolah',
      'sudarma@sdn1pekutatan.sch.id',
      '081234567890',
    ],
    [
      '2',
      '198203152006042011',
      '2345678901234567',
      'Ni Made Sukerti, S.Pd.',
      'Guru',
      'PNS',
      'Penata Tk. I / III-d',
      'Guru Kelas VI',
      'sukerti@sdn1pekutatan.sch.id',
      '081234567891',
    ],
    [
      '3',
      '199008202022211005',
      '-',
      'I Kadek Ariasa, S.Kom.',
      'Tata Usaha (TU)',
      'PPPK',
      'Pengatur / II-c',
      'Staf Tata Usaha & Operator',
      'ariasa@sdn1pekutatan.sch.id',
      '081234567892',
    ],
  ];

  const csvRows = [
    headers.map((h) => `"${h}"`).join(','),
    ...sampleRows.map((r) =>
      r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')
    ),
  ];

  const csvContent = '\ufeff' + csvRows.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'Format_Template_Data_PTK_SDN_1_Pekutatan.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
