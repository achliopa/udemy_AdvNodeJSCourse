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

### Lecture 37 - Key Customization

* to start our cloned app we run `npm run dev`
* it launches chrome at localhost:3000
* the app as is connects to a MongoDB instance (remote) with a readonly account. 
* we need to configure aour own copy of mongoDB instance
* in the cloned project there are files containing keys for accesing project resources.
* keys are in config/ folder dev.js fopr dev and prod.js for prod
* we use a google api key, and secret and mlab key. we ll replace them with our own

### Lecture 38 - MongoDB Creation

* we ll create a mongoDB instance in mLab
* we log in and create a new instance (free tier) we name the db blog_dev
* we go to db to create a user
* a url is generated for our db.  we cp it in dev.js and add the user name:password
* server restarts
* now we can loging with google in our app because we have a db to store data

### Lecture 39 - Routes Walkthrough

* we log in and click on + button to add a blogpost
* we write title, content and click next -> save
* our blog appears on dashboard. 
* if we click on it we see it in full page
* our exrpess router serves 7 routes (4 auth routes and 3 blog routes)
		* /auth/google => start google OAuth flow to log user in
		* /auth/google/callback => where users get sent to after OAuth flow
		* /auth/logout => logout current user
		* /api/current_user => get the current user

		* /api/blogs/:id => get the blog with specified ID
		* GET api/blogs => get all blogs that belong to the current user
		* POST /api/blogs => create a new blog
* blog posts a re personal no else can view them
* our routes are locates in routes/ folder

## Section 4 - Data Caching with Redis

### Lecture 40 - MongoDB Query Performance

* we will add caching to our app
* caching is a way to dramaticaly improve  the read performance of an app that uses mogoDB
* caching can be used with any DB
* we open devtools in chome and filter by XHR. we refresh our loged in homepage (blog list)
* 3 requests are issued
		* info: has to do with react takes 55ms
		* current_user: 300ms (db involved)
		* blogs: 300ms (db involved)
* the flow is: visit localhost:3000/blogs -> react app loads in browser -> react app needs details about the current user and their blogs -> react app makes requests to get current user and blog list to backend -> express route handler sees request, tells mongoose to get records -> mongoose reaches to mongodb  fetches data -> express reports to react app
* in blogRoutes.js /api/blogs route goes to mongoose blog model to get the record based on user id
```
  app.get('/api/blogs', requireLogin, async (req, res) => {
    const blogs = await Blog.find({ _user: req.user.id });

    res.send(blogs);
  });
```
* everytime someone refreshes the page in our app we issue 2 requests to mongoDB
* when we issue a mongoose query it sends a query in mongoDB
* mongoDb uses an index, the index is used to retrieve data (documents) from a collection
* in our db we have 2 collections. users and blogs
* the index in mongoDB is efficient because wqe dont have to go to each record butr go directly to the record we want
* the index is based on the *_id* proerty of each document in collection
*  if we issue a query looking for a blog with a specific `title` so an other property except from id mongo cannot use indexing . it has to go in each and every document in collection
* this is called a full collection scan and it takes time, it can lead to performance issues in our app. there are 2 sollutions
	* add an index for the field we will use in our lookup: for every index we add in our collection it takes more to write a document in that collection. it also consumes more diskspace and memory
	* use cache server (caching layer)

### Lecture 41 - Query Caching Layer

* one of the possible solutions for performance issues with mongoDB is to use a cache server (or a caching layer)
* a normal MERN application serves a frontend (react) with a backend running express+mongoose on node, mongoose interfaces a mongoDB on a diff process or machine
* the cache server stands between mongoose and mongoDB adn does the follwoing:
	* if the query from mongoose has not been executed before it parses it to mongoDB
	* the result of this query is stored in cache server before returned to mongoose
	* if the query has been executed before it gets served from cache server
* in depth: in cache server therre is a key-value storage key is the query and value the result
	* if mongoose issues a query *Blog.findById('123')* cache server checks its storage. it does not find it. query is forwarded to mongoDB. mongo replies with *{ title: 'my', content: 'blog'}*. a new record is stored in cache list *'123' : { title: 'my', content: 'blog'}*
