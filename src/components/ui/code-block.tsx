import { useEffect, useRef, useState } from 'react';
import { Copy, Check } from 'lucide-react';
import hljs from 'highlight.js/lib/core';
import javascript from 'highlight.js/lib/languages/javascript';
import typescript from 'highlight.js/lib/languages/typescript';
import python from 'highlight.js/lib/languages/python';
import css from 'highlight.js/lib/languages/css';
import json from 'highlight.js/lib/languages/json';
import bash from 'highlight.js/lib/languages/bash';
import sql from 'highlight.js/lib/languages/sql';
import xml from 'highlight.js/lib/languages/xml';
import go from 'highlight.js/lib/languages/go';
import rust from 'highlight.js/lib/languages/rust';
import cpp from 'highlight.js/lib/languages/cpp';
import c from 'highlight.js/lib/languages/c';
import csharp from 'highlight.js/lib/languages/csharp';
import java from 'highlight.js/lib/languages/java';
import php from 'highlight.js/lib/languages/php';
import ruby from 'highlight.js/lib/languages/ruby';
import kotlin from 'highlight.js/lib/languages/kotlin';
import swift from 'highlight.js/lib/languages/swift';
import yaml from 'highlight.js/lib/languages/yaml';
import 'highlight.js/styles/github-dark.css';

// Register languages
hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('js', javascript);
hljs.registerLanguage('jsx', javascript);
hljs.registerLanguage('typescript', typescript);
hljs.registerLanguage('ts', typescript);
hljs.registerLanguage('tsx', typescript);
hljs.registerLanguage('python', python);
hljs.registerLanguage('py', python);
hljs.registerLanguage('css', css);
hljs.registerLanguage('json', json);
hljs.registerLanguage('bash', bash);
hljs.registerLanguage('sh', bash);
hljs.registerLanguage('shell', bash);
hljs.registerLanguage('sql', sql);
hljs.registerLanguage('html', xml);
hljs.registerLanguage('xml', xml);
hljs.registerLanguage('go', go);
hljs.registerLanguage('golang', go);
hljs.registerLanguage('rust', rust);
hljs.registerLanguage('rs', rust);
hljs.registerLanguage('cpp', cpp);
hljs.registerLanguage('c++', cpp);
hljs.registerLanguage('cxx', cpp);
hljs.registerLanguage('c', c);
hljs.registerLanguage('csharp', csharp);
hljs.registerLanguage('cs', csharp);
hljs.registerLanguage('c#', csharp);
hljs.registerLanguage('java', java);
hljs.registerLanguage('php', php);
hljs.registerLanguage('ruby', ruby);
hljs.registerLanguage('rb', ruby);
hljs.registerLanguage('kotlin', kotlin);
hljs.registerLanguage('kt', kotlin);
hljs.registerLanguage('swift', swift);
hljs.registerLanguage('yaml', yaml);
hljs.registerLanguage('yml', yaml);

interface CodeBlockProps {
  code: string;
  language?: string;
  variant?: 'chat' | 'bio';
}

export function CodeBlock({ code, language, variant }: CodeBlockProps) {
  const codeRef = useRef<HTMLElement>(null);
  const [copied, setCopied] = useState(false);

  const lang = language?.toLowerCase();

  useEffect(() => {
    if (codeRef.current) {
      codeRef.current.removeAttribute('data-highlighted');

      if (lang && hljs.getLanguage(lang)) {
        codeRef.current.className = codeRef.current.className.replace(/language-\S+/g, '') + ` language-${lang}`;
        hljs.highlightElement(codeRef.current);
      } else if (code.trim()) {
        hljs.highlightElement(codeRef.current);
      }
    }
  }, [code, lang]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="group relative my-2 rounded-[4px] overflow-hidden"
      style={{
        backgroundColor: 'hsl(var(--surface-elevated))',
        boxShadow: 'inset 0 0 0 1px hsl(var(--border) / 0.4)',
      }}
    >
      <button
        type="button"
        onClick={handleCopy}
        aria-label="Copier le code"
        className="absolute top-1.5 right-1.5 w-6 h-6 flex items-center justify-center rounded-[3px] bg-background/60 text-muted-foreground hover:text-foreground z-10"
      >
        {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
      </button>
      <pre className="m-0 max-h-[360px] overflow-auto">
        <code
          ref={codeRef}
          className={`block px-3 py-2 pr-10 text-sm font-mono whitespace-pre ${lang ? `language-${lang}` : ''}`}
        >
          {code}
        </code>
      </pre>
    </div>
  );
}

