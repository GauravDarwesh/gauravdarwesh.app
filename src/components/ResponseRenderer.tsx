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

  const getShortenedLinkText = (text: string, url: string) => {
    // If the text is a natural description (not a URL) and reasonably short, keep it
    if (!text.startsWith('http') && text.length <= 50) {
      return text;
    }

    // Only shorten if it's actually a long URL or very long text
    if (text.startsWith('http') || text.length > 50) {
      // For social media platforms, return platform name
      if (url.includes('instagram.com')) {
        return 'Instagram';
      }
      if (url.includes('twitter.com') || url.includes('x.com')) {
        return 'Twitter';
      }
      if (url.includes('linkedin.com')) {
        return 'LinkedIn';
      }
      if (url.includes('facebook.com')) {
        return 'Facebook';
      }
      if (url.includes('youtube.com')) {
        return 'YouTube';
      }

      // For other URLs, try to extract domain or use first few words
      try {
        const domain = new URL(url).hostname.replace('www.', '');
        return domain.split('.')[0];
      } catch {
        // Fallback: truncate text
        return text.length > 15 ? text.substring(0, 15) + '...' : text;
      }
    }

    // Default: keep original text
    return text;
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
            <span key={index} className="whitespace-pre-wrap">
              {part.content}
            </span>
          );
        }

        if (part.type === 'link' && part.linkData) {
          const { text, url } = part.linkData;
          const shortenedText = getShortenedLinkText(text, url);

          return (
            <a
              key={index}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:text-primary/80 underline decoration-primary/50 hover:decoration-primary transition-colors mx-0.5"
              onClick={e => handleLinkClick(url, e)}
            >
              {shortenedText}
            </a>
          );
        }

        return null;
      })}
    </div>
  );
};

export default ResponseRenderer;
