import { Router, Response } from 'express';
import crypto from 'crypto';
import { db, UserRole } from '../db.js';
import { AuthenticatedRequest, createSession, deleteSession, authRateLimiter } from '../auth.js';

export const authRouter = Router();

// Demo Accounts map for quick evaluation
const DEMO_USERS: Record<UserRole, string> = {
  passenger: 'usr-pass-01',
  driver: 'usr-drv-01',
  operator: 'usr-op-01',
  admin: 'usr-admin-01',
  security_officer: 'usr-sec-01'
};

// GET current user
authRouter.get('/me', (req: AuthenticatedRequest, res: Response): void => {
  if (!req.user) {
    res.json({ success: true, user: null });
    return;
  }

  const profile = db.userProfiles.get(req.user.id);
  const passengerProfile = db.passengerProfiles.get(req.user.id);
  const driverProfile = db.driverProfiles.get(req.user.id);
  const operatorProfile = db.operatorProfiles.get(req.user.id);

  res.json({
    success: true,
    user: {
      id: req.user.id,
      phone: req.user.phone,
      email: req.user.email,
      role: req.user.role,
      isVerified: req.user.isVerified,
      profile,
      passengerProfile,
      driverProfile,
      operatorProfile
    }
  });
});

// POST Login
authRouter.post('/login', authRateLimiter, (req: AuthenticatedRequest, res: Response): void => {
  const { identifier, password } = req.body; // identifier can be phone or email

  if (!identifier || !password) {
    res.status(400).json({ success: false, error: 'Phone/Email and password are required.' });
    return;
  }

  // Find user by email or phone
  let user = Array.from(db.users.values()).find(
    u => u.email.toLowerCase() === identifier.toLowerCase() || u.phone === identifier
  );

  if (!user) {
    res.status(401).json({ success: false, error: 'Invalid login credentials.' });
    return;
  }

  if (user.isSuspended) {
    res.status(403).json({
      success: false,
      error: `Account suspended. Reason: ${user.suspensionReason || 'Contact platform administration.'}`
    });
    return;
  }

  const isValid = db.verifyPassword(password, user.passwordHash, user.salt);
  if (!isValid) {
    res.status(401).json({ success: false, error: 'Invalid login credentials.' });
    return;
  }

  const token = createSession(user);
  res.cookie('shinkafi_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000
  });

  db.logAudit(user.id, user.role, 'LOGIN_SUCCESS', 'user', user.id, `User logged in from ${req.ip}`);

  const profile = db.userProfiles.get(user.id);
  res.json({
    success: true,
    token,
    user: {
      id: user.id,
      phone: user.phone,
      email: user.email,
      role: user.role,
      isVerified: user.isVerified,
      profile
    }
  });
});

// Switch Demo User
authRouter.post('/switch-demo', (req: AuthenticatedRequest, res: Response): void => {
  const { role } = req.body as { role: UserRole };
  const userId = DEMO_USERS[role];

  if (!userId) {
    res.status(400).json({ success: false, error: 'Invalid role requested.' });
    return;
  }

  const user = db.users.get(userId);
  if (!user) {
    res.status(404).json({ success: false, error: 'Demo user not found.' });
    return;
  }

  const token = createSession(user);
  res.cookie('shinkafi_session', token, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000
  });

  const profile = db.userProfiles.get(user.id);
  const passengerProfile = db.passengerProfiles.get(user.id);
  const driverProfile = db.driverProfiles.get(user.id);
  const operatorProfile = db.operatorProfiles.get(user.id);

  res.json({
    success: true,
    token,
    user: {
      id: user.id,
      phone: user.phone,
      email: user.email,
      role: user.role,
      isVerified: user.isVerified,
      profile,
      passengerProfile,
      driverProfile,
      operatorProfile
    }
  });
});

