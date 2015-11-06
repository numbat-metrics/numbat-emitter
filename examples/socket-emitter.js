#!/usr/bin/env node

var Emitter = require('../index');

var emitter = new Emitter({
	path: '/tmp/numbat.sock',
	app: 'socket-example'
});

emitter.metric({ name: 'start', pid: process.pid });

function heartbeat()
{
	console.log('heartbeat');
	emitter.metric({ name: 'heartbeat', ttl: 16000 });
}

function resources()
{
	console.log('resources');
	var mem = process.memoryUsage();

	emitter.metric({ name: 'memory.rss', value: mem.rss });
	emitter.metric({ name: 'memory.heapTotal', value: mem.heapTotal });
	emitter.metric({ name: 'memory.heapUsed', value: mem.heapUsed });
}

var heartbeatTimer = setInterval(heartbeat, 15000);
var resourcesTimer = setInterval(resources, 30000);

process.on('SIGINT', function()
{
	console.log('Shutting down gracefully.');
	clearInterval(heartbeatTimer);
	clearInterval(resourcesTimer);
	emitter.metric({ name: 'shutdown' });
	setTimeout(process.exit, 500);
});
