const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 5050;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));

// Storage configuration for uploaded photos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, 'public', 'uploads');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'civic-' + uniqueSuffix + path.extname(file.originalname || '.jpg'));
  }
});
const upload = multer({ storage });

// Database Initialization
const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) console.error('Database connection error:', err);
  else console.log('SQLite Database connected at:', dbPath);
});

// Haversine Distance helper (meters)
function getDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const rad = Math.PI / 180;
  const phi1 = lat1 * rad;
  const phi2 = lat2 * rad;
  const deltaPhi = (lat2 - lat1) * rad;
  const deltaLambda = (lon2 - lon1) * rad;

  const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
            Math.cos(phi1) * Math.cos(phi2) *
            Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

// CIPI Calculation Function
function computeCIPI(baseSeverity, populationDensity, vulnerabilityProximity, vouchCount, createdAt, slaHours) {
  const S = Math.min(100, Math.max(0, Number(baseSeverity) || 50));
  const D = Math.min(100, Math.max(0, Number(populationDensity) || 50));
  const V = Math.min(100, Math.max(0, Number(vulnerabilityProximity) || 0));
  const C = Math.min(100, Math.round(28 * Math.log2(1 + (Number(vouchCount) || 1))));

  const createdTime = createdAt ? new Date(createdAt).getTime() : Date.now();
  const ageHours = (Date.now() - createdTime) / (1000 * 60 * 60);
  const targetSla = Number(slaHours) || 24;
  const slaRatio = ageHours / targetSla;
  const T = Math.min(100, Math.round(slaRatio * 60));

  const rawScore = (S * 0.35) + (D * 0.20) + (V * 0.20) + (C * 0.15) + (T * 0.10);
  return Math.min(100, Math.max(10, Math.round(rawScore)));
}

// Department routing helper
function autoRouteDepartment(category) {
  switch (String(category).toUpperCase()) {
    case 'WATER':
      return { dept: 'Panchayat & Rural Water Supply (PRWSD)', code: 'WATER', sla: 12 };
    case 'ROADS':
      return { dept: 'Public Works Department (PWD - Roads)', code: 'PWD', sla: 24 };
    case 'ELECTRICITY':
      return { dept: 'State Electricity Distribution Board (DISCOM)', code: 'POWER', sla: 6 };
    case 'SANITATION':
      return { dept: 'Municipal Solid Waste & Drainage Cell', code: 'SAN', sla: 24 };
    case 'SAFETY':
    default:
      return { dept: 'Civil Defence & Public Hazard Response', code: 'CIVIL', sla: 8 };
  }
}

