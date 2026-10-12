import { Router, Response } from 'express';
import crypto from 'crypto';
import { db, Incident, IncidentPriority, IncidentStatus } from '../db.js';
import { AuthenticatedRequest, requireAuth, requireRole } from '../auth.js';

export const securityRouter = Router();

// Security Dashboard Metrics
securityRouter.get('/dashboard', requireAuth, requireRole('security_officer', 'admin'), (req: AuthenticatedRequest, res: Response): void => {
  const incidents = Array.from(db.incidents.values());

  const openIncidents = incidents.filter(i => i.status !== 'resolved' && i.status !== 'closed');
  const criticalIncidents = incidents.filter(i => i.priority === 'critical' && i.status !== 'closed');
  const escalatedToPolice = incidents.filter(i => i.escalatedToPolice);
  const resolvedIncidents = incidents.filter(i => i.status === 'resolved' || i.status === 'closed');

  // Breakdown by category
  const categoriesCount: Record<string, number> = {};
  incidents.forEach(i => {
    categoriesCount[i.category] = (categoriesCount[i.category] || 0) + 1;
  });

  res.json({
    success: true,
    metrics: {
      totalIncidents: incidents.length,
      openCount: openIncidents.length,
      criticalCount: criticalIncidents.length,
      escalatedCount: escalatedToPolice.length,
      resolvedCount: resolvedIncidents.length,
      averageResponseTimeMin: 4.8, // Shinkafi rapid desk benchmark
      categoriesCount
    },
    criticalEscalations: criticalIncidents.slice(0, 5),
    recentIncidents: incidents.slice(0, 10)
  });
});

// List Incidents with Filters
securityRouter.get('/incidents', requireAuth, requireRole('security_officer', 'admin'), (req: AuthenticatedRequest, res: Response): void => {
  const { priority, status, category } = req.query as { priority?: string; status?: string; category?: string };

  let list = Array.from(db.incidents.values())
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  if (priority && priority !== 'all') list = list.filter(i => i.priority === priority);
  if (status && status !== 'all') list = list.filter(i => i.status === status);
  if (category && category !== 'all') list = list.filter(i => i.category === category);

  const enriched = list.map(i => {
    const reporter = db.userProfiles.get(i.reportedByUserId);
    const reporterUser = db.users.get(i.reportedByUserId);
    return {
      ...i,
      reporterName: reporter?.fullName || 'User',
      reporterPhone: reporterUser?.phone
    };
  });

  res.json({ success: true, incidents: enriched });
});

// Get Single Incident Details & Investigation Dossier
securityRouter.get('/incidents/:id', requireAuth, requireRole('security_officer', 'admin'), (req: AuthenticatedRequest, res: Response): void => {
  const incident = db.incidents.get(req.params.id);
  if (!incident) {
    res.status(404).json({ success: false, error: 'Incident not found.' });
    return;
  }

  const reporter = db.userProfiles.get(incident.reportedByUserId);
  const reporterUser = db.users.get(incident.reportedByUserId);
  const notes = db.incidentNotes.filter(n => n.incidentId === incident.id);

  let rideData = null;
  if (incident.rideId) {
    const ride = db.rides.get(incident.rideId);
    if (ride) {
      const driver = ride.driverId ? db.userProfiles.get(ride.driverId) : null;
      const vehicle = ride.vehicleId ? db.vehicles.get(ride.vehicleId) : null;
      rideData = {
        ...ride,
        driverName: driver?.fullName,
        driverPhone: ride.driverId ? db.users.get(ride.driverId)?.phone : null,
        vehiclePlate: vehicle?.plateNumber,
        vehicleModel: vehicle ? `${vehicle.make} ${vehicle.model}` : null
      };
    }
  }

  // Audit this security investigation dossier access
  db.logAudit(
    req.user!.id,
    req.user!.role,
    'SECURITY_DOSSIER_VIEWED',
    'incident',
    incident.id,
    `Inspected safety file ${incident.ticketNumber}`
  );

  res.json({
    success: true,
    incident,
    reporter: {
      fullName: reporter?.fullName,
      phone: reporterUser?.phone,
      role: incident.reportedRole
    },
    ride: rideData,
    notes
  });
});

