import { Guru, Siswa, PengaturanSekolah, SuratKeluar, SuratMasuk, PaperSize } from '../types';
import { formatDiktumLabel } from './diktumUtils';

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

  const isPresensiLandscape =
    isLandscape ||
    /absen|presensi/i.test(filename) ||
    /absen|presensi/i.test(htmlContent);

  const effectiveOrientation = isPresensiLandscape ? 'landscape' : orientation;
  const isEffectiveLandscape = effectiveOrientation === 'landscape';

  const paperWidth = isEffectiveLandscape
    ? (isF4 ? '33.0cm' : '29.7cm')
    : (isF4 ? '21.5cm' : '21.0cm');
  const paperHeight = isEffectiveLandscape
    ? (isF4 ? '21.5cm' : '21.0cm')
    : (isF4 ? '33.0cm' : '29.7cm');

  const widthDxa = isEffectiveLandscape ? (isF4 ? '18709' : '16838') : (isF4 ? '12189' : '11906');
  const heightDxa = isEffectiveLandscape ? (isF4 ? '12189' : '11906') : (isF4 ? '18709' : '16838');
  const topDxa = isEffectiveLandscape ? '227' : '850';
  const rightDxa = isEffectiveLandscape ? '397' : '850';
  const bottomDxa = isEffectiveLandscape ? '198' : '850';
  const leftDxa = isEffectiveLandscape ? '397' : '850';

  const pageMarginCss = isEffectiveLandscape
    ? '0.4cm 0.7cm 0.35cm 0.7cm'
    : '1.5cm 1.5cm 1.5cm 1.5cm';

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
    : (isPresensiLandscape ? '7.0pt' : '10.0pt');

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
      margin-bottom: 1pt;
      font-family: ${defaultWordFont};
      font-size: ${defaultWordFontSize};
      line-height: 1.15;
      color: #000000;
      mso-pagination: widow-orphan;
    }
    .nomor-sk {
      font-size: 10.0pt !important;
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

  printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Tinos:ital,wght@0,400;0,700;1,400&display=swap" rel="stylesheet">
  <style>
    @media print {
      @page {
        size: ${pageSizeRule} portrait;
        margin: 2cm 2cm 2cm 2cm;
      }
      body {
        margin: 0;
        padding: 0;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .page-break {
        page-break-before: always;
        break-before: page;
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
      padding: 20px;
      max-width: 820px;
      margin: 0 auto;
    }
    p {
      margin-top: 0;
      margin-bottom: 4pt;
      line-height: 1.35;
    }
    table {
      border-collapse: collapse;
      width: 100%;
    }
    th, td {
      padding: 1.5pt 3pt;
      vertical-align: top;
    }
    td p {
      margin: 0;
    }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .text-justify { text-align: justify; }
    .font-bold { font-weight: bold; }
    .underline { text-decoration: underline; }
    .is-surat-keputusan, .is-surat-keputusan * {
      font-family: 'Bookman Old Style', 'Bookman', 'URW Bookman L', serif !important;
    }
    .is-surat-keputusan {
      font-size: 12pt !important;
    }
    .is-surat-keputusan .nomor-sk {
      font-size: 10pt !important;
    }
  </style>
</head>
<body>
  ${content.innerHTML}
  <script>
    window.onload = function() {
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

/**
 * Generates official HTML string for letter templates
 * Format is designed to render pixel-identically in PDF, browser preview, and MS Word (.doc)
 */
export function buildSuratHtml(surat: SuratKeluar, sekolah: PengaturanSekolah): string {
  const tglIndo = formatTanggalIndonesia(surat.tglSurat);
  const data = surat.dataKhusus || {};

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

      badanSurat = `
        <table style="width: 100%; border-collapse: collapse; border: none; margin-bottom: 14pt;" border="0" cellpadding="0" cellspacing="0">
          <tr>
            <td style="width: 55%; vertical-align: top; border: none;">
              <table style="border-collapse: collapse; border: none; font-size: 11pt;" border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding: 1pt 6pt 1pt 0; vertical-align: top; border: none; width: 60pt;">Hal</td>
                  <td style="padding: 1pt 4pt 1pt 0; vertical-align: top; border: none; width: 12pt;">:</td>
                  <td style="padding: 1pt 0; vertical-align: top; font-weight: bold; border: none;">Permohonan Izin Tidak Masuk Sekolah</td>
                </tr>
                <tr>
                  <td style="padding: 1pt 6pt 1pt 0; vertical-align: top; border: none;">Lampiran</td>
                  <td style="padding: 1pt 4pt 1pt 0; vertical-align: top; border: none;">:</td>
                  <td style="padding: 1pt 0; vertical-align: top; border: none;">-</td>
                </tr>
              </table>
            </td>
            <td style="width: 45%; text-align: right; vertical-align: top; border: none;">
              <p style="margin: 0; font-size: 11pt;">${sekolah.desa || 'Pekutatan'}, ${tglIndo}</p>
            </td>
          </tr>
        </table>

        <div style="margin-bottom: 14pt; line-height: 1.4;">
          <p style="margin: 0;">Kepada Yth.</p>
          <p style="margin: 1pt 0 0 0; font-weight: bold;">Kepala ${sekolah.namaSekolah}</p>
          <p style="margin: 1pt 0 0 0;">di -</p>
          <p style="margin: 1pt 0 0 20pt; text-decoration: underline;">Tempat</p>
        </div>

        <div style="text-align: center; margin-bottom: 16pt;">
          <p style="margin: 0; text-align: center; font-size: 13pt; font-weight: bold; text-decoration: underline; letter-spacing: 0.5px;">SURAT PERMOHONAN TIDAK MASUK SEKOLAH</p>
        </div>

        <p style="text-align: justify; margin-bottom: 8pt; line-height: 1.4;">
          Dengan hormat,<br>
          Saya yang bertanda tangan di bawah ini:
        </p>

        <table style="margin-left: 20pt; margin-bottom: 12pt; width: 92%; border: none; border-collapse: collapse; line-height: 1.45;" border="0" cellpadding="0" cellspacing="0">
          <tr>
            <td style="width: 145pt; padding: 1.5pt 0; vertical-align: top; border: none;">Nama Lengkap</td>
            <td style="width: 15pt; padding: 1.5pt 0; vertical-align: top; border: none;">:</td>
            <td style="padding: 1.5pt 0; vertical-align: top; font-weight: bold; border: none;">${data.namaGuru || '-'}</td>
          </tr>
          <tr>
            <td style="padding: 1.5pt 0; vertical-align: top; border: none;">NIP / NUPTK</td>
            <td style="padding: 1.5pt 0; vertical-align: top; border: none;">:</td>
            <td style="padding: 1.5pt 0; vertical-align: top; border: none;">${data.nipGuru || '-'}</td>
          </tr>
          <tr>
            <td style="padding: 1.5pt 0; vertical-align: top; border: none;">Pangkat / Golongan</td>
            <td style="padding: 1.5pt 0; vertical-align: top; border: none;">:</td>
            <td style="padding: 1.5pt 0; vertical-align: top; border: none;">${data.pangkatGol || '-'}</td>
          </tr>
          <tr>
            <td style="padding: 1.5pt 0; vertical-align: top; border: none;">Jabatan</td>
            <td style="padding: 1.5pt 0; vertical-align: top; border: none;">:</td>
            <td style="padding: 1.5pt 0; vertical-align: top; border: none;">${data.jabatan || 'Guru Kelas'}</td>
          </tr>
          <tr>
            <td style="padding: 1.5pt 0; vertical-align: top; border: none;">Unit Kerja</td>
            <td style="padding: 1.5pt 0; vertical-align: top; border: none;">:</td>
            <td style="padding: 1.5pt 0; vertical-align: top; border: none;">${sekolah.namaSekolah}</td>
          </tr>
        </table>

        <p style="text-align: justify; margin-bottom: 8pt; line-height: 1.4;">
          Dengan ini mengajukan permohonan izin untuk tidak masuk sekolah / mengajar ${kalimatIzin} dikarenakan: ${data.alasan || surat.perihal || 'ada keperluan mendesak'}.
        </p>

        ${data.guruPengganti ? `
        <p style="text-align: justify; margin-bottom: 8pt; line-height: 1.4;">
          Terkait pelaksanaan tugas mengajar dan ketertiban peserta didik di kelas selama saya tidak masuk sekolah, telah saya koordinasikan dan diserahkan kepada rekan guru pengganti, yaitu: <strong>${data.guruPengganti}</strong>.
        </p>
        ` : ''}

        <p style="text-align: justify; margin-top: 10pt; line-height: 1.4;">
          Demikian surat permohonan izin ini saya sampaikan dengan sesungguhnya. Atas perhatian, pengertian, dan izin yang Bapak/Ibu Kepala Sekolah berikan, saya sampaikan terima kasih.
        </p>
      `;

      // 2 Kolom TTD: Menyetujui KS di kiri, Pemohon di kanan via tabel asli agar tidak berantakan di Word
      customTtdBlock = `
        <table class="ttd-table" style="width: 100%; margin-top: 24pt; border: none; border-collapse: collapse;" border="0" cellpadding="0" cellspacing="0">
          <tr>
            <td style="width: 50%; text-align: center; vertical-align: top; border: none;">
              <p style="margin: 0; font-weight: bold; text-align: center;">Menyetujui,</p>
              <p style="margin: 1pt 0 0 0; text-align: center;">Kepala ${sekolah.namaSekolah}</p>
              <div style="height: 55pt;">&nbsp;</div>
              <p style="margin: 0; font-weight: bold; text-decoration: underline; text-align: center;">${sekolah.kepalaSekolah}</p>
              <p style="margin: 1pt 0 0 0; font-size: 11pt; text-align: center;">NIP. ${sekolah.nipKepalaSekolah}</p>
            </td>
            <td style="width: 50%; text-align: center; vertical-align: top; border: none;">
              <p style="margin: 0; text-align: center;">${sekolah.desa || 'Pekutatan'}, ${tglIndo}</p>
              <p style="margin: 1pt 0 0 0; font-weight: bold; text-align: center;">Pemohon,</p>
              <div style="height: 55pt;">&nbsp;</div>
              <p style="margin: 0; font-weight: bold; text-decoration: underline; text-align: center;">${data.namaGuru || '-'}</p>
              <p style="margin: 1pt 0 0 0; font-size: 11pt; text-align: center;">NIP. ${data.nipGuru || '-'}</p>
            </td>
          </tr>
        </table>
      `;
      break;
    }

    case 'surat_keterangan': {
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
            Yang bertanda tangan di bawah ini Kepala Sekolah Dasar Negeri 1 Pekutatan, Kecamatan Pekutatan, Kabupaten Jembrana, Provinsi Bali, menerangkan dengan sebenarnya bahwa nama-nama di bawah ini:
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
            Yang bertanda tangan di bawah ini Kepala Sekolah Dasar Negeri 1 Pekutatan, Kecamatan Pekutatan, Kabupaten Jembrana, Provinsi Bali, menerangkan dengan sebenarnya bahwa:
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
          <p style="margin: 0; text-align: center; font-size: 13.5pt; font-weight: bold; text-decoration: underline;">SURAT KETERANGAN</p>
          <p style="margin: 2pt 0 0 0; text-align: center; font-size: 11pt;">Nomor: ${surat.noSurat}</p>
        </div>

        ${subjekHtml}

        <p style="text-align: justify; margin-bottom: 8pt; line-height: 1.4;">
          Adalah benar ${isMulti ? (isSiswa ? 'peserta didik yang terdaftar aktif' : 'pendidik / tenaga kependidikan aktif') : (isSiswa ? 'peserta didik yang terdaftar aktif' : 'pendidik / tenaga kependidikan aktif')} pada ${sekolah.namaSekolah} Tahun Ajaran 2026/2027 dan berkelakuan baik serta mentaati segala tata tertib sekolah.
        </p>

        ${data.keperluan ? `
        <p style="text-align: justify; margin-bottom: 8pt; line-height: 1.4;">
          Surat keterangan ini diberikan kepada yang bersangkutan untuk keperluan: <strong>${data.keperluan}</strong>.
        </p>
        ` : ''}

        <p style="text-align: justify; margin-top: 10pt; line-height: 1.4;">
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

      let tujuanHtml = '';
      if (rawTujuanList.length > 1) {
        tujuanHtml = `
          <div style="margin-bottom: 12pt; line-height: 1.4;">
            <p style="margin: 0;">Kepada Yth.</p>
            <p style="margin: 1pt 0 0 0;">Bapak/Ibu/Saudara:</p>
            <ol style="margin: 3pt 0 4pt 18pt; padding: 0;">
              ${rawTujuanList.map((t: string) => `<li style="margin-bottom: 2pt; font-weight: bold;">${t}</li>`).join('')}
            </ol>
            <p style="margin: 1pt 0 0 0;">di -</p>
            <p style="margin: 1pt 0 0 20pt; text-decoration: underline;">Tempat</p>
          </div>
        `;
      } else {
        tujuanHtml = `
          <div style="margin-bottom: 12pt; line-height: 1.4;">
            <p style="margin: 0;">Kepada Yth.</p>
            <p style="margin: 1pt 0 0 0; font-weight: bold;">${rawTujuanList[0] || surat.tujuan || 'Bapak/Ibu/Saudara'}</p>
            <p style="margin: 1pt 0 0 0;">di -</p>
            <p style="margin: 1pt 0 0 20pt; text-decoration: underline;">Tempat</p>
          </div>
        `;
      }

      badanSurat = `
        <table style="width: 100%; margin-bottom: 12pt; border: none; border-collapse: collapse;" border="0" cellpadding="0" cellspacing="0">
          <tr>
            <td style="width: 75pt; padding: 1.5pt 0; vertical-align: top; border: none;">Nomor</td>
            <td style="width: 12pt; padding: 1.5pt 0; vertical-align: top; border: none;">:</td>
            <td style="padding: 1.5pt 0; vertical-align: top; border: none;">${surat.noSurat}</td>
            <td style="text-align: right; vertical-align: top; border: none; white-space: nowrap;">${sekolah.desa || 'Pekutatan'}, ${tglIndo}</td>
          </tr>
          <tr>
            <td style="padding: 1.5pt 0; vertical-align: top; border: none;">Lampiran</td>
            <td style="padding: 1.5pt 0; vertical-align: top; border: none;">:</td>
            <td style="padding: 1.5pt 0; vertical-align: top; border: none;" colspan="2">-</td>
          </tr>
          <tr>
            <td style="padding: 1.5pt 0; vertical-align: top; border: none; font-weight: bold;">Perihal</td>
            <td style="padding: 1.5pt 0; vertical-align: top; border: none; font-weight: bold;">:</td>
            <td style="padding: 1.5pt 0; vertical-align: top; border: none; font-weight: bold;" colspan="2">${surat.perihal}</td>
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
        data.mengingat || '1. Undang-Undang Nomor 20 Tahun 2003 tentang Sistem Pendidikan Nasional;\n2. Permendagri Nomor 83 Tahun 2022 tentang Kode Klasifikasi Arsip;\n3. Program Kerja SD Negeri 1 Pekutatan Tahun Ajaran 2026/2027.',
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
          <p class="nomor-sk" style="margin: 2pt 0 0 0; text-align: center; font-size: 10pt; font-family: 'Bookman Old Style', 'Bookman', 'URW Bookman L', serif; font-weight: normal;">Nomor: ${surat.noSurat}</p>
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

      badanSurat = `
        <div style="text-align: center; margin: 12pt 0 16pt 0;">
          <p style="margin: 0; text-align: center; font-size: 14pt; font-weight: bold; text-decoration: underline;">SURAT PERINTAH TUGAS</p>
          <p style="margin: 2pt 0 0 0; text-align: center; font-size: 11pt;">Nomor: ${surat.noSurat}</p>
        </div>

        <table style="width: 100%; margin-bottom: 10pt; border: none; border-collapse: collapse; line-height: 1.45;" border="0" cellpadding="0" cellspacing="0">
          <tr>
            <td style="width: 80pt; vertical-align: top; border: none; font-weight: bold;">Dasar</td>
            <td style="width: 15pt; vertical-align: top; border: none;">:</td>
            <td style="text-align: justify; vertical-align: top; border: none;">${data.dasarTugas || 'Surat Edaran / Program Kerja Dinas Pendidikan Kepemudaan dan Olahraga Kab. Jembrana.'}</td>
          </tr>
        </table>

        <div style="text-align: center; font-weight: bold; margin: 12pt 0;">
          MEMERINTAHKAN:
        </div>

        <p style="margin: 0 0 6pt 0; font-weight: bold;">Kepada:</p>

        <div style="margin-left: 16pt; margin-bottom: 12pt;">
          ${pegawaiList.length > 0 ? pegawaiList.map((p: any, idx: number) => `
            <div style="margin-bottom: 8pt; page-break-inside: avoid;">
              <table style="width: 100%; border: none; border-collapse: collapse; line-height: 1.4;" border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="width: 20pt; vertical-align: top; border: none; padding: 1.5pt 0;">${pegawaiList.length > 1 ? `${idx + 1}.` : ''}</td>
                  <td style="width: 135pt; vertical-align: top; border: none; padding: 1.5pt 0;">Nama Lengkap</td>
                  <td style="width: 15pt; vertical-align: top; border: none; padding: 1.5pt 0;">:</td>
                  <td style="vertical-align: top; font-weight: bold; border: none; padding: 1.5pt 0;">${p.nama || '-'}</td>
                </tr>
                <tr>
                  <td style="border: none;"></td>
                  <td style="vertical-align: top; border: none; padding: 1.5pt 0;">NIP / NUPTK</td>
                  <td style="vertical-align: top; border: none; padding: 1.5pt 0;">:</td>
                  <td style="vertical-align: top; border: none; padding: 1.5pt 0;">${p.nip || '-'}</td>
                </tr>
                <tr>
                  <td style="border: none;"></td>
                  <td style="vertical-align: top; border: none; padding: 1.5pt 0;">Pangkat / Golongan</td>
                  <td style="vertical-align: top; border: none; padding: 1.5pt 0;">:</td>
                  <td style="vertical-align: top; border: none; padding: 1.5pt 0;">${p.pangkatGol || '-'}</td>
                </tr>
                <tr>
                  <td style="border: none;"></td>
                  <td style="vertical-align: top; border: none; padding: 1.5pt 0;">Jabatan</td>
                  <td style="vertical-align: top; border: none; padding: 1.5pt 0;">:</td>
                  <td style="vertical-align: top; border: none; padding: 1.5pt 0;">${p.jabatan || 'Guru SDN 1 Pekutatan'}</td>
                </tr>
              </table>
            </div>
          `).join('') : `
            <table style="width: 100%; border: none; border-collapse: collapse; line-height: 1.4;" border="0" cellpadding="0" cellspacing="0">
              <tr>
                <td style="width: 135pt; vertical-align: top; border: none; padding: 1.5pt 0;">Nama Lengkap</td>
                <td style="width: 15pt; vertical-align: top; border: none; padding: 1.5pt 0;">:</td>
                <td style="vertical-align: top; font-weight: bold; border: none; padding: 1.5pt 0;">${surat.tujuan || '-'}</td>
              </tr>
              <tr>
                <td style="vertical-align: top; border: none; padding: 1.5pt 0;">Jabatan</td>
                <td style="vertical-align: top; border: none; padding: 1.5pt 0;">:</td>
                <td style="vertical-align: top; border: none; padding: 1.5pt 0;">Guru / Pegawai SDN 1 Pekutatan</td>
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
  }

  // Tanda Tangan Block: Menggunakan tabel 2 kolom (Kiri kosong 52%, Kanan isi TTD 48%) agar di MS Word tetap berada di kanan dan tidak terpotong
  const kepsekNama = (sekolah?.kepalaSekolah && sekolah.kepalaSekolah.trim()) ? sekolah.kepalaSekolah : (surat.penandatangan || 'Gede Ariasa, S.Pd');
  const kepsekNip = (sekolah?.nipKepalaSekolah && sekolah.nipKepalaSekolah.trim()) ? sekolah.nipKepalaSekolah : (surat.nipPenandatangan || '198906232014031002');

  const ttdBlock = customTtdBlock || `
    <table class="ttd-table" style="width: 100%; margin-top: 24pt; border: none; border-collapse: collapse;" border="0" cellpadding="0" cellspacing="0">
      <tr>
        <td style="width: 52%; border: none;">&nbsp;</td>
        <td style="width: 48%; text-align: center; vertical-align: top; border: none;">
          ${surat.jenisSurat !== 'surat_keputusan' ? `
            <p style="margin: 0 0 3pt 0; text-align: center;">${sekolah.desa || 'Pekutatan'}, ${tglIndo}</p>
          ` : ''}
          <p style="margin: 0; font-weight: bold; text-align: center;">${surat.jabatanPenandatangan || 'Kepala Sekolah'},</p>
          <div style="height: 55pt;">&nbsp;</div>
          <p style="margin: 0; font-weight: bold; text-decoration: underline; text-align: center;">${kepsekNama}</p>
          <p style="margin: 2pt 0 0 0; font-size: 11pt; text-align: center;">NIP. ${kepsekNip}</p>
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

  return `
    <div class="surat-resmi ${isSuratKeputusan ? 'is-surat-keputusan' : ''}" style="font-family: ${suratFontFamily}; font-size: 12pt; line-height: 1.35; color: #000000;">
      ${kopHtml}
      <div class="surat-body">
        ${badanSurat}
        ${ttdBlock}
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
                <p style="margin: 0; font-size: 10pt;">Kepala Sekolah,</p>
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
  paperSize: PaperSize = 'F4'
) {
  const printWindow = window.open('', '_blank', 'width=1150,height=800');
  if (!printWindow) {
    alert('Jendela cetak terblokir oleh browser. Harap izinkan pop-up.');
    return;
  }

  const isF4 = paperSize === 'F4';

  printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <style>
    @page {
      size: ${isF4 ? '330mm 215mm' : '297mm 210mm'};
      margin: 5mm 8mm 4mm 8mm;
    }
    @media print {
      @page {
        size: ${isF4 ? '330mm 215mm' : '297mm 210mm'};
        margin: 5mm 8mm 4mm 8mm;
      }
      html, body {
        width: 100% !important;
        margin: 0 !important;
        padding: 0 !important;
        background: #ffffff !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      .page-break {
        page-break-before: always !important;
        break-before: page !important;
        clear: both !important;
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
              <p style="margin: 0; font-size: 7.5pt; font-weight: bold;">Kepala ${sekolah.namaSekolah},</p>
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
              <p style="margin: 0; font-size: 7pt; font-weight: bold;">Kepala ${sekolah?.namaSekolah || 'SD NEGERI 1 PEKUTATAN'},</p>
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
}

/**
 * Builds printable Attendance Sheet for Siswa in Landscape format,
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

  if (typeof bulanOrOptions === 'object') {
    kelas = bulanOrOptions.kelas || kelas;
    year = bulanOrOptions.year || 2026;
    month = bulanOrOptions.month || 9;
    bulanNama = bulanOrOptions.bulanNama || `${NAMA_BULAN_INDONESIA[month - 1]} ${year}`;
    holidays = bulanOrOptions.holidays || {};
    semester = bulanOrOptions.semester || 'Ganjil';
    tahunAjaran = bulanOrOptions.tahunAjaran || '2026/2027';
    showKop = bulanOrOptions.showKop ?? false;
  }

  const filtered = kelas && kelas !== 'Semua' ? siswaList.filter((s) => s.kelas === kelas) : siswaList;
  const totalDays = new Date(year, month, 0).getDate();
  const holidayCount = Object.keys(holidays).length;
  const effectiveDays = Math.max(0, totalDays - holidayCount);

  const jmlL = filtered.filter((s) => s.jenisKelamin === 'L').length;
  const jmlP = filtered.filter((s) => s.jenisKelamin === 'P').length;

  const kopHtml = showKop ? buildOfficialKopHtml(sekolah, true) : '';

  return `
    <div class="absen-siswa-sheet" style="font-family: 'Times New Roman', serif; color: #000; width: 100%;">
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
      <table style="width: 100%; border-collapse: collapse; font-size: 8.5pt;" border="1" cellpadding="0" cellspacing="0">
        <thead>
          <tr style="background: #f1f5f9; text-align: center;">
            <th rowspan="2" style="width: 26px; padding: 4px 1px; border: 1px solid #000;">No</th>
            <th rowspan="2" style="width: 85px; padding: 4px 2px; border: 1px solid #000;">NISN / NIS</th>
            <th rowspan="2" style="width: 200px; padding: 4px 6px; border: 1px solid #000; text-align: left;">Nama Peserta Didik</th>
            <th rowspan="2" style="width: 28px; padding: 4px 1px; border: 1px solid #000;">L/P</th>
            <th colspan="${totalDays}" style="padding: 3px; border: 1px solid #000;">Tanggal</th>
            <th colspan="4" style="padding: 3px; border: 1px solid #000;">Rekap</th>
          </tr>
          <tr style="background: #f8fafc; text-align: center; font-size: 7.5pt;">
            ${Array.from({ length: totalDays })
              .map((_, i) => {
                const d = i + 1;
                const isHol = !!holidays[d];
                return `
                  <th style="width: 20px; padding: 2px 1px; border: 1px solid #000; ${
                    isHol ? 'background: #fee2e2; color: #b91c1c; font-weight: bold;' : ''
                  }">
                    ${d}
                  </th>
                `;
              })
              .join('')}
            <th style="width: 22px; padding: 2px; border: 1px solid #000; background: #e0f2fe;" title="Sakit">S</th>
            <th style="width: 22px; padding: 2px; border: 1px solid #000; background: #e0f2fe;" title="Izin">I</th>
            <th style="width: 22px; padding: 2px; border: 1px solid #000; background: #e0f2fe;" title="Alpa">A</th>
            <th style="width: 28px; padding: 2px; border: 1px solid #000; background: #e0f2fe;" title="Total / Jml">Jml</th>
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
              <td style="padding: 3px 6px; border: 1px solid #000; text-align: left; font-weight: 600;">
                ${s.nama}
              </td>
              <td style="padding: 3px 2px; text-align: center; border: 1px solid #000;">${s.jenisKelamin}</td>
              ${Array.from({ length: totalDays })
                .map((_, i) => {
                  const d = i + 1;
                  const isHol = !!holidays[d];
                  return `
                    <td style="border: 1px solid #000; height: 19px; text-align: center; font-size: 7pt; ${
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
            <p style="margin: 0; font-size: 7.5pt; font-weight: bold;">Kepala ${sekolah?.namaSekolah || 'SD NEGERI 1 PEKUTATAN'},</p>
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