// Create Tables & Seed Data
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS incidents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tracking_id TEXT UNIQUE,
      title TEXT NOT NULL,
      description TEXT,
      category TEXT NOT NULL,
      subcategory TEXT,
      ward TEXT NOT NULL,
      latitude REAL,
      longitude REAL,
      address TEXT,
      reported_by TEXT,
      reporter_role TEXT,
      status TEXT DEFAULT 'PENDING',
      base_severity INTEGER DEFAULT 50,
      population_density INTEGER DEFAULT 60,
      vulnerability_proximity INTEGER DEFAULT 0,
      vulnerability_tag TEXT,
      vouch_count INTEGER DEFAULT 1,
      cipi_score INTEGER DEFAULT 50,
      sla_hours INTEGER DEFAULT 24,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      assigned_to TEXT,
      assigned_department TEXT,
      photo_url TEXT,
      after_photo_url TEXT,
      resolution_notes TEXT,
      citizen_verified INTEGER DEFAULT 0,
      parent_cluster_id INTEGER,
      trust_score INTEGER DEFAULT 85
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS activity_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      incident_id INTEGER,
      action TEXT,
      performed_by TEXT,
      notes TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS vouches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      incident_id INTEGER,
      user_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(incident_id, user_id)
    )
  `);

  // Seed sample data if empty
  db.get('SELECT COUNT(*) as count FROM incidents', (err, row) => {
    if (err) return;
    if (row && row.count === 0) {
      console.log('Seeding initial realistic civic incidents...');
      const seeds = [
        {
          tracking_id: 'CIVIC-2026-001',
          title: 'High-Voltage Snapped Wire Dangling near Primary School Gate',
          description: 'Live 11kV electrical cable snapped during morning winds. Touching ground 20m from Govt Primary School entrance. Extremely dangerous for passing children and livestock.',
          category: 'ELECTRICITY',
          subcategory: 'Live Cable Breakage',
          ward: 'Ward 1 - Rampur Rural',
          latitude: 17.4325,
          longitude: 78.4012,
          address: 'Opposite Govt Primary School, Main Bus Stop, Rampur',
          reported_by: 'Kishan Reddy (Local Resident)',
          reporter_role: 'Citizen',
          status: 'PENDING',
          base_severity: 98,
          population_density: 85,
          vulnerability_proximity: 100,
          vulnerability_tag: '🏫 School Zone (<25m)',
          vouch_count: 24,
          sla_hours: 4,
          created_at: new Date(Date.now() - 2.5 * 3600000).toISOString(),
          assigned_department: 'State Electricity Distribution Board (DISCOM)',
          assigned_to: 'Er. S. Rao (Lineman Unit 3)',
          photo_url: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=600&q=80',
          trust_score: 95
        },
        {
          tracking_id: 'CIVIC-2026-002',
          title: 'Primary Drinking Water Pipeline Rupture & Road Flooding',
          description: '300mm main drinking supply pipe burst. Clean water gushing at high pressure for 5 hours. Over 300 households facing complete water outage and road is submerged.',
          category: 'WATER',
          subcategory: 'Mainline Burst',
          ward: 'Ward 3 - Gandhi Bazaar',
          latitude: 17.4390,
          longitude: 78.4095,
          address: 'Bazaar Cross Road #4, Near Weekly Rythu Market',
          reported_by: 'Anitha Sharma (Shopkeeper)',
          reporter_role: 'Citizen',
          status: 'DISPATCHED',
          base_severity: 88,
          population_density: 90,
          vulnerability_proximity: 60,
          vulnerability_tag: '🛒 High-Density Market',
          vouch_count: 18,
          sla_hours: 12,
          created_at: new Date(Date.now() - 4.2 * 3600000).toISOString(),
          assigned_department: 'Panchayat & Rural Water Supply (PRWSD)',
          assigned_to: 'Field Crew Alpha (Supervisor Venkat)',
          photo_url: 'https://images.unsplash.com/photo-1584824486509-112e4181ff6b?auto=format&fit=crop&w=600&q=80',
          trust_score: 90
        },
        {
          tracking_id: 'CIVIC-2026-003',
          title: 'Deep Crater Road Cave-in on Civil Hospital Ambulance Route',
          description: 'Torrential rains created a 4-foot deep cave-in spanning half the arterial road. Ambulances rushing to Community Health Center are forced to take a 4km detour.',
          category: 'ROADS',
          subcategory: 'Arterial Cave-in',
          ward: 'Ward 2 - Hospital Zone',
          latitude: 17.4455,
          longitude: 78.3980,
          address: 'Civil Hospital Approach Rd, Near Sector 2 Fire Station',
          reported_by: 'Dr. Neha Deshmukh (Duty Doctor)',
          reporter_role: 'Medical Officer',
          status: 'IN_PROGRESS',
          base_severity: 85,
          population_density: 85,
          vulnerability_proximity: 95,
          vulnerability_tag: '🏥 Community Health Center (<150m)',
          vouch_count: 31,
          sla_hours: 24,
          created_at: new Date(Date.now() - 11 * 3600000).toISOString(),
          assigned_department: 'Public Works Department (PWD - Roads)',
          assigned_to: 'Er. Rajesh Sharma (PWD Assistant Engineer)',
          photo_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=600&q=80',
          trust_score: 98
        },
        {
          tracking_id: 'CIVIC-2026-004',
          title: 'Blocked Concrete Storm Drain with Foul Sewage Backflow',
          description: 'Culvert clogged with plastic waste and silt. Black stinking sewage backing up into courtyard of residential houses and Anganwadi center.',
          category: 'SANITATION',
          subcategory: 'Sewage Overflow',
          ward: 'Ward 4 - Green Valley Colony',
          latitude: 17.4280,
          longitude: 78.4150,
          address: 'Lane 7, Near Anganwadi Center 12',
          reported_by: 'Ramesh Babu (Resident)',
          reporter_role: 'Citizen',
          status: 'PENDING',
          base_severity: 75,
          population_density: 70,
          vulnerability_proximity: 80,
          vulnerability_tag: '👶 Anganwadi Center (<80m)',
          vouch_count: 12,
          sla_hours: 24,
          created_at: new Date(Date.now() - 8 * 3600000).toISOString(),
          assigned_department: 'Municipal Solid Waste & Drainage Cell',
          assigned_to: 'Sanitation Inspector Suresh',
          photo_url: 'https://images.unsplash.com/photo-1611288875605-1a8525b6a715?auto=format&fit=crop&w=600&q=80',
          trust_score: 82
        },
        {
          tracking_id: 'CIVIC-2026-005',
          title: 'Public Borewell Pump Burnout - Repaired, Awaiting Citizen Quorum Confirmation',
          description: 'Submersible motor burned out due to voltage fluctuations. PWD installed a new 5HP motor and tested water pressure. Before/After photos uploaded for public sign-off.',
          category: 'WATER',
          subcategory: 'Community Borewell Pump',
          ward: 'Ward 1 - Rampur Rural',
          latitude: 17.4360,
          longitude: 78.4045,
          address: 'Community Center Yard, Rampur Village',
          reported_by: 'Panchayat Member Lakshmi',
          reporter_role: 'Elected Representative',
          status: 'PENDING_VERIFICATION',
          base_severity: 65,
          population_density: 65,
          vulnerability_proximity: 40,
          vulnerability_tag: '💧 Central Village Tap',
          vouch_count: 22,
          sla_hours: 24,
          created_at: new Date(Date.now() - 28 * 3600000).toISOString(),
          assigned_department: 'Panchayat & Rural Water Supply (PRWSD)',
          assigned_to: 'Er. Venkat (PRWSD Inspector)',
          photo_url: 'https://images.unsplash.com/photo-1541888946425-d0fbb18086f6?auto=format&fit=crop&w=600&q=80',
          after_photo_url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80',
          resolution_notes: 'New 5HP Kirloskar submersible pump installed with lightning surge protector. Discharge rate verified at 120 liters/min. Awaiting citizen confirmation.',
          citizen_verified: 0,
          trust_score: 92
        }
      ];

      const stmt = db.prepare(`
        INSERT INTO incidents (
          tracking_id, title, description, category, subcategory, ward,
          latitude, longitude, address, reported_by, reporter_role, status,
          base_severity, population_density, vulnerability_proximity,
          vulnerability_tag, vouch_count, cipi_score, sla_hours, created_at,
          assigned_department, assigned_to, photo_url, after_photo_url,
          resolution_notes, citizen_verified, trust_score
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      seeds.forEach(s => {
        const cipi = computeCIPI(s.base_severity, s.population_density, s.vulnerability_proximity, s.vouch_count, s.created_at, s.sla_hours);
        stmt.run([
          s.tracking_id, s.title, s.description, s.category, s.subcategory, s.ward,
          s.latitude, s.longitude, s.address, s.reported_by, s.reporter_role, s.status,
          s.base_severity, s.population_density, s.vulnerability_proximity,
          s.vulnerability_tag, s.vouch_count, cipi, s.sla_hours, s.created_at,
          s.assigned_department, s.assigned_to, s.photo_url, s.after_photo_url || null,
          s.resolution_notes || null, s.citizen_verified || 0, s.trust_score
        ]);
      });
      stmt.finalize();
      console.log('Seed completed successfully with 5 rich civic complaints.');
    }
  });
});

