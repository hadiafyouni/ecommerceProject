'use client';
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { api, User, API_URL } from '@/lib/api';

export const API_BASE_URL = API_URL;

interface AuthContextType {
    user: User | null;
    loading: boolean;
    isAdmin: boolean;
    token: string | null;
    login: (email: string, password: string) => Promise<void>;
    adminLogin: (email: string, password: string) => Promise<void>;
    register: (email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null, loading: false, isAdmin: false, token: null,
    login: async () => { }, adminLogin: async () => { }, register: async () => { }, logout: async () => { },
});

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        api.auth.me()
            .then(u => {
                if (cancelled) return;
                const isAdminRoute = window.location.pathname.startsWith('/admin');

                // Strict Role Guarding on initial load
                if (isAdminRoute && u.role !== 'admin') {
                    api.auth.logout().catch(() => { });
                    setUser(null);
                } else if (!isAdminRoute && u.role !== 'customer') {
                    api.auth.logout().catch(() => { });
                    setUser(null);
                } else {
                    setUser(u);
                }
            })
            .catch(() => { /* not logged in — fine */ })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, []);

    const login = async (email: string, password: string) => {
        const { user: u } = await api.auth.login(email, password);
        setUser(u);
    };

    const adminLogin = async (email: string, password: string) => {
        const { user: u } = await api.auth.adminLogin(email, password);
        setUser(u);
    };

    const register = async (email: string, password: string) => {
        const { user: u } = await api.auth.register(email, password);
        setUser(u);
    };

    const logout = async () => {
        await api.auth.logout().catch(() => { });
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{
            user,
            loading,
            isAdmin: user?.role === 'admin',
            token: user ? 'cookie' : null,
            login,
            adminLogin,
            register,
            logout,
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
