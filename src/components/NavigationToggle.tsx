import React from 'react';
import { Button } from '@/components/ui/button';
import { useNavigate, useLocation } from 'react-router-dom';

const NavigationToggle = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const options = [
    { name: 'GDx', path: '/' },
    { name: 'Hobbies', path: '/hobbies' },
    { name: 'Others', path: '/others' },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 px-4 z-50">
      <div className="mx-auto shadow-lg border border-white/20 bg-white/10 backdrop-blur-xl rounded-2xl">
        <div className="p-2 flex items-center gap-2">
          {options.map((option) => (
            <Button
              key={option.name}
              onClick={() => navigate(option.path)}
              variant="ghost"
              size="sm"
              className={`
                px-6 py-2 rounded-xl transition-all duration-300 ease-[cubic-bezier(0.25,1,0.3,1)]
                ${isActive(option.path) 
                  ? 'bg-white/30 text-foreground font-medium shadow-sm' 
                  : 'text-muted-foreground hover:bg-white/20 hover:text-foreground'
                }
              `}
            >
              {option.name}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default NavigationToggle;