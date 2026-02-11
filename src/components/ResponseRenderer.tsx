// src/components/ResponseRenderer.tsx
import { parseResponseLinks } from '@/lib/linkParser';

interface ResponseRendererProps {
  response: string;
  className?: string;
}

// Utility to detect Safari (excluding Chrome/Android)
const isSafari = typeof navigator !== 'undefined'
  && /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

const ResponseRenderer = ({ response, className = "" }: ResponseRendererProps) => {
  const parsed = parseResponseLinks(response);

  // Convert markdown formatting in text
  const formatText = (text: string) => {
    let formatted = text;
    
    // Bold: **text** or __text__
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    formatted = formatted.replace(/__(.*?)__/g, '<strong>$1</strong>');
    
    // Italic: *text* or _text_ (but not within URLs or already processed)
    formatted = formatted.replace(/(?<!\*)\*(?!\*)([^\*]+)\*(?!\*)/g, '<em>$1</em>');
    formatted = formatted.replace(/(?<!_)_(?!_)([^_]+)_(?!_)/g, '<em>$1</em>');
    
    // Inline code: `code`
    formatted = formatted.replace(/`([^`]+)`/g, '<code class="inline-code bg-white/5 px-1 py-0.5 rounded text-sm font-mono">$1</code>');
    
    return formatted;
  };

  // Handler for Safari warning on problematic links
  const handleLinkClick = (url: string, e: React.MouseEvent<HTMLAnchorElement>) => {
    if (
      isSafari &&
      (url.includes('instagram.com') || url.includes('facebook.com') || url.includes('twitter.com') || url.includes('linkedin.com'))
    ) {
      // Show warning dialog
      alert(
        'Safari may block this link due to site security settings. ' +
        'If the page does not open, try using Chrome or Firefox.'
      );
    }
    // Allow browser to handle navigation
  };

  return (
    <div className={className}>
      {parsed.parts.map((part, index) => {
        if (part.type === 'text') {
          return (
            <span 
              key={index} 
              className="whitespace-pre-wrap"
              dangerouslySetInnerHTML={{ __html: formatText(part.content) }}
            />
          );
        }

        if (part.type === 'link' && part.linkData) {
          const { url } = part.linkData;

          return (
            <a
              key={index}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:text-primary/80 underline decoration-primary/50 hover:decoration-primary transition-colors mx-0.5"
              onClick={e => handleLinkClick(url, e)}
            >
              link
            </a>
          );
        }

        return null;
      })}
    </div>
  );
};

export default ResponseRenderer;
