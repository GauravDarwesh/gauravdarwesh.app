import SearchBar from "@/components/SearchBar";
import NavigationToggle from "@/components/NavigationToggle";

const Index = () => {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center relative overflow-hidden">
      {/* Grainy Gradient Background */}
      <div className="absolute inset-0 bg-grainy-gradient animate-fadeInSlow" />

      {/* Navigation Toggle */}
      <NavigationToggle />

      {/* Search Bar */}
      <div className="relative z-10">
        <SearchBar />
      </div>
    </div>
  );
};

export default Index;