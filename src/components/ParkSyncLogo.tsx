import React from 'react';

interface LogoProps {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

export default function ParkSyncLogo({ size = 36, className, style }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ display: 'inline-block', flexShrink: 0, ...style }}
    >
      <defs>
        <linearGradient id="psBgGrad" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#174C3C" />
          <stop offset="100%" stopColor="#0E2F25" />
        </linearGradient>
        <linearGradient id="psLimeGrad" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#D9FA78" />
          <stop offset="100%" stopColor="#A6DD3B" />
        </linearGradient>
        <filter id="psGlow" x="0" y="0" width="64" height="64" filterUnits="userSpaceOnUse">
          <feDropShadow dx="0" dy="2" stdDeviation="2.5" floodColor="#000000" floodOpacity="0.25" />
        </filter>
      </defs>

      {/* Rounded Squircle */}
      <rect width="64" height="64" rx="18" fill="url(#psBgGrad)" />
      
      {/* Inner highlight ring */}
      <rect x="1" y="1" width="62" height="62" rx="17" stroke="#ffffff" strokeOpacity="0.15" strokeWidth="1.5" />

      {/* Geometric 'P' Parking Mark */}
      <path
        d="M20 48V16H33.5C39.299 16 44 20.701 44 26.5C44 32.299 39.299 37 33.5 37H28V48H20Z"
        fill="url(#psLimeGrad)"
        filter="url(#psGlow)"
      />
      
      {/* 'P' Cutout */}
      <path
        d="M28 23V30H33.5C35.433 30 37 28.433 37 26.5C37 24.567 35.433 23 33.5 23H28Z"
        fill="#174C3C"
      />

      {/* Smart Sync Radar Dot */}
      <circle cx="44" cy="44" r="5" fill="#D9FA78" />
      <circle cx="44" cy="44" r="9" stroke="#D9FA78" strokeOpacity="0.4" strokeWidth="1.5" strokeDasharray="3 3" />
    </svg>
  );
}
