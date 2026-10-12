import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ShinkafiMap, SHINKAFI_LANDMARKS } from '../map/ShinkafiMap';
import { Ride, VehicleCategory, Landmark } from '../../types';
import {
  Car,
  MapPin,
  Clock,
  Shield,
  AlertTriangle,
  Star,
  CheckCircle2,
  Navigation,
  Phone,
  ArrowRight,
  RefreshCw,
  Share2,
  HelpCircle,
  XCircle
} from 'lucide-react';

export const PassengerDashboard: React.FC = () => {
  const { user } = useAuth();
  const [activeRide, setActiveRide] = useState<any>(null);
  const [ridesHistory, setRidesHistory] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);

  // Booking form state
  const [pickupLandmark, setPickupLandmark] = useState<Landmark>(SHINKAFI_LANDMARKS[0]);
  const [destLandmark, setDestLandmark] = useState<Landmark>(SHINKAFI_LANDMARKS[1]);
  const [category, setCategory] = useState<VehicleCategory>('keke_tricycle');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'paystack'>('cash');
  const [estimate, setEstimate] = useState<any>(null);

  // Modals & Safety
  const [sosModalOpen, setSosModalOpen] = useState(false);
  const [sosReason, setSosReason] = useState('');
  const [sosSending, setSosSending] = useState(false);
  const [sosSentTicket, setSosSentTicket] = useState<string | null>(null);

  const [ratingModalOpen, setRatingModalOpen] = useState(false);
  const [selectedRating, setSelectedRating] = useState(5);
  const [ratingFeedback, setRatingFeedback] = useState('');
  const [ratingRideId, setRatingRideId] = useState('');

  // Fetch active ride & rides history
  const fetchPassengerData = async () => {
    try {
      const [activeRes, histRes] = await Promise.all([
        fetch('/api/passenger/active-ride'),
        fetch('/api/passenger/rides')
      ]);
      const activeData = await activeRes.json();
      const histData = await histRes.json();

      if (activeData.success) {
        setActiveRide(activeData.activeRide ? {
          ...activeData.activeRide,
          driver: activeData.driver,
          vehicle: activeData.vehicle
        } : null);
      }
      if (histData.success) {
        setRidesHistory(histData.rides || []);
      }
    } catch (err) {
      console.error('Error fetching passenger data:', err);
    }
  };

  useEffect(() => {
    fetchPassengerData();
    const interval = setInterval(fetchPassengerData, 4000);
    return () => clearInterval(interval);
  }, []);

  // Fetch fare estimate when pickup, dest, or category changes
  useEffect(() => {
    const getEstimate = async () => {
      try {
        const res = await fetch('/api/rides/estimate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            category,
            pickupLat: pickupLandmark.lat,
            pickupLng: pickupLandmark.lng,
            destLat: destLandmark.lat,
            destLng: destLandmark.lng
          })
        });
        const data = await res.json();
        if (data.success) {
          setEstimate(data.estimate);
        }
      } catch (err) {
        console.error('Error fetching estimate:', err);
      }
    };
    getEstimate();
  }, [pickupLandmark, destLandmark, category]);

  // Request Ride Handler
  const handleRequestRide = async (e: React.FormEvent) => {
    e.preventDefault();
    setBookingLoading(true);
    try {
      const res = await fetch('/api/rides', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category,
          pickupAddress: `${pickupLandmark.name}, ${pickupLandmark.address}`,
          pickupLat: pickupLandmark.lat,
          pickupLng: pickupLandmark.lng,
          destinationAddress: `${destLandmark.name}, ${destLandmark.address}`,
          destLat: destLandmark.lat,
          destLng: destLandmark.lng,
          paymentMethod
        })
      });
      const data = await res.json();
      if (data.success) {
        await fetchPassengerData();
      }
    } finally {
      setBookingLoading(false);
    }
  };

  // Cancel Ride
  const handleCancelRide = async (rideId: string) => {
    if (!confirm('Are you sure you want to cancel this trip request?')) return;
    try {
      await fetch(`/api/rides/${rideId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Passenger cancelled from dashboard' })
      });
      await fetchPassengerData();
    } catch (err) {
      console.error('Error cancelling ride:', err);
    }
  };

  // Submit Rating
  const handleSubmitRating = async () => {
    try {
      await fetch(`/api/rides/${ratingRideId}/rating`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating: selectedRating, feedback: ratingFeedback })
      });
      setRatingModalOpen(false);
      await fetchPassengerData();
    } catch (err) {
      console.error('Error submitting rating:', err);
    }
  };

  // Trigger Emergency SOS
  const handleTriggerSos = async () => {
    setSosSending(true);
    try {
      const res = await fetch('/api/passenger/sos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rideId: activeRide?.id,
          reason: sosReason || 'Passenger triggered emergency button on Shinkafi transit corridor'
        })
      });
      const data = await res.json();
      if (data.success) {
        setSosSentTicket(data.incident.ticketNumber);
      }
    } finally {
      setSosSending(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-8">
      {/* Top Banner: Welcome + Profile + Safety SOS Hotline */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-neutral-900 border border-neutral-800">
        <div>
          <div className="text-xs text-emerald-400 font-medium">Passenger Terminal · Shinkafi, Zamfara</div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Welcome back, {user?.profile?.fullName || 'Hajiya Fatima Aliyu'}
          </h1>
          <p className="text-xs text-neutral-400 mt-0.5">
            Phone: <span className="text-neutral-300 font-mono">{user?.phone || '+234 803 777 0007'}</span> · Emergency Contact: <span className="text-neutral-300">{user?.passengerProfile?.emergencyContactName || 'Aliyu Garba'}</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Emergency SOS Button */}
          <button
            onClick={() => {
              setSosModalOpen(true);
              setSosSentTicket(null);
            }}
            className="px-4 py-2.5 bg-rose-600/90 hover:bg-rose-500 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-lg shadow-rose-950/40 transition-all border border-rose-500/50"
          >
            <Shield className="w-4 h-4 fill-white" />
            <span>Emergency SOS Desk</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Active Trip Tracker OR Book a Ride Form */}
        <div className="lg:col-span-7 space-y-6">
          {activeRide ? (
            /* Active Trip Status Card */
            <div className="p-6 rounded-2xl bg-neutral-900 border border-emerald-500/30 shadow-xl space-y-6">
              <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
                <div>
                  <span className="text-xs text-neutral-400">Current Trip ID</span>
                  <div className="text-sm font-mono font-bold text-white">{activeRide.id}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-950 text-emerald-400 border border-emerald-800 uppercase tracking-wide">
                    {activeRide.status.replace('_', ' ')}
                  </span>
                </div>
              </div>

              {/* Passenger Verification OTP - CRITICAL FEATURE */}
              <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-between">
                <div>
                  <div className="text-xs text-neutral-400 font-medium">Trip Verification Code (OTP)</div>
                  <div className="text-xs text-neutral-500">Provide this 4-digit code to driver to confirm trip start:</div>
                </div>
                <div className="px-4 py-2 bg-emerald-900/40 border border-emerald-600 rounded-lg text-2xl font-mono font-extrabold text-emerald-400 tracking-widest">
                  {activeRide.verificationOtp}
                </div>
              </div>

              {/* Driver & Vehicle Details */}
              {activeRide.driver ? (
                <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-3">
                  <div className="text-xs text-neutral-400 font-semibold uppercase tracking-wider">Assigned Driver & Vehicle</div>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-base font-bold text-white">{activeRide.driver.fullName}</div>
                      <div className="text-xs text-neutral-400 flex items-center gap-2 mt-0.5">
                        <span className="flex items-center gap-1 text-amber-400 font-semibold">
                          <Star className="w-3 h-3 fill-amber-400" />
                          <span>{activeRide.driver.rating || 4.9}</span>
                        </span>
                        <span>·</span>
                        <span className="font-mono">{activeRide.driver.phone}</span>
                      </div>
                    </div>
                    {activeRide.vehicle && (
                      <div className="text-right">
                        <div className="text-sm font-bold text-white font-mono bg-neutral-800 px-2 py-0.5 rounded border border-neutral-700">
                          {activeRide.vehicle.plateNumber}
                        </div>
                        <div className="text-xs text-neutral-400 mt-0.5">
                          {activeRide.vehicle.make} {activeRide.vehicle.model}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center gap-3 text-xs text-neutral-300">
                  <RefreshCw className="w-4 h-4 text-emerald-400 animate-spin" />
                  <span>Searching for verified drivers near {activeRide.pickupAddress}...</span>
                </div>
              )}

              {/* Route Summary */}
              <div className="space-y-3 text-xs">
                <div className="flex items-start gap-2.5">
                  <div className="w-4 h-4 rounded-full bg-emerald-600 flex items-center justify-center text-white text-[10px] mt-0.5">A</div>
                  <div>
                    <span className="text-neutral-400">Pickup:</span>
                    <p className="text-neutral-200 font-medium">{activeRide.pickupAddress}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <div className="w-4 h-4 rounded-full bg-cyan-600 flex items-center justify-center text-white text-[10px] mt-0.5">B</div>
                  <div>
                    <span className="text-neutral-400">Destination:</span>
                    <p className="text-neutral-200 font-medium">{activeRide.destinationAddress}</p>
                  </div>
                </div>
              </div>

              {/* Fare & Cancellation Policy Action */}
              <div className="pt-4 border-t border-neutral-800 flex items-center justify-between">
                <div>
                  <span className="text-xs text-neutral-400">Authoritative Fare</span>
                  <div className="text-xl font-bold text-emerald-400 font-mono">
                    ₦{activeRide.estimatedFare?.toLocaleString()}
                  </div>
                </div>
                <button
                  onClick={() => handleCancelRide(activeRide.id)}
                  className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-rose-400 hover:text-rose-300 text-xs font-semibold rounded-lg border border-neutral-700 transition-colors"
                >
                  Cancel Trip
                </button>
              </div>
            </div>
          ) : (
            /* Booking Form */
            <div className="p-6 rounded-2xl bg-neutral-900 border border-neutral-800 shadow-xl space-y-6">
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight">Book a Ride in Shinkafi</h2>
                <p className="text-xs text-neutral-400 mt-1">
                  Select your pickup, destination landmark, and vehicle category.
                </p>
              </div>

              <form onSubmit={handleRequestRide} className="space-y-4">
                {/* Pickup Selection */}
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">
                    Pickup Location (Shinkafi Landmark)
                  </label>
                  <select
                    value={pickupLandmark.id}
                    onChange={(e) => {
                      const found = SHINKAFI_LANDMARKS.find(l => l.id === e.target.value);
                      if (found) setPickupLandmark(found);
                    }}
                    className="w-full px-3 py-2.5 rounded-lg bg-neutral-950 border border-neutral-700 text-neutral-200 text-xs focus:ring-2 focus:ring-emerald-500"
                  >
                    {SHINKAFI_LANDMARKS.map((lm) => (
                      <option key={lm.id} value={lm.id}>{lm.name} ({lm.address})</option>
                    ))}
                  </select>
                </div>

                {/* Destination Selection */}
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">
                    Destination Location
                  </label>
                  <select
                    value={destLandmark.id}
                    onChange={(e) => {
                      const found = SHINKAFI_LANDMARKS.find(l => l.id === e.target.value);
                      if (found) setDestLandmark(found);
                    }}
                    className="w-full px-3 py-2.5 rounded-lg bg-neutral-950 border border-neutral-700 text-neutral-200 text-xs focus:ring-2 focus:ring-emerald-500"
                  >
                    {SHINKAFI_LANDMARKS.map((lm) => (
                      <option key={lm.id} value={lm.id}>{lm.name} ({lm.address})</option>
                    ))}
                  </select>
                </div>

                {/* Category Radio Grid */}
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-2">
                    Select Vehicle Class
                  </label>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <button
                      type="button"
                      onClick={() => setCategory('keke_tricycle')}
                      className={`p-3 rounded-xl border text-left transition-colors ${
                        category === 'keke_tricycle'
                          ? 'bg-emerald-950/60 border-emerald-500 text-white'
                          : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                      }`}
                    >
                      <div className="font-semibold text-white">🛺 Keke Tricycle</div>
                      <div className="text-[11px] text-neutral-400">Affordable town drops</div>
                      <div className="text-emerald-400 font-mono mt-1 font-bold">₦200 base</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setCategory('sedan')}
                      className={`p-3 rounded-xl border text-left transition-colors ${
                        category === 'sedan'
                          ? 'bg-emerald-950/60 border-emerald-500 text-white'
                          : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                      }`}
                    >
                      <div className="font-semibold text-white">🚗 Standard Sedan</div>
                      <div className="text-[11px] text-neutral-400">Private comfort</div>
                      <div className="text-emerald-400 font-mono mt-1 font-bold">₦500 base</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setCategory('intercity_van')}
                      className={`p-3 rounded-xl border text-left transition-colors ${
                        category === 'intercity_van'
                          ? 'bg-emerald-950/60 border-emerald-500 text-white'
                          : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                      }`}
                    >
                      <div className="font-semibold text-white">🚐 Intercity Van</div>
                      <div className="text-[11px] text-neutral-400">Gusau / Sokoto Line</div>
                      <div className="text-emerald-400 font-mono mt-1 font-bold">₦1,500 base</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setCategory('cargo_pickup')}
                      className={`p-3 rounded-xl border text-left transition-colors ${
                        category === 'cargo_pickup'
                          ? 'bg-emerald-950/60 border-emerald-500 text-white'
                          : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                      }`}
                    >
                      <div className="font-semibold text-white">📦 Produce / Cargo</div>
                      <div className="text-[11px] text-neutral-400">Market haulage</div>
                      <div className="text-emerald-400 font-mono mt-1 font-bold">₦2,000 base</div>
                    </button>
                  </div>
                </div>

                {/* Payment Method Selector */}
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                    Payment Method
                  </label>
                  <div className="flex items-center gap-4 text-xs">
                    <label className="flex items-center gap-2 cursor-pointer text-neutral-300">
                      <input
                        type="radio"
                        name="pay"
                        value="cash"
                        checked={paymentMethod === 'cash'}
                        onChange={() => setPaymentMethod('cash')}
                        className="text-emerald-500 focus:ring-emerald-500"
                      />
                      <span>Cash on Drop (Direct to Driver)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-neutral-300">
                      <input
                        type="radio"
                        name="pay"
                        value="paystack"
                        checked={paymentMethod === 'paystack'}
                        onChange={() => setPaymentMethod('paystack')}
                        className="text-emerald-500 focus:ring-emerald-500"
                      />
                      <span>Paystack / Bank Transfer</span>
                    </label>
                  </div>
                </div>

                {/* Live Estimated Breakdown */}
                {estimate && (
                  <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-neutral-400">Estimated Distance & Time</span>
                      <div className="text-neutral-200 font-medium">
                        {estimate.distanceKm} km · ~{estimate.durationMin} mins
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-neutral-400">Fare Quote</span>
                      <div className="text-xl font-bold text-emerald-400 font-mono">
                        ₦{estimate.estimatedFare?.toLocaleString()}
                      </div>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={bookingLoading}
                  className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-xl transition-all shadow-lg shadow-emerald-900/30 flex items-center justify-center gap-2"
                >
                  {bookingLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Broadcasting Request...</span>
                    </>
                  ) : (
                    <>
                      <span>Confirm & Request Ride</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* Interactive Live Map for Passenger */}
          <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 shadow-xl space-y-3">
            <div className="flex items-center justify-between text-xs text-neutral-300">
              <span className="font-semibold text-white">Live Route & Corridor Map</span>
              <span className="text-emerald-400">Shinkafi Urban Sector</span>
            </div>
            <ShinkafiMap
              pickupLat={activeRide ? activeRide.pickupLat : pickupLandmark.lat}
              pickupLng={activeRide ? activeRide.pickupLng : pickupLandmark.lng}
              destLat={activeRide ? activeRide.destLat : destLandmark.lat}
              destLng={activeRide ? activeRide.destLng : destLandmark.lng}
              driverLat={activeRide?.driver?.currentLat || 13.0795}
              driverLng={activeRide?.driver?.currentLng || 6.5210}
              onSelectLocation={(type, lm) => {
                if (type === 'pickup') setPickupLandmark(lm);
                if (type === 'destination') setDestLandmark(lm);
              }}
              height="h-72"
            />
          </div>
        </div>

        {/* Right Column: Ride History, Saved Spots, & Trip Safety */}
        <div className="lg:col-span-5 space-y-6">
          {/* Recent Trips & Rating trigger */}
          <div className="p-6 rounded-2xl bg-neutral-900 border border-neutral-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white tracking-tight">Recent Trips</h3>
              <span className="text-xs text-neutral-400">{ridesHistory.length} Total</span>
            </div>

            {ridesHistory.length === 0 ? (
              <div className="p-6 rounded-xl bg-neutral-950 text-center text-xs text-neutral-500">
                No past rides yet. Your completed journeys will appear here.
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                {ridesHistory.map((r) => (
                  <div key={r.id} className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs space-y-2">
                    <div className="flex items-center justify-between text-neutral-400">
                      <span className="font-mono">{new Date(r.createdAt).toLocaleDateString()}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-medium uppercase ${
                        r.status === 'completed' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-neutral-800 text-neutral-400'
                      }`}>
                        {r.status}
                      </span>
                    </div>

                    <div className="text-neutral-200">
                      <div className="font-medium truncate">{r.pickupAddress}</div>
                      <div className="text-neutral-500">to {r.destinationAddress}</div>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-neutral-900">
                      <span className="font-bold text-white font-mono">
                        ₦{(r.finalFare || r.estimatedFare).toLocaleString()}
                      </span>
                      {r.status === 'completed' && !r.passengerRating && (
                        <button
                          onClick={() => {
                            setRatingRideId(r.id);
                            setRatingModalOpen(true);
                          }}
                          className="text-amber-400 hover:text-amber-300 font-medium flex items-center gap-1"
                        >
                          <Star className="w-3 h-3" />
                          <span>Rate Driver</span>
                        </button>
                      )}
                      {r.passengerRating && (
                        <span className="text-amber-400 flex items-center gap-1 font-semibold">
                          <Star className="w-3 h-3 fill-amber-400" />
                          <span>{r.passengerRating} Stars</span>
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Shinkafi Safe Transit Notice */}
          <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-3 text-xs">
            <div className="flex items-center gap-2 text-amber-400 font-semibold">
              <Shield className="w-4 h-4" />
              <span>Shinkafi Transit Safety Guidelines</span>
            </div>
            <p className="text-neutral-400 leading-relaxed text-[11px]">
              1. Always verify the driver's vehicle plate number matches your app before entering.<br />
              2. Do not reveal your 4-digit trip OTP until you have physically verified the driver and are seated.<br />
              3. Inter-city night travel after 19:30 WAT requires security corridor routing.
            </p>
          </div>
        </div>
      </div>

      {/* Emergency Assistance SOS Modal */}
      {sosModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="max-w-md w-full bg-neutral-900 border border-rose-500/50 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-2 text-rose-400 font-bold text-base">
                <AlertTriangle className="w-5 h-5" />
                <span>Emergency Safety Assistance</span>
              </div>
              <button
                onClick={() => setSosModalOpen(false)}
                className="text-neutral-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {sosSentTicket ? (
              <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-600 space-y-3 text-xs">
                <div className="text-rose-300 font-semibold text-sm">
                  SOS Alert Dispatched to Safety Desk
                </div>
                <p className="text-neutral-300">
                  Ticket Number: <span className="font-mono font-bold text-white">{sosSentTicket}</span>
                </p>
                <p className="text-neutral-400 text-[11px]">
                  The ShinkafiRide rapid safety desk has received your coordinates and incident details.
                </p>
                <div className="pt-2 text-neutral-300 font-medium">
                  Direct Police Emergency Line: <br />
                  <span className="text-amber-400 font-mono text-sm">+234 803 123 4567</span>
                </div>
                <button
                  onClick={() => setSosModalOpen(false)}
                  className="w-full py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg mt-2"
                >
                  Close Window
                </button>
              </div>
            ) : (
              <div className="space-y-4 text-xs">
                <div className="p-3 rounded-lg bg-amber-950/30 border border-amber-800 text-amber-300 text-[11px]">
                  <strong>Notice:</strong> This button alerts the internal ShinkafiRide Safety & Incident Desk. For direct police intervention, you may also dial the Zamfara Police hotline directly.
                </div>

                <div>
                  <label className="block text-neutral-300 font-medium mb-1">
                    Describe Incident / Safety Concern:
                  </label>
                  <textarea
                    rows={3}
                    value={sosReason}
                    onChange={(e) => setSosReason(e.target.value)}
                    placeholder="e.g. Vehicle broke down in unsafe area / suspicious roadblocks on Galadi road..."
                    className="w-full px-3 py-2 rounded-lg bg-neutral-950 border border-neutral-700 text-white text-xs focus:ring-2 focus:ring-rose-500"
                  />
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={() => setSosModalOpen(false)}
                    className="w-1/2 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleTriggerSos}
                    disabled={sosSending}
                    className="w-1/2 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg flex items-center justify-center gap-2"
                  >
                    {sosSending ? 'Sending Alert...' : 'Dispatch SOS Alert'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Driver Rating Modal */}
      {ratingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="max-w-md w-full bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white">Rate Driver & Provide Feedback</h3>

            <div className="flex items-center justify-center gap-2 py-3">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setSelectedRating(star)}
                  className={`p-1.5 transition-transform hover:scale-125 ${
                    star <= selectedRating ? 'text-amber-400' : 'text-neutral-600'
                  }`}
                >
                  <Star className="w-7 h-7 fill-current" />
                </button>
              ))}
            </div>

            <div>
              <label className="block text-xs text-neutral-400 mb-1">Comments on driving, route safety & courtesy:</label>
              <textarea
                rows={3}
                value={ratingFeedback}
                onChange={(e) => setRatingFeedback(e.target.value)}
                placeholder="Driver was respectful, vehicle was clean and took safe route..."
                className="w-full px-3 py-2 rounded-lg bg-neutral-950 border border-neutral-700 text-white text-xs"
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setRatingModalOpen(false)}
                className="w-1/2 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs rounded-lg"
              >
                Skip
              </button>
              <button
                onClick={handleSubmitRating}
                className="w-1/2 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-lg"
              >
                Submit Rating
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
