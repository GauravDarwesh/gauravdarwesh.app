import SearchBar from '@/components/SearchBar';
import { useState } from 'react';

const Index = () => {
  return (
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden">
      {/* Background */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(/lovable-uploads/4746d648-205c-482c-8ba1-3482e03c242f.png)` }}
      />

      {/* Search Bar */}
      <SearchBar />
    </div>
  );
};
export default Index;
