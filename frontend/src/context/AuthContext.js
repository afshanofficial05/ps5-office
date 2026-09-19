import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { api, setAuthToken, getAuthToken } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const loadUser = async () => {
    const token = getAuthToken();
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const userData = await api.getMe();
      setUser(userData);
    } catch (err) {
      console.error('Failed to load user', err);
      setAuthToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUser();
  }, []);

  const login = async (email, password) => {
    const data = await api.login(email, password);
    setAuthToken(data.access_token);
    setUser(data.user);
    if (data.user.role === 'SUPER_ADMIN') {
      router.push('/super-admin');
    } else if (data.user.role === 'ADMIN') {
      router.push('/admin');
    } else {
      router.push('/dashboard');
    }
    return data.user;
  };

  const register = async (name, email, password, profilePhoto) => {
    const data = await api.register(name, email, password, profilePhoto);
    setAuthToken(data.access_token);
    setUser(data.user);
    router.push('/dashboard');
    return data.user;
  };

  const logout = () => {
    setAuthToken(null);
    setUser(null);
    router.push('/login');
  };

  const hasPermission = (permissionName) => {
    if (!user) return false;
    if (user.role === 'SUPER_ADMIN') return true;
    if (user.role !== 'ADMIN') return false;
    if (!user.permissions || !Array.isArray(user.permissions)) return false;

    const legacyMap = {
      'VIEW_SEASON': ['SEASON_MANAGEMENT'],
      'CREATE_SEASON': ['SEASON_MANAGEMENT'],
      'EDIT_SEASON': ['SEASON_MANAGEMENT'],
      'DELETE_SEASON': ['SEASON_MANAGEMENT'],
      'UPDATE_SEASON_STATS': ['SEASON_MANAGEMENT'],
      'MANAGE_SEASON_RESULTS': ['SEASON_MANAGEMENT'],
      'VIEW_SEASON_LEADERBOARD': ['SEASON_MANAGEMENT'],
      'VIEW_PLAYERS': ['PLAYER_MANAGEMENT'],
      'CREATE_PLAYER': ['PLAYER_MANAGEMENT'],
      'EDIT_PLAYER': ['PLAYER_MANAGEMENT'],
      'DELETE_PLAYER': ['PLAYER_MANAGEMENT'],
      'VIEW_TEAMS': ['TEAM_MANAGEMENT'],
      'CREATE_TEAM': ['TEAM_MANAGEMENT'],
      'EDIT_TEAM': ['TEAM_MANAGEMENT'],
      'DELETE_TEAM': ['TEAM_MANAGEMENT'],
      'APPROVE_TEAM_REQUESTS': ['TEAM_MANAGEMENT'],
      'VIEW_MATCHES': ['MATCH_MANAGEMENT'],
      'MANUAL_MATCH_CREATE': ['MATCH_MANAGEMENT'],
      'VERIFY_RESULTS': ['RESULT_VERIFICATION'],
      'EDIT_MATCH': ['MATCH_MANAGEMENT'],
      'DELETE_MATCH': ['MATCH_MANAGEMENT'],
      'VIEW_REPORTS': ['REPORT_MANAGEMENT'],
      'GENERATE_REPORTS': ['REPORT_MANAGEMENT']
    };

    const aliases = legacyMap[permissionName] || [];
    const validKeys = [permissionName, ...aliases];
    return user.permissions.some(p => validKeys.includes(p.permission) && p.enabled);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser: loadUser, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
