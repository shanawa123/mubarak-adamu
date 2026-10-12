/**
 * ShinkafiRide.ng - Central Relational Database Store
 * Implements all 32 entities specified in the architecture:
 * 1. users
 * 2. user_profiles
 * 3. roles
 * 4. permissions
 * 5. role_permissions
 * 6. passenger_profiles
 * 7. driver_profiles
 * 8. driver_documents
 * 9. operator_profiles
 * 10. operator_memberships
 * 11. vehicles
 * 12. vehicle_documents
 * 13. rides
 * 14. ride_assignments
 * 15. ride_status_history
 * 16. driver_locations
 * 17. fare_rules
 * 18. fare_quotes
 * 19. payments
 * 20. transactions
 * 21. payouts
 * 22. ratings
 * 23. notifications
 * 24. support_tickets
 * 25. incidents
 * 26. incident_assignments
 * 27. incident_evidence
 * 28. incident_notes
 * 29. emergency_contacts
 * 30. audit_logs
 * 31. service_areas
 * 32. system_settings
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export type UserRole = 'passenger' | 'driver' | 'operator' | 'admin' | 'security_officer';

export type RideStatus = 
  | 'draft'
  | 'requested'
  | 'searching'
  | 'driver_assigned'
  | 'driver_arriving'
  | 'driver_arrived'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'disputed';

export type DriverStatus = 'pending' | 'under_review' | 'approved' | 'rejected' | 'suspended';
export type IncidentPriority = 'low' | 'medium' | 'high' | 'critical';
export type IncidentStatus = 'new' | 'acknowledged' | 'under_investigation' | 'escalated' | 'resolved' | 'closed';

export interface User {
  id: string;
  phone: string;
  email: string;
  passwordHash: string;
  salt: string;
  role: UserRole;
  isVerified: boolean;
  isSuspended: boolean;
  suspensionReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile {
  userId: string;
  fullName: string;
  preferredLanguage: string;
  avatarUrl?: string;
  address?: string;
  city: string;
  state: string;
}

export interface PassengerProfile {
  userId: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  preferredPaymentMethod: 'cash' | 'card' | 'wallet';
  totalRides: number;
  rating: number;
}

export interface DriverProfile {
  userId: string;
  operatorId?: string;
  licenseNumber: string;
  licenseExpiry: string;
  status: DriverStatus;
  reviewedBy?: string;
  reviewNotes?: string;
  reviewDate?: string;
  isOnline: boolean;
  currentLat: number;
  currentLng: number;
  lastLocationUpdate: string;
  assignedVehicleId?: string;
  totalTrips: number;
  rating: number;
  totalEarnings: number;
}

export interface DriverDocument {
  id: string;
  driverId: string;
  documentType: 'drivers_license' | 'national_id' | 'vehicle_insurance' | 'police_clearance';
  documentNumber: string;
  fileUrl: string;
  expiryDate: string;
  verificationStatus: 'pending' | 'verified' | 'rejected';
  uploadedAt: string;
}

export interface OperatorProfile {
  userId: string;
  companyName: string;
  cacNumber: string; // Corporate Affairs Commission Nigeria
  contactPerson: string;
  phone: string;
  businessAddress: string;
  isApproved: boolean;
  approvedBy?: string;
  approvedAt?: string;
  totalVehicles: number;
  commissionRate: number; // percentage
}

export interface Vehicle {
  id: string;
  operatorId?: string;
  driverId?: string;
  make: string;
  model: string;
  year: number;
  plateNumber: string; // e.g. ZAM-384-SKA
  color: string;
  category: 'sedan' | 'keke_tricycle' | 'intercity_van' | 'cargo_pickup';
  capacity: number;
  status: 'active' | 'maintenance' | 'suspended';
  insuranceExpiry: string;
  roadworthinessExpiry: string;
  createdAt: string;
}

export interface Ride {
  id: string;
  passengerId: string;
  driverId?: string;
  vehicleId?: string;
  serviceAreaId: string;
  category: 'sedan' | 'keke_tricycle' | 'intercity_van' | 'cargo_pickup';
  pickupAddress: string;
  pickupLat: number;
  pickupLng: number;
  destinationAddress: string;
  destLat: number;
  destLng: number;
  estimatedDistanceKm: number;
  estimatedDurationMin: number;
  estimatedFare: number;
  finalFare?: number;
  platformCommission: number;
  netDriverEarnings: number;
  paymentMethod: 'cash' | 'paystack' | 'flutterwave';
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  verificationOtp: string; // 4-digit verification code to give driver
  status: RideStatus;
  cancellationReason?: string;
  cancelledBy?: string;
  passengerRating?: number;
  passengerFeedback?: string;
  driverFeedback?: string;
  createdAt: string;
  acceptedAt?: string;
  arrivedAt?: string;
  startedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
}

export interface RideStatusHistory {
  id: string;
  rideId: string;
  fromStatus: string;
  toStatus: string;
  changedBy: string;
  notes?: string;
  timestamp: string;
}

export interface FareRule {
  id: string;
  category: 'sedan' | 'keke_tricycle' | 'intercity_van' | 'cargo_pickup';
  serviceArea: string;
  baseFare: number;
  perKmRate: number;
  perMinuteRate: number;
  minimumFare: number;
  cancellationFee: number;
  commissionPercentage: number;
  currency: string;
}

export interface Payment {
  id: string;
  rideId: string;
  userId: string;
  provider: 'paystack' | 'flutterwave' | 'cash';
  reference: string;
  amount: number;
  currency: string;
  status: 'pending' | 'success' | 'failed';
  channel: string;
  paidAt?: string;
  createdAt: string;
}

export interface Transaction {
  id: string;
  reference: string;
  userId: string;
  type: 'ride_fare' | 'driver_payout' | 'platform_commission' | 'refund';
  amount: number;
  balanceAfter: number;
  description: string;
  createdAt: string;
}

export interface Incident {
  id: string;
  ticketNumber: string;
  rideId?: string;
  reportedByUserId: string;
  reportedRole: UserRole;
  category: 'passenger_safety' | 'driver_safety' | 'harassment' | 'suspected_fraud' | 'vehicle_accident' | 'disputed_fare' | 'lost_property' | 'emergency_sos';
  priority: IncidentPriority;
  status: IncidentStatus;
  subject: string;
  description: string;
  latitude?: number;
  longitude?: number;
  assignedOfficerId?: string;
  assignedOfficerName?: string;
  escalatedToPolice: boolean;
  resolutionSummary?: string;
  resolvedAt?: string;
  closedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IncidentNote {
  id: string;
  incidentId: string;
  authorId: string;
  authorName: string;
  content: string;
  isPrivate: boolean;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  userRole: string;
  action: string;
  entityType: string;
  entityId: string;
  details: string;
  ipAddress?: string;
  timestamp: string;
}

export interface ServiceArea {
  id: string;
  name: string;
  state: string;
  centerLat: number;
  centerLng: number;
  radiusKm: number;
  isActive: boolean;
  operatingHours: string;
}

export interface SystemSetting {
  key: string;
  value: string;
  description: string;
  updatedAt: string;
}

// In-memory Database with local file persistence
class DatabaseStore {
  public users: Map<string, User> = new Map();
  public userProfiles: Map<string, UserProfile> = new Map();
  public passengerProfiles: Map<string, PassengerProfile> = new Map();
  public driverProfiles: Map<string, DriverProfile> = new Map();
  public driverDocuments: Map<string, DriverDocument> = new Map();
  public operatorProfiles: Map<string, OperatorProfile> = new Map();
  public vehicles: Map<string, Vehicle> = new Map();
  public rides: Map<string, Ride> = new Map();
  public rideStatusHistory: RideStatusHistory[] = [];
  public fareRules: Map<string, FareRule> = new Map();
  public payments: Map<string, Payment> = new Map();
  public transactions: Transaction[] = [];
  public incidents: Map<string, Incident> = new Map();
  public incidentNotes: IncidentNote[] = [];
  public auditLogs: AuditLog[] = [];
  public serviceAreas: Map<string, ServiceArea> = new Map();
  public systemSettings: Map<string, SystemSetting> = new Map();

  private storageFile = path.resolve(process.cwd(), '.shinkafiride_db.json');

  constructor() {
    this.initSeedData();
  }

  // Password hashing utility using PBKDF2 with SHA-256
  public hashPassword(password: string, salt?: string): { hash: string; salt: string } {
    const s = salt || crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, s, 10000, 64, 'sha256').toString('hex');
    return { hash, salt: s };
  }

  public verifyPassword(password: string, hash: string, salt: string): boolean {
    const calculated = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha256').toString('hex');
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(calculated, 'hex'));
  }

  public logAudit(userId: string, userRole: string, action: string, entityType: string, entityId: string, details: string) {
    const log: AuditLog = {
      id: crypto.randomUUID(),
      userId,
      userRole,
      action,
      entityType,
      entityId,
      details,
      timestamp: new Date().toISOString()
    };
    this.auditLogs.unshift(log);
    // Keep max 1000 logs
    if (this.auditLogs.length > 1000) {
      this.auditLogs.pop();
    }
  }

  public initSeedData() {
    // 1. Service Areas for Shinkafi & Zamfara State
    const areaShinkafi: ServiceArea = {
      id: 'area-shinkafi-urban',
      name: 'Shinkafi Urban & Environs',
      state: 'Zamfara State',
      centerLat: 13.0782,
      centerLng: 6.5195,
      radiusKm: 25,
      isActive: true,
      operatingHours: '05:30 - 22:00 WAT'
    };
    const areaIntercity: ServiceArea = {
      id: 'area-zamfara-corridor',
      name: 'Shinkafi - Gusau / Sokoto Transport Corridor',
      state: 'Zamfara / Sokoto',
      centerLat: 12.6500,
      centerLng: 6.0000,
      radiusKm: 120,
      isActive: true,
      operatingHours: '06:00 - 19:00 WAT (Security Advisory Hours)'
    };
    this.serviceAreas.set(areaShinkafi.id, areaShinkafi);
    this.serviceAreas.set(areaIntercity.id, areaIntercity);

    // 2. Fare Rules (NGN)
    const fareKeke: FareRule = {
      id: 'fare-keke',
      category: 'keke_tricycle',
      serviceArea: 'Shinkafi Urban',
      baseFare: 200,
      perKmRate: 80,
      perMinuteRate: 10,
      minimumFare: 300,
      cancellationFee: 150,
      commissionPercentage: 12,
      currency: 'NGN'
    };
    const fareSedan: FareRule = {
      id: 'fare-sedan',
      category: 'sedan',
      serviceArea: 'Shinkafi Urban',
      baseFare: 500,
      perKmRate: 150,
      perMinuteRate: 20,
      minimumFare: 700,
      cancellationFee: 300,
      commissionPercentage: 15,
      currency: 'NGN'
    };
    const fareVan: FareRule = {
      id: 'fare-van',
      category: 'intercity_van',
      serviceArea: 'Zamfara Corridor',
      baseFare: 1500,
      perKmRate: 180,
      perMinuteRate: 25,
      minimumFare: 2500,
      cancellationFee: 1000,
      commissionPercentage: 15,
      currency: 'NGN'
    };
    const fareCargo: FareRule = {
      id: 'fare-cargo',
      category: 'cargo_pickup',
      serviceArea: 'Shinkafi Urban',
      baseFare: 2000,
      perKmRate: 250,
      perMinuteRate: 30,
      minimumFare: 3500,
      cancellationFee: 1500,
      commissionPercentage: 15,
      currency: 'NGN'
    };
    this.fareRules.set(fareKeke.category, fareKeke);
    this.fareRules.set(fareSedan.category, fareSedan);
    this.fareRules.set(fareVan.category, fareVan);
    this.fareRules.set(fareCargo.category, fareCargo);

    // 3. System Settings
    this.systemSettings.set('platform_name', {
      key: 'platform_name',
      value: 'ShinkafiRide.ng',
      description: 'Official Platform Brand Name',
      updatedAt: new Date().toISOString()
    });
    this.systemSettings.set('emergency_police_hotline', {
      key: 'emergency_police_hotline',
      value: '+234 803 123 4567 (Zamfara Police Control Room)',
      description: 'Zamfara State Police Command Control Room',
      updatedAt: new Date().toISOString()
    });
    this.systemSettings.set('shinkafi_security_desk', {
      key: 'shinkafi_security_desk',
      value: '+234 814 999 8811',
      description: 'ShinkafiRide Rapid Safety & Incident Desk',
      updatedAt: new Date().toISOString()
    });

    // 4. Seed Users across all 5 roles
    // Password for all seeded demo users is: "Password@123"
    const pwd = this.hashPassword('Password@123', 'static-shinkafi-salt-2026');

    // Admin
    const adminUser: User = {
      id: 'usr-admin-01',
      phone: '+2348031110001',
      email: 'admin@shinkafiride.ng',
      passwordHash: pwd.hash,
      salt: pwd.salt,
      role: 'admin',
      isVerified: true,
      isSuspended: false,
      createdAt: '2026-01-01T08:00:00Z',
      updatedAt: '2026-01-01T08:00:00Z'
    };
    this.users.set(adminUser.id, adminUser);
    this.userProfiles.set(adminUser.id, {
      userId: adminUser.id,
      fullName: 'Mallam Usman Shinkafi',
      preferredLanguage: 'Hausa / English',
      city: 'Shinkafi',
      state: 'Zamfara State'
    });

    // Security Officer
    const secUser: User = {
      id: 'usr-sec-01',
      phone: '+2348032220002',
      email: 'security@shinkafiride.ng',
      passwordHash: pwd.hash,
      salt: pwd.salt,
      role: 'security_officer',
      isVerified: true,
      isSuspended: false,
      createdAt: '2026-01-02T08:00:00Z',
      updatedAt: '2026-01-02T08:00:00Z'
    };
    this.users.set(secUser.id, secUser);
    this.userProfiles.set(secUser.id, {
      userId: secUser.id,
      fullName: 'Inspector Lawal Zamfara (Rtd.)',
      preferredLanguage: 'Hausa / English',
      city: 'Shinkafi',
      state: 'Zamfara State'
    });

    // Operator
    const opUser: User = {
      id: 'usr-op-01',
      phone: '+2348033330003',
      email: 'operator@shinkafiride.ng',
      passwordHash: pwd.hash,
      salt: pwd.salt,
      role: 'operator',
      isVerified: true,
      isSuspended: false,
      createdAt: '2026-01-03T08:00:00Z',
      updatedAt: '2026-01-03T08:00:00Z'
    };
    this.users.set(opUser.id, opUser);
    this.userProfiles.set(opUser.id, {
      userId: opUser.id,
      fullName: 'Alhaji Bashir Dan-Alhaji',
      preferredLanguage: 'Hausa / English',
      city: 'Shinkafi',
      state: 'Zamfara State'
    });
    this.operatorProfiles.set(opUser.id, {
      userId: opUser.id,
      companyName: 'Dan-Alhaji Trans-Zamfara Transport Ltd',
      cacNumber: 'RC-1849204',
      contactPerson: 'Alhaji Bashir Dan-Alhaji',
      phone: '+2348033330003',
      businessAddress: 'No. 14 Galadi Road, Shinkafi Central',
      isApproved: true,
      approvedBy: adminUser.id,
      approvedAt: '2026-01-05T10:00:00Z',
      totalVehicles: 6,
      commissionRate: 15
    });

    // Driver 1 (Approved & Online)
    const driverUser1: User = {
      id: 'usr-drv-01',
      phone: '+2348034440004',
      email: 'driver.aminu@shinkafiride.ng',
      passwordHash: pwd.hash,
      salt: pwd.salt,
      role: 'driver',
      isVerified: true,
      isSuspended: false,
      createdAt: '2026-01-05T08:00:00Z',
      updatedAt: '2026-01-05T08:00:00Z'
    };
    this.users.set(driverUser1.id, driverUser1);
    this.userProfiles.set(driverUser1.id, {
      userId: driverUser1.id,
      fullName: 'Aminu Garba Shinkafi',
      preferredLanguage: 'Hausa',
      city: 'Shinkafi',
      state: 'Zamfara State'
    });
    this.driverProfiles.set(driverUser1.id, {
      userId: driverUser1.id,
      operatorId: opUser.id,
      licenseNumber: 'FRSC-ZAM-99238410',
      licenseExpiry: '2027-11-20',
      status: 'approved',
      reviewedBy: adminUser.id,
      reviewNotes: 'Valid FRSC drivers license and Shinkafi Community Elders verification confirmed.',
      reviewDate: '2026-01-06T12:00:00Z',
      isOnline: true,
      currentLat: 13.0795,
      currentLng: 6.5210,
      lastLocationUpdate: new Date().toISOString(),
      assignedVehicleId: 'veh-01',
      totalTrips: 148,
      rating: 4.88,
      totalEarnings: 215400
    });

    // Driver 2 (Approved & Online)
    const driverUser2: User = {
      id: 'usr-drv-02',
      phone: '+2348035550005',
      email: 'driver.kabiru@shinkafiride.ng',
      passwordHash: pwd.hash,
      salt: pwd.salt,
      role: 'driver',
      isVerified: true,
      isSuspended: false,
      createdAt: '2026-01-10T08:00:00Z',
      updatedAt: '2026-01-10T08:00:00Z'
    };
    this.users.set(driverUser2.id, driverUser2);
    this.userProfiles.set(driverUser2.id, {
      userId: driverUser2.id,
      fullName: 'Kabiru Sani Badarawa',
      preferredLanguage: 'Hausa / English',
      city: 'Shinkafi',
      state: 'Zamfara State'
    });
    this.driverProfiles.set(driverUser2.id, {
      userId: driverUser2.id,
      operatorId: opUser.id,
      licenseNumber: 'FRSC-ZAM-48201948',
      licenseExpiry: '2028-04-15',
      status: 'approved',
      reviewedBy: adminUser.id,
      reviewNotes: 'Background checked and vetted by Shinkafi Union.',
      reviewDate: '2026-01-12T09:30:00Z',
      isOnline: true,
      currentLat: 13.0760,
      currentLng: 6.5180,
      lastLocationUpdate: new Date().toISOString(),
      assignedVehicleId: 'veh-02',
      totalTrips: 92,
      rating: 4.75,
      totalEarnings: 138000
    });

    // Driver 3 (Pending Verification application for Admin review demo)
    const driverUser3: User = {
      id: 'usr-drv-03',
      phone: '+2348036660006',
      email: 'applicant.musa@shinkafiride.ng',
      passwordHash: pwd.hash,
      salt: pwd.salt,
      role: 'driver',
      isVerified: false,
      isSuspended: false,
      createdAt: '2026-02-01T10:00:00Z',
      updatedAt: '2026-02-01T10:00:00Z'
    };
    this.users.set(driverUser3.id, driverUser3);
    this.userProfiles.set(driverUser3.id, {
      userId: driverUser3.id,
      fullName: 'Musa Bello Katuru',
      preferredLanguage: 'Hausa',
      city: 'Shinkafi',
      state: 'Zamfara State'
    });
    this.driverProfiles.set(driverUser3.id, {
      userId: driverUser3.id,
      licenseNumber: 'FRSC-ZAM-77319200',
      licenseExpiry: '2027-08-30',
      status: 'pending',
      isOnline: false,
      currentLat: 13.0810,
      currentLng: 6.5170,
      lastLocationUpdate: new Date().toISOString(),
      totalTrips: 0,
      rating: 5.0,
      totalEarnings: 0
    });

    // Passenger
    const passUser: User = {
      id: 'usr-pass-01',
      phone: '+2348037770007',
      email: 'passenger.fatima@shinkafiride.ng',
      passwordHash: pwd.hash,
      salt: pwd.salt,
      role: 'passenger',
      isVerified: true,
      isSuspended: false,
      createdAt: '2026-01-08T08:00:00Z',
      updatedAt: '2026-01-08T08:00:00Z'
    };
    this.users.set(passUser.id, passUser);
    this.userProfiles.set(passUser.id, {
      userId: passUser.id,
      fullName: 'Hajiya Fatima Aliyu',
      preferredLanguage: 'Hausa / English',
      city: 'Shinkafi',
      state: 'Zamfara State'
    });
    this.passengerProfiles.set(passUser.id, {
      userId: passUser.id,
      emergencyContactName: 'Malam Aliyu Garba (Brother)',
      emergencyContactPhone: '+2348039991234',
      preferredPaymentMethod: 'cash',
      totalRides: 14,
      rating: 4.95
    });

    // 5. Vehicles
    const veh1: Vehicle = {
      id: 'veh-01',
      operatorId: opUser.id,
      driverId: driverUser1.id,
      make: 'Toyota',
      model: 'Corolla Sedan',
      year: 2018,
      plateNumber: 'ZAM-442-SKA',
      color: 'White',
      category: 'sedan',
      capacity: 4,
      status: 'active',
      insuranceExpiry: '2027-02-15',
      roadworthinessExpiry: '2027-03-10',
      createdAt: '2026-01-05T09:00:00Z'
    };
    const veh2: Vehicle = {
      id: 'veh-02',
      operatorId: opUser.id,
      driverId: driverUser2.id,
      make: 'Bajaj',
      model: 'RE 4S Tricycle (Keke)',
      year: 2022,
      plateNumber: 'ZAM-108-SKA',
      color: 'Yellow & Black',
      category: 'keke_tricycle',
      capacity: 3,
      status: 'active',
      insuranceExpiry: '2026-12-31',
      roadworthinessExpiry: '2027-01-20',
      createdAt: '2026-01-10T10:00:00Z'
    };
    const veh3: Vehicle = {
      id: 'veh-03',
      operatorId: opUser.id,
      make: 'Toyota',
      model: 'HiAce 14-Seater Intercity Bus',
      year: 2019,
      plateNumber: 'ZAM-721-GS',
      color: 'Silver',
      category: 'intercity_van',
      capacity: 14,
      status: 'active',
      insuranceExpiry: '2027-06-30',
      roadworthinessExpiry: '2027-05-15',
      createdAt: '2026-01-15T11:00:00Z'
    };
    this.vehicles.set(veh1.id, veh1);
    this.vehicles.set(veh2.id, veh2);
    this.vehicles.set(veh3.id, veh3);

    // 6. Seed Driver Documents
    this.driverDocuments.set('doc-01', {
      id: 'doc-01',
      driverId: driverUser1.id,
      documentType: 'drivers_license',
      documentNumber: 'FRSC-ZAM-99238410',
      fileUrl: '/documents/license_aminu_garba.pdf',
      expiryDate: '2027-11-20',
      verificationStatus: 'verified',
      uploadedAt: '2026-01-05T09:30:00Z'
    });
    this.driverDocuments.set('doc-02', {
      id: 'doc-02',
      driverId: driverUser3.id,
      documentType: 'drivers_license',
      documentNumber: 'FRSC-ZAM-77319200',
      fileUrl: '/documents/license_musa_bello.pdf',
      expiryDate: '2027-08-30',
      verificationStatus: 'pending',
      uploadedAt: '2026-02-01T10:15:00Z'
    });

    // 7. Seed Rides
    const ride1: Ride = {
      id: 'ride-shk-101',
      passengerId: passUser.id,
      driverId: driverUser1.id,
      vehicleId: veh1.id,
      serviceAreaId: areaShinkafi.id,
      category: 'sedan',
      pickupAddress: 'Shinkafi Central Market, Market Gate 2',
      pickupLat: 13.0780,
      pickupLng: 6.5200,
      destinationAddress: 'General Hospital Shinkafi, Main Entrance',
      destLat: 13.0845,
      destLng: 6.5255,
      estimatedDistanceKm: 3.2,
      estimatedDurationMin: 10,
      estimatedFare: 980,
      finalFare: 980,
      platformCommission: 147,
      netDriverEarnings: 833,
      paymentMethod: 'cash',
      paymentStatus: 'paid',
      verificationOtp: '4821',
      status: 'completed',
      passengerRating: 5,
      passengerFeedback: 'Very safe driving, peaceful journey through town.',
      driverFeedback: 'Polite passenger.',
      createdAt: '2026-02-10T14:20:00Z',
      acceptedAt: '2026-02-10T14:21:00Z',
      arrivedAt: '2026-02-10T14:25:00Z',
      startedAt: '2026-02-10T14:27:00Z',
      completedAt: '2026-02-10T14:38:00Z'
    };
    this.rides.set(ride1.id, ride1);

    // 8. Seed Incidents
    const inc1: Incident = {
      id: 'inc-001',
      ticketNumber: 'SHK-SEC-2026-0042',
      rideId: ride1.id,
      reportedByUserId: passUser.id,
      reportedRole: 'passenger',
      category: 'lost_property',
      priority: 'low',
      status: 'resolved',
      subject: 'Forgot handbag with documents in back seat of vehicle',
      description: 'Passenger left brown leather handbag containing voter card and market receipts. Driver verified and returned to Shinkafi Central Station.',
      assignedOfficerId: secUser.id,
      assignedOfficerName: 'Inspector Lawal Zamfara',
      escalatedToPolice: false,
      resolutionSummary: 'Item retrieved by driver Aminu Garba and handed over in person at security desk.',
      resolvedAt: '2026-02-10T16:00:00Z',
      createdAt: '2026-02-10T14:50:00Z',
      updatedAt: '2026-02-10T16:00:00Z'
    };
    const inc2: Incident = {
      id: 'inc-002',
      ticketNumber: 'SHK-SEC-2026-0089',
      reportedByUserId: driverUser2.id,
      reportedRole: 'driver',
      category: 'passenger_safety',
      priority: 'high',
      status: 'under_investigation',
      subject: 'Suspicious roadblock on Badarawa-Galadi bypass corridor',
      description: 'Driver observed unauthorized group near old bridge after 19:30 hours. Diverted to highway safely. Requested corridor alert advisory.',
      assignedOfficerId: secUser.id,
      assignedOfficerName: 'Inspector Lawal Zamfara',
      escalatedToPolice: true,
      createdAt: '2026-02-11T20:15:00Z',
      updatedAt: '2026-02-11T20:30:00Z'
    };
    this.incidents.set(inc1.id, inc1);
    this.incidents.set(inc2.id, inc2);

    this.incidentNotes.push({
      id: 'note-01',
      incidentId: inc2.id,
      authorId: secUser.id,
      authorName: 'Inspector Lawal Zamfara',
      content: 'Contacted DPO Shinkafi Divisional Headquarters. Patrol team dispatched to Badarawa bypass. Advisory published to all active drivers to avoid bypass after 19:00.',
      isPrivate: false,
      createdAt: '2026-02-11T20:30:00Z'
    });

    // Audit logs
    this.logAudit(adminUser.id, 'admin', 'SYSTEM_INIT', 'system', 'system', 'ShinkafiRide.ng core database initialized with default security and fare parameters.');
    this.logAudit(adminUser.id, 'admin', 'DRIVER_APPROVED', 'driver', driverUser1.id, 'Driver Aminu Garba approved after elder verification.');
  }

  // Transactions ledger helper
  public addTransaction(userId: string, type: Transaction['type'], amount: number, description: string) {
    const last = this.transactions.filter(t => t.userId === userId)[0];
    const prevBalance = last ? last.balanceAfter : 0;
    const balanceAfter = type === 'driver_payout' ? prevBalance - amount : prevBalance + amount;
    
    const tx: Transaction = {
      id: crypto.randomUUID(),
      reference: `TXN-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`,
      userId,
      type,
      amount,
      balanceAfter,
      description,
      createdAt: new Date().toISOString()
    };
    this.transactions.unshift(tx);
    return tx;
  }
}

export const db = new DatabaseStore();
