import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { orgsAPI, volunteersAPI } from '../services/api';
import AvailabilityGrid from '../components/AvailabilityGrid';

export default function SettingsPage() {
  const { user, isAdmin, isVolunteer } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [orgs, setOrgs] = useState([]);
  const [volProfile, setVolProfile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  // Volunteer profile form
  const [profileForm, setProfileForm] = useState({
    skills: [],
    home_lat: '',
    home_lng: '',
    max_radius_km: 25,
    availability: {},
    languages: [],
  });

  const [newSkill, setNewSkill] = useState('');
  const [newLang, setNewLang] = useState('');

  useEffect(() => {
    if (isAdmin) fetchOrgs();
    if (isVolunteer) fetchVolProfile();
  }, []);

  async function fetchOrgs() {
    try {
      const { data } = await orgsAPI.list();
      setOrgs(data);
    } catch { /* silent */ }
  }

  async function fetchVolProfile() {
    try {
      const { data } = await volunteersAPI.list({ search: user?.email });
      if (data.data?.[0]) {
        const vp = data.data[0];
        setVolProfile(vp);
        setProfileForm({
          skills: vp.skills || [],
          home_lat: vp.home_lat || '',
          home_lng: vp.home_lng || '',
          max_radius_km: vp.max_radius_km || 25,
          availability: vp.availability || {},
          languages: vp.languages || ['English'],
        });
      }
    } catch { /* silent */ }
  }

  const handleSaveProfile = async () => {
    setSaving(true);
    setMessage('');
    try {
      await volunteersAPI.createProfile({
        ...profileForm,
        home_lat: profileForm.home_lat ? parseFloat(profileForm.home_lat) : null,
        home_lng: profileForm.home_lng ? parseFloat(profileForm.home_lng) : null,
      });
      setMessage('Profile saved successfully!');
    } catch (err) {
      setMessage('Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const addSkill = () => {
    if (newSkill && !profileForm.skills.includes(newSkill.toLowerCase())) {
      setProfileForm({ ...profileForm, skills: [...profileForm.skills, newSkill.toLowerCase()] });
      setNewSkill('');
    }
  };

  const removeSkill = (s) => {
    setProfileForm({ ...profileForm, skills: profileForm.skills.filter(sk => sk !== s) });
  };

  const addLang = () => {
    if (newLang && !profileForm.languages.includes(newLang)) {
      setProfileForm({ ...profileForm, languages: [...profileForm.languages, newLang] });
      setNewLang('');
    }
  };

  const tabs = [
    { id: 'profile', label: '👤 Profile' },
    ...(isVolunteer ? [{ id: 'availability', label: '📅 Availability' }] : []),
    ...(isAdmin ? [{ id: 'organization', label: '🏢 Organization' }] : []),
    { id: 'notifications', label: '🔔 Notifications' },
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-display font-bold">Settings</h1>
        <p className="text-sm text-surface-200/50 mt-1">Manage your profile and preferences</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-white/5 pb-3 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
                : 'text-surface-200/50 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {message && (
        <div className={`p-3 rounded-xl text-sm ${
          message.includes('success') ? 'bg-success-500/10 text-success-400 border border-success-500/20' : 'bg-danger-500/10 text-danger-400 border border-danger-500/20'
        }`}>
          {message}
        </div>
      )}

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="glass-card p-6 space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-2xl font-bold">
              {user?.name?.charAt(0)?.toUpperCase()}
            </div>
            <div>
              <h3 className="text-lg font-semibold">{user?.name}</h3>
              <p className="text-sm text-surface-200/40">{user?.email}</p>
              <p className="text-xs text-surface-200/30 capitalize mt-0.5">{user?.role?.replace('_', ' ')}</p>
            </div>
          </div>

          {isVolunteer && (
            <>
              {/* Skills */}
              <div>
                <label className="block text-xs text-surface-200/50 mb-2 font-medium">Skills</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {profileForm.skills.map((s) => (
                    <span key={s} className="px-3 py-1 bg-primary-500/10 text-primary-400 rounded-lg text-xs border border-primary-500/20 capitalize flex items-center gap-1.5">
                      {s}
                      <button onClick={() => removeSkill(s)} className="text-primary-400/50 hover:text-danger-400">×</button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <select value={newSkill} onChange={(e) => setNewSkill(e.target.value)} className="input-field text-sm py-2 flex-1">
                    <option value="">Select skill...</option>
                    {['education', 'medical', 'water', 'food', 'shelter', 'plumbing', 'other']
                      .filter(s => !profileForm.skills.includes(s))
                      .map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <button onClick={addSkill} className="btn-secondary text-sm">Add</button>
                </div>
              </div>

              {/* Location */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-surface-200/50 mb-1">Home Latitude</label>
                  <input type="number" step="any" value={profileForm.home_lat} onChange={(e) => setProfileForm({ ...profileForm, home_lat: e.target.value })} className="input-field text-sm" placeholder="19.076" />
                </div>
                <div>
                  <label className="block text-xs text-surface-200/50 mb-1">Home Longitude</label>
                  <input type="number" step="any" value={profileForm.home_lng} onChange={(e) => setProfileForm({ ...profileForm, home_lng: e.target.value })} className="input-field text-sm" placeholder="72.877" />
                </div>
              </div>

              <div>
                <label className="block text-xs text-surface-200/50 mb-1">Max Travel Radius (km)</label>
                <input type="number" value={profileForm.max_radius_km} onChange={(e) => setProfileForm({ ...profileForm, max_radius_km: parseInt(e.target.value) || 25 })} className="input-field text-sm" />
              </div>

              {/* Languages */}
              <div>
                <label className="block text-xs text-surface-200/50 mb-2 font-medium">Languages</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {profileForm.languages.map((l) => (
                    <span key={l} className="px-3 py-1 bg-accent-500/10 text-accent-400 rounded-lg text-xs border border-accent-500/20">{l}</span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input value={newLang} onChange={(e) => setNewLang(e.target.value)} className="input-field text-sm py-2 flex-1" placeholder="Add language" onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addLang())} />
                  <button onClick={addLang} className="btn-secondary text-sm">Add</button>
                </div>
              </div>

              <button onClick={handleSaveProfile} disabled={saving} className="btn-primary">
                {saving ? 'Saving...' : 'Save Profile'}
              </button>
            </>
          )}
        </div>
      )}

      {/* Availability Tab */}
      {activeTab === 'availability' && isVolunteer && (
        <div className="glass-card p-6">
          <h3 className="text-sm font-semibold mb-4">Weekly Availability</h3>
          <AvailabilityGrid
            availability={profileForm.availability}
            editable={true}
            onChange={(a) => setProfileForm({ ...profileForm, availability: a })}
          />
          <button onClick={handleSaveProfile} disabled={saving} className="btn-primary mt-4">
            {saving ? 'Saving...' : 'Save Availability'}
          </button>
        </div>
      )}

      {/* Organization Tab */}
      {activeTab === 'organization' && isAdmin && (
        <div className="glass-card p-6">
          <h3 className="text-sm font-semibold mb-4">Organizations</h3>
          <div className="space-y-3">
            {orgs.length === 0 ? (
              <p className="text-surface-200/40 text-sm">No organizations found</p>
            ) : (
              orgs.map((org) => (
                <div key={org.id} className="p-4 bg-white/[0.02] rounded-xl border border-white/5">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">{org.name}</p>
                      <p className="text-xs text-surface-200/40 mt-0.5">{org.contact_email}</p>
                    </div>
                    <span className="badge bg-surface-700 text-surface-200/50">{org.type}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Notifications Tab */}
      {activeTab === 'notifications' && (
        <div className="glass-card p-6">
          <h3 className="text-sm font-semibold mb-4">Notification Preferences</h3>
          <div className="space-y-3">
            {[
              { label: 'Email notifications for new assignments', key: 'email_assignments', default: true },
              { label: 'SMS alerts for urgent needs', key: 'sms_urgent', default: true },
              { label: 'Email digest (weekly summary)', key: 'email_digest', default: false },
              { label: 'Task completion notifications', key: 'task_complete', default: true },
            ].map((pref) => (
              <div key={pref.key} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02]">
                <span className="text-sm">{pref.label}</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" defaultChecked={pref.default} className="sr-only peer" />
                  <div className="w-9 h-5 bg-surface-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary-500" />
                </label>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
