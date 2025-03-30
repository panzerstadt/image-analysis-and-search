import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { ImageFile, MetadataFormData } from '@/components/upload/types';

interface UseImageUploadProps {
  onSuccess?: () => void;
}

export function useImageUpload({ onSuccess }: UseImageUploadProps = {}) {
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const uploadImages = async (
    images: ImageFile[],
    metadata: MetadataFormData,
    onAnalyze: (url: string, index: number) => Promise<void>
  ) => {
    if (images.length === 0) return;

    try {
      setIsUploading(true);

      for (let i = 0; i < images.length; i++) {
        const image = images[i];
        if (!image?.file) continue;

        // Create form data for the image
        const formData = new FormData();
        formData.append('image', image.file);

        // Upload and preprocess the image
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/preprocess-image`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            },
            body: formData,
          }
        );

        if (!response.ok) {
          const error = await response.json().catch(() => ({ error: 'Failed to process image' }));
          console.error('Image processing error:', error);
          throw new Error(error.error || 'Failed to process image');
        }

        const data = await response.json();
        if (!data.url) {
          throw new Error('No URL returned from image processing');
        }

        await onAnalyze(data.url, i);
      }

      toast({
        title: 'Success',
        description: 'Images uploaded successfully. Please review the metadata.',
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to upload images. Please try again.',
        variant: 'destructive',
      });
      throw error;
    } finally {
      setIsUploading(false);
    }
  };

  const saveImages = async (images: ImageFile[], metadata: MetadataFormData) => {
    if (images.length === 0 || !metadata.title) return;

    // Check if all images are done analyzing
    if (images.some(img => img.isAnalyzing)) {
      return;
    }

    try {
      setIsUploading(true);

      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error('No user found');

      const promises = images.map(async (image, index) => {
        if (!image?.uploadedUrl) return;

        const imageTitle = images.length === 1 
          ? metadata.title 
          : `${metadata.title} (${index + 1})`;

        return supabase
          .from('images')
          .insert({
            url: image.uploadedUrl,
            title: imageTitle,
            description: metadata.description,
            tags: metadata.tags,
            user_id: user.id,
            metadata: {
              objects: metadata.objects,
              scenes: metadata.scenes,
              emotions: metadata.emotions,
              technical_details: metadata.technical,
            }
          });
      });

      await Promise.all(promises);

      toast({
        title: 'Success',
        description: `${images.length} image${images.length > 1 ? 's' : ''} saved successfully`,
      });

      window.dispatchEvent(new CustomEvent('image-uploaded'));
      onSuccess?.();
    } catch (error) {
      console.error('Save error:', error);
      toast({
        title: 'Error',
        description: 'Failed to save images. Please try again.',
        variant: 'destructive',
      });
      throw error;
    } finally {
      setIsUploading(false);
    }
  };

  return {
    isUploading,
    uploadImages,
    saveImages,
  };
}