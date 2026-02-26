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
  const [token, setToken] = useState(null);
  const [email, setEmail] = useState(null);
  const [role, setRole] = useState(null);
  const [tenant, setTenant] = useState(null);

  useEffect(() => {
    const stored = window.localStorage.getItem('auth_token');
    if (stored) {
      setToken(stored);
      setAuthToken(stored);
      const claims = decodeClaims(stored);
      setEmail(claims.email || null);
      setRole(claims.role || null);
      // Fetch server-side session details (tenant name, logo, etc.)
      fetchSession()
        .then((data) => {
          if (data?.tenant) {
            setTenant(data.tenant);
          }
        })
        .catch(() => {});
    }
  }, []);

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

