export interface AnalysisResult {
  objects: Array<{ label: string; confidence: number; }>;
  scenes: Array<{ label: string; confidence: number; }>;
  tags: string[];
  description: string;
}

export interface ParsedResponse {
  objects: string[];
  scenes: string[];
  tags: string[];
  technical_details: {
    orientation: string;
    quality: string;
    lighting: string;
    composition: string[];
  };
  description: string;
  raw_results: {
    llm_analysis: AnalysisResult;
  };
}

function logDebug(message: string, data?: any) {
  const timestamp = new Date().toISOString();
  console.debug(JSON.stringify({
    timestamp,
    level: 'DEBUG',
    message,
    ...data && { data },
  }));
}

export function parseAnalysisResponse(
  response: string,
  userContext: any = {}
): ParsedResponse {
  logDebug('Starting response parsing', {
    responseLength: response.length,
    hasUserContext: Object.keys(userContext).length > 0,
  });

  // Extract sections using regex
  const objectsMatch = response.match(/OBJECTS:\s*([^\n]+)/i);
  const sceneMatch = response.match(/SCENE:\s*([^\n]+)/i);
  const descriptionMatch = response.match(/DESCRIPTION:\s*(.+?)(?=\n|$)/is);

  logDebug('Extracted raw sections', {
    hasObjects: !!objectsMatch,
    hasScene: !!sceneMatch,
    hasDescription: !!descriptionMatch,
  });

  // Extract objects
  const objects = objectsMatch?.[1]
    .split(',')
    .map(obj => obj.trim())
    .filter(Boolean)
    .map(obj => ({
      label: obj,
      confidence: 0.9,
    })) || [];

  // Extract scene
  const scenes = sceneMatch?.[1]
    .split(',')
    .map(scene => scene.trim())
    .filter(Boolean)
    .map(scene => ({
      label: scene,
      confidence: 0.9,
    })) || [];

  // Get description
  const description = descriptionMatch?.[1]?.trim() || response;

  logDebug('Parsed initial data', {
    objectsCount: objects.length,
    scenesCount: scenes.length,
    descriptionLength: description.length,
  });

  // Create tags from objects and scenes
  const tags = [...new Set([
    ...objects.map(obj => obj.label.toLowerCase()),
    ...scenes.map(scene => scene.label.toLowerCase()),
  ])];

  // Merge with existing metadata
  const technical_details = {
    orientation: userContext.technical?.orientation || 'landscape',
    quality: userContext.technical?.quality || 'high',
    lighting: userContext.technical?.lighting || 'natural',
    composition: Array.isArray(userContext.technical?.composition) 
      ? userContext.technical.composition 
      : [],
  };

  // Ensure all arrays contain only unique values
  const uniqueObjects = [...new Set([
    ...(userContext.objects || []),
    ...objects.map(obj => obj.label),
  ])];

  const uniqueScenes = [...new Set([
    ...(userContext.scenes || []),
    ...scenes.map(scene => scene.label),
  ])];

  const uniqueTags = [...new Set([
    ...(userContext.title ? userContext.title.toLowerCase().split(/\s+/).filter(w => w.length > 2) : []),
    ...(userContext.tags || []),
    ...tags,
  ])];

  logDebug('Generated unique values', {
    uniqueObjectsCount: uniqueObjects.length,
    uniqueScenesCount: uniqueScenes.length,
    uniqueTagsCount: uniqueTags.length,
  });

  // Handle description
  let finalDescription = description;
  if (userContext.description) {
    finalDescription = `${userContext.description}\n\nAI Analysis: ${description}`;
  }

  const result = {
    objects: uniqueObjects,
    scenes: uniqueScenes,
    tags: uniqueTags,
    technical_details,
    description: finalDescription,
    raw_results: {
      llm_analysis: {
        objects,
        scenes,
        tags,
        description,
      },
    },
  };

  logDebug('Completed response parsing', {
    finalObjectsCount: result.objects.length,
    finalScenesCount: result.scenes.length,
    finalTagsCount: result.tags.length,
    finalDescriptionLength: result.description.length,
  });

  return result;
}

export function createErrorResponse(error: Error, userContext: any = {}): ParsedResponse {
  console.error('Creating error response', {
    timestamp: new Date().toISOString(),
    level: 'ERROR',
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
    },
    hasUserContext: Object.keys(userContext).length > 0,
  });

  return {
    objects: [],
    scenes: [],
    tags: [],
    technical_details: {
      orientation: userContext.technical?.orientation || 'landscape',
      quality: userContext.technical?.quality || 'high',
      lighting: userContext.technical?.lighting || 'natural',
      composition: [],
    },
    description: '',
    raw_results: {
      llm_analysis: {
        objects: [],
        scenes: [],
        tags: [],
        description: '',
      },
    },
  };
}