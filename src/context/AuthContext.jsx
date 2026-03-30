import { createContext, useContext, useState, useEffect } from 'react';
import { signInWithGoogle, logout, onAuth } from '../lib/firebase.js';
import { setStorageUser } from '../lib/storage.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuth((firebaseUser) => {
      setUser(firebaseUser);
      setStorageUser(firebaseUser?.uid || null);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const handleSignInWithGoogle = async () => {
    setLoading(true);
    try {
      const user = await signInWithGoogle();
      return user;
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    setUser(null);
    setStorageUser(null);
  };

  const value = {
    user,
    loading,
    signInWithGoogle: handleSignInWithGoogle,
    logout: handleLogout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
