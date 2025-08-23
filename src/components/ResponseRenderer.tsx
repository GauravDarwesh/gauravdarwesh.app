// src/components/ResponseRenderer.tsx
import { parseResponseLinks } from '@/lib/linkParser';
import { Button } from '@/components/ui/button';
import { ExternalLink, Instagram } from 'lucide-react';

interface ResponseRendererProps {
  response: string;
  className?: string;
}

const ResponseRenderer = ({ response, className = "" }: ResponseRendererProps) => {
  const parsed = parseResponseLinks(response);

  const getLinkIcon = (url: string) => {
    if (url.includes('instagram.com')) {
      return <Instagram className="w-4 h-4" />;
    }
    return <ExternalLink className="w-4 h-4" />;
  };

  const getLinkVariant = (url: string) => {
    if (url.includes('instagram.com')) {
      return 'secondary';
    }
    return 'outline';
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
          return (
            <Button
              key={index}
              variant={getLinkVariant(url)}
              size="sm"
              className="mx-1 my-1 inline-flex"
              asChild
            >
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
              >
                {getLinkIcon(url)}
                {text}
              </a>
            </Button>
          );
        }

        return null;
      })}
    </div>
  );
};

export default ResponseRenderer;