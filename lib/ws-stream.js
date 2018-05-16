'use strict';

const WebSocket = require('ws');
const stream = require('readable-stream');
const url = require('url');

module.exports = class WSStream extends stream.Writable
{
	constructor(opts)
	{
		super();
		this.socket = new WebSocket(url.format(opts.url));

		this.socket.on('open', () =>
		{
			this.emit('connect');
		});

		this.socket.on('close', () =>
		{
			this.emit('close', null);
		});

		this.socket.on('error', err =>
		{
			this.emit('close', err);
		});
	}

	_write(event, encoding, callback)
	{
		this.socket.send(Buffer.from(event), {binary: true, mask: true}, callback);
	}
};
