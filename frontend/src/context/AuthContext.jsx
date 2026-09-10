import React, { createContext, useContext, useState, useEffect } from 'react';
import { getMe } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('voice_loan_token'));
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('voice_loan_user');
    return saved ? JSON.parse(saved) : null;
  });

  useEffect(() => {
    if (token) {
      getMe(token).then((res) => {
        if (res.authenticated && res.user) {
          setUser(res.user);
          localStorage.setItem('voice_loan_user', JSON.stringify(res.user));
        } else {
          logout();
        }
      }).catch(() => {});
    }
  }, [token]);

  const login = (newToken, newUser) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('voice_loan_token', newToken);
    localStorage.setItem('voice_loan_user', JSON.stringify(newUser));
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('voice_loan_token');
    localStorage.removeItem('voice_loan_user');
  };

  return (
    <AuthContext.Provider value={{ token, user, isAuthenticated: !!token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
