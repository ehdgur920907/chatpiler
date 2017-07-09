const app = require('express')();
const session = require('express-session');
const path = require('path');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const mkdirp = require('mkdirp');
const http = require('http').Server(app);
const io = require('socket.io')(http);
const fs = require('fs');
const multer = require('multer');
const cookieParser = require('cookie-parser');

mongoose.Promise = global.Promise;
const Schema = mongoose.Schema;
const ObjectId = Schema.ObjectId;

let login_ids = {};
let chat_logs = '';

let storage = multer.diskStorage({
	destination: (req, file, cb) => {
		cb(null, `${ req.session.user.email}/def`);
	},
	filename: (req, file, cb) => {
		cb(null, file.originalname);
	}
});
		
const upload = multer({ storage });

let userSchema = new Schema({
	id: ObjectId,
    email: String,
    nickname: String,
    password: String
});

let User = mongoose.model('User', userSchema);

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
  secret: '@$$%&ejdbvADFg^*(*%^',
  resave: false,
  saveUninitialized: true,
}));


// 기본 페이지
app.get('/', (req, res) => {
    if (req.session.user) {
        res.render('index.ejs', { user: req.session.user });
    } else {
        res.render('index.ejs');
    }
});


// 환영 페이지
app.get('/welcome', (req, res) => {
    res.render('welcome.ejs', { user: req.session.user });
});


// 마이 페이지
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
        nickname: req.body.nickname,
        password: req.body.password
    });
    
	User.findOne({ email: req.body.email }, (err, user) => {
		if (err) {
			console.log(err);
		}
		
		if (user) {
			console.log('your email is already on.');
			return res.render('signup.ejs')
		}
	});
	
	User.findOne({ nickname: req.body.nickname }, (err, user) => {
		if (err) {
			console.log(err);
		}
		
		if (user) {
			console.log('your nickname is already on.');
			return res.render('signup.ejs');
		}
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
		res.render('file.ejs', { user: req.session.user, });
		
		mkdirp(`./${ req.session.user.email }/def`, err => {
			if (err) {
				conosle.log(err);
			}
		});
	} else {
		res.render('signin.ejs');
	}
});

app.post('/file', upload.single('file'), (req, res) => {
	console.log(req.file);
});


// 채팅
app.get('/chat', (req, res) => {
	if (req.session.user) {
		res.render('chat.ejs', { user: req.session.user });
		
		io.once('connection', socket => {
			socket.on('login', data => {
				login_ids[data.nickname] = socket.id;
				socket.login_id = data.nickname;
				socket.nickname = data.nickname;
				io.emit('login', {
					nickname: data.nickname,
					logs: chat_logs
				});
			});
			
			socket.on('disconnect', () => {
				delete login_ids[socket.nickname];
				io.emit('logout', socket.nickname);
			});
			
			socket.on('chat', data => {
				if (data.to === 'all') {
					let message = {
						from: {
							nickname: socket.nickname,
						},
						message: data.message
					};
					chat_logs = data.logs;
					io.emit('chat', message);
				} else {
					if (login_ids[data.to]) {
						let message = {
							from: {
								nickname: data.to
							},
							message: data.message
						}
						io.sockets.connected[login_ids[data.to]].emit('whisper', message);
					}
				}
			});
		});
	} else {
		res.render('signin.ejs');
	}
})

http.listen(3000, () => {
    console.log('listen on port: 3000.');
    mongoose.connect('mongodb://localhost/database', { useMongoClient: true });
});