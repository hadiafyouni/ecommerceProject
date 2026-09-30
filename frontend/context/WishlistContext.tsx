'use client';
import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { api, Wishlist } from '@/lib/api';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';

interface WishlistContextType {
    wishlist: Wishlist | null;
    wishlistCount: number;
    loading: boolean;
    toggleItem: (productId: string, productName?: string) => Promise<void>;
    removeItem: (itemId: string) => Promise<void>;
    isInWishlist: (productId: string) => boolean;
    refresh: () => Promise<void>;
}

const WishlistContext = createContext<WishlistContextType>({} as WishlistContextType);

export function WishlistProvider({ children }: { children: ReactNode }) {
    const { token } = useAuth();
    const { showToast } = useToast();
    const [wishlist, setWishlist] = useState<Wishlist | null>(null);
    const [loading, setLoading] = useState(false);

    const refresh = useCallback(async () => {
        if (!token) { setWishlist(null); return; }
        setLoading(true);
        try {
            const data = await api.wishlist.get();
            setWishlist(data);
        } catch { /* ignore */ }
        finally { setLoading(false); }
    }, [token]);

    useEffect(() => { refresh(); }, [refresh]);

    const toggleItem = async (productId: string, productName?: string) => {
        if (!token) {
            showToast('Please sign in to save items');
            return;
        }

        const existingItem = wishlist?.items?.find(i => i.product_id === productId);

        try {
            if (existingItem) {
                await api.wishlist.removeItem(existingItem.id);
                showToast(productName ? `"${productName}" removed from wishlist` : 'Item removed from wishlist');
            } else {
                await api.wishlist.addItem(productId);
                showToast(productName ? `"${productName}" added to wishlist` : 'Item added to wishlist');
            }
            await refresh();
        } catch {
            showToast('Failed to update wishlist');
        }
    };

    const removeItem = async (itemId: string) => {
        try {
            await api.wishlist.removeItem(itemId);
            await refresh();
        } catch {
            showToast('Failed to remove item');
        }
    };

    const isInWishlist = (productId: string) => {
        return !!wishlist?.items?.some(i => i.product_id === productId);
    };

    const wishlistCount = wishlist?.items?.length ?? 0;

    return (
        <WishlistContext.Provider value={{
            wishlist,
            wishlistCount,
            loading,
            toggleItem,
            removeItem,
            isInWishlist,
            refresh
        }}>
            {children}
        </WishlistContext.Provider>
    );
}

export const useWishlist = () => useContext(WishlistContext);
