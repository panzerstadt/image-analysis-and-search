import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MetadataFormData } from './types';

interface MetadataFormProps {
  metadata: MetadataFormData;
  tagInput: string;
  onMetadataChange: (metadata: Partial<MetadataFormData>) => void;
  onTagInputChange: (value: string) => void;
  onTagInputKeyDown: (e: React.KeyboardEvent) => void;
  onRemoveTag: (tag: string) => void;
  imagesCount: number;
}

export function MetadataForm({
  metadata,
  tagInput,
  onMetadataChange,
  onTagInputChange,
  onTagInputKeyDown,
  onRemoveTag,
  imagesCount,
}: MetadataFormProps) {
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          value={metadata.title}
          onChange={(e) => onMetadataChange({ title: e.target.value })}
          placeholder={imagesCount > 1 ? "Common title for all images" : "Image title"}
        />
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={metadata.description}
          onChange={(e) => onMetadataChange({ description: e.target.value })}
          placeholder="Common description for all images"
          className="h-32"
        />
      </div>

      <div>
        <Label htmlFor="tags">Tags</Label>
        <Input
          id="tags"
          value={tagInput}
          onChange={(e) => onTagInputChange(e.target.value)}
          onKeyDown={onTagInputKeyDown}
          placeholder="Add tags (press Enter)"
        />
        <ScrollArea className="h-20 mt-2">
          <div className="flex flex-wrap gap-2">
            {metadata.tags.map(tag => (
              <Badge
                key={tag}
                variant="secondary"
                className="cursor-pointer"
                onClick={() => onRemoveTag(tag)}
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
            variant={metadata.technical.orientation === 'landscape' ? 'default' : 'outline'}
            onClick={() => onMetadataChange({
              technical: { ...metadata.technical, orientation: 'landscape' }
            })}
            size="sm"
          >
            Landscape
          </Button>
          <Button
            type="button"
            variant={metadata.technical.orientation === 'portrait' ? 'default' : 'outline'}
            onClick={() => onMetadataChange({
              technical: { ...metadata.technical, orientation: 'portrait' }
            })}
            size="sm"
          >
            Portrait
          </Button>
        </div>
      </div>
    </div>
  );
}