'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';
import { useTheme } from '@/context/ThemeContext';
import { api, Category } from '@/lib/api';
import {
    ShoppingBag, User, LayoutDashboard,
    LogOut, Sun, Moon, Menu, Home, Grid3X3, ChevronRight, Heart
} from 'lucide-react';

/* ── Animated burger wrapper — same icon, CSS tilt on open ── */
function BurgerIcon({ open }: { open: boolean }) {
    return (
        <span className={`burger-icon${open ? ' burger-icon--open' : ''}`}>
            <Menu size={22} />
        </span>
    );
}

/* ── Nav links shared between mobile drawer ── */
function NavLinks({ onClose }: { onClose?: () => void }) {
    const { user, logout, isAdmin } = useAuth();
    const { itemCount } = useCart();
    const { wishlistCount } = useWishlist();
    const pathname = usePathname();

    const link = (href: string, icon: React.ReactNode, label: string, badge?: number) => (
        <Link key={href} href={href} onClick={onClose}
            className={`nav-link ${pathname === href ? 'active' : ''}`}>
            {icon}
            <span className="flex-1">{label}</span>
            {badge !== undefined && badge > 0 && (
                <span className="cart-badge">{badge > 9 ? '9+' : badge}</span>
            )}
        </Link>
    );

    return (
        <div className="flex flex-col gap-1 flex-1">
            {link('/', <Home size={18} />, 'Home')}
            {link('/products', <Grid3X3 size={18} />, 'Products')}
            {link('/wishlist', <Heart size={18} />, 'Wishlist', wishlistCount)}
            {link('/cart', <ShoppingBag size={18} />, 'Cart', itemCount)}
            {user && link('/account', <User size={18} />, 'Account')}
            {isAdmin && link('/admin', <LayoutDashboard size={18} />, 'Admin')}

            <div className="mt-auto pt-4" style={{ borderTop: '1px solid var(--border)' }}>
                {user ? (
                    <button onClick={() => { logout(); onClose?.(); }}
                        className="nav-link w-full text-left"
                        style={{ color: 'var(--text-muted)' }}
                        onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
                        onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}>
                        <LogOut size={18} /> <span>Sign Out</span>
                    </button>
                ) : (
                    <Link href="/login" onClick={onClose} className="btn btn-primary w-full" style={{ marginTop: '0.75rem' }}>
                        Sign In
                    </Link>
                )}
            </div>
        </div>
    );
}