// Create Incident
securityRouter.post('/incidents', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const user = req.user!;
  const { rideId, category, priority = 'medium', subject, description, latitude, longitude } = req.body;

  if (!category || !subject || !description) {
    res.status(400).json({ success: false, error: 'Category, subject, and description are required.' });
    return;
  }

  const incidentId = `inc-${Date.now().toString(36)}`;
  const ticketNumber = `SHK-SEC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

  const newIncident: Incident = {
    id: incidentId,
    ticketNumber,
    rideId: rideId || undefined,
    reportedByUserId: user.id,
    reportedRole: user.role,
    category,
    priority: priority as IncidentPriority,
    status: 'new',
    subject,
    description,
    latitude,
    longitude,
    escalatedToPolice: priority === 'critical',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  db.incidents.set(incidentId, newIncident);

  db.logAudit(user.id, user.role, 'INCIDENT_REPORTED', 'incident', incidentId, `Reported ${category}: ${ticketNumber}`);

  res.status(201).json({ success: true, message: 'Incident report filed.', incident: newIncident });
});

// Assign Investigator
securityRouter.post('/incidents/:id/assign', requireAuth, requireRole('security_officer', 'admin'), (req: AuthenticatedRequest, res: Response): void => {
  const officerId = req.user!.id;
  const incident = db.incidents.get(req.params.id);

  if (!incident) {
    res.status(404).json({ success: false, error: 'Incident not found.' });
    return;
  }

  const officerProfile = db.userProfiles.get(officerId);
  incident.assignedOfficerId = officerId;
  incident.assignedOfficerName = officerProfile?.fullName || 'Security Officer';
  if (incident.status === 'new') {
    incident.status = 'under_investigation';
  }
  incident.updatedAt = new Date().toISOString();

  db.incidentNotes.push({
    id: crypto.randomUUID(),
    incidentId: incident.id,
    authorId: officerId,
    authorName: incident.assignedOfficerName,
    content: `Assigned investigation to Officer ${incident.assignedOfficerName}. Initial review started.`,
    isPrivate: false,
    createdAt: new Date().toISOString()
  });

  db.logAudit(officerId, 'security_officer', 'INCIDENT_ASSIGNED', 'incident', incident.id, `Officer ${incident.assignedOfficerName} assigned`);

  res.json({ success: true, message: 'Investigator assigned.', incident });
});

// Add Investigation Note
securityRouter.post('/incidents/:id/notes', requireAuth, requireRole('security_officer', 'admin'), (req: AuthenticatedRequest, res: Response): void => {
  const officerId = req.user!.id;
  const incident = db.incidents.get(req.params.id);

  if (!incident) {
    res.status(404).json({ success: false, error: 'Incident not found.' });
    return;
  }

  const { content, isPrivate = false } = req.body;
  if (!content) {
    res.status(400).json({ success: false, error: 'Note content is required.' });
    return;
  }

  const officerProfile = db.userProfiles.get(officerId);
  const note = {
    id: crypto.randomUUID(),
    incidentId: incident.id,
    authorId: officerId,
    authorName: officerProfile?.fullName || 'Security Officer',
    content,
    isPrivate: Boolean(isPrivate),
    createdAt: new Date().toISOString()
  };

  db.incidentNotes.push(note);
  incident.updatedAt = new Date().toISOString();

  db.logAudit(officerId, 'security_officer', 'INCIDENT_NOTE_ADDED', 'incident', incident.id, 'Investigation timeline entry recorded');

  res.status(201).json({ success: true, message: 'Investigation note added.', note });
});

// Escalate Incident (e.g. to Zamfara State Police or Corridor Taskforce)
securityRouter.post('/incidents/:id/escalate', requireAuth, requireRole('security_officer', 'admin'), (req: AuthenticatedRequest, res: Response): void => {
  const officerId = req.user!.id;
  const incident = db.incidents.get(req.params.id);

  if (!incident) {
    res.status(404).json({ success: false, error: 'Incident not found.' });
    return;
  }

  const { dispatchNotes = 'Escalated to Zamfara State Police Command and Shinkafi Corridor Rapid Response Unit' } = req.body;

  incident.status = 'escalated';
  incident.priority = 'critical';
  incident.escalatedToPolice = true;
  incident.updatedAt = new Date().toISOString();

  db.incidentNotes.push({
    id: crypto.randomUUID(),
    incidentId: incident.id,
    authorId: officerId,
    authorName: db.userProfiles.get(officerId)?.fullName || 'Security Officer',
    content: `ESCALATION RECORDED: ${dispatchNotes}. Contacted Police Liaison Desk.`,
    isPrivate: false,
    createdAt: new Date().toISOString()
  });

  db.logAudit(officerId, 'security_officer', 'INCIDENT_ESCALATED', 'incident', incident.id, `Escalated ticket ${incident.ticketNumber}`);

  res.json({ success: true, message: 'Incident formally escalated.', incident });
});

// Resolve Incident
securityRouter.post('/incidents/:id/resolve', requireAuth, requireRole('security_officer', 'admin'), (req: AuthenticatedRequest, res: Response): void => {
  const officerId = req.user!.id;
  const incident = db.incidents.get(req.params.id);

  if (!incident) {
    res.status(404).json({ success: false, error: 'Incident not found.' });
    return;
  }

  const { resolutionSummary } = req.body;
  if (!resolutionSummary) {
    res.status(400).json({ success: false, error: 'A documented resolution summary is required.' });
    return;
  }

  incident.status = 'resolved';
  incident.resolutionSummary = resolutionSummary;
  incident.resolvedAt = new Date().toISOString();
  incident.updatedAt = new Date().toISOString();

  db.incidentNotes.push({
    id: crypto.randomUUID(),
    incidentId: incident.id,
    authorId: officerId,
    authorName: db.userProfiles.get(officerId)?.fullName || 'Security Officer',
    content: `RESOLUTION: ${resolutionSummary}`,
    isPrivate: false,
    createdAt: new Date().toISOString()
  });

  db.logAudit(officerId, 'security_officer', 'INCIDENT_RESOLVED', 'incident', incident.id, `Resolved ticket ${incident.ticketNumber}`);

  res.json({ success: true, message: 'Incident resolved.', incident });
});
