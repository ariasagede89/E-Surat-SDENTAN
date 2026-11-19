import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Bold, Italic, Underline, RemoveFormatting } from 'lucide-react';
import {
  editableHtmlToRichValue,
  richValueToEditableHtml,
  stripRichTags,
} from '../utils/richTextUtils';

export interface RichTextFieldProps {
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  rows?: number;
  placeholder?: string;
  required?: boolean;
  className?: string;
  editorClassName?: string;
  accentColor?: 'emerald' | 'teal' | 'sky' | 'indigo';
  disabled?: boolean;
  toolbarRight?: React.ReactNode;
}

const MIN_HEIGHT_BY_ROWS: Record<number, string> = {
  1: 'min-h-[38px]',
  2: 'min-h-[58px]',
  3: 'min-h-[80px]',
  4: 'min-h-[104px]',
  5: 'min-h-[126px]',
  6: 'min-h-[148px]',
  7: 'min-h-[172px]',
};

export const RichTextField: React.FC<RichTextFieldProps> = ({
  value,
  onChange,
  multiline = true,
  rows = 3,
  placeholder = '',
  required = false,
  className = '',
  editorClassName = '',
  accentColor = 'emerald',
  disabled = false,
  toolbarRight,
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const lastValueRef = useRef<string>(value ?? '');
  const isComposingRef = useRef<boolean>(false);

  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const syncFormatStates = useCallback(() => {
    if (typeof document === 'undefined') return;
    const editor = editorRef.current;
    if (!editor) return;
    const sel = document.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    if (!editor.contains(sel.anchorNode)) return;
    try {
      setIsBold(document.queryCommandState('bold'));
      setIsItalic(document.queryCommandState('italic'));
      setIsUnderline(document.queryCommandState('underline'));
    } catch {
      // ignore unsupported queryCommandState
    }
  }, []);

  // Initialize innerHTML on mount and keep synchronized if value changes externally
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const normalizedProp = value ?? '';
    if (normalizedProp !== lastValueRef.current || editor.innerHTML === '') {
      const targetHtml = richValueToEditableHtml(normalizedProp);
      if (editableHtmlToRichValue(editor.innerHTML) !== normalizedProp) {
        editor.innerHTML = targetHtml;
      }
      lastValueRef.current = normalizedProp;
    }
  }, [value]);

  useEffect(() => {
    const handleSelectionChange = () => {
      if (isFocused) {
        syncFormatStates();
      }
    };
    document.addEventListener('selectionchange', handleSelectionChange);
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, [isFocused, syncFormatStates]);

  const emitChange = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;
    let nextVal = editableHtmlToRichValue(editor.innerHTML);
    if (!multiline) {
      nextVal = nextVal.replace(/\r?\n/g, ' ');
    }
    lastValueRef.current = nextVal;
    onChange(nextVal);
  }, [multiline, onChange]);

  const applyFormat = (command: 'bold' | 'italic' | 'underline' | 'removeFormat') => {
    if (disabled) return;
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus();
    try {
      if (command === 'removeFormat') {
        // Also strip bold/italic/underline when clearing format
        if (document.queryCommandState('bold')) document.execCommand('bold', false);
        if (document.queryCommandState('italic')) document.execCommand('italic', false);
        if (document.queryCommandState('underline')) document.execCommand('underline', false);
        document.execCommand('removeFormat', false);
      } else {
        document.execCommand(command, false);
      }
    } catch {
      // ignore
    }
    emitChange();
    syncFormatStates();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!multiline && e.key === 'Enter') {
      e.preventDefault();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && !e.altKey) {
      const k = e.key.toLowerCase();
      if (k === 'b') {
        e.preventDefault();
        applyFormat('bold');
      } else if (k === 'i') {
        e.preventDefault();
        applyFormat('italic');
      } else if (k === 'u') {
        e.preventDefault();
        applyFormat('underline');
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const rawText = e.clipboardData.getData('text/plain') || '';
    const cleaned = multiline ? rawText : rawText.replace(/\r?\n+/g, ' ');
    try {
      document.execCommand('insertText', false, cleaned);
    } catch {
      const editor = editorRef.current;
      if (editor) {
        editor.textContent = (editor.textContent || '') + cleaned;
      }
    }
    emitChange();
  };

  const ringClass =
    accentColor === 'teal'
      ? 'focus-within:ring-teal-600 focus-within:border-teal-600'
      : accentColor === 'sky'
      ? 'focus-within:ring-sky-600 focus-within:border-sky-600'
      : accentColor === 'indigo'
      ? 'focus-within:ring-indigo-600 focus-within:border-indigo-600'
      : 'focus-within:ring-emerald-600 focus-within:border-emerald-600';

  const activeBtnClass =
    accentColor === 'teal'
      ? 'bg-teal-700 text-white border-teal-800 shadow-2xs'
      : accentColor === 'sky'
      ? 'bg-sky-700 text-white border-sky-800 shadow-2xs'
      : accentColor === 'indigo'
      ? 'bg-indigo-700 text-white border-indigo-800 shadow-2xs'
      : 'bg-emerald-700 text-white border-emerald-800 shadow-2xs';

  const minHeightClass = multiline
    ? MIN_HEIGHT_BY_ROWS[rows] || 'min-h-[80px]'
    : 'min-h-[38px]';

  const isEmpty = stripRichTags(value).trim().length === 0;

  return (
    <div
      className={`relative rounded-xl border border-slate-300 bg-white shadow-2xs transition-all focus-within:ring-2 ${ringClass} ${
        disabled ? 'opacity-60 pointer-events-none bg-slate-50' : ''
      } ${className}`}
    >
      {/* Hidden input to keep native HTML5 required form validation functional */}
      {required && (
        <input
          type="text"
          tabIndex={-1}
          aria-hidden="true"
          required
          value={stripRichTags(value).trim()}
          onChange={() => {}}
          className="sr-only pointer-events-none"
        />
      )}

      {/* Compact Rich Text Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-1.5 px-2.5 py-1.5 bg-slate-50/90 border-b border-slate-200 rounded-t-xl select-none">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => applyFormat('bold')}
            title="Tebal / Bold (Ctrl+B)"
            className={`inline-flex items-center justify-center w-6 h-6 rounded border text-xs transition-colors cursor-pointer ${
              isBold
                ? activeBtnClass
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <Bold className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => applyFormat('italic')}
            title="Miring / Italic (Ctrl+I)"
            className={`inline-flex items-center justify-center w-6 h-6 rounded border text-xs transition-colors cursor-pointer ${
              isItalic
                ? activeBtnClass
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <Italic className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => applyFormat('underline')}
            title="Garis Bawah / Underline (Ctrl+U)"
            className={`inline-flex items-center justify-center w-6 h-6 rounded border text-xs transition-colors cursor-pointer ${
              isUnderline
                ? activeBtnClass
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <Underline className="w-3.5 h-3.5" />
          </button>
          <span className="w-px h-4 bg-slate-200 mx-0.5" />
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => applyFormat('removeFormat')}
            title="Hapus Format Teks (Bold / Italic / Underline)"
            className="inline-flex items-center justify-center w-6 h-6 rounded border bg-white text-slate-500 border-slate-200 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
          >
            <RemoveFormatting className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="flex items-center gap-1.5">
          {toolbarRight}
          <span className="text-[10px] text-slate-400 hidden sm:inline">
            Blok kata lalu klik B / I / U
          </span>
        </div>
      </div>

      {/* Editable Content Area */}
      <div className="relative">
        {isEmpty && placeholder && (
          <div className="pointer-events-none absolute inset-0 px-3 py-2 text-xs sm:text-sm text-slate-400 leading-relaxed whitespace-pre-wrap overflow-hidden">
            {placeholder}
          </div>
        )}
        <div
          ref={editorRef}
          contentEditable={!disabled}
          suppressContentEditableWarning
          role="textbox"
          aria-multiline={multiline}
          onFocus={() => {
            setIsFocused(true);
            syncFormatStates();
          }}
          onBlur={() => {
            setIsFocused(false);
            setIsBold(false);
            setIsItalic(false);
            setIsUnderline(false);
            emitChange();
          }}
          onCompositionStart={() => {
            isComposingRef.current = true;
          }}
          onCompositionEnd={() => {
            isComposingRef.current = false;
            emitChange();
          }}
          onInput={() => {
            if (!isComposingRef.current) {
              emitChange();
            }
          }}
          onKeyUp={syncFormatStates}
          onMouseUp={syncFormatStates}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          className={`w-full px-3 py-2 text-xs sm:text-sm text-slate-800 leading-relaxed focus:outline-none break-words ${
            multiline ? 'whitespace-pre-wrap' : 'whitespace-pre-wrap'
          } ${minHeightClass} ${editorClassName}`}
        />
      </div>
    </div>
  );
};
