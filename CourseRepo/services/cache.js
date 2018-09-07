const mongoose = require('mongoose');
const redis = require('redis');
const redisUrl = 'redis://127.0.0.1:6379';
const client = redis.createClient(redisUrl);
const util = require('util');
client.get = util.promisify(client.get);
const exec = mongoose.Query.prototype.exec;

mongoose.Query.prototype.exec = async function() {

	const key = JSON.stringify(Object.assign({}, this.getQuery(), { collection: this.mongooseCollection.name }));
	
	// see if we have a have a value for key in redis
	const cacheValue = await client.get(key)
	// if we do return that
	if (cacheValue) {
		console.log(cacheValue);

		return JSON.parse(cacheValue);
	}
	// otherwise issue a query

	const result = await exec.apply(this,arguments);
	client.set(key, JSON.stringify(result));
	return(result);
}