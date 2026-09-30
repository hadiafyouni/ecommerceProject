import Link from 'next/link';
import { Product } from '@/lib/api';
import { ShoppingBag, Heart } from 'lucide-react';
import { useWishlist } from '@/context/WishlistContext';

interface Props {
    product: Product;
    onAddToCart?: () => void;
}

export default function ProductCard({ product, onAddToCart }: Props) {
    const { toggleItem, isInWishlist } = useWishlist();
    const isSaved = isInWishlist(product.id);

    const price = (product.price_cents / 100).toFixed(2);
    const mainImg = product.images?.find(i => i.sort_order === 0)?.path || product.images?.[0]?.path;
    const hoverImg = product.images?.find(i => i.sort_order === 1)?.path;

    return (
        <div className="card card-hover rounded-2xl overflow-hidden flex flex-col group">
            <div className="relative overflow-hidden" style={{ background: 'var(--surface)', aspectRatio: '4/3' }}>
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
                            <ShoppingBag size={40} />
                        </div>
                    )}
                </Link>
                <button
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        toggleItem(product.id, product.name);
                    }}
                    className={`absolute top-3 right-3 flex items-center justify-center p-2 rounded-full transition-all z-10 ${isSaved
                        ? 'bg-orange-500 text-white shadow-lg'
                        : 'bg-black/20 backdrop-blur-md text-white hover:bg-orange-500 hover:scale-110'
                        }`}
                >
                    <Heart size={20} fill={isSaved ? "currentColor" : "none"} />
                </button>
            </div>

            <div className="product-info pt-5">
                <Link href={`/products/${product.slug}`}>
                    <h3 className="product-name" style={{ textDecorationColor: 'var(--orange)' }}>
                        {product.name.replace(/\s([^\s]+)$/, '\u00A0$1')}
                    </h3>
                </Link>

                {/* Price + Add button - closer togetherness */}
                <div className="product-actions flex items-center justify-start gap-3 mt-auto pt-0">
                    <span className="product-price gradient-text font-bold">${price}</span>
                    {onAddToCart && (
                        <button onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onAddToCart();
                        }} className="btn btn-primary product-add-btn text-xs py-1.5 px-2.5 min-h-0 h-7 flex items-center justify-center gap-1">
                            <ShoppingBag size={12} />
                            <span>Add</span>
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
