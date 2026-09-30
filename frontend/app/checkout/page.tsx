'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { api, PaymentMethod } from '@/lib/api';
import { CreditCard, MapPin, User, AlertCircle, CheckCircle2 } from 'lucide-react';
import Image from 'next/image';
import WhishPaymentModal from '@/components/WhishPaymentModal';

interface DeliveryInfo {
    first_name: string;
    last_name: string;
    customer_phone: string;
    shipping_address: string;
}

export default function CheckoutPage() {
    const router = useRouter();
    const { cart, subtotal, refresh } = useCart();
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [form, setForm] = useState({ first_name: '', last_name: '', customer_phone: '', shipping_address: '' });
    const [savedDeliveryInfo, setSavedDeliveryInfo] = useState<DeliveryInfo | null>(null);
    const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
    const [selectedMethodId, setSelectedMethodId] = useState<string>('');
    const [showWhishModal, setShowWhishModal] = useState(false);

    // For the custom confirm dialog
    const [showSavePrompt, setShowSavePrompt] = useState(false);
    const [savePromptType, setSavePromptType] = useState<'new' | 'update'>('new');

    const items = cart?.items || [];
    const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));
    const orderPlacedRef = useRef(false);

    useEffect(() => {
        if (items.length === 0 && !orderPlacedRef.current) { router.push('/cart'); }
    }, [items.length, router]);

    const userKey = user?.user_id || user?.email || user?.id || '';

    // Load saved info & payment methods on mount
    useEffect(() => {
        if (userKey) {
            const saved = localStorage.getItem(`shopx_delivery_info_${userKey}`);
            if (saved) {
                try {
                    const parsed = JSON.parse(saved);
                    setSavedDeliveryInfo(parsed);
                    setForm(f => ({
                        first_name: f.first_name || parsed.first_name || '',
                        last_name: f.last_name || parsed.last_name || '',
                        customer_phone: f.customer_phone || parsed.customer_phone || '',
                        shipping_address: f.shipping_address || parsed.shipping_address || '',
                    }));
                } catch { /* ignore corrupt data */ }
            }
        }

        api.paymentMethods.list().then(data => {
            setPaymentMethods(data || []);
            if (data && data.length > 0) {
                const cod = data.find(m => m.name.toLowerCase().includes('cash'));
                setSelectedMethodId(cod ? cod.id : data[0].id);
            }
        }).catch(() => { });
    }, [userKey]);

    const selectedMethod = paymentMethods.find(m => m.id === selectedMethodId);
    const isWhishSelected = selectedMethod?.name.toLowerCase().includes('whish') ?? false;

    // Returns icon path for a payment method
    const getMethodIcon = (name: string) => {
        if (name.toLowerCase().includes('whish')) return '/whish-logo.png';
        if (name.toLowerCase().includes('cash')) return '/cod-icon.png';
        return null;
    };

    const placeOrder = async (transactionRef?: string) => {
        setLoading(true); setError('');
        try {
            const order = await api.orders.checkout({
                customer_name: `${form.first_name} ${form.last_name}`.trim(),
                shipping_address: form.shipping_address,
                customer_phone: form.customer_phone,
                payment_method_id: selectedMethodId,
            });

            if (selectedMethod) {
                localStorage.setItem(`order_${order.id}_payment`, selectedMethod.name);
            }
            if (transactionRef) {
                localStorage.setItem(`order_${order.id}_txn_ref`, transactionRef);
            }

            // Mark order as placed so the empty-cart redirect doesn't fire
            orderPlacedRef.current = true;

            // Track purchased categories for "Just for You" recommendations
            try {
                const purchasedCategories = items.map(item => item.product?.category_id).filter(Boolean);
                if (purchasedCategories.length > 0) {
                    const saved = localStorage.getItem('recent_purchases_categories');
                    let history: string[] = saved ? JSON.parse(saved) : [];
                    history = [...purchasedCategories as string[], ...history].filter((v, i, a) => a.indexOf(v) === i).slice(0, 3);
                    localStorage.setItem('recent_purchases_categories', JSON.stringify(history));
                }
            } catch (e) { console.error('Failed to track purchases', e); }

            // Navigate to confirmation FIRST
            router.push(`/order-confirmation/${order.id}`);

            // Then clear cart items in the background
            for (const item of items) {
                try { await api.cart.removeItem(item.id); } catch { }
            }
            refresh();
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Checkout failed');
        } finally { setLoading(false); }
    };

    const handleSaveConfirm = (shouldSave: boolean) => {
        setShowSavePrompt(false);
        if (shouldSave && userKey) {
            localStorage.setItem(`shopx_delivery_info_${userKey}`, JSON.stringify({
                first_name: form.first_name,
                last_name: form.last_name,
                customer_phone: form.customer_phone,
                shipping_address: form.shipping_address,
            }));
            setSavedDeliveryInfo(form);
        }

        // Proceed to payment now
        if (isWhishSelected) {
            setShowWhishModal(true);
        } else {
            placeOrder();
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.first_name || !form.last_name || !form.shipping_address || !form.customer_phone) { setError('All contact/shipping fields are required.'); return; }
        if (!selectedMethodId) { setError('Please select a payment method.'); return; }

        // Check if delivery info differs from what's saved
        const hasSaved = !!savedDeliveryInfo;
        const differs = hasSaved && (
            savedDeliveryInfo.first_name !== form.first_name ||
            savedDeliveryInfo.last_name !== form.last_name ||
            savedDeliveryInfo.customer_phone !== form.customer_phone ||
            savedDeliveryInfo.shipping_address !== form.shipping_address
        );

        if (!hasSaved) {
            setSavePromptType('new');
            setShowSavePrompt(true);
            return;
        } else if (differs) {
            setSavePromptType('update');
            setShowSavePrompt(true);
            return;
        }

        // If no changes or already saved, proceed normally
        if (isWhishSelected) {
            setShowWhishModal(true);
            return;
        }
        await placeOrder();
    };

    if (items.length === 0) { return null; }

    return (
        <>
            <div className="flex flex-col gap-5 sm:gap-6">
                <h1 className="text-2xl sm:text-3xl font-extrabold">Checkout</h1>

                <div className="flex flex-col lg:grid lg:grid-cols-3 gap-5 sm:gap-6">

                    {/* ── Form ── */}
                    <form onSubmit={handleSubmit} className="lg:col-span-2 flex flex-col gap-4 sm:gap-5">

                        <div className="form-section">
                            <div className="form-section-header">
                                <User size={17} /><span>Contact Info</span>
                            </div>
                            <div className="flex flex-col gap-4 sm:gap-5">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="input-group">
                                        <label htmlFor="co-fname">First Name *</label>
                                        <input id="co-fname" className="input" placeholder="John"
                                            value={form.first_name} onChange={e => set('first_name', e.target.value)} required />
                                    </div>
                                    <div className="input-group">
                                        <label htmlFor="co-lname">Last Name *</label>
                                        <input id="co-lname" className="input" placeholder="Doe"
                                            value={form.last_name} onChange={e => set('last_name', e.target.value)} required />
                                    </div>
                                </div>
                                <div className="input-group">
                                    <label htmlFor="co-phone">Phone *</label>
                                    <input id="co-phone" type="tel" className="input" placeholder="e.g. 71123456"
                                        pattern="\d*" inputMode="numeric"
                                        title="Only numbers are allowed for phone numbers."
                                        value={form.customer_phone}
                                        onChange={e => set('customer_phone', e.target.value.replace(/\D/g, ''))} required />
                                </div>
                            </div>
                        </div>

                        <div className="form-section">
                            <div className="form-section-header">
                                <MapPin size={17} /><span>Shipping Address</span>
                            </div>
                            <div className="input-group">
                                <label htmlFor="co-addr">Address *</label>
                                <textarea id="co-addr" className="input resize-none" rows={3}
                                    placeholder="123 Main St, City, Country"
                                    value={form.shipping_address} onChange={e => set('shipping_address', e.target.value)} required />
                            </div>
                        </div>

                        <div className="form-section">
                            <div className="form-section-header">
                                <CreditCard size={17} /><span>Payment</span>
                            </div>
                            <div className="flex flex-col gap-3">
                                {paymentMethods.length > 0 ? (
                                    paymentMethods.map(method => {
                                        const isSelected = selectedMethodId === method.id;
                                        const icon = getMethodIcon(method.name);
                                        return (
                                            <button
                                                key={method.id}
                                                type="button"
                                                onClick={() => setSelectedMethodId(method.id)}
                                                style={{
                                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                    padding: '0.875rem 1rem',
                                                    border: `2px solid ${isSelected ? 'var(--orange)' : 'var(--border)'}`,
                                                    borderRadius: 'var(--radius-md)',
                                                    background: isSelected ? 'var(--orange-muted)' : 'var(--bg-card)',
                                                    color: isSelected ? 'var(--orange)' : 'var(--text)',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s',
                                                }}
                                            >
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                    {icon && (
                                                        <Image src={icon} alt={method.name} width={36} height={36}
                                                            style={{ borderRadius: '6px', objectFit: 'contain' }} />
                                                    )}
                                                    <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{method.name}</span>
                                                </div>
                                                {isSelected && <CheckCircle2 size={20} color="var(--orange)" />}
                                            </button>
                                        );
                                    })
                                ) : (
                                    <div className="p-4 rounded-xl border" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                                        Loading payment methods...
                                    </div>
                                )}
                            </div>
                        </div>

                        {error && (
                            <div className="error-alert">
                                <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
                                <span>{error}</span>
                            </div>
                        )}

                        <button type="submit" disabled={loading} className="btn btn-primary w-full py-3 sm:py-3.5 text-sm sm:text-base">
                            {loading ? 'Placing Order…' :
                                isWhishSelected ? `Pay with Whish · $${(subtotal / 100).toFixed(2)}` :
                                    `Place Order · $${(subtotal / 100).toFixed(2)}`}
                        </button>
                    </form>

                    {/* ── Order Summary ── */}
                    <div className="card h-fit lg:sticky lg:top-24" style={{ padding: '1.5rem' }}>
                        <h2 className="font-bold text-base sm:text-lg mb-4 sm:mb-5">Order Summary</h2>
                        <div className="flex flex-col gap-2 sm:gap-3 mb-2">
                            {items.map(item => (
                                <div key={item.id} className="summary-row">
                                    <span className="truncate flex-1 mr-2 text-sm">
                                        {item.product?.name || 'Product'} ×{item.quantity}
                                    </span>
                                    <span style={{ color: 'var(--text)', fontSize: '0.875rem' }}>
                                        ${((item.price_cents_snapshot * item.quantity) / 100).toFixed(2)}
                                    </span>
                                </div>
                            ))}
                        </div>
                        <div className="summary-total">
                            <span>Total</span>
                            <span className="gradient-text">${(subtotal / 100).toFixed(2)}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Whish Money Payment Modal */}
            {showWhishModal && (
                <WhishPaymentModal
                    totalAmount={(subtotal / 100).toFixed(2)}
                    onConfirm={async (txnRef) => {
                        setShowWhishModal(false);
                        await placeOrder(txnRef);
                    }}
                    onClose={() => setShowWhishModal(false)}
                />
            )}

            {/* Save Delivery Info Prompt Modal */}
            {showSavePrompt && (
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 9999,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(6px)', padding: '1rem',
                }}>
                    <div style={{
                        background: 'var(--bg-card)', border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: '400px',
                        padding: '1.5rem', boxShadow: '0 25px 50px rgba(0,0,0,0.3)',
                    }}>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text)', marginBottom: '0.5rem' }}>
                            {savePromptType === 'new' ? 'Save Delivery Info?' : 'Update Delivery Info?'}
                        </h3>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: 1.5 }}>
                            {savePromptType === 'new'
                                ? 'Would you like to save this delivery info to your account for faster checkout next time?'
                                : "You've changed your delivery details. Would you like to update your saved default info?"}
                        </p>
                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                            <button onClick={() => handleSaveConfirm(false)} className="btn btn-outline" style={{ flex: 1 }}>
                                No, just this once
                            </button>
                            <button onClick={() => handleSaveConfirm(true)} className="btn btn-primary" style={{ flex: 1 }}>
                                Yes, save it
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
