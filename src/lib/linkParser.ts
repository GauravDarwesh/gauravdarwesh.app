// src/lib/linkParser.ts

export interface ParsedLink {
  text: string;
  url: string;
  index: number;
}

export interface ParsedResponse {
  parts: Array<{
    type: 'text' | 'link';
    content: string;
    linkData?: ParsedLink;
  }>;
}

export function parseResponseLinks(response: string): ParsedResponse {
  const parts: ParsedResponse['parts'] = [];
  
  // Combined regex to match both markdown links and plain URLs
  const markdownLinkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  const plainUrlRegex = /https?:\/\/[^\s<]+[^\s<.,;:!?'")\]]/g;
  
  let lastIndex = 0;
  const allMatches: Array<{ type: 'markdown' | 'plain'; match: RegExpExecArray; index: number }> = [];
  
  // Find all markdown links
  let match;
  while ((match = markdownLinkRegex.exec(response)) !== null) {
    allMatches.push({ type: 'markdown', match, index: match.index });
  }
  
  // Find all plain URLs
  while ((match = plainUrlRegex.exec(response)) !== null) {
    allMatches.push({ type: 'plain', match, index: match.index });
  }
  
  // Sort matches by position
  allMatches.sort((a, b) => a.index - b.index);
  
  // Remove overlapping matches (markdown takes precedence)
  const filteredMatches = [];
  for (let i = 0; i < allMatches.length; i++) {
    const current = allMatches[i];
    const next = allMatches[i + 1];
    
    if (!next || current.index + current.match[0].length <= next.index) {
      filteredMatches.push(current);
    } else if (current.type === 'markdown') {
      filteredMatches.push(current);
      // Skip the next match if it overlaps
      if (next && next.index < current.index + current.match[0].length) {
        i++;
      }
    }
  }
  
  // Build parts array
  filteredMatches.forEach((item) => {
    const { type, match, index } = item;
    
    // Add text before the link
    if (index > lastIndex) {
      const textBefore = response.slice(lastIndex, index);
      if (textBefore.trim()) {
        parts.push({
          type: 'text',
          content: textBefore
        });
      }
    }
    
    // Add the link
    if (type === 'markdown') {
      parts.push({
        type: 'link',
        content: match[0],
        linkData: {
          text: match[1],
          url: match[2],
          index: index
        }
      });
    } else {
      // Plain URL
      parts.push({
        type: 'link',
        content: match[0],
        linkData: {
          text: match[0],
          url: match[0],
          index: index
        }
      });
    }
    
    lastIndex = index + match[0].length;
  });
  
  // Add remaining text after the last link
  if (lastIndex < response.length) {
    const remainingText = response.slice(lastIndex);
    if (remainingText.trim()) {
      parts.push({
        type: 'text',
        content: remainingText
      });
    }
  }
  
  // If no links found, return the entire response as text
  if (parts.length === 0) {
    parts.push({
      type: 'text',
      content: response
    });
  }
  
  return { parts };
}