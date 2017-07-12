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
const soap = require('soap');

const url = 'http://ideone.com/api/1/service.wsdl';
let code = '#include <stdio.h> int main() { printf("hello, world!\n"); return 0;}';
let args = {
	user: 'ehdgur920907', 
	pass: 'mju12345',
	code,
	language: 11,
	input: '',
	run: true,
	pvt: false
}

soap.createClient(url, (err, client) => {
	client.createSubmission(args, (err, result) => {
		console.log(args);
		console.log(client);
		console.log(JSON.stringify(result));
	});
});

// Mongoose: mpromise (mongoose’s default promise library) is deprecated, plug in your own promise library instead: // http://mongoosejs.com/docs/promises.html” 경고창을 끄기 위해
mongoose.Promise = global.Promise;

// mongoose 스키마를 사용하고, 고유한 id 값을 위해
const Schema = mongoose.Schema;
const ObjectId = Schema.ObjectId;

// 사용자 스키마
let userSchema = new Schema({
	id: ObjectId,
    email: String,
    nickname: String,
    password: String,
	chat: String,
	file: [String]
});

// 사용자 스키마 모델
let User = mongoose.model('User', userSchema);


// 파일 업로드 위치와 본래 이름을 얻기 위한 것.
let storage = multer.diskStorage({
	destination: (req, file, cb) => {
		cb(null, `uploads/${ req.session.user.nickname }`);
	},
	filename: (req, file, cb) => {
		cb(null, file.originalname);
	}
});


// storage 변수를 통한 파일 업로드 변수
let upload = multer({ storage });

// 현재 소켓에 접속 중인 사람들의 로그인 id
let login_ids = {};

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

// 코드미러를 이용하기 위한 정작파일 로드
app.use(express.static(__dirname + '/views/codemirror'));

// post로 넘어온 값을 알기위해
app.use(bodyParser.urlencoded({ extended: true }));

