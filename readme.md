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
* lib folder contains builtin libraries (JS code)
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
* these are C++ implementation of JS concepts
* libuv is also used as uv_
```
static uv_once_t init_once = UV_ONCE_INIT;
  uv_once(&init_once, InitCryptoOnce);
```

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

### Lecture 6 - The Node Event Loop

* a node program upon start creates a single thread. 
* in this thread resides an event loop
* the event loop provides control over what will execute at any given time
* it runs after our code file is executed in iterations - loops or ticks

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
* 5) Handle any 'close' events
* an example of a close event is a `readStream.on('close', () => { console.log('cleanup')});`

### Lecture 9 - Is Node single Threaded?

* 