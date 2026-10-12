import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Incident } from '../../types';
import {
  Shield,
  ShieldAlert,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Phone,
  FileText,
  User,
  Plus,
  Send,
  Lock,
  ArrowRight
} from 'lucide-react';

export const SecurityDashboard: React.FC = () => {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<any>(null);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Selected incident investigation dossier
  const [selectedIncident, setSelectedIncident] = useState<any | null>(null);
  const [newNote, setNewNote] = useState('');
  const [resolutionSummary, setResolutionSummary] = useState('');
  const [resolving, setResolving] = useState(false);

  const fetchSecurityData = async () => {
    try {
      const [metricsRes, incidentsRes] = await Promise.all([
        fetch('/api/security/dashboard'),
        fetch(`/api/security/incidents?priority=${priorityFilter}&status=${statusFilter}`)
      ]);
      const mData = await metricsRes.json();
      const iData = await incidentsRes.json();

      if (mData.success) setMetrics(mData.metrics);
      if (iData.success) setIncidents(iData.incidents || []);
    } catch (err) {
      console.error('Error fetching security data:', err);
    }
  };

  useEffect(() => {
    fetchSecurityData();
    const interval = setInterval(fetchSecurityData, 5000);
    return () => clearInterval(interval);
  }, [priorityFilter, statusFilter]);

  // Open full dossier
  const handleOpenDossier = async (incidentId: string) => {
    try {
      const res = await fetch(`/api/security/incidents/${incidentId}`);
      const data = await res.json();
      if (data.success) {
        setSelectedIncident(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Add investigation note
  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIncident || !newNote) return;
    try {
      const res = await fetch(`/api/security/incidents/${selectedIncident.incident.id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newNote })
      });
      const data = await res.json();
      if (data.success) {
        setNewNote('');
        await handleOpenDossier(selectedIncident.incident.id);
        await fetchSecurityData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Escalate to Police
  const handleEscalateToPolice = async () => {
    if (!selectedIncident) return;
    try {
      const res = await fetch(`/api/security/incidents/${selectedIncident.incident.id}/escalate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dispatchNotes: 'Liaison with Zamfara Police Command Shinkafi Division.' })
      });
      const data = await res.json();
      if (data.success) {
        await handleOpenDossier(selectedIncident.incident.id);
        await fetchSecurityData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Resolve Incident
  const handleResolveIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIncident || !resolutionSummary) return;
    try {
      const res = await fetch(`/api/security/incidents/${selectedIncident.incident.id}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolutionSummary })
      });
      const data = await res.json();
      if (data.success) {
        setResolving(false);
        setResolutionSummary('');
        await handleOpenDossier(selectedIncident.incident.id);
        await fetchSecurityData();
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
          <div className="text-xs text-rose-400 font-medium flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Zamfara State Transport Security & Rapid Incident Desk</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight mt-0.5">
            Security Control Officer: {user?.profile?.fullName || 'Inspector Lawal Zamfara (Rtd.)'}
          </h1>
          <p className="text-xs text-neutral-400 mt-0.5">
            Authorized Safety Investigation Division · Police Liaison Hotlink Active
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-4 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-neutral-300">
            <span className="text-neutral-500">Police Command Hotline:</span>{' '}
            <span className="font-mono text-emerald-400 font-bold">+234 803 123 4567</span>
          </div>
        </div>
      </div>

      {/* Security Incident Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800">
          <span className="text-xs text-neutral-400">Total Logged Incidents</span>
          <div className="text-2xl font-bold text-white font-mono mt-1">
            {metrics?.totalIncidents ?? 2}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800">
          <span className="text-xs text-neutral-400">Critical Safety Alerts</span>
          <div className="text-2xl font-bold text-rose-400 font-mono mt-1">
            {metrics?.criticalCount ?? 1}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800">
          <span className="text-xs text-neutral-400">Escalated to Police</span>
          <div className="text-2xl font-bold text-amber-400 font-mono mt-1">
            {metrics?.escalatedCount ?? 1}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800">
          <span className="text-xs text-neutral-400">Average Response Time</span>
          <div className="text-2xl font-bold text-cyan-400 font-mono mt-1">
            4.8 min
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Incidents Triage Queue */}
        <div className="lg:col-span-7 space-y-4">
          <div className="p-6 rounded-2xl bg-neutral-900 border border-neutral-800 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-white tracking-tight">Active Incident Reports</h2>
                <p className="text-xs text-neutral-400">Real-time reports from passengers, drivers, and automated alarms</p>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg bg-neutral-950 border border-neutral-700 text-white text-xs"
                >
                  <option value="all">All Priorities</option>
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg bg-neutral-950 border border-neutral-700 text-white text-xs"
                >
                  <option value="all">All Statuses</option>
                  <option value="new">New</option>
                  <option value="under_investigation">Under Investigation</option>
                  <option value="escalated">Escalated</option>
                  <option value="resolved">Resolved</option>
                </select>
              </div>
            </div>

            <div className="space-y-3">
              {incidents.map((inc) => (
                <div
                  key={inc.id}
                  onClick={() => handleOpenDossier(inc.id)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    selectedIncident?.incident?.id === inc.id
                      ? 'bg-neutral-800/80 border-emerald-500 shadow-lg'
                      : 'bg-neutral-950 border-neutral-800 hover:border-neutral-700'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        inc.priority === 'critical'
                          ? 'bg-rose-950 text-rose-400 border border-rose-800'
                          : inc.priority === 'high'
                          ? 'bg-amber-950 text-amber-400 border border-amber-800'
                          : 'bg-neutral-800 text-neutral-400'
                      }`}>
                        {inc.priority}
                      </span>
                      <span className="font-mono text-neutral-400 font-semibold">{inc.ticketNumber}</span>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-neutral-900 border border-neutral-800 text-neutral-400 uppercase">
                      {inc.status.replace('_', ' ')}
                    </span>
                  </div>

                  <h3 className="text-sm font-semibold text-white">{inc.subject}</h3>
                  <p className="text-xs text-neutral-400 mt-1 line-clamp-2 leading-relaxed">
                    {inc.description}
                  </p>

                  <div className="flex items-center justify-between text-[11px] text-neutral-500 pt-2 mt-2 border-t border-neutral-900">
                    <span>Reported by: <span className="text-neutral-300 capitalize">{inc.reportedRole} ({inc.reporterName})</span></span>
                    <span>{new Date(inc.createdAt).toLocaleTimeString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Incident Investigation Dossier */}
        <div className="lg:col-span-5 space-y-4">
          {selectedIncident ? (
            <div className="p-6 rounded-2xl bg-neutral-900 border border-neutral-800 shadow-xl space-y-6 text-xs">
              <div className="border-b border-neutral-800 pb-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono font-bold text-white text-sm">{selectedIncident.incident.ticketNumber}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    selectedIncident.incident.priority === 'critical' ? 'bg-rose-950 text-rose-400 border border-rose-800' : 'bg-neutral-800 text-neutral-400'
                  }`}>
                    {selectedIncident.incident.priority}
                  </span>
                </div>
                <h3 className="text-base font-bold text-white mt-1">{selectedIncident.incident.subject}</h3>
                <p className="text-neutral-300 mt-2 leading-relaxed">{selectedIncident.incident.description}</p>
              </div>

              {/* Reporter Info */}
              <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-1">
                <div className="font-semibold text-white">Complainant / Reporter Details:</div>
                <div className="text-neutral-400">Name: <span className="text-white">{selectedIncident.reporter?.fullName}</span></div>
                <div className="text-neutral-400">Phone: <span className="text-emerald-400 font-mono">{selectedIncident.reporter?.phone}</span></div>
                <div className="text-neutral-400">Role: <span className="text-white capitalize">{selectedIncident.reporter?.role}</span></div>
              </div>

              {/* Associated Trip if any */}
              {selectedIncident.ride && (
                <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-1">
                  <div className="font-semibold text-white">Associated Trip Information:</div>
                  <div className="text-neutral-400">Trip ID: <span className="font-mono text-white">{selectedIncident.ride.id}</span></div>
                  <div className="text-neutral-400">Driver: <span className="text-white">{selectedIncident.ride.driverName} ({selectedIncident.ride.driverPhone})</span></div>
                  <div className="text-neutral-400">Vehicle: <span className="font-mono text-white">{selectedIncident.ride.vehiclePlate}</span></div>
                </div>
              )}

              {/* Action Buttons: Escalate to Police / Resolve */}
              <div className="flex items-center gap-3 pt-1">
                {!selectedIncident.incident.escalatedToPolice && (
                  <button
                    onClick={handleEscalateToPolice}
                    className="w-1/2 py-2.5 bg-rose-950/80 hover:bg-rose-900 border border-rose-800 text-rose-300 font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5"
                  >
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>Escalate to Police</span>
                  </button>
                )}
                {selectedIncident.incident.status !== 'resolved' && (
                  <button
                    onClick={() => setResolving(true)}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Record Formal Resolution</span>
                  </button>
                )}
              </div>

              {/* Resolution form if opened */}
              {resolving && (
                <form onSubmit={handleResolveIncident} className="p-4 rounded-xl bg-neutral-950 border border-emerald-500/40 space-y-3">
                  <div className="font-semibold text-emerald-400">Documented Incident Resolution:</div>
                  <textarea
                    rows={3}
                    value={resolutionSummary}
                    onChange={(e) => setResolutionSummary(e.target.value)}
                    placeholder="Document outcome, disciplinary measures or recovered property..."
                    className="w-full px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-700 text-white text-xs"
                    required
                  />
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setResolving(false)}
                      className="w-1/2 py-1.5 bg-neutral-800 text-neutral-300 rounded"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="w-1/2 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded"
                    >
                      Submit Resolution
                    </button>
                  </div>
                </form>
              )}

              {/* Investigation Timeline Notes */}
              <div className="space-y-3 pt-2 border-t border-neutral-800">
                <div className="font-semibold text-white flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-neutral-400" />
                  <span>Investigation Notes Timeline ({selectedIncident.notes?.length || 0})</span>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {selectedIncident.notes?.map((n: any) => (
                    <div key={n.id} className="p-2.5 rounded-lg bg-neutral-950 border border-neutral-800/80 space-y-1">
                      <div className="flex items-center justify-between text-[11px] text-neutral-500">
                        <span className="font-semibold text-neutral-300">{n.authorName}</span>
                        <span>{new Date(n.createdAt).toLocaleTimeString()}</span>
                      </div>
                      <p className="text-neutral-200 text-xs">{n.content}</p>
                    </div>
                  ))}
                </div>

                {/* Add Note Input */}
                <form onSubmit={handleAddNote} className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Add progress note or witness statement..."
                    className="flex-1 px-3 py-2 rounded-lg bg-neutral-950 border border-neutral-700 text-white text-xs"
                  />
                  <button
                    type="submit"
                    className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>
              </div>
            </div>
          ) : (
            <div className="p-8 rounded-2xl bg-neutral-900 border border-neutral-800 text-center text-xs text-neutral-500 space-y-2">
              <Shield className="w-8 h-8 text-neutral-600 mx-auto" />
              <p>Select an incident from the triage queue to open its full investigative file and evidence timeline.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
