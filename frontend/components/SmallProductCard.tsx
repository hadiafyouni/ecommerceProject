import Link from 'next/link';
import { Product } from '@/lib/api';
import { ShoppingBag, Heart } from 'lucide-react';
import { useWishlist } from '@/context/WishlistContext';

interface Props {
    product: Product;
    onAddToCart: (productId: string, productName: string) => void;
    hideButton?: boolean;
    floatReverse?: boolean;
}

export default function SmallProductCard({ product, onAddToCart, hideButton = false, floatReverse = false }: Props) {
    const { toggleItem, isInWishlist } = useWishlist();
    const isSaved = isInWishlist(product.id);

    const price = (product.price_cents / 100).toFixed(2);
    const mainImg = product.images?.find(i => i.sort_order === 0)?.path || product.images?.[0]?.path;
    const hoverImg = product.images?.find(i => i.sort_order === 1)?.path;

    return (
        <div className={`flex flex-col items-center text-center p-2 sm:p-2.5 group relative w-[150px] sm:w-[170px] mx-auto flex-shrink-0 transition-all duration-500
            ${hideButton ? `hover:-translate-y-2 hover:drop-shadow-2xl ${floatReverse ? 'animate-float-reverse' : 'animate-float'}` : ''}`}>

            <div className="relative shrink-0 w-[100px] h-[100px] sm:w-[130px] sm:h-[130px] rounded-xl overflow-hidden" style={{ background: 'var(--surface)' }}>
                <Link href={`/products/${product.slug}`}>
                    {mainImg ? (
                        <>
                            <img src={mainImg} alt={product.name}
                                className={`w-full h-full object-cover transition-all duration-500 ${hoverImg ? 'group-hover:opacity-0 group-hover:scale-105' : 'group-hover:scale-105'}`} />
                            {hoverImg && (
                                <img src={hoverImg} alt={`${product.name} hover`}
                                    className="absolute inset-0 w-full h-full object-cover opacity-0 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500" />
                            )}
                        </>
                    ) : (
                        <div className="w-full h-full flex items-center justify-center" style={{ color: 'var(--border)' }}>
                            <ShoppingBag size={28} className="sm:w-[40px] sm:h-[40px]" />
                        </div>
                    )}
                </Link>
                <button
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        toggleItem(product.id, product.name);
                    }}
                    className={`absolute top-2 right-2 flex items-center justify-center p-1.5 rounded-full transition-all z-10 ${isSaved
                        ? 'bg-orange-500 text-white shadow-md'
                        : 'bg-black/20 backdrop-blur-md text-white hover:bg-orange-500 hover:scale-110'
                        }`}
                >
                    <Heart size={18} fill={isSaved ? "currentColor" : "none"} />
                </button>
            </div>

            <div className="flex flex-col flex-1 w-full pt-6 items-center gap-0.5">
                <Link href={`/products/${product.slug}`} className="w-full flex items-start justify-center text-center h-[32px] sm:h-[40px] overflow-hidden mb-0.5">
                    <h3 className="font-semibold text-xs sm:text-[0.9rem] line-clamp-2 leading-tight" style={{ color: 'var(--text)' }}>
                        {product.name.replace(/\s([^\s]+)$/, '\u00A0$1')}
                    </h3>
                </Link>

                <div className="flex flex-col items-center gap-1.5 w-full max-w-[100px] sm:max-w-[130px]">
                    <span className="font-bold text-sm sm:text-[1.05rem] gradient-text leading-none">${price}</span>

                    {!hideButton && onAddToCart && (
                        <div className="flex items-center gap-1 w-full justify-center">
                            <button
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    onAddToCart(product.id, product.name);
                                }}
                                className="btn btn-primary product-add-btn flex items-center justify-center px-1.5 sm:px-2.5 text-[10px] sm:text-xs min-h-0 h-7 sm:h-8 gap-1"
                                style={{ borderRadius: 'var(--radius-md)' }}
                            >
                                <ShoppingBag size={12} />
                                <span>Add</span>
                            </button>
                        </div>
                    )}
                    {hideButton && (
                        <div className="h-2" />
                    )}
                </div>
            </div>
        </div>
    );
}
