/*global describe:true, it:true, before:true, after:true, beforeEach: true, afterEach:true */
'use strict';

var
	demand     = require('must'),
	dgram      = require('dgram'),
	Emitter    = require('../index')
	;

describe('udp output', function()
{
	const mockUDPOpts = {
		uri: 'udp://localhost:4334',
		app: 'testapp',
	};

	var mockUDPServer;

	before(function(done)
	{
		mockUDPServer = dgram.createSocket('udp4');
		mockUDPServer.on('listening', done);
		mockUDPServer.on('message', function(msg, rinfo)
		{
			mockUDPServer.emit('received', JSON.parse(msg));
		});
		mockUDPServer.bind(4334);
	});

	it('can construct a UDP emitter', function(done)
	{
		var emitter = new Emitter(mockUDPOpts);
		emitter.on('ready', function()
		{
			emitter.client.constructor.name.must.equal('UDPStream');
			done();
		});
		emitter.connect();
	});

	it('writes event objects to its socket over udp', function(done)
	{
		function observer(d)
		{
			d.must.be.an.object();
			d.must.have.property('host');
			d.must.have.property('time');
			d.value.must.equal(4);
			mockUDPServer.removeListener('received', observer);
			done();
		}

		mockUDPServer.on('received', observer);
		var emitter = new Emitter(mockUDPOpts);
		emitter.connect();
		emitter.metric({ name: 'test', value: 4 });
	});

	after(function(done)
	{
		mockUDPServer.close();
		done();
	});
});
