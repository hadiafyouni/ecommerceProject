'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { api, Banner } from '@/lib/api';
import { ChevronLeft, ChevronRight, Tag, Sparkles } from 'lucide-react';


export default function DiscountCarousel() {
    const [banners, setBanners] = useState<Banner[]>([]);

    useEffect(() => {
        api.banners.list()
            .then(setBanners)
            .catch(() => { });
    }, []);

    // Prepare slides: Priority to custom banners, then fallback to categories
    const bannerSlides = (banners || []).map(b => ({
        title: b.title || 'Special Offer',
        tagline: b.description || 'Check out our latest deals and promotions.',
        badge: b.tag || 'EXCLUSIVE',
        ctaText: 'Learn More',
        ctaHref: b.link_url || '/products',
        image: b.image_url,
        gradient: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)', // Default dark gradient for banners
        accentColor: '#f97316',
        emoji: <Sparkles size={16} />,
        isCustom: true
    }));

    const slideData = [...bannerSlides];

    const total = slideData.length;
    /* 
     * Robust Infinite Scroll: [last, ...items, first]
     * This allows smooth sliding in both directions.
     */
    const extendedSlides = total > 1 ? [slideData[total - 1], ...slideData, slideData[0]] : slideData;
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
        }, 6000); // 6s for dynamic banners
    }, [total, isLocked]);

    useEffect(() => {
        resetTimer();
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [resetTimer]);

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
        <div className="relative w-full overflow-hidden rounded-2xl" style={{ height: '300px' }}>
            <div
                className="flex h-full w-full"
                style={{
                    transform: `translateX(-${index * 100}%)`,
                    transition: transition ? 'transform 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)' : 'none',
                }}
            >
                {extendedSlides.map((slide, i) => (
                    <div
                        key={`${i}`}
                        className="relative flex-shrink-0 w-full h-full flex flex-col items-center text-center justify-center p-6 sm:p-10 overflow-hidden border-b border-white/5"
                        style={{ background: `radial-gradient(circle at center, ${slide.accentColor}22 0%, #000 100%), ${slide.gradient}` }}
                    >
                        {/* Background Image for Custom Banners */}
                        {slide.isCustom && slide.image && (
                            <img
                                src={slide.image}
                                alt=""
                                className="absolute inset-0 w-full h-full object-cover opacity-30 z-0"
                            />
                        )}

                        {/* Dot Pattern Overlay */}
                        <div className="absolute inset-0 opacity-[0.05] pointer-events-none z-0"
                            style={{ backgroundImage: 'radial-gradient(white 0.5px, transparent 0.5px)', backgroundSize: '32px 32px' }} />

                        {/* Content */}
                        <div className="flex flex-col items-center gap-4 max-w-lg z-10 relative">
                            <div className="flex items-center gap-2">
                                <Tag size={12} style={{ color: slide.accentColor }} />
                                <span
                                    className="text-[11px] font-extrabold tracking-widest rounded-full uppercase"
                                    style={{
                                        background: slide.accentColor + '33',
                                        color: slide.accentColor,
                                        border: `1px solid ${slide.accentColor}66`,
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        padding: '0.5rem 0.5rem'
                                    }}
                                >
                                    {slide.badge}
                                </span>
                            </div>
                            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white leading-tight drop-shadow-2xl">
                                {slide.title}
                            </h2>
                            <div className="h-10 sm:h-12 flex items-center justify-center overflow-hidden">
                                <p className="text-xs sm:text-sm text-white/90 max-w-sm font-medium line-clamp-2">
                                    {slide.tagline}
                                </p>
                            </div>
                            <Link
                                href={slide.ctaHref}
                                className="mt-8 rounded-full font-bold text-sm transition-all hover:scale-110 hover:shadow-[0_0_30px_rgba(249,115,22,0.4)]"
                                style={{
                                    background: slide.accentColor,
                                    color: '#000',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: '0.5rem 0.5rem',
                                    whiteSpace: 'nowrap',
                                    width: 'fit-content'
                                }}
                            >
                                {slide.ctaText} →
                            </Link>
                        </div>

                        {/* Visual side */}
                        {!slide.image && (
                            <div
                                className="absolute right-6 bottom-4 md:right-12 md:top-1/2 md:-translate-y-1/2 text-[10rem] opacity-10 select-none pointer-events-none"
                                style={{ filter: 'drop-shadow(0 0 30px white)' }}
                            >
                                {slide.emoji}
                            </div>
                        )}

                        {/* Ambient glow blobs - Enhanced */}
                        <div className="absolute top-0 right-0 w-96 h-96 rounded-full blur-[120px] opacity-20 pointer-events-none" style={{ background: slide.accentColor }} />
                        <div className="absolute bottom-0 left-0 w-96 h-96 rounded-full blur-[120px] opacity-10 pointer-events-none" style={{ background: slide.accentColor }} />
                    </div>
                ))}
            </div>

            {/* Controls */}
            {total > 1 && (
                <>
                    <button
                        onClick={goPrev}
                        className="absolute left-3 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-white/10 hover:bg-white/25 text-white transition-all backdrop-blur-md"
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <button
                        onClick={goNext}
                        className="absolute right-3 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-white/10 hover:bg-white/25 text-white transition-all backdrop-blur-md"
                    >
                        <ChevronRight size={20} />
                    </button>


                    <div className="absolute bottom-6 right-8 z-20 flex gap-2">
                        {slideData.map((_, i) => (
                            <button
                                key={i}
                                onClick={() => goTo(i)}
                                className="transition-all rounded-full h-1.5"
                                style={{
                                    width: i === realIndex ? '24px' : '6px',
                                    background: i === realIndex ? 'white' : 'rgba(255,255,255,0.3)',
                                    boxShadow: i === realIndex ? '0 0 10px rgba(255,255,255,0.5)' : 'none',
                                }}
                            />
                        ))}
                    </div>

                </>
            )}
        </div>
    );
}
