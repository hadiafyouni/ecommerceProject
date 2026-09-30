'use client';
import { usePathname } from 'next/navigation';
import { Inter } from 'next/font/google';
import './globals.css';
import './loading-screen.css';
import { AuthProvider } from '@/context/AuthContext';
import { CartProvider } from '@/context/CartContext';
import { WishlistProvider } from '@/context/WishlistContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { ToastProvider } from '@/context/ToastContext';
import Navbar from '@/components/Navbar';
import SplashBackground from '@/components/SplashBackground';
import PageLoader from './PageLoader';
import GlobalFormValidation from '@/components/GlobalFormValidation';

const inter = Inter({ subsets: ['latin'] });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith('/admin');

  return (
    <html lang="en">
      <head>
        <title>ShopX — Premium Ecommerce</title>
        <meta name="description" content="Discover premium products at ShopX." />
      </head>
      <body className={inter.className}>
        <ThemeProvider>
          <ToastProvider>
            <GlobalFormValidation />
            <AuthProvider>
              <WishlistProvider>
                <CartProvider>
                  {isAdmin ? (
                    children
                  ) : (
                    <PageLoader>
                      <div className="layout-wrapper">
                        <SplashBackground />
                        <Navbar />
                        <div className="main-content">
                          <main className="page">{children}</main>
                        </div>
                      </div>
                    </PageLoader>
                  )}
                </CartProvider>
              </WishlistProvider>
            </AuthProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