/* ── Main Navbar ── */
export default function Navbar() {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [categories, setCategories] = useState<Category[]>([]);
    const { theme, toggle } = useTheme();
    const { user, logout, isAdmin } = useAuth();
    const { itemCount } = useCart();
    const { wishlistCount } = useWishlist();
    const pathname = usePathname();

    const [accessoriesOpen, setAccessoriesOpen] = useState(false);

    /* Load categories for sidebar */
    useEffect(() => {
        api.categories.list().then(setCategories).catch(() => { });
    }, []);

    /* Close sidebar on route change (adjusting state during render, per React docs) */
    const [lastPathname, setLastPathname] = useState(pathname);
    if (pathname !== lastPathname) {
        setLastPathname(pathname);
        setSidebarOpen(false);
        setMobileOpen(false);
        setAccessoriesOpen(false);
    }

    /* Prevent body scroll when sidebar/mobile open */
    useEffect(() => {
        document.body.style.overflow = (sidebarOpen || mobileOpen) ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [sidebarOpen, mobileOpen]);

    /* Desktop inline link helper */
    const deskLink = (href: string, icon: React.ReactNode, label: string, badge?: number) => (
        <Link key={href} href={href}
            className={`desk-nav-link ${pathname === href ? 'desk-nav-link--active' : ''}`}>
            {icon}
            <span>{label}</span>
            {badge !== undefined && badge > 0 && (
                <span className="desk-cart-badge">{badge > 9 ? '9+' : badge}</span>
            )}
        </Link>
    );

    const accessoriesSubLinks = [
        { name: 'Mice', q: 'mouse|logitech-g' },
        { name: 'Keyboards', q: 'keyboard|blackwidow' },
        { name: 'Headsets', q: 'headset|arctis' },
        { name: 'Webcams', q: 'webcam|brio' },
        { name: 'Desk Mats', q: 'mat|corsair' }
    ];

    const renderCategoryLink = (c: Category, isMobile: boolean) => {
        const linkClass = isMobile ? "nav-link" : "sidebar-cat-link";

        if (c.name.toLowerCase() === 'accessories') {
            return (
                <div key={c.id} className="flex flex-col">
                    <button
                        onClick={() => setAccessoriesOpen(!accessoriesOpen)}
                        className={`${linkClass} w-full text-left flex items-center`}
                    >
                        <span className="flex-1">{c.name}</span>
                        <ChevronRight
                            size={14}
                            className={`ml-auto opacity-40 transition-transform ${accessoriesOpen ? 'rotate-90' : ''}`}
                        />
                    </button>

                    {accessoriesOpen && (
                        <div className="flex flex-col ml-4 mt-1 border-l-2 border-orange-500/20 pl-2">
                            <Link
                                href={`/${c.slug}`}
                                onClick={() => isMobile ? setMobileOpen(false) : setSidebarOpen(false)}
                                className={`${linkClass} py-1.5 text-sm opacity-80`}
                            >
                                All Accessories
                            </Link>
                            {accessoriesSubLinks.map(sub => (
                                <Link
                                    key={sub.name}
                                    href={`/${c.slug}?q=${sub.q}`}
                                    onClick={() => isMobile ? setMobileOpen(false) : setSidebarOpen(false)}
                                    className={`${linkClass} py-1.5 text-sm opacity-80`}
                                >
                                    {sub.name}
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            );
        }

        return (
            <Link
                key={c.id}
                href={`/${c.slug}`}
                onClick={() => isMobile ? setMobileOpen(false) : setSidebarOpen(false)}
                className={linkClass}
            >
                <span>{c.name}</span>
                {!isMobile && <ChevronRight size={14} className="ml-auto opacity-40" />}
            </Link>
        );
    };

    return (
        <>
            {/* ══ DESKTOP: Full horizontal navbar (≥768px) ══ */}
            <div className="desk-navbar">
                {/* Left group: orange categories burger + logo */}
                <div className="desk-navbar-left">
                    <button
                        className="categories-burger-btn"
                        onClick={() => setSidebarOpen(o => !o)}
                        aria-label={sidebarOpen ? 'Close categories' : 'Open categories'}
                    >
                        <BurgerIcon open={sidebarOpen} />
                        <span className="categories-label">Categories</span>
                    </button>
                </div>

                {/* Center group: nav links */}
                <nav className="desk-nav-links">
                    {deskLink('/', <Home size={17} />, 'Home')}
                    {deskLink('/products', <Grid3X3 size={17} />, 'Products')}
                    {deskLink('/wishlist', <Heart size={17} />, 'Wishlist', wishlistCount)}
                    {deskLink('/cart', <ShoppingBag size={17} />, 'Cart', itemCount)}
                    {user && deskLink('/account', <User size={17} />, 'Account')}
                    {isAdmin && deskLink('/admin', <LayoutDashboard size={17} />, 'Admin')}
                </nav>

                {/* Right group: theme toggle + auth */}
                <div className="desk-navbar-right">
                    <button
                        className="desk-hamburger-btn"
                        onClick={toggle}
                        aria-label="Toggle theme"
                    >
                        {theme === 'dark' ? <Sun size={19} /> : <Moon size={19} />}
                    </button>

                    {user ? (
                        <button
                            onClick={logout}
                            className="desk-auth-btn desk-auth-btn--out"
                            title="Sign Out"
                        >
                            <LogOut size={17} />
                            <span>Sign Out</span>
                        </button>
                    ) : (
                        <Link href="/login" className="desk-auth-btn desk-auth-btn--in">
                            <User size={17} />
                            <span>Sign In</span>
                        </Link>
                    )}
                </div>
            </div>

            {/* ══ DESKTOP: Categories Sidebar ══ */}
            <aside className={`sidebar ${sidebarOpen ? 'sidebar--open' : ''}`}>
                <div className="sidebar-top">
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Browse by Category</p>
                </div>
                <div className="flex flex-col gap-1 p-3">
                    <Link
                        href="/products"
                        onClick={() => setSidebarOpen(false)}
                        className="sidebar-cat-link"
                    >
                        <Grid3X3 size={16} />
                        <span>All Products</span>
                        <ChevronRight size={14} className="ml-auto opacity-40" />
                    </Link>
                    {categories.map(c => renderCategoryLink(c, false))}
                </div>
            </aside>


            {/* Sidebar backdrop (desktop) */}
            {sidebarOpen && (
                <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} />
            )}

            {/* ══ MOBILE: Top bar (<768px) ══ */}
            <header className="topbar">
                <button onClick={() => setMobileOpen(o => !o)} className="btn btn-ghost" aria-label="Toggle menu">
                    <BurgerIcon open={mobileOpen} />
                </button>
                <div className="flex-1" />
                <button onClick={toggle} className="btn btn-ghost" aria-label="Toggle theme">
                    {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                </button>
            </header>

            {/* Mobile dropdown */}
            <div className={`mobile-menu ${mobileOpen ? 'mobile-menu--open' : ''}`}>
                <div className="mobile-menu-inner">
                    {/* Mobile category section */}
                    <div className="mb-3 pb-3" style={{ borderBottom: '1px solid var(--border)' }}>
                        <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>Categories</p>
                        {categories.map(c => renderCategoryLink(c, true))}
                    </div>
                    <NavLinks onClose={() => setMobileOpen(false)} />
                </div>
            </div>

            {mobileOpen && (
                <div className="mobile-backdrop" onClick={() => setMobileOpen(false)} />
            )}
        </>
    );
}
