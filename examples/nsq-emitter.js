#!/usr/bin/env node

var Emitter = require('../index');

var emitter = new Emitter({
	uri: 'nsq://localhost:4151/pub',
	app: 'example-nsq',
	topic: 'test',
});
Emitter.setGlobalEmitter(emitter);

process.emit('metric', { name: 'start', pid: process.pid });

function heartbeat()
{
	console.log('heartbeat');
	process.emit('metric', { name: 'heartbeat', ttl: 16000 });
}

function resources()
{
	console.log('emitting 3 memory metrics');
	var mem = process.memoryUsage();

	process.emit('metric', { name: 'memory.rss', value: mem.rss });
	process.emit('metric', { name: 'memory.heapTotal', value: mem.heapTotal });
	process.emit('metric', { name: 'memory.heapUsed', value: mem.heapUsed });
}

var heartbeatTimer = setInterval(heartbeat, 15000);
var resourcesTimer = setInterval(resources, 30000);

process.on('SIGINT', function()
{
	console.log('Shutting down gracefully.');
	clearInterval(heartbeatTimer);
	clearInterval(resourcesTimer);
	process.emit('metric', { name: 'shutdown' });
	setTimeout(process.exit, 500);
});
