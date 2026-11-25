import React, { useEffect, useState, useRef, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import DOMPurify from 'dompurify';
import {
  FileText,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Loader2,
  AlertCircle,
  Table as TableIcon,
  Maximize2,
  Presentation,
  Code,
  Eye,
} from 'lucide-react';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

interface LokerFilePreviewProps {
  fileUrl: string;
  fileNama?: string;
  fileTipe?: string;
  judul?: string;
}

type PreviewKind =
  | 'image'
  | 'pdf'
  | 'docx'
  | 'doc'
  | 'spreadsheet'
  | 'pptx'
  | 'html'
  | 'text'
  | 'audio'
  | 'video'
  | 'unsupported';

interface SheetCell {
  value: string;
  rowSpan: number;
  colSpan: number;
  hidden: boolean;
}

interface SheetData {
  name: string;
  rows: SheetCell[][];
  colCount: number;
}

interface PptxSlideData {
  slideNumber: number;
  paragraphs: string[];
}

function getFileExtension(fileNama?: string): string {
  if (!fileNama) return '';
  const idx = fileNama.lastIndexOf('.');
  if (idx === -1) return '';
  return fileNama.slice(idx + 1).toLowerCase().trim();
}

function getDataUrlMime(url: string): string {
  const match = url.match(/^data:([^;,]+)/i);
  return match ? match[1].toLowerCase().trim() : '';
}

function detectPreviewKind(fileUrl: string, fileNama?: string, fileTipe?: string): PreviewKind {
  const ext = getFileExtension(fileNama);
  const mime = (fileTipe || getDataUrlMime(fileUrl) || '').toLowerCase();

  if (
    ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'svg', 'ico', 'avif'].includes(ext) ||
    mime.startsWith('image/')
  ) {
    return 'image';
  }

  if (ext === 'pdf' || mime === 'application/pdf') {
    return 'pdf';
  }

  if (
    ext === 'docx' ||
    mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    return 'docx';
  }

  if (ext === 'doc' || mime === 'application/msword') {
    return 'doc';
  }

  if (
    ['xlsx', 'xls', 'csv', 'ods', 'xlsm', 'xlsb'].includes(ext) ||
    mime === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    mime === 'application/vnd.ms-excel' ||
    mime === 'application/vnd.oasis.opendocument.spreadsheet' ||
    mime === 'text/csv'
  ) {
    return 'spreadsheet';
  }

  if (
    ext === 'pptx' ||
    mime === 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ) {
    return 'pptx';
  }

  if (ext === 'html' || ext === 'htm' || mime === 'text/html') {
    return 'html';
  }

  if (['mp3', 'wav', 'ogg', 'm4a', 'aac'].includes(ext) || mime.startsWith('audio/')) {
    return 'audio';
  }

  if (['mp4', 'webm', 'ogv', 'mov'].includes(ext) || mime.startsWith('video/')) {
    return 'video';
  }

  if (
    ['txt', 'md', 'json', 'log', 'xml', 'yaml', 'yml', 'ini', 'rtf'].includes(ext) ||
    mime.startsWith('text/') ||
    mime === 'application/json' ||
    mime === 'application/xml'
  ) {
    return 'text';
  }

  return 'unsupported';
}

function inferBinaryMime(
  fileNama?: string,
  fileTipe?: string,
  fileUrl?: string,
  fallback = 'application/octet-stream'
): string {
  if (fileTipe && fileTipe.includes('/')) return fileTipe;
  const dataMime = fileUrl ? getDataUrlMime(fileUrl) : '';
  if (dataMime && dataMime.includes('/')) return dataMime;
  const ext = getFileExtension(fileNama);
  const map: Record<string, string> = {
    png: 'image/png',
    webp: 'image/webp',
    gif: 'image/gif',
    svg: 'image/svg+xml',
    bmp: 'image/bmp',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    ico: 'image/x-icon',
    avif: 'image/avif',
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    ogg: 'audio/ogg',
    m4a: 'audio/mp4',
    aac: 'audio/aac',
    mp4: 'video/mp4',
    webm: 'video/webm',
    ogv: 'video/ogg',
    mov: 'video/quicktime',
  };
  return map[ext] || fallback;
}

async function decodeFileToBytes(fileUrl: string): Promise<Uint8Array> {
  if (fileUrl.startsWith('data:')) {
    const commaIdx = fileUrl.indexOf(',');
    if (commaIdx === -1) {
      throw new Error('Format data berkas tidak valid.');
    }
    const header = fileUrl.slice(0, commaIdx);
    const body = fileUrl.slice(commaIdx + 1);
    if (/;base64/i.test(header)) {
      const cleaned = body.replace(/\s+/g, '');
      const binary = atob(cleaned);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      return bytes;
    }
    const decodedText = decodeURIComponent(body);
    return new TextEncoder().encode(decodedText);
  }

  const response = await fetch(fileUrl);
  if (!response.ok) {
    throw new Error('Gagal memuat berkas untuk pratinjau.');
  }
  const buffer = await response.arrayBuffer();
  return new Uint8Array(buffer);
}