* we ll write code that caches any type of query mongoose can issue in our app
* we ll handle record updates, expire data
* cache is used for read actions

### LEcture 42 - Redis Introduction

* our caching server will be an instance of Redis (in memory tiny database)
* redis data get lost once we restart our server
* redis is FAST
* we ll use node-redis lib to interact with redis server [npm redis]https://www.npmjs.com/package/redis()
* node-redis *redis* lib does not give any documentation on how to manipulate data in redis
* any redis command is just forwarded to the redis server

### LEcture 43 - Installing Redis

* we will install in on linux (x86 and ARM)
* we unpack it an in the folder run 'make'
* The binaries that are now compiled are available in the src directory. Run Redis with:
```
$ src/redis-server
```
* You can interact with Redis using the built-in client:
```
$ src/redis-cli
redis> set foo bar
OK
redis> get foo
"bar"
```
* we can check tha redis is running with `redis-cli ping` it replies with PONG

### Lecture 45 - Getting and Setting Basic Values

* we ll play with redis to see how it stores data
* redis is a key value storage, much like a JS object stores values
* we can use node lib redis to:
	* we store with `set('hi','there')`
	* we retrieve with `get('hi', (err,val) => {console.log(val)});`  => 'there'
* get is async
* our redis server runs on port 6379
* we ll write some code to interact with it
* we install the redis lib `npm install --save redis`
* we run node cli and run a test program tha conects to redis sets and gets a value
```
const redis = require('redis')
const redisUrl = 'redis://127.0.0.1:6379'
const client = redis.createClient(redisUrl)
client
client.set('hi','there')
cient.get('hi', (err,val) => {console.log(val)})
```
* to simplify our getters without writing the callback we can use `client.get('hi',console.log)` as we pass console.log as a callback . this is a trick

### Lecture 46 - Redis Hashes

* we ll see another datastracture more useful for our caching problem. the *Nested Hash*
* its like a nested javascript object. we have the keys but the value is it self a collection of key:value pairs (a nested hash)
* to set a nested hash we use `hset('spanish','red','rojo')`. we pass in:
	* the overall key: 'spanish'
	* the key of the hash: 'red'
	* the nested hash value: 'rojo'
* to get a nested hash value we use `hget('spanish','red',(err,val) => console.log(val))` we get back rojo passing a cb
* if we express the key value pair as a JS obj literal we get
```
const redisValues = {
	hi: 'there'
};
```
* a nested hash in JS would look like
```
const redisValues = {
	spanish: {
		red: 'rojo',
		orange: 'naranja',
		blue: 'azul'
	},
	german: {
		red: 'rot',
		orange: 'orange',
		blue: 'blau'
	}
};
```
* in node cli we write our small testing script
```
const redis = require('redis')
const redisUrl = 'redis://127.0.0.1:6379'
const client = redis.createClient(redisUrl)
client.hset('german','red','rot')
client.hget('german','red',console.log)
```

### Lecture 47 - One Redis Gotcha

* in redis we can store nums and letters. we cannot store a plain JS object in redis. the following command passes but object is stringified with .toString() method. but what we get back is [Object object]
```
client.set('colors', { red: 'rojo' }) 
```
* what we should do to store objects in redis is stringify them ourselves. (overwrite the toString() method?) or better turn them to JSON w/ stringify
```
client.set('colors',JSON.stringify({ red: 'rojo' }))
client.get('colors', console.log) # '{"red":"rojo"}' we need to parse it
client.get('colors', (err,val) => console.log(JSON.parse(val)))
```

### Lecture 48 - Cache Keys

* we ll add caching to one route (query) in our app
* in the get('/api/blogs') we make a single query to mongo `Blog.find({ _user: req.user.id });` searching by user id. not blog id
* we want to cache that query. a possible solution is use the query as key and the query result as value. 
* the result is going to be a list of blog posts.
* the quaery is a bit ambiguous. we want query keys that are consistent but unique between query executions
* to identify the key to our cache we need to look in our query and find an element that is consistent and unique . in our query we use the Blog collection and the User._id the only providing consisntency and uniqueness is User._id

