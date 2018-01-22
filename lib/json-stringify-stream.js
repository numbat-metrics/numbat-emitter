'use strict';

const stream = require('readable-stream');

module.exports = class JSONStringifyStream extends stream.Transform
{
	constructor(options)
	{

		super({
			readableObjectMode: false,
			writableObjectMode: true,
			highWaterMark: options.highWaterMark
		});
	}

	_transform(chunk, enc, ready)
	{
		return ready(null, JSON.stringify(chunk) + '\n');
	}
};
