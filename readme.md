# Udemy Course - NodeJS:Advanced Concepts

* [Course](https://www.udemy.com/advanced-node-for-developers/learn/v4/overview)
* [Repository]()

## Section 1 - The Internals of Node

### Lecture 2 - Starting with Node Internals

* our program runs on node.js 
* node.js runs on V8 engine (JS) written by Google. this engine  runs JS code outside of the browser. it run also on libuv project. a c++ project that gives access to the OS FS and other resources (network, threads)
* our application code is 100% JS, Node JS is 50% JS and 50% C++. V8 engine is 30% JS and 70% C++, libuv is 100% C++
* Node provides a JS api to the app so that we dont have to write C++ to access the base layer
* Node also provides wrappers or builtin modules or  standard libs (http, crypto, path, fs)

### Lecture 3 - Module Implementations

* to dig into the sc we wiil
	* pick a function in Node std lib
	* find where its implemented in Node sc
	* See how V8 and libuv are used to implement that function
* we chose pbkdf2 function from crypto lib. it takes a password a salt and other options and returns a hash
* we visit [NodeJS github repo](https://github.com/nodejs/node)
* lib folder contains builtin libraries (JS code) we use in our projects
* src folder contains C++ implementation. this is where node.js calls V8 engine and libuv
* pbkdf2 JS implementation is in /lib/internal/crypto/pbkdf2.js
* in its JS function declaration it calls _pbkdf2 (JS in same file in lib) which in turn calls PBKDF2 with same args . this is the actual function that does the hashing. it is implemented in C++ and resides in src
* this function is imported as 
```
const { INT_MAX, pbkdf2: _pbkdf2 } = process.binding('crypto');
```
* this is an unusual import. it is how node binds js with c++. th flow is: JS app code => node's JS side (lib folder in Node repo) => process.binding(): connects JS and C++ functions => V8: converts values between JS and C++ world => node c++ side (src folder in node repo) => libuv: gives node easy access to underlying OS

### Lecture 4 - Node backed by C++ ! 

* we look for PBKDF2 implementation in /src/node_crypto.cc
* in the bottom we find the C++ export 
```
env->SetMethod(target, "pbkdf2", PBKDF2);
```
* it exports cpp method PBKDF2 as pbkdf2 for the binding
* the actual implementation resides inthe same file
```
inline void PBKDF2(const FunctionCallbackInfo<Value>& args) {
  auto rv = args.GetReturnValue();
  Environment* env = Environment::GetCurrent(args);
  ...
}
```
* we see that C++ implementation uses a lot of v8 methods
```
using v8::Array;
using v8::Boolean;
using v8::Context;
```
* the purpose of V8 in this souce code is to act as an intermediate ans allow values from JS to be translated to their C++ equivalents
* these are C++ implementation of JS concepts
* libuv is also used as uv_ in c++ source file
```
static uv_once_t init_once = UV_ONCE_INIT;
  uv_once(&init_once, InitCryptoOnce);
```
* it is uses for concurrency ans processing constructs on C++ side

### Lecture 5 - The basics of threads

* the event loop is used by node to handle async code in apps
* process is an instace of a running program
* a process can have multiple threads
* a thread is a part of code that executes on CPU. multiple threads can run in parallel
* scheduling is used by the OS to decide which thread to run at any given moment
* the num of concurent threads is dependent on cpu cores and cpu capabilities (instructions/cycle)
* there are different reqs in terms of latency in threads
* to reduce thread latency we can 
	* add cpu cores
	* set OS to detect pauses in our program (eg during IO r/w) to pass execution to other threads
* scheduling is done by the OS

### Lecture 6 - The Node Event Loop

* a node program upon start creates a single thread to execute all our code. 
* in this thread resides an event loop which is a control structure
* the event loop provides control over what will execute at any given time (what the signle thread will do at any time)
* each node program we run has 1 event loop
* node program performance is dependent on event loop behaviour
* we ll write some code to see how event loop works. it will emulate the event loop
* we make a new file *loop.js*. the comment in it is fake
	* we emulate the program behaviour: run with 'node loop.js', exit when we are done
	* when we run a node program event loop does not start immediatly
	* first thing done is node executing the js code
	* after contents of the file get executed it enters the event loop (like a while loop)
	* the event loop runs in loops. in each loop

### Lecture 7 - The event loop implementation

* to decide if the event loop will continue node does 3 checks before each iteration
	* Check one: any pending SetTimeout, SetInterval, setImmediate?
	* Check two: any pending OS tasks? (e.g server listening to port)
	* Check three: any pending long running operations?  (e.g ffs module)
* node keeps a list of all tasks being executed in arrays
* arrays are initialized before file execution
* arrays are populated during soulrce file exection depending on the application code
* the arrays are not actual JS arrays

### Lecture 8 - Event Loop Ticks

* event loop in every tick does the following
	* 1) Node looks at pendingTimers and sees if any functions are ready to be called (setTimeout, setInterval)
	* 2) Node looks at pendingOSTasks and pendingOperations and calls relevant callbacks
	* 3) Node pauses execution (momentarily). Continue when...
	*	- 	a new pendingOStask is done
	* 	- 	a new pendingOperation is done
	*	-	a timer is about to complete
	* if there was no wait the loop would run as fas as it could
	* 4) Look at pendingTimers (call any setImmediate)
	* 5) Handle any 'close' events. an example of a close event is a `readStream.on('close', () => { console.log('cleanup')});`

