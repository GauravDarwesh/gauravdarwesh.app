import SearchBar from "@/components/SearchBar";
import NavigationToggle from "@/components/NavigationToggle";
import { useBrowserCompatibility, getSafeViewportClass } from "@/hooks/use-browser-compatibility";

const Others = () => {
  const browserInfo = useBrowserCompatibility();

  return (
    <div className={`${getSafeViewportClass(browserInfo)} w-full flex flex-col items-center justify-center relative overflow-hidden safe-area-inset gpu-accelerated`}>
      {/* Background */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat animate-fadeInSlow gpu-accelerated"
        style={{
          backgroundImage: `url(/lovable-uploads/4746d648-205c-482c-8ba1-3482e03c242f.png)`,
        }}
      />

      {/* Navigation Toggle */}
      <div className="safe-area-top">
        <NavigationToggle />
      </div>

      {/* Search Bar */}
      <div className="relative z-10 safe-area-bottom">
        <SearchBar />
      </div>
    </div>
  );
};

export default Others;