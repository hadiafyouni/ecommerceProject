'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api, Product, Review } from '@/lib/api';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { ShoppingBag, Star, ArrowLeft, Plus, Minus } from 'lucide-react';

export default function ProductDetailPage() {
    const { slug } = useParams<{ slug: string }>();
    const [product, setProduct] = useState<Product | null>(null);
    const [reviews, setReviews] = useState<Review[]>([]);
    const [qty, setQty] = useState(1);
    const [adding, setAdding] = useState(false);
    const [activeImg, setActiveImg] = useState(0);
    const { addItem } = useCart();
    const { token } = useAuth();
    const router = useRouter();

    useEffect(() => {
        api.products.get(slug).then(setProduct).catch(() => { });
        api.products.reviews(slug).then(r => setReviews(r.reviews || [])).catch(() => { });
    }, [slug]);

    const handleAdd = async () => {
        if (!token) { router.push('/login'); return; }
        if (!product) return;
        setAdding(true);
        try { await addItem(product.id, qty, product.name); }
        finally { setAdding(false); }
    };

    if (!product) return (
        <div className="flex items-center justify-center py-24">
            <div className="spinner" />
        </div>
    );

    const images = product.images || [];
    const price = (product.price_cents / 100).toFixed(2);

    return (
        <div className="flex flex-col gap-8">
            <button
                onClick={() => router.back()}
                className="btn btn-ghost self-start gap-2"
                style={{ color: 'var(--text-muted)' }}
            >
                <ArrowLeft size={16} /> Back
            </button>

            <div className="grid md:grid-cols-2 gap-10">
                {/* Images */}
                <div>
                    <div
                        className="card rounded-2xl overflow-hidden mb-3"
                        style={{ aspectRatio: '1/1', border: '1px solid var(--border)' }}
                    >
                        {images.length > 0 ? (
                            <img src={images[activeImg].path} alt={product.name} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center" style={{ color: 'var(--border)' }}>
                                <ShoppingBag size={64} />
                            </div>
                        )}
                    </div>
                    {images.length > 1 && (
                        <div className="flex gap-2 overflow-x-auto pb-1">
                            {images.map((img, i) => (
                                <button
                                    key={img.id}
                                    onClick={() => setActiveImg(i)}
                                    className="rounded-xl overflow-hidden flex-shrink-0"
                                    style={{
                                        width: 64, height: 64,
                                        border: `2px solid ${i === activeImg ? 'var(--orange)' : 'var(--border)'}`,
                                        transition: 'border-color 0.15s',
                                    }}
                                >
                                    <img src={img.path} alt="" className="w-full h-full object-cover" />
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Info */}
                <div className="flex flex-col gap-5">
                    <div>
                        <span className="badge badge-orange mb-3">{product.category?.name || 'Product'}</span>
                        <h1 className="text-3xl font-extrabold mt-2" style={{ color: 'var(--text)' }}>{product.name}</h1>
                        <p className="text-4xl font-extrabold gradient-text mt-3">${price}</p>
                    </div>

                    {product.description && (
                        <p className="text-muted leading-relaxed">{product.description}</p>
                    )}

                    {/* Quantity selector */}
                    <div className="flex items-center gap-4">
                        <span className="text-muted text-sm font-medium">Quantity</span>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setQty(q => Math.max(1, q - 1))}
                                className="qty-btn"
                                disabled={qty <= 1}
                            >
                                <Minus size={13} />
                            </button>
                            <span className="w-8 text-center font-bold" style={{ color: 'var(--text)' }}>{qty}</span>
                            <button
                                onClick={() => setQty(q => q + 1)}
                                className="qty-btn"
                            >
                                <Plus size={13} />
                            </button>
                        </div>
                    </div>

                    <button
                        onClick={handleAdd}
                        disabled={adding}
                        className="btn btn-primary py-4 text-base"
                    >
                        <ShoppingBag size={18} />
                        {adding ? 'Adding…' : 'Add to Cart'}
                    </button>

                    {/* Variants */}
                    {(product.variants?.length ?? 0) > 0 && (
                        <div>
                            <p className="text-muted text-sm mb-2 font-medium">Variants</p>
                            <div className="flex flex-wrap gap-2">
                                {product.variants!.map(v => (
                                    <span key={v.id} className="btn btn-outline text-sm px-4 py-1.5">
                                        {v.name || v.sku}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Reviews */}
            <div className="section">
                <h2 className="section-title">Customer Reviews</h2>
                {reviews.length === 0 ? (
                    <p className="text-muted">No reviews yet. Be the first!</p>
                ) : (
                    <div className="grid md:grid-cols-2 gap-4">
                        {reviews.map(rv => (
                            <div key={rv.id} className="card p-5">
                                <div className="flex items-center gap-1 mb-2">
                                    {Array.from({ length: 5 }).map((_, i) => (
                                        <Star
                                            key={i}
                                            size={14}
                                            style={{
                                                color: i < rv.rating ? '#facc15' : 'var(--border)',
                                                fill: i < rv.rating ? '#facc15' : 'none',
                                            }}
                                        />
                                    ))}
                                </div>
                                {rv.title && <p className="font-semibold mb-1" style={{ color: 'var(--text)' }}>{rv.title}</p>}
                                {rv.body && <p className="text-muted text-sm">{rv.body}</p>}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
