// =============================================================================
// Pacific Mail — Formatting & Sanitization Utilities
// Safe date formatting, file size calculations, and DOMPurify sanitization.
// =============================================================================

import DOMPurify from 'dompurify';

/**
 * Format timestamp for mail list rows (Gmail-style relative formatting).
 * - Today: "10:45 AM"
 * - This year: "Oct 23"
 * - Previous year: "23/10/2025"
 */
export function formatMailTimestamp(dateStr?: string | Date | null): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '—';

  const now = new Date();
  const isToday =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();

  if (isToday) {
    return d.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  }

  const isThisYear = d.getFullYear() === now.getFullYear();
  if (isThisYear) {
    return d.toLocaleDateString('en-IN', {
      month: 'short',
      day: 'numeric',
    });
  }

  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/**
 * Format full date and time for message detail view.
 * e.g. "Fri, Oct 23, 2026, 5:30 PM"
 */
export function formatFullMailDate(dateStr?: string | Date | null): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '—';

  return d.toLocaleString('en-IN', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Format file size in human-readable bytes (KB, MB, GB).
 */
export function formatFileSize(bytes?: number | null): string {
  if (!bytes || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const val = (bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1);
  return `${val} ${units[i] || 'B'}`;
}

const SANITIZE_OPTIONS = {
  ALLOWED_TAGS: [
    'a', 'b', 'blockquote', 'br', 'code', 'div', 'em', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'hr', 'i', 'img', 'li', 'ol', 'p', 'pre', 's', 'small', 'span', 'strong', 'sub',
    'sup', 'table', 'tbody', 'td', 'tfoot', 'th', 'thead', 'tr', 'u', 'ul',
  ],
  ALLOWED_ATTR: [
    'href', 'target', 'rel', 'src', 'alt', 'title', 'width', 'height', 'style',
    'class', 'align', 'border', 'cellpadding', 'cellspacing', 'colspan', 'rowspan',
  ],
  ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
  FORBID_TAGS: ['script', 'style', 'iframe', 'frame', 'object', 'embed', 'form', 'input'],
  FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur'],
};

/**
 * DOMPurify HTML email body sanitization.
 * Strips script tags, inline executable handlers (onerror, onload), and javascript: URIs
 * to prevent XSS while allowing styling, links, tables, and standard email markup.
 */
export function sanitizeMailHtml(rawHtml?: string | null): string {
  if (!rawHtml) return '';

  try {
    if (typeof window !== 'undefined') {
      const purifyInstance = (DOMPurify as any)?.sanitize
        ? DOMPurify
        : typeof (DOMPurify as any) === 'function'
        ? (DOMPurify as any)(window)
        : null;

      if (purifyInstance && typeof purifyInstance.sanitize === 'function') {
        return purifyInstance.sanitize(rawHtml, SANITIZE_OPTIONS);
      }
    }
  } catch {
    // fallback below
  }

  // Resilient fallback for non-browser / headless environments
  return rawHtml
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/\son\w+="[^"]*"/gi, '')
    .replace(/\son\w+='[^']*'/gi, '')
    .replace(/javascript:[^"'>]*/gi, '');
}

/**
 * Converts plain text into safe HTML with preserved linebreaks and clickable links.
 */
export function textToSafeHtml(text?: string | null): string {
  if (!text) return '';
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

  // Auto-link URLs safely
  const linked = escaped.replace(
    /(https?:\/\/[^\s<]+)/g,
    '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-[#B5F823] hover:underline">$1</a>'
  );

  return linked.replace(/\n/g, '<br />');
}
