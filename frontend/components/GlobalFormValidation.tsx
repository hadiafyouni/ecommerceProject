'use client';
import { useEffect } from 'react';
import { useToast } from '@/context/ToastContext';

export default function GlobalFormValidation() {
    const { showToast } = useToast();

    useEffect(() => {
        const handleInvalid = (event: Event) => {
            const target = event.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
            if (target && target.validity && !target.validity.valid) {
                event.preventDefault(); // Stop the default browser popup

                let message = target.validationMessage;
                // Make the message a bit more friendly and point to the field using placeholder or name or id
                if (target.validity.valueMissing) {
                    const fieldName = target.getAttribute('placeholder') || target.name || target.id || 'this field';
                    message = `Please fill out the required field: ${fieldName}`;
                } else if (target.validity.patternMismatch) {
                    message = target.title || 'Please match the requested format.';
                }

                // Show our stylized global toast
                showToast(message, 'error');

                // If it's the first invalid, focus it
                const form = target.form;
                if (form) {
                    const firstInvalid = form.querySelector(':invalid') as HTMLElement;
                    if (firstInvalid === target) {
                        firstInvalid.focus();
                        // Add a subtle brief highlight animation
                        target.style.transition = 'box-shadow 0.2s';
                        target.style.boxShadow = '0 0 0 2px var(--orange)';
                        setTimeout(() => { target.style.boxShadow = ''; }, 1500);
                    }
                }
            }
        };

        // Capture phase is necessary because 'invalid' events don't bubble
        document.addEventListener('invalid', handleInvalid, true);

        return () => {
            document.removeEventListener('invalid', handleInvalid, true);
        };
    }, [showToast]);

    return null;
}
