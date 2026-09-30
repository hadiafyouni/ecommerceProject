'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { api, Order } from '@/lib/api';
import { useToast } from '@/context/ToastContext';
import { Package, LogOut, User } from 'lucide-react';

const statusColors: Record<string, string> = {
    pending: 'badge-yellow', processing: 'badge-blue',
    shipped: 'badge-blue', delivered: 'badge-green', cancelled: 'badge-red',
};

export default function AccountPage() {
    const { user, logout, token, loading: authLoading } = useAuth();
    const { showToast } = useToast();
    const router = useRouter();
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);

    const [deliveryInfo, setDelInfo] = useState({ first_name: '', last_name: '', customer_phone: '', shipping_address: '' });
    const [isEditingDelivery, setIsEditingDelivery] = useState(true);

    const userKey = user?.user_id || user?.email || user?.id || '';

    // Load saved delivery info whenever the signed-in user changes
    // (adjusting state during render, per React docs).
    const [loadedUserKey, setLoadedUserKey] = useState('');
    if (userKey && userKey !== loadedUserKey) {
        setLoadedUserKey(userKey);
        const saved = localStorage.getItem(`shopx_delivery_info_${userKey}`);
        let parsed = null;
        try { parsed = saved ? JSON.parse(saved) : null; } catch { /* ignore corrupt data */ }
        setDelInfo(parsed ?? { first_name: '', last_name: '', customer_phone: '', shipping_address: '' });
        setIsEditingDelivery(!parsed);
    }

    useEffect(() => {
        if (authLoading) return;
        if (!token) { router.push('/login'); return; }
        api.orders.list().then(data => setOrders(data ?? [])).catch(() => { }).finally(() => setLoading(false));
    }, [token, authLoading, router]);

    const handleSaveDeliveryInfo = () => {
        const key = userKey;
        if (!key) {
            console.warn('Cannot save delivery info — no user identifier available', user);
            showToast('Could not save — please try again.');
            return;
        }
        localStorage.setItem(`shopx_delivery_info_${key}`, JSON.stringify(deliveryInfo));
        showToast('Delivery info saved successfully!');
        setIsEditingDelivery(false);
    };

    // While auth is still resolving, show a spinner instead of flashing content
    if (authLoading) return (
        <div className="flex items-center justify-center" style={{ minHeight: '60vh' }}>
            <div className="w-10 h-10 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--orange)', borderTopColor: 'transparent' }} />
        </div>
    );

    return (
        <div className="flex flex-col gap-6 sm:gap-8">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold">My Account</h1>
                    <p className="text-muted text-sm mt-1">{user?.email}</p>
                </div>
                <button onClick={() => { logout(); router.push('/'); }}
                    className="btn btn-outline gap-2 text-xs sm:text-sm flex-shrink-0">
                    <LogOut size={15} /> <span className="hidden xs:inline sm:inline">Sign Out</span>
                    <span className="sm:hidden">Out</span>
                </button>
            </div>

            {/* Profile card */}
            <div className="card" style={{ padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                <div style={{ width: 52, height: 52, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: 'var(--orange-muted)', color: 'var(--orange)' }}>
                    <User size={24} />
                </div>
                <div>
                    <p style={{ fontWeight: 600, fontSize: '0.9375rem', color: 'var(--text)' }}>{user?.email}</p>
                    <span className={`badge ${user?.role === 'admin' ? 'badge-blue' : 'badge-green'}`} style={{ marginTop: '0.375rem', display: 'inline-flex' }}>
                        {user?.role}
                    </span>
                </div>
            </div>

            {/* Delivery Info */}
            <div className="section">
                <h2 className="section-title flex items-center gap-2">
                    <Package size={18} style={{ color: 'var(--orange)' }} />
                    Default Delivery Info
                </h2>
                <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <p className="text-sm text-muted mb-2">Save your details here to auto-fill at checkout.</p>
                    <div className="flex flex-col gap-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="input-group">
                                <label htmlFor="del-fname" style={{ color: isEditingDelivery ? 'var(--text)' : 'var(--text-muted)' }}>First Name</label>
                                <input id="del-fname" className="input" placeholder="John" disabled={!isEditingDelivery}
                                    style={{ opacity: isEditingDelivery ? 1 : 0.7 }}
                                    value={deliveryInfo.first_name || ''} onChange={e => setDelInfo(prev => ({ ...prev, first_name: e.target.value }))} />
                            </div>
                            <div className="input-group">
                                <label htmlFor="del-lname" style={{ color: isEditingDelivery ? 'var(--text)' : 'var(--text-muted)' }}>Last Name</label>
                                <input id="del-lname" className="input" placeholder="Doe" disabled={!isEditingDelivery}
                                    style={{ opacity: isEditingDelivery ? 1 : 0.7 }}
                                    value={deliveryInfo.last_name || ''} onChange={e => setDelInfo(prev => ({ ...prev, last_name: e.target.value }))} />
                            </div>
                        </div>
                        <div className="input-group">
                            <label htmlFor="del-phone" style={{ color: isEditingDelivery ? 'var(--text)' : 'var(--text-muted)' }}>Phone</label>
                            <input id="del-phone" type="tel" pattern="\d*" inputMode="numeric" title="Numbers only" className="input" placeholder="e.g. 71123456"
                                disabled={!isEditingDelivery} style={{ opacity: isEditingDelivery ? 1 : 0.7 }}
                                value={deliveryInfo.customer_phone} onChange={e => setDelInfo(prev => ({ ...prev, customer_phone: e.target.value.replace(/\D/g, '') }))} />
                        </div>
                        <div className="input-group">
                            <label htmlFor="del-addr" style={{ color: isEditingDelivery ? 'var(--text)' : 'var(--text-muted)' }}>Address</label>
                            <textarea id="del-addr" className="input resize-none" rows={2} placeholder="123 Main St, City"
                                disabled={!isEditingDelivery} style={{ opacity: isEditingDelivery ? 1 : 0.7 }}
                                value={deliveryInfo.shipping_address} onChange={e => setDelInfo(prev => ({ ...prev, shipping_address: e.target.value }))} />
                        </div>
                        <div className="flex items-center gap-3 mt-2">
                            {isEditingDelivery ? (
                                <button onClick={handleSaveDeliveryInfo} className="btn btn-primary w-fit px-6">
                                    Save Delivery Info
                                </button>
                            ) : null}
                            {!isEditingDelivery ? (
                                <button onClick={() => setIsEditingDelivery(true)} className="btn btn-outline border-none" style={{ padding: '0.625rem 1.25rem' }}>
                                    Edit Info
                                </button>
                            ) : null}
                        </div>
                    </div>
                </div>
            </div>

            {/* Orders */}
            <div className="section">
                <h2 className="section-title flex items-center gap-2">
                    <Package size={18} style={{ color: 'var(--orange)' }} />
                    Order History
                </h2>

                {loading ? (
                    <div className="flex flex-col gap-3">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className="card rounded-2xl" style={{ height: 72, opacity: 0.4 }} />
                        ))}
                    </div>
                ) : orders.length === 0 ? (
                    <div className="card p-10 sm:p-12 text-center">
                        <Package size={36} className="mx-auto mb-3" style={{ color: 'var(--border)' }} />
                        <p className="text-muted text-sm">No orders yet.{' '}
                            <Link href="/products" style={{ color: 'var(--orange)', fontWeight: 600 }}>Start shopping!</Link>
                        </p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-2 sm:gap-3">
                        {orders.map(order => (
                            <div key={order.id}
                                className="card card-hover cursor-pointer"
                                style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}
                                onClick={() => router.push(`/order-confirmation/${order.id}`)}>
                                <div className="min-w-0 flex-1">
                                    <p className="font-mono text-xs text-muted mb-0.5">#{order.id.slice(0, 8)}</p>
                                    <p className="font-bold gradient-text text-sm sm:text-base">
                                        ${(order.total_cents / 100).toFixed(2)}
                                    </p>
                                    <p className="text-xs text-muted mt-0.5">
                                        {new Date(order.created_at).toLocaleDateString()}
                                    </p>
                                </div>
                                <span className={`badge ${statusColors[order.status] || 'badge-blue'} capitalize flex-shrink-0`}>
                                    {order.status}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
