import SearchBar from "@/components/SearchBar";
import NavigationToggle from "@/components/NavigationToggle";

const Index = () => {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background */}
      <div
        className="fixed inset-0 bg-cover bg-center bg-no-repeat animate-fadeInSoft"
        style={{
          backgroundImage: `url(https://zdrcjhohalgzhlbufwcl.supabase.co/storage/v1/object/public/bcg/orange.jpg)`,
        }}
      />

      {/* Navigation Toggle (staggered) */}
      <div className="animate-fadeInSoft-300 z-10">
        <NavigationToggle />
      </div>

      {/* Search Bar (staggered a bit more) */}
      <div className="fixed z-10 animate-fadeInSoft-600">
        <SearchBar />
      </div>
    </div>
  );
};

export default Index;
