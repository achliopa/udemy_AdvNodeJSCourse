const AWS = require('aws-sdk');
const keys = require('../config/keys');

const S3 = new AWS.S3({
	accessKeyId: keys.accessKeyId,
	secretAccessKey: keys.secretAccessKey
});

module.exports = app => {
	app.get('/api/upload', (req,res)=>{

	});
};