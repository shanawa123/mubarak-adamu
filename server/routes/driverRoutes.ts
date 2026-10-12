import { Router, Response } from 'express';
import crypto from 'crypto';
import { db } from '../db.js';
import { AuthenticatedRequest, requireAuth, requireRole } from '../auth.js';

export const driverRouter = Router();

// Get Driver Profile & Vehicle
driverRouter.get('/profile', requireAuth, requireRole('driver', 'admin'), (req: AuthenticatedRequest, res: Response): void => {
  const driverId = req.user!.id;
  const profile = db.driverProfiles.get(driverId);
  const user = req.user!;
  const userProfile = db.userProfiles.get(driverId);
  const vehicle = profile?.assignedVehicleId ? db.vehicles.get(profile.assignedVehicleId) : null;
  const documents = Array.from(db.driverDocuments.values()).filter(d => d.driverId === driverId);

  res.json({
    success: true,
    user: {
      id: user.id,
      phone: user.phone,
      email: user.email,
      fullName: userProfile?.fullName,
      preferredLanguage: userProfile?.preferredLanguage
    },
    profile,
    vehicle,
    documents
  });
});

// Update Driver Online/Offline Availability
driverRouter.post('/availability', requireAuth, requireRole('driver', 'admin'), (req: AuthenticatedRequest, res: Response): void => {
  const driverId = req.user!.id;
  const profile = db.driverProfiles.get(driverId);

  if (!profile) {
    res.status(404).json({ success: false, error: 'Driver profile not found.' });
    return;
  }

  if (profile.status !== 'approved') {
    res.status(403).json({
      success: false,
      error: `Cannot go online. Your driver application status is '${profile.status}'. Only approved drivers can receive trip requests.`
    });
    return;
  }

  const { isOnline } = req.body;
  profile.isOnline = Boolean(isOnline);
  profile.lastLocationUpdate = new Date().toISOString();

  db.logAudit(driverId, 'driver', 'AVAILABILITY_CHANGED', 'driver', driverId, `Driver went ${profile.isOnline ? 'ONLINE' : 'OFFLINE'}`);

  res.json({
    success: true,
    isOnline: profile.isOnline,
    message: profile.isOnline ? 'You are now online and ready to receive requests.' : 'You are now offline.'
  });
});

// Update Location
driverRouter.post('/location', requireAuth, requireRole('driver', 'admin'), (req: AuthenticatedRequest, res: Response): void => {
  const driverId = req.user!.id;
  const profile = db.driverProfiles.get(driverId);

  if (!profile) {
    res.status(404).json({ success: false, error: 'Driver profile not found.' });
    return;
  }

  const { lat, lng } = req.body;
  if (typeof lat !== 'number' || typeof lng !== 'number') {
    res.status(400).json({ success: false, error: 'Valid latitude and longitude numbers are required.' });
    return;
  }

  // Plausibility check for Nigeria / Zamfara latitude roughly (4° to 14° N, 3° to 14° E)
  if (lat < 4 || lat > 15 || lng < 2 || lng > 15) {
    res.status(400).json({ success: false, error: 'Location coordinates outside allowable regional boundary.' });
    return;
  }

  profile.currentLat = lat;
  profile.currentLng = lng;
  profile.lastLocationUpdate = new Date().toISOString();

  res.json({ success: true, lat, lng });
});

// Get Available Ride Requests for Driver
driverRouter.get('/requests', requireAuth, requireRole('driver', 'admin'), (req: AuthenticatedRequest, res: Response): void => {
  const driverId = req.user!.id;
  const profile = db.driverProfiles.get(driverId);

  if (!profile || !profile.isOnline || profile.status !== 'approved') {
    res.json({ success: true, requests: [], message: 'Go online to view pending ride requests.' });
    return;
  }

  // Active or pending requests
  const requests = Array.from(db.rides.values())
    .filter(r => r.status === 'requested' || (r.driverId === driverId && !['completed', 'cancelled'].includes(r.status)))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  res.json({ success: true, requests });
});

