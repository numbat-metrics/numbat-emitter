'use strict';

const dgram = require('dgram');
const stream = require('readable-stream');

module.exports = class UDPStream extends stream.Writable
{
	constructor(opts)
	{
		super();
		this.socket = dgram.createSocket('udp4');
		this.host = opts.host;
		this.port = opts.port;

		process.nextTick(this.emit.bind(this, 'connect')); // because our socket sure won't!
	}

	_write(event, encoding, callback)
	{
		const payload = new Buffer(event);
		this.socket.send(payload, 0, payload.length, this.port, this.host, callback);
	}
};
