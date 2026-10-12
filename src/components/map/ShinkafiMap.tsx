import React, { useState, useEffect } from 'react';
import { MapPin, Navigation, Compass, Layers, ShieldCheck } from 'lucide-react';
import { Landmark } from '../../types';

export const SHINKAFI_LANDMARKS: Landmark[] = [
  { id: 'lm-1', name: 'Shinkafi Central Market', address: 'Market Gate 2, Commercial Ave', lat: 13.0780, lng: 6.5200, type: 'market' },
  { id: 'lm-2', name: 'General Hospital Shinkafi', address: 'Hospital Rd, Off Galadi Way', lat: 13.0845, lng: 6.5255, type: 'hospital' },
  { id: 'lm-3', name: 'Galadi Road Junction', address: 'Galadi Bypass & High St', lat: 13.0750, lng: 6.5150, type: 'civic' },
  { id: 'lm-4', name: 'Badarawa Motor Park', address: 'Badarawa Road Transit Yard', lat: 13.0720, lng: 6.5280, type: 'station' },
  { id: 'lm-5', name: 'Emir’s Palace Environs', address: 'Palace Roundabout, Shinkafi', lat: 13.0805, lng: 6.5220, type: 'landmark' },
  { id: 'lm-6', name: 'Katuru Gate Transit Park', address: 'North Ring Road, Katuru Exit', lat: 13.0860, lng: 6.5130, type: 'station' },
  { id: 'lm-7', name: 'Shinkafi LGA Secretariat', address: 'Secretariat Complex, Admin Zone', lat: 13.0765, lng: 6.5230, type: 'civic' }
];

interface MapProps {
  pickupLat?: number;
  pickupLng?: number;
  destLat?: number;
  destLng?: number;
  driverLat?: number;
  driverLng?: number;
  onSelectLocation?: (type: 'pickup' | 'destination', landmark: Landmark) => void;
  interactive?: boolean;
  height?: string;
}

