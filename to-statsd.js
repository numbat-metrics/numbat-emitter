'use strict';

module.exports = function messageToStatsd(message)
{
	const { name, rate } = message;

	const tags = Object.keys(message).map(key =>
	{
		if (key.match(/(time|value|name|timing|set|count|rate)/)) return '';
		const val = message[key];
		if (!['string', 'number', 'boolean'].includes(typeof val)) return ''; // only want strings, nums, or bools
		return `${sanitizeTag(key)}:${val}`;
	}).filter(Boolean);
	const tagStr = tags.join(',');

	const type = getType(message);
	const value = getValue(message);
	let stat = `${name}:${value}|${type}`;
	if (rate != null && type === 'c')
	{
		stat += `|@${rate}`;
	}
	if (tagStr.length !== 0)
	{
		stat += `|#${tagStr}`;
	}
	return stat;
};

function getType(message)
{
	const { value, set, timing, count } = message;
	if (value != null) return 'g';
	if (count != null) return 'c';
	if (timing != null) return 'ms';
	if (set != null) return 's';
	return 'c';
}

function getValue(message)
{
	const { value, set, timing, count } = message;
	if (value != null) return value;
	if (count != null) return count;
	if (timing != null) return timing;
	if (set != null) return set;
	return 1;
}

function sanitizeTag(input)
{
	return input
		.replace(/[`~!@#$%^&*()|+\-=?;:'",.<>{}[\]\\/]/gi, '_')
		.replace(/\s+/gi, '_');
}
