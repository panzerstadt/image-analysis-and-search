export interface AnalysisPrompt {
  role: "user" | "assistant";
  content: Array<{
    type: "text" | "image";
    text?: string;
    url?: string;
  }>;
}

export function createImageAnalysisPrompt(imageUrl: string, context: {
  title?: string;
  description?: string;
} = {}): AnalysisPrompt[] {
  const prompt = `Analyze this image in detail. ${context.title ? `The image is titled "${context.title}". ` : ''}${context.description ? `Current description: "${context.description}". ` : ''}

Please provide:
1. A list of main objects and elements visible in the image
2. The overall scene or setting
3. Any notable visual characteristics
4. A natural, detailed description of the image

Format the response as:
OBJECTS: [comma-separated list of objects]
SCENE: [brief scene description]
DESCRIPTION: [detailed description]`;

  return [
    {
      role: "user",
      content: [
        {
          type: "image_url",
          image_url: { url: imageUrl }
        },
        {
          type: "text",
          text: prompt
        }
      ]
    }
  ];
}