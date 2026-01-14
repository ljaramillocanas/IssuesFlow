import { supabase } from './supabase';

/**
 * Upload an image file to Supabase Storage
 * @param file - The file to upload
 * @param folder - The folder path in storage (e.g., 'cases/123' or 'tests/456')
 * @returns The public URL of the uploaded image
 */
export async function uploadImageFile(file: File, folder: string): Promise<string> {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `${folder}/${fileName}`;

    const { data, error } = await supabase.storage
        .from('attachments')
        .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
        });

    if (error) {
        console.error('Error uploading file:', error);
        throw error;
    }

    const { data: { publicUrl } } = supabase.storage
        .from('attachments')
        .getPublicUrl(filePath);

    return publicUrl;
}

/**
 * Upload an image from clipboard (paste event)
 * @param blob - The image blob from clipboard
 * @param folder - The folder path in storage
 * @returns The public URL of the uploaded image
 */
export async function uploadImageFromClipboard(blob: Blob, folder: string): Promise<string> {
    const file = new File([blob], `pasted-${Date.now()}.png`, { type: blob.type });
    return uploadImageFile(file, folder);
}

import { showAlert } from './sweetalert';

/**
 * Handle paste event for image upload
 * @param event - ClipboardEvent from paste
 * @param folder - Storage folder path
 * @param onUpload - Callback with uploaded URL
 */
export async function handleImagePaste(
    event: ClipboardEvent,
    folder: string,
    onUpload: (url: string) => void
): Promise<void> {
    const items = event.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
            const blob = items[i].getAsFile();
            if (blob) {
                try {
                    const url = await uploadImageFromClipboard(blob, folder);
                    onUpload(url);
                } catch (error) {
                    console.error("Paste upload error", error);
                    showAlert('Error', 'Error al subir la imagen pegada', 'error');
                }
            }
        }
    }
}

/**
 * Handle drop event for image upload
 * @param event - DragEvent from drop
 * @param folder - Storage folder path
 * @param onUpload - Callback with uploaded URL
 */
export async function handleImageDrop(
    event: DragEvent,
    folder: string,
    onUpload: (url: string) => void
): Promise<void> {
    event.preventDefault();

    const files = event.dataTransfer?.files;
    if (!files) return;

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.type.startsWith('image/')) {
            try {
                const url = await uploadImageFile(file, folder);
                onUpload(url);
            } catch (error) {
                console.error("Drop upload error", error);
                showAlert('Error', 'Error al subir la imagen arrastrada', 'error');
            }
        }
    }
}
