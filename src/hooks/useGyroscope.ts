import { useEffect, useState, useCallback, useRef } from 'react';

interface GyroscopeData {
  alpha: number; // Compass direction (0-360)
  beta: number;  // Front-to-back tilt (-180 to 180)
  gamma: number; // Left-to-right tilt (-90 to 90)
  isSupported: boolean;
  hasPermission: boolean;
}

const useGyroscope = () => {
  const [gyroData, setGyroData] = useState<GyroscopeData>({
    alpha: 0,
    beta: 0,
    gamma: 0,
    isSupported: false,
    hasPermission: false,
  });

  const [mousePosition, setMousePosition] = useState({ x: 0.5, y: 0.5 });
  const lastUpdateRef = useRef(0);

  // Handle device orientation with throttling
  const handleOrientation = useCallback((event: DeviceOrientationEvent) => {
    const now = Date.now();
    if (now - lastUpdateRef.current > 16) { // ~60fps
      lastUpdateRef.current = now;
      setGyroData(prev => ({
        ...prev,
        alpha: event.alpha || 0,
        beta: event.beta || 0,
        gamma: event.gamma || 0,
      }));
    }
  }, []);

  // Handle mouse movement with throttling for desktop fallback
  const handleMouseMove = useCallback((event: MouseEvent) => {
    const now = Date.now();
    if (now - lastUpdateRef.current > 16) { // ~60fps
      lastUpdateRef.current = now;
      setMousePosition({
        x: event.clientX / window.innerWidth,
        y: event.clientY / window.innerHeight,
      });
    }
  }, []);

  // Request permission and setup listeners
  useEffect(() => {
    const requestPermission = async () => {
      // Check if DeviceOrientationEvent exists
      if (!window.DeviceOrientationEvent) {
        setGyroData(prev => ({ ...prev, isSupported: false }));
        return;
      }

      setGyroData(prev => ({ ...prev, isSupported: true }));

      // For iOS 13+ devices, request permission
      if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
        try {
          const permission = await (DeviceOrientationEvent as any).requestPermission();
          if (permission === 'granted') {
            setGyroData(prev => ({ ...prev, hasPermission: true }));
            window.addEventListener('deviceorientation', handleOrientation);
          } else {
            setGyroData(prev => ({ ...prev, hasPermission: false }));
          }
        } catch (error) {
          console.warn('Device orientation permission denied:', error);
          setGyroData(prev => ({ ...prev, hasPermission: false }));
        }
      } else {
        // For other devices, assume permission is granted
        setGyroData(prev => ({ ...prev, hasPermission: true }));
        window.addEventListener('deviceorientation', handleOrientation);
      }
    };

    requestPermission();

    // Always add mouse listener for desktop fallback
    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('deviceorientation', handleOrientation);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [handleOrientation, handleMouseMove]);

  // Calculate shimmer properties
  const getShimmerAngle = useCallback(() => {
    if (gyroData.hasPermission && gyroData.isSupported) {
      // Use actual gyroscope data
      const normalizedBeta = ((gyroData.beta + 180) % 360) / 360; // 0-1
      const normalizedGamma = ((gyroData.gamma + 90) % 180) / 180; // 0-1
      return ((normalizedBeta + normalizedGamma) * 180) % 360;
    } else {
      // Fallback to mouse position
      return ((mousePosition.x + mousePosition.y) * 180) % 360;
    }
  }, [gyroData, mousePosition]);

  const getShimmerIntensity = useCallback(() => {
    if (gyroData.hasPermission && gyroData.isSupported) {
      // Calculate movement intensity based on tilt
      const tiltIntensity = Math.abs(gyroData.beta) + Math.abs(gyroData.gamma);
      return Math.min(1, tiltIntensity / 100); // Normalize to 0-1
    } else {
      // Fallback to mouse distance from center
      const centerX = Math.abs(mousePosition.x - 0.5);
      const centerY = Math.abs(mousePosition.y - 0.5);
      return Math.min(1, (centerX + centerY) * 2);
    }
  }, [gyroData, mousePosition]);

  return {
    ...gyroData,
    shimmerAngle: getShimmerAngle(),
    shimmerIntensity: getShimmerIntensity(),
    mousePosition,
  };
};

export default useGyroscope;