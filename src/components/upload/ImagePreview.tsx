import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Plus, X } from 'lucide-react';
import { ImageFile } from './types';

interface ImagePreviewProps {
  image: ImageFile;
  index: number;
  onRemove: (index: number) => void;
  onAddTag: (tag: string) => void;
}

export function ImagePreview({ image, index, onRemove, onAddTag }: ImagePreviewProps) {
  if (!image?.previewUrl) return null;

  return (
    <Card className="relative group">
      <Button
        variant="destructive"
        size="icon"
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={() => onRemove(index)}
        type="button"
      >
        <X className="h-4 w-4" />
      </Button>
      <CardContent className="p-2">
        <div className="aspect-square rounded-md overflow-hidden relative">
          <img
            src={image.previewUrl}
            alt={`Preview ${index + 1}`}
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
        {image.analysis?.raw_results?.llm_analysis && (
          <ScrollArea className="h-32 mt-2">
            <div className="flex flex-wrap gap-1">
              {/* Objects */}
              {image.analysis.raw_results.llm_analysis.objects?.map((object, i) => {
                const label = typeof object === 'string' ? object : object.label;
                const confidence = typeof object === 'object' ? object.confidence : undefined;
                
                return (
                  <Button
                    key={`object-${i}`}
                    variant="outline"
                    size="sm"
                    className="h-6 text-xs text-green-600 hover:text-green-700"
                    onClick={() => onAddTag(label)}
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
              })}
              {/* Scenes */}
              {image.analysis.raw_results.llm_analysis.scenes?.map((scene, i) => {
                const label = typeof scene === 'string' ? scene : scene.label;
                const confidence = typeof scene === 'object' ? scene.confidence : undefined;
                
                return (
                  <Button
                    key={`scene-${i}`}
                    variant="outline"
                    size="sm"
                    className="h-6 text-xs text-blue-600 hover:text-blue-700"
                    onClick={() => onAddTag(label)}
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
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}