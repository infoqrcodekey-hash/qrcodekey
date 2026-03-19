// ============================================
// context/AuthContext.js - Authentication State
// ============================================

import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../lib/api';
import { connectSocket, joinUserRoom, disconnectSocket } from '../lib/socket';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(null);

  // ====== Check on page load: Is user logged in? ======
  useEffect(() => {
    const savedToken = localStorage.getItem('qr_token');
    if (savedToken) {
      setToken(savedToken);
      fetchUser(savedToken);
    } else {
      setLoading(false);
    }
  }, []);

  // ====== Fetch user data ======
  const fetchUser = async (authToken) => {
    try {
      const res = await authAPI.getMe();
      const userData = res.data.data;
      setUser(userData);
      localStorage.setItem('qr_user', JSON.stringify(userData));
      
      // Connect socket and join user room
      connectSocket();
      joinUserRoom(userData.id);
    } catch (err) {
      console.error('Auth check failed:', err);
      localStorage.removeItem('qr_token');
      localStorage.removeItem('qr_user');
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  // ====== Register ======
  const register = async (data) => {
    const res = await authAPI.register(data);
    const { token: newToken, user: userData } = res.data;
    localStorage.setItem('qr_token', newToken);
    setToken(newToken);
    await fetchUser(newToken);
    return res.data;
  };

  // ====== Login ======
  const login = async (data) => {
    const res = await authAPI.login(data);
    const { token: newToken, user: userData } = res.data;
    localStorage.setItem('qr_token', newToken);
    setToken(newToken);
    await fetchUser(newToken);
    return res.data;
  };

  // ====== Logout ======
  const logout = () => {
    localStorage.removeItem('qr_token');
    localStorage.removeItem('qr_user');
    setToken(null);
    setUser(null);
    disconnectSocket();
  };

  // ====== Update User (after profile changes) ======
  const refreshUser = async () => {
    if (token) await fetchUser(token);
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      loading,
      isLoggedIn: !!user,
      isAdmin: user?.role === 'admin',
      isPremium: user?.isPremium,
      register,
      login,
      logout,
      refreshUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

export default AuthContext;
