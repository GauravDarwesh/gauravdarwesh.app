import { Helmet } from "react-helmet-async";
import SearchBar from "@/components/SearchBar";
import NavigationToggle from "@/components/NavigationToggle";

const Others = () => {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center relative overflow-hidden">
      <Helmet>
        <title>More — Gaurav Darwesh</title>
        <meta name="description" content="Additional pages and experiments from Gaurav Darwesh's portfolio." />
        <link rel="canonical" href="https://gauravdarwesh.app/others" />
        <meta property="og:title" content="More — Gaurav Darwesh" />
        <meta property="og:description" content="Additional pages and experiments from Gaurav Darwesh's portfolio." />
        <meta property="og:url" content="https://gauravdarwesh.app/others" />
      </Helmet>

      <h1 className="sr-only">More from Gaurav Darwesh</h1>

      {/* Background */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat animate-fadeInSlow"
        style={{
          backgroundImage: `url(/lovable-uploads/4746d648-205c-482c-8ba1-3482e03c242f.png)`,
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