import React, { useEffect, useState, useRef } from 'react';
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
} from 'lucide-react';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

interface LokerFilePreviewProps {
  fileUrl: string;
  fileNama?: string;
  fileTipe?: string;
  judul?: string;
}

type PreviewKind = 'image' | 'pdf' | 'docx' | 'doc' | 'spreadsheet' | 'text' | 'unsupported';

interface SheetData {
  name: string;
  rows: (string | number | boolean | null)[][];
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
    ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'svg'].includes(ext) ||
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
    ['xlsx', 'xls', 'csv', 'ods'].includes(ext) ||
    mime === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    mime === 'application/vnd.ms-excel' ||
    mime === 'text/csv'
  ) {
    return 'spreadsheet';
  }

  if (
    ['txt', 'md', 'json', 'log', 'xml', 'html', 'htm'].includes(ext) ||
    mime.startsWith('text/') ||
    mime === 'application/json'
  ) {
    return 'text';
  }

  return 'unsupported';
}

function inferImageMime(fileNama?: string, fileTipe?: string, fileUrl?: string): string {
  if (fileTipe && fileTipe.startsWith('image/')) return fileTipe;
  const dataMime = fileUrl ? getDataUrlMime(fileUrl) : '';
  if (dataMime.startsWith('image/')) return dataMime;
  const ext = getFileExtension(fileNama);
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'gif') return 'image/gif';
  if (ext === 'svg') return 'image/svg+xml';
  if (ext === 'bmp') return 'image/bmp';
  return 'image/jpeg';
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
            'bg-white shadow-md border border-slate-300/80 rounded-md overflow-hidden mx-auto';
          pageWrapper.style.width = `${Math.floor(viewport.width)}px`;
          pageWrapper.style.maxWidth = '100%';

          const canvas = document.createElement('canvas');
          canvas.width = Math.floor(viewport.width * dpr);
          canvas.height = Math.floor(viewport.height * dpr);
          canvas.style.width = '100%';
          canvas.style.height = 'auto';
          canvas.style.display = 'block';

          const ctx = canvas.getContext('2d');
          if (!ctx) continue;

          pageWrapper.appendChild(canvas);

          if (pdfDoc.numPages > 1) {
            const pageLabel = document.createElement('div');
            pageLabel.className =
              'text-[10px] font-semibold text-slate-500 bg-slate-50 border-t border-slate-200 px-3 py-1 text-center';
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
        <div className="flex items-center justify-center gap-2 py-2 text-xs text-slate-600 font-medium">
          <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
          <span>
            Memuat halaman {renderedPages + 1} dari {pdfDoc.numPages}...
          </span>
        </div>
      )}
      {renderError && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2 text-xs text-amber-800">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{renderError}</span>
        </div>
      )}
      <div
        ref={containerRef}
        className="flex flex-col items-center gap-4 p-3 sm:p-5 overflow-auto max-h-[58vh]"
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
  const [imageZoom, setImageZoom] = useState(1);

  // PDF state
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [pdfScale, setPdfScale] = useState(1.15);

  // DOCX / HTML-DOC state
  const [docHtml, setDocHtml] = useState<string | null>(null);
  const [isHtmlDocFrame, setIsHtmlDocFrame] = useState(false);

  // Spreadsheet state
  const [sheets, setSheets] = useState<SheetData[]>([]);
  const [activeSheetIdx, setActiveSheetIdx] = useState(0);

  // Plain text state
  const [plainText, setPlainText] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let createdObjUrl: string | null = null;
    let activeLoadingTask: pdfjsLib.PDFDocumentLoadingTask | null = null;

    setLoading(true);
    setError(null);
    setImageObjectUrl(null);
    setImageZoom(1);
    setPdfDoc(null);
    setPdfScale(1.15);
    setDocHtml(null);
    setIsHtmlDocFrame(false);
    setSheets([]);
    setActiveSheetIdx(0);
    setPlainText(null);

    const loadPreview = async () => {
      try {
        if (kind === 'unsupported') {
          if (!cancelled) setLoading(false);
          return;
        }

        const bytes = await decodeFileToBytes(fileUrl);
        if (cancelled) return;

        if (kind === 'image') {
          const mime = inferImageMime(fileNama, fileTipe, fileUrl);
          const blob = new Blob([bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer], {
            type: mime,
          });
          createdObjUrl = URL.createObjectURL(blob);
          setImageObjectUrl(createdObjUrl);
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
          setPdfDoc(loadedPdf);
          setLoading(false);
          return;
        }

        if (kind === 'docx') {
          const arrayBuffer = bytes.buffer.slice(
            bytes.byteOffset,
            bytes.byteOffset + bytes.byteLength
          ) as ArrayBuffer;
          const result = await mammoth.convertToHtml({ arrayBuffer });
          if (cancelled) return;
          const sanitized = DOMPurify.sanitize(result.value, {
            FORBID_TAGS: ['script', 'iframe', 'object', 'embed'],
          });
          setDocHtml(sanitized || '<p><em>Dokumen kosong.</em></p>');
          setLoading(false);
          return;
        }

        if (kind === 'doc') {
          // Cek apakah berkas .doc merupakan HTML (mis. hasil ekspor Word dari aplikasi) atau biner OLE2
          const headSample = new TextDecoder('utf-8', { fatal: false })
            .decode(bytes.slice(0, 512))
            .trim()
            .toLowerCase();
          const looksLikeHtml =
            headSample.startsWith('<!doctype') ||
            headSample.startsWith('<html') ||
            headSample.includes('<html') ||
            headSample.includes('<body');

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

          setError(
            'Format Word lama (.doc biner) tidak mendukung pratinjau langsung di browser. Gunakan format .docx atau .pdf agar dapat dilihat langsung, atau klik Unduh.'
          );
          setLoading(false);
          return;
        }

        if (kind === 'spreadsheet') {
          const workbook = XLSX.read(bytes, { type: 'array' });
          const parsedSheets: SheetData[] = workbook.SheetNames.map((sheetName) => {
            const sheet = workbook.Sheets[sheetName];
            const rows = XLSX.utils.sheet_to_json<(string | number | boolean | null)[]>(sheet, {
              header: 1,
              defval: '',
            });
            return {
              name: sheetName,
              rows: rows.slice(0, 300),
            };
          });
          setSheets(parsedSheets);
          setActiveSheetIdx(0);
          setLoading(false);
          return;
        }

        if (kind === 'text') {
          const decoded = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
          setPlainText(decoded);
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
  }, [fileUrl, fileNama, fileTipe, kind]);

  if (loading) {
    return (
      <div className="border border-slate-200 rounded-xl bg-slate-50 p-10 flex flex-col items-center justify-center gap-2.5 text-slate-600">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
        <span className="text-xs font-semibold">Memuat pratinjau berkas...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="border border-slate-200 rounded-xl bg-white p-6 text-center space-y-2">
        <FileText className="w-8 h-8 text-amber-500 mx-auto" />
        <div className="text-xs font-bold text-slate-800">{fileNama || judul}</div>
        <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">{error}</p>
      </div>
    );
  }

  if (kind === 'image' && imageObjectUrl) {
    return (
      <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-100">
        <div className="px-3 py-2 bg-white border-b border-slate-200 flex items-center justify-between gap-2 text-xs">
          <span className="font-semibold text-slate-600">Pratinjau Gambar</span>
          <div className="inline-flex items-center gap-1">
            <button
              type="button"
              onClick={() => setImageZoom((z) => Math.max(0.5, Number((z - 0.25).toFixed(2))))}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-700 cursor-pointer"
              title="Perkecil"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="px-2 font-mono text-[11px] font-bold text-slate-700 min-w-[48px] text-center">
              {Math.round(imageZoom * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setImageZoom((z) => Math.min(2.5, Number((z + 0.25).toFixed(2))))}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-700 cursor-pointer"
              title="Perbesar"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            {imageZoom !== 1 && (
              <button
                type="button"
                onClick={() => setImageZoom(1)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 cursor-pointer"
                title="Reset Zoom"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
        <div className="overflow-auto max-h-[58vh] p-3 flex items-center justify-center">
          <img
            src={imageObjectUrl}
            alt={fileNama || judul || 'Pratinjau Gambar'}
            style={{ transform: `scale(${imageZoom})`, transformOrigin: 'center center' }}
            className="max-h-[52vh] w-auto object-contain rounded shadow-xs transition-transform"
          />
        </div>
      </div>
    );
  }

  if (kind === 'pdf' && pdfDoc) {
    return (
      <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-200/80">
        <div className="px-3 py-2 bg-white border-b border-slate-200 flex items-center justify-between gap-2 text-xs">
          <span className="font-semibold text-slate-700">
            Dokumen PDF • {pdfDoc.numPages} Halaman
          </span>
          <div className="inline-flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPdfScale((s) => Math.max(0.6, Number((s - 0.15).toFixed(2))))}
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
              onClick={() => setPdfScale((s) => Math.min(2.2, Number((s + 0.15).toFixed(2))))}
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
        <div className="px-3 py-2 bg-white border-b border-slate-200 text-xs font-semibold text-slate-700">
          Pratinjau Dokumen Word
        </div>
        <div className="p-3 sm:p-5 overflow-auto max-h-[58vh]">
          <div
            className="bg-white border border-slate-200 rounded-lg shadow-xs p-5 sm:p-7 mx-auto max-w-[760px] text-slate-800 text-xs sm:text-sm leading-relaxed [&_h1]:text-lg [&_h1]:font-bold [&_h1]:mb-3 [&_h2]:text-base [&_h2]:font-bold [&_h2]:mb-2 [&_h3]:text-sm [&_h3]:font-bold [&_h3]:mb-2 [&_p]:mb-2.5 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-2.5 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-2.5 [&_table]:w-full [&_table]:border-collapse [&_table]:my-3 [&_td]:border [&_td]:border-slate-300 [&_td]:p-2 [&_th]:border [&_th]:border-slate-300 [&_th]:bg-slate-100 [&_th]:p-2 [&_th]:font-bold [&_img]:max-w-full [&_img]:h-auto"
            dangerouslySetInnerHTML={{ __html: docHtml }}
          />
        </div>
      </div>
    );
  }

  if (kind === 'doc' && isHtmlDocFrame && docHtml !== null) {
    return (
      <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-100">
        <div className="px-3 py-2 bg-white border-b border-slate-200 text-xs font-semibold text-slate-700">
          Pratinjau Dokumen Word
        </div>
        <iframe
          srcDoc={docHtml}
          sandbox=""
          title={fileNama || judul || 'Pratinjau Dokumen'}
          className="w-full h-[55vh] bg-white border-0"
        />
      </div>
    );
  }

  if (kind === 'spreadsheet' && sheets.length > 0) {
    const activeSheet = sheets[activeSheetIdx] || sheets[0];
    const maxCols = activeSheet.rows.reduce((max, row) => Math.max(max, row.length), 0);

    return (
      <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
        <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="font-semibold text-slate-700 inline-flex items-center gap-1.5">
            <TableIcon className="w-3.5 h-3.5 text-emerald-700" />
            <span>Pratinjau Spreadsheet</span>
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
        <div className="overflow-auto max-h-[55vh]">
          {activeSheet.rows.length > 0 ? (
            <table className="w-full border-collapse text-xs">
              <tbody>
                {activeSheet.rows.map((row, rIdx) => (
                  <tr key={rIdx} className={rIdx === 0 ? 'bg-slate-100 font-bold' : 'hover:bg-slate-50'}>
                    <td className="border border-slate-200 bg-slate-50 text-slate-400 font-mono text-[10px] px-2 py-1.5 text-center select-none w-9">
                      {rIdx + 1}
                    </td>
                    {Array.from({ length: maxCols }).map((_, cIdx) => (
                      <td
                        key={cIdx}
                        className="border border-slate-200 px-2.5 py-1.5 text-slate-800 whitespace-pre-wrap min-w-[80px] max-w-[260px]"
                      >
                        {row[cIdx] !== undefined && row[cIdx] !== null ? String(row[cIdx]) : ''}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-6 text-center text-xs text-slate-500">Sheet kosong.</div>
          )}
        </div>
      </div>
    );
  }

  if (kind === 'text' && plainText !== null) {
    return (
      <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
        <div className="px-3 py-2 bg-white border-b border-slate-200 text-xs font-semibold text-slate-700">
          Pratinjau Teks
        </div>
        <div className="p-4 overflow-auto max-h-[55vh]">
          <pre className="bg-white border border-slate-200 rounded-lg p-4 text-xs text-slate-800 font-mono whitespace-pre-wrap break-words leading-relaxed">
            {plainText}
          </pre>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-slate-200 rounded-xl bg-white p-6 text-center space-y-2">
      <FileText className="w-8 h-8 text-indigo-600 mx-auto" />
      <div className="text-xs font-bold text-slate-800">{fileNama || judul}</div>
      <p className="text-xs text-slate-500 max-w-md mx-auto">
        Format berkas ini tidak mendukung pratinjau langsung di browser. Gunakan tombol Unduh di bawah untuk membukanya.
      </p>
    </div>
  );
};
