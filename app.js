let app = require('express')();
let http = require('http').Server(app);
let io = require('socket.io')(http);

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/app.html');
});

io.on('connection', socket => {
    console.log('user conneted.');
});

http.listen(3000, () => {
    console.log('listen on port: 3000.');
});