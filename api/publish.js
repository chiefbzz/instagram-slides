// Publishes an essay to the davebalter.com repo (chiefbzz/davebalter) as a single
// atomic commit, which triggers Vercel to auto-deploy. Gated by a passphrase so the
// public StoryShelf tool can't be used to publish. All secrets are server-side env vars.

const OWNER = 'chiefbzz';
const REPO = 'davebalter';
const BRANCH = 'main';
// Valid commit author so Vercel accepts the deploy (GitHub noreply for chiefbzz).
const AUTHOR = { name: 'Dave Balter', email: '89278425+chiefbzz@users.noreply.github.com' };

const GH = 'https://api.github.com';

function slugify(text) {
  return String(text).trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const token = process.env.DAVEBALTER_GH_TOKEN;
  const passphrase = process.env.PUBLISH_PASSPHRASE;
  if (!token || !passphrase) {
    return res.status(500).json({ error: 'Server not configured (missing env vars)' });
  }

  const { passphrase: given, essayMarkdown, slug: rawSlug, title, photos } = req.body || {};

  // --- auth gate ---
  if (!given || given !== passphrase) {
    return res.status(401).json({ error: 'Not authorized' });
  }
  if (!essayMarkdown || !title) {
    return res.status(400).json({ error: 'Missing essay content or title' });
  }

  const slug = slugify(rawSlug || title);
  if (!slug) return res.status(400).json({ error: 'Could not derive a slug from the title' });

  const gh = (path, init = {}) => fetch(`${GH}${path}`, {
    ...init,
    headers: {
      Authorization: `token ${token}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'storyshelf-publish',
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
    },
  });

  try {
    // 1. base ref + tree
    const refRes = await gh(`/repos/${OWNER}/${REPO}/git/ref/heads/${BRANCH}`);
    if (!refRes.ok) return res.status(502).json({ error: 'Could not read repo ref', details: await refRes.text() });
    const baseSha = (await refRes.json()).object.sha;
    const baseCommit = await (await gh(`/repos/${OWNER}/${REPO}/git/commits/${baseSha}`)).json();
    const baseTreeSha = baseCommit.tree.sha;

    // 2. current index.json -> append slug (dedup)
    let slugs = [];
    const idxRes = await gh(`/repos/${OWNER}/${REPO}/contents/public/essays/index.json?ref=${BRANCH}`);
    if (idxRes.ok) {
      const idxJson = await idxRes.json();
      try { slugs = JSON.parse(Buffer.from(idxJson.content, 'base64').toString('utf8')); } catch { slugs = []; }
    }
    if (!slugs.includes(slug)) slugs.push(slug);
    const indexContent = JSON.stringify(slugs, null, 0) + '\n';

    // 3. create blobs for every file
    const mkBlob = async (content, encoding) => {
      const r = await gh(`/repos/${OWNER}/${REPO}/git/blobs`, {
        method: 'POST', body: JSON.stringify({ content, encoding }),
      });
      if (!r.ok) throw new Error('blob create failed: ' + await r.text());
      return (await r.json()).sha;
    };

    const treeItems = [];
    treeItems.push({ path: `public/essays/${slug}/essay.md`, mode: '100644', type: 'blob',
      sha: await mkBlob(essayMarkdown, 'utf-8') });
    treeItems.push({ path: 'public/essays/index.json', mode: '100644', type: 'blob',
      sha: await mkBlob(indexContent, 'utf-8') });
    for (const p of (photos || [])) {
      if (!p?.name || !p?.dataBase64) continue;
      treeItems.push({ path: `public/essays/${slug}/${p.name}`, mode: '100644', type: 'blob',
        sha: await mkBlob(p.dataBase64, 'base64') });
    }

    // 4. tree -> commit -> move ref
    const treeRes = await gh(`/repos/${OWNER}/${REPO}/git/trees`, {
      method: 'POST', body: JSON.stringify({ base_tree: baseTreeSha, tree: treeItems }),
    });
    if (!treeRes.ok) return res.status(502).json({ error: 'Tree create failed', details: await treeRes.text() });
    const newTreeSha = (await treeRes.json()).sha;

    const commitRes = await gh(`/repos/${OWNER}/${REPO}/git/commits`, {
      method: 'POST',
      body: JSON.stringify({
        message: `Publish essay: ${title}`,
        tree: newTreeSha,
        parents: [baseSha],
        author: AUTHOR,
        committer: AUTHOR,
      }),
    });
    if (!commitRes.ok) return res.status(502).json({ error: 'Commit failed', details: await commitRes.text() });
    const newCommitSha = (await commitRes.json()).sha;

    const updateRes = await gh(`/repos/${OWNER}/${REPO}/git/refs/heads/${BRANCH}`, {
      method: 'PATCH', body: JSON.stringify({ sha: newCommitSha }),
    });
    if (!updateRes.ok) return res.status(502).json({ error: 'Ref update failed', details: await updateRes.text() });

    return res.json({ success: true, slug, url: `https://davebalter.com/?essay=${slug}`, commit: newCommitSha });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
