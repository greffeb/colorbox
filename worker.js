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
      // Route: /analyze - LLM prompt analysis (Pass 1)
      if (url.pathname === '/analyze') {
        return await handleAnalyze(request, env);
      }

      // Route: /enrich - LLM prompt enrichment (Pass 2 or single-pass)
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

// LLM prompt analysis (Pass 1) - Extract elements into JSON
async function handleAnalyze(request, env) {
  const { prompt } = await request.json();

  console.log('Analyzing prompt:', prompt);

  const analysisPrompt = `You analyze French prompts for a children's coloring book and extract elements into JSON.

RULES:
1. Output ONLY valid JSON, nothing else - no explanation, no markdown
2. Extract what the user actually specified - do NOT invent or assume
3. Use null for unspecified categories
4. Translate values to English
5. You can CREATE NEW CATEGORIES if the prompt contains information that doesn't fit existing ones

REQUIRED CATEGORIES (always include, use null if not specified):
- subjects: array of main characters/things (REQUIRED - never null)
- setting: where it takes place
- activity: what they're doing
- clothing: what they're wearing
- objects: items they have or interact with
- decor: background decorations mentioned

OPTIONAL CATEGORIES (add only if prompt specifies):
- mood: emotional atmosphere (e.g., "sad", "mysterious")
- time_of_day: when it happens (e.g., "night", "sunset")
- weather: weather conditions (e.g., "rain", "snow")
- ability: special powers or traits (e.g., "fire-breathing")
- companion: friends or pets with them
- size: size modifiers (e.g., "tiny", "giant")
- quantity: how many (e.g., "many", "three")

EXAMPLES:

Input: "un lapin"
Output: {"subjects":["rabbit"],"setting":null,"activity":null,"clothing":null,"objects":null,"decor":null}

Input: "un lapin sur un bateau"
Output: {"subjects":["rabbit"],"setting":"on a boat","activity":null,"clothing":null,"objects":null,"decor":null}

Input: "plein de petites fées la nuit"
Output: {"subjects":["fairies"],"setting":null,"activity":null,"clothing":null,"objects":null,"decor":null,"quantity":"many","size":"tiny","time_of_day":"night"}

Input: "un dragon cracheur de feu"
Output: {"subjects":["dragon"],"setting":null,"activity":null,"clothing":null,"objects":null,"decor":null,"ability":"fire-breathing"}

Input: "un ours qui fait du vélo avec un chapeau de cowboy"
Output: {"subjects":["bear"],"setting":null,"activity":"riding a bicycle","clothing":"cowboy hat","objects":"bicycle","decor":null}

Input: "un robot triste sous la pluie"
Output: {"subjects":["robot"],"setting":null,"activity":null,"clothing":null,"objects":null,"decor":null,"mood":"sad","weather":"rain"}

Now analyze this prompt:`;

  const response = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
    messages: [
      { role: 'system', content: analysisPrompt },
      { role: 'user', content: prompt }
    ],
    max_tokens: 200
  });

  console.log('Analysis result:', response.response);

  // Try to parse JSON from response
  try {
    // Extract JSON from response (LLM might include extra text)
    const jsonMatch = response.response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const analysis = JSON.parse(jsonMatch[0]);
      // Validate required field
      if (!analysis.subjects || !Array.isArray(analysis.subjects) || analysis.subjects.length === 0) {
        analysis.subjects = [prompt];
      }
      return new Response(JSON.stringify({ analysis }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }
    throw new Error('No JSON found in response');
  } catch (e) {
    console.warn('JSON parse error, using fallback:', e.message);
    // Return minimal valid structure
    return new Response(JSON.stringify({
      analysis: {
        subjects: [prompt],
        setting: null,
        activity: null,
        clothing: null,
        objects: null,
        decor: null
      },
      parseError: true
    }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
}

// LLM prompt enrichment (Pass 2 or single-pass) using Llama 3.1
async function handleEnrich(request, env) {
  const { prompt, systemPrompt, structure } = await request.json();

  // Pass 2 mode: structure provided, create sentence from JSON
  if (structure) {
    console.log('Enriching from structure:', structure);

    const pass2Prompt = `You create short descriptions for children's coloring book illustrations.

INPUT: JSON with image elements (some provided by user, some randomly selected)
OUTPUT: One natural English sentence describing the scene

RULES:
1. Include ALL elements from the JSON naturally in your sentence
2. Add a cute expression or emotion to characters (smiling, curious, excited, happy)
3. Keep it simple and child-friendly
4. Output 1 sentence only, nothing else
5. NEVER mention colors, textures, or materials (no "red", "fluffy", "shiny")
6. Do NOT add elements not in the JSON

EXAMPLES:

Input: {"subjects":["rabbit"],"setting":"in a magical forest","activity":"reading a big book","companion":"with a tiny mouse friend"}
Output: A cheerful rabbit reading a big book in a magical forest with a tiny mouse friend peeking over

Input: {"subjects":["dragon"],"setting":"on a cloud","activity":"baking a cake","ability":"fire-breathing"}
Output: A friendly fire-breathing dragon happily baking a cake while sitting on a fluffy cloud

Input: {"subjects":["fairies"],"quantity":"many","size":"tiny","time_of_day":"night","decor":"with stars twinkling"}
Output: Many tiny fairies dancing joyfully at night with stars twinkling all around them

Input: {"subjects":["robot"],"mood":"sad","weather":"rain","setting":"in a junkyard"}
Output: A sad little robot standing alone in a junkyard while rain falls gently around

Now create a description for:`;

    const response = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
      messages: [
        { role: 'system', content: pass2Prompt },
        { role: 'user', content: JSON.stringify(structure) }
      ],
      max_tokens: 100
    });

    console.log('Pass 2 enriched result:', response.response);

    return new Response(JSON.stringify({ enriched: response.response?.trim() }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }

  // Single-pass mode (backwards compatible)
  console.log('Enriching prompt (single-pass):', prompt);

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
