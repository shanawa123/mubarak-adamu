import React, { useState } from 'react';
import { Shield, MapPin, Car, Users, ArrowRight, CheckCircle2, Phone, AlertCircle, ShieldAlert, Sparkles, Clock, Lock } from 'lucide-react';
import { SHINKAFI_LANDMARKS } from '../map/ShinkafiMap';
import { VehicleCategory } from '../../types';

interface LandingPageProps {
  onNavigateTab: (tab: string) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigateTab }) => {
  // Interactive Fare Calculator state on Landing Page
  const [pickupLandmark, setPickupLandmark] = useState(SHINKAFI_LANDMARKS[0].id);
  const [destLandmark, setDestLandmark] = useState(SHINKAFI_LANDMARKS[1].id);
  const [category, setCategory] = useState<VehicleCategory>('keke_tricycle');
  const [estimateResult, setEstimateResult] = useState<{ fare: number; distance: number; duration: number } | null>({
    fare: 380,
    distance: 3.2,
    duration: 10
  });
  const [calculating, setCalculating] = useState(false);

  const handleEstimateFare = async () => {
    setCalculating(true);
    const p = SHINKAFI_LANDMARKS.find(l => l.id === pickupLandmark);
    const d = SHINKAFI_LANDMARKS.find(l => l.id === destLandmark);

    if (p && d) {
      try {
        const res = await fetch('/api/rides/estimate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            category,
            pickupLat: p.lat,
            pickupLng: p.lng,
            destLat: d.lat,
            destLng: d.lng
          })
        });
        const data = await res.json();
        if (data.success && data.estimate) {
          setEstimateResult({
            fare: data.estimate.estimatedFare,
            distance: data.estimate.distanceKm,
            duration: data.estimate.durationMin
          });
        }
      } catch {
        // Fallback calculation
        setEstimateResult({ fare: 450, distance: 3.5, duration: 12 });
      } finally {
        setCalculating(false);
      }
    }
  };

  return (
    <div className="space-y-24">
      {/* Hero Section */}
      <section className="relative pt-6 pb-12 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Column: Heading and CTAs */}
            <div className="lg:col-span-7 space-y-6">
              <div className="flex items-center gap-2 text-xs text-emerald-400 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>Operational across Shinkafi Local Government & Zamfara Corridors</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-tight">
                Your Journey. <br />
                Your Community. <br />
                <span className="text-emerald-400">Your Ride.</span>
              </h1>

              <p className="text-lg text-neutral-300 max-w-xl leading-relaxed">
                Book rides, connect with verified drivers, and travel with greater convenience and safety in Shinkafi, Zamfara State.
              </p>

              <div className="flex flex-wrap items-center gap-4 pt-2">
                <button
                  onClick={() => onNavigateTab('passenger')}
                  className="px-6 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl transition-all shadow-lg shadow-emerald-900/30 flex items-center gap-2"
                >
                  <span>Book a Ride</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onNavigateTab('driver')}
                  className="px-6 py-3.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-semibold rounded-xl border border-neutral-700 transition-colors"
                >
                  Become a Driver
                </button>
              </div>

              {/* Trust Indicators */}
              <div className="pt-6 border-t border-neutral-800/80 grid grid-cols-3 gap-6 text-xs text-neutral-400">
                <div>
                  <div className="text-lg font-bold text-white tabular-nums">100%</div>
                  <div>Vetted Drivers</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-white tabular-nums">24/7</div>
                  <div>Security Desk</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-white tabular-nums">₦ NGN</div>
                  <div>Cash & Paystack</div>
                </div>
              </div>
            </div>

            {/* Right Column: Hero Visual Image */}
            <div className="lg:col-span-5 relative">
              <div className="relative rounded-2xl overflow-hidden border border-neutral-800 shadow-2xl bg-neutral-900">
                <img
                  src="/src/assets/images/hero_shinkafi_ride_1791805161881.jpg"
                  alt="Modern commercial transport in Northern Nigeria"
                  className="w-full h-[420px] object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/20 to-transparent" />
                <div className="absolute bottom-4 left-4 right-4 p-4 bg-neutral-900/90 backdrop-blur-md rounded-xl border border-neutral-800 text-xs">
                  <div className="flex items-center justify-between text-neutral-300 mb-1">
                    <span className="font-semibold text-white">Shinkafi Urban Express</span>
                    <span className="text-emerald-400 font-mono">Active Service</span>
                  </div>
                  <p className="text-neutral-400 text-[11px]">
                    Connecting Market Gate 2, Hospital Way, and Galadi Bypass daily.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Fare Estimator Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="p-8 rounded-2xl bg-neutral-900/90 border border-neutral-800 shadow-xl">
          <div className="max-w-3xl mb-6">
            <h2 className="text-2xl font-bold text-white tracking-tight">Instant Fare Estimator</h2>
            <p className="text-sm text-neutral-400">
              Transparent, server-calculated fares before you travel. No hidden surcharges.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1.5">Pickup Landmark</label>
              <select
                value={pickupLandmark}
                onChange={(e) => setPickupLandmark(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg bg-neutral-800 border border-neutral-700 text-neutral-200 text-xs focus:ring-2 focus:ring-emerald-500"
              >
                {SHINKAFI_LANDMARKS.map((lm) => (
                  <option key={lm.id} value={lm.id}>{lm.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1.5">Destination Landmark</label>
              <select
                value={destLandmark}
                onChange={(e) => setDestLandmark(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg bg-neutral-800 border border-neutral-700 text-neutral-200 text-xs focus:ring-2 focus:ring-emerald-500"
              >
                {SHINKAFI_LANDMARKS.map((lm) => (
                  <option key={lm.id} value={lm.id}>{lm.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1.5">Vehicle Type</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as VehicleCategory)}
                className="w-full px-3 py-2.5 rounded-lg bg-neutral-800 border border-neutral-700 text-neutral-200 text-xs focus:ring-2 focus:ring-emerald-500"
              >
                <option value="keke_tricycle">Bajaj Keke Tricycle (₦200 base)</option>
                <option value="sedan">Standard Sedan Car (₦500 base)</option>
                <option value="intercity_van">14-Seater Intercity Van (₦1,500 base)</option>
                <option value="cargo_pickup">Cargo & Produce Haulage (₦2,000 base)</option>
              </select>
            </div>

            <div>
              <button
                onClick={handleEstimateFare}
                disabled={calculating}
                className="w-full px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {calculating ? 'Calculating...' : 'Calculate Fare'}
              </button>
            </div>
          </div>

          {estimateResult && (
            <div className="mt-6 p-4 rounded-xl bg-neutral-950 border border-neutral-800 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-6 text-xs text-neutral-300">
                <div>
                  <span className="text-neutral-500">Estimated Distance:</span>{' '}
                  <span className="font-semibold text-white tabular-nums">{estimateResult.distance} km</span>
                </div>
                <div>
                  <span className="text-neutral-500">Est. Travel Time:</span>{' '}
                  <span className="font-semibold text-white tabular-nums">~{estimateResult.duration} mins</span>
                </div>
                <div>
                  <span className="text-neutral-500">Currency:</span>{' '}
                  <span className="font-semibold text-white">Nigerian Naira (NGN)</span>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <span className="text-xs text-neutral-400 block">Authoritative Fare</span>
                  <span className="text-2xl font-bold text-emerald-400 tabular-nums">
                    ₦{estimateResult.fare.toLocaleString()}
                  </span>
                </div>
                <button
                  onClick={() => onNavigateTab('passenger')}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition-colors"
                >
                  Request Trip
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Services Available */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-3xl font-bold text-white tracking-tight">Available Mobility Services</h2>
          <p className="text-sm text-neutral-400 mt-2">
            Engineered for daily town commuting, agricultural transport, and regional travel.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="p-6 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-neutral-700 transition-colors">
            <div className="w-10 h-10 rounded-lg bg-yellow-500/10 text-yellow-400 flex items-center justify-center font-bold mb-4">
              🛺
            </div>
            <h3 className="text-base font-semibold text-white">Keke Tricycle Drops</h3>
            <p className="text-xs text-neutral-400 mt-2 leading-relaxed">
              Affordable town drops for market shoppers, hospital visits, and short trips across Shinkafi inner roads.
            </p>
            <div className="mt-4 pt-4 border-t border-neutral-800/80 text-xs text-emerald-400 font-medium">
              From ₦300 minimum fare
            </div>
          </div>

          <div className="p-6 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-neutral-700 transition-colors">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold mb-4">
              🚗
            </div>
            <h3 className="text-base font-semibold text-white">Private Sedan Rides</h3>
            <p className="text-xs text-neutral-400 mt-2 leading-relaxed">
              Clean air-conditioned saloon cars for private transport, official government visits, and family convenience.
            </p>
            <div className="mt-4 pt-4 border-t border-neutral-800/80 text-xs text-emerald-400 font-medium">
              From ₦700 minimum fare
            </div>
          </div>

          <div className="p-6 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-neutral-700 transition-colors">
            <div className="w-10 h-10 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center font-bold mb-4">
              🚐
            </div>
            <h3 className="text-base font-semibold text-white">Inter-City Corridor Vans</h3>
            <p className="text-xs text-neutral-400 mt-2 leading-relaxed">
              Scheduled and charter transit between Shinkafi, Kaura Namoda, Gusau, and Sokoto with escort coordination.
            </p>
            <div className="mt-4 pt-4 border-t border-neutral-800/80 text-xs text-cyan-400 font-medium">
              From ₦2,500 corridor rate
            </div>
          </div>

          <div className="p-6 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-neutral-700 transition-colors">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold mb-4">
              📦
            </div>
            <h3 className="text-base font-semibold text-white">Produce & Cargo Haulage</h3>
            <p className="text-xs text-neutral-400 mt-2 leading-relaxed">
              Move agricultural harvests, market goods, and commercial merchandise directly from farms and depots.
            </p>
            <div className="mt-4 pt-4 border-t border-neutral-800/80 text-xs text-amber-400 font-medium">
              From ₦3,500 payload rate
            </div>
          </div>
        </div>
      </section>

      {/* Safety & Security Command Spotlight */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="rounded-2xl bg-neutral-900 border border-neutral-800 overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center p-8 lg:p-12">
            <div className="lg:col-span-7 space-y-6">
              <div className="flex items-center gap-2 text-xs text-amber-400 font-semibold">
                <Shield className="w-4 h-4" />
                <span>Dedicated Safety & Incident Response Department</span>
              </div>

              <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
                Safety Built Specifically for Zamfara Corridors
              </h2>

              <p className="text-sm text-neutral-300 leading-relaxed">
                Unlike generic apps, ShinkafiRide operates a physical security oversight desk liaising directly with the Zamfara State Police Command and local community elders to ensure safe travel on regional transit routes.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-neutral-300">
                <div className="p-3.5 rounded-lg bg-neutral-950 border border-neutral-800 space-y-1">
                  <div className="font-semibold text-white flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Trip Verification Code</span>
                  </div>
                  <p className="text-neutral-400 text-[11px]">
                    4-digit OTP shown on passenger app. Driver cannot start trip without entering it.
                  </p>
                </div>

                <div className="p-3.5 rounded-lg bg-neutral-950 border border-neutral-800 space-y-1">
                  <div className="font-semibold text-white flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                    <span>Emergency SOS Dispatch</span>
                  </div>
                  <p className="text-neutral-400 text-[11px]">
                    Instant escalation with exact GPS coordinates sent to Shinkafi Safety Officers.
                  </p>
                </div>

                <div className="p-3.5 rounded-lg bg-neutral-950 border border-neutral-800 space-y-1">
                  <div className="font-semibold text-white flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Vetted Driver Registry</span>
                  </div>
                  <p className="text-neutral-400 text-[11px]">
                    FRSC driver license, guarantor elder verification, and vehicle roadworthiness inspection.
                  </p>
                </div>

                <div className="p-3.5 rounded-lg bg-neutral-950 border border-neutral-800 space-y-1">
                  <div className="font-semibold text-white flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Corridor Operating Hours</span>
                  </div>
                  <p className="text-neutral-400 text-[11px]">
                    Curfew-aware routing with advisory alerts on remote bypass roads after 19:30 WAT.
                  </p>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => onNavigateTab('security')}
                  className="px-5 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white font-medium text-xs rounded-lg border border-neutral-700 transition-colors flex items-center gap-2"
                >
                  <ShieldAlert className="w-4 h-4 text-amber-400" />
                  <span>Inspect Security Department Console</span>
                </button>
              </div>
            </div>

            <div className="lg:col-span-5">
              <div className="rounded-xl overflow-hidden border border-neutral-800 shadow-xl">
                <img
                  src="/src/assets/images/shinkafi_safety_center_1791805178268.jpg"
                  alt="Security control room for transport monitoring"
                  className="w-full h-80 object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Driver & Operator Two-Column Showcase */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Driver Recruitment */}
          <div className="p-8 rounded-2xl bg-neutral-900 border border-neutral-800 flex flex-col justify-between">
            <div>
              <div className="rounded-xl overflow-hidden mb-6 h-48 border border-neutral-800">
                <img
                  src="/src/assets/images/driver_partner_showcase_1791805188901.jpg"
                  alt="Driver partner"
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              <h3 className="text-xl font-bold text-white">Drive with ShinkafiRide</h3>
              <p className="text-xs text-neutral-400 mt-2 leading-relaxed">
                Turn your tricycle or vehicle into reliable daily income. Keep 85% of every completed trip fare with automated payouts and transparent ledger accounting.
              </p>
              <ul className="mt-4 space-y-2 text-xs text-neutral-300">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Flexible online/offline control anytime</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Emergency protection on active routes</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Transparent 15% platform commission</span>
                </li>
              </ul>
            </div>
            <div className="pt-6">
              <button
                onClick={() => onNavigateTab('driver')}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-lg transition-colors"
              >
                Register as a Driver
              </button>
            </div>
          </div>

          {/* Transport Operators & Fleet Owners */}
          <div className="p-8 rounded-2xl bg-neutral-900 border border-neutral-800 flex flex-col justify-between">
            <div>
              <div className="rounded-xl overflow-hidden mb-6 h-48 border border-neutral-800">
                <img
                  src="/src/assets/images/operator_fleet_depot_1791805201818.jpg"
                  alt="Transport fleet depot"
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              <h3 className="text-xl font-bold text-white">Transport Operators & Fleets</h3>
              <p className="text-xs text-neutral-400 mt-2 leading-relaxed">
                Are you a transport union, fleet owner, or logistics company in Zamfara? Register your fleet, assign drivers, monitor trips in real time, and access automated revenue analytics.
              </p>
              <ul className="mt-4 space-y-2 text-xs text-neutral-300">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Vehicle registration & document compliance alerts</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Driver-to-vehicle dispatch management</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Isolated operational records and financial reporting</span>
                </li>
              </ul>
            </div>
            <div className="pt-6">
              <button
                onClick={() => onNavigateTab('operator')}
                className="w-full py-3 bg-neutral-800 hover:bg-neutral-700 text-white font-semibold text-xs rounded-lg border border-neutral-700 transition-colors"
              >
                Manage Operator Fleet
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Frequently Asked Questions */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-bold text-white tracking-tight">Frequently Asked Questions</h2>
          <p className="text-xs text-neutral-400 mt-1">
            Common questions about ride safety, fares, and fleet operations in Shinkafi.
          </p>
        </div>

        <div className="space-y-4 text-xs">
          <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800">
            <h4 className="font-semibold text-white text-sm">How does ShinkafiRide ensure safety in Zamfara State?</h4>
            <p className="text-neutral-400 mt-1.5 leading-relaxed">
              Every driver undergoes document checks (FRSC license, roadworthiness) and elder vetting. All trips generate a mandatory 4-digit verification code, and drivers are tracked along authorized security corridors during active journeys.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800">
            <h4 className="font-semibold text-white text-sm">Can I pay in cash or transfer?</h4>
            <p className="text-neutral-400 mt-1.5 leading-relaxed">
              Yes. Passengers can pay drivers directly with Nigerian cash upon trip arrival, or pay securely using Paystack / Flutterwave digital bank transfer or debit cards.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800">
            <h4 className="font-semibold text-white text-sm">What happens if a passenger presses the Emergency SOS button?</h4>
            <p className="text-neutral-400 mt-1.5 leading-relaxed">
              The SOS button alerts the Shinkafi Security Desk and logs the coordinates, driver identity, and passenger record. The safety team can immediately liaison with local police patrols. The interface clearly distinguishes between the platform safety desk and direct emergency services.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800">
            <h4 className="font-semibold text-white text-sm">Can transport unions and private operators manage their own fleets?</h4>
            <p className="text-neutral-400 mt-1.5 leading-relaxed">
              Yes. The Operator Module allows approved companies to register multiple vehicles, assign verified drivers, track trip revenue, and view maintenance compliance with strict organizational data isolation.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
