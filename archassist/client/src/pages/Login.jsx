import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { ErrorBar } from '../components/ui.jsx';
import { errorText } from '../lib/api.js';
import AuthShell from './AuthShell.jsx';

export default function Login() {
  const { login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '', role: 'student' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError('');
    try { await login(form.email, form.password, form.role); } catch (err) { setError(errorText(err)); } finally { setBusy(false); }
  };
  const tab = (role) => `flex-1 cursor-pointer border-0 p-[11px] text-left text-[13px] leading-tight font-extrabold ${
    form.role === role ? 'bg-ink text-paper' : 'bg-transparent text-ink hover:bg-paper'}`;

  return (
    <AuthShell>
      <form onSubmit={submit}>
        <h2 className="display m-0 mb-1 text-[30px] leading-[1.1]">Sign in</h2>
        <p className="m-0 mb-7 text-[13px] text-muted">Use your university account.</p>
        <div className="mb-5"><ErrorBar>{error}</ErrorBar></div>
        <label className="mb-[18px] block">
          <span className="field-label">Email</span>
          <input className="field" type="email" required autoComplete="email" value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </label>
        <label className="mb-[22px] block">
          <span className="field-label">Password</span>
          <input className="field" type="password" required autoComplete="current-password" value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </label>
        <span className="field-label mb-2">Sign in as</span>
        <div className="mb-6 flex border-2 border-ink" role="radiogroup" aria-label="Sign in as">
          <button type="button" role="radio" aria-checked={form.role === 'student'} className={tab('student')} onClick={() => setForm({ ...form, role: 'student' })}>Student</button>
          <button type="button" role="radio" aria-checked={form.role === 'admin'} className={tab('admin')} onClick={() => setForm({ ...form, role: 'admin' })}>Admin</button>
        </div>
        <button disabled={busy}
          className="flex w-full cursor-pointer items-center justify-between border-0 bg-accent px-[18px] py-[15px] text-[15px] leading-tight font-extrabold text-white hover:bg-accent-hover disabled:opacity-60">
          <span>{busy ? 'Signing in…' : 'Continue'}</span><span className="text-[17px]">→</span>
        </button>
        <p className="m-0 mt-3.5 text-[11px] text-muted-2">
          New student? <Link to="/register" className="font-semibold">Create an account</Link>
        </p>
      </form>
    </AuthShell>
  );
}
