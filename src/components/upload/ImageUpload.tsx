import { useRef, useState } from 'react';
import { Upload, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ImagePreview } from './ImagePreview';
import { MetadataForm } from './MetadataForm';
import { ImageFile } from './types';
import { useImageUpload } from '@/hooks/use-image-upload';
import { useImageAnalysis } from '@/hooks/use-image-analysis';
import { useMetadataState } from '@/hooks/use-metadata-state';

interface Props {
  onUploadComplete: () => void;
}

export function ImageUpload({ onUploadComplete }: Props) {
  const [showMetadataDialog, setShowMetadataDialog] = useState(false);
  const [showUnsavedChangesDialog, setShowUnsavedChangesDialog] = useState(false);
  const [selectedImages, setSelectedImages] = useState<ImageFile[]>([]);
  const formRef = useRef<HTMLFormElement>(null);

  const { isUploading, uploadImages, saveImages } = useImageUpload({
    onSuccess: () => {
      handleDiscardChanges();
      onUploadComplete();
    },
  });

  const { analyzeImage } = useImageAnalysis();
  const {
    metadata,
    tagInput,
    setTagInput,
    updateMetadata,
    handleTagInputKeyDown,
    removeTag,
    addTag,
    updateFromAnalysis,
    resetMetadata,
    hasUnsavedChanges,
    setInitialMetadata,
  } = useMetadataState();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    const newImages = files.map(file => ({
      file,
      previewUrl: URL.createObjectURL(file),
    }));

    setSelectedImages(prev => [...prev, ...newImages]);
    
    if (!metadata.title && files.length === 1) {
      const newMetadata = {
        ...metadata,
        title: files[0].name.split('.')[0],
      };
      updateMetadata(newMetadata);
      setInitialMetadata(JSON.stringify(newMetadata));
    }
    
    setShowMetadataDialog(true);
  };

  const removeImage = (index: number) => {
    const imageToRemove = selectedImages[index];
    const remainingImages = selectedImages.filter((_, i) => i !== index);
    
    if (imageToRemove?.previewUrl) {
      URL.revokeObjectURL(imageToRemove.previewUrl);
    }

    setSelectedImages(remainingImages);

    if (remainingImages.length === 0) {
      setShowMetadataDialog(false);
      resetMetadata();
    }
  };

  const handleClose = () => {
    if (hasUnsavedChanges()) {
      setShowUnsavedChangesDialog(true);
    } else {
      handleDiscardChanges();
    }
  };

  const handleDiscardChanges = () => {
    setShowUnsavedChangesDialog(false);
    setShowMetadataDialog(false);
    selectedImages.forEach(image => {
      if (image?.previewUrl) {
        URL.revokeObjectURL(image.previewUrl);
      }
    });
    setSelectedImages([]);
    resetMetadata();
  };

  const handleAnalyze = async (imageUrl: string, index: number) => {
    setSelectedImages(prev => {
      const newImages = [...prev];
      if (newImages[index]) {
        newImages[index] = {
          ...newImages[index],
          isAnalyzing: true,
        };
      }
      return newImages;
    });

    try {
      const analysis = await analyzeImage(imageUrl, metadata, updateFromAnalysis);

      setSelectedImages(prev => {
        const newImages = [...prev];
        if (newImages[index]) {
          newImages[index] = {
            ...newImages[index],
            analysis,
            isAnalyzing: false,
            uploadedUrl: imageUrl,
          };
        }
        return newImages;
      });
    } catch (error) {
      setSelectedImages(prev => {
        const newImages = [...prev];
        if (newImages[index]) {
          newImages[index] = {
            ...newImages[index],
            isAnalyzing: false,
          };
        }
        return newImages;
      });
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedImages.length === 0) return;

    try {
      await uploadImages(selectedImages, metadata, handleAnalyze);
    } catch (error) {
      // Error is already handled in the hook
    }
  };

  const handleSave = async () => {
    if (selectedImages.length === 0 || !metadata.title) return;

    try {
      await saveImages(selectedImages, metadata);
    } catch (error) {
      // Error is already handled in the hook
    }
  };

  return (
    <>
      <div className="p-4 border rounded-lg bg-card">
        <div className="space-y-4">
          <div>
            <Label htmlFor="image">Upload Images</Label>
            <Input
              id="image"
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileSelect}
              disabled={isUploading}
              className="mt-2"
            />
          </div>
        </div>
      </div>

      <Dialog open={showMetadataDialog} onOpenChange={handleClose}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Add Image Details</DialogTitle>
          </DialogHeader>
          
          <form ref={formRef} onSubmit={handleUpload} className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-4">
                {selectedImages.length > 0 && (
                  <ScrollArea className="h-[400px] rounded-md border">
                    <div className="p-4 grid grid-cols-2 gap-4">
                      {selectedImages.map((image, index) => (
                        <ImagePreview
                          key={index}
                          image={image}
                          index={index}
                          onRemove={removeImage}
                          onAddTag={addTag}
                        />
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </div>

              <MetadataForm
                metadata={metadata}
                tagInput={tagInput}
                onMetadataChange={updateMetadata}
                onTagInputChange={setTagInput}
                onTagInputKeyDown={handleTagInputKeyDown}
                onRemoveTag={removeTag}
                imagesCount={selectedImages.length}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
              >
                Cancel
              </Button>
              {!selectedImages.some(img => img?.uploadedUrl) ? (
                <Button type="submit" disabled={isUploading}>
                  {isUploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    'Upload & Analyze'
                  )}
                </Button>
              ) : (
                <Button 
                  type="button" 
                  onClick={handleSave}
                  disabled={isUploading || !metadata.title || selectedImages.some(img => img?.isAnalyzing)}
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save All'
                  )}
                </Button>
              )}
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog 
        open={showUnsavedChangesDialog} 
        onOpenChange={setShowUnsavedChangesDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. Are you sure you want to close without saving?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowUnsavedChangesDialog(false)}>
              Continue Editing
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDiscardChanges}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Discard Changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}