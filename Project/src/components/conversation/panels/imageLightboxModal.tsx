import { X } from 'lucide-react';
import { useEffect } from 'react';

import { Button } from '@/web/components/ui/button';

interface ImageLightboxModalProps {
    open: boolean;
    imageUrl?: string;
    title?: string;
    detail?: string;
    onClose: () => void;
}

export function ImageLightboxModal({ open, imageUrl, title, detail, onClose }: ImageLightboxModalProps) {
    useEffect(() => {
        if (!open) {
            return;
        }

        function handleKeyDown(event: KeyboardEvent) {
            if (event.key === 'Escape') {
                onClose();
            }
        }

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [onClose, open]);

    if (!open || !imageUrl) {
        return null;
    }

    return (
        <div className='fixed inset-0 z-50 flex items-center justify-center px-4 py-6'>
            <button
                type='button'
                aria-label='Close image preview'
                className='fixed inset-0 bg-black/78 backdrop-blur-md'
                onClick={onClose}
            />
            <div className='border-border bg-card relative z-10 flex max-h-full w-full max-w-6xl flex-col overflow-hidden rounded-[28px] border shadow-2xl'>
                <div className='border-border flex items-start justify-between gap-3 border-b px-4 py-3'>
                    <div className='min-w-0'>
                        <p className='truncate text-sm font-semibold'>{title ?? 'Image preview'}</p>
                        {detail ? <p className='text-muted-foreground truncate text-xs'>{detail}</p> : null}
                    </div>
                    <Button type='button' size='sm' variant='outline' className='shrink-0' onClick={onClose}>
                        <X className='h-4 w-4' />
                        Close
                    </Button>
                </div>
                <div className='bg-background/70 flex min-h-0 flex-1 items-center justify-center p-4 sm:p-6'>
                    <img
                        src={imageUrl}
                        alt={title ?? 'Expanded chat image'}
                        className='max-h-[calc(100vh-12rem)] max-w-full rounded-2xl object-contain shadow-[0_24px_80px_rgba(0,0,0,0.35)]'
                    />
                </div>
            </div>
        </div>
    );
}
