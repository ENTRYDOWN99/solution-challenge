const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://cap_user:cap_password@localhost:5432/community_aid',
});

async function seed() {
  const client = await pool.connect();

  try {
    console.log('🌱 Seeding database...\n');

    // Clear existing data
    await client.query('DELETE FROM notifications');
    await client.query('DELETE FROM matches');
    await client.query('DELETE FROM tasks');
    await client.query('DELETE FROM needs');
    await client.query('DELETE FROM volunteers');
    await client.query('DELETE FROM refresh_tokens');
    await client.query('DELETE FROM organizations');
    await client.query('DELETE FROM users');

    const salt = await bcrypt.genSalt(12);
    const password = await bcrypt.hash('password123', salt);

    // ==========================================
    // ORGANIZATIONS
    // ==========================================
    const orgs = [
      { id: uuidv4(), name: 'HelpFirst Foundation', type: 'ngo', contact_email: 'contact@helpfirst.org', api_key: `cap_${uuidv4().replace(/-/g, '')}` },
      { id: uuidv4(), name: 'Community Care Network', type: 'ngo', contact_email: 'info@communitycare.org', api_key: `cap_${uuidv4().replace(/-/g, '')}` },
    ];

    for (const org of orgs) {
      await client.query(
        'INSERT INTO organizations (id, name, type, contact_email, api_key) VALUES ($1,$2,$3,$4,$5)',
        [org.id, org.name, org.type, org.contact_email, org.api_key]
      );
    }
    console.log(`✅ Created ${orgs.length} organizations`);

    // ==========================================
    // USERS (2 NGO admins + 10 volunteers + 1 super admin)
    // ==========================================
    const adminUsers = [
      { id: uuidv4(), name: 'Priya Sharma', email: 'priya@helpfirst.org', role: 'ngo_admin', phone: '+919876543210' },
      { id: uuidv4(), name: 'Rajesh Kumar', email: 'rajesh@communitycare.org', role: 'ngo_admin', phone: '+919876543211' },
    ];

    const superAdmin = { id: uuidv4(), name: 'System Admin', email: 'admin@communityaid.org', role: 'super_admin', phone: '+919876543200' };

    const volunteerUsers = [
      { id: uuidv4(), name: 'Anita Desai', email: 'anita@gmail.com', role: 'volunteer', phone: '+919876543220' },
      { id: uuidv4(), name: 'Vikram Singh', email: 'vikram@gmail.com', role: 'volunteer', phone: '+919876543221' },
      { id: uuidv4(), name: 'Meera Patel', email: 'meera@gmail.com', role: 'volunteer', phone: '+919876543222' },
      { id: uuidv4(), name: 'Arjun Nair', email: 'arjun@gmail.com', role: 'volunteer', phone: '+919876543223' },
      { id: uuidv4(), name: 'Deepa Reddy', email: 'deepa@gmail.com', role: 'volunteer', phone: '+919876543224' },
      { id: uuidv4(), name: 'Suresh Menon', email: 'suresh@gmail.com', role: 'volunteer', phone: '+919876543225' },
      { id: uuidv4(), name: 'Kavitha Iyer', email: 'kavitha@gmail.com', role: 'volunteer', phone: '+919876543226' },
      { id: uuidv4(), name: 'Rahul Gupta', email: 'rahul@gmail.com', role: 'volunteer', phone: '+919876543227' },
      { id: uuidv4(), name: 'Lakshmi Bhat', email: 'lakshmi@gmail.com', role: 'volunteer', phone: '+919876543228' },
      { id: uuidv4(), name: 'Arun Joshi', email: 'arun@gmail.com', role: 'volunteer', phone: '+919876543229' },
    ];

    const allUsers = [superAdmin, ...adminUsers, ...volunteerUsers];
    for (const user of allUsers) {
      await client.query(
        'INSERT INTO users (id, name, email, password_hash, role, phone) VALUES ($1,$2,$3,$4,$5,$6)',
        [user.id, user.name, user.email, password, user.role, user.phone]
      );
    }
    console.log(`✅ Created ${allUsers.length} users (password: password123)`);

    // ==========================================
    // VOLUNTEER PROFILES
    // ==========================================
    const volunteerProfiles = [
      { user_id: volunteerUsers[0].id, skills: ['medical', 'education'], home_lat: 19.0760, home_lng: 72.8777, max_radius_km: 30, languages: ['English', 'Hindi', 'Marathi'], trust_score: 85, availability: { mon: [9, 17], tue: [9, 17], wed: [9, 17], thu: [9, 17], fri: [9, 17] } },
      { user_id: volunteerUsers[1].id, skills: ['shelter', 'plumbing', 'water'], home_lat: 19.0330, home_lng: 73.0297, max_radius_km: 40, languages: ['English', 'Hindi'], trust_score: 72, availability: { mon: [8, 20], wed: [8, 20], fri: [8, 20], sat: [10, 16] } },
      { user_id: volunteerUsers[2].id, skills: ['food', 'education'], home_lat: 18.5204, home_lng: 73.8567, max_radius_km: 25, languages: ['English', 'Gujarati', 'Hindi'], trust_score: 90, availability: { mon: [9, 18], tue: [9, 18], wed: [9, 18], thu: [9, 18], fri: [9, 18], sat: [10, 14] } },
      { user_id: volunteerUsers[3].id, skills: ['medical', 'water'], home_lat: 12.9716, home_lng: 77.5946, max_radius_km: 20, languages: ['English', 'Malayalam', 'Tamil'], trust_score: 65, availability: { tue: [10, 16], thu: [10, 16], sat: [9, 17] } },
      { user_id: volunteerUsers[4].id, skills: ['education', 'food', 'shelter'], home_lat: 13.0827, home_lng: 80.2707, max_radius_km: 35, languages: ['English', 'Telugu', 'Tamil'], trust_score: 78, availability: { mon: [7, 15], tue: [7, 15], wed: [7, 15], thu: [7, 15], fri: [7, 15] } },
      { user_id: volunteerUsers[5].id, skills: ['plumbing', 'shelter'], home_lat: 19.0896, home_lng: 72.8656, max_radius_km: 15, languages: ['English', 'Hindi'], trust_score: 55, availability: { sat: [8, 18], sun: [8, 18] } },
      { user_id: volunteerUsers[6].id, skills: ['medical', 'education', 'food'], home_lat: 17.3850, home_lng: 78.4867, max_radius_km: 50, languages: ['English', 'Tamil', 'Hindi'], trust_score: 92, availability: { mon: [6, 22], tue: [6, 22], wed: [6, 22], thu: [6, 22], fri: [6, 22], sat: [8, 20], sun: [10, 18] } },
      { user_id: volunteerUsers[7].id, skills: ['water', 'food'], home_lat: 28.7041, home_lng: 77.1025, max_radius_km: 30, languages: ['English', 'Hindi', 'Punjabi'], trust_score: 68, availability: { mon: [9, 17], wed: [9, 17], fri: [9, 17] } },
      { user_id: volunteerUsers[8].id, skills: ['shelter', 'education'], home_lat: 15.3173, home_lng: 75.7139, max_radius_km: 45, languages: ['English', 'Kannada'], trust_score: 81, availability: { tue: [8, 16], thu: [8, 16], sat: [9, 15] } },
      { user_id: volunteerUsers[9].id, skills: ['medical', 'plumbing', 'water'], home_lat: 23.0225, home_lng: 72.5714, max_radius_km: 25, languages: ['English', 'Hindi', 'Gujarati'], trust_score: 74, availability: { mon: [10, 18], tue: [10, 18], wed: [10, 18], thu: [10, 18], fri: [10, 18] } },
    ];

    const volIds = [];
    for (const vp of volunteerProfiles) {
      const id = uuidv4();
      volIds.push(id);
      await client.query(
        `INSERT INTO volunteers (id, user_id, skills, home_lat, home_lng, max_radius_km, availability, languages, trust_score)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [id, vp.user_id, vp.skills, vp.home_lat, vp.home_lng, vp.max_radius_km, JSON.stringify(vp.availability), vp.languages, vp.trust_score]
      );
    }
    console.log(`✅ Created ${volunteerProfiles.length} volunteer profiles`);

    // ==========================================
    // NEEDS (15 sample needs)
    // ==========================================
    function urgencyScore(s, p, t, v) {
      return (s / 5) * 0.4 + Math.min(p / 100, 1) * 0.3 + (t ? 1 : 0) * 0.2 + Math.min(v / 10, 1) * 0.1;
    }

    const needsData = [
      { title: 'Clean drinking water urgently needed', category: 'water', lat: 19.0760, lng: 72.8777, area: 'Dharavi, Mumbai', severity: 5, people: 200, time_sensitive: true, vuln: 8 },
      { title: 'Medical camp needed for children', category: 'medical', lat: 19.0330, lng: 73.0297, area: 'Navi Mumbai', severity: 4, people: 80, time_sensitive: true, vuln: 7 },
      { title: 'Tutoring volunteers for school', category: 'education', lat: 18.5204, lng: 73.8567, area: 'Pune Central', severity: 2, people: 30, time_sensitive: false, vuln: 3 },
      { title: 'Food distribution in flood-affected area', category: 'food', lat: 19.0896, lng: 72.8656, area: 'Andheri, Mumbai', severity: 5, people: 500, time_sensitive: true, vuln: 9 },
      { title: 'Temporary shelter after building collapse', category: 'shelter', lat: 19.0176, lng: 72.8561, area: 'Mahim, Mumbai', severity: 5, people: 45, time_sensitive: true, vuln: 10 },
      { title: 'Plumbing repair in community center', category: 'plumbing', lat: 12.9716, lng: 77.5946, area: 'Koramangala, Bangalore', severity: 3, people: 150, time_sensitive: false, vuln: 4 },
      { title: 'Mobile health clinic for elderly', category: 'medical', lat: 13.0827, lng: 80.2707, area: 'T. Nagar, Chennai', severity: 4, people: 60, time_sensitive: false, vuln: 6 },
      { title: 'School supplies distribution', category: 'education', lat: 17.3850, lng: 78.4867, area: 'Secunderabad, Hyderabad', severity: 2, people: 120, time_sensitive: false, vuln: 3 },
      { title: 'Water pipeline repair in slum', category: 'water', lat: 28.7041, lng: 77.1025, area: 'Shahdara, Delhi', severity: 4, people: 300, time_sensitive: true, vuln: 7 },
      { title: 'Emergency food for migrant workers', category: 'food', lat: 19.0650, lng: 72.8400, area: 'Bandra, Mumbai', severity: 5, people: 250, time_sensitive: true, vuln: 8 },
      { title: 'Shelter repair after monsoon damage', category: 'shelter', lat: 15.3173, lng: 75.7139, area: 'Hubli, Karnataka', severity: 3, people: 35, time_sensitive: false, vuln: 5 },
      { title: 'Vaccination drive coordination', category: 'medical', lat: 23.0225, lng: 72.5714, area: 'Ahmedabad', severity: 3, people: 500, time_sensitive: false, vuln: 4 },
      { title: 'Adult literacy program', category: 'education', lat: 19.0760, lng: 72.8777, area: 'Worli, Mumbai', severity: 1, people: 25, time_sensitive: false, vuln: 2 },
      { title: 'Sewage overflow in residential area', category: 'plumbing', lat: 19.0330, lng: 73.0297, area: 'Vashi, Navi Mumbai', severity: 4, people: 200, time_sensitive: true, vuln: 6 },
      { title: 'Emergency drinking water after pipe burst', category: 'water', lat: 18.5204, lng: 73.8567, area: 'Kothrud, Pune', severity: 5, people: 400, time_sensitive: true, vuln: 8 },
    ];

    const statuses = ['open', 'open', 'open', 'open', 'open', 'open', 'open', 'open', 'open', 'open', 'assigned', 'assigned', 'in_progress', 'resolved', 'resolved'];
    const needIds = [];

    for (let i = 0; i < needsData.length; i++) {
      const n = needsData[i];
      const id = uuidv4();
      needIds.push(id);
      const us = urgencyScore(n.severity, n.people, n.time_sensitive, n.vuln);
      const status = statuses[i];
      const resolved_at = status === 'resolved' ? new Date(Date.now() - Math.random() * 7 * 86400000) : null;
      const created_at = new Date(Date.now() - Math.random() * 30 * 86400000);

      await client.query(
        `INSERT INTO needs (id, title, description, category, location_lat, location_lng, area_name,
          urgency_score, severity, num_people_affected, time_sensitive, vulnerability_score,
          status, reported_by, created_at, resolved_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
        [id, n.title, `Detailed description for: ${n.title}. This is a ${n.category} need in ${n.area} affecting ${n.people} people.`,
         n.category, n.lat, n.lng, n.area, us, n.severity, n.people, n.time_sensitive, n.vuln,
         status, adminUsers[i % 2].id, created_at, resolved_at]
      );
    }
    console.log(`✅ Created ${needsData.length} needs`);

    // ==========================================
    // TASKS (5 assigned tasks in various states)
    // ==========================================
    const taskData = [
      { need_idx: 10, vol_idx: 0, status: 'assigned', accepted_at: null, completed_at: null },
      { need_idx: 11, vol_idx: 2, status: 'accepted', accepted_at: new Date(Date.now() - 86400000), completed_at: null },
      { need_idx: 12, vol_idx: 4, status: 'in_progress', accepted_at: new Date(Date.now() - 2 * 86400000), completed_at: null },
      { need_idx: 13, vol_idx: 6, status: 'completed', accepted_at: new Date(Date.now() - 5 * 86400000), completed_at: new Date(Date.now() - 3 * 86400000) },
      { need_idx: 14, vol_idx: 9, status: 'completed', accepted_at: new Date(Date.now() - 4 * 86400000), completed_at: new Date(Date.now() - 2 * 86400000) },
    ];

    for (const t of taskData) {
      await client.query(
        `INSERT INTO tasks (id, need_id, volunteer_id, status, assigned_at, accepted_at, completed_at, deadline, notes)
         VALUES ($1,$2,$3,$4,NOW(),$5,$6,$7,$8)`,
        [
          uuidv4(), needIds[t.need_idx], volIds[t.vol_idx], t.status,
          t.accepted_at, t.completed_at,
          new Date(Date.now() + 7 * 86400000),
          `Task notes for ${needsData[t.need_idx].title}`,
        ]
      );
    }

    // Update active_task_count for volunteers with non-completed tasks
    await client.query(`
      UPDATE volunteers SET active_task_count = (
        SELECT COUNT(*) FROM tasks WHERE tasks.volunteer_id = volunteers.id AND tasks.status NOT IN ('completed', 'cancelled')
      )
    `);

    console.log(`✅ Created ${taskData.length} tasks`);

    // ==========================================
    // SAMPLE MATCHES
    // ==========================================
    let matchCount = 0;
    for (let i = 0; i < 5; i++) {
      for (let j = 0; j < 3; j++) {
        const vIdx = (i * 2 + j) % volIds.length;
        await client.query(
          `INSERT INTO matches (id, need_id, volunteer_id, match_score, distance_km, accepted)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [uuidv4(), needIds[i], volIds[vIdx], Math.random() * 0.6 + 0.4, Math.random() * 20 + 2, false]
        );
        matchCount++;
      }
    }
    console.log(`✅ Created ${matchCount} sample matches`);

    console.log('\n🎉 Seeding complete!\n');
    console.log('Login credentials:');
    console.log('  Admin: priya@helpfirst.org / password123');
    console.log('  Admin: rajesh@communitycare.org / password123');
    console.log('  Volunteer: anita@gmail.com / password123');
    console.log('  Super Admin: admin@communityaid.org / password123');

  } catch (err) {
    console.error('❌ Seeding failed:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch(console.error);
