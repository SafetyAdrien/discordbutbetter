import { toast } from 'sonner';
import { renderToStaticMarkup } from 'react-dom/server';
import { parseMarkdown, getMarkdownContext } from '@/lib/markdown';

export async function copyToClipboard(text: string, label?: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    toast.success('Copié !', { description: label || 'Copié dans le presse-papiers' });
    return true;
  } catch (err) {
    toast.error('Erreur', { description: 'Impossible de copier dans le presse-papiers' });
    return false;
  }
}

/**
 * Copy a message preserving both the raw markdown source (text/plain)
 * and the rendered formatting (text/html). Apps that understand HTML
 * (mail clients, docs, notes) will paste the styled version; plain text
 * targets receive the original markdown so re-pasting in chat keeps it intact.
 */
export async function copyMessageWithFormatting(
  markdown: string,
  label: string = 'Message copié',
): Promise<boolean> {
  const plain = markdown ?? '';
  let html = '';
  try {
    const ctx = getMarkdownContext();
    const node = parseMarkdown(plain, { ...ctx, variant: 'chat' });
    html = renderToStaticMarkup(node as any);
  } catch {
    html = '';
  }

  // Try the rich ClipboardItem path first (desktop + modern mobile browsers)
  try {
    if (
      typeof window !== 'undefined' &&
      typeof (window as any).ClipboardItem !== 'undefined' &&
      navigator.clipboard &&
      'write' in navigator.clipboard &&
      html
    ) {
      const wrappedHtml = `<meta charset="utf-8">${html}`;
      const item = new (window as any).ClipboardItem({
        'text/html': new Blob([wrappedHtml], { type: 'text/html' }),
        'text/plain': new Blob([plain], { type: 'text/plain' }),
      });
      await (navigator.clipboard as any).write([item]);
      toast.success('Copié !', { description: label });
      return true;
    }
  } catch {
    // Fall through to plain text fallback
  }

  // Fallback: plain text only (markdown source preserved)
  try {
    await navigator.clipboard.writeText(plain);
    toast.success('Copié !', { description: label });
    return true;
  } catch {
    toast.error('Erreur', { description: 'Impossible de copier dans le presse-papiers' });
    return false;
  }
}
