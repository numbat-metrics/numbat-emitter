var stream = require('readable-stream');

module.exports = function createSerializer(options)
{
	var opts = {
		readableObjectMode: false,
		writableObjectMode: true,
		highWaterMark: options.highWaterMark
	};
	var transformer = new stream.Transform(opts);

	transformer._transform = function(chunk, enc, ready)
	{
		return ready(null, JSON.stringify(chunk) + '\n');
	};

	return transformer;
};
