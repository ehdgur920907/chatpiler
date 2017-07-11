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
const router = express.Router();

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

// 환영 페이지
router.get('/welcome', (req, res) => {
    res.render('user/welcome.ejs', { user: req.session.user });
});


// 마이 페이지
router.get('/my', (req, res) => {
    res.render('user/my.ejs', { user: req.session.user });
});


// 로그인
router.get('/signin', (req, res) => {
    res.render('user/signin.ejs');
});

router.post('/signin', (req, res) => {
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
router.get('/signup', (req, res) => {
    res.render('user/signup.ejs');
});

router.post('/signup', (req, res) => {
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
router.get('/signout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

module.exports = router;