### Lecture 49 - Promisifying a Function

* we ll write all the redis related code in the route callback for easy deletion later on
* we add our setup code
```
    const redis = require('redis');
    const redisUrl = 'redis://127.0.0.1:6379';
    const client = redis.createClient(redisUrl);
```
* we need to add switch logic so that we go t redis cache when we have the query in our cache
* our getter reteurna callback and we end up with nested callbacks. we will use promises.
* redis does not natively support promises so we need to promisify our code
* we import built in util lib of node `const util = require('util');`
* we use a method called promisify. it accept any method that returns a callback and makes it return a promise instead `client.get = util.promisfy(client.get)` we pass in a ref to function amd get a reference ready to use
* we use async/await that comes with promise ` const cachedBlogs = await client.get(req.user.id);`

### Lecture 50 - Caching in Action

* we implement the control logic. 
* cached data are stored as JSON

```
    // if yes respond to the request right away and return
    if(cachedBlogs) {
      return res.send(JSON.parse(cachedBlogs))
    }
    // if no we need to respond to the r equest and  update our cache to store data
    const blogs = await Blog.find({ _user: req.user.id });

    res.send(blogs);

    client.set(req.user.id,JSON.stringify(blogs));
  });
```
* we test the app. first time gets served by mongo , second by cache
* to delete all data that run in redis
* we use node redis lib to delete.
* we setup the client conection in node and we run `client.flushall()`
* we  have still delay but its because we setup redis connection in each request

### Lecture 51 - Caching Issues

* current implementation has some issues
* we make a new request. when we refresh its not there as redis does not keep track of the changes in the users blog list
* we want to avoid adding caching specific login in every route handler to synchronize our cache with the changes in mongodb
* if we add an other collection of resources in db related to user (images,tweets) the the consistency of using user.id as key is lost. our currnet caching setup is good for one resource

### Lecture 52 - The Ultimate Caching Solution

* Problem Solutions
	* caching code isnt really reusable anywhere else in our codebase => hook in to Mongoose query generation and execution process
	* cached values never expire => add timeout to values assigned to redis. also add ability to reset all values tied to some specific event
	* cache keys won't work when we intreoduce other collections or query options => figure out a more robust solution for generating cache keys
* to solve first issue we need to understand queries in mongoose (customize queries)
	* in mongoose we build our query object and then execute it. 
	* our query object can be further customized
*we want to build our query and before executing it going to redis cache 
* 1st possible way to trigger the query to go to mongo `query.exec((err,result)=>{console.log(result)});`
* 2nd possible way to trigger the query to go to mongo `query.then(result => console.log(result));`
* 3rd possible way is using the async/await syntax `const result = await query;`
* to make our code reusable we should override the exec method to add the caching logic
```
query.exec = function() {
	//to check to see if this query has already been executed
	//and if it has return the result right away
	const result = client.get('query key')
	if (result) {
		return result;
	}
	// otherwise issue the query as normal and 
	const result = runtheoriginalqueryfunction();
	// then store the result in redis cache
	client.set('query key', result);
	return result;
}
```
* expiration of data is buil in redis. we can tell it when to expoire the data when we set them in
* in .set() we use the keyword 'EX' and the expiration time in seconds
```
client.set('color','red','EX',30);
```
* customizing our existing blog query by adding one more para. user.id loses also its uniqueness
* we need to encapsulate in the key the collection it operates on and all the querey customization params that make it unique. we can use the query.getOptions() method to get them all as an object
* we can stringify it and use it as key

### Lecture 53 - Patching Mongoose's Exec