function stripRtfToPlainText(rtf: string): string {
  return rtf
    .replace(/\\par[d]?/g, '\n')
    .replace(/\\tab/g, '\t')
    .replace(/\\line/g, '\n')
    .replace(/\{\\\*[^}]*\}/g, '')
    .replace(/\\[a-zA-Z]+-?\d*\s?/g, '')
    .replace(/[{}]/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function parseSpreadsheetSheet(sheet: XLSX.WorkSheet): { rows: SheetCell[][]; colCount: number } {
  const ref = sheet['!ref'];
  if (!ref) {
    return { rows: [], colCount: 0 };
  }

  const fullRange = XLSX.utils.decode_range(ref);
  const merges = (sheet['!merges'] || []) as XLSX.Range[];

  let maxR = fullRange.s.r;
  let maxC = fullRange.s.c;

  // Temukan baris dan kolom terakhir yang benar-benar terisi agar tabel tidak menampilkan jutaan baris kosong
  const cappedEndR = Math.min(fullRange.e.r, fullRange.s.r + 3000);
  const cappedEndC = Math.min(fullRange.e.c, fullRange.s.c + 80);

  for (let r = fullRange.s.r; r <= cappedEndR; r++) {
    for (let c = fullRange.s.c; c <= cappedEndC; c++) {
      const addr = XLSX.utils.encode_cell({ r, c });
      const cell = sheet[addr] as XLSX.CellObject | undefined;
      if (cell && cell.v !== undefined && cell.v !== null && String(cell.v) !== '') {
        if (r > maxR) maxR = r;
        if (c > maxC) maxC = c;
      }
    }
  }

  merges.forEach((m) => {
    const tlAddr = XLSX.utils.encode_cell({ r: m.s.r, c: m.s.c });
    const tlCell = sheet[tlAddr] as XLSX.CellObject | undefined;
    if (tlCell && tlCell.v !== undefined && tlCell.v !== null && String(tlCell.v) !== '') {
      if (m.e.r > maxR && m.e.r <= cappedEndR) maxR = m.e.r;
      if (m.e.c > maxC && m.e.c <= cappedEndC) maxC = m.e.c;
    }
  });

  if (maxR < fullRange.s.r || maxC < fullRange.s.c) {
    return { rows: [], colCount: 0 };
  }

  const rowCount = maxR - fullRange.s.r + 1;
  const colCount = maxC - fullRange.s.c + 1;

  const grid: SheetCell[][] = [];
  for (let r = fullRange.s.r; r <= maxR; r++) {
    const rowCells: SheetCell[] = [];
    for (let c = fullRange.s.c; c <= maxC; c++) {
      const addr = XLSX.utils.encode_cell({ r, c });
      const cell = sheet[addr] as XLSX.CellObject | undefined;
      const formatted = cell ? XLSX.utils.format_cell(cell) : '';
      rowCells.push({
        value: formatted,
        rowSpan: 1,
        colSpan: 1,
        hidden: false,
      });
    }
    grid.push(rowCells);
  }

  // Terapkan sel gabungan (merged cells) dari Excel
  merges.forEach((m) => {
    const startR = m.s.r - fullRange.s.r;
    const startC = m.s.c - fullRange.s.c;
    const endR = Math.min(m.e.r - fullRange.s.r, rowCount - 1);
    const endC = Math.min(m.e.c - fullRange.s.c, colCount - 1);

    if (startR < 0 || startC < 0 || startR >= rowCount || startC >= colCount) return;

    const anchor = grid[startR][startC];
    anchor.rowSpan = Math.max(1, endR - startR + 1);
    anchor.colSpan = Math.max(1, endC - startC + 1);

    for (let r = startR; r <= endR; r++) {
      for (let c = startC; c <= endC; c++) {
        if (r === startR && c === startC) continue;
        grid[r][c].hidden = true;
      }
    }
  });

  return { rows: grid, colCount };
}

async function extractPptxSlides(bytes: Uint8Array): Promise<PptxSlideData[]> {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const decoder = new TextDecoder('utf-8', { fatal: false });

  // Cari End of Central Directory (0x06054b50)
  let eocdPos = -1;
  const minSearch = Math.max(0, bytes.length - 65558);
  for (let i = bytes.length - 22; i >= minSearch; i--) {
    if (
      bytes[i] === 0x50 &&
      bytes[i + 1] === 0x4b &&
      bytes[i + 2] === 0x05 &&
      bytes[i + 3] === 0x06
    ) {
      eocdPos = i;
      break;
    }
  }
  if (eocdPos === -1) {
    throw new Error('Struktur berkas PPTX tidak valid.');
  }

  const totalEntries = view.getUint16(eocdPos + 10, true);
  let pos = view.getUint32(eocdPos + 16, true);

  interface ZipSlideEntry {
    slideNumber: number;
    method: number;
    compressedSize: number;
    localHeaderOffset: number;
  }

  const slideEntries: ZipSlideEntry[] = [];

  for (let idx = 0; idx < totalEntries; idx++) {
    if (pos + 46 > bytes.length) break;
    const sig = view.getUint32(pos, true);
    if (sig !== 0x02014b50) break;

    const method = view.getUint16(pos + 10, true);
    const compressedSize = view.getUint32(pos + 20, true);
    const nameLen = view.getUint16(pos + 28, true);
    const extraLen = view.getUint16(pos + 30, true);
    const commentLen = view.getUint16(pos + 32, true);
    const localHeaderOffset = view.getUint32(pos + 42, true);

    const fileName = decoder.decode(bytes.subarray(pos + 46, pos + 46 + nameLen));
    const match = fileName.match(/^ppt\/slides\/slide(\d+)\.xml$/i);
    if (match) {
      slideEntries.push({
        slideNumber: Number(match[1]),
        method,
        compressedSize,
        localHeaderOffset,
      });
    }

    pos += 46 + nameLen + extraLen + commentLen;
  }

  slideEntries.sort((a, b) => a.slideNumber - b.slideNumber);

  const slides: PptxSlideData[] = [];
  const domParser = new DOMParser();

  for (const entry of slideEntries) {
    const lh = entry.localHeaderOffset;
    if (lh + 30 > bytes.length || view.getUint32(lh, true) !== 0x04034b50) continue;
    const lNameLen = view.getUint16(lh + 26, true);
    const lExtraLen = view.getUint16(lh + 28, true);
    const dataStart = lh + 30 + lNameLen + lExtraLen;
    const dataEnd = Math.min(bytes.length, dataStart + entry.compressedSize);
    const slice = bytes.slice(dataStart, dataEnd);

    let xmlText = '';
    if (entry.method === 0) {
      xmlText = decoder.decode(slice);
    } else if (entry.method === 8 && typeof DecompressionStream !== 'undefined') {
      const ds = new DecompressionStream('deflate-raw');
      const decompressedStream = new Blob([slice]).stream().pipeThrough(ds);
      const ab = await new Response(decompressedStream).arrayBuffer();
      xmlText = decoder.decode(new Uint8Array(ab));
    } else {
      continue;
    }

    const xmlDoc = domParser.parseFromString(xmlText, 'application/xml');
    const pNodes = Array.from(xmlDoc.getElementsByTagName('*')).filter(
      (el) => el.localName === 'p'
    );

    const paragraphs: string[] = [];
    for (const p of pNodes) {
      const tNodes = Array.from(p.getElementsByTagName('*')).filter(
        (el) => el.localName === 't'
      );
      const text = tNodes
        .map((t) => t.textContent || '')
        .join('')
        .trim();
      if (text) {
        paragraphs.push(text);
      }
    }

    slides.push({
      slideNumber: entry.slideNumber,
      paragraphs,
    });
  }

  return slides;
}

interface PdfCanvasRendererProps {
  pdfDoc: pdfjsLib.PDFDocumentProxy;
  scale: number;
}

const PdfCanvasRenderer: React.FC<PdfCanvasRendererProps> = ({ pdfDoc, scale }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [renderedPages, setRenderedPages] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const activeTasks: pdfjsLib.RenderTask[] = [];
    const container = containerRef.current;
    if (!container) return;

    container.innerHTML = '';
    setRenderError(null);
    setRenderedPages(0);

    const renderAllPages = async () => {
      try {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
          if (cancelled) return;
          const page = await pdfDoc.getPage(pageNum);
          if (cancelled) return;

          const viewport = page.getViewport({ scale });

          const pageWrapper = document.createElement('div');
          pageWrapper.className =
            'bg-white shadow-md border border-slate-300/90 rounded-md overflow-hidden mx-auto shrink-0';
          pageWrapper.style.width = `${Math.floor(viewport.width)}px`;

          const canvas = document.createElement('canvas');
          canvas.width = Math.floor(viewport.width * dpr);
          canvas.height = Math.floor(viewport.height * dpr);
          canvas.style.width = `${Math.floor(viewport.width)}px`;
          canvas.style.height = `${Math.floor(viewport.height)}px`;
          canvas.style.display = 'block';

          const ctx = canvas.getContext('2d');
          if (!ctx) continue;

          pageWrapper.appendChild(canvas);

          if (pdfDoc.numPages > 1) {
            const pageLabel = document.createElement('div');
            pageLabel.className =
              'text-[11px] font-semibold text-slate-500 bg-slate-50 border-t border-slate-200 px-3 py-1.5 text-center';
            pageLabel.textContent = `Halaman ${pageNum} dari ${pdfDoc.numPages}`;
            pageWrapper.appendChild(pageLabel);
          }

          container.appendChild(pageWrapper);

          const renderTask = page.render({
            canvas,
            canvasContext: ctx,
            viewport,
            transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : undefined,
          });
          activeTasks.push(renderTask);
          await renderTask.promise;

          if (!cancelled) {
            setRenderedPages(pageNum);
          }
        }
      } catch (err: unknown) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : '';
        if (msg.toLowerCase().includes('cancel')) return;
        setRenderError('Sebagian halaman PDF gagal ditampilkan.');
      }
    };

    void renderAllPages();

    return () => {
      cancelled = true;
      activeTasks.forEach((task) => {
        try {
          task.cancel();
        } catch {
          // ignore
        }
      });
    };
  }, [pdfDoc, scale]);

  return (
    <div className="space-y-2">
      {renderedPages < pdfDoc.numPages && !renderError && (
        <div className="flex items-center justify-center gap-2 py-2.5 text-xs text-slate-600 font-medium bg-white/70 border-b border-slate-200">
          <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
          <span>
            Memuat halaman {renderedPages + 1} dari {pdfDoc.numPages}...
          </span>
        </div>
      )}
      {renderError && (
        <div className="m-3 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2 text-xs text-amber-800">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{renderError}</span>
        </div>
      )}
      <div
        ref={containerRef}
        className="flex flex-col items-center gap-5 p-3 sm:p-6 overflow-x-auto"
      />
    </div>
  );
};

