

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
        
		console.log(user);
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
    
	User.findOne({ email: req.body.email }, (err, user) => {
		if (err) {
			console.log(err);
		}
		
		if (user) {
			console.log('your email is already on.');
			return res.render('signup.ejs')
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