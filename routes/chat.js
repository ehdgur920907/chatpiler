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

let login_ids = {};

// 채팅
router.get('/', (req, res) => {
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

module.exports = router;