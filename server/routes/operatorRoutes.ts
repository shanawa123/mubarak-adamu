import { Router, Response } from 'express';
import crypto from 'crypto';
import { db, Vehicle } from '../db.js';
import { AuthenticatedRequest, requireAuth, requireRole } from '../auth.js';

export const operatorRouter = Router();

// Operator Dashboard Stats
operatorRouter.get('/dashboard', requireAuth, requireRole('operator', 'admin'), (req: AuthenticatedRequest, res: Response): void => {
  const operatorId = req.user!.id;
  const profile = db.operatorProfiles.get(operatorId);

  // Operator Data Isolation: Filter strictly by operatorId
  const vehicles = Array.from(db.vehicles.values()).filter(v => v.operatorId === operatorId);
  const vehicleIds = new Set(vehicles.map(v => v.id));

  const drivers = Array.from(db.driverProfiles.values()).filter(d => d.operatorId === operatorId);
  const activeDrivers = drivers.filter(d => d.isOnline).length;

  const fleetRides = Array.from(db.rides.values()).filter(
    r => (r.vehicleId && vehicleIds.has(r.vehicleId)) || (r.driverId && drivers.some(d => d.userId === r.driverId))
  );

  const activeTrips = fleetRides.filter(r => ['driver_assigned', 'driver_arriving', 'driver_arrived', 'in_progress'].includes(r.status));
  const completedTrips = fleetRides.filter(r => r.status === 'completed');
  const cancelledTrips = fleetRides.filter(r => r.status === 'cancelled');

  const totalGrossRevenue = completedTrips.reduce((acc, r) => acc + (r.finalFare || r.estimatedFare), 0);
  const operatorRevenueShare = Math.round(totalGrossRevenue * 0.85); // 85% operator/driver share

  res.json({
    success: true,
    operator: profile,
    metrics: {
      totalVehicles: vehicles.length,
      activeDrivers,
      totalDrivers: drivers.length,
      activeTripsCount: activeTrips.length,
      completedTripsCount: completedTrips.length,
      cancelledTripsCount: cancelledTrips.length,
      totalGrossRevenue,
      operatorRevenueShare
    },
    activeTrips,
    recentCompleted: completedTrips.slice(0, 5)
  });
});

// Operator Vehicles List
operatorRouter.get('/vehicles', requireAuth, requireRole('operator', 'admin'), (req: AuthenticatedRequest, res: Response): void => {
  const operatorId = req.user!.id;
  const vehicles = Array.from(db.vehicles.values()).filter(v => v.operatorId === operatorId);

  // Enrich with assigned driver details
  const enriched = vehicles.map(v => {
    const driverUser = v.driverId ? db.userProfiles.get(v.driverId) : null;
    const driverProfile = v.driverId ? db.driverProfiles.get(v.driverId) : null;
    return {
      ...v,
      driverName: driverUser?.fullName || 'Unassigned',
      driverPhone: v.driverId ? db.users.get(v.driverId)?.phone : null,
      driverRating: driverProfile?.rating || null
    };
  });

  res.json({ success: true, vehicles: enriched });
});

