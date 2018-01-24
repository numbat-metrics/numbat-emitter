'use strict';

const Squeaky = require('squeaky');
const stream = require('readable-stream');

module.exports = class NSQStream extends stream.Writable
{
	constructor(opts)
	{
		super();

		this.client = new Squeaky({ host: opts.parsed.hostname, port: opts.parsed.port });
		this.topic = opts.topic || 'metrics';
		this.skipStringify = true;
		process.nextTick(() =>
		{
			this.emit('connect');
		});
	}

	unref()
	{
		this.client.on('writer.ready', () =>
		{
			this.client.connections.get('writer').socket.unref();
		});
	}

	_write(event, encoding, callback)
	{
		this.client.publish(this.topic, JSON.parse(event)).then(() => callback()).catch(callback);
	}
};
