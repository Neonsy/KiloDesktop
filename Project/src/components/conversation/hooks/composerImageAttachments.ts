import type { ComposerImageAttachmentInput } from '@/app/backend/runtime/contracts';

const MAX_IMAGE_EDGE_PX = 2048;
const MAX_COMPRESSED_IMAGE_BYTES = 1_500_000;
const JPEG_QUALITY_STEPS = [0.82, 0.74, 0.66, 0.58, 0.5, 0.42] as const;
const DOWNSCALE_RATIO = 0.85;
const MIN_IMAGE_EDGE_PX = 512;

export const MAX_COMPOSER_IMAGE_COUNT = 4;
export const MAX_COMPOSER_TOTAL_IMAGE_BYTES = 6_000_000;

export type ComposerPendingImageStatus = 'compressing' | 'ready' | 'failed';

export interface ComposerPendingImage {
    clientId: string;
    fileName: string;
    sourceFile: File;
    previewUrl: string;
    status: ComposerPendingImageStatus;
    errorMessage?: string;
    attachment?: ComposerImageAttachmentInput;
    byteSize?: number;
}

export interface PreparedComposerImageAttachment {
    attachment: ComposerImageAttachmentInput;
    byteSize: number;
    previewUrl: string;
}

function releaseCanvas(canvas: HTMLCanvasElement): void {
    canvas.width = 0;
    canvas.height = 0;
}

function revokePreviewUrl(previewUrl: string): void {
    if (previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
    }
}

async function loadImageElement(file: File): Promise<HTMLImageElement> {
    const objectUrl = URL.createObjectURL(file);

    try {
        const image = await new Promise<HTMLImageElement>((resolve, reject) => {
            const element = new Image();
            element.onload = () => {
                resolve(element);
            };
            element.onerror = () => {
                reject(new Error(`Failed to decode image "${file.name}".`));
            };
            element.src = objectUrl;
        });

        return image;
    } finally {
        URL.revokeObjectURL(objectUrl);
    }
}

function fitDimensions(width: number, height: number, maxEdge: number): { width: number; height: number } {
    if (width <= maxEdge && height <= maxEdge) {
        return { width, height };
    }

    const scale = maxEdge / Math.max(width, height);
    return {
        width: Math.max(1, Math.round(width * scale)),
        height: Math.max(1, Math.round(height * scale)),
    };
}

function downscaleDimensions(width: number, height: number): { width: number; height: number } {
    return {
        width: Math.max(MIN_IMAGE_EDGE_PX, Math.round(width * DOWNSCALE_RATIO)),
        height: Math.max(MIN_IMAGE_EDGE_PX, Math.round(height * DOWNSCALE_RATIO)),
    };
}

function renderToCanvas(
    image: CanvasImageSource,
    width: number,
    height: number
): { canvas: HTMLCanvasElement; context: CanvasRenderingContext2D } {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) {
        throw new Error('Image compression could not acquire a 2D canvas context.');
    }

    context.drawImage(image, 0, 0, width, height);
    return { canvas, context };
}

function hasTransparentPixels(
    context: CanvasRenderingContext2D,
    width: number,
    height: number
): boolean {
    const { data } = context.getImageData(0, 0, width, height);
    for (let index = 3; index < data.length; index += 4) {
        if (data[index] !== 255) {
            return true;
        }
    }

    return false;
}

async function canvasToBlob(
    canvas: HTMLCanvasElement,
    mimeType: 'image/jpeg' | 'image/png',
    quality?: number
): Promise<Blob> {
    const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, mimeType, quality);
    });

    if (!blob) {
        throw new Error('Image compression could not encode the canvas output.');
    }

    return blob;
}

function bufferToBase64(bytes: ArrayBuffer): string {
    const chunkSize = 0x8000;
    const view = new Uint8Array(bytes);
    let output = '';

    for (let offset = 0; offset < view.length; offset += chunkSize) {
        const slice = view.subarray(offset, offset + chunkSize);
        output += String.fromCharCode(...slice);
    }

    return btoa(output);
}

async function sha256Hex(bytes: ArrayBuffer): Promise<string> {
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(digest), (value) => value.toString(16).padStart(2, '0')).join('');
}

async function finalizePreparedAttachment(
    blob: Blob,
    width: number,
    height: number,
    clientId: string
): Promise<PreparedComposerImageAttachment> {
    const buffer = await blob.arrayBuffer();
    const bytesBase64 = bufferToBase64(buffer);
    const sha256 = await sha256Hex(buffer);
    const mimeType = blob.type as ComposerImageAttachmentInput['mimeType'];

    return {
        attachment: {
            clientId,
            mimeType,
            bytesBase64,
            width,
            height,
            sha256,
        },
        byteSize: blob.size,
        previewUrl: `data:${mimeType};base64,${bytesBase64}`,
    };
}

export async function prepareComposerImageAttachment(
    file: File,
    clientId: string
): Promise<PreparedComposerImageAttachment> {
    if (!file.type.startsWith('image/')) {
        throw new Error(`"${file.name}" is not an image file.`);
    }

    const image = await loadImageElement(file);
    let dimensions = fitDimensions(image.naturalWidth, image.naturalHeight, MAX_IMAGE_EDGE_PX);
    const initialRender = renderToCanvas(image, dimensions.width, dimensions.height);
    const preservePng = hasTransparentPixels(initialRender.context, dimensions.width, dimensions.height);
    releaseCanvas(initialRender.canvas);

    while (true) {
        const { canvas } = renderToCanvas(image, dimensions.width, dimensions.height);

        try {
            if (preservePng) {
                const pngBlob = await canvasToBlob(canvas, 'image/png');
                if (pngBlob.size <= MAX_COMPRESSED_IMAGE_BYTES) {
                    return finalizePreparedAttachment(pngBlob, dimensions.width, dimensions.height, clientId);
                }
            } else {
                for (const quality of JPEG_QUALITY_STEPS) {
                    const jpegBlob = await canvasToBlob(canvas, 'image/jpeg', quality);
                    if (jpegBlob.size <= MAX_COMPRESSED_IMAGE_BYTES) {
                        return finalizePreparedAttachment(jpegBlob, dimensions.width, dimensions.height, clientId);
                    }
                }
            }
        } finally {
            releaseCanvas(canvas);
        }

        const nextDimensions = downscaleDimensions(dimensions.width, dimensions.height);
        if (nextDimensions.width === dimensions.width && nextDimensions.height === dimensions.height) {
            break;
        }
        if (dimensions.width <= MIN_IMAGE_EDGE_PX && dimensions.height <= MIN_IMAGE_EDGE_PX) {
            break;
        }

        dimensions = nextDimensions;
    }

    throw new Error(
        `"${file.name}" could not be compressed below 1.5 MB.`
    );
}

export function createPendingImage(file: File): ComposerPendingImage {
    return {
        clientId: crypto.randomUUID(),
        fileName: file.name,
        sourceFile: file,
        previewUrl: URL.createObjectURL(file),
        status: 'compressing',
    };
}

export function releasePendingImageResources(image: ComposerPendingImage): void {
    revokePreviewUrl(image.previewUrl);
}

export function summarizeReadyImageBytes(images: ComposerPendingImage[], excludingClientId?: string): number {
    return images.reduce((total, image) => {
        if (image.clientId === excludingClientId || image.status !== 'ready') {
            return total;
        }

        return total + (image.byteSize ?? 0);
    }, 0);
}
