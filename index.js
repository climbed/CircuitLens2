const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json()); // to parse json

app.use(express.static(path.join(__dirname)));


// home is /
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// about page is /about
app.get('/about', (req, res) => {
  res.sendFile(path.join(__dirname, 'about.html'));
});


//example page is /examples
app.get('/examples', (req, res) => {
  res.sendFile(path.join(__dirname, 'examples.html'));
});



// routes for api
const transcribe = require('./api/transcribe');
app.use('/api/transcribe', transcribe);

const editImage = require('./api/edit-image');
app.use('/api/edit-image', editImage);

const imageToVideo = require('./api/image-to-video');
app.use('/api/image-to-video', imageToVideo);



// starts server on port 3000
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

app.get('/ping', (req, res) => res.send('pong')); //was used for debugging -- was having difficulty getting server to run originally