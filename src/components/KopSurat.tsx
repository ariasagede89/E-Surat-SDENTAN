import React from 'react';
import { PengaturanSekolah } from '../types';

interface KopSuratProps {
  sekolah: PengaturanSekolah;
  compact?: boolean;
}

export const KopSurat: React.FC<KopSuratProps> = ({ sekolah, compact = false }) => {
  if (sekolah.kopImageUrl) {
    return (
      <div className={`text-center font-serif text-slate-900 border-b-4 border-double border-slate-900 ${compact ? 'pb-2 mb-3' : 'pb-3 mb-5'}`}>
        <img
          src={sekolah.kopImageUrl}
          alt={`Kop Surat ${sekolah.namaSekolah}`}
          className="w-full max-h-36 object-contain mx-auto"
        />
      </div>
    );
  }

  return (
    <div className={`text-center font-serif text-slate-900 border-b-4 border-double border-slate-900 ${compact ? 'pb-2 mb-3' : 'pb-3 mb-5'}`}>
      <div className="flex items-center justify-between gap-4">
        {/* Logo Pemkab Jembrana / Tut Wuri Handayani */}
        <div className="w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0 flex items-center justify-center p-1">
          <div className="w-full h-full rounded-full border-2 border-slate-800 bg-amber-50 flex items-center justify-center text-center font-bold text-[10px] text-slate-900 shadow-sm leading-tight p-1">
            PEMKAB<br />JEMBRANA
          </div>
        </div>

        {/* Instansi Text */}
        <div className="flex-1 text-center">
          <p className="text-xs sm:text-sm font-bold tracking-wider uppercase m-0 leading-tight">
            {sekolah.instansiBaris1}
          </p>
          <p className="text-xs sm:text-sm font-bold tracking-wide uppercase m-0 leading-tight">
            {sekolah.instansiBaris2}
          </p>
          <p className="text-[11px] sm:text-xs font-semibold tracking-wide uppercase m-0 leading-tight">
            {sekolah.instansiBaris3}
          </p>
          <h1 className="text-base sm:text-xl font-extrabold tracking-normal uppercase m-0 my-0.5 text-slate-950 font-serif">
            {sekolah.namaSekolah}
          </h1>
          <p className="text-[10px] sm:text-xs italic text-slate-700 m-0 leading-tight">
            Alamat: {sekolah.alamat}, Kode Pos: {sekolah.kodePos}
          </p>
          <p className="text-[10px] sm:text-[11px] text-slate-600 m-0 leading-tight">
            Telp: {sekolah.telepon} | Email: {sekolah.email} | NPSN: {sekolah.npsn}
          </p>
        </div>

        {/* Logo Pendidikan Tut Wuri */}
        <div className="w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0 flex items-center justify-center p-1">
          <div className="w-full h-full rounded-full border-2 border-blue-900 bg-blue-50 flex items-center justify-center text-center font-bold text-[10px] text-blue-950 shadow-sm leading-tight p-1">
            TUT WURI<br />HANDAYANI
          </div>
        </div>
      </div>
    </div>
  );
};
