const cluster = require('cluster');

// console.log(cluster.isMaster);
// Is the file being executer in master mode?
if(cluster.ismaster) {
	// cause index.js to be executed again in child mode
	cluster.fork();
	// cluster.fork();
	// cluster.fork();
	// cluster.fork();
} else {
	// i am child i am going to act like a server and do nothing else
	const express = require('express');
	const app = express();

	function doWork(duration) {
		const start = Date.now()

		while(Date.now() -start < duration) {}
	}


	app.get('/', (req,res) => {
		doWork(5000);
		res.send('Hi there!');
	});

	app.get('/fast', (req,res) => {
		res.send('This was fast!')
	});

	app.listen(3000);
}
