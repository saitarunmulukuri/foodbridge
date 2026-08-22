import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/authService';
import { getStoredToken, setStoredToken, getStoredUser, setStoredUser } from '../services/apiClient';

const AuthContext = createContext(null);

export const PRESET_USERS = {
  DONOR: { email: 'e2e_donor@foodbridge.org', password: 'Secure@12345', label: 'Dave (Donor)' },
  NGO: { email: 'e2e_ngo@foodbridge.org', password: 'Secure@12345', label: 'Nancy (NGO Relief)' },
  VOLUNTEER: { email: 'e2e_vol@foodbridge.org', password: 'Secure@12345', label: 'Victor (Volunteer)' },
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => getStoredUser());
  const [token, setToken] = useState(() => getStoredToken());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (token && user) {
      setStoredToken(token);
      setStoredUser(user);
    } else {
      setStoredToken(null);
      setStoredUser(null);
    }
  }, [token, user]);

  const login = async (email, password) => {
    setLoading(true);
    setError(null);
    try {
      const response = await authService.login(email, password);
      if (response.success && response.data) {
        const { access_token, user } = response.data;
        // Backend nests user info under response.data.user
        const userData = {
          user_id: user.user_id,
          email: user.email,
          role: user.role,
          account_status: user.account_status,
        };

        setToken(access_token);
        setUser(userData);
        setStoredToken(access_token);
        setStoredUser(userData);
        return userData;
      } else {
        throw new Error(response.message || 'Login failed');
      }
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const quickSwitchPersona = async (roleName) => {
    const preset = PRESET_USERS[roleName];
    if (!preset) return;
    return login(preset.email, preset.password);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    setStoredToken(null);
    setStoredUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        error,
        login,
        quickSwitchPersona,
        logout,
        isAuthenticated: !!token && !!user,
        role: user?.role || null,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
