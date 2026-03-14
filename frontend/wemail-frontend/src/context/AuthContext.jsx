import { createContext, useContext, useState, useEffect } from 'react';
import { getToken, getUser, clearAuth } from '../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]     = useState(getUser());
  const [token, setToken]   = useState(getToken());
  const [loading, setLoading] = useState(false);

  const login = (tokenVal, userVal) => {
    setToken(tokenVal);
    setUser(userVal);
  };

  const logout = () => {
    clearAuth();
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading, setLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
