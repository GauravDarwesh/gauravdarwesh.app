import React, { useState, useEffect, useRef } from "react";
import NavigationToggle from "@/components/NavigationToggle";
import { Camera, Code, Gamepad2, Music, Plane, Coffee, Book, Zap, Star, Play, Pause } from "lucide-react";

const hobbies = [
  {
    id: 1,
    title: "Photography",
    icon: Camera,
    description: "Capturing moments through the lens, specializing in street and landscape photography.",
    skillLevel: 85,
    images: [
      "https://zdrcjhohalgzhlbufwcl.supabase.co/storage/v1/object/public/JPN-2024/DSC_1497.jpg",
      "https://zdrcjhohalgzhlbufwcl.supabase.co/storage/v1/object/public/JPN-2024/DSC_1554.jpg",
      "https://zdrcjhohalgzhlbufwcl.supabase.co/storage/v1/object/public/JPN-2024/DSC_2138.jpg",
    ],
    experiences: ["Shot in 15+ cities", "Featured in local exhibitions", "500+ Instagram followers"],
    color: "from-purple-500 to-pink-500"
  },
  {
    id: 2,
    title: "Coding Projects",
    icon: Code,
    description: "Building innovative solutions and exploring new technologies in AI and web development.",
    skillLevel: 90,
    images: [
      "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=500",
      "https://images.unsplash.com/photo-1555949963-aa79dcee981c?w=500",
    ],
    experiences: ["10+ personal projects", "Open source contributions", "Hackathon winner"],
    color: "from-blue-500 to-cyan-500"
  },
  {
    id: 3,
    title: "Gaming",
    icon: Gamepad2,
    description: "Passionate about strategy games and competitive gaming with friends.",
    skillLevel: 75,
    images: [
      "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=500",
      "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=500",
    ],
    experiences: ["League rank: Diamond", "Tournament participant", "Gaming setup enthusiast"],
    color: "from-green-500 to-emerald-500"
  },
  {
    id: 4,
    title: "Music Production",
    icon: Music,
    description: "Creating beats and melodies, experimenting with electronic and ambient music.",
    skillLevel: 70,
    images: [
      "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=500",
      "https://images.unsplash.com/photo-1571974599782-87624638275c?w=500",
    ],
    experiences: ["50+ original tracks", "Ableton Live user", "Sound design enthusiast"],
    color: "from-orange-500 to-red-500"
  },
  {
    id: 5,
    title: "Travel",
    icon: Plane,
    description: "Exploring different cultures and landscapes around the world.",
    skillLevel: 80,
    images: [
      "https://zdrcjhohalgzhlbufwcl.supabase.co/storage/v1/object/public/JPN-2024/DSC_2622.jpg",
      "https://zdrcjhohalgzhlbufwcl.supabase.co/storage/v1/object/public/JPN-2024/IMG_2370.jpg",
    ],
    experiences: ["12 countries visited", "Solo traveler", "Cultural photography"],
    color: "from-indigo-500 to-purple-500"
  },
  {
    id: 6,
    title: "Coffee Art",
    icon: Coffee,
    description: "Perfecting latte art and exploring different brewing methods.",
    skillLevel: 65,
    images: [
      "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=500",
      "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=500",
    ],
    experiences: ["Home barista", "Latte art patterns", "Bean enthusiast"],
    color: "from-amber-600 to-orange-600"
  }
];

