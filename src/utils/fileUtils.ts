/**
 * Utilitas untuk pengelolaan upload dokumen & lampiran berkas surat (PDF, Word, Gambar)
 */

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export interface UploadedFileResult {
  name: string;
  size: string;
  type: string;
  url: string;
}

export function readFileAsDataUrl(file: File, maxMb = 10): Promise<UploadedFileResult> {
  return new Promise((resolve, reject) => {
    const maxBytes = maxMb * 1024 * 1024;
    if (file.size > maxBytes) {
      reject(new Error(`Ukuran file melebihi batas ${maxMb}MB. Mohon pilih file yang lebih kecil.`));
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = (e.target?.result as string) || '';
      resolve({
        name: file.name,
        size: formatFileSize(file.size),
        type: file.type || 'application/octet-stream',
        url: base64,
      });
    };
    reader.onerror = () => {
      reject(new Error('Gagal membaca file'));
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Membuka atau mengunduh dokumen secara aman di peramban
 */
export function openOrDownloadDocument(fileName: string, fileUrl?: string): void {
  if (!fileUrl) {
    alert(`File "${fileName}" tercatat sebagai dokumen fisik di lemari arsip.`);
    return;
  }

  // Jika URL berupa data URL gambar atau PDF
  if (fileUrl.startsWith('data:application/pdf') || fileUrl.startsWith('data:image/')) {
    const isPdf = fileUrl.startsWith('data:application/pdf');
    const win = window.open();
    if (win) {
      win.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8" />
            <title>${fileName}</title>
            <style>
              body { margin: 0; background: #0f172a; height: 100vh; display: flex; flex-direction: column; }
              .header { background: #1e293b; color: white; padding: 10px 16px; font-family: sans-serif; font-size: 13px; display: flex; justify-content: space-between; align-items: center; }
              .btn { background: #2563eb; color: white; border: none; padding: 6px 14px; border-radius: 6px; cursor: pointer; text-decoration: none; font-size: 12px; font-weight: bold; }
              .content { flex: 1; display: flex; align-items: center; justify-content: center; overflow: auto; padding: 10px; }
              iframe { width: 100%; height: 100%; border: none; }
              img { max-width: 95%; max-height: 90vh; object-fit: contain; box-shadow: 0 10px 25px rgba(0,0,0,0.5); border-radius: 4px; }
            </style>
          </head>
          <body>
            <div class="header">
              <span>📄 <strong>${fileName}</strong></span>
              <a href="${fileUrl}" download="${fileName}" class="btn">⬇ Unduh Berkas</a>
            </div>
            <div class="content">
              ${isPdf ? `<iframe src="${fileUrl}"></iframe>` : `<img src="${fileUrl}" alt="${fileName}" />`}
            </div>
          </body>
        </html>
      `);
      win.document.close();
      return;
    }
  }

  // Fallback direct download
  const link = document.createElement('a');
  link.href = fileUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
