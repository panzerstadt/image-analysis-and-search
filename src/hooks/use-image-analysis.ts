import { useToast } from '@/hooks/use-toast';

export function useImageAnalysis() {
  const { toast } = useToast();

  const analyzeImage = async (imageUrl: string) => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-image`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ imageUrl }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to analyze image');
      }

      const analysis = await response.json();
      return analysis;
    } catch (error) {
      console.error('Error analyzing image:', error);
      toast({
        title: 'Error',
        description: 'Failed to analyze image. Please try again.',
        variant: 'destructive',
      });
      throw error;
    }
  };

  return {
    analyzeImage,
  };
}