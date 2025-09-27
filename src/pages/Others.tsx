import SearchBar from "@/components/SearchBar";
import NavigationToggle from "@/components/NavigationToggle";

const Others = () => {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center relative overflow-hidden">
      {/* Fire Wave Background */}
      <div className="absolute inset-0 bg-fire-waves animate-fadeInSlow">
        <div className="fire-wave fire-wave-1"></div>
        <div className="fire-wave fire-wave-2"></div>
        <div className="fire-wave fire-wave-3"></div>
      </div>

      {/* Navigation Toggle */}
      <NavigationToggle />

      {/* Search Bar */}
      <div className="relative z-10">
        <SearchBar />
      </div>
    </div>
  );
};

export default Others;