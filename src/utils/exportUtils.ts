import { Guru, Siswa, PengaturanSekolah, SuratKeluar, SuratMasuk, PaperSize } from '../types';
import { formatDiktumLabel } from './diktumUtils';
import { sortSiswa } from './csvUtils';

export function getNamaHariIndonesia(dateString: string): string {
  if (!dateString) return '';
  try {
    const clean = dateString.split('T')[0];
    const parts = clean.split('-');
    let d: Date;
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      d = new Date(year, month, day);
    } else {
      d = new Date(dateString);
    }
    if (isNaN(d.getTime())) return '';
    const hari = d.toLocaleDateString('id-ID', { weekday: 'long' });
    return hari ? hari.charAt(0).toUpperCase() + hari.slice(1) : '';
  } catch {
    return '';
  }
}

export function formatTanggalIndonesia(dateString: string): string {
  if (!dateString) return '-';
  try {
    const clean = dateString.split('T')[0];
    const parts = clean.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const d = new Date(year, month, day);
      return d.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    }
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
}

/**
 * Helper untuk memformat nama sekolah pada bagian isi surat.
 * Mengubah teks kapital "SDN 1 PEKUTATAN" / "SD NEGERI 1 PEKUTATAN" menjadi "SDN 1 Pekutatan"
 * sesuai kaidah tata naskah dinas dan permintaan resmi pengguna.
 */
export function formatNamaSekolahIsi(nama?: string): string {
  if (!nama) return 'SDN 1 Pekutatan';
  const trimmed = nama.trim();
  if (
    /^sd\s*(negeri)?\s*1\s*pekutatan$/i.test(trimmed) ||
    /^sekolah\s*dasar\s*negeri\s*1\s*pekutatan$/i.test(trimmed)
  ) {
    return 'SDN 1 Pekutatan';
  }
  return trimmed
    .replace(/SD NEGERI 1 PEKUTATAN/gi, 'SDN 1 Pekutatan')
    .replace(/SDN 1 PEKUTATAN/gi, 'SDN 1 Pekutatan');
}

/**
 * Helper untuk memformat jabatan penandatangan Kepala Sekolah pada seluruh TTD.
 * Mengubah jabatan default "Kepala Sekolah" menjadi "Kepala [Nama Sekolah]"
 * sesuai identitas sekolah pada pengaturan (contoh: "Kepala SDN 1 Pekutatan").
 */
export function formatJabatanPenandatangan(
  jabatan: string | undefined,
  namaSekolah: string | undefined
): string {
  const schoolName = formatNamaSekolahIsi(namaSekolah);
  const targetJabatan = `Kepala ${schoolName}`;

  if (!jabatan || !jabatan.trim()) {
    return targetJabatan;
  }

  const trimmed = jabatan.trim();

  // Jika literal "Kepala Sekolah"
  if (/^kepala\s+sekolah$/i.test(trimmed)) {
    return targetJabatan;
  }

  // Jika diawali "Kepala Sekolah ..."
  if (/^kepala\s+sekolah\s+/i.test(trimmed)) {
    return trimmed.replace(/^kepala\s+sekolah\s+/i, `Kepala `);
  }

  // Jika berisi nama sekolah kapital lama "Kepala SD NEGERI 1 PEKUTATAN"
  if (/^kepala\s+(sd\s*(negeri)?\s*1\s*pekutatan)/i.test(trimmed)) {
    return targetJabatan;
  }

  // Jika hanya kata "Kepala"
  if (/^kepala$/i.test(trimmed)) {
    return targetJabatan;
  }

  return trimmed;
}

/**
 * Downloads content as an MS Word (.doc) file with exact A4 or F4 layout, margins, and styles matching PDF
 */
export function exportToWord(
  filename: string,
  htmlContent: string,
  paperSize: PaperSize = 'A4',
  orientation: 'portrait' | 'landscape' = 'portrait'
) {
  const isF4 = paperSize === 'F4';
  const isLandscape = orientation === 'landscape';

  // Check whether this document is a student or PTK attendance register
  const isPresensiSiswa =
    /presensi_siswa|absen.*siswa|daftar hadir.*peserta didik/i.test(filename) ||
    /absen-siswa|peserta didik/i.test(htmlContent);

  const isPresensiPTK =
    !isPresensiSiswa &&
    (/absen|presensi/i.test(filename) || /absen-ptk|absen-guru/i.test(htmlContent));

  // If orientation is explicitly provided, honor it; otherwise for general attendance default to landscape
  const effectiveOrientation: 'portrait' | 'landscape' = orientation
    ? orientation
    : isPresensiPTK
    ? 'landscape'
    : 'portrait';

  const isEffectiveLandscape = effectiveOrientation === 'landscape';

  const paperWidth = isEffectiveLandscape
    ? (isF4 ? '33.0cm' : '29.7cm')
    : (isF4 ? '21.5cm' : '21.0cm');
  const paperHeight = isEffectiveLandscape
    ? (isF4 ? '21.5cm' : '21.0cm')
    : (isF4 ? '33.0cm' : '29.7cm');

  const widthDxa = isEffectiveLandscape ? (isF4 ? '18709' : '16838') : (isF4 ? '12189' : '11906');
  const heightDxa = isEffectiveLandscape ? (isF4 ? '12189' : '11906') : (isF4 ? '18709' : '16838');

  // Margin settings based on requirements:
  // 1. Presensi Siswa: left 3 cm, right 1 cm, top 1 cm, bottom 2 cm
  // 2. Surat Keluar & other documents: left 3 cm, right 2 cm, top 1 cm, bottom 2 cm
  let topDxa = '567'; // 1 cm = 567 dxa
  let bottomDxa = '1134'; // 2 cm = 1134 dxa
  let leftDxa = '1701'; // 3 cm = 1701 dxa
  let rightDxa = '1134'; // 2 cm = 1134 dxa
  let pageMarginCss = '1cm 2cm 2cm 3cm'; // top right bottom left

  if (isPresensiSiswa) {
    topDxa = '567'; // top: 1 cm
    rightDxa = '567'; // right: 1 cm
    bottomDxa = '1134'; // bottom: 2 cm
    leftDxa = '1701'; // left: 3 cm
    pageMarginCss = '1cm 1cm 2cm 3cm';
  } else if (isPresensiPTK && isEffectiveLandscape) {
    topDxa = '227';
    rightDxa = '397';
    bottomDxa = '198';
    leftDxa = '397';
    pageMarginCss = '0.4cm 0.7cm 0.35cm 0.7cm';
  }

  const sectPrXml = `<!--[if gte mso 9]>
    <p class="MsoNormal" style="margin: 0; line-height: 0; font-size: 1pt; mso-line-height-rule: exactly;">
      <span style="mso-element:section-pr">
        <w:SectPr>
          <w:pgSz w:w="${widthDxa}" w:h="${heightDxa}" w:orient="${effectiveOrientation}" />
          <w:pgMar w:top="${topDxa}" w:right="${rightDxa}" w:bottom="${bottomDxa}" w:left="${leftDxa}" w:header="120" w:footer="120" w:gutter="0" />
        </w:SectPr>
      </span>
    </p>
    <![endif]-->`;

  // Pattern to detect multi-page attendance or document breaks
  const pageBreakPattern = /(?:<div[^>]*class=["'][^"']*page-break[^"']*["'][^>]*>[\s\S]*?<\/div>|<br[^>]*mso-break-type:\s*section-break[^>]*>|<br[^>]*class=["'][^"']*page-break[^"']*["'][^>]*>|<!--\s*PAGE_BREAK\s*-->)/gi;

  let bodyContent = '';
  if (/class=["']Section\d+["']/i.test(htmlContent)) {
    // If sections are already defined in HTML
    bodyContent = htmlContent;
  } else if (pageBreakPattern.test(htmlContent)) {
    // Split into individual pages and wrap all inside Section1 with Word page breaks so orientation is preserved across all pages
    const rawPages = htmlContent
      .split(pageBreakPattern)
      .map((p) => p.trim())
      .filter((p) => p.length > 0);

    bodyContent = `
    <div class="Section1">
      ${rawPages
        .map((pageHtml, idx) => {
          const isFirst = idx === 0;
          return `
      ${!isFirst ? `<br clear="all" style="page-break-before: always; mso-special-character: line-break; clear: both;" />` : ''}
      <div class="page-container" style="width: 100%; page-break-inside: avoid;">
        ${pageHtml}
      </div>
          `;
        })
        .join('\n')}
      ${sectPrXml}
    </div>
    `;
  } else {
    // Single page document
    bodyContent = `
    <div class="Section1">
      ${htmlContent}
      ${sectPrXml}
    </div>
    `;
  }

  const isSuratKeputusanDoc =
    htmlContent.includes('is-surat-keputusan') ||
    htmlContent.includes('Bookman') ||
    filename.toLowerCase().includes('surat_keputusan');

  const defaultWordFont = isSuratKeputusanDoc
    ? "'Bookman Old Style', 'Bookman', 'URW Bookman L', serif"
    : "'Times New Roman', Times, serif";
  const defaultWordFontSize = isSuratKeputusanDoc
    ? '12.0pt'
    : isPresensiSiswa
    ? (isEffectiveLandscape ? '8.0pt' : '7.0pt')
    : (isPresensiPTK ? '7.0pt' : '12.0pt');

  const wordDocHtml = `<!DOCTYPE html>
<html xmlns:v="urn:schemas-microsoft-com:vml"
      xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns:m="http://schemas.microsoft.com/office/2004/12/omml"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
  <meta name="ProgId" content="Word.Document">
  <meta name="Generator" content="Microsoft Word 15">
  <meta name="Originator" content="Microsoft Word 15">
  <title>${filename}</title>
  <!--[if gte mso 9]>
  <xml>
    <w:WordDocument>
      <w:View>Print</w:View>
      <w:Zoom>100</w:Zoom>
      <w:DoNotOptimizeForBrowser/>
      <w:ValidateAgainstSchemas/>
      <w:SaveIfXMLInvalid>false</w:SaveIfXMLInvalid>
      <w:IgnoreMixedContent>false</w:IgnoreMixedContent>
      <w:AlwaysShowPlaceholderText>false</w:AlwaysShowPlaceholderText>
      <w:Compatibility>
        <w:BreakWrappedTables/>
        <w:SnapToGridInCell/>
        <w:WrapTextWithPunct/>
        <w:UseAsianBreakRules/>
        <w:DontGrowAutofit/>
      </w:Compatibility>
    </w:WordDocument>
  </xml>
  <![endif]-->
  <style>
    @font-face {
      font-family: "Times New Roman";
      panose-1: 2 2 6 3 5 4 5 2 3 4;
    }
    @page {
      size: ${paperWidth} ${paperHeight};
      margin: ${pageMarginCss};
      mso-page-orientation: ${effectiveOrientation};
      mso-header-margin: 10pt;
      mso-footer-margin: 10pt;
      mso-paper-source: 0;
    }
    ${Array.from({ length: 40 }, (_, i) => {
      const s = i + 1;
      return `
    @page Section${s} {
      size: ${paperWidth} ${paperHeight};
      margin: ${pageMarginCss};
      mso-page-orientation: ${effectiveOrientation};
      mso-header-margin: 10pt;
      mso-footer-margin: 10pt;
      mso-paper-source: 0;
    }
    div.Section${s} {
      page: Section${s};
      width: 100%;
    }
    @page WordSection${s} {
      size: ${paperWidth} ${paperHeight};
      margin: ${pageMarginCss};
      mso-page-orientation: ${effectiveOrientation};
      mso-header-margin: 10pt;
      mso-footer-margin: 10pt;
      mso-paper-source: 0;
    }
    div.WordSection${s} {
      page: WordSection${s};
      width: 100%;
    }`;
    }).join('\n')}
    body {
      font-family: ${defaultWordFont};
      font-size: ${defaultWordFontSize};
      line-height: 1.15;
      color: #000000;
      background-color: #ffffff;
      margin: 0;
      padding: 0;
    }
    p, p.MsoNormal, li.MsoNormal, div.MsoNormal {
      margin-top: 0pt;
      margin-bottom: 2pt;
      font-family: ${defaultWordFont};
      font-size: ${defaultWordFontSize};
      line-height: 1.15;
      color: #000000;
      mso-pagination: widow-orphan;
    }
    .nomor-sk, .nomor-surat {
      font-size: 11.0pt !important;
    }
    h1, h2, h3, h4, h5, h6 {
      font-family: ${defaultWordFont};
      color: #000000;
      margin-top: 0pt;
      margin-bottom: 1pt;
    }
    table {
      border-collapse: collapse;
      mso-table-lspace: 0pt;
      mso-table-rspace: 0pt;
      mso-table-bspace: 0pt;
      mso-table-tspace: 0pt;
      font-family: ${defaultWordFont};
      mso-padding-alt: 0pt 1pt 0pt 1pt;
    }
    td, th {
      font-family: ${defaultWordFont};
      vertical-align: middle;
      word-wrap: break-word;
    }
    .kop-surat-table, .kop-surat-table tr, .kop-surat-table td {
      border: none !important;
      padding: 0pt !important;
      line-height: normal !important;
      mso-line-height-rule: at-least !important;
    }
    .kop-surat-table p, .kop-surat-table div {
      margin-top: 0pt !important;
      margin-bottom: 0pt !important;
      line-height: 1.2 !important;
      mso-line-height-rule: at-least !important;
    }
    .absen-ptk-table, .absen-ptk-rekap-table {
      width: 100% !important;
      border-collapse: collapse !important;
      table-layout: fixed !important;
      mso-table-layout-alt: fixed !important;
      mso-padding-alt: 1pt 2pt 1pt 2pt !important;
    }
    .absen-ptk-table tr, .absen-ptk-rekap-table tr {
      page-break-inside: avoid !important;
    }
    .absen-ptk-table th, .absen-ptk-table td {
      font-family: 'Times New Roman', Times, serif !important;
      font-size: 6.5pt !important;
      padding: 1pt 2pt !important;
      vertical-align: middle !important;
    }
    .absen-ptk-rekap-table th, .absen-ptk-rekap-table td {
      font-family: 'Times New Roman', Times, serif !important;
      font-size: 6.0pt !important;
      padding: 0pt 1pt !important;
      vertical-align: middle !important;
    }
    .absen-ptk-kolektif-sheet {
      page-break-inside: auto !important;
    }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .text-justify { text-align: justify; }
    .font-bold { font-weight: bold; }
    .underline { text-decoration: underline; }
    .page-break {
      page-break-before: always;
      break-before: page;
      clear: both;
    }
  </style>
</head>
<body lang="ID" style="tab-interval:36.0pt">
  ${bodyContent}
</body>
</html>`;

  const blob = new Blob(['\ufeff', wordDocHtml], {
    type: 'application/msword;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.doc') ? filename : `${filename}.doc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Triggers native browser print window with custom title and paper size (A4 / F4)
 */
export function printHtmlElement(
  elementId: string,
  title: string = 'Cetak Dokumen',
  paperSize: PaperSize = 'A4'
) {
  const content = document.getElementById(elementId);
  if (!content) {
    alert('Dokumen untuk dicetak tidak ditemukan.');
    return;
  }

  const printWindow = window.open('', '_blank', 'width=900,height=750');
  if (!printWindow) {
    window.print();
    return;
  }

  const pageSizeRule = paperSize === 'F4' ? '215mm 330mm' : '210mm 297mm';

  const isSuratKeputusan =
    content.querySelector('.is-surat-keputusan') !== null ||
    /keputusan|sk/i.test(title) ||
    /KEPUTUSAN KEPALA SEKOLAH/i.test(content.innerHTML);

  // Margins as requested:
  // Surat Keputusan: Left 2cm, Top 1cm, Right 2cm, Bottom 2cm
  // Surat Keluar biasa: Left 3cm, Top 1cm, Right 2cm, Bottom 2cm
  const topMargin = '1cm';
  const rightMargin = '2cm';
  const bottomMargin = '2cm';
  const leftMargin = isSuratKeputusan ? '2cm' : '3cm';

  printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title></title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Tinos:ital,wght@0,400;0,700;1,400&display=swap" rel="stylesheet">
  <style>
    @page {
      size: ${pageSizeRule} portrait;
      margin: 0; /* Menghilangkan judul, tanggal/jam di atas dan about:blank di bawah */
    }
    @media print {
      @page {
        size: ${pageSizeRule} portrait;
        margin: 0; /* Menghilangkan header & footer otomatis browser */
      }
      html, body {
        width: 100% !important;
        margin: 0 !important;
        padding: 0 !important;
        background: #ffffff !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      body {
        padding-top: ${topMargin} !important;
        padding-right: ${rightMargin} !important;
        padding-bottom: ${bottomMargin} !important;
        padding-left: ${leftMargin} !important;
        box-sizing: border-box !important;
      }
      .page-break {
        page-break-before: always !important;
        break-before: page !important;
        padding-top: ${topMargin} !important;
      }
      table {
        page-break-inside: auto;
      }
      tr {
        page-break-inside: avoid;
        page-break-after: auto;
      }
      thead {
        display: table-header-group;
      }
      tfoot {
        display: table-footer-group;
      }
      .ttd-table, .ttd-block {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
      p, ol, ul {
        orphans: 2;
        widows: 2;
      }
    }
    body {
      font-family: 'Tinos', 'Times New Roman', serif;
      font-size: 12pt;
      line-height: 1.35;
      color: #000000;
      padding: ${topMargin} ${rightMargin} ${bottomMargin} ${leftMargin};
      max-width: 820px;
      margin: 0 auto;
      box-sizing: border-box;
    }
    p {
      margin-top: 0;
      margin-bottom: 4pt;
      line-height: 1.35;
      font-size: 12pt;
    }
    table {
      border-collapse: collapse;
      width: 100%;
      font-size: 12pt;
    }
    th, td {
      padding: 1.5pt 3pt;
      vertical-align: top;
      font-size: 12pt;
    }
    td p {
      margin: 0;
      font-size: 12pt;
    }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .text-justify { text-align: justify; }
    .font-bold { font-weight: bold; }
    .underline { text-decoration: underline; }
    .nomor-surat, .nomor-sk {
      font-size: 11pt !important;
    }
    .is-surat-keputusan, .is-surat-keputusan * {
      font-family: 'Bookman Old Style', 'Bookman', 'URW Bookman L', serif !important;
    }
    .is-surat-keputusan {
      font-size: 12pt !important;
    }
    .is-surat-keputusan .nomor-sk {
      font-size: 11pt !important;
    }
  </style>
</head>
<body>
  ${content.innerHTML}
  <script>
    window.onload = function() {
      document.title = "";
      setTimeout(function() {
        window.print();
        window.close();
      }, 400);
    };
  </script>
</body>
</html>`);
  printWindow.document.close();
}

/**
 * Helper to render Menimbang, Mengingat, Memperhatikan in Surat Keputusan
 * Supports array of items ({ id, poin, isi }) or multi-line string with hanging indent table
 */
function formatSkKonsideranHtml(
  list?: Array<{ id?: string; poin?: string; isi?: string }>,
  fallbackText?: string,
  defaultPrefixType: 'alphabet' | 'number' = 'number'
): string {
  if (Array.isArray(list) && list.length > 0) {
    const validItems = list.filter((item) => item && (item.isi?.trim() || item.poin?.trim()));
    if (validItems.length > 0) {
      return `
        <table style="width: 100%; border: none; border-collapse: collapse; margin: 0; padding: 0; line-height: 1.45;" border="0" cellpadding="0" cellspacing="0">
          ${validItems
            .map((item, idx) => {
              const defaultPoin =
                defaultPrefixType === 'alphabet'
                  ? `${String.fromCharCode(97 + idx)}.`
                  : `${idx + 1}.`;
              const poinStr = item.poin?.trim() ? item.poin : defaultPoin;
              return `
              <tr>
                <td style="width: 22pt; vertical-align: top; border: none; padding: 1.5pt 0; font-family: inherit; font-size: 12pt;">${poinStr}</td>
                <td style="text-align: justify; vertical-align: top; border: none; padding: 1.5pt 0; white-space: pre-line; font-family: inherit; font-size: 12pt;">${item.isi || ''}</td>
              </tr>
            `;
            })
            .join('')}
        </table>
      `;
    }
  }

  if (fallbackText && fallbackText.trim()) {
    const lines = fallbackText
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length > 1) {
      return `
        <table style="width: 100%; border: none; border-collapse: collapse; margin: 0; padding: 0; line-height: 1.45;" border="0" cellpadding="0" cellspacing="0">
          ${lines
            .map((line, idx) => {
              const match = line.match(/^([a-z0-9]+[\.\)])\s*(.*)$/i);
              const defaultPoin =
                defaultPrefixType === 'alphabet'
                  ? `${String.fromCharCode(97 + idx)}.`
                  : `${idx + 1}.`;
              const poinStr = match ? match[1] : defaultPoin;
              const isiStr = match ? match[2] : line;
              return `
              <tr>
                <td style="width: 22pt; vertical-align: top; border: none; padding: 1.5pt 0; font-family: inherit; font-size: 12pt;">${poinStr}</td>
                <td style="text-align: justify; vertical-align: top; border: none; padding: 1.5pt 0; white-space: pre-line; font-family: inherit; font-size: 12pt;">${isiStr}</td>
              </tr>
            `;
            })
            .join('')}
        </table>
      `;
    }
    return `<div style="text-align: justify; white-space: pre-line; font-family: inherit; font-size: 12pt;">${fallbackText}</div>`;
  }

  return '';
}

export interface ResolvedKepalaSekolah {
  nama: string;
  nip: string;
  pangkat: string;
  jabatan: string;
  nuptk: string;
}

/**
 * Standardize Headmaster (Kepala Sekolah) identity source across all outgoing letters
 * Synchronizes data from PTK Kepala Sekolah (guruList) and Pengaturan Sekolah (sekolah)
 */
export function resolveKepalaSekolahData(
  sekolah?: Partial<PengaturanSekolah>,
  guruList?: Guru[],
  surat?: Partial<SuratKeluar>
): ResolvedKepalaSekolah {
  // 1. Cari data PTK Kepala Sekolah dari guruList
  const kepsekPtk = guruList?.find(
    (g) => g.jenisPtk === 'kepala_sekolah' || /kepala\s+sekolah/i.test(g.jabatan || '')
  );

  // 2. Tentukan nama kepala sekolah
  let nama = 'Gede Ariasa, S.Pd';
  if (sekolah?.kepalaSekolah && sekolah.kepalaSekolah.trim()) {
    nama = sekolah.kepalaSekolah.trim();
  } else if (kepsekPtk?.nama && kepsekPtk.nama.trim()) {
    nama = kepsekPtk.nama.trim();
  } else if (surat?.penandatangan && surat.penandatangan.trim()) {
    nama = surat.penandatangan.trim();
  }

  // 3. Tentukan NIP kepala sekolah
  let nip = '198906232014031002';
  if (sekolah?.nipKepalaSekolah && sekolah.nipKepalaSekolah.trim()) {
    nip = sekolah.nipKepalaSekolah.trim();
  } else if (kepsekPtk?.nip && kepsekPtk.nip.trim()) {
    nip = kepsekPtk.nip.trim();
  } else if (surat?.nipPenandatangan && surat.nipPenandatangan.trim()) {
    nip = surat.nipPenandatangan.trim();
  }

  // 4. Tentukan Pangkat / Golongan kepala sekolah
  let pangkat = '';
  if (sekolah?.pangkatKepalaSekolah && sekolah.pangkatKepalaSekolah.trim()) {
    pangkat = sekolah.pangkatKepalaSekolah.trim();
  } else if (kepsekPtk?.pangkatGol && kepsekPtk.pangkatGol.trim()) {
    pangkat = kepsekPtk.pangkatGol.trim();
  } else if ((sekolah as any)?.pangkatGolonganKepalaSekolah) {
    pangkat = (sekolah as any).pangkatGolonganKepalaSekolah.trim();
  } else {
    pangkat = 'Penata, III/c';
  }

  // 5. Tentukan Jabatan
  const schoolName = formatNamaSekolahIsi(sekolah?.namaSekolah);
  const jabatan = (surat?.jabatanPenandatangan && surat.jabatanPenandatangan.trim())
    || kepsekPtk?.jabatan?.trim()
    || `Kepala ${schoolName}`;

  return {
    nama,
    nip,
    pangkat,
    jabatan,
    nuptk: kepsekPtk?.nuptk || '',
  };
}

export interface KepadaYthBlockOptions {
  tujuan: string;
  instansi?: string;
  tempat?: string;
  tujuanList?: string[];
  fontSize?: string;
}

/**
 * Intelligently extracts individual recipient names from a single tujuan string or explicit tujuanList array.
 * Cleans up existing numeric prefixes (e.g. '1.', '2)', '-') to prevent double-numbering.
 */
export function extractTujuanRecipients(tujuan?: string, explicitList?: string[]): string[] {
  if (Array.isArray(explicitList) && explicitList.length > 0) {
    const cleaned = explicitList
      .map((item) => (typeof item === 'string' ? item : '').trim())
      .filter((item) => item.length > 0)
      .map((item) => item.replace(/^[0-9]+[\.\)]\s*/, '').trim())
      .filter((item) => item.length > 0);
    if (cleaned.length > 0) {
      return cleaned;
    }
  }

  if (!tujuan) return [];

  const raw = tujuan.trim();
  if (!raw) return [];

  // Check if multiline
  if (raw.includes('\n')) {
    const lines = raw
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0)
      .map((l) => l.replace(/^[0-9]+[\.\)]\s*/, '').trim())
      .filter((l) => l.length > 0);
    if (lines.length > 1) {
      return lines;
    }
  }

  // Check if contains numbered pattern e.g. "1. Dewan Guru 2. Komite Sekolah"
  if (/(?:^|\s+)1[\.\)]\s+.*(?:^|\s+)2[\.\)]\s+/i.test(raw)) {
    const parts = raw
      .split(/(?=(?:^|\s+)[0-9]+[\.\)]\s+)/)
      .map((p) => p.replace(/^[0-9]+[\.\)]\s*/, '').trim())
      .filter((p) => p.length > 0);
    if (parts.length > 1) {
      return parts;
    }
  }

  // Check if separated by semicolon e.g. "Dewan Guru; Komite Sekolah; Pengawas Sekolah"
  if (raw.includes(';')) {
    const parts = raw
      .split(';')
      .map((p) => p.trim())
      .filter((p) => p.length > 0)
      .map((p) => p.replace(/^[0-9]+[\.\)]\s*/, '').trim())
      .filter((p) => p.length > 0);
    if (parts.length > 1) {
      return parts;
    }
  }

  return [raw.replace(/^[0-9]+[\.\)]\s*/, '').trim()];
}

