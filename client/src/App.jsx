import { useState } from 'react';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import ParentPage from './pages/ParentPage.jsx';
import { tokenStore } from './api.js';
import ParentPortal, { ParentJoin, ParentLogin } from './pages/ParentPortal.jsx';
import SchoolRegister from './pages/SchoolRegister.jsx';

export default function App() {
  const [token, setToken] = useState(tokenStore.get());
  const parentMatch = window.location.pathname.match(/^\/p\/([a-z0-9-]+)\/?$/i);
  if (parentMatch) return <ParentPage slug={parentMatch[1]} />;
  if (window.location.pathname === '/parent/login') return <ParentLogin />;
  if (window.location.pathname === '/parent/join') return <ParentJoin />;
  if (window.location.pathname === '/parent') return <ParentPortal />;
  if (window.location.pathname === '/register') return <SchoolRegister />;
  function signOut() { tokenStore.clear(); setToken(null); }
  return token ? <Dashboard onSignOut={signOut} /> : <Login onLogin={setToken} />;
}
