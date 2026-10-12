import { Router, Response } from 'express';
import crypto from 'crypto';
import { db, Ride, RideStatus } from '../db.js';
import { AuthenticatedRequest, requireAuth } from '../auth.js';
import { calculateFare } from '../fareCalculator.js';

export const ridesRouter = Router();

// Calculate Fare Quote (Public & Authenticated)
ridesRouter.post('/estimate', (req, res): void => {
  const { category = 'keke_tricycle', pickupLat, pickupLng, destLat, destLng } = req.body;

  if (!pickupLat || !pickupLng || !destLat || !destLng) {
    res.status(400).json({ success: false, error: 'Pickup and destination coordinates are required.' });
    return;
  }

  const estimate = calculateFare(category, pickupLat, pickupLng, destLat, destLng);
  res.json({ success: true, estimate });
});

// GET Ride Details
ridesRouter.get('/:id', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const ride = db.rides.get(req.params.id);
  if (!ride) {
    res.status(404).json({ success: false, error: 'Trip not found.' });
    return;
  }

  // RBAC Ownership check: caller must be passenger, driver, operator, admin, or security officer
  const user = req.user!;
  if (
    user.role === 'passenger' && ride.passengerId !== user.id ||
    user.role === 'driver' && ride.driverId !== user.id
  ) {
    res.status(403).json({ success: false, error: 'Unauthorized to view this trip.' });
    return;
  }

  const driverProfile = ride.driverId ? db.driverProfiles.get(ride.driverId) : null;
  const driverUser = ride.driverId ? db.userProfiles.get(ride.driverId) : null;
  const vehicle = ride.vehicleId ? db.vehicles.get(ride.vehicleId) : null;
  const passengerUser = db.userProfiles.get(ride.passengerId);

  res.json({
    success: true,
    ride,
    passenger: passengerUser,
    driver: driverUser && driverProfile ? {
      fullName: driverUser.fullName,
      phone: db.users.get(ride.driverId!)?.phone,
      rating: driverProfile.rating,
      currentLat: driverProfile.currentLat,
      currentLng: driverProfile.currentLng,
      licenseNumber: driverProfile.licenseNumber
    } : null,
    vehicle: vehicle ? {
      make: vehicle.make,
      model: vehicle.model,
      plateNumber: vehicle.plateNumber,
      color: vehicle.color,
      category: vehicle.category
    } : null
  });
});

// POST Create Ride Request (Passenger)
ridesRouter.post('/', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const user = req.user!;
  if (user.role !== 'passenger' && user.role !== 'admin') {
    res.status(403).json({ success: false, error: 'Only passengers may request rides.' });
    return;
  }

  const {
    category = 'keke_tricycle',
    pickupAddress,
    pickupLat,
    pickupLng,
    destinationAddress,
    destLat,
    destLng,
    paymentMethod = 'cash'
  } = req.body;

  if (!pickupAddress || !destinationAddress || !pickupLat || !pickupLng || !destLat || !destLng) {
    res.status(400).json({ success: false, error: 'All pickup and destination fields are required.' });
    return;
  }

  // Server-side fare authority
  const fareCalc = calculateFare(category, pickupLat, pickupLng, destLat, destLng);

  // Generate 4-digit verification OTP
  const verificationOtp = Math.floor(1000 + Math.random() * 9000).toString();
  const rideId = `ride-${Date.now().toString(36)}-${Math.floor(100 + Math.random() * 900)}`;

  const newRide: Ride = {
    id: rideId,
    passengerId: user.id,
    serviceAreaId: 'area-shinkafi-urban',
    category,
    pickupAddress,
    pickupLat,
    pickupLng,
    destinationAddress,
    destLat,
    destLng,
    estimatedDistanceKm: fareCalc.distanceKm,
    estimatedDurationMin: fareCalc.durationMin,
    estimatedFare: fareCalc.estimatedFare,
    finalFare: fareCalc.estimatedFare,
    platformCommission: fareCalc.platformCommission,
    netDriverEarnings: fareCalc.driverEarnings,
    paymentMethod,
    paymentStatus: paymentMethod === 'cash' ? 'pending' : 'paid',
    verificationOtp,
    status: 'requested',
    createdAt: new Date().toISOString()
  };

  db.rides.set(rideId, newRide);
  db.rideStatusHistory.push({
    id: crypto.randomUUID(),
    rideId,
    fromStatus: 'draft',
    toStatus: 'requested',
    changedBy: user.id,
    notes: 'Passenger created trip request',
    timestamp: new Date().toISOString()
  });

  db.logAudit(user.id, user.role, 'RIDE_REQUESTED', 'ride', rideId, `Trip requested from ${pickupAddress} to ${destinationAddress} (₦${newRide.estimatedFare})`);

  res.status(201).json({
    success: true,
    ride: newRide,
    fareBreakdown: fareCalc
  });
});

// POST Cancel Ride
ridesRouter.post('/:id/cancel', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const ride = db.rides.get(req.params.id);
  if (!ride) {
    res.status(404).json({ success: false, error: 'Trip not found.' });
    return;
  }

  const user = req.user!;
  if (user.role === 'passenger' && ride.passengerId !== user.id) {
    res.status(403).json({ success: false, error: 'Unauthorized to cancel this trip.' });
    return;
  }

  if (ride.status === 'completed' || ride.status === 'cancelled') {
    res.status(400).json({ success: false, error: `Trip is already in ${ride.status} state.` });
    return;
  }

  const previousStatus = ride.status;
  ride.status = 'cancelled';
  ride.cancelledAt = new Date().toISOString();
  ride.cancelledBy = user.id;
  ride.cancellationReason = req.body.reason || 'Cancelled by user';

  db.rideStatusHistory.push({
    id: crypto.randomUUID(),
    rideId: ride.id,
    fromStatus: previousStatus,
    toStatus: 'cancelled',
    changedBy: user.id,
    notes: ride.cancellationReason,
    timestamp: new Date().toISOString()
  });

  db.logAudit(user.id, user.role, 'RIDE_CANCELLED', 'ride', ride.id, `Trip cancelled from status ${previousStatus}`);

  res.json({ success: true, message: 'Trip successfully cancelled.', ride });
});

// POST Rate Trip & Driver
ridesRouter.post('/:id/rating', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const ride = db.rides.get(req.params.id);
  if (!ride) {
    res.status(404).json({ success: false, error: 'Trip not found.' });
    return;
  }

  const { rating, feedback } = req.body;
  if (!rating || rating < 1 || rating > 5) {
    res.status(400).json({ success: false, error: 'Rating must be an integer between 1 and 5.' });
    return;
  }

  ride.passengerRating = Number(rating);
  ride.passengerFeedback = feedback || '';

  // Update Driver average rating
  if (ride.driverId) {
    const driverProfile = db.driverProfiles.get(ride.driverId);
    if (driverProfile) {
      driverProfile.totalTrips += 1;
      // Weighted moving average
      driverProfile.rating = Math.round(((driverProfile.rating * 0.8) + (rating * 0.2)) * 100) / 100;
    }
  }

  db.logAudit(req.user!.id, req.user!.role, 'RIDE_RATED', 'ride', ride.id, `Rated ${rating} stars`);

  res.json({ success: true, message: 'Rating recorded. Thank you for your feedback!' });
});
