const express = require('express');
const router = express.Router();
const morgan = require('morgan');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');

const {BlogPosts} = require('./models');

const jsonParser = bodyParser.json();
const app = express();

// log the http layer
app.use(morgan('common'));

// Mongoose internally uses a promise-like object,
// but its better to make Mongoose use built in es6 promises
mongoose.Promise = global.Promise;

// config.js is where we control constants for entire
// app like PORT and DATABASE_URL
const { PORT, DATABASE_URL } = require('./config');
const { Blogpost } = require('./models');

// we're going to add some sample Blog Posts
// so there's some data to look at
// BlogPosts.create('CRUD applications', 'blog text', 'Sean');
// BlogPosts.create('Story 2', 'blog text 2', 'Meghan');



app.get('/blog-posts', (req, res) => {
	// res.json(BlogPosts.get());
  Blogpost 
    .find()
    .limit(10)
    .then(blogposts => {
      res.json({
        blogposts: blogposts.map(
          (blogpost) => blogpost.serialize())
      });
    })
    .catch(err => {
      console.error(err);
      res.status(500).json({ message: 'Internal server error'});
    });
});

app.get('/blog-posts/:id', (req, res) => {
  Blogpost
    .findById(req.params.id)
    .then(blogpost => res.json(blogpost.serialize()))
    .catch(err => {
      console.error(err);
      res.status(500).json({ message: 'Internal server error'});
    });
});

app.post('/blog-posts', jsonParser, (req, res) => {
  // console.log(req.body);
	const requiredFields = ['title', 'content', 'author'];
	for (let i=0; i<requiredFields.length; i++){
		const field = requiredFields[i];
		if (!(field in req.body)){
			const message = `Missing \`${field}\` in request body`;
      		console.error(message);
      		return res.status(400).send(message);
    	}
	}

  Blogpost 
    .create({
      title: req.body.title,
      content: req.body.content,
      author: req.body.author,
      created: req.body.created || Date.now()
    })
    .then(blogpost => res.status(201).json(blogpost.serialize()))
    .catch(err => {
      console.error(err);
      res.status(500).json({ message: 'Internal server error' });
    });
});

app.put('/blog-posts/:id', jsonParser, (req, res) => {

	if (req.params.id !== req.body.id) {
    const message = `Request path id (${req.params.id}) and request body id (${req.body.id}) must match`;
    console.error(message);
    return res.status(400).send(message);
  }
  console.log(`Updating blog post item \`${req.params.id}\``);
  
  const toUpdate = {};
  const updateableFields = ['title', 'content', 'author', 'created'];
  updateableFields.forEach(field => {
    toUpdate[field] = req.body[field]
  });

  Blogpost
  .findByIdAndUpdate(req.params.id, { $set: toUpdate })
  .then(blogpost => res.status(204).end())
  .catch(err => res.status(500).json({ message: 'Internal server error' }));
});


app.delete('/blog-posts/:id', (req, res) => {
  Blogpost
  .findByIdAndRemove(req.params.id)
  .then(blogpost => res.status(204).end())
  .catch(err => res.status(500).json({message: 'Internal server error'}));
});

// 	BlogPosts.delete(req.params.id);
//   	console.log(`Deleted Blog List item \`${req.params.ID}\``);
//   	res.status(204).end();
// });

// closeServer needs access to a server object, but that only
// gets created when `runServer` runs, so we declare `server` here
// and then assign a value to it in run
let server;

// this function connects to our database, then starts the server
function runServer(databaseUrl = DATABASE_URL, port = PORT) {

  return new Promise((resolve, reject) => {
    mongoose.connect(databaseUrl, {useMongoClient: true}, err => {
      if (err) {
        return reject(err);
      }
      server = app.listen(port, () => {
        console.log(`Your app is listening on port ${port}`);
        resolve();
      })
        .on('error', err => {
          mongoose.disconnect();
          reject(err);
        });
    });
  });
}

// this function closes the server, and returns a promise. we'll
// use it in our integration tests later.
function closeServer() {
  return mongoose.disconnect().then(() => {
    return new Promise((resolve, reject) => {
      console.log('Closing server');
      server.close(err => {
        if (err) {
          return reject(err);
        }
        resolve();
      });
    });
  });
}

// if server.js is called directly (aka, with `node server.js`), this block
// runs. but we also export the runServer command so other code (for instance, test code) can start the server as needed.
if (require.main === module) {
  runServer().catch(err => console.error(err));
}

module.exports = { app, runServer, closeServer };