* we try to extend the query.exec method
* we look in github mongoose lib for the implementation of exec method (query.js)
* we go to function Query (mongoose uses classic prototype inheritance)
* prototype inheritance: function Query() has prototype.find, prorrtype.exec, prototype.limit => new Query() => query instance has .find() .exec() .limit()
* Query.protoype.exec impelementation
```
Query.prototype.exec = function exec(op, callback) {
  const _this = this;

  if (typeof op === 'function') {
    callback = op;
    op = null;
  } else if (typeof op === 'string') {
    this.op = op;
  }

  if (callback != null) {
    callback = this.model.$wrapCallback(callback);
  }

  return utils.promiseOrCallback(callback, (cb) => {
    if (!_this.op) {
      cb();
      return;
    }

    this[this.op].call(this, (error, res) => {
      if (error) {
        cb(error);
        return;
      }
      cb(null, res);
    });
  });
};

```
* the method always returns a promise
* we ll write our patched exec funtion in services folder in anew file *cache.js*
* we import mongoose, we get a reference to the default mongouse query exec function
```
const mongoose = require('mongoose');
const exec = mongoose.Query.prototype.exec;
```
* our modification is appliec as a classical function to make use of this para, and passing in arguments in the default function
```
mongoose.Query.prototype.exec = function() {
	console.log('I AM ABOUT TO RUN A QUERY');
	return exec.apply(this,arguments);
}
```
* we import our file to index.js
* we run the server and refresh page. we see the log in console. we are intercepting successfuly the mongoose method

### Lecture 54 - Restoring Blog Routes Handler

* we ll clean up the api blog route callaback from all the caching logic we have added
* it now is resoted to the original content
```
  app.get('/api/blogs', requireLogin, async (req, res) => {
    const blogs = await Blog.find({ _user: req.user.id });
    res.send(blogs)
  });
```

### Lecture 55 - Unique Keys

* we are now ready to implement cache functionality in the overloaded mongoose exec method.
* first we need to sort out the key issue. how to come up with a consistent and unique key
* we need to get an insight in the mongoose query object so we cl it in our function `console.log(this.getQuery());` this refers to the query object we are about to execute
* what we get is an object `{ _id: 5b8d17ced87da20fd8cba5c9 }`
* we actually get 3 objects 2first with same id . the first requests the user, the second requests the user to see that he is logged in. the 3rd requests the blog posts
* query id can serve us but we need to add the collection we are querying on
* to get the collection name in our exec method we use `console.log(this.mongooseCollection.name)`
* we get the collection name in colsole
* we ll combine the 2 in an object `{ _id: 5b8d17ced87da20fd8cba5c9, collection: 'users' }` we will stringify it and use it a s a key

### Lecture 56 - Key Creation

* we need to make a copy of the result of getQuery(). we use the Object.assign() method filling an empty object `Object.assign({}, this.getQuery(), { collection: this.mongooseCollection.name });`
* we do this to avoid modifying the query object

### Lecture 57 - Restoring Redis Config

* we add redis setup in our cache file
```
const redis = require('redis');
const redisUrl = 'redis://127.0.0.1:6379';
const client = redis.createClient(redisUrl);
const util = require('util');
client.get = util.promisify(client.get);
```
* we stringify our key
```
const key = JSON.stringify(Object.assign({}, this.getQuery(), { collection: this.mongooseCollection.name }));
```

### Lecture 58 - Cache Implementation

* we implement switch logic and we console.log
```
	// see if we have a have a value for key in redis
	const cacheValue = await client.get(key)
	// if we do return that
	if (cacheValue) {
		console.log(cacheValue)
	}
	// otherwise issue a query

	const result = await exec.apply(this,arguments);
	console.log(result);
```
* our query result gets loged out

### Lecture 59 - Resolving Values

* our exec in mongoose returns mongoose document
* our redis cache stores only JSON so we need to modigy and return a mongoose doc
* what we got back was a mongodb model instannce (document)
```
{ _id: 5b8d17ced87da20fd8cba5c9,
[0]   googleId: '116159247268436008865',
[0]   displayName: 'Athanasios Chliopanos',
[0]   __v: 0 }\
```
* we can even call a method on the return.validate thats a mongodb docuemnt method to prove wea re getting back a doc
* we take the doc turn it to Json and store it to redis `client.set(key, JSON.stringify(result));`
* we test. second time redis cached JSON query gets spit to console
* we parse it to transform it back to mongo doc
* our user querys gets console logs. our blog query not and not retirned to react

