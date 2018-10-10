'use strict';

module.exports = function messageToStatsd(message)
{
	const { name, value } = message;

	const tags = Object.keys(message).map(key =>
	{
		if (key.match(/(time|value|name)/)) return '';
		const val = message[key];
		if (!val || val instanceof Object) return ''; // only want strings, nums, or bools
		return `${sanitizeTag(key)}:${val}`;
	}).filter(Boolean);
	const tagStr = tags.join(',');

	const type = value == null ? 'c' : 'g';
	let stat = `${name}:${value == null ? 1 : value}|${type}`;
	if (tagStr.length !== 0)
	{
		stat += `|#${tagStr}`;
	}
	return stat;
};

function sanitizeTag(input)
{
	return input
		.replace(/[`~!@#$%^&*()|+\-=?;:'",.<>{}[\]\\/]/gi, '_')
		.replace(/\s+/gi, '_');
}
