import { useState } from "react";
import { MetadataFormData, defaultMetadata } from "@/components/upload/types";

export function useMetadataState() {
  const [metadata, setMetadata] = useState<MetadataFormData>(defaultMetadata);
  const [initialMetadata, setInitialMetadata] = useState<string>("");
  const [tagInput, setTagInput] = useState("");

  const updateMetadata = (changes: Partial<MetadataFormData>) => {
    setMetadata((prev) => ({ ...prev, ...changes }));
  };

  const handleTagInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const newTag = tagInput.trim();
      if (newTag && !metadata.tags.includes(newTag)) {
        setMetadata((prev) => ({
          ...prev,
          tags: [...prev.tags, newTag],
        }));
      }
      setTagInput("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setMetadata((prev) => ({
      ...prev,
      tags: prev.tags.filter((tag) => tag !== tagToRemove),
    }));
  };

  const addTag = (tag: string) => {
    if (!metadata.tags.includes(tag)) {
      setMetadata((prev) => ({
        ...prev,
        tags: [...prev.tags, tag],
      }));
    }
  };

  const updateDescription = (newDescription: string) => {
    setMetadata((prev) => ({
      ...prev,
      description: newDescription,
    }));
  };

  const appendDescription = (additionalDescription: string) => {
    setMetadata((prev) => ({
      ...prev,
      description: prev.description
        ? `${prev.description}\n\n${additionalDescription}`
        : additionalDescription,
    }));
  };

  const updateFromAnalysis = (analysis: any) => {
    if (analysis.raw_results?.llm_analysis) {
      const {
        objects = [],
        scenes = [],
        tags = [],
        description = "",
      } = analysis.raw_results.llm_analysis;

      const extractedObjects = objects.map((obj: any) =>
        typeof obj === "string" ? obj : obj.label
      );
      const extractedScenes = scenes.map((scene: any) =>
        typeof scene === "string" ? scene : scene.label
      );

      setMetadata((prev) => ({
        ...prev,
        objects: [...new Set([...prev.objects, ...extractedObjects])],
        scenes: [...new Set([...prev.scenes, ...extractedScenes])],
        tags: [...new Set([...prev.tags, ...tags])],
        description: prev.description ? `${prev.description}\n\n${description}` : description,
      }));
    }
  };

  const resetMetadata = () => {
    setMetadata(defaultMetadata);
    setInitialMetadata("");
    setTagInput("");
  };

  const hasUnsavedChanges = () => {
    return initialMetadata !== JSON.stringify(metadata);
  };

  return {
    metadata,
    tagInput,
    setTagInput,
    updateMetadata,
    handleTagInputKeyDown,
    removeTag,
    addTag,
    updateDescription,
    appendDescription,
    updateFromAnalysis,
    resetMetadata,
    hasUnsavedChanges,
    setInitialMetadata,
  };
}