### Lecture 60 - Hydrating Models

* when we try to return in our overloaded exec method json parsed data our app does not behave right
* our app thinks we are logged in but without blogposts
* it has to do with the returned type. we return palin JS object but we need to retrn mongoose documents (model instance) witht he call `new this.model(JSON.parse(cacheValue));`
* we return it but still we dont see the posts on react
* we have 2 types of values that we store in redis
	* model instances
	* arrays of models
* in our code wa assume we will get back just one record stringified

### Lecture 61 - Hydrating Arrays

* we need to do things differently to handle arrays
* if we have an array we have to map each element ot an mongose doc
```
	if (cacheValue) {
		// const doc = new this.model(JSON.parse(cacheValue));
		const doc = JSON.parse(cacheValue);
		return Array.isArray(doc) 
			? doc.map(d => new this.model(d))
			: new this.model(doc); 
	}
```

### Lecture 62 - Toggleable Cache

* we are implementing caching functionality in the exec methon
* exec method is called all the time and this causes delay as all queries are cached
* we dont want to cache all as redis is in-memory and ram is expensive.
* we ll put the cache logic in a separate method we will chain in our query when we want to cache* we will make cache() as a prototype method of the Query class. so we will be able to call it from query instances
* in this method we set a property to the query instance (flag)
* Blog.find() creates an instance so we can call cache() on it to set a flag
```
mongoose.Query.prototype.cache = function() {
	this.useCache = true;
	return this;
}
```
* this refers to the query instance
* to make this method chainable we must return this
* this flag is avalaibale in the overloaded exec method to act as a switch. we use it
```
if (!this.useCache) {
	return exec.apply(this,arguments);
}
```
* in our blogroute we chain the cache method only in the blogfind query `const blogs = await Blog.find({ _user: req.user.id }).cache()`
* we refresh the app. to test we add a 3rd post. it do not appear (cache in effect) we remove cache chain method and it appears (not cached)

### Lecture 63 - Cache Expiration

* redis offers auto cache expiration by specing a expiration time when we store the data.
* we can programmaticaly control cache expiration
* to do auto cache in the .exec overloaded method when we set `client.set()` we will add an extrea param for time in sec `client.set(key, JSON.stringify(result), 'EX', 10)` for 10 sec
* this applies to new redis caches

### Lecture 64 - Forced Cache Expiration

* the problem we want to solve is to update our cache when we update the query content (or even erase the cache)
* we want to erase a slice of cach related to a user
* we reimplkement our cache storage schema. all user data will be stored in separate nested hashes: key: user.id: 1 => value: [nested key: {user.id: 1, collection: 'blogs'}, nested value: result of query]
* whenever a user updates its conetnt his nested cache gets erased, other users caches stay intact

### Lecture 65 - Nested Hashes

* we refactor our cache.js file to use our new caching schema
* we ll see how to make top level key paramtrical
* in the a.cache() method we ll specify the type of key to use. this will be done in an options object passed in. 
* key must be a num or string so we use the stringify helper
* if someone does not pass a key we use empty string
```
mongoose.Query.prototype.cache = function(options = {}) {
	this.useCache = true;
	this.hasKey = JSON.stringify(options.key || '');
	return this;
}
```
* as we work with nested hashes we will use redis hget and hset methods `const cacheValue = await client.hget(this.hashKey, key)`
* we also modify the promisify method for hget
* in our blogroute we need to pass a key param in cache call so we pass cache({key: req.user.id})

### Lecture 66 - Clearing Nested hashes

* we ll now see how to forcibly clear the hash
* we ll define a new method in cache.js file and export it as part of an object
* we define a method clearHash passing in the hashKey. we want to delete all info related to that key (after stringifying it)
```
clearhash(hashKey) {
	client.del(JSON.stringify(hashKey))
}
```
* we import the method in blogroutes
* we will use this clear out when we create new blogs (post request in routes)
* we add `clearHash(req.user.id)` after the try catch statement
* we test

### Lecture 67 - Automated Cache Clearing with Middleware

