// Drafts the copy that goes around each week's story: the LinkedIn carousel post (two
// options), its first comment, an Instagram caption, a Substack subtitle, and the line
// that accompanies a LinkedIn newsletter issue. Written to Dave's own voice rules.
// Gated by the same passphrase as publish/import/palette, so the public StoryShelf
// tool can't run up API costs. All secrets are server-side env vars.

const MODEL = 'claude-sonnet-5';
const SUBSTACK = 'drclot.substack.com';

const POSTS_SCHEMA = {
  type: 'object',
  properties: {
    linkedin_posts: {
      type: 'array',
      items: { type: 'string' },
      description: 'Two distinct options for the post that accompanies the PDF carousel',
    },
    linkedin_first_comment: { type: 'string' },
    instagram_caption: { type: 'string' },
    substack_subtitle: { type: 'string' },
    newsletter_share: { type: 'string' },
  },
  required: ['linkedin_posts', 'linkedin_first_comment', 'instagram_caption', 'substack_subtitle', 'newsletter_share'],
  additionalProperties: false,
};

const VOICE = `Dave Balter writes true personal stories, one a week. His voice: direct, warm, a little irreverent. A storyteller first — he leads with specific moments, not abstractions. He doesn't moralize or wrap things up neatly. Short sentences when something matters. Vulnerable but never performing it. He must never sound like a LinkedIn thought leader: no "here's what I learned", no lessons, no hustle language, no emoji strings, no hashtag walls.`;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  const passphrase = process.env.PUBLISH_PASSPHRASE;
  if (!apiKey || !passphrase) {
    return res.status(500).json({ error: 'Server not configured (missing env vars)' });
  }

  const { passphrase: given, title, text } = req.body || {};
  if (!given || given !== passphrase) return res.status(401).json({ error: 'Not authorized' });
  if (!text || !text.trim()) return res.status(400).json({ error: 'Missing piece text' });

  const prompt = `${VOICE}

Here is this week's story${title ? `, titled "${title}"` : ''}. Write the copy that goes around it. Quote or paraphrase only what is actually in the story; never invent details.

1. linkedin_posts — two different options for the post that accompanies the story's PDF slide carousel on LinkedIn. Each 3-5 sentences, conversational, not corporate. Must NOT start with the word "I" (LinkedIn buries those). Open with a specific moment or line from the story. End with a question or an invitation to respond. No links (the link goes in the first comment). No hashtags.
2. linkedin_first_comment — one short line posted as the first comment, pointing to ${SUBSTACK} where a story like this arrives every Tuesday.
3. instagram_caption — for the Instagram slide carousel. 2-4 short sentences in the same voice, then a line pointing to the link in bio. At most 3 relevant hashtags at the very end, or none.
4. substack_subtitle — one line under the title on Substack, under 110 characters. A hook drawn from the story, not a summary.
5. newsletter_share — 1-3 sentences to accompany the story when it's published as an issue of his LinkedIn newsletter "Mostly True Stories". Must not start with "I".

Story:

${text}`;

  try {
    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 2000,
        output_config: { format: { type: 'json_schema', schema: POSTS_SCHEMA } },
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    const data = await anthropicRes.json();
    if (!anthropicRes.ok) return res.status(anthropicRes.status).json({ error: data?.error?.message || 'Anthropic API error' });
    if (data.stop_reason === 'refusal') return res.status(422).json({ error: 'Could not write posts for this text' });

    const block = (data.content || []).find(b => b.type === 'text');
    const parsed = block ? JSON.parse(block.text) : null;
    if (!parsed?.linkedin_posts?.length) return res.status(502).json({ error: 'No posts returned' });

    // Belt and braces on the one hard rule: never open a LinkedIn post with "I".
    parsed.linkedin_posts = parsed.linkedin_posts.filter(p => !/^\s*I\b/.test(p));
    return res.json({ success: true, posts: parsed });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