// REST API ROUTES

// 1. Get All Incidents with sorting & filtering
app.get('/api/incidents', (req, res) => {
  const { category, ward, status, search, sort = 'cipi' } = req.query;

  let query = 'SELECT * FROM incidents WHERE 1=1';
  const params = [];

  if (category && category !== 'ALL') {
    query += ' AND UPPER(category) = ?';
    params.push(category.toUpperCase());
  }

  if (ward && ward !== 'ALL') {
    query += ' AND ward = ?';
    params.push(ward);
  }

  if (status && status !== 'ALL') {
    query += ' AND status = ?';
    params.push(status);
  }

  if (search) {
    query += ' AND (title LIKE ? OR description LIKE ? OR tracking_id LIKE ? OR address LIKE ?)';
    const s = '%' + search + '%';
    params.push(s, s, s, s);
  }

  if (sort === 'date') {
    query += ' ORDER BY created_at DESC';
  } else if (sort === 'vouches') {
    query += ' ORDER BY vouch_count DESC';
  } else {
    query += ' ORDER BY cipi_score DESC, created_at DESC';
  }

  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ success: false, error: err.message });

    const updated = (rows || []).map(r => {
      const dynamicCipi = computeCIPI(
        r.base_severity,
        r.population_density,
        r.vulnerability_proximity,
        r.vouch_count,
        r.created_at,
        r.sla_hours
      );
      return { ...r, cipi_score: dynamicCipi };
    });

    if (sort === 'cipi' || !sort) {
      updated.sort((a, b) => b.cipi_score - a.cipi_score);
    }

    res.json({ success: true, data: updated });
  });
});

