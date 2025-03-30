import { useState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Image, ImageMetadataForm } from "@/components/shared/ImageMetadataForm";
import { useImageUpload } from "@/hooks/use-image-upload";
import { useImageAnalysis } from "@/hooks/use-image-analysis";
import { useMetadataState } from "@/hooks/use-metadata-state";
import type { ImageFile } from "@/components/upload/types";

interface Props {
  onUploadComplete: () => void;
}

export function ImageUpload({ onUploadComplete }: Props) {
  const [showMetadataDialog, setShowMetadataDialog] = useState(false);
  const [selectedImages, setSelectedImages] = useState<ImageFile[]>([]);
  const [uploadStep, setUploadStep] = useState<"upload" | "analyze" | "save">("upload");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { isUploading, uploadImages, saveImages } = useImageUpload({
    onSuccess: () => {
      handleDiscardChanges();
      onUploadComplete();
    },
  });

  const { analyzeImage } = useImageAnalysis();
  const { resetMetadata } = useMetadataState();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    const newImages = files.map((file) => ({
      file,
      previewUrl: URL.createObjectURL(file),
      url: URL.createObjectURL(file),
    }));

    setSelectedImages((prev) => [...prev, ...newImages]);
    setShowMetadataDialog(true);
    setUploadStep("upload");
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
    }
  };

  const clearFiles = () => {
    // Revoke all object URLs
    selectedImages.forEach((image) => {
      if (image?.previewUrl) {
        URL.revokeObjectURL(image.previewUrl);
      }
    });

    // Reset the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    // Clear selected images
    setSelectedImages([]);
    setShowMetadataDialog(false);
    resetMetadata();
    setUploadStep("upload");
  };

  const handleDiscardChanges = () => {
    clearFiles();
  };

  const handleAnalyze = async (imageUrl: string, index: number) => {
    setSelectedImages((prev) => {
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
      const analysis = await analyzeImage(imageUrl);

      setSelectedImages((prev) => {
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
      setSelectedImages((prev) => {
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

  const handleUpload = async (metadata: any) => {
    if (selectedImages.length === 0 || !metadata.title) return;

    try {
      const uploadedImages = selectedImages.filter((img) => !img.uploadedUrl);
      if (uploadedImages.length > 0) {
        await uploadImages(uploadedImages, handleAnalyze);
        setUploadStep("analyze");
      } else {
        setUploadStep("save");
      }
    } catch (error) {
      // Error is handled in the hooks
    }
  };

  const handleSave = async (metadata: any) => {
    if (selectedImages.length === 0 || !metadata.title) return;

    try {
      // Check if all images are done analyzing
      const allImagesAnalyzed = selectedImages.every((img) => !img.isAnalyzing);
      if (allImagesAnalyzed) {
        await saveImages(selectedImages, metadata);
      }
    } catch (error) {
      // Error is handled in the hooks
    }
  };

  const getStepContent = () => {
    switch (uploadStep) {
      case "analyze":
        return {
          title: "Analyzing Images",
          description: "Please wait while we analyze your images...",
          buttonText: "Save Images",
          buttonAction: handleSave,
          showSpinner: selectedImages.some((img) => img.isAnalyzing),
        };
      case "save":
        return {
          title: "Save Images",
          description: "Review the analysis results and save your images.",
          buttonText: "Save Images",
          buttonAction: handleSave,
          showSpinner: false,
        };
      default:
        return {
          title: "Upload Images",
          description: "Add details for your images before uploading.",
          buttonText: "Upload & Analyze",
          buttonAction: handleUpload,
          showSpinner: isUploading,
        };
    }
  };

  const stepContent = getStepContent();

  return (
    <>
      <div className="p-4 border rounded-lg bg-card">
        <div className="space-y-4">
          <div>
            <Label htmlFor="image">Upload Images</Label>
            <Input
              ref={fileInputRef}
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

      <ImageMetadataForm
        open={showMetadataDialog}
        onOpenChange={(open) => {
          if (!open) {
            clearFiles();
          }
        }}
        onSave={stepContent.buttonAction}
        title={stepContent.title}
        description={stepContent.description}
        images={selectedImages as Image[]}
        onRemoveImage={removeImage}
        isProcessing={stepContent.showSpinner}
        processingText={uploadStep === "analyze" ? "Analyzing..." : "Uploading..."}
        saveButtonText={stepContent.buttonText}
        showPreviewGrid={true}
        disabled={uploadStep === "analyze" && selectedImages.some((img) => img.isAnalyzing)}
      />
    </>
  );
}
