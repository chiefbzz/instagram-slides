// Reads a published essay back out of the davebalter.com repo (chiefbzz/davebalter)
// so the StoryShelf tool can re-open it for editing. Returns the raw essay.md plus
// every photo in the essay folder as a data URL. Passphrase-gated (same as publish)
// so the GitHub token is never used as an open proxy.

const OWNER = 'chiefbzz';
const REPO = 'davebalter';
const BRANCH = 'main';
const GH = 'https://api.github.com';

function slugify(text) {
  return String(text).trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// Accept a bare slug, or a davebalter URL like https://davebalter.com/?essay=the-hand
function extractSlug(input) {
  const s = String(input || '').trim();
  const m = s.match(/[?&]essay=([^&\s]+)/);
  if (m) return slugify(decodeURIComponent(m[1]));
  return slugify(s);
}

function mimeFor(name) {
  const ext = name.split('.').pop().toLowerCase();
  if (ext === 'png') return 'image/png';
  if (ext === 'gif') return 'image/gif';
  if (ext === 'webp') return 'image/webp';
  return 'image/jpeg';
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const token = process.env.DAVEBALTER_GH_TOKEN;
  const passphrase = process.env.PUBLISH_PASSPHRASE;
  if (!token || !passphrase) {
    return res.status(500).json({ error: 'Server not configured (missing env vars)' });
  }

  const { passphrase: given, slug: rawSlug } = req.body || {};
  if (!given || given !== passphrase) return res.status(401).json({ error: 'Not authorized' });

  const slug = extractSlug(rawSlug);
  if (!slug) return res.status(400).json({ error: 'No slug provided' });

  const gh = (path) => fetch(`${GH}${path}`, {
    headers: {
      Authorization: `token ${token}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'storyshelf-import',
    },
  });

  try {
    // List the essay folder.
    const dirRes = await gh(`/repos/${OWNER}/${REPO}/contents/public/essays/${slug}?ref=${BRANCH}`);
    if (dirRes.status === 404) return res.status(404).json({ error: `No published story found for "${slug}"` });
    if (!dirRes.ok) return res.status(502).json({ error: 'Could not read essay folder', details: await dirRes.text() });
    const items = await dirRes.json();
    if (!Array.isArray(items)) return res.status(502).json({ error: 'Unexpected folder response' });

    const fileContent = async (name) => {
      const r = await gh(`/repos/${OWNER}/${REPO}/contents/public/essays/${slug}/${encodeURIComponent(name)}?ref=${BRANCH}`);
      if (!r.ok) throw new Error(`could not read ${name}`);
      const j = await r.json();
      if (j.content) return j.content.replace(/\n/g, ''); // base64
      // Fallback for large files: fetch the raw download URL.
      const raw = await fetch(j.download_url);
      const buf = Buffer.from(await raw.arrayBuffer());
      return buf.toString('base64');
    };

    let markdown = null;
    const photos = [];
    for (const it of items) {
      if (it.type !== 'file') continue;
      if (it.name === 'essay.md') {
        markdown = Buffer.from(await fileContent('essay.md'), 'base64').toString('utf8');
      } else if (/\.(jpe?g|png|gif|webp)$/i.test(it.name)) {
        const b64 = await fileContent(it.name);
        photos.push({ name: it.name, dataUrl: `data:${mimeFor(it.name)};base64,${b64}` });
      }
    }

    if (!markdown) return res.status(404).json({ error: 'No essay.md in that folder' });
    return res.json({ success: true, slug, markdown, photos });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
