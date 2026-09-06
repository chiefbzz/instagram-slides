// Suggests color palettes for a piece by asking Claude to read its tone/mood and
// propose a few named palette concepts (base background color + text color).
// Gated by the same passphrase as publish/import so the public StoryShelf tool
// can't be used to run up API costs. All secrets are server-side env vars.

const MODEL = 'claude-haiku-4-5';

const PALETTE_SCHEMA = {
  type: 'object',
  properties: {
    palettes: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          label: { type: 'string', description: '2-4 word mood description, e.g. "dusty rose, wry warmth"' },
          baseColor: { type: 'string', description: 'Background hex color, e.g. #B5788C' },
          textColor: { type: 'string', description: 'Text hex color chosen for contrast against baseColor' },
        },
        required: ['label', 'baseColor', 'textColor'],
        additionalProperties: false,
      },
    },
  },
  required: ['palettes'],
  additionalProperties: false,
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  const passphrase = process.env.PUBLISH_PASSPHRASE;
  if (!apiKey || !passphrase) {
    return res.status(500).json({ error: 'Server not configured (missing env vars)' });
  }

  const { passphrase: given, text } = req.body || {};

  // --- auth gate ---
  if (!given || given !== passphrase) {
    return res.status(401).json({ error: 'Not authorized' });
  }
  if (!text || !text.trim()) {
    return res.status(400).json({ error: 'Missing piece text' });
  }

  try {
    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1024,
        output_config: { format: { type: 'json_schema', schema: PALETTE_SCHEMA } },
        messages: [
          {
            role: 'user',
            content: `Read the tone and mood of this personal essay, then propose 4 distinct color palette concepts for it — the kind you'd use as slide-carousel background colors on Instagram.

For each palette give:
- label: a punchy 2-4 word mood description (e.g. "dusty rose, wry warmth", "near-black, grief and humor", "charcoal, absurdist chaos")
- baseColor: a background hex color matching that mood
- textColor: a hex color for text over that background, chosen for strong readability (usually near-white on dark backgrounds, near-black on light ones)

Make the 4 palettes meaningfully different from each other in mood and lightness, not just hue variations.

Essay:

${text}`,
          },
        ],
      }),
    });

    const data = await anthropicRes.json();

    if (!anthropicRes.ok) {
      return res.status(anthropicRes.status).json({ error: data?.error?.message || 'Anthropic API error' });
    }
    if (data.stop_reason === 'refusal') {
      return res.status(422).json({ error: 'Could not generate palettes for this text' });
    }

    const block = (data.content || []).find(b => b.type === 'text');
    const parsed = block ? JSON.parse(block.text) : null;
    if (!parsed?.palettes?.length) {
      return res.status(502).json({ error: 'No palettes returned' });
    }

    return res.json({ success: true, palettes: parsed.palettes });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
