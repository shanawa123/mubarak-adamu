import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ShinkafiMap } from '../map/ShinkafiMap';
import { Ride } from '../../types';
import {
  Car,
  Power,
  Navigation,
  CheckCircle2,
  AlertCircle,
  Clock,
  DollarSign,
  Star,
  MapPin,
  RefreshCw,
  Key,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';

export const DriverDashboard: React.FC = () => {
  const { user } = useAuth();
  const [driverProfile, setDriverProfile] = useState<any>(null);
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [activeRide, setActiveRide] = useState<Ride | null>(null);
  const [pendingRequests, setPendingRequests] = useState<Ride[]>([]);
  const [earnings, setEarnings] = useState<any>(null);
  const [otpInput, setOtpInput] = useState('');
  const [otpError, setOtpError] = useState('');
  const [loading, setLoading] = useState(false);

  // Fetch driver data, requests, and earnings
  const fetchDriverData = async () => {
    try {
      const [profRes, reqRes, earnRes] = await Promise.all([
        fetch('/api/driver/profile'),
        fetch('/api/driver/requests'),
        fetch('/api/driver/earnings')
      ]);
      const profData = await profRes.json();
      const reqData = await reqRes.json();
      const earnData = await earnRes.json();

      if (profData.success) {
        setDriverProfile(profData.profile);
        setIsOnline(profData.profile?.isOnline ?? true);
      }
      if (reqData.success) {
        const reqs = reqData.requests || [];
        const ongoing = reqs.find((r: Ride) => r.driverId === user?.id && !['completed', 'cancelled'].includes(r.status));
        setActiveRide(ongoing || null);
        setPendingRequests(reqs.filter((r: Ride) => r.status === 'requested'));
      }
      if (earnData.success) {
        setEarnings(earnData.summary);
      }
    } catch (err) {
      console.error('Error fetching driver state:', err);
    }
  };

  useEffect(() => {
    fetchDriverData();
    const interval = setInterval(fetchDriverData, 4000);
    return () => clearInterval(interval);
  }, []);

  // Toggle Online/Offline
  const handleToggleOnline = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/driver/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isOnline: !isOnline })
      });
      const data = await res.json();
      if (data.success) {
        setIsOnline(data.isOnline);
      } else {
        alert(data.error || 'Failed to toggle status');
      }
    } finally {
      setLoading(false);
    }
  };

  // Accept Ride Request
  const handleAcceptRide = async (rideId: string) => {
    try {
      const res = await fetch(`/api/driver/requests/${rideId}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (data.success) {
        setActiveRide(data.ride);
        await fetchDriverData();
      } else {
        alert(data.error || 'Failed to accept trip');
      }
    } catch (err) {
      console.error('Error accepting ride:', err);
    }
  };

  // Confirm Arrived at Pickup
  const handleConfirmArrived = async (rideId: string) => {
    try {
      const res = await fetch(`/api/driver/rides/${rideId}/arrived`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (data.success) {
        setActiveRide(data.ride);
      }
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  // Start Trip with OTP
  const handleStartTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRide) return;
    setOtpError('');
    try {
      const res = await fetch(`/api/driver/rides/${activeRide.id}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otp: otpInput })
      });
      const data = await res.json();
      if (data.success) {
        setActiveRide(data.ride);
        setOtpInput('');
      } else {
        setOtpError(data.error || 'Invalid OTP code');
      }
    } catch (err) {
      setOtpError('Error starting trip');
    }
  };

  // Complete Trip
  const handleCompleteTrip = async (rideId: string) => {
    try {
      const res = await fetch(`/api/driver/rides/${rideId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (data.success) {
        setActiveRide(null);
        await fetchDriverData();
      }
    } catch (err) {
      console.error('Error completing trip:', err);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-8">
      {/* Top Banner: Driver Status, Online Switch & Earnings Summary */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-neutral-900 border border-neutral-800">
        <div>
          <div className="flex items-center gap-2 text-xs">
            <span className={`px-2 py-0.5 rounded font-semibold text-[11px] uppercase ${
              driverProfile?.status === 'approved' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-amber-950 text-amber-400 border border-amber-800'
            }`}>
              Status: {driverProfile?.status || 'approved'}
            </span>
            <span className="text-neutral-500">·</span>
            <span className="text-neutral-400 font-mono">License: {driverProfile?.licenseNumber || 'FRSC-ZAM-99238410'}</span>
          </div>

          <h1 className="text-2xl font-bold text-white tracking-tight mt-1">
            Driver Partner: {user?.profile?.fullName || 'Aminu Garba Shinkafi'}
          </h1>
          <div className="flex items-center gap-3 text-xs text-neutral-400 mt-0.5">
            <span className="flex items-center gap-1 text-amber-400 font-semibold">
              <Star className="w-3.5 h-3.5 fill-amber-400" />
              <span>{driverProfile?.rating || 4.88} Driver Rating</span>
            </span>
            <span>·</span>
            <span>{driverProfile?.totalTrips || 148} Trips Completed</span>
          </div>
        </div>

        {/* Online / Offline Switch */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleToggleOnline}
            disabled={loading}
            className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all shadow-lg ${
              isOnline
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/40'
                : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700'
            }`}
          >
            <Power className="w-4 h-4" />
            <span>{isOnline ? 'Online (Accepting Rides)' : 'Offline (Paused)'}</span>
          </button>
        </div>
      </div>

      {/* Driver Financial KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800">
          <span className="text-xs text-neutral-400">Total Gross Fares</span>
          <div className="text-xl font-bold text-white font-mono mt-1">
            ₦{((earnings?.grossEarnings || 215400)).toLocaleString()}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800">
          <span className="text-xs text-neutral-400">Platform Commission (15%)</span>
          <div className="text-xl font-bold text-neutral-400 font-mono mt-1">
            ₦{((earnings?.totalCommission || 32310)).toLocaleString()}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800">
          <span className="text-xs text-neutral-400">Net Driver Payout (85%)</span>
          <div className="text-xl font-bold text-emerald-400 font-mono mt-1">
            ₦{((earnings?.netEarnings || 183090)).toLocaleString()}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800">
          <span className="text-xs text-neutral-400">Completed Trips</span>
          <div className="text-xl font-bold text-white font-mono mt-1">
            {earnings?.totalTrips || 148}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Active Trip Workflow or Incoming Requests */}
        <div className="lg:col-span-7 space-y-6">
          {activeRide ? (
            /* Active Trip Execution Card */
            <div className="p-6 rounded-2xl bg-neutral-900 border border-emerald-500/40 shadow-2xl space-y-6">
              <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
                <div>
                  <span className="text-xs text-neutral-400">Trip In Action</span>
                  <div className="text-sm font-mono font-bold text-white">{activeRide.id}</div>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-950 text-emerald-400 border border-emerald-800 uppercase">
                  {activeRide.status.replace('_', ' ')}
                </span>
              </div>

              {/* Step Flow */}
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2 text-xs">
                  <div className="flex items-center justify-between text-neutral-400">
                    <span>Passenger: Fatima Aliyu</span>
                    <span className="text-emerald-400 font-mono font-bold">₦{activeRide.estimatedFare} (Net: ₦{activeRide.netDriverEarnings})</span>
                  </div>
                  <div className="text-white font-medium">Pickup: {activeRide.pickupAddress}</div>
                  <div className="text-neutral-400">Destination: {activeRide.destinationAddress}</div>
                </div>

                {/* Stage 1: Driver Arriving -> Confirm Arrival */}
                {activeRide.status === 'driver_arriving' && (
                  <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-3">
                    <p className="text-xs text-neutral-300">
                      Navigate to passenger pickup point at <strong>{activeRide.pickupAddress}</strong>.
                    </p>
                    <button
                      onClick={() => handleConfirmArrived(activeRide.id)}
                      className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg transition-colors flex items-center justify-center gap-2"
                    >
                      <Navigation className="w-4 h-4" />
                      <span>Confirm I Have Arrived at Pickup</span>
                    </button>
                  </div>
                )}

                {/* Stage 2: Driver Arrived -> Enter OTP to Start Trip */}
                {activeRide.status === 'driver_arrived' && (
                  <div className="p-4 rounded-xl bg-neutral-950 border border-emerald-500/40 space-y-3">
                    <div className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                      <Key className="w-4 h-4" />
                      <span>Verify Passenger 4-Digit Code (OTP)</span>
                    </div>
                    <p className="text-xs text-neutral-400">
                      Ask the passenger for the 4-digit verification code displayed on their app to start the trip:
                    </p>

                    <form onSubmit={handleStartTrip} className="space-y-3">
                      <input
                        type="text"
                        maxLength={4}
                        value={otpInput}
                        onChange={(e) => setOtpInput(e.target.value)}
                        placeholder="Enter 4-digit OTP"
                        className="w-full px-3 py-2.5 rounded-lg bg-neutral-900 border border-neutral-700 text-center font-mono text-xl tracking-widest text-emerald-400 focus:ring-2 focus:ring-emerald-500"
                      />
                      {otpError && (
                        <div className="text-xs text-rose-400 font-medium">{otpError}</div>
                      )}
                      <button
                        type="submit"
                        className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-colors"
                      >
                        Verify OTP & Start Trip
                      </button>
                    </form>
                  </div>
                )}

                {/* Stage 3: In Progress -> Complete Trip */}
                {activeRide.status === 'in_progress' && (
                  <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-3">
                    <div className="text-xs text-emerald-400 font-semibold flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Trip In Progress to Destination</span>
                    </div>
                    <p className="text-xs text-neutral-400">
                      Take safe approved corridor to: <strong>{activeRide.destinationAddress}</strong>. Collect cash payment of ₦{activeRide.estimatedFare} upon arrival.
                    </p>
                    <button
                      onClick={() => handleCompleteTrip(activeRide.id)}
                      className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs rounded-xl shadow-lg transition-colors flex items-center justify-center gap-2"
                    >
                      <span>Complete Trip & Settle Earnings</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Pending Request Broadcast Queue */
            <div className="p-6 rounded-2xl bg-neutral-900 border border-neutral-800 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-white tracking-tight">Available Ride Requests</h2>
                  <p className="text-xs text-neutral-400 mt-0.5">Nearby passenger bookings in Shinkafi</p>
                </div>
                <span className="text-xs font-mono text-emerald-400">
                  {isOnline ? 'Scanning...' : 'Offline'}
                </span>
              </div>

              {!isOnline ? (
                <div className="p-8 rounded-xl bg-neutral-950 text-center text-xs text-neutral-500 space-y-2">
                  <p>You are currently Offline.</p>
                  <p>Click "Online" at the top to receive ride request broadcasts.</p>
                </div>
              ) : pendingRequests.length === 0 ? (
                <div className="p-8 rounded-xl bg-neutral-950 text-center text-xs text-neutral-500 space-y-2">
                  <RefreshCw className="w-5 h-5 text-neutral-600 animate-spin mx-auto" />
                  <p>No new ride requests right now in Shinkafi.</p>
                  <p className="text-neutral-400">New requests will sound and display here automatically.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingRequests.map((r) => (
                    <div key={r.id} className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 hover:border-emerald-500/50 transition-colors space-y-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-white uppercase">{r.category.replace('_', ' ')}</span>
                        <span className="text-emerald-400 font-mono font-bold text-sm">
                          ₦{r.estimatedFare} (You earn ₦{r.netDriverEarnings})
                        </span>
                      </div>

                      <div className="text-xs text-neutral-300 space-y-1">
                        <div>
                          <span className="text-neutral-500">From:</span> {r.pickupAddress}
                        </div>
                        <div>
                          <span className="text-neutral-500">To:</span> {r.destinationAddress}
                        </div>
                        <div className="text-[11px] text-neutral-400">
                          Distance: ~{r.estimatedDistanceKm} km · Pay: {r.paymentMethod}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 pt-2">
                        <button
                          onClick={() => handleAcceptRide(r.id)}
                          className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Accept Ride</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Interactive Live Map for Driver */}
          <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 shadow-xl space-y-2">
            <div className="flex items-center justify-between text-xs text-neutral-400">
              <span className="font-semibold text-white">Driver Navigation & Sector Overview</span>
              <span className="text-emerald-400 font-mono">GPS Signal: Optimal</span>
            </div>
            <ShinkafiMap
              pickupLat={activeRide?.pickupLat || 13.0780}
              pickupLng={activeRide?.pickupLng || 6.5200}
              destLat={activeRide?.destLat || 13.0845}
              destLng={activeRide?.destLng || 6.5255}
              driverLat={driverProfile?.currentLat || 13.0795}
              driverLng={driverProfile?.currentLng || 6.5210}
              height="h-64"
            />
          </div>
        </div>

        {/* Right Column: Vehicle Compliance, Regulatory & Documents */}
        <div className="lg:col-span-5 space-y-6">
          <div className="p-6 rounded-2xl bg-neutral-900 border border-neutral-800 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-white tracking-tight">Vehicle & Licence Compliance</h3>

            <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-neutral-400">Assigned Vehicle</span>
                <span className="font-mono font-bold text-white">Toyota Corolla (ZAM-442-SKA)</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-400">Transport Operator</span>
                <span className="text-neutral-200">Dan-Alhaji Fleet Ltd</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-400">FRSC Licence Expiry</span>
                <span className="text-emerald-400 font-mono">2027-11-20 (Valid)</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-400">Vehicle Insurance</span>
                <span className="text-emerald-400 font-mono">2027-02-15 (Valid)</span>
              </div>
            </div>

            <div className="p-3.5 rounded-lg bg-neutral-950 border border-neutral-800 text-[11px] text-neutral-400 space-y-1">
              <span className="font-semibold text-neutral-200">Zamfara Commercial Driver Vetting:</span>
              <p>
                Approved by Shinkafi Transport Union Elders and FRSC record verification. Keep physical license and vehicle papers inside the vehicle at all times.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