### Lecture 9 - Is Node single Threaded?

* a misconception about node is that is single trheaded
* indeed event loop uses one thread
* its more complicated than that
	* node event loop -> single threaded
	* Some of Node Framework/Std Lib -> Not single threaded. These functions run outhside of the event loop
* we ll write some code to prove that
* we create a js file *threads.js*
* we import the pbkdf2 function `const crypto require('crypto')`
* we call  pbkdf2 passing a callback thats executed after the crypto function finishes
```
crypto.pbkdf2('a','b',100000, 512, 'sha512', () => {
	
});
``` 
* this takes some time to run ~1sec
* we ll add some code to benchmark how long it takes to execute

### Lecture 10 - Testing for Single Threads

* we add a new var before the crypto call to register timestamp `const start = Date.now()`
* in the callback we add a cl to printout the time lapsed `console.log('1: ', Date.now() - start)`
* we run the file `node thread.js` and get 1100 ms
* we duplicate our crypto call changing just he printout
```
crypto.pbkdf2('a','b',100000, 512, 'sha512', () => {
	console.log('2: ', Date.now() - start);
});
```
* our print out is 
```
1:  1092
2:  1095
```
* both calls are called at almost the exact time and end in the exact time bijna, so thery run in parallel
* if it node was typically single threaded it would take 2sec to finish second call. it would wait till 1st finish and then would start. but async calls (ususlly going to system calls or node lib functions) spawn new threads so the main evenloop does not wait
* a thread is a serial series of instructions

### Lecture 11 - The libuv Thread Pool

* we ll see what;s going on with crypto.pbkdf2 behind the scenes: the code we write calls the JS pbkdf2 method from nodels crypto module (lib) -> the crypto module delegats it to the V8 engine-> V8 engine finds the method in Nodes C++ side (src) -> pnkdf2 c++ impelemtation makes use of libuv lib (underlining OS) -> for some call libuv decides to do time consuming operations outside of the event loop -> libuv keeps and uses a thread pool
* the libuv thread pool has a size of 4 and is used to run computational intesive tasks like pbkdf2

### Lecture 12 - Threadpools with multithreading

* from 2 we go to 5 crypto  calls to verify that libuv has a threadpool of size 4. we expect 4 calls to run in parallel and one to run after (2sec)
* the results confirm our expectation, 4 finish together and wait for 5th
```
2:  976
4:  980
1:  1163
3:  1171
5:  1942
```
* in tutors laptop 4 first threats take 2s 5th 3s. in our machine 4 first threads 1s 5th 2s
* his machine is dual core so OS scheduler assigns 2 threads (from thread pool) in each core using multithreading. each core needs double time to run both threads
* our machine is quad-core so all 4 threads in thread pool run concurently in a separate core

### Lecture 13 - Changing Threadpool Size