export const LokerFilePreview: React.FC<LokerFilePreviewProps> = ({
  fileUrl,
  fileNama,
  fileTipe,
  judul,
}) => {
  const kind = detectPreviewKind(fileUrl, fileNama, fileTipe);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Image state
  const [imageObjectUrl, setImageObjectUrl] = useState<string | null>(null);
  const [imageFitWidth, setImageFitWidth] = useState(true);
  const [imageZoom, setImageZoom] = useState(1);
  const [imageNaturalSize, setImageNaturalSize] = useState<{ w: number; h: number } | null>(null);

  // PDF state
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [pdfScale, setPdfScale] = useState(1.2);
  const [pdfFitScale, setPdfFitScale] = useState(1.2);
  const pdfWrapperRef = useRef<HTMLDivElement>(null);

  // DOCX / HTML-DOC / HTML state
  const [docHtml, setDocHtml] = useState<string | null>(null);
  const [isHtmlDocFrame, setIsHtmlDocFrame] = useState(false);
  const [htmlIframeHeight, setHtmlIframeHeight] = useState(640);
  const [showHtmlSource, setShowHtmlSource] = useState(false);

  // Spreadsheet state
  const [sheets, setSheets] = useState<SheetData[]>([]);
  const [activeSheetIdx, setActiveSheetIdx] = useState(0);

  // PPTX state
  const [pptxSlides, setPptxSlides] = useState<PptxSlideData[]>([]);

  // Plain text state
  const [plainText, setPlainText] = useState<string | null>(null);

  // Media state (audio / video)
  const [mediaObjectUrl, setMediaObjectUrl] = useState<string | null>(null);

  const computeFitPdfScale = useCallback(async (doc: pdfjsLib.PDFDocumentProxy) => {
    try {
      const firstPage = await doc.getPage(1);
      const baseViewport = firstPage.getViewport({ scale: 1 });
      const availableWidth = Math.max(
        300,
        (pdfWrapperRef.current?.clientWidth || window.innerWidth * 0.78) - 56
      );
      const computed = Number(
        Math.min(1.6, Math.max(0.65, availableWidth / baseViewport.width)).toFixed(2)
      );
      return computed;
    } catch {
      return 1.2;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    let createdObjUrl: string | null = null;
    let activeLoadingTask: pdfjsLib.PDFDocumentLoadingTask | null = null;

    setLoading(true);
    setError(null);
    setImageObjectUrl(null);
    setImageFitWidth(true);
    setImageZoom(1);
    setImageNaturalSize(null);
    setPdfDoc(null);
    setPdfScale(1.2);
    setPdfFitScale(1.2);
    setDocHtml(null);
    setIsHtmlDocFrame(false);
    setHtmlIframeHeight(640);
    setShowHtmlSource(false);
    setSheets([]);
    setActiveSheetIdx(0);
    setPptxSlides([]);
    setPlainText(null);
    setMediaObjectUrl(null);

    const loadPreview = async () => {
      try {
        if (kind === 'unsupported') {
          if (!cancelled) setLoading(false);
          return;
        }

        const bytes = await decodeFileToBytes(fileUrl);
        if (cancelled) return;

        if (kind === 'image') {
          const mime = inferBinaryMime(fileNama, fileTipe, fileUrl, 'image/jpeg');
          const blob = new Blob(
            [bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer],
            { type: mime }
          );
          createdObjUrl = URL.createObjectURL(blob);
          setImageObjectUrl(createdObjUrl);
          setLoading(false);
          return;
        }

        if (kind === 'audio' || kind === 'video') {
          const fallback = kind === 'audio' ? 'audio/mpeg' : 'video/mp4';
          const mime = inferBinaryMime(fileNama, fileTipe, fileUrl, fallback);
          const blob = new Blob(
            [bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer],
            { type: mime }
          );
          createdObjUrl = URL.createObjectURL(blob);
          setMediaObjectUrl(createdObjUrl);
          setLoading(false);
          return;
        }

        if (kind === 'pdf') {
          activeLoadingTask = pdfjsLib.getDocument({ data: bytes.slice() });
          const loadedPdf = await activeLoadingTask.promise;
          if (cancelled) {
            await activeLoadingTask.destroy();
            return;
          }
          const initialFit = await computeFitPdfScale(loadedPdf);
          if (cancelled) return;
          setPdfFitScale(initialFit);
          setPdfScale(initialFit);
          setPdfDoc(loadedPdf);
          setLoading(false);
          return;
        }

        if (kind === 'docx') {
          const arrayBuffer = bytes.buffer.slice(
            bytes.byteOffset,
            bytes.byteOffset + bytes.byteLength
          ) as ArrayBuffer;
          const result = await mammoth.convertToHtml(
            { arrayBuffer },
            {
              styleMap: [
                'u => u',
                'strike => del',
              ],
            }
          );
          if (cancelled) return;
          const sanitized = DOMPurify.sanitize(result.value, {
            FORBID_TAGS: ['script', 'iframe', 'object', 'embed'],
          });
          setDocHtml(sanitized || '<p><em>Dokumen kosong.</em></p>');
          setLoading(false);
          return;
        }

        if (kind === 'doc') {
          const headSample = new TextDecoder('utf-8', { fatal: false })
            .decode(bytes.slice(0, 1024))
            .trim()
            .toLowerCase();
          const looksLikeHtml =
            headSample.startsWith('<!doctype') ||
            headSample.startsWith('<html') ||
            headSample.includes('<html') ||
            headSample.includes('<body') ||
            headSample.includes('<table') ||
            headSample.includes('<div');

          if (looksLikeHtml) {
            const fullHtml = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
            const sanitized = DOMPurify.sanitize(fullHtml, {
              WHOLE_DOCUMENT: true,
              FORBID_TAGS: ['script', 'iframe', 'object', 'embed'],
            });
            setDocHtml(sanitized);
            setIsHtmlDocFrame(true);
            setLoading(false);
            return;
          }

          if (headSample.startsWith('{\\rtf')) {
            const fullRtf = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
            setPlainText(stripRtfToPlainText(fullRtf));
            setLoading(false);
            return;
          }

          setError(
            'Format Word lama (.doc biner) tidak dapat dirender langsung oleh browser. Simpan sebagai .docx atau .pdf untuk pratinjau utuh, atau klik Unduh.'
          );
          setLoading(false);
          return;
        }

        if (kind === 'spreadsheet') {
          const workbook = XLSX.read(bytes, { type: 'array', cellStyles: true });
          const parsedSheets: SheetData[] = workbook.SheetNames.map((sheetName) => {
            const sheet = workbook.Sheets[sheetName];
            const parsed = parseSpreadsheetSheet(sheet);
            return {
              name: sheetName,
              rows: parsed.rows,
              colCount: parsed.colCount,
            };
          });
          setSheets(parsedSheets);
          setActiveSheetIdx(0);
          setLoading(false);
          return;
        }

        if (kind === 'pptx') {
          const slides = await extractPptxSlides(bytes);
          if (cancelled) return;
          setPptxSlides(slides);
          setLoading(false);
          return;
        }

        if (kind === 'html') {
          const fullHtml = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
          const sanitized = DOMPurify.sanitize(fullHtml, {
            WHOLE_DOCUMENT: true,
            FORBID_TAGS: ['script', 'iframe', 'object', 'embed'],
          });
          setDocHtml(sanitized);
          setPlainText(fullHtml);
          setIsHtmlDocFrame(true);
          setLoading(false);
          return;
        }

        if (kind === 'text') {
          const decoded = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
          const ext = getFileExtension(fileNama);
          setPlainText(ext === 'rtf' || decoded.trimStart().startsWith('{\\rtf') ? stripRtfToPlainText(decoded) : decoded);
          setLoading(false);
          return;
        }
      } catch (err: unknown) {
        if (cancelled) return;
        const msg =
          err instanceof Error && err.message
            ? err.message
            : 'Berkas tidak dapat dipratinjau secara langsung.';
        setError(msg);
        setLoading(false);
      }
    };

    void loadPreview();

    return () => {
      cancelled = true;
      if (createdObjUrl) {
        URL.revokeObjectURL(createdObjUrl);
      }
      if (activeLoadingTask) {
        void activeLoadingTask.destroy();
      }
    };
  }, [fileUrl, fileNama, fileTipe, kind, computeFitPdfScale]);

  const handleIframeLoad = (e: React.SyntheticEvent<HTMLIFrameElement>) => {
    try {
      const iframe = e.currentTarget;
      const doc = iframe.contentDocument;
      if (doc && doc.documentElement) {
        const contentHeight = Math.max(
          doc.documentElement.scrollHeight || 0,
          doc.body?.scrollHeight || 0
        );
        if (contentHeight > 0) {
          setHtmlIframeHeight(Math.max(480, contentHeight + 40));
        }
      }
    } catch {
      // ignore cross-origin restrictions if any
    }
  };

  if (loading) {
    return (
      <div className="border border-slate-200 rounded-xl bg-slate-50 p-12 flex flex-col items-center justify-center gap-2.5 text-slate-600">
        <Loader2 className="w-7 h-7 animate-spin text-indigo-600" />
        <span className="text-xs sm:text-sm font-semibold">Memuat pratinjau berkas secara utuh...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="border border-slate-200 rounded-xl bg-white p-8 text-center space-y-2.5">
        <FileText className="w-9 h-9 text-amber-500 mx-auto" />
        <div className="text-sm font-bold text-slate-800">{fileNama || judul}</div>
        <p className="text-xs sm:text-sm text-slate-600 max-w-lg mx-auto leading-relaxed">{error}</p>
      </div>
    );
  }

  if (kind === 'image' && imageObjectUrl) {
    return (
      <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-100">
        <div className="px-3.5 py-2 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="font-semibold text-slate-700">
            Pratinjau Gambar
            {imageNaturalSize ? ` (${imageNaturalSize.w} × ${imageNaturalSize.h} px)` : ''}
          </span>
          <div className="inline-flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                setImageFitWidth(true);
                setImageZoom(1);
              }}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer inline-flex items-center gap-1 ${
                imageFitWidth
                  ? 'bg-indigo-100 text-indigo-900'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
              title="Sesuaikan Lebar Layar"
            >
              <Maximize2 className="w-3 h-3" />
              <span>Utuh</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setImageFitWidth(false);
                setImageZoom((z) => Math.max(0.25, Number((z - 0.25).toFixed(2))));
              }}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-700 cursor-pointer"
              title="Perkecil"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="px-2 font-mono text-[11px] font-bold text-slate-700 min-w-[52px] text-center">
              {imageFitWidth ? 'Utuh' : `${Math.round(imageZoom * 100)}%`}
            </span>
            <button
              type="button"
              onClick={() => {
                setImageFitWidth(false);
                setImageZoom((z) => Math.min(3, Number((z + 0.25).toFixed(2))));
              }}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-700 cursor-pointer"
              title="Perbesar"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            {!imageFitWidth && (
              <button
                type="button"
                onClick={() => {
                  setImageFitWidth(true);
                  setImageZoom(1);
                }}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 cursor-pointer"
                title="Reset"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
        <div className="overflow-x-auto p-3 sm:p-5 flex justify-center bg-slate-100">
          <img
            src={imageObjectUrl}
            alt={fileNama || judul || 'Pratinjau Gambar'}
            onLoad={(e) =>
              setImageNaturalSize({
                w: e.currentTarget.naturalWidth,
                h: e.currentTarget.naturalHeight,
              })
            }
            style={
              !imageFitWidth && imageNaturalSize
                ? { width: `${Math.round(imageNaturalSize.w * imageZoom)}px`, maxWidth: 'none', height: 'auto' }
                : undefined
            }
            className={
              imageFitWidth
                ? 'max-w-full w-auto h-auto rounded-lg shadow-sm block bg-white'
                : 'h-auto rounded-lg shadow-sm block bg-white'
            }
          />
        </div>
      </div>
    );
  }

  if (kind === 'pdf' && pdfDoc) {
    return (
      <div ref={pdfWrapperRef} className="border border-slate-200 rounded-xl overflow-hidden bg-slate-200/80">
        <div className="px-3.5 py-2 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs sticky top-0 z-10">
          <span className="font-semibold text-slate-700">
            Dokumen PDF • {pdfDoc.numPages} Halaman
          </span>
          <div className="inline-flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPdfScale(pdfFitScale)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer inline-flex items-center gap-1 ${
                Math.abs(pdfScale - pdfFitScale) < 0.02
                  ? 'bg-indigo-100 text-indigo-900'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
              title="Sesuaikan Lebar"
            >
              <Maximize2 className="w-3 h-3" />
              <span>Sesuai Lebar</span>
            </button>
            <button
              type="button"
              onClick={() => setPdfScale((s) => Math.max(0.5, Number((s - 0.15).toFixed(2))))}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-700 cursor-pointer"
              title="Perkecil"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="px-2 font-mono text-[11px] font-bold text-slate-700 min-w-[48px] text-center">
              {Math.round(pdfScale * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setPdfScale((s) => Math.min(2.5, Number((s + 0.15).toFixed(2))))}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-700 cursor-pointer"
              title="Perbesar"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        <PdfCanvasRenderer pdfDoc={pdfDoc} scale={pdfScale} />
      </div>
    );
  }

  if (kind === 'docx' && docHtml !== null) {
    return (
      <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-100">
        <div className="px-3.5 py-2 bg-white border-b border-slate-200 text-xs font-semibold text-slate-700">
          Pratinjau Dokumen Word (.docx)
        </div>
        <div className="p-3 sm:p-6 overflow-x-auto">
          <div
            className="bg-white border border-slate-200 rounded-lg shadow-xs p-6 sm:p-10 mx-auto max-w-4xl text-slate-900 text-xs sm:text-sm leading-relaxed [&_h1]:text-xl [&_h1]:font-bold [&_h1]:mb-3 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:mb-2.5 [&_h3]:text-base [&_h3]:font-bold [&_h3]:mb-2 [&_p]:mb-2.5 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-2.5 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:mb-2.5 [&_table]:w-full [&_table]:border-collapse [&_table]:my-3 [&_td]:border [&_td]:border-slate-300 [&_td]:p-2 [&_td]:align-top [&_th]:border [&_th]:border-slate-300 [&_th]:bg-slate-100 [&_th]:p-2 [&_th]:font-bold [&_img]:max-w-full [&_img]:h-auto"
            dangerouslySetInnerHTML={{ __html: docHtml }}
          />
        </div>
      </div>
    );
  }

  if ((kind === 'doc' || kind === 'html') && isHtmlDocFrame && docHtml !== null) {
    return (
      <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-100">
        <div className="px-3.5 py-2 bg-white border-b border-slate-200 flex items-center justify-between gap-2 text-xs">
          <span className="font-semibold text-slate-700">
            {kind === 'html' ? 'Pratinjau Dokumen HTML' : 'Pratinjau Dokumen Word'}
          </span>
          {kind === 'html' && plainText !== null && (
            <button
              type="button"
              onClick={() => setShowHtmlSource((s) => !s)}
              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold inline-flex items-center gap-1 cursor-pointer"
            >
              {showHtmlSource ? <Eye className="w-3.5 h-3.5" /> : <Code className="w-3.5 h-3.5" />}
              <span>{showHtmlSource ? 'Tampilan Web' : 'Kode Sumber'}</span>
            </button>
          )}
        </div>
        {kind === 'html' && showHtmlSource && plainText !== null ? (
          <div className="p-4 overflow-x-auto">
            <pre className="bg-white border border-slate-200 rounded-lg p-4 text-xs text-slate-800 font-mono whitespace-pre-wrap break-words leading-relaxed">
              {plainText}
            </pre>
          </div>
        ) : (
          <div className="p-3 sm:p-5 overflow-x-auto bg-slate-100">
            <iframe
              srcDoc={docHtml}
              sandbox="allow-same-origin"
              onLoad={handleIframeLoad}
              style={{ height: `${htmlIframeHeight}px` }}
              title={fileNama || judul || 'Pratinjau Dokumen'}
              className="w-full min-h-[480px] bg-white border border-slate-200 rounded-lg shadow-xs"
            />
          </div>
        )}
      </div>
    );
  }

  if (kind === 'doc' && plainText !== null) {
    return (
      <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-100">
        <div className="px-3.5 py-2 bg-white border-b border-slate-200 text-xs font-semibold text-slate-700">
          Pratinjau Dokumen Teks / RTF
        </div>
        <div className="p-4 sm:p-6">
          <pre className="bg-white border border-slate-200 rounded-lg p-5 sm:p-8 max-w-4xl mx-auto text-xs sm:text-sm text-slate-800 font-sans whitespace-pre-wrap break-words leading-relaxed">
            {plainText}
          </pre>
        </div>
      </div>
    );
  }

  if (kind === 'spreadsheet' && sheets.length > 0) {
    const activeSheet = sheets[activeSheetIdx] || sheets[0];

    return (
      <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
        <div className="px-3.5 py-2 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="font-semibold text-slate-700 inline-flex items-center gap-1.5">
            <TableIcon className="w-3.5 h-3.5 text-emerald-700" />
            <span>
              Pratinjau Excel / Spreadsheet ({activeSheet.rows.length} baris × {activeSheet.colCount} kolom)
            </span>
          </span>
          {sheets.length > 1 && (
            <div className="flex flex-wrap items-center gap-1">
              {sheets.map((s, idx) => (
                <button
                  key={`${s.name}-${idx}`}
                  type="button"
                  onClick={() => setActiveSheetIdx(idx)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                    idx === activeSheetIdx
                      ? 'bg-emerald-700 text-white'
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {s.name}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="overflow-x-auto">
          {activeSheet.rows.length > 0 ? (
            <table className="w-full border-collapse text-xs">
              <tbody>
                {activeSheet.rows.map((row, rIdx) => (
                  <tr key={rIdx} className={rIdx === 0 ? 'bg-slate-100 font-bold' : 'hover:bg-slate-50'}>
                    <td className="border border-slate-200 bg-slate-50 text-slate-400 font-mono text-[10px] px-2 py-1.5 text-center select-none w-10 sticky left-0">
                      {rIdx + 1}
                    </td>
                    {row.map((cell, cIdx) => {
                      if (cell.hidden) return null;
                      return (
                        <td
                          key={cIdx}
                          rowSpan={cell.rowSpan > 1 ? cell.rowSpan : undefined}
                          colSpan={cell.colSpan > 1 ? cell.colSpan : undefined}
                          className="border border-slate-200 px-2.5 py-1.5 text-slate-800 whitespace-pre-wrap min-w-[80px] align-top"
                        >
                          {cell.value}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-8 text-center text-xs text-slate-500">Sheet kosong.</div>
          )}
        </div>
      </div>
    );
  }

  if (kind === 'pptx') {
    return (
      <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-100">
        <div className="px-3.5 py-2 bg-white border-b border-slate-200 flex items-center gap-2 text-xs font-semibold text-slate-700">
          <Presentation className="w-4 h-4 text-orange-600" />
          <span>Pratinjau Presentasi PowerPoint ({pptxSlides.length} Slide)</span>
        </div>
        {pptxSlides.length > 0 ? (
          <div className="p-4 sm:p-6 space-y-4">
            {pptxSlides.map((slide) => (
              <div
                key={slide.slideNumber}
                className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden max-w-4xl mx-auto"
              >
                <div className="px-4 py-2 bg-orange-50 border-b border-orange-200/80 text-xs font-bold text-orange-900">
                  Slide {slide.slideNumber}
                </div>
                <div className="p-5 sm:p-6 space-y-2 text-xs sm:text-sm text-slate-800 leading-relaxed">
                  {slide.paragraphs.length > 0 ? (
                    slide.paragraphs.map((p, idx) => (
                      <p key={idx} className={idx === 0 ? 'font-bold text-slate-900 text-sm sm:text-base' : ''}>
                        {p}
                      </p>
                    ))
                  ) : (
                    <p className="italic text-slate-400">Slide ini tidak berisi teks (hanya gambar/grafik).</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-xs text-slate-500">Tidak ada konten slide yang dapat ditampilkan.</div>
        )}
      </div>
    );
  }

  if (kind === 'audio' && mediaObjectUrl) {
    return (
      <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50 p-6 flex flex-col items-center gap-3">
        <span className="text-xs font-bold text-slate-700">{fileNama || judul}</span>
        <audio controls src={mediaObjectUrl} className="w-full max-w-xl" />
      </div>
    );
  }

  if (kind === 'video' && mediaObjectUrl) {
    return (
      <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-950 p-3 flex justify-center">
        <video controls src={mediaObjectUrl} className="w-full max-h-[78vh] rounded-lg" />
      </div>
    );
  }

  if (kind === 'text' && plainText !== null) {
    return (
      <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
        <div className="px-3.5 py-2 bg-white border-b border-slate-200 text-xs font-semibold text-slate-700">
          Pratinjau Teks
        </div>
        <div className="p-4 sm:p-5 overflow-x-auto">
          <pre className="bg-white border border-slate-200 rounded-lg p-5 text-xs sm:text-sm text-slate-800 font-mono whitespace-pre-wrap break-words leading-relaxed">
            {plainText}
          </pre>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-slate-200 rounded-xl bg-white p-8 text-center space-y-2.5">
      <FileText className="w-9 h-9 text-indigo-600 mx-auto" />
      <div className="text-sm font-bold text-slate-800">{fileNama || judul}</div>
      <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
        Format berkas ini tidak mendukung pratinjau langsung di browser. Gunakan tombol Unduh di bawah untuk membukanya.
      </p>
    </div>
  );
};
