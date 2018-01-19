/*global describe:true, it:true, before:true, after:true, beforeEach: true, afterEach:true */
'use strict';

const
	demand  = require('must'),
	Emitter = require('../index')
	;

describe('createClient()', function()
{
	it('parses the tcp uri option', function(done)
	{
		const opts = { uri: 'tcp://localhost:5000', app: 'foo'};
		const e = new Emitter(opts);
		e.options.host.must.equal('localhost');
		e.options.port.must.equal('5000');
		done();
	});

	it('parses the udp uri option', function(done)
	{
		const opts = { uri: 'udp://localhost:5000', app: 'foo'};
		const e = new Emitter(opts);
		e.options.host.must.equal('localhost');
		e.options.port.must.equal('5000');
		done();
	});

	it('parses the socket uri option', function()
	{
		const opts = { uri: 'socket:/tmp/foo.sock', app: 'foo'};
		const e = new Emitter(opts);
		e.options.path.must.equal('/tmp/foo.sock');
	});

	it('parses the ws uri option', function(done)
	{
		const opts = { uri: 'ws://localhost:5000', app: 'foo'};
		const e = new Emitter(opts);
		e.options.url.hostname.must.equal('localhost');
		e.options.url.port.must.equal('5000');
		e.options.must.not.have.property('udp');
		done();
	});

	it('parses the wss (secure) uri option', function(done)
	{
		const opts = { uri: 'wss://localhost:5000', app: 'foo'};
		const e = new Emitter(opts);
		e.options.url.hostname.must.equal('localhost');
		e.options.url.port.must.equal('5000');
		e.options.must.not.have.property('udp');
		done();
	});

	it('throws when given an unsupported uri', function()
	{
		function shouldThrow()
		{
			return new Emitter({ uri: 'http://example.com', app: 'foo'});
		}
		shouldThrow.must.throw(/unsupported destination uri/);
	});
});
