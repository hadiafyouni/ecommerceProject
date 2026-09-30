'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';

export default function LoginPage() {
    const { login } = useAuth();
    const router = useRouter();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPass, setShowPass] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [, setBgImage] = useState(
        'https://images.unsplash.com/photo-1606813907291-d86efa9b94db'
    );

    useEffect(() => {
        const fetchBgImage = async () => {
            try {
                const data = await api.settings.get('login_page_image_url');
                if (data?.value) setBgImage(data.value);
            } catch (err) {
                console.error('Failed to fetch login image:', err);
            }
        };

        fetchBgImage();
    }, []);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            await login(email, password);
            router.push('/');
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full font-sans">
            <div className="flex min-h-[calc(100vh-72px)] w-full items-center justify-center px-4 py-8 sm:px-6 md:px-8">
                <div className="w-full max-w-[420px] sm:max-w-[460px]">
                    <div className="rounded-[14px] bg-white px-5 py-6 shadow-[0_8px_30px_rgba(15,23,42,0.06)] sm:px-7 sm:py-8 md:px-8 md:py-9">
                        <div className="mb-6 sm:mb-7">
                            <p className="mb-2 pl-1 text-[14px] font-medium text-[#8b90a0] sm:text-[15px]">
                                Please enter your details
                            </p>
                            <h1 className="pl-1 text-[30px] font-bold leading-[1.08] tracking-[-0.02em] text-[#232634] sm:text-[34px]">
                                Welcome back
                            </h1>
                        </div>

                        <form onSubmit={handleSubmit} className="flex flex-col gap-4 sm:gap-5">
                            <div>
                                <label htmlFor="email" className="sr-only">
                                    Email address
                                </label>
                                <input
                                    id="email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="Email address"
                                    required
                                    className="h-14 w-full rounded-[10px] border border-[#d8dde7] bg-white pl-6 pr-5 text-[15px] text-[#232634] outline-none transition placeholder:text-[#98a1b2] focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 sm:h-[58px] sm:pl-7"
                                />
                            </div>

                            <div>
                                <label htmlFor="password" className="sr-only">
                                    Password
                                </label>
                                <div className="relative">
                                    <input
                                        id="password"
                                        type={showPass ? 'text' : 'password'}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="Password"
                                        required
                                        className="h-14 w-full rounded-[10px] border border-[#d8dde7] bg-white pl-6 pr-14 text-[15px] text-[#232634] outline-none transition placeholder:text-[#98a1b2] focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 sm:h-[58px] sm:pl-7 sm:pr-16"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPass((prev) => !prev)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-[#98a1b2] transition hover:text-[#232634] sm:right-5"
                                        aria-label={showPass ? 'Hide password' : 'Show password'}
                                    >
                                        {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>

                            <div className="mt-1 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <label className="flex cursor-pointer items-center gap-3 text-[14px] font-medium text-[#2b3040]">
                                    <input
                                        type="checkbox"
                                        className="h-4 w-4 rounded border-[#cfd5df] text-orange-500 focus:ring-orange-500"
                                    />
                                    <span>Remember for 30 days</span>
                                </label>

                                <Link
                                    href="#"
                                    className="text-[14px] font-medium text-orange-500 transition hover:text-orange-600"
                                >
                                    Forgot password
                                </Link>
                            </div>

                            {error && (
                                <div className="flex items-center gap-2 rounded-[10px] bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
                                    <AlertCircle size={18} />
                                    <span>{error}</span>
                                </div>
                            )}

                            <div className="mt-1 flex flex-col gap-3 sm:gap-4">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="flex h-14 w-full items-center justify-center gap-3 rounded-[10px] bg-orange-500 px-6 text-[16px] font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60 sm:h-[58px]"
                                >
                                    {loading && (
                                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/25 border-t-white" />
                                    )}
                                    {loading ? 'Signing in...' : 'Sign in'}
                                </button>

                                <button
                                    type="button"
                                    className="flex h-14 w-full items-center justify-center gap-3 rounded-[10px] border border-[#d8dde7] bg-white px-6 text-[15px] font-medium text-[#232634] transition hover:bg-[#fafbfc] sm:h-[58px]"
                                >
                                    <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" aria-hidden="true">
                                        <path
                                            fill="#4285F4"
                                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                        />
                                        <path
                                            fill="#34A853"
                                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                        />
                                        <path
                                            fill="#FBBC05"
                                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                                        />
                                        <path
                                            fill="#EA4335"
                                            d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                        />
                                    </svg>
                                    Sign in with Google
                                </button>
                            </div>

                            <p className="mt-2 text-center text-[14px] leading-6 text-[#8b90a0] sm:mt-3">
                                Don&apos;t have an account?{' '}
                                <Link
                                    href="/register"
                                    className="font-medium text-orange-500 transition hover:text-orange-600"
                                >
                                    Sign up
                                </Link>
                            </p>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}