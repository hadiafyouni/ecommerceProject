'use client';
import Link from 'next/link';
import { useCart } from '@/context/CartContext';
import { ShoppingBag, Trash2, Plus, Minus, ArrowRight } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

export default function CartPage() {
    const { cart, subtotal, loading, updateItem, removeItem } = useCart();
    const { token } = useAuth();
    const router = useRouter();
    const items = cart?.items || [];

    if (loading) return (
        <div className="flex items-center justify-center py-24">
            <div className="spinner" />
        </div>
    );

    if (!token) return (
        <div className="flex flex-col items-center justify-center gap-4 text-center py-16 sm:py-24 px-4">
            <div style={{ color: 'var(--border)' }}><ShoppingBag size={56} /></div>
            <h1 className="text-xl sm:text-2xl font-bold">Sign in to view your cart</h1>
            <p className="text-muted text-sm sm:text-base">You need to be logged in to add items to your cart.</p>
            <div className="mt-4">
                <Link href="/login" className="btn btn-primary">Sign In</Link>
            </div>
        </div>
    );

    if (items.length === 0) return (
        <div className="flex flex-col items-center justify-center gap-4 text-center py-16 sm:py-24 px-4">
            <div style={{ color: 'var(--border)' }}><ShoppingBag size={56} /></div>
            <h1 className="text-xl sm:text-2xl font-bold">Your cart is empty</h1>
            <p className="text-muted text-sm sm:text-base">Start shopping to add items.</p>
            <div className="mt-4">
                <Link href="/products" className="btn btn-primary">Browse Products</Link>
            </div>
        </div>
    );

    return (
        <div className="flex flex-col gap-5 sm:gap-6">
            <h1 className="text-2xl sm:text-3xl font-extrabold">Your Cart</h1>

            {/* Stack on mobile, side-by-side on lg */}
            <div className="flex flex-col lg:grid lg:grid-cols-3 gap-5 sm:gap-6">

                {/* ── Items list ── */}
                <div className="lg:col-span-2 flex flex-col gap-3 sm:gap-4">
                    {items.map(item => {
                        const p = item.product;
                        const total = item.price_cents_snapshot * item.quantity;
                        return (
                            <div key={item.id} className="card" style={{ padding: '1.125rem 1.25rem', display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                                {/* Thumbnail — smaller on xs */}
                                <div className="rounded-xl overflow-hidden flex-shrink-0"
                                    style={{
                                        width: 72, height: 72,
                                        background: 'var(--surface)',
                                    }}
                                >
                                    {/* sm+ wider thumb */}
                                    <style>{`@media(min-width:480px){.cart-thumb{width:88px!important;height:88px!important}}`}</style>
                                    <div className="cart-thumb w-full h-full">
                                        {p?.images?.[0] ? (
                                            <img src={p.images[0].path} alt={p.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center" style={{ color: 'var(--border)' }}>
                                                <ShoppingBag size={22} />
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Name + price + qty */}
                                <div className="flex-1 min-w-0 flex flex-col gap-1">
                                    <p className="font-semibold text-sm sm:text-base truncate" style={{ color: 'var(--text)' }}>
                                        {p?.name || 'Product'}
                                    </p>
                                    <p className="text-xs sm:text-sm" style={{ color: 'var(--orange)' }}>
                                        ${(item.price_cents_snapshot / 100).toFixed(2)} each
                                    </p>
                                    <div className="flex items-center gap-1.5 sm:gap-2 mt-0.5">
                                        <button onClick={() => updateItem(item.id, item.quantity - 1)}
                                            disabled={item.quantity <= 1} className="qty-btn">
                                            <Minus size={11} />
                                        </button>
                                        <span className="w-5 text-center text-sm font-bold" style={{ color: 'var(--text)' }}>
                                            {item.quantity}
                                        </span>
                                        <button onClick={() => updateItem(item.id, item.quantity + 1)} className="qty-btn">
                                            <Plus size={11} />
                                        </button>
                                    </div>
                                </div>

                                {/* Total + remove */}
                                <div className="flex flex-col items-end justify-between gap-2 flex-shrink-0">
                                    <button onClick={() => removeItem(item.id)} className="btn btn-ghost"
                                        style={{ color: 'var(--text-muted)', padding: '0.2rem' }}
                                        onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
                                        onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}>
                                        <Trash2 size={15} />
                                    </button>
                                    <p className="font-bold text-sm sm:text-base gradient-text">
                                        ${(total / 100).toFixed(2)}
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* ── Order Summary ── */}
                <div className="card h-fit lg:sticky lg:top-24" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <h2 className="font-bold text-base sm:text-lg">Order Summary</h2>
                    <div className="flex flex-col gap-2 sm:gap-3">
                        <div className="summary-row">
                            <span>Subtotal</span>
                            <span>${(subtotal / 100).toFixed(2)}</span>
                        </div>
                        <div className="summary-row">
                            <span>Shipping</span>
                            <span style={{ color: '#22c55e', fontWeight: 600 }}>Free</span>
                        </div>
                    </div>
                    <div className="summary-total">
                        <span>Total</span>
                        <span className="gradient-text">${(subtotal / 100).toFixed(2)}</span>
                    </div>
                    <button onClick={() => router.push('/checkout')} className="btn btn-primary w-full py-2.5 sm:py-3">
                        Checkout <ArrowRight size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
}
