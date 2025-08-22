import SearchBar from '@/components/SearchBar';
const Index = () => {
  const handleSearch = (response: string) => {
    console.log('Gemini response:', response);
    // You can display the response in the UI here
    // For now, it will show in the console
  };
  return <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden">
      {/* Red gradient background */}
      <div className="absolute inset-0 bg-cover bg-center bg-no-repeat" style={{
      backgroundImage: `url(/lovable-uploads/4746d648-205c-482c-8ba1-3482e03c242f.png)`
    }} />
      
      {/* Main content */}
      <div className="relative z-10 text-center">
        
      </div>

      {/* Search Bar */}
      <SearchBar onSearch={handleSearch} />
    </div>;
};
export default Index;