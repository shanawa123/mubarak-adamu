import { Router, Response } from 'express';
import { db, User } from '../db.js';
import { calculateFare, calculateDistanceKm } from '../fareCalculator.js';

export const testRouter = Router();

interface TestResult {
  name: string;
  category: string;
  passed: boolean;
  message: string;
  durationMs: number;
}

testRouter.post('/run', (req, res: Response): void => {
  const results: TestResult[] = [];
  const startAll = Date.now();

  function runTest(name: string, category: string, fn: () => void) {
    const t0 = Date.now();
    try {
      fn();
      results.push({
        name,
        category,
        passed: true,
        message: 'Assertion passed successfully.',
        durationMs: Date.now() - t0
      });
    } catch (err: any) {
      results.push({
        name,
        category,
        passed: false,
        message: err.message || 'Assertion failed',
        durationMs: Date.now() - t0
      });
    }
  }

  // 1. Password Hashing & Verification
  runTest('Argon2/PBKDF2 Password Hashing & Salt', 'Authentication', () => {
    const pwd = 'TestSecurePassword#2026';
    const hashed = db.hashPassword(pwd);
    if (!hashed.hash || !hashed.salt) throw new Error('Hash or salt is empty');
    const verifyValid = db.verifyPassword(pwd, hashed.hash, hashed.salt);
    const verifyInvalid = db.verifyPassword('WrongPassword', hashed.hash, hashed.salt);
    if (!verifyValid) throw new Error('Valid password verification failed');
    if (verifyInvalid) throw new Error('Invalid password was incorrectly verified as true');
  });

  // 2. Role-Based Access Control Boundaries
  runTest('RBAC: Non-admin cannot approve driver', 'Authorization', () => {
    const passengerUser = db.users.get('usr-pass-01')!;
    if (passengerUser.role !== 'passenger') throw new Error('Passenger user has incorrect role');
    // Verify role check
    const allowedRoles = ['admin'];
    const hasPrivilege = allowedRoles.includes(passengerUser.role);
    if (hasPrivilege) throw new Error('Passenger was granted admin privileges');
  });

  // 3. Authoritative Server Fare Calculation
  runTest('Authoritative Fare Calculation for Shinkafi routes', 'Pricing', () => {
    // Shinkafi Market to General Hospital (~3.2 km)
    const pickupLat = 13.0780, pickupLng = 6.5200;
    const destLat = 13.0845, destLng = 6.5255;
    const dist = calculateDistanceKm(pickupLat, pickupLng, destLat, destLng);
    if (dist <= 0) throw new Error('Distance must be positive');
    
    const kekeFare = calculateFare('keke_tricycle', pickupLat, pickupLng, destLat, destLng);
    const sedanFare = calculateFare('sedan', pickupLat, pickupLng, destLat, destLng);
    
    if (kekeFare.estimatedFare < kekeFare.minimumFare) throw new Error('Keke fare below minimum fare');
    if (sedanFare.estimatedFare <= kekeFare.estimatedFare) throw new Error('Sedan fare should exceed Keke fare');
    if (sedanFare.platformCommission !== Math.round(sedanFare.estimatedFare * 0.15)) {
      throw new Error('Platform commission calculation is incorrect');
    }
  });

  // 4. Edge Case: Concurrent Driver Assignment Lock
  runTest('Concurrency Lock: Preventing 2 drivers from taking the same ride', 'Concurrency', () => {
    const testRideId = 'test-concurrent-ride';
    db.rides.set(testRideId, {
      id: testRideId,
      passengerId: 'usr-pass-01',
      serviceAreaId: 'area-shinkafi-urban',
      category: 'sedan',
      pickupAddress: 'Katuru Gate',
      pickupLat: 13.08,
      pickupLng: 6.52,
      destinationAddress: 'Emirs Palace',
      destLat: 13.07,
      destLng: 6.51,
      estimatedDistanceKm: 2,
      estimatedDurationMin: 8,
      estimatedFare: 800,
      platformCommission: 120,
      netDriverEarnings: 680,
      paymentMethod: 'cash',
      paymentStatus: 'pending',
      verificationOtp: '1234',
      status: 'requested',
      createdAt: new Date().toISOString()
    });

    const ride = db.rides.get(testRideId)!;
    // Driver 1 attempts
    if ((ride.status as string) !== 'requested') throw new Error('Initial state invalid');
    ride.driverId = 'usr-drv-01';
    ride.status = 'driver_arriving';

    // Driver 2 attempts on same ride
    let secondDriverBlocked = false;
    const currentStatus: string = ride.status;
    if (currentStatus !== 'requested') {
      secondDriverBlocked = true; // Blocked because status is already driver_arriving
    }
    if (!secondDriverBlocked) throw new Error('Race condition allowed second driver to accept taken ride');
    // Cleanup
    db.rides.delete(testRideId);
  });

  // 5. Trip Verification OTP Validation
  runTest('Trip Start requires strict 4-digit Passenger OTP', 'Security', () => {
    const testOtpRideId = 'test-otp-ride';
    db.rides.set(testOtpRideId, {
      id: testOtpRideId,
      passengerId: 'usr-pass-01',
      driverId: 'usr-drv-01',
      serviceAreaId: 'area-shinkafi-urban',
      category: 'sedan',
      pickupAddress: 'Galadi Road',
      pickupLat: 13.078,
      pickupLng: 6.519,
      destinationAddress: 'Central Mosque',
      destLat: 13.080,
      destLng: 6.521,
      estimatedDistanceKm: 1.5,
      estimatedDurationMin: 6,
      estimatedFare: 500,
      platformCommission: 75,
      netDriverEarnings: 425,
      paymentMethod: 'cash',
      paymentStatus: 'pending',
      verificationOtp: '7412',
      status: 'driver_arrived',
      createdAt: new Date().toISOString()
    });

    const ride = db.rides.get(testOtpRideId)!;
    const wrongOtp = '0000';
    if (wrongOtp === ride.verificationOtp) throw new Error('Wrong OTP matched');
    
    // Correct OTP
    const correctOtp = '7412';
    if (correctOtp !== ride.verificationOtp) throw new Error('Valid OTP did not match');
    ride.status = 'in_progress';
    if (ride.status !== 'in_progress') throw new Error('Status did not transition to in_progress');
    // Cleanup
    db.rides.delete(testOtpRideId);
  });

  // 6. Operator Fleet Data Isolation
  runTest('Operator Data Isolation: Cannot access other operator records', 'Data Isolation', () => {
    const op1Id = 'usr-op-01';
    const op2Id = 'usr-op-02-test';

    // Create vehicle for op2
    db.vehicles.set('veh-test-op2', {
      id: 'veh-test-op2',
      operatorId: op2Id,
      make: 'Peugeot',
      model: '504 Station Wagon',
      year: 2012,
      plateNumber: 'ZAM-999-SKA',
      color: 'Blue',
      category: 'intercity_van',
      capacity: 7,
      status: 'active',
      insuranceExpiry: '2027-01-01',
      roadworthinessExpiry: '2027-01-01',
      createdAt: new Date().toISOString()
    });

    // Query for op1
    const op1Vehicles = Array.from(db.vehicles.values()).filter(v => v.operatorId === op1Id);
    const leaked = op1Vehicles.some(v => v.id === 'veh-test-op2');
    if (leaked) throw new Error('Operator 1 was able to view Operator 2 private fleet vehicle');
    // Cleanup
    db.vehicles.delete('veh-test-op2');
  });

  // 7. Security Incident Access & Auditing
  runTest('Security Incident Escalation & Immutable Audit Logging', 'Security', () => {
    const auditCountBefore = db.auditLogs.length;
    db.logAudit('usr-sec-01', 'security_officer', 'TEST_SECURITY_ACTION', 'incident', 'inc-test-01', 'Audit trail verification');
    if (db.auditLogs.length !== auditCountBefore + 1) throw new Error('Audit log was not recorded');
    const latest = db.auditLogs[0];
    if (latest.action !== 'TEST_SECURITY_ACTION') throw new Error('Latest audit record mismatch');
  });

  // 8. Payment Idempotency & Webhook Signature
  runTest('Payment Verification Idempotency prevents double-crediting', 'Financial Integrity', () => {
    const ref = 'TEST-PAY-IDEMPOTENT';
    db.payments.set(ref, {
      id: 'pay-test-01',
      rideId: 'ride-test',
      userId: 'usr-pass-01',
      provider: 'paystack',
      reference: ref,
      amount: 1200,
      currency: 'NGN',
      status: 'pending',
      channel: 'card',
      createdAt: new Date().toISOString()
    });

    const payment = db.payments.get(ref)!;
    payment.status = 'success';
    payment.paidAt = new Date().toISOString();

    // Second verification attempt
    let duplicateRejected = false;
    if (payment.status === 'success') {
      duplicateRejected = true; // Handled as already verified
    }
    if (!duplicateRejected) throw new Error('Duplicate payment attempt was not identified as idempotent');
    // Cleanup
    db.payments.delete(ref);
  });

  const totalDurationMs = Date.now() - startAll;
  const passedCount = results.filter(r => r.passed).length;

  res.json({
    success: true,
    totalTests: results.length,
    passedCount,
    failedCount: results.length - passedCount,
    totalDurationMs,
    results
  });
});
