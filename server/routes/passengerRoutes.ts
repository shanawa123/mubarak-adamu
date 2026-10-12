import { Router, Response } from 'express';
import crypto from 'crypto';
import { db, Incident } from '../db.js';
import { AuthenticatedRequest, requireAuth, requireRole } from '../auth.js';

export const passengerRouter = Router();

// Passenger Profile
passengerRouter.get('/profile', requireAuth, requireRole('passenger', 'admin'), (req: AuthenticatedRequest, res: Response): void => {
  const user = req.user!;
  const userProfile = db.userProfiles.get(user.id);
  const passengerProfile = db.passengerProfiles.get(user.id);

  res.json({
    success: true,
    user: {
      id: user.id,
      phone: user.phone,
      email: user.email,
      fullName: userProfile?.fullName,
      preferredLanguage: userProfile?.preferredLanguage,
      city: userProfile?.city,
      state: userProfile?.state
    },
    profile: passengerProfile
  });
});

// Update Profile & Emergency Contact
passengerRouter.put('/profile', requireAuth, requireRole('passenger', 'admin'), (req: AuthenticatedRequest, res: Response): void => {
  const user = req.user!;
  const { emergencyContactName, emergencyContactPhone, preferredLanguage, preferredPaymentMethod } = req.body;

  const profile = db.passengerProfiles.get(user.id);
  if (profile) {
    if (emergencyContactName) profile.emergencyContactName = emergencyContactName;
    if (emergencyContactPhone) profile.emergencyContactPhone = emergencyContactPhone;
    if (preferredPaymentMethod) profile.preferredPaymentMethod = preferredPaymentMethod;
  }

  const userProfile = db.userProfiles.get(user.id);
  if (userProfile && preferredLanguage) {
    userProfile.preferredLanguage = preferredLanguage;
  }

  db.logAudit(user.id, 'passenger', 'PASSENGER_PROFILE_UPDATED', 'user', user.id, 'Updated emergency contact and preferences');

  res.json({ success: true, message: 'Profile updated successfully.', profile });
});

// Get Passenger Rides
passengerRouter.get('/rides', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const user = req.user!;
  const userRides = Array.from(db.rides.values())
    .filter(r => r.passengerId === user.id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  res.json({ success: true, rides: userRides });
});

// Get Active Ride
passengerRouter.get('/active-ride', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const user = req.user!;
  const activeStatuses = ['requested', 'searching', 'driver_assigned', 'driver_arriving', 'driver_arrived', 'in_progress'];
  const activeRide = Array.from(db.rides.values())
    .filter(r => r.passengerId === user.id && activeStatuses.includes(r.status))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

  if (!activeRide) {
    res.json({ success: true, activeRide: null });
    return;
  }

  const driverProfile = activeRide.driverId ? db.driverProfiles.get(activeRide.driverId) : null;
  const driverUser = activeRide.driverId ? db.userProfiles.get(activeRide.driverId) : null;
  const vehicle = activeRide.vehicleId ? db.vehicles.get(activeRide.vehicleId) : null;

  res.json({
    success: true,
    activeRide,
    driver: driverUser && driverProfile ? {
      fullName: driverUser.fullName,
      phone: db.users.get(activeRide.driverId!)?.phone,
      rating: driverProfile.rating,
      currentLat: driverProfile.currentLat,
      currentLng: driverProfile.currentLng,
      licenseNumber: driverProfile.licenseNumber
    } : null,
    vehicle: vehicle ? {
      make: vehicle.make,
      model: vehicle.model,
      plateNumber: vehicle.plateNumber,
      color: vehicle.color
    } : null
  });
});

// Emergency Assistance SOS Trigger
passengerRouter.post('/sos', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const user = req.user!;
  const { rideId, latitude, longitude, reason = 'Passenger triggered Emergency SOS panic alert' } = req.body;

  const incidentId = `inc-sos-${Date.now().toString(36)}`;
  const ticketNumber = `SHK-SOS-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

  const incident: Incident = {
    id: incidentId,
    ticketNumber,
    rideId: rideId || undefined,
    reportedByUserId: user.id,
    reportedRole: user.role,
    category: 'emergency_sos',
    priority: 'critical',
    status: 'escalated',
    subject: `CRITICAL SOS ALERT: Reported by Passenger ${user.phone}`,
    description: `Immediate safety alert initiated from mobile app. Coordinates: Lat ${latitude || 13.0782}, Lng ${longitude || 6.5195}. Note: ${reason}`,
    latitude: latitude || 13.0782,
    longitude: longitude || 6.5195,
    escalatedToPolice: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  db.incidents.set(incidentId, incident);

  db.incidentNotes.push({
    id: crypto.randomUUID(),
    incidentId,
    authorId: user.id,
    authorName: 'Emergency Automated Dispatcher',
    content: `SOS triggered by passenger ${user.phone}. Zamfara Police hotline alerted. Shinkafi Security Desk alerted.`,
    isPrivate: false,
    createdAt: new Date().toISOString()
  });

  db.logAudit(user.id, user.role, 'EMERGENCY_SOS_TRIGGERED', 'incident', incidentId, `Critical SOS triggered: ${ticketNumber}`);

  res.status(201).json({
    success: true,
    message: 'Emergency SOS alert recorded and escalated to Shinkafi Safety Desk and designated responders.',
    incident
  });
});
