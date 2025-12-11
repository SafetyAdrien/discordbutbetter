import React from 'react';

interface MarkdownToken {
  type: 'text' | 'bold' | 'italic' | 'underline' | 'strikethrough' | 'code' | 'spoiler' | 'boldItalic' | 'underlineBold' | 'underlineItalic' | 'underlineBoldItalic';
  content: string | MarkdownToken[];
}

const PATTERNS: { regex: RegExp; type: MarkdownToken['type'] }[] = [
  // Order matters - more specific patterns first
  { regex: /\*\*\*(.+?)\*\*\*/g, type: 'boldItalic' },
  { regex: /___(.+?)___/g, type: 'underlineBoldItalic' },
  { regex: /__\*\*(.+?)\*\*__/g, type: 'underlineBold' },
  { regex: /\*\*__(.+?)__\*\*/g, type: 'underlineBold' },
  { regex: /__\*(.+?)\*__/g, type: 'underlineItalic' },
  { regex: /\*__(.+?)__\*/g, type: 'underlineItalic' },
  { regex: /\*\*(.+?)\*\*/g, type: 'bold' },
  { regex: /__(.+?)__/g, type: 'underline' },
  { regex: /\*(.+?)\*/g, type: 'italic' },
  { regex: /_(.+?)_/g, type: 'italic' },
  { regex: /~~(.+?)~~/g, type: 'strikethrough' },
  { regex: /`([^`]+)`/g, type: 'code' },
  { regex: /\|\|(.+?)\|\|/g, type: 'spoiler' },
];

function tokenize(text: string): MarkdownToken[] {
  const tokens: MarkdownToken[] = [];
  let remaining = text;
  
  while (remaining.length > 0) {
    let earliestMatch: { index: number; length: number; content: string; type: MarkdownToken['type'] } | null = null;
    
    for (const { regex, type } of PATTERNS) {
      regex.lastIndex = 0;
      const match = regex.exec(remaining);
      if (match && (earliestMatch === null || match.index < earliestMatch.index)) {
        earliestMatch = {
          index: match.index,
          length: match[0].length,
          content: match[1],
          type,
        };
      }
    }
    
    if (earliestMatch) {
      // Add text before the match
      if (earliestMatch.index > 0) {
        tokens.push({ type: 'text', content: remaining.slice(0, earliestMatch.index) });
      }
      
      // Add the matched token with recursively parsed content
      const innerTokens = tokenize(earliestMatch.content);
      tokens.push({
        type: earliestMatch.type,
        content: innerTokens.length === 1 && innerTokens[0].type === 'text' 
          ? (innerTokens[0].content as string)
          : innerTokens,
      });
      
      remaining = remaining.slice(earliestMatch.index + earliestMatch.length);
    } else {
      // No more matches, add remaining text
      tokens.push({ type: 'text', content: remaining });
      break;
    }
  }
  
  return tokens;
}

function renderToken(token: MarkdownToken, key: number): React.ReactNode {
  const renderContent = (content: string | MarkdownToken[]): React.ReactNode => {
    if (typeof content === 'string') return content;
    return content.map((t, i) => renderToken(t, i));
  };

  switch (token.type) {
    case 'text':
      return <React.Fragment key={key}>{token.content as string}</React.Fragment>;
    case 'bold':
      return <strong key={key}>{renderContent(token.content)}</strong>;
    case 'italic':
      return <em key={key}>{renderContent(token.content)}</em>;
    case 'underline':
      return <u key={key}>{renderContent(token.content)}</u>;
    case 'boldItalic':
      return <strong key={key}><em>{renderContent(token.content)}</em></strong>;
    case 'underlineBold':
      return <u key={key}><strong>{renderContent(token.content)}</strong></u>;
    case 'underlineItalic':
      return <u key={key}><em>{renderContent(token.content)}</em></u>;
    case 'underlineBoldItalic':
      return <u key={key}><strong><em>{renderContent(token.content)}</em></strong></u>;
    case 'strikethrough':
      return <del key={key} className="text-muted-foreground">{renderContent(token.content)}</del>;
    case 'code':
      return (
        <code key={key} className="px-1.5 py-0.5 bg-muted rounded text-sm font-mono text-primary">
          {token.content as string}
        </code>
      );
    case 'spoiler':
      return (
        <span 
          key={key} 
          className="spoiler"
          onClick={(e) => e.currentTarget.classList.toggle('revealed')}
        >
          {renderContent(token.content)}
        </span>
      );
    default:
      return <React.Fragment key={key}>{renderContent(token.content)}</React.Fragment>;
  }
}

export function parseMarkdown(content: string): React.ReactNode {
  const tokens = tokenize(content);
  return tokens.map((token, index) => renderToken(token, index));
}

export function MarkdownText({ content, className }: { content: string; className?: string }) {
  return <span className={className}>{parseMarkdown(content)}</span>;
}
