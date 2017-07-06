const app = require('express')();
const session = require('express-session');
const path = require('path');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const http = require('http').Server(app);
const io = require('socket.io')(http);
const db = mongoose.connection;

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
  secret: '@$$%&ejdbvADFg^*(*%^',
  resave: false,
  saveUninitialized: true,
}));

app.get('/', (req, res) => {
    res.render('index.ejs');
});

app.get('/signin', (req, res) => {
    res.render('signin.ejs');
});

app.get('/signup', (req, res) => {
    res.render('signup.ejs');
});

app.post('/signin', (req, res) => {
    
});
app.post('/signup', (req, res) => {
    let user = {
        email: req.body.email,
        name: req.body.name,
        age: req.body.age,
        password: req.body.password
    };
    
    console.log(user);
});

io.on('connection', socket => {
    console.log('user conneted.');
});

http.listen(3000, () => {
    console.log('listen on port: 3000.');
    db.on('error', console.error);
    db.once('open', () => {
        console.log('conneted with mongoose');
    });
});