// Driver Accepts Request (Concurrency Safe)
driverRouter.post('/requests/:id/accept', requireAuth, requireRole('driver', 'admin'), (req: AuthenticatedRequest, res: Response): void => {
  const driverId = req.user!.id;
  const ride = db.rides.get(req.params.id);

  if (!ride) {
    res.status(404).json({ success: false, error: 'Trip not found.' });
    return;
  }

  const profile = db.driverProfiles.get(driverId);
  if (!profile || profile.status !== 'approved') {
    res.status(403).json({ success: false, error: 'Only approved drivers can accept trips.' });
    return;
  }

  // Ensure driver is not already on an active trip
  const activeExisting = Array.from(db.rides.values()).find(
    r => r.driverId === driverId && ['driver_assigned', 'driver_arriving', 'driver_arrived', 'in_progress'].includes(r.status)
  );

  if (activeExisting) {
    res.status(409).json({
      success: false,
      error: `You already have an active trip #${activeExisting.id} in progress. Complete or cancel it first.`
    });
    return;
  }

  // Concurrency check: ride must be in 'requested' state
  if (ride.status !== 'requested') {
    res.status(409).json({
      success: false,
      error: 'This ride has already been accepted by another driver or cancelled.'
    });
    return;
  }

  ride.driverId = driverId;
  ride.vehicleId = profile.assignedVehicleId;
  ride.status = 'driver_arriving';
  ride.acceptedAt = new Date().toISOString();

  db.rideStatusHistory.push({
    id: crypto.randomUUID(),
    rideId: ride.id,
    fromStatus: 'requested',
    toStatus: 'driver_arriving',
    changedBy: driverId,
    notes: 'Driver accepted trip and is arriving at pickup location',
    timestamp: new Date().toISOString()
  });

  db.logAudit(driverId, 'driver', 'RIDE_ACCEPTED', 'ride', ride.id, `Driver accepted trip ${ride.id}`);

  res.json({ success: true, message: 'Trip accepted successfully.', ride });
});

// Driver Rejects Request
driverRouter.post('/requests/:id/reject', requireAuth, requireRole('driver', 'admin'), (req: AuthenticatedRequest, res: Response): void => {
  const driverId = req.user!.id;
  const ride = db.rides.get(req.params.id);

  if (!ride) {
    res.status(404).json({ success: false, error: 'Trip not found.' });
    return;
  }

  db.logAudit(driverId, 'driver', 'RIDE_REJECTED', 'ride', ride.id, 'Driver declined trip offer');
  res.json({ success: true, message: 'Request dismissed.' });
});

// Driver Confirms Arrival at Pickup
driverRouter.post('/rides/:id/arrived', requireAuth, requireRole('driver', 'admin'), (req: AuthenticatedRequest, res: Response): void => {
  const driverId = req.user!.id;
  const ride = db.rides.get(req.params.id);

  if (!ride) {
    res.status(404).json({ success: false, error: 'Trip not found.' });
    return;
  }

  if (ride.driverId !== driverId && req.user!.role !== 'admin') {
    res.status(403).json({ success: false, error: 'You are not assigned to this trip.' });
    return;
  }

  if (ride.status !== 'driver_arriving') {
    res.status(400).json({ success: false, error: `Invalid transition from ${ride.status} to driver_arrived.` });
    return;
  }

  ride.status = 'driver_arrived';
  ride.arrivedAt = new Date().toISOString();

  db.rideStatusHistory.push({
    id: crypto.randomUUID(),
    rideId: ride.id,
    fromStatus: 'driver_arriving',
    toStatus: 'driver_arrived',
    changedBy: driverId,
    notes: 'Driver reached passenger pickup location',
    timestamp: new Date().toISOString()
  });

  db.logAudit(driverId, 'driver', 'DRIVER_ARRIVED', 'ride', ride.id, 'Driver reached pickup point');

  res.json({ success: true, message: 'Arrival recorded. Awaiting passenger trip verification code.', ride });
});

