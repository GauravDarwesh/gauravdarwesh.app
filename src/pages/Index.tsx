const Index = () => {
  return <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden">
      {/* Red gradient background */}
      <div className="absolute inset-0 bg-cover bg-center bg-no-repeat" style={{
      backgroundImage: `url(/lovable-uploads/4746d648-205c-482c-8ba1-3482e03c242f.png)`
    }} />
      
      {/* Main content */}
      <div className="relative z-10 text-center">
        <h1 className="text-4xl lg:text-7xl tracking-wider text-foreground font-extrabold text-center md:text-lg">Gaurav Darwesh</h1>
      </div>
    </div>;
};
export default Index;