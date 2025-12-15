import { useEffect, useRef } from 'react';
import hljs from 'highlight.js/lib/core';
import javascript from 'highlight.js/lib/languages/javascript';
import typescript from 'highlight.js/lib/languages/typescript';
import python from 'highlight.js/lib/languages/python';
import css from 'highlight.js/lib/languages/css';
import json from 'highlight.js/lib/languages/json';
import bash from 'highlight.js/lib/languages/bash';
import sql from 'highlight.js/lib/languages/sql';
import xml from 'highlight.js/lib/languages/xml';

// Register languages
hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('js', javascript);
hljs.registerLanguage('typescript', typescript);
hljs.registerLanguage('ts', typescript);
hljs.registerLanguage('python', python);
hljs.registerLanguage('py', python);
hljs.registerLanguage('css', css);
hljs.registerLanguage('json', json);
hljs.registerLanguage('bash', bash);
hljs.registerLanguage('sh', bash);
hljs.registerLanguage('sql', sql);
hljs.registerLanguage('html', xml);
hljs.registerLanguage('xml', xml);

interface CodeBlockProps {
  code: string;
  language?: string;
}

export function CodeBlock({ code, language }: CodeBlockProps) {
  const codeRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (codeRef.current) {
      codeRef.current.removeAttribute('data-highlighted');
      
      if (language && hljs.getLanguage(language)) {
        hljs.highlightElement(codeRef.current);
      } else if (code.trim()) {
        // Auto-detect language
        hljs.highlightElement(codeRef.current);
      }
    }
  }, [code, language]);

  return (
    <pre className="bg-[#2b2d31] border border-[#1e1f22] rounded-md my-2 overflow-hidden">
      {language && (
        <div className="px-3 py-1.5 text-xs text-[#949BA4] border-b border-[#1e1f22] bg-[#232428]">
          {language}
        </div>
      )}
      <code 
        ref={codeRef}
        className={`block px-3 py-2 text-sm font-mono overflow-x-auto ${language ? `language-${language}` : ''}`}
      >
        {code}
      </code>
    </pre>
  );
}
