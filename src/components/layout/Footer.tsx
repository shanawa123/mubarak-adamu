import React from 'react';
import { Shield, Phone, MapPin, Lock } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-neutral-950 border-t border-neutral-800 text-neutral-400 text-xs mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          {/* Brand & Purpose */}
          <div className="space-y-3">
            <div className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              <span className="w-6 h-6 rounded-md bg-emerald-600 flex items-center justify-center text-white font-black text-xs">
                S
              </span>
              <span>ShinkafiRide.ng</span>
            </div>
            <p className="text-neutral-400 leading-relaxed">
              Nigeria’s localized ride-hailing and fleet safety platform designed for Shinkafi, Zamfara State, and interstate transit corridors.
            </p>
            <div className="flex items-center gap-2 text-neutral-400">
              <MapPin className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span>Headquarters: Commercial Ave, Shinkafi Central, Zamfara</span>
            </div>
          </div>

          {/* Service Corridors */}
          <div className="space-y-2">
            <h4 className="text-neutral-200 font-semibold text-sm">Transit Corridors</h4>
            <ul className="space-y-1.5">
              <li>Shinkafi Urban & Market Loop</li>
              <li>Shinkafi – Gusau State Capital Transit</li>
              <li>Shinkafi – Kaura Namoda – Sokoto Line</li>
              <li>Galadi & Badarawa Commercial Feeder</li>
            </ul>
          </div>

          {/* Safety & Rapid Incident Response */}
          <div className="space-y-2">
            <h4 className="text-neutral-200 font-semibold text-sm flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-emerald-400" />
              <span>Safety & Security Desk</span>
            </h4>
            <div className="space-y-1 text-neutral-400">
              <p className="flex items-center gap-1.5 text-emerald-400 font-medium">
                <Phone className="w-3 h-3" />
                <span>+234 814 999 8811 (24/7 Desk)</span>
              </p>
              <p className="text-[11px] text-neutral-400">
                Zamfara Police Liaison: +234 803 123 4567
              </p>
              <p className="text-[11px] text-neutral-400 pt-1">
                Every vehicle verified by Union Elders & FRSC records.
              </p>
            </div>
          </div>

          {/* Regulatory & Data Protection */}
          <div className="space-y-2">
            <h4 className="text-neutral-200 font-semibold text-sm flex items-center gap-1.5">
              <Lock className="w-4 h-4 text-emerald-400" />
              <span>Data Protection</span>
            </h4>
            <p className="text-neutral-400 leading-relaxed text-[11px]">
              Compliant with the Nigeria Data Protection Act (NDPA) 2023. Passenger travel histories and location logs are strictly isolated and accessible only during authorized security investigations.
            </p>
            <div className="pt-2 text-neutral-400 space-x-2">
              <span className="hover:text-neutral-200 cursor-pointer">Privacy Policy</span>
              <span>·</span>
              <span className="hover:text-neutral-200 cursor-pointer">Terms of Service</span>
              <span>·</span>
              <span className="hover:text-neutral-200 cursor-pointer">Safety Guidelines</span>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-neutral-900 flex flex-col sm:flex-row items-center justify-between gap-4 text-neutral-400 text-[11px]">
          <div>
            © {new Date().getFullYear()} ShinkafiRide.ng Transport Technologies. All rights reserved.
          </div>
          <div className="flex items-center gap-4">
            <span>Operating Hours: 05:30 – 22:00 WAT</span>
            <span>·</span>
            <span>Currency: NGN (₦)</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