// 2. Check Proximity for Duplicate Detection & Clustering
app.get('/api/incidents/check-duplicate', (req, res) => {
  const { latitude, longitude, category, threshold = 60 } = req.query;
  if (!latitude || !longitude) {
    return res.json({ success: true, duplicateFound: false });
  }

  const lat = parseFloat(latitude);
  const lon = parseFloat(longitude);

  db.all('SELECT * FROM incidents WHERE status != "RESOLVED" AND status != "REJECTED"', [], (err, rows) => {
    if (err) return res.status(500).json({ success: false, error: err.message });

    let closest = null;
    let minDistance = Infinity;

    (rows || []).forEach(r => {
      if (r.latitude && r.longitude) {
        const d = getDistanceMeters(lat, lon, r.latitude, r.longitude);
        if (d < minDistance) {
          minDistance = d;
          closest = { ...r, distanceMeters: d };
        }
      }
    });

    if (closest && minDistance <= Number(threshold)) {
      res.json({
        success: true,
        duplicateFound: true,
        distanceMeters: minDistance,
        matchedIncident: closest,
        message: 'An active issue was reported ' + minDistance + 'm away in ' + closest.ward
      });
    } else {
      res.json({ success: true, duplicateFound: false });
    }
  });
});

// 3. Create New Civic Incident
app.post('/api/incidents', upload.single('photo'), (req, res) => {
  const {
    title, description, category, subcategory, ward,
    latitude, longitude, address, reported_by, reporter_role,
    base_severity, population_density, vulnerability_proximity, vulnerability_tag
  } = req.body;

  if (!title || !category || !ward) {
    return res.status(400).json({ success: false, error: 'Title, category and ward are required.' });
  }

  const tracking_id = 'CIVIC-2026-' + Math.floor(100 + Math.random() * 900);
  const route = autoRouteDepartment(category);
  const photo_url = req.file ? '/uploads/' + req.file.filename : (req.body.photo_url || 'https://images.unsplash.com/photo-1584824486509-112e4181ff6b?auto=format&fit=crop&w=600&q=80');
  const lat = latitude ? parseFloat(latitude) : 17.4350;
  const lon = longitude ? parseFloat(longitude) : 78.4050;

  const bSeverity = Number(base_severity) || 60;
  const pDensity = Number(population_density) || 60;
  const vProximity = Number(vulnerability_proximity) || 20;
  const cipi = computeCIPI(bSeverity, pDensity, vProximity, 1, new Date().toISOString(), route.sla);

  const query = `
    INSERT INTO incidents (
      tracking_id, title, description, category, subcategory, ward,
      latitude, longitude, address, reported_by, reporter_role, status,
      base_severity, population_density, vulnerability_proximity,
      vulnerability_tag, vouch_count, cipi_score, sla_hours,
      assigned_department, photo_url, trust_score
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?, ?, ?, ?, 1, ?, ?, ?, ?, 85)
  `;

  db.run(query, [
    tracking_id, title, description || '', category.toUpperCase(), subcategory || '', ward,
    lat, lon, address || 'Reported Location', reported_by || 'Anonymous Citizen',
    reporter_role || 'Citizen', bSeverity, pDensity, vProximity,
    vulnerability_tag || 'Standard Zone', cipi, route.sla,
    route.dept, photo_url
  ], function (err) {
    if (err) return res.status(500).json({ success: false, error: err.message });

    const newId = this.lastID;
    db.run(
      'INSERT INTO activity_logs (incident_id, action, performed_by, notes) VALUES (?, ?, ?, ?)',
      [newId, 'REPORTED', reported_by || 'Citizen', 'Report filed and automatically assigned to ' + route.dept]
    );

    res.json({
      success: true,
      message: 'Grievance registered successfully with dynamic CIPI priority ' + cipi + '/100.',
      incidentId: newId,
      trackingId: tracking_id,
      cipiScore: cipi,
      assignedDepartment: route.dept,
      slaHours: route.sla
    });
  });
});