* we ll change our code to change the number of threads created every time we start our program
* we ll modify the libuv threadpool size using the envrionment variable `process.env.UV_THREADPOOL_SIZE = 2` reducing it to 2
* the effecct is  that the concurrentcy drops to 2 (2 threads at a time) apart from main thread.
* our quad core cpu performance equal a dual core
* if we increase the threadpool to 5 (in quad-core i7) hyperthreading takes effect and we have increase in performance all finish around 1sec
* the bottomline is that threadpool should equal cpu hyperthread max: in i7 -> 8

### Lecture 14 - Common Threadpool Questions

* Can we use the threadpool for Javascript code or can only nodeJS functions use it? => We can write custom JS that uses the thread pool
* What functions in node std library use the threadpool ? => All 'fs' module functions. Some crypto stuff. Dependfs on OS (windows VS unix based)
* How does this threadpool stuff fit into the event loop? => Tasks running in the threadpool are the 'pendingOperations' in our code example
* pedingOperations in our test code represent code running in libuv threadpool

### Lecture 15 - Explaining OS Operations

* we ll try to explain the pendingOSTasks we included in our event loop dummy test file 'loop.js'
* we ll follow a similar approach like in threadpool. write a test file and benchmark to evaluate whats going on behind the scenes
* we make a new file *async.js*
* we ll hit the google page and calculate how much time it takes to get response back
* we require the https module `const https = require('https');`
* we register timestamp `const start = Date.now();`
* we make our async request
```
https.request('https://www.google.com', res => {
	res.on('data', ()=> {});
	res.on('end', () => {
		console.log(Date.now() - start);
	});
}).end();
```
* the code in the request is low level http stuff. on the end event (whe reply get received we measure time passed)
* it takes 469ms to do the request to google servers

### Lecture 16 - Libuv OS Delegation

* we ll add more https.requests in our sample file and get evidence that some functions in node std lib dont use the libuv threadpool like pbkdf2 hashing
* we ll call the request 7 times
* all requests take the same amount of time to complete
* what we saw is another evidence of libuv capabilities of delegating methods to the underlying OS
* as some node std lib methods make use of libuv threadpool some others get delegated by libuv to the OS
* its the OS that does the real http request
* libuv issues the request and waits for the OS to emit a signal that a response as come back
* OS decides if it needs a new thread or not

### Lecture 17 - OS/Async Common Questions

* what functions in node std lib use the OS async features? => Almost everything around networking for all OSs. some other stuff is OS specific
* how does this os async stuff fit into the event loop? => tasks using the underlying OS are reflected in our 'pendingOSTasks' array
* when we listen to a prot in our app the app stays open (event loop runs again and again)

### Lecture 18 - Review

* When we start a node program in a local computer: 
	* process and execute code in index.js file (and imported files)
	* STEP 2: do we still have work to do? look at timers, OS tasks, threadpool. NO? -> ext YES? -> continue
	* run setTimeouts,setIntervals
	* Run callbacks for OS tasks or threadpool tasks that are done. (this is usually 99% of JS code)
	* pause and wait for stuff to happen
	* run any 'setImmediate' functions
	* handle close events
	* go to STEP 2

### Lecture 19 - Crazy Node behavior

* we will merje the code from all the sections examples to a single project
* we make a new file *multitask.js*
* we put there all code from async.js and threads.js
* we remove all doRequest calls
* we keep only one from cryptocalls and put it in a doHash() wrapper function
* we import fs in the file `const fs = require('fs');`
* we ll use fs to read all the code we wrote in the single source code file
```
fs.readFile('multitask.js','utf8',()=> {
	console.log('FS: ', Date.now() - start);
});
```
* we run the file: we get *FS: 1* so it takes 1ms to read the file
* we add a single `doRequest();` before the fs call and  call `doHash();` 4 times after the fs call
* the console log output is 
```
554
Hash:  980
FS:  1000
Hash:  983
Hash:  1236
Hash:  1277
```
* our FS call prints 2seconds when when it was running alone it took 1ms

### Lecture 20 - Unexpected Event Loop Events

* we ll explain why we see the one hash console log before fs and why fs readfile takes somuch time to complete
* why we see the http finish right away?
* FS module call runs in Threadpool
* HTTP req is delegated to OS
* crypto module makes use of the threadpool
* OS call took less time (depends of network speed) while others roughly the same 1sec (hash time)
* When we call fs.readFile()
	* node gets some 'stats' on the file (requires HDD access)
	* HD accessed, stats returned
	* node requests to read the file
	* HD accessed, file ocntents stramed back to app
	* node returns the contents to us
