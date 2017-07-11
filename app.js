const express = require('express');
const app = require('express')();
const session = require('express-session');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const mkdirp = require('mkdirp');
const http = require('http').Server(app);
const io = require('socket.io')(http);
const fs = require('fs');
const multer = require('multer');
const decompress = require('decompress');

mongoose.Promise = global.Promise;

const chat = require('./routes/chat');
const file = require('./routes/file');
const user = require('./routes/user');
const index = require('./routes/index');

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

app.use(express.static(__dirname + '/views/codemirror'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
  secret: '@$$%&ejdbvADFg^*(*%^',
  resave: false,
  saveUninitialized: true,
}));

app.use('/', index);
app.use('/file', file);
app.use('/user', user);
app.use('/chat', chat);

http.listen(3000, () => {
    console.log('listen on port: 3000.');
    mongoose.connect('mongodb://localhost/codigm', { useMongoClient: true });
});

module.exports = app;