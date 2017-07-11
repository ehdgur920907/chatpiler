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

let storage = multer.diskStorage({
	destination: (req, file, cb) => {
		cb(null, `uploads/${ req.session.user.nickname }`);
	},
	filename: (req, file, cb) => {
		cb(null, file.originalname);
	}
});
		
let upload = multer({ storage });

// 파일
router.get('/upload', (req, res) => {
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

router.post('/upload', upload.single('file'), (req, res) => {
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

router.get('/list', (req, res) => {
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

router.get('/read/:name', (req, res) => {
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

router.post('/save/:name', (req, res) => {
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

module.exports = router;