* what we see is that there are 2 async actions contained in readFile() and consequently 2 pauses when we wait to get file stats and when we wait to get file contents
* 4 tasks (fs call and 3 of 4 hash functions) where loaded to the threadpool
* the 3 threadpool threads try to calculat the hash of 3 hash tasks 
* the 4th threadpool thread works on fs call. when he reaches to HDD, threadpool thread knows he is going to wait, so drops FS task and becomes available
* the 4th hash task takes its place in the threadpool
* at some point a hash task will finish (console log), its thread in threadpool becomes available so FS task takes its place
* fs task resumes operation (its fast so it finished fast)
* if we increase threadpool to 5, fs is kicked out from thrreadpool but resumes as the 4 hash tasks have their own in the pool. so fs task finishes first (fastest)
* if we reduce threadpool to 1 fs finishes last

## Section 2 - Enhancing Node Performance

### Lecture 21 - Enhancing Performance

* we will see 2 ways to mitigate the performance impact that event loop has on our node apps
	* set node to work in cluster mode: start multiple copies of nmode that run our code with the aim of having multiple instances of the event loop (Recommended Approach)
	* use worker threads. these worker threads will use the pool that is set by libuv when we start our app (Experimental Approach)

### Lecture 22 - Express Setup

* we ll set up a small express app and use it to demonstrate both performance improving techniques
* we make a new file called *index.js* adding the bare minimum to run express (one route with a simple response)
```
const express = require('express');
const app = express();

app.get('/', (req,res) => {
	res.send('Hi there!');
});

app.listen(3000);
```
* we import express with npm. first we init `npm init` and then `npm i --save express`
* we start server with `node index.js` visit localhost:3000 in chirem and see the message
* we could use nodemon to avoid restarting the app anytime we do a change. BUT. nodemon does not work well with Clustering

### Lecture 23 - Blocking the Event Loop

* whenever a request comes to our node server it gets processed by  the single thread. the singel thread contains the event loop. the single thread processes the request and returns the response
* we get into issues when the incoming request takes a lot of time to process (e.g complex JS)
* to simulate that we add a dummy function doWork() in our project which will overload the CPU for the amount of time we specify
```
function doWork(duration) {
	const start = Date.now()

	while(Date.now() -start < duration) {}
}
```
* we add the function call in our route handling callback adding `doWork(5000);`
* the code in the callback will run in the event loop. not in OS or threadpool. as it is vanilla JS. no lib calls
* for 5sec our event loop can do nothing else but get stuck in the while loop
* we confirm that by running the code and opening the localhost:3000. it takes 5+ seconds to load. if we open a second page it will take even longer
* that is why JS is not good for doing complex Sync operations

### Lecture 24 - Clustering in Theory

* clustering work by launching simultaneously multiple instances of our application (multiple processes). 
* there is an overuling parent process called cluster manager that monitors the health of our app instances
* cluster manager does not run any app code. it can start/stop, send data to, administer app instances
* when we run a node app from our terminal: node takes contents of our file -> [ executes it -> starts the event loop ] last two steps is the Nose Instance
* When we use clustering we run the node app from terminal: the furst node instance that get launched when we use clustering is the cluster manager. the cluster manager is ther responsible for starting worker instances. these worker instances are responsible for processing the incoming requests. 
* for starting the worker instances the cluster manager needs the cluster module from node standard library
* cluster module contains the method fork `cluster.fork()`. when we call this method from cluster manager node internally goes back to index.js (source file) and executes it a second time, but in a slightly different mode. when it executes the file for a second time it starts the worker instance
* so our source code file the 1st time it gets executed produces the cluster manager. for the consecutive times it gets executed from cluster.fork() produces worker instances

### Lecture 25 - Forking Children

* we 'll implement clustering in our tiny express app
* we ll require in the cluster module `const cluster = require('cluster');`
* we ll instroduce avery important property of the module the isMaster `cluster.isMaster`. it is true as this is the first execution of the index.js we are runnignt he cluster manager so the isMaster property is set to true
* when we we fork off additional worker instances they will have the isMaster property false
* we use this flag to determine what the program should do depending on the context (type of instance it is running in)
* so we use it as a switch statement. if we are in master mode we fork,. if not run the app
```
// console.log(cluster.isMaster);
// Is the file being executer in master mode?
if(cluster.ismaster) {
	// cause index.js to be executed again in child mode
	cluster.fork();
} else {
	// i am child i am going to act like a server and do nothing else
}
```

