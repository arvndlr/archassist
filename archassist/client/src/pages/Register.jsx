import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { ErrorBar } from '../components/ui.jsx';
import { errorText } from '../lib/api.js';
import AuthShell from './AuthShell.jsx';

export default function Register() {
  const { register } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError('');
    try { await register(form.name, form.email, form.password); } catch (err) { setError(errorText(err)); } finally { setBusy(false); }
  };

  return (
    <AuthShell>
      <form onSubmit={submit}>
        <h2 className="display m-0 mb-1 text-[30px] leading-[1.1]">Create account</h2>
        <p className="m-0 mb-7 text-[13px] text-muted">Student accounts only. Admins are set up by the system.</p>
        <div className="mb-5"><ErrorBar>{error}</ErrorBar></div>
        <label className="mb-[18px] block"><span className="field-label">Full name</span>
          <input className="field" required value={form.name} onChange={set('name')} /></label>
        <label className="mb-[18px] block"><span className="field-label">Email</span>
          <input className="field" type="email" required autoComplete="email" value={form.email} onChange={set('email')} /></label>
        <label className="mb-6 block"><span className="field-label">Password</span>
          <input className="field" type="password" required minLength={8} autoComplete="new-password" value={form.password} onChange={set('password')} />
          <span className="mt-1.5 block text-[11px] text-muted-2">At least 8 characters.</span></label>
        <button disabled={busy}
          className="flex w-full cursor-pointer items-center justify-between border-0 bg-accent px-[18px] py-[15px] text-[15px] leading-tight font-extrabold text-white hover:bg-accent-hover disabled:opacity-60">
          <span>{busy ? 'Creating…' : 'Create account'}</span><span className="text-[17px]">→</span>
        </button>
        <p className="m-0 mt-3.5 text-[11px] text-muted-2">Already registered? <Link to="/login" className="font-semibold">Sign in</Link></p>
      </form>
    </AuthShell>
  );
}
