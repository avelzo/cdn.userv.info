import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'full' | 'icon' | 'text';
  className?: string;
}

const Logo: React.FC<LogoProps> = ({ 
  size = 'md', 
  variant = 'full', 
  className = '' 
}) => {
  const sizeClasses = {
    sm: 'h-6',
    md: 'h-8',
    lg: 'h-12',
    xl: 'h-16'
  };

  const textSizes = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl',
    xl: 'text-3xl'
  };

  const LogoIcon = () => (
    <svg 
      className={`${sizeClasses[size]} w-auto`}
      viewBox="0 0 64 64" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Background circle with gradient */}
      <defs>
        <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3B82F6" />
          <stop offset="100%" stopColor="#1E40AF" />
        </linearGradient>
        <linearGradient id="nodeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#60A5FA" />
          <stop offset="100%" stopColor="#3B82F6" />
        </linearGradient>
      </defs>
      
      {/* Main background */}
      <circle cx="32" cy="32" r="30" fill="url(#bgGradient)" />
      
      {/* Global network nodes */}
      <g fill="url(#nodeGradient)">
        {/* Central hub */}
        <circle cx="32" cy="32" r="4" fill="white" />
        
        {/* Surrounding nodes */}
        <circle cx="16" cy="16" r="2.5" fill="white" opacity="0.9" />
        <circle cx="48" cy="16" r="2.5" fill="white" opacity="0.9" />
        <circle cx="16" cy="48" r="2.5" fill="white" opacity="0.9" />
        <circle cx="48" cy="48" r="2.5" fill="white" opacity="0.9" />
        <circle cx="32" cy="12" r="2" fill="white" opacity="0.8" />
        <circle cx="52" cy="32" r="2" fill="white" opacity="0.8" />
        <circle cx="32" cy="52" r="2" fill="white" opacity="0.8" />
        <circle cx="12" cy="32" r="2" fill="white" opacity="0.8" />
      </g>
      
      {/* Connection lines */}
      <g stroke="white" strokeWidth="1.5" opacity="0.6">
        {/* Central connections */}
        <line x1="32" y1="32" x2="16" y2="16" />
        <line x1="32" y1="32" x2="48" y2="16" />
        <line x1="32" y1="32" x2="16" y2="48" />
        <line x1="32" y1="32" x2="48" y2="48" />
        <line x1="32" y1="32" x2="32" y2="12" />
        <line x1="32" y1="32" x2="52" y2="32" />
        <line x1="32" y1="32" x2="32" y2="52" />
        <line x1="32" y1="32" x2="12" y2="32" />
      </g>
      
      {/* Speed/delivery arrows */}
      <g fill="white" opacity="0.8">
        {/* Top right arrow */}
        <path d="M40 20 L45 22 L42 25 L44 27 L39 24 L37 19 Z" />
        {/* Bottom left arrow */}
        <path d="M24 44 L19 42 L22 39 L20 37 L25 40 L27 45 Z" />
      </g>
      
      {/* Data flow particles */}
      <g fill="white">
        <circle cx="24" cy="24" r="1" opacity="0.7">
          <animate attributeName="opacity" values="0.7;0.3;0.7" dur="2s" repeatCount="indefinite" />
        </circle>
        <circle cx="40" cy="40" r="1" opacity="0.5">
          <animate attributeName="opacity" values="0.5;0.9;0.5" dur="1.5s" repeatCount="indefinite" />
        </circle>
        <circle cx="40" cy="24" r="1" opacity="0.6">
          <animate attributeName="opacity" values="0.6;0.2;0.6" dur="2.5s" repeatCount="indefinite" />
        </circle>
      </g>
    </svg>
  );

  if (variant === 'icon') {
    return <LogoIcon />;
  }

  if (variant === 'text') {
    return (
      <span className={`font-bold text-gray-900 dark:text-white ${textSizes[size]} ${className}`}>
        CDN-USERV
      </span>
    );
  }

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <LogoIcon />
      <span className={`font-bold text-gray-900 dark:text-white ${textSizes[size]}`}>
        CDN-USERV
      </span>
    </div>
  );
};

export default Logo;