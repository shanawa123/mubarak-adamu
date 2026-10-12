import { db } from './db.js';

export function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return Math.max(0.5, Math.round(distance * 10) / 10);
}

export function estimateDurationMinutes(distanceKm: number): number {
  // Average urban speed ~25 km/h in Shinkafi roads
  const duration = (distanceKm / 25) * 60;
  return Math.max(3, Math.round(duration));
}

export interface FareCalculationResult {
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

export function calculateFare(
  category: 'sedan' | 'keke_tricycle' | 'intercity_van' | 'cargo_pickup',
  pickupLat: number,
  pickupLng: number,
  destLat: number,
  destLng: number
): FareCalculationResult {
  const rule = db.fareRules.get(category) || {
    id: 'default',
    category,
    serviceArea: 'Shinkafi Urban',
    baseFare: 300,
    perKmRate: 100,
    perMinuteRate: 15,
    minimumFare: 400,
    cancellationFee: 200,
    commissionPercentage: 15,
    currency: 'NGN'
  };

  const distanceKm = calculateDistanceKm(pickupLat, pickupLng, destLat, destLng);
  const durationMin = estimateDurationMinutes(distanceKm);

  const distanceCharge = Math.round(distanceKm * rule.perKmRate);
  const timeCharge = Math.round(durationMin * rule.perMinuteRate);
  const rawTotal = rule.baseFare + distanceCharge + timeCharge;
  const estimatedFare = Math.max(rule.minimumFare, Math.ceil(rawTotal / 10) * 10); // round to nearest 10 NGN

  const commission = Math.round((estimatedFare * rule.commissionPercentage) / 100);
  const driverEarnings = estimatedFare - commission;

  return {
    category,
    distanceKm,
    durationMin,
    baseFare: rule.baseFare,
    distanceCharge,
    timeCharge,
    subtotal: rawTotal,
    estimatedFare,
    minimumFare: rule.minimumFare,
    platformCommission: commission,
    driverEarnings,
    currency: rule.currency
  };
}
