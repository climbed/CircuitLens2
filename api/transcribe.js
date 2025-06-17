
const express = require('express');
const multer = require('multer');
const axios = require('axios');
const fs = require('fs');
const router = express.Router();
const upload = multer({ dest: '/tmp' }); // originally coded this on replit -- they use /tmp for temp files

// assemblyai api key stored in .env for privacy
const ASSEMBLYAI_API_KEY = process.env.ASSEMBLYAI_API_KEY;

router.post('/', upload.single('audio'), async (req, res) => {
  try {
    // uploads audio to assemblyai
    const audioData = fs.readFileSync(req.file.path);
    const uploadRes = await axios({
      method: 'post',
      url: 'https://api.assemblyai.com/v2/upload',
      headers: {
        authorization: ASSEMBLYAI_API_KEY,
        'transfer-encoding': 'chunked'
      },
      data: audioData
    });

    // requests the transcript
    const transcriptRes = await axios({
      method: 'post',
      url: 'https://api.assemblyai.com/v2/transcript',
      headers: { authorization: ASSEMBLYAI_API_KEY, 'content-type': 'application/json' },
      data: { audio_url: uploadRes.data.upload_url }
    });

    // polls until complete
    let transcript;
    while (true) {
      const pollingRes = await axios({
        method: 'get',
        url: `https://api.assemblyai.com/v2/transcript/${transcriptRes.data.id}`,
        headers: { authorization: ASSEMBLYAI_API_KEY }
      });
      if (pollingRes.data.status === 'completed') {
        transcript = pollingRes.data.text;
        break;
      } else if (pollingRes.data.status === 'failed') {
        return res.status(500).json({ error: 'Transcription failed' });
      }
      await new Promise(r => setTimeout(r, 3000));
    }

    res.json({ text: transcript });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
