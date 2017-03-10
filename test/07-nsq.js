/*global describe:true, it:true, before:true, after:true, beforeEach: true, afterEach:true */
'use strict';

var
	demand     = require('must'),
	http       = require('http'),
	Emitter    = require('../index')
	;

describe('nsq output', function()
{
	var mockNSQOpts = {
		uri: 'nsq://localhost:4334',
		topic: 'numbat',
	};

	var server;

	before(function(done)
	{
		server = http.createServer((req, res) =>
		{
			server.emit('metric', req);
			res.end();
		});
		server.listen(4334, done);
	});

	it('can construct an NSQ emitter', function(done)
	{
		var emitter = new Emitter(mockNSQOpts);
		emitter.on('ready', function()
		{
			emitter.client.constructor.name.must.equal('NSQStream');
			emitter.client.must.have.property('_write');
			emitter.client._write.must.be.a.function();
			done();
		});
		emitter.connect();
	});

	it('writes event objects to its socket over udp', function(done)
	{
		server.once('metric', function handleIncoming(req)
		{
			req.url.must.equal('/put?topic=numbat');
			done();
		});

		var emitter = new Emitter(mockNSQOpts);
		emitter.connect();
		emitter.metric({ name: 'test', value: 4 });
	});

	after(function(done)
	{
		server.close();
		done();
	});
});