// Add New Vehicle to Fleet
operatorRouter.post('/vehicles', requireAuth, requireRole('operator', 'admin'), (req: AuthenticatedRequest, res: Response): void => {
  const operatorId = req.user!.id;
  const { make, model, year, plateNumber, color, category, capacity, insuranceExpiry, roadworthinessExpiry } = req.body;

  if (!make || !model || !plateNumber) {
    res.status(400).json({ success: false, error: 'Vehicle make, model, and registration plate number are required.' });
    return;
  }

  // Check unique plate number
  const existing = Array.from(db.vehicles.values()).find(
    v => v.plateNumber.toUpperCase().trim() === plateNumber.toUpperCase().trim()
  );
  if (existing) {
    res.status(409).json({ success: false, error: 'A vehicle with this registration plate number already exists.' });
    return;
  }

  const vehicleId = `veh-${crypto.randomBytes(4).toString('hex')}`;
  const newVehicle: Vehicle = {
    id: vehicleId,
    operatorId,
    make,
    model,
    year: Number(year) || new Date().getFullYear(),
    plateNumber: plateNumber.toUpperCase().trim(),
    color: color || 'White',
    category: category || 'sedan',
    capacity: Number(capacity) || 4,
    status: 'active',
    insuranceExpiry: insuranceExpiry || '2027-12-31',
    roadworthinessExpiry: roadworthinessExpiry || '2027-12-31',
    createdAt: new Date().toISOString()
  };

  db.vehicles.set(vehicleId, newVehicle);
  const operatorProfile = db.operatorProfiles.get(operatorId);
  if (operatorProfile) {
    operatorProfile.totalVehicles += 1;
  }

  db.logAudit(operatorId, 'operator', 'VEHICLE_REGISTERED', 'vehicle', vehicleId, `Registered vehicle ${plateNumber}`);

  res.status(201).json({ success: true, message: 'Vehicle successfully added to fleet.', vehicle: newVehicle });
});

// Assign Driver to Vehicle
operatorRouter.post('/vehicles/:id/assign-driver', requireAuth, requireRole('operator', 'admin'), (req: AuthenticatedRequest, res: Response): void => {
  const operatorId = req.user!.id;
  const vehicle = db.vehicles.get(req.params.id);

  if (!vehicle) {
    res.status(404).json({ success: false, error: 'Vehicle not found.' });
    return;
  }

  // Isolation check
  if (vehicle.operatorId !== operatorId && req.user!.role !== 'admin') {
    res.status(403).json({ success: false, error: 'Unauthorized to modify another operator’s fleet.' });
    return;
  }

  const { driverId } = req.body;
  if (!driverId) {
    // Unassign driver
    if (vehicle.driverId) {
      const prevDriver = db.driverProfiles.get(vehicle.driverId);
      if (prevDriver) prevDriver.assignedVehicleId = undefined;
    }
    vehicle.driverId = undefined;
    res.json({ success: true, message: 'Driver unassigned from vehicle.', vehicle });
    return;
  }

  const driverProfile = db.driverProfiles.get(driverId);
  if (!driverProfile) {
    res.status(404).json({ success: false, error: 'Driver profile not found.' });
    return;
  }

  if (driverProfile.status !== 'approved') {
    res.status(400).json({ success: false, error: 'Driver application is not yet approved by platform admin.' });
    return;
  }

  vehicle.driverId = driverId;
  driverProfile.assignedVehicleId = vehicle.id;
  driverProfile.operatorId = operatorId;

  db.logAudit(operatorId, 'operator', 'DRIVER_ASSIGNED_TO_VEHICLE', 'vehicle', vehicle.id, `Assigned driver ${driverId} to vehicle ${vehicle.plateNumber}`);

  res.json({ success: true, message: 'Driver successfully assigned to vehicle.', vehicle });
});

// Operator Drivers List
operatorRouter.get('/drivers', requireAuth, requireRole('operator', 'admin'), (req: AuthenticatedRequest, res: Response): void => {
  const operatorId = req.user!.id;
  const drivers = Array.from(db.driverProfiles.values()).filter(d => d.operatorId === operatorId);

  const enriched = drivers.map(d => {
    const user = db.users.get(d.userId);
    const profile = db.userProfiles.get(d.userId);
    const vehicle = d.assignedVehicleId ? db.vehicles.get(d.assignedVehicleId) : null;
    return {
      userId: d.userId,
      fullName: profile?.fullName,
      phone: user?.phone,
      status: d.status,
      isOnline: d.isOnline,
      rating: d.rating,
      totalTrips: d.totalTrips,
      totalEarnings: d.totalEarnings,
      vehiclePlate: vehicle?.plateNumber || 'None'
    };
  });

  res.json({ success: true, drivers: enriched });
});
