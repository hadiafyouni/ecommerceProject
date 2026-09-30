'use client';
import Link from 'next/link';
import { ShoppingBag, Trash2, Heart, ArrowRight } from 'lucide-react';
import { useWishlist } from '@/context/WishlistContext';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';

export default function WishlistPage() {
    const { user } = useAuth();
    const { wishlist, loading, removeItem } = useWishlist();
    const { addItem } = useCart();

    if (!user) {
        return (
            <div className="flex flex-col items-center justify-center gap-4 text-center py-16 sm:py-24 px-4">
                <div style={{ color: 'var(--border)' }}><Heart size={56} /></div>
                <h1 className="text-xl sm:text-2xl font-bold">Sign in to view your wishlist</h1>
                <p className="text-muted text-sm sm:text-base">You need to be logged in to save items to your wishlist.</p>
                <div className="mt-4">
                    <Link href="/login" className="btn btn-primary">Sign In</Link>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="container py-12 text-center">
                <div className="loading-spinner mx-auto" />
            </div>
        );
    }

    const items = wishlist?.items || [];

    if (items.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center gap-4 text-center py-16 sm:py-24 px-4 bg-transparent border-0">
                <div style={{ color: 'var(--border)' }}><Heart size={56} /></div>
                <h1 className="text-xl sm:text-2xl font-bold">Your wishlist is empty</h1>
                <p className="text-muted text-sm sm:text-base">Start browsing to add items you love.</p>
                <div className="mt-4">
                    <Link href="/products" className="btn btn-primary">Browse Products</Link>
                </div>
            </div>
        );
    }

    return (
        <div className="container py-8">
            <div className="flex items-center gap-3 mb-8">
                <div className="p-3 rounded-2xl bg-orange-500/10 text-orange-500">
                    <Heart size={28} fill="currentColor" />
                </div>
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight">Your Wishlist</h1>
                    <p className="text-sm text-muted">You have {items.length} item{items.length === 1 ? '' : 's'} saved for later.</p>
                </div>
            </div>

            <div className="grid gap-4">
                {items.map((item) => (
                    <div key={item.id} className="card p-5 sm:p-6 flex flex-col md:flex-row items-center md:items-start gap-6 group transition-all">
                        {/* Image Part */}
                        <div className="w-full md:w-32 h-32 relative rounded-xl overflow-hidden bg-surface shrink-0">
                            {item.product?.images?.[0] ? (
                                <img
                                    src={item.product.images[0].path}
                                    alt={item.product.name}
                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center opacity-20 font-bold">No Image</div>
                            )}
                        </div>

                        {/* Details Part */}
                        <div className="flex-1 text-center md:text-left flex flex-col justify-center h-full">
                            <Link href={`/products/${item.product?.id}`} className="text-lg font-bold hover:text-orange-500 transition-colors">
                                {item.product?.name || 'Unknown Product'}
                            </Link>
                            <div className="text-orange-500 font-bold mt-2 text-xl">
                                ${((item.product?.price_cents || 0) / 100).toFixed(2)}
                            </div>
                        </div>

                        {/* Actions Part */}
                        <div className="flex items-center gap-4 w-full md:w-auto mt-2 md:mt-0 md:h-full md:items-center">
                            <button
                                onClick={() => addItem(item.product_id, 1, item.product?.name)}
                                className="btn btn-primary flex-1 md:flex-none flex items-center justify-center gap-2 py-3 px-6"
                            >
                                <ShoppingBag size={18} />
                                <span>Move to Cart</span>
                            </button>
                            <button
                                onClick={() => removeItem(item.id)}
                                className="p-4 rounded-2xl text-muted hover:text-red-500 hover:bg-red-500/10 transition-all flex items-center justify-center shrink-0"
                                title="Remove from Wishlist"
                            >
                                <Trash2 size={24} />
                            </button>
                        </div>
                    </div>
                ))}

                <div className="mt-8 flex justify-center">
                    <Link href="/products" className="group flex items-center gap-2 text-muted hover:text-orange-500 transition-colors">
                        <span>Continue Shopping</span>
                        <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                    </Link>
                </div>
            </div>
        </div>
    );
}
