'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import './admin.css';

export default function AdminLoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const { adminLogin } = useAuth();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await adminLogin(email, password);
            router.push('/admin/dashboard');
        } catch (err) {
            setError((err instanceof Error && err.message) || 'Invalid admin credentials');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="admin-login-page">
            <div className="admin-login-box">
                <h1>Shop<span>X</span></h1>
                <p className="login-subtitle">Admin Panel — Sign in to manage your store</p>

                {error && <div className="login-error">{error}</div>}

                <form onSubmit={handleLogin}>
                    <div className="admin-form-group">
                        <label className="admin-label">Email</label>
                        <input
                            type="email"
                            className="admin-input"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            placeholder="admin@shopx.com"
                            required
                        />
                    </div>
                    <div className="admin-form-group">
                        <label className="admin-label">Password</label>
                        <input
                            type="password"
                            className="admin-input"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                        />
                    </div>
                    <button type="submit" className="admin-btn admin-btn-primary" disabled={loading}>
                        {loading ? 'Signing in...' : 'Sign In'}
                    </button>
                </form>
            </div>
        </div>
    );
}
