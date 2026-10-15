import { useEffect, useRef, useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { loadHljs } from '@/lib/hljs';
import '@/styles/hljs-theme.css';

interface CodeBlockProps {
  code: string;
  language?: string;
  variant?: 'chat' | 'bio';
}

export function CodeBlock({ code, language, variant }: CodeBlockProps) {
  const codeRef = useRef<HTMLElement>(null);
  const [copied, setCopied] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const lang = language?.toLowerCase();

  useEffect(() => {
    const el = codeRef.current;
    if (!el) return;

    let cancelled = false;

    // highlight.js est chargé à la demande (voir lib/hljs.ts) : tant qu'il
    // n'est pas là, le code est affiché tel quel, sans coloration.
    void loadHljs(lang).then((hljs) => {
      if (cancelled || !hljs || !codeRef.current) return;

      const node = codeRef.current;
      node.removeAttribute('data-highlighted');

      if (lang && hljs.getLanguage(lang)) {
        node.className = node.className.replace(/language-\S+/g, '') + ` language-${lang}`;
        hljs.highlightElement(node);
      } else if (code.trim()) {
        hljs.highlightElement(node);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [code, lang]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={`relative w-full max-w-full min-w-0 rounded-[4px] overflow-hidden ${variant === 'chat' ? 'my-0.5' : 'my-1.5'}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        backgroundColor: 'hsl(var(--surface-elevated))',
        boxShadow: variant === 'chat' ? 'inset 0 0 0 1px hsl(225 14% 35%)' : 'inset 0 0 0 1px hsl(var(--border) / 0.4)',
      }}
    >
      <button
        type="button"
        onClick={handleCopy}
        aria-label="Copier le code"
        className={`absolute top-1.5 right-1.5 w-6 h-6 flex items-center justify-center text-muted-foreground hover:text-foreground z-10 transition-opacity ${isHovered ? 'opacity-100' : 'opacity-0'}`}
      >
        {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
      </button>
      <pre
        className="m-0 block w-full max-w-full min-w-0 max-h-[360px] overflow-x-auto overflow-y-auto scrollbar-thin"
        style={{ scrollbarWidth: 'thin', WebkitOverflowScrolling: 'touch' }}
      >
        <code
          ref={codeRef}
          className={`block w-full min-w-0 max-w-full px-3 py-2 pr-10 text-sm font-mono whitespace-pre-wrap break-words [overflow-wrap:anywhere] md:whitespace-pre md:break-normal ${lang ? `language-${lang}` : ''}`}
        >
          {code}
        </code>
      </pre>
    </div>
  );
}