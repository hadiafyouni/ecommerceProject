'use client';
import { useEffect, useState } from 'react';
import { api, Product } from '@/lib/api';
import ProductCard from '@/components/ProductCard';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, SlidersHorizontal } from 'lucide-react';

interface Props {
    initialCategorySlug?: string;
}

export default function ProductsView({ initialCategorySlug }: Props) {
    const [products, setProducts] = useState<Product[]>([]);
    const [total, setTotal] = useState(0);
    const [search, setSearch] = useState('');
    const [sort, setSort] = useState('');
    const [page, setPage] = useState(0);
    const [categoryTitle, setCategoryTitle] = useState<string | null>(null);
    // Key of the query whose results are currently shown; loading while it lags behind.
    const [loadedKey, setLoadedKey] = useState<string | null>(null);
    const limit = 12;
    const { addItem } = useCart();
    const { token } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();

    // A route-level category wins over query-string filters.
    const categorySlug = initialCategorySlug || searchParams.get('category_slug') || '';
    const categoryId = initialCategorySlug ? '' : searchParams.get('category_id') || '';
    const hasCategory = Boolean(categorySlug || categoryId);
    const pageTitle = hasCategory && categoryTitle ? categoryTitle : 'All Products';

    const queryKey = JSON.stringify([search, categoryId, categorySlug, page, sort]);
    const loading = loadedKey !== queryKey;

    useEffect(() => {
        if (!hasCategory) return;
        let cancelled = false;
        api.categories.list().then(cats => {
            const c = cats.find(c => c.slug === categorySlug || c.id === categoryId);
            if (!cancelled) setCategoryTitle(c ? c.name : null);
        }).catch(() => { });
        return () => { cancelled = true; };
    }, [hasCategory, categorySlug, categoryId]);

    useEffect(() => {
        let cancelled = false;
        api.products.list({
            q: search || undefined,
            category_id: categoryId || undefined,
            category_slug: categorySlug || undefined,
            limit,
            offset: page * limit,
            sort: sort || undefined,
            is_active: true
        })
            .then(r => {
                if (cancelled) return;
                setProducts(r.data || []);
                setTotal(r.total);

                if (search && search.trim().length > 1) {
                    const saved = localStorage.getItem('recent_searches');
                    let history: string[] = saved ? JSON.parse(saved) : [];
                    const q = search.trim().toLowerCase();
                    history = [q, ...history.filter(x => x !== q)].slice(0, 5);
                    localStorage.setItem('recent_searches', JSON.stringify(history));
                }
            })
            .catch(() => { })
            .finally(() => { if (!cancelled) setLoadedKey(queryKey); });
        return () => { cancelled = true; };
    }, [queryKey, search, categoryId, categorySlug, page, sort]);

    const handleAdd = async (productId: string, productName: string) => {
        if (!token) { router.push('/login'); return; }
        await addItem(productId, 1, productName);
    };

    return (
        <div className="flex flex-col gap-5 sm:gap-6">
            <h1 className="text-2xl sm:text-3xl font-extrabold">{pageTitle}</h1>

            <div className="flex flex-col sm:flex-row gap-3">
                <div className="input-wrap flex-1">
                    <span className="input-icon"><Search size={16} /></span>
                    <input className="input" placeholder="Search products..."
                        value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} />
                </div>
                <div className="flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
                    <SlidersHorizontal size={16} className="flex-shrink-0" />
                    <select className="input select flex-1 sm:w-auto"
                        value={sort} onChange={e => { setSort(e.target.value); setPage(0); }}>
                        <option value="">Sort: Newest First</option>
                        <option value="price_asc">Price: Low to High</option>
                        <option value="price_desc">Price: High to Low</option>
                    </select>
                </div>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} className="card rounded-2xl" style={{ aspectRatio: '3/4', opacity: 0.4 }} />
                    ))}
                </div>
            ) : products.length === 0 ? (
                <div className="card p-12 sm:p-16 text-center text-muted">No products found.</div>
            ) : (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {products.map(p => (
                            <ProductCard key={p.id} product={p}
                                onAddToCart={() => handleAdd(p.id, p.name)} />
                        ))}
                    </div>
                    {total > limit && (
                        <div className="flex justify-center items-center gap-2 sm:gap-3 mt-4 sm:mt-6">
                            <button disabled={page === 0} onClick={() => setPage(p => p - 1)}
                                className="btn btn-outline text-sm px-4 sm:px-5">
                                Previous
                            </button>
                            <span className="text-muted text-sm font-medium">
                                {page + 1} / {Math.ceil(total / limit)}
                            </span>
                            <button disabled={(page + 1) * limit >= total} onClick={() => setPage(p => p + 1)}
                                className="btn btn-outline text-sm px-4 sm:px-5">
                                Next
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
