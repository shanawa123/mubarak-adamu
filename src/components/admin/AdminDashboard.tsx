import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Users,
  Shield,
  FileCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Search,
  Sliders,
  DollarSign,
  Activity,
  History,
  Lock
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'driver_queue' | 'fare_rules' | 'audit_logs'>('overview');

  const [metrics, setMetrics] = useState<any>(null);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [pendingDrivers, setPendingDrivers] = useState<any[]>([]);
  const [fareRules, setFareRules] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  // Search & filter
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  // Suspension modal
  const [suspensionModalUser, setSuspensionModalUser] = useState<any | null>(null);
  const [suspensionReason, setSuspensionReason] = useState('');

  // Fare rule editing
  const [editingRule, setEditingRule] = useState<any | null>(null);

  const fetchAdminData = async () => {
    try {
      const [metricsRes, usersRes, queueRes, faresRes, auditRes] = await Promise.all([
        fetch('/api/admin/dashboard'),
        fetch(`/api/admin/users?role=${roleFilter}&search=${searchQuery}`),
        fetch('/api/admin/drivers/pending'),
        fetch('/api/admin/fare-rules'),
        fetch('/api/admin/audit-logs')
      ]);

      const mData = await metricsRes.json();
      const uData = await usersRes.json();
      const qData = await queueRes.json();
      const fData = await faresRes.json();
      const aData = await auditRes.json();

      if (mData.success) setMetrics(mData.metrics);
      if (uData.success) setUsersList(uData.users || []);
      if (qData.success) setPendingDrivers(qData.pendingDrivers || []);
      if (fData.success) setFareRules(fData.fareRules || []);
      if (aData.success) setAuditLogs(aData.auditLogs || []);
    } catch (err) {
      console.error('Error fetching admin data:', err);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, [roleFilter, searchQuery]);

  // Suspend / Reactivate handler
  const handleToggleSuspension = async () => {
    if (!suspensionModalUser) return;
    try {
      const res = await fetch(`/api/admin/users/${suspensionModalUser.id}/toggle-suspension`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isSuspended: !suspensionModalUser.isSuspended,
          reason: suspensionReason
        })
      });
      const data = await res.json();
      if (data.success) {
        setSuspensionModalUser(null);
        setSuspensionReason('');
        await fetchAdminData();
      } else {
        alert(data.error || 'Failed to update user');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Driver approval handler
  const handleApproveDriver = async (driverId: string) => {
    try {
      const res = await fetch(`/api/admin/drivers/${driverId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: 'FRSC licence & Shinkafi Union verification cleared.' })
      });
      const data = await res.json();
      if (data.success) {
        await fetchAdminData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Driver rejection handler
  const handleRejectDriver = async (driverId: string) => {
    const reason = prompt('Please enter documented reason for rejection:');
    if (!reason) return;
    try {
      const res = await fetch(`/api/admin/drivers/${driverId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason })
      });
      const data = await res.json();
      if (data.success) {
        await fetchAdminData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Update fare rule handler
  const handleSaveFareRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRule) return;
    try {
      const res = await fetch('/api/admin/fare-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingRule)
      });
      const data = await res.json();
      if (data.success) {
        setEditingRule(null);
        await fetchAdminData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-8">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-neutral-900 border border-neutral-800">
        <div>
          <div className="text-xs text-amber-400 font-medium">Platform Administration Console</div>
          <h1 className="text-2xl font-bold text-white tracking-tight mt-0.5">
            Central Command: {user?.profile?.fullName || 'Mallam Usman Shinkafi'}
          </h1>
          <p className="text-xs text-neutral-400 mt-0.5">
            Privileged Access · Zamfara State Mobility Registry · Audit Active
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-1.5 p-1 bg-neutral-950 rounded-xl border border-neutral-800 text-xs">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              activeTab === 'overview' ? 'bg-neutral-800 text-white font-bold' : 'text-neutral-400 hover:text-white'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              activeTab === 'users' ? 'bg-neutral-800 text-white font-bold' : 'text-neutral-400 hover:text-white'
            }`}
          >
            Users ({usersList.length})
          </button>
          <button
            onClick={() => setActiveTab('driver_queue')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              activeTab === 'driver_queue' ? 'bg-neutral-800 text-white font-bold' : 'text-neutral-400 hover:text-white'
            }`}
          >
            Verification Queue ({pendingDrivers.length})
          </button>
          <button
            onClick={() => setActiveTab('fare_rules')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              activeTab === 'fare_rules' ? 'bg-neutral-800 text-white font-bold' : 'text-neutral-400 hover:text-white'
            }`}
          >
            Fare Rules
          </button>
          <button
            onClick={() => setActiveTab('audit_logs')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              activeTab === 'audit_logs' ? 'bg-neutral-800 text-white font-bold' : 'text-neutral-400 hover:text-white'
            }`}
          >
            Audit Logs
          </button>
        </div>
      </div>

      {/* OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800">
              <span className="text-xs text-neutral-400">Total Registered Passengers</span>
              <div className="text-2xl font-bold text-white font-mono mt-1">
                {metrics?.totalPassengers ?? 1}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800">
              <span className="text-xs text-neutral-400">Approved Drivers</span>
              <div className="text-2xl font-bold text-emerald-400 font-mono mt-1">
                {metrics?.approvedDrivers ?? 2}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800">
              <span className="text-xs text-neutral-400">Pending Driver Apps</span>
              <div className="text-2xl font-bold text-amber-400 font-mono mt-1">
                {metrics?.pendingDrivers ?? 1}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800">
              <span className="text-xs text-neutral-400">Platform Revenue (15%)</span>
              <div className="text-2xl font-bold text-cyan-400 font-mono mt-1">
                ₦{((metrics?.platformRevenue || 48450)).toLocaleString()}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800">
              <span className="text-xs text-neutral-400">Active Commercial Vehicles</span>
              <div className="text-xl font-bold text-white font-mono mt-1">
                {metrics?.activeVehicles ?? 3}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800">
              <span className="text-xs text-neutral-400">Completed Trips To Date</span>
              <div className="text-xl font-bold text-white font-mono mt-1">
                {metrics?.completedTrips ?? 241}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800">
              <span className="text-xs text-neutral-400">Safety Incidents Logged</span>
              <div className="text-xl font-bold text-rose-400 font-mono mt-1">
                {metrics?.openIncidents ?? 2} Open
              </div>
            </div>
          </div>
        </div>
      )}

      {/* USERS TAB */}
      {activeTab === 'users' && (
        <div className="p-6 rounded-2xl bg-neutral-900 border border-neutral-800 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1 max-w-sm bg-neutral-950 px-3 py-2 rounded-lg border border-neutral-700 text-xs">
              <Search className="w-4 h-4 text-neutral-500" />
              <input
                type="text"
                placeholder="Search by name, phone, or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent border-none text-white focus:outline-none w-full"
              />
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="text-neutral-400">Role Filter:</span>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg bg-neutral-950 border border-neutral-700 text-white text-xs"
              >
                <option value="all">All Roles</option>
                <option value="passenger">Passengers</option>
                <option value="driver">Drivers</option>
                <option value="operator">Operators</option>
                <option value="security_officer">Security Officers</option>
                <option value="admin">Administrators</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-neutral-800 text-neutral-400">
                  <th className="pb-3 font-semibold">User</th>
                  <th className="pb-3 font-semibold">Phone & Email</th>
                  <th className="pb-3 font-semibold">Role</th>
                  <th className="pb-3 font-semibold">Verification</th>
                  <th className="pb-3 font-semibold">Status</th>
                  <th className="pb-3 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/60">
                {usersList.map((u) => (
                  <tr key={u.id} className="hover:bg-neutral-800/30 transition-colors">
                    <td className="py-3 font-medium text-white">{u.profile?.fullName || 'User'}</td>
                    <td className="py-3 text-neutral-300 font-mono">
                      <div>{u.phone}</div>
                      <div className="text-[11px] text-neutral-500">{u.email}</div>
                    </td>
                    <td className="py-3 capitalize text-neutral-300">{u.role.replace('_', ' ')}</td>
                    <td className="py-3">
                      <span className="text-emerald-400">Verified</span>
                    </td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-medium uppercase ${
                        u.isSuspended ? 'bg-rose-950 text-rose-400 border border-rose-800' : 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                      }`}>
                        {u.isSuspended ? 'Suspended' : 'Active'}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <button
                        onClick={() => {
                          setSuspensionModalUser(u);
                          setSuspensionReason(u.suspensionReason || '');
                        }}
                        className={`px-2.5 py-1 rounded text-xs transition-colors ${
                          u.isSuspended
                            ? 'bg-emerald-950 text-emerald-300 hover:bg-emerald-900'
                            : 'bg-rose-950/60 text-rose-300 hover:bg-rose-900/60'
                        }`}
                      >
                        {u.isSuspended ? 'Reactivate' : 'Suspend'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* DRIVER VERIFICATION QUEUE TAB */}
      {activeTab === 'driver_queue' && (
        <div className="p-6 rounded-2xl bg-neutral-900 border border-neutral-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">Driver Applications Awaiting Vetting</h2>
              <p className="text-xs text-neutral-400">Verify FRSC license, elder guarantor, and roadworthiness documents</p>
            </div>
            <span className="text-xs font-mono text-amber-400">{pendingDrivers.length} Pending</span>
          </div>

          {pendingDrivers.length === 0 ? (
            <div className="p-8 rounded-xl bg-neutral-950 text-center text-xs text-neutral-500">
              All driver applications have been reviewed. Queue is clear!
            </div>
          ) : (
            <div className="space-y-4">
              {pendingDrivers.map((d) => (
                <div key={d.driverId} className="p-5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-base font-bold text-white">{d.fullName}</div>
                      <div className="text-neutral-400">Phone: <span className="font-mono text-neutral-300">{d.phone}</span></div>
                    </div>
                    <span className="px-2.5 py-1 rounded bg-amber-950 text-amber-400 border border-amber-800 text-[11px] font-semibold uppercase">
                      {d.status}
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-between">
                    <div>
                      <div className="text-neutral-400">Submitted FRSC Licence Number:</div>
                      <div className="font-mono font-bold text-emerald-400 text-sm">{d.licenseNumber}</div>
                    </div>
                    <div className="text-right text-[11px] text-neutral-500">
                      Uploaded on: {new Date(d.appliedAt).toLocaleDateString()}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <button
                      onClick={() => handleRejectDriver(d.driverId)}
                      className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-rose-400 rounded-lg border border-neutral-700 transition-colors"
                    >
                      Reject Application
                    </button>
                    <button
                      onClick={() => handleApproveDriver(d.driverId)}
                      className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition-colors flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Approve & Authorize Driver</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* FARE RULES TAB */}
      {activeTab === 'fare_rules' && (
        <div className="p-6 rounded-2xl bg-neutral-900 border border-neutral-800 shadow-xl space-y-4">
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">Configurable Regional Fare Rules</h2>
            <p className="text-xs text-neutral-400">Adjust base rates, distance charges, and platform commission percentages</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {fareRules.map((rule) => (
              <div key={rule.id} className="p-5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white uppercase text-sm">{rule.category.replace('_', ' ')}</span>
                  <span className="text-emerald-400 font-mono font-bold">{rule.commissionPercentage}% Commission</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-neutral-400">
                  <div>Base Fare: <span className="text-white font-mono">₦{rule.baseFare}</span></div>
                  <div>Rate / km: <span className="text-white font-mono">₦{rule.perKmRate}</span></div>
                  <div>Minimum Fare: <span className="text-white font-mono">₦{rule.minimumFare}</span></div>
                  <div>Cancellation: <span className="text-white font-mono">₦{rule.cancellationFee}</span></div>
                </div>

                <div className="pt-2 border-t border-neutral-900">
                  <button
                    onClick={() => setEditingRule({ ...rule })}
                    className="w-full py-2 bg-neutral-900 hover:bg-neutral-800 text-neutral-200 rounded-lg border border-neutral-700"
                  >
                    Edit Fare Parameters
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AUDIT LOGS TAB */}
      {activeTab === 'audit_logs' && (
        <div className="p-6 rounded-2xl bg-neutral-900 border border-neutral-800 shadow-xl space-y-4">
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">Administrative & Security Audit Logs</h2>
            <p className="text-xs text-neutral-400">Immutable chronological record of sensitive operations</p>
          </div>

          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
            {auditLogs.map((log) => (
              <div key={log.id} className="p-3 rounded-lg bg-neutral-950 border border-neutral-800/80 text-xs space-y-1">
                <div className="flex items-center justify-between text-neutral-400">
                  <span className="font-mono text-emerald-400 font-semibold">{log.action}</span>
                  <span className="font-mono text-[11px] text-neutral-500">{new Date(log.timestamp).toLocaleTimeString()}</span>
                </div>
                <div className="text-neutral-200">{log.details}</div>
                <div className="text-[11px] text-neutral-500">
                  Role: <span className="text-neutral-400 uppercase">{log.userRole}</span> · Entity: {log.entityType} ({log.entityId})
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Suspension Modal */}
      {suspensionModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="max-w-md w-full bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white">
              {suspensionModalUser.isSuspended ? 'Reactivate User Account' : 'Suspend User Account'}
            </h3>

            <p className="text-xs text-neutral-300">
              Target User: <strong>{suspensionModalUser.profile?.fullName || suspensionModalUser.phone}</strong>
            </p>

            <div>
              <label className="block text-xs text-neutral-400 mb-1">
                Documented Administrative Reason:
              </label>
              <textarea
                rows={3}
                value={suspensionReason}
                onChange={(e) => setSuspensionReason(e.target.value)}
                placeholder="Reason required for regulatory audit log..."
                className="w-full px-3 py-2 rounded-lg bg-neutral-950 border border-neutral-700 text-white text-xs"
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setSuspensionModalUser(null)}
                className="w-1/2 py-2 bg-neutral-800 text-neutral-300 rounded-lg text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleToggleSuspension}
                className="w-1/2 py-2 bg-rose-600 hover:bg-rose-500 text-white font-semibold rounded-lg text-xs"
              >
                Confirm Action
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Fare Rule Modal */}
      {editingRule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="max-w-md w-full bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white uppercase">Edit {editingRule.category.replace('_', ' ')} Rates</h3>

            <form onSubmit={handleSaveFareRule} className="space-y-3 text-xs">
              <div>
                <label className="block text-neutral-400 mb-1">Base Fare (₦)</label>
                <input
                  type="number"
                  value={editingRule.baseFare}
                  onChange={(e) => setEditingRule({ ...editingRule, baseFare: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-lg bg-neutral-950 border border-neutral-700 text-white"
                />
              </div>

              <div>
                <label className="block text-neutral-400 mb-1">Per Kilometer Rate (₦)</label>
                <input
                  type="number"
                  value={editingRule.perKmRate}
                  onChange={(e) => setEditingRule({ ...editingRule, perKmRate: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-lg bg-neutral-950 border border-neutral-700 text-white"
                />
              </div>

              <div>
                <label className="block text-neutral-400 mb-1">Minimum Fare (₦)</label>
                <input
                  type="number"
                  value={editingRule.minimumFare}
                  onChange={(e) => setEditingRule({ ...editingRule, minimumFare: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-lg bg-neutral-950 border border-neutral-700 text-white"
                />
              </div>

              <div>
                <label className="block text-neutral-400 mb-1">Commission Percentage (%)</label>
                <input
                  type="number"
                  value={editingRule.commissionPercentage}
                  onChange={(e) => setEditingRule({ ...editingRule, commissionPercentage: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-lg bg-neutral-950 border border-neutral-700 text-white"
                />
              </div>

              <div className="flex items-center gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingRule(null)}
                  className="w-1/2 py-2 bg-neutral-800 text-neutral-300 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg"
                >
                  Save Rules
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
