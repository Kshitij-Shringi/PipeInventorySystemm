import React, { createContext, useContext, useEffect, useState } from 'react';
import { logout as apiLogout, setAuthToken, fetchSession } from './api';

const AuthContext = createContext(null);

function decodeClaims(token) {
  try {
    const [, payload] = token.split('.');
    if (!payload) return {};
    const json = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    return json || {};
  } catch {
    return {};
  }
}

export function AuthProvider({ children }) {
  // Initialise from localStorage synchronously so routes and guards see auth on first render.
  const [token, setToken] = useState(() => {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem('auth_token');
  });
  // Decode basic claims (email, role) immediately from the stored token to avoid any flicker
  // on first paint for protected/tenant-admin routes.
  const initialClaims = token ? decodeClaims(token) : {};
  const [email, setEmail] = useState(initialClaims.email || null);
  const [role, setRole] = useState(initialClaims.role || null);
  const [tenant, setTenant] = useState(null);

  // Whenever token is present (including on initial mount), hydrate auth state and session.
  useEffect(() => {
    if (!token) {
      setAuthToken(null);
      return;
    }
    setAuthToken(token);
    const claims = decodeClaims(token);
    setEmail(claims.email || null);
    setRole(claims.role || null);
    fetchSession()
      .then((data) => {
        if (data?.tenant) {
          setTenant(data.tenant);
        }
      })
      .catch(() => {});
  }, [token]);

  function handleLogin(newToken) {
    setToken(newToken);
    setAuthToken(newToken);
    window.localStorage.setItem('auth_token', newToken);
    const claims = decodeClaims(newToken);
    setEmail(claims.email || null);
    setRole(claims.role || null);
    fetchSession()
      .then((data) => {
        if (data?.tenant) {
          setTenant(data.tenant);
        }
      })
      .catch(() => {});
  }

  function handleLogout() {
    setToken(null);
    setEmail(null);
    setRole(null);
    setTenant(null);
    apiLogout();
  }

  const value = {
    token,
    email,
    role,
    tenant,
    tenantName: tenant?.name ?? null,
    tenantLogoUrl: tenant?.logo_url ?? null,
    isAuthenticated: Boolean(token),
    isTenantAdmin: role === 'tenant_admin' || role === 'superadmin',
    loginToken: handleLogin,
    logout: handleLogout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}

