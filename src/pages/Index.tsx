import SearchBar from '@/components/SearchBar';
import ResponseRenderer from '@/components/ResponseRenderer';
import { useState } from 'react';

const Index = () => {
  const [response, setResponse] = useState<string>('');
  
  const handleSearch = (response: string) => {
    console.log('Gemini response:', response);
    setResponse(response);
  };
  return <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden">
      {/* Red gradient background */}
      <div className="absolute inset-0 bg-cover bg-center bg-no-repeat" style={{
      backgroundImage: `url(/lovable-uploads/4746d648-205c-482c-8ba1-3482e03c242f.png)`
    }} />
      
      {/* Main content */}
      <div className="relative z-10 text-center max-w-2xl mx-auto px-6">
        {/* Response Display */}
        {response && (
          <div className="mb-8 p-6 bg-card/80 backdrop-blur-lg border border-border/30 rounded-lg shadow-lg">
            <ResponseRenderer 
              response={response} 
              className="text-foreground text-left"
            />
          </div>
        )}
        
        

      {/* Search Bar */}
      <SearchBar onSearch={handleSearch} />
    </div>;
};
export default Index;