import React from "react";
import NavigationToggle from "@/components/NavigationToggle";

const Visuals = () => {
  return (
    <div className="min-h-screen w-full bg-background text-foreground">
      {/* Navigation Toggle */}
      <NavigationToggle />
      
      {/* Main Content */}
      <div className="container mx-auto px-4 py-20">
        <header className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Visuals</h1>
          <p className="text-lg text-muted-foreground">
            A collection of visual content and creative works
          </p>
        </header>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-card rounded-lg p-6 border">
            <h3 className="text-xl font-semibold mb-2">Gallery</h3>
            <p className="text-muted-foreground">
              Visual galleries and image collections
            </p>
          </div>
          
          <div className="bg-card rounded-lg p-6 border">
            <h3 className="text-xl font-semibold mb-2">Artwork</h3>
            <p className="text-muted-foreground">
              Digital art and creative designs
            </p>
          </div>
          
          <div className="bg-card rounded-lg p-6 border">
            <h3 className="text-xl font-semibold mb-2">Photography</h3>
            <p className="text-muted-foreground">
              Photo collections and visual stories
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Visuals;