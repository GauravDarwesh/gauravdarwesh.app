// src/components/ResponseRenderer.tsx
import { parseResponseLinks } from '@/lib/linkParser';

interface ResponseRendererProps {
  response: string;
  className?: string;
}

const ResponseRenderer = ({ response, className = "" }: ResponseRendererProps) => {
  const parsed = parseResponseLinks(response);

  const getShortenedLinkText = (text: string, url: string) => {
    // If the text is already short and natural, keep it
    if (text.length <= 20 && !text.startsWith('http')) {
      return text;
    }
    
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