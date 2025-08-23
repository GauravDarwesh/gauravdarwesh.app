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
  // Regex to match markdown-style links: [text](url)
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  const parts: ParsedResponse['parts'] = [];
  let lastIndex = 0;
  let match;

  while ((match = linkRegex.exec(response)) !== null) {
    // Add text before the link
    if (match.index > lastIndex) {
      const textBefore = response.slice(lastIndex, match.index);
      if (textBefore.trim()) {
        parts.push({
          type: 'text',
          content: textBefore
        });
      }
    }

    // Add the link
    parts.push({
      type: 'link',
      content: match[0], // The full match
      linkData: {
        text: match[1],
        url: match[2],
        index: match.index
      }
    });

    lastIndex = linkRegex.lastIndex;
  }

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