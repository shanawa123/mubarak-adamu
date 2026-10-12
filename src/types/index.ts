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

export type VehicleCategory = 'sedan' | 'keke_tricycle' | 'intercity_van' | 'cargo_pickup';

export interface User {
  id: string;
  phone: string;
  email: string;
  role: UserRole;
  isVerified: boolean;
  isSuspended?: boolean;
  suspensionReason?: string;
  profile?: {
    fullName: string;
    preferredLanguage: string;
    city: string;
    state: string;
  };
  passengerProfile?: {
    emergencyContactName: string;
    emergencyContactPhone: string;
    preferredPaymentMethod: 'cash' | 'card' | 'wallet';
    totalRides: number;
    rating: number;
  };
  driverProfile?: {
    status: 'pending' | 'under_review' | 'approved' | 'rejected' | 'suspended';
    isOnline: boolean;
    currentLat: number;
    currentLng: number;
    assignedVehicleId?: string;
    totalTrips: number;
    rating: number;
    totalEarnings: number;
    licenseNumber: string;
  };
  operatorProfile?: {
    companyName: string;
    cacNumber: string;
    contactPerson: string;
    phone: string;
    isApproved: boolean;
    totalVehicles: number;
  };
}

export interface Ride {
  id: string;
  passengerId: string;
  driverId?: string;
  vehicleId?: string;
  category: VehicleCategory;
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
  verificationOtp: string;
  status: RideStatus;
  cancellationReason?: string;
  passengerRating?: number;
  passengerFeedback?: string;
  createdAt: string;
}

export interface Vehicle {
  id: string;
  operatorId?: string;
  driverId?: string;
  make: string;
  model: string;
  year: number;
  plateNumber: string;
  color: string;
  category: VehicleCategory;
  capacity: number;
  status: 'active' | 'maintenance' | 'suspended';
  insuranceExpiry: string;
  roadworthinessExpiry: string;
  driverName?: string;
  driverPhone?: string;
  driverRating?: number;
}

export interface FareEstimate {
  category: string;
  distanceKm: number;
  durationMin: number;
  baseFare: number;
  distanceCharge: number;
  timeCharge: number;
  subtotal: number;
  estimatedFare: number;
  minimumFare: number;
  platformCommission: number;
  driverEarnings: number;
  currency: string;
}

export interface Incident {
  id: string;
  ticketNumber: string;
  rideId?: string;
  reportedByUserId: string;
  reportedRole: UserRole;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'new' | 'acknowledged' | 'under_investigation' | 'escalated' | 'resolved' | 'closed';
  subject: string;
  description: string;
  latitude?: number;
  longitude?: number;
  assignedOfficerName?: string;
  escalatedToPolice: boolean;
  resolutionSummary?: string;
  createdAt: string;
  reporterName?: string;
  reporterPhone?: string;
}

export interface IncidentNote {
  id: string;
  incidentId: string;
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
  timestamp: string;
}

export interface Landmark {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  type: 'market' | 'hospital' | 'station' | 'civic' | 'landmark';
}
