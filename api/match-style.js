// Matches an archive story's look: Claude reads the original slide images and picks the
// closest font from the creator's list, plus where the text was italic, bold, colored or
// indented. It never rewrites the story: it returns exact phrases, and the client adds
// markup only around phrases it finds word-for-word in the draft.
// Gated by the same passphrase as publish/import/palette/posts.

const MODEL = 'claude-sonnet-5-5';

const SCHEMA = {
  type: 'object',
  properties: {
    font: { type: 'string', description: 'Exactly one name from the provided font list' },
    spans: {
      type: 'array',
      description: 'Phrases on the original slides that are styled differently from the body text',
      items: {
        type: 'object',
        properties: {
          slide: { type: 'integer', description: '1-based slide number the phrase appears on' },
          text: { type: 'string', description: 'The phrase exactly as written in the draft text for that slide' },
          italic: { type: 'boolean' },
          bold: { type: 'boolean' },
          color: { type: 'string', description: 'Hex like #A04438 when the phrase is a different color from the body text, else empty' },
        },
        required: ['slide', 'text', 'italic', 'bold', 'color'],
        additionalProperties: false,
      },
    },
    indents: {
      type: 'array',
      description: 'Lines on the original slides that are visibly indented from the left margin',
      items: {
        type: 'object',
        properties: {
          slide: { type: 'integer' },
          lineStart: { type: 'string', description: 'The first several words of the line, exactly as in the draft' },
          level: { type: 'integer', description: '1 for one indent step, 2 for a deeper one' },
        },
        required: ['slide', 'lineStart', 'level'],
        additionalProperties: false,
      },
    },
  },
  required: ['font', 'spans', 'indents'],
  additionalProperties: false,
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  const passphrase = process.env.PUBLISH_PASSPHRASE;
  if (!apiKey || !passphrase) {
    return res.status(500).json({ error: 'Server not configured (missing env vars)' });
  }

  const { passphrase: given, slides, texts, fonts } = req.body || {};
  if (!given || given !== passphrase) return res.status(401).json({ error: 'Not authorized' });
  if (!Array.isArray(slides) || !slides.length) return res.status(400).json({ error: 'No original slides' });

  // One labeled image + that slide's draft text per original slide (max 20).
  const content = [];
  slides.slice(0, 20).forEach((img, i) => {
    const m = /^data:(image\/[a-z]+);base64,(.+)$/.exec(img || '');
    if (!m) return;
    content.push({ type: 'text', text: `Slide ${i + 1}. Draft text for this slide:\n${(texts && texts[i]) || '(none)'}` });
    content.push({ type: 'image', source: { type: 'base64', media_type: m[1], data: m[2] } });
  });
  content.push({
    type: 'text',
    text: `These are the original rendered slides of a personal story, each followed by an image. The draft text is the same story, imported as plain text, so its styling was lost.

1. font: which font on the font list is the closest match to the body text on the slides? Answer with one name from this list, spelled exactly: ${(fonts || []).join(', ')}.
2. spans: every phrase that is styled differently from the body text: italic, bold, or a different color. Copy the phrase exactly as it appears in that slide's draft text (same words, punctuation and spelling as the draft, even if the slide differs). Leave out anything not in the draft text. Don't list plain body text.
3. indents: lines that start visibly further right than the body text, with the first several words copied exactly from the draft.

If nothing is styled, return empty lists.`,
  });

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 4096,
        output_config: { format: { type: 'json_schema', schema: SCHEMA } },
        messages: [{ role: 'user', content }],
      }),
    });
    const data = await r.json();
    if (!r.ok) return res.status(r.status).json({ error: data?.error?.message || 'Anthropic API error' });
    const block = (data.content || []).find(b => b.type === 'text');
    const parsed = block ? JSON.parse(block.text) : null;
    if (!parsed) return res.status(502).json({ error: 'No style returned' });
    if (!(fonts || []).includes(parsed.font)) parsed.font = '';
    return res.json({ success: true, ...parsed });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
