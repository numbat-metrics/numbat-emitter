/*global describe:true, it:true, before:true, after:true, beforeEach: true, afterEach:true */
'use strict';

var
	demand     = require('must'),
	dgram      = require('dgram'),
	net        = require('net'),
	os         = require('os'),
	Emitter    = require('./index'),
	JSONStream = require('json-stream')
;

describe('numbat-emitter', function()
{
	var mockOpts =
	{
		host: 'localhost',
		port: 4333,
		app: 'node-1'
	};

	var mockUDPOpts =
	{
		uri: 'udp://localhost:4334',
		app: 'node-1'
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
			if (count == 2) done();
		});

		mockUDPServer = dgram.createSocket('udp4');
		mockUDPServer.on('listening', function()
		{
			count++;
			if (count == 2) done();
		});
		mockUDPServer.on('message', function(msg, rinfo)
		{
			mockUDPServer.emit('received', JSON.parse(msg));
		});
		mockUDPServer.bind(4334);
	});

	describe('parseURI()', function()
	{
		it('parses the tcp uri option', function(done)
		{
			var opts = { uri: 'tcp://localhost:5000', app: 'foo'};
			var result = Emitter.parseURI(opts);
			opts.host.must.equal('localhost');
			opts.port.must.equal('5000');
			opts.must.not.have.property('udp');
			opts.must.not.have.property('uri');
			done();
		});

		it('parseURI() parses the udp uri option', function(done)
		{
			var opts = { uri: 'udp://localhost:5000', app: 'foo'};
			var result = Emitter.parseURI(opts);
			opts.host.must.equal('localhost');
			opts.port.must.equal('5000');
			opts.udp.must.be.true();
			done();
		});

		it('parseURIparses the socket uri option', function()
		{
			var opts = { uri: 'socket:/tmp/foo.sock', app: 'foo'};
			var result = Emitter.parseURI(opts);
			result.path.must.equal('/tmp/foo.sock');
		});

		it('throws when given an unsupported uri', function()
		{
			function shouldThrow() { return Emitter.parseURI({ uri: 'http://example.com', app: 'foo'}); }
			shouldThrow.must.throw(/unsupported destination uri/);
		});
	});

	describe('constructor', function(done)
	{
		it('requires an options object', function(done)
		{
			function shouldThrow() { return new Emitter(); }
			shouldThrow.must.throw(/options/);
			done();
		});

		it('requires a host & port option', function(done)
		{
			function shouldThrow() { return new Emitter({ host: 'example.com' }); }
			shouldThrow.must.throw(/host/);
			done();
		});

		it('requires a path option otherwise', function(done)
		{
			function shouldThrow() { return new Emitter({ path: '/tmp/numbat.sock' }); }
			shouldThrow.must.throw(/app/);
			done();
		});

		it('requires an app name option', function()
		{
			function shouldThrow() { return new Emitter({ host: 'localhost', port: 4000 }); }
			shouldThrow.must.throw(/app/);
		});

		it('can be constructed', function(done)
		{
			var emitter = new Emitter(mockOpts);
			emitter.must.be.an.object();

			emitter.must.have.property('options');
			emitter.options.must.be.an.object();
			emitter.options.must.equal(mockOpts);

			emitter.must.have.property('defaults');
			emitter.defaults.must.be.an.object();

			emitter.must.have.property('backlog');
			emitter.backlog.must.be.an.array();

			emitter.destroy();
			done();
		});

		it('uses a node option as the app option if it must', function()
		{
			var emitter = new Emitter(
			{
				uri: 'udp://localhost:4334',
				node: 'node-1'
			});

			emitter.defaults.must.have.property('app');
			emitter.defaults.app.must.equal('node-1');
		});

		it('calls parseURI() when given a uri option', function()
		{
			var e = new Emitter({ uri: 'sock:/tmp/foobar.sock', app: 'test' });
			e.must.have.property('options');
			e.options.must.not.have.property('uri');
			e.options.must.have.property('path');
		});

		it('adds the host name to its default fields', function()
		{
			var e = new Emitter({ uri: 'sock:/tmp/foobar.sock', app: 'test' });
			e.defaults.must.have.property('host');
			e.defaults.host.must.equal(os.hostname());
		});
	});

	describe('connections', function()
	{
		it('calls connect() when constructed', function(done)
		{
			var emitter = new Emitter(mockOpts);
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
				if (count == 2)
				{
					emitter.destroy();
					done();
				}
			});

			emitter.client.end();
		});
	});

	describe('metric()', function()
	{
		it('requires that an object be passed to metric()', function(done)
		{
			var emitter = new Emitter(mockOpts);
			function shouldThrow() { emitter.metric(); }
			shouldThrow.must.throw(/empty event/);
			done();
		});

		it('requires a `name` field for all metrics', function(done)
		{
			var emitter = new Emitter(mockOpts);
			function shouldThrow() { emitter.metric({ foo: 'bar' }); }
			shouldThrow.must.throw(/name/);
			done();
		});

		it('supplies a value of 1 if one is not provided', function(done)
		{
			function observer(d)
			{
				d.must.be.an.object();
				d.must.have.property('value');
				d.value.must.equal(1);
				mockServer.removeListener('received', observer);
				done();
			}

			mockServer.on('received', observer);
			var emitter = new Emitter(mockOpts);
			emitter.metric({ name: 'test' });
		});

		it('writes event objects to its socket', function(done)
		{
			function observer(d)
			{
				d.must.be.an.object();
				d.must.have.property('host');
				d.must.have.property('time');
				d.must.have.property('app');
				d.app.must.equal('node-1');
				d.value.must.equal(4);
				mockServer.removeListener('received', observer);
				done();
			}

			mockServer.on('received', observer);
			var emitter = new Emitter(mockOpts);
			emitter.metric({ name: 'test', value: 4 });
		});

		it('does not override the time field when present', function(done)
		{
			function observer(d)
			{
				d.must.be.an.object();
				d.must.have.property('time');
				d.time.toString().must.equal('2014-01-01T00:00:00.000Z');
				mockServer.removeListener('received', observer);
				done();
			}

			mockServer.on('received', observer);
			var emitter = new Emitter(mockOpts);
			emitter.metric({ name: 'test', value: 4, time: new Date('2014-01-01') });
		});

		it('accumulates events in a backlog until connected', function(done)
		{
			this.timeout(5000);

			var emitter = new Emitter(mockOpts);

			emitter.on('close', function()
			{
				emitter.metric({ name: 'test.splort', value: 4 });
				emitter.metric({ name: 'test.latency', value: 30 });

				emitter.backlog.must.be.an.array();
				emitter.backlog.length.must.equal(2);
				emitter.backlog[0].must.have.property('name');
				emitter.backlog[0].name.must.equal('test.splort');

				done();
			});

			emitter.connect = function() {};
			emitter.client.end();
		});
	});

	describe('backpressure', function()
	{
		it('sends its backlog when connected', function(done)
		{
			var count = 0;
			function observer(d)
			{
				count++;
				if (count === 1)
					d.name.must.equal('test.splort');

				if (count === 2)
				{
					d.name.must.equal('test.latency');
					mockServer.removeListener('received', observer);
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
			emitter.connect = function() { setTimeout(orig, 1000); };
			emitter.client.end();
		});

		it('sends normally when connected', function(done)
		{
			var emitter = new Emitter(mockOpts);
			emitter.on('ready', function()
			{
				emitter.metric({ name: 'test.splort', value: 4 });
				emitter.metric({ name: 'test.latency', value: 30 });
			});

			var count = 0;
			function observer(d)
			{
				count++;
				switch (count)
				{
				case 1:
					d.name.must.equal('test.splort');
					break;
				case 2:
					d.name.must.equal('test.latency');
					mockServer.removeListener('received', observer);
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
	});

	describe('udp', function()
	{

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
	});

	after(function(done)
	{
		mockServer.close();
		mockUDPServer.close();
		done();
	});
});