* we ll refactor using express js middleware system
* in the middlewares folder we add a new file *cleanCache.js*
* we require in the cleaHash method `const { c```
mongoose.Query.prototype.cache = function() {
	this.useCache = true;
	return this;
}
```
* this refers to the query instance
* to make this method chainable we must return this
* this flag is avalaibale in the overloaded exec method to act as a switch. we use it
```
if (!this.useCache) {
	return exec.apply(this,arguments);
}
```
* in our blogroute we chain the cache method only in the blogfind query `const blogs = await Blog.find({ _user: req.user.id }).cache()`
* we refresh the app. to test we add a 3rd post. it do not appear (cache in effect) we remove cache chain method and it appears (not cached)

### Lecture 63 - Cache Expiration

* redis offers auto cache expiration by specing a expiration time when we store the data.
* we can programmaticaly control cache expiration
* to do auto cache in the .exec overloaded method when we set `client.set()` we will add an extrea param for time in sec `client.set(key, JSON.stringify(result), 'EX', 10)` for 10 sec
* this applies to new redis caches

### Lecture 64 - Forced Cache Expiration

* the problem we want to solve is to update our cache when we update the query content (or even erase the cache)
* we want to erase a slice of cach related to a user
* we reimplkement our cache storage schema. all user data will be stored in separate nested hashes: key: user.id: 1 => value: [nested key: {user.id: 1, collection: 'blogs'}, nested value: result of query]
* whenever a user updates its conetnt his nested cache gets erased, other users caches stay intact

### Lecture 65 - Nested Hashes

* we refactor our cache.js file to use our new caching schema
* we ll see how to make top level key paramtrical
* in the a.cache() method we ll specify the type of key to use. this will be done in an options object passed in. 
* key must be a num or string so we use the stringify helper
* if someone does not pass a key we use empty string
```
mongoose.Query.prototype.cache = function(options = {}) {
	this.useCache = true;
	this.hasKey = JSON.stringify(options.key || '');
	return this;
}
```
* as we work with nested hashes we will use redis hget and hset methods `const cacheValue = await client.hget(this.hashKey, key)`
* we also modify the promisify method for hget
* in our blogroute we need to pass a key param in cache call so we pass cache({key: req.user.id})

### Lecture 66 - Clearing Nested hashes

* we ll now see how to forcibly clear the hash```
mongoose.Query.prototype.cache = function() {
	this.useCache = true;
	return this;
}
```
* this refers to the query instance
* to make this method chainable we must return this
* this flag is avalaibale in the overloaded exec method to act as a switch. we use it
```
if (!this.useCache) {
	return exec.apply(this,arguments);
}
```
* in our blogroute we chain the cache method only in the blogfind query `const blogs = await Blog.find({ _user: req.user.id }).cache()`
* we refresh the app. to test we add a 3rd post. it do not appear (cache in effect) we remove cache chain method and it appears (not cached)

### Lecture 63 - Cache Expiration

* redis offers auto cache expiration by specing a expiration time when we store the data.
* we can programmaticaly control cache expiration
* to do auto cache in the .exec overloaded method when we set `client.set()` we will add an extrea param for time in sec `client.set(key, JSON.stringify(result), 'EX', 10)` for 10 sec
* this applies to new redis caches

### Lecture 64 - Forced Cache Expiration

* the problem we want to solve is to update our cache when we update the query content (or even erase the cache)
* we want to erase a slice of cach related to a user
* we reimplkement our cache storage schema. all user data will be stored in separate nested hashes: key: user.id: 1 => value: [nested key: {user.id: 1, collection: 'blogs'}, nested value: result of query]
* whenever a user updates its conetnt his nested cache gets erased, other users caches stay intact

### Lecture 65 - Nested Hashes

* we refactor our cache.js file to use our new caching schema
* we ll see how to make top level key paramtrical
* in the a.cache() method we ll specify the type of key to use. this will be done in an options object passed in. 
* key must be a num or string so we use the stringify helper
* if someone does not pass a key we use empty string
```
mongoose.Query.prototype.cache = function(options = {}) {
	this.useCache = true;
	this.hasKey = JSON.stringify(options.key || '');
	return this;
}
```
* as we work with nested hashes we will use redis hget and hset methods `const cacheValue = await client.hget(this.hashKey, key)`
* we also modify the promisify method for hget
* in our blogroute we need to pass a key param in cache call so we pass cache({key: req.user.id})

### Lecture 66 - Clearing Nested hashes

* we ll now see how to forcibly clear the hash
* we ll define a new method in cache.js file and export it as part of an object
* we define a method clearHash passing in the hashKey. we want to delete all info related to that key (after stringifying it)
```
clearhash(hashKey) {
	client.del(JSON.stringify(hashKey))
}
```
* we import the method in blogroutes
* we will use this clear out when we create new blogs (post request in routes)
* we add `clearHash(req.user.id)` after the try catch statement
* we test

### Lecture 67 - Automated Cache Clearing with Middleware

* we ll refactor using express js middleware system
* in the middlewares folder we add a new file *cleanCache.js*
* we require in the cleaHash method `const { c```
mongoose.Query.prototype.cache = function() {
	this.useCache = true;
	return this;
}
```
* this refers to the query instance
* to make this method chainable we must return this
* this flag is avalaibale in the overloaded exec method to act as a switch. we use it
```
if (!this.useCache) {
	return exec.apply(this,arguments);
}
```
* in our blogroute we chain the cache method only in the blogfind query `const blogs = await Blog.find({ _user: req.user.id }).cache()`
* we refresh the app. to test we add a 3rd post. it do not appear (cache in effect) we remove cache chain method and it appears (not cached)

### Lecture 63 - Cache Expiration

* redis offers auto cache expiration by specing a expiration time when we store the data.
* we can programmaticaly control cache expiration
* to do auto cache in the .exec overloaded method when we set `client.set()` we will add an extrea param for time in sec `client.set(key, JSON.stringify(result), 'EX', 10)` for 10 sec
* this applies to new redis caches

### Lecture 64 - Forced Cache Expiration

* the problem we want to solve is to update our cache when we update the query content (or even erase the cache)
* we want to erase a slice of cach related to a user
* we reimplkement our cache storage schema. all user data will be stored in separate nested hashes: key: user.id: 1 => value: [nested key: {user.id: 1, collection: 'blogs'}, nested value: result of query]
* whenever a user updates its conetnt his nested cache gets erased, other users caches stay intact

### Lecture 65 - Nested Hashes

* we refactor our cache.js file to use our new caching schema
* we ll see how to make top level key paramtrical
* in the a.cache() method we ll specify the type of key to use. this will be done in an options object passed in. 
* key must be a num or string so we use the stringify helper
* if someone does not pass a key we use empty string
```
mongoose.Query.prototype.cache = function(options = {}) {
	this.useCache = true;
	this.hasKey = JSON.stringify(options.key || '');
	return this;
}
```
* as we work with nested hashes we will use redis hget and hset methods `const cacheValue = await client.hget(this.hashKey, key)`
* we also modify the promisify method for hget
* we ll define a new method in cache.js file and export it as part of an object
* we define a method clearHash passing in the hashKey. we want to delete all info related to that key (after stringifying it)
```
clearhash(hashKey) {
	client.del(JSON.stringify(hashKey))
}
```
* we import the method in blogroutes
* we will use this clear out when we create new blogs (post request in routes)
* we add `clearHash(req.user.id)` after the try catch statement
* we test
learHash } = require('../services/cache')`
* we export our method using middleware rules
* our middleware will run before the route handler but we dont want to delete the cache before we event attempt to create the post. we dont want that
* express does not allow us to add middleware after the route handler (we would have to call next() in the handler)
* a hack is to make the midddleware function async using async/awiatr
* we make next() await and add after that the clearhash. in that sense we wait till next method is done (handler) and after we clear the hash
```
module.exports = async (req,res,next) => {
	await next();

	clearHash(req.user.id);
}
```
* we import the middleware export in blogroutes and add it in the post route after login