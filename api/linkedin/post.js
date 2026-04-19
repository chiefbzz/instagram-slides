export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { token, authorUrn, text, pdfBase64 } = req.body;

  if (!token || !authorUrn || !text) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    let mediaAsset = null;

    // If PDF is provided, upload it
    if (pdfBase64) {
      // Step 1: Register upload
      const registerRes = await fetch('https://api.linkedin.com/v2/assets?action=registerUpload', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          registerUploadRequest: {
            recipes: ['urn:li:digitalmediaRecipe:feedshare-document'],
            owner: `urn:li:person:${authorUrn}`,
            serviceRelationships: [
              {
                relationshipType: 'OWNER',
                identifier: 'urn:li:userGeneratedContent',
              },
            ],
          },
        }),
      });

      const registerData = await registerRes.json();

      if (!registerData.value) {
        return res.status(400).json({ error: 'Failed to register upload', details: registerData });
      }

      const uploadUrl = registerData.value.uploadMechanism['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'].uploadUrl;
      mediaAsset = registerData.value.asset;

      // Step 2: Upload the PDF
      const pdfBuffer = Buffer.from(pdfBase64, 'base64');
      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/pdf',
        },
        body: pdfBuffer,
      });

      if (!uploadRes.ok) {
        return res.status(400).json({ error: 'Failed to upload PDF' });
      }
    }

    // Step 3: Create the post
    const postBody = {
      author: `urn:li:person:${authorUrn}`,
      lifecycleState: 'DRAFT',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: { text },
          shareMediaCategory: mediaAsset ? 'NATIVE_DOCUMENT' : 'NONE',
          ...(mediaAsset
            ? {
                media: [
                  {
                    status: 'READY',
                    media: mediaAsset,
                    title: { text: 'Slides' },
                  },
                ],
              }
            : {}),
        },
      },
      visibility: {
        'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
      },
    };

    const postRes = await fetch('https://api.linkedin.com/v2/ugcPosts', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0',
      },
      body: JSON.stringify(postBody),
    });

    const postData = await postRes.json();

    if (!postRes.ok) {
      return res.status(postRes.status).json({ error: 'Failed to create post', details: postData });
    }

    res.json({ success: true, id: postData.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
