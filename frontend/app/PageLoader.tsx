'use client';
import { useState, useEffect, ReactNode } from 'react';
import Loading from './loading';

/**
 * Shows a loading screen during the initial page hydration (refresh).
 * Once mounted (JS hydrated), hides the loader and reveals children.
 */
export default function PageLoader({ children }: { children: ReactNode }) {
    const [ready, setReady] = useState(false);

    useEffect(() => {
        // A tiny delay ensures the loader is visible on fast reloads too
        const t = setTimeout(() => setReady(true), 600);
        return () => clearTimeout(t);
    }, []);

    return (
        <>
            {!ready && <Loading />}
            <div style={{ visibility: ready ? 'visible' : 'hidden' }}>
                {children}
            </div>
        </>
    );
}