/**
 * Standardize 'Kepada Yth.' layout across all outgoing letters:
 * Renders on the right side of the paper (using a 2-column table: 52% left empty, 48% right content).
 * If there are multiple recipients (> 1 person), renders a clean numbered list:
 * Kepada Yth.
 * 1. Dewan guru
 * 2. Komite sekolah
 * 3. Pengawas sekolah
 * di -
 *   Tempat
 * (Without any "Bapak/Ibu/Saudara:" line)
 */
export function buildKepadaYthBlock(options: KepadaYthBlockOptions): string {
  const fs = options.fontSize || '11.5pt';
  const tempat = options.tempat || 'Tempat';

  const list = extractTujuanRecipients(options.tujuan, options.tujuanList);

  let isiHtml = '';
  if (list.length > 1) {
    isiHtml = `
      <p style="margin: 0; text-align: left; font-size: ${fs};">Kepada Yth.</p>
      <ol style="margin: 2.5pt 0 4pt 16pt; padding: 0; font-size: ${fs}; text-align: left; list-style-type: decimal;">
        ${list.map((t) => `<li style="margin-bottom: 2pt; font-size: ${fs}; text-align: left;">${t}</li>`).join('')}
      </ol>
      <p style="margin: 1.5pt 0 0 0; text-align: left; font-size: ${fs};">di -</p>
      <p style="margin: 1.5pt 0 0 16pt; text-decoration: underline; text-align: left; font-size: ${fs};">${tempat}</p>
    `;
  } else {
    const singleTujuan = list[0] || options.tujuan || 'Kepala Sekolah';
    isiHtml = `
      <p style="margin: 0; text-align: left; font-size: ${fs};">Kepada</p>
      <p style="margin: 1.5pt 0 0 0; font-weight: bold; text-align: left; font-size: ${fs};">Yth. ${singleTujuan}</p>
      ${options.instansi ? `<p style="margin: 1.5pt 0 0 0; text-align: left; font-size: ${fs};">${options.instansi}</p>` : ''}
      <p style="margin: 1.5pt 0 0 0; text-align: left; font-size: ${fs};">di -</p>
      <p style="margin: 1.5pt 0 0 18pt; text-decoration: underline; text-align: left; font-size: ${fs};">${tempat}</p>
    `;
  }

  return `
    <!-- Format Standar Kepada Yth: Sisi Kanan Kertas (Tabel 2 Kolom) -->
    <table class="kepada-yth-table" style="width: 100%; border: none; border-collapse: collapse; margin: 10pt 0 14pt 0;" border="0" cellpadding="0" cellspacing="0">
      <tr>
        <td style="width: 52%; border: none;">&nbsp;</td>
        <td style="width: 48%; text-align: left; vertical-align: top; border: none; padding: 0 0 0 8pt; font-size: ${fs}; line-height: 1.4;">
          ${isiHtml}
        </td>
      </tr>
    </table>
  `;
}

/**
 * Generates official HTML string for letter templates
 * Format is designed to render pixel-identically in PDF, browser preview, and MS Word (.doc)
 */
