export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Handle CORS preflight
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
      // Route: /enrich - LLM prompt enrichment
      if (url.pathname === '/enrich') {
        return await handleEnrich(request, env);
      }

      // Route: / - Image generation (default)
      return await handleImageGeneration(request, env);

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

// LLM prompt enrichment using Llama 3.1
async function handleEnrich(request, env) {
  const { prompt, systemPrompt } = await request.json();

  console.log('Enriching prompt:', prompt);

  // Default system prompt (fallback for backwards compatibility)
  const defaultSystemPrompt = `You enrich simple ideas into children's coloring book scenes.

IMPORTANT: If the prompt is already detailed (has background, clothes, pose, or activity), KEEP their details! Only translate to English. Do NOT replace their scene with generic elements.

For SIMPLE prompts (just a subject like "un chat"):
- Add a cute interpretation, simple action, and playful environment

For DETAILED prompts (already has context):
- Just translate to English and keep ALL their specific details

CRITICAL RULES:
- NEVER mention colors (no "red", "blue", "grey", "bright", etc.)
- NEVER describe textures (no "fluffy", "soft", "shiny")
- Keep it to 1 sentence maximum
- Respond in English only

Examples:
"un chat" → "A cute cat sitting in a garden with butterflies and flowers"
"un renard qui fait de la moto et qui porte un pyjama rayé" → "A fox riding a motorcycle wearing striped pajamas"
"un ours qui jongle avec des cactus devant les pyramides" → "A bear juggling cacti in front of the Egyptian pyramids"`;

  // Use provided system prompt or fall back to default
  const finalSystemPrompt = systemPrompt || defaultSystemPrompt;

  const response = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
    messages: [
      { role: 'system', content: finalSystemPrompt },
      { role: 'user', content: prompt }
    ],
    max_tokens: 100
  });

  console.log('Enriched result:', response.response);

  return new Response(JSON.stringify({ enriched: response.response }), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

// Image generation using FLUX
async function handleImageGeneration(request, env) {
  const { prompt, steps } = await request.json();

  console.log('Generating image for prompt:', prompt);

  // Flux 1 Schnell with configurable steps
  const aiResponse = await env.AI.run(
    '@cf/black-forest-labs/flux-1-schnell',
    {
      prompt: prompt,
      num_steps: steps || 6
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
}
