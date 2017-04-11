/*global describe:true, it:true, before:true, after:true, beforeEach: true, afterEach:true */
'use strict';

var
	demand     = require('must'),
	net        = require('net'),
	Emitter    = require('../index'),
	JSONStream = require('json-stream')
	;

describe('backpressure', function()
{
	var mockOpts = {
		uri: 'tcp://localhost:4335',
		app: 'testapp',
		node: 'node-1',
	};

	var mockServer;

	before(function(done)
	{
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
		mockServer.listen(4335, done);
	});

	it('sends its backlog when connected', function(done)
	{
		var count = 0;
		function observer(d)
		{
			count++;
			if (count === 1)
				d.name.must.equal('testapp.test.splort');

			if (count === 2)
			{
				d.name.must.equal('testapp.test.latency');
				mockServer.removeListener('received', observer);
				emitter.destroy();
				done();
			}
		}
		mockServer.on('received', observer);

		var emitter = new Emitter(mockOpts);

		function fillBacklog()
		{
			emitter.removeListener('close', fillBacklog);
			emitter.metric({ name: 'test.splort', value: 4 });
			emitter.metric({ name: 'test.latency', value: 30 });
		}

		emitter.on('close', fillBacklog);
		var orig = emitter.connect.bind(emitter);
		emitter.connect = function() { setTimeout(orig, 300); };
		emitter.client.end();
	});

	it('sends normally when connected', function(done)
	{
		var emitter = new Emitter(mockOpts);
		emitter.on('ready', function()
		{
			emitter.metric({ name: 'testapp.splort', value: 4 });
			emitter.metric({ name: 'testapp.latency', value: 30 });
		});

		var count = 0;
		function observer(d)
		{
			count++;
			switch (count)
			{
			case 1:
				d.name.must.equal('testapp.splort');
				break;
			case 2:
				d.name.must.equal('testapp.latency');
				mockServer.removeListener('received', observer);
				emitter.destroy();
				done();
				break;
			}
		}
		mockServer.on('received', observer);

		emitter.connect();
	});

	it('destroy can be safely called before connect', function(done)
	{
		var emitter = new Emitter(mockOpts);
		emitter.destroy();
		done();
	});

	after(function(done)
	{
		mockServer.close();
		process.nextTick(done);
	});
});
