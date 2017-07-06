$(() => {
	const socket = io.connect();
	
	socket.emit('connect', {
		name: <%= user.name %>,
		id: <%= user.id %>
	});
	
	socket.on('connect', data => {
		$('.chat').append(`<li>${ data } has joined.</li>`);
	});
	
	socket.on('chat', data => {
		$('.chat').append(`<li>${ data.from.name }: ${ data.message }</li>`);
	});
	
	$('#btn-chat').click(e => {
		e.preventDefault();
		socket.emit('chat', {
			message: $('#btn-input').val()
		});
		('#btn-input').val("");
	});
});