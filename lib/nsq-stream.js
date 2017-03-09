'use strict';

const
	path    = require('path'),
	Request = require('request'),
	stream  = require('readable-stream'),
	util    = require('util')
	;

const NSQStream = module.exports = function NSQStream(opts)
{
	stream.Writable.call(this);

	if (!opts.uri.match(/\/put$/))
		opts.uri = path.join(opts.uri, 'put');

	this.defaults = {
		uri: opts.uri,
		method: 'post',
		qs: { topic: opts.topic || 'metrics' },
	};
	process.nextTick(this.emit.bind(this, 'connect')); // because our socket sure won't!
};
util.inherits(NSQStream, stream.Writable);

NSQStream.prototype._write = function _write(event, encoding, callback)
{
	const options = Object.assign({ body: JSON.stringify(event) }, this.defaults);
	Request(options, function(err, response, body)
	{
		callback(err);
	});
};