const InteractiveHobbies = () => {
  const [selectedHobby, setSelectedHobby] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [visibleCards, setVisibleCards] = useState<number[]>([]);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const cardId = parseInt((entry.target as HTMLElement).dataset.cardId || '0');
            setVisibleCards(prev => [...new Set([...prev, cardId])]);
          }
        });
      },
      { threshold: 0.1 }
    );

    observerRef.current = observer;
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const cards = document.querySelectorAll('.hobby-card');
    cards.forEach(card => {
      if (observerRef.current) {
        observerRef.current.observe(card);
      }
    });
  }, []);

  const SkillBar = ({ skill, level }: { skill: string; level: number }) => {
    const [animatedLevel, setAnimatedLevel] = useState(0);

    useEffect(() => {
      const timer = setTimeout(() => {
        setAnimatedLevel(level);
      }, 500);
      return () => clearTimeout(timer);
    }, [level]);

    return (
      <div className="mb-4">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-muted-foreground">{skill}</span>
          <span className="text-primary">{level}%</span>
        </div>
        <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-1000 ease-out"
            style={{ width: `${animatedLevel}%` }}
          />
        </div>
      </div>
    );
  };

  const HobbyCard = ({ hobby, index }: { hobby: typeof hobbies[0]; index: number }) => {
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [isHovered, setIsHovered] = useState(false);
    const isVisible = visibleCards.includes(hobby.id);

    useEffect(() => {
      if (isHovered && hobby.images.length > 1) {
        const interval = setInterval(() => {
          setCurrentImageIndex(prev => (prev + 1) % hobby.images.length);
        }, 2000);
        return () => clearInterval(interval);
      }
    }, [isHovered, hobby.images.length]);

    return (
      <div
        data-card-id={hobby.id}
        className={`hobby-card group relative backdrop-blur-xl bg-card/40 border border-border/50 rounded-2xl shadow-xl overflow-hidden cursor-pointer transform transition-all duration-700 hover:scale-105 hover:shadow-2xl ${
          isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
        }`}
        style={{ transitionDelay: `${index * 150}ms` }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={() => setSelectedHobby(selectedHobby === hobby.id ? null : hobby.id)}
      >
        <div className="relative h-48 overflow-hidden">
          <div 
            className="w-full h-full bg-cover bg-center transition-all duration-500"
            style={{ 
              backgroundImage: `url(${hobby.images[currentImageIndex]})`,
              filter: isHovered ? 'brightness(0.7)' : 'brightness(0.5)'
            }}
          />
          <div className={`absolute inset-0 bg-gradient-to-t ${hobby.color} opacity-60`} />
          
          <div className="absolute inset-0 flex items-center justify-center">
            <hobby.icon 
              size={48} 
              className={`text-white transition-all duration-300 ${
                isHovered ? 'scale-110 rotate-6' : 'scale-100'
              }`} 
            />
          </div>

          <div className="absolute top-4 right-4">
            <div className="flex items-center space-x-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  size={12}
                  className={`${
                    i < Math.floor(hobby.skillLevel / 20) 
                      ? 'text-yellow-400 fill-current' 
                      : 'text-white/40'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="p-6">
          <h3 className="text-xl font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
            {hobby.title}
          </h3>
          <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
            {hobby.description}
          </p>

          <SkillBar skill="Proficiency" level={hobby.skillLevel} />

          <div className={`overflow-hidden transition-all duration-500 ${
            selectedHobby === hobby.id ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
          }`}>
            <div className="pt-4 border-t border-border/20">
              <h4 className="font-semibold text-sm text-foreground mb-2">Achievements</h4>
              <ul className="space-y-1">
                {hobby.experiences.map((exp, i) => (
                  <li key={i} className="text-xs text-muted-foreground flex items-center">
                    <Zap size={10} className="mr-2 text-primary" />
                    {exp}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen w-full relative overflow-hidden bg-background">
      {/* Animated Background */}
      <div className="fixed inset-0">
        <div className="wave wave1" />
        <div className="wave wave2" />
        <div className="absolute inset-0 bg-background/80" />
      </div>

      <NavigationToggle />

      <div className="relative z-10 w-full px-4 sm:px-6 lg:px-8 pt-20 pb-16">
        {/* Header */}
        <div className="text-center mb-16 animate-slowFadeIn">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent mb-4">
            My Hobbies & Passions
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
            Exploring creativity, technology, and adventure through diverse interests and experiences.
          </p>
          
          <div className="flex items-center justify-center space-x-4">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="flex items-center space-x-2 px-4 py-2 bg-primary/10 border border-primary/20 rounded-full hover:bg-primary/20 transition-all"
            >
              {isPlaying ? <Pause size={16} /> : <Play size={16} />}
              <span className="text-sm">{isPlaying ? 'Pause' : 'Play'} Showcase</span>
            </button>
            <div className="text-sm text-muted-foreground">
              {visibleCards.length} / {hobbies.length} hobbies unlocked
            </div>
          </div>
        </div>

        {/* Hobbies Grid */}
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {hobbies.map((hobby, index) => (
              <HobbyCard key={hobby.id} hobby={hobby} index={index} />
            ))}
          </div>
        </div>

        {/* Interactive Stats */}
        <div className="max-w-4xl mx-auto mt-16 p-8 backdrop-blur-xl bg-card/40 border border-border/50 rounded-2xl">
          <h2 className="text-2xl font-bold text-center mb-8">Hobby Statistics</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 text-center">
            <div className="space-y-2">
              <div className="text-3xl font-bold text-primary animate-pulse">
                {hobbies.length}
              </div>
              <div className="text-sm text-muted-foreground">Active Hobbies</div>
            </div>
            <div className="space-y-2">
              <div className="text-3xl font-bold text-accent">
                {Math.round(hobbies.reduce((acc, hobby) => acc + hobby.skillLevel, 0) / hobbies.length)}%
              </div>
              <div className="text-sm text-muted-foreground">Average Skill Level</div>
            </div>
            <div className="space-y-2">
              <div className="text-3xl font-bold text-primary">
                {hobbies.reduce((acc, hobby) => acc + hobby.experiences.length, 0)}
              </div>
              <div className="text-sm text-muted-foreground">Total Achievements</div>
            </div>
          </div>
        </div>

        {/* Reading Section */}
        <div className="max-w-4xl mx-auto mt-16 p-8 backdrop-blur-xl bg-card/40 border border-border/50 rounded-2xl">
          <div className="flex items-center space-x-3 mb-6">
            <Book size={24} className="text-primary" />
            <h2 className="text-2xl font-bold">Current Reading</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-4 bg-muted/20 rounded-lg border border-border/20">
              <h3 className="font-semibold mb-2">The Pragmatic Programmer</h3>
              <div className="w-full bg-muted/40 rounded-full h-2 mb-2">
                <div className="w-3/4 h-full bg-primary rounded-full" />
              </div>
              <p className="text-xs text-muted-foreground">75% complete</p>
            </div>
            <div className="p-4 bg-muted/20 rounded-lg border border-border/20">
              <h3 className="font-semibold mb-2">Atomic Habits</h3>
              <div className="w-full bg-muted/40 rounded-full h-2 mb-2">
                <div className="w-1/2 h-full bg-accent rounded-full" />
              </div>
              <p className="text-xs text-muted-foreground">50% complete</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InteractiveHobbies;