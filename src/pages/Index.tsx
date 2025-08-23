import SearchBar from '@/components/SearchBar';
import ResponseRenderer from '@/components/ResponseRenderer';
import { useState } from 'react';

const Index = () => {
  const [response, setResponse] = useState<string>('');
  
  const handleSearch = (response: string) => {
    console.log('Gemini response:', response);
    setResponse(response);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden">
      {/* Red gradient background */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url(/lovable-uploads/4746d648-205c-482c-8ba1-3482e03c242f.png)`,
        }}
      />

      {/* Main content */}
      <div className="relative z-10 text-center max-w-2xl mx-auto px-6 flex flex-col items-center">
        {/* Robotic Center Text */}
        <h1
          className="mb-12 text-6xl font-mono font-extrabold tracking-widest text-foreground drop-shadow-lg select-none"
          style={{
            letterSpacing: '0.2em',
            textShadow: '0 2px 12px rgba(0,0,0,0.25), 0 0px 1px #00f2ff',
          }}
        >
          GD-AI<span className="text-primary">*</span>
        </h1>

        {/* Response Display */}
        {response && (
          <div className="mb-8 p-6 bg-card/80 backdrop-blur-lg border border-border/30 rounded-lg shadow-lg w-full">
            <ResponseRenderer response={response} className="text-foreground text-left" />
          </div>
        )}
      </div>

      {/* Search Bar */}
      <SearchBar onSearch={handleSearch} />
    </div>
  );
};
export default Index;
