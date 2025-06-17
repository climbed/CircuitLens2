const express = require('express');
const RunwayML = require('@runwayml/sdk').default;
const router = express.Router();

const client = new RunwayML();

router.post('/', async (req, res) => {
  try {
    const { imageUrl, promptText = '', model = 'gen4_turbo', ratio = '1280:720', duration = 5 } = req.body;

    // starts video gen
    const imageToVideo = await client.imageToVideo.create({
      model,
      promptImage: imageUrl,
      promptText,
      ratio,
      duration,
    });

    const taskId = imageToVideo.id;

    // polls until complete
    let task;
    do {
      await new Promise(resolve => setTimeout(resolve, 10000)); // 10 seconds
      task = await client.tasks.retrieve(taskId);
    } while (!['SUCCEEDED', 'FAILED'].includes(task.status));

    if (task.status === 'SUCCEEDED') {
      console.log('Task object:', task); //was using to debug
      //returns video URL from task.output[0]
      res.json({ video_url: task.output[0] });
    } else {
      res.status(500).json({ error: 'Video generation failed' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
