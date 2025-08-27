import SearchBar from "@/components/SearchBar";
import NavigationToggle from "@/components/NavigationToggle";

const Index = () => {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background */}
      <div
        className="fixed inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url(https://zdrcjhohalgzhlbufwcl.supabase.co/storage/v1/object/public/bcg/orange.jpg)`,
          minHeight: '100dvh', // Dynamic viewport height
          minWidth: '100vw',
          backgroundAttachment: 'scroll', // Better mobile performance
        }}
      />
      
      {/* Navigation Toggle */}
      <NavigationToggle />
      
      {/* Search Bar - Fixed Position */}
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
        <SearchBar />
      </div>
    </div>
  );
};