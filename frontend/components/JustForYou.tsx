'use client';
import { useState, useEffect } from 'react';
import { api, Product } from '@/lib/api';
import { useWishlist } from '@/context/WishlistContext';
import SmallProductCard from './SmallProductCard';

const CACHE_KEY = 'just_for_you_cache_v3';
const SEARCH_KEY = 'recent_searches';
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

export default function JustForYou() {
    const { wishlist } = useWishlist();
    const [recommendations, setRecommendations] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [index, setIndex] = useState(0);

    useEffect(() => {
        const fetchRecommendations = async () => {
            try {
                const cached = localStorage.getItem(CACHE_KEY);
                const now = Date.now();

                if (cached) {
                    try {
                        const parsed = JSON.parse(cached);
                        if (parsed && Array.isArray(parsed.data) && parsed.data.length >= 2 && now - parsed.timestamp < CACHE_DURATION) {
                            // Secondary safety: only use items that were marked active when cached
                            const activeOnly = parsed.data.filter((p: Product | null) => p && p.is_active !== false);
                            if (activeOnly.length >= 2) {
                                setRecommendations(activeOnly);
                                setLoading(false);
                                return;
                            }
                        }
                    } catch {
                        localStorage.removeItem(CACHE_KEY);
                    }
                }

                const savedSearches = localStorage.getItem(SEARCH_KEY);
                let searches: string[] = [];
                try { searches = savedSearches ? JSON.parse(savedSearches) : []; } catch { localStorage.removeItem(SEARCH_KEY); }

                const savedPurchases = localStorage.getItem('recent_purchases_categories');
                let purchases: string[] = [];
                try { purchases = savedPurchases ? JSON.parse(savedPurchases) : []; } catch { localStorage.removeItem('recent_purchases_categories'); }

                let products: Product[] = [];

                // 1. Prioritize recent searches
                if (searches.length > 0) {
                    const res = await api.products.list({ q: searches[0], limit: 4, is_active: true });
                    products = res.data || [];
                }

                // 2. Supplement with recent purchases
                if (products.length < 4 && purchases.length > 0) {
                    const res = await api.products.list({ category_id: purchases[0], limit: 4, is_active: true });
                    const additional = (res.data || []).filter((p: Product) => !products.find((x: Product) => x.id === p.id));
                    products = [...products, ...additional];
                }

                // 3. Fallback to global top sellers
                if (products.length < 4) {
                    const res = await api.products.list({ sort: 'sales_desc', limit: 8, is_active: true });
                    const additional = (res.data || []).filter(p => !products.find(x => x.id === p.id));
                    products = [...products, ...additional].slice(0, 4);
                }

                if (products.length > 0) {
                    localStorage.setItem(CACHE_KEY, JSON.stringify({ data: products, timestamp: now }));
                }
                setRecommendations(products);
            } catch (err) {
                console.error('Failed to fetch recommendations', err);
            } finally {
                setLoading(false);
            }
        };

        fetchRecommendations();
    }, [wishlist]);

    useEffect(() => {
        if (recommendations.length <= 2) return;
        const timer = setInterval(() => {
            setIndex((prev) => (prev + 1) % Math.ceil(recommendations.length / 2));
        }, 6000);
        return () => clearInterval(timer);
    }, [recommendations]);

    if (loading) return (
        <div className="w-full flex items-center justify-center p-8 rounded-2xl bg-surface animate-pulse" style={{ height: '260px' }}>
            <span className="text-muted text-sm font-medium">Finding perfect matches...</span>
        </div>
    );

    if (!recommendations || recommendations.length === 0) return null;

    const slides = [];
    for (let i = 0; i < recommendations.length; i += 2) {
        slides.push(recommendations.slice(i, i + 2));
    }

    return (
        <div className="relative w-full rounded-2xl overflow-hidden shadow-inner border"
            style={{
                background: 'var(--carousel-bg)',
                borderColor: 'var(--carousel-border)',
                height: '280px'
            }}>

            {/* Background Decorative Blurs - Enhanced and Theme-aware */}
            <div className="absolute top-0 right-0 w-80 h-80 bg-orange-500 rounded-full blur-[100px] pointer-events-none"
                style={{ opacity: 'var(--carousel-glow-opacity)' }} />
            <div className="absolute bottom-0 left-0 w-80 h-80 bg-blue-500 rounded-full blur-[100px] pointer-events-none"
                style={{ opacity: 'var(--carousel-glow-opacity)' }} />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full pointer-events-none"
                style={{
                    backgroundImage: 'radial-gradient(var(--orange) 0.5px, transparent 0.5px)',
                    backgroundSize: '24px 24px',
                    opacity: 'var(--carousel-dot-opacity)'
                }} />

            <div
                className="flex h-full w-full transition-transform duration-700 ease-in-out"
                style={{ transform: `translateX(-${index * 100}%)` }}
            >
                {slides.map((slide, sIdx) => (
                    <div key={sIdx} className="flex-shrink-0 w-full h-full flex items-center justify-center gap-6 sm:gap-16 px-4">
                        {slide.map((p, pIdx) => (
                            <SmallProductCard
                                key={p.id}
                                product={p}
                                hideButton={true}
                                floatReverse={pIdx % 2 !== 0}
                                onAddToCart={() => { }}
                            />
                        ))}
                    </div>
                ))}
            </div>

            {/* Pagination Dots */}
            {slides.length > 1 && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
                    {slides.map((_, i) => (
                        <button
                            key={i}
                            onClick={() => setIndex(i)}
                            className={`h-1.5 rounded-full transition-all duration-300 ${index === i ? 'w-6 bg-orange-500' : 'w-2 bg-gray-400'}`}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
