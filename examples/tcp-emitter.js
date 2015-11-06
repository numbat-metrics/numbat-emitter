#!/usr/bin/env node

var Emitter = require('../index');

var emitter = new Emitter({
	uri:  'tcp://localhost:4677',
	app: 'tcp-emitter',
	maxretries: 10,
	maxbacklog: 5
});

console.log('--> start');
emitter.metric({ name: 'example.start', pid: process.pid });

emitter.on('failed', function()
{
	console.log('failed, backlog len=' + emitter.backlog.length);
	process.exit(1);
});
emitter.on('close', function() { console.log('closed', emitter.retries, emitter.backlog.length); });
emitter.on('ready', function() { console.log('ready'); });

function heartbeat()
{
	console.log('-> heartbeat');
	emitter.metric({ name: 'heartbeat', ttl: 16000 });
}

function resources()
{
	console.log('-> resources');
	var mem = process.memoryUsage();

	emitter.metric({ name: 'example.memory.rss', value: mem.rss });
	emitter.metric({ name: 'example.memory.heapTotal', value: mem.heapTotal });
	emitter.metric({ name: 'example.memory.heapUsed', value: mem.heapUsed });
}

var heartbeatTimer = setInterval(heartbeat, 15000);
var resourcesTimer = setInterval(resources, 30000);

process.on('SIGINT', function()
{
	console.log('Shutting down gracefully.');
	clearInterval(heartbeatTimer);
	clearInterval(resourcesTimer);
	console.log('shutdown');
	emitter.metric({ name: 'shutdown' });
	setTimeout(process.exit, 500);
});
