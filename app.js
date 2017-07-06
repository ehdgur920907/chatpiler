const app = require('express')();
const session = require('express-session');
const path = require('path');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const http = require('http').Server(app);
const io = require('socket.io')(http);

const Schema = mongoose.Schema

let userSchema = new Schema({
    email: String,
    name: String,
    password: String
});

let User = mongoose.model('User', userSchema);

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
  secret: '@$$%&ejdbvADFg^*(*%^',
  resave: false,
  saveUninitialized: true,
}));


// 기본 화면
app.get('/', (req, res) => {
    if (req.session.user) {
        res.render('index.ejs', { user: req.session.user });
    } else {
        res.render('index.ejs');
    }
});

app.get('/welcome', (req, res) => {
    res.render('welcome.ejs', { user: req.session.user });
});


app.get('/my', (req, res) => {
    res.render('my.ejs', { user: req.session.user });
});

// 로그인
app.get('/signin', (req, res) => {
    res.render('signin.ejs');
});

app.post('/signin', (req, res) => {
    let signinUser = {
        email: req.body.email,
        password: req.body.password
    };
    
    User.findOne({ email: signinUser.email }, (err, user) => {
        if (err) {
            console.log(err);
        }
        
        if (!user) {
            console.log('cannot find user.');
            return res.render('signin.ejs');
        }
        
        if (signinUser.password !== user.password) {
            return res.render('signin.ejs');
        }
        
        req.session.user = user;
        req.session.save(() => {
            res.redirect('/welcome');
        });
    });
});


// 회원가입
app.get('/signup', (req, res) => {
    res.render('signup.ejs');
});

app.post('/signup', (req, res) => {
    let user = new User({
        email: req.body.email,
        name: req.body.name,
        password: req.body.password
    });
    
    user.save(err => {
        if (err) {
            conosle.log(err);
        }
        
        res.redirect('/signin');
    });
});


// 로그아웃
app.get('/signout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});


// 파일
app.get('/file', (req, res) => {
	if (req.session.user) {
		res.render('file.ejs', { user: req.session.user });
	} else {
		res.render('signin.ejs');
	}
});


// 채팅
app.get('/chat', (req, res) => {
	if (req.session.user) {
		res.render('chat.ejs', { user: req.session.user });
	} else {
		res.render('signin.ejs');
	}
})

http.listen(3000, () => {
    console.log('listen on port: 3000.');
    mongoose.connect('mongodb://localhost/database', { useMongoClient: true });
});