### Lecture 26 - Clustering in Action

* currently we start one child with fork(). when we start just one child clustering does not make sense. we still  have only one instance of the event loop
* if we want to start additional children we can call `cluster.fork()` more times. we call it 4 times in our app
* to show the effect of clustering we add one more route with no delay this time
```
	app.get('/fast', (req,res) => {
		res.send('This was fast!')
	});
```
* we restart the server, open two tabs for the 2 routes implemented. fast route gets served immediately. as we had multiple severs to handle our requests
* if we leave one fork() (one child) the fast route is not served. only after the delay

### Lecture 27 - Benchmarking Server Performance

* clustering cannot be scaled indefinetely. we cannot fork() too many childen. after a certain poiont it makes no sense
* in some cases adding many children can be catastrophic for the app
* we use aprogram to benchmark of our server.we open a second terminal in project dir
* we run apache benchmark (ab) . we install it `sudo apt-get install apache2-utils`
* to benchmark we run `ab -c 50 -n 500 localhost:3000/fast` 500 requests trying to send concurently 50 at a time.
* we run it while having started our app
* a good metric is requests/sec (we have 2455) or average time per request (20.365 ) or the distribution of requests serve time (we can plot it as histogram)

### Lecture 28 - Benchmark Refactor

* we ll refactor our index.js file and benchmark it to see when clustering starts giving us problems
* we ll replace the doWork() method. its good at simulating a pause in our app but not good at simulating actual work. we need to do real difficult computations. we ll use the hashing function
```
	app.get('/', (req,res) => {
		// doWork(5000);
		crypto.pbkdf2('a','b',100000, 512, 'sha512', () => {
			res.send('Hi there!');
		});	
	});
```
* we also restrict theadpool size to 1 `process.env.UV_THREADPOOL_SIZE = 1;`
* we spawn only one child

### Lecture 29 - Need More Children

* we now have one child in our cluster and a cpu intesive task in out main route
* we restart our server and run our benchmark 1 request in home route `ab -c 1 -n 1 localhost:3000/` our metrics are *Time taken for tests:   0.997 seconds*
* we run our benchmart for 2 requests and concurency of 2 `ab -c 2 -n 2 localhost:3000/` it took 2070ms to be processed but our min is 1027ms so first request got services at ~1sec
* what happens is: we have 2 requests in our test 1 worker and 1 thread in the pool. thread pool services 1st request and then the 2nd
* we repeat the benchmark of 2 by forking 2 children in our app. now both take 1sec as each app instance tkaes erach request. (not on our machine)
* how to match cpu cores to forked children
```
const os = require('os');
const cpuCount = os.cpus().length;
for (let i = 0; i < cpuCount; i += 1) {
   // Match the children to CPU physical cores
   cluster.fork();
 }
```

* we increase fork to 6 children and do our benchmark for 6 requests. in tutors machine they take 3.5sec on our machine it took from 1 to 6 sec (no hyperthreading on i7) it does not execute 6 times faster. it depends on resources. if we increase thread pool (as we have quad core) it becomes better
* he spawns children number equal to the cores of his machine  (2) and runs the benchmark of 6
* we should not exceed the cheildren count far above the logical cores on our system

### Lecture 30 - PM2 Installation

