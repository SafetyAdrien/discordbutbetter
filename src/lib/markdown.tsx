import React from 'react';
import { CodeBlock } from '@/components/ui/code-block';

interface MarkdownToken {
  type: 'text' | 'bold' | 'italic' | 'underline' | 'strikethrough' | 'code' | 'spoiler' | 'boldItalic' | 'underlineBold' | 'underlineItalic' | 'underlineBoldItalic' | 'link' | 'codeBlock';
  content: string | MarkdownToken[];
  url?: string;
  language?: string;
}

interface BlockToken {
  type: 'paragraph' | 'header1' | 'header2' | 'header3' | 'subtext' | 'blockquote' | 'multiBlockquote' | 'listItem' | 'orderedListItem' | 'codeBlock' | 'empty';
  content: string;
  language?: string;
}

const INLINE_PATTERNS: { regex: RegExp; type: MarkdownToken['type'] }[] = [
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

// Tokenize inline content (bold, italic, etc.)
function tokenizeInline(text: string): MarkdownToken[] {
  const tokens: MarkdownToken[] = [];
  
  // Handle escape characters first - replace \* \_ \~ etc. with placeholders
  let processedText = text.replace(/\\([*_~|`#\->\[\]\\])/g, '___ESC_$1___');
  let remaining = processedText;
  
  while (remaining.length > 0) {
    // Check for masked links first [text](url)
    const linkMatch = /\[([^\]]+)\]\(([^)]+)\)/.exec(remaining);
    
    let earliestMatch: { index: number; length: number; content: string; type: MarkdownToken['type']; url?: string } | null = null;
    
    if (linkMatch) {
      earliestMatch = {
        index: linkMatch.index,
        length: linkMatch[0].length,
        content: linkMatch[1],
        type: 'link',
        url: linkMatch[2],
      };
    }
    
    for (const { regex, type } of INLINE_PATTERNS) {
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
      
      // Add the matched token
      if (earliestMatch.type === 'link') {
        tokens.push({
          type: 'link',
          content: earliestMatch.content,
          url: earliestMatch.url,
        });
      } else if (earliestMatch.type === 'code') {
        // Don't parse inline content for code
        tokens.push({
          type: earliestMatch.type,
          content: earliestMatch.content,
        });
      } else {
        // Recursively parse content for other types
        const innerTokens = tokenizeInline(earliestMatch.content);
        tokens.push({
          type: earliestMatch.type,
          content: innerTokens.length === 1 && innerTokens[0].type === 'text' 
            ? (innerTokens[0].content as string)
            : innerTokens,
        });
      }
      
      remaining = remaining.slice(earliestMatch.index + earliestMatch.length);
    } else {
      // No more matches, add remaining text
      tokens.push({ type: 'text', content: remaining });
      break;
    }
  }
  
  return tokens;
}

// Parse block-level elements (headers, lists, quotes, code blocks)
function parseBlocks(content: string): BlockToken[] {
  const blocks: BlockToken[] = [];
  
  // First, handle multi-line code blocks
  const codeBlockRegex = /```(\w*)\n?([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;
  
  const segments: { type: 'text' | 'codeBlock'; content: string; language?: string }[] = [];
  
  while ((match = codeBlockRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: 'text', content: content.slice(lastIndex, match.index) });
    }
    segments.push({ type: 'codeBlock', content: match[2], language: match[1] || undefined });
    lastIndex = match.index + match[0].length;
  }
  
  if (lastIndex < content.length) {
    segments.push({ type: 'text', content: content.slice(lastIndex) });
  }
  
  // Process each segment
  for (const segment of segments) {
    if (segment.type === 'codeBlock') {
      blocks.push({ type: 'codeBlock', content: segment.content, language: segment.language });
      continue;
    }
    
    // Check for multi-line blockquote (>>> at start)
    if (segment.content.startsWith('>>> ')) {
      blocks.push({ type: 'multiBlockquote', content: segment.content.slice(4) });
      continue;
    }
    
    // Process line by line for other block elements
    const lines = segment.content.split('\n');
    
    for (const line of lines) {
      if (line.trim() === '') {
        blocks.push({ type: 'empty', content: '' });
        continue;
      }
      
      // Header patterns
      if (line.startsWith('### ')) {
        blocks.push({ type: 'header3', content: line.slice(4) });
      } else if (line.startsWith('## ')) {
        blocks.push({ type: 'header2', content: line.slice(3) });
      } else if (line.startsWith('# ')) {
        blocks.push({ type: 'header1', content: line.slice(2) });
      }
      // Subtext pattern
      else if (line.startsWith('-# ')) {
        blocks.push({ type: 'subtext', content: line.slice(3) });
      }
      // Blockquote
      else if (line.startsWith('> ')) {
        blocks.push({ type: 'blockquote', content: line.slice(2) });
      }
      // Unordered list
      else if (/^[-*] /.test(line)) {
        blocks.push({ type: 'listItem', content: line.slice(2) });
      }
      // Ordered list
      else if (/^\d+\. /.test(line)) {
        const match = line.match(/^\d+\. /);
        blocks.push({ type: 'orderedListItem', content: line.slice(match![0].length) });
      }
      // Regular paragraph
      else {
        blocks.push({ type: 'paragraph', content: line });
      }
    }
  }
  
  return blocks;
}

function renderInlineToken(token: MarkdownToken, key: number): React.ReactNode {
  const renderContent = (content: string | MarkdownToken[]): React.ReactNode => {
    if (typeof content === 'string') return content;
    return content.map((t, i) => renderInlineToken(t, i));
  };

  switch (token.type) {
    case 'text':
      // Restore escaped characters
      const textContent = (token.content as string).replace(/___ESC_(.+?)___/g, '$1');
      return <React.Fragment key={key}>{textContent}</React.Fragment>;
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
        <code key={key} className="px-1.5 py-0.5 bg-[#2b2d31] rounded text-sm font-mono text-[#d4d7dc]">
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
    case 'link':
      return (
        <a 
          key={key} 
          href={token.url} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="text-[#00a8fc] hover:underline"
        >
          {token.content as string}
        </a>
      );
    default:
      return <React.Fragment key={key}>{renderContent(token.content)}</React.Fragment>;
  }
}

function renderBlockToken(block: BlockToken, key: number): React.ReactNode {
  const renderInlineContent = (content: string): React.ReactNode => {
    const tokens = tokenizeInline(content);
    return tokens.map((token, i) => renderInlineToken(token, i));
  };

  switch (block.type) {
    case 'header1':
      return (
        <h1 key={key} className="text-2xl font-bold text-white my-2">
          {renderInlineContent(block.content)}
        </h1>
      );
    case 'header2':
      return (
        <h2 key={key} className="text-xl font-bold text-white my-1.5">
          {renderInlineContent(block.content)}
        </h2>
      );
    case 'header3':
      return (
        <h3 key={key} className="text-lg font-semibold text-white my-1">
          {renderInlineContent(block.content)}
        </h3>
      );
    case 'subtext':
      return (
        <p key={key} className="text-[12px] text-[#949BA4] leading-4">
          {renderInlineContent(block.content)}
        </p>
      );
    case 'blockquote':
      return (
        <blockquote key={key} className="border-l-[4px] border-[#4e5058] pl-3 my-1 text-muted-foreground">
          {renderInlineContent(block.content)}
        </blockquote>
      );
    case 'multiBlockquote':
      return (
        <blockquote key={key} className="border-l-[4px] border-[#4e5058] pl-3 my-1 text-muted-foreground whitespace-pre-wrap">
          {renderInlineContent(block.content)}
        </blockquote>
      );
    case 'listItem':
      return (
        <li key={key} className="ml-4 list-disc">
          {renderInlineContent(block.content)}
        </li>
      );
    case 'orderedListItem':
      return (
        <li key={key} className="ml-4 list-decimal">
          {renderInlineContent(block.content)}
        </li>
      );
    case 'codeBlock':
      return <CodeBlock key={key} code={block.content} language={block.language} />;
    case 'empty':
      return <br key={key} />;
    case 'paragraph':
    default:
      return (
        <span key={key}>
          {renderInlineContent(block.content)}
        </span>
      );
  }
}

export function parseMarkdown(content: string): React.ReactNode {
  // Check if content has any block-level elements
  const hasBlockElements = /^(#{1,3} |-# |> |>>> |\d+\. |[-*] |```)/.test(content) || content.includes('```');
  
  if (!hasBlockElements) {
    // Simple inline-only parsing with line break support
    const lines = content.split('\n');
    return lines.map((line, i) => (
      <React.Fragment key={i}>
        {tokenizeInline(line).map((token, j) => renderInlineToken(token, j))}
        {i < lines.length - 1 && <br />}
      </React.Fragment>
    ));
  }
  
  // Full block + inline parsing
  const blocks = parseBlocks(content);
  
  // Group consecutive list items
  const groupedBlocks: React.ReactNode[] = [];
  let currentList: { type: 'ul' | 'ol'; items: BlockToken[] } | null = null;
  
  blocks.forEach((block, index) => {
    if (block.type === 'listItem') {
      if (currentList?.type === 'ul') {
        currentList.items.push(block);
      } else {
        if (currentList) {
          groupedBlocks.push(
            <ol key={`list-${groupedBlocks.length}`} className="my-1">
              {currentList.items.map((item, i) => renderBlockToken(item, i))}
            </ol>
          );
        }
        currentList = { type: 'ul', items: [block] };
      }
    } else if (block.type === 'orderedListItem') {
      if (currentList?.type === 'ol') {
        currentList.items.push(block);
      } else {
        if (currentList) {
          groupedBlocks.push(
            <ul key={`list-${groupedBlocks.length}`} className="my-1">
              {currentList.items.map((item, i) => renderBlockToken(item, i))}
            </ul>
          );
        }
        currentList = { type: 'ol', items: [block] };
      }
    } else {
      if (currentList) {
        const ListTag = currentList.type === 'ul' ? 'ul' : 'ol';
        groupedBlocks.push(
          <ListTag key={`list-${groupedBlocks.length}`} className="my-1">
            {currentList.items.map((item, i) => renderBlockToken(item, i))}
          </ListTag>
        );
        currentList = null;
      }
      groupedBlocks.push(renderBlockToken(block, index));
    }
  });
  
  // Flush remaining list
  if (currentList) {
    const ListTag = currentList.type === 'ul' ? 'ul' : 'ol';
    groupedBlocks.push(
      <ListTag key={`list-${groupedBlocks.length}`} className="my-1">
        {currentList.items.map((item, i) => renderBlockToken(item, i))}
      </ListTag>
    );
  }
  
  return <div className="markdown-content">{groupedBlocks}</div>;
}

export const MarkdownText = React.forwardRef<HTMLSpanElement, { content: string; className?: string }>(
  ({ content, className }, ref) => {
    return <span ref={ref} className={className}>{parseMarkdown(content)}</span>;
  }
);
MarkdownText.displayName = 'MarkdownText';
