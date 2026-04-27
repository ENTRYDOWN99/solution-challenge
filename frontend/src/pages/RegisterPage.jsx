import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    name: '', email: '', password: '', confirmPassword: '', role: 'volunteer', phone: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      return setError('Passwords do not match');
    }
    if (formData.password.length < 6) {
      return setError('Password must be at least 6 characters');
    }

    setLoading(true);
    try {
      await register({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: formData.role,
        phone: formData.phone,
      });
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-950 p-4">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-accent-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 left-1/4 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md animate-fade-in relative z-10">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-3xl font-bold mx-auto shadow-2xl shadow-primary-500/20 mb-4">
            C
          </div>
          <h1 className="text-3xl font-display font-bold gradient-text">Join Community Aid</h1>
          <p className="text-surface-200/50 text-sm mt-2">Create your account to start making a difference</p>
        </div>

        <div className="glass-card p-8">
          <h2 className="text-lg font-semibold mb-6">Create Account</h2>

          {error && (
            <div className="mb-4 p-3 bg-danger-500/10 border border-danger-500/20 rounded-xl text-danger-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs text-surface-200/50 mb-1.5 font-medium">Full Name</label>
              <input id="register-name" name="name" type="text" value={formData.name} onChange={handleChange} className="input-field" placeholder="Your full name" required />
            </div>
            <div>
              <label className="block text-xs text-surface-200/50 mb-1.5 font-medium">Email</label>
              <input id="register-email" name="email" type="email" value={formData.email} onChange={handleChange} className="input-field" placeholder="you@example.com" required />
            </div>
            <div>
              <label className="block text-xs text-surface-200/50 mb-1.5 font-medium">Phone (optional)</label>
              <input id="register-phone" name="phone" type="tel" value={formData.phone} onChange={handleChange} className="input-field" placeholder="+91XXXXXXXXXX" />
            </div>
            <div>
              <label className="block text-xs text-surface-200/50 mb-1.5 font-medium">Role</label>
              <select id="register-role" name="role" value={formData.role} onChange={handleChange} className="input-field">
                <option value="volunteer">Volunteer</option>
                <option value="ngo_admin">NGO Administrator</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-surface-200/50 mb-1.5 font-medium">Password</label>
              <input id="register-password" name="password" type="password" value={formData.password} onChange={handleChange} className="input-field" placeholder="Min. 6 characters" required />
            </div>
            <div>
              <label className="block text-xs text-surface-200/50 mb-1.5 font-medium">Confirm Password</label>
              <input id="register-confirm" name="confirmPassword" type="password" value={formData.confirmPassword} onChange={handleChange} className="input-field" placeholder="Repeat your password" required />
            </div>

            <button id="register-submit" type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
              {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-sm text-surface-200/40 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-primary-400 hover:text-primary-300 font-medium">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