// Driver Starts Trip (Requires OTP Verification)
driverRouter.post('/rides/:id/start', requireAuth, requireRole('driver', 'admin'), (req: AuthenticatedRequest, res: Response): void => {
  const driverId = req.user!.id;
  const ride = db.rides.get(req.params.id);

  if (!ride) {
    res.status(404).json({ success: false, error: 'Trip not found.' });
    return;
  }

  if (ride.driverId !== driverId && req.user!.role !== 'admin') {
    res.status(403).json({ success: false, error: 'You are not assigned to this trip.' });
    return;
  }

  const { otp } = req.body;
  if (!otp || otp !== ride.verificationOtp) {
    res.status(400).json({
      success: false,
      error: 'Invalid passenger verification code. Please request the 4-digit code shown on the passenger’s app.'
    });
    return;
  }

  ride.status = 'in_progress';
  ride.startedAt = new Date().toISOString();

  db.rideStatusHistory.push({
    id: crypto.randomUUID(),
    rideId: ride.id,
    fromStatus: 'driver_arrived',
    toStatus: 'in_progress',
    changedBy: driverId,
    notes: `Passenger OTP ${otp} verified. Trip in progress.`,
    timestamp: new Date().toISOString()
  });

  db.logAudit(driverId, 'driver', 'TRIP_STARTED', 'ride', ride.id, 'Trip started after successful OTP verification');

  res.json({ success: true, message: 'Trip successfully started.', ride });
});

// Driver Completes Trip
driverRouter.post('/rides/:id/complete', requireAuth, requireRole('driver', 'admin'), (req: AuthenticatedRequest, res: Response): void => {
  const driverId = req.user!.id;
  const ride = db.rides.get(req.params.id);

  if (!ride) {
    res.status(404).json({ success: false, error: 'Trip not found.' });
    return;
  }

  if (ride.driverId !== driverId && req.user!.role !== 'admin') {
    res.status(403).json({ success: false, error: 'You are not assigned to this trip.' });
    return;
  }

  if (ride.status !== 'in_progress') {
    res.status(400).json({ success: false, error: `Cannot complete trip currently in ${ride.status} state.` });
    return;
  }

  ride.status = 'completed';
  ride.completedAt = new Date().toISOString();
  ride.paymentStatus = 'paid';

  // Credit Driver earnings in database ledger
  const driverProfile = db.driverProfiles.get(driverId);
  if (driverProfile) {
    driverProfile.totalTrips += 1;
    driverProfile.totalEarnings += ride.netDriverEarnings;
  }

  // Record transaction ledger
  db.addTransaction(driverId, 'ride_fare', ride.netDriverEarnings, `Trip #${ride.id} completion payout`);
  db.addTransaction('platform', 'platform_commission', ride.platformCommission, `Trip #${ride.id} commission (15%)`);

  db.rideStatusHistory.push({
    id: crypto.randomUUID(),
    rideId: ride.id,
    fromStatus: 'in_progress',
    toStatus: 'completed',
    changedBy: driverId,
    notes: `Trip completed. Gross: ₦${ride.finalFare || ride.estimatedFare}, Net: ₦${ride.netDriverEarnings}`,
    timestamp: new Date().toISOString()
  });

  db.logAudit(driverId, 'driver', 'TRIP_COMPLETED', 'ride', ride.id, `Trip completed. Net earnings: ₦${ride.netDriverEarnings}`);

  res.json({ success: true, message: 'Trip marked as completed. Earnings credited.', ride });
});

// Get Driver Earnings & History
driverRouter.get('/earnings', requireAuth, requireRole('driver', 'admin'), (req: AuthenticatedRequest, res: Response): void => {
  const driverId = req.user!.id;
  const profile = db.driverProfiles.get(driverId);

  const completedRides = Array.from(db.rides.values())
    .filter(r => r.driverId === driverId && r.status === 'completed')
    .sort((a, b) => new Date(b.completedAt || b.createdAt).getTime() - new Date(a.completedAt || a.createdAt).getTime());

  const grossEarnings = completedRides.reduce((acc, r) => acc + (r.finalFare || r.estimatedFare), 0);
  const totalCommission = completedRides.reduce((acc, r) => acc + r.platformCommission, 0);
  const netEarnings = completedRides.reduce((acc, r) => acc + r.netDriverEarnings, 0);

  const transactions = db.transactions.filter(t => t.userId === driverId);

  res.json({
    success: true,
    summary: {
      totalTrips: completedRides.length,
      grossEarnings,
      totalCommission,
      netEarnings,
      currentBalance: profile ? profile.totalEarnings : netEarnings,
      rating: profile ? profile.rating : 5.0
    },
    trips: completedRides,
    transactions
  });
});