export const ShinkafiMap: React.FC<MapProps> = ({
  pickupLat = 13.0780,
  pickupLng = 6.5200,
  destLat = 13.0845,
  destLng = 6.5255,
  driverLat = 13.0795,
  driverLng = 6.5210,
  onSelectLocation,
  interactive = true,
  height = 'h-80'
}) => {
  // Center coordinates around Shinkafi
  const centerLat = 13.0782;
  const centerLng = 6.5195;
  const zoomFactor = 12000; // coordinate to pixel scale

  // Convert lat/lng to percentage offset in SVG viewBox (500x350)
  const toSvgX = (lng: number) => {
    return 250 + (lng - centerLng) * zoomFactor;
  };
  const toSvgY = (lat: number) => {
    return 175 - (lat - centerLat) * zoomFactor;
  };

  const [activeDriverPos, setActiveDriverPos] = useState({ lat: driverLat, lng: driverLng });

  useEffect(() => {
    setActiveDriverPos({ lat: driverLat, lng: driverLng });
  }, [driverLat, driverLng]);

  return (
    <div className={`relative ${height} w-full rounded-xl overflow-hidden border border-neutral-700 bg-neutral-950 select-none shadow-inner`}>
      {/* Background stylized OpenStreetMap vector terrain grid */}
      <div className="absolute inset-0 opacity-20 pointer-events-none bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:16px_16px]" />
      
      {/* Map Control Bar Overlay */}
      <div className="absolute top-3 left-3 z-20 flex items-center gap-2 bg-neutral-900/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-neutral-700/80 text-xs text-neutral-300">
        <Compass className="w-3.5 h-3.5 text-emerald-400" />
        <span className="font-semibold text-neutral-100">Shinkafi Urban Grid</span>
        <span className="text-neutral-500">·</span>
        <span className="text-emerald-400">Zamfara Safe Corridor</span>
      </div>

      <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5 bg-neutral-900/90 backdrop-blur-md px-2.5 py-1.5 rounded-lg border border-neutral-700 text-xs text-neutral-400">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
        <span>Vetted Route Active</span>
      </div>

      {/* SVG Canvas for Roads, Corridors, Routes and Markers */}
      <svg className="w-full h-full" viewBox="0 0 500 350" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="routeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#06b6d4" />
          </linearGradient>
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Shinkafi Major Arterial Roads */}
        {/* Galadi to Central Market Arterial */}
        <path d="M 50,160 Q 200,180 320,130 T 480,90" fill="none" stroke="#262626" strokeWidth="14" strokeLinecap="round" />
        <path d="M 50,160 Q 200,180 320,130 T 480,90" fill="none" stroke="#404040" strokeWidth="6" strokeLinecap="round" />
        
        {/* Hospital Road to Badarawa Bypass */}
        <path d="M 180,330 Q 240,210 270,120 T 360,30" fill="none" stroke="#262626" strokeWidth="12" strokeLinecap="round" />
        <path d="M 180,330 Q 240,210 270,120 T 360,30" fill="none" stroke="#404040" strokeWidth="5" strokeLinecap="round" />

        {/* Outer Ring Corridor */}
        <circle cx="260" cy="170" r="130" fill="none" stroke="#262626" strokeWidth="8" strokeDasharray="8 6" />

        {/* Active Trip Route Line (Between Pickup & Destination) */}
        {pickupLat && destLat && (
          <>
            <path
              d={`M ${toSvgX(pickupLng)},${toSvgY(pickupLat)} Q ${(toSvgX(pickupLng) + toSvgX(destLng)) / 2 + 25},${(toSvgY(pickupLat) + toSvgY(destLat)) / 2 - 15} ${toSvgX(destLng)},${toSvgY(destLat)}`}
              fill="none"
              stroke="#047857"
              strokeWidth="6"
              strokeLinecap="round"
              filter="url(#glow)"
            />
            <path
              d={`M ${toSvgX(pickupLng)},${toSvgY(pickupLat)} Q ${(toSvgX(pickupLng) + toSvgX(destLng)) / 2 + 25},${(toSvgY(pickupLat) + toSvgY(destLat)) / 2 - 15} ${toSvgX(destLng)},${toSvgY(destLat)}`}
              fill="none"
              stroke="url(#routeGradient)"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeDasharray="6 3"
            />
          </>
        )}

        {/* Known Landmarks */}
        {SHINKAFI_LANDMARKS.map((lm) => {
          const x = toSvgX(lm.lng);
          const y = toSvgY(lm.lat);
          return (
            <g
              key={lm.id}
              className="cursor-pointer transition-transform hover:scale-110"
              onClick={() => onSelectLocation && onSelectLocation('destination', lm)}
            >
              <circle cx={x} cy={y} r="4" fill="#525252" />
              <circle cx={x} cy={y} r="2" fill="#a3a3a3" />
              <text x={x + 6} y={y + 3} fill="#a3a3a3" fontSize="9" fontWeight="500" className="pointer-events-none">
                {lm.name}
              </text>
            </g>
          );
        })}

        {/* Pickup Pin Marker */}
        {pickupLat && pickupLng && (
          <g transform={`translate(${toSvgX(pickupLng)}, ${toSvgY(pickupLat)})`}>
            <circle cx="0" cy="0" r="10" fill="#10b981" fillOpacity="0.2" className="animate-ping" />
            <circle cx="0" cy="0" r="6" fill="#10b981" />
            <circle cx="0" cy="0" r="2.5" fill="#ffffff" />
            <text x="9" y="-4" fill="#34d399" fontSize="10" fontWeight="bold">Pickup</text>
          </g>
        )}

        {/* Destination Pin Marker */}
        {destLat && destLng && (
          <g transform={`translate(${toSvgX(destLng)}, ${toSvgY(destLat)})`}>
            <circle cx="0" cy="0" r="10" fill="#06b6d4" fillOpacity="0.2" />
            <circle cx="0" cy="0" r="6" fill="#06b6d4" />
            <circle cx="0" cy="0" r="2.5" fill="#ffffff" />
            <text x="9" y="-4" fill="#38bdf8" fontSize="10" fontWeight="bold">Destination</text>
          </g>
        )}

        {/* Driver Live Marker */}
        {activeDriverPos.lat && (
          <g transform={`translate(${toSvgX(activeDriverPos.lng)}, ${toSvgY(activeDriverPos.lat)})`}>
            <circle cx="0" cy="0" r="14" fill="#f59e0b" fillOpacity="0.25" />
            <rect x="-6" y="-6" width="12" height="12" rx="3" fill="#f59e0b" stroke="#ffffff" strokeWidth="1.5" />
            <text x="8" y="4" fill="#fbbf24" fontSize="10" fontWeight="bold">Driver</text>
          </g>
        )}
      </svg>

      {/* Quick Landmark Selector Bar at bottom */}
      {interactive && onSelectLocation && (
        <div className="absolute bottom-2 left-2 right-2 z-20 flex items-center gap-1.5 overflow-x-auto py-1 px-1 bg-neutral-900/90 backdrop-blur-md rounded-lg border border-neutral-800 text-xs">
          <span className="text-neutral-500 font-medium px-1.5 shrink-0">Quick Picks:</span>
          {SHINKAFI_LANDMARKS.slice(0, 4).map((lm) => (
            <button
              key={lm.id}
              type="button"
              onClick={() => onSelectLocation('pickup', lm)}
              className="px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 transition-colors whitespace-nowrap shrink-0 text-xs flex items-center gap-1"
            >
              <MapPin className="w-3 h-3 text-emerald-400" />
              <span>{lm.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