// 4. Upvote / Vouch ("I Face This Too")
app.post('/api/incidents/:id/vouch', (req, res) => {
  const incidentId = req.params.id;
  const userId = req.body.user_id || 'user-' + Math.floor(Math.random() * 10000);

  db.run('INSERT INTO vouches (incident_id, user_id) VALUES (?, ?)', [incidentId, userId], function (err) {
    if (err) {
      if (err.message && err.message.includes('UNIQUE constraint failed')) {
        return res.json({ success: false, message: 'You have already vouched for this issue.' });
      }
      return res.status(500).json({ success: false, error: err.message });
    }

    db.get('SELECT * FROM incidents WHERE id = ?', [incidentId], (err, incident) => {
      if (err || !incident) return res.status(404).json({ success: false, error: 'Incident not found' });

      const newVouches = (incident.vouch_count || 1) + 1;
      const updatedCipi = computeCIPI(
        incident.base_severity,
        incident.population_density,
        incident.vulnerability_proximity,
        newVouches,
        incident.created_at,
        incident.sla_hours
      );

      db.run('UPDATE incidents SET vouch_count = ?, cipi_score = ? WHERE id = ?', [newVouches, updatedCipi, incidentId], (updateErr) => {
        if (updateErr) return res.status(500).json({ success: false, error: updateErr.message });

        db.run(
          'INSERT INTO activity_logs (incident_id, action, performed_by, notes) VALUES (?, ?, ?, ?)',
          [incidentId, 'COMMUNITY_VOUCH', userId, 'Citizen corroborated issue. Vouch count escalated to ' + newVouches + '. CIPI increased to ' + updatedCipi]
        );

        res.json({
          success: true,
          message: 'Vouch registered! Incident priority escalated.',
          newVouchCount: newVouches,
          newCipiScore: updatedCipi
        });
      });
    });
  });
});

// 5. Update Status (Dispatch crew / In Progress / Reject)
app.patch('/api/incidents/:id/status', (req, res) => {
  const incidentId = req.params.id;
  const { status, assigned_to, notes, officer_name } = req.body;

  if (!status) return res.status(400).json({ success: false, error: 'Status is required' });

  let query = 'UPDATE incidents SET status = ?';
  const params = [status];

  if (assigned_to) {
    query += ', assigned_to = ?';
    params.push(assigned_to);
  }

  query += ' WHERE id = ?';
  params.push(incidentId);

  db.run(query, params, function (err) {
    if (err) return res.status(500).json({ success: false, error: err.message });

    db.run(
      'INSERT INTO activity_logs (incident_id, action, performed_by, notes) VALUES (?, ?, ?, ?)',
      [incidentId, 'STATUS_UPDATE', officer_name || 'Authority', 'Status changed to ' + status + '. ' + (notes || '')]
    );

    res.json({ success: true, message: 'Status updated to ' + status });
  });
});

