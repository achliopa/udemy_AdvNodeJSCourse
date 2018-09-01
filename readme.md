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

### Lecture 16 - 