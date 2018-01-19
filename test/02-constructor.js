/*global describe:true, it:true, before:true, after:true, beforeEach: true, afterEach:true */
'use strict';

const
	demand  = require('must'),
	os      = require('os'),
	Emitter = require('../index')
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
	});

	it('defaults `app` to `numbat`', function()
	{
		const e = new Emitter({ uri: 'sock:/tmp/foobar.sock' });
		e.must.have.property('app');
		e.app.must.equal('numbat');
	});

	it('adds the host name to its default fields', function()
	{
		const e = new Emitter({ uri: 'sock:/tmp/foobar.sock', app: 'test' });
		e.defaults.must.have.property('host');
		e.defaults.host.must.equal(os.hostname());
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
		Emitter.setGlobalEmitter();
	});
});
