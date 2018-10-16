'use strict';

const squeaky = require('squeaky');
const stream = require('readable-stream');

module.exports = class NSQStream extends stream.Writable
{
	constructor(opts)
	{
		super();

		this.client = new squeaky.Publisher({ host: opts.parsed.hostname, port: opts.parsed.port });
		this.topic = opts.topic || 'metrics';
		this.skipStringify = true;
		process.nextTick(() =>
		{
			this.emit('connect');
		});
	}

	unref()
	{
		this.client.unref();
	}

	_write(event, encoding, callback)
	{
		this.client.publish(this.topic, JSON.parse(event)).then(() => callback()).catch(callback);
	}
};
