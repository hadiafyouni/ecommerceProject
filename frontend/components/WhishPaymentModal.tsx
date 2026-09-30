'use client';
import { useState } from 'react';
import { X, Copy, CheckCircle2 } from 'lucide-react';
import Image from 'next/image';

interface WhishPaymentModalProps {
    totalAmount: string;
    orderId?: string;
    onConfirm: (transactionRef: string) => void;
    onClose: () => void;
}

export default function WhishPaymentModal({ totalAmount, onConfirm, onClose }: WhishPaymentModalProps) {
    const [transactionRef, setTransactionRef] = useState('');
    const [copied, setCopied] = useState(false);
    const [error, setError] = useState('');

    const whishNumber = '81 351 816';

    const handleCopy = () => {
        navigator.clipboard.writeText('81351816');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleConfirm = () => {
        if (!transactionRef.trim()) {
            setError('Please enter the transaction reference or ID from your Whish transfer.');
            return;
        }
        onConfirm(transactionRef.trim());
    };

    return (
        <div
            style={{
                position: 'fixed', inset: 0, zIndex: 9999,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(0, 0, 0, 0.6)',
                backdropFilter: 'blur(6px)',
                padding: '1rem',
            }}
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <div
                style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-lg)',
                    width: '100%',
                    maxWidth: '460px',
                    maxHeight: '90vh',
                    overflowY: 'auto',
                    boxShadow: '0 25px 50px rgba(0,0,0,0.3)',
                }}
            >
                {/* Header */}
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '1.25rem 1.5rem',
                    borderBottom: '1px solid var(--border)',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <Image src="/whish-logo.png" alt="Whish Money" width={32} height={32}
                            style={{ borderRadius: '6px', objectFit: 'contain' }} />
                        <span style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--text)' }}>
                            Pay with Whish Money
                        </span>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            color: 'var(--text-muted)', padding: '4px',
                        }}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

                    {/* Step 1: Amount */}
                    <div style={{
                        background: 'rgba(0, 150, 255, 0.08)',
                        border: '1px solid rgba(0, 150, 255, 0.2)',
                        borderRadius: 'var(--radius-md)',
                        padding: '1rem',
                        textAlign: 'center',
                    }}>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                            Amount to Send
                        </div>
                        <div style={{ fontSize: '2rem', fontWeight: 800, color: '#0096FF' }}>
                            ${totalAmount}
                        </div>
                    </div>

                    {/* Step 2: Whish Number */}
                    <div>
                        <div style={{
                            fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)',
                            marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.5px',
                        }}>
                            Step 1 — Send to this Whish Number
                        </div>
                        <div style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            background: 'var(--bg)', border: '1px solid var(--border)',
                            borderRadius: 'var(--radius-md)', padding: '0.875rem 1rem',
                        }}>
                            <span style={{
                                fontSize: '1.5rem', fontWeight: 700, letterSpacing: '2px',
                                color: 'var(--text)', fontFamily: 'monospace',
                            }}>
                                {whishNumber}
                            </span>
                            <button
                                onClick={handleCopy}
                                style={{
                                    background: copied ? 'rgba(34, 197, 94, 0.15)' : 'var(--orange-muted)',
                                    border: `1px solid ${copied ? 'rgba(34, 197, 94, 0.3)' : 'rgba(249,115,22,0.25)'}`,
                                    borderRadius: 'var(--radius-sm)',
                                    padding: '0.4rem 0.75rem',
                                    cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', gap: '0.375rem',
                                    color: copied ? '#22c55e' : 'var(--orange)',
                                    fontSize: '0.8rem', fontWeight: 600,
                                    transition: 'all 0.2s',
                                }}
                            >
                                {copied ? <><CheckCircle2 size={14} /> Copied!</> : <><Copy size={14} /> Copy</>}
                            </button>
                        </div>
                    </div>

                    {/* Step 3: Enter transaction reference */}
                    <div>
                        <div style={{
                            fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)',
                            marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.5px',
                        }}>
                            Step 2 — Enter Transaction Reference
                        </div>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                            After sending the payment, enter the transaction ID or reference number from your Whish app.
                        </p>
                        <input
                            className="input"
                            type="text"
                            placeholder="e.g. TXN-123456789"
                            value={transactionRef}
                            onChange={(e) => { setTransactionRef(e.target.value); setError(''); }}
                            style={{ width: '100%' }}
                        />
                        {error && (
                            <p style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '0.375rem' }}>
                                {error}
                            </p>
                        )}
                    </div>

                    {/* Info note */}
                    <div style={{
                        background: 'var(--orange-muted)',
                        border: '1px solid rgba(249,115,22,0.2)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '0.75rem',
                        fontSize: '0.8rem',
                        color: 'var(--text-muted)',
                        lineHeight: 1.5,
                    }}>
                        ⚠️ Your order will be placed after you confirm the transaction. We will verify your payment and process your order.
                    </div>
                </div>

                {/* Footer */}
                <div style={{
                    padding: '1rem 1.5rem 1.5rem',
                    display: 'flex', gap: '0.75rem',
                }}>
                    <button
                        onClick={onClose}
                        className="btn btn-outline"
                        style={{ flex: 1, padding: '0.75rem' }}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleConfirm}
                        className="btn btn-primary"
                        style={{ flex: 2, padding: '0.75rem' }}
                    >
                        Confirm Payment & Place Order
                    </button>
                </div>
            </div>
        </div>
    );
}
