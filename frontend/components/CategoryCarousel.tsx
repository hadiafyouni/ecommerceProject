'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { Category } from '@/lib/api';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/* ── Category-specific images and gradients ── */
const CATEGORY_CONFIG: Record<string, { img: string; gradient: string }> = {
    'consoles': {
        img: 'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=800&q=80',
        gradient: 'linear-gradient(135deg, rgba(99,102,241,0.5) 0%, rgba(67,56,202,0.6) 100%)',
    },
    'laptops': {
        img: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&q=80',
        gradient: 'linear-gradient(135deg, rgba(14,165,233,0.5) 0%, rgba(2,132,199,0.6) 100%)',
    },
    'pc-accessories': {
        img: 'https://images.unsplash.com/photo-1541140532154-b024d705b90a?w=800&q=80',
        gradient: 'linear-gradient(135deg, rgba(249,115,22,0.5) 0%, rgba(234,88,12,0.6) 100%)',
    },
    'phones-tablets': {
        img: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=800&q=80',
        gradient: 'linear-gradient(135deg, rgba(16,185,129,0.5) 0%, rgba(5,150,105,0.6) 100%)',
    },
    'desks': {
        img: 'https://images.unsplash.com/photo-1593062096033-9a26b09da705?w=800&q=80',
        gradient: 'linear-gradient(135deg, rgba(244,63,94,0.5) 0%, rgba(225,29,72,0.6) 100%)',
    },
};

const FALLBACK = {
    img: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&q=80',
    gradient: 'linear-gradient(135deg, rgba(107,114,128,0.5) 0%, rgba(75,85,99,0.6) 100%)',
};

interface Props {
    categories: Category[];
}

export default function CategoryCarousel({ categories }: Props) {
    const total = categories.length;
    /* 
     * Robust Infinite Scroll: [last, ...items, first]
     * This allows smooth sliding in both directions.
     */
    const extendedCats = total > 1 ? [categories[total - 1], ...categories, categories[0]] : categories;
    const [index, setIndex] = useState(total > 1 ? 1 : 0);
    const [transition, setTransition] = useState(true);
    const [isLocked, setIsLocked] = useState(false);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const resetTimer = useCallback(() => {
        if (timerRef.current) clearInterval(timerRef.current);
        if (total <= 1) return;
        timerRef.current = setInterval(() => {
            if (!isLocked) {
                setIndex(prev => prev + 1);
                setTransition(true);
            }
        }, 3000);
    }, [total, isLocked]);

    /* Auto-slide */
    useEffect(() => {
        resetTimer();
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [resetTimer]);

    /* Reset if categories change (adjusting state during render, per React docs) */
    const [lastTotal, setLastTotal] = useState(total);
    if (total !== lastTotal) {
        setLastTotal(total);
        setIndex(total > 1 ? 1 : 0);
        setTransition(false);
    }

    /* Snapping logic */
    useEffect(() => {
        if (total <= 1) return;

        // Snap back from last-clone to first-item
        if (index === total + 1) {
            const timeout = setTimeout(() => {
                setTransition(false);
                setIndex(1);
                setIsLocked(false);
            }, 500);
            return () => clearTimeout(timeout);
        }

        // Snap forward from first-clone to last-item
        if (index === 0) {
            const timeout = setTimeout(() => {
                setTransition(false);
                setIndex(total);
                setIsLocked(false);
            }, 500);
            return () => clearTimeout(timeout);
        }
    }, [index, total]);

    /* Re-enable transition after snap */
    useEffect(() => {
        if (!transition) {
            const raf = requestAnimationFrame(() => {
                requestAnimationFrame(() => setTransition(true));
            });
            return () => cancelAnimationFrame(raf);
        }
    }, [transition]);

    const goNext = useCallback(() => {
        if (isLocked || total <= 1) return;
        if (index === total + 1) return; // Prevent double trigger
        setIndex(prev => prev + 1);
        setTransition(true);
        resetTimer();
    }, [isLocked, total, index, resetTimer]);

    const goPrev = useCallback(() => {
        if (isLocked || total <= 1) return;
        if (index === 0) return; // Prevent double trigger
        setIndex(prev => prev - 1);
        setTransition(true);
        resetTimer();
    }, [isLocked, total, index, resetTimer]);

    const goTo = useCallback((i: number) => {
        if (isLocked) return;
        setIndex(i + 1);
        setTransition(true);
        resetTimer();
    }, [isLocked, resetTimer]);

    if (total === 0) return null;

    /* Current "real" index for dot highlight: index is 1..total */
    const realIndex = total > 1 ? (index === 0 ? total - 1 : index === total + 1 ? 0 : index - 1) : 0;

    return (
        <section className="category-carousel">
            <div className="category-carousel-header">
                <h2 className="section-title" style={{ margin: 0 }}>Shop by Category</h2>
                <div className="category-carousel-arrows">
                    <button onClick={goPrev} className="carousel-arrow" aria-label="Previous category">
                        <ChevronLeft size={18} />
                    </button>
                    <button onClick={goNext} className="carousel-arrow" aria-label="Next category">
                        <ChevronRight size={18} />
                    </button>
                </div>
            </div>

            <div className="category-carousel-track-wrapper">
                <div
                    className="category-carousel-track"
                    style={{
                        transform: `translateX(-${index * 100}%)`,
                        transition: transition ? 'transform 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)' : 'none',
                    }}
                >
                    {extendedCats.map((cat, i) => {
                        const conf = CATEGORY_CONFIG[cat.slug] || FALLBACK;
                        return (
                            <Link
                                key={`${cat.id}-${i}`}
                                href={`/${cat.slug}`}
                                className="category-carousel-slide"
                                style={{
                                    backgroundImage: cat.image_url
                                        ? `${conf.gradient}, url("${cat.image_url}")`
                                        : `${conf.gradient}, url("${conf.img}")`,
                                    backgroundSize: 'cover',
                                    backgroundPosition: 'center',
                                }}
                            >
                                <span className="category-carousel-name">{cat.name}</span>
                                <span className="category-carousel-cta">Shop Now →</span>
                            </Link>
                        );
                    })}
                </div>
            </div>

            {/* Dots */}
            {total > 1 && (
                <div className="category-carousel-dots">
                    {categories.map((_, i) => (
                        <button
                            key={i}
                            className={`carousel-dot ${i === realIndex ? 'carousel-dot--active' : ''}`}
                            onClick={() => goTo(i)}
                            aria-label={`Go to category ${i + 1}`}
                        />
                    ))}
                </div>
            )}
        </section>
    );
}
