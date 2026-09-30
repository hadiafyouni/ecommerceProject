'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api, Order } from '@/lib/api';
import { CheckCircle, Package, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function OrderConfirmationPage() {
    const { id } = useParams<{ id: string }>();
    const [order, setOrder] = useState<Order | null>(null);
    const [paymentMethod, setPaymentMethod] = useState<string>('');
    const router = useRouter();

    useEffect(() => {
        api.orders.get(id)
            .then(o => {
                setOrder(o);
                // Payment method chosen during checkout (stored client-side)
                setPaymentMethod(localStorage.getItem(`order_${id}_payment`) || '');
            })
            .catch(() => router.push('/'));
    }, [id, router]);

    if (!order) return (
        <div className="page flex items-center justify-center">
            <div className="w-10 h-10 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
        </div>
    );

    const isWhish = paymentMethod.toLowerCase().includes('whish');
    const isCOD = paymentMethod.toLowerCase().includes('cash');

    return (
        <div className="page flex items-center justify-center px-4">
            <div className="max-w-lg w-full text-center">
                {/* Success icon */}
                <div className="flex justify-center mb-6">
                    <div className="relative">
                        <div className="absolute inset-0 bg-green-500/20 rounded-full blur-2xl animate-pulse" />
                        <CheckCircle size={80} className="text-green-400 relative" />
                    </div>
                </div>
                <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--text)' }}>Order Placed!</h1>
                <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                    Thank you, <strong style={{ color: 'var(--text)' }}>{order.customer_name}</strong>. Your order is confirmed.
                </p>

                {/* Payment Instructions */}
                {(isWhish || isCOD || paymentMethod) && (
                    <div style={{
                        background: isWhish ? 'rgba(0, 150, 255, 0.1)' : 'var(--orange-muted)',
                        border: `1px solid ${isWhish ? 'rgba(0, 150, 255, 0.3)' : 'rgba(249,115,22,0.25)'}`,
                        borderRadius: 'var(--radius-md)',
                        padding: '1rem',
                        marginBottom: '2rem',
                        textAlign: 'left',
                        fontSize: '0.9rem',
                        color: 'var(--text)'
                    }}>
                        <div style={{ fontWeight: 600, marginBottom: '0.5rem', color: isWhish ? '#0096FF' : 'var(--orange)' }}>
                            Payment Method: {paymentMethod}
                        </div>
                        {isWhish && (
                            <p>
                                Please transfer <strong>${(order.total_cents / 100).toFixed(2)}</strong> to Whish Money wallet:<br />
                                <span style={{ fontSize: '1.25rem', fontWeight: 700, letterSpacing: '1px', display: 'block', margin: '0.5rem 0' }}>
                                    81 351 816
                                </span>
                                include your Order ID <strong>#{order.id.slice(0, 8)}</strong> in the transfer note.
                            </p>
                        )}
                        {isCOD && (
                            <p>
                                Please have <strong>${(order.total_cents / 100).toFixed(2)}</strong> ready in cash when your order arrives.
                            </p>
                        )}
                        {!isWhish && !isCOD && paymentMethod && (
                            <p>We will contact you shortly with payment instructions.</p>
                        )}
                    </div>
                )}

                {/* Order details */}
                <div className="card" style={{ borderRadius: 'var(--radius-lg)', padding: '1.5rem', textAlign: 'left', marginBottom: '2rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--orange)', marginBottom: '1rem' }}>
                        <Package size={18} /> <span style={{ fontWeight: 600 }}>Order Details</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', fontSize: '0.875rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--text-muted)' }}>Order ID</span>
                            <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--text)' }}>{order.id.slice(0, 8)}...</span>
                        </div>
                        {order.customer_phone && (
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: 'var(--text-muted)' }}>Phone</span>
                                <span style={{ color: 'var(--text)' }}>{order.customer_phone}</span>
                            </div>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--text-muted)' }}>Status</span>
                            <span className="badge badge-yellow capitalize">{order.status}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--text-muted)' }}>Total</span>
                            <span style={{ fontWeight: 700, color: 'var(--text)' }}>${(order.total_cents / 100).toFixed(2)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--text-muted)' }}>Ship to</span>
                            <span style={{ color: 'var(--text)', textAlign: 'right', maxWidth: 200 }}>{order.shipping_address}</span>
                        </div>
                    </div>

                    {(order.items ?? []).length > 0 && (
                        <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {order.items!.map(item => (
                                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>{item.product_name_snapshot} ×{item.quantity}</span>
                                    <span style={{ color: 'var(--text)' }}>${(item.line_total_cents / 100).toFixed(2)}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', justifyContent: 'center' }}>
                    <Link href="/account" className="btn btn-outline" style={{ padding: '0.75rem 1.5rem' }}>View Orders</Link>
                    <Link href="/products" className="btn btn-primary" style={{ padding: '0.75rem 1.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>
                        Continue Shopping <ArrowRight size={16} />
                    </Link>
                </div>
            </div>
        </div>
    );
}
