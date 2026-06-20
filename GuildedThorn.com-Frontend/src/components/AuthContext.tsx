import React, { createContext, useContext, useEffect, useState } from 'react';

export interface AuthUser {
    name?: string;
    role?: string;
    avatarUrl?: string;
    [key: string]: unknown;        // expand later
}

type AuthContextType = {
    isAuthenticated: boolean;
    user: AuthUser | null;
    loading: boolean;
    refresh: () => Promise<void>;  // lets you re‑check manually
};

const AuthContext = createContext<AuthContextType>({
    isAuthenticated: false,
    user: null,
    loading: true,
    refresh: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [user, setUser] = useState<AuthUser | null>(null);
    const [loading, setLoading] = useState(true);

    const refresh = async () => {
        try {
            const res = await fetch('/api/user/me', { credentials: 'include' });
            // 200 = a user; 204 = logged-out (empty body); anything else = error.
            // json() is guarded so an empty 204 body doesn't throw.
            const data = res.ok ? await res.json().catch(() => null) : null;
            if (data) {
                setUser(data);
                setIsAuthenticated(true);
            } else {
                setUser(null);
                setIsAuthenticated(false);
            }
        } catch {
            setUser(null);
            setIsAuthenticated(false);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { refresh(); }, []);

    return (
        <AuthContext.Provider value={{ isAuthenticated, user, loading, refresh }}>
            {children}
        </AuthContext.Provider>
    );
};

// nice shorthand
export const useAuth = () => useContext(AuthContext);
