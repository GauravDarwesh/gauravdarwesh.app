import SearchBar from '@/components/SearchBar';

const Index = () => {
  const handleSearch = (response: string) => {
    console.log('Gemini response:', response);
    // Handle the AI response here
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden">
      {/* Red gradient background */}
      <div className="absolute inset-0 bg-cover bg-center bg-no-repeat" style={{
        backgroundImage: `url(/lovable-uploads/4746d648-205c-482c-8ba1-3482e03c242f.png)`
      }} />
      
      {/* Main content */}
      <div className="relative z-10 text-center">
        <h1 className="text-6xl md:text-8xl font-bold text-white mb-8 tracking-wider">
          GAURAV DARWESH
        </h1>
      </div>

      {/* Search Bar */}
      <SearchBar onSearch={handleSearch} />
    </div>
  );
};
export default Index;