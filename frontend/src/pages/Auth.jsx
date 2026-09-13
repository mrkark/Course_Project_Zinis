import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';

export default function Auth() {
  const { token, login, register, loading, error } = useAuthStore();
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  if (token) return <Navigate to={location.state?.from || '/'} replace />;
  const submit = async (e) => { e.preventDefault(); try { await (mode === 'login' ? login(email, password) : register(email, password)); navigate('/'); } catch (_) {} };
  return <main className="auth-page"><form className="auth-form" onSubmit={submit}><h1>{mode === 'login' ? 'Вход' : 'Регистрация'}</h1><p>Платформа анализа вредоносных файлов</p><label>Email<input type="email" value={email} onChange={e=>setEmail(e.target.value)} required /></label><label>Пароль<input type="password" value={password} onChange={e=>setPassword(e.target.value)} minLength={8} required /></label>{error && <div className="form-error">{error}</div>}<button disabled={loading}>{loading ? 'Проверка…' : mode === 'login' ? 'Войти' : 'Создать аккаунт'}</button><button type="button" className="link-button" onClick={()=>setMode(mode==='login'?'register':'login')}>{mode==='login'?'Создать аккаунт':'У меня уже есть аккаунт'}</button></form></main>;
}
