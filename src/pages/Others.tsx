import { Helmet } from "react-helmet-async";
import NavigationToggle from "@/components/NavigationToggle";

const Others = () => {
  return (
    <div className="site-page min-h-screen w-full flex flex-col items-center justify-center relative overflow-hidden">
      <Helmet>
        <title>More — Gaurav Darwesh</title>
        <meta name="description" content="Additional pages and experiments from Gaurav Darwesh's portfolio." />
        <link rel="canonical" href="https://gauravdarwesh.app/others" />
        <meta property="og:title" content="More — Gaurav Darwesh" />
        <meta property="og:description" content="Additional pages and experiments from Gaurav Darwesh's portfolio." />
        <meta property="og:url" content="https://gauravdarwesh.app/others" />
      </Helmet>

      <h1 className="sr-only">More from Gaurav Darwesh</h1>

      {/* Navigation Toggle */}
      <NavigationToggle />
    </div>
  );
};

export default Others;
