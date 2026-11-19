/**
 * Utility helpers for lightweight inline rich text formatting (Bold, Italic, Underline)
 * used in Outgoing Letter (Surat Keluar) inputs, preview, PDF print, and Word export.
 */

export function stripRichTags(input?: string | null): string {
  if (!input) return '';
  return String(input)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?(?:b|strong|i|em|u|span|font|p|div)[^>]*>/gi, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&amp;/gi, '&');
}

function escapeHtmlBracketsOnly(text: string): string {
  return text.replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Converts HTML inside a contentEditable element into a clean, normalized string
 * preserving only <b>, <i>, <u> inline tags and '\n' line breaks.
 */
export function editableHtmlToRichValue(html: string): string {
  if (!html) return '';
  if (typeof document === 'undefined') {
    return html;
  }

  const container = document.createElement('div');
  container.innerHTML = html;

  const isBlockTag = (tag: string) =>
    tag === 'DIV' || tag === 'P' || tag === 'LI' || tag === 'BLOCKQUOTE' || tag === 'H1' || tag === 'H2' || tag === 'H3';

  const walk = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) {
      return escapeHtmlBracketsOnly(node.nodeValue || '');
    }
    if (node.nodeType !== Node.ELEMENT_NODE) {
      return '';
    }

    const el = node as HTMLElement;
    const tag = el.tagName.toUpperCase();

    if (tag === 'BR') {
      return '\n';
    }

    let inner = '';
    const childNodes = Array.from(el.childNodes);
    for (let idx = 0; idx < childNodes.length; idx++) {
      const child = childNodes[idx];
      const childStr = walk(child);
      if (child.nodeType === Node.ELEMENT_NODE && isBlockTag((child as HTMLElement).tagName.toUpperCase())) {
        // Ensure a block child starts on a new line when preceded by content
        if (inner.length > 0 && !inner.endsWith('\n')) {
          inner += '\n';
        }
        // An empty <div><br></div> yields '\n'; avoid doubling trailing newlines inside block
        inner += childStr;
        if (idx < childNodes.length - 1 && !inner.endsWith('\n')) {
          inner += '\n';
        }
      } else {
        inner += childStr;
      }
    }

    // If this block was just <div><br></div>, treat as single newline instead of wrapped formatting
    if (isBlockTag(tag)) {
      return inner;
    }

    const styleAttr = el.style;
    const fontWeight = styleAttr?.fontWeight || '';
    const numericWeight = parseInt(fontWeight, 10);
    const hasBold =
      tag === 'B' ||
      tag === 'STRONG' ||
      fontWeight === 'bold' ||
      fontWeight === 'bolder' ||
      (!Number.isNaN(numericWeight) && numericWeight >= 600);

    const hasItalic =
      tag === 'I' ||
      tag === 'EM' ||
      styleAttr?.fontStyle === 'italic';

    const textDec = `${styleAttr?.textDecorationLine || ''} ${styleAttr?.textDecoration || ''}`.toLowerCase();
    const hasUnderline =
      tag === 'U' ||
      textDec.includes('underline');

    let wrapped = inner;
    if (!wrapped) return '';

    if (hasUnderline) wrapped = `<u>${wrapped}</u>`;
    if (hasItalic) wrapped = `<i>${wrapped}</i>`;
    if (hasBold) wrapped = `<b>${wrapped}</b>`;

    return wrapped;
  };

  let result = walk(container);

  // ContentEditable often appends a single trailing <br> sentinel; remove only empty trailing sentinel if extra
  result = result.replace(/\u200B/g, '');
  if (result === '\n') return '';
  return result;
}

/**
 * Converts a stored rich value ('\n' + <b>/<i>/<u>) into HTML suitable for contentEditable innerHTML.
 */
export function richValueToEditableHtml(value?: string | null): string {
  if (!value) return '';
  return String(value)
    .replace(/\r\n/g, '\n')
    .replace(/\n/g, '<br>');
}

/**
 * Splits rich text by newlines while keeping <b>, <i>, and <u> tags properly closed
 * at the end of each line and reopened at the start of the next line.
 */
export function splitRichTextIntoBalancedLines(value?: string | null): string[] {
  const raw = String(value || '');
  if (!raw.trim()) return [];

  const parts = raw.split(/\r?\n/);
  const openStack: Array<'b' | 'i' | 'u'> = [];
  const tokenRegex = /<\/?(?:b|strong|i|em|u)\b[^>]*>/gi;

  const mapTag = (rawTag: string): 'b' | 'i' | 'u' | null => {
    const clean = rawTag.replace(/[<>/\s].*$/, '').toLowerCase();
    // Extract tag name properly
    const match = rawTag.match(/^<\/?([a-z]+)/i);
    const name = (match ? match[1] : clean).toLowerCase();
    if (name === 'b' || name === 'strong') return 'b';
    if (name === 'i' || name === 'em') return 'i';
    if (name === 'u') return 'u';
    return null;
  };

  return parts.map((line) => {
    const trimmedLine = line.trim();
    const prefix = openStack.map((t) => `<${t}>`).join('');

    let m: RegExpExecArray | null;
    tokenRegex.lastIndex = 0;
    while ((m = tokenRegex.exec(trimmedLine)) !== null) {
      const token = m[0];
      const tag = mapTag(token);
      if (!tag) continue;
      const isClosing = token.startsWith('</');
      if (isClosing) {
        const lastIdx = openStack.lastIndexOf(tag);
        if (lastIdx !== -1) {
          openStack.splice(lastIdx, 1);
        }
      } else {
        openStack.push(tag);
      }
    }

    const suffix = [...openStack].reverse().map((t) => `</${t}>`).join('');
    return `${prefix}${trimmedLine}${suffix}`;
  });
}

export function richTextToInlineHtml(value?: string | null): string {
  const raw = String(value || '');
  if (!raw) return '';
  const lines = splitRichTextIntoBalancedLines(raw);
  return lines.join('<br/>');
}
