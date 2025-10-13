import { useEffect, useState } from "react";
import sudhamritLogo from "@assets/111_1750417572953.png";

interface SplashScreenProps {
  onComplete?: () => void;
  duration?: number; // Duration in milliseconds
}

export default function SplashScreen({ onComplete, duration = 3000 }: SplashScreenProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [logoLoaded, setLogoLoaded] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setFadeOut(true);
      setTimeout(() => {
        setIsVisible(false);
        onComplete?.();
      }, 500); // Wait for fade out animation
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onComplete]);

  if (!isVisible) {
    return null;
  }

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-gray-900 via-blue-900 to-indigo-900 overflow-hidden transition-opacity duration-500 ${fadeOut ? 'opacity-0' : 'opacity-100'}`}>
      {/* Professional animated background */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Corporate geometric patterns */}
        <div className="absolute top-0 left-0 w-full h-full opacity-20">
          {/* Hexagonal pattern */}
          <div className="absolute top-1/4 left-1/4 w-64 h-64 border border-blue-300/30 transform rotate-45 animate-spin-slow"></div>
          <div className="absolute bottom-1/4 right-1/4 w-48 h-48 border-2 border-indigo-300/40 transform -rotate-45 animate-spin-reverse"></div>
          
          {/* Professional lines */}
          <div className="absolute top-0 left-1/3 w-px h-full bg-gradient-to-b from-transparent via-blue-400/30 to-transparent"></div>
          <div className="absolute top-0 right-1/3 w-px h-full bg-gradient-to-b from-transparent via-indigo-400/30 to-transparent"></div>
          <div className="absolute top-1/3 left-0 h-px w-full bg-gradient-to-r from-transparent via-blue-400/30 to-transparent"></div>
          <div className="absolute bottom-1/3 left-0 h-px w-full bg-gradient-to-r from-transparent via-indigo-400/30 to-transparent"></div>
        </div>

        {/* Floating corporate elements */}
        <div className="absolute top-16 left-16 w-6 h-6 border-2 border-blue-400/50 transform rotate-45 animate-pulse"></div>
        <div className="absolute top-32 right-20 w-4 h-4 bg-indigo-400/40 rounded-full animate-ping delay-300"></div>
        <div className="absolute bottom-24 left-24 w-8 h-8 border border-blue-300/60 rounded-full animate-pulse delay-500"></div>
        <div className="absolute bottom-16 right-16 w-5 h-5 bg-gradient-to-br from-blue-400/50 to-indigo-400/50 transform rotate-45 animate-bounce delay-700"></div>
        
        {/* Professional particles */}
        <div className="absolute top-1/5 left-1/5 w-2 h-2 bg-blue-400/60 rounded-full animate-ping delay-100"></div>
        <div className="absolute top-2/3 right-1/5 w-3 h-3 bg-indigo-400/50 rounded-full animate-ping delay-400"></div>
        <div className="absolute bottom-1/5 left-2/3 w-2 h-2 bg-blue-300/70 rounded-full animate-ping delay-600"></div>
      </div>

      {/* Corporate grid overlay */}
      <div className="absolute inset-0 opacity-10">
        <div className="w-full h-full" style={{
          backgroundImage: `
            linear-gradient(rgba(59, 130, 246, 0.2) 1px, transparent 1px),
            linear-gradient(90deg, rgba(59, 130, 246, 0.2) 1px, transparent 1px),
            linear-gradient(rgba(99, 102, 241, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(99, 102, 241, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: '100px 100px, 100px 100px, 20px 20px, 20px 20px'
        }}></div>
      </div>

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center justify-center text-center px-4 sm:px-6 lg:px-8">
        {/* Premium logo container */}
        <div className={`transition-all duration-2000 ease-out ${logoLoaded ? 'opacity-100 transform translate-y-0 scale-100' : 'opacity-0 transform translate-y-16 scale-90'}`}>
          <div className="relative">
            {/* Outer glow ring */}
            <div className="absolute -inset-6 bg-gradient-to-r from-blue-500/20 to-indigo-500/20 rounded-full blur-2xl animate-pulse"></div>
            
            {/* Main logo container */}
            <div className="relative bg-white/15 backdrop-blur-xl rounded-full p-10 sm:p-12 lg:p-16 shadow-2xl border-2 border-white/20">
              {/* Inner glow */}
              <div className="absolute inset-2 bg-gradient-to-br from-blue-400/10 to-indigo-400/10 rounded-full"></div>
              
              {/* Logo */}
              <div className="relative z-10">
                <img
                  src={sudhamritLogo}
                  alt="Sudhamrit"
                  className="h-20 sm:h-24 md:h-28 lg:h-32 xl:h-36 w-auto mx-auto object-contain filter drop-shadow-2xl"
                  onLoad={() => setLogoLoaded(true)}
                  onError={() => setLogoLoaded(true)}
                />
              </div>
              
              {/* Rotating border */}
              <div className="absolute -inset-1 border-2 border-transparent bg-gradient-to-r from-blue-500/30 via-indigo-500/30 to-blue-500/30 rounded-full animate-spin-slow mask-gradient"></div>
            </div>
          </div>
        </div>

        {/* Company name with professional typography */}
        <div className={`mt-10 sm:mt-12 transition-all duration-2000 delay-400 ease-out ${logoLoaded ? 'opacity-100 transform translate-y-0' : 'opacity-0 transform translate-y-8'}`}>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-black tracking-tight">
            <span className="bg-gradient-to-r from-blue-100 via-white to-indigo-100 bg-clip-text text-transparent">
              SUDHAMRIT
            </span>
          </h1>
        </div>

        {/* Professional tagline */}
        <div className={`mt-6 sm:mt-8 transition-all duration-2000 delay-600 ease-out ${logoLoaded ? 'opacity-100 transform translate-y-0' : 'opacity-0 transform translate-y-6'}`}>
          <div className="flex items-center space-x-3 mb-3">
            <div className="h-px w-12 bg-gradient-to-r from-transparent to-blue-400"></div>
            <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
            <div className="h-px w-12 bg-gradient-to-l from-transparent to-indigo-400"></div>
          </div>
          <p className="text-blue-100/90 text-lg sm:text-xl lg:text-2xl font-light tracking-[0.2em] uppercase">
            Inventory Management System
          </p>
          <div className="flex items-center space-x-3 mt-3">
            <div className="h-px w-12 bg-gradient-to-r from-transparent to-indigo-400"></div>
            <div className="w-2 h-2 bg-indigo-400 rounded-full"></div>
            <div className="h-px w-12 bg-gradient-to-l from-transparent to-blue-400"></div>
          </div>
        </div>

        {/* Professional loading indicator */}
        <div className={`mt-16 sm:mt-20 transition-all duration-2000 delay-800 ease-out ${logoLoaded ? 'opacity-100 transform translate-y-0' : 'opacity-0 transform translate-y-6'}`}>
          {/* Progress bar */}
          <div className="w-64 h-1 bg-white/20 rounded-full overflow-hidden mb-6">
            <div className="h-full bg-gradient-to-r from-blue-400 to-indigo-400 rounded-full animate-progress"></div>
          </div>
          
          {/* Loading dots */}
          <div className="flex items-center justify-center space-x-4">
            <div className="w-3 h-3 bg-blue-400 rounded-full animate-pulse"></div>
            <div className="w-3 h-3 bg-indigo-400 rounded-full animate-pulse delay-200"></div>
            <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse delay-400"></div>
          </div>
          
          <p className="text-blue-200/70 text-sm sm:text-base mt-6 font-light tracking-wider uppercase">
            Initializing System
          </p>
        </div>
      </div>

      {/* Professional bottom accent */}
      <div className="absolute bottom-0 left-0 right-0">
        <div className="h-2 bg-gradient-to-r from-blue-500/50 via-indigo-500/50 to-blue-500/50"></div>
        <div className="h-px bg-gradient-to-r from-transparent via-white/30 to-transparent"></div>
      </div>
    </div>
  );
}