// POST Register
authRouter.post('/register', authRateLimiter, (req: AuthenticatedRequest, res: Response): void => {
  const {
    fullName,
    phone,
    email,
    password,
    role = 'passenger',
    preferredLanguage = 'Hausa / English',
    emergencyContactName,
    emergencyContactPhone,
    // Driver fields
    licenseNumber,
    vehicleMake,
    vehicleModel,
    vehiclePlate,
    vehicleCategory,
    // Operator fields
    companyName,
    cacNumber,
    businessAddress
  } = req.body;

  if (!fullName || !phone || !password) {
    res.status(400).json({ success: false, error: 'Full name, Nigerian phone number, and password are required.' });
    return;
  }

  // Check unique phone / email
  const existingUser = Array.from(db.users.values()).find(
    u => u.phone === phone || (email && u.email.toLowerCase() === email.toLowerCase())
  );

  if (existingUser) {
    res.status(409).json({ success: false, error: 'An account with this phone number or email already exists.' });
    return;
  }

  const validRoles: UserRole[] = ['passenger', 'driver', 'operator'];
  const assignedRole: UserRole = validRoles.includes(role) ? role : 'passenger';

  const pwd = db.hashPassword(password);
  const userId = `usr-${crypto.randomBytes(6).toString('hex')}`;

  const newUser = {
    id: userId,
    phone,
    email: email || `${phone}@shinkafiride.local`,
    passwordHash: pwd.hash,
    salt: pwd.salt,
    role: assignedRole,
    isVerified: true, // Auto-verified for seamless evaluation
    isSuspended: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  db.users.set(userId, newUser);
  db.userProfiles.set(userId, {
    userId,
    fullName,
    preferredLanguage,
    city: 'Shinkafi',
    state: 'Zamfara State'
  });

  if (assignedRole === 'passenger') {
    db.passengerProfiles.set(userId, {
      userId,
      emergencyContactName: emergencyContactName || 'Family Member',
      emergencyContactPhone: emergencyContactPhone || phone,
      preferredPaymentMethod: 'cash',
      totalRides: 0,
      rating: 5.0
    });
  } else if (assignedRole === 'driver') {
    const vehId = `veh-${crypto.randomBytes(4).toString('hex')}`;
    const vehicle = {
      id: vehId,
      driverId: userId,
      make: vehicleMake || 'Bajaj',
      model: vehicleModel || 'RE Keke Tricycle',
      year: 2021,
      plateNumber: vehiclePlate || `ZAM-${Math.floor(100 + Math.random() * 900)}-SKA`,
      color: 'Yellow',
      category: vehicleCategory || 'keke_tricycle',
      capacity: 3,
      status: 'active' as const,
      insuranceExpiry: '2027-12-31',
      roadworthinessExpiry: '2027-12-31',
      createdAt: new Date().toISOString()
    };
    db.vehicles.set(vehId, vehicle);

    db.driverProfiles.set(userId, {
      userId,
      licenseNumber: licenseNumber || `FRSC-ZAM-${Math.floor(10000000 + Math.random() * 90000000)}`,
      licenseExpiry: '2027-12-31',
      status: 'pending', // Requires admin review
      isOnline: false,
      currentLat: 13.0782,
      currentLng: 6.5195,
      lastLocationUpdate: new Date().toISOString(),
      assignedVehicleId: vehId,
      totalTrips: 0,
      rating: 5.0,
      totalEarnings: 0
    });

    db.driverDocuments.set(`doc-${userId}-1`, {
      id: `doc-${userId}-1`,
      driverId: userId,
      documentType: 'drivers_license',
      documentNumber: licenseNumber || 'FRSC-PENDING',
      fileUrl: '/documents/license_upload.pdf',
      expiryDate: '2027-12-31',
      verificationStatus: 'pending',
      uploadedAt: new Date().toISOString()
    });
  } else if (assignedRole === 'operator') {
    db.operatorProfiles.set(userId, {
      userId,
      companyName: companyName || `${fullName} Transport Lines`,
      cacNumber: cacNumber || `RC-${Math.floor(1000000 + Math.random() * 9000000)}`,
      contactPerson: fullName,
      phone,
      businessAddress: businessAddress || 'Central Motor Park, Shinkafi',
      isApproved: false, // Requires admin review
      totalVehicles: 0,
      commissionRate: 15
    });
  }

  const token = createSession(newUser);
  res.cookie('shinkafi_session', token, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000
  });

  db.logAudit(userId, assignedRole, 'USER_REGISTERED', 'user', userId, `Registered as ${assignedRole}`);

  res.status(201).json({
    success: true,
    token,
    user: {
      id: newUser.id,
      phone: newUser.phone,
      email: newUser.email,
      role: newUser.role,
      isVerified: newUser.isVerified
    }
  });
});

// POST Logout
authRouter.post('/logout', (req: AuthenticatedRequest, res: Response): void => {
  if (req.sessionToken) {
    deleteSession(req.sessionToken);
  }
  res.clearCookie('shinkafi_session');
  res.json({ success: true, message: 'Logged out successfully.' });
});
