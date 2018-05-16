/*global describe:true, it:true, before:true, after:true, beforeEach: true, afterEach:true */
'use strict';

const
	demand     = require('must'),
	dgram      = require('dgram'),
	net        = require('net'),
	os         = require('os'),
	Emitter    = require('../index'),
	JSONStream = require('json-stream')
	;

describe('constructor', function(done)
{
	const mockOpts = {
		uri: 'tcp://localhost:4333',
		app: 'testapp',
		node: 'node-1'
	};

	const mockUDPOpts = {
		uri: 'udp://localhost:4334',
		app: 'testapp',
	};

	const mockSockOpts = {
		uri: 'sock:/tmp/foobar.sock',
		app: 'testapp'
	};

	let mockServer, mockUDPServer, mockSockServer;

	before(function(done)
	{
		let count = 0;
		function onConnection(socket)
		{
			const instream = new JSONStream();
			socket.pipe(instream);
			instream.on('data', function(data)
			{
				mockServer.emit('received', data);
			});
		}

		mockServer = net.createServer(onConnection);
		mockServer.listen(4333, function()
		{
			count++;
			if (count === 2) done();
		});

		mockUDPServer = dgram.createSocket('udp4');
		mockUDPServer.on('listening', function()
		{
			count++;
			if (count === 2) done();
		});
		mockUDPServer.on('message', function(msg, rinfo)
		{
			mockUDPServer.emit('received', JSON.parse(msg));
		});
		mockUDPServer.bind(4334);

		mockSockServer = net.createServer(onConnection);
		mockSockServer.listen('/tmp/foobar.sock', function()
		{
			count++;
			if (count === 2) done();
		});
	});

	it('requires an options object', function(done)
	{
		function shouldThrow() { return new Emitter(); }
		shouldThrow.must.throw(/options/);
		done();
	});

	it('requires at least one of path or uri', function(done)
	{
		function shouldThrow() { return new Emitter({ }); }
		shouldThrow.must.throw(/output uri or/);
		done();
	});

	it('can be constructed', function(done)
	{
		const emitter = new Emitter(mockOpts);
		emitter.must.be.an.object();

		emitter.must.have.property('options');
		emitter.options.must.be.an.object();
		emitter.options.host.must.equal('localhost');
		emitter.options.port.must.equal('4333');

		emitter.must.have.property('defaults');
		emitter.defaults.must.be.an.object();

		emitter.must.have.property('backlog');
		emitter.backlog.must.be.an.array();

		emitter.destroy();
		done();
	});

	it('calls parseURI() when given a uri option', function()
	{
		const e = new Emitter({ uri: 'sock:/tmp/foobar.sock', app: 'test' });
		e.must.have.property('options');
		e.options.must.have.property('path');
		e.destroy();
	});

	it('defaults `app` to `numbat`', function()
	{
		const e = new Emitter({ uri: 'sock:/tmp/foobar.sock' });
		e.must.have.property('app');
		e.app.must.equal('numbat');
		e.destroy();
	});

	it('adds the host name to its default fields', function()
	{
		const e = new Emitter({ uri: 'sock:/tmp/foobar.sock', app: 'test' });
		e.defaults.must.have.property('host');
		e.defaults.host.must.equal(os.hostname());
		e.destroy();
	});

	it('has some global emitter functions and stuff', function()
	{
		Emitter.must.have.property('setGlobalEmitter');
		Emitter.setGlobalEmitter.must.be.a.function();
		Emitter.must.have.property('getGlobalEmitter');
		Emitter.getGlobalEmitter.must.be.a.function();

		const first = Emitter.getGlobalEmitter();
		demand(first).be.falsy();
		const emitter = new Emitter(mockUDPOpts);
		Emitter.setGlobalEmitter(emitter);
		Emitter.getGlobalEmitter().must.equal(emitter);
		emitter.destroy();
		Emitter.setGlobalEmitter();
	});

	after(function(done)
	{
		mockUDPServer.close();
		mockServer.close();
		mockSockServer.close();
		done();
	});
});
