'use client';
import { createContext, useContext, useState, useCallback, ReactNode, useRef } from 'react';

interface Toast { id: number; message: string; type: 'success' | 'error'; }
interface ToastCtx { showToast: (msg: string, type?: 'success' | 'error') => void; }

const ToastContext = createContext<ToastCtx>({ showToast: () => { } });

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);
    const counter = useRef(0);

    const showToast = useCallback((msg: string, type: 'success' | 'error' = 'success') => {
        const id = ++counter.current;
        setToasts(prev => [...prev, { id, message: msg, type }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
    }, []);

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            <div className="toast-container">
                {toasts.map(t => (
                    <div key={t.id} className={`toast-item toast-${t.type}`}>
                        <span className="toast-icon">{t.type === 'error' ? '✕' : '✓'}</span>
                        <span>{t.message}</span>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}

export const useToast = () => useContext(ToastContext);
