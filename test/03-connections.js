/*global describe:true, it:true, before:true, after:true, beforeEach: true, afterEach:true */
'use strict';

var
	demand     = require('must'),
	dgram      = require('dgram'),
	net        = require('net'),
	Emitter    = require('../index'),
	JSONStream = require('json-stream')
	;

describe('connections', function()
{
	var mockOpts = {
		uri: 'tcp://localhost:4333',
		app: 'testapp',
		node: 'node-1'
	};

	var mockServer, mockUDPServer;

	before(function(done)
	{
		var count = 0;
		function onConnection(socket)
		{
			var instream = new JSONStream();
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
	});

	it('calls connect() when constructed', function(done)
	{
		var emitter = Emitter(mockOpts);
		emitter.must.have.property('client');
		emitter.client.on('connect', function()
		{
			emitter.destroy();
			done();
		});
	});

	it('allows connect() to be called twice safely', function(done)
	{
		var emitter = new Emitter(mockOpts);
		emitter.client.on('connect', function()
		{
			emitter.connect();
			emitter.destroy();
			done();
		});
	});

	it('allows destroy() to be called twice safely', function(done)
	{
		var emitter = new Emitter(mockOpts);
		emitter.client.on('connect', function()
		{
			emitter.destroy();
			emitter.destroy();
			done();
		});
	});

	it('adds listeners for `connect`, `error`, and `close`', function(done)
	{
		var emitter = new Emitter(mockOpts);
		var listeners = emitter.client.listeners('connect');
		listeners.must.be.an.array();
		listeners.length.must.be.above(0);

		listeners = emitter.client.listeners('error');
		listeners.must.be.an.array();
		listeners.length.must.be.above(0);

		listeners = emitter.client.listeners('close');
		listeners.must.be.an.array();
		listeners.length.must.be.above(0);

		emitter.destroy();

		done();
	});

	it('reconnects on close', function(done)
	{
		var count = 0;
		var emitter = new Emitter(mockOpts);
		emitter.on('ready', function()
		{
			count++;
			if (count === 2)
			{
				emitter.destroy();
				done();
			}
		});

		emitter.client.end();
	});

	after(function(done)
	{
		mockUDPServer.close();
		mockServer.close();
		done();
	});
});
