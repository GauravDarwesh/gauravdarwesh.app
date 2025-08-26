import SearchBar from "@/components/SearchBar";
import NavigationToggle from "@/components/NavigationToggle";
import ArrowLoop from "@/components/ArrowLoop";

const Index = () => {
  // Random arrow positions (could be more dynamic later)
  const arrows = [
    { x: 100, y: 300, loops: 2, direction: "right" },
    { x: 400, y: 500, loops: 3, direction: "left" },
  ];

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background */}
      <div
        className="fixed inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url(https://zdrcjhohalgzhlbufwcl.supabase.co/storage/v1/object/public/bcg/orange.jpg)`,
        }}
      />

      {/* Navigation Toggle */}
      <NavigationToggle />

      {/* Decorative Arrows */}
      {arrows.map((a, i) => (
        <ArrowLoop key={i} {...a} />
      ))}

      {/* Search Bar */}
      <div className="relative z-10">
        <SearchBar />
      </div>
    </div>
  );
};

export default Index;
