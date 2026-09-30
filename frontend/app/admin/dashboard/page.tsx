'use client';
import { useEffect, useState } from 'react';
import { api, DashboardStats, Order } from '@/lib/api';

const ALL_STATUSES = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];

export default function AdminDashboardPage() {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [updatingId, setUpdatingId] = useState<string | null>(null);

    useEffect(() => {
        Promise.all([api.admin.dashboard(), api.admin.orders(20)])
            .then(([s, o]) => { setStats(s); setOrders(Array.isArray(o) ? o : []); })
            .catch(() => { })
            .finally(() => setLoading(false));
    }, []);

    const updateStatus = async (orderId: string, status: string) => {
        setUpdatingId(orderId);
        try {
            await api.admin.updateOrderStatus(orderId, status);
            setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o));
        } finally { setUpdatingId(null); }
    };

    if (loading) return <div className="admin-loading"><div className="admin-spinner" /></div>;

    const statCards = [
        { label: 'Total Orders', value: stats?.total_orders ?? 0, emoji: '📦' },
        { label: 'Pending', value: stats?.pending_orders ?? 0, emoji: '⏳' },
        { label: 'Revenue', value: `$${((stats?.total_revenue_cents ?? 0) / 100).toFixed(0)}`, emoji: '💰' },
        { label: 'Customers', value: stats?.total_customers ?? 0, emoji: '👥' },
        { label: 'Low Stock', value: stats?.low_stock_count ?? 0, emoji: '⚠️' },
    ];

    return (
        <div>
            <div className="admin-page-header">
                <div>
                    <h1>📊 Dashboard</h1>
                    <p>Overview of your store performance</p>
                </div>
            </div>

            <div className="admin-stats-grid">
                {statCards.map((c, i) => (
                    <div key={i} className="admin-stat-card">
                        <div style={{ fontSize: 24, marginBottom: 4 }}>{c.emoji}</div>
                        <div className="stat-value">{c.value}</div>
                        <div className="stat-label">{c.label}</div>
                    </div>
                ))}
            </div>

            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Recent Orders</h2>
            <div className="admin-table-wrap">
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th>Order</th>
                            <th>Customer</th>
                            <th>Total</th>
                            <th>Status</th>
                            <th>Date</th>
                            <th>Update</th>
                        </tr>
                    </thead>
                    <tbody>
                        {orders.map(order => (
                            <tr key={order.id}>
                                <td style={{ fontFamily: 'monospace', fontSize: 11, color: '#888' }}>#{order.id.slice(0, 8)}</td>
                                <td style={{ color: '#fff' }}>{order.customer_name}</td>
                                <td style={{ fontWeight: 600 }}>${(order.total_cents / 100).toFixed(2)}</td>
                                <td>
                                    <span className={`admin-badge ${order.status === 'delivered' ? 'admin-badge-green' : order.status === 'cancelled' ? 'admin-badge-red' : order.status === 'pending' ? 'admin-badge-yellow' : 'admin-badge-orange'}`}>
                                        {order.status}
                                    </span>
                                </td>
                                <td style={{ color: '#888' }}>{new Date(order.created_at).toLocaleDateString()}</td>
                                <td>
                                    <select
                                        className="admin-status-select"
                                        value={order.status}
                                        disabled={updatingId === order.id}
                                        onChange={e => updateStatus(order.id, e.target.value)}
                                    >
                                        {ALL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {orders.length === 0 && <div className="admin-empty"><p>No orders yet.</p></div>}
            </div>
        </div>
    );
}
