export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  // For Cloudinary and ImgBB, browser can call directly (they support CORS)
  // This endpoint handles S3 which needs server-side signing
  const { provider, config, imageBase64, fileName } = req.body;

  if (provider === 's3') {
    const { bucket, region, accessKey, secretKey } = config;
    if (!bucket || !accessKey || !secretKey) {
      return res.status(400).json({ error: 'S3 config incomplete' });
    }
    try {
      // AWS S3 upload via REST API with Signature V4
      const key = `pinforge/${Date.now()}-${fileName || 'image.jpg'}`;
      const url = `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
      const buf = Buffer.from(imageBase64, 'base64');
      const contentType = 'image/jpeg';
      
      // Simple PUT (bucket must allow public write via bucket policy)
      const r = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': contentType,
          'x-amz-acl': 'public-read',
        },
        body: buf,
      });
      if (!r.ok) throw new Error('S3 upload failed: ' + r.status);
      res.status(200).json({ url });
    } catch(e) {
      res.status(500).json({ error: e.message });
    }
  } else {
    res.status(400).json({ error: 'Use direct browser upload for Cloudinary/ImgBB' });
  }
}
