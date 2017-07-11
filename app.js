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






const Schema = mongoose.Schema;
const ObjectId = Schema.ObjectId;

let userSchema = new Schema({
	id: ObjectId,
    email: String,
    nickname: String,
    password: String,
	chat: String,
	file: [String]
});

let User = mongoose.model('User', userSchema);





let storage = multer.diskStorage({
	destination: (req, file, cb) => {
		cb(null, `uploads/${ req.session.user.nickname }`);
	},
	filename: (req, file, cb) => {
		cb(null, file.originalname);
	}
});
		
let upload = multer({ storage });


let login_ids = {};


mongoose.Promise = global.Promise;

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

app.use(express.static(__dirname + '/views/codemirror'));
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
app.get('/user/welcome', (req, res) => {
    res.render('user/welcome.ejs', { user: req.session.user });
});


// 마이 페이지
app.get('/user/my', (req, res) => {
    res.render('user/my.ejs', { user: req.session.user });
});


// 로그인
app.get('/user/signin', (req, res) => {
    res.render('user/signin.ejs');
});

app.post('/user/signin', (req, res) => {
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
            return res.render('user/signin.ejs');
        }
        
        if (signinUser.password !== user.password) {
            return res.render('user/signin.ejs');
        }
		
		req.session.user = user;
		req.session.save(() => {
			res.redirect('/user/welcome');
		});
    });
});


// 회원가입
app.get('/user/signup', (req, res) => {
    res.render('user/signup.ejs');
});

app.post('/user/signup', (req, res) => {
    let signupUser = new User({
        email: req.body.email,
        nickname: req.body.nickname,
        password: req.body.password,
    });
    
	User.findOne({ email: req.body.email }, (err, user) => {
		if (err) {
			console.log(err);
		}
		
		if (user) {
			console.log('your email is already on.');
			return res.redirect('/user/signup');
		}
		
		User.findOne({ nickname: req.body.nickname }, (err, user) => {
			if (err) {
				console.log(err);
			}

			if (user) {
				console.log('your nickname is already on.');
				return res.redirect('/user/signup');
			}
	
			signupUser.save(err => {
				if (err) {
					conosle.log(err);
				}
				res.redirect('/user/signin');
			});
		});
	});
});


// 로그아웃
app.get('/user/signout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});





// 파일
app.get('/file/upload', (req, res) => {
	if (req.session.user) {
		res.render('file/file-upload.ejs', { user: req.session.user, });
		
		mkdirp(`./uploads/${ req.session.user.nickname }`, err => {
			if (err) {
				conosle.log(err);
			}
		});
	} else {
		res.render('user/signin.ejs');
	}
});

app.post('/file/upload', upload.single('file'), (req, res) => {
	if (req.file.filename.substring(req.file.filename.length - 3) === 'zip' || req.file.filename.substring(req.file.filename.length - 3) === 'tar') {
		decompress(`./uploads/${ req.session.user.nickname }/${ req.file.filename }`, `./uploads/${ req.session.user.nickname }`).then(files => {
			files.forEach(item => {
				if (item.type === 'file') {
					User.update({ email: req.session.user.email }, { $push: { file: `uploads/${ req.session.user.nickname }/${ item.path }` }}, (err) => {
						if (err) {
							console.log(err);
						}
					});
				}
			});
			res.redirect('/file/list');
		});
	} else {
		User.update({ email: req.session.user.email }, { $push: { file: req.file.path }}, (err) => {
			if (err) {
				console.log(err);
			}
			res.redirect('/file/list');	
		});
	}
});

app.get('/file/list', (req, res) => {
	if (req.session.user) {
		User.findOne({ email: req.session.user.email }, (err, user) => {
			if (err) {
				console.log(err);
			}
			res.render('file/file-list.ejs', {
				file: user.file,
				user: req.session.user
			});
		});
	} else {
		res.render('user/signin.ejs');
	}
});

app.get('/file/read/:name', (req, res) => {
	User.findOne({ email: req.session.user.email }, (err, user) => {
		if (err) {
			console.log(err);
		}
		user.file.forEach(item => {
			if (item.substring(item.lastIndexOf('/') + 1) === req.params.name) {
				fs.readFile(item, 'utf8', (err, data) => {
					if (err) {
						console.log(err);
					}
					res.render('file/file-read.ejs', {
						user: req.session.user,
						name: req.params.name,
						data: data
					});
				});
			}
		});
	});
});

app.post('/file/save/:name', (req, res) => {
	User.findOne({ email: req.session.user.email }, (err, user) => {
		if (err) {
			console.log(err);
		}
		user.file.forEach(item => {
			if (item.substring(item.lastIndexOf('/') + 1) === req.params.name) {
				fs.writeFile(item, req.body.code, 'utf8', err => {
					if (err) {
						console.log(err);
					}
					res.redirect(`/file/read/${ req.params.name }`);
				});
			}
		});
	});
});





// 채팅
app.get('/chat', (req, res) => {
	if (req.session.user) {
		res.render('chat/chat.ejs', { user: req.session.user });
		
		io.once('connection', socket => {
			socket.on('login', data => {
				login_ids[data.nickname] = socket.id;
				socket.login_id = data.nickname;
				socket.nickname = data.nickname;
				User.findOne({ email: req.session.user.email }, (err, user) => {
					if (err) {
						console.log(err);
					}
					io.emit('login', {
						nickname: data.nickname,
						logs: user.chat
					});
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
					User.update({ email: req.session.user.email }, { chat: data.logs }, (err) => {
						if (err) {
							consoleㅇ.log(err);
						}
					});
					io.emit('chat', message);
				} else {
					if (login_ids[data.to]) {
						let message = {
							from: {
								nickname: data.to
							},
							message: data.message
						};
						User.update({ email: req.session.user.email }, { chat: data.logs }, (err) => {
							if (err) {
								console.log(err);
							}
						});
						io.to(login_ids[data.to]).emit('whisper', message);
					}
				}
			});
		});
	} else {
		res.render('user/signin.ejs');
	}
});

http.listen(3000, () => {
    console.log('listen on port: 3000.');
    mongoose.connect('mongodb://localhost/codigm', { useMongoClient: true });
});