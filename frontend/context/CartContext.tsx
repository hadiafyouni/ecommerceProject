'use client';
import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { api, Cart } from '@/lib/api';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';

interface CartContextType {
    cart: Cart | null;
    subtotal: number;
    itemCount: number;
    loading: boolean;
    addItem: (productId: string, quantity: number, productName?: string) => Promise<void>;
    updateItem: (itemId: string, quantity: number) => Promise<void>;
    removeItem: (itemId: string) => Promise<void>;
    refresh: () => Promise<void>;
}

const CartContext = createContext<CartContextType>({} as CartContextType);

export function CartProvider({ children }: { children: ReactNode }) {
    const { token } = useAuth();
    const { showToast } = useToast();
    const [cart, setCart] = useState<Cart | null>(null);
    const [subtotal, setSubtotal] = useState(0);
    const [loading, setLoading] = useState(false);

    const refresh = useCallback(async () => {
        if (!token) { setCart(null); return; }
        setLoading(true);
        try {
            const res = await api.cart.get();
            setCart(res.cart);
            setSubtotal(res.subtotal_cents);
        } catch { /* ignore */ }
        finally { setLoading(false); }
    }, [token]);

    useEffect(() => { refresh(); }, [refresh]);

    const addItem = async (productId: string, quantity: number, productName?: string) => {
        await api.cart.addItem(productId, quantity);
        await refresh();
        showToast(productName ? `"${productName}" added to cart` : 'Item added to cart');
    };
    const updateItem = async (itemId: string, quantity: number) => {
        await api.cart.updateItem(itemId, quantity);
        await refresh();
    };
    const removeItem = async (itemId: string) => {
        await api.cart.removeItem(itemId);
        await refresh();
    };

    const itemCount = cart?.items?.reduce((acc, i) => acc + i.quantity, 0) ?? 0;

    return (
        <CartContext.Provider value={{ cart, subtotal, itemCount, loading, addItem, updateItem, removeItem, refresh }}>
            {children}
        </CartContext.Provider>
    );
}

export const useCart = () => useContext(CartContext);
