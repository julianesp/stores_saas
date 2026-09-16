'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface StorefrontUser {
  id: string;
  email: string;
  name: string;
  phone?: string;
  createdAt: string;
}

interface StorefrontUserContextType {
  user: StorefrontUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, phone?: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const StorefrontUserContext = createContext<StorefrontUserContextType | undefined>(undefined);

export function StorefrontUserProvider({
  children,
  slug,
}: {
  children: ReactNode;
  slug: string;
}) {
  const [user, setUser] = useState<StorefrontUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Cargar usuario guardado en localStorage
  useEffect(() => {
    const savedUser = localStorage.getItem(`storefront_user_${slug}`);
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (err) {
        console.error('Error loading saved user:', err);
        localStorage.removeItem(`storefront_user_${slug}`);
      }
    }
    setLoading(false);
  }, [slug]);

  const login = async (email: string, password: string) => {
    try {
      const response = await fetch(`/api/storefront/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, email, password }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al iniciar sesión');
      }

      const data = await response.json();
      setUser(data.user);
      localStorage.setItem(`storefront_user_${slug}`, JSON.stringify(data.user));
    } catch (err) {
      throw err;
    }
  };

  const register = async (name: string, email: string, password: string, phone?: string) => {
    try {
      const response = await fetch(`/api/storefront/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, name, email, password, phone }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al registrarse');
      }

      const data = await response.json();
      setUser(data.user);
      localStorage.setItem(`storefront_user_${slug}`, JSON.stringify(data.user));
    } catch (err) {
      throw err;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(`storefront_user_${slug}`);
  };

  return (
    <StorefrontUserContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </StorefrontUserContext.Provider>
  );
}

export function useStorefrontUser() {
  const context = useContext(StorefrontUserContext);
  if (!context) {
    throw new Error('useStorefrontUser debe usarse dentro de StorefrontUserProvider');
  }
  return context;
}
