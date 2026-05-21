import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'full' | 'icon' | 'text';
  className?: string;
}

const sizeClasses = {
  sm: 'h-6',
  md: 'h-8',
  lg: 'h-12',
  xl: 'h-16',
};

const textSizes = {
  sm: 'text-lg',
  md: 'text-xl',
  lg: 'text-2xl',
  xl: 'text-3xl',
};

function LogoIcon({ sizeClass }: { sizeClass: string }) {
  return (
    <svg
      className={`${sizeClass} w-auto`}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* ton SVG inchangé */}
    </svg>
  );
}

const Logo: React.FC<LogoProps> = ({
  size = 'md',
  variant = 'full',
  className = '',
}) => {
  if (variant === 'icon') {
    return <LogoIcon sizeClass={sizeClasses[size]} />;
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
      <LogoIcon sizeClass={sizeClasses[size]} />
      <span className={`font-bold text-gray-900 dark:text-white ${textSizes[size]}`}>
        CDN-USERV
      </span>
    </div>
  );
};

export default Logo;