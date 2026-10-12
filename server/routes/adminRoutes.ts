import { Router, Response } from 'express';
import { db, UserRole, DriverStatus } from '../db.js';
import { AuthenticatedRequest, requireAuth, requireRole } from '../auth.js';

export const adminRouter = Router();

// Centralized Admin Dashboard Statistics (Pure real DB queries)
adminRouter.get('/dashboard', requireAuth, requireRole('admin'), (req: AuthenticatedRequest, res: Response): void => {
  const users = Array.from(db.users.values());
  const drivers = Array.from(db.driverProfiles.values());
  const operators = Array.from(db.operatorProfiles.values());
  const vehicles = Array.from(db.vehicles.values());
  const rides = Array.from(db.rides.values());
  const incidents = Array.from(db.incidents.values());

  const totalPassengers = users.filter(u => u.role === 'passenger').length;
  const totalDrivers = drivers.length;
  const approvedDrivers = drivers.filter(d => d.status === 'approved').length;
  const pendingDrivers = drivers.filter(d => d.status === 'pending').length;
  const registeredOperators = operators.length;
  const activeVehicles = vehicles.filter(v => v.status === 'active').length;

  const activeTrips = rides.filter(r => ['driver_assigned', 'driver_arriving', 'driver_arrived', 'in_progress'].includes(r.status)).length;
  const completedTrips = rides.filter(r => r.status === 'completed').length;
  const cancelledTrips = rides.filter(r => r.status === 'cancelled').length;

  const completedRidesList = rides.filter(r => r.status === 'completed');
  const grossTripVolume = completedRidesList.reduce((acc, r) => acc + (r.finalFare || r.estimatedFare), 0);
  const platformRevenue = completedRidesList.reduce((acc, r) => acc + r.platformCommission, 0);

  const openIncidents = incidents.filter(i => i.status !== 'resolved' && i.status !== 'closed').length;
  const criticalIncidents = incidents.filter(i => i.priority === 'critical' && i.status !== 'closed').length;

  res.json({
    success: true,
    metrics: {
      totalPassengers,
      totalDrivers,
      approvedDrivers,
      pendingDrivers,
      registeredOperators,
      activeVehicles,
      activeTrips,
      completedTrips,
      cancelledTrips,
      grossTripVolume,
      platformRevenue,
      openIncidents,
      criticalIncidents
    }
  });
});

// List Users with Filters
adminRouter.get('/users', requireAuth, requireRole('admin'), (req: AuthenticatedRequest, res: Response): void => {
  const { role, search } = req.query as { role?: string; search?: string };
  let usersList = Array.from(db.users.values());

  if (role && role !== 'all') {
    usersList = usersList.filter(u => u.role === role);
  }

  if (search) {
    const q = search.toLowerCase();
    usersList = usersList.filter(u => {
      const profile = db.userProfiles.get(u.id);
      return (
        u.phone.includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (profile && profile.fullName.toLowerCase().includes(q))
      );
    });
  }

  const enriched = usersList.map(u => ({
    id: u.id,
    phone: u.phone,
    email: u.email,
    role: u.role,
    isVerified: u.isVerified,
    isSuspended: u.isSuspended,
    suspensionReason: u.suspensionReason,
    createdAt: u.createdAt,
    profile: db.userProfiles.get(u.id)
  }));

  res.json({ success: true, users: enriched });
});

// Suspend / Reactivate User (Audited with Reason)
adminRouter.post('/users/:id/toggle-suspension', requireAuth, requireRole('admin'), (req: AuthenticatedRequest, res: Response): void => {
  const adminId = req.user!.id;
  const targetUser = db.users.get(req.params.id);

  if (!targetUser) {
    res.status(404).json({ success: false, error: 'User not found.' });
    return;
  }

  if (targetUser.role === 'admin' && targetUser.id === adminId) {
    res.status(400).json({ success: false, error: 'Administrators cannot suspend their own primary account.' });
    return;
  }

  const { isSuspended, reason } = req.body;
  if (isSuspended && !reason) {
    res.status(400).json({ success: false, error: 'A documented administrative reason is required to suspend an account.' });
    return;
  }

  targetUser.isSuspended = Boolean(isSuspended);
  targetUser.suspensionReason = isSuspended ? reason : undefined;
  targetUser.updatedAt = new Date().toISOString();

  const action = isSuspended ? 'USER_SUSPENDED' : 'USER_REACTIVATED';
  db.logAudit(adminId, 'admin', action, 'user', targetUser.id, `Account ${action}. Reason: ${reason || 'Administrative clearance'}`);

  res.json({
    success: true,
    message: `User successfully ${isSuspended ? 'suspended' : 'reactivated'}.`,
    user: { id: targetUser.id, isSuspended: targetUser.isSuspended, suspensionReason: targetUser.suspensionReason }
  });
});

// Pending Driver Verification Queue
adminRouter.get('/drivers/pending', requireAuth, requireRole('admin'), (req: AuthenticatedRequest, res: Response): void => {
  const drivers = Array.from(db.driverProfiles.values()).filter(d => d.status === 'pending' || d.status === 'under_review');

  const queue = drivers.map(d => {
    const user = db.users.get(d.userId);
    const profile = db.userProfiles.get(d.userId);
    const docs = Array.from(db.driverDocuments.values()).filter(doc => doc.driverId === d.userId);
    const vehicle = d.assignedVehicleId ? db.vehicles.get(d.assignedVehicleId) : null;

    return {
      driverId: d.userId,
      fullName: profile?.fullName,
      phone: user?.phone,
      email: user?.email,
      licenseNumber: d.licenseNumber,
      status: d.status,
      appliedAt: user?.createdAt,
      documents: docs,
      vehicle
    };
  });

  res.json({ success: true, pendingDrivers: queue });
});

