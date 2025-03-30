import { createClient } from 'npm:@supabase/supabase-js@2.39.8';
import { Jimp } from 'npm:jimp@1.6.0';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': '*',
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

async function preprocessImage(file: File): Promise<{ buffer: Uint8Array; metadata: { width: number; height: number } }> {
  try {
    logInfo('Starting image preprocessing', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
    });

    const arrayBuffer = await file.arrayBuffer();

    // Read the image using Jimp with buffer
    const image = await Jimp.fromBuffer(arrayBuffer);

    // Get original dimensions
    image.resize({ w: 500 });
    

    logInfo('New image dimensions', {
      newWidth: image.width,
      newHeight: image.height,
    });

    return {
      buffer: await image.getBuffer("image/jpeg", { quality: 80 }),
      metadata: {
        width: image.width,
        height: image.height,
      },
    };
  } catch (error) {
    logError('Error preprocessing image', error);
    throw error;
  }
}

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();
  const startTime = performance.now();

  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 204,
      headers: corsHeaders 
    });
  }

  try {
    logInfo('Received request', {
      requestId,
      method: req.method,
      contentType: req.headers.get('content-type'),
    });

    // Parse form data
    const formData = await req.formData();
    const file = formData.get('image') as File;
    

    if (!file) {
      throw new Error('No image file provided');
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      throw new Error('Invalid file type. Supported formats: JPG, PNG, WebP');
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      throw new Error('File size too large. Maximum size is 10MB');
    }

    logInfo('Processing image', {
      requestId,
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
    });

    // Preprocess the image
    const { buffer: processedBuffer, metadata } = await preprocessImage(file);

    // Upload to storage
    const fileName = `${crypto.randomUUID()}.jpg`;
    const { error: uploadError } = await supabase.storage
      .from('images')
      .upload(fileName, processedBuffer, {
        contentType: 'image/jpeg',
        cacheControl: '3600',
      });

    if (uploadError) throw uploadError;

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('images')
      .getPublicUrl(fileName);

    logInfo('Image processed successfully', {
      requestId,
      duration: performance.now() - startTime,
      originalSize: file.size,
      processedSize: processedBuffer.byteLength,
      dimensions: metadata,
    });

    return new Response(
      JSON.stringify({
        url: publicUrl,
        metadata: {
          width: metadata.width,
          height: metadata.height,
          format: 'jpeg',
          size: processedBuffer.byteLength,
        },
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    logError('Error processing image', {
      requestId,
      duration: performance.now() - startTime,
      error,
    });

    return new Response(
      JSON.stringify({
        error: error.message,
        details: 'Failed to process image',
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