// 6. Complete Work & Upload "After" Proof Photo
app.post('/api/incidents/:id/resolve', upload.single('after_photo'), (req, res) => {
  const incidentId = req.params.id;
  const { resolution_notes, officer_name } = req.body;
  const after_photo_url = req.file ? '/uploads/' + req.file.filename : (req.body.after_photo_url || 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80');

  const query = `
    UPDATE incidents SET
      status = 'PENDING_VERIFICATION',
      after_photo_url = ?,
      resolution_notes = ?,
      citizen_verified = 0
    WHERE id = ?
  `;

  db.run(query, [after_photo_url, resolution_notes || 'Field work completed.', incidentId], function (err) {
    if (err) return res.status(500).json({ success: false, error: err.message });

    db.run(
      'INSERT INTO activity_logs (incident_id, action, performed_by, notes) VALUES (?, ?, ?, ?)',
      [incidentId, 'WORK_COMPLETED', officer_name || 'Field Crew', 'Proof photo submitted. Ticket opened for 48-Hour Citizen Verification Quorum.']
    );

    res.json({
      success: true,
      message: 'Resolution proof submitted! Citizen quorum verification initiated.'
    });
  });
});

// 7. Citizen Quorum Verification (Confirm or Dispute)
app.post('/api/incidents/:id/verify', (req, res) => {
  const incidentId = req.params.id;
  const { decision, citizen_name, feedback } = req.body;

  if (decision === 'CONFIRM') {
    db.run('UPDATE incidents SET status = "RESOLVED", citizen_verified = 1 WHERE id = ?', [incidentId], function (err) {
      if (err) return res.status(500).json({ success: false, error: err.message });

      db.run(
        'INSERT INTO activity_logs (incident_id, action, performed_by, notes) VALUES (?, ?, ?, ?)',
        [incidentId, 'CITIZEN_VERIFIED_RESOLVED', citizen_name || 'Citizen Quorum', 'Resolution verified on ground: ' + (feedback || 'Satisfactory work.')]
      );

      res.json({ success: true, message: 'Ticket officially verified and resolved by citizen quorum!' });
    });
  } else {
    db.run('UPDATE incidents SET status = "IN_PROGRESS", citizen_verified = -1 WHERE id = ?', [incidentId], function (err) {
      if (err) return res.status(500).json({ success: false, error: err.message });

      db.run(
        'INSERT INTO activity_logs (incident_id, action, performed_by, notes) VALUES (?, ?, ?, ?)',
        [incidentId, 'RESOLUTION_DISPUTED', citizen_name || 'Citizen Quorum', 'REJECTED by citizen: ' + (feedback || 'Problem still exists on ground. Escalated to District Head.')]
      );

      res.json({ success: true, message: 'Resolution disputed by citizen! Ticket re-opened and escalated.' });
    });
  }
});

// 8. Platform Overview Stats & KPIs
app.get('/api/stats', (req, res) => {
  const stats = {};

  db.get('SELECT COUNT(*) as total, SUM(CASE WHEN cipi_score >= 75 AND status != "RESOLVED" THEN 1 ELSE 0 END) as critical, SUM(CASE WHEN status = "RESOLVED" THEN 1 ELSE 0 END) as resolved, SUM(CASE WHEN status = "PENDING_VERIFICATION" THEN 1 ELSE 0 END) as pendingVerification, SUM(vouch_count) as totalVouches FROM incidents', (err, row) => {
    if (err) return res.status(500).json({ success: false, error: err.message });

    stats.totalIncidents = (row && row.total) || 0;
    stats.criticalActive = (row && row.critical) || 0;
    stats.resolved = (row && row.resolved) || 0;
    stats.pendingVerification = (row && row.pendingVerification) || 0;
    stats.totalCommunityVouches = (row && row.totalVouches) || 0;
    stats.resolutionRate = stats.totalIncidents ? Math.round((stats.resolved / stats.totalIncidents) * 100) : 0;
    stats.meanResolutionHours = 14.2;

    db.all('SELECT category, COUNT(*) as count, AVG(cipi_score) as avgCipi FROM incidents GROUP BY category', (cErr, cRows) => {
      stats.categories = cRows || [];
      db.all('SELECT ward, COUNT(*) as count, SUM(CASE WHEN status="RESOLVED" THEN 1 ELSE 0 END) as resolved FROM incidents GROUP BY ward', (wErr, wRows) => {
        stats.wards = wRows || [];
        res.json({ success: true, data: stats });
      });
    });
  });
});

// Start Express Server
app.listen(PORT, '0.0.0.0', () => {
  console.log('=============================================================');
  console.log('  CIVICPULSE (जनसमाधान) CORE ENGINE ACTIVE ON PORT ' + PORT);
  console.log('  Local URL:   http://localhost:' + PORT);
  console.log('  Network URL: http://0.0.0.0:' + PORT);
  console.log('=============================================================');
});
