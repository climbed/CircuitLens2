const express = require('express');
const multer = require('multer');
const Replicate = require('replicate');
const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const stream = require('stream');
const router = express.Router();
const upload = multer({ dest: '/tmp' });

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN
});

// help convert readableStream to buffer
async function readableStreamToBuffer(readableStream) {
  const reader = readableStream.getReader();
  let chunks = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(Buffer.from(value));
  }
  return Buffer.concat(chunks);
}

router.post('/', upload.single('image'), async (req, res) => {
  try {
    // uploads image to Cloudinary api
    const uploadRes = await cloudinary.uploader.upload(req.file.path, { resource_type: 'image' });
    const imageUrl = uploadRes.secure_url;
    fs.unlink(req.file.path, () => {}); // cleans temp file

    // prepares replicate input
    const input = {
      prompt: req.body.prompt,
      input_image: imageUrl, // flux kontext paramaters vv
      guidance_scale: 3.5, 
      num_inference_steps: 50, 
      preserve_composition: true 
    };

    // 
    const output = await replicate.run( // runs api
      "black-forest-labs/flux-kontext-pro",
      { input }
    );
    console.log('Replicate output type:', typeof output, 'Output:', output); //was using to debug

    //output handling
    if (Array.isArray(output) && output[0]) {
      // if array of urls
      const outputUrl = output[0];
      const cloudinaryRes = await cloudinary.uploader.upload(outputUrl, { resource_type: 'image', format: 'webp' });
      res.json({ image_url: cloudinaryRes.secure_url });
    } else if (typeof output === 'string') {
      // if single url
      const cloudinaryRes = await cloudinary.uploader.upload(output, { resource_type: 'image', format: 'webp' });
      res.json({ image_url: cloudinaryRes.secure_url });
    } else if (output && typeof output.getReader === 'function') {
      // if readableStream
      const buffer = await readableStreamToBuffer(output);
      cloudinary.uploader.upload_stream(
        { resource_type: 'image', format: 'webp' },
        (error, result) => {
          if (error) {
            return res.status(500).json({ error: error.message });
          }
          res.json({ image_url: result.secure_url });
        }
      ).end(buffer);
    } else {
      return res.status(500).json({ error: 'Unexpected output format from Replicate model.' });
    }
  } catch (err) {
    console.error('Error during image editing:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
