import { useState, useRef, useEffect } from "react";
import { Loader2, Plus, X, AlertCircle, CheckCircle2, ChevronDown, ChevronUp } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardDescription } from "@/components/ui/card";
import { useMetadataState } from "@/hooks/use-metadata-state";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (metadata: any) => Promise<void>;
  title: string;
  description?: string;
  initialMetadata?: {
    title?: string;
    description?: string;
    tags?: string[];
    metadata?: any;
  };
  images?: Array<{
    url: string;
    previewUrl?: string;
    isAnalyzing?: boolean;
    analysis?: {
      objects: string[];
      scenes: string[];
      tags: string[];
      technical_details: {
        orientation: string;
        quality: string;
        lighting: string;
        composition: string;
      };
      description: string;
      raw_results: {
        llm_analysis: {
          objects: { label: string; confidence: number }[];
          scenes: { label: string; confidence: number }[];
          tags: string[];
          description: string;
        };
      };
    };
  }>;
  onRemoveImage?: (index: number) => void;
  isProcessing?: boolean;
  processingText?: string;
  saveButtonText?: string;
  showPreviewGrid?: boolean;
  disabled?: boolean;
}

export function ImageMetadataForm({
  open,
  onOpenChange,
  onSave,
  title,
  description,
  initialMetadata,
  images = [],
  onRemoveImage,
  isProcessing = false,
  processingText = "Saving...",
  saveButtonText = "Save Changes",
  showPreviewGrid = true,
  disabled = false,
}: Props) {
  const [showUnsavedChangesDialog, setShowUnsavedChangesDialog] = useState(false);
  const [expandedAnalysis, setExpandedAnalysis] = useState<number[]>([]);
  const formRef = useRef<HTMLFormElement>(null);

  const {
    metadata,
    tagInput,
    setTagInput,
    updateMetadata,
    handleTagInputKeyDown,
    removeTag,
    addTag,
    hasUnsavedChanges,
    resetMetadata,
    setInitialMetadata,
    updateDescription,
    appendDescription,
  } = useMetadataState();

  useEffect(() => {
    if (initialMetadata) {
      console.log("initial metadata", initialMetadata);
      const newMetadata = {
        title: initialMetadata.title || "",
        description: initialMetadata.description || "",
        tags: initialMetadata.tags || [],
        objects: initialMetadata.metadata?.objects || [],
        scenes: initialMetadata.metadata?.scenes || [],
        emotions: initialMetadata.metadata?.emotions || [],
        technical: {
          orientation: initialMetadata.metadata?.technical_details?.orientation || "landscape",
          quality: initialMetadata.metadata?.technical_details?.quality || "high",
          lighting: initialMetadata.metadata?.technical_details?.lighting || "natural",
          composition: initialMetadata.metadata?.technical_details?.composition || [],
        },
      };
      updateMetadata(newMetadata);
      setInitialMetadata(JSON.stringify(newMetadata));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialMetadata]);

  const handleClose = () => {
    if (hasUnsavedChanges()) {
      setShowUnsavedChangesDialog(true);
    } else {
      handleDiscardChanges();
    }
  };

  const handleDiscardChanges = () => {
    setShowUnsavedChangesDialog(false);
    onOpenChange(false);
    resetMetadata();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!metadata.title || disabled) return;

    try {
      await onSave(metadata);
    } catch (error) {
      // Error is handled by the parent component
    }
  };

  const toggleAnalysis = (index: number) => {
    setExpandedAnalysis((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };

  const getAnalysisStatus = (image: Props["images"][0]) => {
    if (image.isAnalyzing) {
      return {
        icon: <Loader2 className="h-4 w-4 animate-spin" />,
        text: "Analyzing...",
        color: "text-blue-500",
      };
    }
    if (image.analysis?.raw_results?.llm_analysis) {
      return {
        icon: <CheckCircle2 className="h-4 w-4" />,
        text: "Analysis complete",
        color: "text-green-500",
      };
    }
    return {
      icon: <AlertCircle className="h-4 w-4" />,
      text: "Waiting for analysis",
      color: "text-yellow-500",
    };
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>

          <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              {showPreviewGrid && (
                <div className="space-y-4">
                  <ScrollArea className="h-[400px] rounded-md border">
                    <div className="p-4 grid grid-cols-1 gap-4">
                      {images.map((image, index) => {
                        const status = getAnalysisStatus(image);
                        const isExpanded = expandedAnalysis.includes(index);
                        return (
                          <Card key={index} className="relative group">
                            {onRemoveImage && (
                              <Button
                                variant="destructive"
                                size="icon"
                                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                onClick={() => onRemoveImage(index)}
                                type="button"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            )}
                            <CardHeader className="p-2 pb-0">
                              <CardDescription
                                className={`flex items-center gap-2 ${status.color}`}
                              >
                                {status.icon}
                                {status.text}
                              </CardDescription>
                            </CardHeader>
                            <CardContent className="p-2">
                              <div className="aspect-square rounded-md overflow-hidden relative">
                                <img
                                  src={image.previewUrl || image.url}
                                  alt={metadata.title || ""}
                                  className="w-full h-full object-cover"
                                />
                                {image.isAnalyzing && (
                                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                    <div className="text-center text-white">
                                      <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                                      <p className="text-sm">Analyzing...</p>
                                    </div>
                                  </div>
                                )}
                              </div>
                              {image.analysis?.raw_results?.llm_analysis ? (
                                <Collapsible
                                  open={isExpanded}
                                  onOpenChange={() => toggleAnalysis(index)}
                                  className="mt-2"
                                >
                                  <CollapsibleTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="w-full flex items-center justify-between p-2 h-8"
                                    >
                                      <span className="text-xs">Analysis Results</span>
                                      {isExpanded ? (
                                        <ChevronUp className="h-4 w-4" />
                                      ) : (
                                        <ChevronDown className="h-4 w-4" />
                                      )}
                                    </Button>
                                  </CollapsibleTrigger>
                                  <CollapsibleContent className="space-y-2">
                                    <div className="flex flex-wrap gap-1">
                                      <Button
                                        key={`description-generated`}
                                        variant="outline"
                                        size="sm"
                                        className="h-6 text-xs text-gray-600 hover:text-gray-700"
                                        onClick={() =>
                                          updateDescription(image.analysis?.description ?? "")
                                        }
                                        type="button"
                                      >
                                        <Plus className="h-3 w-3 mr-1" />
                                        {image.analysis.description}
                                      </Button>
                                    </div>
                                    <div className="flex flex-wrap gap-1">
                                      {image.analysis.raw_results.llm_analysis.objects?.map(
                                        (object, i) => {
                                          const label =
                                            typeof object === "string" ? object : object.label;
                                          const confidence =
                                            typeof object === "object"
                                              ? object.confidence
                                              : undefined;

                                          return (
                                            <Button
                                              key={`object-${i}`}
                                              variant="outline"
                                              size="sm"
                                              className="h-6 text-xs text-green-600 hover:text-green-700"
                                              onClick={() => addTag(label)}
                                              type="button"
                                            >
                                              <Plus className="h-3 w-3 mr-1" />
                                              {label}
                                              {confidence !== undefined && (
                                                <span className="ml-1 text-muted-foreground">
                                                  {(confidence * 100).toFixed(0)}%
                                                </span>
                                              )}
                                            </Button>
                                          );
                                        }
                                      )}
                                    </div>
                                    <div className="flex flex-wrap gap-1">
                                      {image.analysis.raw_results.llm_analysis.scenes?.map(
                                        (scene, i) => {
                                          const sceneLabel =
                                            typeof scene === "string" ? scene : scene.label;
                                          const confidence =
                                            typeof scene === "object"
                                              ? scene.confidence
                                              : undefined;

                                          return (
                                            <Button
                                              key={`scene-${i}`}
                                              variant="outline"
                                              size="sm"
                                              className="h-6 text-xs text-blue-600 hover:text-blue-700"
                                              onClick={() => appendDescription(sceneLabel)}
                                              type="button"
                                            >
                                              <Plus className="h-3 w-3 mr-1" />
                                              {sceneLabel}
                                              {confidence !== undefined && (
                                                <span className="ml-1 text-muted-foreground">
                                                  {(confidence * 100).toFixed(0)}%
                                                </span>
                                              )}
                                            </Button>
                                          );
                                        }
                                      )}
                                    </div>
                                    <div className="mt-2 p-2 bg-muted rounded-md">
                                      <Collapsible>
                                        <CollapsibleTrigger className="text-xs text-muted-foreground">
                                          View Raw Analysis Results
                                        </CollapsibleTrigger>
                                        <CollapsibleContent>
                                          <pre className="text-xs whitespace-pre-wrap overflow-x-auto">
                                            {JSON.stringify(image.analysis.raw_results, null, 2)}
                                          </pre>
                                        </CollapsibleContent>
                                      </Collapsible>
                                    </div>
                                  </CollapsibleContent>
                                </Collapsible>
                              ) : (
                                !image.isAnalyzing && (
                                  <div className="h-32 mt-2 flex items-center justify-center text-muted-foreground text-sm">
                                    No analysis results available yet
                                  </div>
                                )
                              )}
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={metadata.title}
                    onChange={(e) => updateMetadata({ title: e.target.value })}
                    placeholder={images.length > 1 ? "Common title for all images" : "Image title"}
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={metadata.description}
                    onChange={(e) => updateMetadata({ description: e.target.value })}
                    placeholder="Image description"
                    className="h-32"
                  />
                </div>

                <div>
                  <Label htmlFor="tags">Tags</Label>
                  <Input
                    id="tags"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleTagInputKeyDown}
                    placeholder="Add tags (press Enter)"
                  />
                  <ScrollArea className="h-20 mt-2">
                    <div className="flex flex-wrap gap-2">
                      {metadata.tags.map((tag) => (
                        <Badge
                          key={tag}
                          variant="secondary"
                          className="cursor-pointer"
                          onClick={() => removeTag(tag)}
                        >
                          {tag} ×
                        </Badge>
                      ))}
                    </div>
                  </ScrollArea>
                </div>

                <div>
                  <Label>Technical Details</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <Button
                      type="button"
                      variant={
                        metadata.technical.orientation === "landscape" ? "default" : "outline"
                      }
                      onClick={() =>
                        updateMetadata({
                          technical: { ...metadata.technical, orientation: "landscape" },
                        })
                      }
                      size="sm"
                    >
                      Landscape
                    </Button>
                    <Button
                      type="button"
                      variant={
                        metadata.technical.orientation === "portrait" ? "default" : "outline"
                      }
                      onClick={() =>
                        updateMetadata({
                          technical: { ...metadata.technical, orientation: "portrait" },
                        })
                      }
                      size="sm"
                    >
                      Portrait
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isProcessing || !metadata.title || disabled}>
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {processingText}
                  </>
                ) : (
                  saveButtonText
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showUnsavedChangesDialog} onOpenChange={setShowUnsavedChangesDialog}>
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