// 세션 사용
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
	// 입력한 로그인 값을 받아온다.
    let signinUser = {
        email: req.body.email,
        password: req.body.password
    };
    
	// 데이터베이스에서 이메일을 통해 입력한 로그인 값의 이메일을 검색한다.
    User.findOne({ email: signinUser.email }, (err, user) => {
        if (err) {
            console.log(err);
        }
        
		// 데이터가 없다. 즉, 회원가입이 안 돼 있다.
        if (!user) {
            console.log('cannot find user.');
            return res.render('user/signin.ejs');
        }
        
		// 데이터가 있지만, 비밀번호가 틀리다.
        if (signinUser.password !== user.password) {
            return res.render('user/signin.ejs');
        }
		
		// 데이터도 있고, 비밀번호도 맞으면 세션에 검색한 user 객체를 넣어주고 저장한다.
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
	// 입력한 회원가입 값을 받아온다.
    let signupUser = new User({
        email: req.body.email,
        nickname: req.body.nickname,
        password: req.body.password,
    });
    
	// 입력한 회원가입 값 중 이메일 값을 통해 회원을 검색한다.
	User.findOne({ email: req.body.email }, (err, user) => {
		if (err) {
			console.log(err);
		}
		
		// 이메일은 유일해야하며, 데이터가 있으면 가입하지 못한다.
		if (user) {
			console.log('your email is already on.');
			return res.redirect('/user/signup');
		}
		
		// 입력한 회원가입 값 중 닉네임 값을 통해 회원을 검색한다.
		User.findOne({ nickname: req.body.nickname }, (err, user) => {
			if (err) {
				console.log(err);
			}
			
			// 닉네임 또한 유일해야한다. 데이터가 있으면 가입하지 못한다.
			if (user) {
				console.log('your nickname is already on.');
				return res.redirect('/user/signup');
			}
			
			// 이메일과 닉네임 모두 유니크하다면 회원가입을 완료한다.
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
	// 로그아웃 요청이 들어오면, 세션을 종료한다.
    req.session.destroy();
    res.redirect('/');
});





// 파일 업로드
app.get('/file/upload', (req, res) => {
	if (req.session.user) {
		res.render('file/file-upload.ejs', { user: req.session.user, });
		
		// 사용자가 file upload 페이지에 들어오게 되면,
		// 서버의 uploads 폴더 안에 자동으로 그 사용자의 닉네임으로 폴더가 만들어진다. 
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
	// 만약에 사용자가 업로드한 파일이 zip or tar 파일이라면
	if (req.file.filename.substring(req.file.filename.length - 3) === 'zip' || req.file.filename.substring(req.file.filename.length - 3) === 'tar') {
		// 그 파일을 'uploads/사용자 닉네임' 폴더 아래에 압축을 푼다.
		decompress(`./uploads/${ req.session.user.nickname }/${ req.file.filename }`, `./uploads/${ req.session.user.nickname }`).then(files => {
			// 압축을 푼 뒤에 나온 '파일'의 경로들을 사용자의 file 데이터베이스에 배열로 저장한다.
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
		// 만약에 사용자가 업로드한 파일이 zip or tar 파일이 아니라면 그냥 저장한다.
		User.update({ email: req.session.user.email }, { $push: { file: req.file.path }}, (err) => {
			if (err) {
				console.log(err);
			}
			res.redirect('/file/list');	
		});
	}
});

// 파일 리스트
app.get('/file/list', (req, res) => {
	// 사용자의 데이터베이스에서 file의 데이터 배열을 찾아서 넘겨준다.
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

// 파일 읽기
app.get('/file/read/:name', (req, res) => {
	// 사용자의 이메일을 통해 데이터베이스를 검색한다.
	User.findOne({ email: req.session.user.email }, (err, user) => {
		if (err) {
			console.log(err);
		}
		// 사용자의 데이터베이스에 있는 file 데이터 배열의 각 주소값을 substring해서 파일 이름을 얻어낸다.
		// name으로 넘어온 파일의 이름과 비교해서 같으면 그 파일을 data 값으로 넘겨준다.
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

// 파일 저장
app.post('/file/save/:name', (req, res) => {
	// 사용자의 이메일을 통해 데이터베이스를 검색한다.
	User.findOne({ email: req.session.user.email }, (err, user) => {
		if (err) {
			console.log(err);
		}
		// 사용자의 데이터베이스에 있는 file 데이터 배열의 각 주소값을 substring해서 파일 이름을 얻어낸다.
		// name으로 넘어온 파일의 이름과 비교해서 같으면 그 파일을 update한다.
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
				// 소켓이 연결되면, 로그인 id 배열에 접속 중인 사람의 nickname을 통해 socket id를 부여한다.
				login_ids[data.nickname] = socket.id;
				socket.login_id = data.nickname;
				socket.nickname = data.nickname;
				
				// 사용자의 데이터베이스에 chat값을 nickname값과 같이 넘겨준다.
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
			
			// 사용자가 소켓을 떠나면 로그인 id 배열에 그 사람의 nickname 값을 통해 socket id를 삭제한다.
			socket.on('disconnect', () => {
				delete login_ids[socket.nickname];
				io.emit('logout', socket.nickname);
			});
			
			socket.on('chat', data => {
				// 사용자가 전체 채팅을 한다.
				if (data.to === 'all') {
					let message = {
						from: {
							nickname: socket.nickname,
						},
						message: data.message
					};
					
					// 실시간으로 입력한 값을 사용자의 데이터베이스에 저장한다.
					User.update({ email: req.session.user.email }, { chat: data.logs }, (err) => {
						if (err) {
							consoleㅇ.log(err);
						}
					});
					io.emit('chat', message);
				} else {
					// 만약에 사용자가 귓속말하고 싶은 사람이 로그인 id 배열에 있다면
					if (login_ids[data.to]) {
						let message = {
							from: {
								nickname: data.to
							},
							message: data.message
						};
						
						// 실시간으로 입력한 값을 사용자의 데이터베이스에 저장한다.
						User.update({ email: req.session.user.email }, { chat: data.logs }, (err) => {
							if (err) {
								console.log(err);
							}
						});
						// 그 사람에게 귓속말을 한다.
						io.to(login_ids[data.to]).emit('whisper', message);
					} else {
						console.log('user is not on.');
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