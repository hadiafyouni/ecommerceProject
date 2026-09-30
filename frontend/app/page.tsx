'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, Product, Category } from '@/lib/api';
import SmallProductCard from '@/components/SmallProductCard';
import CategoryCarousel from '@/components/CategoryCarousel';
import DiscountCarousel from '@/components/DiscountCarousel';
import JustForYou from '@/components/JustForYou';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { ArrowRight, Zap, Shield, Truck } from 'lucide-react';


export default function HomePage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [popularCategoryProducts, setPopularCategoryProducts] = useState<{ category: Category, products: Product[] }[]>([]);
  const { addItem } = useCart();
  const { token } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Fetch global categories for carousel and discount banner
    api.categories.list().then(setCategories).catch(() => { });

    // Fetch top selling categories and their top 3 products
    api.categories.list({ sort: 'sales_desc' })
      .then(async (cats) => {
        setCategories(cats); // For the carousel dropdown

        // Re-order based on recent purchases
        let sortedCats = [...cats];
        try {
          const saved = localStorage.getItem('recent_purchases_categories');
          if (saved) {
            const recentCatIds: string[] = JSON.parse(saved);
            const prioritized = sortedCats.filter(c => recentCatIds.includes(c.id));
            const others = sortedCats.filter(c => !recentCatIds.includes(c.id));
            sortedCats = [...prioritized, ...others];
          }
        } catch { /* ignore corrupt data */ }

        const top2 = sortedCats.slice(0, 2);

        // Fetch top 3 products for EACH of those 2 categories
        const results = await Promise.all(top2.map(async (cat) => {
          const res = await api.products.list({ category_id: cat.id, limit: 3, sort: 'sales_desc', is_active: true });
          return { category: cat, products: res.data || [] };
        }));
        setPopularCategoryProducts(results);
      })
      .catch(() => { });
  }, []);

  const handleAdd = async (productId: string, productName: string) => {
    if (!token) { router.push('/login'); return; }
    await addItem(productId, 1, productName);
  };

  return (
    <div className="flex flex-col gap-8 sm:gap-10 lg:gap-12">

      {/* ── Feature strips ── */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { icon: <Truck size={22} />, title: 'Fast Delivery', desc: 'Shipped within 24 hours' },
          { icon: <Shield size={22} />, title: 'Secure Payments', desc: '100% protected transactions' },
          { icon: <Zap size={22} />, title: 'Best Prices', desc: 'Competitive pricing guaranteed' },
        ].map((f, i) => (
          <div key={i} className="card" style={{ padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{
              padding: '0.75rem',
              borderRadius: '0.75rem',
              flexShrink: 0,
              background: 'var(--orange-muted)',
              color: 'var(--orange)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              {f.icon}
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontWeight: 600, fontSize: '0.9375rem', color: 'var(--text)' }}>{f.title}</p>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>{f.desc}</p>
            </div>
          </div>
        ))}
      </section>

      {/* ── Category Carousel ── */}
      {categories.length > 0 && (
        <CategoryCarousel categories={categories} />
      )}


      {/* ═══════════════ MAIN CONTENT GRID ═══════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-stretch">

        {/* ── LEFT HALF: Popular Products ── */}
        <section className="section flex flex-col h-full border-r-0 lg:border-r border-border pr-0 lg:pr-4">
          <div className="section-header mb-6">
            <h2 className="section-title">Popular Products</h2>
          </div>

          {popularCategoryProducts.length === 0 ? (
            <div className="card p-10 text-center text-muted">No popular products available.</div>
          ) : (
            <div className="flex flex-col gap-10">
              {popularCategoryProducts.map(catData => (
                <div key={catData.category.id} className="flex flex-col gap-4">
                  <h3 className="text-xl font-bold border-l-4 border-orange-500 pl-12" style={{ color: 'var(--text)' }}>
                    {catData.category.name}
                  </h3>
                  {catData.products.length === 0 ? (
                    <p className="text-sm text-muted">No products in this category.</p>
                  ) : (
                    <div className="grid grid-cols-2 xl:grid-cols-3 gap-6">
                      {catData.products.slice(0, 3).map((p, idx) => (
                        <div
                          key={p.id}
                          className={`
                            flex justify-center w-full
                            ${idx === 2 ? 'hidden sm:flex sm:col-span-2 xl:col-span-1' : 'col-span-1'}
                          `}
                        >
                          <SmallProductCard product={p} onAddToCart={() => handleAdd(p.id, p.name)} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* View All — Bottom of the first half */}
          <div className="mt-auto pt-10 flex justify-center lg:justify-start">
            <Link
              href="/products"
              className="group btn btn-ghost flex items-center gap-3 text-base font-bold px-8 py-3 rounded-2xl border-2 transition-all hover:bg-orange-500 hover:text-white"
              style={{ color: 'var(--orange)', borderColor: 'var(--orange)' }}
            >
              Explore All Products
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </section>

        {/* ── RIGHT HALF ── */}
        <aside className="flex flex-col gap-10 lg:sticky lg:top-8 h-full">

          {/* Top: Discount Carousel */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="section-title" style={{ margin: 0 }}>Exclusive Deals 🔥</h2>
              <span className="text-xs font-bold px-5 py-2 rounded-full uppercase tracking-wider" style={{ background: 'var(--orange-muted)', color: 'var(--orange)' }}>
                Limited Time
              </span>
            </div>
            <DiscountCarousel />
          </div>

          {/* Bottom: Just for You */}
          <div className="flex flex-col gap-4 flex-1">
            <h2 className="section-title" style={{ margin: 0 }}>Just for You</h2>
            <JustForYou />
          </div>

        </aside>
      </div>


    </div>
  );
}
