export default {
  async fetch(request, env, ctx) {
    // Handle CORS
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    try {
      const { prompt } = await request.json();
      
      console.log('Generating image for prompt:', prompt);

      // Flux 1 Schnell with more steps for better quality
      const aiResponse = await env.AI.run(
        '@cf/black-forest-labs/flux-1-schnell',
        {
          prompt: prompt,
          num_steps: 6  // Increased from 4 (default) to 8 for better quality
        }
      );

      // Convert base64 to binary
      const binaryString = atob(aiResponse.image);
      const imageBytes = Uint8Array.from(binaryString, (char) => char.codePointAt(0));

      return new Response(imageBytes, {
        headers: {
          'Content-Type': 'image/png',
          'Access-Control-Allow-Origin': '*',
        },
      });

    } catch (error) {
      console.error('Worker error:', error);
      return new Response(JSON.stringify({ 
        error: error.message
      }), {
        status: 500,
        headers: { 
          'Content-Type': 'application/json', 
          'Access-Control-Allow-Origin': '*' 
        },
      });
    }
  },
};
