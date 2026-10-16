import React from 'react';

interface KestrelLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showTagline?: boolean;
  className?: string;
}

export function KestrelLogo({
  size = 'md',
  showTagline = true,
  className = '',
}: KestrelLogoProps) {
  // Dimension map for the full logo banner
  const sizeClasses = {
    sm: 'max-w-[240px]',
    md: 'max-w-[380px]',
    lg: 'max-w-[520px]',
  };

  return (
    <div className={`kestrel-full-logo flex flex-col items-center text-center select-none ${className}`}>
      {/* High-resolution official full logo lockup */}
      <img
        src="/branding/kestrel-logo-banner-transparent.png"
        alt="Kestrel: Hunt flaws. Ship armor."
        className={`w-full ${sizeClasses[size]} object-contain filter drop-shadow-[0_4px_24px_rgba(16,185,129,0.18)]`}
      />

      {showTagline && (
        <div className="sr-only">
          Kestrel: Hunt flaws. Ship armor.
        </div>
      )}
    </div>
  );
}
