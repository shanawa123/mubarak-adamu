import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Vehicle } from '../../types';
import {
  Car,
  Users,
  DollarSign,
  Plus,
  ShieldCheck,
  AlertTriangle,
  Clock,
  CheckCircle2,
  TrendingUp,
  FileText
} from 'lucide-react';

export const OperatorDashboard: React.FC = () => {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<any>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // New vehicle modal
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [make, setMake] = useState('Toyota');
  const [model, setModel] = useState('Corolla Sedan');
  const [year, setYear] = useState('2019');
  const [plateNumber, setPlateNumber] = useState('');
  const [color, setColor] = useState('White');
  const [category, setCategory] = useState('sedan');
  const [errorMsg, setErrorMsg] = useState('');

  // Assign driver modal
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [selectedDriverId, setSelectedDriverId] = useState('');

  const fetchOperatorData = async () => {
    try {
      const [dashRes, vehRes, drvRes] = await Promise.all([
        fetch('/api/operator/dashboard'),
        fetch('/api/operator/vehicles'),
        fetch('/api/operator/drivers')
      ]);
      const dashData = await dashRes.json();
      const vehData = await vehRes.json();
      const drvData = await drvRes.json();

      if (dashData.success) {
        setMetrics(dashData.metrics);
      }
      if (vehData.success) {
        setVehicles(vehData.vehicles || []);
      }
      if (drvData.success) {
        setDrivers(drvData.drivers || []);
      }
    } catch (err) {
      console.error('Error fetching operator data:', err);
    }
  };

  useEffect(() => {
    fetchOperatorData();
  }, []);

  const handleAddVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      const res = await fetch('/api/operator/vehicles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          make,
          model,
          year,
          plateNumber,
          color,
          category
        })
      });
      const data = await res.json();
      if (data.success) {
        setAddModalOpen(false);
        setPlateNumber('');
        await fetchOperatorData();
      } else {
        setErrorMsg(data.error || 'Failed to add vehicle');
      }
    } catch {
      setErrorMsg('Network error while registering vehicle');
    }
  };

  const handleAssignDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVehicle) return;
    try {
      const res = await fetch(`/api/operator/vehicles/${selectedVehicle.id}/assign-driver`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ driverId: selectedDriverId || undefined })
      });
      const data = await res.json();
      if (data.success) {
        setAssignModalOpen(false);
        setSelectedVehicle(null);
        await fetchOperatorData();
      } else {
        alert(data.error || 'Failed to assign driver');
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-neutral-900 border border-neutral-800">
        <div>
          <div className="text-xs text-cyan-400 font-medium">Licensed Commercial Fleet Operator</div>
          <h1 className="text-2xl font-bold text-white tracking-tight mt-0.5">
            {user?.operatorProfile?.companyName || 'Dan-Alhaji Trans-Zamfara Transport Ltd'}
          </h1>
          <p className="text-xs text-neutral-400 mt-0.5">
            CAC Registration: <span className="text-neutral-300 font-mono">RC-1849204</span> · Operating Base: <span className="text-neutral-300">Shinkafi Central</span>
          </p>
        </div>

        <div>
          <button
            onClick={() => setAddModalOpen(true)}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl flex items-center gap-2 shadow-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Register Fleet Vehicle</span>
          </button>
        </div>
      </div>

      {/* Fleet KPI Metric Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800">
          <span className="text-xs text-neutral-400">Total Fleet Vehicles</span>
          <div className="text-2xl font-bold text-white font-mono mt-1">
            {metrics?.totalVehicles ?? vehicles.length}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800">
          <span className="text-xs text-neutral-400">Active / Online Drivers</span>
          <div className="text-2xl font-bold text-emerald-400 font-mono mt-1">
            {metrics?.activeDrivers ?? 2}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800">
          <span className="text-xs text-neutral-400">Completed Trips</span>
          <div className="text-2xl font-bold text-white font-mono mt-1">
            {metrics?.completedTripsCount ?? 240}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800">
          <span className="text-xs text-neutral-400">Operator Revenue Share</span>
          <div className="text-2xl font-bold text-cyan-400 font-mono mt-1">
            ₦{((metrics?.operatorRevenueShare || 353400)).toLocaleString()}
          </div>
        </div>
      </div>

      {/* Vehicles Table */}
      <div className="p-6 rounded-2xl bg-neutral-900 border border-neutral-800 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">Fleet Vehicle Roster</h2>
            <p className="text-xs text-neutral-400">Manage vehicle assignments and statutory documentation</p>
          </div>
          <span className="text-xs text-neutral-400">{vehicles.length} Registered</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-neutral-800 text-neutral-400">
                <th className="pb-3 font-semibold">Plate Number</th>
                <th className="pb-3 font-semibold">Vehicle Specs</th>
                <th className="pb-3 font-semibold">Category</th>
                <th className="pb-3 font-semibold">Assigned Driver</th>
                <th className="pb-3 font-semibold">Insurance Expiry</th>
                <th className="pb-3 font-semibold">Status</th>
                <th className="pb-3 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/60">
              {vehicles.map((v) => (
                <tr key={v.id} className="hover:bg-neutral-800/30 transition-colors">
                  <td className="py-3 font-mono font-bold text-white">{v.plateNumber}</td>
                  <td className="py-3 text-neutral-200">{v.make} {v.model} ({v.year})</td>
                  <td className="py-3 uppercase text-neutral-400">{v.category.replace('_', ' ')}</td>
                  <td className="py-3">
                    <span className={v.driverName === 'Unassigned' ? 'text-amber-400 italic' : 'text-emerald-400 font-medium'}>
                      {v.driverName}
                    </span>
                  </td>
                  <td className="py-3 font-mono text-neutral-400">{v.insuranceExpiry}</td>
                  <td className="py-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-950 text-emerald-400 border border-emerald-800 uppercase">
                      {v.status}
                    </span>
                  </td>
                  <td className="py-3 text-right">
                    <button
                      onClick={() => {
                        setSelectedVehicle(v);
                        setSelectedDriverId(v.driverId || '');
                        setAssignModalOpen(true);
                      }}
                      className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded text-xs transition-colors"
                    >
                      Assign Driver
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Organization Drivers List */}
      <div className="p-6 rounded-2xl bg-neutral-900 border border-neutral-800 shadow-xl space-y-4">
        <h2 className="text-lg font-bold text-white tracking-tight">Drivers Under Dan-Alhaji Fleet</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {drivers.map((d) => (
            <div key={d.userId} className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white text-sm">{d.fullName}</span>
                <span className="text-amber-400 font-mono font-bold">{d.rating} ★</span>
              </div>
              <div className="text-neutral-400 flex items-center justify-between">
                <span>Phone: {d.phone}</span>
                <span>Trips: {d.totalTrips}</span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-neutral-900 text-neutral-400">
                <span>Assigned: {d.vehiclePlate}</span>
                <span className={d.isOnline ? 'text-emerald-400 font-semibold' : 'text-neutral-500'}>
                  {d.isOnline ? 'Online' : 'Offline'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add Vehicle Modal */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="max-w-md w-full bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white">Register New Fleet Vehicle</h3>

            {errorMsg && (
              <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800 text-rose-300 text-xs">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleAddVehicle} className="space-y-3 text-xs">
              <div>
                <label className="block text-neutral-400 mb-1">Make</label>
                <input
                  type="text"
                  value={make}
                  onChange={(e) => setMake(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-neutral-950 border border-neutral-700 text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-neutral-400 mb-1">Model</label>
                <input
                  type="text"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-neutral-950 border border-neutral-700 text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-neutral-400 mb-1">Plate Number (e.g. ZAM-821-SKA)</label>
                <input
                  type="text"
                  value={plateNumber}
                  onChange={(e) => setPlateNumber(e.target.value)}
                  placeholder="ZAM-..."
                  className="w-full px-3 py-2 rounded-lg bg-neutral-950 border border-neutral-700 text-white font-mono uppercase"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-400 mb-1">Year</label>
                  <input
                    type="number"
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-neutral-950 border border-neutral-700 text-white"
                  />
                </div>
                <div>
                  <label className="block text-neutral-400 mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-neutral-950 border border-neutral-700 text-white"
                  >
                    <option value="sedan">Sedan Car</option>
                    <option value="keke_tricycle">Keke Tricycle</option>
                    <option value="intercity_van">Intercity Van</option>
                    <option value="cargo_pickup">Cargo Pickup</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="w-1/2 py-2 bg-neutral-800 text-neutral-300 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg"
                >
                  Save Vehicle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Driver Modal */}
      {assignModalOpen && selectedVehicle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="max-w-md w-full bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white">Assign Driver to {selectedVehicle.plateNumber}</h3>

            <form onSubmit={handleAssignDriver} className="space-y-4 text-xs">
              <div>
                <label className="block text-neutral-400 mb-1">Select Driver from Organization:</label>
                <select
                  value={selectedDriverId}
                  onChange={(e) => setSelectedDriverId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg bg-neutral-950 border border-neutral-700 text-white"
                >
                  <option value="">-- Unassigned (No Driver) --</option>
                  {drivers.map((d) => (
                    <option key={d.userId} value={d.userId}>
                      {d.fullName} ({d.phone})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setAssignModalOpen(false)}
                  className="w-1/2 py-2 bg-neutral-800 text-neutral-300 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg"
                >
                  Confirm Assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
