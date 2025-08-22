const Index = () => {
  return (
    <div className="min-h-screen w-full bg-background flex items-center justify-center relative overflow-hidden">
      {/* Blue gradient effects */}
      <div className="absolute inset-0 bg-gradient-blue-intense opacity-70" />
      <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-gradient-blue opacity-60 rounded-full blur-3xl" />
      <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-gradient-blue opacity-50 rounded-full blur-3xl" />
      
      {/* Main content */}
      <div className="relative z-10 text-center">
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-light tracking-wider text-foreground">
          GAURAV DARWESH
        </h1>
      </div>
    </div>
  );
};

export default Index;