export function buildSuratHtml(surat: SuratKeluar, sekolah: PengaturanSekolah, guruList?: Guru[]): string {
  const tglIndo = formatTanggalIndonesia(surat.tglSurat);
  const data = surat.dataKhusus || {};
  const schoolNameIsi = formatNamaSekolahIsi(sekolah?.namaSekolah);
  const kepsek = resolveKepalaSekolahData(sekolah, guruList, surat);

  let badanSurat = '';
  let customTtdBlock = '';

  switch (surat.jenisSurat) {
    case 'surat_ijin_guru': {
      const tglMulai = data.tglMulai || surat.tglSurat;
      const tglSelesai = data.tglSelesai || tglMulai;
      const isSatuHari = !data.tglSelesai || data.tglMulai === data.tglSelesai;

      const tglMulaiFormatted = formatTanggalIndonesia(tglMulai);
      const tglSelesaiFormatted = formatTanggalIndonesia(tglSelesai);
      const hariMulai = getNamaHariIndonesia(tglMulai);

      let kalimatIzin = '';
      if (isSatuHari) {
        if (hariMulai) {
          kalimatIzin = `pada hari <strong>${hariMulai}</strong>, tanggal <strong>${tglMulaiFormatted}</strong> (selama 1 hari)`;
        } else {
          kalimatIzin = `pada tanggal <strong>${tglMulaiFormatted}</strong> (selama 1 hari)`;
        }
      } else {
        let durasiText = '';
        try {
          const d1 = new Date(tglMulai.split('T')[0]);
          const d2 = new Date(tglSelesai.split('T')[0]);
          const diffTime = d2.getTime() - d1.getTime();
          const days = Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;
          if (days > 1) {
            durasiText = ` (selama ${days} hari)`;
          }
        } catch {}

        kalimatIzin = `terhitung mulai tanggal <strong>${tglMulaiFormatted}</strong> sampai dengan tanggal <strong>${tglSelesaiFormatted}</strong>${durasiText}`;
      }

      const hasGuruPengganti = Boolean(
        data.guruPengganti &&
        data.guruPengganti.trim() !== '' &&
        data.guruPengganti.trim() !== '-' &&
        !/^tidak\s*ada$/i.test(data.guruPengganti.trim()) &&
        !/^tanpa\s*guru/i.test(data.guruPengganti.trim())
      );

      badanSurat = `
        <!-- Judul Surat Paling Atas (Tanpa Perihal dan Tanpa Lampiran) -->
        <div style="text-align: center; margin-top: 4pt; margin-bottom: 18pt;">
          <p style="margin: 0; text-align: center; font-size: 13.5pt; font-weight: bold; text-decoration: underline; letter-spacing: 0.5px;">SURAT PERMOHONAN TIDAK MASUK SEKOLAH</p>
        </div>

        <!-- Diikuti Kepada Yth Setelahnya (Format Rapi Sisi Kanan Kertas) -->
        ${buildKepadaYthBlock({
          tujuan: `Kepala ${schoolNameIsi}`,
          tempat: 'Tempat',
          fontSize: '12pt',
        })}

        <p style="text-align: justify; margin-top: 14pt; margin-bottom: 8pt; line-height: 1.45; font-size: 12pt;">
          Dengan hormat,<br>
          Saya yang bertanda tangan di bawah ini:
        </p>

        <table style="margin-left: 20pt; margin-bottom: 12pt; width: 92%; border: none; border-collapse: collapse; line-height: 1.45; font-size: 12pt;" border="0" cellpadding="0" cellspacing="0">
          <tr>
            <td style="width: 145pt; padding: 2pt 0; vertical-align: top; border: none; font-size: 12pt;">Nama Lengkap</td>
            <td style="width: 15pt; padding: 2pt 0; vertical-align: top; border: none; font-size: 12pt;">:</td>
            <td style="padding: 2pt 0; vertical-align: top; font-weight: bold; border: none; font-size: 12pt;">${data.namaGuru || '-'}</td>
          </tr>
          <tr>
            <td style="padding: 2pt 0; vertical-align: top; border: none; font-size: 12pt;">NIP / NUPTK</td>
            <td style="padding: 2pt 0; vertical-align: top; border: none; font-size: 12pt;">:</td>
            <td style="padding: 2pt 0; vertical-align: top; border: none; font-size: 12pt;">${data.nipGuru || '-'}</td>
          </tr>
          <tr>
            <td style="padding: 2pt 0; vertical-align: top; border: none; font-size: 12pt;">Pangkat / Golongan</td>
            <td style="padding: 2pt 0; vertical-align: top; border: none; font-size: 12pt;">:</td>
            <td style="padding: 2pt 0; vertical-align: top; border: none; font-size: 12pt;">${data.pangkatGol || '-'}</td>
          </tr>
          <tr>
            <td style="padding: 2pt 0; vertical-align: top; border: none; font-size: 12pt;">Jabatan</td>
            <td style="padding: 2pt 0; vertical-align: top; border: none; font-size: 12pt;">:</td>
            <td style="padding: 2pt 0; vertical-align: top; border: none; font-size: 12pt;">${data.jabatan || 'Guru Kelas'}</td>
          </tr>
          <tr>
            <td style="padding: 2pt 0; vertical-align: top; border: none; font-size: 12pt;">Unit Kerja</td>
            <td style="padding: 2pt 0; vertical-align: top; border: none; font-size: 12pt;">:</td>
            <td style="padding: 2pt 0; vertical-align: top; border: none; font-size: 12pt;">${sekolah.namaSekolah}</td>
          </tr>
        </table>

        <p style="text-align: justify; margin-bottom: 8pt; line-height: 1.45; font-size: 12pt;">
          Dengan ini mengajukan permohonan izin untuk tidak masuk sekolah / mengajar ${kalimatIzin} dikarenakan: ${data.alasan || surat.perihal || 'ada keperluan mendesak'}.
        </p>

        ${hasGuruPengganti ? `
        <p style="text-align: justify; margin-bottom: 8pt; line-height: 1.45; font-size: 12pt;">
          Terkait pelaksanaan tugas mengajar dan ketertiban peserta didik di kelas selama saya tidak masuk sekolah, telah saya koordinasikan dan diserahkan kepada rekan guru pengganti, yaitu: <strong>${data.guruPengganti.trim()}</strong>.
        </p>
        ` : ''}

        <p style="text-align: justify; margin-top: 10pt; line-height: 1.45; font-size: 12pt;">
          Demikian surat permohonan izin ini saya sampaikan dengan sesungguhnya. Atas perhatian, pengertian, dan izin yang Bapak/Ibu Kepala Sekolah berikan, saya sampaikan terima kasih.
        </p>
      `;

      // 2 Kolom TTD: Menyetujui KS di kiri, Pemohon di kanan via tabel asli agar tidak berantakan di Word
      customTtdBlock = `
        <table class="ttd-table" style="width: 100%; margin-top: 24pt; border: none; border-collapse: collapse; font-size: 12pt;" border="0" cellpadding="0" cellspacing="0">
          <tr>
            <td style="width: 50%; text-align: center; vertical-align: top; border: none; font-size: 12pt;">
              <p style="margin: 0; font-weight: bold; text-align: center; font-size: 12pt;">Menyetujui,</p>
              <p style="margin: 1pt 0 0 0; text-align: center; font-size: 12pt;">Kepala ${schoolNameIsi},</p>
              <div style="height: 55pt;">&nbsp;</div>
              <p style="margin: 0; font-weight: bold; text-decoration: underline; text-align: center; font-size: 12pt;">${kepsek.nama}</p>
              ${kepsek.pangkat ? `<p style="margin: 1.5pt 0 0 0; font-size: 11pt; text-align: center;">${kepsek.pangkat}</p>` : ''}
              <p style="margin: 1.5pt 0 0 0; font-size: 11pt; text-align: center;">NIP. ${kepsek.nip}</p>
            </td>
            <td style="width: 50%; text-align: center; vertical-align: top; border: none; font-size: 12pt;">
              <p style="margin: 0; text-align: center; font-size: 12pt;">${sekolah.desa || 'Pekutatan'}, ${tglIndo}</p>
              <p style="margin: 1pt 0 0 0; font-weight: bold; text-align: center; font-size: 12pt;">Pemohon,</p>
              <div style="height: 55pt;">&nbsp;</div>
              <p style="margin: 0; font-weight: bold; text-decoration: underline; text-align: center; font-size: 12pt;">${data.namaGuru || '-'}</p>
              ${data.pangkatGol && data.pangkatGol !== '-' ? `<p style="margin: 1.5pt 0 0 0; font-size: 11pt; text-align: center;">${data.pangkatGol}</p>` : ''}
              <p style="margin: 1.5pt 0 0 0; font-size: 11pt; text-align: center;">${data.nipGuru && data.nipGuru !== '-' ? `NIP. ${data.nipGuru}` : ''}</p>
            </td>
          </tr>
        </table>
      `;
      break;
    }

    case 'surat_keterangan': {
      const cleanKec = (sekolah.kecamatan || 'Pekutatan').replace(/^kecamatan\s+/i, '').trim();
      const cleanKab = (sekolah.kabupaten || 'Jembrana').replace(/^kabupaten\s+/i, '').trim();
      const prov = (sekolah.provinsi || 'Bali').trim();
      const isSiswa = data.jenisSubjek === 'siswa';
      const subjekList: any[] = Array.isArray(data.subjekList) && data.subjekList.length > 0
        ? data.subjekList
        : [
            {
              nama: data.namaSubjek || '',
              nisnNip: data.nisnNip || '',
              kelasJabatan: data.kelasJabatan || '',
              tempatTglLahir: data.tempatTglLahir || '',
              namaOrtu: data.namaOrtu || '',
              alamat: data.alamat || '',
            },
          ];

      const isMulti = subjekList.length > 1;

      // FORMAT IDENTITAS: Tanpa tabel grid / border kotak sama sekali sesuai permintaan resmi kedinasan
      let subjekHtml = '';
      if (isMulti) {
        subjekHtml = `
          <p style="text-align: justify; margin: 0 0 10pt 0; line-height: 1.4;">
            Yang bertanda tangan di bawah ini Kepala ${schoolNameIsi}, Kecamatan ${cleanKec}, Kabupaten ${cleanKab}, Provinsi ${prov}, menerangkan dengan sebenarnya bahwa nama-nama di bawah ini:
          </p>

          <div style="margin-left: 16pt; margin-bottom: 12pt;">
            ${subjekList.map((p, idx) => `
              <div style="margin-bottom: 8pt; page-break-inside: avoid;">
                <table style="width: 100%; border: none; border-collapse: collapse; line-height: 1.4;" border="0" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="width: 22pt; padding: 1.5pt 0; vertical-align: top; font-weight: bold; border: none;">${idx + 1}.</td>
                    <td style="width: 145pt; padding: 1.5pt 0; vertical-align: top; border: none;">Nama Lengkap</td>
                    <td style="width: 15pt; padding: 1.5pt 0; vertical-align: top; border: none;">:</td>
                    <td style="padding: 1.5pt 0; vertical-align: top; font-weight: bold; border: none;">${p.nama || '-'}</td>
                  </tr>
                  <tr>
                    <td style="border: none;"></td>
                    <td style="padding: 1.5pt 0; vertical-align: top; border: none;">${isSiswa ? 'NISN / NIS' : 'NIP / NUPTK'}</td>
                    <td style="padding: 1.5pt 0; vertical-align: top; border: none;">:</td>
                    <td style="padding: 1.5pt 0; vertical-align: top; border: none;">${p.nisnNip || '-'}</td>
                  </tr>
                  ${p.tempatTglLahir ? `
                  <tr>
                    <td style="border: none;"></td>
                    <td style="padding: 1.5pt 0; vertical-align: top; border: none;">Tempat, Tanggal Lahir</td>
                    <td style="padding: 1.5pt 0; vertical-align: top; border: none;">:</td>
                    <td style="padding: 1.5pt 0; vertical-align: top; border: none;">${p.tempatTglLahir}</td>
                  </tr>
                  ` : ''}
                  <tr>
                    <td style="border: none;"></td>
                    <td style="padding: 1.5pt 0; vertical-align: top; border: none;">${isSiswa ? 'Kelas' : 'Jabatan'}</td>
                    <td style="padding: 1.5pt 0; vertical-align: top; border: none;">:</td>
                    <td style="padding: 1.5pt 0; vertical-align: top; border: none;">${p.kelasJabatan || '-'}</td>
                  </tr>
                  ${p.namaOrtu && p.namaOrtu !== '-' ? `
                  <tr>
                    <td style="border: none;"></td>
                    <td style="padding: 1.5pt 0; vertical-align: top; border: none;">Nama Orang Tua / Wali</td>
                    <td style="padding: 1.5pt 0; vertical-align: top; border: none;">:</td>
                    <td style="padding: 1.5pt 0; vertical-align: top; border: none;">${p.namaOrtu}</td>
                  </tr>
                  ` : ''}
                  ${p.alamat && p.alamat !== '-' ? `
                  <tr>
                    <td style="border: none;"></td>
                    <td style="padding: 1.5pt 0; vertical-align: top; border: none;">Alamat Domisili</td>
                    <td style="padding: 1.5pt 0; vertical-align: top; border: none;">:</td>
                    <td style="padding: 1.5pt 0; vertical-align: top; border: none;">${p.alamat}</td>
                  </tr>
                  ` : ''}
                </table>
              </div>
            `).join('')}
          </div>
        `;
      } else {
        const item = subjekList[0] || {};
        subjekHtml = `
          <p style="text-align: justify; margin: 0 0 10pt 0; line-height: 1.4;">
            Yang bertanda tangan di bawah ini Kepala ${schoolNameIsi}, Kecamatan ${cleanKec}, Kabupaten ${cleanKab}, Provinsi ${prov}, menerangkan dengan sebenarnya bahwa:
          </p>

          <table style="margin-left: 20pt; margin-bottom: 12pt; width: 92%; border: none; border-collapse: collapse; line-height: 1.45;" border="0" cellpadding="0" cellspacing="0">
            <tr>
              <td style="width: 155pt; padding: 1.5pt 0; vertical-align: top; border: none;">Nama Lengkap</td>
              <td style="width: 15pt; padding: 1.5pt 0; vertical-align: top; border: none;">:</td>
              <td style="padding: 1.5pt 0; vertical-align: top; font-weight: bold; border: none;">${item.nama || '-'}</td>
            </tr>
            <tr>
              <td style="padding: 1.5pt 0; vertical-align: top; border: none;">${isSiswa ? 'NISN / NIS' : 'NIP / NUPTK'}</td>
              <td style="padding: 1.5pt 0; vertical-align: top; border: none;">:</td>
              <td style="padding: 1.5pt 0; vertical-align: top; border: none;">${item.nisnNip || '-'}</td>
            </tr>
            ${item.tempatTglLahir ? `
            <tr>
              <td style="padding: 1.5pt 0; vertical-align: top; border: none;">Tempat, Tanggal Lahir</td>
              <td style="padding: 1.5pt 0; vertical-align: top; border: none;">:</td>
              <td style="padding: 1.5pt 0; vertical-align: top; border: none;">${item.tempatTglLahir}</td>
            </tr>
            ` : ''}
            <tr>
              <td style="padding: 1.5pt 0; vertical-align: top; border: none;">${isSiswa ? 'Kelas' : 'Jabatan'}</td>
              <td style="padding: 1.5pt 0; vertical-align: top; border: none;">:</td>
              <td style="padding: 1.5pt 0; vertical-align: top; border: none;">${item.kelasJabatan || '-'}</td>
            </tr>
            ${item.namaOrtu && item.namaOrtu !== '-' ? `
            <tr>
              <td style="padding: 1.5pt 0; vertical-align: top; border: none;">Nama Orang Tua / Wali</td>
              <td style="padding: 1.5pt 0; vertical-align: top; border: none;">:</td>
              <td style="padding: 1.5pt 0; vertical-align: top; border: none;">${item.namaOrtu}</td>
            </tr>
            ` : ''}
            ${item.alamat && item.alamat !== '-' ? `
            <tr>
              <td style="padding: 1.5pt 0; vertical-align: top; border: none;">Alamat Domisili</td>
              <td style="padding: 1.5pt 0; vertical-align: top; border: none;">:</td>
              <td style="padding: 1.5pt 0; vertical-align: top; border: none;">${item.alamat}</td>
            </tr>
            ` : ''}
          </table>
        `;
      }

      badanSurat = `
        <div style="text-align: center; margin: 12pt 0 16pt 0;">
          <p style="margin: 0; text-align: center; font-size: 12pt; font-weight: bold; text-decoration: underline;">SURAT KETERANGAN</p>
          <p class="nomor-surat" style="margin: 2pt 0 0 0; text-align: center; font-size: 11pt;">Nomor: ${surat.noSurat}</p>
        </div>

        ${subjekHtml}

        <p style="text-align: justify; margin-bottom: 8pt; line-height: 1.4; font-size: 12pt;">
          Adalah benar ${isMulti ? (isSiswa ? 'peserta didik yang terdaftar aktif' : 'pendidik / tenaga kependidikan aktif') : (isSiswa ? 'peserta didik yang terdaftar aktif' : 'pendidik / tenaga kependidikan aktif')} pada ${schoolNameIsi} Tahun Ajaran 2026/2027 dan berkelakuan baik serta mentaati segala tata tertib sekolah.
        </p>

        ${data.keperluan ? `
        <p style="text-align: justify; margin-bottom: 8pt; line-height: 1.4; font-size: 12pt;">
          Surat keterangan ini diberikan kepada yang bersangkutan untuk keperluan: <strong>${data.keperluan}</strong>.
        </p>
        ` : ''}

        <p style="text-align: justify; margin-top: 10pt; line-height: 1.4; font-size: 12pt;">
          Demikian surat keterangan ini kami buat dengan sebenarnya agar dapat dipergunakan sebagaimana mestinya oleh yang berkepentingan.
        </p>
      `;
      break;
    }

    case 'surat_undangan': {
      const kataPengantar = data.kataPengantar || 'Sehubungan dengan rencana pelaksanaan kegiatan dan evaluasi program pembelajaran sekolah, dengan ini kami mengharap kehadiran Bapak/Ibu/Saudara pada pertemuan dinas yang akan dilaksanakan pada:';
      const kalimatPenutup = data.kalimatPenutup || 'Mengingat sangat pentingnya acara tersebut di atas, kami sangat mengharapkan kehadiran Bapak/Ibu tepat pada waktunya. Atas perhatian dan kerja samanya kami ucapkan terima kasih.';

      const rawTujuanList: string[] = Array.isArray(data.tujuanList) && data.tujuanList.length > 0
        ? data.tujuanList.filter((t: string) => t && t.trim().length > 0)
        : (surat.tujuan ? [surat.tujuan] : []);

      const tujuanHtml = buildKepadaYthBlock({
        tujuan: surat.tujuan || 'Dewan Guru SDN 1 Pekutatan',
        tujuanList: rawTujuanList,
        tempat: 'Tempat',
        fontSize: '12pt',
      });

      badanSurat = `
        <table style="width: 100%; margin-bottom: 12pt; border: none; border-collapse: collapse; font-size: 12pt;" border="0" cellpadding="0" cellspacing="0">
          <tr>
            <td style="width: 75pt; padding: 1.5pt 0; vertical-align: top; border: none; font-size: 12pt;">Nomor</td>
            <td style="width: 12pt; padding: 1.5pt 0; vertical-align: top; border: none; font-size: 12pt;">:</td>
            <td class="nomor-surat" style="padding: 1.5pt 0; vertical-align: top; border: none; font-size: 11pt;">${surat.noSurat}</td>
            <td style="text-align: right; vertical-align: top; border: none; white-space: nowrap; font-size: 12pt;">${sekolah.desa || 'Pekutatan'}, ${tglIndo}</td>
          </tr>
          <tr>
            <td style="padding: 1.5pt 0; vertical-align: top; border: none; font-size: 12pt;">Lampiran</td>
            <td style="padding: 1.5pt 0; vertical-align: top; border: none; font-size: 12pt;">:</td>
            <td style="padding: 1.5pt 0; vertical-align: top; border: none; font-size: 12pt;" colspan="2">-</td>
          </tr>
          <tr>
            <td style="padding: 1.5pt 0; vertical-align: top; border: none; font-weight: bold; font-size: 12pt;">Perihal</td>
            <td style="padding: 1.5pt 0; vertical-align: top; border: none; font-weight: bold; font-size: 12pt;">:</td>
            <td style="padding: 1.5pt 0; vertical-align: top; border: none; font-weight: bold; font-size: 12pt;" colspan="2">${surat.perihal}</td>
          </tr>
        </table>

        ${tujuanHtml}

        <p style="text-align: justify; margin-bottom: 8pt; line-height: 1.4;">
          Dengan hormat,<br>
          ${kataPengantar}
        </p>

        <table style="margin-left: 20pt; margin-bottom: 12pt; width: 92%; border: none; border-collapse: collapse; line-height: 1.45;" border="0" cellpadding="0" cellspacing="0">
          <tr>
            <td style="width: 140pt; padding: 1.5pt 0; vertical-align: top; border: none;">Hari / Tanggal</td>
            <td style="width: 15pt; padding: 1.5pt 0; vertical-align: top; border: none;">:</td>
            <td style="padding: 1.5pt 0; vertical-align: top; font-weight: bold; border: none;">${data.hariTanggal || '-'}</td>
          </tr>
          <tr>
            <td style="padding: 1.5pt 0; vertical-align: top; border: none;">Waktu</td>
            <td style="padding: 1.5pt 0; vertical-align: top; border: none;">:</td>
            <td style="padding: 1.5pt 0; vertical-align: top; border: none;">${data.waktu || '09.00 WITA - Selesai'}</td>
          </tr>
          <tr>
            <td style="padding: 1.5pt 0; vertical-align: top; border: none;">Tempat</td>
            <td style="padding: 1.5pt 0; vertical-align: top; border: none;">:</td>
            <td style="padding: 1.5pt 0; vertical-align: top; border: none;">${data.tempat || 'Ruang Pertemuan SDN 1 Pekutatan'}</td>
          </tr>
          <tr>
            <td style="padding: 1.5pt 0; vertical-align: top; border: none;">Acara / Agenda</td>
            <td style="padding: 1.5pt 0; vertical-align: top; border: none;">:</td>
            <td style="padding: 1.5pt 0; vertical-align: top; font-weight: bold; border: none;">${data.acara || surat.perihal}</td>
          </tr>
        </table>

        ${data.catatanTambahan ? `
        <p style="text-align: justify; margin-bottom: 8pt; font-style: italic; line-height: 1.4;">
          Catatan: ${data.catatanTambahan}
        </p>
        ` : ''}

        <p style="text-align: justify; margin-top: 10pt; line-height: 1.4;">
          ${kalimatPenutup}
        </p>
      `;
      break;
    }

    case 'surat_keputusan': {
      const diktumItems: Array<{ label: string; isi: string }> = Array.isArray(data.diktumList) && data.diktumList.length > 0
        ? data.diktumList
        : [
            { label: 'Kesatu', isi: data.memutuskan || 'Menugaskan dan memberlakukan keputusan ini sebagaimana terlampir.' },
            { label: 'Kedua', isi: 'Segala biaya yang timbul akibat pelaksanaan keputusan ini dibebankan pada anggaran yang sesuai.' },
            { label: 'Ketiga', isi: 'Keputusan ini berlaku sejak tanggal ditetapkan, dengan ketentuan apabila terdapat kekeliruan di kemudian hari akan diadakan perbaikan sebagaimana mestinya.' },
          ];

      const menimbangHtml = formatSkKonsideranHtml(
        data.menimbangList,
        data.menimbang || 'Bahwa demi kelancaran dan ketertiban administrasi serta mutu pendidikan di SDN 1 Pekutatan, dipandang perlu menetapkan keputusan ini.',
        'alphabet'
      );

      const mengingatHtml = formatSkKonsideranHtml(
        data.mengingatList,
        data.mengingat || '1. Undang-Undang Nomor 20 Tahun 2003 tentang Sistem Pendidikan Nasional;\n2. Permendagri Nomor 83 Tahun 2022 tentang Kode Klasifikasi Arsip;\n3. Program Kerja SDN 1 Pekutatan Tahun Ajaran 2026/2027.',
        'number'
      );

      const memperhatikanHtml = formatSkKonsideranHtml(
        data.memperhatikanList,
        data.memperhatikan,
        'number'
      );

      badanSurat = `
        <div style="text-align: center; margin: 12pt 0 16pt 0; font-family: 'Bookman Old Style', 'Bookman', 'URW Bookman L', serif;">
          <p style="margin: 0; text-align: center; font-size: 12pt; font-weight: bold; text-decoration: underline; letter-spacing: 0.3px;">KEPUTUSAN KEPALA SEKOLAH DASAR NEGERI 1 PEKUTATAN</p>
          <p class="nomor-sk" style="margin: 2pt 0 0 0; text-align: center; font-size: 11pt; font-family: 'Bookman Old Style', 'Bookman', 'URW Bookman L', serif; font-weight: normal;">Nomor: ${surat.noSurat}</p>
          <p style="margin: 8pt 0 0 0; text-align: center; font-size: 12pt; font-weight: bold; text-transform: uppercase;">
            TENTANG<br>${data.tentang || surat.perihal}
          </p>
        </div>

        <p style="text-align: center; font-weight: bold; font-size: 12pt; margin: 10pt 0;">
          KEPALA SEKOLAH DASAR NEGERI 1 PEKUTATAN,
        </p>

        <table style="width: 100%; margin-bottom: 10pt; border: none; border-collapse: collapse; line-height: 1.45; font-size: 12pt;" border="0" cellpadding="0" cellspacing="0">
          <tr>
            <td style="width: 100pt; font-weight: bold; vertical-align: top; padding: 2pt 0; border: none; font-size: 12pt;">Menimbang</td>
            <td style="width: 14pt; vertical-align: top; padding: 2pt 0; border: none; font-size: 12pt;">:</td>
            <td style="vertical-align: top; padding: 2pt 0; border: none;">${menimbangHtml}</td>
          </tr>
          <tr>
            <td style="font-weight: bold; vertical-align: top; padding: 2pt 0; border: none; font-size: 12pt;">Mengingat</td>
            <td style="vertical-align: top; padding: 2pt 0; border: none; font-size: 12pt;">:</td>
            <td style="vertical-align: top; padding: 2pt 0; border: none;">${mengingatHtml}</td>
          </tr>
          ${memperhatikanHtml ? `
          <tr>
            <td style="font-weight: bold; vertical-align: top; padding: 2pt 0; border: none; font-size: 12pt;">Memperhatikan</td>
            <td style="vertical-align: top; padding: 2pt 0; border: none; font-size: 12pt;">:</td>
            <td style="vertical-align: top; padding: 2pt 0; border: none;">${memperhatikanHtml}</td>
          </tr>
          ` : ''}
        </table>

        <div style="text-align: center; font-weight: bold; font-size: 12pt; margin: 12pt 0;">
          MEMUTUSKAN:
        </div>

        <table style="width: 100%; margin-bottom: 12pt; border: none; border-collapse: collapse; line-height: 1.45; font-size: 12pt;" border="0" cellpadding="0" cellspacing="0">
          <tr>
            <td style="width: 100pt; font-weight: bold; vertical-align: top; padding: 2pt 0; border: none; font-size: 12pt;">Menetapkan</td>
            <td style="width: 14pt; vertical-align: top; padding: 2pt 0; border: none; font-size: 12pt;">:</td>
            <td style="text-align: justify; font-weight: bold; vertical-align: top; padding: 2pt 0; border: none; font-size: 12pt;">
              ${data.tentang || surat.perihal}
            </td>
          </tr>
          ${diktumItems.map((d, idx) => `
            <tr>
              <td style="font-weight: bold; vertical-align: top; padding: 2pt 0; border: none; font-size: 12pt;">${formatDiktumLabel(d.label, idx)}</td>
              <td style="vertical-align: top; padding: 2pt 0; border: none; font-size: 12pt;">:</td>
              <td style="text-align: justify; vertical-align: top; padding: 2pt 0; border: none; white-space: pre-line; font-size: 12pt;">${d.isi}</td>
            </tr>
          `).join('')}
        </table>

        <!-- Tempat dan Tanggal Penetapan SK (Sejajar di sisi kanan atas TTD) -->
        <table style="width: 100%; margin-top: 14pt; border: none; border-collapse: collapse; font-size: 12pt;" border="0" cellpadding="0" cellspacing="0">
          <tr>
            <td style="width: 52%; border: none;">&nbsp;</td>
            <td style="width: 48%; border: none; vertical-align: top;">
              <table style="border: none; border-collapse: collapse; width: 100%; font-size: 12pt;" border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="width: 85pt; padding: 1pt 0; border: none; font-size: 12pt;">Ditetapkan di</td>
                  <td style="width: 12pt; padding: 1pt 0; border: none; font-size: 12pt;">:</td>
                  <td style="padding: 1pt 0; border: none; font-size: 12pt; font-weight: 500;">${sekolah.desa || 'Pekutatan'}</td>
                </tr>
                <tr>
                  <td style="padding: 1pt 0; border: none; font-size: 12pt;">Pada tanggal</td>
                  <td style="padding: 1pt 0; border: none; font-size: 12pt;">:</td>
                  <td style="padding: 1pt 0; border: none; font-size: 12pt; font-weight: 500;">${tglIndo}</td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      `;
      break;
    }

    case 'surat_tugas': {
      const pegawaiList = data.pegawaiDitugaskan || [];
      const formatPembuka = data.formatPembuka || (data.dasarTugas ? 'dasar' : 'ttd_kepsek');
      const isTtdKepsek = formatPembuka === 'ttd_kepsek';

      const cleanKec = (sekolah.kecamatan || 'Pekutatan').replace(/^kecamatan\s+/i, '').trim();
      const cleanKab = (sekolah.kabupaten || 'Jembrana').replace(/^kabupaten\s+/i, '').trim();
      const prov = (sekolah.provinsi || 'Bali').trim();
      const schoolName = schoolNameIsi;

      const pembukaHtml = isTtdKepsek ? `
        <p style="text-align: justify; margin: 0 0 10pt 0; line-height: 1.45; font-size: 12pt;">
          Yang bertanda tangan dibawah ini Kepala ${schoolName}, Kecamatan ${cleanKec}, Kabupaten ${cleanKab}-${prov} menugaskan kepada :
        </p>
      ` : `
        <table style="width: 100%; margin-bottom: 10pt; border: none; border-collapse: collapse; line-height: 1.45; font-size: 12pt;" border="0" cellpadding="0" cellspacing="0">
          <tr>
            <td style="width: 80pt; vertical-align: top; border: none; font-weight: bold; font-size: 12pt;">Dasar</td>
            <td style="width: 15pt; vertical-align: top; border: none; font-size: 12pt;">:</td>
            <td style="text-align: justify; vertical-align: top; border: none; font-size: 12pt;">${data.dasarTugas || 'Surat Edaran / Program Kerja Dinas Pendidikan Kepemudaan dan Olahraga Kab. Jembrana.'}</td>
          </tr>
        </table>

        <div style="text-align: center; font-weight: bold; font-size: 12pt; margin: 12pt 0;">
          MEMERINTAHKAN:
        </div>

        <p style="margin: 0 0 6pt 0; font-weight: bold; font-size: 12pt;">Kepada:</p>
      `;

      badanSurat = `
        <div style="text-align: center; margin: 12pt 0 16pt 0;">
          <p style="margin: 0; text-align: center; font-size: 12pt; font-weight: bold; text-decoration: underline;">SURAT PERINTAH TUGAS</p>
          <p class="nomor-surat" style="margin: 2pt 0 0 0; text-align: center; font-size: 11pt;">Nomor: ${surat.noSurat}</p>
        </div>

        ${pembukaHtml}

        <div style="margin-left: 16pt; margin-bottom: 12pt;">
          ${pegawaiList.length > 0 ? (
            pegawaiList.length >= 4 ? `
              <table style="width: 100%; border-collapse: collapse; font-size: 11pt; margin-top: 4pt; margin-bottom: 8pt;" border="1" cellpadding="4" cellspacing="0">
                <thead>
                  <tr style="background: #f8fafc; text-align: center; font-weight: bold;">
                    <th style="width: 25pt; border: 1px solid #000; padding: 4pt 2pt; text-align: center;">No</th>
                    <th style="border: 1px solid #000; padding: 4pt; text-align: left;">Nama</th>
                    <th style="width: 120pt; border: 1px solid #000; padding: 4pt; text-align: left;">NIP / NIPPPK</th>
                    <th style="width: 105pt; border: 1px solid #000; padding: 4pt; text-align: left;">Pangkat / Golongan</th>
                    <th style="width: 105pt; border: 1px solid #000; padding: 4pt; text-align: left;">Jabatan</th>
                  </tr>
                </thead>
                <tbody>
                  ${pegawaiList.map((p: any, idx: number) => `
                    <tr>
                      <td style="border: 1px solid #000; padding: 4pt 2pt; text-align: center; vertical-align: top;">${idx + 1}.</td>
                      <td style="border: 1px solid #000; padding: 4pt; vertical-align: top; font-weight: 600;">${p.nama || '-'}</td>
                      <td style="border: 1px solid #000; padding: 4pt; vertical-align: top;">${p.nip || p.nipppk || '-'}</td>
                      <td style="border: 1px solid #000; padding: 4pt; vertical-align: top;">${p.pangkatGol || p.pangkat || '-'}</td>
                      <td style="border: 1px solid #000; padding: 4pt; vertical-align: top;">${p.jabatan || 'Guru ' + schoolName}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            ` : pegawaiList.map((p: any, idx: number) => `
              <div style="margin-bottom: 8pt; page-break-inside: avoid;">
                <table style="width: 100%; border: none; border-collapse: collapse; line-height: 1.45; font-size: 12pt;" border="0" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="width: 22pt; vertical-align: top; border: none; padding: 2pt 0;">${pegawaiList.length > 1 ? `${idx + 1}.` : ''}</td>
                    <td style="width: 135pt; vertical-align: top; border: none; padding: 2pt 0;">Nama</td>
                    <td style="width: 15pt; vertical-align: top; border: none; padding: 2pt 0;">:</td>
                    <td style="vertical-align: top; font-weight: bold; border: none; padding: 2pt 0;">${p.nama || '-'}</td>
                  </tr>
                  <tr>
                    <td style="border: none;"></td>
                    <td style="vertical-align: top; border: none; padding: 2pt 0;">NIP / NIPPPK</td>
                    <td style="vertical-align: top; border: none; padding: 2pt 0;">:</td>
                    <td style="vertical-align: top; border: none; padding: 2pt 0;">${p.nip || p.nipppk || '-'}</td>
                  </tr>
                  <tr>
                    <td style="border: none;"></td>
                    <td style="vertical-align: top; border: none; padding: 2pt 0;">Pangkat / Golongan</td>
                    <td style="vertical-align: top; border: none; padding: 2pt 0;">:</td>
                    <td style="vertical-align: top; border: none; padding: 2pt 0;">${p.pangkatGol || p.pangkat || '-'}</td>
                  </tr>
                  <tr>
                    <td style="border: none;"></td>
                    <td style="vertical-align: top; border: none; padding: 2pt 0;">Jabatan</td>
                    <td style="vertical-align: top; border: none; padding: 2pt 0;">:</td>
                    <td style="vertical-align: top; border: none; padding: 2pt 0;">${p.jabatan || 'Guru ' + schoolName}</td>
                  </tr>
                </table>
              </div>
            `).join('')
          ) : `
            <table style="width: 100%; border: none; border-collapse: collapse; line-height: 1.45; font-size: 12pt;" border="0" cellpadding="0" cellspacing="0">
              <tr>
                <td style="width: 22pt; vertical-align: top; border: none; padding: 2pt 0;">1.</td>
                <td style="width: 135pt; vertical-align: top; border: none; padding: 2pt 0;">Nama</td>
                <td style="width: 15pt; vertical-align: top; border: none; padding: 2pt 0;">:</td>
                <td style="vertical-align: top; font-weight: bold; border: none; padding: 2pt 0;">${surat.tujuan || '-'}</td>
              </tr>
              <tr>
                <td style="border: none;"></td>
                <td style="vertical-align: top; border: none; padding: 2pt 0;">NIP / NIPPPK</td>
                <td style="vertical-align: top; border: none; padding: 2pt 0;">:</td>
                <td style="vertical-align: top; border: none; padding: 2pt 0;">-</td>
              </tr>
              <tr>
                <td style="border: none;"></td>
                <td style="vertical-align: top; border: none; padding: 2pt 0;">Pangkat / Golongan</td>
                <td style="vertical-align: top; border: none; padding: 2pt 0;">:</td>
                <td style="vertical-align: top; border: none; padding: 2pt 0;">-</td>
              </tr>
              <tr>
                <td style="border: none;"></td>
                <td style="vertical-align: top; border: none; padding: 2pt 0;">Jabatan</td>
                <td style="vertical-align: top; border: none; padding: 2pt 0;">:</td>
                <td style="vertical-align: top; border: none; padding: 2pt 0;">Guru ${schoolName}</td>
              </tr>
            </table>
          `}
        </div>

        <p style="margin: 0 0 6pt 0; font-weight: bold;">Untuk:</p>

        <table style="margin-left: 16pt; margin-bottom: 12pt; width: 94%; border: none; border-collapse: collapse; line-height: 1.45;" border="0" cellpadding="0" cellspacing="0">
          <tr>
            <td style="width: 20pt; vertical-align: top; border: none; padding: 2pt 0;">1.</td>
            <td style="text-align: justify; vertical-align: top; border: none; padding: 2pt 0;">
              Melaksanakan tugas: ${data.tujuanTugas || surat.perihal}
            </td>
          </tr>
          <tr>
            <td style="vertical-align: top; border: none; padding: 2pt 0;">2.</td>
            <td style="vertical-align: top; border: none; padding: 2pt 0;">
              Tempat pelaksanaan: ${data.tempatTugas || '-'}
            </td>
          </tr>
          <tr>
            <td style="vertical-align: top; border: none; padding: 2pt 0;">3.</td>
            <td style="vertical-align: top; border: none; padding: 2pt 0;">
              Waktu pelaksanaan: ${data.tglMulai ? formatTanggalIndonesia(data.tglMulai) : tglIndo}${data.tglSelesai && data.tglSelesai !== data.tglMulai ? ` s.d. ${formatTanggalIndonesia(data.tglSelesai)}` : ''}${data.waktu ? ` (${data.waktu})` : ''}
            </td>
          </tr>
          <tr>
            <td style="vertical-align: top; border: none; padding: 2pt 0;">4.</td>
            <td style="text-align: justify; vertical-align: top; border: none; padding: 2pt 0;">
              Melaporkan hasil pelaksanaan tugas kepada atasan langsung setelah kegiatan selesai.
            </td>
          </tr>
        </table>

        <p style="text-align: justify; margin-top: 10pt; line-height: 1.4;">
          Demikian surat perintah tugas ini dibuat untuk dilaksanakan dengan sebaik-baiknya dan penuh rasa tanggung jawab.
        </p>
      `;
      break;
    }

    case 'surat_pengantar': {
      const subJenis = data.subJenisPengantar || 'dokumen';
      const cleanKec = (sekolah.kecamatan || 'Pekutatan').replace(/^kecamatan\s+/i, '').trim();
      const cleanKab = (sekolah.kabupaten || 'Jembrana').replace(/^kabupaten\s+/i, '').trim();
      const schoolName = schoolNameIsi;
      const kepsekNama = kepsek.nama;
      const kepsekNip = kepsek.nip;
      const pangkatKepsek = kepsek.pangkat;

      if (subJenis === 'dokumen') {
        const daftarDokumen: any[] = Array.isArray(data.daftarDokumen) && data.daftarDokumen.length > 0
          ? data.daftarDokumen
          : [{
              uraian: data.uraian || surat.perihal || 'Berkas Pengajuan Beasiswa S2 Guru a.n\n1. SITI SWAIBATUN, S.Pd.\nNIP. 19860203 201001 2 011',
              jumlah: data.jumlah || '1 bendel',
              keterangan: data.keterangan || 'Disampaikan dengan hormat sebagai permohonan dan atas perhatiannya disampaikan terima kasih',
            }];

        const tempatTujuan = data.tempatTujuan || 'Tempat';
        const tembusanRaw = data.tembusan !== undefined ? data.tembusan : '1. Yang bersangkutan\n2. Arsip';
        const tembusanLines = typeof tembusanRaw === 'string'
          ? tembusanRaw.split('\n').map((l: string) => l.trim()).filter(Boolean)
          : Array.isArray(tembusanRaw) ? tembusanRaw : [];

        let tembusanHtml = '';
        if (tembusanLines.length > 0) {
          tembusanHtml = `
            <div style="text-align: left; font-size: 10pt; line-height: 1.35; margin-top: 4pt;">
              <p style="margin: 0; font-weight: bold; text-decoration: underline; font-size: 10pt;">Tembusan disampaikan kepada Yth.:</p>
              <div style="margin: 3pt 0 0 2pt;">
                ${tembusanLines.map((line: string, idx: number) => {
                  const clean = line.replace(/^[0-9]+[\.\)]\s*/, '');
                  return `<p style="margin: 1.5pt 0; font-size: 10pt; text-align: left;">${idx + 1}. ${clean}</p>`;
                }).join('')}
              </div>
            </div>
          `;
        }

        badanSurat = `
          <!-- 1. Tujuan Surat: Sisi Kanan Kertas (berlawanan) dengan format rapi -->
          ${buildKepadaYthBlock({
            tujuan: surat.tujuan || 'Kepala Dinas Pendidikan Kepemudaan dan Olahraga',
            instansi: data.tujuanInstansi,
            tempat: tempatTujuan,
            tujuanList: Array.isArray(data.tujuanList) ? data.tujuanList : undefined,
            fontSize: '11.5pt',
          })}

          <!-- 2. Judul Naskah Dinas: Surat Pengantar dan Nomor Surat di tengah -->
          <div style="text-align: center; margin: 14pt 0 14pt 0;">
            <p style="margin: 0; text-align: center; font-size: 12.5pt; font-weight: bold; text-decoration: underline; letter-spacing: 0.5px;">SURAT PENGANTAR</p>
            <p class="nomor-surat" style="margin: 2.5pt 0 0 0; text-align: center; font-size: 11pt;">Nomor: ${surat.noSurat}</p>
          </div>

          ${data.kalimatPengantar ? `
            <p style="text-align: justify; margin: 0 0 10pt 0; line-height: 1.45; font-size: 11.5pt;">
              ${data.kalimatPengantar}
            </p>
          ` : ''}

          <!-- 3. Inti Surat: Tabel Kolom No, Uraian, Jumlah, Keterangan -->
          <table style="width: 100%; border-collapse: collapse; font-size: 11pt; margin-bottom: 14pt;" border="1" cellpadding="6" cellspacing="0">
            <thead>
              <tr style="text-align: center; font-weight: bold;">
                <th style="width: 32pt; border: 1px solid #000; padding: 6pt 4pt; text-align: center;">No</th>
                <th style="border: 1px solid #000; padding: 6pt 8pt; text-align: center;">Uraian</th>
                <th style="width: 95pt; border: 1px solid #000; padding: 6pt 6pt; text-align: center;">Jumlah</th>
                <th style="width: 165pt; border: 1px solid #000; padding: 6pt 6pt; text-align: center;">Keterangan</th>
              </tr>
            </thead>
            <tbody>
              ${daftarDokumen.map((doc: any, idx: number) => {
                const rawUraian = doc.uraian || doc.namaBerkas || surat.perihal || 'Berkas Pengajuan Kedinasan';
                const uraianHtml = rawUraian.replace(/\n/g, '<br/>');
                const rawKet = doc.keterangan || 'Disampaikan dengan hormat sebagai permohonan dan atas perhatiannya disampaikan terima kasih';
                const ketHtml = rawKet.replace(/\n/g, '<br/>');
                return `
                  <tr>
                    <td style="border: 1px solid #000; padding: 8pt 4pt; text-align: center; vertical-align: top;">${idx + 1}.</td>
                    <td style="border: 1px solid #000; padding: 8pt 8pt; vertical-align: top; text-align: left; line-height: 1.45;">${uraianHtml}</td>
                    <td style="border: 1px solid #000; padding: 8pt 6pt; vertical-align: top; text-align: center;">${doc.jumlah || '1 bendel'}</td>
                    <td style="border: 1px solid #000; padding: 8pt 8pt; vertical-align: top; text-align: left; line-height: 1.45;">${ketHtml}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        `;

        // Tanda Tangan: Sisi kiri memuat Tembusan (di-enter ke bawah agar tidak sejajar dengan awal kolom TTD), Sisi kanan memuat TTD Kepala Sekolah
        customTtdBlock = `
          <table class="ttd-table" style="width: 100%; margin-top: 20pt; border: none; border-collapse: collapse; line-height: 1.4;" border="0" cellpadding="0" cellspacing="0">
            <tr>
              <!-- Sisi kiri kertas: Tembusan di-enter ke bawah agar tidak sejajar dengan kolom TTD -->
              <td style="width: 52%; vertical-align: bottom; border: none; padding-right: 14pt; padding-bottom: 2pt;">
                <div style="height: 55pt;">&nbsp;</div>
                ${tembusanHtml}
              </td>
              <!-- Sisi kanan kertas: TTD Kepala Sekolah -->
              <td style="width: 48%; vertical-align: top; text-align: center; border: none; padding-left: 8pt;">
                <p style="margin: 0 0 3pt 0; text-align: center; font-size: 11.5pt;">${sekolah.desa || 'Pekutatan'}, ${tglIndo}</p>
                <p style="margin: 0; font-weight: bold; text-align: center; font-size: 11.5pt;">Kepala Sekolah,</p>
                <div style="height: 50pt;">&nbsp;</div>
                <p style="margin: 0; font-weight: bold; text-decoration: underline; text-align: center; font-size: 11.5pt;">${kepsekNama}</p>
                ${pangkatKepsek ? `<p style="margin: 1.5pt 0 0 0; font-size: 10.5pt; text-align: center;">${pangkatKepsek}</p>` : ''}
                <p style="margin: 1.5pt 0 0 0; font-size: 10.5pt; text-align: center;">NIP. ${kepsekNip}</p>
              </td>
            </tr>
          </table>
        `;
      } else if (subJenis === 'siswa') {
        const daftarSiswa: any[] = Array.isArray(data.daftarSiswa) && data.daftarSiswa.length > 0
          ? data.daftarSiswa
          : [{ nama: surat.tujuan || 'Siswa Berprestasi', nisn: '-', jk: 'L', kelas: 'Kelas IV', keterangan: 'Peserta Lomba' }];

        badanSurat = `
          <!-- 1. Tujuan Surat: Sisi Kanan Kertas (berlawanan) dengan format rapi -->
          ${buildKepadaYthBlock({
            tujuan: surat.tujuan || 'Panitia Pelaksana Kegiatan',
            instansi: data.tujuanInstansi,
            tempat: 'Tempat',
            tujuanList: Array.isArray(data.tujuanList) ? data.tujuanList : undefined,
            fontSize: '11.5pt',
          })}

          <!-- 2. Judul Naskah Dinas: Surat Pengantar dan Nomor Surat di tengah -->
          <div style="text-align: center; margin: 14pt 0 14pt 0;">
            <p style="margin: 0; text-align: center; font-size: 13pt; font-weight: bold; text-decoration: underline; letter-spacing: 0.5px;">SURAT PENGANTAR</p>
            <p class="nomor-surat" style="margin: 2pt 0 0 0; text-align: center; font-size: 11pt;">Nomor: ${surat.noSurat}</p>
          </div>

          <p style="text-align: justify; margin: 0 0 8pt 0; line-height: 1.45; font-size: 12pt;">
            Yang bertanda tangan dibawah ini Kepala ${schoolName}, Kecamatan ${cleanKec}, Kabupaten ${cleanKab} dengan ini menerangkan dan mengantarkan bahwa peserta didik di bawah ini:
          </p>

          <table style="width: 100%; border-collapse: collapse; font-size: 11pt; margin: 8pt 0 12pt 0;" border="1" cellpadding="4" cellspacing="0">
            <thead>
              <tr style="background: #f8fafc; text-align: center; font-weight: bold;">
                <th style="width: 25pt; border: 1px solid #000; padding: 4pt 2pt; text-align: center;">No</th>
                <th style="border: 1px solid #000; padding: 4pt 6pt; text-align: left;">Nama Peserta Didik</th>
                <th style="width: 85pt; border: 1px solid #000; padding: 4pt; text-align: center;">NIS / NISN</th>
                <th style="width: 35pt; border: 1px solid #000; padding: 4pt; text-align: center;">L/P</th>
                <th style="width: 45pt; border: 1px solid #000; padding: 4pt; text-align: center;">Kelas</th>
                <th style="width: 125pt; border: 1px solid #000; padding: 4pt 6pt; text-align: left;">Cabang / Keterangan</th>
              </tr>
            </thead>
            <tbody>
              ${daftarSiswa.map((s: any, idx: number) => `
                <tr>
                  <td style="border: 1px solid #000; padding: 4pt 2pt; text-align: center; vertical-align: top;">${idx + 1}.</td>
                  <td style="border: 1px solid #000; padding: 4pt 6pt; vertical-align: top; font-weight: 600;">${s.nama || '-'}</td>
                  <td style="border: 1px solid #000; padding: 4pt; vertical-align: top; text-align: center;">${s.nisn || s.nis || '-'}</td>
                  <td style="border: 1px solid #000; padding: 4pt; vertical-align: top; text-align: center;">${s.jk || '-'}</td>
                  <td style="border: 1px solid #000; padding: 4pt; vertical-align: top; text-align: center;">${s.kelas || '-'}</td>
                  <td style="border: 1px solid #000; padding: 4pt 6pt; vertical-align: top;">${s.keterangan || '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <table style="width: 100%; border: none; border-collapse: collapse; line-height: 1.45; font-size: 12pt; margin-bottom: 10pt;" border="0" cellpadding="0" cellspacing="0">
            <tr>
              <td style="width: 135pt; vertical-align: top; border: none; padding: 2pt 0;">Untuk Kegiatan</td>
              <td style="width: 15pt; vertical-align: top; border: none; padding: 2pt 0;">:</td>
              <td style="vertical-align: top; font-weight: bold; border: none; padding: 2pt 0;">${data.keperluan || surat.perihal}</td>
            </tr>
            ${data.tempatKegiatan ? `
            <tr>
              <td style="vertical-align: top; border: none; padding: 2pt 0;">Tempat Pelaksanaan</td>
              <td style="vertical-align: top; border: none; padding: 2pt 0;">:</td>
              <td style="vertical-align: top; border: none; padding: 2pt 0;">${data.tempatKegiatan}</td>
            </tr>
            ` : ''}
            ${data.tglKegiatan ? `
            <tr>
              <td style="vertical-align: top; border: none; padding: 2pt 0;">Waktu / Tanggal</td>
              <td style="vertical-align: top; border: none; padding: 2pt 0;">:</td>
              <td style="vertical-align: top; border: none; padding: 2pt 0;">${formatTanggalIndonesia(data.tglKegiatan)}</td>
            </tr>
            ` : ''}
            ${data.guruPendamping ? `
            <tr>
              <td style="vertical-align: top; border: none; padding: 2pt 0;">Guru Pendamping</td>
              <td style="vertical-align: top; border: none; padding: 2pt 0;">:</td>
              <td style="vertical-align: top; font-weight: bold; border: none; padding: 2pt 0;">${data.guruPendamping}</td>
            </tr>
            ` : ''}
          </table>

          <p style="text-align: justify; margin-top: 10pt; line-height: 1.45; font-size: 12pt;">
            Demikian surat pengantar ini kami sampaikan, atas perhatian dan kerja sama yang baik kami ucapkan terima kasih.
          </p>
        `;
      } else {
        // subJenis === 'ptk'
        const daftarPtk: any[] = Array.isArray(data.daftarPtk) && data.daftarPtk.length > 0
          ? data.daftarPtk
          : [{ nama: surat.tujuan || 'Dewan Guru SDN 1 Pekutatan', nip: '-', pangkatGol: '-', jabatan: 'Guru', berkasKeterangan: '1 Berkas Lengkap' }];

        badanSurat = `
          <!-- 1. Tujuan Surat: Sisi Kanan Kertas (berlawanan) dengan format rapi -->
          ${buildKepadaYthBlock({
            tujuan: surat.tujuan || 'Kepala Dinas Pendidikan Kepemudaan dan Olahraga Kab. Jembrana',
            instansi: data.tujuanInstansi,
            tempat: 'Tempat',
            tujuanList: Array.isArray(data.tujuanList) ? data.tujuanList : undefined,
            fontSize: '11.5pt',
          })}

          <!-- 2. Judul Naskah Dinas: Surat Pengantar dan Nomor Surat di tengah -->
          <div style="text-align: center; margin: 14pt 0 14pt 0;">
            <p style="margin: 0; text-align: center; font-size: 13pt; font-weight: bold; text-decoration: underline; letter-spacing: 0.5px;">SURAT PENGANTAR</p>
            <p class="nomor-surat" style="margin: 2pt 0 0 0; text-align: center; font-size: 11pt;">Nomor: ${surat.noSurat}</p>
          </div>

          <p style="text-align: justify; margin: 0 0 8pt 0; line-height: 1.45; font-size: 12pt;">
            Bersama ini kami sampaikan dengan hormat berkas usulan Pendidik dan Tenaga Kependidikan (PTK) ${schoolName}, Kecamatan ${cleanKec}, Kabupaten ${cleanKab} sebagaimana daftar di bawah ini:
          </p>

          <table style="width: 100%; border-collapse: collapse; font-size: 11pt; margin: 8pt 0 12pt 0;" border="1" cellpadding="4" cellspacing="0">
            <thead>
              <tr style="background: #f8fafc; text-align: center; font-weight: bold;">
                <th style="width: 25pt; border: 1px solid #000; padding: 4pt 2pt; text-align: center;">No</th>
                <th style="border: 1px solid #000; padding: 4pt 6pt; text-align: left;">Nama Lengkap & Gelar</th>
                <th style="width: 110pt; border: 1px solid #000; padding: 4pt; text-align: left;">NIP / NIPPPK</th>
                <th style="width: 90pt; border: 1px solid #000; padding: 4pt; text-align: left;">Pangkat / Gol</th>
                <th style="width: 95pt; border: 1px solid #000; padding: 4pt; text-align: left;">Jabatan</th>
                <th style="width: 110pt; border: 1px solid #000; padding: 4pt 6pt; text-align: left;">Kelengkapan Berkas</th>
              </tr>
            </thead>
            <tbody>
              ${daftarPtk.map((p: any, idx: number) => `
                <tr>
                  <td style="border: 1px solid #000; padding: 4pt 2pt; text-align: center; vertical-align: top;">${idx + 1}.</td>
                  <td style="border: 1px solid #000; padding: 4pt 6pt; vertical-align: top; font-weight: 600;">${p.nama || '-'}</td>
                  <td style="border: 1px solid #000; padding: 4pt; vertical-align: top;">${p.nip || '-'}</td>
                  <td style="border: 1px solid #000; padding: 4pt; vertical-align: top;">${p.pangkatGol || '-'}</td>
                  <td style="border: 1px solid #000; padding: 4pt; vertical-align: top;">${p.jabatan || 'Guru ' + schoolName}</td>
                  <td style="border: 1px solid #000; padding: 4pt 6pt; vertical-align: top;">${p.berkasKeterangan || '1 Berkas Lengkap'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <p style="text-align: justify; margin: 0 0 8pt 0; line-height: 1.45; font-size: 12pt;">
            Untuk keperluan: <strong>${data.keperluan || surat.perihal}</strong>.
          </p>

          <p style="text-align: justify; margin: 0 0 10pt 0; line-height: 1.45; font-size: 12pt;">
            Berkas usulan tersebut telah kami periksa kelengkapan administrasinya dan disampaikan dengan hormat untuk dapat diproses lebih lanjut sesuai dengan ketentuan yang berlaku.
          </p>

          <p style="text-align: justify; margin-top: 10pt; line-height: 1.45; font-size: 12pt;">
            Demikian surat pengantar ini kami buat dengan sebenarnya, atas perhatian dan kerja samanya kami ucapkan terima kasih.
          </p>
        `;
      }
      break;
    }

    case 'surat_rekomendasi': {
      const subJenis = data.subJenisRekomendasi || 'siswa';
      const cleanKec = (sekolah.kecamatan || 'Pekutatan').replace(/^kecamatan\s+/i, '').trim();
      const cleanKab = (sekolah.kabupaten || 'Jembrana').replace(/^kabupaten\s+/i, '').trim();
      const prov = (sekolah.provinsi || 'Bali').trim();
      const schoolName = schoolNameIsi;

      if (subJenis === 'siswa') {
        const rawDaftar = Array.isArray(data.daftarSiswa) && data.daftarSiswa.length > 0
          ? data.daftarSiswa
          : data.nama
          ? [{
              id: '1',
              nama: data.nama,
              nisn: data.nisn || '-',
              kelas: data.kelas || '-',
              tempatTglLahir: data.tempatTglLahir || '-',
              namaOrtu: data.namaOrtu || '-',
              alamat: data.alamat || '-',
            }]
          : [];

        const isMulti = rawDaftar.length > 1;
        const useTable = rawDaftar.length > 3;
        const singleSiswa = rawDaftar[0] || {
          nama: data.nama || '-',
          nisn: data.nisn || '-',
          kelas: data.kelas || '-',
          tempatTglLahir: data.tempatTglLahir || '-',
          namaOrtu: data.namaOrtu || '-',
          alamat: data.alamat || '-',
        };

        const hasPertimbangan = Boolean(data.dasarPertimbangan && data.dasarPertimbangan.trim());
        const catatanHtml = hasPertimbangan
          ? `
          <p style="text-align: justify; margin: 0 0 10pt 0; line-height: 1.45; font-size: 12pt;">
            ${data.dasarPertimbangan.trim()}
          </p>
          `
          : '';

        let subjekContentHtml = '';
        if (useTable) {
          // Format tabel bergaris HANYA jika siswa lebih dari 3 orang
          subjekContentHtml = `
            <table style="width: 100%; border-collapse: collapse; margin: 8pt 0 12pt 0; font-size: 11pt; line-height: 1.35;" border="1" cellpadding="5" cellspacing="0">
              <thead>
                <tr style="background-color: #f1f5f9; font-weight: bold; text-align: center;">
                  <th style="width: 24pt; border: 1px solid #334155; padding: 5pt 3pt; text-align: center;">No</th>
                  <th style="border: 1px solid #334155; padding: 5pt 6pt; text-align: left;">Nama Lengkap Siswa</th>
                  <th style="width: 85pt; border: 1px solid #334155; padding: 5pt 4pt; text-align: center;">NISN / NIS</th>
                  <th style="width: 60pt; border: 1px solid #334155; padding: 5pt 4pt; text-align: center;">Kelas</th>
                  <th style="border: 1px solid #334155; padding: 5pt 6pt; text-align: left;">Tempat, Tgl Lahir</th>
                  <th style="border: 1px solid #334155; padding: 5pt 6pt; text-align: left;">Nama Orang Tua / Wali</th>
                </tr>
              </thead>
              <tbody>
                ${rawDaftar
                  .map(
                    (s: any, idx: number) => `
                  <tr>
                    <td style="border: 1px solid #334155; padding: 4.5pt 3pt; text-align: center; vertical-align: top;">${idx + 1}.</td>
                    <td style="border: 1px solid #334155; padding: 4.5pt 6pt; vertical-align: top; font-weight: bold;">${s.nama || '-'}</td>
                    <td style="border: 1px solid #334155; padding: 4.5pt 4pt; vertical-align: top; text-align: center;">${s.nisn || '-'}</td>
                    <td style="border: 1px solid #334155; padding: 4.5pt 4pt; vertical-align: top; text-align: center;">${s.kelas || '-'}</td>
                    <td style="border: 1px solid #334155; padding: 4.5pt 6pt; vertical-align: top;">${s.tempatTglLahir || '-'}</td>
                    <td style="border: 1px solid #334155; padding: 4.5pt 6pt; vertical-align: top;">${s.namaOrtu || '-'}</td>
                  </tr>
                `
                  )
                  .join('')}
              </tbody>
            </table>
          `;
        } else if (isMulti) {
          // Format vertikal bernomor (1 s.d. 3 siswa) TANPA tabel border kotak
          subjekContentHtml = `
            <div style="margin-left: 16pt; margin-bottom: 12pt;">
              ${rawDaftar.map((s: any, idx: number) => `
                <div style="margin-bottom: 10pt; page-break-inside: avoid;">
                  <table style="width: 100%; border: none; border-collapse: collapse; line-height: 1.45; font-size: 12pt;" border="0" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="width: 22pt; vertical-align: top; border: none; padding: 2pt 0; font-weight: bold;">${idx + 1}.</td>
                      <td style="width: 140pt; vertical-align: top; border: none; padding: 2pt 0;">Nama Lengkap</td>
                      <td style="width: 15pt; vertical-align: top; border: none; padding: 2pt 0;">:</td>
                      <td style="vertical-align: top; font-weight: bold; border: none; padding: 2pt 0;">${s.nama || '-'}</td>
                    </tr>
                    <tr>
                      <td style="border: none;"></td>
                      <td style="vertical-align: top; border: none; padding: 2pt 0;">NISN / NIS</td>
                      <td style="vertical-align: top; border: none; padding: 2pt 0;">:</td>
                      <td style="vertical-align: top; border: none; padding: 2pt 0;">${s.nisn || '-'}</td>
                    </tr>
                    ${s.tempatTglLahir ? `
                    <tr>
                      <td style="border: none;"></td>
                      <td style="vertical-align: top; border: none; padding: 2pt 0;">Tempat, Tanggal Lahir</td>
                      <td style="vertical-align: top; border: none; padding: 2pt 0;">:</td>
                      <td style="vertical-align: top; border: none; padding: 2pt 0;">${s.tempatTglLahir}</td>
                    </tr>
                    ` : ''}
                    <tr>
                      <td style="border: none;"></td>
                      <td style="vertical-align: top; border: none; padding: 2pt 0;">Kelas</td>
                      <td style="vertical-align: top; border: none; padding: 2pt 0;">:</td>
                      <td style="vertical-align: top; border: none; padding: 2pt 0;">${s.kelas || '-'}</td>
                    </tr>
                    ${s.namaOrtu && s.namaOrtu.trim() && s.namaOrtu !== '-' ? `
                    <tr>
                      <td style="border: none;"></td>
                      <td style="vertical-align: top; border: none; padding: 2pt 0;">Nama Orang Tua / Wali</td>
                      <td style="vertical-align: top; border: none; padding: 2pt 0;">:</td>
                      <td style="vertical-align: top; border: none; padding: 2pt 0;">${s.namaOrtu}</td>
                    </tr>
                    ` : ''}
                    ${s.alamat && s.alamat.trim() && s.alamat !== '-' ? `
                    <tr>
                      <td style="border: none;"></td>
                      <td style="vertical-align: top; border: none; padding: 2pt 0;">Alamat Domisili</td>
                      <td style="vertical-align: top; border: none; padding: 2pt 0;">:</td>
                      <td style="vertical-align: top; border: none; padding: 2pt 0;">${s.alamat}</td>
                    </tr>
                    ` : ''}
                  </table>
                </div>
              `).join('')}
            </div>
          `;
        } else {
          // Format tunggal vertikal (1 orang siswa)
          subjekContentHtml = `
            <div style="margin-left: 16pt; margin-bottom: 12pt;">
              <table style="width: 100%; border: none; border-collapse: collapse; line-height: 1.45; font-size: 12pt;" border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="width: 140pt; vertical-align: top; border: none; padding: 2pt 0;">Nama Lengkap</td>
                  <td style="width: 15pt; vertical-align: top; border: none; padding: 2pt 0;">:</td>
                  <td style="vertical-align: top; font-weight: bold; border: none; padding: 2pt 0;">${singleSiswa.nama || '-'}</td>
                </tr>
                <tr>
                  <td style="vertical-align: top; border: none; padding: 2pt 0;">NISN / NIS</td>
                  <td style="vertical-align: top; border: none; padding: 2pt 0;">:</td>
                  <td style="vertical-align: top; border: none; padding: 2pt 0;">${singleSiswa.nisn || '-'}</td>
                </tr>
                <tr>
                  <td style="vertical-align: top; border: none; padding: 2pt 0;">Tempat, Tanggal Lahir</td>
                  <td style="vertical-align: top; border: none; padding: 2pt 0;">:</td>
                  <td style="vertical-align: top; border: none; padding: 2pt 0;">${singleSiswa.tempatTglLahir || '-'}</td>
                </tr>
                <tr>
                  <td style="vertical-align: top; border: none; padding: 2pt 0;">Kelas</td>
                  <td style="vertical-align: top; border: none; padding: 2pt 0;">:</td>
                  <td style="vertical-align: top; border: none; padding: 2pt 0;">${singleSiswa.kelas || '-'}</td>
                </tr>
                <tr>
                  <td style="vertical-align: top; border: none; padding: 2pt 0;">Nama Orang Tua / Wali</td>
                  <td style="vertical-align: top; border: none; padding: 2pt 0;">:</td>
                  <td style="vertical-align: top; border: none; padding: 2pt 0;">${singleSiswa.namaOrtu || '-'}</td>
                </tr>
                ${singleSiswa.alamat && singleSiswa.alamat.trim() ? `
                <tr>
                  <td style="vertical-align: top; border: none; padding: 2pt 0;">Alamat</td>
                  <td style="vertical-align: top; border: none; padding: 2pt 0;">:</td>
                  <td style="vertical-align: top; border: none; padding: 2pt 0;">${singleSiswa.alamat}</td>
                </tr>
                ` : ''}
              </table>
            </div>
          `;
        }

        const pembukaSiswa = isMulti
          ? `Yang bertanda tangan dibawah ini Kepala ${schoolName}, Kecamatan ${cleanKec}, Kabupaten ${cleanKab}-${prov}, dengan ini menerangkan bahwa nama-nama peserta didik di bawah ini:`
          : `Yang bertanda tangan dibawah ini Kepala ${schoolName}, Kecamatan ${cleanKec}, Kabupaten ${cleanKab}-${prov}, dengan ini menerangkan bahwa:`;

        const peruntukanTeks = isMulti
          ? `Dengan ini memberikan <strong>REKOMENDASI</strong> kepada peserta didik tersebut di atas untuk:`
          : `Dengan ini memberikan <strong>REKOMENDASI</strong> kepada peserta didik tersebut di atas untuk:`;

        badanSurat = `
          <div style="text-align: center; margin: 12pt 0 16pt 0;">
            <p style="margin: 0; text-align: center; font-size: 13pt; font-weight: bold; text-decoration: underline; letter-spacing: 0.5px;">SURAT REKOMENDASI</p>
            <p class="nomor-surat" style="margin: 2pt 0 0 0; text-align: center; font-size: 11pt;">Nomor: ${surat.noSurat}</p>
          </div>

          <p style="text-align: justify; margin: 0 0 10pt 0; line-height: 1.45; font-size: 12pt;">
            ${pembukaSiswa}
          </p>

          ${subjekContentHtml}

          <p style="text-align: justify; margin: 0 0 8pt 0; line-height: 1.45; font-size: 12pt;">
            ${peruntukanTeks}
          </p>

          <div style="margin-left: ${useTable ? '0' : '16pt'}; margin-bottom: 10pt; padding: 8pt 12pt; background-color: #f8fafc; border-left: 3px solid #1e293b;">
            <p style="margin: 0; font-size: 12pt; font-weight: bold; line-height: 1.45;">
              ${data.keperluanRekomendasi || surat.perihal}
            </p>
          </div>
          ${catatanHtml}
          <p style="text-align: justify; margin-top: 10pt; line-height: 1.45; font-size: 12pt;">
            Demikian surat rekomendasi ini dibuat dengan sebenarnya dengan penuh rasa tanggung jawab agar dapat dipergunakan sebagaimana mestinya.
          </p>
        `;
      } else {
        // subJenis === 'ptk'
        const rawDaftarPtk = Array.isArray(data.daftarPtk) && data.daftarPtk.length > 0
          ? data.daftarPtk
          : data.nama
          ? [{
              id: '1',
              nama: data.nama,
              nip: data.nip || '-',
              nuptk: data.nuptk || '-',
              pangkatGol: data.pangkatGol || '-',
              jabatan: data.jabatan || 'Guru SDN 1 Pekutatan',
              unitKerja: data.unitKerja || schoolName,
            }]
          : [];

        const isMultiPtk = rawDaftarPtk.length > 1;
        const useTablePtk = rawDaftarPtk.length > 3;
        const singlePtk = rawDaftarPtk[0] || {
          nama: data.nama || '-',
          nip: data.nip || '-',
          nuptk: data.nuptk || '-',
          pangkatGol: data.pangkatGol || '-',
          jabatan: data.jabatan || 'Guru SDN 1 Pekutatan',
          unitKerja: data.unitKerja || schoolName,
        };

        const hasPertimbangan = Boolean(data.dasarPertimbangan && data.dasarPertimbangan.trim());
        const catatanHtml = hasPertimbangan
          ? `
          <p style="text-align: justify; margin: 0 0 10pt 0; line-height: 1.45; font-size: 12pt;">
            ${data.dasarPertimbangan.trim()}
          </p>
          `
          : '';

        let subjekContentHtml = '';
        if (useTablePtk) {
          // Format tabel bergaris HANYA jika PTK lebih dari 3 orang
          subjekContentHtml = `
            <table style="width: 100%; border-collapse: collapse; margin: 8pt 0 12pt 0; font-size: 11pt; line-height: 1.35;" border="1" cellpadding="5" cellspacing="0">
              <thead>
                <tr style="background-color: #f1f5f9; font-weight: bold; text-align: center;">
                  <th style="width: 24pt; border: 1px solid #334155; padding: 5pt 3pt; text-align: center;">No</th>
                  <th style="border: 1px solid #334155; padding: 5pt 6pt; text-align: left;">Nama Lengkap & Gelar</th>
                  <th style="width: 100pt; border: 1px solid #334155; padding: 5pt 4pt; text-align: center;">NIP / NIPPPK</th>
                  <th style="width: 75pt; border: 1px solid #334155; padding: 5pt 4pt; text-align: center;">Pangkat / Gol</th>
                  <th style="border: 1px solid #334155; padding: 5pt 6pt; text-align: left;">Jabatan</th>
                  <th style="border: 1px solid #334155; padding: 5pt 6pt; text-align: left;">Unit Kerja</th>
                </tr>
              </thead>
              <tbody>
                ${rawDaftarPtk
                  .map(
                    (p: any, idx: number) => `
                  <tr>
                    <td style="border: 1px solid #334155; padding: 4.5pt 3pt; text-align: center; vertical-align: top;">${idx + 1}.</td>
                    <td style="border: 1px solid #334155; padding: 4.5pt 6pt; vertical-align: top; font-weight: bold;">${p.nama || '-'}</td>
                    <td style="border: 1px solid #334155; padding: 4.5pt 4pt; vertical-align: top; text-align: center;">${p.nip || '-'}</td>
                    <td style="border: 1px solid #334155; padding: 4.5pt 4pt; vertical-align: top; text-align: center;">${p.pangkatGol || '-'}</td>
                    <td style="border: 1px solid #334155; padding: 4.5pt 6pt; vertical-align: top;">${p.jabatan || 'Guru SDN 1 Pekutatan'}</td>
                    <td style="border: 1px solid #334155; padding: 4.5pt 6pt; vertical-align: top;">${p.unitKerja || schoolName}</td>
                  </tr>
                `
                  )
                  .join('')}
              </tbody>
            </table>
          `;
        } else if (isMultiPtk) {
          // Format vertikal bernomor (1 s.d. 3 PTK) TANPA tabel border kotak
          subjekContentHtml = `
            <div style="margin-left: 16pt; margin-bottom: 12pt;">
              ${rawDaftarPtk.map((p: any, idx: number) => `
                <div style="margin-bottom: 10pt; page-break-inside: avoid;">
                  <table style="width: 100%; border: none; border-collapse: collapse; line-height: 1.45; font-size: 12pt;" border="0" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="width: 22pt; vertical-align: top; border: none; padding: 2pt 0; font-weight: bold;">${idx + 1}.</td>
                      <td style="width: 140pt; vertical-align: top; border: none; padding: 2pt 0;">Nama Lengkap & Gelar</td>
                      <td style="width: 15pt; vertical-align: top; border: none; padding: 2pt 0;">:</td>
                      <td style="vertical-align: top; font-weight: bold; border: none; padding: 2pt 0;">${p.nama || '-'}</td>
                    </tr>
                    <tr>
                      <td style="border: none;"></td>
                      <td style="vertical-align: top; border: none; padding: 2pt 0;">NIP / NIPPPK</td>
                      <td style="vertical-align: top; border: none; padding: 2pt 0;">:</td>
                      <td style="vertical-align: top; border: none; padding: 2pt 0;">${p.nip || '-'}</td>
                    </tr>
                    ${p.nuptk && p.nuptk !== '-' ? `
                    <tr>
                      <td style="border: none;"></td>
                      <td style="vertical-align: top; border: none; padding: 2pt 0;">NUPTK</td>
                      <td style="vertical-align: top; border: none; padding: 2pt 0;">:</td>
                      <td style="vertical-align: top; border: none; padding: 2pt 0;">${p.nuptk}</td>
                    </tr>
                    ` : ''}
                    <tr>
                      <td style="border: none;"></td>
                      <td style="vertical-align: top; border: none; padding: 2pt 0;">Pangkat / Golongan</td>
                      <td style="vertical-align: top; border: none; padding: 2pt 0;">:</td>
                      <td style="vertical-align: top; border: none; padding: 2pt 0;">${p.pangkatGol || '-'}</td>
                    </tr>
                    <tr>
                      <td style="border: none;"></td>
                      <td style="vertical-align: top; border: none; padding: 2pt 0;">Jabatan</td>
                      <td style="vertical-align: top; border: none; padding: 2pt 0;">:</td>
                      <td style="vertical-align: top; border: none; padding: 2pt 0;">${p.jabatan || 'Guru SDN 1 Pekutatan'}</td>
                    </tr>
                    <tr>
                      <td style="border: none;"></td>
                      <td style="vertical-align: top; border: none; padding: 2pt 0;">Unit Kerja</td>
                      <td style="vertical-align: top; border: none; padding: 2pt 0;">:</td>
                      <td style="vertical-align: top; border: none; padding: 2pt 0;">${p.unitKerja || schoolName}</td>
                    </tr>
                  </table>
                </div>
              `).join('')}
            </div>
          `;
        } else {
          // Format tunggal vertikal (1 orang PTK)
          subjekContentHtml = `
            <div style="margin-left: 16pt; margin-bottom: 12pt;">
              <table style="width: 100%; border: none; border-collapse: collapse; line-height: 1.45; font-size: 12pt;" border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="width: 140pt; vertical-align: top; border: none; padding: 2pt 0;">Nama Lengkap & Gelar</td>
                  <td style="width: 15pt; vertical-align: top; border: none; padding: 2pt 0;">:</td>
                  <td style="vertical-align: top; font-weight: bold; border: none; padding: 2pt 0;">${singlePtk.nama || '-'}</td>
                </tr>
                <tr>
                  <td style="vertical-align: top; border: none; padding: 2pt 0;">NIP / NIPPPK</td>
                  <td style="vertical-align: top; border: none; padding: 2pt 0;">:</td>
                  <td style="vertical-align: top; border: none; padding: 2pt 0;">${singlePtk.nip || '-'}</td>
                </tr>
                ${singlePtk.nuptk && singlePtk.nuptk !== '-' ? `
                <tr>
                  <td style="vertical-align: top; border: none; padding: 2pt 0;">NUPTK</td>
                  <td style="vertical-align: top; border: none; padding: 2pt 0;">:</td>
                  <td style="vertical-align: top; border: none; padding: 2pt 0;">${singlePtk.nuptk}</td>
                </tr>
                ` : ''}
                <tr>
                  <td style="vertical-align: top; border: none; padding: 2pt 0;">Pangkat / Golongan</td>
                  <td style="vertical-align: top; border: none; padding: 2pt 0;">:</td>
                  <td style="vertical-align: top; border: none; padding: 2pt 0;">${singlePtk.pangkatGol || '-'}</td>
                </tr>
                <tr>
                  <td style="vertical-align: top; border: none; padding: 2pt 0;">Jabatan</td>
                  <td style="vertical-align: top; border: none; padding: 2pt 0;">:</td>
                  <td style="vertical-align: top; border: none; padding: 2pt 0;">${singlePtk.jabatan || 'Guru SDN 1 Pekutatan'}</td>
                </tr>
                <tr>
                  <td style="vertical-align: top; border: none; padding: 2pt 0;">Unit Kerja</td>
                  <td style="vertical-align: top; border: none; padding: 2pt 0;">:</td>
                  <td style="vertical-align: top; border: none; padding: 2pt 0;">${singlePtk.unitKerja || schoolName}</td>
                </tr>
              </table>
            </div>
          `;
        }

        const pembukaPtk = isMultiPtk
          ? `Yang bertanda tangan dibawah ini Kepala ${schoolName}, Kecamatan ${cleanKec}, Kabupaten ${cleanKab}-${prov}, dengan ini memberikan rekomendasi kepada Pendidik dan Tenaga Kependidikan di bawah ini:`
          : `Yang bertanda tangan dibawah ini Kepala ${schoolName}, Kecamatan ${cleanKec}, Kabupaten ${cleanKab}-${prov}, dengan ini memberikan rekomendasi kepada:`;

        badanSurat = `
          <div style="text-align: center; margin: 12pt 0 16pt 0;">
            <p style="margin: 0; text-align: center; font-size: 13pt; font-weight: bold; text-decoration: underline; letter-spacing: 0.5px;">SURAT REKOMENDASI</p>
            <p class="nomor-surat" style="margin: 2pt 0 0 0; text-align: center; font-size: 11pt;">Nomor: ${surat.noSurat}</p>
          </div>

          <p style="text-align: justify; margin: 0 0 10pt 0; line-height: 1.45; font-size: 12pt;">
            ${pembukaPtk}
          </p>

          ${subjekContentHtml}

          <p style="text-align: justify; margin: 0 0 8pt 0; line-height: 1.45; font-size: 12pt;">
            Untuk: <strong>${data.keperluanRekomendasi || surat.perihal}</strong>.
          </p>
          ${catatanHtml}
          <p style="text-align: justify; margin-top: 10pt; line-height: 1.45; font-size: 12pt;">
            Demikian surat rekomendasi ini kami buat dengan sebenarnya untuk dapat dipergunakan sebagaimana mestinya dan menjadi bahan pertimbangan bagi pihak yang berwenang.
          </p>
        `;
      }
      break;
    }
  }

  // Tanda Tangan Block: Menggunakan tabel 2 kolom (Kiri kosong 52%, Kanan isi TTD 48%) agar di MS Word tetap berada di kanan dan tidak terpotong
  const defaultJabatanKepsek = formatJabatanPenandatangan(surat.jabatanPenandatangan || kepsek.jabatan, sekolah?.namaSekolah);

  const ttdBlock = customTtdBlock || `
    <table class="ttd-table" style="width: 100%; margin-top: 24pt; border: none; border-collapse: collapse;" border="0" cellpadding="0" cellspacing="0">
      <tr>
        <td style="width: 52%; border: none;">&nbsp;</td>
        <td style="width: 48%; text-align: center; vertical-align: top; border: none;">
          ${surat.jenisSurat !== 'surat_keputusan' ? `
            <p style="margin: 0 0 3pt 0; text-align: center;">${sekolah.desa || 'Pekutatan'}, ${tglIndo}</p>
          ` : ''}
          <p style="margin: 0; font-weight: bold; text-align: center;">${defaultJabatanKepsek},</p>
          <div style="height: 55pt;">&nbsp;</div>
          <p style="margin: 0; font-weight: bold; text-decoration: underline; text-align: center;">${kepsek.nama}</p>
          ${kepsek.pangkat ? `<p style="margin: 1.5pt 0 0 0; font-size: 11pt; text-align: center;">${kepsek.pangkat}</p>` : ''}
          <p style="margin: 2pt 0 0 0; font-size: 11pt; text-align: center;">NIP. ${kepsek.nip}</p>
        </td>
      </tr>
    </table>
  `;

  // Header Kop: Surat Ijin Guru (Permohonan Tidak Masuk Sekolah perorangan) TIDAK menggunakan kop dinas
  const isSuratIjin =
    surat.jenisSurat === 'surat_ijin_guru' ||
    Boolean(surat.perihal && /i[zj]in/i.test(surat.perihal)) ||
    Boolean(surat.namaKlasifikasi && /i[zj]in/i.test(surat.namaKlasifikasi));
  let kopHtml = '';

  if (!isSuratIjin) {
    kopHtml = buildOfficialKopHtml(sekolah, false);
  }

  const isSuratKeputusan = surat.jenisSurat === 'surat_keputusan';
  const suratFontFamily = isSuratKeputusan
    ? "'Bookman Old Style', 'Bookman', 'URW Bookman L', serif"
    : "'Times New Roman', Times, serif";

  // Bersihkan dan standarisasi nama sekolah pada bagian isi surat:
  // Seluruh teks "SDN 1 PEKUTATAN" maupun "SD NEGERI 1 PEKUTATAN" (kapital semua) diubah menjadi "SDN 1 Pekutatan"
  const cleanBadanSurat = badanSurat
    .replace(/SD\s*NEGERI\s*1\s*PEKUTATAN/g, 'SDN 1 Pekutatan')
    .replace(/SDN\s*1\s*PEKUTATAN/g, 'SDN 1 Pekutatan');

  const cleanTtdBlock = ttdBlock
    .replace(/Kepala\s+Sekolah,/gi, `${defaultJabatanKepsek},`)
    .replace(/Kepala\s+Sekolah\b/gi, defaultJabatanKepsek)
    .replace(/SD\s*NEGERI\s*1\s*PEKUTATAN/g, 'SDN 1 Pekutatan')
    .replace(/SDN\s*1\s*PEKUTATAN/g, 'SDN 1 Pekutatan');

  return `
    <div class="surat-resmi ${isSuratKeputusan ? 'is-surat-keputusan' : ''}" style="font-family: ${suratFontFamily}; font-size: 12pt; line-height: 1.35; color: #000000;">
      ${kopHtml}
      <div class="surat-body">
        ${cleanBadanSurat}
        ${cleanTtdBlock}
      </div>
    </div>
  `;
}

/**
 * Builds Lembar Disposisi Surat Masuk for printing
 */
export function buildLembarDisposisiHtml(surat: SuratMasuk, sekolah: PengaturanSekolah): string {
  return `
    <div style="border: 2px solid #000; padding: 16px; max-width: 780px; margin: 0 auto; font-family: 'Times New Roman', serif;">
      <div style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 12px;">
        <h3 style="margin: 0; font-size: 13pt; text-transform: uppercase;">${sekolah.instansiBaris1}</h3>
        <h4 style="margin: 2px 0; font-size: 12pt; text-transform: uppercase;">${sekolah.instansiBaris2}</h4>
        <h2 style="margin: 4px 0; font-size: 15pt; text-transform: uppercase; font-weight: 800;">${sekolah.namaSekolah}</h2>
        <p style="margin: 0; font-size: 9pt; font-style: italic;">${sekolah.alamat}, Kode Pos ${sekolah.kodePos}</p>
      </div>

      <div style="text-align: center; margin-bottom: 12px;">
        <h3 style="margin: 0; text-decoration: underline; font-size: 13pt;">LEMBAR DISPOSISI SURAT MASUK</h3>
      </div>

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 12px;" border="1">
        <tr>
          <td style="padding: 6px; width: 50%;"><strong>Nomor Agenda:</strong> ${surat.noAgenda}</td>
          <td style="padding: 6px; width: 50%;">
            <strong>Sifat:</strong> 
            [ ${surat.sifat === 'Sangat Penting' ? 'X' : ' '} ] Sangat Penting &nbsp;&nbsp;
            [ ${surat.sifat === 'Penting' ? 'X' : ' '} ] Penting &nbsp;&nbsp;
            [ ${surat.sifat === 'Biasa' ? 'X' : ' '} ] Biasa
          </td>
        </tr>
        <tr>
          <td style="padding: 6px;"><strong>Tanggal Terima:</strong> ${formatTanggalIndonesia(surat.tglTerima)}</td>
          <td style="padding: 6px;"><strong>Batas Tindak Lanjut:</strong> ${formatTanggalIndonesia(surat.tglTindakLanjut) || '-'}</td>
        </tr>
        <tr>
          <td style="padding: 6px;" colspan="2"><strong>Nomor Surat Asal:</strong> ${surat.noSurat} &nbsp;&nbsp;&nbsp; <strong>Tgl Surat:</strong> ${formatTanggalIndonesia(surat.tglSurat)}</td>
        </tr>
        <tr>
          <td style="padding: 6px;" colspan="2"><strong>Pengirim / Asal:</strong> ${surat.pengirim}</td>
        </tr>
        <tr>
          <td style="padding: 6px;" colspan="2"><strong>Perihal / Isi Ringkas:</strong><br>${surat.perihal}</td>
        </tr>
      </table>

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;" border="1">
        <tr>
          <td style="width: 50%; padding: 8px; vertical-align: top; height: 160px;">
            <strong>DITERUSKAN KEPADA:</strong><br><br>
            <div style="font-size: 11pt; font-weight: bold; margin-bottom: 8px;">
              ${surat.diteruskanKepada || '1. .....................................................'}
            </div>
            <p style="font-size: 9pt; color: #444; margin-top: 16px;">
              [ ] Tanggapi / Balas Surat<br>
              [ ] Hadir Mewakili Sekolah<br>
              [ ] Koordinasikan dgn Dewan Guru<br>
              [ ] Tindak Lanjuti & Laporkan<br>
              [ ] Arsipkan
            </p>
          </td>
          <td style="width: 50%; padding: 8px; vertical-align: top;">
            <strong>CATATAN / PETUNJUK KEPALA SEKOLAH:</strong><br><br>
            <div style="font-style: italic; font-size: 11pt; min-height: 100px;">
              ${surat.disposisi ? `"${surat.disposisi}"` : '........................................................................................................................'}
            </div>
              <div style="text-align: right; margin-top: 20px;">
                <p style="margin: 0; font-size: 10pt; font-weight: bold;">Kepala ${formatNamaSekolahIsi(sekolah?.namaSekolah)},</p>
                <div style="height: 40px;"></div>
                <p style="margin: 0; font-weight: bold; text-decoration: underline;">${sekolah?.kepalaSekolah || 'Gede Ariasa, S.Pd'}</p>
                <p style="margin: 2px 0 0 0; font-size: 9.5pt;">NIP. ${sekolah?.nipKepalaSekolah || '198906232014031002'}</p>
              </div>
          </td>
        </tr>
        ${surat.petugasTindakLanjut ? `
        <tr>
          <td colspan="2" style="padding: 8px; background-color: #f8fafc; font-size: 10pt;">
            <strong>REALISASI TINDAK LANJUT:</strong><br>
            Telah ditindaklanjuti oleh: <strong>${surat.petugasTindakLanjut}</strong> pada tanggal <strong>${formatTanggalIndonesia(surat.tglSelesaiTindakLanjut || '')}</strong>.
            ${surat.catatanTindakLanjut ? `<br>Catatan/Keterangan: <em>"${surat.catatanTindakLanjut}"</em>` : ''}
          </td>
        </tr>
        ` : ''}
      </table>
    </div>
  `;
}

/**
 * Builds printable official Kop Surat HTML for letters and attendance sheets
 */
export function buildOfficialKopHtml(sekolah: PengaturanSekolah, isCompact: boolean = false): string {
  if (sekolah?.kopImageUrl) {
    const maxHeight = isCompact ? '85px' : '135px';
    const mb = isCompact ? '3pt' : '10pt';
    return `
      <table class="kop-surat-table" width="100%" border="0" cellpadding="0" cellspacing="0" style="width: 100%; border-collapse: collapse; margin-bottom: ${mb}; border: none;">
        <tr>
          <td align="center" style="text-align: center; border: none; padding: 0;">
            <img src="${sekolah.kopImageUrl}" alt="Kop Surat" style="width: 100%; max-width: 720pt; max-height: ${maxHeight}; height: auto;" />
          </td>
        </tr>
      </table>
    `;
  }

  const logoBoxDim = isCompact ? 50 : 68;
  const logoCellWidth = isCompact ? '55pt' : '75pt';
  const aksaraSize = isCompact ? '6.5pt' : '8.5pt';
  const f1 = isCompact ? '9.0pt' : '11.5pt';
  const f2 = isCompact ? '8.5pt' : '11.0pt';
  const f3 = isCompact ? '8.0pt' : '10.5pt';
  const f4 = isCompact ? '11.0pt' : '14.0pt';
  const f5 = isCompact ? '6.5pt' : '8.5pt';
  const lineMb = isCompact ? '3pt' : '8pt';

  return `
    <table class="kop-surat-table" width="100%" border="0" cellpadding="0" cellspacing="0" style="width: 100%; border-collapse: collapse; border: none; margin-bottom: 1pt;">
      <tr>
        <!-- LOGO KIRI: PEMKAB JEMBRANA -->
        <td style="width: ${logoCellWidth}; text-align: center; vertical-align: middle; border: none; padding-right: 4pt;">
          ${
            sekolah?.logoUrl
              ? `<img src="${sekolah.logoUrl}" style="width: ${logoBoxDim}px; height: auto;" width="${logoBoxDim}" alt="Logo" />`
              : `
            <table width="${logoBoxDim}" height="${logoBoxDim}" border="2" cellpadding="0" cellspacing="0" style="width: ${logoBoxDim}px; height: ${logoBoxDim}px; border: 2px solid #15803d; background-color: #f0fdf4; border-radius: 50%; margin: 0 auto; text-align: center;">
              <tr>
                <td align="center" valign="middle" style="font-size: ${isCompact ? '5.5pt' : '7.5pt'}; font-weight: bold; color: #166534; text-align: center; line-height: 1.1; font-family: 'Times New Roman', serif; border: none; padding: 2px;">
                  PEMKAB<br/>JEMBRANA
                </td>
              </tr>
            </table>
          `
          }
        </td>

        <!-- TEKS TENGAH KOP KEDINASAN RESMI BALI -->
        <td style="text-align: center; vertical-align: middle; border: none; padding: 0 4pt;">
          <!-- Baris 1: Aksara Bali & Latin Pemkab Jembrana -->
          <div style="font-family: 'Times New Roman', serif; font-size: ${aksaraSize}; line-height: 1.15; text-align: center; color: #000;">ᬧᬫᬾᬭᬶᬦ᭄ᬢᬄᬓᬩᬸᬧᬢᬾᬦ᭄ᬚᬾᬫ᭄ᬩ᭄ᬭᬦ</div>
          <div style="font-family: 'Times New Roman', serif; font-size: ${f1}; font-weight: bold; text-transform: uppercase; line-height: 1.15; text-align: center; color: #000;">${sekolah?.instansiBaris1 || 'PEMERINTAH KABUPATEN JEMBRANA'}</div>

          <!-- Baris 2: Aksara Bali & Latin Disdikpora -->
          <div style="font-family: 'Times New Roman', serif; font-size: ${aksaraSize}; line-height: 1.15; text-align: center; color: #000; margin-top: 1pt;">ᬤᬶᬦᬲ᭄ᬧᭂᬦ᭄ᬤᬶᬤᬶᬓᬦ᭄ᬓᭂᬧᭂᬫᬸᬤᬵᬦ᭄ᬤᬦ᭄ᬑᬮᬄᬭᬵᬕ</div>
          <div style="font-family: 'Times New Roman', serif; font-size: ${f2}; font-weight: bold; text-transform: uppercase; line-height: 1.15; text-align: center; color: #000;">${sekolah?.instansiBaris2 || 'DINAS PENDIDIKAN KEPEMUDAAN DAN OLAHRAGA'}</div>

          <!-- Baris 3: Aksara Bali & Latin Satuan Pendidikan Formal -->
          <div style="font-family: 'Times New Roman', serif; font-size: ${aksaraSize}; line-height: 1.15; text-align: center; color: #000; margin-top: 1pt;">ᬲᬢᬸᬯᬦ᭄ᬧᭂᬦ᭄ᬤᬶᬤᬶᬓᬦ᭄ᬨᭀᬃᬫᬮ᭄</div>
          <div style="font-family: 'Times New Roman', serif; font-size: ${f3}; font-weight: bold; text-transform: uppercase; line-height: 1.15; text-align: center; color: #000;">${sekolah?.instansiBaris3 || 'SATUAN PENDIDIKAN FORMAL'}</div>

          <!-- Baris 4: Aksara Bali & Latin Nama Sekolah -->
          <div style="font-family: 'Times New Roman', serif; font-size: ${aksaraSize}; line-height: 1.15; text-align: center; color: #000; margin-top: 1pt;">ᬲ᭄ᬤ᭟ᬦᭂᬕᭂᬭᬶ᭑ᬧᭂᬓᬸᬢᬢᬦ᭄</div>
          <div style="font-family: 'Times New Roman', serif; font-size: ${f4}; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; line-height: 1.2; text-align: center; color: #000;">${sekolah?.namaSekolah || 'SD NEGERI 1 PEKUTATAN'}</div>

          <!-- Baris 5: Alamat & Kontak -->
          <div style="font-family: 'Times New Roman', serif; font-size: ${f5}; font-style: italic; color: #111; line-height: 1.15; text-align: center; margin-top: 1.5pt;">
            Alamat : ${sekolah?.alamat || 'Jalan Cempaka No. 2, Br. Dangin Pangkung, Desa Pekutatan (82262)'}
          </div>
          <div style="font-family: 'Times New Roman', serif; font-size: ${f5}; font-style: italic; color: #111; line-height: 1.15; text-align: center;">
            Email : ${sekolah?.email || 'sdnegeri1pekutatan@gmail.com'}
          </div>
        </td>

        <!-- LOGO KANAN: TUT WURI HANDAYANI -->
        <td style="width: ${logoCellWidth}; text-align: center; vertical-align: middle; border: none; padding-left: 4pt;">
          <table width="${logoBoxDim}" height="${logoBoxDim}" border="2" cellpadding="0" cellspacing="0" style="width: ${logoBoxDim}px; height: ${logoBoxDim}px; border: 2px solid #1e3a8a; background-color: #eff6ff; border-radius: 50%; margin: 0 auto; text-align: center;">
            <tr>
              <td align="center" valign="middle" style="font-size: ${isCompact ? '5.5pt' : '7.5pt'}; font-weight: bold; color: #1e3a8a; text-align: center; line-height: 1.1; font-family: 'Times New Roman', serif; border: none; padding: 2px;">
                TUT WURI<br/>HANDAYANI
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- Garis Ganda Resmi Kedinasan (double border) -->
    <table class="kop-surat-table" width="100%" border="0" cellpadding="0" cellspacing="0" style="width: 100%; border-collapse: collapse; margin-top: 2pt; margin-bottom: ${lineMb}; border: none;">
      <tr>
        <td style="border-bottom: 2.5pt double #000000; height: 1px; padding: 0; font-size: 1px; line-height: 1px;">&nbsp;</td>
      </tr>
    </table>
  `;
}

/**
 * Triggers native browser print window in LANDSCAPE format (Default: F4 / Folio 215mm x 330mm)
 */
export function printLandscapeHtml(
  htmlContent: string,
  title: string = 'Cetak Absensi Resmi',
  paperSize: PaperSize = 'F4',
  margins: { top?: string; right?: string; bottom?: string; left?: string } = {}
) {
  const printWindow = window.open('', '_blank', 'width=1150,height=800');
  if (!printWindow) {
    alert('Jendela cetak terblokir oleh browser. Harap izinkan pop-up.');
    return;
  }

  const isF4 = paperSize === 'F4';

  const isPresensiSiswa =
    /presensi.*siswa|absen.*siswa|daftar hadir.*peserta didik/i.test(title) ||
    /absen-siswa|peserta didik/i.test(htmlContent);

  // Margins:
  // For Presensi Siswa: top 1cm, right 1cm, bottom 2cm, left 3cm
  // For other landscape (like PTK attendance): default 5mm 8mm 4mm 8mm
  const topMargin = margins.top || (isPresensiSiswa ? '1cm' : '5mm');
  const rightMargin = margins.right || (isPresensiSiswa ? '1cm' : '8mm');
  const bottomMargin = margins.bottom || (isPresensiSiswa ? '2cm' : '4mm');
  const leftMargin = margins.left || (isPresensiSiswa ? '3cm' : '8mm');
  const pageMarginRule = `${topMargin} ${rightMargin} ${bottomMargin} ${leftMargin}`;

  printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title></title>
  <style>
    @page {
      size: ${isF4 ? '330mm 215mm' : '297mm 210mm'};
      margin: 0; /* Menghilangkan header (jam, tgl) dan footer (about:blank) bawaan browser */
    }
    @media print {
      @page {
        size: ${isF4 ? '330mm 215mm' : '297mm 210mm'};
        margin: 0;
      }
      html, body {
        width: 100% !important;
        margin: 0 !important;
        padding: 0 !important;
        background: #ffffff !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      body {
        padding-top: ${topMargin} !important;
        padding-right: ${rightMargin} !important;
        padding-bottom: ${bottomMargin} !important;
        padding-left: ${leftMargin} !important;
        box-sizing: border-box !important;
      }
      .page-break {
        page-break-before: always !important;
        break-before: page !important;
        clear: both !important;
        padding-top: ${topMargin} !important;
      }
      .absen-ptk-kolektif-sheet, .absen-ptk-rekap-sheet {
        page-break-inside: avoid !important;
      }
      table {
        page-break-inside: avoid !important;
      }
      tr {
        page-break-inside: avoid !important;
        page-break-after: auto;
      }
      thead {
        display: table-header-group;
      }
      .no-print {
        display: none !important;
      }
      .sheet-wrapper {
        box-shadow: none !important;
        border: none !important;
        padding: 0 !important;
        margin: 0 !important;
        max-width: 100% !important;
        width: 100% !important;
      }
    }
    body {
      font-family: 'Times New Roman', Times, serif;
      background: #f1f5f9;
      margin: 0;
      padding: 16px;
      color: #000000;
    }
    .sheet-wrapper {
      background: #ffffff;
      max-width: 1320px;
      margin: 0 auto;
      padding: 16px 22px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      border: 1px solid #cbd5e1;
      box-sizing: border-box;
    }
  </style>
</head>
<body>
  <div class="no-print" style="position: sticky; top: 0; z-index: 9999; background: #0f172a; color: #ffffff; padding: 10px 18px; margin: -16px -16px 16px -16px; display: flex; align-items: center; justify-content: space-between; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 13px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.2);">
    <div style="display: flex; align-items: center; gap: 10px;">
      <span style="font-weight: 600; font-size: 13px;">
        Pratinjau Cetak Presensi
      </span>
    </div>
    <div style="display: flex; align-items: center; gap: 8px;">
      <button onclick="window.print()" style="background: #2563eb; color: #ffffff; font-weight: 600; border: none; padding: 6px 16px; border-radius: 6px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; font-size: 12px;">
        🖨️ Cetak / Simpan PDF
      </button>
      <button onclick="window.close()" style="background: transparent; color: #94a3b8; border: 1px solid #475569; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 12px;">
        Tutup
      </button>
    </div>
  </div>
  <div class="sheet-wrapper">
    ${htmlContent}
  </div>
  <script>
    window.onload = function() {
      document.title = "";
      setTimeout(function() {
        window.print();
      }, 400);
    };
  </script>
</body>
</html>`);
  printWindow.document.close();
}

/**
 * Triggers native browser print window in PORTRAIT format (Default: F4 / Folio 215mm x 330mm or A4 210mm x 297mm)
 * Primary / default format for student attendance registers.
 */
export function printPortraitHtml(
  htmlContent: string,
  title: string = 'Cetak Presensi Siswa (Potret)',
  paperSize: PaperSize = 'F4',
  margins: { top?: string; right?: string; bottom?: string; left?: string } = {}
) {
  const printWindow = window.open('', '_blank', 'width=950,height=850');
  if (!printWindow) {
    alert('Jendela cetak terblokir oleh browser. Harap izinkan pop-up.');
    return;
  }

  const isF4 = paperSize === 'F4';

  const isPresensiSiswa =
    /presensi.*siswa|absen.*siswa|daftar hadir.*peserta didik/i.test(title) ||
    /absen-siswa|peserta didik/i.test(htmlContent);

  // Margins:
  // For Presensi Siswa: top 1cm, right 1cm, bottom 2cm, left 3cm
  // For other portrait: default top 1cm, right 1cm, bottom 2cm, left 3cm if presensi, else default 4mm 6mm
  const topMargin = margins.top || (isPresensiSiswa ? '1cm' : '4mm');
  const rightMargin = margins.right || (isPresensiSiswa ? '1cm' : '6mm');
  const bottomMargin = margins.bottom || (isPresensiSiswa ? '2cm' : '4mm');
  const leftMargin = margins.left || (isPresensiSiswa ? '3cm' : '6mm');

  printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title></title>
  <style>
    @page {
      size: ${isF4 ? '215mm 330mm' : '210mm 297mm'} portrait;
      margin: 0; /* Menghilangkan header (jam, tgl) dan footer (about:blank) bawaan browser */
    }
    @media print {
      @page {
        size: ${isF4 ? '215mm 330mm' : '210mm 297mm'} portrait;
        margin: 0;
      }
      html, body {
        width: 100% !important;
        margin: 0 !important;
        padding: 0 !important;
        background: #ffffff !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      body {
        padding-top: ${topMargin} !important;
        padding-right: ${rightMargin} !important;
        padding-bottom: ${bottomMargin} !important;
        padding-left: ${leftMargin} !important;
        box-sizing: border-box !important;
      }
      .page-break {
        page-break-before: always !important;
        break-before: page !important;
        clear: both !important;
        padding-top: ${topMargin} !important;
      }
      .absen-siswa-sheet, .absen-ptk-kolektif-sheet, .absen-ptk-rekap-sheet {
        page-break-inside: avoid !important;
      }
      table {
        page-break-inside: auto !important;
      }
      tr {
        page-break-inside: avoid !important;
        page-break-after: auto;
      }
      thead {
        display: table-header-group;
      }
      .no-print {
        display: none !important;
      }
      .sheet-wrapper {
        box-shadow: none !important;
        border: none !important;
        padding: 0 !important;
        margin: 0 !important;
        max-width: 100% !important;
        width: 100% !important;
      }
    }
    body {
      font-family: 'Times New Roman', Times, serif;
      background: #f1f5f9;
      margin: 0;
      padding: 16px;
      color: #000000;
    }
    .sheet-wrapper {
      background: #ffffff;
      max-width: 820px;
      margin: 0 auto;
      padding: 12px 16px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      border: 1px solid #cbd5e1;
      box-sizing: border-box;
    }
  </style>
</head>
<body>
  <div class="no-print" style="position: sticky; top: 0; z-index: 9999; background: #0f172a; color: #ffffff; padding: 10px 18px; margin: -16px -16px 14px -16px; display: flex; align-items: center; justify-content: space-between; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 13px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.2);">
    <div style="display: flex; align-items: center; gap: 10px;">
      <span style="font-weight: 600; font-size: 13px;">
        Pratinjau Cetak Presensi Siswa (Potret ${paperSize})
      </span>
      <span style="font-size: 11px; background: #16a34a; color: #ffffff; padding: 2px 8px; border-radius: 9999px; font-weight: bold;">
        Pilihan Utama
      </span>
    </div>
    <div style="display: flex; align-items: center; gap: 8px;">
      <button onclick="window.print()" style="background: #2563eb; color: #ffffff; font-weight: 600; border: none; padding: 6px 16px; border-radius: 6px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; font-size: 12px;">
        🖨️ Cetak / Simpan PDF
      </button>
      <button onclick="window.close()" style="background: transparent; color: #94a3b8; border: 1px solid #475569; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 12px;">
        Tutup
      </button>
    </div>
  </div>
  <div class="sheet-wrapper">
    ${htmlContent}
  </div>
  <script>
    window.onload = function() {
      document.title = "";
      setTimeout(function() {
        window.print();
      }, 400);
    };
  </script>
</body>
</html>`);
  printWindow.document.close();
}

export interface AbsenGuruOptions {
  guruList: Guru[];
  sekolah: PengaturanSekolah;
  year?: number;
  month?: number; // 1 - 12
  bulanNama?: string;
  holidays?: Record<number, string>; // day -> reason
  mode?: 'kolektif_per_lembar' | 'rekap_bulanan' | 'kolektif';
  ptkPerPage?: number;
  filterKategori?: 'semua' | 'kepala_sekolah' | 'guru' | 'tu';
  showKop?: boolean;
}

const NAMA_HARI_INDONESIA = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const NAMA_BULAN_INDONESIA = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

/**
 * Builds printable Attendance Sheet for PTK (Pendidik & Tenaga Kependidikan)
 * Formats:
 * 1. 'kolektif_per_lembar': Presensi Harian dengan Tanda Tangan Pagi & Sore terbagi rapi per halaman (4 PTK per lembar Landscape F4)
 * 2. 'rekap_bulanan': Format Matriks Resmi Kedinasan BKN/Kemendikbud (Semua PTK dalam 1 Lembar Landscape F4)
 * 3. 'kolektif': Semua PTK dalam satu tabel memanjang
 */
export function buildAbsenGuruHtml(
  guruList: Guru[],
  sekolah: PengaturanSekolah,
  bulanOrOptions: string | AbsenGuruOptions = 'September 2026',
  yearParam?: number,
  monthParam?: number,
  holidaysParam?: Record<number, string>
): string {
  let year = yearParam || 2026;
  let month = monthParam || 9;
  let bulanNama = typeof bulanOrOptions === 'string' ? bulanOrOptions : 'September 2026';
  let holidays: Record<number, string> = holidaysParam || {};
  let mode: 'kolektif_per_lembar' | 'rekap_bulanan' | 'kolektif' = 'kolektif_per_lembar';
  let ptkPerPage = 5;
  let filterKategori: 'semua' | 'kepala_sekolah' | 'guru' | 'tu' = 'semua';
  let showKop = false; // Pilihan utama: cetak presensi tanpa KOP

  if (typeof bulanOrOptions === 'object') {
    year = bulanOrOptions.year || 2026;
    month = bulanOrOptions.month || 9;
    bulanNama = bulanOrOptions.bulanNama || `${NAMA_BULAN_INDONESIA[month - 1]} ${year}`;
    holidays = bulanOrOptions.holidays || {};
    mode = bulanOrOptions.mode || 'kolektif_per_lembar';
    ptkPerPage = bulanOrOptions.ptkPerPage || 5;
    filterKategori = bulanOrOptions.filterKategori || 'semua';
    showKop = bulanOrOptions.showKop ?? false;
  }

  // Filter list if requested
  const targetList = filterKategori === 'semua'
    ? guruList
    : guruList.filter((g) => g.jenisPtk === filterKategori);

  const activePTKList = targetList.length > 0 ? targetList : guruList;

  // Jumlah hari dalam bulan
  const totalDays = new Date(year, month, 0).getDate();
  const holidayCount = Object.keys(holidays).length;
  const effectiveDays = Math.max(0, totalDays - holidayCount);

  const kopHtml = showKop ? buildOfficialKopHtml(sekolah, true) : '';

  // =========================================================================
  // FORMAT 1: FORMAT MATRIKS REKAPITULASI BULANAN PTK (SEMUA PTK 1 LEMBAR)
  // =========================================================================
  if (mode === 'rekap_bulanan') {
    const tglColWidth = 15;
    const rekapColWidth = 16;
    const parafColWidth = 50;
    const noColWidth = 20;
    const namaColWidth = 140;
    const jabColWidth = 65;

    return `
      <div class="absen-ptk-rekap-sheet" style="font-family: 'Times New Roman', serif; color: #000; width: 100%; margin: 0 auto; page-break-inside: avoid;">
        ${kopHtml}

        <div style="text-align: center; margin-top: 1pt; margin-bottom: 3pt;">
          <h3 style="margin: 0; text-decoration: underline; font-size: 10pt; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; line-height: 1.15;">
            DAFTAR REKAPITULASI PRESENSI BULANAN PENDIDIK & TENAGA KEPENDIDIKAN (PTK)
          </h3>
          <p style="margin: 1pt 0 0 0; font-size: 8pt; line-height: 1.15;">
            Bulan: <strong>${bulanNama}</strong> &nbsp;|&nbsp; Tahun Ajaran 2026/2027
          </p>
        </div>

        <table width="100%" border="1" cellspacing="0" cellpadding="0" class="absen-ptk-rekap-table" style="width: 100%; border-collapse: collapse; font-size: 6.0pt; border: 1.5pt solid #000; table-layout: fixed; mso-table-layout-alt: fixed;">
          <colgroup>
            <col width="${noColWidth}" style="width: ${noColWidth}pt;" />
            <col width="${namaColWidth}" style="width: ${namaColWidth}pt;" />
            <col width="${jabColWidth}" style="width: ${jabColWidth}pt;" />
            ${Array.from({ length: totalDays })
              .map(() => `<col width="${tglColWidth}" style="width: ${tglColWidth}pt;" />`)
              .join('')}
            <col width="${rekapColWidth}" style="width: ${rekapColWidth}pt;" />
            <col width="${rekapColWidth}" style="width: ${rekapColWidth}pt;" />
            <col width="${rekapColWidth}" style="width: ${rekapColWidth}pt;" />
            <col width="${rekapColWidth}" style="width: ${rekapColWidth}pt;" />
            <col width="${rekapColWidth}" style="width: ${rekapColWidth}pt;" />
            <col width="${parafColWidth}" style="width: ${parafColWidth}pt;" />
          </colgroup>
          <thead>
            <tr style="background: #f1f5f9; text-align: center; height: 13pt; mso-height-rule: exactly;">
              <th rowspan="2" width="${noColWidth}" style="width: ${noColWidth}pt; height: 22pt; padding: 1px 0; border: 1px solid #000; font-weight: bold; font-size: 6.5pt; text-align: center; vertical-align: middle;">No</th>
              <th rowspan="2" width="${namaColWidth}" style="width: ${namaColWidth}pt; height: 22pt; padding: 1px 2px; border: 1px solid #000; font-weight: bold; text-align: left; font-size: 6.5pt; vertical-align: middle;">Nama Lengkap PTK & NIP</th>
              <th rowspan="2" width="${jabColWidth}" style="width: ${jabColWidth}pt; height: 22pt; padding: 1px 1px; border: 1px solid #000; font-weight: bold; font-size: 6.5pt; text-align: center; vertical-align: middle;">Jabatan / Gol</th>
              <th colspan="${totalDays}" style="padding: 1px; border: 1px solid #000; font-weight: bold; font-size: 6.5pt;">Tanggal</th>
              <th colspan="5" style="padding: 1px; border: 1px solid #000; font-weight: bold; background: #e0f2fe; font-size: 6.5pt;">Rekapitulasi</th>
              <th rowspan="2" width="${parafColWidth}" style="width: ${parafColWidth}pt; height: 22pt; padding: 1px 1px; border: 1px solid #000; font-weight: bold; font-size: 6.5pt; text-align: center; vertical-align: middle;">Paraf / TTD</th>
            </tr>
            <tr style="background: #f8fafc; text-align: center; font-size: 6pt; font-weight: bold; height: 9.5pt; mso-height-rule: exactly;">
              ${Array.from({ length: totalDays })
                .map((_, i) => {
                  const d = i + 1;
                  const isHol = !!holidays[d];
                  return `<th width="${tglColWidth}" style="width: ${tglColWidth}pt; height: 9.5pt; padding: 0; border: 1px solid #000; font-size: 6pt; vertical-align: middle; ${
                    isHol ? 'background: #fee2e2; color: #b91c1c;' : ''
                  }">${d}</th>`;
                })
                .join('')}
              <th width="${rekapColWidth}" style="width: ${rekapColWidth}pt; height: 9.5pt; padding: 0; border: 1px solid #000; background: #e0f2fe; font-size: 6pt; vertical-align: middle;" title="Hadir">H</th>
              <th width="${rekapColWidth}" style="width: ${rekapColWidth}pt; height: 9.5pt; padding: 0; border: 1px solid #000; background: #e0f2fe; font-size: 6pt; vertical-align: middle;" title="Sakit">S</th>
              <th width="${rekapColWidth}" style="width: ${rekapColWidth}pt; height: 9.5pt; padding: 0; border: 1px solid #000; background: #e0f2fe; font-size: 6pt; vertical-align: middle;" title="Izin">I</th>
              <th width="${rekapColWidth}" style="width: ${rekapColWidth}pt; height: 9.5pt; padding: 0; border: 1px solid #000; background: #e0f2fe; font-size: 6pt; vertical-align: middle;" title="Dinas Luar">DL</th>
              <th width="${rekapColWidth}" style="width: ${rekapColWidth}pt; height: 9.5pt; padding: 0; border: 1px solid #000; background: #e0f2fe; font-size: 6pt; vertical-align: middle;" title="Tanpa Keterangan">TK</th>
            </tr>
          </thead>
          <tbody>
            ${activePTKList
              .map((ptk, idx) => `
              <tr style="height: 11pt; mso-height-rule: exactly;">
                <td width="${noColWidth}" style="width: ${noColWidth}pt; height: 11pt; padding: 0 1px; border: 1px solid #000; text-align: center; vertical-align: middle; font-size: 6pt; mso-line-height-rule: exactly; line-height: 11pt;">${idx + 1}</td>
                <td width="${namaColWidth}" style="width: ${namaColWidth}pt; height: 11pt; padding: 0 2px; border: 1px solid #000; text-align: left; vertical-align: middle;">
                  <strong style="font-size: 6.5pt; line-height: 1.05; display: block;">${ptk.nama}</strong>
                  <span style="font-size: 5.5pt; color: #334155; line-height: 1.0; display: block;">
                    ${ptk.nip && ptk.nip !== '-' ? 'NIP. ' + ptk.nip : (ptk.nuptk ? 'NUPTK. ' + ptk.nuptk : '-')}
                  </span>
                </td>
                <td width="${jabColWidth}" style="width: ${jabColWidth}pt; height: 11pt; padding: 0 1px; border: 1px solid #000; text-align: center; vertical-align: middle; font-size: 5.5pt; line-height: 1.05;">
                  ${ptk.jabatan || 'Guru'}<br/>
                  <span style="font-size: 5pt; color: #475569;">${ptk.pangkatGol || ''}</span>
                </td>
                ${Array.from({ length: totalDays })
                  .map((_, i) => {
                    const d = i + 1;
                    const isHol = !!holidays[d];
                    if (isHol) {
                      return `<td width="${tglColWidth}" style="width: ${tglColWidth}pt; height: 11pt; padding: 0; border: 1px solid #000; background-color: #fee2e2; color: #b91c1c; text-align: center; font-size: 5.5pt; font-weight: bold; vertical-align: middle; mso-line-height-rule: exactly; line-height: 11pt;">L</td>`;
                    }
                    return `<td width="${tglColWidth}" style="width: ${tglColWidth}pt; height: 11pt; padding: 0; border: 1px solid #000; text-align: center; font-size: 5.5pt; vertical-align: middle; mso-line-height-rule: exactly; line-height: 11pt;">&nbsp;</td>`;
                  })
                  .join('')}
                <td width="${rekapColWidth}" style="width: ${rekapColWidth}pt; height: 11pt; padding: 0; border: 1px solid #000; text-align: center; font-size: 5.5pt; vertical-align: middle; mso-line-height-rule: exactly; line-height: 11pt;">&nbsp;</td>
                <td width="${rekapColWidth}" style="width: ${rekapColWidth}pt; height: 11pt; padding: 0; border: 1px solid #000; text-align: center; font-size: 5.5pt; vertical-align: middle; mso-line-height-rule: exactly; line-height: 11pt;">&nbsp;</td>
                <td width="${rekapColWidth}" style="width: ${rekapColWidth}pt; height: 11pt; padding: 0; border: 1px solid #000; text-align: center; font-size: 5.5pt; vertical-align: middle; mso-line-height-rule: exactly; line-height: 11pt;">&nbsp;</td>
                <td width="${rekapColWidth}" style="width: ${rekapColWidth}pt; height: 11pt; padding: 0; border: 1px solid #000; text-align: center; font-size: 5.5pt; vertical-align: middle; mso-line-height-rule: exactly; line-height: 11pt;">&nbsp;</td>
                <td width="${rekapColWidth}" style="width: ${rekapColWidth}pt; height: 11pt; padding: 0; border: 1px solid #000; text-align: center; font-size: 5.5pt; vertical-align: middle; mso-line-height-rule: exactly; line-height: 11pt;">&nbsp;</td>
                <td width="${parafColWidth}" style="width: ${parafColWidth}pt; height: 11pt; padding: 0; border: 1px solid #000; text-align: center; vertical-align: middle; mso-line-height-rule: exactly; line-height: 11pt;">&nbsp;</td>
              </tr>
            `)
              .join('')}
          </tbody>
        </table>

        <!-- Ringkasan & Tanda Tangan Pengesahan -->
        <table width="100%" border="0" cellpadding="0" cellspacing="0" style="width: 100%; margin-top: 3pt; border-collapse: collapse; border: none; font-size: 7.5pt; font-family: 'Times New Roman', serif;">
          <tr>
            <td style="width: 62%; vertical-align: top; text-align: left; line-height: 1.2; border: none; padding-right: 12px;">
              <strong>Keterangan Presensi Bulan ${bulanNama}:</strong><br/>
              • Hari Kalender: <strong>${totalDays} Hari</strong> &nbsp;|&nbsp;
              • Hari Libur: <strong>${holidayCount} Hari</strong> &nbsp;|&nbsp;
              • Hari Efektif: <strong>${effectiveDays} Hari</strong><br/>
              <span style="font-size: 6.5pt; color: #475569; font-style: italic;">
                * Keterangan Simbol: <strong>H</strong> = Hadir, <strong>S</strong> = Sakit, <strong>I</strong> = Izin, <strong>DL</strong> = Dinas Luar, <strong>TK</strong> = Tanpa Keterangan, <strong>L</strong> = Libur Resmi.
              </span>
            </td>
            <td style="width: 38%; vertical-align: top; text-align: center; border: none; line-height: 1.15;">
              <p style="margin: 0; font-size: 7.5pt;">Pekutatan, ${formatTanggalIndonesia(new Date().toISOString())}</p>
              <p style="margin: 0; font-size: 7.5pt; font-weight: bold;">Kepala ${formatNamaSekolahIsi(sekolah?.namaSekolah)},</p>
              <p style="margin: 0; font-size: 16pt; line-height: 1; mso-line-height-rule: exactly;">&nbsp;</p>
              <p style="margin: 0; font-size: 8pt; font-weight: bold; text-decoration: underline;">${sekolah.kepalaSekolah}</p>
              <p style="margin: 0; font-size: 7.5pt;">NIP. ${sekolah.nipKepalaSekolah}</p>
            </td>
          </tr>
        </table>
      </div>
    `;
  }

  // =========================================================================
  // FORMAT 2: FORMAT HARIAN DENGAN TANDA TANGAN PAGI - SORE (Buku Absensi PTK)
  // (Diatur rapi per lembar Landscape F4 dengan 5 PTK per lembar sesuai standar)
  // =========================================================================
  const bulanHanyaNama = NAMA_BULAN_INDONESIA[month - 1];

  const buildCollectiveTableSheet = (
    ptkSubList: Guru[],
    pageInfo?: { current: number; total: number },
    isLast: boolean = true
  ) => {
    const count = ptkSubList.length;
    // Total lebar tabel dalam points untuk Landscape F4: ~820 pt dengan margin samping 6mm
    // Dibuat lebih lega untuk Pagi, Sore, dan TTD
    const noColPt = 20;
    const dateColPt = 78;
    const totalRemainingPt = 820 - noColPt - dateColPt; // ~722 pt
    const ptkBlockPt = count > 0 ? Math.floor(totalRemainingPt / count) : 144; // ~144 pt per PTK pada kelipatan 5
    
    // 4 Sub-kolom per PTK (Pagi, TTD, Sore, TTD) - dibuat lebih lega dan proporsional
    const subPagiPt = Math.floor(ptkBlockPt * 0.21); // ~30 pt (cukup untuk jam "07.00")
    const subTtdPt = Math.floor((ptkBlockPt - subPagiPt * 2) / 2); // ~42 pt (lebih lega untuk tanda tangan)
    const subSorePt = subPagiPt; // ~30 pt (cukup untuk jam "14.30")
    const subTtdSorePt = ptkBlockPt - (subPagiPt + subTtdPt + subSorePt); // ~42 pt (lebih lega untuk tanda tangan)
    const totalPtkColsPt = ptkBlockPt * count;
    const rowHeightPt = showKop ? 10 : 12; // Lebih lega saat tanpa KOP (12pt vs 10pt)
    const rowHeightPx = showKop ? 13 : 16;

    return `
      <div class="absen-ptk-kolektif-sheet" style="font-family: 'Times New Roman', serif; color: #000; width: 100%; margin: 0 auto; page-break-inside: avoid; break-inside: avoid;">
        ${kopHtml}

        <div style="text-align: center; margin-top: ${showKop ? '1pt' : '2pt'}; margin-bottom: ${showKop ? '3pt' : '5pt'};">
          <h3 style="margin: 0; text-decoration: underline; font-size: ${showKop ? '9.5pt' : '10.5pt'}; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; line-height: 1.15;">
            DAFTAR HADIR / PRESENSI PENDIDIK & TENAGA KEPENDIDIKAN (PTK)
          </h3>
          <p style="margin: 1.5pt 0 0 0; font-size: ${showKop ? '8.0pt' : '8.5pt'}; line-height: 1.15;">
            Bulan: <strong>${bulanNama}</strong> &nbsp;|&nbsp; Tahun Ajaran 2026/2027
            ${pageInfo && pageInfo.total > 1 ? ` &nbsp;|&nbsp; Halaman <strong>${pageInfo.current} dari ${pageInfo.total}</strong>` : ''}
          </p>
        </div>

        <table width="100%" border="1" cellspacing="0" cellpadding="0" class="absen-ptk-table" style="width: 100%; border-collapse: collapse; font-size: 6.5pt; border: 1.5pt solid #000; table-layout: fixed; mso-table-layout-alt: fixed; margin: 0 auto;">
          <colgroup>
            <col width="${noColPt}" style="width: ${noColPt}pt;" />
            <col width="${dateColPt}" style="width: ${dateColPt}pt;" />
            ${ptkSubList
              .map(
                () => `
              <col width="${subPagiPt}" style="width: ${subPagiPt}pt;" />
              <col width="${subTtdPt}" style="width: ${subTtdPt}pt;" />
              <col width="${subSorePt}" style="width: ${subSorePt}pt;" />
              <col width="${subTtdSorePt}" style="width: ${subTtdSorePt}pt;" />
            `
              )
              .join('')}
          </colgroup>
          <thead style="display: table-header-group; mso-yfti-tblheader: yes;">
            <tr style="background: #f1f5f9; text-align: center; height: ${showKop ? '21pt' : '23pt'}; mso-height-rule: exactly;" height="${showKop ? 27 : 30}">
              <th rowspan="2" width="${noColPt}" style="width: ${noColPt}pt; padding: 2px 0; border: 1px solid #000; font-weight: bold; font-size: 7pt; text-align: center; vertical-align: middle;">No</th>
              <th rowspan="2" width="${dateColPt}" style="width: ${dateColPt}pt; padding: 2px 3px; border: 1px solid #000; font-weight: bold; text-align: left; font-size: 7pt; vertical-align: middle;">Hari / Tanggal</th>
              ${ptkSubList
                .map(
                  (ptk, idx) => {
                    const globalIdx = (pageInfo ? (pageInfo.current - 1) * ptkPerPage : 0) + idx + 1;
                    return `
                <th colspan="4" width="${ptkBlockPt}" style="width: ${ptkBlockPt}pt; height: ${showKop ? '21pt' : '23pt'}; padding: 2px 2px; border: 1px solid #000; text-align: center; vertical-align: middle; background: #e2e8f0;">
                  <strong style="font-size: 7pt; line-height: 1.15; display: block; color: #000;">${globalIdx}. ${ptk.nama}</strong>
                  <span style="font-size: 6pt; font-weight: normal; color: #1e293b; line-height: 1.1; display: block; margin-top: 1.5px;">
                    ${ptk.nip && ptk.nip !== '-' ? 'NIP. ' + ptk.nip : (ptk.nuptk ? 'NUPTK. ' + ptk.nuptk : (ptk.jabatan || 'PTK'))}
                  </span>
                </th>
              `;
                  }
                )
                .join('')}
            </tr>
            <tr style="background: #f8fafc; text-align: center; font-size: 6.5pt; font-weight: bold; height: 11pt; mso-height-rule: exactly;" height="14">
              ${ptkSubList
                .map(
                  () => `
                <th width="${subPagiPt}" style="width: ${subPagiPt}pt; height: 11pt; padding: 0; border: 1px solid #000; font-size: 6.5pt; vertical-align: middle; text-align: center;">Pagi</th>
                <th width="${subTtdPt}" style="width: ${subTtdPt}pt; height: 11pt; padding: 0; border: 1px solid #000; font-size: 6.5pt; vertical-align: middle; text-align: center;">TTD</th>
                <th width="${subSorePt}" style="width: ${subSorePt}pt; height: 11pt; padding: 0; border: 1px solid #000; font-size: 6.5pt; vertical-align: middle; text-align: center;">Sore</th>
                <th width="${subTtdSorePt}" style="width: ${subTtdSorePt}pt; height: 11pt; padding: 0; border: 1px solid #000; font-size: 6.5pt; vertical-align: middle; text-align: center;">TTD</th>
              `
                )
                .join('')}
            </tr>
          </thead>
          <tbody>
            ${Array.from({ length: totalDays })
              .map((_, i) => {
                const day = i + 1;
                const dateObj = new Date(year, month - 1, day);
                const dayName = NAMA_HARI_INDONESIA[dateObj.getDay()];
                const dayPadded = String(day).padStart(2, '0');
                const monthPadded = String(month).padStart(2, '0');
                const tglString = `${dayName}, ${dayPadded}/${monthPadded}`;
                const isHoliday = !!holidays[day];
                const holidayNote = holidays[day] || 'Libur';

                if (isHoliday) {
                  return `
                    <tr style="background-color: #fef2f2; text-align: center; height: ${rowHeightPt}pt; mso-height-rule: exactly;" height="${rowHeightPx}">
                      <td width="${noColPt}" style="width: ${noColPt}pt; height: ${rowHeightPt}pt; padding: 0; border: 1px solid #000; font-weight: bold; color: #b91c1c; text-align: center; font-size: 6pt; vertical-align: middle; line-height: ${rowHeightPt}pt;">${day}</td>
                      <td width="${dateColPt}" style="width: ${dateColPt}pt; height: ${rowHeightPt}pt; padding: 0 3px; border: 1px solid #000; font-weight: bold; color: #b91c1c; text-align: left; white-space: nowrap; font-size: 6pt; vertical-align: middle; line-height: ${rowHeightPt}pt;">
                        ${tglString}
                      </td>
                      <td colspan="${ptkSubList.length * 4}" width="${totalPtkColsPt}" style="width: ${totalPtkColsPt}pt; height: ${rowHeightPt}pt; padding: 0 3px; border: 1px solid #000; font-weight: bold; color: #b91c1c; background-color: #fee2e2; font-size: 6pt; text-align: center; vertical-align: middle; line-height: ${rowHeightPt}pt;">
                        LIBUR - ${holidayNote.toUpperCase()}
                      </td>
                    </tr>
                  `;
                }

                return `
                  <tr style="height: ${rowHeightPt}pt; mso-height-rule: exactly;" height="${rowHeightPx}">
                    <td width="${noColPt}" style="width: ${noColPt}pt; height: ${rowHeightPt}pt; padding: 0; border: 1px solid #000; text-align: center; font-size: 6pt; vertical-align: middle; line-height: ${rowHeightPt}pt;">${day}</td>
                    <td width="${dateColPt}" style="width: ${dateColPt}pt; height: ${rowHeightPt}pt; padding: 0 3px; border: 1px solid #000; text-align: left; white-space: nowrap; font-size: 6pt; vertical-align: middle; line-height: ${rowHeightPt}pt;">${tglString}</td>
                    ${ptkSubList
                      .map(
                        () => `
                      <td width="${subPagiPt}" style="width: ${subPagiPt}pt; height: ${rowHeightPt}pt; border: 1px solid #000; text-align: center; font-size: 5.8pt; vertical-align: middle; padding: 0; line-height: ${rowHeightPt}pt;">&nbsp;</td>
                      <td width="${subTtdPt}" style="width: ${subTtdPt}pt; height: ${rowHeightPt}pt; border: 1px solid #000; text-align: center; font-size: 5.8pt; vertical-align: middle; padding: 0; line-height: ${rowHeightPt}pt;">&nbsp;</td>
                      <td width="${subSorePt}" style="width: ${subSorePt}pt; height: ${rowHeightPt}pt; border: 1px solid #000; text-align: center; font-size: 5.8pt; vertical-align: middle; padding: 0; line-height: ${rowHeightPt}pt;">&nbsp;</td>
                      <td width="${subTtdSorePt}" style="width: ${subTtdSorePt}pt; height: ${rowHeightPt}pt; border: 1px solid #000; text-align: center; font-size: 5.8pt; vertical-align: middle; padding: 0; line-height: ${rowHeightPt}pt;">&nbsp;</td>
                    `
                      )
                      .join('')}
                  </tr>
                `;
              })
              .join('')}
          </tbody>
        </table>

        <!-- Ringkasan Keterangan & Tanda Tangan Pengesahan Kepala Sekolah -->
        <table width="100%" border="0" cellpadding="0" cellspacing="0" style="width: 100%; margin-top: 4pt; border-collapse: collapse; border: none; font-size: 7pt; font-family: 'Times New Roman', serif; page-break-inside: avoid; break-inside: avoid;">
          <tr>
            <td style="width: 60%; vertical-align: top; text-align: left; line-height: 1.2; border: none; padding-right: 12px;">
              <strong>Keterangan Presensi ${bulanNama}:</strong><br/>
              • Hari Kalender: <strong>${totalDays} Hari</strong> &nbsp;|&nbsp;
              • Hari Libur: <strong>${holidayCount} Hari</strong> &nbsp;|&nbsp;
              • Hari Kerja Efektif: <strong>${effectiveDays} Hari</strong><br/>
              <span style="font-size: 6pt; color: #475569; font-style: italic;">
                * Setiap PTK wajib mengisi jam kehadiran pagi, tanda tangan, jam pulang sore, dan tanda tangan.
              </span>
            </td>
            <td style="width: 40%; vertical-align: top; text-align: center; border: none; line-height: 1.15;">
              <p style="margin: 0; font-size: 7pt;">Pekutatan, ${totalDays} ${bulanHanyaNama} ${year}</p>
              <p style="margin: 0; font-size: 7pt; font-weight: bold;">Kepala ${formatNamaSekolahIsi(sekolah?.namaSekolah)},</p>
              <div style="height: 24pt; line-height: 24pt; font-size: 1pt;">&nbsp;</div>
              <p style="margin: 0; font-size: 7.5pt; font-weight: bold; text-decoration: underline;">${sekolah?.kepalaSekolah || 'Gede Ariasa, S.Pd'}</p>
              <p style="margin: 0; font-size: 7pt;">NIP. ${sekolah?.nipKepalaSekolah || '198906232014031002'}</p>
            </td>
          </tr>
        </table>
      </div>
      ${
        !isLast
          ? `<div class="page-break" style="page-break-before: always; break-before: page; clear: both;"></div>`
          : ''
      }
    `;
  };

  // Aturan Kelipatan 5 PTK: Setiap jumlah PTK kelipatan 5 memerlukan tepat 1 halaman
  // (misal: 5 PTK = 1 halaman, 10 PTK = 2 halaman, 15 PTK = 3 halaman, dst.)
  const pages: Guru[][] = [];
  for (let i = 0; i < activePTKList.length; i += ptkPerPage) {
    pages.push(activePTKList.slice(i, i + ptkPerPage));
  }
  return pages
    .map((batch, idx) =>
      buildCollectiveTableSheet(
        batch,
        { current: idx + 1, total: pages.length },
        idx === pages.length - 1
      )
    )
    .join('\n');
}

export const buildAbsenPTKHtml = buildAbsenGuruHtml;

/**
 * Exports Attendance Sheet for PTK directly to MS Word (.doc) with F4 Landscape layout
 */
export function exportAbsenPTKToWord(
  guruList: Guru[],
  sekolah: PengaturanSekolah,
  options: AbsenGuruOptions,
  paperSize: PaperSize = 'F4'
) {
  const month = options.month || 9;
  const year = options.year || 2026;
  const bulanNama = options.bulanNama || `${NAMA_BULAN_INDONESIA[month - 1]} ${year}`;
  const html = buildAbsenGuruHtml(guruList, sekolah, options);
  const cleanBulan = bulanNama.replace(/\s+/g, '_');
  const filename = `Presensi_PTK_${cleanBulan}_${paperSize}_Landscape`;
  exportToWord(filename, html, paperSize, 'landscape');
}

export interface AbsenSiswaOptions {
  siswaList: Siswa[];
  kelas: string;
  sekolah: PengaturanSekolah;
  year?: number;
  month?: number; // 1 - 12
  bulanNama?: string;
  holidays?: Record<number, string>; // day -> reason
  semester?: string;
  tahunAjaran?: string;
  showKop?: boolean;
  orientation?: 'portrait' | 'landscape'; // Default: 'portrait' (Pilihan Utama)
  paperSize?: PaperSize;
}

/**
 * Builds printable Attendance Sheet for Siswa in Portrait (Default/Pilihan Utama) or Landscape format,
 * Columns: No, Nama Siswa (with NISN/NIS, L/P), Tanggal (1..30/31 with highlighted holidays), and Recap
 */
export function buildAbsenSiswaHtml(
  siswaList: Siswa[],
  kelasParam: string = 'Semua',
  sekolah: PengaturanSekolah,
  bulanOrOptions: string | AbsenSiswaOptions = 'September 2026',
  yearParam?: number,
  monthParam?: number,
  holidaysParam?: Record<number, string>
): string {
  let kelas = kelasParam;
  let year = yearParam || 2026;
  let month = monthParam || 9;
  let bulanNama = typeof bulanOrOptions === 'string' ? bulanOrOptions : 'September 2026';
  let holidays: Record<number, string> = holidaysParam || {};
  let semester = 'Ganjil';
  let tahunAjaran = '2026/2027';
  let showKop = false; // Default pilihan utama tanpa KOP
  let orientation: 'portrait' | 'landscape' = 'portrait'; // Default pilihan utama: Potret

  if (typeof bulanOrOptions === 'object') {
    kelas = bulanOrOptions.kelas || kelas;
    year = bulanOrOptions.year || 2026;
    month = bulanOrOptions.month || 9;
    bulanNama = bulanOrOptions.bulanNama || `${NAMA_BULAN_INDONESIA[month - 1]} ${year}`;
    holidays = bulanOrOptions.holidays || {};
    semester = bulanOrOptions.semester || 'Ganjil';
    tahunAjaran = bulanOrOptions.tahunAjaran || '2026/2027';
    showKop = bulanOrOptions.showKop ?? false;
    orientation = bulanOrOptions.orientation || 'portrait';
  }

  const isPortrait = orientation === 'portrait';
  const filtered = sortSiswa(kelas && kelas !== 'Semua' ? siswaList.filter((s) => s.kelas === kelas) : siswaList);
  const totalDays = new Date(year, month, 0).getDate();
  const holidayCount = Object.keys(holidays).length;
  const effectiveDays = Math.max(0, totalDays - holidayCount);

  const jmlL = filtered.filter((s) => s.jenisKelamin === 'L').length;
  const jmlP = filtered.filter((s) => s.jenisKelamin === 'P').length;

  const kopHtml = showKop ? buildOfficialKopHtml(sekolah, true) : '';

  if (isPortrait) {
    // FORMAT POTRET (Pilihan Utama - Standar Buku Absen Tegak)
    return `
      <div class="absen-siswa-sheet absen-siswa-portrait" style="font-family: 'Times New Roman', serif; color: #000; width: 100%; box-sizing: border-box;">
        ${kopHtml}

        <div style="text-align: center; margin-top: ${showKop ? '2pt' : '3pt'}; margin-bottom: 6px;">
          <h3 style="margin: 0; text-decoration: underline; font-size: 11.5pt; font-weight: bold; text-transform: uppercase; letter-spacing: 0.3px;">
            DAFTAR HADIR / PRESENSI PESERTA DIDIK
          </h3>
          <p style="margin: 2px 0 0 0; font-size: 8.5pt; color: #111;">
            Kelas: <strong>${kelas || 'Semua Kelas'}</strong> &nbsp;|&nbsp;
            Bulan: <strong>${bulanNama}</strong> &nbsp;|&nbsp;
            Semester: <strong>${semester}</strong> &nbsp;|&nbsp;
            Tahun Ajaran <strong>${tahunAjaran}</strong>
          </p>
        </div>

        <!-- Tabel Presensi Format Potret Teroptimasi Rapi -->
        <table style="width: 100%; border-collapse: collapse; font-size: 7pt; table-layout: fixed;" border="1" cellpadding="0" cellspacing="0">
          <colgroup>
            <col style="width: 18px;" />
            <col style="width: 42px;" />
            <col style="width: 135px;" />
            <col style="width: 18px;" />
            ${Array.from({ length: totalDays }).map(() => `<col style="width: 13.5px;" />`).join('')}
            <col style="width: 13px;" />
            <col style="width: 13px;" />
            <col style="width: 13px;" />
            <col style="width: 14px;" />
          </colgroup>
          <thead>
            <tr style="background: #f1f5f9; text-align: center;">
              <th rowspan="2" style="width: 18px; padding: 3px 1px; border: 1px solid #000;">No</th>
              <th rowspan="2" style="width: 42px; padding: 3px 1px; border: 1px solid #000; line-height: 1.1;">NIS /<br/>NISN</th>
              <th rowspan="2" style="width: 135px; padding: 3px 4px; border: 1px solid #000; text-align: left;">Nama Peserta Didik</th>
              <th rowspan="2" style="width: 18px; padding: 3px 1px; border: 1px solid #000;">L/P</th>
              <th colspan="${totalDays}" style="padding: 2px 1px; border: 1px solid #000; font-size: 7pt;">Tanggal Bulan ${bulanNama}</th>
              <th colspan="4" style="width: 53px; padding: 2px 1px; border: 1px solid #000; font-size: 6.5pt;">Rekap</th>
            </tr>
            <tr style="background: #f8fafc; text-align: center; font-size: 6.5pt;">
              ${Array.from({ length: totalDays })
                .map((_, i) => {
                  const d = i + 1;
                  const isHol = !!holidays[d];
                  return `
                    <th style="width: 13.5px; min-width: 13.5px; max-width: 13.5px; padding: 2px 0px; box-sizing: border-box; border: 1px solid #000; ${
                      isHol ? 'background: #fee2e2; color: #b91c1c; font-weight: bold;' : ''
                    }">
                      ${d}
                    </th>
                  `;
                })
                .join('')}
              <th style="width: 13px; padding: 2px 0; border: 1px solid #000; background: #e0f2fe;" title="Sakit">S</th>
              <th style="width: 13px; padding: 2px 0; border: 1px solid #000; background: #e0f2fe;" title="Izin">I</th>
              <th style="width: 13px; padding: 2px 0; border: 1px solid #000; background: #e0f2fe;" title="Alpa">A</th>
              <th style="width: 14px; padding: 2px 0; border: 1px solid #000; background: #e0f2fe;" title="Total / Jml">Jml</th>
            </tr>
          </thead>
          <tbody>
            ${filtered
              .map((s, idx) => `
              <tr>
                <td style="padding: 2px 1px; text-align: center; border: 1px solid #000; font-size: 7pt;">${idx + 1}</td>
                <td style="padding: 2px 1px; text-align: center; font-size: 6.5pt; border: 1px solid #000; line-height: 1.1;">
                  <div style="font-weight: 600;">${s.nis || '-'}</div>
                  ${s.nisn ? `<div style="font-size: 5.5pt; color: #555;">${s.nisn}</div>` : ''}
                </td>
                <td style="padding: 2px 4px; border: 1px solid #000; text-align: left; font-size: 6.8pt; font-weight: 600; line-height: 1.15; word-break: normal; overflow-wrap: break-word; white-space: normal;">
                  ${s.nama}
                </td>
                <td style="padding: 2px 1px; text-align: center; border: 1px solid #000; font-size: 7pt;">${s.jenisKelamin}</td>
                ${Array.from({ length: totalDays })
                  .map((_, i) => {
                    const d = i + 1;
                    const isHol = !!holidays[d];
                    return `
                      <td style="width: 13.5px; min-width: 13.5px; max-width: 13.5px; box-sizing: border-box; border: 1px solid #000; height: 18px; text-align: center; font-size: 6.5pt; ${
                        isHol ? 'background: #fecaca; color: #b91c1c; font-weight: bold;' : ''
                      }">
                        ${isHol ? 'L' : ''}
                      </td>
                    `;
                  })
                  .join('')}
                <td style="border: 1px solid #000;"></td>
                <td style="border: 1px solid #000;"></td>
                <td style="border: 1px solid #000;"></td>
                <td style="border: 1px solid #000;"></td>
              </tr>
            `)
              .join('')}
          </tbody>
        </table>

        <!-- Catatan, Rekapitulasi & Tanda Tangan Table (Format Potret) -->
        <table width="100%" border="0" cellpadding="0" cellspacing="0" style="width: 100%; margin-top: 8pt; border-collapse: collapse; border: none; font-size: 7pt; font-family: 'Times New Roman', serif;">
          <tr>
            <td style="width: 44%; vertical-align: top; text-align: left; line-height: 1.3; border: none; padding-right: 8px;">
              <strong>Keterangan Presensi:</strong><br/>
              • <strong>H</strong> : Hadir &nbsp;|&nbsp; <strong>S</strong> : Sakit &nbsp;|&nbsp; <strong>I</strong> : Izin &nbsp;|&nbsp; <strong>A</strong> : Alpa &nbsp;|&nbsp; <span style="color: #b91c1c;"><strong>L</strong> : Libur</span><br/>
              • Jumlah Siswa: <strong>L: ${jmlL}</strong>, <strong>P: ${jmlP}</strong>, <strong>Total: ${filtered.length} Orang</strong><br/>
              • Hari Efektif Sekolah: <strong>${effectiveDays} Hari</strong> (${holidayCount} Hari Libur)
            </td>
            <td style="width: 28%; vertical-align: top; text-align: center; border: none; line-height: 1.18;">
              <p style="margin: 0; font-size: 7pt;">Mengetahui,</p>
              <p style="margin: 0; font-size: 7pt; font-weight: bold;">Kepala ${formatNamaSekolahIsi(sekolah?.namaSekolah)},</p>
              <div style="height: 36pt; line-height: 36pt; font-size: 1pt;">&nbsp;</div>
              <p style="margin: 0; font-size: 7.5pt; font-weight: bold; text-decoration: underline;">${sekolah?.kepalaSekolah || 'Gede Ariasa, S.Pd'}</p>
              <p style="margin: 1pt 0 0 0; font-size: 6.5pt;">NIP. ${sekolah?.nipKepalaSekolah || '198906232014031002'}</p>
            </td>
            <td style="width: 28%; vertical-align: top; text-align: center; border: none; line-height: 1.18;">
              <p style="margin: 0; font-size: 7pt;">Pekutatan, ${formatTanggalIndonesia(new Date().toISOString())}</p>
              <p style="margin: 0; font-size: 7pt; font-weight: bold;">Guru Kelas / Wali Kelas ${kelas !== 'Semua' ? kelas : ''},</p>
              <div style="height: 36pt; line-height: 36pt; font-size: 1pt;">&nbsp;</div>
              <p style="margin: 0; font-size: 7.5pt; font-weight: bold; text-decoration: underline;">................................................</p>
              <p style="margin: 1pt 0 0 0; font-size: 6.5pt;">NIP. ........................................</p>
            </td>
          </tr>
        </table>
      </div>
    `;
  }

  // FORMAT LANSKAP (Alternatif Melebar)
  return `
    <div class="absen-siswa-sheet absen-siswa-landscape" style="font-family: 'Times New Roman', serif; color: #000; width: 100%;">
      ${kopHtml}

      <div style="text-align: center; margin-top: ${showKop ? '1pt' : '4pt'}; margin-bottom: 10px;">
        <h3 style="margin: 0; text-decoration: underline; font-size: 12.5pt; font-weight: bold; text-transform: uppercase;">
          DAFTAR HADIR / PRESENSI PESERTA DIDIK
        </h3>
        <p style="margin: 2px 0 0 0; font-size: 10pt;">
          Kelas: <strong>${kelas || 'Semua Kelas'}</strong> &nbsp;|&nbsp;
          Bulan: <strong>${bulanNama}</strong> &nbsp;|&nbsp;
          Semester: <strong>${semester}</strong> &nbsp;|&nbsp;
          Tahun Ajaran <strong>${tahunAjaran}</strong>
        </p>
      </div>

      <!-- Tabel Format Baris: No, Nama Siswa, Tanggal -->
      <table style="width: 100%; border-collapse: collapse; font-size: 8pt; table-layout: fixed;" border="1" cellpadding="0" cellspacing="0">
        <colgroup>
          <col style="width: 24px;" />
          <col style="width: 75px;" />
          <col style="width: 180px;" />
          <col style="width: 26px;" />
          ${Array.from({ length: totalDays }).map(() => `<col style="width: 20px;" />`).join('')}
          <col style="width: 20px;" />
          <col style="width: 20px;" />
          <col style="width: 20px;" />
          <col style="width: 24px;" />
        </colgroup>
        <thead>
          <tr style="background: #f1f5f9; text-align: center;">
            <th rowspan="2" style="width: 24px; padding: 4px 1px; border: 1px solid #000;">No</th>
            <th rowspan="2" style="width: 75px; padding: 4px 2px; border: 1px solid #000;">NISN / NIS</th>
            <th rowspan="2" style="width: 180px; padding: 4px 6px; border: 1px solid #000; text-align: left;">Nama Peserta Didik</th>
            <th rowspan="2" style="width: 26px; padding: 4px 1px; border: 1px solid #000;">L/P</th>
            <th colspan="${totalDays}" style="padding: 3px; border: 1px solid #000;">Tanggal</th>
            <th colspan="4" style="width: 84px; padding: 3px; border: 1px solid #000;">Rekap</th>
          </tr>
          <tr style="background: #f8fafc; text-align: center; font-size: 7.5pt;">
            ${Array.from({ length: totalDays })
              .map((_, i) => {
                const d = i + 1;
                const isHol = !!holidays[d];
                return `
                  <th style="width: 20px; min-width: 20px; max-width: 20px; box-sizing: border-box; padding: 2px 1px; border: 1px solid #000; ${
                    isHol ? 'background: #fee2e2; color: #b91c1c; font-weight: bold;' : ''
                  }">
                    ${d}
                  </th>
                `;
              })
              .join('')}
            <th style="width: 20px; padding: 2px; border: 1px solid #000; background: #e0f2fe;" title="Sakit">S</th>
            <th style="width: 20px; padding: 2px; border: 1px solid #000; background: #e0f2fe;" title="Izin">I</th>
            <th style="width: 20px; padding: 2px; border: 1px solid #000; background: #e0f2fe;" title="Alpa">A</th>
            <th style="width: 24px; padding: 2px; border: 1px solid #000; background: #e0f2fe;" title="Total / Jml">Jml</th>
          </tr>
        </thead>
        <tbody>
          ${filtered
            .map((s, idx) => `
            <tr>
              <td style="padding: 3px 2px; text-align: center; border: 1px solid #000;">${idx + 1}</td>
              <td style="padding: 2px 3px; text-align: center; font-size: 7.5pt; border: 1px solid #000; line-height: 1.15;">
                ${s.nisn || '-'}<br/><span style="color: #555;">${s.nis || '-'}</span>
              </td>
              <td style="padding: 3px 6px; border: 1px solid #000; text-align: left; font-weight: 600; word-break: normal; overflow-wrap: break-word; white-space: normal; line-height: 1.2;">
                ${s.nama}
              </td>
              <td style="padding: 3px 2px; text-align: center; border: 1px solid #000;">${s.jenisKelamin}</td>
              ${Array.from({ length: totalDays })
                .map((_, i) => {
                  const d = i + 1;
                  const isHol = !!holidays[d];
                  return `
                    <td style="width: 20px; min-width: 20px; max-width: 20px; box-sizing: border-box; border: 1px solid #000; height: 19px; text-align: center; font-size: 7pt; ${
                      isHol ? 'background: #fecaca; color: #b91c1c; font-weight: bold;' : ''
                    }">
                      ${isHol ? 'L' : ''}
                    </td>
                  `;
                })
                .join('')}
              <td style="border: 1px solid #000;"></td>
              <td style="border: 1px solid #000;"></td>
              <td style="border: 1px solid #000;"></td>
              <td style="border: 1px solid #000;"></td>
            </tr>
          `)
            .join('')}
        </tbody>
      </table>

      <!-- Catatan, Rekapitulasi & Tanda Tangan Table (Kompatibel MS Word & Cetak) -->
      <table width="100%" border="0" cellpadding="0" cellspacing="0" style="width: 100%; margin-top: 10pt; border-collapse: collapse; border: none; font-size: 7.5pt; font-family: 'Times New Roman', serif;">
        <tr>
          <td style="width: 44%; vertical-align: top; text-align: left; line-height: 1.35; border: none; padding-right: 10px;">
            <strong>Keterangan Presensi:</strong><br/>
            • <strong>H</strong> : Hadir &nbsp;|&nbsp; <strong>S</strong> : Sakit &nbsp;|&nbsp; <strong>I</strong> : Izin &nbsp;|&nbsp; <strong>A</strong> : Alpa &nbsp;|&nbsp; <span style="color: #b91c1c;"><strong>L</strong> : Libur</span><br/>
            • Jumlah Siswa: <strong>L: ${jmlL}</strong>, <strong>P: ${jmlP}</strong>, <strong>Total: ${filtered.length} Orang</strong><br/>
            • Hari Efektif Sekolah: <strong>${effectiveDays} Hari</strong> (${holidayCount} Hari Libur)
          </td>
          <td style="width: 28%; vertical-align: top; text-align: center; border: none; line-height: 1.2;">
            <p style="margin: 0; font-size: 7.5pt;">Mengetahui,</p>
            <p style="margin: 0; font-size: 7.5pt; font-weight: bold;">Kepala ${formatNamaSekolahIsi(sekolah?.namaSekolah)},</p>
            <div style="height: 42pt; line-height: 42pt; font-size: 1pt;">&nbsp;</div>
            <p style="margin: 0; font-size: 8pt; font-weight: bold; text-decoration: underline;">${sekolah?.kepalaSekolah || 'Gede Ariasa, S.Pd'}</p>
            <p style="margin: 2pt 0 0 0; font-size: 7.5pt;">NIP. ${sekolah?.nipKepalaSekolah || '198906232014031002'}</p>
          </td>
          <td style="width: 28%; vertical-align: top; text-align: center; border: none; line-height: 1.2;">
            <p style="margin: 0; font-size: 7.5pt;">Pekutatan, ${formatTanggalIndonesia(new Date().toISOString())}</p>
            <p style="margin: 0; font-size: 7.5pt; font-weight: bold;">Guru Kelas / Wali Kelas ${kelas !== 'Semua' ? kelas : ''},</p>
            <div style="height: 42pt; line-height: 42pt; font-size: 1pt;">&nbsp;</div>
            <p style="margin: 0; font-size: 8pt; font-weight: bold; text-decoration: underline;">................................................</p>
            <p style="margin: 2pt 0 0 0; font-size: 7.5pt;">NIP. ........................................</p>
          </td>
        </tr>
      </table>
    </div>
  `;
}

/**
 * Exports Attendance Sheet for Siswa to MS Word (.doc) in Portrait or Landscape layout
 */
export function exportAbsenSiswaToWord(
  siswaList: Siswa[],
  kelas: string,
  sekolah: PengaturanSekolah,
  options: AbsenSiswaOptions,
  paperSize: PaperSize = 'F4',
  orientation: 'portrait' | 'landscape' = 'portrait'
) {
  const month = options.month || 9;
  const year = options.year || 2026;
  const bulanNama = options.bulanNama || `${NAMA_BULAN_INDONESIA[month - 1]} ${year}`;
  const html = buildAbsenSiswaHtml(siswaList, kelas, sekolah, {
    ...options,
    orientation,
    paperSize,
  });
  const cleanBulan = bulanNama.replace(/\s+/g, '_');
  const filename = `Presensi_Siswa_Kelas_${kelas}_${cleanBulan}_${paperSize}_${orientation === 'portrait' ? 'Potret' : 'Lanskap'}`;
  exportToWord(filename, html, paperSize, orientation);
}

/**
 * Generic CSV exporter for tabular objects with UTF-8 BOM and configurable delimiter
 */
export function exportToCsv(filename: string, rows: Record<string, any>[], delimiter: string = ',') {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const csvRows = [
    headers.map((h) => `"${h}"`).join(delimiter),
    ...rows.map((row) =>
      headers
        .map((header) => {
          const val = row[header] ?? '';
          const escaped = String(val).replace(/"/g, '""');
          return `"${escaped}"`;
        })
        .join(delimiter)
    ),
  ];
  const csvContent = '\ufeff' + csvRows.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

/**
 * Exports Guru list to CSV
 */
export function exportGuruToCsv(data: Guru[]) {
  const headers = ['ID', 'NIP', 'Nama Lengkap', 'Jabatan', 'Pangkat/Gol', 'Status', 'No HP', 'Email'];
  const rows = data.map((g) => [
    `"${g.id}"`,
    `"${g.nip}"`,
    `"${g.nama}"`,
    `"${g.jabatan}"`,
    `"${g.pangkatGol}"`,
    `"${g.status}"`,
    `"${g.noHp}"`,
    `"${g.email}"`,
  ]);

  const csvContent = '\ufeff' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Data_Guru_SDN1Pekutatan_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

/**
 * Exports Siswa list to CSV
 */
export function exportSiswaToCsv(data: Siswa[]) {
  const headers = ['ID', 'NISN', 'NIS', 'Nama Siswa', 'Kelas', 'Jenis Kelamin', 'Tempat Lahir', 'Tgl Lahir', 'Nama Ortu/Wali', 'Alamat'];
  const rows = data.map((s) => [
    `"${s.id}"`,
    `"${s.nisn}"`,
    `"${s.nis}"`,
    `"${s.nama}"`,
    `"${s.kelas}"`,
    `"${s.jenisKelamin}"`,
    `"${s.tempatLahir}"`,
    `"${s.tglLahir}"`,
    `"${s.namaOrtu}"`,
    `"${s.alamat}"`,
  ]);

  const csvContent = '\ufeff' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Data_Siswa_SDN1Pekutatan_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
