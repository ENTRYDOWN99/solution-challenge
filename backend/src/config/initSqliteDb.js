const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

/**
 * Initialize SQLite schema and seed demo data
 */
function initializeDatabase(db) {
  // ------------------------------------------
  // CREATE TABLES
  // ------------------------------------------

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'volunteer' CHECK(role IN ('volunteer','ngo_admin','super_admin')),
      phone TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS organizations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT,
      contact_email TEXT,
      api_key TEXT UNIQUE,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS volunteers (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      skills TEXT DEFAULT '[]',
      home_lat REAL,
      home_lng REAL,
      max_radius_km REAL DEFAULT 25.0,
      availability TEXT DEFAULT '{}',
      languages TEXT DEFAULT '["English"]',
      trust_score REAL DEFAULT 50.0,
      active_task_count INTEGER DEFAULT 0,
      organization_id TEXT REFERENCES organizations(id) ON DELETE SET NULL,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS needs (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      category TEXT NOT NULL DEFAULT 'other' CHECK(category IN ('education','medical','water','food','shelter','plumbing','other')),
      location_lat REAL,
      location_lng REAL,
      area_name TEXT,
      urgency_score REAL DEFAULT 0.0,
      severity INTEGER DEFAULT 1 CHECK(severity >= 1 AND severity <= 5),
      num_people_affected INTEGER DEFAULT 1,
      time_sensitive INTEGER DEFAULT 0,
      vulnerability_score REAL DEFAULT 0.0,
      status TEXT DEFAULT 'open' CHECK(status IN ('open','assigned','in_progress','resolved')),
      source_org TEXT,
      reported_by TEXT REFERENCES users(id) ON DELETE SET NULL,
      organization_id TEXT REFERENCES organizations(id) ON DELETE SET NULL,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      resolved_at TEXT,
      deleted_at TEXT
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      need_id TEXT NOT NULL REFERENCES needs(id) ON DELETE CASCADE,
      volunteer_id TEXT NOT NULL REFERENCES volunteers(id) ON DELETE CASCADE,
      status TEXT DEFAULT 'assigned' CHECK(status IN ('assigned','accepted','in_progress','completed','cancelled')),
      assigned_at TEXT DEFAULT (datetime('now')),
      accepted_at TEXT,
      completed_at TEXT,
      deadline TEXT,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS matches (
      id TEXT PRIMARY KEY,
      need_id TEXT NOT NULL REFERENCES needs(id) ON DELETE CASCADE,
      volunteer_id TEXT NOT NULL REFERENCES volunteers(id) ON DELETE CASCADE,
      match_score REAL DEFAULT 0.0,
      distance_km REAL,
      created_at TEXT DEFAULT (datetime('now')),
      accepted INTEGER DEFAULT 0,
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT,
      read INTEGER DEFAULT 0,
      metadata TEXT DEFAULT '{}',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // ------------------------------------------
  // SEED DATA (only if users table is empty)
  // ------------------------------------------
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
  if (userCount.count > 0) {
    console.log('📦 Database already seeded, skipping...');
    return;
  }

  console.log('🌱 Seeding demo data...');

  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync('password123', salt);
  const now = new Date().toISOString();

  // --- Users ---
  const users = [
    { id: uuidv4(), name: 'Priya Sharma', email: 'priya@helpfirst.org', role: 'ngo_admin', phone: '+919876543210' },
    { id: uuidv4(), name: 'Rajesh Kumar', email: 'rajesh@communitycare.org', role: 'ngo_admin', phone: '+919876543211' },
    { id: uuidv4(), name: 'Anita Verma', email: 'anita@gmail.com', role: 'volunteer', phone: '+919876543212' },
    { id: uuidv4(), name: 'Suresh Patel', email: 'suresh@gmail.com', role: 'volunteer', phone: '+919876543213' },
    { id: uuidv4(), name: 'Meera Nair', email: 'meera@gmail.com', role: 'volunteer', phone: '+919876543214' },
    { id: uuidv4(), name: 'Vikram Singh', email: 'vikram@gmail.com', role: 'volunteer', phone: '+919876543215' },
    { id: uuidv4(), name: 'Deepa Joshi', email: 'deepa@gmail.com', role: 'volunteer', phone: '+919876543216' },
    { id: uuidv4(), name: 'Admin User', email: 'admin@communityaid.org', role: 'super_admin', phone: '+919876543217' },
  ];

  const insertUser = db.prepare(
    'INSERT INTO users (id, name, email, password_hash, role, phone, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  );
  for (const u of users) {
    insertUser.run(u.id, u.name, u.email, passwordHash, u.role, u.phone, now, now);
  }

  // --- Organizations ---
  const orgs = [
    { id: uuidv4(), name: 'HelpFirst Foundation', type: 'ngo', contact_email: 'info@helpfirst.org', api_key: 'cap_demo_key_helpfirst_2024' },
    { id: uuidv4(), name: 'Community Care Network', type: 'ngo', contact_email: 'info@communitycare.org', api_key: 'cap_demo_key_commcare_2024' },
    { id: uuidv4(), name: 'Rural Aid Initiative', type: 'government', contact_email: 'contact@ruralaid.gov.in', api_key: 'cap_demo_key_ruralaid_2024' },
  ];

  const insertOrg = db.prepare(
    'INSERT INTO organizations (id, name, type, contact_email, api_key, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
  );
  for (const o of orgs) {
    insertOrg.run(o.id, o.name, o.type, o.contact_email, o.api_key, now, now);
  }

  // --- Volunteers (for volunteer users) ---
  const volunteerUsers = users.filter(u => u.role === 'volunteer');
  const volunteerProfiles = [
    {
      skills: JSON.stringify(['medical', 'education']),
      home_lat: 19.076, home_lng: 72.877, max_radius_km: 15,
      availability: JSON.stringify({ mon: [9, 17], tue: [9, 17], wed: [9, 17], thu: [9, 17], fri: [9, 17] }),
      languages: JSON.stringify(['English', 'Hindi', 'Marathi']),
      trust_score: 82,
    },
    {
      skills: JSON.stringify(['water', 'plumbing', 'shelter']),
      home_lat: 19.021, home_lng: 72.842, max_radius_km: 25,
      availability: JSON.stringify({ mon: [8, 20], tue: [8, 20], sat: [6, 18], sun: [6, 18] }),
      languages: JSON.stringify(['English', 'Hindi', 'Gujarati']),
      trust_score: 75,
    },
    {
      skills: JSON.stringify(['food', 'education', 'other']),
      home_lat: 19.113, home_lng: 72.910, max_radius_km: 20,
      availability: JSON.stringify({ wed: [10, 16], thu: [10, 16], fri: [10, 16], sat: [8, 20], sun: [8, 20] }),
      languages: JSON.stringify(['English', 'Malayalam', 'Hindi']),
      trust_score: 90,
    },
    {
      skills: JSON.stringify(['shelter', 'food', 'medical']),
      home_lat: 18.975, home_lng: 72.825, max_radius_km: 30,
      availability: JSON.stringify({ mon: [6, 22], tue: [6, 22], wed: [6, 22], thu: [6, 22], fri: [6, 22], sat: [6, 22], sun: [6, 22] }),
      languages: JSON.stringify(['English', 'Hindi', 'Punjabi']),
      trust_score: 68,
    },
    {
      skills: JSON.stringify(['education', 'other']),
      home_lat: 19.050, home_lng: 72.890, max_radius_km: 10,
      availability: JSON.stringify({ sat: [9, 18], sun: [9, 18] }),
      languages: JSON.stringify(['English', 'Hindi']),
      trust_score: 55,
    },
  ];

  const volunteers = [];
  const insertVol = db.prepare(
    'INSERT INTO volunteers (id, user_id, skills, home_lat, home_lng, max_radius_km, availability, languages, trust_score, active_task_count, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  );
  for (let i = 0; i < volunteerUsers.length; i++) {
    const vp = volunteerProfiles[i];
    const volId = uuidv4();
    insertVol.run(volId, volunteerUsers[i].id, vp.skills, vp.home_lat, vp.home_lng, vp.max_radius_km, vp.availability, vp.languages, vp.trust_score, 0, now, now);
    volunteers.push({ id: volId, userId: volunteerUsers[i].id, ...vp });
  }

  // --- Needs ---
  const needsData = [
    { title: 'Drinking Water Shortage in Dharavi', description: 'Multiple households in Dharavi sector 5 have been without clean drinking water for 3 days. Approximately 200 families are affected. The main water pipeline has burst and local authorities have been slow to respond.', category: 'water', location_lat: 19.0410, location_lng: 72.8550, area_name: 'Dharavi, Mumbai', severity: 5, num_people_affected: 200, time_sensitive: 1, vulnerability_score: 8 },
    { title: 'Medical Supplies Needed for Andheri Clinic', description: 'Free health clinic in Andheri East requires basic medical supplies — bandages, antiseptics, ORS packets, and common antibiotics. Serves 50+ patients daily from surrounding slum areas.', category: 'medical', location_lat: 19.1197, location_lng: 72.8466, area_name: 'Andheri East, Mumbai', severity: 4, num_people_affected: 50, time_sensitive: 0, vulnerability_score: 6 },
    { title: 'Education Materials for Worli Children', description: 'Community learning center in Worli needs notebooks, pencils, and basic science kits for 80 children aged 6-14. The center operates from a rented space and provides after-school education to children from nearby fishing communities.', category: 'education', location_lat: 19.0140, location_lng: 72.8180, area_name: 'Worli, Mumbai', severity: 3, num_people_affected: 80, time_sensitive: 0, vulnerability_score: 5 },
    { title: 'Emergency Food Distribution - Kurla Flood', description: 'Flash floods in Kurla West have displaced 150 families. Urgent need for dry ration kits, ready-to-eat meals, and clean water bottles. Temporary shelters have been set up in local schools.', category: 'food', location_lat: 19.0726, location_lng: 72.8794, area_name: 'Kurla West, Mumbai', severity: 5, num_people_affected: 150, time_sensitive: 1, vulnerability_score: 9 },
    { title: 'Temporary Shelter Repairs in Bandra', description: 'Several makeshift shelters near Bandra station have been damaged by recent storms. About 35 families living there need tarpaulins, bamboo poles, and rope for immediate repairs.', category: 'shelter', location_lat: 19.0544, location_lng: 72.8398, area_name: 'Bandra, Mumbai', severity: 4, num_people_affected: 35, time_sensitive: 1, vulnerability_score: 7 },
    { title: 'Plumbing Repair in Malad Community Hall', description: 'The community hall in Malad West serves as a gathering point for 200+ families. The main water tank and piping system needs urgent repair. No running water for sanitation in the building.', category: 'plumbing', location_lat: 19.1861, location_lng: 72.8485, area_name: 'Malad West, Mumbai', severity: 4, num_people_affected: 200, time_sensitive: 1, vulnerability_score: 6 },
    { title: 'Health Checkup Camp in Dadar', description: 'Request to organize a free health checkup camp in Dadar for elderly residents. Many senior citizens in the area cannot afford regular medical checkups. Need volunteer doctors and nurses.', category: 'medical', location_lat: 19.0178, location_lng: 72.8478, area_name: 'Dadar, Mumbai', severity: 3, num_people_affected: 100, time_sensitive: 0, vulnerability_score: 7 },
    { title: 'After-School Tutoring in Goregaon', description: 'Children from lower-income families in Goregaon need after-school tutoring support in Math and English. 40 students identified who are falling behind in their studies.', category: 'education', location_lat: 19.1550, location_lng: 72.8490, area_name: 'Goregaon, Mumbai', severity: 2, num_people_affected: 40, time_sensitive: 0, vulnerability_score: 4 },
    { title: 'Water Purification in Powai Slum', description: 'Contaminated water sources detected in Powai slum area near the lake. 300+ residents using unsafe water. Need portable water purifiers and water testing kits urgently.', category: 'water', location_lat: 19.1176, location_lng: 72.9060, area_name: 'Powai, Mumbai', severity: 5, num_people_affected: 300, time_sensitive: 1, vulnerability_score: 8 },
    { title: 'Food Bank Restocking - Borivali', description: 'Monthly community food bank in Borivali is running low. Need rice, dal, oil, and fresh vegetables to prepare meals for approximately 500 daily beneficiaries for the next 2 weeks.', category: 'food', location_lat: 19.2307, location_lng: 72.8567, area_name: 'Borivali, Mumbai', severity: 3, num_people_affected: 500, time_sensitive: 0, vulnerability_score: 5 },
  ];

  function computeUrgency({ severity, num_people_affected, time_sensitive, vulnerability_score }) {
    const sevNorm = severity / 5;
    const peopleFactor = Math.min(num_people_affected / 100, 1);
    const timeFactor = time_sensitive ? 1 : 0;
    const vulnFactor = Math.min(vulnerability_score / 10, 1);
    return sevNorm * 0.4 + peopleFactor * 0.3 + timeFactor * 0.2 + vulnFactor * 0.1;
  }

  const adminUser = users.find(u => u.role === 'ngo_admin');
  const insertNeed = db.prepare(
    `INSERT INTO needs (id, title, description, category, location_lat, location_lng, area_name, urgency_score, severity, num_people_affected, time_sensitive, vulnerability_score, status, reported_by, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  const createdNeeds = [];
  const statuses = ['open', 'open', 'open', 'assigned', 'open', 'open', 'in_progress', 'open', 'open', 'resolved'];

  for (let i = 0; i < needsData.length; i++) {
    const n = needsData[i];
    const needId = uuidv4();
    const urgency = computeUrgency(n);
    const status = statuses[i] || 'open';
    // Stagger creation dates for realistic trends
    const createdDate = new Date(Date.now() - (needsData.length - i) * 86400000 * 2).toISOString();
    const resolvedAt = status === 'resolved' ? new Date(Date.now() - 86400000).toISOString() : null;

    insertNeed.run(needId, n.title, n.description, n.category, n.location_lat, n.location_lng, n.area_name, urgency, n.severity, n.num_people_affected, n.time_sensitive, n.vulnerability_score, status, adminUser.id, createdDate, now);

    if (resolvedAt) {
      db.prepare('UPDATE needs SET resolved_at = ? WHERE id = ?').run(resolvedAt, needId);
    }

    createdNeeds.push({ id: needId, ...n, urgency_score: urgency, status });
  }

  // --- Tasks (for assigned/in_progress/resolved needs) ---
  const insertTask = db.prepare(
    'INSERT INTO tasks (id, need_id, volunteer_id, status, assigned_at, accepted_at, completed_at, deadline, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  );

  const assignedNeeds = createdNeeds.filter(n => ['assigned', 'in_progress', 'resolved'].includes(n.status));
  for (let i = 0; i < assignedNeeds.length; i++) {
    const need = assignedNeeds[i];
    const vol = volunteers[i % volunteers.length];
    const taskId = uuidv4();
    const assignedAt = new Date(Date.now() - 5 * 86400000).toISOString();
    let taskStatus = 'assigned';
    let acceptedAt = null;
    let completedAt = null;

    if (need.status === 'in_progress') {
      taskStatus = 'accepted';
      acceptedAt = new Date(Date.now() - 3 * 86400000).toISOString();
    } else if (need.status === 'resolved') {
      taskStatus = 'completed';
      acceptedAt = new Date(Date.now() - 4 * 86400000).toISOString();
      completedAt = new Date(Date.now() - 1 * 86400000).toISOString();
    }

    const deadline = new Date(Date.now() + 7 * 86400000).toISOString();

    insertTask.run(taskId, need.id, vol.id, taskStatus, assignedAt, acceptedAt, completedAt, deadline, null, now, now);

    // Update volunteer active_task_count
    if (taskStatus !== 'completed' && taskStatus !== 'cancelled') {
      db.prepare('UPDATE volunteers SET active_task_count = active_task_count + 1 WHERE id = ?').run(vol.id);
    }
  }

  // --- Notifications ---
  const insertNotif = db.prepare(
    'INSERT INTO notifications (id, user_id, type, title, message, read, metadata, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  );

  // Give volunteers some notifications
  for (let i = 0; i < Math.min(3, volunteerUsers.length); i++) {
    insertNotif.run(
      uuidv4(), volunteerUsers[i].id, 'task_assigned',
      `New Assignment: ${createdNeeds[i].category} in ${createdNeeds[i].area_name}`,
      `You have been matched to a ${createdNeeds[i].category} need affecting ${createdNeeds[i].num_people_affected} people.`,
      0, JSON.stringify({ need_id: createdNeeds[i].id }),
      new Date(Date.now() - i * 3600000).toISOString()
    );
  }

  // Give admins system notifications
  insertNotif.run(
    uuidv4(), adminUser.id, 'system',
    'Matching Engine Completed',
    'Batch matching processed 10 needs and generated 25 potential matches.',
    1, '{}',
    new Date(Date.now() - 7200000).toISOString()
  );

  insertNotif.run(
    uuidv4(), adminUser.id, 'system',
    'New Volunteer Registration',
    'Deepa Joshi has registered as a volunteer with skills in education.',
    0, '{}',
    new Date(Date.now() - 3600000).toISOString()
  );

  console.log(`✅ Seeded: ${users.length} users, ${orgs.length} orgs, ${volunteers.length} volunteers, ${createdNeeds.length} needs`);
}

module.exports = { initializeDatabase };
