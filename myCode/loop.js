// EVENT LOOP understanding pseydo-code

// Run the node app
// node myFile.js

/////////////////////////// program life cycle

// task list initializations
const pendingTimers = [];
const pendingOSTasks = [];
const pendingOperations = [];

// contents of file get executed
// new times,tasks, operation are reciorded from myFile running
myFile.runContents();

// helper function to decide if event loop will execute one more time
function shouldContinue() {
	// Check one: any pending SetTimeout, SetInterval, setImmediate?
	// Check two: any pending OS tasks? (e.g server listening to port)
	// Check three: any pending long running operations?  (e.g ffs module)
	return pendingTimers.length || pendingOperations.length || pendingOSTasks.length;
}

// event loop kicks in
while(shouldContinue) {
	// single run = tick
	// 1) Node looks at pendingTimers and sees if any functions are ready to be called (setTimeout, setInterval)
	// 2) Node looks at pendingOSTasks and pendingOperations and calls relevant callbacks
	// 3) Node pauses execution (momentarily). Continue when...
	//	- 	a new pendingOStask is done
	// 	- 	a new pendingOperation is done
	//	-	a timer is about to complete
	// 4) Look at pendingTimers (call any setImmediate)
	// 5) Handle any 'close' events
}

///////////////////////////

// quit app
// exit back to terminal