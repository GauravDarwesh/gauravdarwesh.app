import React, { useEffect, useRef } from 'react';
import useGyroscope from '@/hooks/useGyroscope';

interface GyroscopeShimmerProps {
  children: React.ReactNode;
  intensity?: number; // 0-1, multiplier for shimmer intensity
  className?: string;
}

const GyroscopeShimmer: React.FC<GyroscopeShimmerProps> = ({ 
  children, 
  intensity = 1,
  className = "" 
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { shimmerAngle, shimmerIntensity, hasPermission, isSupported } = useGyroscope();

  useEffect(() => {
    if (!containerRef.current) return;

    const element = containerRef.current;
    const adjustedIntensity = Math.min(1, shimmerIntensity * intensity);
    
    // Calculate gradient based on shimmer angle and intensity
    const gradientAngle = shimmerAngle;
    const shimmerOpacity = 0.1 + (adjustedIntensity * 0.3); // 0.1 to 0.4
    const glowOpacity = adjustedIntensity * 0.2; // 0 to 0.2

    // Create dynamic gradient
    const shimmerGradient = `linear-gradient(${gradientAngle}deg, 
      transparent 0%, 
      rgba(255, 255, 255, ${shimmerOpacity}) 45%, 
      rgba(255, 255, 255, ${shimmerOpacity * 1.5}) 50%, 
      rgba(255, 255, 255, ${shimmerOpacity}) 55%, 
      transparent 100%)`;

    const glowShadow = `0 0 ${10 + (adjustedIntensity * 20)}px rgba(255, 255, 255, ${glowOpacity})`;

    // Apply the shimmer effect via CSS custom properties
    element.style.setProperty('--shimmer-gradient', shimmerGradient);
    element.style.setProperty('--glow-shadow', glowShadow);
    element.style.setProperty('--shimmer-opacity', adjustedIntensity.toString());

  }, [shimmerAngle, shimmerIntensity, intensity]);

  return (
    <div 
      ref={containerRef}
      className={`gyroscope-shimmer ${className}`}
      style={{
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {children}
      
      {/* Shimmer overlay */}
      <div 
        className="pointer-events-none absolute inset-0 rounded-[inherit] transition-opacity duration-300"
        style={{
          background: 'var(--shimmer-gradient, linear-gradient(0deg, transparent, rgba(255,255,255,0.1), transparent))',
          boxShadow: 'var(--glow-shadow, 0 0 10px rgba(255,255,255,0.1))',
          opacity: hasPermission || !isSupported ? 'var(--shimmer-opacity, 0.5)' : '0.3',
        }}
      />
      
      {/* Fallback gentle pulse for unsupported devices */}
      {!hasPermission && isSupported && (
        <div 
          className="pointer-events-none absolute inset-0 rounded-[inherit] animate-pulse"
          style={{
            background: 'linear-gradient(45deg, transparent, rgba(255,255,255,0.05), transparent)',
            animationDuration: '3s',
          }}
        />
      )}
    </div>
  );
};

export default GyroscopeShimmer;