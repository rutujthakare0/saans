import { useState } from 'react';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import ParentPage from './pages/ParentPage.jsx';
import { tokenStore } from './api.js';

export default function App() {
  const [token, setToken] = useState(tokenStore.get());
  const parentMatch = window.location.pathname.match(/^\/p\/([a-z0-9-]+)\/?$/i);
  if (parentMatch) return <ParentPage slug={parentMatch[1]} />;
  function signOut() { tokenStore.clear(); setToken(null); }
  return token ? <Dashboard onSignOut={signOut} /> : <Login onLogin={setToken} />;
}
