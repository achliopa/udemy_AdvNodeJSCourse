const puppeteer = require('puppeteer');

test('Add two numbers', () => {
	const sum = 1 + 2;
	expect(sum).toEqual(3);
});

test('We can launch a browser', () => {
	const browser = await puppeteer.launch({});
});