'use client';
import { useEffect, useState } from 'react';
import { api, Order } from '@/lib/api';
import { useToast } from '@/context/ToastContext';

const ALL_STATUSES = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];

export default function AdminOrdersPage() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [updatingId, setUpdatingId] = useState<string | null>(null);
    const { showToast } = useToast();

    useEffect(() => {
        api.admin.orders(100)
            .then(o => setOrders(Array.isArray(o) ? o : []))
            .catch(() => showToast('Failed to load orders', 'error'))
            .finally(() => setLoading(false));
    }, [showToast]);

    const updateStatus = async (id: string, status: string) => {
        setUpdatingId(id);
        try {
            await api.admin.updateOrderStatus(id, status);
            setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o));
            showToast(`Order updated to ${status}`, 'success');
        } catch {
            showToast('Failed to update', 'error');
        } finally {
            setUpdatingId(null);
        }
    };

    if (loading) return <div className="admin-loading"><div className="admin-spinner" /></div>;

    return (
        <div>
            <div className="admin-page-header">
                <div>
                    <h1>📋 Orders</h1>
                    <p>Manage customer orders and update statuses</p>
                </div>
            </div>

            <div className="admin-table-wrap">
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th>Order ID</th>
                            <th>Customer</th>
                            <th>Phone</th>
                            <th>Address</th>
                            <th>Total</th>
                            <th>Status</th>
                            <th>Date</th>
                            <th>Update Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {orders.map(order => (
                            <tr key={order.id}>
                                <td style={{ fontFamily: 'monospace', fontSize: 11, color: '#888' }}>#{order.id.slice(0, 8)}</td>
                                <td style={{ color: '#fff', fontWeight: 500 }}>{order.customer_name}</td>
                                <td style={{ color: '#aaa' }}>{order.customer_phone || '—'}</td>
                                <td style={{ color: '#aaa', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{order.shipping_address}</td>
                                <td style={{ fontWeight: 700, color: '#fff' }}>${(order.total_cents / 100).toFixed(2)}</td>
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
