'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { Mail, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';

export default function RegisterPage() {
    const { register } = useAuth();
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [showPass, setShowPass] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirm) { setError('Passwords do not match.'); return; }
        if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
        setLoading(true); setError('');
        try {
            await register(email, password);
            router.push('/');
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Registration failed');
        } finally { setLoading(false); }
    };

    return (
        <div style={{ minHeight: '70vh' }} className="flex items-center justify-center px-4 py-8 sm:py-12">
            <div className="w-full max-w-md">
                <div className="text-center mb-6 sm:mb-8">
                    <h1 className="text-2xl sm:text-3xl font-extrabold mb-2">Create Account</h1>
                    <p className="text-muted text-sm sm:text-base">Join ShopX to start shopping</p>
                </div>

                <div className="card p-6 sm:p-10 form-card-xs">
                    <form onSubmit={handleSubmit} className="flex flex-col gap-5 sm:gap-6">

                        <div className="input-group">
                            <label htmlFor="reg-email">Email address</label>
                            <div className="input-wrap">
                                <span className="input-icon"><Mail size={16} /></span>
                                <input id="reg-email" className="input" type="email"
                                    placeholder="you@example.com" value={email}
                                    onChange={e => setEmail(e.target.value)} required />
                            </div>
                        </div>

                        <div className="input-group">
                            <label htmlFor="reg-password">Password</label>
                            <div className="input-wrap">
                                <span className="input-icon"><Lock size={16} /></span>
                                <input id="reg-password" className="input with-right-icon"
                                    type={showPass ? 'text' : 'password'}
                                    placeholder="Min. 8 characters" value={password}
                                    onChange={e => setPassword(e.target.value)} required />
                                <button type="button" className="input-icon-right"
                                    onClick={() => setShowPass(s => !s)} aria-label="Toggle password">
                                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>

                        <div className="input-group">
                            <label htmlFor="reg-confirm">Confirm Password</label>
                            <div className="input-wrap">
                                <span className="input-icon"><Lock size={16} /></span>
                                <input id="reg-confirm" className="input"
                                    type="password" placeholder="Repeat password" value={confirm}
                                    onChange={e => setConfirm(e.target.value)} required />
                            </div>
                        </div>

                        {error && (
                            <div className="error-alert">
                                <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
                                <span>{error}</span>
                            </div>
                        )}

                        <button type="submit" disabled={loading} className="btn btn-primary py-2.5 sm:py-3 w-full mt-1">
                            {loading ? 'Creating account…' : 'Create Account'}
                        </button>
                    </form>

                    <p className="text-center text-muted text-sm mt-6 sm:mt-7">
                        Already have an account?{' '}
                        <Link href="/login" className="font-semibold" style={{ color: 'var(--orange)' }}>
                            Sign in
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
