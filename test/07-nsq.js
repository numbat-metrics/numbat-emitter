/*global describe:true, it:true, before:true, after:true, beforeEach: true, afterEach:true */
'use strict';

const demand = require('must');
const net = require('net');

const Emitter = require('../');

describe('nsq output', function()
{
	const mockNSQOpts = {
		uri: 'nsq://localhost:4334',
		topic: 'numbat',
	};

	let server;

	before(function(done)
	{
		server = net.createServer(conn =>
		{
			conn.on('data', chunk =>
			{
				if (chunk.slice(0, 12).toString() === '  V2IDENTIFY')
				{
					const header = Buffer.alloc(8);
					const payload = Buffer.from(JSON.stringify({}));
					header.writeInt32BE(0, 4);
					header.writeInt32BE(4 + payload.byteLength, 0);
					return conn.write(Buffer.concat([header, payload]));
				}

				const payload = chunk.slice(chunk.indexOf(10) + 5);
				server.emit('metric', JSON.parse(payload));
			});
		});
		server.listen(4334, done);
	});

	it('can construct an NSQ emitter', function(done)
	{
		const emitter = new Emitter(mockNSQOpts);
		emitter.on('ready', function()
		{
			emitter.client.constructor.name.must.equal('NSQStream');
			emitter.client.must.have.property('_write');
			emitter.client._write.must.be.a.function();
			done();
		});
		emitter.connect();
	});

	it('writes event objects over tcp', function(done)
	{
		server.once('metric', function handleIncoming(metric)
		{
			metric.name.must.equal('numbat.test');
			metric.value.must.equal(4);
			done();
		});

		const emitter = new Emitter(mockNSQOpts);
		emitter.connect();
		emitter.metric({ name: 'test', value: 4 });
	});

	after(function(done)
	{
		server.close();
		done();
	});
});
