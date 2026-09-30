'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import './admin.css';

const MENU = [
    { label: '📊 Dashboard', href: '/admin/dashboard' },
    { label: '📦 Products', href: '/admin/products' },
    { label: '🗂️ Categories', href: '/admin/categories' },
    { label: '📢 Sales Banners', href: '/admin/banners' },
    { label: '📋 Orders', href: '/admin/orders' },
    { label: '📜 Audit Logs', href: '/admin/audit-logs' },
    { label: '⚙️ Settings', href: '/admin/settings' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const { token, isAdmin, logout } = useAuth();

    // The login page (/admin) is not wrapped by the sidebar layout
    if (pathname === '/admin') {
        return <>{children}</>;
    }

    // If not logged in, redirect to admin login
    if (!token) {
        return (
            <div className="admin-login-page">
                <div className="admin-login-box">
                    <h1>Shop<span>X</span></h1>
                    <p className="login-subtitle">You must sign in to access the admin panel.</p>
                    <Link href="/admin" className="admin-btn admin-btn-primary" style={{ width: '100%', justifyContent: 'center', textDecoration: 'none' }}>
                        Go to Login
                    </Link>
                </div>
            </div>
        );
    }

    // If logged in but NOT admin, show access denied
    if (!isAdmin) {
        return (
            <div className="admin-login-page">
                <div className="admin-login-box">
                    <h1>Shop<span>X</span></h1>
                    <div className="login-error">Access denied. This account is not an administrator.</div>
                    <Link href="/" className="admin-btn admin-btn-outline" style={{ width: '100%', justifyContent: 'center', textDecoration: 'none' }}>
                        Back to Store
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="admin-wrapper">
            <aside className="admin-sidebar">
                <div className="admin-sidebar-brand">
                    <h2>ShopX <span>Admin</span></h2>
                    <p>System UI v1.0</p>
                </div>

                <nav className="admin-nav">
                    {MENU.map(item => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`admin-nav-link ${pathname === item.href ? 'active' : ''}`}
                        >
                            {item.label}
                        </Link>
                    ))}
                </nav>

                <div className="admin-sidebar-footer">
                    <Link href="/" className="admin-nav-link">
                        🏪 Public Store
                    </Link>
                    <button className="admin-nav-link" onClick={async () => { await logout(); window.location.href = '/admin'; }} style={{ border: 'none', background: 'none', cursor: 'pointer', width: '100%', textAlign: 'left', padding: '12px 20px', color: '#f87171', fontSize: 14 }}>
                        🚪 Logout
                    </button>
                </div>
            </aside>

            <main className="admin-main">
                {children}
            </main>
        </div>
    );
}
