import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import type { Image } from '@/lib/types';
import { ImageMetadataForm } from '@/components/shared/ImageMetadataForm';

interface Props {
  image: Image | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: () => void;
}

export function ImageMetadataDialog({ image, open, onOpenChange, onSave }: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSave = async (metadata: any) => {
    if (!image) return;

    try {
      setIsLoading(true);

      const { error } = await supabase
        .from('images')
        .update({
          title: metadata.title,
          description: metadata.description,
          tags: metadata.tags,
          metadata: {
            objects: metadata.objects,
            scenes: metadata.scenes,
            emotions: metadata.emotions,
            technical_details: metadata.technical,
          },
        })
        .eq('id', image.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Image metadata updated successfully',
      });

      onSave();
    } catch (error) {
      console.error('Error updating metadata:', error);
      toast({
        title: 'Error',
        description: 'Failed to update metadata. Please try again.',
        variant: 'destructive',
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ImageMetadataForm
      open={open}
      onOpenChange={onOpenChange}
      onSave={handleSave}
      title="Edit Image Details"
      initialMetadata={image || undefined}
      images={image ? [{ url: image.url }] : []}
      isProcessing={isLoading}
      processingText="Saving..."
      saveButtonText="Save Changes"
      showPreviewGrid={true}
    />
  );
}