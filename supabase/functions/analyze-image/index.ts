import { createClient } from 'npm:@supabase/supabase-js@2.39.8';
import { InferenceClient } from 'npm:@huggingface/inference@3.6.2';
import { createImageAnalysisPrompt } from './prompts.ts';
import { parseAnalysisResponse, createErrorResponse } from './response-parser.ts';

const client = new InferenceClient(Deno.env.get('HUGGINGFACE_API_KEY'));
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function logInfo(message: string, data?: any) {
  const timestamp = new Date().toISOString();
  console.log(JSON.stringify({
    timestamp,
    level: 'INFO',
    message,
    ...data && { data },
  }));
}

function logError(message: string, error: any) {
  const timestamp = new Date().toISOString();
  console.error(JSON.stringify({
    timestamp,
    level: 'ERROR',
    message,
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
    },
  }));
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

async function analyzeImageWithQwen(imageUrl: string, userContext: any = {}) {
  const startTime = performance.now();
  const requestId = crypto.randomUUID();

  logInfo('Starting image analysis', {
    requestId,
    imageUrl,
    userContext,
  });

  try {
    // Create the conversation prompt
    logDebug('Creating analysis prompt', {
      requestId,
      userContext,
    });
    const conversation = createImageAnalysisPrompt(imageUrl, userContext);

    // Log the model request
    logDebug('Calling Qwen model', {
      requestId,
      messages: conversation,
      modelParams: {
        max_new_tokens: 500,
        temperature: 0.7,
        top_p: 0.95,
        repetition_penalty: 1.2,
      },
    });

    // Call the model using the chat-style API
    const modelStartTime = performance.now();
    const result = await client.chatCompletion({
      model: 'Qwen/Qwen2-VL-7B-Instruct',
      messages: conversation,
      max_tokens: 500,
    });
    const textResult = result.choices[0].message.content

    const modelDuration = performance.now() - modelStartTime;
    logInfo('Model response received', {
      requestId,
      duration: modelDuration,
      responseLength: textResult.length,
    });

    logDebug('Raw model response', {
      requestId,
      generated_text: textResult,
    });

    // Parse the response
    const parseStartTime = performance.now();
    const analysis = parseAnalysisResponse(textResult, userContext);
    const parseDuration = performance.now() - parseStartTime;

    logInfo('Analysis completed successfully', {
      requestId,
      duration: {
        total: performance.now() - startTime,
        model: modelDuration,
        parsing: parseDuration,
      },
      stats: {
        objects: analysis.objects.length,
        scenes: analysis.scenes.length,
        tags: analysis.tags.length,
        descriptionLength: analysis.description.length,
      },
    });

    return analysis;
  } catch (error) {
    logError('Error during image analysis', {
      requestId,
      duration: performance.now() - startTime,
      error,
    });

    return {
      ...createErrorResponse(error, userContext),
      error: error.message,
    };
  }
}

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();
  const startTime = performance.now();

  logInfo('Received analysis request', {
    requestId,
    method: req.method,
    url: req.url,
  });

  if (req.method === 'OPTIONS') {
    logDebug('Handling OPTIONS request', { requestId });
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestBody = await req.json();
    logDebug('Request body received', {
      requestId,
      imageUrl: requestBody.imageUrl,
      hasMetadata: !!requestBody.metadata,
    });

    const { imageUrl, metadata = {} } = requestBody;
    if (!imageUrl) {
      logError('Missing image URL', {
        requestId,
        body: requestBody,
      });
      throw new Error('Image URL is required');
    }

    const analysis = await analyzeImageWithQwen(imageUrl, metadata);

    // If there was an error during analysis but we still got a valid structure
    if ('error' in analysis) {
      logError('Analysis completed with error', {
        requestId,
        error: analysis.error,
        duration: performance.now() - startTime,
      });

      return new Response(
        JSON.stringify(analysis),
        { 
          status: 500,
          headers: { 
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    logInfo('Request completed successfully', {
      requestId,
      duration: performance.now() - startTime,
    });

    return new Response(
      JSON.stringify(analysis),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    logError('Fatal error processing request', {
      requestId,
      duration: performance.now() - startTime,
      error,
    });
    
    return new Response(
      JSON.stringify({ 
        ...createErrorResponse(error),
        error: error.message,
        details: 'Failed to analyze image',
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});