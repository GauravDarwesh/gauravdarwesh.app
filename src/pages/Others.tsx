import SearchBar from "@/components/SearchBar";
import NavigationToggle from "@/components/NavigationToggle";

const Others = () => {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center relative overflow-hidden" style={{ overscrollBehavior: 'none' }}>
      {/* Background */}
      <div
        className="absolute bg-cover bg-center bg-no-repeat animate-fadeInSlow"
        style={{
          backgroundImage: `url(/lovable-uploads/4746d648-205c-482c-8ba1-3482e03c242f.png)`,
          top: '-20%',
          bottom: '-20%',
          left: '-10%',
          right: '-10%',
          minWidth: '120%',
          minHeight: '140%'
        }}
      />

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