* in a production app. the cluster master would monitor the health of children and maybe respawn them
* we dont need to go in such detail as there is a ready made solution. the [PM2](https://pm2.io/) opensource node project
* we find it in [github](https://github.com/Unitech/pm2)
* we install it as a global `npm install -g pm2`

### Lecture 31 - PM2 Configuration

* pm2 will spawn multiple instances and monitor their health for us (if one crashes it spawns a new one)
* we should remove the cluster related code from our project as pm2 will do all the stuff. we remove the code from our app (save it as index_cluster.js)

* to start our app in cluster mode using pm2 we ll run `pm2 start index.js -i 0` -i sets the num of instances. when we enter 0 we leave pm2 decide the best num of instances to use (equal to the logical num of cpu cores on our machine). on our machine is spawns 8! instances
* to stop it we run `pm2 delete <appname>`
* by running `pm2 list` we can see the health of our instances
* with `pm2 show <appname>` we get much more info on our cluster
* with `pm2 monit` we get a dashboard like inteface for all instances
* pm2 is used in production environments

### Lecture 32 - Webworker Threads

* we saw how to use cluster mode to imporve performance when we need to do concurent heavy duty procssing in our app
* worker threads is the other way but is experimental
* we should not use either unless we have to
* the use of workers threads uses the libuv threadpool. 
* with worker threads we get direct access to it
* worker threads give on average the same performance improvement like clustering
* we ll build a small project to showcase worker threads
* we ll use *webworkers-threads* npm package `npm install --save webworker-threads`

### Lecture 33 - Worker Threads in Action

* our app runs on a single thread that includes the event loop:
* webworker-threads lib will create aseparate worker thread for us. because it runs on its own it can do complex calculations without blocking our app
* BUT a lot od node std lib code already runs in libuv threadpool so in its own thread
* when we use worker threads we can not freely reference theur variables from our app. we need to use an asyn messaging system with events: postMessage->onmessage
* We create a worker object in our app (Worker Interface). this object (Worker Interface) creates the worker thread (Worker) and both communicate using postmessage and onmessage. when we call prost message the callback in on messase event will be invoked
* we ll modify the *index.js* file again
* we import worker class from worker-threads `const Worker = require('webworker-threads').Worker;`
* we remove crypto method from http callback as itself it runs in libuv threadpool
* we create a new worker object (Interface) in the http route callback passing in a function. 
```
app.get('/', (req,res) => {
	const worker = new Worker(function() {
		this.onmessage = function() {
			let counter = 0;
			while (counter <1e9) {
				counter++;
			}
			postMessage(counter);	
		}
	});

	worker. onmessage = function(myCounter) {
		console.log(myCounter);
	}

	worker.postMessage();
});
```
* this anonym0ous function has NO access to the scope outside of it.
* we decalre also the comm functions for the Interface and the comm functions for the thread (inside the passed in anonymous function that is the thread code)
* we use normal functions (keyword) and not arrow as we want to pass the context with this. if we used the arrow function this would refer to the route handler
* when postmessage outside worker gets called the onmessage in the worker gets invoked. so there we do the  work and return the result with postmessage
* in the interface onmessage we get the result and console log it

### Lecture 34 - Benchmarking Workers

* in our main https route handler we dont return as response just do our worker stuff.
* we run our app `node index.js`. we hit our browser and check our terminal... worker response gets logged.
* the result comes back as an object { data: 100000000 }
* its time to benchmark the results using ab `ab -c 1 -n 1 localhost:3000/` rerun for more requests and compare results

## Section 3 - Project Setup

### Lecture 35 - The Next Phase

* to avoid basic stuff we are going to clone a basic plain nodeJS App from github
* the app has basic routing and auth setup
* we ll pimp this app up with:
	* Redis-Backend Caching
	* Browser Based Integration Testing
	* Continuous Integration (CI) Setup
	* Scalable File/Image Upload
* we will end up with a Sοlid, Production Ready App to showcase

### Lecture 36 - Project Walkthrough

* project recides in [github repo](https://github.com/StephenGrider/AdvancedNodeStarter)
* we download it (or clone it)
* we walkthrough the code its a typical express.js app:
	* app main file is index.js
	* we use mongouuse for mongodb connection
	* we use passport.js for authentication
	* we have production handlers
	* restful routes
* our project is a frontend-backend combo (fullstack)
	* frontend uses create-react-app feamework (singlepage app)
	* frontend-backend communicate with http
	* Backend takes http request ->  Goes to Middlewares [uses body parser to extract data -> cookie session(auth, sessions) -> passport(oauth w/ google)] -> Routes 1) AuthRoutes 2) RequireLogin/BlogRoutes -> Reply to Frontend
	* Both AuthRoutes and BlogRoutes -> Mongoose -> MogoDB
	* User and Blog Models are stored in Mongoose
* we install project dependencies with `npm install`
* we need to install dependencies for the react project as well, so in the client folder we run `npm install` as well