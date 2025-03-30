import { useState, useEffect } from "react";
import {
  Search,
  Filter,
  Image as ImageIcon,
  Loader2,
  LayoutGrid,
  Edit,
  Trash2,
  RefreshCw,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Image, SearchFilters } from "@/lib/types";
import { supabase } from "@/lib/supabase";
import { ImageMetadataDialog } from "@/components/ImageMetadataDialog";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";

export function ImageSearch() {
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<SearchFilters>({});
  const [images, setImages] = useState<Image[]>([]);
  const [loading, setLoading] = useState(false);
  const [columns, setColumns] = useState(4);
  const [selectedImage, setSelectedImage] = useState<Image | null>(null);
  const [showMetadataDialog, setShowMetadataDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletingImage, setDeletingImage] = useState<Image | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [analyzingImageId, setAnalyzingImageId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadImages();
    window.addEventListener("image-uploaded", loadImages);
    return () => window.removeEventListener("image-uploaded", loadImages);
  }, []);

  const loadImages = async () => {
    setLoading(true);
    try {
      const {
        data: { session },
        error: authError,
      } = await supabase.auth.getSession();
      if (authError) throw authError;
      if (!session) throw new Error("No authenticated session");

      const { data, error } = await supabase
        .from("images")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setImages(data || []);
    } catch (error) {
      console.error("Error loading images:", error);
      toast({
        title: "Error",
        description: "Failed to load images. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!query.trim() && Object.keys(filters).length === 0) {
      return loadImages();
    }

    setLoading(true);
    try {
      let searchQuery = supabase.rpc("search_images", {
        search_query: query.toLowerCase(),
        similarity_threshold: 0.3,
      });

      if (filters.objects?.length) {
        searchQuery = searchQuery.containedBy("metadata->objects", filters.objects);
      }
      if (filters.emotions?.length) {
        searchQuery = searchQuery.containedBy("metadata->emotions", filters.emotions);
      }

      const { data, error } = await searchQuery;

      if (error) throw error;
      setImages(data || []);

      if (data?.length === 0) {
        toast({
          title: "No Results",
          description: "No images found matching your search criteria.",
        });
      }
    } catch (error) {
      console.error("Error searching images:", error);
      toast({
        title: "Error",
        description: "Failed to search images. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditImage = (image: Image) => {
    setSelectedImage(image);
    setShowMetadataDialog(true);
  };

  const handleDeleteClick = (image: Image) => {
    setDeletingImage(image);
    setShowDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingImage) return;

    try {
      setIsDeleting(true);

      const fileName = deletingImage.url.split("/").pop();
      if (fileName) {
        const { error: storageError } = await supabase.storage.from("images").remove([fileName]);

        if (storageError) throw storageError;
      }

      const { error: dbError } = await supabase.from("images").delete().eq("id", deletingImage.id);

      if (dbError) throw dbError;

      toast({
        title: "Success",
        description: "Image deleted successfully",
      });

      loadImages();
    } catch (error) {
      console.error("Error deleting image:", error);
      toast({
        title: "Error",
        description: "Failed to delete image. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
      setDeletingImage(null);
    }
  };

  const handleReanalyze = async (image: Image) => {
    try {
      setAnalyzingImageId(image.id);

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-image`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            imageUrl: image.url,
            metadata: {
              title: image.title,
              description: image.description,
              tags: image.tags,
              objects: image.metadata?.objects || [],
              scenes: image.metadata?.scenes || [],
              technical: image.metadata?.technical_details || {},
            },
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to analyze image");
      }

      const analysis = await response.json();

      // Update the image with new analysis results
      const { error: updateError } = await supabase
        .from("images")
        .update({
          description: analysis.description,
          tags: analysis.tags,
          metadata: {
            objects: analysis.objects,
            scenes: analysis.scenes,
            emotions: analysis.emotions || [],
            technical_details: analysis.technical_details,
          },
        })
        .eq("id", image.id);

      if (updateError) throw updateError;

      toast({
        title: "Success",
        description: "Image analysis updated successfully",
      });

      // Refresh the images list
      loadImages();
    } catch (error) {
      console.error("Error reanalyzing image:", error);
      toast({
        title: "Error",
        description: "Failed to reanalyze image. Please try again.",
        variant: "destructive",
      });
    } finally {
      setAnalyzingImageId(null);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap gap-4">
        <div className="relative flex-1 min-w-[200px]">
          <Input
            placeholder="Search images..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-10"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleSearch();
              }
            }}
          />
          <Search className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <Filter className="mr-2 h-4 w-4" />
              Filters
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onClick={() => setFilters((prev) => ({ ...prev, objects: [] }))}>
              Objects
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setFilters((prev) => ({ ...prev, colors: [] }))}>
              Colors
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setFilters((prev) => ({ ...prev, emotions: [] }))}>
              Emotions
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                setFilters((prev) => ({
                  ...prev,
                  technical: { orientation: undefined, quality: undefined, lighting: undefined },
                }))
              }
            >
              Technical
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button onClick={handleSearch} disabled={loading}>
          Search
        </Button>

        <div className="flex items-center gap-4 min-w-[200px]">
          <LayoutGrid className="h-4 w-4 text-muted-foreground" />
          <Slider
            value={[columns]}
            onValueChange={([value]) => setColumns(value)}
            min={2}
            max={6}
            step={1}
            className="w-24"
          />
          <span className="text-sm text-muted-foreground w-8">{columns}</span>
        </div>
      </div>

      <div
        className="grid gap-4"
        style={{
          gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
        }}
      >
        {loading ? (
          <div className="col-span-full flex justify-center">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : images.length > 0 ? (
          images.map((image) => (
            <Card key={image.id} className="overflow-hidden group relative">
              <div className="aspect-square relative">
                <img
                  src={image.url}
                  alt={image.title || ""}
                  className="object-cover w-full h-full"
                />
                <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="secondary"
                    size="icon"
                    onClick={() => handleReanalyze(image)}
                    disabled={analyzingImageId === image.id}
                  >
                    {analyzingImageId === image.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                  </Button>
                  <Button variant="secondary" size="icon" onClick={() => handleEditImage(image)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={() => handleDeleteClick(image)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <CardContent className="p-4">
                <h3 className="font-semibold mb-2 truncate" title={image.title || ""}>
                  {image.title}
                </h3>
                <ScrollArea className="h-32 mb-4">
                  {image.description && (
                    <p className="text-sm text-muted-foreground mb-4">{image.description}</p>
                  )}
                  <div className="flex flex-wrap gap-1">
                    {image.tags?.map((tag, index) => (
                      <Badge key={`${tag}-${index}`} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="col-span-full text-center">
            <ImageIcon className="mx-auto h-12 w-12 text-muted-foreground" />
            <p className="mt-4 text-lg text-muted-foreground">
              No images found. Try uploading some images or adjusting your search.
            </p>
          </div>
        )}
      </div>

      <ImageMetadataDialog
        image={selectedImage}
        open={showMetadataDialog}
        onOpenChange={setShowMetadataDialog}
        onSave={loadImages}
      />

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the image and remove it
              from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
