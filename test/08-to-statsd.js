/*global describe:true, it:true, before:true, after:true, beforeEach: true, afterEach:true */
'use strict';

const demand = require('must');
const toStatsd = require('../to-statsd');

describe('toStatsd', function()
{
	it('can convert various flavors of events to statsd strings', function()
	{
		const messages = [
			{ name: 'simple.event' },
			{ name: 'simple.value', value: 42 },
			{ name: 'empty.value', value: 0 },
			{ name: 'extra.data', value: 47, section: 31 },
			{ name: 'dirty.tag', ' |-|4c|< 3|2 ': true },
			{ name: 'multi.tag', value: 34, multi: 'pass', meat: 'popsickle', elements: 5 }
		];

		const stats = [
			'simple.event:1|c',
			'simple.value:42|g',
			'empty.value:0|g',
			'extra.data:47|g|#section:31',
			'dirty.tag:1|c|#____4c___3_2_:true',
			'multi.tag:34|g|#multi:pass,meat:popsickle,elements:5'
		];

		messages.forEach((msg, idx) =>
		{
			toStatsd(msg).must.equal(stats[idx]);
		});
	});
});
