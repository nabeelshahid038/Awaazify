import React from 'react';
import { useApp } from '../context/AppContext';

interface BrandLogoProps {
  onClickNavigate?: () => void;
  size?: 'sm' | 'md' | 'lg';
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  onClickNavigate,
  size = 'md',
}) => {
  const { triggerLogoMicClick } = useApp();

  const badgeSize =
    size === 'sm'
      ? 'w-8 h-8 sm:w-9 sm:h-9 rounded-xl'
      : size === 'lg'
      ? 'w-12 h-12 rounded-2xl'
      : 'w-10 h-10 rounded-2xl';
  const textSize =
    size === 'sm'
      ? 'text-lg sm:text-xl'
      : size === 'lg'
      ? 'text-3xl'
      : 'text-2xl';

  const handleMicIconClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    triggerLogoMicClick();
    if (onClickNavigate) {
      onClickNavigate();
    }
  };

  return (
    <div
      onClick={onClickNavigate}
      className="inline-flex items-center gap-2 sm:gap-3 cursor-pointer select-none group shrink-0 whitespace-nowrap"
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && onClickNavigate) onClickNavigate();
      }}
    >
      {/* Cheerful Green & Golden Gradient Squircle App Icon with Microphone & Musical Notes (5-Click Secret Admin Trigger) */}
      <div
        onClick={handleMicIconClick}
        className={`relative flex items-center justify-center ${badgeSize} bg-gradient-to-br from-[#10B981] via-[#059669] to-[#F59E0B] shadow-md group-hover:scale-105 transition-transform duration-150`}
      >
        <svg
          viewBox="0 0 40 40"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-7 h-7"
        >
          {/* Playful Soundwave Bars on Left */}
          <rect x="5" y="16" width="2.8" height="8" rx="1.4" fill="#FEF3C7" />
          <rect x="9.5" y="12" width="2.8" height="16" rx="1.4" fill="#FFFFFF" />

          {/* Studio Microphone Capsule in Center */}
          <rect
            x="15"
            y="8"
            width="10"
            height="16"
            rx="5"
            fill="#FFFFFF"
          />
          {/* Golden Grille Lines on Mic */}
          <line
            x1="17.5"
            y1="13"
            x2="22.5"
            y2="13"
            stroke="#F59E0B"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <line
            x1="17.5"
            y1="16.5"
            x2="22.5"
            y2="16.5"
            stroke="#10B981"
            strokeWidth="1.8"
            strokeLinecap="round"
          />

          {/* Microphone Cradle & Stand */}
          <path
            d="M12.5 19C12.5 23.1421 15.8579 26.5 20 26.5C24.1421 26.5 27.5 23.1421 27.5 19"
            stroke="#FFFFFF"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
          <line
            x1="20"
            y1="26.5"
            x2="20"
            y2="32"
            stroke="#FFFFFF"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
          <line
            x1="15.5"
            y1="32"
            x2="24.5"
            y2="32"
            stroke="#FFFFFF"
            strokeWidth="2.4"
            strokeLinecap="round"
          />

          {/* Playful Musical Note on Top-Right */}
          <path
            d="M31 10V18.5C31 19.88 29.65 21 28 21C26.35 21 25 19.88 25 18.5C25 17.12 26.35 16 28 16C28.6 16 29.15 16.15 29.6 16.4V11.5L35 10V16.5C35 17.88 33.65 19 32 19"
            stroke="#FEF3C7"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {/* Friendly Rounded Typography: Awaazify */}
      <span
        className={`${textSize} font-extrabold tracking-tight text-[#0F172A] group-hover:text-[#059669] transition-colors`}
      >
        Awaazify
      </span>
    </div>
  );
};