// Approve Driver Application
adminRouter.post('/drivers/:id/approve', requireAuth, requireRole('admin'), (req: AuthenticatedRequest, res: Response): void => {
  const adminId = req.user!.id;
  const driverProfile = db.driverProfiles.get(req.params.id);

  if (!driverProfile) {
    res.status(404).json({ success: false, error: 'Driver profile not found.' });
    return;
  }

  const { notes = 'Approved after document verification and vetting.' } = req.body;
  driverProfile.status = 'approved';
  driverProfile.reviewedBy = adminId;
  driverProfile.reviewNotes = notes;
  driverProfile.reviewDate = new Date().toISOString();

  // Approve documents
  Array.from(db.driverDocuments.values())
    .filter(doc => doc.driverId === req.params.id)
    .forEach(doc => { doc.verificationStatus = 'verified'; });

  db.logAudit(adminId, 'admin', 'DRIVER_VERIFICATION_APPROVED', 'driver', req.params.id, `Driver application approved: ${notes}`);

  res.json({ success: true, message: 'Driver successfully approved.', driver: driverProfile });
});

// Reject Driver Application
adminRouter.post('/drivers/:id/reject', requireAuth, requireRole('admin'), (req: AuthenticatedRequest, res: Response): void => {
  const adminId = req.user!.id;
  const driverProfile = db.driverProfiles.get(req.params.id);

  if (!driverProfile) {
    res.status(404).json({ success: false, error: 'Driver profile not found.' });
    return;
  }

  const { reason } = req.body;
  if (!reason) {
    res.status(400).json({ success: false, error: 'A documented rejection reason is required.' });
    return;
  }

  driverProfile.status = 'rejected';
  driverProfile.reviewedBy = adminId;
  driverProfile.reviewNotes = reason;
  driverProfile.reviewDate = new Date().toISOString();

  db.logAudit(adminId, 'admin', 'DRIVER_VERIFICATION_REJECTED', 'driver', req.params.id, `Driver application rejected. Reason: ${reason}`);

  res.json({ success: true, message: 'Driver application rejected.', driver: driverProfile });
});

// Approve Operator
adminRouter.post('/operators/:id/approve', requireAuth, requireRole('admin'), (req: AuthenticatedRequest, res: Response): void => {
  const adminId = req.user!.id;
  const opProfile = db.operatorProfiles.get(req.params.id);

  if (!opProfile) {
    res.status(404).json({ success: false, error: 'Operator profile not found.' });
    return;
  }

  opProfile.isApproved = true;
  opProfile.approvedBy = adminId;
  opProfile.approvedAt = new Date().toISOString();

  db.logAudit(adminId, 'admin', 'OPERATOR_APPROVED', 'operator', req.params.id, `Transport operator ${opProfile.companyName} approved.`);

  res.json({ success: true, message: 'Operator organization approved.', operator: opProfile });
});

// List All Trips
adminRouter.get('/rides', requireAuth, requireRole('admin'), (req: AuthenticatedRequest, res: Response): void => {
  const rides = Array.from(db.rides.values())
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const enriched = rides.map(r => {
    const passenger = db.userProfiles.get(r.passengerId);
    const driver = r.driverId ? db.userProfiles.get(r.driverId) : null;
    const vehicle = r.vehicleId ? db.vehicles.get(r.vehicleId) : null;

    return {
      ...r,
      passengerName: passenger?.fullName || 'Passenger',
      driverName: driver?.fullName || 'Unassigned',
      vehiclePlate: vehicle?.plateNumber || 'None'
    };
  });

  res.json({ success: true, rides: enriched });
});

// Get Fare Rules
adminRouter.get('/fare-rules', requireAuth, requireRole('admin'), (req: AuthenticatedRequest, res: Response): void => {
  res.json({ success: true, fareRules: Array.from(db.fareRules.values()) });
});

// Update Fare Rule
adminRouter.post('/fare-rules', requireAuth, requireRole('admin'), (req: AuthenticatedRequest, res: Response): void => {
  const adminId = req.user!.id;
  const { category, baseFare, perKmRate, perMinuteRate, minimumFare, cancellationFee, commissionPercentage } = req.body;

  const rule = db.fareRules.get(category);
  if (!rule) {
    res.status(404).json({ success: false, error: 'Fare rule category not found.' });
    return;
  }

  if (baseFare !== undefined) rule.baseFare = Number(baseFare);
  if (perKmRate !== undefined) rule.perKmRate = Number(perKmRate);
  if (perMinuteRate !== undefined) rule.perMinuteRate = Number(perMinuteRate);
  if (minimumFare !== undefined) rule.minimumFare = Number(minimumFare);
  if (cancellationFee !== undefined) rule.cancellationFee = Number(cancellationFee);
  if (commissionPercentage !== undefined) rule.commissionPercentage = Number(commissionPercentage);

  db.logAudit(adminId, 'admin', 'FARE_RULE_UPDATED', 'fare_rule', category, `Updated fare rules for category ${category}`);

  res.json({ success: true, message: 'Fare rules updated successfully.', rule });
});

// Audit Logs
adminRouter.get('/audit-logs', requireAuth, requireRole('admin', 'security_officer'), (req: AuthenticatedRequest, res: Response): void => {
  res.json({ success: true, auditLogs: db.auditLogs.slice(0, 100) });
});
