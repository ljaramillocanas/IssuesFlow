import { supabase } from './supabase';

/**
 * Upload an image to Supabase Storage
 * @param file File object to upload
 * @param folder Folder path (e.g., 'cases/case-id' or 'tests/test-id')
 * @returns Public URL of uploaded image or null if error
 */
export async function uploadImage(file: File, folder: string): Promise<string | null> {
    try {
        // Validate file type
        if (!file.type.startsWith('image/')) {
            throw new Error('El archivo debe ser una imagen');
        }

        // Validate file size (max 50MB)
        const maxSize = 50 * 1024 * 1024; // 50MB in bytes
        if (file.size > maxSize) {
            throw new Error('La imagen no debe superar 50MB');
        }

        // Generate unique filename
        const timestamp = Date.now();
        const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const filename = `${timestamp}__${cleanName}`;
        const filepath = `${folder}/${filename}`;

        // Upload to Supabase Storage
        const { data, error } = await supabase.storage
            .from('attachments')
            .upload(filepath, file, {
                cacheControl: '3600',
                upsert: false,
            });

        if (error) throw error;

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
            .from('attachments')
            .getPublicUrl(filepath);

        return publicUrl;
    } catch (error: any) {
        console.error('Error uploading image:', error);
        alert(error.message);
        return null;
    }
}

/**
 * Delete an image from Supabase Storage
 * @param url Public URL of the image
 * @returns true if successful, false otherwise
 */
export async function deleteImage(url: string): Promise<boolean> {
    try {
        // Extract path from URL
        // URL format: https://PROJECT.supabase.co/storage/v1/object/public/attachments/PATH
        const urlParts = url.split('/attachments/');
        if (urlParts.length !== 2) {
            throw new Error('URL inválida');
        }
        const filepath = urlParts[1];

        const { error } = await supabase.storage
            .from('attachments')
            .remove([filepath]);

        if (error) throw error;

        return true;
    } catch (error: any) {
        console.error('Error deleting image:', error);
        alert(error.message);
        return false;
    }
}

/**
 * Get public URL for a file path
 * @param path File path in storage
 * @returns Public URL
 */
export function getPublicUrl(path: string): string {
    const { data: { publicUrl } } = supabase.storage
        .from('attachments')
        .getPublicUrl(path);

    return publicUrl;
}
