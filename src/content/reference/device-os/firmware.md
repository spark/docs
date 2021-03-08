---
title: Device OS API
layout: reference.hbs
columns: three
devices: [boron,photon,electron,argon,tracker-som]
order: 20
description: Reference manual for the C++ API used by user firmware running on Particle IoT devices
---

Device OS API - {{device}}
==========

You are viewing the Device OS API documentation for the **{{device}}**. To view the documentation for other 
devices, use the blue device selector below the Particle logo on the left side of the page.

The Device OS API for discontinued devices such as the [Spark Core](/reference/discontinued/firmware-core/) and 
[Xenon](/reference/discontinued/firmware-xenon/) 
can be found in the Discontinued section.

## Cloud Functions

{{#if has-cellular}}
### Optimizing Cellular Data Use with Cloud connectivity

{{since when="0.6.0"}}

When the device first connects to the cloud, it establishes a secure channel
and informs the cloud of the registered functions, variables and subscriptions. This uses 4400 bytes of data, plus additional data for each function, variable and subscription.

Subsequent reconnections to the cloud while the device is still powered does not resend this data. Instead, a small reconnection message is sent to the cloud, which uses 135 bytes.

Prior to 0.6.0, when the device was reset or woken from deep sleep, the cloud connection would be fully reinitialized, which meant resending the 4400 bytes of data. From 0.6.0, the device determines that a full reinitialization isn't needed and reuses the existing session (providing it still exists and is usable - see [`Particle.keepAlive()`](#particle-keepalive-)), after validating that the local state matches what was last communicated to the cloud. Connecting to the cloud after reset or wake-up sends just a reconnect message, using 135 bytes of data. A key requirement for the device to be able to determine that the existing session can be reused is that the functions, variables and subscriptions are registered BEFORE connecting to the cloud.

One way to make sure of that is registering functions and variables before connecting to the cloud is easily done using `SEMI_AUTOMATIC` mode:

```cpp
// EXAMPLE USAGE
// Using SEMI_AUTOMATIC mode to get the lowest possible data usage by
// registering functions and variables BEFORE connecting to the cloud.
SYSTEM_MODE(SEMI_AUTOMATIC);

void setup() {
    // register cloudy things
    Particle.function(....);
    Particle.variable(....);
    Particle.subscribe(....);
    // etc...
    // then connect
    Particle.connect();
}
```
{{/if}} {{!-- has-cellular --}}

**Overview of API field limits**

| API Field | Prior to 0.8.0 | Since 0.8.0 | Comment |
|--:|--:|--:|:--|
| Variable Key | 12 | 64 | |
| Variable Data | 622 | 622 | |
| Function Key | 12 | 64 | |
| Function Argument | 63 | 622 | |
| Publish/Subscribe Event Name | 64 | 64 | |
| Publish/Subscribe Event Data | 255 | 622 |  |

Limits are in bytes of UTF-8 encoded characters.

### Particle.variable()

Expose a *variable* through the Cloud so that it can be called with `GET /v1/devices/{DEVICE_ID}/{VARIABLE}`.
Returns a success value - `true` when the variable was registered.

Particle.variable registers a variable, so its value can be retrieved from the cloud in the future. You only call Particle.variable once per variable, typically passing in a global variable. You can change the value of the underlying global variable as often as you want; the value is only retrieved when requested, so simply changing the global variable does not use any data. You do not call Particle.variable when you change the value.

```cpp
// EXAMPLE USAGE

bool flag = false;
int analogvalue = 0;
double tempC = 0;
char *message = "my name is particle";
String aString;

void setup()
{
  Particle.variable("flag", flag);
  Particle.variable("analogvalue", analogvalue);
  Particle.variable("temp", tempC);
  if (Particle.variable("mess", message) == false)
  {
      // variable not registered!
  }
  Particle.variable("mess2", aString);

  pinMode(A0, INPUT);
}

void loop()
{
  // Read the analog value of the sensor (TMP36)
  analogvalue = analogRead(A0);
  // Convert the reading into degree Celsius
  tempC = (((analogvalue * 3.3) / 4095) - 0.5) * 100;
  delay(200);
}
```

Up to 20 cloud variables may be registered and each variable name is limited to a maximum of 12 characters (_prior to 0.8.0_), 64 characters (_since 0.8.0_).

**Note:** Only use letters, numbers, underscores and dashes in variable names. Spaces and special characters may be escaped by different tools and libraries causing unexpected results.

Variables can only be read using the Particle API, or tools that use the API, like the console, CLI, and mobile apps. It's not possible to directly read a variable from another device, even on the same account. Publish and subscribe can be used if you need device-to-device communication.

For non-product devices, only the account that has claimed the device can read variable values from it.

For product devices, if the device is claimed, the device owner's account can read variable values from it. Additionally, the product owner can read variable values whether the device is claimed or not.

When using the default [`AUTOMATIC`](#automatic-mode) system mode, the cloud variables must be registered in the `setup()` function. The information about registered variables will be sent to the cloud when the `setup()` function has finished its execution. In the [`SEMI_AUTOMATIC`](#semi-automatic-mode) and [`MANUAL`](#manual-mode) system modes, the variables must be registered before [`Particle.connect()`](#particle-connect-) is called.

_Before 1.5.0:_ Variable and function registrations are only sent up once, about 30 seconds after connecting to the cloud. When using the [`AUTOMATIC`](#automatic-mode) system mode, make sure you register your cloud variables as early as possible in the `setup()` function, before you do any lengthy operations, delays, or things like waiting for a key press. Calling `Particle.variable()` after the registration information has been sent does not re-send the request and the variable will not work.

String variables must be UTF-8 encoded. You cannot send arbitrary binary data or other character sets like ISO-8859-1. If you need to send binary data you can use a text-based encoding like [Base64](https://github.com/rickkas7/Base64RK).

Prior to 0.4.7 firmware, variables were defined with an additional 3rd parameter to specify the data type of the variable. From 0.4.7 onward, the system can infer the type from the actual variable. Additionally, the variable address was passed via the address-of operator (`&`). With 0.4.7 and newer, this is no longer required.

```cpp
// EXAMPLE USAGE - pre-0.4.7 syntax

bool flag = false;
int analogvalue = 0;
double tempC = 0;
char *message = "my name is particle";

void setup()
{
  Particle.variable("flag", &flag, BOOLEAN);
  Particle.variable("analogvalue", &analogvalue, INT);
  Particle.variable("temp", &tempC, DOUBLE);
  if (Particle.variable("mess", message, STRING) == false)
  {
      // variable not registered!
  }
  pinMode(A0, INPUT);
}
```

There are four supported data types:

 * `BOOLEAN`
 * `INT`
 * `DOUBLE`
 * `STRING` (maximum string length is 622 bytes of UTF-8 encoded characters)

```sh
# EXAMPLE REQUEST IN TERMINAL
# Device ID is 0123456789abcdef
# Your access token is 123412341234
curl "https://api.particle.io/v1/devices/0123456789abcdef/flag?access_token=123412341234"
curl "https://api.particle.io/v1/devices/0123456789abcdef/analogvalue?access_token=123412341234"
curl "https://api.particle.io/v1/devices/0123456789abcdef/temp?access_token=123412341234"
curl "https://api.particle.io/v1/devices/0123456789abcdef/mess?access_token=123412341234"

# In return you'll get something like this:
false
960
27.44322344322344
my name is particle

```

### Particle.variable() - calculated

_Since 1.5.0:_ It is also possible to register a function to compute a cloud variable. This can be more efficient if the computation of a variable takes a lot of CPU or other resources. It can also be an alternative to using a Particle.function(). A function is limited to a single int (32-bit) return value, but you can return bool, double, int, String (up to 622 bytes of UTF-8 encoded characters) from a Particle.variable.

Such a function should return a value of one of the supported variable types and take no arguments. The function will be called only when the value of the variable is requested.

The callback function is called application loop thread context, between calls to loop(), during Particle.process(), and delay().

```cpp
// EXAMPLE USAGE - registering functions as cloud variables

bool flag() {
  return false;
}

int analogvalue() {
  // Read the analog value of the sensor (TMP36)
  return analogRead(A0);
}

double tempC() {
  // Convert the reading into degree Celsius
  return (((analogvalue() * 3.3) / 4095) - 0.5) * 100;
}

String message() {
  return "my name is particle";
}

void setup()
{
  Particle.variable("flag", flag);
  Particle.variable("analogvalue", analogvalue);
  Particle.variable("temp", tempC);
  Particle.variable("mess", message);

  pinMode(A0, INPUT);
}

void loop()
{
}
```

---

It is also possible to pass a `std::function`, allowing the calculation function to be a method of a class:

```cpp
// CALCULATED FUNCTION IN CLASS EXAMPLE
class MyClass {
public:
    MyClass();
    virtual ~MyClass();

    void setup();

    String calculateCounter();

protected:
    int counter = 0;
};

MyClass::MyClass() {

}

MyClass::~MyClass() {

}

void MyClass::setup() {
    Particle.variable("counter", [this](){ return this->calculateCounter(); });
}

String MyClass::calculateCounter() {
    return String::format("counter retrieved %d times", ++counter);
}

MyClass myClass;

void setup() {
    myClass.setup();
}

void loop() {
}
```




### Particle.function()

Expose a *function* through the Cloud so that it can be called with `POST /v1/devices/{DEVICE_ID}/{FUNCTION}`.

Particle.function allows code on the device to be run when requested from the cloud API. You typically do this when you want to control something on your device, say a LCD display or a buzzer, or control features in your firmware from the cloud.

```cpp
// SYNTAX
bool success = Particle.function("funcKey", funcName);

// Cloud functions must return int and take one String
int funcName(String extra) {
  return 0;
}
```

Up to 15 cloud functions may be registered and each function name is limited to a maximum of 12 characters (_prior to 0.8.0_), 64 characters (_since 0.8.0_). 

**Note:** Only use letters, numbers, underscores and dashes in function names. Spaces and special characters may be escaped by different tools and libraries causing unexpected results.
A function callback procedure needs to return as quickly as possible otherwise the cloud call will timeout.

The callback function is called application loop thread context, between calls to loop(), during Particle.process(), and delay().

In order to register a cloud  function, the user provides the `funcKey`, which is the string name used to make a POST request and a `funcName`, which is the actual name of the function that gets called in your app. The cloud function has to return an integer; `-1` is commonly used for a failed function call.

A cloud function is set up to take one argument of the [String](#string-class) datatype. This argument length is limited to a maximum of 622 bytes of UTF-8 encoded characters. (Limited to 63 bytes prior to Device OS 0.8.0.)

Functions can only be triggered using the Particle API, or tools that use the API, like the console, CLI, and mobile apps. It's not possible to directly call a function from another device, even on the same account. Publish and subscribe can be used if you need device-to-device communication.

For non-product devices, only the account that has claimed the device can call a function on it.

For product devices, if the device is claimed, the device owner's account can call a function on it. Additionally, the product owner can call a function whether the device is claimed or not.

When using the default [`AUTOMATIC`](#automatic-mode) system mode, the cloud functions must be registered in the `setup()` function. The information about registered functions will be sent to the cloud when the `setup()` function has finished its execution. In the [`SEMI_AUTOMATIC`](#semi-automatic-mode) and [`MANUAL`](#manual-mode) system modes, the functions must be registered before [`Particle.connect()`](#particle-connect-) is called.

_Before 1.5.0:_ Variable and function registrations are only sent up once, about 30 seconds after connecting to the cloud. When using the [`AUTOMATIC`](#automatic-mode) system mode, make sure you register your cloud functions as early as possible in the `setup()` function, before you do any lengthy operations, delays, or things like waiting for a key press. Calling `Particle.function()` after the registration information has been sent does not re-send the request and the function will not work.

```cpp
// EXAMPLE USAGE

int brewCoffee(String command);

void setup()
{
  // register the cloud function
  Particle.function("brew", brewCoffee);
}

void loop()
{
  // this loops forever
}

// this function automagically gets called upon a matching POST request
int brewCoffee(String command)
{
  // look for the matching argument "coffee" <-- max of 64 characters long
  if(command == "coffee")
  {
    // some example functions you might have
    //activateWaterHeater();
    //activateWaterPump();
    return 1;
  }
  else return -1;
}
```

---

You can expose a method on a C++ object to the Cloud.

```cpp
// EXAMPLE USAGE WITH C++ OBJECT

class CoffeeMaker {
  public:
    CoffeeMaker() {
    }
    
    void setup() {
      // You should not call Particle.function from the constructor 
      // of an object that will be declared as a global variable.
      Particle.function("brew", &CoffeeMaker::brew, this);
    }

    int brew(String command) {
      // do stuff
      return 1;
    }
};

CoffeeMaker myCoffeeMaker;

void setup() {
	myCoffeeMaker.setup();
}
```

---

The API request will be routed to the device and will run your brew function. The response will have a return_value key containing the integer returned by brew.

```json
COMPLEMENTARY API CALL
POST /v1/devices/{DEVICE_ID}/{FUNCTION}

# EXAMPLE REQUEST
curl https://api.particle.io/v1/devices/0123456789abcdef/brew \
     -d access_token=123412341234 \
     -d "args=coffee"
```


### Particle.publish()

Publish an *event* through the Particle Device Cloud that will be forwarded to all registered listeners, such as callbacks, subscribed streams of Server-Sent Events, and other devices listening via `Particle.subscribe()`.

This feature allows the device to generate an event based on a condition. For example, you could connect a motion sensor to the device and have the device generate an event whenever motion is detected.

Particle.publish pushes the value out of the device at a time controlled by the device firmware. Particle.variable allows the value to be pulled from the device when requested from the cloud side.

Cloud events have the following properties:

* name (1–64 ASCII characters)

**Note:** Only use letters, numbers, underscores, dashes and slashes in event names. Spaces and special characters may be escaped by different tools and libraries causing unexpected results.

* optional data, up to 622 bytes of UTF-8 encoded characters. (Limited to 255 bytes prior to Device OS 0.8.0.)

A device may not publish events beginning with a case-insensitive match for "spark".
Such events are reserved for officially curated data originating from the Cloud.

Calling `Particle.publish()` when the cloud connection has been turned off will not publish an event. This is indicated by the return success code of `false`. 

If the cloud connection is turned on and trying to connect to the cloud unsuccessfully, `Particle.publish()` may block for up to 20 seconds (normal conditions) to 10 minutes (unusual conditions). Checking `Particle.connected()` can before calling `Particle.publish()` can help prevent this.

String variables must be UTF-8 encoded. You cannot send arbitrary binary data or other character sets like ISO-8859-1. If you need to send binary data you can use a text-based encoding like [Base64](https://github.com/rickkas7/Base64RK).

**NOTE 1:** Currently, a device can publish at rate of about 1 event/sec, with bursts of up to 4 allowed in 1 second. Back to back burst of 4 messages will take 4 seconds to recover.

**NOTE 2:** `Particle.publish()` and the `Particle.subscribe()` handler(s) share the same buffer. As such, calling `Particle.publish()` within a `Particle.subscribe()` handler will overwrite the subscribe buffer, corrupting the data! In these cases, copying the subscribe buffer's content to a separate char buffer prior to calling `Particle.publish()` is recommended.

**NOTE 3:** Public events are not supported by the cloud as of August 2020. Specifying PUBLIC or leaving out the publish scope essentially results in a private event. 

For non-product devices, events published by a device can be subscribed to:

- By other devices claimed to the same account
- By webhooks for the user the device is claimed to
- By the SSE event stream for the user the device is claimed to

For product devices, events published by a device can be subscribed to:

- By other devices claimed to the same account, if the device is claimed
- By webhooks for the user the device is claimed to, if the device is claimed
- By the SSE event stream for the user the device is claimed to, if the device is claimed
- By product webhooks for the product the device is associated with, whether or not the device is claimed
- By the SSE event stream for the product the device is associated with, whether or not the device is claimed

Public events could previously be received by anyone on the Internet, and anyone could generate events to send to your devices. This did not turn out to a common use-case, and the ease at which you could accidentally use this mode, creating a security hole, caused it to be removed.



---

Publish an event with the given name and no data. 

```cpp
// SYNTAX
Particle.publish(const char *eventName, PublishFlags flags);
Particle.publish(String eventName, PublishFlags flags);
```

**Returns:**
A `bool` indicating success: (true or false)

```cpp
// EXAMPLE USAGE
bool success;
success = Particle.publish("motion-detected");
if (!success) {
  // get here if event publish did not work
}

// EXAMPLE USAGE - This format is no longer necessary
// PRIVATE is the default and only option now
bool success;
success = Particle.publish("motion-detected", PRIVATE);
if (!success) {
  // get here if event publish did not work
}
```

---

```cpp
// PROTOTYPES
particle::Future<bool> publish(const char* name);
particle::Future<bool> publish(const char* name, const char* data);

// EXAMPLE USAGE 1
Particle.publish("temperature", "19");

// EXAMPLE USAGE 2
int temp = 19;
Particle.publish("temperature", String(temp));

// EXAMPLE USAGE 3
float temp = 19.5;
Particle.publish("temperature", String::format("%.1f", temp);
```

Publish an event with the given name and data. 

The data must be a string in the ASCII or UTF-8 character set. If you have an integer or floating point value, you'll need to convert it to a string first.

You cannot publish binary data with Particle.publish. To send binary data, convert it to a string using hex, Base 64, or Base 85 encoding.

---

```cpp
// EXAMPLE - Check if event was queued for publishing successfully
float temp = 19.5;
bool success = Particle.publish("temperature", String::format("%.1f", temp);

// EXAMPLE - Check if event was queued for publishing successfully
float temp = 19.5;
bool success = Particle.publish("temperature", String::format("%.1f", temp);

```

Normally, you store or test the result of Particle.publish in a `bool` variable that indicates that the event was queued for publishing successfully, or reached the cloud, when used with `WITH_ACK`.

But what is the `particle::Future<bool>` in the prototype above? See the application note [AN009 Firmware Examples](https://github.com/particle-iot/app-notes/tree/master/AN009-Firmware-Examples/Stop-Sleep-Cellular#the-future) for how to use a Future to make the otherwise synchronous Particle.publish() call asynchronous. 

---

```json
COMPLEMENTARY API CALL
GET /v1/events/{EVENT_NAME}

# EXAMPLE REQUEST
curl -H "Authorization: Bearer {ACCESS_TOKEN_GOES_HERE}" \
    https://api.particle.io/v1/events/motion-detected

# Will return a stream that echoes text when your event is published
event: motion-detected
data: {"data":"23:23:44","ttl":"60","published_at":"2014-05-28T19:20:34.638Z","deviceid":"0123456789abcdef"}
```


{{#if has-udp-cloud}}
---

```cpp
// PROTOTYPES
particle::Future<bool> publish(const char* name, PublishFlags flags1, PublishFlags flags2 = PublishFlags());
particle::Future<bool> publish(const char* name, const char* data, PublishFlags flags1, PublishFlags flags2 = PublishFlags());

// SYNTAX

float temperature = sensor.readTemperature();  // by way of example, not part of the API
Particle.publish("t", String::format("%.2f",temperature), NO_ACK);  // make sure to convert to const char * or String
```

*`NO_ACK` flag*

Unless specified otherwise, events sent to the cloud are sent as a reliable message. The Electron waits for
acknowledgement from the cloud that the event has been received, resending the event in the background up to 3 times before giving up.

The `NO_ACK` flag disables this acknowledge/retry behavior and sends the event only once.  This reduces data consumption per event, with the possibility that the event may not reach the cloud.

For example, the `NO_ACK` flag could be useful when many events are sent (such as sensor readings) and the occasional lost event can be tolerated.

{{/if}} {{!-- has-udp-cloud --}}
---


```cpp
// SYNTAX
bool success = Particle.publish("motion-detected", NULL, WITH_ACK);

// No longer necessary, PRIVATE is always used even when not specified
bool success = Particle.publish("motion-detected", NULL, PRIVATE, WITH_ACK);
```

*`WITH_ACK` flag*

{{since when="0.6.1"}}

This flag causes `Particle.publish()` to return only after receiving an acknowledgement that the published event has been received by the Cloud. 

If you do not use `WITH_ACK` then the request is still acknowledged internally, and retransmission attempted up to 3 times, but `Particle.publish()` will return more quickly.

---

{{since when="0.7.0"}}

```cpp
// EXAMPLE - combining Particle.publish() flags
// No longer necessary, PRIVATE is always used even when not specified
Particle.publish("motion-detected", PRIVATE | WITH_ACK);
```

`Particle.publish()` flags can be combined using a regular syntax with OR operator (`|`).


---

For [products](/tutorials/device-cloud/console/#product-tools), it's possible receive product events sent by devices using webhooks or the Server-Sent-Events (SSE) data stream. This allows events sent from devices to be received by the product even if the devices are claimed to different accounts. Note that the product event stream is unidirectional from device to the cloud. It's not possible to subscribe to product events on a device.

---

```cpp
// SYNTAX - DEPRECATED
Particle.publish(const char *eventName, const char *data, int ttl, PublishFlags flags);
Particle.publish(String eventName, String data, int ttl, PublishFlags flags);
```

Previously, there were overloads with a `ttl` (time-to-live) value. These have been deprecated as the ttl has never been supported by the Particle cloud. All events expire immediately if not subscribed to or exported from the Particle cloud using a webhook, integration like Google cloud, or the server-sent-events (SSE) stream. 



### Particle.subscribe()

Subscribe to events published by devices.

This allows devices to talk to each other very easily.  For example, one device could publish events when a motion sensor is triggered and another could subscribe to these events and respond by sounding an alarm.

```cpp
SerialLogHandler logHandler;
int i = 0;

void myHandler(const char *event, const char *data)
{
  i++;
  Log.info("%d: event=%s data=%s", i, event, (data ? data : "NULL"));
}

void setup()
{
  Particle.subscribe("temperature", myHandler);
}
```

To use `Particle.subscribe()`, define a handler function and register it, typically in `setup()`.

---

You can register a method in a C++ object as a subscription handler.

```cpp
#include "Particle.h"

SerialLogHandler logHandler;

class MyClass {
public:
	MyClass();
	virtual ~MyClass();

	void setup();

	void subscriptionHandler(const char *eventName, const char *data);
};

MyClass::MyClass() {
}

MyClass::~MyClass() {
}

void MyClass::setup() {
	Particle.subscribe("myEvent", &MyClass::subscriptionHandler, this);
}

void MyClass::subscriptionHandler(const char *eventName, const char *data) {
	Log.info("eventName=%s data=%s", eventName, data);
}

// In this example, MyClass is a globally constructed object.
MyClass myClass;

void setup() {
	myClass.setup();
}

void loop() {

}
```

You should not call `Particle.subscribe()` from the constructor of a globally allocated C++ object. See [Global Object Constructors](#global-object-constructors) for more information.

---

A subscription works like a prefix filter.  If you subscribe to "foo", you will receive any event whose name begins with "foo", including "foo", "fool", "foobar", and "food/indian/sweet-curry-beans". The maximum length of the subscribe prefix is 64 characters.

Received events will be passed to a handler function similar to `Particle.function()`.
A _subscription handler_ (like `myHandler` above) must return `void` and take two arguments, both of which are C strings (`const char *`).

- The first argument is the full name of the published event.
- The second argument (which may be NULL) is any data that came along with the event.

`Particle.subscribe()` returns a `bool` indicating success. It is OK to register a subscription when
the device is not connected to the cloud - the subscription is automatically registered
with the cloud next time the device connects.

**NOTE 1:** A device can register up to 4 event handlers. This means you can call `Particle.subscribe()` a maximum of 4 times; after that it will return `false`.

**NOTE 2:** `Particle.publish()` and the `Particle.subscribe()` handler(s) share the same buffer. As such, calling `Particle.publish()` within a `Particle.subscribe()` handler will overwrite the subscribe buffer, corrupting the data! In these cases, copying the subscribe buffer's content to a separate char buffer prior to calling `Particle.publish()` is recommended.

Unlike functions and variables, you can call Particle.subscribe from setup() or from loop(). The subscription list can be added to at any time, and more than once.

---

Prior to August 2020, you could subscribe to the public event stream using `ALL_DEVICES`. This is no longer possible as the public event stream no longer exists. Likewise, `MY_DEVICES` is no longer necessary as that is the only option now.

```cpp
// This syntax is no longer necessary
Particle.subscribe("the_event_prefix", theHandler, MY_DEVICES);
Particle.subscribe("the_event_prefix", theHandler, ALL_DEVICES);
```

---

Only devices that are claimed to an account can subscribe to events. 

- Unclaimed devices can only be used in a product.
- Unclaimed devices can send product events.
- Unclaimed devices can receive function calls and variable requests from the product.
- Unclaimed devices cannot receive events using Particle.subscribe.

### Particle.unsubscribe()

Removes all subscription handlers previously registered with `Particle.subscribe()`.

```cpp
// SYNTAX
Particle.unsubscribe();
```

There is no function to unsubscribe a single event handler. 


### Particle.publishVitals()

{{since when="1.2.0"}}

```cpp
// SYNTAX

system_error_t Particle.publishVitals(system_tick_t period_s = particle::NOW)

Particle.publishVitals();  // Publish vitals immediately
Particle.publishVitals(particle::NOW);  // Publish vitals immediately
Particle.publishVitals(5);  // Publish vitals every 5 seconds, indefinitely
Particle.publishVitals(0);  // Publish immediately and cancel periodic publishing
```

Publish vitals information

Provides a mechanism to control the interval at which system diagnostic messages are sent to the cloud. Subsequently, this controls the granularity of detail on the fleet health metrics.

**Argument(s):**

* `period_s` The period _(in seconds)_ at which vitals messages are to be sent to the cloud (default value: `particle::NOW`)

  * `particle::NOW` - A special value used to send vitals immediately
  * `0` - Publish a final message and disable periodic publishing
  * `s` - Publish an initial message and subsequent messages every `s` seconds thereafter

**Returns:**

A `system_error_t` result code

* `system_error_t::SYSTEM_ERROR_NONE`
* `system_error_t::SYSTEM_ERROR_IO`

**Examples:**

```cpp
// EXAMPLE - Publish vitals intermittently

bool condition;

setup () {
}

loop () {
  ...  // Some logic that either will or will not set "condition"

  if ( condition ) {
    Particle.publishVitals();  // Publish vitals immmediately
  }
}
```

```cpp
// EXAMPLE - Publish vitals periodically, indefinitely

setup () {
  Particle.publishVitals(3600);  // Publish vitals each hour
}

loop () {
}
```

```cpp
// EXAMPLE - Publish vitals each minute and cancel vitals after one hour

size_t start = millis();

setup () {
  Particle.publishVitals(60);  // Publish vitals each minute
}

loop () {
  // Cancel vitals after one hour
  if (3600000 < (millis() - start)) {
    Particle.publishVitals(0);  // Publish immediately and cancel periodic publishing
  }
}
```

{{since when="1.5.0"}}

You can also specify a value using [chrono literals](#chrono-literals), for example: `Particle.publishVitals(1h)` for 1 hour.


>_**NOTE:** Diagnostic messages can be viewed in the [Console](https://console.particle.io/devices). Select the device in question, and view the messages under the "EVENTS" tab._

<div style="margin-left:35px;"><img src="/assets/images/diagnostic-events.png"/></div>

### Particle.connect()

`Particle.connect()` connects the device to the Cloud. This will automatically activate the {{network-type}} connection and attempt to connect to the Particle cloud if the device is not already connected to the cloud.

{{#if has-gen3}}
**Note:** Due to an open [issue](https://github.com/particle-iot/device-os/issues/1631) the automatic activation of the {{network-type}} connection is currently not working as expected. If the {{network-type}} module is not already powered up, your code needs to explicitly call {{#if has-wifi}}`WiFi.on()`{{/if}}{{#if has-cellular}}`Cellular.on()`{{/if}} before calling `Particle.connect()`.
{{/if}}

```cpp
void setup() {}

void loop() {
  if (Particle.connected() == false) {
    Particle.connect();
  }
}
```

After you call `Particle.connect()`, your loop will not be called again until the device finishes connecting to the Cloud. Typically, you can expect a delay of approximately one second.

In most cases, you do not need to call `Particle.connect()`; it is called automatically when the device turns on. Typically you only need to call `Particle.connect()` after disconnecting with [`Particle.disconnect()`](#particle-disconnect-) or when you change the [system mode](#system-modes).


### Particle.disconnect()

`Particle.disconnect()` disconnects the device from the Cloud.

```cpp
SerialLogHandler logHandler;
int counter = 10000;

void doConnectedWork() {
  digitalWrite(D7, HIGH);
  Log.info("Working online");
}

void doOfflineWork() {
  digitalWrite(D7, LOW);
  Log.info("Working offline");
}

bool needConnection() {
  --counter;
  if (0 == counter)
    counter = 10000;
  return (2000 > counter);
}

void setup() {
  pinMode(D7, OUTPUT);
}

void loop() {
  if (needConnection()) {
    if (!Particle.connected())
      Particle.connect();
    doConnectedWork();
  } else {
    if (Particle.connected())
      Particle.disconnect();
    doOfflineWork();
  }
}
```

{{since when="2.0.0"}}

When disconnecting from the Cloud, by default, the system does not wait for any pending messages, such as cloud events, to be actually sent to acknowledged by the Cloud. This behavior can be changed either globally via [`Particle.setDisconnectOptions()`](#particle-setdisconnectoptions-) or by passing an options object to `Particle.disconnect()`. The timeout parameter controls how long the system can wait for the pending messages to be acknowledged by the Cloud.

```cpp
// EXAMPLE - disconnecting from the Cloud gracefully
Particle.disconnect(CloudDisconnectOptions().graceful(true).timeout(5000));

// EXAMPLE - using chrono literals to specify a timeout
Particle.disconnect(CloudDisconnectOptions().graceful(true).timeout(5s));
```

Note that the actual disconnection happens asynchronously. If necessary, `waitUntil(Particle.disconnected)` can be used to wait until the device has disconnected from the Cloud.

{{#if has-wifi}}
While this function will disconnect from the Cloud, it will keep the connection to the Wi-Fi network. If you would like to completely deactivate the Wi-Fi module, use `WiFi.off()`.
{{/if}}
{{#if has-cellular}}
While this function will disconnect from the Cloud, it will keep the connection to the Cellular network. If you would like to completely deactivate the Cellular module, use `Cellular.off()`.
{{/if}}

**NOTE:* When the device is disconnected, many features are not possible, including over-the-air updates, reading Particle.variables, and calling Particle.functions.

*If you disconnect from the Cloud, you will NOT BE ABLE to flash new firmware over the air. 
Safe mode can be used to reconnect to the cloud.*


### Particle.connected()

Returns `true` when connected to the Cloud, and `false` when disconnected from the Cloud.

```cpp
// SYNTAX
Particle.connected();


// EXAMPLE USAGE
SerialLogHandler logHandler;

void setup() {
}

void loop() {
  if (Particle.connected()) {
    Log.info("Connected!");
  }
  delay(1000);
}
```

### Particle.disconnected()

Returns `true` when disconnected from the Cloud, and `false` when connected to Cloud.

### Particle.setDisconnectOptions()

{{since when="2.0.0"}}

```cpp
// EXAMPLE
Particle.setDisconnectOptions(CloudDisconnectOptions().graceful(true).timeout(5000));

// EXAMPLE
Particle.setDisconnectOptions(CloudDisconnectOptions().graceful(true).timeout(5s));
```

Sets the options for when disconnecting from the cloud, such as from `Particle.disconnect()`. The default is to abruptly disconnect, however, you can use graceful disconnect mode to make sure pending events have been sent and the cloud notified that a disconnect is about to occur. Since this could take some time if there is poor cellular connectivity, a timeout can also be provided in milliseconds or using chrono literals. This setting will be used for future disconnects until the system is reset.

**Note:** This method sets the disconnection options globally, meaning that any method that causes the device to disconnect from the Cloud, such as `System.reset()`, will do so gracefully.

{{#if has-udp-cloud}}
### Particle.keepAlive()

Sets the duration between keep-alive messages used to maintain the connection to the cloud.

```cpp
// SYNTAX
Particle.keepAlive(23 * 60);	// send a ping every 23 minutes
```

A keep-alive is used to implement "UDP hole punching" which helps maintain the connection from the cloud to the device. A temporary port-forwarded back-channel is set up by the network to allow packets to be sent from the cloud to the device. As this is a finite resource, unused back-channels are periodically deleted by the network.

Should a device becomes unreachable from the cloud (such as a timed out function call or variable get), one possible cause of this is that the keep alives have not been sent often enough.

The keep-alive for cellular devices duration varies by mobile network operator. The default keep-alive is set to 23 minutes, which is sufficient to maintain the connection on Particle SIM cards. 3rd party SIM cards will need to determine the appropriate keep alive value, typically ranging from 30 seconds to several minutes.

**Note:** Each keep alive ping consumes 122 bytes of data (61 bytes sent, 61 bytes received).

For Ethernet, you will probably want to set a keepAlive of 2 to 5 minutes.

For the Argon, the keep-alive is not generally needed. However, in unusual networking situations if the network router/firewall removes the port forwarded back-channels unusually aggressively, you may need to use a keep-alive.


{{since when="1.5.0"}}

You can also specify a value using [chrono literals](#chrono-literals), for example: `Particle.keepAlive(2min)` for 2 minutes.


{{/if}} {{!-- has-udp-cloud --}}



### Particle.process()

Runs the background loop. 

{{#unless has-linux}}
`Particle.process()` checks the {{network-type}} module for incoming messages from the Cloud,
and processes any messages that have come in. It also sends keep-alive pings to the Cloud,
so if it's not called frequently, the connection to the Cloud may be lost.

Even in non-cloud-bound applications it can still be advisable to call `Particle.process()` to explicitly provide some processor time to the {{network-type}} module (e.g. immediately after `{{#if has-wifi}}WiFi{{else}}{{#if has-cellular}}Cellular{{/if}}{{/if}}.ready()` to update system variables).
{{/unless}}

```cpp
SerialLogHandler logHandler;

void setup() {
  Serial.begin(9600);
}

void loop() {
  // Do not do this in real code. You should return from loop() instead!
  while (1) {
    Particle.process();
    redundantLoop();
  }
}

void redundantLoop() {
  Log.info("Well that was unnecessary.");
}
```

`Particle.process()` is a blocking call, and blocks for a few milliseconds to several seconds. `Particle.process()` is called automatically after every `loop()` and during delays. Typically you will not need to call `Particle.process()` unless you block in some other way and need to maintain the connection to the Cloud, or you change the [system mode](#system-modes). If the user puts the device into `MANUAL` mode, the user is responsible for calling `Particle.process()`. The more frequently this function is called, the more responsive the device will be to incoming messages, the more likely the Cloud connection will stay open, and the less likely that the Wi-Fi module's buffer will overrun.

### Particle.syncTime()

Synchronize the time with the Particle Device Cloud.
This happens automatically when the device connects to the Cloud.
However, if your device runs continuously for a long time,
you may want to synchronize once per day or so.

```cpp
#define ONE_DAY_MILLIS (24 * 60 * 60 * 1000)
unsigned long lastSync = millis();

void loop() {
  if (millis() - lastSync > ONE_DAY_MILLIS) {
    // Request time synchronization from the Particle Device Cloud
    Particle.syncTime();
    lastSync = millis();
  }
}
```

Note that this function sends a request message to the Cloud and then returns.
The time on the device will not be synchronized until some milliseconds later
when the Cloud responds with the current time between calls to your loop.
See [`Particle.syncTimeDone()`](#particle-synctimedone-), [`Particle.timeSyncedLast()`](#particle-timesyncedlast-), [`Time.isValid()`](#isvalid-) and [`Particle.syncTimePending()`](#particle-synctimepending-) for information on how to wait for request to be finished.

### Particle.syncTimeDone()

{{since when="0.6.1"}}

Returns `true` if there is no `syncTime()` request currently pending or there is no active connection to Particle Device Cloud. Returns `false` when there is a pending `syncTime()` request.

```cpp
// SYNTAX
Particle.syncTimeDone();


// EXAMPLE
SerialLogHandler logHandler;

void loop()
{
  // Request time synchronization from the Particle Device Cloud
  Particle.syncTime();
  // Wait until the device receives time from Particle Device Cloud (or connection to Particle Device Cloud is lost)
  waitUntil(Particle.syncTimeDone);
  // Print current time
  Log.info("Current time: %s", Time.timeStr().c_str());
}
```

See also [`Particle.timeSyncedLast()`](#particle-timesyncedlast-) and [`Time.isValid()`](#isvalid-).

### Particle.syncTimePending()

{{since when="0.6.1"}}

Returns `true` if there a `syncTime()` request currently pending. Returns `false` when there is no `syncTime()` request pending or there is no active connection to Particle Device Cloud.

```cpp
// SYNTAX
Particle.syncTimePending();


// EXAMPLE
SerialLogHandler logHandler;

void loop()
{
  // Request time synchronization from the Particle Device Cloud
  Particle.syncTime();
  // Wait until the device receives time from Particle Device Cloud (or connection to Particle Device Cloud is lost)
  while(Particle.syncTimePending())
  {
    //
    // Do something else
    //

    Particle.process();
  }
  // Print current time
  Log.info("Current time: %s", Time.timeStr().c_str());
}
```

See also [`Particle.timeSyncedLast()`](#particle-timesyncedlast-) and [`Time.isValid()`](#isvalid-).

### Particle.timeSyncedLast()

```cpp
// EXAMPLE

SerialLogHandler logHandler;

#define ONE_DAY_MILLIS (24 * 60 * 60 * 1000)

void loop() {
  time_t lastSyncTimestamp;
  unsigned long lastSync = Particle.timeSyncedLast(lastSyncTimestamp);
  if (millis() - lastSync > ONE_DAY_MILLIS) {
    unsigned long cur = millis();
    Log.info("Time was last synchronized %lu milliseconds ago", millis() - lastSync);
    if (lastSyncTimestamp > 0)
    {
      Log.info("Time received from Particle Device Cloud was: ", Time.timeStr(lastSyncTimestamp).c_str());
    }
    // Request time synchronization from Particle Device Cloud
    Particle.syncTime();
    // Wait until the device receives time from Particle Device Cloud (or connection to Particle Device Cloud is lost)
    waitUntil(Particle.syncTimeDone);
    // Check if synchronized successfully
    if (Particle.timeSyncedLast() >= cur)
    {
      // Print current time
      Log.info("Current time: %s", Time.timeStr().c_str());
    }
  }
}
```

{{since when="0.6.1"}}

Used to check when time was last synchronized with Particle Device Cloud.

```cpp
// SYNTAX
Particle.timeSyncedLast();
Particle.timeSyncedLast(timestamp);
```

Returns the number of milliseconds since the device began running the current program when last time synchronization with Particle Device Cloud was performed.

This function takes one optional argument:
- `timestamp`: `time_t` variable that will contain a UNIX timestamp received from Particle Device Cloud during last time synchronization

### Get Public IP

Using this feature, the device can programmatically know its own public IP address.

```cpp
LogHandler logHandler;

// Open a serial terminal and see the IP address printed out
void handler(const char *topic, const char *data) {
    Log.info("topic=%s data=%s", topic, data);
}

void setup() {
    Particle.subscribe("particle/device/ip", handler);
    Particle.publish("particle/device/ip");
}
```


### Get Device name

This gives you the device name that is stored in the cloud,

```cpp
LogHandler logHandler;

// Open a serial terminal and see the device name printed out
void handler(const char *topic, const char *data) {
    Log.info("topic=%s data=%s", topic, data);
}

void setup() {
    Particle.subscribe("particle/device/name", handler);
    Particle.publish("particle/device/name");
}
```

### Get Random seed

Grab 40 bytes of randomness from the cloud and {e}n{c}r{y}p{t} away!

```cpp
LogHandler logHandler;

void handler(const char *topic, const char *data) {
    Log.info("topic=%s data=%s", topic, data);
}

void setup() {
    Serial.begin(115200);
    Particle.subscribe("particle/device/random", handler);
    Particle.publish("particle/device/random");
}
```

{{#if has-ethernet}}
## Ethernet

Ethernet is available on the Argon and Boron when used with the [Ethernet FeatherWing](/datasheets/accessories/gen3-accessories/#ethernet-featherwing/).

By default, Ethernet detection is not done because it will toggle GPIO that may affect circuits that are not using Ethernet. When you select Ethernet during mobile app setup, it is enabled and the setting stored in configuration flash.

It's also possible to enable Ethernet detection from code. This is saved in configuration flash so you don't need to call it every time. 

You should call it from setup() but make sure you are using `SYSTEM_THREAD(ENABLED)` so it can be enabled before the connecting to the cloud. You should not call it from STARTUP().

```cpp
SYSTEM_THREAD(ENABLED);

void setup() 
{
  System.enableFeature(FEATURE_ETHERNET_DETECTION);
}
```

If you are using the Adafruit Ethernet Feather Wing (instead of the Particle Feather Wing), be sure to connect the nRESET and nINTERRUPT pins (on the small header on the short side) to pins D3 and D4 with jumper wires. These are required for proper operation.

| Argon, Boron| B Series SoM | Ethernet FeatherWing Pin  |
|:------:|:------------:|:--------------------------|
|MISO    | MISO         | SPI MISO                  |
|MOSI    | MOSI         | SPI MOSI                  |
|SCK     | SCK          | SPI SCK                   |
|D3      | A7           | nRESET                    |
|D4      | D22          | nINTERRUPT                |
|D5      | D8           | nCHIP SELECT              |

When using the FeatherWing Gen 3 devices (Argon, Boron, Xenon), pins D3, D4, and D5 are reserved for Ethernet control pins (reset, interrupt, and chip select).

When using Ethernet with the Boron SoM, pins A7, D22, and D8 are reserved for the Ethernet control pins (reset, interrupt, and chip select).


### on()

`Ethernet.on()` turns on the Ethernet module. Useful when you've turned it off, and you changed your mind.

Note that `Ethernet.on()` does not need to be called unless you have changed the [system mode](#system-modes) or you have previously turned the Ethernet module off.

### off()

`Ethernet.off()` turns off the Ethernet module. 
 
### connect()

Attempts to connect to the Ethernet network. If there are no credentials stored, this will enter listening mode. When this function returns, the device may not have an IP address on the LAN; use `Ethernet.ready()` to determine the connection status.

```cpp
// SYNTAX
Ethernet.connect();
```

### disconnect()

Disconnects from the Ethernet network, but leaves the Ethernet module on.

```cpp
// SYNTAX
Ethernet.disconnect();
```

### connecting()

This function will return `true` once the device is attempting to connect using stored credentials, and will return `false` once the device has successfully connected to the Ethernet network.

```cpp
// SYNTAX
Ethernet.connecting();
```

### ready()

This function will return `true` once the device is connected to the network and has been assigned an IP address, which means that it's ready to open TCP sockets and send UDP datagrams. Otherwise it will return `false`.

```cpp
// SYNTAX
Ethernet.ready();
```

### listen()

This will enter or exit listening mode, which opens a Serial connection to get Ethernet credentials over USB, and also listens for credentials over
Bluetooth.

```cpp
// SYNTAX - enter listening mode
Ethernet.listen();
```

Listening mode blocks application code. Advanced cases that use multithreading, interrupts, or system events
have the ability to continue to execute application code while in listening mode, and may wish to then exit listening
mode, such as after a timeout. Listening mode is stopped using this syntax:

```cpp

// SYNTAX - exit listening mode
Ethernet.listen(false);

```

### listening()

```cpp
// SYNTAX
Ethernet.listening();
```

This command is only useful in connection with `SYSTEM_THREAD(ENABLED)`, otherwise it will always return `false`, because listening mode blocks application code.
With a dedicated system thread though `Ethernet.listening()` will return `true` once `Ethernet.listen()` has been called
or the {{system-button}} button has been held for 3 seconds, when the RGB LED should be blinking blue.
It will return `false` when the device is not in listening mode.

### setListenTimeout()

```cpp
// SYNTAX
Ethernet.setListenTimeout(seconds);
```

`Ethernet.setListenTimeout(seconds)` is used to set a timeout value for Listening Mode.  Values are specified in `seconds`, and 0 disables the timeout.  By default, Ethernet devices do not have any timeout set (seconds=0).  As long as interrupts are enabled, a timer is started and running while the device is in listening mode (Ethernet.listening()==true).  After the timer expires, listening mode will be exited automatically.  If Ethernet.setListenTimeout() is called while the timer is currently in progress, the timer will be updated and restarted with the new value (e.g. updating from 10 seconds to 30 seconds, or 10 seconds to 0 seconds (disabled)).  
**Note:** Enabling multi-threaded mode with SYSTEM_THREAD(ENABLED) will allow user code to update the timeout value while Listening Mode is active.

{{since when="1.5.0"}}

You can also specify a value using [chrono literals](#chrono-literals), for example: `Ethernet.setListenTimeout(5min)` for 5 minutes.

### getListenTimeout()

```cpp
// SYNTAX
uint16_t seconds = Ethernet.getListenTimeout();
```

`Ethernet.getListenTimeout()` is used to get the timeout value currently set for Listening Mode.  Values are returned in (uint16_t)`seconds`, and 0 indicates the timeout is disabled.  By default, Ethernet devices do not have any timeout set (seconds=0).


### macAddress()

`Ethernet.macAddress()` gets the MAC address of the Ethernet interface.

```cpp
// EXAMPLE
SerialLogHandler logHandler;

void setup() {
  // Wait for a USB serial connection for up to 30 seconds
  waitFor(Serial.isConnected, 30000);

  uint8_t addr[6];
  Ethernet.macAddress(addr);
  
  Log.info("mac: %02x-%02x-%02x-%02x-%02x-%02x", addr[0], addr[1], addr[2], addr[3], addr[4], addr[5]);
}
```

### localIP()

`Ethernet.localIP()` is used to get the IP address of the Ethernet interface as an `IPAddress`.

```cpp
// EXAMPLE
SerialLogHandler logHandler;

void setup() {
  // Wait for a USB serial connection for up to 30 seconds
  waitFor(Serial.isConnected, 30000);

  Log.info("localIP: %s", Ethernet.localIP().toString().c_str());
}
```

### subnetMask()

`Ethernet.subnetMask()` returns the subnet mask of the network as an `IPAddress`.

```cpp
SerialLogHandler logHandler;

void setup() {
 // Wait for a USB serial connection for up to 30 seconds
  waitFor(Serial.isConnected, 30000);

  // Prints out the subnet mask over Serial.
  Log.info(Ethernet.subnetMask());
}
```

### gatewayIP()

`Ethernet.gatewayIP()` returns the gateway IP address of the network as an `IPAddress`.

```cpp
SerialLogHandler logHandler;

void setup() {
  Serial.begin(9600);
  // Wait for a USB serial connection for up to 30 seconds
  waitFor(Serial.isConnected, 30000);

  // Prints out the gateway IP over Serial.
  Log.info(Ethernet.gatewayIP());
}
```

### dnsServerIP()

`Ethernet.dnsServerIP()` retrieves the IP address of the DNS server that resolves
DNS requests for the device's network connection. This will often be 0.0.0.0.

### dhcpServerIP()

`Ethernet.dhcpServerIP()` retrieves the IP address of the DHCP server that manages
the IP address used by the device's network connection. This often will be 0.0.0.0.

{{/if}}


{{#if has-wifi}}
## WiFi

### on()

`WiFi.on()` turns on the Wi-Fi module. Useful when you've turned it off, and you changed your mind.

Note that `WiFi.on()` does not need to be called unless you have changed the [system mode](#system-modes) or you have previously turned the Wi-Fi module off.

### off()

`WiFi.off()` turns off the Wi-Fi module. Useful for saving power, since most of the power draw of the device is the Wi-Fi module.

### connect()

Attempts to connect to the Wi-Fi network. If there are no credentials stored, this will enter listening mode (see below for how to avoid this.). If there are credentials stored, this will try the available credentials until connection is successful. When this function returns, the device may not have an IP address on the LAN; use `WiFi.ready()` to determine the connection status.

```cpp
// SYNTAX
WiFi.connect();
```

{{since when="0.4.5"}}

It's possible to call `WiFi.connect()` without entering listening mode in the case where no credentials are stored:

```cpp
// SYNTAX
WiFi.connect(WIFI_CONNECT_SKIP_LISTEN);
```

If there are no credentials then the call does nothing other than turn on the Wi-Fi module.

{{#if has-gen3}}
**Note:** Due to an open [issue](https://github.com/particle-iot/device-os/issues/1631) the automatic activation of the {{network-type}} connection is currently not working as expected. If the {{network-type}} module is not already powered up, your code needs to explicitly call {{#if has-wifi}}`WiFi.on()`{{/if}}{{#if has-cellular}}`Cellular.on()`{{/if}} before calling {{#if has-wifi}}[`WiFi.connect()`](#connect--2){{/if}}{{#if has-cellular}}[`Cellular.connect()`](#on-){{/if}}.
{{/if}}

### disconnect()

Disconnects from the Wi-Fi network, but leaves the Wi-Fi module on.

```cpp
// SYNTAX
WiFi.disconnect();
```

### connecting()

This function will return `true` once the device is attempting to connect using stored Wi-Fi credentials, and will return `false` once the device has successfully connected to the Wi-Fi network.

```cpp
// SYNTAX
WiFi.connecting();
```

### ready()

This function will return `true` once the device is connected to the network and has been assigned an IP address, which means that it's ready to open TCP sockets and send UDP datagrams. Otherwise it will return `false`.

```cpp
// SYNTAX
WiFi.ready();
```

{{#if has-wifi-antenna-switch}}
### selectAntenna() [Antenna]

Selects which antenna the device should connect to Wi-Fi with and remembers that
setting until it is changed.

```cpp
// SYNTAX
STARTUP(WiFi.selectAntenna(ANT_INTERNAL)); // selects the CHIP antenna
STARTUP(WiFi.selectAntenna(ANT_EXTERNAL)); // selects the u.FL antenna
STARTUP(WiFi.selectAntenna(ANT_AUTO)); // continually switches at high speed between antennas
```

`WiFi.selectAntenna()` selects one of three antenna modes on your Photon or P1.  It takes one argument: `ANT_AUTO`, `ANT_INTERNAL` or `ANT_EXTERNAL`.
`WiFi.selectAntenna()` must be used inside another function like STARTUP(), setup(), or loop() to compile.

You may specify in code which antenna to use as the default at boot time using the STARTUP() macro.

> Note that the antenna selection is remembered even after power off or when entering safe mode.
This is to allow your device to be configured once and then continue to function with the
selected antenna when applications are flashed that don't specify which antenna to use.

This ensures that devices which must use the external antenna continue to use the external
antenna in all cases even when the application code isn't being executed (e.g. safe mode.)

If no antenna has been previously selected, the `ANT_INTERNAL` antenna will be chosen by default.

`WiFi.selectAntenna()` returns 0 on success, or -1005 if the antenna choice was not found.
Other errors that may appear will all be negative values.

```cpp
// Use the STARTUP() macro to set the default antenna
// to use system boot time.
// In this case it would be set to the chip antenna
STARTUP(WiFi.selectAntenna(ANT_INTERNAL));

void setup() {
  // your setup code
}

void loop() {
  // your loop code
}
```

{{/if}} {{!-- has-wifi-antenna-switch --}}

### listen()

This will enter or exit listening mode, which opens a Serial connection to get Wi-Fi credentials over USB, and also listens for credentials over
Soft AP on the Photon or BLE on the Argon.

```cpp
// SYNTAX - enter listening mode
WiFi.listen();
```

Listening mode blocks application code. Advanced cases that use multithreading, interrupts, or system events
have the ability to continue to execute application code while in listening mode, and may wish to then exit listening
mode, such as after a timeout. Listening mode is stopped using this syntax:

```cpp

// SYNTAX - exit listening mode
WiFi.listen(false);

```



### listening()

```cpp
// SYNTAX
WiFi.listening();
```

{{#if has-threading}}
This command is only useful in connection with `SYSTEM_THREAD(ENABLED)`, otherwise it will always return `false`, because listening mode blocks application code.
With a dedicated system thread though `WiFi.listening()` will return `true` once `WiFi.listen()` has been called
or the {{system-button}} button has been held for 3 seconds, when the RGB LED should be blinking blue.
It will return `false` when the device is not in listening mode.
{{/if}} {{!-- has-threading --}}


### setListenTimeout()

{{since when="0.6.1"}}

```cpp
// SYNTAX
WiFi.setListenTimeout(seconds);
```

`WiFi.setListenTimeout(seconds)` is used to set a timeout value for Listening Mode.  Values are specified in `seconds`, and 0 disables the timeout.  By default, Wi-Fi devices do not have any timeout set (seconds=0).  As long as interrupts are enabled, a timer is started and running while the device is in listening mode (WiFi.listening()==true).  After the timer expires, listening mode will be exited automatically.  If WiFi.setListenTimeout() is called while the timer is currently in progress, the timer will be updated and restarted with the new value (e.g. updating from 10 seconds to 30 seconds, or 10 seconds to 0 seconds (disabled)).  {{#if has-threading}}**Note:** Enabling multi-threaded mode with SYSTEM_THREAD(ENABLED) will allow user code to update the timeout value while Listening Mode is active.{{/if}} 


```cpp
// EXAMPLE
// If desired, use the STARTUP() macro to set the timeout value at boot time.
STARTUP(WiFi.setListenTimeout(60)); // set listening mode timeout to 60 seconds

void setup() {
  // your setup code
}
{{#if has-threading}}
void loop() {
  // update the timeout later in code based on an expression
  if (disableTimeout) WiFi.setListenTimeout(0); // disables the listening mode timeout
}
{{/if}}
```

{{since when="1.5.0"}}

You can also specify a value using [chrono literals](#chrono-literals), for example: `WiFi.setListenTimeout(5min)` for 5 minutes.



### getListenTimeout()

{{since when="0.6.1"}}

```cpp
// SYNTAX
uint16_t seconds = WiFi.getListenTimeout();
```

`WiFi.getListenTimeout()` is used to get the timeout value currently set for Listening Mode.  Values are returned in (uint16_t)`seconds`, and 0 indicates the timeout is disabled.  By default, Wi-Fi devices do not have any timeout set (seconds=0).


### setCredentials()

Allows the application to set credentials for the Wi-Fi network from within the code. These credentials will be added to the device's memory, and the device will automatically attempt to connect to this network in the future.

Your device can remember more than one set of credentials:
- Photon: remembers the 5 most recently set credentials.
- Argon: remembers the 10 most recently set credentials.

{{#if has-stm32}}
{{since when="0.7.0"}} Photon can store one set of WPA Enterprise credentials.
{{/if}}

```cpp
// Connects to an unsecured network.
WiFi.setCredentials(ssid);
WiFi.setCredentials("My_Router_Is_Big");

// Connects to a network secured with WPA2 credentials.
WiFi.setCredentials(ssid, password);
WiFi.setCredentials("My_Router", "mypasswordishuge");

// Connects to a network with a specified authentication procedure.
// Options are WPA2, WPA, or WEP.
WiFi.setCredentials(ssid, password, auth);
WiFi.setCredentials("My_Router", "wepistheworst", WEP);
```

{{#if photon}}
When the Photon is used with hidden or offline networks, the security cipher is also required.

```cpp

// for hidden and offline networks on the Photon, the security cipher is also needed
// Cipher options are WLAN_CIPHER_AES, WLAN_CIPHER_TKIP and WLAN_CIPHER_AES_TKIP
WiFi.setCredentials(ssid, password, auth, cipher);
WiFi.setCredentials("SSID", "PASSWORD", WPA2, WLAN_CIPHER_AES);
```

{{/if}} {{!-- photon --}}

```cpp
// Connects to a network with an authentication procedure specified by WiFiCredentials object
WiFi.setCredentials(credentials);
WiFiCredentials credentials;
credentials.setSsid("My_Router")
           .setSecurity(WEP)
           .setPassword("wepistheworst");
WiFi.setCredentials(credentials);
```

{{since when="0.7.0"}}

Credentials can be set using [WiFiCredentials class](#wificredentials-class).

For information on setting up WPA2 Enterprise from the Particle CLI, see [this article](https://support.particle.io/hc/en-us/articles/360039741153).

{{#if has-wpa-enterprise}}
```cpp
// WPA2 Enterprise with EAP-TLS

// We are setting WPA2 Enterprise credentials
WiFiCredentials credentials("My_Enterprise_AP", WPA2_ENTERPRISE);
// EAP type: EAP-TLS
credentials.setEapType(WLAN_EAP_TYPE_TLS);
// Client certificate in PEM format
credentials.setClientCertificate("-----BEGIN CERTIFICATE-----\r\n" \
                                 /* ... */ \
                                 "-----END CERTIFICATE-----\r\n\r\n"
                                );
// Private key in PEM format
credentials.setPrivateKey("-----BEGIN RSA PRIVATE KEY-----\r\n" \
                          /* ... */ \
                          "-----END RSA PRIVATE KEY-----\r\n\r\n"
                         );
// Root (CA) certificate in PEM format (optional)
credentials.setRootCertificate("-----BEGIN CERTIFICATE-----\r\n" \
                               /* ... */ \
                               "-----END CERTIFICATE-----\r\n\r\n"
                              );
// EAP outer identity (optional, default - "anonymous")
credentials.setOuterIdentity("anonymous");
// Save credentials
WiFi.setCredentials(credentials);
```

```cpp
// WPA Enterprise with PEAP/MSCHAPv2

// We are setting WPA Enterprise credentials
WiFiCredentials credentials("My_Enterprise_AP", WPA_ENTERPRISE);
// EAP type: PEAP/MSCHAPv2
credentials.setEapType(WLAN_EAP_TYPE_PEAP);
// Set username
credentials.setIdentity("username");
// Set password
credentials.setPassword("password");
// Set outer identity (optional, default - "anonymous")
credentials.setOuterIdentity("anonymous");
// Root (CA) certificate in PEM format (optional)
credentials.setRootCertificate("-----BEGIN CERTIFICATE-----\r\n" \
                               /* ... */ \
                               "-----END CERTIFICATE-----\r\n\r\n"
                              );
// Save credentials
WiFi.setCredentials(credentials);
```
{{/if}}

Parameters:
- `ssid`: SSID (string)
- `password`: password (string)
- `auth`: see [SecurityType](#securitytype-enum) enum.
- `cipher`: see [WLanSecurityCipher](#wlansecuritycipher-enum) enum.
- `credentials`: an instance of [WiFiCredentials class](#wificredentials-class).

This function returns `true` if credentials were successfully saved, or `false` in case of an error.

**Note:** Setting WPA/WPA2 Enterprise credentials requires use of [WiFiCredentials class](#wificredentials-class).

**Note:** In order for `WiFi.setCredentials()` to work, the Wi-Fi module needs to be on (if switched off or disabled via non_AUTOMATIC SYSTEM_MODEs call `WiFi.on()`).

### getCredentials()

{{since when="0.4.9"}}

Lists the Wi-Fi networks with credentials stored on the device. Returns the number of stored networks.

Note that this returns details about the Wi-Fi networks, but not the actual password.


```cpp
// DEFINITION
typedef struct WiFiAccessPoint {
   size_t size;
   char ssid[33];
   uint8_t ssidLength;
   uint8_t bssid[6];
   WLanSecurityType security;
   WLanSecurityCipher cipher;
   uint8_t channel;
   int maxDataRate;
   int rssi; 
} WiFiAccessPoint;

// EXAMPLE
LogHandler logHandler;

WiFiAccessPoint ap[5];
int found = WiFi.getCredentials(ap, 5);
for (int i = 0; i < found; i++) {
    Log.info("ssid: %s", ap[i].ssid);
    // security is one of WLAN_SEC_UNSEC, WLAN_SEC_WEP, WLAN_SEC_WPA, WLAN_SEC_WPA2, WLAN_SEC_WPA_ENTERPRISE, WLAN_SEC_WPA2_ENTERPRISE
    Log.info("security: %d", (int) ap[i].security);
    // cipher is one of WLAN_CIPHER_AES, WLAN_CIPHER_TKIP or WLAN_CIPHER_AES_TKIP
    Log.info("cipher: %d", (int) ap[i].cipher);
}
```


### clearCredentials()

This will clear all saved credentials from the Wi-Fi module's memory. This will return `true` on success and `false` if the Wi-Fi module has an error.

```cpp
// SYNTAX
WiFi.clearCredentials();
```

### hasCredentials()

Will return `true` if there are Wi-Fi credentials stored in the Wi-Fi module's memory.

```cpp
// SYNTAX
WiFi.hasCredentials();
```

### macAddress()

`WiFi.macAddress()` returns the MAC address of the device.

```cpp
// EXAMPLE USAGE
SerialLogHandler logHandler;
byte mac[6];

void setup() {
  WiFi.on();
  // wait up to 10 seconds for USB host to connect
  // requires firmware >= 0.5.3
  waitFor(Serial.isConnected, 10000);

  WiFi.macAddress(mac);

  Log.info("mac: %02x:%02x:%02x:%02x:%02x:%02x", mac[0], mac[1], mac[2], mac[3], mac[4], mac[5]);
}
```

### SSID()

`WiFi.SSID()` returns the SSID of the network the device is currently connected to as a `char*`.

### BSSID()

`WiFi.BSSID()` retrieves the 6-byte MAC address of the access point the device is currently connected to.

```cpp
SerialLogHandler logHandler;
byte bssid[6];

void setup() {
  Serial.begin(9600);
  // Wait for a USB serial connection for up to 30 seconds
  waitFor(Serial.isConnected, 30000);

  WiFi.BSSID(bssid);
  Log.info("%02X:%02X:%02X:%02X:%02X:%02X", bssid[0], bssid[1], bssid[2], bssid[3], bssid[4], bssid[5]);
}
```

### RSSI()

`WiFi.RSSI()` returns the signal strength of a Wi-Fi network from -127 (weak) to -1dB (strong) as an `int`. Positive return values indicate an error with 1 indicating a Wi-Fi chip error and 2 indicating a time-out error.

```cpp
// SYNTAX
int rssi = WiFi.RSSI();
WiFiSignal rssi = WiFi.RSSI();
```

_Since 0.8.0_

`WiFi.RSSI()` returns an instance of [`WiFiSignal`](#wifisignal-class) class.

```cpp
// SYNTAX
WiFiSignal sig = WiFi.RSSI();
```

If you are passing the RSSI value as a variable argument, such as with Serial.printlnf, Log.info, snprintf, etc. make sure you add a cast:

```
Log.info("RSSI=%d", (int8_t) WiFi.RSSI()).
```

This is necessary for the compiler to correctly convert the WiFiSignal class into a number.

### WiFiSignal Class

This class allows to query a number of signal parameters of the currently connected WiFi network.

#### getStrength()

Gets the signal strength as a percentage (0.0 - 100.0). See [`getStrengthValue()`](#getstrengthvalue-) on how strength values are mapped to 0%-100% range.

```cpp
// SYNTAX
WiFiSignal sig = WiFi.RSSI();
float strength = sig.getStrength();

// EXAMPLE
WiFiSignal sig = WiFi.RSSI();
Log.info("WiFi signal strength: %.02f%%", sig.getStrength());
```

Returns: `float`

#### getQuality()

Gets the signal quality as a percentage (0.0 - 100.0). See [`getQualityValue()`](#getqualityvalue-) on how quality values are mapped to 0%-100% range.

```cpp
// SYNTAX
WiFiSignal sig = WiFi.RSSI();
float quality = sig.getQuality();

// EXAMPLE
WiFiSignal sig = WiFi.RSSI();
Log.info("WiFi signal quality: %.02f%%", sig.getQuality());
```

Returns: `float`

#### getStrengthValue()

```cpp
// SYNTAX
WiFiSignal sig = WiFi.RSSI();
float strength = sig.getStrengthValue();
```

Gets the raw signal strength value in dBm. Range: [-90, 0].

Returns: `float`

#### getQualityValue()

```cpp
// SYNTAX
WiFiSignal sig = WiFi.RSSI();
float quality = sig.getQualityValue();
```

Gets the raw signal quality value (SNR) in dB. Range: [0, 90].

Returns: `float`

### ping()

`WiFi.ping()` allows you to ping an IP address and returns the number of packets received as an `int`. It takes two forms:

`WiFi.ping(IPAddress remoteIP)` takes an `IPAddress` and pings that address.

`WiFi.ping(IPAddress remoteIP, uint8_t nTries)` and pings that address a specified number of times.

### scan()

Returns information about access points within range of the device.

The first form is the simplest, but also least flexible. You provide a
array of `WiFiAccessPoint` instances, and the call to `WiFi.scan()` fills out the array.
If there are more APs detected than will fit in the array, they are dropped.
Returns the number of access points written to the array.

```cpp
// EXAMPLE - retrieve up to 20 Wi-Fi APs
SerialLogHandler logHandler;

WiFiAccessPoint aps[20];
int found = WiFi.scan(aps, 20);
for (int i=0; i<found; i++) {
    WiFiAccessPoint& ap = aps[i];
    Log.info("ssid=%s security=%d channel=%d rssi=%d", ap.ssid, (int)ap.security, (int)ap.channel, ap.rssi);
}
```

The more advanced call to `WiFi.scan()` uses a callback function that receives
each scanned access point.

```
// EXAMPLE using a callback
void wifi_scan_callback(WiFiAccessPoint* wap, void* data)
{
    WiFiAccessPoint& ap = *wap;
    Log.info("ssid=%s security=%d channel=%d rssi=%d", ap.ssid, (int)ap.security, (int)ap.channel, ap.rssi);
}

void loop()
{
    int result_count = WiFi.scan(wifi_scan_callback);
    Log.info("result_count=%d", result_count);
}
```

The main reason for doing this is that you gain access to all access points available
without having to know in advance how many there might be.

You can also pass a 2nd parameter to `WiFi.scan()` after the callback, which allows
object-oriented code to be used.

```
// EXAMPLE - class to find the strongest AP

class FindStrongestSSID
{
    char strongest_ssid[33];
    int strongest_rssi;

    // This is the callback passed to WiFi.scan()
    // It makes the call on the `self` instance - to go from a static
    // member function to an instance member function.
    static void handle_ap(WiFiAccessPoint* wap, FindStrongestSSID* self)
    {
        self->next(*wap);
    }

    // determine if this AP is stronger than the strongest seen so far
    void next(WiFiAccessPoint& ap)
    {
        if ((ap.rssi < 0) && (ap.rssi > strongest_rssi)) {
            strongest_rssi = ap.rssi;
            strcpy(strongest_ssid, ap.ssid);
        }
    }

public:

    /**
     * Scan Wi-Fi Access Points and retrieve the strongest one.
     */
    const char* scan()
    {
        // initialize data
        strongest_rssi = -128;
        strongest_ssid[0] = 0;
        // perform the scan
        WiFi.scan(handle_ap, this);
        return strongest_ssid;
    }
};

// Now use the class
FindStrongestSSID strongestFinder;
const char* ssid = strongestFinder.scan();

}
```

### resolve()

`WiFi.resolve()` finds the IP address for a domain name.

```cpp
// SYNTAX
ip = WiFi.resolve(name);
```

Parameters:

- `name`: the domain name to resolve (string)

It returns the IP address if the domain name is found, otherwise a blank IP address.

```cpp
// EXAMPLE USAGE

IPAddress ip;
void setup() {
   ip = WiFi.resolve("www.google.com");
   if(ip) {
     // IP address was resolved
   } else {
     // name resolution failed
   }
}
```

### localIP()

`WiFi.localIP()` returns the local IP address assigned to the device as an `IPAddress`.

```cpp
SerialLogHandler logHandler;

void setup() {
  // Wait for a USB serial connection for up to 30 seconds
  waitFor(Serial.isConnected, 30000);

  // Prints out the local IP over Serial.
  Log.info("ip address: %s", WiFi.localIP().toString().c_str());
}
```

### subnetMask()

`WiFi.subnetMask()` returns the subnet mask of the network as an `IPAddress`.

```cpp
SerialLogHandler logHandler;

void setup() {
  // Wait for a USB serial connection for up to 30 seconds
  waitFor(Serial.isConnected, 30000);

  // Prints out the subnet mask over Serial.
  Log.info("subnet mask: %s" WiFi.subnetMask().toString().c_str());
}
```

### gatewayIP()

`WiFi.gatewayIP()` returns the gateway IP address of the network as an `IPAddress`.

```cpp
SerialLogHandler logHandler;

void setup() {
  // Wait for a USB serial connection for up to 30 seconds
  waitFor(Serial.isConnected, 30000);

  // Prints out the gateway IP over Serial.
  Log.info("gateway: %s", WiFi.gatewayIP().toString().c_str());
}
```

### dnsServerIP()

`WiFi.dnsServerIP()` retrieves the IP address of the DNS server that resolves
DNS requests for the device's network connection.

Note that for this value to be available requires calling `Particle.process()` after Wi-Fi
has connected.


### dhcpServerIP()

`WiFi.dhcpServerIP()` retrieves the IP address of the DHCP server that manages
the IP address used by the device's network connection.

Note that for this value to be available requires calling `Particle.process()` after Wi-Fi
has connected.


{{#if photon}}

### setStaticIP()

Defines the static IP addresses used by the system to connect to the network when static IP is activated.

```cpp
// SYNTAX

void setup() {
    IPAddress myAddress(192,168,1,100);
    IPAddress netmask(255,255,255,0);
    IPAddress gateway(192,168,1,1);
    IPAddress dns(192,168,1,1);
    WiFi.setStaticIP(myAddress, netmask, gateway, dns);

    // now let's use the configured IP
    WiFi.useStaticIP();
}

```

The addresses are stored persistently so that they are available in all subsequent
application and also in safe mode.


### useStaticIP()

Instructs the system to connect to the network using the IP addresses provided to
`WiFi.setStaticIP()`

The setting is persistent and is remembered until `WiFi.useDynamicIP()` is called.

### useDynamicIP()

Instructs the system to connect to the network using a dynamically allocated IP
address from the router.

A note on switching between static and dynamic IP. If static IP addresses have been previously configured using `WiFi.setStaticIP()`, they continue to be remembered
by the system after calling `WiFi.useDynamicIP()`, and so are available for use next time `WiFi.useStaticIP()`
is called, without needing to be reconfigured using `WiFi.setStaticIP()`

### setHostname()


{{since when="0.7.0"}}

Sets a custom hostname to be used as DHCP client name (DHCP option 12).

Parameters:

- `hostname`: the hostname to set (string)

```cpp
// SYNTAX

WiFi.setHostname("photon-123");
```

By default the device uses its [device ID](#deviceid-) as hostname.

The hostname is stored in persistent memory. In order to reset the hostname to its default value (device ID) `setHostname()` needs to be called with `hostname` argument set to `NULL`.

```cpp
// Reset hostname to default value (device ID)
WiFi.setHostname(NULL);
// Both these functions should return the same value.
Serial.println(WiFi.getHostname());
Serial.println(System.deviceID());
```

### hostname()

{{since when="0.7.0"}}

Retrieves device hostname used as DHCP client name (DHCP option 12).

This function does not take any arguments and returns a `String`.

```cpp
// SYNTAX
String hostname = WiFi.hostname();
```

By default the device uses its [device ID](#deviceid-) as hostname. See [WiFi.setHostname()](#sethostname-) for documentation on changing the hostname.

{{/if}} {{!-- photon --}}

### WiFiCredentials class
This class allows to define WiFi credentials that can be passed to [WiFi.setCredentials()](#setcredentials-) function.

```cpp
// EXAMPLE - defining and using WiFiCredentials class

void setup() {
    // Ensure that WiFi module is on
    WiFi.on();
    // Set up WPA2 access point "My AP" with password "mypassword" and AES cipher
    WiFiCredentials credentials("My AP", WPA2);
    credentials.setPassword("mypassword")
               .setCipher(WLAN_CIPHER_AES);
    // Connect if settings were successfully saved
    if (WiFi.setCredentials(credentials)) {
        WiFi.connect();
        waitFor(WiFi.ready, 30000);
        Particle.connect();
        waitFor(Particle.connected, 30000);
    }
}

void loop() {
}
```

#### WiFiCredentials()
Constructs an instance of the WiFiCredentials class. By default security type is initialized to unsecured (`UNSEC`).

```cpp
// SYNTAX
WiFiCredentials credentials(SecurityType security = UNSEC); // 1
WiFiCredentials credentials(const char* ssid, SecurityType security = UNSEC); // 2
```

```cpp
// EXAMPLE - constructing WiFiCredentials instance
// Empty instance, security is set to UNSEC
WiFiCredentials credentials;
// No SSID, security is set to WPA2
WiFiCredentials credentials(WPA2);
// SSID set to "My AP", security is set to UNSEC
WiFiCredentials credentials("My AP");
// SSID set to "My WPA AP", security is set to WPA
WiFiCredentials credentials("My AP", WPA);
```

Parameters:
- `ssid`: SSID (string)
- `security`: see [SecurityType](#securitytype-enum) enum.

#### setSsid()
Sets access point SSID.

```cpp
// SYNTAX
WiFiCredentials& WiFiCredentials::setSsid(const char* ssid);
```

```cpp
// EXAMPLE - setting ssid
WiFiCredentials credentials;
credentials.setSsid("My AP");
```

Parameters:
- `ssid`: SSID (string)

#### setSecurity()
Sets access point security type.

```cpp
// SYNTAX
WiFiCredentials& WiFiCredentials::setSecurity(SecurityType security);
```

```cpp
// EXAMPLE - setting security type
WiFiCredentials credentials;
credentials.setSecurity(WPA2);
```

Parameters:
- `security`: see [SecurityType](#securitytype-enum) enum.

#### setCipher()
Sets access point cipher.

```cpp
// SYNTAX
WiFiCredentials& WiFiCredentials::setCipher(WLanSecurityCipher cipher);
```

```cpp
// EXAMPLE - setting cipher
WiFiCredentials credentials;
credentials.setCipher(WLAN_CIPHER_AES);
```

Parameters:
- `cipher`: see [WLanSecurityCipher](#wlansecuritycipher-enum) enum.

#### setPassword()
Sets access point password.

{{#if has-wpa-enterprise}}
When configuring credentials for WPA/WPA2 Enterprise access point with PEAP/MSCHAPv2 authentication, this function sets password for username set by [setIdentity()](#setidentity-).
{{/if}} {{!-- has-wpa-enterprise --}}

```cpp
// SYNTAX
WiFiCredentials& WiFiCredentials::setPassword(const char* password);
```

```cpp
// EXAMPLE - setting password
WiFiCredentials credentials("My AP", WPA2);
credentials.setPassword("mypassword");
```

Parameters:
{{#if has-wpa-enterprise}}
- `password`: WEP/WPA/WPA2 access point password, or user password for PEAP/MSCHAPv2 authentication (string)
{{else}}
- `password`: WEP/WPA/WPA2 access point password (string)
{{/if}} {{!-- has-wpa-enterprise --}}

#### setChannel()
Sets access point channel.

```cpp
// SYNYAX
WiFiCredentials& WiFiCredentials::setChannel(int channel);
```

```cpp
// EXAMPLE - setting channel
WiFiCredentials credentials("My AP");
credentials.setChannel(10);
```

Parameters:
- `channel`: WLAN channel (int)

{{#if has-wpa-enterprise}}
#### setEapType()
Sets EAP type.

```cpp
// SYNTAX
WiFiCredentials& WiFiCredentials::setEapType(WLanEapType type);
```

```cpp
// EXAMPLE - setting EAP type
WiFiCredentials credentials("My Enterprise AP", WPA2_ENTERPRISE);
credentials.setEapType(WLAN_EAP_TYPE_PEAP);
```

Parameters:
- `type`: EAP type. See [WLanEapType](#wlaneaptype-enum) enum for a list of supported values.

#### setIdentity()
Sets EAP inner identity (username in case of PEAP/MSCHAPv2).

```cpp
// SYNTAX
WiFiCredentials& WiFiCredentials::setIdentity(const char* identity);
```

```cpp
// EXAMPLE - setting PEAP identity (username)
WiFiCredentials credentials("My Enterprise AP", WPA2_ENTERPRISE);
credentials.setEapType(WLAN_EAP_TYPE_PEAP);
credentials.setIdentity("username");
```

Parameters:
- `identity`: inner identity (string)

#### setOuterIdentity()
Sets EAP outer identity. Defaults to "anonymous".

```cpp
// SYNTAX
WiFiCredentials& WiFiCredentials::setOuterIdentity(const char* identity);
```

```cpp
// EXAMPLE - setting outer identity
WiFiCredentials credentials("My Enterprise AP", WPA2_ENTERPRISE);
credentials.setOuterIdentity("notanonymous");
```

Parameters:
- `identity`: outer identity (string)

#### setClientCertificate()
Sets client certificate used for EAP-TLS authentication.

```cpp
// SYNTAX
WiFiCredentials& WiFiCredentials::setClientCertificate(const char* cert);
```

```cpp
// EXAMPLE - setting client certificate
WiFiCredentials credentials;
credentials.setClientCertificate("-----BEGIN CERTIFICATE-----\r\n" \
                                 /* ... */ \
                                 "-----END CERTIFICATE-----\r\n\r\n"
                                );
```

Parameters:
- `cert`: client certificate in PEM format (string)

#### setPrivateKey()
Sets private key used for EAP-TLS authentication.

```cpp
// SYNTAX
WiFiCredentials& WiFiCredentials::setPrivateKey(const char* key);
```

```cpp
// EXAMPLE - setting private key
WiFiCredentials credentials;
credentials.setPrivateKey("-----BEGIN RSA PRIVATE KEY-----\r\n" \
                          /* ... */ \
                          "-----END RSA PRIVATE KEY-----\r\n\r\n"
                         );
```

Parameters:
- `key`: private key in PEM format (string)

#### setRootCertificate()
Sets one more root (CA) certificates.

```cpp
// SYNTAX
WiFiCredentials& WiFiCredentials::setRootCertificate(const char* cert);
```

```cpp
// EXAMPLE - setting one root certificate
WiFiCredentials credentials;
credentials.setClientCertificate("-----BEGIN CERTIFICATE-----\r\n" \
                                 /* ... */ \
                                 "-----END CERTIFICATE-----\r\n\r\n"
                                );
// EXAMPLE - setting multiple root certificates
WiFiCredentials credentials;
credentials.setClientCertificate("-----BEGIN CERTIFICATE-----\r\n" \
                                 /* ... */ \
                                 "-----END CERTIFICATE-----\r\n"
                                 "-----BEGIN CERTIFICATE-----\r\n" \
                                 /* ... */ \
                                 "-----END CERTIFICATE-----\r\n\r\n"
                                );
```

Parameters:
- `cert`: one or multiple concatenated root certificates in PEM format (string)

### WLanEapType Enum
This enum defines EAP types.

| Name                 | Description                                                     |
|----------------------|-----------------------------------------------------------------|
| `WLAN_EAP_TYPE_PEAP` | PEAPv0/EAP-MSCHAPv2 (draft-josefsson-pppext-eap-tls-eap-06.txt) |
| `WLAN_EAP_TYPE_TLS`  | EAP-TLS (RFC 2716)                                              |

{{/if}} {{!-- has-wpa-enterprise --}}

### SecurityType Enum
This enum defines wireless security types.

| Name              | Description                          |
|-------------------|--------------------------------------|
| `UNSEC`           | Unsecured                            |
| `WEP`             | Wired Equivalent Privacy             |
| `WPA`             | Wi-Fi Protected Access               |
| `WPA2`            | Wi-Fi Protected Access II            |
| `WPA_ENTERPRISE`  | Wi-Fi Protected Access-Enterprise    |
| `WPA2_ENTERPRISE` | Wi-Fi Protected Access-Enterprise II |

### WLanSecurityCipher Enum
This enum defines wireless security ciphers.

| Name                   | Description        |
|------------------------|--------------------|
| `WLAN_CIPHER_NOT_SET`  | No cipher          |
| `WLAN_CIPHER_AES`      | AES cipher         |
| `WLAN_CIPHER_TKIP`     | TKIP cipher        |
| `WLAN_CIPHER_AES_TKIP` | AES or TKIP cipher |

{{/if}} {{!-- has-wifi --}}


{{#if has-softap}}
## SoftAP HTTP Pages

{{since when="0.5.0"}}

When the device is in listening mode, it creates a temporary access point (AP) and a HTTP server on port 80. The HTTP server is used to configure the Wi-Fi access points the device attempts to connect to. As well as the system providing HTTP URLs, applications can add their own pages to the
SoftAP HTTP server.

SoftAP HTTP Pages is presently an advanced feature, requiring moderate C++ knowledge.  To begin using the feature:

- add `#include "Particle.h"` below that, then
- add `#include "softap_http.h"` below that still


```cpp
// SYNTAX

void myPages(const char* url, ResponseCallback* cb, void* cbArg, Reader* body, Writer* result, void* reserved);

STARTUP(softap_set_application_page_handler(myPages, nullptr));
```

The `softap_set_application_page_handler` is set during startup. When the system is in setup mode (listening mode, blinking dark blue), and a request is made for an unknown URL, the system
calls the page handler function provided by the application (here, `myPages`.)

The page handler function is called whenever an unknown URL is requested. It is called with these parameters:

- `url`: the path of the file requested by the client. It doesn't include the server name or port. Examples: `/index`,  `/someimage.jpg`.
- `cb`: a response callback - this is used by the application to indicate the type of HTTP response, such as 200 (OK) or 404 (not found). More on this below.
- `cbArg`: data that should be passed as the first parameter to the callback function `cb`.
- `body`: a reader object that the page handler uses to retrieve the HTTP request body
- `result`: a writer object that the page handler uses to write the HTTP response body
- `reserved`: reserved for future expansion. Will be equal to `nullptr` and can be ignored.

The application MUST call the page callback function `cb` to provide a response for the requested page. If the requested page url isn't recognized by the application, then a 404 response should be sent, as described below.

### The page callback function

When your page handler function is called, the system passes a result callback function as the `cb` parameter.
The callback function takes these parameters:

- `cbArg`: this is the `cbArg` parameter passed to your page callback function. It's internal state used by the HTTP server.
- `flags`: presently unused. Set to 0.
- `status`: the HTTP status code, as an integer, such as 200 for `OK`, or 404 for `page not found`.
- `mime-type`: the mime-type of the response as a string, such as `text/html` or `application/javascript`.
- `header`: an optional pointer to a `Header` that is added to the response sent to the client.

For example, to send a "not found" error for a page that is not recognized, your application code would call

```cpp
//  EXAMPLE - send a 404 response for an unknown page
cb(cbArg, 0, 404, "text/plain", nullptr);
```


### Retrieving the request data

When the HTTP request contains a request body (such as with a POST request), the `Reader` object provided by the `body` parameter can be used
to retrieve the request data.

```cpp
// EXAMPLE

if (body->bytes_left) {
	char* data = body->fetch_as_string();
	// handle the body data
 	dostuff(data);
 	// free the data! IMPORTANT!
 	free(data);
}

```

### Sending a response

When sending a page, the page function responds with a HTTP 200 code, meaning the content was found, followed by the page data.

```
// EXAMPLE - send a page

if (!stricmp(url, '/helloworld') {
	// send the response code 200, the mime type "text/html"
	cb(cbArg, 0, 200, "text/html", nullptr);
	// send the page content
	result->write("<h2>hello world!</h2>");
}
```

### The default page

When a browser requests the default page (`http://192.168.0.1/`) the system internally redirects this to `/index` so that it can be handled
by the application.

The application may provide an actual page at `/index` or redirect to another page if the application prefers to have another page as its launch page.

### Sending a Redirect

The application can send a redirect response for a given page in order to manage the URL namespace, such as providing aliases for some resources.

The code below sends a redirect from the default page `/index` to `/index.html`

```cpp
// EXAMPLE - redirect from /index to /index.html
// add this code in the page hanler function

if (strcmp(url,"/index")==0) {
    Header h("Location: /index.html\r\n");
    cb(cbArg, 0, 301, "text/plain", &h);
    return;
}

```

### Complete Example

Here's a complete example providing a Web UI for setting up WiFi via HTTP. Credit for the HTTP pages goes to GitHub user @mebrunet! ([Included from PR #909 here](https://github.com/particle-iot/device-os/pull/906)) ([Source code here](https://github.com/mebrunet/softap-setup-page))



```
#include "Particle.h"
#include "softap_http.h"

struct Page
{
    const char* url;
    const char* mime_type;
    const char* data;
};


const char index_html[] = "<!DOCTYPE html><html><head><meta name='viewport' content='width=device-width, initial-scale=1'><title>Setup your device</title><link rel='stylesheet' type='text/css' href='style.css'></head><body><h1>Connect me to your WiFi!</h1><h3>My device ID:</h3><input type=text id='device-id' size='25' value='' disabled/><button type='button' class='input-helper' id='copy-button'>Copy</button><div id='scan-div'><h3>Scan for visible WiFi networks</h3><button id='scan-button' type='button'>Scan</button></div><div id='networks-div'></div><div id='connect-div' style='display: none'><p>Don't see your network? Move me closer to your router, then re-scan.</p><form id='connect-form'><input type='password' id='password' size='25' placeholder='password'/><button type='button' class='input-helper' id='show-button'>Show</button><button type='submit' id='connect-button'>Connect</button></form></div><script src='rsa-utils/jsbn_1.js'></script><script src='rsa-utils/jsbn_2.js'></script><script src='rsa-utils/prng4.js'></script><script src='rsa-utils/rng.js'></script><script src='rsa-utils/rsa.js'></script><script src='script.js'></script></body></html>";

const char rsa_js[] = "function parseBigInt(a,b){return new BigInteger(a,b);}function linebrk(a,b){var c='';var d=0;while(d+b<a.length){c+=a.substring(d,d+b)+'\\n';d+=b;}return c+a.substring(d,a.length);}function byte2Hex(a){if(a<0x10)return '0'+a.toString(16);else return a.toString(16);}function pkcs1pad2(a,b){if(b<a.length+11){alert('Message too long for RSA');return null;}var c=new Array();var d=a.length-1;while(d>=0&&b>0){var e=a.charCodeAt(d--);if(e<128)c[--b]=e;else if((e>127)&&(e<2048)){c[--b]=(e&63)|128;c[--b]=(e>>6)|192;}else{c[--b]=(e&63)|128;c[--b]=((e>>6)&63)|128;c[--b]=(e>>12)|224;}}c[--b]=0;var f=new SecureRandom();var g=new Array();while(b>2){g[0]=0;while(g[0]==0)f.nextBytes(g);c[--b]=g[0];}c[--b]=2;c[--b]=0;return new BigInteger(c);}function RSAKey(){this.n=null;this.e=0;this.d=null;this.p=null;this.q=null;this.dmp1=null;this.dmq1=null;this.coeff=null;}function RSASetPublic(a,b){if(a!=null&&b!=null&&a.length>0&&b.length>0){this.n=parseBigInt(a,16);this.e=parseInt(b,16);}else alert('Invalid RSA public key');}function RSADoPublic(a){return a.modPowInt(this.e,this.n);}function RSAEncrypt(a){var b=pkcs1pad2(a,(this.n.bitLength()+7)>>3);if(b==null)return null;var c=this.doPublic(b);if(c==null)return null;var d=c.toString(16);if((d.length&1)==0)return d;else return '0'+d;}RSAKey.prototype.doPublic=RSADoPublic;RSAKey.prototype.setPublic=RSASetPublic;RSAKey.prototype.encrypt=RSAEncrypt;";

const char style_css[] = "html{height:100%;margin:auto;background-color:white}body{box-sizing:border-box;min-height:100%;padding:20px;background-color:#1aabe0;font-family:'Lucida Sans Unicode','Lucida Grande',sans-serif;font-weight:normal;color:white;margin-top:0;margin-left:auto;margin-right:auto;margin-bottom:0;max-width:400px;text-align:center;border:1px solid #6e6e70;border-radius:4px}div{margin-top:25px;margin-bottom:25px}h1{margin-top:25px;margin-bottom:25px}button{border-color:#1c75be;background-color:#1c75be;color:white;border-radius:5px;height:30px;font-size:15px;font-weight:bold}button.input-helper{background-color:#bebebe;border-color:#bebebe;color:#6e6e70;margin-left:3px}button:disabled{background-color:#bebebe;border-color:#bebebe;color:white}input[type='text'],input[type='password']{background-color:white;color:#6e6e70;border-color:white;border-radius:5px;height:25px;text-align:center;font-size:15px}input:disabled{background-color:#bebebe;border-color:#bebebe}input[type='radio']{position:relative;bottom:-0.33em;margin:0;border:0;height:1.5em;width:15%}label{padding-top:7px;padding-bottom:7px;padding-left:5%;display:inline-block;width:80%;text-align:left}input[type='radio']:checked+label{font-weight:bold;color:#1c75be}.scanning-error{font-weight:bold;text-align:center}.radio-div{box-sizing:border-box;margin:2px;margin-left:auto;margin-right:auto;background-color:white;color:#6e6e70;border:1px solid #6e6e70;border-radius:3px;width:100%;padding:5px}#networks-div{margin-left:auto;margin-right:auto;text-align:left}#device-id{text-align:center}#scan-button{min-width:100px}#connect-button{display:block;min-width:100px;margin-top:10px;margin-left:auto;margin-right:auto;margin-bottom:20px}#password{margin-top:20px;margin-bottom:10px}";

const char rng_js[] = "var rng_state;var rng_pool;var rng_pptr;function rng_seed_int(a){rng_pool[rng_pptr++]^=a&255;rng_pool[rng_pptr++]^=(a>>8)&255;rng_pool[rng_pptr++]^=(a>>16)&255;rng_pool[rng_pptr++]^=(a>>24)&255;if(rng_pptr>=rng_psize)rng_pptr-=rng_psize;}function rng_seed_time(){rng_seed_int(new Date().getTime());}if(rng_pool==null){rng_pool=new Array();rng_pptr=0;var t;if(window.crypto&&window.crypto.getRandomValues){var ua=new Uint8Array(32);window.crypto.getRandomValues(ua);for(t=0;t<32;++t)rng_pool[rng_pptr++]=ua[t];}if(navigator.appName=='Netscape'&&navigator.appVersion<'5'&&window.crypto){var z=window.crypto.random(32);for(t=0;t<z.length;++t)rng_pool[rng_pptr++]=z.charCodeAt(t)&255;}while(rng_pptr<rng_psize){t=Math.floor(65536*Math.random());rng_pool[rng_pptr++]=t>>>8;rng_pool[rng_pptr++]=t&255;}rng_pptr=0;rng_seed_time();}function rng_get_byte(){if(rng_state==null){rng_seed_time();rng_state=prng_newstate();rng_state.init(rng_pool);for(rng_pptr=0;rng_pptr<rng_pool.length;++rng_pptr)rng_pool[rng_pptr]=0;rng_pptr=0;}return rng_state.next();}function rng_get_bytes(a){var b;for(b=0;b<a.length;++b)a[b]=rng_get_byte();}function SecureRandom(){}SecureRandom.prototype.nextBytes=rng_get_bytes;";

const char jsbn_2_js[] = "function bnpRShiftTo(a,b){b.s=this.s;var c=Math.floor(a/this.DB);if(c>=this.t){b.t=0;return;}var d=a%this.DB;var e=this.DB-d;var f=(1<<d)-1;b[0]=this[c]>>d;for(var g=c+1;g<this.t;++g){b[g-c-1]|=(this[g]&f)<<e;b[g-c]=this[g]>>d;}if(d>0)b[this.t-c-1]|=(this.s&f)<<e;b.t=this.t-c;b.clamp();}function bnpSubTo(a,b){var c=0,d=0,e=Math.min(a.t,this.t);while(c<e){d+=this[c]-a[c];b[c++]=d&this.DM;d>>=this.DB;}if(a.t<this.t){d-=a.s;while(c<this.t){d+=this[c];b[c++]=d&this.DM;d>>=this.DB;}d+=this.s;}else{d+=this.s;while(c<a.t){d-=a[c];b[c++]=d&this.DM;d>>=this.DB;}d-=a.s;}b.s=(d<0)?-1:0;if(d<-1)b[c++]=this.DV+d;else if(d>0)b[c++]=d;b.t=c;b.clamp();}function bnpMultiplyTo(a,b){var c=this.abs(),d=a.abs();var e=c.t;b.t=e+d.t;while(--e>=0)b[e]=0;for(e=0;e<d.t;++e)b[e+c.t]=c.am(0,d[e],b,e,0,c.t);b.s=0;b.clamp();if(this.s!=a.s)BigInteger.ZERO.subTo(b,b);}function bnpSquareTo(a){var b=this.abs();var c=a.t=2*b.t;while(--c>=0)a[c]=0;for(c=0;c<b.t-1;++c){var d=b.am(c,b[c],a,2*c,0,1);if((a[c+b.t]+=b.am(c+1,2*b[c],a,2*c+1,d,b.t-c-1))>=b.DV){a[c+b.t]-=b.DV;a[c+b.t+1]=1;}}if(a.t>0)a[a.t-1]+=b.am(c,b[c],a,2*c,0,1);a.s=0;a.clamp();}function bnpDivRemTo(a,b,c){var d=a.abs();if(d.t<=0)return;var e=this.abs();if(e.t<d.t){if(b!=null)b.fromInt(0);if(c!=null)this.copyTo(c);return;}if(c==null)c=nbi();var f=nbi(),g=this.s,h=a.s;var i=this.DB-nbits(d[d.t-1]);if(i>0){d.lShiftTo(i,f);e.lShiftTo(i,c);}else{d.copyTo(f);e.copyTo(c);}var j=f.t;var k=f[j-1];if(k==0)return;var l=k*(1<<this.F1)+((j>1)?f[j-2]>>this.F2:0);var m=this.FV/l,n=(1<<this.F1)/l,o=1<<this.F2;var p=c.t,q=p-j,r=(b==null)?nbi():b;f.dlShiftTo(q,r);if(c.compareTo(r)>=0){c[c.t++]=1;c.subTo(r,c);}BigInteger.ONE.dlShiftTo(j,r);r.subTo(f,f);while(f.t<j)f[f.t++]=0;while(--q>=0){var s=(c[--p]==k)?this.DM:Math.floor(c[p]*m+(c[p-1]+o)*n);if((c[p]+=f.am(0,s,c,q,0,j))<s){f.dlShiftTo(q,r);c.subTo(r,c);while(c[p]<--s)c.subTo(r,c);}}if(b!=null){c.drShiftTo(j,b);if(g!=h)BigInteger.ZERO.subTo(b,b);}c.t=j;c.clamp();if(i>0)c.rShiftTo(i,c);if(g<0)BigInteger.ZERO.subTo(c,c);}function bnMod(a){var b=nbi();this.abs().divRemTo(a,null,b);if(this.s<0&&b.compareTo(BigInteger.ZERO)>0)a.subTo(b,b);return b;}function Classic(a){this.m=a;}function cConvert(a){if(a.s<0||a.compareTo(this.m)>=0)return a.mod(this.m);else return a;}function cRevert(a){return a;}function cReduce(a){a.divRemTo(this.m,null,a);}function cMulTo(a,b,c){a.multiplyTo(b,c);this.reduce(c);}function cSqrTo(a,b){a.squareTo(b);this.reduce(b);}Classic.prototype.convert=cConvert;Classic.prototype.revert=cRevert;Classic.prototype.reduce=cReduce;Classic.prototype.mulTo=cMulTo;Classic.prototype.sqrTo=cSqrTo;function bnpInvDigit(){if(this.t<1)return 0;var a=this[0];if((a&1)==0)return 0;var b=a&3;b=(b*(2-(a&0xf)*b))&0xf;b=(b*(2-(a&0xff)*b))&0xff;b=(b*(2-(((a&0xffff)*b)&0xffff)))&0xffff;b=(b*(2-a*b%this.DV))%this.DV;return(b>0)?this.DV-b:-b;}function Montgomery(a){this.m=a;this.mp=a.invDigit();this.mpl=this.mp&0x7fff;this.mph=this.mp>>15;this.um=(1<<(a.DB-15))-1;this.mt2=2*a.t;}function montConvert(a){var b=nbi();a.abs().dlShiftTo(this.m.t,b);b.divRemTo(this.m,null,b);if(a.s<0&&b.compareTo(BigInteger.ZERO)>0)this.m.subTo(b,b);return b;}function montRevert(a){var b=nbi();a.copyTo(b);this.reduce(b);return b;}function montReduce(a){while(a.t<=this.mt2)a[a.t++]=0;for(var b=0;b<this.m.t;++b){var c=a[b]&0x7fff;var d=(c*this.mpl+(((c*this.mph+(a[b]>>15)*this.mpl)&this.um)<<15))&a.DM;c=b+this.m.t;a[c]+=this.m.am(0,d,a,b,0,this.m.t);while(a[c]>=a.DV){a[c]-=a.DV;a[++c]++;}}a.clamp();a.drShiftTo(this.m.t,a);if(a.compareTo(this.m)>=0)a.subTo(this.m,a);}function montSqrTo(a,b){a.squareTo(b);this.reduce(b);}function montMulTo(a,b,c){a.multiplyTo(b,c);this.reduce(c);}Montgomery.prototype.convert=montConvert;Montgomery.prototype.revert=montRevert;Montgomery.prototype.reduce=montReduce;Montgomery.prototype.mulTo=montMulTo;Montgomery.prototype.sqrTo=montSqrTo;function bnpIsEven(){return((this.t>0)?(this[0]&1):this.s)==0;}function bnpExp(a,b){if(a>0xffffffff||a<1)return BigInteger.ONE;var c=nbi(),d=nbi(),e=b.convert(this),f=nbits(a)-1;e.copyTo(c);while(--f>=0){b.sqrTo(c,d);if((a&(1<<f))>0)b.mulTo(d,e,c);else{var g=c;c=d;d=g;}}return b.revert(c);}function bnModPowInt(a,b){var c;if(a<256||b.isEven())c=new Classic(b);else c=new Montgomery(b);return this.exp(a,c);}BigInteger.prototype.copyTo=bnpCopyTo;BigInteger.prototype.fromInt=bnpFromInt;BigInteger.prototype.fromString=bnpFromString;BigInteger.prototype.clamp=bnpClamp;BigInteger.prototype.dlShiftTo=bnpDLShiftTo;BigInteger.prototype.drShiftTo=bnpDRShiftTo;BigInteger.prototype.lShiftTo=bnpLShiftTo;BigInteger.prototype.rShiftTo=bnpRShiftTo;BigInteger.prototype.subTo=bnpSubTo;BigInteger.prototype.multiplyTo=bnpMultiplyTo;BigInteger.prototype.squareTo=bnpSquareTo;BigInteger.prototype.divRemTo=bnpDivRemTo;BigInteger.prototype.invDigit=bnpInvDigit;BigInteger.prototype.isEven=bnpIsEven;BigInteger.prototype.exp=bnpExp;BigInteger.prototype.toString=bnToString;BigInteger.prototype.negate=bnNegate;BigInteger.prototype.abs=bnAbs;BigInteger.prototype.compareTo=bnCompareTo;BigInteger.prototype.bitLength=bnBitLength;BigInteger.prototype.mod=bnMod;BigInteger.prototype.modPowInt=bnModPowInt;BigInteger.ZERO=nbv(0);BigInteger.ONE=nbv(1);";

const char jsbn_1_js[] = "var dbits;var canary=0xdeadbeefcafe;var j_lm=((canary&0xffffff)==0xefcafe);function BigInteger(a,b,c){if(a!=null)if('number'==typeof a)this.fromNumber(a,b,c);else if(b==null&&'string'!=typeof a)this.fromString(a,256);else this.fromString(a,b);}function nbi(){return new BigInteger(null);}function am1(a,b,c,d,e,f){while(--f>=0){var g=b*this[a++]+c[d]+e;e=Math.floor(g/0x4000000);c[d++]=g&0x3ffffff;}return e;}function am2(a,b,c,d,e,f){var g=b&0x7fff,h=b>>15;while(--f>=0){var i=this[a]&0x7fff;var j=this[a++]>>15;var k=h*i+j*g;i=g*i+((k&0x7fff)<<15)+c[d]+(e&0x3fffffff);e=(i>>>30)+(k>>>15)+h*j+(e>>>30);c[d++]=i&0x3fffffff;}return e;}function am3(a,b,c,d,e,f){var g=b&0x3fff,h=b>>14;while(--f>=0){var i=this[a]&0x3fff;var j=this[a++]>>14;var k=h*i+j*g;i=g*i+((k&0x3fff)<<14)+c[d]+e;e=(i>>28)+(k>>14)+h*j;c[d++]=i&0xfffffff;}return e;}if(j_lm&&(navigator.appName=='Microsoft Internet Explorer')){BigInteger.prototype.am=am2;dbits=30;}else if(j_lm&&(navigator.appName!='Netscape')){BigInteger.prototype.am=am1;dbits=26;}else{BigInteger.prototype.am=am3;dbits=28;}BigInteger.prototype.DB=dbits;BigInteger.prototype.DM=((1<<dbits)-1);BigInteger.prototype.DV=(1<<dbits);var BI_FP=52;BigInteger.prototype.FV=Math.pow(2,BI_FP);BigInteger.prototype.F1=BI_FP-dbits;BigInteger.prototype.F2=2*dbits-BI_FP;var BI_RM='0123456789abcdefghijklmnopqrstuvwxyz';var BI_RC=new Array();var rr,vv;rr='0'.charCodeAt(0);for(vv=0;vv<=9;++vv)BI_RC[rr++]=vv;rr='a'.charCodeAt(0);for(vv=10;vv<36;++vv)BI_RC[rr++]=vv;rr='A'.charCodeAt(0);for(vv=10;vv<36;++vv)BI_RC[rr++]=vv;function int2char(a){return BI_RM.charAt(a);}function intAt(a,b){var c=BI_RC[a.charCodeAt(b)];return(c==null)?-1:c;}function bnpCopyTo(a){for(var b=this.t-1;b>=0;--b)a[b]=this[b];a.t=this.t;a.s=this.s;}function bnpFromInt(a){this.t=1;this.s=(a<0)?-1:0;if(a>0)this[0]=a;else if(a<-1)this[0]=a+this.DV;else this.t=0;}function nbv(a){var b=nbi();b.fromInt(a);return b;}function bnpFromString(a,b){var c;if(b==16)c=4;else if(b==8)c=3;else if(b==256)c=8;else if(b==2)c=1;else if(b==32)c=5;else if(b==4)c=2;else{this.fromRadix(a,b);return;}this.t=0;this.s=0;var d=a.length,e=false,f=0;while(--d>=0){var g=(c==8)?a[d]&0xff:intAt(a,d);if(g<0){if(a.charAt(d)=='-')e=true;continue;}e=false;if(f==0)this[this.t++]=g;else if(f+c>this.DB){this[this.t-1]|=(g&((1<<(this.DB-f))-1))<<f;this[this.t++]=(g>>(this.DB-f));}else this[this.t-1]|=g<<f;f+=c;if(f>=this.DB)f-=this.DB;}if(c==8&&(a[0]&0x80)!=0){this.s=-1;if(f>0)this[this.t-1]|=((1<<(this.DB-f))-1)<<f;}this.clamp();if(e)BigInteger.ZERO.subTo(this,this);}function bnpClamp(){var a=this.s&this.DM;while(this.t>0&&this[this.t-1]==a)--this.t;}function bnToString(a){if(this.s<0)return '-'+this.negate().toString(a);var b;if(a==16)b=4;else if(a==8)b=3;else if(a==2)b=1;else if(a==32)b=5;else if(a==4)b=2;else return this.toRadix(a);var c=(1<<b)-1,d,e=false,f='',g=this.t;var h=this.DB-(g*this.DB)%b;if(g-->0){if(h<this.DB&&(d=this[g]>>h)>0){e=true;f=int2char(d);}while(g>=0){if(h<b){d=(this[g]&((1<<h)-1))<<(b-h);d|=this[--g]>>(h+=this.DB-b);}else{d=(this[g]>>(h-=b))&c;if(h<=0){h+=this.DB;--g;}}if(d>0)e=true;if(e)f+=int2char(d);}}return e?f:'0';}function bnNegate(){var a=nbi();BigInteger.ZERO.subTo(this,a);return a;}function bnAbs(){return(this.s<0)?this.negate():this;}function bnCompareTo(a){var b=this.s-a.s;if(b!=0)return b;var c=this.t;b=c-a.t;if(b!=0)return(this.s<0)?-b:b;while(--c>=0)if((b=this[c]-a[c])!=0)return b;return 0;}function nbits(a){var b=1,c;if((c=a>>>16)!=0){a=c;b+=16;}if((c=a>>8)!=0){a=c;b+=8;}if((c=a>>4)!=0){a=c;b+=4;}if((c=a>>2)!=0){a=c;b+=2;}if((c=a>>1)!=0){a=c;b+=1;}return b;}function bnBitLength(){if(this.t<=0)return 0;return this.DB*(this.t-1)+nbits(this[this.t-1]^(this.s&this.DM));}function bnpDLShiftTo(a,b){var c;for(c=this.t-1;c>=0;--c)b[c+a]=this[c];for(c=a-1;c>=0;--c)b[c]=0;b.t=this.t+a;b.s=this.s;}function bnpDRShiftTo(a,b){for(var c=a;c<this.t;++c)b[c-a]=this[c];b.t=Math.max(this.t-a,0);b.s=this.s;}function bnpLShiftTo(a,b){var c=a%this.DB;var d=this.DB-c;var e=(1<<d)-1;var f=Math.floor(a/this.DB),g=(this.s<<c)&this.DM,h;for(h=this.t-1;h>=0;--h){b[h+f+1]=(this[h]>>d)|g;g=(this[h]&e)<<c;}for(h=f-1;h>=0;--h)b[h]=0;b[f]=g;b.t=this.t+f+1;b.s=this.s;b.clamp();}";

const char script_js[] = "var base_url='http://192.168.0.1/';var network_list;var public_key;var rsa=new RSAKey();var scanButton=document.getElementById('scan-button');var connectButton=document.getElementById('connect-button');var copyButton=document.getElementById('copy-button');var showButton=document.getElementById('show-button');var deviceID=document.getElementById('device-id');var connectForm=document.getElementById('connect-form');var public_key_callback={success:function(a){console.log('Public key: '+a.b);public_key=a.b;rsa.setPublic(public_key.substring(58,58+256),public_key.substring(318,318+6));},error:function(a,b){console.log(a);window.alert('There was a problem fetching important information from your device. Please verify your connection, then reload this page.');}};var device_id_callback={success:function(a){var b=a.id;deviceID.value=b;},error:function(a,b){console.log(a);var c='COMMUNICATION_ERROR';deviceID.value=c;}};var scan=function(){console.log('Scanning...!');disableButtons();scanButton.innerHTML='Scanning...';connectButton.innerHTML='Connect';document.getElementById('connect-div').style.display='none';document.getElementById('networks-div').style.display='none';getRequest(base_url+'scan-ap',scan_callback);};var scan_callback={success:function(a){network_list=a.scans;console.log('I found:');var b=document.getElementById('networks-div');b.innerHTML='';if(network_list.length>0)for(var c=0;c<network_list.length;c++){ssid=network_list[c].ssid;console.log(network_list[c]);add_wifi_option(b,ssid);document.getElementById('connect-div').style.display='block';}else b.innerHTML='<p class=\\'scanning-error\\'>No networks found.</p>';},error:function(a){console.log('Scanning error:'+a);document.getElementById('networks-div').innerHTML='<p class=\\'scanning-error\\'>Scanning error.</p>';},regardless:function(){scanButton.innerHTML='Re-Scan';enableButtons();document.getElementById('networks-div').style.display='block';}};var configure=function(a){a.preventDefault();var b=get_selected_network();var c=document.getElementById('password').value;if(!b){window.alert('Please select a network!');return false;}var d={idx:0,ssid:b.ssid,pwd:rsa.encrypt(c),sec:b.sec,ch:b.ch};connectButton.innerHTML='Sending credentials...';disableButtons();console.log('Sending credentials: '+JSON.stringify(d));postRequest(base_url+'configure-ap',d,configure_callback);};var configure_callback={success:function(a){console.log('Credentials received.');connectButton.innerHTML='Credentials received...';postRequest(base_url+'connect-ap',{idx:0},connect_callback);},error:function(a,b){console.log('Configure error: '+a);window.alert('The configuration command failed, check that you are still well connected to the device\\'s WiFi hotspot and retry.');connectButton.innerHTML='Retry';enableButtons();}};var connect_callback={success:function(a){console.log('Attempting to connect to the cloud.');connectButton.innerHTML='Attempting to connect...';window.alert('Your device should now start flashing green and attempt to connect to the cloud. This usually takes about 20 seconds, after which it will begin slowly blinking cyan. \\n\\n\\nIf this process fails because you entered the wrong password, the device will flash green indefinitely. In this case, hold the setup button for 6 seconds until the device starts blinking blue again. Then reconnect to the WiFi hotspot it generates and reload this page to try again.');},error:function(a,b){console.log('Connect error: '+a);window.alert('The connect command failed, check that you are still well connected to the device\\'s WiFi hotspot and retry.');connectButton.innerHTML='Retry';enableButtons();}};var disableButtons=function(){connectButton.disabled=true;scanButton.disabled=true;};var enableButtons=function(){connectButton.disabled=false;scanButton.disabled=false;};var add_wifi_option=function(a,b){var c=document.createElement('INPUT');c.type='radio';c.value=b;c.id=b;c.name='ssid';c.className='radio';var d=document.createElement('DIV');d.className='radio-div';d.appendChild(c);var e=document.createElement('label');e.htmlFor=b;e.innerHTML=b;d.appendChild(e);a.appendChild(d);};var get_selected_network=function(){for(var a=0;a<network_list.length;a++){ssid=network_list[a].ssid;if(document.getElementById(ssid).checked)return network_list[a];}};var copy=function(){window.prompt('Copy to clipboard: Ctrl + C, Enter',deviceID.value);};var toggleShow=function(){var a=document.getElementById('password');inputType=a.type;if(inputType==='password'){showButton.innerHTML='Hide';a.type='text';}else{showButton.innerHTML='Show';a.type='password';}};var getRequest=function(a,b){var c=new XMLHttpRequest();c.open('GET',a,true);c.timeout=8000;c.send();c.onreadystatechange=function(){if(c.readyState==4)if(b){if(c.status==200){if(b.success)b.success(JSON.parse(c.responseText));}else if(b.error)b.error(c.status,c.responseText);if(b.regardless)b.regardless();}};};var postRequest=function(a,b,c){var d=JSON.stringify(b);var e=new XMLHttpRequest();e.open('POST',a,true);e.timeout=4000;e.setRequestHeader('Content-Type','multipart/form-data');e.send(d);e.onreadystatechange=function(){if(e.readyState==4)if(c){if(e.status==200){if(c.success)c.success(JSON.parse(e.responseText));}else if(c.error)c.error(e.status,e.responseText);if(c.regardless)c.regardless();}};};if(scanButton.addEventListener){copyButton.addEventListener('click',copy);showButton.addEventListener('click',toggleShow);scanButton.addEventListener('click',scan);connectForm.addEventListener('submit',configure);}else if(scanButton.attachEvent){copyButton.attachEvent('onclick',copy);showButton.attachEvent('onclick',toggleShow);scanButton.attachEvent('onclick',scan);connectForm.attachEvent('onsubmit',configure);}getRequest(base_url+'device-id',device_id_callback);getRequest(base_url+'public-key',public_key_callback);";

const char prng4_js[] = "function Arcfour(){this.i=0;this.j=0;this.S=new Array();}function ARC4init(a){var b,c,d;for(b=0;b<256;++b)this.S[b]=b;c=0;for(b=0;b<256;++b){c=(c+this.S[b]+a[b%a.length])&255;d=this.S[b];this.S[b]=this.S[c];this.S[c]=d;}this.i=0;this.j=0;}function ARC4next(){var a;this.i=(this.i+1)&255;this.j=(this.j+this.S[this.i])&255;a=this.S[this.i];this.S[this.i]=this.S[this.j];this.S[this.j]=a;return this.S[(a+this.S[this.i])&255];}Arcfour.prototype.init=ARC4init;Arcfour.prototype.next=ARC4next;function prng_newstate(){return new Arcfour();}var rng_psize=256;";

Page myPages[] = {
     { "/index.html", "text/html", index_html },
     { "/rsa-utils/rsa.js", "application/javascript", rsa_js },
     { "/style.css", "text/css", style_css },
     { "/rsa-utils/rng.js", "application/javascript", rng_js },
     { "/rsa-utils/jsbn_2.js", "application/javascript", jsbn_2_js },
     { "/rsa-utils/jsbn_1.js", "application/javascript", jsbn_1_js },
     { "/script.js", "application/javascript", script_js },
     { "/rsa-utils/prng4.js", "application/javascript", prng4_js },
     { nullptr }
};

void myPage(const char* url, ResponseCallback* cb, void* cbArg, Reader* body, Writer* result, void* reserved)
{
    Log.info("handling page %s", url);

    if (strcmp(url,"/index")==0) {
        Log.info("sending redirect");
        Header h("Location: /index.html\r\n");
        cb(cbArg, 0, 301, "text/plain", &h);
        return;
    }

    int8_t idx = 0;
    for (;;idx++) {
        Page& p = myPages[idx];
        if (!p.url) {
            idx = -1;
            break;
        }
        else if (strcmp(url, p.url)==0) {
            break;
        }
    }

    if (idx==-1) {
        cb(cbArg, 0, 404, nullptr, nullptr);
    }
    else {
        cb(cbArg, 0, 200, myPages[idx].mime_type, nullptr);
        result->write(myPages[idx].data);
    }
}

STARTUP(softap_set_application_page_handler(myPage, nullptr));

// Press SETUP for 3 seconds to make the Photon enter Listening mode
// Navigate to http://192.168.0.1 to setup Wi-Fi

// Include the rest of your application below,
// including your setup and loop functions
```

{{/if}} {{!-- has-softap --}}


{{#if has-cellular}}
## Cellular

### on()

{{api name1="Cellular.on" name2="on"}}

`Cellular.on()` turns on the Cellular module. Useful when you've turned it off, and you changed your mind.

Note that `Cellular.on()` does not need to be called unless you have changed the [system mode](#system-modes) or you have previously turned the Cellular module off.  When turning on the Cellular module, it will go through a full re-connect to the Cellular network which will take anywhere from 30 to 60 seconds in most situations.

```cpp
// SYNTAX
Cellular.on();
```

### off()

{{api name1="Cellular.off" name2="off"}}

`Cellular.off()` turns off the Cellular module. Useful for saving power, since most of the power draw of the device is the Cellular module.  Note: turning off the Cellular module will force it to go through a full re-connect to the Cellular network the next time it is turned on.

```cpp
// SYNTAX
Cellular.off();
```

You must not turn off and on cellular more than every 10 minutes (6 times per hour). Your SIM can be blocked by your mobile carrier for aggressive reconnection if you reconnect to cellular very frequently. 

If you are manually managing the cellular connection in case of connection failures, you should wait at least 5 minutes before stopping the connection attempt. When retrying on failure, you should implement a back-off scheme waiting 5 minutes, 10 minutes, 15 minutes, 20 minutes, 30 minutes, then 60 minutes between retries. Repeated failures to connect can also result in your SIM being blocked.

### connect()

Attempts to connect to the Cellular network. If there are no credentials entered, the default Particle APN for Particle SIM cards will be used.  If no SIM card is inserted, the device will enter listening mode. If a 3rd party APN is set, these credentials must match the inserted SIM card for the device to connect to the cellular network. When this function returns, the device may not have a local (private) IP address; use `Cellular.ready()` to determine the connection status.

```cpp
// SYNTAX
Cellular.connect();
```

{{#if has-gen3}}
**Note:** Due to an open [issue](https://github.com/particle-iot/device-os/issues/1631) the automatic activation of the {{network-type}} connection is currently not working as expected. If the {{network-type}} module is not already powered up, your code needs to explicitly call {{#if has-wifi}}`WiFi.on()`{{/if}}{{#if has-cellular}}`Cellular.on()`{{/if}} before calling {{#if has-wifi}}`WiFi.connect()`{{/if}}{{#if has-cellular}}`Cellular.connect()`{{/if}}.
{{/if}}

### disconnect()

Disconnects from the Cellular network, but leaves the Cellular module on.

```cpp
// SYNTAX
Cellular.disconnect();
```

### connecting()

This function will return `true` once the device is attempting to connect using the default Particle APN or 3rd party APN cellular credentials, and will return `false` once the device has successfully connected to the cellular network.

```cpp
// SYNTAX
Cellular.connecting();
```

### ready()

This function will return `true` once the device is connected to the cellular network and has been assigned an IP address, which means it has an activated PDP context and is ready to open TCP/UDP sockets. Otherwise it will return `false`.

```cpp
// SYNTAX
Cellular.ready();
```

### listen()

This will enter or exit listening mode, which opens a Serial connection to get Cellular information such as the IMEI or CCID over USB.

```cpp
// SYNTAX - enter listening mode
Cellular.listen();
```

Listening mode blocks application code. Advanced cases that use multithreading, interrupts, or system events
have the ability to continue to execute application code while in listening mode, and may wish to then exit listening
mode, such as after a timeout. Listening mode is stopped using this syntax:

```cpp

// SYNTAX - exit listening mode
Cellular.listen(false);

```

### listening()

```cpp
// SYNTAX
Cellular.listening();
```

Without multithreading enabled, this command is not useful (always returning `false`) because listening mode blocks application code.

This command becomes useful on the device when system code runs as a separate RTOS task from application code.

Once system code does not block application code,
`Cellular.listening()` will return `true` once `Cellular.listen()` has been called
or the setup button has been held for 3 seconds, when the RGB LED should be blinking blue.
It will return `false` when the device is not in listening mode.


### setListenTimeout()

{{since when="0.6.1"}}

```cpp
// SYNTAX
Cellular.setListenTimeout(seconds);
```

`Cellular.setListenTimeout(seconds)` is used to set a timeout value for Listening Mode. This is rarely needed on cellular devices as cellular devices do not enter listening mode by default.

{{since when="1.5.0"}}

You can also specify a value using [chrono literals](#chrono-literals), for example: `Cellular.setListenTimeout(5min)` for 5 minutes.



### getListenTimeout()

{{since when="0.6.1"}}

```cpp
// SYNTAX
uint16_t seconds = Cellular.getListenTimeout();
```

`Cellular.getListenTimeout()` is used to get the timeout value currently set for Listening Mode.  Values are returned in (uint16_t)`seconds`, and 0 indicates the timeout is disabled.  By default, Cellular devices have a 5 minute timeout set (seconds=300).


### lock()

The `Cellular` object does not have built-in thread-safety. If you want to use things like `Cellular.command()` from multiple threads, including from a software timer, you must lock and unlock it to prevent data from multiple thread from being interleaved or corrupted.

A call to lock `lock()` must be balanced with a call to `unlock()` and not be nested. To make sure every lock is released, it's good practice to use `WITH_LOCK` like this:

```cpp
// EXAMPLE USAGE
void loop()
{
  WITH_LOCK(Cellular) {
    Cellular.command("AT\r\n");
  }
}
```

Never use `lock()` or `WITH_LOCK()` within a `SINGLE_THREADED_BLOCK()` as deadlock can occur.

### unlock()

Unlocks the `Cellular` mutex. See `lock()`.


### setCredentials()

{{api name1="Cellular.setCredentials" name2="setCredentials"}}

Sets 3rd party SIM credentials for the Cellular network from within the user application. 

Only a subset of Particle cellular devices are able to use a plastic 4FF nano SIM card from a 3rd-party carrier. [This table](/tutorials/cellular-connectivity/introduction/#sim-cards) lists external SIM capability and includes the Electron and Boron only. There are also limits on the number of devices with 3rd-party SIM cards in an account. For more information, see the [3rd-party SIM guide](https://support.particle.io/hc/en-us/articles/360039741113).

| Device | Internal SIM | SIM Card Slot | APN Saved |
| :--- | :---: | :---: | :---: |
| Boron 2G/3G (BRN310) | &check; | &check; | &check; |
| Boron LTE (BRN402) | &check; | &check; | &check; |
| Electron 3G Americas (E260) | &nbsp; | &check; | &nbsp; |
| Electron 3G Europe/Asia/Africa (E270) | &nbsp; | &check; | &nbsp; |
| Electron 2G (E350) | &nbsp; | &check; | &nbsp; |
| Electron LTE (ELC402) | &check; | &nbsp; | n/a |

---

{{note op="start" type="gen3"}}
Gen 3 devices (Boron 2G/3G, Boron LTE) have both an internal (MFF2 SMD) SIM and an external 4FF nano SIM card slot that can be used for a plastic nano SIM card.

- You must select which SIM to use in software, it does not automatically switch on Gen 3 devices.
- The APN is saved in configuration flash and you only need to set it once.
- The keep-alive is not saved so you will need to set that from your user firmware.
- On the Boron LTE you must also remove the external SIM card when switching to the internal SIM in software.
{{note op="end"}}

{{note op="start" type="gen2"}}
On Gen 2 devices (Electron), there is only a 4FF nano SIM card slot. There is no internal SIM so you must always have a SIM card in the SIM card holder on the bottom of the device for normal operation.

- The APN must be set in all user firmware as it is only saved in the modem memory and the setting is erased when powered down.
- The keep-alive must be set from your user firmware.
- The Electron LTE (ELC402) does not have a SIM card slot and cannot be used with a 3rd-party SIM card.
{{note op="end"}}


{{#if has-set-credentials}}

On Gen 3 devices, cellular credentials added to the device's non-volatile memory and only need to be set once. The setting will be preserved across reset, power down, and firmware upgrades. 
This is different than the Electron and E series where you must call `cellular_credentials_set()` from all user firmware.

You may set credentials in 3 different ways:

- APN only
- USERNAME & PASSWORD only
- APN, USERNAME & PASSWORD

The following example can be copied to a file called `setcreds.ino` and compiled and flashed to your device over USB via the [Particle CLI](/tutorials/developer-tools/cli/).  With your device in [DFU mode](/tutorials/device-os/led/electron#dfu-mode-device-firmware-upgrade-), the command for this is:

`particle compile electron setcreds.ino --saveTo firmware.bin && particle flash --usb firmware.bin`


```cpp
SYSTEM_MODE(SEMI_AUTOMATIC);

void setup() {
	// Clears any existing credentials. Use this to restore the use of the Particle SIM.
	Cellular.clearCredentials();

	// You should only use one of the following three commands.
	// Only one set of credentials can be stored.

	// Connects to a cellular network by APN only
	Cellular.setCredentials("broadband");

	// Connects to a cellular network with USERNAME and PASSWORD only
	Cellular.setCredentials("username", "password");

	// Connects to a cellular network with a specified APN, USERNAME and PASSWORD
	Cellular.setCredentials("some-apn", "username", "password");
	
	Particle.connect();
}

void loop() {
}

```

### clearCredentials()

Your device only uses one set of credentials, and they
must be correctly matched to the SIM card that's used.  If using a
Particle SIM, using `Cellular.setCredentials()` is not necessary as the
default APN will be used. If you have set a different APN to use a 3rd-party
SIM card, you can restore the use of the Particle SIM by using
`Cellular.clearCredentials()`. 

{{/if}} {{!-- has-nrfhas-set-credentials52 --}}


{{#unless has-set-credentials}} {{!-- Electron and E series that don't save credentials in non-volatile memory --}}

On Gen 2 devices (Electron), cellular credentials are not added to the device's non-volatile memory and need to be set every time from the user application.  You may set credentials in 3 different ways:

- APN only
- USERNAME & PASSWORD only
- APN, USERNAME & PASSWORD

**Note**: When using the default `SYSTEM_MODE(AUTOMATIC)` connection behavior, it is necessary to call `cellular_credentials_set()` with the `STARTUP()` macro outside of `setup()` and `loop()` so that the system will have the correct credentials before it tries to connect to the cellular network (see EXAMPLE).

The following examples can be copied to a file called `setcreds.ino` and compiled and flashed to your device over USB via the [Particle CLI](/tutorials/developer-tools/cli/).  With your device in [DFU mode](/tutorials/device-os/led/electron#dfu-mode-device-firmware-upgrade-), the command for this is:

`particle compile electron setcreds.ino --saveTo firmware.bin && particle flash --usb firmware.bin`

**Note**: Your device only uses one set of credentials, and they
must be correctly matched to the SIM card that's used.  If using a
Particle SIM, using `cellular_credentials_set()` is not necessary as the
default APN of "spark.telefonica.com" with no username or password will
be used by Device OS. To switch back to using a Particle SIM after successfully connecting with a 3rd Party SIM, just flash any app that does not include cellular_credentials_set().  Then disconnect the battery and external power (such as USB) for 20 seconds to remove the settings from the modem’s volatile memory.

```cpp
// SYNTAX
// Connects to a cellular network by APN only
STARTUP(cellular_credentials_set(APN, "", "", NULL));

// Connects to a cellular network with USERNAME and PASSWORD only
STARTUP(cellular_credentials_set("", USERNAME, PASSWORD, NULL));

// Connects to a cellular network with a specified APN, USERNAME and PASSWORD
#include “cellular_hal.h”
STARTUP(cellular_credentials_set(APN, USERNAME, PASSWORD, NULL));
```

```cpp
// EXAMPLE - an AT&T APN with no username or password in AUTOMATIC mode

#include "cellular_hal.h"
STARTUP(cellular_credentials_set("broadband", "", "", NULL));

void setup() {
  // your setup code
}

void loop() {
  // your loop code
}
```
{{/unless}} {{!-- has-set-credentials --}}


{{#if has-set-active-sim}}

### setActiveSim()

The device can use either the built-in MFF2 embedded Particle SIM card or an external nano SIM card in 
the SIM card connector. The active SIM card setting is stored in non-volatile memory and only needs to be set 
once. The setting will be preserved across reset, power down, and firmware upgrades.

For Boron LTE modules, a special command needs to be given to the cell radio after setting `setActiveSim`. If this command is not given, the device may end up blinking green, and the device does not connect to cloud. Please refer to [this support article](https://support.particle.io/hc/en-us/articles/360039741113/) if you are switching SIM cards with Boron LTE.


```cpp
SYSTEM_MODE(SEMI_AUTOMATIC);

void setup() {
	// Choose one of these:
	Cellular.setActiveSim(EXTERNAL_SIM);
	Cellular.setActiveSim(INTERNAL_SIM);
}

void loop() {
}
```

### getActiveSim()

Get the current active SIM (internal or external):

- INTERNAL_SIM = 1
- EXTERNAL_SIM = 2

```cpp
void setup() {
	Serial.begin();
}

void loop() {
	SimType simType = Cellular.getActiveSim();
	Serial.printlnf("simType=%d", simType);
	delay(5000);
}
```

{{/if}} {{!-- has-set-active-sim --}}

### getDataUsage()

A software implementation of Data Usage that pulls sent and received session and total bytes from the cellular modem's internal counters.  The sent / received bytes are the gross payload evaluated by the protocol stack, therefore they comprise the TCP and IP header bytes and the packets used to open and close the TCP connection.  I.e., these counters account for all overhead in cellular communications.

**Note**: Cellular.getDataUsage() should only be used for relative measurements on data at runtime.  Do not rely upon these figures for absolute and total data usage of your SIM card.

**Note**: There is a known issue with Sara U260/U270 modem firmware not being able to set/reset the internal counters (which does work on the Sara G350).  Because of this limitation, the set/reset function is implemented in software, using the modem's current count as the baseline.

**Note**: The internal modem counters are typically reset when the modem is power cycled (complete power removal, soft power down or Cellular.off()) or if the PDP context is deactivated and reactivated which can happen asynchronously during runtime. If the Cellular.getDataUsage() API has been read, reset or set, and then the modem's counters are reset for any reason, the next call to Cellular.getDataUsage() for a read will detect that the new reading would be less than the previous reading.  When this is detected, the current reading will remain the same, and the now lower modem count will be used as the new baseline.  Because of this mechanism, it is generally more accurate to read the getDataUsage() count often. This catches the instances when the modem count is reset, before the count starts to increase again.

**Note**: LTE Cat M1 devices (SARA-R410M-02B), Quectel EG91-E (B Series SoM B523), Quectel EG-91EX (Tracker SoM T523), and Quectel BG96-MC (TrackerSoM T402) do not support data usage APIs.

To use the data usage API, an instance of the `CellularData` type needs to be created to read or set counters.  All data usage API functions and the CellularData object itself return `bool` - `true` indicating the last operation was successful and the CellularData object was updated. For set and get functions, `CellularData` is passed by reference `Cellular.dataUsage(CellularData&);` and updated by the function.  There are 5 integers and 1 boolean within the CellularData object:

- **ok**: (bool) a boolean value `false` when the CellularData object is initially created, and `true` after the object has been successfully updated by the API. If the last reading failed and the counters were not changed from their previous value, this value is set to `false`.
- **cid**: (int) a value from 0-255 that is the index of the current PDP context that the data usage counters are valid for.  If this number is -1, the data usage counters have either never been initially set, or the last reading failed and the counters were not changed from their previous value.
- **tx_session**: (int) number of bytes sent for the current session
- **rx_session**: (int) number of bytes sent for the current session
- **tx_total**: (int) number of bytes sent total (typical equals the session numbers)
- **rx_total**: (int) number of bytes sent total (typical equals the session numbers)

CellularData is a Printable object, so using it directly with `Serial.println(data);` will be output as follows:

```
cid,tx_session,rx_session,tx_total,rx_total
31,1000,300,1000,300
```

```cpp
// SYNTAX
// Read Data Usage
CellularData data;
Cellular.getDataUsage(data);
```

```cpp
// EXAMPLE

void setup()
{
  Serial.begin(9600);
}

void loop()
{
    if (Serial.available() > 0)
    {
        char c = Serial.read();
        if (c == '1') {
            Serial.println("Read counters of sent or received PSD data!");
            CellularData data;
            if (!Cellular.getDataUsage(data)) {
                Serial.print("Error! Not able to get data.");
            }
            else {
                Serial.printlnf("CID: %d SESSION TX: %d RX: %d TOTAL TX: %d RX: %d",
                    data.cid,
                    data.tx_session, data.rx_session,
                    data.tx_total, data.rx_total);
                Serial.println(data); // Printable
            }
        }
        else if (c == '2') {
            Serial.println("Set all sent/received PSD data counters to 1000!");
            CellularData data;
            data.tx_session = 1000;
            data.rx_session = 1000;
            data.tx_total = 1000;
            data.rx_total = 1000;
            if (!Cellular.setDataUsage(data)) {
                Serial.print("Error! Not able to set data.");
            }
            else {
                Serial.printlnf("CID: %d SESSION TX: %d RX: %d TOTAL TX: %d RX: %d",
                    data.cid,
                    data.tx_session, data.rx_session,
                    data.tx_total, data.rx_total);
                Serial.println(data); // Printable
            }
        }
        else if (c == '3') {
            Serial.println("Reset counter of sent/received PSD data!");
            if (!Cellular.resetDataUsage()) {
                Serial.print("Error! Not able to reset data.");
            }
        }
        else if (c == 'p') {
            Serial.println("Publish some data!");
            Particle.publish("1","a");
        }
        while (Serial.available()) Serial.read(); // Flush the input buffer
    }

}
```

### setDataUsage()

Sets the Data Usage counters to the values indicated in the supplied CellularData object.

Returns `bool` - `true` indicating this operation was successful and the CellularData object was updated.

```cpp
// SYNTAX
// Set Data Usage
CellularData data;
Cellular.setDataUsage(data);
```

### resetDataUsage()

Resets the Data Usage counters to all zero.  No CellularData object is required.  This is handy to call just before an operation where you'd like to measure data usage.

Returns: `bool`
- `true` indicates this operation was successful and the internally stored software offset has been reset to zero. If getDataUsage() was called immediately after without any data being used, the CellularData object would indicate zero data used.

```cpp
// SYNTAX
// Reset Data Usage
Cellular.resetDataUsage();
```

### RSSI()

`Cellular.RSSI()` returns an instance of [`CellularSignal`](#cellularsignal-class) class that allows you to determine signal strength (RSSI) and signal quality of the currently connected Cellular network.

### CellularSignal Class

This class allows to query a number of signal parameters of the currently connected Cellular network.

#### getAccessTechnology()

```cpp
// SYNTAX
CellularSignal sig = Cellular.RSSI();
int rat = sig.getAccessTechnology();
```

Gets the current radio access technology (RAT) in use.

The following radio technologies are defined:
- `NET_ACCESS_TECHNOLOGY_GSM`: 2G RAT
- `NET_ACCESS_TECHNOLOGY_EDGE`: 2G RAT with EDGE
- `NET_ACCESS_TECHNOLOGY_UMTS`/`NET_ACCESS_TECHNOLOGY_UTRAN`/`NET_ACCESS_TECHNOLOGY_WCDMA`: UMTS RAT
- `NET_ACCESS_TECHNOLOGY_LTE`: LTE RAT

#### getStrength()

Gets the signal strength as a percentage (0.0 - 100.0). See [`getStrengthValue()`](#getstrengthvalue-) on how raw RAT-specific strength values are mapped to 0%-100% range.

```cpp
// SYNTAX
CellularSignal sig = Cellular.RSSI();
float strength = sig.getStrength();

// EXAMPLE
CellularSignal sig = Cellular.RSSI();
Log.info("Cellular signal strength: %.02f%%", sig.getStrength());
```

Returns: `float`

#### getQuality()

Gets the signal quality as a percentage (0.0 - 100.0). See [`getQualityValue()`](#getqualityvalue-) on how raw RAT-specific quality values are mapped to 0%-100% range.

```cpp
// SYNTAX
CellularSignal sig = Cellular.RSSI();
float quality = sig.getQuality();

// EXAMPLE
CellularSignal sig = Cellular.RSSI();
Log.info("Cellular signal quality: %.02f%%", sig.getQuality());
```

Returns: `float`

**Note**: `qual` is not supported on 2G Electrons (Model G350) and will return 0.

#### getStrengthValue()

```cpp
// SYNTAX
CellularSignal sig = Cellular.RSSI();
float strength = sig.getStrengthValue();
```

Gets the raw signal strength value. This value is RAT-specific. See [`getAccessTechnology()`](#getaccesstechnology-) for a list of radio access technologies.

- 2G RAT / 2G RAT with EDGE: RSSI in dBm. Range: [-111, -48] as specified in 3GPP TS 45.008 8.1.4.
- UMTS RAT: RSCP in dBm. Range: [-121, -25] as specified in 3GPP TS 25.133 9.1.1.3.

Returns: `float`

#### getQualityValue()

```cpp
// SYNTAX
CellularSignal sig = Cellular.RSSI();
float quality = sig.getQualityValue();
```

Gets the raw signal quality value. This value is RAT-specific. See [`getAccessTechnology()`](#getaccesstechnology-) for a list of radio access technologies.

- 2G RAT: Bit Error Rate (BER) in % as specified in 3GPP TS 45.008 8.2.4. Range: [0.14%, 18.10%]
- 2G RAT with EDGE: log10 of Mean Bit Error Probability (BEP) as defined in 3GPP TS 45.008. Range: [-0.60, -3.60] as specified in 3GPP TS 45.008 10.2.3.3.
- UMTS RAT: Ec/Io (dB) [-24.5, 0], as specified in 3GPP TS 25.133 9.1.2.3.

Returns: `float`

**Note**: `qual` is not supported on 2G Electrons (Model G350) and will return 0.

_Before 0.8.0:_

Before Device OS 0.8.0, the `CellularSignal` class only had two member variables, `rssi`, and `qual`. These will be removed in a future version of Device OS and you should use `getStrengthValue()` and `getQualityValue()` instead.

```
// Prior to 0.8.0:
CellularSignal sig = Cellular.RSSI();
Serial.println(sig.rssi);
Serial.println(sig.qual);
```

### getBandAvailable()

{{since when="0.5.0"}}

Gets the cellular bands currently available in the modem.  `Bands` are the carrier frequencies used to communicate with the cellular network.  Some modems have 2 bands available (U260/U270) and others have 4 bands (G350).

To use the band select API, an instance of the `CellularBand` type needs to be created to read or set bands.  All band select API functions and the CellularBand object itself return `bool` - `true` indicating the last operation was successful and the CellularBand object was updated. For set and get functions, `CellularBand` is passed by reference `Cellular.getBandSelect(CellularBand&);` and updated by the function.  There is 1 array, 1 integer, 1 boolean and 1 helper function within the CellularBand object:

- **ok**: (bool) a boolean value `false` when the CellularBand object is initially created, and `true` after the object has been successfully updated by the API. If the last reading failed and the bands were not changed from their previous value, this value is set to `false`.
- **count**: (int) a value from 0-5 that is the number of currently selected bands retrieved from the modem after getBandAvailble() or getBandSelect() is called successfully.
- **band[5]**: (MDM_Band[]) array of up to 5 MDM_Band enumerated types.  Available enums are: `BAND_DEFAULT, BAND_0, BAND_700, BAND_800, BAND_850, BAND_900, BAND_1500, BAND_1700, BAND_1800, BAND_1900, BAND_2100, BAND_2600`.  All elements set to 0 when CellularBand object is first created, but after getBandSelect() is called successfully the currently selected bands will be populated started with index 0, i.e., (`.band[0]`). Can be 5 values when getBandAvailable() is called on a G350 modem, as it will return factory default value of 0 as an available option, i.e., `0,850,900,1800,1900`.
- **bool isBand(int)**: helper function built into the CellularBand type that can be used to check if an integer is a valid band.  This is helpful if you would like to test a value before manually setting a band in the .band[] array.

CellularBand is a Printable object, so using it directly with `Serial.println(CellularBand);` will print the number of bands that are retrieved from the modem.  This will be output as follows:

```
// EXAMPLE PRINTABLE
CellularBand band_sel;
// populate band object with fake data
band_sel.band[0] = BAND_850;
band_sel.band[1] = BAND_1900;
band_sel.count = 2;
Log.info(band_sel);

// OUTPUT: band[0],band[1]
850,1900
```

Here's a full example using all of the functions in the <a href="https://gist.github.com/technobly/b0e2f160b9d969d978337c0561999998" target="_blank">Cellular Band Select API</a>

There is one supported function for getting available bands using the CellularBand object:

`bool Cellular.getBandAvailable(CellularBand &band_avail);`

**Note:** getBandAvailable() always sets the first band array element `.band[0]` as 0 which indicates the first option available is to set the bands back to factory defaults, which includes all bands.

```
// SYNTAX
CellularBand band_avail;
Cellular.getBandAvailable(band_avail);
```

```
// EXAMPLE
CellularBand band_avail;
if (Cellular.getBandSelect(band_avail)) {
    Serial.print("Available bands: ");
    for (int x=0; x<band_avail.count; x++) {
        Serial.printf("%d", band_avail.band[x]);
        if (x+1 < band_avail.count) Serial.printf(",");
    }
    Serial.println();
}
else {
    Serial.printlnf("Bands available not retrieved from the modem!");
}
```

### getBandSelect()

{{since when="0.5.0"}}

Gets the cellular bands currently set in the modem.  `Bands` are the carrier frequencies used to communicate with the cellular network.

There is one supported function for getting selected bands using the CellularBand object:

`bool Cellular.getBandSelect(CellularBand &band_sel);`

```
// SYNTAX
CellularBand band_sel;
Cellular.getBandSelect(band_sel);
```

```
// EXAMPLE
CellularBand band_sel;
if (Cellular.getBandSelect(band_sel)) {
    Serial.print("Selected bands: ");
    for (int x=0; x<band_sel.count; x++) {
        Serial.printf("%d", band_sel.band[x]);
        if (x+1 < band_sel.count) Serial.printf(",");
    }
    Serial.println();
}
else {
    Serial.printlnf("Bands selected not retrieved from the modem!");
}
```

### setBandSelect()
{{since when="0.5.0"}}
Sets the cellular bands currently set in the modem.  `Bands` are the carrier frequencies used to communicate with the cellular network.

**Caution:** The Band Select API is an advanced feature designed to give users selective frequency control over their device. When changing location or between cell towers, you may experience connectivity issues if you have only set one specific frequency for use. Because these settings are permanently saved in non-volatile memory, it is recommended to keep the factory default value of including all frequencies with mobile applications.  Only use the selective frequency control for stationary applications, or for special use cases.

- Make sure to set the `count` to the appropriate number of bands set in the CellularBand object before calling `setBandSelect()`.
- Use the `.isBand(int)` helper function to determine if an integer value is a valid band.  It still may not be valid for the particular modem you are using, in which case `setBandSelect()` will return `false` and `.ok` will also be set to `false`.
- When trying to set bands that are already set, they will not be written to Non-Volatile Memory (NVM) again.
- When updating the bands in the modem, they will be saved to NVM and will be remain as set when the modem power cycles.
- Setting `.band[0]` to `BAND_0` or `BAND_DEFAULT` and `.count` to 1 will restore factory defaults.

There are two supported functions for setting bands, one uses the CellularBand object, and the second allow you to pass in a comma delimited string of bands:

`bool Cellular.setBandSelect(const char* band_set);`

`bool Cellular.setBandSelect(CellularBand &band_set);`

```
// SYNTAX
CellularBand band_set;
Cellular.setBandSelect(band_set);

// or

Cellular.setBandSelect("850,1900"); // set two bands
Cellular.setBandSelect("0"); // factory defaults
```

```
// EXAMPLE
Serial.println("Setting bands to 850 only");
CellularBand band_set;
band_set.band[0] = BAND_850;
band_set.band[1] = BAND_1900;
band_set.count = 2;
if (Cellular.setBandSelect(band_set)) {
    Serial.print(band_set);
    Serial.println(" band(s) set! Value will be saved in NVM when powering off modem.");
}
else {
    Serial.print(band_set);
    Serial.println(" band(s) not valid! Use getBandAvailable() to query for valid bands.");
}
```

```
// EXAMPLE
Serial.println("Restoring factory defaults with the CellularBand object");
CellularBand band_set;
band_set.band[0] = BAND_DEFAULT;
band_set.count = 1;
if (Cellular.setBandSelect(band_set)) {
    Serial.println("Factory defaults set! Value will be saved in NVM when powering off modem.");
}
else {
    Serial.println("Restoring factory defaults failed!");
}
```

```
// EXAMPLE
Serial.println("Restoring factory defaults with strings");
if (Cellular.setBandSelect("0")) {
    Serial.println("Factory defaults set! Value will be saved in NVM when powering off modem.");
}
else {
    Serial.println("Restoring factory defaults failed!");
}
```

### resolve()
{{since when="0.6.1"}}

`Cellular.resolve()` finds the IP address for a domain name.

```cpp
// SYNTAX
IPAddress ip = Cellular.resolve(name);
```

Parameters:

- `name`: the domain name to resolve (string)

It returns the IP address if the domain name is found, otherwise a blank IP address.

```cpp
// EXAMPLE USAGE

IPAddress ip;
void setup() {
   ip = Cellular.resolve("www.google.com");
   if(ip) {
     // IP address was resolved
   } else {
     // name resolution failed
   }
}
```

### localIP()

{{since when="0.5.0"}}

`Cellular.localIP()` returns the local (private) IP address assigned to the device as an `IPAddress`.

```cpp
// EXAMPLE
SerialLogHandler logHandler;

void setup() {
  // Prints out the local (private) IP over Serial
  Log.info("localIP: %s", Cellular.localIP().toString().c_str());
}
```

### command()

`Cellular.command()` is a powerful API that allows users access to directly send AT commands to, and parse responses returned from, the Cellular module.  Commands may be sent with and without printf style formatting. The API also includes the ability pass a callback function pointer which is used to parse the response returned from the cellular module.

{{#if boron}}
{{since when="0.9.0"}}
On the Boron, Cellular.command requires Device OS 0.9.0 or later; it is not supported on 0.8.0-rc versions.
{{/if}}

**Note:** Obviously for this command to work the cellular module needs to be switched on, which is not automatically the case in [`SYSTEM_MODE(MANUAL)`](#manual-mode) or [`SYSTEM_MODE(SEMI_AUTOMATIC)`](#semi-automatic-mode). This can be achieved explicitly via [`Cellular.on()`](#on-) or implicitly by calling [`Cellular.connect()`](#connect-) or [`Particle.connect()`](#particle-connect-).

You can download the latest <a href="https://www.u-blox.com/en/product-resources/2432?f[0]=field_file_category%3A210" target="_blank">u-blox AT Commands Manual</a>.

Another good resource is the <a href="https://www.u-blox.com/sites/default/files/AT-CommandsExamples_AppNote_%28UBX-13001820%29.pdf" target="_blank">u-blox AT Command Examples Application Note</a>.

LTE Cat M1 devices (SARA-R410M-02B) have a slightly different AT command set in the <a href="https://www.u-blox.com/sites/default/files/SARA-R4_ATCommands_%28UBX-17003787%29.pdf" target="_blank">u-blox SARA-R4 AT Commands Manual</a>.

The B Series B523 SoM and Tracker T523 SoM (EMEA) have a Quectel EG91-E, the AT commands can be found in the <a href="/assets/pdfs/Quectel_EG9x_AT_Commands_Manual_V1.1.pdf" target="_blank">Quectel EG9x AT Commands Manual (version 1.1).</a>.

The Tracker T402 SoM (North America) has a Quectel BG96-MC, the AT commands cann be found in the <a href="/assets/pdfs/Quectel_BG96_AT_Commands_Manual_V2.1.pdf" target="_blank">Quectel BG96 AT Commands Manual (version 2.1).</a>.

The prototype definition is as follows:

`int Cellular.command(_CALLBACKPTR_MDM cb, void* param, system_tick_t timeout, const char* format, ...);`

`Cellular.command()` takes one or more arguments in 4 basic types of signatures.

```cpp
// SYNTAX (4 basic signatures with/without printf style formatting)
int ret = Cellular.command(cb, param, timeout, format, ...);
int ret = Cellular.command(cb, param, timeout, format);
int ret = Cellular.command(cb, param, format, ...);
int ret = Cellular.command(cb, param, format);
int ret = Cellular.command(timeout, format, ...);
int ret = Cellular.command(timeout, format);
int ret = Cellular.command(format, ...)
int ret = Cellular.command(format);
```

- `cb`: callback function pointer to a user specified function that parses the results of the AT command response.
- `param`: (`void*`) a pointer to the variable that will be updated by the callback function.
- `timeout`: (`system_tick_t`) the timeout value specified in milliseconds (default is 10000 milliseconds).
- `format`: (`const char*`) contains your AT command and any desired [format specifiers](http://www.cplusplus.com/reference/cstdio/printf/), followed by `\r\n`.
- `...`: additional arguments optionally required as input to their respective `format` string format specifiers.

`Cellular.command()` returns an `int` with one of the following 6 enumerated AT command responses:

- `NOT_FOUND`    =  0
- `WAIT`         = -1 // TIMEOUT
- `RESP_OK`      = -2
- `RESP_ERROR`   = -3
- `RESP_PROMPT`  = -4
- `RESP_ABORTED` = -5

```cpp
// EXAMPLE - Get the ICCID number of the inserted SIM card
SerialLogHandler logHandler;

int callbackICCID(int type, const char* buf, int len, char* iccid)
{
  if ((type == TYPE_PLUS) && iccid) {
    if (sscanf(buf, "\r\n+CCID: %[^\r]\r\n", iccid) == 1)
      /*nothing*/;
  }
  return WAIT;
}

void setup()
{
  char iccid[32] = "";
  if ((RESP_OK == Cellular.command(callbackICCID, iccid, 10000, "AT+CCID\r\n"))
    && (strcmp(iccid,"") != 0))
  {
    Log.info("SIM ICCID = %s\r\n", iccid);
  }
  else
  {
    Log.info("SIM ICCID NOT FOUND!");
  }
}

void loop()
{
  // your loop code
}
```
The `cb` function prototype is defined as:

`int callback(int type, const char* buf, int len, void* param);`

The four Cellular.command() callback arguments are defined as follows:

- `type`: (`int`) one of 13 different enumerated AT command response types.
- `buf`: (`const char*`) a pointer to the character array containing the AT command response.
- `len`: (`int`) length of the AT command response `buf`.
- `param`: (`void*`) a pointer to the variable or structure being updated by the callback function.
- returns an `int` - user specified callback return value, default is `return WAIT;` which keeps the system invoking the callback again as more of the AT command response is received.  Optionally any one of the 6 enumerated AT command responses previously described can be used as a return type which will force the Cellular.command() to return the same value. AT commands typically end with an `OK` response, so even after a response is parsed, it is recommended to wait for the final `OK` response to be parsed and returned by the system. Then after testing `if(Cellular.command() == RESP_OK)` and any other optional qualifiers, should you act upon the results contained in the variable/structure passed into the callback.

There are 13 different enumerated AT command responses passed by the system into the Cellular.command() callback as `type`. These are used to help qualify which type of response has already been parsed by the system.

- `TYPE_UNKNOWN`    = 0x000000
- `TYPE_OK`         = 0x110000
- `TYPE_ERROR`      = 0x120000
- `TYPE_RING`       = 0x210000
- `TYPE_CONNECT`    = 0x220000
- `TYPE_NOCARRIER`  = 0x230000
- `TYPE_NODIALTONE` = 0x240000
- `TYPE_BUSY`       = 0x250000
- `TYPE_NOANSWER`   = 0x260000
- `TYPE_PROMPT`     = 0x300000
- `TYPE_PLUS`       = 0x400000
- `TYPE_TEXT`       = 0x500000
- `TYPE_ABORTED`    = 0x600000

{{/if}} {{!-- electron --}}

{{#if has-battery-voltage}}
## Battery Voltage

This device does not have a fuel gauge chip, however you can determine the voltage of the LiPo battery, if present.

```cpp
float voltage = analogRead(BATT) * 0.0011224;
```

The constant 0.0011224 is based on the voltage divider circuit (R1 = 806K, R2 = 2M) that lowers the 3.6V LiPo battery output to a value that can be read by the ADC.

{{/if}}

{{#if has-fuel-gauge}}
## FuelGauge
The on-board Fuel Gauge allows you to monitor the battery voltage, state of charge and set low voltage battery thresholds. Use an instance of the `FuelGauge` library to call the various fuel gauge functions.

```cpp
// EXAMPLE
FuelGauge fuel;
```

### getVCell()

```cpp
// PROTOTYPE
float getVCell();

// EXAMPLE
FuelGauge fuel;
Log.info( "voltage=%.2f", fuel.getVCell() );
```

Returns the battery voltage as a `float`. Returns -1.0 if the fuel gauge cannot be read.

### getSoC()

```cpp
// PROTOTYPE
float getSoC() 

// EXAMPLE
FuelGauge fuel;
Log.info( "SoC=%.2f", fuel.getSoC() );
```

Returns the State of Charge in percentage from 0-100% as a `float`. Returns -1.0 if the fuel gauge cannot be read.

Note that in most cases, "fully charged" state (red charging LED goes off) will result in a SoC of 80%, not 100%. Using `getNormalizedSoC()` normalizes the value based on the charge voltage so the SoC will be 100% when the charge LED goes off.

In some cases you can [increase the charge voltage](#setchargevoltage-) to get a higher SoC, but there are limits, based on temperature.

{{since when="1.5.0"}}

It may be preferable to use [`System.batteryCharge()`](#batterycharge-) instead of using `getSoC()`, which uses the value in device diagnostics, which eventually uses `getNormalizedSoC()`.

### getNormalizedSoC()

```cpp
// PROTOTYPE
float getNormalizedSoC()
```

Returns the State of Charge in percentage from 0-100% as a `float`, normalized based on the charge voltage. Returns -1.0 if the fuel gauge cannot be read.

It may be easier to use [`System.batteryCharge()`](#batterycharge-) instead of using `getNormalizedSoC()` directly. `System.batteryCharge()` uses the value in device diagnostics, which eventually uses `getNormalizedSoC()`.

### getVersion()
`int getVersion();`

### getCompensateValue()
`byte getCompensateValue();`

### getAlertThreshold()
`byte getAlertThreshold();`

### setAlertThreshold()
`void setAlertThreshold(byte threshold);`

### getAlert()
`boolean getAlert();`

### clearAlert()
`void clearAlert();`

### reset()
`void reset();`

### quickStart()
`void quickStart();`

### sleep()
`void sleep();`

### wakeup()
`void wakeup();`
{{/if}} {{!-- has-fuel-gauge --}}

## Input/Output

Additional information on which pins can be used for which functions is available on the [pin information page](/reference/hardware/pin-info).

{{#if tracker-som}}
The Tracker SoM has shared A and D pins. In other words, pin A0 is the same physical pin as pin D0, and is also the SDA pin. The alternate naming is to simplify porting code from other device types.

| Pin     | M8 Pin | Function    | Function    | Analog In | GPIO    | 
| :-----: | :----: | :---------  | :---------  | :-------: | :-----: | 
| A0 / D0 |        | Wire SDA    |             | &check;   | &check; | 
| A1 / D1 |        | Wire SCL    |             | &check;   | &check; |
| A2 / D2 |        | Serial1 CTS |             | &check;   | &check; |
| A3 / D3 | 3      | Serial1 RTS |             | &check;   | &check; |
| A4 / D4 |        | SPI MOSI    |             | &check;   | &check; |
| A5 / D5 |        | SPI MISO    |             | &check;   | &check; |
| A6 / D6 |        | SPI SCK     |             | &check;   | &check; |
| A7 / D7 |        | SPI SS      | WKP         | &check;   | &check; |
| TX / D8 | 5      | Serial1 TX  | Wire3 SCL   |           | &check; |
| RX / D9 | 4      | Serial1 RX  | Wire3 SDA   |           | &check; |

On the Tracker One and Tracker Carrier Board you must enable CAN_5V in order to use GPIO on M8 pins 3, 4, and 5 (A3, D8/TX/SCL, D9/RX/SDA). If CAN_5V is not powered, these pins are isolated from the MCU starting with version 1.1 of the Tracker One/Tracker Carrier Board (September 2020 and later). This is necessary to prevent an issue with shipping mode, see technical advisory note [TAN002](https://support.particle.io/hc/en-us/articles/360052713714).

{{/if}} {{!-- tracker-som --}}

### pinMode()

`pinMode()` configures the specified pin to behave either as an input (with or without an internal weak pull-up or pull-down resistor), or an output.

```cpp
// PROTOTYPE
void pinMode(uint16_t pin, PinMode mode)

// EXAMPLE USAGE
int button = D0;                      // button is connected to D0
int LED = D1;                         // LED is connected to D1

void setup()
{
  pinMode(LED, OUTPUT);               // sets pin as output
  pinMode(button, INPUT_PULLDOWN);    // sets pin as input
}

void loop()
{
  // blink the LED as long as the button is pressed
  while(digitalRead(button) == HIGH) {
    digitalWrite(LED, HIGH);          // sets the LED on
    delay(200);                       // waits for 200mS
    digitalWrite(LED, LOW);           // sets the LED off
    delay(200);                       // waits for 200mS
  }
}
```

`pinMode()` takes two arguments: 

- `pin`: the pin you want to set the mode of (A0, A1, D0, D1, TX, RX, etc.). The type `pin_t` can be used instead of `uint16_t` to make it more obvious that the code accepts a pin number in your code.

- `mode`: the mode to set to pin to:

  - `INPUT` digital input (the default at power-up)
  - `INPUT_PULLUP` digital input with a pull-up resistor to 3V3
  - `INPUT_PULLDOWN` digital input with a pull-down to GND
  - `OUTPUT` an output (push-pull)
  - `OUTPUT_OPEN_DRAIN` an open-drain or open-collector output. HIGH (1) leaves the output in high impedance state, LOW (0) pulls the output low. Typically used with an external pull-up resistor to allow any of multiple devices to set the value low safely.

You do not need to set the `pinMode()` to read an analog value using [`analogRead`](#analogread-adc-) as the pin will automatically be set to the correct mode when analogRead is called.

When porting code from Arudino, pin numbers are numbered (0, 1, 2, ...) in Arduino code. Pin D0 has a value of 0, but it's best to use Particle pin names like D0 instead of just 0. This is especially true as the numeric value of A0 varies depending on the device and how many digital pins it has. For example, on the Argon, A0 is 19 but on the Photon it's 10. 

---

{{note op="start" type="gen3"}}
- Make sure the signal does not exceed 3.3V. Gen 3 devices (Tracker SoM as well as Argon, Boron, Xenon, and the B Series SoM) are not 5V tolerant in any mode (digital or analog).

- `INPUT_PULLUP` and `INPUT_PULLDOWN` are approximately 13K on Gen 3 devices.

If you are using the **Particle Ethernet FeatherWing** you cannot use the pins for GPIO as they are used for the Ethernet interface:

| Argon, Boron, Xenon| B Series SoM | Ethernet FeatherWing Pin  |
|:------:|:------------:|:--------------------------|
|MISO    | MISO         | SPI MISO                  |
|MOSI    | MOSI         | SPI MOSI                  |
|SCK     | SCK          | SPI SCK                   |
|D3      | A7           | nRESET                    |
|D4      | D22          | nINTERRUPT                |
|D5      | D8           | nCHIP SELECT              |

When using the FeatherWing Gen 3 devices (Argon, Boron, Xenon), pins D3, D4, and D5 are reserved for Ethernet control pins (reset, interrupt, and chip select).

When using Ethernet with the Boron SoM, pins A7, D22, and D8 are reserved for the Ethernet control pins (reset, interrupt, and chip select).

By default, on the **B Series SoM**, the Tinker application firmware enables the use of the bq24195 PMIC and MAX17043 fuel gauge. This in turn uses I2C (D0 and D1) and pin A6 (PM_INT). If you are not using the PMIC and fuel gauge and with to use these pins for other purposes, be sure to disable system power configuration. This setting is persistent, so you may want to disable it with your manufacturing firmware only.

```
System.setPowerConfiguration(SystemPowerConfiguration());
```

| B Series SoM | Power Manager Usage  |
|:-----------: | :------|
| D0           | I2C SDA |
| D1           | I2C SCL |
| A6           | PM_INT (power manager interrupt) |

{{note op="end"}}

{{note op="start" type="gen2"}}
- When using `INPUT_PULLUP` or `INPUT_PULLDOWN` make sure a high level signal does not exceed 3.3V.
- `INPUT_PULLUP` does not work as expected on TX on the P1, Electron, and E Series and should not be used. 
- `INPUT_PULLDOWN` does not work as expected on D0 and D1 on the P1 because the P1 module has hardware pull-up resistors on these pins. 
- `INPUT_PULLUP` and `INPUT_PULLDOWN` are approximately 40K on Gen 2 devices
- On the P1, D0 and D1 have 2.1K hardware pull-up resistors to 3V3.

On Gen 2 devices (Photon, P1, Electron, and E Series), GPIO pins are 5V tolerant if all of these conditions are met:
- Digital input mode (INPUT) (the ADC is not 5V tolerant)
- Not using INPUT_PULLDOWN or INPUT_PULLUP (internal pull is not 5V tolerant)
- Not using pins A3 or A6 (the DAC pins are not 5V tolerant, even in INPUT mode)
- Not using pins D0 and D1 on the P1 only as there is a pull-up to 3V3 on the P1 module only

Also beware when using pins D3, D5, D6, and D7 as OUTPUT controlling external devices on Gen 2 devices. After reset, these pins will be briefly taken over for JTAG/SWD, before being restored to the default high-impedance INPUT state during boot.

- D3, D5, and D7 are pulled high with a pull-up
- D6 is pulled low with a pull-down
- D4 is left floating

The brief change in state (especially when connected to a MOSFET that can be triggered by the pull-up or pull-down) may cause issues when using these pins in certain circuits. You can see this with the D7 blue LED which will blink dimly and briefly at boot.
{{note op="end"}}



### getPinMode(pin)

Retrieves the current pin mode.

```cpp
// PROTOTYPE
PinMode getPinMode(uint16_t pin)

// EXAMPLE

if (getPinMode(D0)==INPUT) {
  // D0 is an input pin
}
```

### digitalWrite()

Write a `HIGH` or a `LOW` value to a GPIO pin.

```cpp
// PROTOTYPE
void digitalWrite(uint16_t pin, uint8_t value)
```

If the pin has been configured as an `OUTPUT` with `pinMode()` or if previously used with `analogWrite()`, its voltage will be set to the corresponding value: 3.3V for HIGH, 0V (ground) for LOW.

`digitalWrite()` takes two arguments, `pin`: the number of the pin whose value you wish to set and `value`: `HIGH` or `LOW`.

`digitalWrite()` does not return anything.

```cpp
// EXAMPLE USAGE
int LED = D1;              // LED connected to D1

void setup()
{
  pinMode(LED, OUTPUT);    // sets pin as output
}

void loop()
{
  digitalWrite(LED, HIGH); // sets the LED on
  delay(200);              // waits for 200mS
  digitalWrite(LED, LOW);  // sets the LED off
  delay(200);              // waits for 200mS
}
```

---

{{note op="start" type="gen3"}}
- For all Feather Gen 3 devices (Argon, Boron, Xenon) all GPIO pins (`A0`..`A5`, `D0`..`D13`) can be used for digital output as long they are not used otherwise (e.g. as `Serial1` `RX`/`TX`).

- For the B Series SoM all GPIO pins (`A0`..`A7`, `D0`..`D13`, `D22`, `D23`) can be used for digital output as long they are not used otherwise (e.g. as `Serial1` `RX`/`TX`).

- For the Tracker SoM all GPIO pins (`A0`..`A7`, `D0`..`D9`) can be used for digital output as long they are not used otherwise (e.g. as `Serial1` `RX`/`TX`). Note that on the Tracker SoM pins A0 - A7 and the same physical pins as D0 - D7 and are just alternate names for the same pins.

- The default drive strength on Gen 3 devices is 2 mA per pin. This can be changed to 9 mA using [`pinSetDriveStrength()`](/reference/device-os/firmware/boron/#pinsetdrivestrength-).
{{note op="end"}}

{{note op="start" type="gen2"}}
- All GPIO pins (`A0`..`A7`, {{#if electron}}`B0`..`B5`, `C0`..`C5`, {{/if}}`D0`..`D7`, `DAC`, `WKP`, `RX`, `TX`) can be used as long they are not used otherwise (e.g. as `Serial1` `RX`/`TX`).

- The drive current on Gen 2 devices is 25 mA per pin, with a maximum of 125 mA across all GPIO.
{{note op="end"}}



### digitalRead()

Reads the value from a specified digital `pin`, either `HIGH` or `LOW`.

```cpp
// PROTOTYPE
int32_t digitalRead(uint16_t pin)
```

`digitalRead()` takes one argument, `pin`: the number of the digital pin you want to read.

`digitalRead()` returns `HIGH` or `LOW`.

```cpp
// EXAMPLE USAGE
int button = D0;                   // button is connected to D0
int LED = D1;                      // LED is connected to D1
int val = 0;                       // variable to store the read value

void setup()
{
  pinMode(LED, OUTPUT);            // sets pin as output
  pinMode(button, INPUT_PULLDOWN); // sets pin as input
}

void loop()
{
  val = digitalRead(button);       // read the input pin
  digitalWrite(LED, val);          // sets the LED to the button's value
}

```

---

{{note op="start" type="gen3"}}
- For all Feather Gen 3 devices (Argon, Boron, Xenon) all GPIO pins (`A0`..`A5`, `D0`..`D13`) can be used for digital input as long they are not used otherwise (e.g. as `Serial1` `RX`/`TX`).

- For the Boron SoM all GPIO pins (`A0`..`A7`, `D0`..`D13`, `D22`, `D23`) can be used for digital input as long they are not used otherwise (e.g. as `Serial1` `RX`/`TX`).

- For the Tracker SoM all GPIO pins (`A0`..`A7`, `D0`..`D9`) can be used for digital input as long they are not used otherwise (e.g. as `Serial1` `RX`/`TX`). Note that on the Tracker SoM pins A0 - A7 and the same physical pins as D0 - D7 and are just alternate names for the same pins.

- GPIO are **not** 5V tolerant on Gen 3 devices. Be sure the input voltage does not exceed 3.3V (typical) or 3.6V (absolute maximum).
{{note op="end"}}

{{note op="start" type="gen2"}}
- All GPIO pins (`A0`..`A7`, {{#if electron}}`B0`..`B5`, `C0`..`C5`, {{/if}}`D0`..`D7`, `DAC`, `WKP`, `RX`, `TX`) can be used as long they are not used otherwise (e.g. as `Serial1` `RX`/`TX`).
- On the Photon, Electron, and E Series, all GPIO pins **except** A3 and A6 are 5V tolerant. However you must not use `INPUT_PULLUP` or `INPUT_PULLDOWN` with 5V inputs.
- On the P1, all GPIO pins **except** A3, A6, D0 and D1 are 5V tolerant. However you must not use `INPUT_PULLUP` or `INPUT_PULLDOWN` with 5V inputs. 
- On the P1 there are 2.1K hardware pull-up resistors to 3V3 on D0 and D1 and are not 5V tolerant.
{{note op="end"}}

{{#if has-nrf52}}
### pinSetDriveStrength()

{{since when="2.0.0"}}

```cpp
// PROTOTYPE
int pinSetDriveStrength(pin_t pin, DriveStrength drive);
```

Sets the pin drive strength on Gen 3 devices with Device OS 2.0.0 and later.

`DriveStrength` is one of:

- `DriveStrength::DEFAULT` (`STANDARD`)
- `DriveStrength::STANDARD`
- `DriveStrength::HIGH`

Returns `SYSTEM_ERROR_NONE` (0) on success, or a non-zero system error code on error.

The drive strength is typically 2 mA in standard drive mode (the default), and 9 mA in high drive mode.

| Parameter | Symbol | Conditions | Min | Typ | Max | Unit |
| :---------|:-------|:----------:|:---:|:---:|:---:|:---: |
|Current at GND+0.4 V, output set low, high drive|I<sub>OL,HDL</sub> |V<sub>3V3</sub> >= 2.7V|6|10|15|mA|
|Current at V<sub>3V3</sub>-0.4 V, output set high, high drive|I<sub>OH,HDH</sub>|V<sub>3V3</sub> >= 2.7V|6|9|14|mA|
|Current at GND+0.4 V, output set low, standard drive|I<sub>OL,SD</sub> |V<sub>3V3</sub> >= 2.7V|1|2|4|mA|
|Current at V<sub>3V3</sub>-0.4 V, output set high, standard drive|I<sub>OH,SD</sub>|V<sub>3V3</sub> >= 2.7V|1|2|4|mA|


{{/if}}


{{#if has-pwm}}

### analogWrite() (PWM)

Writes an analog value to a pin as a digital PWM (pulse-width modulated) signal. The default frequency of the PWM signal is 500 Hz.

Can be used to light a LED at varying brightnesses or drive a motor at various speeds. After a call to analogWrite(), the pin will generate a steady square wave of the specified duty cycle until the next call to `analogWrite()` (or a call to `digitalRead()` or `digitalWrite()` on the same pin).

```cpp
// SYNTAX
analogWrite(pin, value);
analogWrite(pin, value, frequency);
```

`analogWrite()` takes two or three arguments:

- `pin`: the number of the pin whose value you wish to set
- `value`: the duty cycle: between 0 (always off) and 255 (always on). _Since 0.6.0:_ between 0 and 255 (default 8-bit resolution) or `2^(analogWriteResolution(pin)) - 1` in general.
{{#if has-stm32}}
- `frequency`: the PWM frequency: between 1 Hz and 65535 Hz (default 500 Hz) on Gen 2 devices (Photon, P1, Electron). _Since 0.6.0:_ between 1 Hz and `analogWriteMaxFrequency(pin)`.
{{/if}}
{{#if has-nrf52}}
- `frequency`: the PWM frequency:from 5 Hz to `analogWriteMaxFrequency(pin)`, currently 500 kHz on Gen 3 devices (Argon, Boron, Xenon). The default value is 500 Hz.
{{/if}}


**NOTE:** `pinMode(pin, OUTPUT);` is required before calling `analogWrite(pin, value);` or else the `pin` will not be initialized as a PWM output and set to the desired duty cycle.

`analogWrite()` does not return anything.

```cpp
// EXAMPLE USAGE

int ledPin = D1;               // LED connected to digital pin D1
int analogPin = A0;            // potentiometer connected to analog pin A0
int val = 0;                   // variable to store the read value

void setup()
{
  pinMode(ledPin, OUTPUT);     // sets the pin as output
}

void loop()
{
  val = analogRead(analogPin); // read the input pin
  analogWrite(ledPin, val/16); // analogRead values go from 0 to 4095,
                               // analogWrite values from 0 to 255.
  delay(10);
}
```

**NOTE:** When used with PWM capable pins, the `analogWrite()` function sets up these pins as PWM only.  {{#if has-dac}}This function operates differently when used with the [`Analog Output (DAC)`](#analog-output-dac-) pins.{{/if}}

Additional information on which pins can be used for PWM output is available on the [pin information page](/reference/hardware/pin-info).

---

{{note op="start" type="gen3"}}
On Gen 3 Feather devices (Argon, Boron), pins A0, A1, A2, A3, D2, D3, D4, D5, D6, D7, and D8 can be used for PWM. Pins are assigned a PWM group. Each group must share the same 
frequency and resolution, but individual pins in the group can have a different duty cycle.

- Group 3: Pins D2, D3, A4, and A5.
- Group 2: Pins A0, A1, A2, and A3.
- Group 1: Pins D4, D5, D6, and D8.
- Group 0: Pin D7 and the RGB LED. This must use the default resolution of 8 bits (0-255) and frequency of 500 Hz.

On the Boron SoM, pins D4, D5, D7, A0, A1, A6, and A7 can be used for PWM. Pins are assigned a PWM group. Each group must share the same 
frequency and resolution, but individual pins in the group can have a different duty cycle.

- Group 2: Pins A0, A1, A6, and A7.
- Group 1: Pins D4, D5, and D6.
- Group 0: Pin D7 and the RGB LED. This must use the default resolution of 8 bits (0-255) and frequency of 500 Hz.

On the Tracker SoM, pins D0 - D9 can be used for PWM. Note that pins A0 - A7 are the same physical pin as D0 - D7. D8 is shared with TX (Serial1) and D9 is shared with RX (Serial1). When used for PWM, pins are assigned a PWM group. Each group must share the same frequency and resolution, but individual pins in the group can have a different duty cycle.

- Group 3: RGB LED
- Group 2: D8 (TX), D9 (RX)
- Group 1: D4, D5, D6, D7
- Group 1: D0, D1, D2, D3

{{note op="end"}}


{{note op="start" type="gen2"}}
- On the Photon, P1 and Electron, this function works on pins D0, D1, D2, D3, A4, A5, WKP, RX and TX with a caveat: PWM timer peripheral is duplicated on two pins (A5/D2) and (A4/D3) for 7 total independent PWM outputs. For example: PWM may be used on A5 while D2 is used as a GPIO, or D2 as a PWM while A5 is used as an analog input. However A5 and D2 cannot be used as independently controlled PWM outputs at the same time.
- Additionally on the Electron, this function works on pins B0, B1, B2, B3, C4, C5.
- Additionally on the P1, this function works on pins P1S0, P1S1, P1S6 (note: for P1S6, the WiFi Powersave Clock should be disabled for complete control of this pin. {{#if has-backup-ram}}See [System Features](#system-features)).{{/if}}

The PWM frequency must be the same for pins in the same timer group.

- On the Photon, the timer groups are D0/D1, D2/D3/A4/A5, WKP, RX/TX.
- On the P1, the timer groups are D0/D1, D2/D3/A4/A5/P1S0/P1S1, WKP, RX/TX/P1S6.
- On the Electron, the timer groups are D0/D1/C4/C5, D2/D3/A4/A5/B2/B3, WKP, RX/TX, B0/B1.
{{note op="end"}}


{{/if}} {{!-- has-pwm --}}

{{#if has-pwm}}

{{#if has-dac}}
### analogWriteResolution() (PWM and DAC)
{{else}}
### analogWriteResolution() (PWM)
{{/if}}

{{since when="0.6.0"}}

Sets or retrieves the resolution of `analogWrite()` function of a particular pin.

`analogWriteResolution()` takes one or two arguments:

- `pin`: the number of the pin whose resolution you wish to set or retrieve
- `resolution`: (optional) resolution in bits. The value can range from 2 to 31 bits. If the resolution is not supported, it will not be applied. The default is 8.

`analogWriteResolution()` returns currently set resolution.

```cpp
// EXAMPLE USAGE
pinMode(D1, OUTPUT);     // sets the pin as output
analogWriteResolution(D1, 12); // sets analogWrite resolution to 12 bits
analogWrite(D1, 3000, 1000); // 3000/4095 = ~73% duty cycle at 1kHz
```

{{#if has-dac}}
**NOTE:** DAC pins `DAC1` (`A6`) and `DAC2` (`A3`) support only either 8-bit or 12-bit (default) resolutions.
{{/if}}

**NOTE:** The resolution also affects maximum frequency that can be used with `analogWrite()`. The maximum frequency allowed with current resolution can be checked by calling `analogWriteMaxFrequency()`.

### analogWriteMaxFrequency() (PWM)

{{since when="0.6.0"}}

Returns maximum frequency that can be used with `analogWrite()` on this pin.

`analogWriteMaxFrequency()` takes one argument:

- `pin`: the number of the pin

```cpp
// EXAMPLE USAGE
pinMode(D1, OUTPUT);     // sets the pin as output
analogWriteResolution(D1, 12); // sets analogWrite resolution to 12 bits
int maxFreq = analogWriteMaxFrequency(D1);
analogWrite(D1, 3000, maxFreq / 2); // 3000/4095 = ~73% duty cycle
```

{{/if}} {{!-- has-pwm --}}

{{#if has-dac}}
### Analog Output (DAC)

The Photon and Electron support true analog output on pins DAC (`DAC1` or `A6` in code) and A3 (`DAC2` or `A3` in code). Using `analogWrite(pin, value)`
with these pins, the output of the pin is set to an analog voltage from 0V to 3.3V that corresponds to values
from 0-4095.

**NOTE:** This output is buffered inside the STM32 to allow for more output current at the cost of not being able to achieve rail-to-rail performance, i.e., the output will be about 50mV when the DAC is set to 0, and approx 50mV less than the 3V3 voltage when DAC output is set to 4095.

**NOTE:** Device OS version 0.4.6 and 0.4.7 only - not applicable to versions from 0.4.9 onwards: While for PWM pins one single call to `pinMode(pin, OUTPUT);` sets the pin mode for multiple `analogWrite(pin, value);` calls, for DAC pins you need to set `pinMode(DAC, OUTPUT);` each time you want to perform an `analogWrite()`.

```cpp
// SYNTAX
pinMode(DAC1, OUTPUT);
analogWrite(DAC1, 1024);
// sets DAC pin to an output voltage of 1024/4095 * 3.3V = 0.825V.
```
{{/if}} {{!-- has-dac --}}

{{#if has-adc}}

### analogRead() (ADC)

```cpp
// SYNTAX
analogRead(pin);

// EXAMPLE USAGE
int ledPin = D1;                // LED connected to digital pin D1
int analogPin = A0;             // potentiometer connected to analog pin A0
int val = 0;                    // variable to store the read value

void setup()
{
  // Note: analogPin pin does not require pinMode()

  pinMode(ledPin, OUTPUT);      // sets the ledPin as output
}

void loop()
{
  val = analogRead(analogPin);  // read the analogPin
  analogWrite(ledPin, val/16);  // analogRead values go from 0 to 4095, analogWrite values from 0 to 255
  delay(10);
}
```

Reads the value from the specified analog pin. 

`analogRead()` takes one argument `pin`: the number of the analog input pin to read from, such as A0 or A1.

`analogRead()` returns an integer value ranging from 0 to 4095 (12-bit).

---

{{note op="start" type="gen3"}}
The Gen 3 Feather devices (Argon, Boron, Xenon) have 6 channels (A0 to A5) with a 12-bit resolution. This means that it will map input voltages between 0 and 3.3 volts into integer values between 0 and 4095. This yields a resolution between readings of: 3.3 volts / 4096 units or, 0.0008 volts (0.8 mV) per unit.

The sample time to read one analog value is 10 microseconds.

The Boron SoM has 8 channels, A0 to A7.

The Tracker SoM has 8 channels, A0 to A7, however these pins are the same physical pins D0 to D7.

The Tracker One only exposes one analog input, A3, on the external M8 connector. Pin A0 is connected to the NTC thermistor on the carrier board.
{{note op="end"}}


{{note op="start" type="gen2"}}
The device has 8 channels (A0 to A7) with a 12-bit resolution. This means that it will map input voltages between 0 and 3.3 volts into integer values between 0 and 4095. This yields a resolution between readings of: 3.3 volts / 4096 units or, 0.0008 volts (0.8 mV) per unit.

_Before 0.5.3_ **Note**: do *not* set the pinMode() with `analogRead()`. The pinMode() is automatically set to AN_INPUT the first time analogRead() is called for a particular analog pin. If you explicitly set a pin to INPUT or OUTPUT after that first use of analogRead(), it will not attempt to switch it back to AN_INPUT the next time you call analogRead() for the same analog pin. This will create incorrect analog readings.

_Since 0.5.3_ **Note:** you do not need to set the pinMode() with analogRead(). The pinMode() is automatically set to AN_INPUT any time analogRead() is called for a particular analog pin, if that pin is set to a pinMode other than AN_INPUT.  If you explicitly set a pin to INPUT, INPUT_PULLUP, INPUT_PULLDOWN or OUTPUT before using analogRead(), it will switch it back to AN_INPUT before taking the reading.  If you use digitalRead() afterwards, it will automatically switch the pinMode back to whatever you originally explicitly set it to.
{{note op="end"}}


{{#if has-adc-sample-time}}

### setADCSampleTime()

The function `setADCSampleTime(duration)` is used to change the default sample time for `analogRead()`.

 On the Photon, P1, Electron, and E Series this parameter can be one of the following values (ADC clock = 30MHz or 33.3ns per cycle):

 * ADC_SampleTime_3Cycles: Sample time equal to 3 cycles, 100ns
 * ADC_SampleTime_15Cycles: Sample time equal to 15 cycles, 500ns
 * ADC_SampleTime_28Cycles: Sample time equal to 28 cycles, 933ns
 * ADC_SampleTime_56Cycles: Sample time equal to 56 cycles, 1.87us
 * ADC_SampleTime_84Cycles: Sample time equal to 84 cycles, 2.80us
 * ADC_SampleTime_112Cycles: Sample time equal to 112 cycles, 3.73us
 * ADC_SampleTime_144Cycles: Sample time equal to 144 cycles, 4.80us
 * ADC_SampleTime_480Cycles: Sample time equal to 480 cycles, 16.0us (default)

The default is ADC_SampleTime_480Cycles. This means that the ADC is sampled for 16 us which can provide a more accurate reading, at the expense of taking longer than using a shorter ADC sample time. If you are measuring a high frequency signal, such as audio, you will almost certainly want to reduce the ADC sample time.
 
Furthermore, 5 consecutive samples at the sample time are averaged in analogRead(), so the time to convert is closer to 80 us, not 16 us, at 480 cycles.
{{/if}} {{!-- has-adc-sample-time --}}


{{/if}} {{!-- has-adc --}}

## Low Level Input/Output

The Input/Ouput functions include safety checks such as making sure a pin is set to OUTPUT when doing a digitalWrite() or that the pin is not being used for a timer function.  These safety measures represent good coding and system design practice.

There are times when the fastest possible input/output operations are crucial to an applications performance. The SPI, UART (Serial) or I2C hardware are examples of low level performance-oriented devices.  There are, however, times when these devices may not be suitable or available.  For example, One-wire support is done in software, not hardware.

In order to provide the fastest possible bit-oriented I/O, the normal safety checks must be skipped.  As such, please be aware that the programmer is responsible for proper planning and use of the low level I/O functions.

Prior to using the following low-level functions, `pinMode()` must be used to configure the target pin.


### pinSetFast()

Write a `HIGH` value to a digital pin.

```cpp
// SYNTAX
pinSetFast(pin);
```

`pinSetFast()` takes one argument, `pin`: the number of the pin whose value you wish to set `HIGH`.

`pinSetFast()` does not return anything.

```cpp
// EXAMPLE USAGE
int LED = D7;              // LED connected to D7

void setup()
{
  pinMode(LED, OUTPUT);    // sets pin as output
}

void loop()
{
  pinSetFast(LED);		   // set the LED on
  delay(500);
  pinResetFast(LED);	   // set the LED off
  delay(500);
}
```

### pinResetFast()

Write a `LOW` value to a digital pin.

```cpp
// SYNTAX
pinResetFast(pin);
```

`pinResetFast()` takes one argument, `pin`: the number of the pin whose value you wish to set `LOW`.

`pinResetFast()` does not return anything.

```cpp
// EXAMPLE USAGE
int LED = D7;              // LED connected to D7

void setup()
{
  pinMode(LED, OUTPUT);    // sets pin as output
}

void loop()
{
  pinSetFast(LED);		   // set the LED on
  delay(500);
  pinResetFast(LED);	   // set the LED off
  delay(500);
}
```

### digitalWriteFast()

Write a `HIGH` or `LOW` value to a digital pin.  This function will call pinSetFast() or pinResetFast() based on `value` and is useful when `value` is calculated. As such, this imposes a slight time overhead.

```cpp
// SYNTAX
digitalWriteFast(pin, value);
```

`digitalWriteFast()` `pin`: the number of the pin whose value you wish to set and `value`: `HIGH` or `LOW`.

`digitalWriteFast()` does not return anything.

```cpp
// EXAMPLE USAGE
int LED = D7;              // LED connected to D7

void setup()
{
  pinMode(LED, OUTPUT);    // sets pin as output
}

void loop()
{
  digitalWriteFast(LED, HIGH);		   // set the LED on
  delay(500);
  digitalWriteFast(LED, LOW);	      // set the LED off
  delay(500);
}
```

### pinReadFast()

Reads the value from a specified digital `pin`, either `HIGH` or `LOW`.

```cpp
// SYNTAX
pinReadFast(pin);
```

`pinReadFast()` takes one argument, `pin`: the number of the digital pin you want to read.

`pinReadFast()` returns `HIGH` or `LOW`.

```cpp
// EXAMPLE USAGE
int button = D0;                   // button is connected to D0
int LED = D1;                      // LED is connected to D1
int val = 0;                       // variable to store the read value

void setup()
{
  pinMode(LED, OUTPUT);            // sets pin as output
  pinMode(button, INPUT_PULLDOWN); // sets pin as input
}

void loop()
{
  val = pinReadFast(button);       // read the input pin
  digitalWriteFast(LED, val);      // sets the LED to the button's value
}

```

## Advanced I/O

### tone()

Generates a square wave of the specified frequency and duration (and 50% duty cycle) on a timer channel pin which supports PWM. Use of the tone() function will interfere with PWM output on the selected pin. tone() is generally used to make sounds or music on speakers or piezo buzzers.


{{#if has-stm32}}
- On the Photon, P1 and Electron, this function works on pins D0, D1, D2, D3, A4, A5, WKP, RX and TX with a caveat: Tone timer peripheral is duplicated on two pins (A5/D2) and (A4/D3) for 7 total independent Tone outputs. For example: Tone may be used on A5 while D2 is used as a GPIO, or D2 for Tone while A5 is used as an analog input. However A5 and D2 cannot be used as independent Tone outputs at the same time.

- Additionally on the Electron, this function works on pins B0, B1, B2, B3, C4, C5.
- Additionally on the P1, this function works on pins P1S0, P1S1, P1S6 (note: for P1S6, the WiFi Powersave Clock should be disabled for complete control of this pin. {{#if has-backup-ram}}See [System Features](#system-features)).{{/if}}
{{/if}}

{{#if has-nrf52}}
On Gen 3 Feather devices (Argon, Boron, Xenon), pins A0, A1, A2, A3, D2, D3, D4, D5, D6, and D8 can be used for tone(). Pins are assigned a PWM group. Each group must share the same frequency. Thus you can only output 3 different frequencies at the same time.

- Group 3: Pins D2, D3, A4, and A5.

- Group 2: Pins A0, A1, A2, and A3.

- Group 1: Pins D4, D5, D6, and D8.

On the Boron SoM, pins D4, D5, D7, A0, A1, A6, and A7 can be used for PWM. Pins are assigned a PWM group. Pins are assigned a PWM group. Each group must share the same frequency.

- Group 2: Pins A0, A1, A6, and A7.
- Group 1: Pins D4, D5, and D6.

On the Tracker SoM, pins D0 - D9 can be used for PWM. Pins are assigned a PWM group. Pins are assigned a PWM group. Each group must share the same frequency. Pins D8 and D9 can only be used for PWM if not being used for Serial1.

- Group 2: D8 (TX), D9 (RX)
- Group 1: D4, D5, D6, D7
- Group 1: D0, D1, D2, D3

{{/if}}

```cpp
// SYNTAX
tone(pin, frequency, duration)
```

`tone()` takes three arguments, `pin`: the pin on which to generate the tone, `frequency`: the frequency of the tone in hertz and `duration`: the duration of the tone in milliseconds (a zero value = continuous tone).

The frequency range is from 20Hz to 20kHz. Frequencies outside this range will not be played.

`tone()` does not return anything.

{{#if has-stm32}}
**NOTE:** The PWM pins / timer channels are allocated as per the following table. If multiple, simultaneous tone() calls are needed (for example, to generate DTMF tones), use pins allocated to separate timers to avoid stuttering on the output:

Pin  | TMR1 | TMR3 | TMR4 | TMR5
:--- | :--: | :--: | :--: | :--:
D0   |      |      |  x   |  
D1   |      |      |  x   |  
D2   |      |  x   |      |  
D3   |      |  x   |      |  
A4   |      |  x   |      |  
A5   |      |  x   |      |  
WKP  |      |      |      |  x
RX   | x    |      |      |
TX   | x    |      |      |

On the P1:

Pin  | TMR1 | TMR3 | TMR4 | TMR5
:--- | :--: | :--: | :--: | :--:
D0   |      |      |  x   |  
D1   |      |      |  x   |  
D2   |      |  x   |      |  
D3   |      |  x   |      |  
A4   |      |  x   |      |  
A5   |      |  x   |      |  
WKP  |      |      |      |  x
RX   | x    |      |      |
TX   | x    |      |      |
P1S0 |      |  x   |      |
P1S1 |      |  x   |      | 
P1S6 |  x   |      |      |

On the Electron and E Series:

Pin  | TMR1 | TMR3 | TMR4 | TMR5 | TMR8
:--- | :--: | :--: | :--: | :--: | :--:
D0   |      |      |  x   |      |      |
D1   |      |      |  x   |      |      |  
D2   |      |  x   |      |      |      |  
D3   |      |  x   |      |      |      |  
A4   |      |  x   |      |      |      |  
A5   |      |  x   |      |      |      |  
WKP  |      |      |      |      |  x   |
RX   | x    |      |      |      |      |
TX   | x    |      |      |      |      |
B0   |      |      |      |      |  x   |
B1   |      |      |      |      |  x   |
B2   |      |  x   |      |      |      |  
B3   |      |  x   |      |      |      |  
C4   |      |      |  x   |      |      |  
C5   |      |      |  x   |      |      |  
{{/if}}

{{#if has-nrf52}}
**NOTE:** The PWM pins / timer channels are allocated as per the following table. If multiple, simultaneous tone() calls are needed (for example, to generate DTMF tones), different timer numbers must be used to for each frequency:

 On the Argon, Boron, and Xenon:

| Pin  | Timer |
| :--: | :---: |
| A0   | PWM2  |  
| A1   | PWM2  |
| A2   | PWM2  |
| A3   | PWM2  | 
| A4   | PWM3  |
| A5   | PWM3  | 
| D2   | PWM3  | 
| D3   | PWM3  | 
| D4   | PWM1  |
| D5   | PWM1  |
| D6   | PWM1  | 
| D8   | PWM1  |

On the B Series SoM:

| Pin  | Timer |
| :--: | :---: |
| A0   | PWM2  |  
| A1   | PWM2  |
| A6   | PWM2  |
| A7   | PWM2  | 
| D4   | PWM1  |
| D5   | PWM1  |
| D6   | PWM1  | 

On the Tracker SoM:

| Pin  | Timer |
| :--: | :---: |
| D0   | PWM0  |  
| D1   | PWM0  |
| D2   | PWM0  |
| D3   | PWM0  | 
| D4   | PWM1  |
| D5   | PWM1  |
| D6   | PWM1  | 
| D7   | PWM1  | 
| D8 (TX)   | PWM2  | 
| D9 (RX)   | PWM2  | 

{{/if}}


Additional information on which pins can be used for tone() is available on the [pin information page](/reference/hardware/pin-info).


```cpp
#include "application.h"
// The Photon has 9 PWM pins: D0, D1, D2, D3, A4, A5, A7, RX and TX.
//
// EXAMPLE USAGE
// Plays a melody - Connect small speaker to speakerPin
int speakerPin = D0;

// Notes defined in microseconds (Period/2) 
// from note C to B, Octaves 3 through 7
int notes[] = 
{0,
/* C,  C#,   D,  D#,   E,   F,  F#,   G,  G#,   A,  A#,   B */
3817,3597,3401,3205,3030,2857,2703,2551,2404,2273,2146,2024,   // 3 (1-12)
1908,1805,1701,1608,1515,1433,1351,1276,1205,1136,1073,1012,   // 4 (13-24)
 956, 903, 852, 804, 759, 716, 676, 638, 602, 568, 536, 506,   // 5 (25-37)
 478, 451, 426, 402, 379, 358, 338, 319, 301, 284, 268, 253,   // 6 (38-50)
 239, 226, 213, 201, 190, 179, 169, 159, 151, 142, 134, 127 }; // 7 (51-62)

#define NOTE_G3  2551
#define NOTE_G4  1276
#define NOTE_C5  956
#define NOTE_E5  759
#define NOTE_G5  638
#define RELEASE  20
#define BPM      100

// notes in the melody:
int melody[] = {NOTE_E5,NOTE_E5,0,NOTE_E5,0,NOTE_C5,NOTE_E5,0,NOTE_G5,0,0,NOTE_G4};

// note durations: 4 = quarter note, 2 = half note, etc.:
int noteDurations[] = {4,4,4,4,4,4,4,4,4,2,4,4};

void setup() {
  // iterate over the notes of the melody:
  for (int thisNote = 0; thisNote < 12; thisNote++) {

    // to calculate the note duration, take one second
    // divided by the note type.
    // e.g. quarter note = 1000 / 4, eighth note = 1000/8, etc.
    int noteDuration = 60*1000/BPM/noteDurations[thisNote];
    tone(speakerPin, (melody[thisNote]!=0)?(500000/melody[thisNote]):0,noteDuration-RELEASE);

    // blocking delay needed because tone() does not block
    delay(noteDuration);
  }
}
```

### noTone()

Stops the generation of a square wave triggered by tone() on a specified pin. Has no effect if no tone is being generated.

The available pins are the same as for tone().


```cpp
// SYNTAX
noTone(pin)
```

`noTone()` takes one argument, `pin`: the pin on which to stop generating the tone.

`noTone()` does not return anything.

```cpp
//See the tone() example
```

### shiftOut()

Shifts out a byte of data one bit at a time on a specified pin. Starts from either the most (i.e. the leftmost) or least (rightmost) significant bit. Each bit is written in turn to a data pin, after which a clock pin is pulsed (taken high, then low) to indicate that the bit is available.

**NOTE:** if you're interfacing with a device that's clocked by rising edges, you'll need to make sure that the clock pin is low before the call to `shiftOut()`, e.g. with a call to `digitalWrite(clockPin, LOW)`.

This is a software implementation; see also the SPI function, which provides a hardware implementation that is faster but works only on specific pins.


```cpp
// SYNTAX
shiftOut(dataPin, clockPin, bitOrder, value)
```
```cpp
// EXAMPLE USAGE

// Use digital pins D0 for data and D1 for clock
int dataPin = D0;
int clock = D1;

uint8_t data = 50;

setup() {
	// Set data and clock pins as OUTPUT pins before using shiftOut()
	pinMode(dataPin, OUTPUT);
	pinMode(clock, OUTPUT);

	// shift out data using MSB first
	shiftOut(dataPin, clock, MSBFIRST, data);

	// Or do this for LSBFIRST serial
	shiftOut(dataPin, clock, LSBFIRST, data);
}

loop() {
	// nothing to do
}
```

`shiftOut()` takes four arguments, 'dataPin': the pin on which to output each bit, `clockPin`: the pin to toggle once the dataPin has been set to the correct value, `bitOrder`: which order to shift out the bits; either MSBFIRST or LSBFIRST (Most Significant Bit First, or, Least Significant Bit First) and `value`: the data (byte) to shift out.

`shiftOut()` does not return anything.



### shiftIn()

Shifts in a byte of data one bit at a time. Starts from either the most (i.e. the leftmost) or least (rightmost) significant bit. For each bit, the clock pin is pulled high, the next bit is read from the data line, and then the clock pin is taken low.

**NOTE:** if you're interfacing with a device that's clocked by rising edges, you'll need to make sure that the clock pin is low before the call to shiftOut(), e.g. with a call to `digitalWrite(clockPin, LOW)`.

This is a software implementation; see also the SPI function, which provides a hardware implementation that is faster but works only on specific pins.


```cpp
// SYNTAX
shiftIn(dataPin, clockPin, bitOrder)
```
```cpp
// EXAMPLE USAGE

// Use digital pins D0 for data and D1 for clock
int dataPin = D0;
int clock = D1;

uint8_t data;

setup() {
	// Set data as INPUT and clock pin as OUTPUT before using shiftIn()
	pinMode(dataPin, INPUT);
	pinMode(clock, OUTPUT);

	// shift in data using MSB first
	data = shiftIn(dataPin, clock, MSBFIRST);

	// Or do this for LSBFIRST serial
	data = shiftIn(dataPin, clock, LSBFIRST);
}

loop() {
	// nothing to do
}
```

`shiftIn()` takes three arguments, 'dataPin': the pin on which to input each bit, `clockPin`: the pin to toggle to signal a read from dataPin, `bitOrder`: which order to shift in the bits; either MSBFIRST or LSBFIRST (Most Significant Bit First, or, Least Significant Bit First).

`shiftIn()` returns the byte value read.


### pulseIn()


{{since when="0.4.7"}}

Reads a pulse (either HIGH or LOW) on a pin. For example, if value is HIGH, pulseIn() waits for the pin to go HIGH, starts timing, then waits for the pin to go LOW and stops timing. Returns the length of the pulse in microseconds or 0 if no complete pulse was received within the timeout.

The timing of this function is based on an internal hardware counter derived from the system tick clock.  Resolution is 1/120MHz for Photon/P1/Electron). Works on pulses from 10 microseconds to 3 seconds in length. Please note that if the pin is already reading the desired `value` when the function is called, it will wait for the pin to be the opposite state of the desired `value`, and then finally measure the duration of the desired `value`. This routine is blocking and does not use interrupts.  The `pulseIn()` routine will time out and return 0 after 3 seconds.

```cpp
// SYNTAX
pulseIn(pin, value)
```

`pulseIn()` takes two arguments, `pin`: the pin on which you want to read the pulse (this can be any GPIO, e.g. D1, A2, C0, B3, etc..), `value`: type of pulse to read: either HIGH or LOW. `pin` should be set to one of three [pinMode()](#pinmode-)'s prior to using pulseIn(), `INPUT`, `INPUT_PULLUP` or `INPUT_PULLDOWN`.

`pulseIn()` returns the length of the pulse (in microseconds) or 0 if no pulse is completed before the 3 second timeout (unsigned long)

```cpp
// EXAMPLE
SerialLogHandler logHandler;

unsigned long duration;

void setup()
{
    Serial.begin(9600);
    pinMode(D0, INPUT);

    // Pulse generator, connect D1 to D0 with a jumper
    // PWM output is 500Hz at 50% duty cycle
    // 1000us HIGH, 1000us LOW
    pinMode(D1, OUTPUT);
    analogWrite(D1, 128);
}

void loop()
{
    duration = pulseIn(D0, HIGH);
    Log.info("%d us", duration);
    delay(1000);
}

/* OUTPUT
 * 1003 us
 * 1003 us
 * 1003 us
 * 1003 us
 */
```

{{#if has-pmic}}

## Power Manager

The Power Manager API provides a way to set PMIC (Power Management IC) settings such as input volage, input current limit, charge current, and charge termination voltage using a simple API. The Power Manager settings are persistent and saved in configuration flash so you can set them once and they will continue to be used.

To set the Power Manager configuration, create a `SystemPowerConfiguration` object and use the methods below to adjust the settings:

### powerSourceMaxCurrent

Set maximum current the power source can provide. This applies only when powered through VIN. When powering by USB, the maximum current is negotiated with your computer or power adapter automatically.

The default is 900 mA.

### powerSourceMinVoltage

Set minimum voltage required for VIN to be used. This applies only when powered through VIN. The value is in millivolts or 1000ths of a volt, so 3880 is 3.880 volts.

The default is 3880 (3.88 volts).

### batteryChargeCurrent

Sets the battery charge current. The actual charge current is the lesser of powerSourceMaxCurrent and batteryChargeCurrent. The value is milliamps (mA).

The default is 896 mA.

### batteryChargeVoltage

Sets the battery charge termination voltage. The value is in millivolts or 1000ths of a volt, so 3880 is 3.880 volts. When the battery reaches this voltage, charging is stopped.

The default is 4112 (4.112V).

### feature(SystemPowerFeature::PMIC_DETECTION)

For devices with an external PMIC and Fuel Gauge like the B Series SoM, enables detection of the bq24195 PMIC connected by I2C to the primary I2C interface (Wire). Since this requires the use of I2C, you should not use pins D0 and D1 for GPIO when using PMIC_DETECTION.

### feature(SystemPowerFeature::USE_VIN_SETTINGS_WITH_USB_HOST)

Normally, if a USB host is detected, the power limit settings will be determined by DPDM, the negotiation between the USB host and the PMIC to determine, for example, the maximum current available. If this feature is enabled, the VIN settings are used even when a USB host is detected. This is normally done if you are using USB for debugging but still have a power supply connected to VIN.

### feature(SystemPowerFeature::DISABLE)

Disables the system power management features. If you set this mode you must manually set the values in the PMIC directly.

```cpp
// EXAMPLE
SerialLogHandler logHandler;

void setup() {
    // Apply a custom power configuration
    SystemPowerConfiguration conf;
    
    conf.powerSourceMaxCurrent(550) 
        .powerSourceMinVoltage(4300) 
        .batteryChargeCurrent(850) 
        .batteryChargeVoltage(4210);

    int res = System.setPowerConfiguration(conf); 
    Log.info("setPowerConfiguration=%d", res);
    // returns SYSTEM_ERROR_NONE (0) in case of success

    // Settings are persisted, you normally wouldn't do this on every startup.
}

void loop() {
    {
        PMIC power(true);
        Log.info("Current PMIC settings:");
        Log.info("VIN Vmin: %u", power.getInputVoltageLimit());
        Log.info("VIN Imax: %u", power.getInputCurrentLimit());
        Log.info("Ichg: %u", power.getChargeCurrentValue());
        Log.info("Iterm: %u", power.getChargeVoltageValue());

        int powerSource = System.powerSource();
        int batteryState = System.batteryState();
        float batterySoc = System.batteryCharge();
        
        constexpr char const* batteryStates[] = {
            "unknown", "not charging", "charging",
            "charged", "discharging", "fault", "disconnected"
        };
        constexpr char const* powerSources[] = {
            "unknown", "vin", "usb host", "usb adapter",
            "usb otg", "battery"
        };

        Log.info("Power source: %s", powerSources[std::max(0, powerSource)]);
        Log.info("Battery state: %s", batteryStates[std::max(0, batteryState)]);
        Log.info("Battery charge: %f", batterySoc);
    }

    delay(2000);
}

```

---

To reset all settings to the default values:

```cpp
// Reset power manager settings to default values

void setup() {
    // To restore the default configuration
    System.setPowerConfiguration(SystemPowerConfiguration());
}
```

### B Series SoM

By default, on the **B Series SoM**, the Tinker application firmware enables the use of the bq24195 PMIC and MAX17043 fuel gauge. This in turn uses I2C (D0 and D1) and pin A6 (PM_INT). If you are not using the PMIC and fuel gauge and with to use these pins for other purposes, be sure to disable system power configuration. This setting is persistent, so you may want to disable it with your manufacturing firmware only.

```
System.setPowerConfiguration(SystemPowerConfiguration());
```

| B Series SoM | Power Manager Usage  |
|:-----------: | :------|
| D0           | I2C SDA |
| D1           | I2C SCL |
| A6           | PM_INT (power manager interrupt) |


## PMIC (Power Management IC)

You should generally set the PMIC settings such as input volage, input current limit, charge current, and charge termination voltage using the Power Manager API, above. If you directly set the PMIC, the settings will likely be overridden by the system.

To find out the current power source (battery, VIN, USB), see [`System.powerSource()`](#powersource-). To find out if the battery is charging, discharging, disconnected, etc., see [`System.batteryState()`](#batterystate-).

*Note*: This is advanced IO and for experienced users. This
controls the LiPo battery management system and is handled automatically
by the Device OS.

### PMIC() constructor

```
// PROTOTYPE
PMIC(bool _lock=false);
```

You can declare the PMIC object either as a global variable, or a stack-allocated local variable. If you use a stack local, pass `true` as the parameter to the constructor. This will automatically call `lock()` from the constructor and `unlock()` from the destructor.

### begin()
`bool begin();`

### getVersion()
`byte getVersion();`

### getSystemStatus()
`byte getSystemStatus();`

### getFault()
`byte getFault();`


### lock()
`void lock();`

You should always call `lock()` and `unlock()`, use `WITH_LOCK()`, or stack allocate a `PMIC` object nad pass `true` to the constructor.

Since the PMIC can be accessed from both the system and user threads, locking it assures that a PMIC opertation will not be interrupted by another thread.

### unlock()
`void unlock();`

---

### Input source control register

#### readInputSourceRegister()
`byte readInputSourceRegister(void);`

#### enableBuck()
`bool enableBuck(void);`

#### disableBuck()
`bool disableBuck(void);`

#### setInputCurrentLimit()
`bool setInputCurrentLimit(uint16_t current);`

#### getInputCurrentLimit()
`byte getInputCurrentLimit(void);`

#### setInputVoltageLimit()
`bool setInputVoltageLimit(uint16_t voltage);`

#### getInputVoltageLimit()
`byte getInputVoltageLimit(void);`

---

### Power ON Configuration Reg

#### enableCharging()
`bool enableCharging(void);`

#### disableCharging()
`bool disableCharging(void);`

#### enableOTG()
`bool enableOTG(void);`

#### disableOTG()
`bool disableOTG(void);`

#### resetWatchdog()
`bool resetWatchdog(void);`

#### setMinimumSystemVoltage()
`bool setMinimumSystemVoltage(uint16_t voltage);`

#### getMinimumSystemVoltage()
`uint16_t getMinimumSystemVoltage();`

#### readPowerONRegister()
`byte readPowerONRegister(void);`

---

### Charge Current Control Reg

#### setChargeCurrent()
`bool setChargeCurrent(bool bit7, bool bit6, bool bit5, bool bit4, bool bit3, bool bit2);`

The total charge current is the 512mA + the combination of the current that the following bits represent
                     
- bit7 = 2048mA
- bit6 = 1024mA
- bit5 = 512mA
- bit4 = 256mA
- bit3 = 128mA
- bit2 = 64mA

For example, to set a 1408 mA charge current:

```
PMIC pmic;
pmic.setChargeCurrent(0,0,1,1,1,0);
```

- 512mA + (0+0+512mA+256mA+128mA+0) = 1408mA
                    
                    

#### getChargeCurrent()
`byte getChargeCurrent(void);`

Returns the charge current register. This is the direct register value from the BQ24195 PMIC. The bits in this register correspond to the bits you pass into setChargeCurrent.

- bit7 is the MSB, value 0x80
- bit2 is the LSB, value 0x04

---

### PreCharge/Termination Current Control Reg

#### setPreChargeCurrent()
`bool setPreChargeCurrent();`

#### getPreChargeCurrent()
`byte getPreChargeCurrent();`

#### setTermChargeCurrent()
`bool setTermChargeCurrent();`

#### getTermChargeCurrent()
`byte getTermChargeCurrent();`

---

### Charge Voltage Control Reg

#### setChargeVoltage()
`bool setChargeVoltage(uint16_t voltage);`

Voltage can be:

- 4112 (4.112 volts), the default
- 4208 (4.208 volts), only safe at lower temperatures

The default charge voltage is 4112, which corresponds to 4.112 volts. 

You can also set it 4208, which corresponds to 4.208 volts. This higher voltage should not be used if the battery will be charged in temperatures exceeding 45°C. Using a higher charge voltage will allow the battery to reach a higher state-of-charge (SoC) but could damage the battery at high temperatures.


```
void setup() {
    PMIC power;
    power.setChargeVoltage(4208);
}
```

Note: Do not use 4208 with Device OS 0.4.8 or 0.5.0, as a bug will cause an incorrect, even higher, voltage to be used.

#### getChargeVoltageValue()

`uint16_t getChargeVoltageValue();`

Returns the charge voltage constant that could pass into setChargeVoltage, typically 4208 or 4112.

#### getChargeVoltage()

`byte getChargeVoltage();`

Returns the charge voltage register. This is the direct register value from the BQ24195 PMIC.

- 155, 0x9b, 0b10011011, corresponds to 4112
- 179, 0xb3, 0b10110011, corresponds to 4208

---

### Charge Timer Control Reg

#### readChargeTermRegister()
`byte readChargeTermRegister();`

#### disableWatchdog()
`bool disableWatchdog(void);`

#### setWatchdog()
`bool setWatchdog(byte time);`

---

### Thermal Regulation Control Reg

#### setThermalRegulation()
`bool setThermalRegulation();`

#### getThermalRegulation()
`byte getThermalRegulation();`

---

### Misc Operation Control Reg

#### readOpControlRegister()
`byte readOpControlRegister();`

#### enableDPDM()
`bool enableDPDM(void);`

#### disableDPDM()
`bool disableDPDM(void);`

#### enableBATFET()
`bool enableBATFET(void);`

#### disableBATFET()
`bool disableBATFET(void);`

#### safetyTimer()
`bool safetyTimer();`

#### enableChargeFaultINT()
`bool enableChargeFaultINT();`

#### disableChargeFaultINT()
`bool disableChargeFaultINT();`

#### enableBatFaultINT()
`bool enableBatFaultINT();`

#### disableBatFaultINT()
`bool disableBatFaultINT();`

---

### System Status Register

#### getVbusStat()
`byte getVbusStat();`

#### getChargingStat()
`byte getChargingStat();`

#### getDPMStat()
`bool getDPMStat();`

#### isPowerGood()
`bool isPowerGood(void);`

#### isHot()
`bool isHot(void);`

#### getVsysStat()
`bool getVsysStat();`

---

### Fault Register

#### isWatchdogFault()
`bool isWatchdogFault();`

#### getChargeFault()
`byte getChargeFault();`

#### isBatFault()
`bool isBatFault();`

#### getNTCFault()
`byte getNTCFault();`

{{/if}} {{!-- has-pmic --}}

## Serial
(inherits from [`Stream`](#stream-class))

| Interface | Maximum Speed (Gen2) | Maximum Speed (Gen 3) | Maximum Peripheral Devices |
| :--- | :--- | :--- | :--- |
| UART Serial | 230 Kbit/sec | 1 Mbit/sec | 1 (point-to-point) |
| I2C | 400 Kbit/sec | 400 Kbit/sec | Many (limited by addresses) |
| SPI | 60 Mbit/sec | 32 Mbit/sec | Many (limited by CS GPIO pins) |


{{#if electron}}
The Electron has four hardware (USART) serial channels. 
{{/if}}

{{#unless electron}}

{{#if has-serial2}}
This device has two hardware (USART) serial channels. 
{{/if}}

{{#unless has-serial2}}
This device has one hardware (USART) serial channel.
{{/unless}} 

{{/unless}} {{!-- electron --}} 

It also has {{#if has-usb-serial1}}two{{else}}one{{/if}} USB serial channel{{#if has-usb-serial1}}s{{else}}{{/if}}.

`Serial:` This channel communicates through the USB port and when connected to a computer, will show up as a virtual COM port.

```cpp
// EXAMPLE USAGE - NOT RECOMMENDED
void setup()
{
  Serial.begin();
  Serial.println("Hello World!");
}
```

---

```cpp
// EXAMPLE USAGE - PREFERRED
SerialLogHandler logHandler;

void setup()
{
  Log.info("Hello World!");
}
```

Instead of using `Serial` directly, you should use it using the the `SerialLogHandler` if you are writing debugging messages. Using the `Log` method makes it easy to switch between `Serial` and `Serial1` (or both!) as well as providing thread-safety. It also allows log messages to be intercepted by code, and even saved to things like SD cards, with additional libraries. 

You should also avoid mixing the use of `Serial.printlnf` and `Log.info` (and similar calls). Since `Serial.print` is not thread safe, it can interfere with the use of `Log` calls.

{{#if has-usb-serial1}}
`USBSerial1`: _Since 0.6.0_ This channel communicates through the USB port and when connected to a computer, will show up as a second virtual COM port. This channel is disabled by default.
{{/if}}

`Serial1:` This channel is available via the device's TX and RX pins.

{{#if has-nrf52}}
Hardware flow control for Serial1 is optionally available on pins D3(CTS) and D2(RTS) on the Gen 3 devices. 
{{/if}}

{{#if has-i2c-wire3}}

This device can use the TX and RX pins as either `Wire3` or `Serial1`. If you use `Serial1.begin()` the pins will be used for UART serial. If you use `Wire3.begin()`, `RX` will be `SDA` and `TX` will be `SCL`. You cannot use `Wire3` and `Serial1` at the same time. Likewise, you cannot use `Wire` and `Wire3` at the same time, as there is only one I2C peripheral, just different pin mappings.

This is primarily use with the Tracker One as TX/RX are exposed by the external M8 connector. By using `Wire3.begin()` you can repurpose these pins as I2C, allowing external expansion by I2C instead of serial.

{{/if}} {{!-- has-i2c-wire3 --}}


{{#if has-serial2}}

{{#if photon}}
`Serial2:` This channel is optionally available via pins 28/29 (RGB LED Blue/Green). These pins are accessible via the pads on the bottom of the PCB [See PCB Land Pattern](/datasheets/wi-fi/photon-datasheet/#recommended-pcb-land-pattern-photon-without-headers-). The Blue and Green current limiting resistors should be removed.

If the user enables Serial2, they should also consider using RGB.onChange() to move the RGB functionality to an external RGB LED on some PWM pins.
{{/if}}

{{#if electron}}
`Serial2:` This channel is optionally available via the device's RGB Green (TX) and Blue (RX) LED pins. The Blue and Green current limiting resistors should be removed.

If the user enables Serial2, they should also consider using RGB.onChange() to move the RGB functionality to an external RGB LED on some PWM pins.
{{/if}}

{{#if xenon}}
`Serial2:` This channel is optionally available on D4(TX) and D5(RX). Optional hardware flow control is available on D6(CTS) and D8(RTS) on the Xenon. 
{{/if}}

To use Serial2, add `#include "Serial2/Serial2.h"` near the top of your app's main code file.


{{/if}} {{!-- has-serial2 --}}

{{#if has-serial4-5}}
`Serial4:` This channel is optionally available via the Electron's C3(TX) and C2(RX) pins. To use Serial4, add `#include "Serial4/Serial4.h"` near the top of your app's main code file.

`Serial5:` This channel is optionally available via the Electron's C1(TX) and C0(RX) pins. To use Serial5, add `#include "Serial5/Serial5.h"` near the top of your app's main code file.
{{/if}}

To use the Serial1{{#if has-serial2}} or Serial2{{/if}} pins to communicate with your personal computer, you will need an additional USB-to-serial adapter. To use them to communicate with an external TTL serial device, connect the TX pin to your device's RX pin, the RX to your device's TX pin, and ground.

```cpp
// EXAMPLE USAGE
{{#if has-serial2}}
// IMPORTANT: Include the header file for Serial2
#include "Serial2/Serial2.h"
{{/if}}
{{#if has-serial4-5}}
// IMPORTANT: Include the header file for Serial4/5
#include "Serial4/Serial4.h"
#include "Serial5/Serial5.h"
{{/if}}

void setup()
{
  Serial1.begin(9600);
{{#if has-serial2}}
  Serial2.begin(9600);
{{/if}}
{{#if has-serial4-5}}
  Serial4.begin(9600);
  Serial5.begin(9600);
{{/if}}

  Serial1.println("Hello World!");
{{#if has-serial2}}
  Serial2.println("Hello World!");
{{/if}}
{{#if has-serial4-5}}
  Serial4.println("Hello World!");
  Serial5.println("Hello World!");
{{/if}}
}
```

To use the hardware serial pins of (Serial1{{#if has-serial2}}/2{{/if}}{{#if has-serial4-5}}/4/5{{/if}}) to communicate with your personal computer, you will need an additional USB-to-serial adapter. To use them to communicate with an external TTL serial device, connect the TX pin to your device's RX pin, the RX to your device's TX pin, and the ground of your device to your device's ground.

**NOTE:** Please take into account that the voltage levels on these pins operate at 0V to 3.3V and should not be connected directly to a computer's RS232 serial port which operates at +/- 12V and will damage the device.


{{#if has-usb-serial1}}
**NOTE:** On Windows 10, using `USBSerial1` on the Electron and P1 may not be reliable due to limitations of the USB peripheral used for those 2 platforms. Characters may be dropped between the computer and device. `USBSerial1` is reliable for other Particle platforms and other operating systems. `Serial` is reliable for all platforms and operating systems.
{{/if}} {{!-- has-usb-serial1 --}}

#### Connect to Serial with a computer

For **Windows** users, we recommend downloading [PuTTY](http://www.putty.org/). Plug your device into your computer over USB, open a serial port in PuTTY using the standard settings, which should be:

- Baud rate: 9600
- Data Bits: 8
- Parity: none
- Stop Bits: 1

On **macOS (OS X) and Linux** systems, you can access the serial port through the terminal.

For macOS, open the terminal and type:

```screen /dev/tty.u```

and pressing tab to autocomplete.

On Linux, you can accomplish the same thing by using:

```screen /dev/ttyACM```

and pressing tab to autocomplete.

Now you are ready to read data sent by the device over Serial and send data back.


### begin()

_Available on Serial, {{#if has-usb-serial1}}USBSerial1, {{/if}}Serial1{{#if has-serial2}}, Serial2{{/if}}{{#if has-serial4-5}}, Serial4, Serial5{{/if}}._

Enables serial channel with specified configuration.

```cpp
// SYNTAX
Serial.begin();          // via USB port

{{#if has-usb-serial1}}
USBSerial1.begin();      // via USB port
{{/if}}

Serial1.begin(speed);         // via TX/RX pins
Serial1.begin(speed, config); //  "

Serial1.begin(9600, SERIAL_9N1); // via TX/RX pins, 9600 9N1 mode
Serial1.begin(9600, SERIAL_DATA_BITS_8 | SERIAL_STOP_BITS_1_5 | SERIAL_PARITY_EVEN); // via TX/RX pins, 9600 8E1.5

{{#if has-serial2}}
#include "Serial2/Serial2.h"
Serial2.begin(speed);         // RGB-LED green(TX) and blue (RX) pins
Serial2.begin(speed, config); //  "

Serial2.begin(9600);         // via RGB Green (TX) and Blue (RX) LED pins
Serial2.begin(9600, SERIAL_DATA_BITS_8 | SERIAL_STOP_BITS_1_5 | SERIAL_PARITY_EVEN); // via RGB Green (TX) and Blue (RX) LED pins, 9600 8E1.5
{{/if}} {{!-- has-serial2 --}}
{{#if has-serial4-5}}

#include "Serial4/Serial4.h"
Serial4.begin(speed);         // via C3(TX)/C2(RX) pins
Serial4.begin(speed, config); //  "

#include "Serial5/Serial5.h"
Serial5.begin(speed);         // via C1(TX)/C0(RX) pins
Serial5.begin(speed, config); //  "
{{/if}} {{!-- has-serial4-5 --}}
```

Parameters:
- `speed`: parameter that specifies the baud rate *(long)* _(optional for `Serial` {{#if has-usb-serial1}}and `USBSerial1`{{/if}})_ 
- `config`: parameter that specifies the number of data bits used, parity and stop bits *(long)* _(not used with `Serial` {{#if has-usb-serial1}}and `USBSerial1`{{/if}})_

{{#if has-stm32f2}}
Hardware serial port baud rates are: 1200, 2400, 4800, 9600, 19200, 38400, 57600, 115200, and 230400 on the Gen 2 devices.
{{/if}}

{{#if has-nrf52}}
Hardware serial port baud rates are: 1200, 2400, 4800, 9600, 19200, 28800, 38400, 57600, 76800, 115200, 230400, 250000, 460800, 921600 and 1000000 on the Gen 3 devices.
{{/if}}


```cpp
// EXAMPLE USAGE
void setup()
{
  Serial.begin(9600);   // open serial over USB

  // Wait for a USB serial connection for up to 30 seconds
  waitFor(Serial.isConnected, 30000);
  
  Serial1.begin(9600);  // open serial over TX and RX pins

  Serial.println("Hello Computer");
  Serial1.println("Hello Serial 1");
}

void loop() {}
```

{{since when="0.5.0"}} 28800 baudrate set by the Host on `Serial` will put the device in Listening Mode, where a YMODEM download can be started by additionally sending an `f` character. Baudrate 14400 can be used to put the device into DFU Mode.

When using hardware serial channels (Serial1, Serial2{{#if electron}}, Serial4, Serial5{{/if}}), the configuration of the serial channel may also specify the number of data bits, stop bits, parity, flow control and other settings. The default is SERIAL_8N1 (8 data bits, no parity and 1 stop bit) and does not need to be specified to achieve this configuration.  To specify one of the following configurations, add one of these defines as the second parameter in the `begin()` function, e.g. `Serial1.begin(9600, SERIAL_8E1);` for 8 data bits, even parity and 1 stop bit.

Pre-defined Serial configurations available:

{{#if has-stm32f2}}

**NOTE:** SERIAL_7N1 or (SERIAL_DATA_BITS_7 | SERIAL_PARITY_NO | SERIAL_STOP_BITS_1) is NOT supported

- `SERIAL_8N1` - 8 data bits, no parity, 1 stop bit (default)
- `SERIAL_8N2` - 8 data bits, no parity, 2 stop bits
- `SERIAL_8E1` - 8 data bits, even parity, 1 stop bit
- `SERIAL_8E2` - 8 data bits, even parity, 2 stop bits
- `SERIAL_8O1` - 8 data bits, odd parity, 1 stop bit
- `SERIAL_8O2` - 8 data bits, odd parity, 2 stop bits
- `SERIAL_9N1` - 9 data bits, no parity, 1 stop bit
- `SERIAL_9N2` - 9 data bits, no parity, 2 stop bits

{{since when="0.6.0"}}

- `SERIAL_7O1` - 7 data bits, odd parity, 1 stop bit
- `SERIAL_7O2` - 7 data bits, odd parity, 1 stop bit
- `SERIAL_7E1` - 7 data bits, even parity, 1 stop bit
- `SERIAL_7E2` - 7 data bits, even parity, 1 stop bit
{{#if has-linbus}}
- `LIN_MASTER_13B` - 8 data bits, no parity, 1 stop bit, LIN Master mode with 13-bit break generation
- `LIN_SLAVE_10B` - 8 data bits, no parity, 1 stop bit, LIN Slave mode with 10-bit break detection
- `LIN_SLAVE_11B` - 8 data bits, no parity, 1 stop bit, LIN Slave mode with 11-bit break detection
{{/if}}

Alternatively, configuration may be constructed manually by ORing (`|`) the following configuration constants:

Data bits:
- `SERIAL_DATA_BITS_7` - 7 data bits
- `SERIAL_DATA_BITS_8` - 8 data bits
- `SERIAL_DATA_BITS_9` - 9 data bits

Stop bits:
- `SERIAL_STOP_BITS_1` - 1 stop bit
- `SERIAL_STOP_BITS_2` - 2 stop bits
- `SERIAL_STOP_BITS_0_5` - 0.5 stop bits
- `SERIAL_STOP_BITS_1_5` - 1.5 stop bits

Parity:
- `SERIAL_PARITY_NO` - no parity
- `SERIAL_PARITY_EVEN` - even parity
- `SERIAL_PARITY_ODD` - odd parity

{{/if}} {{!-- has-stm32 --}}
 
{{#if has-nrf52}}
- `SERIAL_8N1` - 8 data bits, no parity, 1 stop bit (default)
- `SERIAL_8E1` - 8 data bits, even parity, 1 stop bit

Other options, including odd parity, and 7 and 9 bit modes, are not available on Gen 3 devices (Argon, Boron, B Series SoM, Tracker SoM). 

{{/if}} {{!-- has-nrf52 --}}


{{#if has-stm32f2}} {{!-- photon and electron --}}
Hardware flow control, available only on Serial2 (`CTS` - `A7`, `RTS` - `RGBR` ):
{{/if}}

{{#if has-nrf52}}
On Gen 3 devices (Argon, Boron, Xenon), flow control is available on Serial1 D3(CTS) and D2(RTS). If you are not using flow control (the default), then these pins can be used as regular GPIO.
{{/if}}

{{#if xenon}}
On the Xenon flow control is also available on Serial2 D6(CTS) and D8(RTS). 
{{/if}}


- `SERIAL_FLOW_CONTROL_NONE` - no flow control
- `SERIAL_FLOW_CONTROL_RTS` - RTS flow control
- `SERIAL_FLOW_CONTROL_CTS` - CTS flow control
- `SERIAL_FLOW_CONTROL_RTS_CTS` - RTS/CTS flow control

{{#if has-linbus}}
LIN configuration:
- `LIN_MODE_MASTER` - LIN Master
- `LIN_MODE_SLAVE` - LIN Slave
- `LIN_BREAK_13B` - 13-bit break generation
- `LIN_BREAK_10B` - 10-bit break detection
- `LIN_BREAK_11B` - 11-bit break detection

**NOTE:** LIN break detection may be enabled in both Master and Slave modes.
{{/if}} {{!-- has-linbus --}}

{{#if has-usb-serial1}}
**NOTE** {{since when="0.6.0"}} When `USBSerial1` is enabled by calling `USBSerial1.begin()` in `setup()` or during normal application execution, the device will quickly disconnect from Host and connect back with `USBSerial1` enabled. If such behavior is undesirable, `USBSerial1` may be enabled with `STARTUP()` macro, which will force the device to connect to the Host with both `Serial` and `USBSerial1` by default.

```cpp
// EXAMPLE USAGE
STARTUP(USBSerial1.begin());
void setup()
{
  while(!Serial.isConnected())
    Particle.process();
  Serial.println("Hello Serial!");

  while(!USBSerial1.isConnected())
    Particle.process();
  USBSerial1.println("Hello USBSerial1!");
}
```
{{/if}} {{!-- has-usb-serial1 --}}

### end()

_Available on Serial, {{#if has-usb-serial1}}USBSerial1, {{/if}}Serial1{{#if has-serial2}}, Serial2{{/if}}{{#if has-serial4-5}}, Serial4, Serial5{{/if}}._

Disables serial channel.

When used with hardware serial channels (Serial1, Serial2{{#if electron}}, Serial4, Serial5{{/if}}), disables serial communication, allowing channel's RX and TX pins to be used for general input and output. To re-enable serial communication, call `SerialX.begin()`.


{{since when="0.6.0"}}

When used with USB serial channels (`Serial`{{#if has-usb-serial1}} or `USBSerial1`{{/if}}), `end()` will cause the device to quickly disconnect from Host and connect back without the selected serial channel.

```cpp
// SYNTAX
Serial1.end();
```

### available()

_Available on Serial, {{#if has-usb-serial1}}USBSerial1, {{/if}}Serial1{{#if has-serial2}}, Serial2{{/if}}{{#if has-serial4-5}}, Serial4, Serial5{{/if}}._

Get the number of bytes (characters) available for reading from the serial port. This is data that's already arrived and stored in the serial receive buffer.

The receive buffer size for hardware serial channels (Serial1, Serial2{{#if electron}}, Serial4, Serial5{{/if}}) is {{#if has-stm32}}64{{/if}}{{#if has-nrf52}}128{{/if}} bytes and cannot be changed. 

{{#if has-usb-serial1}}
The receive buffer size for USB serial channels (Serial and USBSerial1) is 256 bytes. Also see [`acquireSerialBuffer`](#acquireserialbuffer-).
{{else}}
The receive buffer size for Serial is 64 bytes. 
{{/if}}

```cpp
// EXAMPLE USAGE
void setup()
{
  Serial.begin(9600);
  Serial1.begin(9600);

}

void loop()
{
  // read from port 0, send to port 1:
  if (Serial.available())
  {
    int inByte = Serial.read();
    Serial1.write(inByte);
  }
  // read from port 1, send to port 0:
  if (Serial1.available())
  {
    int inByte = Serial1.read();
    Serial.write(inByte);
  }
}
```

### availableForWrite()

{{since when="0.4.9"}} Available on Serial1{{#if has-serial2}}, Serial2{{/if}}{{#if has-serial4-5}}, Serial4, Serial5{{/if}}.

{{since when="0.5.0"}} Available on USB Serial (Serial)

{{#if has-usb-serial1}}{{since when="0.6.0"}} Available on `USBSerial1`{{/if}}

Retrieves the number of bytes (characters) that can be written to this serial port without blocking.

If `blockOnOverrun(false)` has been called, the method returns the number of bytes that can be written to the buffer without causing buffer overrun, which would cause old data to be discarded and overwritten.

{{#if has-usb-serial1}}
Also see [`acquireSerialBuffer`](#acquireserialbuffer-).
{{/if}}

{{#if has-usb-serial1}}
### acquireSerialBuffer()

```cpp
// SYNTAX
HAL_USB_USART_Config acquireSerialBuffer()
{
  HAL_USB_USART_Config conf = {0};

  // The usable buffer size will be 128
  static uint8_t serial_rx_buffer[129];
  static uint8_t serial_tx_buffer[129];

  conf.rx_buffer = serial_rx_buffer;
  conf.tx_buffer = serial_tx_buffer;
  conf.rx_buffer_size = 129;
  conf.tx_buffer_size = 129;

  return conf;
}

HAL_USB_USART_Config acquireUSBSerial1Buffer()
{
  HAL_USB_USART_Config conf = {0};

  // The usable buffer size will be 128
  static uint8_t usbserial1_rx_buffer[129];
  static uint8_t usbserial1_tx_buffer[129];

  conf.rx_buffer = usbserial1_rx_buffer;
  conf.tx_buffer = usbserial1_tx_buffer;
  conf.rx_buffer_size = 129;
  conf.tx_buffer_size = 129;

  return conf;
}
```

{{since when="0.6.0"}}

It is possible for the application to allocate its own buffers for `Serial` (USB serial) and `USBSerial1` by implementing `acquireSerialBuffer` and `acquireUSBSerial1Buffer` functions. Minimum receive buffer size is 65 bytes.

This is not available for hardware UART ports like `Serial1`, `Serial2`, etc.. If you are getting hardware serial buffer overruns, the [Serial Buffer Library](https://github.com/rickkas7/SerialBufferRK) may be helpful.

{{/if}} {{!-- has-usb-serial1 --}}

### blockOnOverrun()

{{since when="0.4.9"}} Available on Serial1{{#if has-serial2}}, Serial2{{/if}}{{#if has-serial4-5}}, Serial4, Serial5{{/if}}.

{{since when="0.5.0"}} Available on USB Serial (Serial)

{{#if has-usb-serial1}}{{since when="0.6.0"}} Available on `USBSerial1`{{/if}}

Defines what should happen when calls to `write()/print()/println()/printlnf()` that would overrun the buffer.

- `blockOnOverrun(true)` -  this is the default setting.  When there is no room in the buffer for the data to be written, the program waits/blocks until there is room. This avoids buffer overrun, where data that has not yet been sent over serial is overwritten by new data. Use this option for increased data integrity at the cost of slowing down realtime code execution when lots of serial data is sent at once.

- `blockOnOverrun(false)` - when there is no room in the buffer for data to be written, the data is written anyway, causing the new data to replace the old data. This option is provided when performance is more important than data integrity.

```cpp
// EXAMPLE - fast and furious over Serial1
Serial1.blockOnOverrun(false);
Serial1.begin(115200);
```

### serialEvent()

A family of application-defined functions that are called whenever there is data to be read
from a serial peripheral.

- serialEvent: called when there is data available from `Serial`
{{#if has-usb-serial1}}- usbSerialEvent1: called when there is data available from `USBSerial1`{{/if}}
- serialEvent1: called when there is data available from `Serial1`
{{#if has-serial2}}
- serialEvent2: called when there is data available from `Serial2`
{{/if}} {{!-- has-serial2 --}}
{{#if has-serial4-5}}
- serialEvent4: called when there is data available from `Serial4`
- serialEvent5: called when there is data available from `Serial5`
{{/if}} {{!-- has-serial4-5 --}}

The `serialEvent` functions are called in between calls to the application `loop()`. This means that if `loop()` runs for a long time due to `delay()` calls or other blocking calls the serial buffer might become full between subsequent calls to `serialEvent` and serial characters might be lost. Avoid long `delay()` calls in your application if using `serialEvent`.

Since `serialEvent` functions are an
extension of the application loop, it is ok to call any functions that you would also call from `loop()`. Because of this, there is little advantage to using serial events over just reading serial from loop(). 

```cpp
// EXAMPLE - echo all characters typed over serial

void setup()
{
   Serial.begin(9600);
}

void serialEvent()
{
    char c = Serial.read();
    Serial.print(c);
}

```

### peek()

_Available on Serial, {{#if has-usb-serial1}}USBSerial1, {{/if}}Serial1{{#if has-serial2}}, Serial2{{/if}}{{#if has-serial4-5}}, Serial4, Serial5{{/if}}._

Returns the next byte (character) of incoming serial data without removing it from the internal serial buffer. That is, successive calls to peek() will return the same character, as will the next call to `read()`.

```cpp
// SYNTAX
Serial.peek();
Serial1.peek();
```
`peek()` returns the first byte of incoming serial data available (or `-1` if no data is available) - *int*

### write()

_Available on Serial, Serial1{{#if has-serial2}}, Serial2{{/if}}{{#if has-serial4-5}}, Serial4, Serial5{{/if}}._

Writes binary data to the serial port. This data is sent as a byte or series of bytes; to send the characters representing the digits of a number use the `print()` function instead.

```cpp
// SYNTAX
Serial.write(val);
Serial.write(str);
Serial.write(buf, len);
```

```cpp
// EXAMPLE USAGE

void setup()
{
  Serial.begin(9600);
}

void loop()
{
  Serial.write(45); // send a byte with the value 45

  int bytesSent = Serial.write(“hello”); //send the string “hello” and return the length of the string.
}
```

*Parameters:*

- `val`: a value to send as a single byte
- `str`: a string to send as a series of bytes
- `buf`: an array to send as a series of bytes
- `len`: the length of the buffer

`write()` will return the number of bytes written, though reading that number is optional.


### read()

_Available on Serial, {{#if has-usb-serial1}}USBSerial1, {{/if}}Serial1{{#if has-serial2}}, Serial2{{/if}}{{#if has-serial4-5}}, Serial4, Serial5{{/if}}._

Reads incoming serial data.

```cpp
// SYNTAX
Serial.read();
Serial1.read();
```
`read()` returns the first byte of incoming serial data available (or -1 if no data is available) - `int`

```cpp
// EXAMPLE USAGE
int incomingByte = 0; // for incoming serial data

void setup() {
  Serial.begin(9600); // opens serial port, sets data rate to 9600 bps
}

void loop() {
  // send data only when you receive data:
  if (Serial.available() > 0) {
    // read the incoming byte:
    incomingByte = Serial.read();

    // say what you got:
    Serial.print("I received: ");
    Serial.println(incomingByte, DEC);
  }
}
```
### print()

_Available on Serial, {{#if has-usb-serial1}}USBSerial1, {{/if}}Serial1{{#if has-serial2}}, Serial2{{/if}}{{#if has-serial4-5}}, Serial4, Serial5{{/if}}._

Prints data to the serial port as human-readable ASCII text.
This command can take many forms. Numbers are printed using an ASCII character for each digit. Floats are similarly printed as ASCII digits, defaulting to two decimal places. Bytes are sent as a single character. Characters and strings are sent as is. For example:

- Serial.print(78) gives "78"
- Serial.print(1.23456) gives "1.23"
- Serial.print('N') gives "N"
- Serial.print("Hello world.") gives "Hello world."

An optional second parameter specifies the base (format) to use; permitted values are BIN (binary, or base 2), OCT (octal, or base 8), DEC (decimal, or base 10), HEX (hexadecimal, or base 16). For floating point numbers, this parameter specifies the number of decimal places to use. For example:

- Serial.print(78, BIN) gives "1001110"
- Serial.print(78, OCT) gives "116"
- Serial.print(78, DEC) gives "78"
- Serial.print(78, HEX) gives "4E"
- Serial.println(1.23456, 0) gives "1"
- Serial.println(1.23456, 2) gives "1.23"
- Serial.println(1.23456, 4) gives "1.2346"

### println()

_Available on Serial, {{#if has-usb-serial1}}USBSerial1, {{/if}}Serial1{{#if has-serial2}}, Serial2{{/if}}{{#if has-serial4-5}}, Serial4, Serial5{{/if}}._

Prints data to the serial port as human-readable ASCII text followed by a carriage return character (ASCII 13, or '\r') and a newline character (ASCII 10, or '\n'). This command takes the same forms as `Serial.print()`.

```cpp
// SYNTAX
Serial.println(val);
Serial.println(val, format);
```

*Parameters:*

- `val`: the value to print - any data type
- `format`: specifies the number base (for integral data types) or number of decimal places (for floating point types)

`println()` returns the number of bytes written, though reading that number is optional - `size_t (long)`

```cpp
// EXAMPLE
//reads an analog input on analog in A0, prints the value out.

int analogValue = 0;    // variable to hold the analog value

void setup()
{
  // Make sure your Serial Terminal app is closed before powering your device
  Serial.begin(9600);
  // Wait for a USB serial connection for up to 30 seconds
  waitFor(Serial.isConnected, 30000);
}

void loop() {
  // read the analog input on pin A0:
  analogValue = analogRead(A0);

  // print it out in many formats:
  Serial.println(analogValue);       // print as an ASCII-encoded decimal
  Serial.println(analogValue, DEC);  // print as an ASCII-encoded decimal
  Serial.println(analogValue, HEX);  // print as an ASCII-encoded hexadecimal
  Serial.println(analogValue, OCT);  // print as an ASCII-encoded octal
  Serial.println(analogValue, BIN);  // print as an ASCII-encoded binary

  // delay 10 milliseconds before the next reading:
  delay(10);
}
```

### printf()

{{since when="0.4.6"}}

_Available on Serial, {{#if has-usb-serial1}}USBSerial1, {{/if}}Serial1{{#if has-serial2}}, Serial2{{/if}}{{#if has-serial4-5}}, Serial4, Serial5{{/if}}._

Provides [printf](http://www.cplusplus.com/reference/cstdio/printf/)-style formatting over serial.

`printf` allows strings to be built by combining a number of values with text.

```cpp
Serial.printf("Reading temperature sensor at %s...", Time.timeStr().c_str());
float temp = readTemp();
Serial.printf("the temperature today is %f Kelvin", temp);
Serial.println();
```

Running this code prints:

```
Reading temperature sensor at Thu 01 Oct 2015 12:34...the temperature today is 293.1 Kelvin.
```

The last `printf()` call could be changed to `printlnf()` to avoid a separate call to `println()`.


### printlnf()


{{since when="0.4.6"}}

_Available on Serial, {{#if has-usb-serial1}}USBSerial1, {{/if}}Serial1{{#if has-serial2}}, Serial2{{/if}}{{#if has-serial4-5}}, Serial4, Serial5{{/if}}._

formatted output followed by a newline.
Produces the same output as [printf](#printf-) which is then followed by a newline character,
so to that subsequent output appears on the next line.


### flush()

Waits for the transmission of outgoing serial data to complete.

```cpp
// SYNTAX
Serial.flush();
Serial1.flush();
```

`flush()` neither takes a parameter nor returns anything.


{{#if has-serial-half-duplex}}

### halfduplex()

_Available on Serial1{{#if has-serial2}}, Serial2{{/if}}{{#if has-serial4-5}}, Serial4, Serial5{{/if}}._

Puts Serial1 into half-duplex mode.  In this mode both the transmit and receive
are on the TX pin.  This mode can be used for a single wire bus communications
scheme between microcontrollers.

```cpp
// SYNTAX
Serial1.halfduplex(true);  // Enable half-duplex mode
Serial1.halfduplex(false); // Disable half-duplex mode
```

```cpp
// EXAMPLE
// Initializes Serial1 at 9600 baud and enables half duplex mode

Serial1.begin(9600);
Serial1.halfduplex(true);

```
`halfduplex()` takes one argument: `true` enables half-duplex mode, `false` disables half-duplex mode

`halfduplex()` returns nothing

{{/if}}

### isConnected()

```cpp
// EXAMPLE USAGE
void setup()
{
  Serial.begin();   // open serial over USB
  while(!Serial.isConnected()) // wait for Host to open serial port
    Particle.process();

  Serial.println("Hello there!");
}
```

Another technique is to use `waitFor` which makes it easy to time-limit the waiting period.

```cpp
// EXAMPLE USAGE
void setup()
{
  Serial.begin();   // open serial over USB
  
  // Wait for a USB serial connection for up to 30 seconds
  waitFor(Serial.isConnected, 30000);

  Serial.println("Hello there!");
}
```

_Since 0.5.3 Available on `Serial`._

_Since 0.6.0 Available on `Serial`{{#if has-usb-serial1}} and `USBSerial1`{{/if}}._

Used to check if host has serial port (virtual COM port) open.

Returns:
- `true` when Host has virtual COM port open.

### lock()

The USB and UART serial objects do not have built-in thread-safety. If you want to read or write the object from multiple threads, including from a software timer, you must lock and unlock it to prevent data from multiple thread from being interleaved or corrupted.

A call to lock `lock()` must be balanced with a call to `unlock()` and not be nested. To make sure every lock is released, it's good practice to use `WITH_LOCK` like this:

```cpp
// EXAMPLE USAGE
void loop()
{
  WITH_LOCK(Serial) {
    Serial.println("Hello there!");
  }
}
```

Never use `lock()` or `WITH_LOCK()` within a `SINGLE_THREADED_BLOCK()` as deadlock can occur.

### unlock()

Unlocks the Serial mutex. See `lock()`.

{{#if has-usb-hid}}
Mouse
----

```cpp
// EXAMPLE USAGE
// Use STARTUP() macro to avoid USB disconnect/reconnect (see begin() documentation)
STARTUP(Mouse.begin());

void setup() {
  // Set screen size to 1920x1080 (to scale [0, 32767] absolute Mouse coordinates)
  Mouse.screenSize(1920, 1080);
  // Move mouse to the center of the screen and click left button
  Mouse.moveTo(1920 / 2, 1080 / 2);
  Mouse.click(MOUSE_LEFT);
  // Move mouse from the current position by 100 points (not pixels) left
  Mouse.move(-100, 0);
  // Press right mouse button (and leave it pressed)
  Mouse.press(MOUSE_RIGHT);
  // Scroll wheel in the negative direction
  Mouse.scroll(-127);
  // Release right mouse button
  Mouse.release(MOUSE_RIGHT);
}

void loop() {
}
```

{{since when="0.6.0"}}

This library allows devices to act as a native USB HID Mouse.

In terms of USB HID, the device presents itself as two separate devices: Mouse (supporting relative movement) and Digitizer (supporting absolute movement).

Full capabilities include:
- Relative XY movement [-32767, 32767]
- Absolute XY movement [0, 32767]
- 3-buttons (left, right, middle)
- Wheel [-127, 127]

***NOTE:*** Linux X11 doesn't support HID devices reporting both absolute and relative coordinates. By default only absolute movement is possible by using [`Mouse.moveTo()`](#moveto-). In order for regular relative [`Mouse.move()`](#move-) to work, a call to [`Mouse.enableMoveTo(false)`](#enablemoveto-) is required.

### begin()

```cpp
// SYNTAX
Mouse.begin();
```

Initializes Mouse library and enables USB HID stack.

```cpp
// Example
STARTUP(Mouse.begin());
void setup() {
  // At this point the device is already connected to Host with Mouse enabled
}
```

***NOTE:*** When `Mouse.begin()` is called in `setup()` or during normal application execution, the device will quickly disconnect from Host and connect back with USB HID enabled. If such behavior is undesirable, `Mouse` may be enabled with `STARTUP()` macro, which will force the device to connect to the Host after booting with `Mouse` already enabled.

This function takes no parameters and does not return anything.

### end()

```cpp
// SYNTAX
Mouse.end();
```

Disables USB Mouse functionality.

```cpp
// Example
// Enable both Keyboard and Mouse on startup
STARTUP(Mouse.begin());
STARTUP(Keyboard.begin());

void setup() {
  // A call to Mouse.end() here will not cause the device to disconnect and connect back to the Host
  Mouse.end();
  // Disabling both Keyboard and Mouse at this point will trigger the behavior explained in NOTE.
  Keyboard.end();
}
```

***NOTE:*** Calling `Mouse.end()` will cause the device to quickly disconnect from Host and connect back without USB HID enabled if [`Keyboard`](#keyboard) is disabled as well.

This function takes no parameters and does not return anything.

### move()

```cpp
// SYNTAX
Mouse.move(x, y);
Mouse.move(x, y, wheel);
```

Moves the cursor relative to the current position.

*Parameters:*

- `x`: amount to move along the X axis - `int16_t` [-32767, 32767]
- `y`: amount to move along the Y axis - `int16_t` [-32767, 32767]
- `wheel`: amount to move the scroll wheel - `int8_t` [-127, 127]

`move()` does not return anything.

### moveTo()

```cpp
// SYNTAX
Mouse.moveTo(x, y);
```

Moves the cursor to an absolute position. (0, 0) position is the top left corner of the screen. By default both X and Y axes span from 0 to 32767.

The default range [0, 32767] can be mapped to actual screen resolution by calling [`screenSize()`](#screensize-). After the call to [`screenSize()`](#screensize-), `moveTo()` will accept screen coordinates and automatically map them to the default range.

*Parameters:*

- `x`: X coordinate - `uint16_t` _[0, 32767] (default)_
- `y`: Y coordinate - `uint16_t` _[0, 32767] (default)_

`moveTo()` does not return anything.

### scroll()

```cpp
// SYNTAX
Mouse.scroll(wheel);
```

Scrolls the mouse wheel by the specified amount.

*Parameters:*

- `wheel`: amount to move the scroll wheel - `int8_t` [-127, 127]

`scroll()` does not return anything.

### click()

```cpp
// SYNTAX
Mouse.click();
Mouse.click(button);
```

Momentarily clicks specified mouse button at the current cursor position. A click is a [`press()`](#press-) quickly followed by [`release()`](#release-).

```cpp
// EXAMPLE USAGE
// Click left mouse button
Mouse.click(MOUSE_LEFT);
// Click right mouse button
Mouse.click(MOUSE_RIGHT);
// Click middle mouse button
Mouse.click(MOUSE_MIDDLE);
// Click both left and right mouse buttons at the same time
Mouse.click(MOUSE_LEFT | MOUSE_RIGHT);
```

*Parameters:*

- `button`: which mouse button to click - `uint8_t` - `MOUSE_LEFT` (default), `MOUSE_RIGHT`, `MOUSE_MIDDLE` or any ORed (`|`) combination of buttons for simultaneous clicks

`click()` does not return anything.

### press()

```cpp
// SYNTAX
Mouse.press();
Mouse.press(button);
```

Presses specified mouse button at the current cursor position and holds it pressed. A press can be cancelled by [`release()`](#release-).

```cpp
// EXAMPLE USAGE
// Press left mouse button
Mouse.press(MOUSE_LEFT);
// Press right mouse button
Mouse.press(MOUSE_RIGHT);
// Press middle mouse button
Mouse.press(MOUSE_MIDDLE);
// Press both left and right mouse buttons at the same time
Mouse.press(MOUSE_LEFT | MOUSE_RIGHT);
```

*Parameters:*

- `button`: which mouse button to press - `uint8_t` - `MOUSE_LEFT` (default), `MOUSE_RIGHT`, `MOUSE_MIDDLE` or any ORed (`|`) combination of buttons for simultaneous press

`press()` does not return anything.

### release()

```cpp
// SYNTAX
Mouse.release();
Mouse.release(button);
```

Releases previously pressed mouse button at the current cursor position.

```cpp
// EXAMPLE USAGE
// Release left mouse button
Mouse.release(MOUSE_LEFT);
// Release right mouse button
Mouse.release(MOUSE_RIGHT);
// Release middle mouse button
Mouse.release(MOUSE_MIDDLE);
// Release both left and right mouse buttons at the same time
Mouse.release(MOUSE_LEFT | MOUSE_RIGHT);
```

*Parameters:*

- `button`: which mouse button to release - `uint8_t` - `MOUSE_LEFT` (default), `MOUSE_RIGHT`, `MOUSE_MIDDLE` or any ORed (`|`) combination of buttons to release simultaneously. To release all buttons simultaneously, `MOUSE_ALL` can also be used.

`release()` does not return anything.

### isPressed()

```cpp
// SYNTAX
Mouse.isPressed();
Mouse.isPressed(button);
```

This function checks the current state of mouse buttons and returns if they are currently pressed or not.

```cpp
// EXAMPLE USAGE
bool pressed;
// Check if left mouse button is currently pressed
pressed = Mouse.isPressed(MOUSE_LEFT);
// Check if right mouse button is currently pressed
pressed = Mouse.isPressed(MOUSE_RIGHT);
// Check if middle mouse button is currently pressed
pressed = Mouse.isPressed(MOUSE_MIDDLE);
```

*Parameters:*

- `button`: which mouse button to check - `uint8_t` - `MOUSE_LEFT` (default), `MOUSE_RIGHT`, `MOUSE_MIDDLE`

`isPressed()` returns `true` if provided button is currently pressed.

### screenSize()

```cpp
// SYNTAX
Mouse.screenSize(screenWidth, screenHeight);
Mouse.screenSize(screenWidth, screenHeight,
                 marginLeft, marginRight,
                 marginTop, marginBottom);
Mouse.screenSize(screenWidth, screenHeight,
                 std::array<4, float>);
```

Maps the default absolute movement range [0, 32767] used by [`moveTo()`](#moveto-) to actual screen resolution. After setting the screen size, `moveTo()` will accept screen coordinates and automatically map them to the default range.

```cpp
// EXAMPLE USAGE
// Use STARTUP() macro to avoid USB disconnect/reconnect (see begin() documentation)
STARTUP(Mouse.begin());

void setup() {
  // Set screen size to 1920x1080 (to scale [0, 32767] absolute Mouse coordinates)
  Mouse.screenSize(1920, 1080);
  // Move mouse to the center of the screen
  Mouse.moveTo(1920 / 2, 1080 / 2);
}

void loop() {
}
```

*Parameters:*

- `screenWidth`: screen width in pixels - `uint16_t`
- `screenHeight`: screen height in pixels - `uint16_t`
- `marginLeft`: _(optional)_ left screen margin in percent (e.g. 10.0) - `float`
- `marginRight`: _(optional)_ right screen margin in percent (e.g. 10.0) - `float`
- `marginTop`: _(optional)_ top screen margin in percent (e.g. 10.0) - `float`
- `marginBottom`: _(optional)_ bottom screen margin in percent (e.g. 10.0) - `float`

`screenSize()` does not return anything.

### enableMoveTo()

```cpp
// SYNTAX
Mouse.enableMoveTo(false);
Mouse.enableMoveTo(true);
```

Disables or enables absolute mouse movement (USB HID Digitizer).

```cpp
// EXAMPLE USAGE
// Use STARTUP() macro to avoid USB disconnect/reconnect (see begin() documentation)
STARTUP(Mouse.begin());
// Disable absolute mouse movement
STARTUP(Mouse.enableMoveTo(false));

void setup() {
  // Move cursor by 100 points along X axis and by 100 points Y axis
  Mouse.move(100, 100);
  // Mouse.moveTo() calls do nothing
  Mouse.moveTo(0, 0);
}

void loop() {
}
```

***NOTE:*** Linux X11 doesn't support HID devices reporting both absolute and relative coordinates. By default only absolute movement is possible by using [`Mouse.moveTo()`](#moveto-). In order for regular relative [`Mouse.move()`](#move-) to work, a call to [`Mouse.enableMoveTo(false)`](#enablemoveto-) is required.

***NOTE:*** When `Mouse.enableMoveTo()` is called in `setup()` or during normal application execution, the device will quickly disconnect from Host and connect back with new settings. If such behavior is undesirable, `moveTo()` may be disable or enabled with `STARTUP()` macro, which will force the device to connect to the Host after booting with correct settings already in effect.

*Parameters:*

- `state`: `true` to enable absolute movement functionality, `false` to disable - `bool`

`enableMoveTo()` does not return anything.

Keyboard
----

```cpp
// EXAMPLE USAGE
// Use STARTUP() macro to avoid USB disconnect/reconnect (see begin() documentation)
STARTUP(Keyboard.begin());

void setup() {
  // Type 'SHIFT+h', 'e', 'l', 'l', 'o', 'SPACE', 'w', 'o', 'r', 'l', 'd', 'ENTER'
  Keyboard.println("Hello world!");

  // Type 'SHIFT+t', 'e', 's', 't', 'SPACE', '1', '2', '3', '.', '4', '0', 'ENTER'
  Keyboard.printf("%s %.2f\n", "Test", 123.4f);

  // Quickly press and release Ctrl-Alt-Delete
  Keyboard.click(KEY_DELETE, MOD_LCTRL | MOD_LALT);

  // Press Ctrl, then Alt, then Delete and release them all
  Keyboard.press(KEY_LCTRL);
  Keyboard.press(KEY_LALT);
  Keyboard.press(KEY_DELETE);
  Keyboard.releaseAll();
}

void loop() {
}
```

{{since when="0.6.0"}}

This library allows your device to act as a native USB HID Keyboard.

### begin()

```cpp
// SYNTAX
Keyboard.begin();
```

Initializes Keyboard library and enables USB HID stack.

```cpp
// Example
STARTUP(Keyboard.begin());
void setup() {
  // At this point the device is already connected to Host with Keyboard enabled
}
```

***NOTE:*** When `Keyboard.begin()` is called in `setup()` or during normal application execution, the device will quickly disconnect from Host and connect back with USB HID enabled. If such behavior is undesirable, `Keyboard` may be enabled with `STARTUP()` macro, which will force the device to connect to the Host after booting with `Keyboard` already enabled.

This function takes no parameters and does not return anything.

### end()

```cpp
// SYNTAX
Keyboard.end();
```

Disables USB Keyboard functionality.

```cpp
// Example
// Enable both Keyboard and Mouse on startup
STARTUP(Mouse.begin());
STARTUP(Keyboard.begin());

void setup() {
  // A call to Mouse.end() here will not cause the device to disconnect and connect back to the Host
  Mouse.end();
  // Disabling both Keyboard and Mouse at this point will trigger the behavior explained in NOTE.
  Keyboard.end();
}
```

***NOTE:*** Calling `Keyboard.end()` will cause the device to quickly disconnect from Host and connect back without USB HID enabled if [`Mouse`](#mouse) is disabled as well.

This function takes no parameters and does not return anything.

### write()

```cpp
// SYNTAX
Keyboard.write(character);
```

Momentarily clicks a keyboard key. A click is a [`press()`](#press--1) quickly followed by [`release()`](#release--1). This function works only with ASCII characters. ASCII characters are translated into USB HID keycodes according to the [conversion table](https://github.com/particle-iot/device-os/blob/develop/wiring/src/spark_wiring_usbkeyboard.cpp#L33). For example ASCII character 'a' would be translated into 'a' keycode (leftmost middle row letter key on a QWERTY keyboard), whereas 'A' ASCII character would be sent as 'a' keycode with SHIFT modifier.

```cpp
// EXAMPLE USAGE
STARTUP(Keyboard.begin());

void setup() {
  const char hello[] = "Hello world!\n";
  // This for-loop will type "Hello world!" followed by ENTER
  for (int i = 0; i < strlen(hello); i++) {
    Keyboard.write(hello[i]);
  }
}
```

This function is used by [`print()`](#print--1), [`println()`](#println--1), [`printf()`](#printf--1), [`printlnf()`](#printlnf--1) which provide an easy way to type text.

*Parameters:*

- `ch`: ASCII character - `char`

`write()` does not return anything.

### click()

```cpp
// SYNTAX
Keyboard.click(key);
Keyboard.click(key, modifiers);
```

Momentarily clicks a keyboard key as well as one or more modifier keys (e.g. ALT, CTRL, SHIFT etc.). A click is a [`press()`](#press--1) quickly followed by [`release()`](#release--1). This function works only with USB HID [keycodes (defined in `enum UsbKeyboardScanCode`)](https://github.com/particle-iot/device-os/blob/develop/wiring/inc/spark_wiring_usbkeyboard_scancode.h#L5) and [modifiers (defined in `enum UsbKeyboardModifier`)](https://github.com/particle-iot/device-os/blob/develop/wiring/inc/spark_wiring_usbkeyboard_scancode.h#L405). `Keyboard` implementation supports keycodes ranging from `0x04 (KEY_A / Keyboard a and A)` to `0xDD (KEY_KPHEX / Keypad Hexadecimal)`.

```cpp
// EXAMPLE USAGE
STARTUP(Keyboard.begin());

void setup() {
  // Quickly press and release Ctrl-Alt-Delete
  Keyboard.click(KEY_DELETE, MOD_LCTRL | MOD_LALT);
}
```

*Parameters:*

- `key`: USB HID key code (see [`enum UsbKeyboardScanCode`](https://github.com/particle-iot/device-os/blob/develop/wiring/inc/spark_wiring_usbkeyboard_scancode.h#L5)) - `uint16_t`
- `modifier`: _(optional)_ one or more ORed (`|`) USB HID modifier codes (see [`enum UsbKeyboardModifier`](https://github.com/particle-iot/device-os/blob/develop/wiring/inc/spark_wiring_usbkeyboard_scancode.h#L405) - `uint16_t`

`click()` does not return anything.

### press()

```cpp
// SYNTAX
Keyboard.press(key);
Keyboard.press(key, modifier);
```

Presses specified keyboard key as well as one or more modifier keys and holds them pressed. A press can be cancelled by [`release()`](#release--1) or [`releaseAll()`](#releaseall-).

Up to 8 keys can be pressed simultaneously. Modifier keys (e.g. CTRL, ALT, SHIFT etc) are sent separately and do not add to the currently pressed key count, i.e. it is possible to press and keep pressing 8 regular keyboard keys and all the modifiers (LSHIFT, LALT, LGUI, LCTRL, RSHIFT, RALT, RSHIFT, RCTRL) at the same time.

See [`Keyboard.click()`](#click--1) documentation for information about keycodes and modifier keys.

```cpp
// EXAMPLE USAGE
STARTUP(Keyboard.begin());

void setup() {
  // Press Ctrl, then Alt, then Delete and release them all
  Keyboard.press(KEY_LCTRL);
  Keyboard.press(KEY_LALT);
  Keyboard.press(KEY_DELETE);
  Keyboard.releaseAll();
}
```

*Parameters:*

- `key`: USB HID key code (see [`enum UsbKeyboardScanCode`](https://github.com/particle-iot/device-os/blob/develop/wiring/inc/spark_wiring_usbkeyboard_scancode.h#L5)) - `uint16_t`
- `modifier`: _(optional)_ one or more ORed (`|`) USB HID modifier codes (see [`enum UsbKeyboardModifier`](https://github.com/particle-iot/device-os/blob/develop/wiring/inc/spark_wiring_usbkeyboard_scancode.h#L405) - `uint16_t`

`press()` does not return anything.

### release()

```cpp
// SYNTAX
Keyboard.release(key);
Keyboard.release(key, modifier);
```

Releases previously pressed keyboard key as well as one or more modifier keys.

```cpp
// EXAMPLE USAGE
STARTUP(Keyboard.begin());

void setup() {
  // Press Delete and two modifiers (left ALT and left CTRL) simultaneously
  Keyboard.press(KEY_DELETE, MOD_LCTRL | MOD_LALT);
  // Release Delete and two modifiers (left ALT and left CTRL) simultaneously
  Keyboard.release(KEY_DELETE, MOD_LCTRL | MOD_LALT);
}
```

See [`Keyboard.click()`](#click--1) documentation for information about keycodes and modifier keys.

*Parameters:*

- `key`: USB HID key code (see [`enum UsbKeyboardScanCode`](https://github.com/particle-iot/device-os/blob/develop/wiring/inc/spark_wiring_usbkeyboard_scancode.h#L5)) - `uint16_t`
- `modifier`: _(optional)_ one or more ORed (`|`) USB HID modifier codes (see [`enum UsbKeyboardModifier`](https://github.com/particle-iot/device-os/blob/develop/wiring/inc/spark_wiring_usbkeyboard_scancode.h#L405) - `uint16_t`

`release()` does not return anything.

### releaseAll()

```cpp
// SYNTAX
Keyboard.releaseAll();
```

Releases any previously pressed keyboard keys and modifier keys.

```cpp
// EXAMPLE USAGE
STARTUP(Keyboard.begin());

void setup() {
  // Press Ctrl, then Alt, then Delete and release them all
  Keyboard.press(KEY_LCTRL);
  Keyboard.press(KEY_LALT);
  Keyboard.press(KEY_DELETE);
  Keyboard.releaseAll();
}
```

This function takes no parameters and does not return anything.

### print()

See [`Keyboard.write()`](#write--1) and [`Serial.print()`](#print-) documentation.

### println()

See [`Keyboard.write()`](#write--1) and [`Serial.println()`](#println-) documentation.

### printf()

See [`Keyboard.write()`](#write--1) and [`Serial.printf()`](#printf-) documentation.

### printlnf()

See [`Keyboard.write()`](#write--1) and [`Serial.printlnf()`](#printlnf-) documentation.

{{/if}} {{!-- has-usb-hid --}}

{{#if has-spi}}
SPI
----
This library allows you to communicate with SPI ("Serial Peripheral Interface") devices, with the device as the master device. 

| Interface | Maximum Speed (Gen2) | Maximum Speed (Gen 3) | Maximum Peripheral Devices |
| :--- | :--- | :--- | :--- |
| UART Serial | 230 Kbit/sec | 1 Mbit/sec | 1 (point-to-point) |
| I2C | 400 Kbit/sec | 400 Kbit/sec | Many (limited by addresses) |
| SPI | 60 Mbit/sec | 32 Mbit/sec | Many (limited by CS GPIO pins) |



{{#if has-spi-slave}}
{{#if has-stm32}}_Since 0.5.0_ {{/if}}This device can function as a SPI slave.
{{/if}} {{!-- has-spi-slave --}}

The hardware SPI pin functions, which can
be used via the `SPI` object, are mapped as follows:

{{#if has-stm32}}
* `SS` => `A2` (default)
* `SCK` => `A3`
* `MISO` => `A4`
* `MOSI` => `A5`

{{#if has-multiple-spi}}
There is a second hardware SPI interface available, which can
be used via the `SPI1` object. This second port is mapped as follows:
* `SS` => `D5` (default)
* `SCK` => `D4`
* `MISO` => `D3`
* `MOSI` => `D2`
{{/if}} {{!-- has-multiple-spi --}}

{{#if electron}}
Additionally on the Electron, there is an alternate pin location for the second SPI interface, which can
be used via the `SPI2` object. This alternate location is mapped as follows:
* `SS` => `D5` (default)
* `SCK` => `C3`
* `MISO` => `C2`
* `MOSI` => `C1`
{{/if}} {{!-- electron --}}

{{/if}} {{!-- has-stm32 --}}

{{#if has-nrf52}}
On the Argon, Boron, and Xenon:
* `SS` => `A5 (D14)` (but can use any available GPIO)
* `SCK` => `SCK (D13)`
* `MISO` => `MISO (D11)`
* `MOSI` => `MOSI (D12)`

On the B Series SoM:
* `SS` => `D8` (but can use any available GPIO)
* `SCK` => `SCK (D13)`
* `MISO` => `MISO (D11)`
* `MOSI` => `MOSI (D12)`

On the Tracker SoM:
* `SS` => `A7`/`D7` (but can use any available GPIO)
* `SCK` => `A6`/`D6`
* `MISO` => `A5`/`D5`
* `MOSI` => `A4`/`D4`

{{#if has-multiple-spi}}
There is a second hardware SPI interface available, which can
be used via the `SPI1` object. This second port is mapped as follows:

* `SCK` => `D2`
* `MOSI` => `D3`
* `MISO` => `D4`

Note: On Gen 3 devices, the SPI1 pins different than 2nd-generation (Photon/Electron), so you cannot use SPI1 on a Gen 3 device with the classic adapter.

{{/if}} {{!-- has-multiple-spi --}}

{{/if}} {{!-- has-nrf52 --}}

### begin()

Initializes the SPI bus by setting SCK, MOSI, and a user-specified slave-select pin to outputs, MISO to input. SCK is pulled either high or low depending on the configured SPI data mode (default high for `SPI_MODE3`). Slave-select is pulled high.

**Note:**  The SPI firmware ONLY initializes the user-specified slave-select pin as an `OUTPUT`. The user's code must control the slave-select pin with `digitalWrite()` before and after each SPI transfer for the desired SPI slave device. Calling `SPI.end()` does NOT reset the pin mode of the SPI pins.

```cpp
// SYNTAX
SPI.begin(ss);
{{#if has-multiple-spi}}
SPI1.begin(ss);
{{#if electron}}
SPI2.begin(ss);
{{/if}} {{!-- electron --}}
{{/if}} {{!-- has-multiple-spi --}}

// Example with no SS pin configured:
SPI.begin(PIN_INVALID);
```

Where, the parameter `ss` is the `SPI` device slave-select pin to initialize.  If no pin is specified, the default pin is:
- Argon, Boron, Xenon: `A5 (D14)`
- B Series SoM: `D8`
- Photon, P1, Electron, and E Series: `A2`
{{#if has-multiple-spi}}
For `SPI1`, the default `ss` pin is `D5`.
{{#if electron}}
For `SPI2`, the default `ss` pin is also `D5`.
{{/if}} {{!-- electron --}}

```cpp
// Example using SPI1, with D5 as the SS pin:
SPI1.begin();
// or
SPI1.begin(D5);
```
{{#if electron}}
```cpp
// Example using SPI2, with C0 as the SS pin:
SPI2.begin(C0);
```
{{/if}} {{!-- electron --}}

{{/if}} {{!-- has-multiple-spi --}}

{{#if has-spi-slave}}

### begin(SPI_Mode, uint16_t)

{{since when="0.5.0"}}

Initializes the device SPI peripheral in master or slave mode.

**Note:** MISO, MOSI and SCK idle in high-impedance state when SPI peripheral is configured in slave mode and the device is not selected.

Parameters:

- `mode`: `SPI_MODE_MASTER` or `SPI_MODE_SLAVE`
- `ss_pin`: slave-select pin to initialize. If no pin is specified, the default pin is:
- Argon, Boron, Xenon: `A5 (D14)`
- B Series SoM: `D8`
- Photon, P1, Electron, and E Series: `A2`
{{#if has-multiple-spi}}
For `SPI1`, the default `ss` pin is `D5`.
{{#if electron}}
For `SPI2`, the default `ss` pin is also `D5`.
{{/if}} {{!-- electron --}}
{{/if}} {{!-- has-multiple-spi --}}


```cpp
// Example using SPI in master mode, with the default SS pin:
SPI.begin(SPI_MODE_MASTER);
{{#if has-multiple-spi}}
// Example using SPI1 in slave mode, with D5 as the SS pin
SPI1.begin(SPI_MODE_SLAVE, D5);
{{#if electron}}
// Example using SPI2 in slave mode, with C0 as the SS pin
SPI2.begin(SPI_MODE_SLAVE, C0);
{{/if}} {{!-- electron --}}
{{/if}} {{!-- has-multiple-spi --}}
```

{{#if has-nrf52}}
Gen 3 devices (Argon, Boron, and Xenon), SPI slave can only be used on SPI1. It is not supported on SPI. The maximum speed is 8 MHz on SPI1.
{{/if}} {{!-- has-nrf52 --}}

{{/if}} {{!-- has-spi-slave --}}

### end()

Disables the SPI bus (leaving pin modes unchanged).

```cpp
// SYNTAX
SPI.end();
```

Note that you must use the same `SPI` object as used with `SPI.begin()` so if you used `SPI1.begin()` also use `SPI1.end()`.

### setBitOrder()

Sets the order of the bits shifted out of and into the SPI bus, either LSBFIRST (least-significant bit first) or MSBFIRST (most-significant bit first).

```cpp
// SYNTAX
SPI.setBitOrder(order);
```

Where, the parameter `order` can either be `LSBFIRST` or `MSBFIRST`.

Note that you must use the same `SPI` object as used with `SPI.begin()` so if you used `SPI1.begin()` also use `SPI1.setBitOrder()`.

### setClockSpeed

Sets the SPI clock speed. The value can be specified as a direct value, or as
as a value plus a multiplier.

```cpp
// SYNTAX
SPI.setClockSpeed(value, scale);
SPI.setClockSpeed(frequency);

// EXAMPLE
// Set the clock speed as close to 15MHz (but not over)
SPI.setClockSpeed(15, MHZ);
SPI.setClockSpeed(15000000);
```

The clock speed cannot be set to any arbitrary value, but is set internally by using a
divider (see `SPI.setClockDivider()`) that gives the highest clock speed not greater
than the one specified.

This method can make writing portable code easier, since it specifies the clock speed
absolutely, giving comparable results across devices. In contrast, specifying
the clock speed using dividers is typically not portable since is dependent upon the system clock speed.

Note that you must use the same `SPI` object as used with `SPI.begin()` so if you used `SPI1.begin()` also use `SPI1.setClockSpeed()`.

{{#if has-nrf52}}
Gen 3 devices (Argon, Boron, and Xenon) support SPI speeds up to 32 MHz on SPI and 8 MHz on SPI1.
{{/if}}


### setClockDividerReference

This function aims to ease porting code from other platforms by setting the clock speed that
`SPI.setClockDivider` is relative to.

For example, when porting an Arduino SPI library, each to `SPI.setClockDivider()` would
need to be changed to reflect the system clock speed of the device being used.

This can be avoided by placing a call to `SPI.setClockDividerReference()` before the other SPI calls.

```cpp

// setting divider reference

// place this early in the library code
SPI.setClockDividerReference(SPI_CLK_ARDUINO);

// then all following calls to setClockDivider() will give comparable clock speeds
// to running on the Arduino Uno

// sets the clock to as close to 4MHz without going over.
SPI.setClockDivider(SPI_CLK_DIV4);
```

The default clock divider reference is the system clock.

{{#if has-stm32}}
On the Photon and Electron, the system clock speeds are:
- SPI - 60 MHz
- SPI1 - 30 MHz
{{/if}}
{{#if has-nrf52}}
On Gen 3 devices (Argon, Boron, Xenon), system clock speed is 64 MHz.
{{/if}} {{!-- has-nrf52 --}}

Note that you must use the same `SPI` object as used with `SPI.begin()` so if you used `SPI1.begin()` also use `SPI1.setClockDividerReference()`.


### setClockDivider()

Sets the SPI clock divider relative to the selected clock reference. The available dividers  are 2, 4, 8, 16, 32, 64, 128 or 256. The default setting is SPI_CLOCK_DIV4, which sets the SPI clock to one-quarter the frequency of the system clock.

```cpp
// SYNTAX
SPI.setClockDivider(divider);
```
Where the parameter, `divider` can be:

 - `SPI_CLOCK_DIV2`
 - `SPI_CLOCK_DIV4`
 - `SPI_CLOCK_DIV8`
 - `SPI_CLOCK_DIV16`
 - `SPI_CLOCK_DIV32`
 - `SPI_CLOCK_DIV64`
 - `SPI_CLOCK_DIV128`
 - `SPI_CLOCK_DIV256`

The clock reference varies depending on the device.

{{#if has-stm32}}
On the Photon and Electron, the clock reference is 120 MHz.
{{/if}}
{{#if has-nrf52}}
On Gen 3 devices (Argon, Boron, Xenon), the clock reference is 64 MHz.
{{/if}} {{!-- has-nrf52 --}}

Note that you must use the same `SPI` object as used with `SPI.begin()` so if you used `SPI1.begin()` also use `SPI1.setClockDivider()`.



### setDataMode()

Sets the SPI data mode: that is, clock polarity and phase. See the [Wikipedia article on SPI](http://en.wikipedia.org/wiki/Serial_Peripheral_Interface_Bus) for details.

```cpp
// SYNTAX
SPI.setDataMode(mode);
```
Where the parameter, `mode` can be:

 - `SPI_MODE0`
 - `SPI_MODE1`
 - `SPI_MODE2`
 - `SPI_MODE3`

### transfer()

Transfers one byte over the SPI bus, both sending and receiving.

```cpp
// SYNTAX
SPI.transfer(val);
{{#if has-multiple-spi}}
SPI1.transfer(val);
{{#if electron}}
SPI2.transfer(val);
{{/if}}
{{/if}}
```
Where the parameter `val`, can is the byte to send out over the SPI bus.

Note that you must use the same `SPI` object as used with `SPI.begin()` so if you used `SPI1.begin()` also use `SPI1.setDataMode()`.

{{#if has-threading}}
`transfer()` acquires the SPI peripheral lock before sending a byte, blocking other threads from using the selected SPI peripheral during the transmission. If you call `transfer` in a loop, call [`beginTransaction()`](#begintransaction-) function before the loop and [`endTransaction()`](#endtransaction-) after the loop, to avoid the overhead of acquiring and releasing the lock over and over.

{{/if}} {{!-- has-threading --}}

### transfer(void\*, void\*, size_t, std::function)

For transferring a large number of bytes, this form of transfer() uses DMA to speed up SPI data transfer and at the same time allows you to run code in parallel to the data transmission. The function initializes, configures and enables the DMA peripheral’s channel and stream for the selected SPI peripheral for both outgoing and incoming data and initiates the data transfer. If a user callback function is passed then it will be called after completion of the DMA transfer. This results in asynchronous filling of RX buffer after which the DMA transfer is disabled till the transfer function is called again. If NULL is passed as a callback then the result is synchronous i.e. the function will only return once the DMA transfer is complete.

**Note**: The SPI protocol is based on a one byte OUT / one byte IN interface. For every byte expected to be received, one (dummy, typically 0x00 or 0xFF) byte must be sent.

```cpp
// SYNTAX
SPI.transfer(tx_buffer, rx_buffer, length, myFunction);
```

Parameters:

- `tx_buffer`: array of Tx bytes that is filled by the user before starting the SPI transfer. If `NULL`, default dummy 0xFF bytes will be clocked out.
- `rx_buffer`: array of Rx bytes that will be filled by the slave during the SPI transfer. If `NULL`, the received data will be discarded.
- `length`: number of data bytes that are to be transferred
- `myFunction`: user specified function callback to be called after completion of the SPI DMA transfer. It takes no argument and returns nothing, e.g.: `void myHandler()`

NOTE: `tx_buffer` and `rx_buffer` sizes MUST be identical (of size `length`)

_Since 0.5.0_ When SPI peripheral is configured in slave mode, the transfer will be canceled when the master deselects this slave device. The user application can check the actual number of bytes received/transmitted by calling `available()`.

Note that you must use the same `SPI` object as used with `SPI.begin()` so if you used `SPI1.begin()` also use `SPI1.transfer()`.

### transferCancel()

{{since when="0.5.0"}}

Aborts the configured DMA transfer and disables the DMA peripheral’s channel and stream for the selected SPI peripheral for both outgoing and incoming data.

**Note**: The user specified SPI DMA transfer completion function will still be called to indicate the end of DMA transfer. The user application can check the actual number of bytes received/transmitted by calling `available()`.

### onSelect()

{{since when="0.5.0"}}

Registers a function to be called when the SPI master selects or deselects this slave device by pulling configured slave-select pin low (selected) or high (deselected).

{{#if has-nrf52}}
On Gen 3 devices (Argon, Boron, and Xenon), SPI slave can only be used on SPI1.
{{/if}} {{!-- has-nrf52 --}}

```cpp
// SYNTAX
SPI.onSelect(myFunction);

void myFunction(uint8_t state) {
  // called when selected or deselected
}
```

Parameters: `handler`: the function to be called when the slave is selected or deselected; this should take a single uint8_t parameter (the current state: `1` - selected, `0` - deselected) and return nothing, e.g.: `void myHandler(uint8_t state)`

{{#if has-stm32}}
```cpp
// SPI slave example
static uint8_t rx_buffer[64];
static uint8_t tx_buffer[64];
static uint32_t select_state = 0x00;
static uint32_t transfer_state = 0x00;

SerialLogHandler logHandler(LOG_LEVEL_TRACE);

void onTransferFinished() {
    transfer_state = 1;
}

void onSelect(uint8_t state) {
    if (state)
        select_state = state;
}

/* executes once at startup */
void setup() {
    Serial.begin(9600);
    for (int i = 0; i < sizeof(tx_buffer); i++)
      tx_buffer[i] = (uint8_t)i;
    SPI.onSelect(onSelect);
    SPI.begin(SPI_MODE_SLAVE, A2);
}

/* executes continuously after setup() runs */
void loop() {
    while (1) {
        while(select_state == 0);
        select_state = 0;

        transfer_state = 0;
        SPI.transfer(tx_buffer, rx_buffer, sizeof(rx_buffer), onTransferFinished);
        while(transfer_state == 0);
        if (SPI.available() > 0) {
            Log.dump(LOG_LEVEL_TRACE, rx_buffer, SPI.available());
            Log.info("Received %d bytes", SPI.available());
        }
    }
}
```
{{/if}} {{!-- has-stm32 --}}

{{#if has-nrf52}}
```cpp
// SPI slave example
static uint8_t rx_buffer[64];
static uint8_t tx_buffer[64];
static uint32_t select_state = 0x00;
static uint32_t transfer_state = 0x00;

SerialLogHandler logHandler(LOG_LEVEL_TRACE);

void onTransferFinished() {
    transfer_state = 1;
}

void onSelect(uint8_t state) {
    if (state)
        select_state = state;
}

/* executes once at startup */
void setup() {
    for (int i = 0; i < sizeof(tx_buffer); i++)
      tx_buffer[i] = (uint8_t)i;
    SPI1.onSelect(onSelect);
    SPI1.begin(SPI_MODE_SLAVE, A5);
}

/* executes continuously after setup() runs */
void loop() {
    while (1) {
        while(select_state == 0);
        select_state = 0;

        transfer_state = 0;
        SPI1.transfer(tx_buffer, rx_buffer, sizeof(rx_buffer), onTransferFinished);
        while(transfer_state == 0);
        if (SPI1.available() > 0) {
            Log.dump(LOG_LEVEL_TRACE, rx_buffer, SPI1.available());
            Log.info("Received %d bytes", SPI1.available());
        }
    }
}
```
{{/if}} {{!-- has-nrf52 --}}

Note that you must use the same `SPI` object as used with `SPI.begin()` so if you used `SPI1.begin()` also use `SPI1.onSelect()`.

### available()

{{since when="0.5.0"}}

Returns the number of bytes available for reading in the `rx_buffer` supplied in `transfer()`. In general, it returns the actual number of bytes received/transmitted during the ongoing or finished DMA transfer.

```cpp
// SYNTAX
SPI.available();
```

Returns the number of bytes available.


{{#if has-spi-settings}}
### SPISettings

{{since when="0.6.2"}}

The `SPISettings` object specifies the SPI peripheral settings. This object can be used with [`beginTransaction()`](#begintransaction-) function and can replace separate calls to [`setClockSpeed()`](#setclockspeed), [`setBitOrder()`](#setbitorder-) and [`setDataMode()`](#setdatamode-).

| | SPISettings | __SPISettings |
| :--- | :--- | :--- |
| Available in Device OS | 0.6.1 | 0.6.2 | 
| Requires `#include "Arduino.h` | 0.6.2 - 1.5.2 | No |
| Available in 2.0.0 and later | &check; | &check; |

You should use `SPISettings()` with 2.0.0 and later, with or without `#include "Arduino.h`. 

`__SPISettings()` can be used in 0.6.2 and later for backward compatibility with those versions of Device OS, but is unnecessary for 2.0.0 and later.

```cpp
// SYNTAX
SPI.beginTransaction(SPISettings(4*MHZ, MSBFIRST, SPI_MODE0));
// Pre-declared SPISettings object
SPISettings settings(4*MHZ, MSBFIRST, SPI_MODE0);
SPI.beginTransaction(settings);
```

Parameters:
- `clockSpeed`: maximum SPI clock speed (see [`setClockSpeed()`](#setclockspeed))
- `bitOrder`: bit order of the bits shifted out of and into the SPI bus, either `LSBFIRST` (least significant bit first) or `MSBFIRST` (most-significant bit first)
- `dataMode`: `SPI_MODE0`, `SPI_MODE1`, `SPI_MODE2` or `SPI_MODE3` (see [`setDataMode()`](#setdatamode-))

### beginTransaction()

{{since when="0.6.1"}}

Reconfigures the SPI peripheral with the supplied settings (see [`SPISettings`](#spisettings) documentation).

{{#if has-threading}}
In addition to reconfiguring the SPI peripheral, `beginTransaction()` also acquires the SPI peripheral lock, blocking other threads from using the selected SPI peripheral until [`endTransaction()`](#endtransaction-) is called. See [Synchronizing Access to Shared System Resources](#synchronizing-access-to-shared-system-resources) section for additional information on shared resource locks.

It is required that you use `beginTransaction()` and `endTransaction()` if:

- You have more than one SPI device and they have different settings (speed, bit order, or mode)
- You have more than one thread or use SPI from a Software Timer
- You want to be compatible with the Ethernet FeatherWing or support Ethernet on your B Series SoM base board

You must not use `beginTransaction()` within a `SINGLE_THREADED_BLOCK` as deadlock can occur.
{{/if}} {{!-- has-threading --}}

```cpp
// SYNTAX
SPI.beginTransaction(SPISettings(4*MHZ, MSBFIRST, SPI_MODE0));
// Pre-declared SPISettings object
SPI.beginTransaction(settings);
```

Parameters:
- `settings`: [`SPISettings`](#spisettings) object with chosen settings

Returns: Negative integer in case of an error.

You should set your SPI CS/SS pin between the calls to `beginTransaction()` and `endTransaction()`. You typically use `pinResetFast()` right after `beginTransaction()` and `pinSetFast()` right before `endTransaction()`.

Note that you must use the same `SPI` object as used with `SPI.begin()` so if you used `SPI1.begin()` also use `SPI1.beginTransaction()`.

### endTransaction()

{{since when="0.6.1"}}

Releases the SPI peripheral.


{{#if has-threading}}
This function releases the SPI peripheral lock, allowing other threads to use it. See [Synchronizing Access to Shared System Resources](#synchronizing-access-to-shared-system-resources) section for additional information on shared resource locks.

{{/if}} {{!-- has-threading --}}

```cpp
// SYNTAX
SPI.endTransaction();
```

Returns: Negative integer in case of an error.

Note that you must use the same `SPI` object as used with `SPI.begin()` so if you used `SPI1.begin()` also use `SPI1.endTransaction()`.

{{/if}} {{!-- has-spi-settings --}}

{{/if}} {{!-- has-spi --}}

{{#if has-i2c}}

Wire (I2C)
---
(inherits from [`Stream`](#stream-class))

This library allows you to communicate with I2C / TWI (Two Wire Interface) devices. For an in-depth tutorial on I2C, see [learn more about I2C](/tutorials/learn-more/about-i2c/).

| Interface | Maximum Speed (Gen2) | Maximum Speed (Gen 3) | Maximum Peripheral Devices |
| :--- | :--- | :--- | :--- |
| UART Serial | 230 Kbit/sec | 1 Mbit/sec | 1 (point-to-point) |
| I2C | 400 Kbit/sec | 400 Kbit/sec | Many (limited by addresses) |
| SPI | 60 Mbit/sec | 32 Mbit/sec | Many (limited by CS GPIO pins) |

### Pull-up resistors (I2C)

The I2C bus must have pull-up resistors, one on the SDA line and one on the SCL line. They're typically 4.7K or 10K ohm, but should be in the range of 2K to 10K.

Many of the breakout boards you can buy at Adafruit or SparkFun already have the pull-up resistors on them, typically 10K but sometimes 4.7K. If you buy a bare chip that's a sensor, it typically won't have a built-in pull-up resistors so you'll need to add the external resistors.

On the Photon and Electron, a 40K weak pull-up is added on SDA/SCL (D0/D1) when in I2C mode, but this is not sufficient for most purposes and you should add external pull-up resistors.

On the P1, there are 2.1K hardware pull-up resistors inside the P1 module. You should not add external pull-ups on the P1.

On Gen 3 devices (Argon, Boron, B Series SoM, Tracker SoM), a 13K pull-up is added on I2C interfaces. This will sometimes work, but is still too large of a pull-up to be reliable so you should add external pull-ups as well.

### Pins (I2C)

{{#if has-embedded}}

{{#if has-stm32}}
On the Photon/Electron, D0 is the Serial Data Line (SDA) and D1 is the Serial Clock (SCL). {{#if electron}}Additionally on the Electron, there is an alternate pin location for the I2C interface: C4 is the Serial Data Line (SDA) and C5 is the Serial Clock (SCL).{{/if}} Both SCL and SDA pins are open-drain outputs that only pull LOW and typically operate with 3.3V logic, but are tolerant to 5V. Connect a pull-up resistor(1.5k to 10k) on the SDA line to 3V3. Connect a pull-up resistor(1.5k to 10k) on the SCL line to 3V3.  If you are using a breakout board with an I2C peripheral, check to see if it already incorporates pull-up resistors.
{{/if}} {{!-- has-stm32 --}}

{{#if has-nrf52}}
On the Argon/Boron/Xenon, D0 is the Serial Data Line (SDA) and D1 is the Serial Clock (SCL). Additionally, there is a second optional I2C interface on D2 and D3 on the Argon and Xenon only.

Both SCL and SDA pins are open-drain outputs that only pull LOW and typically operate with 3.3V logic. Connect a pull-up resistor(1.5k to 10k) on the SDA line to 3V3. Connect a pull-up resistor(1.5k to 10k) on the SCL line to 3V3.  If you are using a breakout board with an I2C peripheral, check to see if it already incorporates pull-up resistors.

Note that unlike Gen 2 devices (Photon/P1/Electron), Gen 3 devices are not 5V tolerant.
{{/if}} {{!-- has-nrf52 --}}


These pins are used via the `Wire` object.

* `SCL` => `D1`
* `SDA` => `D0`

{{#if has-i2c-wire1}}

{{#if electron}}
Additionally on the Electron, there is an alternate pin location for the I2C interface, which can
be used via the `Wire1` object. This alternate location is mapped as follows:
* `SCL` => `C5`
* `SDA` => `C4`
Note that you cannot use both Wire and Wire1. These are merely alternative pin locations for a 
single hardware I2C port.
{{/if}} {{!-- electron --}}
{{#if has-nrf52}}
Additionally, on the Argon and Xenon, there a second I2C port that can be used with the `Wire1` object:
* `SCL` => `D3`
* `SDA` => `D2` 
{{/if}} {{!-- has-nrf52 --}}

**Note**: Because there are multiple I2C locations available, be sure to use the same `Wire` or `Wire1` object with all associated functions. 
For example, do not use `Wire.begin()` with `Wire1.write()`.

{{/if}} {{!-- has-i2c-wire1 --}}


{{#if has-i2c-wire3}}

This device allows an alternate mapping of the `Wire` (I2C interface) from D0/D1 to RX/TX. The `Wire3` interface allows you to use RX as SDA and TX as SCL. You cannot use `Wire3` and `Serial1` at the same time. Likewise, you cannot use `Wire` and `Wire3` at the same time, as there is only one I2C peripheral, just different pin mappings.

This is primarily use with the Tracker One as TX/RX are exposed by the external M8 connector. By using `Wire3.begin()` you can repurpose these pins as I2C, allowing external expansion by I2C instead of serial.

{{/if}} {{!-- has-i2c-wire3 --}}


{{/if}} {{!-- has-embedded --}}


{{#if has-embedded}}

### setSpeed()

Sets the I2C clock speed. This is an optional call (not from the original Arduino specs.) and must be called once before calling begin().  The default I2C clock speed is 100KHz and the maximum clock speed is 400KHz.

```cpp
// SYNTAX
Wire.setSpeed(clockSpeed);
Wire.begin();
```

Parameters:

- `clockSpeed`: CLOCK_SPEED_100KHZ, CLOCK_SPEED_400KHZ or a user specified speed in hertz (e.g. `Wire.setSpeed(20000)` for 20kHz)

### stretchClock()

Enables or Disables I2C clock stretching. This is an optional call (not from the original Arduino specs.) and must be called once before calling begin(). I2C clock stretching is only used with I2C Slave mode. The default I2C clock stretching mode is enabled.

```cpp
// SYNTAX
Wire.stretchClock(stretch);
Wire.begin(4); // I2C Slave mode, address #4
```

Parameters:

- `stretch`: boolean. `true` will enable clock stretching (default). `false` will disable clock stretching.

{{/if}} {{!-- has-embedded --}}

### begin()

Initiate the Wire library and join the I2C bus as a master{{#if has-i2c-slave}} or slave{{/if}}. This should normally be called only once.

```cpp
// SYNTAX
Wire.begin();
{{#if has-i2c-slave}}
Wire.begin(address);
{{/if}} {{!-- has-i2c-slave --}}
```

{{#if has-i2c-slave}}
Parameters: `address`: the 7-bit slave address (optional); if not specified, join the bus as an I2C master.  If address is specified, join the bus as an I2C slave.
{{/if}} {{!-- has-i2c-slave --}}


### end()

{{since when="0.4.6"}}

Releases the I2C bus so that the pins used by the I2C bus are available for general purpose I/O.

### isEnabled()

Used to check if the Wire library is enabled already.  Useful if using multiple slave devices on the same I2C bus.  Check if enabled before calling Wire.begin() again.

```cpp
// SYNTAX
Wire.isEnabled();
```

Returns: boolean `true` if I2C enabled, `false` if I2C disabled.

```cpp
// EXAMPLE USAGE

// Initialize the I2C bus if not already enabled
if (!Wire.isEnabled()) {
    Wire.begin();
}
```

### requestFrom()

Used by the master to request bytes from a slave device. The bytes may then be retrieved with the `available()` and `read()` functions.

```cpp
// SYNTAX
Wire.requestFrom(address, quantity);
Wire.requestFrom(address, quantity, stop);
```

Parameters:

- `address`: the 7-bit address of the device to request bytes from
- `quantity`: the number of bytes to request (maximum 32 unless acquireWireBuffer() is used, see below)
- `stop`: boolean. `true` will send a stop message after the request, releasing the bus. `false` will continually send a restart after the request, keeping the connection active. The bus will not be released, which prevents another master device from transmitting between messages. This allows one master device to send multiple transmissions while in control.  If no argument is specified, the default value is `true`.

Returns: `byte` : the number of bytes returned from the slave device.  If a timeout occurs, will return `0`.

{{since when="1.5.0"}}

Instead of passing address, quantity, and/or stop, a `WireTransmission` object can be passed to `Wire.requestFrom()` allowing the address and optional parameters such as a timeout to be set. `I2C_ADDRESS` is a constant specifying the Wire address (0-0x7e) for your specific I2C device. 

```cpp
// EXAMPLE
Wire.requestFrom(WireTransmission(I2C_ADDRESS).quantity(requestedLength).timeout(100ms));

// EXAMPLE
Wire.requestFrom(WireTransmission(I2C_ADDRESS).quantity(requestedLength).stop(false));

// EXAMPLE
Wire.requestFrom(WireTransmission(I2C_ADDRESS).quantity(requestedLength).timeout(100ms).stop(false));

```


{{#if has-embedded}}

### reset()

{{since when="0.4.6"}}

Attempts to reset the I2C bus. This should be called only if the I2C bus has
has hung. In 0.4.6 additional rework was done for the I2C bus on the Photon and Electron, so
we hope this function isn't required, and it's provided for completeness.

{{/if}} {{!-- has-embedded --}}

### beginTransmission()

Begin a transmission to the I2C slave device with the given address. Subsequently, queue bytes for transmission with the `write()` function and transmit them by calling `endTransmission()`.

```cpp
// SYNTAX
Wire.beginTransmission(address);
```

Parameters: `address`: the 7-bit address of the device to transmit to.

{{since when="1.5.0"}}

Instead of passing only an address, a `WireTransmission` object can be passed to `Wire.beginTransmission()` allowing the address and optional parameters such as a timeout to be set. `I2C_ADDRESS` is a constant specifying the Wire address (0-0x7e) for your specific I2C device. 

```cpp
// EXAMPLE
Wire.beginTransmission(WireTransmission(I2C_ADDRESS));

// EXAMPLE WITH TIMEOUT
Wire.beginTransmission(WireTransmission(I2C_ADDRESS).timeout(100ms));
```

### endTransmission()

Ends a transmission to a slave device that was begun by `beginTransmission()` and transmits the bytes that were queued by `write()`.


```cpp
// SYNTAX
Wire.endTransmission();
Wire.endTransmission(stop);
```

Parameters: `stop` : boolean.
`true` will send a stop message after the last byte, releasing the bus after transmission. `false` will send a restart, keeping the connection active. The bus will not be released, which prevents another master device from transmitting between messages. This allows one master device to send multiple transmissions while in control.  If no argument is specified, the default value is `true`.

Returns: `byte`, which indicates the status of the transmission:

- 0: success
- 1: busy timeout upon entering endTransmission()
- 2: START bit generation timeout
- 3: end of address transmission timeout
- 4: data byte transfer timeout
- 5: data byte transfer succeeded, busy timeout immediately after

### write()

Queues bytes for transmission from a master to slave device (in-between calls to `beginTransmission()` and `endTransmission()`){{#if has-i2c-slave}}, or writes data from a slave device in response to a request from a master{{/if}}. Buffer size is truncated to 32 bytes; writing bytes beyond 32 before calling endTransmission() will be ignored.

```cpp
// SYNTAX
Wire.write(value);
Wire.write(string);
Wire.write(data, length);
```
Parameters:

- `value`: a value to send as a single byte
- `string`: a string to send as a series of bytes
- `data`: an array of data to send as bytes
- `length`: the number of bytes to transmit (Max. 32)

Returns: `byte`

`write()` will return the number of bytes written, though reading that number is optional.

```cpp
// EXAMPLE USAGE

// Master Writer running on Device No.1 (Use with corresponding Slave Reader running on Device No.2)

void setup() {
  Wire.begin();              // join i2c bus as master
}

byte x = 0;

void loop() {
  Wire.beginTransmission(4); // transmit to slave device #4
  Wire.write("x is ");       // sends five bytes
  Wire.write(x);             // sends one byte
  Wire.endTransmission();    // stop transmitting

  x++;
  delay(500);
}
```

### available()

Returns the number of bytes available for retrieval with `read()`. This should be called on a master device after a call to `requestFrom()`{{#if has-i2c-slave}} or on a slave inside the `onReceive()` handler{{/if}}.

```cpp
Wire.available();
```

Returns: The number of bytes available for reading.

### read()

Reads a byte that was transmitted from a slave device to a master after a call to `requestFrom()`{{#if has-i2c-slave}} or was transmitted from a master to a slave{{/if}}. `read()` inherits from the `Stream` utility class.

```cpp
// SYNTAX
Wire.read() ;
```

Returns: The next byte received

```cpp
// EXAMPLE USAGE

// Master Reader running on Device No.1 (Use with corresponding Slave Writer running on Device No.2)

void setup() {
  Wire.begin();              // join i2c bus as master
  Serial.begin(9600);        // start serial for output
}

void loop() {
  Wire.requestFrom(2, 6);    // request 6 bytes from slave device #2

  while(Wire.available()){   // slave may send less than requested
    char c = Wire.read();    // receive a byte as character
    Serial.print(c);         // print the character
  }

  delay(500);
}
```

### peek()

Similar in use to read(). Reads (but does not remove from the buffer) a byte that was transmitted from a slave device to a master after a call to `requestFrom()`{{#if has-i2c-slave}} or was transmitted from a master to a slave{{/if}}. `read()` inherits from the `Stream` utility class. Useful for peeking at the next byte to be read.

```cpp
// SYNTAX
Wire.peek();
```

Returns: The next byte received (without removing it from the buffer)

### lock()

The `Wire` object does not have built-in thread-safety. If you want to use read or write from multiple threads, including from a software timer, you must lock and unlock it to prevent data from multiple thread from being interleaved or corrupted.

A call to lock `lock()` must be balanced with a call to `unlock()` and not be nested. To make sure every lock is released, it's good practice to use `WITH_LOCK` like this:

```cpp
// EXAMPLE USAGE
void loop()
{
  WITH_LOCK(Wire) {
    Wire.requestFrom(2, 6);    // request 6 bytes from slave device #2

    while(Wire.available()){   // slave may send less than requested
      char c = Wire.read();    // receive a byte as character
      Serial.print(c);         // print the character
    }
  }
}
```

Never use `lock()` or `WITH_LOCK()` within a `SINGLE_THREADED_BLOCK()` as deadlock can occur.

### unlock()

Unlocks the `Wire` mutex. See `lock()`.

{{#if has-i2c-slave}}

### onReceive()

Registers a function to be called when a slave device receives a transmission from a master.

Parameters: `handler`: the function to be called when the slave receives data; this should take a single int parameter (the number of bytes read from the master) and return nothing, e.g.: `void myHandler(int numBytes) `

**Note:** This handler will lock up the device if System calls such as Particle.publish() are made within, due to interrupts being disabled for atomic operations during this handler.  Do not overload this handler with extra function calls other than what is immediately required to receive I2C data.  Post process outside of this handler.

```cpp
// EXAMPLE USAGE

// Slave Reader running on Device No.2 (Use with corresponding Master Writer running on Device No.1)

// function that executes whenever data is received from master
// this function is registered as an event, see setup()
void receiveEvent(int howMany) {
  while(1 < Wire.available()) { // loop through all but the last
    char c = Wire.read();       // receive byte as a character
    Serial.print(c);            // print the character
  }
  int x = Wire.read();          // receive byte as an integer
  Serial.println(x);            // print the integer
}

void setup() {
  Wire.begin(4);                // join i2c bus with address #4
  Wire.onReceive(receiveEvent); // register event
  Serial.begin(9600);           // start serial for output
}

void loop() {
  delay(100);
}
```

### onRequest()

Register a function to be called when a master requests data from this slave device.

Parameters: `handler`: the function to be called, takes no parameters and returns nothing, e.g.: `void myHandler() `

**Note:** This handler will lock up the device if System calls such as Particle.publish() are made within, due to interrupts being disabled for atomic operations during this handler.  Do not overload this handler with extra function calls other than what is immediately required to send I2C data.  Post process outside of this handler.

```cpp
// EXAMPLE USAGE

// Slave Writer running on Device No.2 (Use with corresponding Master Reader running on Device No.1)

// function that executes whenever data is requested by master
// this function is registered as an event, see setup()
void requestEvent() {
  Wire.write("hello ");         // respond with message of 6 bytes as expected by master
}

void setup() {
  Wire.begin(2);                // join i2c bus with address #2
  Wire.onRequest(requestEvent); // register event
}

void loop() {
  delay(100);
}
```
{{/if}} {{!-- has-i2c-slave --}}


### acquireWireBuffer

Creating a function `acquireWireBuffer()` that returns an `HAL_I2C_Config` struct allows custom buffer sizes to be used. If you do not include this function, the default behavior of 32 byte rx and tx buffers will be used.

This example sets a 512 byte buffer size instead of the default 32 byte size.

```
constexpr size_t I2C_BUFFER_SIZE = 512;

HAL_I2C_Config acquireWireBuffer() {
    HAL_I2C_Config config = {
        .size = sizeof(HAL_I2C_Config),
        .version = HAL_I2C_CONFIG_VERSION_1,
        .rx_buffer = new (std::nothrow) uint8_t[I2C_BUFFER_SIZE],
        .rx_buffer_size = I2C_BUFFER_SIZE,
        .tx_buffer = new (std::nothrow) uint8_t[I2C_BUFFER_SIZE],
        .tx_buffer_size = I2C_BUFFER_SIZE
    };
    return config;
}
```

{{/if}} {{!-- has-i2c --}}

{{#if has-can}}

## CAN (CANbus)

![CAN bus](/assets/images/can.png)

{{since when="0.4.9"}}

<a href="https://en.wikipedia.org/wiki/CAN_bus" target="_blank">Controller area network (CAN bus)</a> is a bus used in most automobiles, as well as some industrial equipment, for communication between different microcontrollers.

The Photon and Electron support communicating with CAN devices via the CAN bus.

- The Photon and Electron have a CANbus on pins D1 (CAN2_TX) and D2 (CAN2_RX).
- The Electron only, has a second CANbus on pins C4 (CAN1_TX) and C5 (CAN1_RX).

**Note**: an additional CAN transceiver integrated circuit is needed to convert the logic-level voltages of the Photon or Electron to the voltage levels of the CAN bus.

On the Photon or Electron, connect pin D1 to the TX pin of the CAN transceiver and pin D2 to the RX pin.

On the Electron only, connect pin C4 to the TX pin of the CAN transceiver and pin C5 to the RX pin.

```
// EXAMPLE USAGE on pins D1 & D2
CANChannel can(CAN_D1_D2);

void setup() {
    can.begin(125000); // pick the baud rate for your network
    // accept one message. If no filter added by user then accept all messages
    can.addFilter(0x100, 0x7FF);
}

void loop() {
    CANMessage message;

    message.id = 0x100;
    can.transmit(message);

    delay(10);

    if(can.receive(message)) {
        // message received
    }
}
```

### CANMessage

The CAN message struct has these members:

```
struct CANMessage
{
   uint32_t id;
   bool     extended;
   bool     rtr;
   uint8_t  len;
   uint8_t  data[8];
}
```

### CANChannel

Create a `CANChannel` global object to connect to a CAN bus on the specified pins.

```cpp
// SYNTAX
CANChannel can(pins, rxQueueSize, txQueueSize);
```

Parameters:

- `pins`: the Photon and Electron support pins `CAN_D1_D2`, and the Electron only, supports pins `CAN_C4_C5`
- `rxQueueSize` (optional): the receive queue size (default 32 message)
- `txQueueSize` (optional): the transmit queue size (default 32 message)

```cpp
// EXAMPLE
CANChannel can(CAN_D1_D2);
// Buffer 10 received messages and 5 transmitted messages
CANChannel can(CAN_D1_D2, 10, 5);
```

### begin()

Joins the bus at the given `baud` rate.

```cpp
// SYNTAX
can.begin(baud, flags);
```

Parameters:

- `baud`: common baud rates are 50000, 100000, 125000, 250000, 500000, 1000000
- `flags` (optional): `CAN_TEST_MODE` to run the CAN bus in test mode where every transmitted message will be received back

```cpp
// EXAMPLE
CANChannel can(CAN_D1_D2);
can.begin(500000);
// Use for testing without a CAN transceiver
can.begin(500000, CAN_TEST_MODE);
```

### end()

Disconnect from the bus.

```
// SYNTAX
CANChannel can(CAN_D1_D2);
can.end();
```

### available()

The number of received messages waiting in the receive queue.

Returns: `uint8_t` : the number of messages.

```
// SYNTAX
uint8_t count = can.available();
```

```
// EXAMPLE
CANChannel can(CAN_D1_D2);
if(can.available() > 0) {
  // there are messages waiting
}
```

### receive()

Take a received message from the receive queue. This function does not wait for a message to arrive.

```
// SYNTAX
can.receive(message);
```

Parameters:

- `message`: where the received message will be copied

Returns: boolean `true` if a message was received, `false` if the receive queue was empty.

```
// EXAMPLE
CANChannel can(CAN_D1_D2);
CANMessage message;
if(can.receive(message)) {
  Log.info("id=%lu len=%u", message.id, message.len);
}
```

### transmit()

Add a message to the queue to be transmitted to the CAN bus as soon as possible.

```
// SYNTAX
can.transmit(message);
```

Parameters:

- `message`: the message to be transmitted

Returns: boolean `true` if the message was added to the queue, `false` if the transmit queue was full.

```
// EXAMPLE
CANChannel can(CAN_D1_D2);
CANMessage message;
message.id = 0x100;
message.len = 1;
message.data[0] = 42;
can.transmit(message);
```

**Note**: Since the CAN bus requires at least one other CAN node to acknowledge transmitted messages if the Photon or Electron is alone on the bus (such as when using a CAN shield with no other CAN node connected) then messages will never be transmitted and the transmit queue will fill up.

### addFilter()

Filter which messages will be added to the receive queue.

```
// SYNTAX
can.addFilter(id, mask);
can.addFilter(id, mask, type);
```

By default all messages are received. When filters are added, only messages matching the filters will be received. Others will be discarded.

Parameters:

- `id`: the id pattern to match
- `mask`: the mask pattern to match
- `type` (optional): `CAN_FILTER_STANDARD` (default) or `CAN_FILTER_EXTENDED`

Returns: boolean `true` if the filter was added, `false` if there are too many filters (14 filters max).

```
// EXAMPLES
CANChannel can(CAN_D1_D2);
// Match only message ID 0x100
can.addFilter(0x100, 0x7FF);
// Match any message with the highest ID bit set
can.addFilter(0x400, 0x400);
// Match any message with the higest ID bit cleared
can.addFilter(0x0, 0x400);
// Match only messages with extended IDs
can.addFilter(0, 0, CAN_FILTER_EXTENDED);
```

### clearFilters()

Clear filters and accept all messages.

```
// SYNTAX
CANChannel can(CAN_D1_D2);
can.clearFilters();
```

### isEnabled()

Used to check if the CAN bus is enabled already.  Check if enabled before calling can.begin() again.

```
// SYNTAX
CANChannel can(CAN_D1_D2);
can.isEnabled();
```

Returns: boolean `true` if the CAN bus is enabled, `false` if the CAN bus is disabled.

### errorStatus()

Get the current error status of the CAN bus.

```
// SYNTAX
int status = can.errorStatus();
```

Returns: int `CAN_NO_ERROR` when everything is ok, `CAN_ERROR_PASSIVE` when not attempting to transmit messages but still acknowledging messages, `CAN_BUS_OFF` when not transmitting or acknowledging messages.

```
// EXAMPLE
CANChannel can(CAN_D1_D2);
if(can.errorStatus() == CAN_BUS_OFF) {
  Log.info("Not properly connected to CAN bus");
}
```

This value is only updated when attempting to transmit messages.

The two most common causes of error are: being alone on the bus (such as when using a CAN shield not connected to anything) or using the wrong baud rate. Attempting to transmit in those situations will result in `CAN_BUS_OFF`.

Errors heal automatically when properly communicating with other microcontrollers on the CAN bus.

{{/if}} {{!-- has-can --}}

## IPAddress

Creates an IP address that can be used with TCPServer, TCPClient, and UDP objects.

```cpp
// EXAMPLE USAGE

IPAddress localIP;
IPAddress server(8,8,8,8);
IPAddress IPfromInt( 167772162UL );  // 10.0.0.2 as 10*256^3+0*256^2+0*256+2
uint8_t server[] = { 10, 0, 0, 2};
IPAddress IPfromBytes( server );
```

The IPAddress also allows for comparisons.

```cpp
if (IPfromInt == IPfromBytes)
{
  Log.info("Same IP addresses");
}
```

You can also use indexing the get or change individual bytes in the IP address.

```cpp
// PING ALL HOSTS ON YOUR SUBNET EXCEPT YOURSELF
IPAddress localIP = WiFi.localIP();
uint8_t myLastAddrByte = localIP[3];
for(uint8_t ipRange=1; ipRange<255; ipRange++)
{
  if (ipRange != myLastAddrByte)
  {
    localIP[3] = ipRange;
    WiFi.ping(localIP);
  }
}
```

You can also assign to an IPAddress from an array of uint8's or a 32-bit unsigned integer.

```cpp
IPAddress IPfromInt;  // 10.0.0.2 as 10*256^3+0*256^2+0*256+2
IPfromInt = 167772162UL;
uint8_t server[] = { 10, 0, 0, 2};
IPAddress IPfromBytes;
IPfromBytes = server;
```

Finally IPAddress can be used directly with print.

```cpp
// PRINT THE DEVICE'S IP ADDRESS IN
// THE FORMAT 192.168.0.10
IPAddress myIP = WiFi.localIP();
Serial.println(myIP);    // prints the device's IP address
```

{{#if has-ble}}
## Bluetooth LE (BLE)

Gen 3 devices (Argon, Boron, and Xenon) support Bluetooth LE (BLE) in both peripheral and central modes. For more information about BLE, see the [BLE Tutorial](/tutorials/device-os/bluetooth-le/).

BLE is intended for low data rate sensor applications. Particle devices do not support Bluetooth A2DP and can't be used with Bluetooth headsets, speakers, and other audio devices. Particle devices do not support Bluetooth 5 mesh.

The BLE radio can use the built-in chip or trace antenna, or an external antenna if you have installed and [configured](#ble-selectantenna-) one.

The B Series  SoM (system-on-a-module) requires the external BLE antenna connected to the **BT** connector. The SoMs do not have built-in antennas.

BLE is supported in Device OS 1.3.1 and later. BLE support was in beta test in Device OS 1.3.0. It is not available in earlier Device OS versions. Some differences between 1.3.0 and 1.3.1 include:

- The number of connections from a central devices to peripherals is 3. It was 1 in 1.3.0.
- The calls to get a characteristic now return a boolean value (true = success) and take the characteristic object as a parameter rather than returning the characteristic as in 1.3.0.
- Limits for the number user characteristics is 20. In 1.3.0 it was 7.

### BLE Class

#### BLE.advertise()

A BLE peripheral can periodically publish data to all nearby devices using advertising. Once you've set up the [`BleAdvertisingData`](/reference/device-os/firmware/#bleadvertisingdata) object, call `BLE.advertise()` to continuously advertise the data to all BLE devices scanning for it.

Optionally, you can provide a `scanResponse` data object. If provided, the central device can ask for it during the scan process. Both the advertising data and scan data are public - any device can see and request the data without authentication.

```cpp
// PROTOTYPE
int advertise(BleAdvertisingData* advertisingData, BleAdvertisingData* scanResponse = nullptr) const;

// EXAMPLE
BleAdvertisingData advData;

// While we support both the health thermometer service and the battery service, we
// only advertise the health thermometer. The battery service will be found after
// connecting.
advData.appendServiceUUID(healthThermometerService);


// Continuously advertise when not connected
BLE.advertise(&advData);
```

Returns 0 on success or a non-zero error code.

You cannot use BLE advertising while in listening mode (blinking dark blue). The device will be advertising its configuration capabilities to the Particle app when in listening mode.

#### BLE.advertise(iBeacon)

You can advertise as an Apple iBeacon. See the [`iBeacon`](/reference/device-os/firmware/#ibeacon) section for more information.

```cpp
// PROTOTYPE
int advertise(const iBeacon& beacon) const;
```

Returns 0 on success or a non-zero error code.

You cannot use BLE advertising including iBeacon while in listening mode (blinking dark blue). The device will be advertising its configuration capabilities to the Particle app when in listening mode.

#### BLE.advertise()

The advertising data set using the previous two calls is saved. You can using `BLE.stopAdvertising()` to stop and `BLE.advertise()` to resume advertising.

```
// PROTOTYPE
int advertise() const;

// EXAMPLE
BLE.advertise();
```

Returns 0 on success or a non-zero error code.

#### BLE.stopAdvertising()

Stops advertising. You can resume advertising using `BLE.advertise()`. Advertising automatically stops while connected to a central device and resumes when disconnected.

```
// PROTOTYPE
int stopAdvertising() const;

// EXAMPLE
BLE.stopAdvertising();
```

#### BLE.advertising()

Returns `true` (1) if advertising is currently on or `false` (0) if not.

```cpp
// PROTOTYPE
bool advertising() const;
```

#### BLE.getAdvertisingData()

You can get the advertising data that you previously set using `getAdvertisingData()`. Initially the data will be empty.

```cpp
// PROTOTYPE
ssize_t getAdvertisingData(BleAdvertisingData* advertisingData) const;
```

See also [`BleAdvertisingData`](/reference/device-os/firmware/#bleadvertisingdata).


#### BLE.setAdvertisingData()

You can set the advertising data using `setAdvertisingData`. You might want to do this if you want to change the data while continuously advertising.

```cpp
// PROTOTYPE
int setAdvertisingData(BleAdvertisingData* advertisingData) const;
```    

See also [`BleAdvertisingData`](/reference/device-os/firmware/#bleadvertisingdata).


#### BLE.setAdvertisingInterval()

Sets the advertising interval. The unit is 0.625 millisecond (625 microsecond) intervals. The default value is 160, or 100 milliseconds.

The range is from 20 milliseconds (32) to 10.24 seconds (16383).

| Interval Value | Milliseconds | Description | 
| ---: | --- | --- |
| 32 | 20 ms | Minimum value |
| 160 | 100 ms | Default value |
| 400 | 250 ms | |
| 800 | 500 ms | |
| 1600 | 1 sec | |
| 3200 | 2 sec | Upper end of recommended range |
| 16383 | 10.24 sec | Maximum value |

Returns 0 on success or a non-zero error code.

```
// PROTOTYPE
int setAdvertisingInterval(uint16_t interval) const;

// EXAMPLE

// Set advertising interval to 500 milliseconds
BLE.setAdvertisingInterval(800);
```

#### BLE.setAdvertisingTimeout()

Normally, advertising continues until `stopAdvertising()` is called or a connection is made from a central device. 

You can also have advertising automatically stop after a period of time. The parameter is in units of 10 milliseconds, so if you want to advertise for 10 seconds you'd set the parameter to 1000.

Pass 0 to advertise until stopped. This is the default.

Returns 0 on success or a non-zero error code.

```
// PROTOTYPE
int setAdvertisingTimeout(uint16_t timeout) const;
```

#### BLE.setAdvertisingType()

The advertising type can be set with this method. This is not typically necessary.

| Type | Value |
| --- | --- |
| `CONNECTABLE_SCANNABLE_UNDIRECTED` | 0 |
| `CONNECTABLE_UNDIRECTED` | 1 |
| `CONNECTABLE_DIRECTED` | 2 |
| `NON_CONNECTABLE_NON_SCANNABLE_UNDIRECTED` | 3 |
| `NON_CONNECTABLE_NON_SCANNABBLE_DIRECTED` | 4 |
| `SCANNABLE_UNDIRECTED` | 5 |
| `SCANNABLE_DIRECTED` | 6 |

The default is `CONNECTABLE_SCANNABLE_UNDIRECTED` (0).

```cpp
// PROTOTYPE
int setAdvertisingType(BleAdvertisingEventType type) const;
```

See [`BleAdvertisingEventType`](/reference/device-os/firmware/#bleadvertisingeventtype) for more information.

#### BLE.getAdvertisingParameters()

Gets the advertising parameters.

```cpp
// PROTOTYPE
int getAdvertisingParameters(BleAdvertisingParams* params) const;

// EXAMPLE
BleAdvertisingParams param;
param.version = BLE_API_VERSION;
param.size = sizeof(BleAdvertisingParams);

int res = BLE.getAdvertisingParameters(&param);
```

See [`BleAdvertisingParameters`](/reference/device-os/firmware/#bleadvertisingparams) for more information.

#### BLE.setAdvertisingParameters()

Sets the advertising parameters using individual values for interval, timeout, and type.

```cpp
// PROTOTYPE
int setAdvertisingParameters(uint16_t interval, uint16_t timeout, BleAdvertisingEventType type) const;
```

- `interval` Advertising interval in 0.625 ms units. Default is 160.
- `timeout` Advertising timeout in 10 ms units. Default is 0.
- `type` [`BleAdvertisingEventType`](/reference/device-os/firmware/#bleadvertisingeventtype). Default is `CONNECTABLE_SCANNABLE_UNDIRECTED` (0).

#### BLE.setAdvertisingParameters(BleAdvertisingParams)

Sets the advertising parameters from the BleAdvertisingParams struct.

```cpp
// PROTOTYPE
int setAdvertisingParameters(const BleAdvertisingParams* params) const;
```

See [`BleAdvertisingParameters`](/reference/device-os/firmware/#bleadvertisingparams) for more information.


#### BLE.getScanResponseData()

In addition to the advertising data, there is an additional 31 bytes of data referred to as the scan response data. This data can be requested during the scan process. It does not require connection or authentication. This is only used from scannable peripheral devices.

```cpp
// PROTOTYPE
ssize_t getScanResponseData(BleAdvertisingData* scanResponse) const;
```

See also [`BleAdvertisingData`](/reference/device-os/firmware/#bleadvertisingdata).

#### BLE.setScanResponseData()

In addition to the advertising data, there is an additional 31 bytes of data referred to as the scan response data. This data can be requested during the scan process. It does not require connection or authentication. This is only used from scannable peripheral devices.

```cpp
// PROTOTYPE
int setScanResponseData(BleAdvertisingData* scanResponse) const;
```

See also [`BleAdvertisingData`](/reference/device-os/firmware/#bleadvertisingdata).


#### BLE.addCharacteristic(characteristic)

Adds a characteristic to this peripheral device from a [`BleCharacteristic`](/reference/device-os/firmware/#blecharacteristic) object. 

```cpp
// PROTOTYPE
BleCharacteristic addCharacteristic(BleCharacteristic& characteristic) const;

// EXAMPLE

// Global variables:
BleUuid serviceUuid("09b17c16-3498-4c02-beb6-3d5792528181");
BleUuid buttonCharacteristicUuid("fe0a8cd7-9f69-45c7-b7a1-3ecb0c9e97c7");
BleCharacteristic buttonCharacteristic("b", BleCharacteristicProperty::NOTIFY, buttonCharacteristicUuid, serviceUuid);

// In setup():
BLE.addCharacteristic(buttonCharacteristic);

BleAdvertisingData data;
data.appendServiceUUID(serviceUuid);
BLE.advertise(&data);
```

There is a limit of 20 user characteristics, with a maximum description of 20 characters. 

You can have up to 20 user services, however you typically cannot advertise that many services as the advertising payload is too small. You normally only advertise your primary service that you device will searched by. Other, less commonly used services can be found after connecting to the device.

#### BLE.addCharacteristic(parameters)

Instead of setting the parameters in a BleCharacteristic object you can pass them directly to addCharacteristic.

The parameters are the same as the BleCharacteristic constructors and are described in more detail in the [`BleCharacteristic`](/reference/device-os/firmware/#blecharacteristic) documentation.

```cpp
// PROTOTYPE
BleCharacteristic addCharacteristic(const char* desc, BleCharacteristicProperty properties, BleOnDataReceivedCallback callback = nullptr, void* context = nullptr) const;

BleCharacteristic addCharacteristic(const String& desc, BleCharacteristicProperty properties, BleOnDataReceivedCallback callback = nullptr, void* context = nullptr) const;

template<typename T>
BleCharacteristic addCharacteristic(const char* desc, BleCharacteristicProperty properties, T charUuid, T svcUuid, BleOnDataReceivedCallback callback = nullptr, void* context = nullptr) const;

template<typename T>
BleCharacteristic addCharacteristic(const String& desc, BleCharacteristicProperty properties, T charUuid, T svcUuid, BleOnDataReceivedCallback callback = nullptr, void* context = nullptr) const;
```

There is a limit of 20 user characteristics, with a maximum description of 20 characters.

You can have up to 20 user services, however you typically cannot advertise that many services as the advertising payload is too small. You normally only advertise your primary service that you device will searched by. Other, less commonly used services can be found after connecting to the device.

See also [`BleCharacteristicProperty`](/reference/device-os/firmware/#blecharacteristicproperty).

#### BLE.scan(array)

Scan for BLE devices. This is typically used by a central device to find nearby BLE devices that can be connected to. It can also be used by an observer to find nearby beacons that continuously transmit data.

There are three overloads of `BLE.scan()`, however all of them are synchronous. The calls do not return until the scan is complete. The `BLE.setScanTimeout()` method determines how long the scan will run for. 

The default is 5 seconds, however you can change it using `setScanTimeout()`.

```cpp
// PROTOTYPE
int scan(BleScanResult* results, size_t resultCount) const;
```

The [`BleScanResult`](/reference/device-os/firmware/#blescanresult) is described below. It contains:

- `address` The BLE address of the device
- `advertisingData` The advertising data sent by the device
- `scanData` The scan data (optional)
- `rssi` The signal strength of the advertising message.

#### BLE.scan(Vector)

The `Vector` version of scan does not require guessing the number of scan items ahead of time. However, it does dynamically allocate memory to hold all of the scan results.

This call does not return until the scan is complete. The `setScanTimeout()` function determines how long the scan will run for. 

The default is 5 seconds, however you can change it using `setScanTimeout()`.

```cpp
// PROTOTYPE
Vector<BleScanResult> scan() const;

// EXAMPLE
#include "Particle.h"

SYSTEM_MODE(MANUAL);

SerialLogHandler logHandler(LOG_LEVEL_TRACE);

void setup() {
	(void)logHandler; // Does nothing, just to eliminate warning for unused variable
}

void loop() {
	Vector<BleScanResult> scanResults = BLE.scan();

    if (scanResults.size()) {
        Log.info("%d devices found", scanResults.size());

        for (int ii = 0; ii < scanResults.size(); ii++) {
            Log.info("MAC: %02X:%02X:%02X:%02X:%02X:%02X | RSSI: %dBm",
                    scanResults[ii].address[0], scanResults[ii].address[1], scanResults[ii].address[2],
                    scanResults[ii].address[3], scanResults[ii].address[4], scanResults[ii].address[5], scanResults[ii].rssi);

            String name = scanResults[ii].advertisingData.deviceName();
            if (name.length() > 0) {
                Log.info("Advertising name: %s", name.c_str());
            }
        }
    }

    delay(3000);
}
```

The [`BleScanResult`](/reference/device-os/firmware/#blescanresult) is described below. It contains:

- `address` The BLE address of the device
- `advertisingData` The advertising data sent by the device
- `scanData` The scan data (optional)
- `rssi` The signal strength of the advertising message.

#### BLE.scan(callback)

The callback version of scan does not return until the scan has reached the end of the scan timeout. There are still advantages of using this, however:

- You do not need to guess how many scan results there will be ahead of time.
- If you expect to have a lot of BLE devices in the area but only care about a few, this version can save on memory usage.
- The callback is called as the devices are discovered - you can start to display before the timeout occurs.
- You can stop scanning when the desired device is found instead of waiting until the timeout.

The default is 5 seconds, however you can change it using `setScanTimeout()`.

Note: You cannot call `BLE.connect()` from a `BLE.scan()` callback! If you want to scan then connect, you must save the `BleAddress` and then do the connect after `BLE.scan()` returns.

```cpp
// PROTOTYPE
int scan(BleOnScanResultCallback callback, void* context) const;

// EXAMPLE
#include "Particle.h"

SYSTEM_MODE(MANUAL);

SerialLogHandler logHandler(LOG_LEVEL_TRACE);

void scanResultCallback(const BleScanResult *scanResult, void *context);

void setup() {
	(void)logHandler; // Does nothing, just to eliminate warning for unused variable
}

void loop() {
	Log.info("starting scan");

	int count = BLE.scan(scanResultCallback, NULL);
	if (count > 0) {
		Log.info("%d devices found", count);
	}

	delay(3000);
}

void scanResultCallback(const BleScanResult *scanResult, void *context) {
	Log.info("MAC: %02X:%02X:%02X:%02X:%02X:%02X | RSSI: %dBm",
			scanResult->address[0], scanResult->address[1], scanResult->address[2],
			scanResult->address[3], scanResult->address[4], scanResult->address[5], scanResult->rssi);

	String name = scanResult->advertisingData.deviceName();
	if (name.length() > 0) {
		Log.info("deviceName: %s", name.c_str());
	}
}
```

The callback has this prototype:

```cpp
void scanResultCallback(const BleScanResult *scanResult, void *context)
```

The [`BleScanResult`](/reference/device-os/firmware/#blescanresult) is described below. It contains:

- `address` The BLE address of the device
- `advertisingData` The advertising data sent by the device
- `scanData` The scan data (optional)
- `rssi` The signal strength of the advertising message.

The `context` parameter is often used if you implement your scanResultCallback in a C++ object. You can store the object instance pointer (`this`) in the context.

The callback is called from the BLE thread. It has a smaller stack than the normal loop stack, and you should avoid doing any lengthy operations that block from the callback. For example, you should not try to use functions like `Particle.publish()` and you should not use `delay()`. You should beware of thread safety issues. For example you should use `Log.info()` and instead of `Serial.print()` as `Serial` is not thread-safe.

#### BLE.stopScanning()

The `stopScanning()` method interrupts a `BLE.scan()` in progress before the end of the timeout. It's typically called from the scan callback function.

You might want to do this if you're looking for a specific device - you can stop scanning after you find it instead of waiting until the end of the scan timeout.

```cpp
// PROTOTYPE
int stopScanning() const;

// EXAMPLE
void scanResultCallback(const BleScanResult *scanResult, void *context) {
	// Stop scanning if we encounter any BLE device in range
	BLE.stopScanning();
}
```

#### BLE.setScanTimeout()

Sets the length of time `scan()` will run for. The default is 5 seconds.

```cpp
// PROTOTYPE
int setScanTimeout(uint16_t timeout) const;

// EXAMPLE

// Scan for 1 second
setScanTimeout(100);
```

The unit is 10 millisecond units, so the default timeout parameter is 500.

Returns 0 on success or a non-zero error code.

#### BLE.getScanParameters()

Gets the parameters used for scanning.

```cpp
// PROTOTYPE
int getScanParameters(BleScanParams* params) const;

// EXAMPLE
BleScanParams scanParams;
scanParams.version = BLE_API_VERSION;
scanParams.size = sizeof(BleScanParams);
int res = BLE.getScanParameters(&scanParams);
```

See [`BleScanParams`](/reference/device-os/firmware/#blescanparams) for more information.

#### BLE.setScanParameters()

Sets the parameters used for scanning. Typically you will only ever need to change the scan timeout, but if you need finer control you can use this function.

```cpp
// PROTOTYPE
int setScanParameters(const BleScanParams* params) const;
```

See [`BleScanParams`](/reference/device-os/firmware/#blescanparams) for more information.

#### BLE.connect()

In a central device the logic typically involves:

- Scanning for a device
- Selecting one, either manually from a user selection, or automatically by its capabilities.
- Connecting to it to exchange more data (optional)

Scanning for devices provides its address as well as additional data (advertising data). With the address you can connect:

```cpp
// PROTOTYPE
BlePeerDevice connect(const BleAddress& addr, bool automatic = true) const;
BlePeerDevice connect(const BleAddress& addr, const BleConnectionParams* params, bool automatic = true) const;
BlePeerDevice connect(const BleAddress& addr, uint16_t interval, uint16_t latency, uint16_t timeout, bool automatic = true) const;
```

- `addr` The [`BleAddress`](/reference/device-os/firmware/#bleaddress) to connect to.

This call is synchronous and will block until a connection is completed or the operation times out.

Returns a [`BlePeerDevice`](/reference/device-os/firmware/#blepeerdevice) object. You typically use a construct like this:

```
// EXAMPLE:
BlePeerDevice peer = BLE.connect(scanResults[ii].address);
if (peer.connected()) {
	Log.info("successfully connected %02X:%02X:%02X:%02X:%02X:%02X!",
							scanResults[ii].address[0], scanResults[ii].address[1], scanResults[ii].address[2],
							scanResults[ii].address[3], scanResults[ii].address[4], scanResults[ii].address[5]);
	// ...
}
else {
	Log.info("connection failed");
	// ...
}
```

It is possible to save the address and avoid scanning, however the address could change on some BLE devices, so you should be prepared to scan again if necessary.

A central device can connect to up to 3 peripheral devices at a time. (It's limited to 1 in Device OS 1.3.0.)

See the next section for the use of `BleConnectionParams` as well as interval, latency, and timeout.

#### BLE.connect(options)

This version of connect allows parameters for the connection to be set.

```cpp
// PROTOTYPE
BlePeerDevice connect(const BleAddress& addr, uint16_t interval, uint16_t latency, uint16_t timeout) const;
```
- `addr` The [`BleAddress`](/reference/device-os/firmware/#bleaddress) to connect to.
- `interval` The minimum connection interval in units of 1.25 milliseconds. The default is 24 (30 milliseconds).
- `latency` Use default value 0.
- `timeout` Connection timeout in units of 10 milliseconds. Default is 500 (5 seconds). Minimum value is 100 (1 second).

Note that the timeout is the timeout after the connection is established, to determine that the other side is no longer available. It does not affect the initial connection timeout.

Returns a [`BlePeerDevice`](/reference/device-os/firmware/#blepeerdevice) object. 

#### BLE.setPPCP()

Sets the connection parameter defaults so future calls to connect() without options will use these values.

```cpp
// PROTOTYPE
int setPPCP(uint16_t minInterval, uint16_t maxInterval, uint16_t latency, uint16_t timeout) const;
```

- `minInterval` the minimum connection interval in units of 1.25 milliseconds. The default is 24 (30 milliseconds).
- `maxInterval` the minimum connection interval in units of 1.25 milliseconds. The default is 24 (30 milliseconds). The connect(options) call sets both minInterval and maxInterval to the interval parameter.
- `latency` Use default value 0.
- `timeout` Connection timeout in units of 10 milliseconds. Default is 500 (5 seconds). Minimum value is 100 (1 second).

Note that the timeout is the timeout after the connection is established, to determine that the other side is no longer available. It does not affect the initial connection timeout.

#### BLE.connected()

Returns `true` (1) if a connected to a device or `false` (0) if not. 

```cpp
// PROTOTYPE
bool connected() const;
```

Can be used in central or peripheral mode, however if central mode if you are supporting more than one peripheral you may want to use the `connected()` method of the [`BlePeerDevice`](/reference/device-os/firmware/#blepeerdevice) object to find out the status of individual connections.


#### BLE.disconnect()

Disconnects all peers.

```cpp
// PROTOTYPE
int disconnect() const;
```

Returns 0 on success or a non-zero error code.


#### BLE.disconnect(peripheral)

Typically used in central mode when making connections to multiple peripherals to disconnect a single peripheral.

```cpp
// PROTOTYPE
int disconnect(const BlePeerDevice& peripheral) const;
```

The [`BlePeerDevice`](/reference/device-os/firmware/#blepeerdevice) is described below. You typically get it from `BLE.connect()`.

Returns 0 on success or a non-zero error code.

#### BLE.on()

Turns the BLE radio on. It defaults to on in `SYSTEM_MODE(AUTOMATIC)`. In `SYSTEM_MODE(SEMI_AUTOMATIC)` or `SYSTEM_MODE(MANUAL)` you must turn on BLE.

```cpp
// PROTOTYPE
int on();

// EXAMPLE
void setup() {
  BLE.on();
}
```

Returns 0 on success, or a non-zero error code.

#### BLE.off()

Turns the BLE radio off. You normally do not need to do this.

```cpp
// PROTOTYPE
int off();
```

Returns 0 on success, or a non-zero error code.

#### BLE.begin()

Starts the BLE service. It defaults to started, so you normally do not need to call this unless you have stopped it.

```cpp
// PROTOTYPE
int begin();
```

Returns 0 on success, or a non-zero error code.

#### BLE.end()

Stops the BLE service. You normally do not need to do this.

```cpp
// PROTOTYPE
int end();
```

Returns 0 on success, or a non-zero error code.


#### BLE.onConnected()

Registers a callback function that is called when a connection is established. This is only called for peripheral devices. On central devices, `BLE.connect()` is synchronous.

You can use this method, or you can simply monitor `BLE.connected()` (for peripheral devices) or `peer.connected()` for central devices.

```cpp
// PROTOTYPE
void onConnected(BleOnConnectedCallback callback, void* context);
```

The prototype for the callback function is:

```
void callback(const BlePeerDevice& peer, void* context);
```

The callback parameters are:

- `peer` The [`BlePeerDevice`](/reference/device-os/firmware/#blepeerdevice) object that has connected.
- `context` The value you passed to `onConnected` when you registered the connected callback.

The callback is called from the BLE thread. It has a smaller stack than the normal loop stack, and you should avoid doing any lengthy operations that block from the callback. For example, you should not try to use functions like `Particle.publish()` and you should not use `delay()`. You should beware of thread safety issues. For example you should use `Log.info()` and instead of `Serial.print()` as `Serial` is not thread-safe.

#### BLE.onDisconnected()

Registers a callback function that is called when a connection is disconnected on a peripheral device.

You can use this method, or you can simply monitor `BLE.connected()` (for peripheral devices) or `peer.connected()` for central devices.

```cpp
// PROTOTYPE
void onDisconnected(BleOnDisconnectedCallback callback, void* context);
````

The prototype for the callback function is:

```
void callback(const BlePeerDevice& peer, void* context);
```

The callback parameters are the same as for onConnected().


#### BLE.setTxPower()

Sets the BLE transmit power. The default is 0 dBm.

Valid values are: -20, -16, -12, -8, -4, 0, 4, 8. 

-20 is the lowest power, and 8 is the highest power. 

Returns 0 on success or a non-zero error code.

```cpp
// PROTOTYPE
int setTxPower(int8_t txPower) const;

// EXAMPLE
BLE.setTxPower(-12); // Use lower power
```

Returns 0 on success or a non-zero error code.

#### BLE.txPower()

Gets the current txPower. The default is 0. 

Returns 0 on success or a non-zero error code.

```cpp
// PROTOTYPE
int txPower(int8_t* txPower) const;

// EXAMPLE
int8_t txPower;
txPower = BLE.tx(&txPower);
Log.info("txPower=%d", txPower);
```

#### BLE.address()

Get the BLE address of this device.

```cpp
// PROTOTYPE
const BleAddress address() const;
```

See [`BleAddress`](/reference/device-os/firmware/#bleaddress) for more information.

#### BLE.selectAntenna()

{{since when="1.3.1"}}

Selects which antenna is used by the BLE radio stack. This is a persistent setting.

**Note:** B Series SoM devices do not have an internal (chip) antenna and require an external antenna to use BLE. It's not necessary to select the external antenna on the B Series SoM as there is no internal option.

```cpp
// Select the internal antenna
BLE.selectAntenna(BleAntennaType::INTERNAL);
// Select the external antenna
BLE.selectAntenna(BleAntennaType::EXTERNAL);
```

If you get this error when using `BleAntennaType::EXTERNAL`:

```
Error: .../wiring/inc/spark_wiring_arduino_constants.h:44:21: expected unqualified-id before numeric constant
```

After all of your #include statements at the top of your source file, add:

```
#undef EXTERNAL
```

This occurs because the Arduino compatibility modules has a `#define` for `EXTERNAL` which breaks the `BleAntennaType` enumeration. This will only be necessary if a library you are using enables Arduino compatibility.

### BLE Services

There isn't a separate class for configuring BLE Services. A service is identified by its UUID, and this UUID passed in when creating the [`BleCharacteristic`](/reference/device-os/firmware/#blecharacteristic) object(s) for the service. For example:

```cpp
// The "Health Thermometer" service is 0x1809.
// See https://www.bluetooth.com/specifications/gatt/services/
BleUuid healthThermometerService(0x1809);

// We're using a well-known characteristics UUID. They're defined here:
// https://www.bluetooth.com/specifications/gatt/characteristics/
// The temperature-measurement is 16-bit UUID 0x2A1C
BleCharacteristic temperatureMeasurementCharacteristic("temp", BleCharacteristicProperty::NOTIFY, BleUuid(0x2A1C), healthThermometerService);
``` 

The health thermometer only has a single characteristic, however if your service has multiple characteristics you can add them all this way.

You can also create custom services by using a long UUID. You define what characteristic data to include for a custom service. [UUIDs](/reference/device-os/firmware/#bleuuid) are described below.

For more information about characteristics, see [the BLE tutorial](/tutorials/device-os/bluetooth-le/#services) and  [`BleCharacteristicProperty`](/reference/device-os/firmware/#blecharacteristicproperty).


### BleCharacteristic

In a BLE peripheral role, each service has one or more characteristics. Each characteristic may have one of more values. 

In a BLE central role, you typically have a receive handler to be notified when the peripheral updates each characteristic value that you care about.

For assigned characteristics, the data will be in a defined format as defined by the Bluetooth SIG. They are [listed here](https://www.bluetooth.com/specifications/gatt/characteristics/). 

For more information about characteristics, see [the BLE tutorial](/tutorials/device-os/bluetooth-le/#characteristics).

#### BleCharacteristic()

You typically construct a characteristic as a global variable with no parameters when you are using central mode and will be receiving values from the peripheral. For example, this is done in the [heart rate central tutorial](/tutorials/device-os/bluetooth-le/#heart-rate-central) to receive values from a heart rate sensor. It's associated with a specific characteristic UUID after making the BLE connection.

```cpp
// PROTOTYPE
BleCharacteristic();

// EXAMPLE
// Global variable
BleCharacteristic myCharacteristic;
```

Once you've created your characteristic in `setup()` you typically hook in its onDataReceived handler.

```cpp
// In setup():
myCharacteristic.onDataReceived(onDataReceived, NULL);
```

The `onDataReceived` function has this prototype:

```cpp
void onDataReceived(const uint8_t* data, size_t len, const BlePeerDevice& peer, void* context) 
```

The [`BlePeerDevice`](/reference/device-os/firmware/#blepeerdevice) object is described below.

The `context` parameter can be used to pass extra data to the callback. It's typically used when you implement the callback in a C++ class to pass the object instance pointer (`this`).


#### BleCharacteristic (peripheral)

In a peripheral role, you typically define a value that you send out using this constructor. The parameters are:

```cpp
// PROTOTYPE
BleCharacteristic(const char* desc, BleCharacteristicProperty properties, BleOnDataReceivedCallback callback = nullptr, void* context = nullptr);

BleCharacteristic(const String& desc, BleCharacteristicProperty properties, BleOnDataReceivedCallback callback = nullptr, void* context = nullptr);

// EXAMPLE
// Global variable
BleCharacteristic batteryLevelCharacteristic("bat", BleCharacteristicProperty::NOTIFY, BleUuid(0x2A19), batteryLevelService);
```

- `"bat"` a short string to identify the characteristic
- `BleCharacteristicProperty::NOTIFY` The BLE characteristic property. This is typically NOTIFY for values you send out. See also [`BleCharacteristicProperty`](/reference/device-os/firmware/#blecharacteristicproperty).
- `BleUuid(0x2A19)` The UUID of this characteristic. In this example it's an assigned (short) UUID. See [`BleUuid`](/reference/device-os/firmware/#bleuuid).
- `batteryLevelService` The UUID of the service this characteristic is part of.

The UUIDs for the characteristic and service can be a number of formats but are typically either:

- Explicit BleUuid, like `BleUuid(0x2A19)`
- String literal or `const char *`, like `"6E400001-B5A3-F393-E0A9-E50E24DCCA9E"`

Both must be the same, so if you use a string literal service UUID, you must also use a string literal for the characteristic UUID as well.

You typically register your characteristic in `setup()`:

```
// In setup():
BLE.addCharacteristic(batteryLevelCharacteristic);
```


#### BleCharacteristic (peripheral with data received)

In a peripheral role if you are receiving data from the central device, you typically assign your characteristic like this.

```cpp
// PROTOTYPE
// Type T is any type that can be passed to BleUuid, such as const char * or a string-literal.
template<typename T>
BleCharacteristic(const char* desc, BleCharacteristicProperty properties, T charUuid, T svcUuid, BleOnDataReceivedCallback callback = nullptr, void* context = nullptr)

template<typename T>
BleCharacteristic(const String& desc, BleCharacteristicProperty properties, T charUuid, T svcUuid, BleOnDataReceivedCallback callback = nullptr, void* context = nullptr)


// EXAMPLE
BleCharacteristic rxCharacteristic("rx", BleCharacteristicProperty::WRITE_WO_RSP, rxUuid, serviceUuid, onDataReceived, NULL);
```

- `"rx"` a short string to identify the characteristic
- `BleCharacteristicProperty::WRITE_WO_RSP` The BLE characteristic property. This is typically WRITE_WO_RSP for values you receive. See also [`BleCharacteristicProperty`](/reference/device-os/firmware/#blecharacteristicproperty).
- `rxUuid` The UUID of this characteristic. 
- `serviceUuid ` The UUID of the service this characteristic is part of.
- `onDataReceived` The function that is called when data is received.
- `NULL` Context pointer. If your data received handler is part of a C++ class, this is a good place to put the class instance pointer (`this`).

The data received handler has this prototype. 

```cpp
void onDataReceived(const uint8_t* data, size_t len, const BlePeerDevice& peer, void* context)
```

You typically register your characteristic in `setup()` in peripheral devices:

```
// In setup():
BLE.addCharacteristic(rxCharacteristic);
```

The callback is called from the BLE thread. It has a smaller stack than the normal loop stack, and you should avoid doing any lengthy operations that block from the callback. For example, you should not try to use functions like `Particle.publish()` and you should not use `delay()`. You should beware of thread safety issues. For example you should use `Log.info()` and instead of `Serial.print()` as `Serial` is not thread-safe.

#### UUID()

Get the UUID of this characteristic.

```cpp
// PROTOTYPE
BleUuid UUID() const;


// EXAMPLE
BleUuid uuid = batteryLevelCharacteristic.UUID();
```

See also [`BleUuid`](/reference/device-os/firmware/#bleuuid).

#### properties()

Get the BLE characteristic properties for this characteristic. This indicates whether it can be read, written, etc..


```cpp
// PROTOTYPE
BleCharacteristicProperty properties() const;

// EXAMPLE
BleCharacteristicProperty prop = batteryLevelCharacteristic.properties();
```

See also [`BleCharacteristicProperty`](/reference/device-os/firmware/#blecharacteristicproperty).

#### getValue(buf, len)

This overload of `getValue()` is typically used when you have a complex characteristic with a packed data structure that you need to manually extract. 

For example, the heart measurement characteristic has a flags byte followed by either a 8-bit or 16-bit value. You typically extract that to a uint8_t buffer using this method and manually extract the data.

```cpp
// PROTOTYPE
ssize_t getValue(uint8_t* buf, size_t len) const;
```

#### getValue(String)

If your characteristic has a string value, you can read it out using this method.

```cpp
// PROTOTYPE
ssize_t getValue(String& str) const;

// EXAMPLE
String value;
characteristic.getValue(value);
```

#### getValue(pointer)

You can read out arbitrary data types (int8_t, uint8_t, uint16_t, uint32_t, struct, etc.) by passing a pointer to the object.

```cpp
// PROTOTYPE
template<typename T>
ssize_t getValue(T* val) const;

// EXAMPLE
uint16_t value;
characteristic.getValue(&value);
```

#### setValue(buf, len)

To set the value of a characteristic to arbitrary data, you can use this function.

```cpp
// PROTOTYPE
ssize_t setValue(const uint8_t* buf, size_t len);
```

#### setValue(string)

To set the value of the characteristic to a string value, use this method. The terminating null is not included in the characteristic; the length is set to the actual string length.

```cpp
// PROTOTYPE
ssize_t setValue(const String& str);
ssize_t setValue(const char* str);
```

#### setValue(pointer)

You can write out arbitrary data types (int8_t, uint8_t, uint16_t, uint32_t, struct, etc.) by passing the value to setValue.

```cpp
// PROTOTYPE
template<typename T>
ssize_t setValue(T val) const;

// EXAMPLE
uint16_t value = 0x1234;
characteristic.setValue(value);
```

#### onDataReceived()

To be notified when a value is received to add a data received callback.

The context is used when you've implemented the data received handler in a C++ class. You can pass the object instance (`this`) in context. If you have a global function, you probably don't need the context and can pass NULL.

```cpp
// PROTOTYPE
void onDataReceived(BleOnDataReceivedCallback callback, void* context);

// BleOnDataReceivedCallback
void myCallback(const uint8_t* data, size_t len, const BlePeerDevice& peer, void* context);
```

The callback is called from the BLE thread. It has a smaller stack than the normal loop stack, and you should avoid doing any lengthy operations that block from the callback. For example, you should not try to use functions like `Particle.publish()` and you should not use `delay()`. You should beware of thread safety issues. For example you should use `Log.info()` and instead of `Serial.print()` as `Serial` is not thread-safe.

### BleCharacteristicProperty

This bitfield defines what access is available to the property. It's assigned by the peripheral, and provides information to the central device about how the characteristic can be read or written.

- `BleCharacteristicProperty::BROADCAST` (0x01) The value can be broadcast.
- `BleCharacteristicProperty::READ` (0x02) The value can be read.
- `BleCharacteristicProperty::WRITE_WO_RSP` (0x04) The value can be written without acknowledgement. For example, the UART peripheral example uses this characteristic properly to receive UART data from the central device.
- `BleCharacteristicProperty::WRITE` (0x08) The value can be written to the peripheral from the central device.
- `BleCharacteristicProperty::NOTIFY` (0x10) The value is published by the peripheral without acknowledgement. This is the standard way peripherals periodically publish data.
- `BleCharacteristicProperty::INDICATE` (0x20) The value can be indicated, basically publish with acknowledgement.
- `BleCharacteristicProperty::AUTH_SIGN_WRITES` (0x40) The value supports signed writes. This is operation not supported.
- `BleCharacteristicProperty::EXTENDED_PROP` (0x80) The value supports extended properties. This operation is not supported.

You only assign these values as a peripheral device, and will typically use one of two values:

- `BleCharacteristicProperty::NOTIFY` when your peripheral periodically publishes data
- `BleCharacteristicProperty::WRITE_WO_RSP` when your peripheral receives data from the central device.

For bidirectional data transfer you typically assign two different characteristics, one for receive and one for transmit, as shown in the UART examples.

### BleUuid

Services and characteristics are typically identified by their UUID. There are two types:

- 16-bit (short) UUIDs for well-known BLE services 
- 128-bit (long) UUIDs for everything else

The 16-bit service IDs are assigned by the Bluetooth SIG and are [listed here](https://www.bluetooth.com/specifications/gatt/services/).

The 16-bit characteristic IDs are [listed here](https://www.bluetooth.com/specifications/gatt/characteristics/). 

You can create a 16-bit UUID like this:

```cpp
// PROTOTYPE
BleUuid(uint16_t uuid16);

// EXAMPLE
BleUuid healthThermometerService(0x1809);
```

The value 0x1809 is from the assigned list of service IDs.

The 128-bit UUIDs are used for your own custom services and characteristics. These are not assigned by any group. You can use any UUID generator, such as the [online UUID generator](https://www.uuidgenerator.net/) or tools that you run on your computer. There is no central registry; they are statistically unlikely to ever conflict.

A 128-bit (16 byte) UUID is often written like this: `240d5183-819a-4627-9ca9-1aa24df29f18`. It's a series of 32 hexadecimal digits (0-9, a-f) written in a 8-4-4-4-12 pattern. 

```cpp
// PROTOTYPE
BleUuid(const String& uuid);
BleUuid(const char* uuid);

// EXAMPLE
BleUuid myCustomService("240d5183-819a-4627-9ca9-1aa24df29f18");
```

You can also construct a UUID from an array of bytes (uint8_t):

```cpp
// PROTOTYPE
BleUuid(const uint8_t* uuid128, BleUuidOrder order = BleUuidOrder::LSB);

// EXAMPLE
BleUuid myCustomService({0x24, 0x0d, 0x51, 0x83, 0x81, 0x9a, 0x46, 0x27, 0x9c, 0xa9, 0x1a, 0xa2, 0x4d, 0xf2, 0x9f, 0x18});
```

#### type()

```cpp
// PROTOTYPE
BleUuidType type() const;

// EXAMPLE
BleUuidType uuidType = uuid.type();
```

Returns a constant:

- `BleUuidType::SHORT` for 16-bit UUIDs
- `BleUuidType::LONG` for 128-bit UUIDs


#### isValid()

```cpp
// PROTOTYPE
bool isValid() const;

// EXAMPLE
bool isValid = uuid.isValid();
```

Return `true` if the UUID is valid or `false` if not.

#### equality

You can test two UUIDs for equality.

```
// PROTOTYPE
bool operator==(const BleUuid& uuid) const;
bool operator==(const char* uuid) const;
bool operator==(const String& uuid) const;
bool operator==(uint16_t uuid) const;
bool operator==(const uint8_t* uuid128) const;

// EXAMPLE 1
BleUuid rxUuid("6E400002-B5A3-F393-E0A9-E50E24DCCA9E");
BleUuid txUuid("6E400003-B5A3-F393-E0A9-E50E24DCCA9E");

if (rxUuid == txUuid) {
	// This code won't be executed since they're not equal
}

// EXAMPLE 2
BleUuid foundServiceUUID;
size_t svcCount = scanResult->advertisingData.serviceUUID(&foundServiceUUID, 1);
if (svcCount > 0 && foundServiceUUID == serviceUuid) {
	// Device advertises our custom service "serviceUuid" so try to connect to it
}
```
#### rawBytes

Get the underlying bytes of the UUID.

```
// PROTOTYPE
void rawBytes(uint8_t uuid128[BLE_SIG_UUID_128BIT_LEN]) const;
    const uint8_t* rawBytes() const;
const uint8_t* rawBytes() const;    
```

#### Constructors

Other, less commonly used constructors include:

```
// PROTOTYPE
BleUuid(const hal_ble_uuid_t& uuid);
BleUuid(const BleUuid& uuid);
BleUuid(const uint8_t* uuid128, BleUuidOrder order = BleUuidOrder::LSB);
BleUuid(const uint8_t* uuid128, uint16_t uuid16, BleUuidOrder order = BleUuidOrder::LSB);
BleUuid(uint16_t uuid16);
BleUuid(const String& uuid);
BleUuid(const char* uuid);
```

#### Setters

You normally don't need to set the value of a BleUuid after construction, but the following methods are available:

```
// PROTOTYPE
BleUuid& operator=(const BleUuid& uuid);
BleUuid& operator=(const uint8_t* uuid128);
BleUuid& operator=(uint16_t uuid16);
BleUuid& operator=(const String& uuid);
BleUuid& operator=(const char* uuid);
BleUuid& operator=(const hal_ble_uuid_t& uuid);
```


### BleAdvertisingData

The BleAdvertisingData is used in two ways:

- In the peripheral role, to define what you want to send when central devices do a scan.
- In the central role, as a container to hold what the other side has sent during a scan.


For more information about advertising, see [the BLE tutorial](/tutorials/device-os/bluetooth-le/#advertising).

#### BleAdvertisingData()

Construct a `BleAdvertisingData` object. You typically do this in a peripheral role before adding new data. 

In the central role, you get a filled in object in the [`BleScanResult`](/reference/device-os/firmware/#blescanresult) object.

```cpp
// PROTOTYPE
BleAdvertisingData();
```

#### append()

Appends advertising data of a specific type to the advertising data object.

```cpp
// PROTOTYPE
size_t append(BleAdvertisingDataType type, const uint8_t* buf, size_t len, bool force = false);

// EXAMPLE
BleAdvertisingData advData;

uint8_t flagsValue = BLE_SIG_ADV_FLAGS_LE_ONLY_GENERAL_DISC_MODE;
advData.append(BleAdvertisingDataType::FLAGS, &flagsValue, sizeof(flagsValue));
```

- `type` The type of data to append. The valid types are listed in the [`BleAdvertisingDataType`](/reference/device-os/firmware/#bleadvertisingdatatype) section, below.
- `buf` Pointer to the buffer containing the data
- `len` The length of the data in bytes
- `force` If true, then multiple blocks of the same type can be appended. The default is false, which replaces an existing block and is the normal behavior.

Note that advertising data is limited to 31 bytes (`BLE_MAX_ADV_DATA_LEN`), and each block includes a type and a length byte, so you are quite limited in what you can add.

You normally don't need to include `BleAdvertisingDataType::FLAGS`, however. If you do not include it, one will be inserted automatically.

#### appendCustomData

Appends custom advertising data to the advertising data object.

```cpp
// PROTOTYPE
size_t appendCustomData(const uint8_t* buf, size_t len, bool force = false);
```

- `buf` Pointer to the buffer containing the data
- `len` The length of the data in bytes
- `force` If true, then multiple blocks of the same type can be appended. The default is false, which replaces an existing block and is the normal behavior.

Note that advertising data is limited to 31 bytes (`BLE_MAX_ADV_DATA_LEN`), and each block includes a type and a length byte, so you are quite limited in what you can add.

The first two bytes of the company data are typically the [company ID](https://www.bluetooth.com/specifications/assigned-numbers/company-identifiers/). You need to be a member of the Bluetooth SIG to get a company ID, and the field is only 16 bits wide, so there can only be 65534 companies.

The special value of 0xffff is reserved for internal use and testing. 

If you are using private custom data it's recommended to begin it with two 0xff bytes, that way your data won't confuse apps that are scanning for company-specific custom data.

The maximum custom data size is 26 bytes, including the company ID. Adding data that is too large will cause it to be omitted (not truncated).

#### appendLocalName()

An optional field in the advertising data is the local name. This can be useful if the user needs to select from multiple devices.

The name takes up the length of the name plus two bytes (type and length). The total advertising data is limited to 31 bytes (`BLE_MAX_ADV_DATA_LEN`), and if you include service identifiers there isn't much left space for the name.

```cpp
// PROTOTYPE
size_t appendLocalName(const char* name);
size_t appendLocalName(const String& name);
```

#### appendServiceUUID()

Appends a service UUID to the advertisement (short or long). You typically only advertise the primary service. 

For example, the health thermometer advertises the health thermometer service. Upon connecting, the central device can discover that it also supports the battery service. Put another way, a user or app would most likely only want to discover a nearby thermometer, not any battery powered device nearby. 

```cpp
// PROTOTYPE
// Type T is any type that can be passed to the BleUuid constructor
template<typename T>
size_t appendServiceUUID(T uuid, bool force = false) 

// EXAMPLE
advData.appendServiceUUID(healthThermometerService);
```

- `uuid` The UUID to add. This can be a [`BleUuid`](/reference/device-os/firmware/#bleuuid) object, a uint16_t (short UUID), or a const char * or string literal specifying a long UUID.
- `force` If true, then multiple blocks of the same type can be appended. The default is false, which replaces an existing block and is the normal behavior.

Since long UUIDs are long (16 bytes plus 2 bytes of overhead) they will use a lot of the 31 byte payload, leaving little room for other things like short name.

#### clear()

Remove all existing data from the BleAdvertisingData object.

```cpp
// PROTOTYPE
void clear();
```

#### remove()

Remove a specific data type from the BleAdvertisingData object.

```cpp
// PROTOTYPE
void remove(BleAdvertisingDataType type);
```

- `type` The [`BleAdvertisingDataType`](/reference/device-os/firmware/#bleadvertisingdatatype) to remove.


#### set()

In a peripheral role, you sometimes will want to build your advertising data complete by hand. You can then copy your pre-build structure into the BleAdvertisingData object using `set()`.

```cpp
// PROTOTYPE
size_t set(const uint8_t* buf, size_t len);
```

#### get(type, buffer)

In the central role, if you want to get a specific block of advertising data by type, you can use this method.

```cpp
// PROTOTYPE
size_t get(BleAdvertisingDataType type, uint8_t* buf, size_t len) const;
```

- `type` The [`BleAdvertisingDataType`](/reference/device-os/firmware/#bleadvertisingdatatype) to get.
- `buf` A pointer to the buffer to hold the data.
- `len` The length of the buffer in bytes.

Returns the number of bytes copied, which will be <= `len`. Returns 0 if the type does not exist in the advertising data.


#### get(buffer)

In the central role, if you want to get the advertising data as a complete block of data, you can use the get method with a buffer and length.

Advertising data is limited to 31 bytes (`BLE_MAX_ADV_DATA_LEN`) and you should make your buffer at least that large to be able to receive the largest possible data.


```cpp
// PROTOTYPE
size_t get(uint8_t* buf, size_t len) const;
```

- `buf` A pointer to the buffer to hold the data.
- `len` The length of the buffer in bytes.

Returns the number of bytes copied, which will be <= `len`.

#### length()

Return the length of the data in bytes.

```cpp
// PROTOTYPE
size_t length() const;
```

#### deviceName()

Gets the deviceName (`SHORT_LOCAL_NAME` or `COMPLETE_LOCAL_NAME`). Returns a String object or an empty string if the advertising data does not contain a name.

```cpp
// PROTOTYPE
String deviceName() const;
```

#### deviceName(buf)

Gets the deviceName (`SHORT_LOCAL_NAME` or `COMPLETE_LOCAL_NAME`). 

```cpp
// PROTOTYPE
size_t deviceName(char* buf, size_t len) const;
```

- `buf` Buffer to hold the name. A buffer that is `BLE_MAX_ADV_DATA_LEN` bytes long will always be large enough.
- `len` Length of the buffer in bytes.

Returns the size of the name in bytes. Returns 0 if there is no name.

Note that the buf will not be null-terminated (not a c-string).  

#### serviceUUID()

Returns an array of service UUIDs in the advertising data.

```cpp
// PROTOTYPE
size_t serviceUUID(BleUuid* uuids, size_t count) const;
```

- `uuids` Pointer to an array of [`BleUuid`](/reference/device-os/firmware/#bleuuid) objects to fill in
- `len` The number of array entries (not bytes)

Returns the number of UUIDs in the advertisement.

This includes all UUIDs in the following advertising data types:
- `SERVICE_UUID_16BIT_MORE_AVAILABLE`
- `SERVICE_UUID_16BIT_COMPLETE`
- `SERVICE_UUID_128BIT_MORE_AVAILABLE`
- `SERVICE_UUID_128BIT_COMPLETE `

There is often a single UUID advertised, even for devices that have multiple services. For example, a heart rate monitor might only advertise that it's a heart rate monitor even though it also supports the battery service. The additional services can be discovered after connecting.

Since the advertisement data is limited to 31 bytes, the maximum number of services that could be advertised is 14 16-bit UUIDs. 

#### customData()

Returns the `MANUFACTURER_SPECIFIC_DATA` data in an advertisement.

```cpp
// PROTOTYPE
size_t customData(uint8_t* buf, size_t len) const;
```
- `buf` Buffer to hold the data. A buffer that is `BLE_MAX_ADV_DATA_LEN` bytes long will always be large enough.
- `len` Length of the buffer in bytes.

Returns the size of the data in bytes. Returns 0 if there is no `MANUFACTURER_SPECIFIC_DATA`.

#### contains()

Return true if the advertising data contains the specified type.

```cpp
// PROTOTYPE
bool contains(BleAdvertisingDataType type) const;
```

- `type` The data type to look for. For example: `BleAdvertisingDataType::SHORT_LOCAL_NAME`. See [`BleAdvertisingDataType`](/reference/device-os/firmware/#bleadvertisingdatatype).


### BleAdvertisingDataType

The following are the valid values for `BleAdvertisingDataType`. In many cases you won't need to use the directly as you can use methods like `serviceUUID` in the `BleAdvertisingData` to set both the type and data automatically.

You would typically use these constants like this: `BleAdvertisingDataType::FLAGS`. 

You normally don't need to include `BleAdvertisingDataType::FLAGS`, however. If you do not include it, one will be inserted automatically. 

Similarly, you typically use [`appendCustomData()`](/reference/device-os/firmware/#appendcustomdata) instead of directly using `MANUFACTURER_SPECIFIC_DATA`. The [`appendLocalName`()](/reference/device-os/firmware/#appendlocalname-) and [`appendServiceUUID()`](/reference/device-os/firmware/#appendserviceuuid-) functions of the [`BleAdvertisingData`](/reference/device-os/firmware/#bleadvertisingdata) also set the appropriate advertising data type.

- `FLAGS`
- `SERVICE_UUID_16BIT_MORE_AVAILABLE`
- `SERVICE_UUID_16BIT_COMPLETE`
- `SERVICE_UUID_32BIT_MORE_AVAILABLE`
- `SERVICE_UUID_32BIT_COMPLETE`
- `SERVICE_UUID_128BIT_MORE_AVAILABLE`
- `SERVICE_UUID_128BIT_COMPLETE`
- `SHORT_LOCAL_NAME`
- `COMPLETE_LOCAL_NAME`
- `TX_POWER_LEVEL`
- `CLASS_OF_DEVICE`
- `SIMPLE_PAIRING_HASH_C`
- `SIMPLE_PAIRING_RANDOMIZER_R`
- `SECURITY_MANAGER_TK_VALUE`
- `SECURITY_MANAGER_OOB_FLAGS`
- `SLAVE_CONNECTION_INTERVAL_RANGE`
- `SOLICITED_SERVICE_UUIDS_16BIT`
- `SOLICITED_SERVICE_UUIDS_128BIT`
- `SERVICE_DATA`
- `PUBLIC_TARGET_ADDRESS`
- `RANDOM_TARGET_ADDRESS`
- `APPEARANCE`
- `ADVERTISING_INTERVAL`
- `LE_BLUETOOTH_DEVICE_ADDRESS`
- `SIMPLE_PAIRING_HASH_C256`
- `SIMPLE_PAIRING_RANDOMIZER_R256`
- `SERVICE_SOLICITATION_32BIT_UUID`
- `SERVICE_DATA_32BIT_UUID`
- `SERVICE_DATA_128BIT_UUID`
- `LESC_CONFIRMATION_VALUE`
- `LESC_RANDOM_VALUE`
- `INDOOR_POSITIONING`
- `TRANSPORT_DISCOVERY_DATA`
- `LE_SUPPORTED_FEATURES`
- `CHANNEL_MAP_UPDATE_INDICATION`
- `PB_ADV`
- `MESH_MESSAGE`
- `MESH_BEACON`
- `THREE_D_INFORMATION_DATA`
- `MANUFACTURER_SPECIFIC_DATA`

### BleAdvertisingDataType::FLAGS

The valid values for advertising data type flags are:

- `BLE_SIG_ADV_FLAG_LE_LIMITED_DISC_MODE` (0x01)
- `BLE_SIG_ADV_FLAG_LE_GENERAL_DISC_MODE` (0x02)
- `BLE_SIG_ADV_FLAG_BR_EDR_NOT_SUPPORTED` (0x04)
- `BLE_SIG_ADV_FLAG_LE_BR_EDR_CONTROLLER` (0x08)
- `BLE_SIG_ADV_FLAG_LE_BR_EDR_HOST` (0x10)
- `BLE_SIG_ADV_FLAGS_LE_ONLY_LIMITED_DISC_MODE` (0x05)
- `BLE_SIG_ADV_FLAGS_LE_ONLY_GENERAL_DISC_MODE` (0x06)

The most commonly used is `BLE_SIG_ADV_FLAGS_LE_ONLY_GENERAL_DISC_MODE`: supports Bluetooth LE only in general discovery mode. Any nearby device can discover it by scanning. Bluetooth Basic Rate/Enhanced Data Rate (BR/EDT) is not supported. 

You normally don't need to include `BleAdvertisingDataType::FLAGS`, however. If you do not include it, one will be inserted automatically. 


```cpp
// EXAMPLE

// In setup():
BleAdvertisingData advData;

uint8_t flagsValue = BLE_SIG_ADV_FLAGS_LE_ONLY_GENERAL_DISC_MODE;
advData.append(BleAdvertisingDataType::FLAGS, &flagsValue, sizeof(flagsValue));

advData.appendServiceUUID(healthThermometerService);

BLE.advertise(&advData);
```


### BlePeerDevice

When using a Particle device in BLE central mode, connecting a peripheral returns a `BlePeerDevice` object. This object can be used to see if the connection is still open and get [`BleCharacteristic`](/reference/device-os/firmware/#blecharacteristic) objects for the peripheral device.

Typically you'd get the `BlePeerDevice` from calling [`BLE.connect()`](/reference/device-os/firmware/#ble-connect-).

```cpp
BlePeerDevice peer = BLE.connect(scanResults[ii].address);
if (peer.connected()) {
	peerTxCharacteristic = peer.getCharacteristicByUUID(txUuid);
	peerRxCharacteristic = peer.getCharacteristicByUUID(rxUuid);
	// ...
}
```

Once you have the `BlePeerDevice` object you can use the following methods:


#### connected()

Returns true if the peer device is currently connected.

```cpp
// PROTOTYPE
bool connected();

// EXAMPLE
if (peer.connected()) {
	// Peripheral is connected
}
else {
	// Peripheral has disconnected
}
```

#### address()

Get the BLE address of the peripheral device.

```cpp
// PROTOTYPE
const BleAddress& address() const;

// EXAMPLE
Log.trace("Received data from: %02X:%02X:%02X:%02X:%02X:%02X", peer.address()[0], peer.address()[1], peer.address()[2], peer.address()[3], peer.address()[4], peer.address()[5]);
```

See [`BleAddress`](/reference/device-os/firmware/#bleaddress) for more information.

#### getCharacteristicByUUID()

Get a characteristic by its UUID, either short or long UUID. See also [`BleUuid`](/reference/device-os/firmware/#bleuuid). Returns true if the characteristic was found.

You often do this from the central device after making a connection. 

```cpp
// PROTOTYPE
bool getCharacteristicByUUID(BleCharacteristic& characteristic, const BleUuid& uuid) const;

// EXAMPLE
BleCharacteristic characteristic;
bool bResult = peer.getCharacteristicByUUID(characteristic, BleUuid(0x180d));

// EXAMPLE
BleCharacteristic characteristic;
bool bResult = peer.getCharacteristicByUUID(characteristic, BleUuid("6E400002-B5A3-F393-E0A9-E50E24DCCA9E"));
```

#### getCharacteristicByDescription()

Get the characteristic by its description. As these strings are not standardized like UUIDs, it's best to use UUIDs instead. Returns true if the characteristic was found.

```cpp
// PROTOTYPE
bool getCharacteristicByDescription(BleCharacteristic& characteristic, const char* desc) const;
bool getCharacteristicByDescription(BleCharacteristic& characteristic, const String& desc) const;

// EXAMPLE
BleCharacteristic characteristic;
bool bResult = peer.getCharacteristicByDescription(characteristic, "rx");
```

#### BleScanResult

When scanning, you get back one of:

- An array of `BleScanResult` records
- A Vector of `BleScanResult` records
- A callback that is called once for each device found, passed a `BleScanResult`.

The following fields are provided:

```
// DEFINITION
class BleScanResult {
public:
    BleAddress address;
    BleAdvertisingData advertisingData;
    BleAdvertisingData scanResponse;
    int8_t rssi;
};
```

- `address` The BLE address of the peripheral. You use this if you want to connect to it. See [`BleAddress`](/reference/device-os/firmware/#bleaddress).
- `advertisingData` The advertising data provided by the peripheral. It's small (up to 31 bytes).
- `scanResponse` The scan response data. This is an optional extra 31 bytes of data that can be provided by the peripheral. It requires an additional request to the peripheral, but is less overhead than connecting.
- `rssi` The signal strength, which is a negative number of dBm. Numbers closer to 0 are a stronger signal.

### BleAddress

Each Bluetooth device has an address, which is encapsulated in the BleAddress object. The address is 6 octets, and the BleAddress object has two additional bytes of overhead. The BleAddress object can be trivially copied.

#### copy (BleAddress)

You can copy and existing BleAddress.

```
// PROTOTYPE
BleAddress& operator=(hal_ble_addr_t addr)
BleAddress& operator=(const uint8_t addr[BLE_SIG_ADDR_LEN])
```

#### address byte (BleAddress)

The BleAddress is 6 octets long (constant: `BLE_SIG_ADDR_LEN`). You can access individual bytes using array syntax:

```
// PROTOTYPE
uint8_t operator[](uint8_t i) const;

// EXAMPLE
Log.info("rssi=%d address=%02X:%02X:%02X:%02X:%02X:%02X ",
		scanResults[ii].rssi,
		scanResults[ii].address[0], scanResults[ii].address[1], scanResults[ii].address[2],
		scanResults[ii].address[3], scanResults[ii].address[4], scanResults[ii].address[5]);
```

#### equality (BleAddress)

You can test two BleAddress objects for equality (same address).

```
// PROTOTYPE
bool operator==(const BleAddress& addr) const 
```

#### Getters

Often you will get the value of a BleAddress for debugging purposes.

```
// PROTOTYPE
BleAddressType type() const;
void octets(uint8_t addr[BLE_SIG_ADDR_LEN]) const;
String toString(bool stripped = false) const;
size_t toString(char* buf, size_t len, bool stripped = false) const;
hal_ble_addr_t halAddress() const;
uint8_t operator[](uint8_t i) const;

// EXAMPLE 1
Log.info("found device %s", scanResult->address.toString().c_str());

// EXAMPLE 2
Log.info("found device %02X:%02X:%02X:%02X:%02X:%02X",
			scanResult->address[0], scanResult->address[1], scanResult->address[2],
			scanResult->address[3], scanResult->address[4], scanResult->address[5]);
```

#### Constructor

Normally you won't construct a BleAddress as you get one back from scanning using `BLE.scan()`. However there are numerous options:

```
// PROTOTYPE
BleAddress(const hal_ble_addr_t& addr);
BleAddress(const uint8_t addr[BLE_SIG_ADDR_LEN], BleAddressType type = BleAddressType::PUBLIC);
BleAddress(const char* address, BleAddressType type = BleAddressType::PUBLIC);
BleAddress(const String& address, BleAddressType type = BleAddressType::PUBLIC);
```

#### Setters

You will not normally need to set the value of a BleAddress, but there are methods to do so:

```
// PROTOTYPE
int type(BleAddressType type);
int set(const uint8_t addr[BLE_SIG_ADDR_LEN], BleAddressType type = BleAddressType::PUBLIC);
int set(const char* address, BleAddressType type = BleAddressType::PUBLIC);
int set(const String& address, BleAddressType type = BleAddressType::PUBLIC);
```

### BleAddressType

This enumeration specifies the type of BLE address. The default is PUBLIC. The type is part of the BleAddress class.

- `BleAddressType::PUBLIC` Public (identity address).
- `BleAddressType::RANDOM_STATIC` Random static (identity) address.
- `BleAddressType::RANDOM_PRIVATE_RESOLVABLE` Random private resolvable address.
- `BleAddressType::RANDOM_PRIVATE_NON_RESOLVABLE` Random private non-resolvable address.

### BleAdvertisingEventType

You will not typically need to change this. The default is `CONNECTABLE_SCANNABLE_UNDIRECTED` (0).

Valid values include:

- `CONNECTABLE_SCANNABLE_UNDIRECTED`
- `CONNECTABLE_UNDIRECTED`
- `CONNECTABLE_DIRECTED`
- `NON_CONNECTABLE_NON_SCANABLE_UNDIRECTED`
- `NON_CONNECTABLE_NON_SCANABLE_DIRECTED`
- `SCANABLE_UNDIRECTED`
- `SCANABLE_DIRECTED `

### BleAdvertisingParams

To set the parameters for advertising, you can use the BleAdvertisingParams structure:

```cpp
// PROTOTYPE
uint16_t version;
uint16_t size;
uint16_t interval;
uint16_t timeout;
hal_ble_adv_evt_type_t type; 
uint8_t filter_policy;
uint8_t inc_tx_power;
uint8_t reserved;

// EXAMPLE
BleAdvertisingParams param;
param.version = BLE_API_VERSION;
param.size = sizeof(BleAdvertisingParams);
int res = BLE.getAdvertisingParameters(&param);
```

- `version` Always set to `BLE_API_VERSION`.
- `size` Always set to `sizeof(BleAdvertisingParams)`.
- `interval` Advertising interval in 0.625 ms units. Default is 160.
- `timeout` Advertising timeout in 10 ms units. Default is 0.
- `type` See [`BleAdvertisingEventType`](/reference/device-os/firmware/#bleadvertisingeventtype). Default is `CONNECTABLE_SCANNABLE_UNDIRECTED` (0).
- `filter_policy` Default is 0.
- `inc_tx_power` Default is 0.

### BleScanParams

The BleScanParams structure specifies the settings for scanning on a central device.

```cpp
// PROTOTYPE
uint16_t version;
uint16_t size;
uint16_t interval;
uint16_t window;
uint16_t timeout; uint8_t active;
uint8_t filter_policy;

// EXAMPLE
BleScanParams scanParams;
scanParams.version = BLE_API_VERSION;
scanParams.size = sizeof(BleScanParams);
int res = BLE.getScanParameters(&scanParams);
```

- `version` Always set to `BLE_API_VERSION`.
- `size` Always set to `sizeof(BleScanParams)`.
- `interval` Advertising interval in 0.625 ms units. Default is 160.
- `window` Scanning window in 0.625 ms units. Default is 80.
- `timeout` Scan timeout in 10 ms units. Default value is 500.
- `active` Boolean value, typically 1.
- `filter_policy` Default is 0.

### iBeacon

[Apple iOS iBeacon](https://developer.apple.com/ibeacon/) can be used to customize mobile app content based on nearby beacons.

There are three parameters of interest:

| Field | Size  | Description |
| :---: | :---: | --- |
| UUID | 16 bytes | Application developers should define a UUID specific to their app and deployment use case. | 
| Major | 2 bytes | Further specifies a specific iBeacon and use case. For example, this could define a sub-region within a larger region defined by the UUID. |
| Minor | 2 bytes | Allows further subdivision of region or use case, specified by the application developer. |

(From the [Getting Started with iBeacon](https://developer.apple.com/ibeacon/Getting-Started-with-iBeacon.pdf) guide.)

In other words, you'll assign a single UUID to all of the beacons in your fleet of beacons and figure out which one you're at using the major and minor values. When searching for an iBeacon, you need to know the UUID of the beacon you're looking for, so you don't want to assign too many. 

```
// PROTOTYPE
// Type T is any type that can be passed to the BleUuid constructor, such as a BleUuid object, const char *, or Uint16_t.
template<typename T>
iBeacon(uint16_t major, uint16_t minor, T uuid, int8_t measurePower)
    

// EXAMPLE
void setup() {
    iBeacon beacon(1, 2, "9c1b8bdc-5548-4e32-8a78-b9f524131206", -55);
    BLE.advertise(beacon);
}
```

The parameters to the iBeacon constructor in the example are:

- Major version (1)
- Minor version (2)
- Application UUID ("9c1b8bdc-5548-4e32-8a78-b9f524131206")
- Power measurement in dBm (-55)


{{/if}} {{!-- has-ble --}}


{{#if has-nfc-tag}}
## NFC

NFC (Near-Field Communication) is typically used to communicate small amounts of data to a mobile app in very close range, within a few inches.

Particle Gen 3 devices only support emulating an NFC tag. They cannot locate or communicate with tags themselves, or support protocols such as for NFC payments.

A separate antenna is required. NFC uses the unlicensed 13.56 MHz band, and requires a special loop antenna for electromagnetic induction. On the Argon, Boron, and Xenon, the NFC antenna connects to a U.FL connector on the bottom of the board, directly underneath the USB connector.

NFC is supported in Device OS 1.3.1 and later. NFC support was in beta test in Device OS 1.3.0. It is not available in earlier Device OS versions. 

### Example app

You can run this device firmware and use a mobile app like **NFC Reader** to read the NFC data. The blue D7 LED will flash briefly when reading. Each time you read, the counter will increment.

```cpp
#include "Particle.h"

SerialLogHandler logHandler(LOG_LEVEL_TRACE);

SYSTEM_MODE(MANUAL);

static void nfcCallback(nfc_event_type_t type, nfc_event_t* event, void* context);

int counter = 0;
volatile bool updateCounter = true;

void setup (void) {
	pinMode(D7, OUTPUT);
	digitalWrite(D7, 0);
}

void loop(){
	if (updateCounter) {
		updateCounter = false;

		char buf[64];
		snprintf(buf, sizeof(buf), "testing counter=%d", ++counter);

		NFC.setText(buf, "en");
		NFC.on(nfcCallback);

		Log.info("next read should show: %s", buf);
	}
}

static void nfcCallback(nfc_event_type_t type, nfc_event_t* event, void* context) {
	switch (type) {
	case NFC_EVENT_FIELD_ON: {
		digitalWrite(D7, 1);
		break;
	}
	case NFC_EVENT_FIELD_OFF: {
		digitalWrite(D7, 0);
		break;
	}
	case NFC_EVENT_READ: {
		updateCounter = true;
		break;
	}
	default:
		break;
	}
}
```

### NFC.on()

Turn NFC on, optionally with a callback function.

```
// PROTOTYPE
int on(nfc_event_callback_t cb=nullptr);
```

The callback function has this prototype:

```
void nfcCallback(nfc_event_type_t type, nfc_event_t* event, void* context);
```

- `type` The type of event (described below)
- `event` The internal event structure (not currently used)
- `context` An optional context pointer set when the callback is registered (not currently used).

The event types are:

- `NFC_EVENT_FIELD_ON` NFC tag has detected external NFC field and was selected by an NFC polling device.
- `NFC_EVENT_FIELD_OFF` External NFC field has been removed.
- `NFC_EVENT_READ` NFC polling device has read all tag data.

NFC events may occur at interrupt service time. You should not, for example:

- Allocate or free memory (`malloc`, `free`, `new`, `delete`, `strdup`, etc.).
- Call Particle functions like `Particle.publish()`
- Call `delay()`
- Call `Serial.print()`, `Log.info()`, etc.

### NFC.off()

Turns NFC off.

```
// PROTOTYPE
int off();
```

### NFC.update()

Updates the NFC device, usually after changing the data using `NFC.setCustomData()`, `NFC.setText()`, etc..

```
// PROTOTYPE
int update();
```

### NFC.setText()

Sets text to be passed to the NFC reader.

```
// PROTOTYPE
int setText(const char* text, const char* encoding)
```

- `text` A c-string (null-terminated) containing the text to send
- `encoding` The [IANA language code](https://www.iana.org/assignments/language-subtag-registry/language-subtag-registry). For example, "en" for English.

Note that all of the set options are mutually exclusive. Calling `NFC.setText()` will clear any `NFC.setUri()`, `NFC.setLaunchApp()`, etc..

The maximum size is 988 bytes for a single text record. Adding multiple records will add some additional overhead for each NDEF message, 2 - 4 bytes, plus the length of the data.

### NFC.setUri()

Sets a URI as the NFC data. 

```
// PROTOTYPE
int setUri(const char* uri, NfcUriType uriType)

// EXAMPLE

// Open the web site https://www.particle.io:
NFC.setUri("particle.io", NfcUriType::NFC_URI_HTTPS_WWW);
```

The following NfcUriTypes are defined:

| NfcUriType | Prefix |
| --- | --- |
| `NFC_URI_NONE` | (no prefix) |
| `NFC_URI_HTTP_WWW` | "http://www." |
| `NFC_URI_HTTPS_WWW` |  "https://www." |
| `NFC_URI_HTTP` | "http:" |
| `NFC_URI_HTTPS` | "https:" |
| `NFC_URI_TEL` |  "tel:" |
| `NFC_URI_MAILTO` |  "mailto:" |
| `NFC_URI_FTP_ANONYMOUS` |  "ftp://anonymous:anonymous@" |
| `NFC_URI_FTP_FTP` | "ftp://ftp." |
| `NFC_URI_FTPS` |  "ftps://" |
| `NFC_URI_SFTP` |  "sftp://" |
| `NFC_URI_SMB` |  "smb://" |
| `NFC_URI_NFS` |  "nfs://" |
| `NFC_URI_FTP` |  "ftp://" |
| `NFC_URI_DAV` |  "dav://" |
| `NFC_URI_NEWS` | "news:" |
| `NFC_URI_TELNET` |  "telnet://" |
| `NFC_URI_IMAP` |  "imap:" |
| `NFC_URI_RTSP` | "rtsp://" |
| `NFC_URI_URN` |  "urn:" |
| `NFC_URI_POP` |  "pop:" |
| `NFC_URI_SIP` |  "sip:" |
| `NFC_URI_SIPS` |  "sips:" |
| `NFC_URI_TFTP` |  "tftp:" |
| `NFC_URI_BTSPP` |  "btspp://" |
| `NFC_URI_BTL2CAP` |  "btl2cap://" |
| `NFC_URI_BTGOEP` |  "btgoep://" |
| `NFC_URI_TCPOBEX` |  "tcpobex://" |
| `NFC_URI_IRDAOBEX` |  "irdaobex://" |
| `NFC_URI_FILE` |  "file://" |
| `NFC_URI_URN_EPC_ID` |  "urn:epc:id:" |
| `NFC_URI_URN_EPC_TAG` |  "urn:epc:tag:" |
| `NFC_URI_URN_EPC_PAT` |  "urn:epc:pat:" |
| `NFC_URI_URN_EPC_RAW` |  "urn:epc:raw:" |
| `NFC_URI_URN_EPC` |  "urn:epc:" |
| `NFC_URI_URN_NFC` |  "urn:nfc:" |

Note that all of the set options are mutually exclusive. Calling `NFC.setUri()` will clear any setText, setLaunchApp, etc..

The maximum size is 988 bytes for a single record. Adding multiple records will add some additional overhead for each NDEF message, 2 - 4 bytes, plus the length of the data.


### NFC.setLaunchApp()

On Android devices, it's possible to set an app (by its android package name) to launch when the tag is read.

```
// PROTOTYPE
int setLaunchApp(const char* androidPackageName);
```

Note that all of the set options are mutually exclusive. Calling `NFC.setLaunchApp()` will clear any `NFC.setText()`, `NFC.setUri()`, etc..

This does not do anything on iOS. An NFC-aware iOS app can read the package name, but in general won't be able to do much with it.

### NFC.setCustomData()

It's possible to send any NFC-compliant data instead of one of the pre-defined types above. 

```
// PROTOTYPE
int setCustomData(Record& record)
```

Note that all of the set options are mutually exclusive. Calling `NFC.setCustomData()` will clear any `NFC.setText()`, `NFC.setUri()`, etc..

The maximum size is 988 bytes for a single record. Adding multiple records will add some additional overhead for each NDEF message, 2 - 4 bytes, plus the length of the data.

### Record (NFC)

The NFC `Record` class specifies the custom data to be sent via NFC. This section describes the methods you may need to use `BLE.setCustomData()`.

#### setTnf();

```
// PROTOTYPE
void setTnf(Tnf tnf)
```

The valid values for Record::Tnf are:

- `TNF_EMPTY` (0x00)
- `TNF_WELL_KNOWN` (0x01)
- `TNF_MIME_MEDIA` (0x02)
- `TNF_ABSOLUTE_URI` (0x03)
- `TNF_EXTERNAL_TYPE` (0x04)
- `TNF_UNKNOWN` (0x05)
- `TNF_UNCHANGED` (0x06)
- `TNF_RESERVED` (0x07)

#### setType()

Set the type field in the NFC record.

```
// PROTOTYPE
size_t setType(const void* type, uint8_t numBytes);
```

#### setId()

The ID field is optional in NFC. If you are using the ID, call this method to set the value. It will automatically set the IL field in the header.

```
// PROTOTYPE
size_t setId(const void* id, uint8_t numBytes);
```

#### setPayload()

Appends to the NFC record payload.

```
// PROTOTYPE
size_t setPayload(const void* payload, size_t numBytes);
```

Returns the number of bytes added (`numBytes`).

{{/if}} {{!-- has-nfc-tag --}}


{{#if has-cellular}}
## TCPServer

Cellular devices (Boron, B Series SoM, Tracker SoM, Electron, E Series) do not support TCPServer. The cellular modem does not support it, and also the mobile carriers do not support it. You can only make outgoing TCP connections (TCPClient) on cellular devices.
{{/if}}

{{#if has-tcpserver}}
## TCPServer

```cpp
// SYNTAX
TCPServer server = TCPServer(port);
```

Create a server that listens for incoming connections on the specified port.

Parameters: `port`: the port to listen on (`int`)

---

```cpp
// EXAMPLE USAGE

// telnet defaults to port 23
TCPServer server = TCPServer(23);
TCPClient client;

void setup()
{
  // start listening for clients
  server.begin();

  // Make sure your Serial Terminal app is closed before powering your device
  Serial.begin(9600);
  // Wait for a USB serial connection for up to 30 seconds
  waitFor(Serial.isConnected, 30000);

  Log.info("localIP=%s", WiFi.localIP().toString().c_str());
  Log.info("subnetMask=%s", WiFi.subnetMask().toString().c_str());
  Log.info("gatewayIP=%s", WiFi.gatewayIP().toString().c_str());
  Log.info("SSID=%s", WiFi.SSID().toString().c_str());
}

void loop()
{
  if (client.connected()) {
    // echo all available bytes back to the client
    while (client.available()) {
      server.write(client.read());
    }
  } else {
    // if no client is yet connected, check for a new connection
    client = server.available();
  }
}
```


### begin()

Tells the server to begin listening for incoming connections.

```cpp
// SYNTAX
server.begin();
```

### available()

Gets a client that is connected to the server and has data available for reading. The connection persists when the returned client object goes out of scope; you can close it by calling `client.stop()`.

`available()` inherits from the `Stream` utility class.

### write()

Write data to the last client that connected to a server. This data is sent as a byte or series of bytes. This function is blocking by default and may block the application thread indefinitely until all the data is sent.

This function also takes an optional argument `timeout`, which allows the caller to specify the maximum amount of time the function may take. If `timeout` value is specified, write operation may succeed partially and it's up to the caller to check the actual number of bytes written and schedule the next `write()` call in order to send all the data out.

The application code may additionally check if an error occurred during the last `write()` call by checking [`getWriteError()`](#getwriteerror-) return value. Any non-zero error code indicates and error during write operation.


```cpp
// SYNTAX
server.write(val);
server.write(buf, len);
server.write(val, timeout);
server.write(buf, len, timeout);
```

Parameters:

- `val`: a value to send as a single byte (byte or char)
- `buf`: an array to send as a series of bytes (byte or char)
- `len`: the length of the buffer
- `timeout`: timeout in milliseconds (`0` - non-blocking mode)

Returns: `size_t`: the number of bytes written

### print()

Print data to the last client connected to a server. Prints numbers as a sequence of digits, each an ASCII character (e.g. the number 123 is sent as the three characters '1', '2', '3').

```cpp
// SYNTAX
server.print(data);
server.print(data, BASE);
```

Parameters:

- `data`: the data to print (char, byte, int, long, or string)
- `BASE`(optional): the base in which to print numbers: BIN for binary (base 2), DEC for decimal (base 10), OCT for octal (base 8), HEX for hexadecimal (base 16).

Returns: `size_t`: the number of bytes written

### println()

Print data, followed by a newline, to the last client connected to a server. Prints numbers as a sequence of digits, each an ASCII character (e.g. the number 123 is sent as the three characters '1', '2', '3').

```cpp
// SYNTAX
server.println();
server.println(data);
server.println(data, BASE) ;
```

Parameters:

- `data` (optional): the data to print (char, byte, int, long, or string)
- `BASE` (optional): the base in which to print numbers: BIN for binary (base 2), DEC for decimal (base 10), OCT for octal (base 8), HEX for hexadecimal (base 16).

### getWriteError()

Get the error code of the most recent `write()` operation.

Returns: int `0` when everything is ok, a non-zero error code in case of an error.

This value is updated every after every call to `write()` or can be manually cleared by  [`clearWriteError()`](#clearwriteerror-)

```cpp
// SYNTAX
int err = server.getWriteError();
```

```cpp
// EXAMPLE
TCPServer server;
// Write in non-blocking mode to the last client that connected to the server
int bytes = server.write(buf, len, 0);
int err = server.getWriteError();
if (err != 0) {
  Log.trace("TCPServer::write() failed (error = %d), number of bytes written: %d", err, bytes);
}
```

### clearWriteError()

Clears the error code of the most recent `write()` operation setting it to `0`. This function is automatically called by `write()`.

`clearWriteError()` does not return anything.

{{/if}}

{{#if has-tcpclient}}

## TCPClient
(inherits from [`Stream`](#stream-class) via `Client`)

Creates a client which can connect to a specified internet IP address and port (defined in the `client.connect()` function).

```cpp
// SYNTAX
TCPClient client;
```

```cpp
// EXAMPLE USAGE

TCPClient client;
byte server[] = { 74, 125, 224, 72 }; // Google
void setup()
{
  // Make sure your Serial Terminal app is closed before powering your device
  Serial.begin(9600);
  // Wait for a USB serial connection for up to 30 seconds
  waitFor(Serial.isConnected, 30000);

  Serial.println("connecting...");

  if (client.connect(server, 80))
  {
    Serial.println("connected");
    client.println("GET /search?q=unicorn HTTP/1.0");
    client.println("Host: www.google.com");
    client.println("Content-Length: 0");
    client.println();
  }
  else
  {
    Serial.println("connection failed");
  }
}

void loop()
{
  if (client.available())
  {
    char c = client.read();
    Serial.print(c);
  }

  if (!client.connected())
  {
    Serial.println();
    Serial.println("disconnecting.");
    client.stop();
    for(;;);
  }
}
```

{{#if has-cellular}}
**Data Usage Warning**

When using a Particle SIM with the device, be careful interacting with web hosts with `TCPClient` or libraries using `TCPClient`. These can use a lot of data in a short period of time resulting in a higher bill. To keep the data usage low, use [`Particle.publish`](#particle-publish-) along with [webhooks](/tutorials/device-cloud/webhooks/).
{{/if}} {{!-- has-cellular --}}

### connected()

Whether or not the client is connected. Note that a client is considered connected if the connection has been closed but there is still unread data.

```cpp
// SYNTAX
client.connected();
```

Returns true if the client is connected, false if not.

### status()

Returns true if the network socket is open and the underlying network is ready. 

```cpp
// SYNTAX
client.status();
```

This is different than connected() which returns true if the socket is closed but there is still unread buffered data, available() is non-zero.

### connect()

Connects to a specified IP address and port. The return value indicates success or failure. Also supports DNS lookups when using a domain name.

```cpp
// SYNTAX
client.connect();
client.connect(ip, port);
client.connect(hostname, port);
```

Parameters:

- `ip`: the IP address that the client will connect to (array of 4 bytes)
- `hostname`: the host name the client will connect to (string, ex.:"particle.io")
- `port`: the port that the client will connect to (`int`)

Returns true if the connection succeeds, false if not.

### write()

Write data to the server the client is connected to. This data is sent as a byte or series of bytes. This function is blocking by default and may block the application thread indefinitely until all the data is sent.

This function also takes an optional argument `timeout`, which allows the caller to specify the maximum amount of time the function may take. If `timeout` value is specified, write operation may succeed partially and it's up to the caller to check the actual number of bytes written and schedule the next `write()` call in order to send all the data out.

The application code may additionally check if an error occurred during the last `write()` call by checking {{#if has-tcpserver}}[`getWriteError()`](#getwriteerror--1){{/if}}{{#if has-no-tcpserver}}[`getWriteError()`](#getwriteerror-){{/if}} return value. Any non-zero error code indicates and error during write operation.


```cpp
// SYNTAX
client.write(val);
client.write(buf, len);
client.write(val, timeout);
client.write(buf, len, timeout);
```

Parameters:

- `val`: a value to send as a single byte (byte or char)
- `buf`: an array to send as a series of bytes (byte or char)
- `len`: the length of the buffer
- `timeout`: timeout in milliseconds (`0` - non-blocking mode)

Returns: `size_t`: `write()` returns the number of bytes written.

### print()

Print data to the server that a client is connected to. Prints numbers as a sequence of digits, each an ASCII character (e.g. the number 123 is sent as the three characters '1', '2', '3').

```cpp
// SYNTAX
client.print(data);
client.print(data, BASE) ;
```

Parameters:

- `data`: the data to print (char, byte, int, long, or string)
- `BASE`(optional): the base in which to print numbers: BIN for binary (base 2), DEC for decimal (base 10), OCT for octal (base 8), HEX for hexadecimal (base 16).

Returns:  `byte`:  `print()` will return the number of bytes written, though reading that number is optional

### println()

Print data, followed by a carriage return and newline, to the server a client is connected to. Prints numbers as a sequence of digits, each an ASCII character (e.g. the number 123 is sent as the three characters '1', '2', '3').

```cpp
// SYNTAX
client.println();
client.println(data);
client.println(data, BASE) ;
```

Parameters:

- `data` (optional): the data to print (char, byte, int, long, or string)
- `BASE` (optional): the base in which to print numbers: BIN for binary (base 2), DEC for decimal (base 10), OCT for octal (base 8), HEX for hexadecimal (base 16).

### available()

Returns the number of bytes available for reading (that is, the amount of data that has been written to the client by the server it is connected to).

```cpp
// SYNTAX
client.available();
```

Returns the number of bytes available.

### read()
Read the next byte received from the server the client is connected to (after the last call to `read()`).

```cpp
// SYNTAX
client.read();
```

Returns the next byte (or character), or -1 if none is available.

or `int read(uint8_t *buffer, size_t size)` reads all readily available bytes up to `size` from the server the client is connected to into the provided `buffer`.

```cpp
// SYNTAX
bytesRead = client.read(buffer, length);
```

Returns the number of bytes (or characters) read into `buffer`.

### flush()

Waits until all outgoing data in buffer has been sent.

**NOTE:** That this function does nothing at present.

```cpp
// SYNTAX
client.flush();
```

### remoteIP()

{{since when="0.4.5"}}

Retrieves the remote `IPAddress` of a connected `TCPClient`. When the `TCPClient` is retrieved
from `TCPServer.available()` (where the client is a remote client connecting to a local server) the
`IPAddress` gives the remote address of the connecting client.

When `TCPClient` was created directly via `TCPClient.connect()`, then `remoteIP`
returns the remote server the client is connected to.

```cpp

// EXAMPLE - TCPClient from TCPServer

TCPServer server(80);
// ...

void setup()
{
    Serial.begin(9600);
    server.begin(80);
}

void loop()
{
    // check for a new client to our server
    TCPClient client = server.available();
    if (client.connected())
    {
        // we got a new client
        // find where the client's remote address
        IPAddress clientIP = client.remoteIP();
        // print the address to Serial
        Log.info("remoteAddr=%s", clientIP.toString().c_str());
    }
}
```

```cpp
// EXAMPLE - TCPClient.connect()

TCPClient client;
client.connect("www.google.com", 80);
if (client.connected())
{
    IPAddress clientIP = client.remoteIP();
    // IPAddress equals whatever www.google.com resolves to
}

```


### stop()

Disconnect from the server.

```cpp
// SYNTAX
client.stop();
```

### getWriteError()

Get the error code of the most recent `write()` operation.

Returns: int `0` when everything is ok, a non-zero error code in case of an error.


This value is updated every after every call to #write--4 or can be manually cleared by {{#if has-tcpserver}}[`clearWriteError()`](#clearwriteerror--1){{/if}}{{#if has-no-tcpserver}}[`clearWriteError()`](#clearwriteerror-){{/if}}


```cpp
// SYNTAX
int err = client.getWriteError();
```

```cpp
// EXAMPLE
TCPClient client;
// Write in non-blocking mode
int bytes = client.write(buf, len, 0);
int err = client.getWriteError();
if (err != 0) {
  Log.trace("TCPClient::write() failed (error = %d), number of bytes written: %d", err, bytes);
}
```

### clearWriteError()

Clears the error code of the most recent `write()` operation setting it to `0`. This function is automatically called by `write()`.

`clearWriteError()` does not return anything.
{{/if}}

## UDP
(inherits from [`Stream`](#stream-class) and `Printable`)

This class enables UDP messages to be sent and received.

```cpp
// EXAMPLE USAGE
SerialLogHandler logHandler;

// UDP Port used for two way communication
unsigned int localPort = 8888;

// An UDP instance to let us send and receive packets over UDP
UDP Udp;

void setup() {
  // start the UDP
  Udp.begin(localPort);

  // Print your device IP Address via serial
  Serial.begin(9600);
  Log.info("localIP=%s", WiFi.localIP().toString().c_str());
}

void loop() {
  // Check if data has been received
  if (Udp.parsePacket() > 0) {

    // Read first char of data received
    char c = Udp.read();

    // Ignore other chars
    while(Udp.available())
      Udp.read();

    // Store sender ip and port
    IPAddress ipAddress = Udp.remoteIP();
    int port = Udp.remotePort();

    // Echo back data to sender
    Udp.beginPacket(ipAddress, port);
    Udp.write(c);
    Udp.endPacket();
  }
}
```

_Note that UDP does not guarantee that messages are always delivered, or that
they are delivered in the order supplied. In cases where your application
requires a reliable connection, `TCPClient` is a simpler alternative._


There are two primary ways of working with UDP - buffered operation and unbuffered operation.

1. buffered operation allows you to read and write packets in small pieces, since the system takes care of allocating the required buffer to hold the entire packet.
 - to read a buffered packet, call `parsePacket`, then use `available` and `read` to retrieve the packet received
 - to write a buffered packet, optionally call `setBuffer` to set the maximum size of the packet (the default is 512 bytes), followed by
  `beginPacket`, then as many calls to `write`/`print` as necessary to build the packet contents, followed finally by `end` to send the packet over the network.

2. unbuffered operation allows you to read and write entire packets in a single operation - your application is responsible for allocating the buffer to contain the packet to be sent or received over the network.
 - to read an unbuffered packet, call `receivePacket` with a buffer to hold the received packet.
 - to write an unbuffered packet,  call `sendPacket` with the packet buffer to send, and the destination address.


{{#if has-cellular}}
**Data Usage Warning**

When using a Particle SIM with the device, be careful interacting with web hosts with `UDP` or libraries using `UDP`. These can use a lot of data in a short period of time resulting in a higher bill. To keep the data usage low, use [`Particle.publish`](#particle-publish-) along with [webhooks](/tutorials/device-cloud/webhooks/).
{{/if}} {{!-- has-cellular --}}

### begin()

Initializes the UDP library and network settings.

```cpp
// SYNTAX
Udp.begin(port);
```

{{#if has-threading}}

If using [`SYSTEM_THREAD(ENABLED)`](#system-thread), you'll need
to wait until the network is connected before calling `Udp.begin()`.

If you are listening on a specific port, you need to call begin(port) again every time the network is disconnected and reconnects, as well.

```
const int LISTENING_PORT = 8080;

SYSTEM_THREAD(ENABLED);

UDP udp;
bool wasConnected = false;

void setup() {

}

void loop() {
{{#if has-cellular}}
	if (Cellular.ready()) {
{{/if}}
{{#if has-wifi}}
	if (WiFi.ready()) {
{{/if}}

		if (!wasConnected) {
			udp.begin(LISTENING_PORT);
			wasConnected = true;
		}
	}
	else {
		wasConnected = false;
	}
}
```


{{/if}} {{!-- has-threading --}}

### available()

Get the number of bytes (characters) available for reading from the buffer. This is data that's already arrived.

```cpp
// SYNTAX
int count = Udp.available();
```

This function can only be successfully called after `UDP.parsePacket()`.

`available()` inherits from the `Stream` utility class.

Returns the number of bytes available to read.

### beginPacket()

Starts a connection to write UDP data to the remote connection.

```cpp
// SYNTAX
Udp.beginPacket(remoteIP, remotePort);
```

Parameters:

 - `remoteIP`: the IP address of the remote connection (4 bytes)
 - `remotePort`: the port of the remote connection (int)

It returns nothing.

### endPacket()

Called after writing buffered UDP data using `write()` or `print()`. The buffered data is then sent to the
remote UDP peer.


```cpp
// SYNTAX
Udp.endPacket();
```

Parameters: NONE

### write()

Writes UDP data to the buffer - no data is actually sent. Must be wrapped between `beginPacket()` and `endPacket()`. `beginPacket()` initializes the packet of data, it is not sent until `endPacket()` is called.

```cpp
// SYNTAX
Udp.write(message);
Udp.write(buffer, size);
```

Parameters:

 - `message`: the outgoing message (char)
 - `buffer`: an array to send as a series of bytes (byte or char)
 - `size`: the length of the buffer

Returns:

 - `byte`: returns the number of characters sent. This does not have to be read


### receivePacket()

```cpp
// PROTOTYPES
int receivePacket(uint8_t* buffer, size_t buf_size, system_tick_t timeout = 0)
int receivePacket(char* buffer, size_t buf_size, system_tick_t timeout = 0)

// SYNTAX
size = Udp.receivePacket(buffer, size);
// EXAMPLE USAGE - get a string without buffer copy
UDP Udp;
char message[128];
int port = 8888;
int rxError = 0;

Udp.begin (port);
int count = Udp.receivePacket((byte*)message, 127);
if (count >= 0 && count < 128) {
  message[count] = 0;
  rxError = 0;
} else if (count < -1) {
  rxError = count;
  // need to re-initialize on error
  Udp.begin(port);
}
if (!rxError) {
  Log.info(message);
}
```

Checks for the presence of a UDP packet and returns the size. Note that it is possible to receive a valid packet of zero bytes, this will still return the sender's address and port after the call to receivePacket().

Parameters:
 - `buffer`: the buffer to hold any received bytes (uint8_t).
 - `buf_size`: the size of the buffer.
 - `timeout`: The timeout to wait for data in milliseconds, or 0 to not block in Device OS 2.0.0 and later. Prior to 2.0.0 this function did not block.

Returns:

 - `int`: on success the size (greater then or equal to zero) of a received UDP packet. On failure the internal error code.


### parsePacket()

Checks for the presence of a UDP packet, and reports the size. `parsePacket()` must be called before reading the buffer with `UDP.read()`.

It's usually more efficient to use `receivePacket()` instead of `parsePacket()` and `read()`.

```cpp
// PROTOTYPE
int parsePacket(system_tick_t timeout = 0);

// SYNTAX
size = Udp.parsePacket();
```

Parameters: 

- `timeout`: The timeout to wait for data in milliseconds, or 0 to not block in Device OS 2.0.0 and later. Prior to 2.0.0 this function did not block

Returns:

 - `int`: the size of a received UDP packet

### read()

Reads UDP data from the specified buffer. If no arguments are given, it will return the next character in the buffer.

This function can only be successfully called after `UDP.parsePacket()`.

```cpp
// SYNTAX
count = Udp.read();
count = Udp.read(packetBuffer, MaxSize);
```
Parameters:

 - `packetBuffer`: buffer to hold incoming packets (char)
 - `MaxSize`: maximum size of the buffer (int)

Returns:

 - `int`: returns the character in the buffer or -1 if no character is available

### flush()

Waits until all outgoing data in buffer has been sent.

**NOTE:** That this function does nothing at present.

```cpp
// SYNTAX
Udp.flush();
```

### stop()

Disconnect from the server. Release any resource being used during the UDP session.

```cpp
// SYNTAX
Udp.stop();
```

Parameters: NONE

### remoteIP()

Returns the IP address of sender of the packet parsed by `Udp.parsePacket()`/`Udp.receivePacket()`.

```cpp
// SYNTAX
ip = Udp.remoteIP();
```

Parameters: NONE

Returns:

 - IPAddress : the IP address of the sender of the packet parsed by `Udp.parsePacket()`/`Udp.receivePacket()`.

### remotePort()

Returns the port from which the UDP packet was sent. The packet is the one most recently processed by `Udp.parsePacket()`/`Udp.receivePacket()`.

```cpp
// SYNTAX
int port = Udp.remotePort();
```

Parameters: NONE

Returns:

- `int`: the port from which the packet parsed by `Udp.parsePacket()`/`Udp.receivePacket()` was sent.


### setBuffer()

{{since when="0.4.5"}}

Initializes the buffer used by a `UDP` instance for buffered reads/writes. The buffer
is used when your application calls `beginPacket()` and `parsePacket()`.  If `setBuffer()` isn't called,
the buffer size defaults to 512 bytes, and is allocated when buffered operation is initialized via `beginPacket()` or `parsePacket()`.

```cpp
// SYNTAX
Udp.setBuffer(size); // dynamically allocated buffer
Udp.setBuffer(size, buffer); // application provided buffer

// EXAMPLE USAGE - dynamically allocated buffer
UDP Udp;

// uses a dynamically allocated buffer that is 1024 bytes in size
if (!Udp.setBuffer(1024))
{
    // on no, couldn't allocate the buffer
}
else
{
    // 'tis good!
}
```

```cpp
// EXAMPLE USAGE - application-provided buffer
UDP Udp;

uint8_t appBuffer[800];
Udp.setBuffer(800, appBuffer);
```

Parameters:

- `unsigned int`: the size of the buffer
- `pointer`:  the buffer. If not provided, or `NULL` the system will attempt to
 allocate a buffer of the size requested.

Returns:
- `true` when the buffer was successfully allocated, `false` if there was insufficient memory. (For application-provided buffers
the function always returns `true`.)

### releaseBuffer()

{{since when="0.4.5"}}

Releases the buffer previously set by a call to `setBuffer()`.

```cpp
// SYNTAX
Udp.releaseBuffer();
```

_This is typically required only when performing advanced memory management and the UDP instance is
not scoped to the lifetime of the application._

### sendPacket()

{{since when="0.4.5"}}

Sends a packet, unbuffered, to a remote UDP peer.

```cpp
// SYNTAX
Udp.sendPacket(buffer, bufferSize, remoteIP, remotePort);

// EXAMPLE USAGE
UDP Udp;

char buffer[] = "Particle powered";

IPAddress remoteIP(192, 168, 1, 100);
int port = 1337;

void setup() {
  // Required for two way communication
  Udp.begin(8888);

  if (Udp.sendPacket(buffer, sizeof(buffer), remoteIP, port) < 0) {
    Particle.publish("Error");
  }
}
```

Parameters:
- `pointer` (buffer): the buffer of data to send
- `int` (bufferSize): the number of bytes of data to send
- `IPAddress` (remoteIP): the destination address of the remote peer
- `int` (remotePort): the destination port of the remote peer

Returns:
- `int`: The number of bytes written. Negative value on error.

{{#if has-udp-multicast}}
### joinMulticast()

{{since when="0.4.5"}}

Join a multicast address for all UDP sockets which are on the same network interface as this one.

```cpp
// SYNTAX
Udp.joinMulticast(IPAddress& ip);

// EXAMPLE USAGE
UDP Udp;

int remotePort = 1024;
IPAddress multicastAddress(224,0,0,0);

Udp.begin(remotePort);
Udp.joinMulticast(multicastAddress);
```

This will allow reception of multicast packets sent to the given address for UDP sockets
which have bound the port to which the multicast packet was sent.
Must be called only after `begin()` so that the network interface is established.

### leaveMulticast()

{{since when="0.4.5"}}

Leaves a multicast group previously joined on a specific multicast address.

```cpp
// SYNTAX
Udp.leaveMulticast(multicastAddress);

// EXAMPLE USAGE
UDP Udp;
IPAddress multicastAddress(224,0,0,0);
Udp.leaveMulticast(multicastAddress);
```

{{/if}} {{!-- has-udp-multicast --}}

## Servo

This library allows your device to control RC (hobby) servo motors. Servos have integrated gears and a shaft that can be precisely controlled. Standard servos allow the shaft to be positioned at various angles, usually between 0 and 180 degrees. Continuous rotation servos allow the rotation of the shaft to be set to various speeds.

This example uses pin D0, but D0 cannot be used for Servo on all devices.

```cpp
// EXAMPLE CODE

Servo myservo;  // create servo object to control a servo
                // a maximum of eight servo objects can be created

int pos = 0;    // variable to store the servo position

void setup()
{
  myservo.attach(D0);  // attaches the servo on the D0 pin to the servo object
  // Only supported on pins that have PWM
}


void loop()
{
  for(pos = 0; pos < 180; pos += 1)  // goes from 0 degrees to 180 degrees
  {                                  // in steps of 1 degree
    myservo.write(pos);              // tell servo to go to position in variable 'pos'
    delay(15);                       // waits 15ms for the servo to reach the position
  }
  for(pos = 180; pos>=1; pos-=1)     // goes from 180 degrees to 0 degrees
  {
    myservo.write(pos);              // tell servo to go to position in variable 'pos'
    delay(15);                       // waits 15ms for the servo to reach the position
  }
}
```

**NOTE:** Unlike Arduino, you do not need to include `Servo.h`; it is included automatically.

{{#if has-nrf52}}
**NOTE:** Servo is only supported on Gen 3 devices in Device OS 0.8.0-rc.26 and later.
{{/if}}


### attach()

Set up a servo on a particular pin. Note that, Servo can only be attached to pins with a timer.

- on the Photon, Servo can be connected to A4, A5, WKP, RX, TX, D0, D1, D2, D3
- on the P1, Servo can be connected to A4, A5, WKP, RX, TX, D0, D1, D2, D3, P1S0, P1S1
- on the Electron, Servo can be connected to A4, A5, WKP, RX, TX, D0, D1, D2, D3, B0, B1, B2, B3, C4, C5
- on Gen 3 Argon, Boron, and Xenon devices, pin A0, A1, A2, A3, D2, D3, D4, D5, D6, and D8 can be used for Servo.
- On Gen 3 B Series SoM devices, pins A0, A1, A6, A7, D4, D5, and D6 can be used for Servo.
- On Gen 3 Tracker SoM devices, pins D0 - D9 can be used for Servo.

```cpp
// SYNTAX
servo.attach(pin)
```

### write()

Writes a value to the servo, controlling the shaft accordingly. On a standard servo, this will set the angle of the shaft (in degrees), moving the shaft to that orientation. On a continuous rotation servo, this will set the speed of the servo (with 0 being full-speed in one direction, 180 being full speed in the other, and a value near 90 being no movement).

```cpp
// SYNTAX
servo.write(angle)
```

### writeMicroseconds()

Writes a value in microseconds (uS) to the servo, controlling the shaft accordingly. On a standard servo, this will set the angle of the shaft. On standard servos a parameter value of 1000 is fully counter-clockwise, 2000 is fully clockwise, and 1500 is in the middle.

```cpp
// SYNTAX
servo.writeMicroseconds(uS)
```

Note that some manufactures do not follow this standard very closely so that servos often respond to values between 700 and 2300. Feel free to increase these endpoints until the servo no longer continues to increase its range. Note however that attempting to drive a servo past its endpoints (often indicated by a growling sound) is a high-current state, and should be avoided.

Continuous-rotation servos will respond to the writeMicrosecond function in an analogous manner to the write function.


### read()

Read the current angle of the servo (the value passed to the last call to write()). Returns an integer from 0 to 180 degrees.

```cpp
// SYNTAX
servo.read()
```

### attached()

Check whether the Servo variable is attached to a pin. Returns a boolean.

```cpp
// SYNTAX
servo.attached()
```

### detach()

Detach the Servo variable from its pin.

```cpp
// SYNTAX
servo.detach()
```

{{since when="2.0.0"}}

In Device OS 2.0.0 and later, the destructor for Servo will detach from the pin allowing it to be used as a regular GPIO again.

### setTrim()

Sets a trim value that allows minute timing adjustments to correctly
calibrate 90 as the stationary point.

```cpp
// SYNTAX

// shortens the pulses sent to the servo
servo.setTrim(-3);

// a larger trim value
servo.setTrim(30);

// removes any previously configured trim
servo.setTrim(0);
```

{{#if has-rgb}}

## RGB

This library allows the user to control the RGB LED on the front of the device.

```cpp
// EXAMPLE CODE

// take control of the LED
RGB.control(true);

// red, green, blue, 0-255.
// the following sets the RGB LED to white:
RGB.color(255, 255, 255);

// wait one second
delay(1000);

// scales brightness of all three colors, 0-255.
// the following sets the RGB LED brightness to 25%:
RGB.brightness(64);

// wait one more second
delay(1000);

// resume normal operation
RGB.control(false);
```

### control(user_control)

User can take control of the RGB LED, or give control back to the system.

```cpp
// take control of the RGB LED
RGB.control(true);

// resume normal operation
RGB.control(false);
```

### controlled()

Returns Boolean `true` when the RGB LED is under user control, or `false` when it is not.

```cpp
// take control of the RGB LED
RGB.control(true);

// Print true or false depending on whether
// the RGB LED is currently under user control.
// In this case it prints "true".
Serial.println(RGB.controlled());

// resume normal operation
RGB.control(false);
```

### color(red, green, blue)

Set the color of the RGB with three values, 0 to 255 (0 is off, 255 is maximum brightness for that color).  User must take control of the RGB LED before calling this method.

```cpp
// Set the RGB LED to red
RGB.color(255, 0, 0);

// Sets the RGB LED to cyan
RGB.color(0, 255, 255);

// Sets the RGB LED to white
RGB.color(255, 255, 255);
```

### brightness(val)

Scale the brightness value of all three RGB colors with one value, 0 to 255 (0 is 0%, 255 is 100%).  This setting persists after `RGB.control()` is set to `false`, and will govern the overall brightness of the RGB LED under normal system operation. User must take control of the RGB LED before calling this method.

```cpp
// Scale the RGB LED brightness to 25%
RGB.brightness(64);

// Scale the RGB LED brightness to 50%
RGB.brightness(128);

// Scale the RGB LED brightness to 100%
RGB.brightness(255);
```

### brightness()

Returns current brightness value.

```cpp
// EXAMPLE

uint8_t value = RGB.brightness();
```

### onChange(handler)

Specifies a function to call when the color of the RGB LED changes. It can be used to implement an external RGB LED.

```cpp
// EXAMPLE USAGE

void ledChangeHandler(uint8_t r, uint8_t g, uint8_t b) {
  // Duplicate the green color to an external LED
  analogWrite(D0, g);
}

void setup()
{
  pinMode(D0, OUTPUT);
  RGB.onChange(ledChangeHandler);
}

```

---

`onChange` can also call a method on an object.

```
// Automatically mirror the onboard RGB LED to an external RGB LED
// No additional code needed in setup() or loop()

class ExternalRGB {
  public:
    ExternalRGB(pin_t r, pin_t g, pin_t b) : pin_r(r), pin_g(g), pin_b(b) {
      pinMode(pin_r, OUTPUT);
      pinMode(pin_g, OUTPUT);
      pinMode(pin_b, OUTPUT);
      RGB.onChange(&ExternalRGB::handler, this);
    }

    void handler(uint8_t r, uint8_t g, uint8_t b) {
      analogWrite(pin_r, 255 - r);
      analogWrite(pin_g, 255 - g);
      analogWrite(pin_b, 255 - b);
    }

    private:
      pin_t pin_r;
      pin_t pin_g;
      pin_t pin_b;
};

// Connect an external RGB LED to D0, D1 and D2 (R, G, and B)
ExternalRGB myRGB(D0, D1, D2);
```

The onChange handler is called 1000 times per second so you should be careful to not do any lengthy computations or functions that take a long time to execute. Do not call functions like Log.info, Serial.print, or Particle.publish from the onChange handler. Instead, save the values from onChange in global variables and handle lengthy operations from loop if you need to do lengthy operations.

{{#if has-rgb-mirror}}

### mirrorTo()

{{since when="0.6.1"}}

Allows a set of PWM pins to mirror the functionality of the on-board RGB LED.

```cpp
// SYNTAX
// Common-cathode RGB LED connected to A4 (R), A5 (G), A7 (B)
RGB.mirrorTo(A4, A5, A7);
// Common-anode RGB LED connected to A4 (R), A5 (G), A7 (B)
RGB.mirrorTo(A4, A5, A7, true);
// Common-anode RGB LED connected to A4 (R), A5 (G), A7 (B)
// Mirroring is enabled in firmware _and_ bootloader
RGB.mirrorTo(A4, A5, A7, true, true);
// Enable RGB LED mirroring as soon as the device starts up
STARTUP(RGB.mirrorTo(A4, A5, A7));
```

Parameters:
  - `pinr`: PWM-enabled pin number connected to red LED (see [`analogWrite()`](#analogwrite-pwm-) for a list of PWM-capable pins)
  - `ping`: PWM-enabled pin number connected to green LED (see [`analogWrite()`](#analogwrite-pwm-) for a list of PWM-capable pins)
  - `pinb`: PWM-enabled pin number connected to blue LED (see [`analogWrite()`](#analogwrite-pwm-) for a list of PWM-capable pins)
  - `invert` (optional): `true` if the connected RGB LED is common-anode, `false` if common-cathode (default).
  - `bootloader` (optional): if `true`, the RGB mirroring settings are saved in DCT and are used by the bootloader. If `false`, any previously stored configuration is removed from the DCT and RGB mirroring only works while the firmware is running (default). Do not use the `true` option for `bootloader` from `STARTUP()`.

### mirrorDisable()

{{since when="0.6.1"}}

Disables RGB LED mirroring.

Parameters:
  - bootloader: if `true`, RGB mirroring configuration stored in DCT is also cleared disabling RGB mirroring functionality in bootloader (default)

{{/if}} {{!-- has-rgb-mirror --}}

## LED Signaling

{{since when="0.6.1"}}

This library allows applications to share control over the on-device RGB
LED with the Device OS in a non-exclusive way, making it possible for the system to use the LED for various important indications, such as cloud connection errors, even if an application already uses the LED for its own signaling. For this to work, an application needs to assign a [_priority_](#ledpriority-enum) to every application-specific LED indication (using instances of the [`LEDStatus`](#ledstatus-class) class), and the system will ensure that the LED only shows a highest priority indication at any moment of time.

The library also allows to set a custom [_theme_](#ledsystemtheme-class) for the system LED signaling. Refer to the [Device Modes](/tutorials/device-os/led/) and [LEDSignal Enum](#ledsignal-enum) sections for information about default LED signaling patterns used by the system.

**Note:** Consider using this library instead of the [RGB API](#rgb) for all application-specific LED signaling, unless a low-level control over the LED is required.

### LEDStatus Class

This class allows to define a _LED status_ that represents an application-specific LED indication. Every LED status is described by a signaling [pattern](#ledpattern-enum), [speed](#ledspeed-enum) and [color](#rgb-colors) parameters. Typically, applications use separate status instance for each application state that requires LED indication.

```cpp
// EXAMPLE - defining and using a LED status
LEDStatus blinkRed(RGB_COLOR_RED, LED_PATTERN_BLINK, LED_SPEED_NORMAL, LED_PRIORITY_IMPORTANT);

void setup() {
    // Blink red for 3 seconds after connecting to the Cloud
    blinkRed.setActive(true);
    delay(3000);
    blinkRed.setActive(false);
}

void loop() {
}
```

In the provided example, the application defines a single LED status (`blinkRed`) and activates it for 3 seconds, causing the LED to start blinking in red color. Note that there is no need to toggle the LED on and off manually – this is done automatically by the system, according to the parameters passed to the status instance.

#### LEDStatus()

Constructs a status instance. Initially, a newly constructed status instance is set to inactive state and doesn't affect the LED until [setActive()](#setactive-) method is called by an application to activate this instance.

```cpp
// SYNTAX
LEDStatus::LEDStatus(uint32_t color = RGB_COLOR_WHITE, LEDPattern pattern = LED_PATTERN_SOLID, LEDPriority priority = LED_PRIORITY_NORMAL); // 1
LEDStatus::LEDStatus(uint32_t color, LEDPattern pattern, LEDSpeed speed, LEDPriority priority = LED_PRIORITY_NORMAL); // 2
LEDStatus::LEDStatus(uint32_t color, LEDPattern pattern, uint16_t period, LEDPriority priority = LED_PRIORITY_NORMAL); // 3
LEDStatus::LEDStatus(LEDPattern pattern, LEDPriority priority = LED_PRIORITY_NORMAL); // 4

// EXAMPLE - constructing LEDStatus instance
// Solid green; normal priority (default)
LEDStatus status1(RGB_COLOR_GREEN);
// Blinking blue; normal priority (default)
LEDStatus status2(RGB_COLOR_BLUE, LED_PATTERN_BLINK);
// Fast blinking blue; normal priority (default)
LEDStatus status3(RGB_COLOR_BLUE, LED_PATTERN_BLINK, LED_SPEED_FAST);
// Breathing red with custom pattern period; important priority
LEDStatus status4(RGB_COLOR_RED, LED_PATTERN_FADE, 1000 /* 1 second */, LED_PRIORITY_IMPORTANT);
```

Parameters:

  * `color` : [RGB color](#rgb-colors) (`uint32_t`, default value is `RGB_COLOR_WHITE`)
  * `pattern` : pattern type ([`LEDPattern`](#ledpattern-enum), default value is `LED_PATTERN_SOLID`)
  * `speed` : pattern speed ([`LEDSpeed`](#ledspeed-enum), default value is `LED_SPEED_NORMAL`)
  * `period` : pattern period in milliseconds (`uint16_t`)
  * `priority` : status priority ([`LEDPriority`](#ledpriority-enum), default value is `LED_PRIORITY_NORMAL`)

#### setColor()

Sets status color.

```cpp
// SYNTAX
void LEDStatus::setColor(uint32_t color);
uint32_t LEDStatus::color() const;

// EXAMPLE - setting and getting status color
LEDStatus status;
status.setColor(RGB_COLOR_BLUE);
uint32_t color = status.color(); // Returns 0x000000ff
```

Parameters:

  * `color` : [RGB color](#rgb-colors) (`uint32_t`)

#### color()

Returns status color (`uint32_t`).

#### setPattern()

Sets pattern type.

```cpp
// SYNTAX
void LEDStatus::setPattern(LEDPattern pattern);
LEDPattern LEDStatus::pattern() const;

// EXAMPLE - setting and getting pattern type
LEDStatus status;
status.setPattern(LED_PATTERN_BLINK);
LEDPattern pattern = status.pattern(); // Returns LED_PATTERN_BLINK
```

Parameters:

  * `pattern` : pattern type ([`LEDPattern`](#ledpattern-enum))

#### pattern()

Returns pattern type ([`LEDPattern`](#ledpattern-enum)).

#### setSpeed()

Sets pattern speed. This method resets pattern period to a system-default value that depends on specified pattern speed and current pattern type set for this status instance.

```cpp
// SYNTAX
void LEDStatus::setSpeed(LEDSpeed speed);

// EXAMPLE - setting pattern speed
LEDStatus status;
status.setSpeed(LED_SPEED_FAST);
```

Parameters:

  * `speed` : pattern speed ([`LEDSpeed`](#ledspeed-enum))

#### setPeriod()

Sets pattern period. Pattern period specifies duration of a signaling pattern in milliseconds. For example, given the pattern type `LED_PATTERN_BLINK` (blinking color) with period set to 1000 milliseconds, the system will toggle the LED on and off every 500 milliseconds.

```cpp
// SYNTAX
void LEDStatus::setPeriod(uint16_t period);
uint16_t LEDStatus::period() const;

// EXAMPLE - setting and getting pattern period
LEDStatus status;
status.setPeriod(1000); // 1 second
uint16_t period = status.period(); // Returns 1000
```

Parameters:

  * `period` : pattern period in milliseconds (`uint16_t`)

#### period()

Returns pattern period in milliseconds (`uint16_t`).

#### setPriority()

Sets status priority. Note that a newly assigned priority will take effect only after [`setActive()`](#setactive-) method is called for the next time.

```cpp
// SYNTAX
void LEDStatus::setPriority(LEDPriority priority);
LEDPriority LEDStatus::priority() const;

// EXAMPLE - setting and getting status priority
LEDStatus status;
status.setPriority(LED_PRIORITY_IMPORTANT);
LEDPriority priority = status.priority(); // Returns LED_PRIORITY_IMPORTANT
```

Parameters:

  * `priority` : status priority ([`LEDPriority`](#ledpriority-enum))

#### priority()

Returns status priority ([`LEDPriority`](#ledpriority-enum)).

#### on()

Turns the LED on.

```cpp
// SYNTAX
void LEDStatus::on();
void LEDStatus::off();
void LEDStatus::toggle();
bool LEDStatus::isOn() const;
bool LEDStatus::isOff() const;

// EXAMPLE - turning the LED on and off
LEDStatus status;
status.off(); // Turns the LED off
bool on = status.isOn(); // Returns false

status.on(); // Turns the LED on
on = status.isOn(); // Returns true

status.toggle(); // Toggles the LED
on = status.isOn(); // Returns false
status.toggle();
on = status.isOn(); // Returns true
```

#### off()

Turns the LED off.

#### toggle()

Toggles the LED on or off.

#### isOn()

Returns `true` if the LED is turned on, or `false` otherwise.

#### isOff()

Returns `true` if the LED turned off, or `false` otherwise.

#### setActive()

Activates or deactivates this status instance. The overloaded method that takes `priority` argument assigns a new priority to this status instance before activating it.

```cpp
// SYNTAX
void LEDStatus::setActive(bool active = true); // 1
void LEDStatus::setActive(LEDPriority priority); // 2
bool LEDStatus::isActive() const;

// EXAMPLE - activating and deactivating a status instance
LEDStatus status;
status.setActive(true); // Activates status
bool active = status.isActive(); // Returns true

status.setActive(false); // Deactivates status
active = status.isActive(); // Returns false

status.setActive(LED_PRIORITY_IMPORTANT); // Activates status with new priority
LEDPriority priority = status.priority(); // Returns LED_PRIORITY_IMPORTANT
active = status.isActive(); // Returns true
```

Parameters:

  * `active` : whether the status should be activated (`true`) or deactivated (`false`). Default value is `true`
  * `priority` : status priority ([`LEDPriority`](#ledpriority-enum))

#### isActive()

Returns `true` if this status is active, or `false` otherwise.

#### Custom Patterns

`LEDStatus` class can be subclassed to implement a custom signaling pattern.

```cpp
// EXAMPLE - implementing a custom signaling pattern
class CustomStatus: public LEDStatus {
public:
    explicit CustomStatus(LEDPriority priority) :
        LEDStatus(LED_PATTERN_CUSTOM, priority),
        colorIndex(0),
        colorTicks(0) {
    }

protected:
    virtual void update(system_tick_t ticks) override {
        // Change status color every 300 milliseconds
        colorTicks += ticks;
        if (colorTicks > 300) {
            if (++colorIndex == colorCount) {
                colorIndex = 0;
            }
            setColor(colors[colorIndex]);
            colorTicks = 0;
        }
    }

private:
    size_t colorIndex;
    system_tick_t colorTicks;

    static const uint32_t colors[];
    static const size_t colorCount;
};

const uint32_t CustomStatus::colors[] = {
    RGB_COLOR_MAGENTA,
    RGB_COLOR_BLUE,
    RGB_COLOR_CYAN,
    RGB_COLOR_GREEN,
    RGB_COLOR_YELLOW
};

const size_t CustomStatus::colorCount =
    sizeof(CustomStatus::colors) /
    sizeof(CustomStatus::colors[0]);

CustomStatus customStatus(LED_PRIORITY_IMPORTANT);

void setup() {
    // Activate custom status
    customStatus.setActive(true);
}

void loop() {
}
```

In the provided example, `CustomStatus` class implements a signaling pattern that alternates between some of the predefined colors.

Any class implementing a custom pattern needs to pass `LED_PATTERN_CUSTOM` pattern type to the constructor of the base `LEDStatus` class and reimplement its `update()` method. Once an instance of such class is activated, the system starts to call its `update()` method periodically in background, passing number of milliseconds passed since previous update in `ticks` argument.

**Note:** The system may call `update()` method within an ISR. Ensure provided implementation doesn't make any blocking calls, returns as quickly as possible, and, ideally, only updates internal timing and makes calls to `setColor()`, `setActive()` and other methods of the base `LEDStatus` class.

### LEDSystemTheme Class

This class allows to set a custom theme for the system LED signaling. Refer to the [LEDSignal Enum](#ledsignal-enum) section for the list of LED signals defined by the system.

```cpp
// EXAMPLE - setting custom colors for network status indication
LEDSystemTheme theme;
theme.setColor(LED_SIGNAL_NETWORK_OFF, RGB_COLOR_GRAY);
theme.setColor(LED_SIGNAL_NETWORK_ON, RGB_COLOR_WHITE);
theme.setColor(LED_SIGNAL_NETWORK_CONNECTING, RGB_COLOR_YELLOW);
theme.setColor(LED_SIGNAL_NETWORK_DHCP, RGB_COLOR_YELLOW);
theme.setColor(LED_SIGNAL_NETWORK_CONNECTED, RGB_COLOR_YELLOW);
theme.apply(); // Apply theme settings
```

#### LEDSystemTheme()

Constructs a theme instance and initializes it with current system settings.

```cpp
// SYNTAX
LEDSystemTheme::LEDSystemTheme();

// EXAMPLE - constructing theme instance
LEDSystemTheme theme;
```

#### setColor()

Sets signal color.

```cpp
// SYNTAX
void LEDSystemTheme::setColor(LEDSignal signal, uint32_t color);
uint32_t LEDSystemTheme::color(LEDSignal signal) const;

// EXAMPLE - setting and getting signal color
LEDSystemTheme theme;
theme.setColor(LED_SIGNAL_NETWORK_ON, RGB_COLOR_BLUE);
uint32_t color = theme.color(LED_SIGNAL_NETWORK_ON); // Returns 0x000000ff
```

Parameters:

  * `signal` : LED signal ([`LEDSignal`](#ledsignal-enum))
  * `color` : [RGB color](#rgb-colors) (`uint32_t`)

#### color()

Returns signal color (`uint32_t`).

#### setPattern()

Sets signal pattern.

```cpp
// SYNTAX
void LEDSystemTheme::setPattern(LEDSignal signal, LEDPattern pattern);
LEDPattern LEDSystemTheme::pattern(LEDSignal signal) const;

// EXAMPLE - setting and getting signal pattern
LEDSystemTheme theme;
theme.setPattern(LED_SIGNAL_NETWORK_ON, LED_PATTERN_BLINK);
LEDPattern pattern = theme.pattern(LED_SIGNAL_NETWORK_ON); // Returns LED_PATTERN_BLINK
```

Parameters:

  * `signal` : LED signal ([`LEDSignal`](#ledsignal-enum))
  * `pattern` : pattern type ([`LEDPattern`](#ledpattern-enum))

#### pattern()

Returns signal pattern ([`LEDPattern`](#ledpattern-enum)).

#### setSpeed()

Sets signal speed.

```cpp
// SYNTAX
void LEDSystemTheme::setSpeed(LEDSignal signal, LEDSpeed speed);

// EXAMPLE - setting signal speed
LEDSystemTheme theme;
theme.setSpeed(LED_SIGNAL_NETWORK_ON, LED_SPEED_FAST);
```

Parameters:

  * `signal` : LED signal ([`LEDSignal`](#ledsignal-enum))
  * `speed` : pattern speed ([`LEDSpeed`](#ledspeed-enum))

#### setPeriod()

Sets signal period.

```cpp
// SYNTAX
void LEDSystemTheme::setPeriod(LEDSignal signal, uint16_t period);
uint16_t LEDSystemTheme::period(LEDSignal signal) const;

// EXAMPLE - setting and getting signal period
LEDSystemTheme theme;
theme.setPeriod(LED_SIGNAL_NETWORK_ON, 1000); // 1 second
uint16_t period = theme.period(); // Returns 1000
```

Parameters:

  * `signal` : LED signal ([`LEDSignal`](#ledsignal-enum))
  * `period` : pattern period in milliseconds (`uint16_t`)

#### period()

Returns signal period in milliseconds (`uint16_t`).

#### setSignal()

Sets several signal parameters at once.

```cpp
// SYNTAX
void LEDSystemTheme::setSignal(LEDSignal signal, uint32_t color); // 1
void LEDSystemTheme::setSignal(LEDSignal signal, uint32_t color, LEDPattern pattern, LEDSpeed speed = LED_SPEED_NORMAL); // 2
void LEDSystemTheme::setSignal(LEDSignal signal, uint32_t color, LEDPattern pattern, uint16_t period); // 3

// EXAMPLE - setting signal parameters
LEDSystemTheme theme;
theme.setSignal(LED_SIGNAL_NETWORK_ON, RGB_COLOR_BLUE, LED_PATTERN_BLINK, LED_SPEED_FAST);
```

Parameters:

  * `signal` : LED signal ([`LEDSignal`](#ledsignal-enum))
  * `color` : [RGB color](#rgb-colors) (`uint32_t`)
  * `pattern` : pattern type ([`LEDPattern`](#ledpattern-enum))
  * `speed` : pattern speed ([`LEDSpeed`](#ledspeed-enum))
  * `period` : pattern period in milliseconds (`uint16_t`)

#### apply()

Applies theme settings.

```cpp
// SYNTAX
void LEDSystemTheme::apply(bool save = false);


// EXAMPLE - applying theme settings
LEDSystemTheme theme;
theme.setColor(LED_SIGNAL_NETWORK_ON, RGB_COLOR_BLUE);
theme.apply();
```

Parameters:

  * `save` : whether theme settings should be saved to a persistent storage (default value is `false`)

#### restoreDefault()

Restores factory default theme.

```cpp
// SYNTAX
static void LEDSystemTheme::restoreDefault();

// EXAMPLE - restoring factory default theme
LEDSystemTheme::restoreDefault();
```

### LEDSignal Enum

This enum defines LED signals supported by the system:

Name | Description | Priority | Default Pattern
-----|-------------|----------|----------------
LED_SIGNAL_NETWORK_OFF | Network is off | Background | Breathing white
LED_SIGNAL_NETWORK_ON | Network is on | Background | Breathing blue
LED_SIGNAL_NETWORK_CONNECTING | Connecting to network | Normal | Blinking green
LED_SIGNAL_NETWORK_DHCP | Getting network address | Normal | Fast blinking green
LED_SIGNAL_NETWORK_CONNECTED | Connected to network | Background | Breathing green
LED_SIGNAL_CLOUD_CONNECTING | Connecting to the Cloud | Normal | Blinking cyan
LED_SIGNAL_CLOUD_HANDSHAKE | Performing handshake with the Cloud | Normal | Fast blinking cyan
LED_SIGNAL_CLOUD_CONNECTED | Connected to the Cloud | Background | Breathing cyan
LED_SIGNAL_SAFE_MODE | Connected to the Cloud in safe mode | Background | Breathing magenta
LED_SIGNAL_LISTENING_MODE | Listening mode | Normal | Slow blinking blue
LED_SIGNAL_DFU_MODE * | DFU mode | Critical | Blinking yellow
LED_SIGNAL_POWER_OFF | Soft power down is pending | Critical | Solid gray

**Note:** Signals marked with an asterisk (*) are implemented within the bootloader and currently don't support pattern type and speed customization due to flash memory constraints. This may be changed in future versions of the firmware.

### LEDPriority Enum

This enum defines LED priorities supported by the system (from lowest to highest priority):

  * `LED_PRIORITY_BACKGROUND` : long-lasting background indications
  * `LED_PRIORITY_NORMAL` : regular, typically short indications
  * `LED_PRIORITY_IMPORTANT` : important indications
  * `LED_PRIORITY_CRITICAL` : critically important indications

Internally, the system uses the same set of priorities for its own LED signaling. In a situation when both an application and the system use same priority for their active indications, system indication takes precedence. Refer to the [LEDSignal Enum](#ledsignal-enum) section for information about system signal priorities.

### LEDPattern Enum

This enum defines LED patterns supported by the system:

  * `LED_PATTERN_SOLID` : solid color
  * `LED_PATTERN_BLINK` : blinking color
  * `LED_PATTERN_FADE` : breathing color
  * `LED_PATTERN_CUSTOM` : [custom pattern](#custom-patterns)

### LEDSpeed Enum

This enum defines system-default LED speed values:

  * `LED_SPEED_SLOW` : slow speed
  * `LED_SPEED_NORMAL` : normal speed
  * `LED_SPEED_FAST` : fast speed

### RGB Colors

RGB colors are represented by 32-bit integer values (`uint32_t`) with the following layout in hex: `0x00RRGGBB`, where `R`, `G` and `B` are bits of the red, green and blue color components respectively.

For convenience, the library defines constants for the following basic colors:

  * `RGB_COLOR_BLUE` : blue (`0x000000ff`)
  * `RGB_COLOR_GREEN` : green (`0x0000ff00`)
  * `RGB_COLOR_CYAN` : cyan (`0x0000ffff`)
  * `RGB_COLOR_RED` : red (`0x00ff0000`)
  * `RGB_COLOR_MAGENTA` : magenta (`0x00ff00ff`)
  * `RGB_COLOR_YELLOW` : yellow (`0x00ffff00`)
  * `RGB_COLOR_WHITE` : white (`0x00ffffff`)
  * `RGB_COLOR_GRAY` : gray (`0x001f1f1f`)
  * `RGB_COLOR_ORANGE` : orange (`0x00ff6000`)

{{/if}} {{!-- has-rgb --}}

## Time

The device synchronizes time with the Particle Device Cloud during the handshake.
From then, the time is continually updated on the device.
This reduces the need for external libraries to manage dates and times.

Before the device gets online and for short intervals, you can use the
`millis()` and `micros()` functions.

### millis()

Returns the number of milliseconds since the device began running the current program. This number will overflow (go back to zero), after approximately 49 days.

`unsigned long time = millis();`

```cpp
// EXAMPLE USAGE
SerialLogHandler logHandler;

void setup()
{
}

void loop()
{
  unsigned long time = millis();
  //prints time since program started
  Log.info("millis=%lu", time);
  // wait a second so as not to send massive amounts of data
  delay(1000);
}
```
**Note:**
The return value for millis is an unsigned long, errors may be generated if a programmer tries to do math with other data types such as ints.

Instead of using `millis()`, you can instead use [`System.millis()`](#system-millis-) that returns a 64-bit value that will not roll over to 0 during the life of the device.

### micros()

Returns the number of microseconds since the device booted.

`unsigned long time = micros();`

```cpp
// EXAMPLE USAGE
SerialLogHandler logHandler;

void setup()
{
  Serial.begin(9600);
}
void loop()
{
  unsigned long time = micros();
  //prints time since program started
  Log.info("micros=%lu", time);
  // wait a second so as not to send massive amounts of data
  delay(1000);
}
```

It overflows at the maximum 32-bit unsigned long value.

### delay()

Pauses the program for the amount of time (in milliseconds) specified as parameter. (There are 1000 milliseconds in a second.)

```cpp
// SYNTAX
delay(ms);
```

`ms` is the number of milliseconds to pause *(unsigned long)*

```cpp
// EXAMPLE USAGE

int ledPin = D1;              // LED connected to digital pin D1

void setup()
{
  pinMode(ledPin, OUTPUT);    // sets the digital pin as output
}

void loop()
{
  digitalWrite(ledPin, HIGH); // sets the LED on
  delay(1000);                // waits for a second
  digitalWrite(ledPin, LOW);  // sets the LED off
  delay(1000);                // waits for a second
}
```
**NOTE:**
the parameter for millis is an unsigned long, errors may be generated if a programmer tries to do math with other data types such as ints.


{{since when="1.5.0"}}

You can also specify a value using [chrono literals](#chrono-literals), for example: `delay(2min)` for 2 minutes. However you should generally avoid long delays.


### delayMicroseconds()

Pauses the program for the amount of time (in microseconds) specified as parameter. There are a thousand microseconds in a millisecond, and a million microseconds in a second.

```cpp
// SYNTAX
delayMicroseconds(us);
```
`us` is the number of microseconds to pause *(unsigned int)*

```cpp
// EXAMPLE USAGE

int outPin = D1;              // digital pin D1

void setup()
{
  pinMode(outPin, OUTPUT);    // sets the digital pin as output
}

void loop()
{
  digitalWrite(outPin, HIGH); // sets the pin on
  delayMicroseconds(50);      // pauses for 50 microseconds
  digitalWrite(outPin, LOW);  // sets the pin off
  delayMicroseconds(50);      // pauses for 50 microseconds
}
```

{{since when="1.5.0"}}

You can also specify a value using [chrono literals](#chrono-literals), for example: `delayMicroseconds(2ms)` for 2 milliseconds, but you should generally avoid using long delay values with delayMicroseconds.

### hour()

Retrieve the hour for the current or given time.
Integer is returned without a leading zero.

```cpp
// Print the hour for the current time
Serial.print(Time.hour());

// Print the hour for the given time, in this case: 4
Serial.print(Time.hour(1400647897));
```

Optional parameter: time_t (Unix timestamp), coordinated universal time (UTC)

Returns: Integer 0-23

If you have set a timezone using zone(), beginDST(), etc. the hour returned will be local time. You must still pass in UTC time, otherwise the time offset will be applied twice.

### hourFormat12()

Retrieve the hour in 12-hour format for the current or given time.
Integer is returned without a leading zero.

```cpp
// Print the hour in 12-hour format for the current time
Serial.print(Time.hourFormat12());

// Print the hour in 12-hour format for a given time, in this case: 3
Serial.print(Time.hourFormat12(1400684400));
```

Optional parameter: time_t (Unix timestamp), coordinated universal time (UTC)

Returns: Integer 1-12

If you have set a timezone using zone(), beginDST(), etc. the hour returned will be local time. You must still pass in UTC time, otherwise the time offset will be applied twice.

### isAM()

Returns true if the current or given time is AM.

```cpp
// Print true or false depending on whether the current time is AM
Serial.print(Time.isAM());

// Print whether the given time is AM, in this case: true
Serial.print(Time.isAM(1400647897));
```

Optional parameter: time_t (Unix timestamp), coordinated universal time (UTC)

Returns: Unsigned 8-bit integer: 0 = false, 1 = true

If you have set a timezone using zone(), beginDST(), etc. the hour returned will be local time. You must still pass in UTC time, otherwise the time offset will be applied twice, potentially causing AM/PM to be calculated incorrectly.

### isPM()

Returns true if the current or given time is PM.

```cpp
// Print true or false depending on whether the current time is PM
Serial.print(Time.isPM());

// Print whether the given time is PM, in this case: false
Serial.print(Time.isPM(1400647897));
```

Optional parameter: time_t (Unix timestamp), coordinated universal time (UTC)

Returns: Unsigned 8-bit integer: 0 = false, 1 = true

If you have set a timezone using zone(), beginDST(), etc. the hour returned will be local time. You must still pass in UTC time, otherwise the time offset will be applied twice, potentially causing AM/PM to be calculated incorrectly.

### minute()

Retrieve the minute for the current or given time.
Integer is returned without a leading zero.

```cpp
// Print the minute for the current time
Serial.print(Time.minute());

// Print the minute for the given time, in this case: 51
Serial.print(Time.minute(1400647897));
```

Optional parameter: time_t (Unix timestamp), coordinated universal time (UTC)

Returns: Integer 0-59

If you have set a timezone using zone(), beginDST(), etc. the hour returned will be local time. You must still pass in UTC time, otherwise the time offset will be applied twice.

### second()

Retrieve the seconds for the current or given time.
Integer is returned without a leading zero.

```cpp
// Print the second for the current time
Serial.print(Time.second());

// Print the second for the given time, in this case: 51
Serial.print(Time.second(1400647897));
```

Optional parameter: time_t (Unix timestamp), coordinated universal time (UTC)

Returns: Integer 0-59


### day()

Retrieve the day for the current or given time.
Integer is returned without a leading zero.

```cpp
// Print the day for the current time
Serial.print(Time.day());

// Print the day for the given time, in this case: 21
Serial.print(Time.day(1400647897));
```

Optional parameter: time_t (Unix timestamp), coordinated universal time (UTC)

Returns: Integer 1-31

If you have set a timezone using zone(), beginDST(), etc. the hour returned will be local time. You must still pass in UTC time, otherwise the time offset will be applied twice, potentially causing an incorrect date.

### weekday()

Retrieve the weekday for the current or given time.

 - 1 = Sunday
 - 2 = Monday
 - 3 = Tuesday
 - 4 = Wednesday
 - 5 = Thursday
 - 6 = Friday
 - 7 = Saturday

```cpp
// Print the weekday number for the current time
Serial.print(Time.weekday());

// Print the weekday for the given time, in this case: 4
Serial.print(Time.weekday(1400647897));
```

Optional parameter: time_t (Unix timestamp), coordinated universal time (UTC)

Returns: Integer 1-7

If you have set a timezone using zone(), beginDST(), etc. the hour returned will be local time. You must still pass in UTC time, otherwise the time offset will be applied twice, potentially causing an incorrect day of week.

### month()

Retrieve the month for the current or given time.
Integer is returned without a leading zero.

```cpp
// Print the month number for the current time
Serial.print(Time.month());

// Print the month for the given time, in this case: 5
Serial.print(Time.month(1400647897));
```

Optional parameter: time_t (Unix timestamp), coordinated universal time (UTC)

Returns: Integer 1-12

If you have set a timezone using zone(), beginDST(), etc. the hour returned will be local time. You must still pass in UTC time, otherwise the time offset will be applied twice, potentially causing an incorrect date.

### year()

Retrieve the 4-digit year for the current or given time.

```cpp
// Print the current year
Serial.print(Time.year());

// Print the year for the given time, in this case: 2014
Serial.print(Time.year(1400647897));
```

Optional parameter: time_t (Unix timestamp), coordinated universal time (UTC)

Returns: Integer


### now()

```cpp
// Print the current Unix timestamp
Serial.print((int) Time.now()); // 1400647897

// Print using loggging
Log.info("time is: %d", (int) Time.now());
```

Retrieve the current time as seconds since January 1, 1970 (commonly known as "Unix time" or "epoch time"). This time is not affected by the timezone setting, it's coordinated universal time (UTC).

Returns: time_t (Unix timestamp), coordinated universal time (UTC), `long` integer.

### local()

Retrieve the current time in the configured timezone as seconds since January 1, 1970 (commonly known as "Unix time" or "epoch time"). This time is affected by the timezone setting.

Note that the functions in the `Time` class expect times in UTC time, so the result from this should be used carefully. You should not pass Time.local() to Time.format(), for example.

_Since 0.6.0_

Local time is also affected by the Daylight Saving Time (DST) settings.

### zone()

Set the time zone offset (+/-) from UTC.
The device will remember this offset until reboot.

*NOTE*: This function does not observe daylight savings time.

```cpp
// Set time zone to Eastern USA daylight saving time
Time.zone(-4);
```

Parameters: floating point offset from UTC in hours, from -12.0 to 14.0

### isDST()

{{since when="0.6.0"}}

Returns true if Daylight Saving Time (DST) is in effect.

```cpp
// Print true or false depending on whether the DST in in effect
Serial.print(Time.isDST());
```

Returns: Unsigned 8-bit integer: 0 = false, 1 = true

This function only returns the current DST setting that you choose using beginDST() or endDST(). The setting does not automatically change based on the calendar date.

### getDSTOffset()

{{since when="0.6.0"}}

Retrieve the current Daylight Saving Time (DST) offset that is added to the current local time when Time.beginDST() has been called. The default is 1 hour.

```cpp
// Get current DST offset
float offset = Time.getDSTOffset();
```

Returns: floating point DST offset in hours (default is +1.0 hours)

### setDSTOffset()

{{since when="0.6.0"}}

Set a custom Daylight Saving Time (DST) offset.
The device will remember this offset until reboot.

```cpp
// Set DST offset to 30 minutes
Time.setDSTOffset(0.5);
```

Parameters: floating point offset in hours, from 0.0 to 2.0

### beginDST()

{{since when="0.6.0"}}

Start applying Daylight Saving Time (DST) offset to the current time.

You must call beginDST() at startup if you want use DST mode. The setting is not remembered and is not automatically changed based on the calendar.

### endDST()

{{since when="0.6.0"}}

Stop applying Daylight Saving Time (DST) offset to the current time.

You must call endDST() on the appropriate date to end DST mode. It is not calculated automatically.

### setTime()

Set the system time to the given timestamp.

*NOTE*: This will override the time set by the Particle Device Cloud.
If the cloud connection drops, the reconnection handshake will set the time again

Also see: [`Particle.syncTime()`](#particle-synctime-)

```cpp
// Set the time to 2014-10-11 13:37:42
Time.setTime(1413034662);
```

Parameter: time_t (Unix timestamp), coordinated universal time (UTC)


### timeStr()

Return string representation for the given time.
```cpp
Serial.print(Time.timeStr()); // Wed May 21 01:08:47 2014
```

Returns: String

_NB: In 0.3.4 and earlier, this function included a newline at the end of the returned string. This has been removed in 0.4.0._

### format()

Formats a time string using a configurable format. 

```cpp
// SYNTAX
Time.format(time, strFormat); // fully qualified (e.g. current time with custom format)
Time.format(strFormat);       // current time with custom format
Time.format(time);            // custom time with preset format
Time.format();                // current time with preset format
  
// EXAMPLE
time_t time = Time.now();
Time.format(time, TIME_FORMAT_DEFAULT); // Sat Jan 10 08:22:04 2004 , same as Time.timeStr()

Time.zone(-5.25);  // setup a time zone, which is part of the ISO8601 format
Time.format(time, TIME_FORMAT_ISO8601_FULL); // 2004-01-10T08:22:04-05:15

```

The formats available are:

- `TIME_FORMAT_DEFAULT`
- `TIME_FORMAT_ISO8601_FULL`
- custom format based on [strftime()](http://www.cplusplus.com/reference/ctime/strftime/)

Optional parameter: time_t (Unix timestamp), coordinated universal time (UTC), long integer

If you have set the time zone using Time.zone(), beginDST(), etc. the formatted time will be formatted in local time.

**Note:** The custom time provided to `Time.format()` needs to be UTC based and *not* contain the time zone offset (as `Time.local()` would), since the time zone correction is performed by the high level `Time` methods internally.


### setFormat()

Sets the format string that is the default value used by `format()`.

```cpp

Time.setFormat(TIME_FORMAT_ISO8601_FULL);

```

In more advanced cases, you can set the format to a static string that follows
the same syntax as the `strftime()` function.

```
// custom formatting

Time.format(Time.now(), "Now it's %I:%M%p.");
// Now it's 03:21AM.

```

### getFormat()

Retrieves the currently configured format string for time formatting with `format()`.


### isValid()

{{since when="0.6.1"}}

```cpp
// SYNTAX
Time.isValid();
```

Used to check if current time is valid. This function will return `true` if:
- Time has been set manually using [`Time.setTime()`](#settime-)
- Time has been successfully synchronized with the Particle Device Cloud. The device synchronizes time with the Particle Device Cloud during the handshake. The application may also manually synchronize time with Particle Device Cloud using [`Particle.syncTime()`](#particle-synctime-)
- Correct time has been maintained by RTC.{{#if has-backup-ram}} See information on [`Backup RAM (SRAM)`](#backup-ram-sram-) for cases when RTC retains the time. RTC is part of the backup domain and retains its counters under the same conditions as Backup RAM.{{/if}}

**NOTE:** When the device is running in `AUTOMATIC` mode {{#if has-threading}}and threading is disabled {{/if}} this function will block if current time is not valid and there is an active connection to Particle Device Cloud. Once it synchronizes the time with Particle Device Cloud or the connection to Particle Device Cloud is lost, `Time.isValid()` will return its current state. This function is also implicitly called by any `Time` function that returns current time or date (e.g. `Time.hour()`/`Time.now()`/etc).

```cpp
// Print true or false depending on whether current time is valid
Serial.print(Time.isValid());
```

```cpp
SerialLogHandler logHandler;

void setup()
{
  // Wait for time to be synchronized with Particle Device Cloud (requires active connection)
  waitFor(Time.isValid, 60000);
}

void loop()
{
  // Print current time
  Log.info("current time: %s", Time.timeStr().c_str());
  delay(1000);
}

```

### Advanced

For more advanced date parsing, formatting, normalization and manipulation functions, use the C standard library time functions like `mktime`. See the [note about the standard library on the device](#other-functions) and the [description of the C standard library time functions](https://en.wikipedia.org/wiki/C_date_and_time_functions).

## Chrono Literals

{{since when="1.5.0"}}

A number of APIs have been modified to support chrono literals. For example, instead of having to use `2000` for 2 seconds in the delay(), you can use `2s` for 2 seconds.

```cpp
// EXAMPLE
SerialLogHandler logHandler;

void setup() {
}

void loop() {
    Log.info("testing");
    delay(2s);
}
```

The available units are:

| Literal | Unit |
| :-----: | :--- |
| us | microseconds |
| ms | milliseconds |
| s | seconds |
| min | minutes |
| h | hours |

Individual APIs may have minimum unit limits. For example, delay() has a minimum unit of milliseconds, so you cannot specify a value in microseconds (us). If you attempt to do this, you will get a compile-time error:

```html
../wiring/inc/spark_wiring_ticks.h:47:20: note:   no known conversion for argument 1 from 'std::chrono::microseconds {aka std::chrono::duration<long long int, std::ratio<1ll, 1000000ll> >}' to 'std::chrono::milliseconds {aka std::chrono::duration<long long int, std::ratio<1ll, 1000ll> >}'
```

Some places where you can use them:

- delay()
- delayMicroseconds()
- Particle.pubishVitals()
- Particle.keepAlive()
- System.sleep()
- Timer::changePeriod()
- Timer::changePeriodFromISR()
- ApplicationWatchdog
- Cellular.setListenTimeout()
- Ethernet.setListenTimeout()
- WiFi.setListenTimeout()

{{#if has-interrupts}}

## Interrupts

Interrupts are a way to write code that is run when an external event occurs.
As a general rule, interrupt code should be very fast, and non-blocking. This means
performing transfers, such as I2C, Serial, TCP should not be done as part of the
interrupt handler. Rather, the interrupt handler can set a variable which instructs
the main loop that the event has occurred.

### attachInterrupt()

Specifies a function to call when an external interrupt occurs. Replaces any previous function that was attached to the interrupt.

**NOTE:**
`pinMode()` MUST be called prior to calling attachInterrupt() to set the desired mode for the interrupt pin (INPUT, INPUT_PULLUP or INPUT_PULLDOWN).

{{#if has-nrf52}}
All A and D pins (including TX, RX, and SPI) on Gen 3 devices can be used for interrupts, however you can only attach interrupts to 8 pins at the same time.
{{/if}}

{{#if has-stm32}}
External interrupts are supported on the following pins:

**Photon**

Not supported on the Photon (you can't use attachInterrupt on these pins):

  - D0, A5 (shared with SETUP button)

No restrictions on the Photon (all of these can be used at the same time):

  - D5, D6, D7, A2, WKP, TX, RX

Shared on the Photon (only one pin for each bullet item can be used at the same time):

  - D1, A4
  - D2, A0, A3
  - D3, DAC
  - D4, A1
 
For example, you can use attachInterrupt on D1 or A4, but not both. Since they share an EXTI line, there is no way to tell which pin generated the interrupt.

But you can still attachInterrupt to D2, D3, and D4, as those are on different EXTI lines.
 
**P1**
   
Not supported on the P1 (you can't use attachInterrupt on these pins):

  - D0, A5 (shared with MODE button)

No restrictions on the P1 (all of these can be used at the same time):

  - D5, D6, A2, TX, RX

Shared on the P1 (only one pin for each bullet item can be used at the same time):

  - D1, A4
  - D2, A0, A3
  - D3, DAC, P1S3
  - D4, A1
  - D7, P1S4
  - A7 (WKP), P1S0, P1S2
  - P1S1, P1S5

**Electron/E Series**

Not supported on the Electron/E series (you can't use attachInterrupt on these pins):

  - D0, A5 (shared with MODE button)
  - D7 (shared with BATT_INT_PC13)
  - C1 (shared with RXD_UC)
  - C2 (shared with RI_UC)

No restrictions on the Electron/E series (all of these can be used at the same time):

  - D5, D6

Shared on the Electron/E series (only one pin for each bullet item can be used at the same time):

  - D1, A4, B1
  - D2, A0, A3
  - D3, DAC
  - D4, A1
  - A2, C0
  - A7 (WKP), B2, B4
  - B0, C5
  - B3, B5
  - C3, TX
  - C4, RX


{{/if}} {{!-- has-stm32 --}}

Additional information on which pins can be used for interrupts is available on the [pin information page](/reference/hardware/pin-info).

```
// SYNTAX
attachInterrupt(pin, function, mode);
attachInterrupt(pin, function, mode, priority);
attachInterrupt(pin, function, mode, priority, subpriority);
```

*Parameters:*

- `pin`: the pin number
- `function`: the function to call when the interrupt occurs; this function must take no parameters and return nothing. This function is sometimes referred to as an *interrupt service routine* (ISR).
- `mode`: defines when the interrupt should be triggered. Three constants are predefined as valid values:
    - CHANGE to trigger the interrupt whenever the pin changes value,
    - RISING to trigger when the pin goes from low to high,
    - FALLING for when the pin goes from high to low.
- `priority` (optional): the priority of this interrupt. Default priority is 13. Lower values increase the priority of the interrupt.
- `subpriority` (optional): the subpriority of this interrupt. Default subpriority is 0.

The function returns a boolean whether the ISR was successfully attached (true) or not (false).

```cpp
// EXAMPLE USAGE

void blink(void);
int ledPin = D1;
volatile int state = LOW;

void setup()
{
  pinMode(ledPin, OUTPUT);
  pinMode(D2, INPUT_PULLUP);
  attachInterrupt(D2, blink, CHANGE);
}

void loop()
{
  digitalWrite(ledPin, state);
}

void blink()
{
  state = !state;
}
```

You can attach a method in a C++ object as an interrupt handler.

```cpp
class Robot {
  public:
    Robot() {
      pinMode(D2, INPUT_PULLUP);
      attachInterrupt(D2, &Robot::handler, this, CHANGE);
    }
    void handler() {
      // do something on interrupt
    }
};

Robot myRobot;
// nothing else needed in setup() or loop()
```

**Using Interrupts:**
Interrupts are useful for making things happen automatically in microcontroller programs, and can help solve timing problems. Good tasks for using an interrupt may include reading a rotary encoder, or monitoring user input.

If you wanted to insure that a program always caught the pulses from a rotary encoder, so that it never misses a pulse, it would make it very tricky to write a program to do anything else, because the program would need to constantly poll the sensor lines for the encoder, in order to catch pulses when they occurred. Other sensors have a similar interface dynamic too, such as trying to read a sound sensor that is trying to catch a click, or an infrared slot sensor (photo-interrupter) trying to catch a coin drop. In all of these situations, using an interrupt can free the microcontroller to get some other work done while not missing the input.

**About Interrupt Service Routines:**
ISRs are special kinds of functions that have some unique limitations most other functions do not have. An ISR cannot have any parameters, and they shouldn't return anything.

Generally, an ISR should be as short and fast as possible. If your sketch uses multiple ISRs, only one can run at a time, other interrupts will be executed after the current one finishes in an order that depends on the priority they have. `millis()` relies on interrupts to count, so it will never increment inside an ISR. Since `delay()` requires interrupts to work, it will not work if called inside an ISR. Using `delayMicroseconds()` will work as normal.

Typically global variables are used to pass data between an ISR and the main program. To make sure variables shared between an ISR and the main program are updated correctly, declare them as `volatile`.


### detachInterrupt()

Turns off the given interrupt.

```
// SYNTAX
detachInterrupt(pin);
```

`pin` is the pin number of the interrupt to disable.


### interrupts()

Re-enables interrupts (after they've been disabled by `noInterrupts()`). Interrupts allow certain important tasks to happen in the background and are enabled by default. Some functions will not work while interrupts are disabled, and incoming communication may be ignored. Interrupts can slightly disrupt the timing of code, however, and may be disabled for particularly critical sections of code.

```cpp
// EXAMPLE USAGE

void setup() {}

void loop()
{
  noInterrupts(); // disable interrupts
  //
  // put critical, time-sensitive code here
  //
  interrupts();   // enable interrupts
  //
  // other code here
  //
}
```

`interrupts()` neither accepts a parameter nor returns anything.

### noInterrupts()

Disables interrupts (you can re-enable them with `interrupts()`). Interrupts allow certain important tasks to happen in the background and are enabled by default. Some functions will not work while interrupts are disabled, and incoming communication may be ignored. Interrupts can slightly disrupt the timing of code, however, and may be disabled for particularly critical sections of code.

```cpp
// SYNTAX
noInterrupts();
```

`noInterrupts()` neither accepts a parameter nor returns anything.

{{/if}} {{!-- has-interrupts --}}

{{#if has-software-timers}}

## Software Timers

{{#if has-stm32}}
_Since 0.4.7. This feature is available on the Photon, P1 and Electron out the box.
{{/if}}

Software Timers provide a way to have timed actions in your program.  FreeRTOS provides the ability to have up to 10 Software Timers at a time with a minimum resolution of 1 millisecond.  It is common to use millis() based "timers" though exact timing is not always possible (due to other program delays).  Software timers are maintained by FreeRTOS and provide a more reliable method for running timed actions using callback functions.  Please note that Software Timers are "chained" and will be serviced sequentially when several timers trigger simultaneously, thus requiring special consideration when writing callback functions.

```cpp
// EXAMPLE
SerialLogHandler logHandler;

Timer timerName(1000, print_every_second);

void print_every_second()
{
    static int count = 0;
    Log.info("count=%d", count++);
}

void setup()
{
    timerName.start();
}
```

Timers may be started, stopped, reset within a user program or an ISR.  They may also be "disposed", removing them from the (max. 10) active timer list.

The timer callback is similar to an interrupt - it shouldn't block. However, it is less restrictive than an interrupt. If the code does block, the system will not crash - the only consequence is that other software timers that should have triggered will be delayed until the blocking timer callback function returns.

- You should not use functions like `Particle.publish` from a timer callback. 
- Do not use `Serial.print` and its variations from a timer callback as writing to `Serial` is not thread safe. Use `Log.info` instead.
- It is best to avoid using long `delay()` in a timer callback as it will delay other timers from running.
- Avoid using functions that interact with the cellular modem like `Cellular.RSSI()` and `Cellular.command()`.

Software timers run with a smaller stack (1024 bytes vs. 6144 bytes). This can limit the functions you use from the callback function.

// SYNTAX

`Timer timerName(period, callback, one_shot)`

- `period` is the period of the timer in milliseconds  (unsigned int)
- `callback` is the callback function which gets called when the timer expires.
- `one_shot` (optional, since 0.4.9) when `true`, the timer is fired once and then stopped automatically.  The default is `false` - a repeating timer.


{{/if}} {{!-- has-software-timers --}}

### Class member callbacks

{{since when="0.4.9"}}

A class member function can be used as a callback using this syntax to create the timer:

`Timer timerName(period, callback, instance, one_shot)`

- `period` is the period of the timer in milliseconds  (unsigned int)
- `callback` is the class member function which gets called when the timer expires.
- `instance` the instance of the class to call the callback function on.
- `one_shot` (optional, since 0.4.9) when `true`, the timer is fired once and then stopped automatically.  The default is `false` - a repeating timer.


```
// Class member function callback example

class CallbackClass
{
public:
     void onTimeout();
}

CallbackClass callback;
Timer t(1000, &CallbackClass::onTimeout, callback);

```


### start()

Starts a stopped timer (a newly created timer is stopped). If `start()` is called for a running timer, it will be reset.

`start()`

```cpp
// EXAMPLE USAGE
timerName.start(); // starts timer if stopped or resets it if started.

```

### stop()

Stops a running timer.

`stop()`

```cpp
// EXAMPLE USAGE
timerName.stop(); // stops a running timer.

```

### changePeriod()

Changes the period of a previously created timer. It can be called to change the period of an running or stopped timer. Note that changing the period of a dormant timer will also start the timer.

`changePeriod(newPeriod)`

`newPeriod` is the new timer period (unsigned int)

```cpp
// EXAMPLE USAGE
timerName.changePeriod(1000); // Reset period of timer to 1000ms.

```

{{since when="1.5.0"}}

You can also specify a value using [chrono literals](#chrono-literals), for example: `timerName.changePeriod(2min)` for 2 minutes. 

### reset()

Resets a timer.  If a timer is running, it will reset to "zero".  If a timer is stopped, it will be started.

`reset()`

```cpp
// EXAMPLE USAGE
timerName.reset(); // reset timer if running, or start timer if stopped.

```

### startFromISR()
### stopFromISR()
### resetFromISR()
### changePeriodFromISR()

`startFromISR()`
`stopFromISR()`
`resetFromISR()`
`changePeriodFromISR()`

Start, stop and reset a timer or change a timer's period (as above) BUT from within an ISR.  These functions MUST be called when doing timer operations within an ISR.

```cpp
// EXAMPLE USAGE
timerName.startFromISR(); // WITHIN an ISR, starts timer if stopped or resets it if started.

timerName.stopFromISR(); // WITHIN an ISR,stops a running timer.

timerName.resetFromISR(); // WITHIN an ISR, reset timer if running, or start timer if stopped.

timerName.changePeriodFromISR(newPeriod);  // WITHIN an ISR, change the timer period.
```

### dispose()

`dispose()`

Stop and remove a timer from the (max. 10) timer list, freeing a timer "slot" in the list.

```cpp
// EXAMPLE USAGE
timerName.dispose(); // stop and delete timer from timer list.

```

### isActive()

{{since when="0.5.0"}}

`bool isActive()`

Returns `true` if the timer is in active state (pending), or `false` otherwise.

```cpp
// EXAMPLE USAGE
if (timerName.isActive()) {
    // ...
}
```

{{#if has-application-watchdog}}

## Application Watchdog

{{since when="0.5.0"}}

A **Watchdog Timer** is designed to rescue your device should an unexpected problem prevent code from running. This could be the device locking or or freezing due to a bug in code, accessing a shared resource incorrectly, corrupting memory, and other causes.

Device OS includes a software-based watchdog, [ApplicationWatchdog](https://docs.particle.io/reference/device-os/firmware/#application-watchdog), that is based on a FreeRTOS thread. It theoretically can help when user application enters an infinite loop. However, it does not guard against the more problematic things like deadlock caused by accessing a mutex from multiple threads with thread swapping disabled, infinite loop with interrupts disabled, or an unpredictable hang caused by memory corruption. Only a hardware watchdog can handle those situations.

The application note [AN023 Watchdog Timers](https://github.com/particle-iot/app-notes/tree/master/AN023-Watchdog-Timers) has information about hardware watchdog timers, and hardware and software designs for the TPL5010 and AB1805.

```cpp
// PROTOTYPES
ApplicationWatchdog(unsigned timeout_ms, 
    std::function<void(void)> fn, 
    unsigned stack_size=DEFAULT_STACK_SIZE);

ApplicationWatchdog(std::chrono::milliseconds ms, 
    std::function<void(void)> fn, 
    unsigned stack_size=DEFAULT_STACK_SIZE);

// EXAMPLE USAGE
// Global variable to hold the watchdog object pointer
ApplicationWatchdog *wd;

void watchdogHandler() {
  // Do as little as possible in this function, preferably just
  // calling System.reset().
  // Do not attempt to Particle.publish(), use Cellular.command()
  // or similar functions. You can save data to a retained variable
  // here safetly so you know the watchdog triggered when you 
  // restart.
  // In 2.0.0 and later, RESET_NO_WAIT prevents notifying the cloud of a pending reset
  System.reset(RESET_NO_WAIT);
}

void setup() {
  // Start watchdog. Reset the system after 60 seconds if 
  // the application is unresponsive.
  wd = new ApplicationWatchdog(60000, watchdogHandler, 1536);
}

void loop() {
  while (some_long_process_within_loop) {
    wd->checkin(); // resets the AWDT count
  }
}
// AWDT count reset automatically after loop() ends
```

A default `stack_size` of 512 is used for the thread. `stack_size` is an optional parameter. The stack can be made larger or smaller as needed. This is generally too small, and it's best to use a minimum of 1536 bytes. If not enough stack memory is allocated, the application will crash due to a Stack Overflow. The RGB LED will flash a [red SOS pattern, followed by 13 blinks](/tutorials/device-os/led#red-flash-sos).

The application watchdog requires interrupts to be active in order to function.  Enabling the hardware watchdog in combination with this is recommended, so that the system resets in the event that interrupts are not firing.

---

Your watchdog handler should have the prototype:

```
void myWatchdogHandler(void);
```

You should generally not try to do anything other than call `System.reset()` or perhaps set some retained variables in your application watchdog callback. In particular:

- Do not call any cloud functions like `Particle.publish()` or even `Particle.disconnect()`.
- Do not call `Cellular.command()`.

Calling these functions will likely cause the system to deadlock and not reset.

Note: `waitFor` and `waitUntil` do not tickle the application watchdog. If the condition you are waiting for is longer than the application watchdog timeout, the device will reset.

{{since when="1.5.0"}}

You can also specify a value using [chrono literals](#chrono-literals), for example: `wd = new ApplicationWatchdog(60s, System.reset)` for 60 seconds. 

{{/if}} {{!-- has-application-watchdog --}}

## Math

Note that in addition to functions outlined below all of the newlib math functions described at [sourceware.org](https://sourceware.org/newlib/libm.html) are also available for use by simply including the math.h header file thus:

`#include "math.h"`

### min()

Calculates the minimum of two numbers.

`min(x, y)`

`x` is the first number, any data type
`y` is the second number, any data type

The functions returns the smaller of the two numbers.

```cpp
// EXAMPLE USAGE
sensVal = min(sensVal, 100); // assigns sensVal to the smaller of sensVal or 100
                             // ensuring that it never gets above 100.
```

**NOTE:**
Perhaps counter-intuitively, max() is often used to constrain the lower end of a variable's range, while min() is used to constrain the upper end of the range.

**WARNING:**
Because of the way the min() function is implemented, avoid using other functions inside the brackets, it may lead to incorrect results

```cpp
min(a++, 100);   // avoid this - yields incorrect results

a++;
min(a, 100);    // use this instead - keep other math outside the function
```

### max()

Calculates the maximum of two numbers.

`max(x, y)`

`x` is the first number, any data type
`y` is the second number, any data type

The functions returns the larger of the two numbers.

```cpp
// EXAMPLE USAGE
sensVal = max(senVal, 20); // assigns sensVal to the larger of sensVal or 20
                           // (effectively ensuring that it is at least 20)
```

**NOTE:**
Perhaps counter-intuitively, max() is often used to constrain the lower end of a variable's range, while min() is used to constrain the upper end of the range.

**WARNING:**
Because of the way the max() function is implemented, avoid using other functions inside the brackets, it may lead to incorrect results

```cpp
max(a--, 0);   // avoid this - yields incorrect results

a--;           // use this instead -
max(a, 0);     // keep other math outside the function
```

### abs()

Computes the absolute value of a number.

`abs(x);`

where `x` is the number

The function returns `x` if `x` is greater than or equal to `0`
and returns `-x` if `x` is less than `0`.

**WARNING:**
Because of the way the abs() function is implemented, avoid using other functions inside the brackets, it may lead to incorrect results.

```cpp
abs(a++);   // avoid this - yields incorrect results

a++;          // use this instead -
abs(a);       // keep other math outside the function
```

### constrain()

Constrains a number to be within a range.

`constrain(x, a, b);`

`x` is the number to constrain, all data types
`a` is the lower end of the range, all data types
`b` is the upper end of the range, all data types

The function will return:
`x`: if x is between `a` and `b`
`a`: if `x` is less than `a`
`b`: if `x` is greater than `b`

```cpp
// EXAMPLE USAGE
sensVal = constrain(sensVal, 10, 150);
// limits range of sensor values to between 10 and 150
```

### map()

```cpp
// EXAMPLE USAGE

// Map an analog value to 8 bits (0 to 255)
void setup() {
  pinMode(D1, OUTPUT);
}

void loop()
{
  int val = analogRead(A0);
  val = map(val, 0, 4095, 0, 255);
  analogWrite(D1, val);
}
```

Re-maps a number from one range to another. That is, a value of fromLow would get mapped to `toLow`, a `value` of `fromHigh` to `toHigh`, values in-between to values in-between, etc.

`map(value, fromLow, fromHigh, toLow, toHigh);`

Does not constrain values to within the range, because out-of-range values are sometimes intended and useful. The `constrain()` function may be used either before or after this function, if limits to the ranges are desired.

Note that the "lower bounds" of either range may be larger or smaller than the "upper bounds" so the `map()` function may be used to reverse a range of numbers, for example

`y = map(x, 1, 50, 50, 1);`

The function also handles negative numbers well, so that this example

`y = map(x, 1, 50, 50, -100);`

is also valid and works well.

When called with integers, the `map()` function uses integer math so will not generate fractions, when the math might indicate that it should do so. Fractional remainders are truncated, not rounded.

*Parameters can either be integers or floating point numbers:*

- `value`: the number to map
- `fromLow`: the lower bound of the value's current range
- `fromHigh`: the upper bound of the value's current range
- `toLow`: the lower bound of the value's target range
- `toHigh`: the upper bound of the value's target range

The function returns the mapped value, as integer or floating point depending on the arguments.

*Appendix:*
For the mathematically inclined, here's the whole function

```cpp
int map(int value, int fromStart, int fromEnd, int toStart, int toEnd)
{
    if (fromEnd == fromStart) {
        return value;
    }
    return (value - fromStart) * (toEnd - toStart) / (fromEnd - fromStart) + toStart;
}
```

### pow()

Calculates the value of a number raised to a power. `pow()` can be used to raise a number to a fractional power. This is useful for generating exponential mapping of values or curves.

`pow(base, exponent);`

`base` is the number *(float)*
`exponent` is the power to which the base is raised *(float)*

The function returns the result of the exponentiation *(double)*

EXAMPLE **TBD**

### sqrt()

Calculates the square root of a number.

`sqrt(x)`

`x` is the number, any data type

The function returns the number's square root *(double)*

## Random Numbers

The firmware incorporates a pseudo-random number generator.

### random()

Retrieves the next random value, restricted to a given range.

 `random(max);`

Parameters

- `max` - the upper limit of the random number to retrieve.

Returns: a random value between 0 and up to, but not including `max`.

```cpp
int r = random(10);
// r is >= 0 and < 10
// The smallest value returned is 0
// The largest value returned is 9
```

 NB: When `max` is 0, the result is always 0.

---

`random(min,max);`

Parameters:

 - `min` - the lower limit (inclusive) of the random number to retrieve.
 - `max` - the upper limit (exclusive) of the random number to retrieve.

Returns: a random value from `min` and up to, but not including `max`.


```cpp
int r = random(10, 100);
// r is >= 10 and < 100
// The smallest value returned is 10
// The largest value returned is 99
```

  NB: If `min` is greater or equal to `max`, the result is always 0.

### randomSeed()

`randomSeed(newSeed);`

Parameters:

 - `newSeed` - the new random seed

The pseudorandom numbers produced by the firmware are derived from a single value - the random seed.
The value of this seed fully determines the sequence of random numbers produced by successive
calls to `random()`. Using the same seed on two separate runs will produce
the same sequence of random numbers, and in contrast, using different seeds
will produce a different sequence of random numbers.

On startup, the default random seed is [set by the system](http://www.cplusplus.com/reference/cstdlib/srand/) to 1.
Unless the seed is modified, the same sequence of random numbers would be produced each time
the system starts.

Fortunately, when the device connects to the cloud, it receives a very randomized seed value,
which is used as the random seed. So you can be sure the random numbers produced
will be different each time your program is run.


*** Disable random seed from the cloud ***

When the device receives a new random seed from the cloud, it's passed to this function:

```
void random_seed_from_cloud(unsigned int seed);
```

The system implementation of this function calls `randomSeed()` to set
the new seed value. If you don't wish to use random seed values from the cloud,
you can take control of the random seeds set by adding this code to your app:

```cpp
void random_seed_from_cloud(unsigned int seed) {
   // don't do anything with this. Continue with existing seed.
}
```

In the example, the seed is simply ignored, so the system will continue using
whatever seed was previously set. In this case, the random seed will not be set
from the cloud, and setting the seed is left to up you.

{{#if has-eeprom}}

## EEPROM

{{#if has-eeprom-file}}
EEPROM emulation allows small amounts  of data to be stored and persisted even across reset, power down, and user and system firmware flash operations.

On this device the EEPROM emulation is stored as a file on the flash file system. Since the data is spread across a large number of flash sectors, flash erase-write cycle limits should not be an issue in general.

{{else}}
EEPROM emulation allocates a region of the device's built-in Flash memory to act as EEPROM.
Unlike "true" EEPROM, flash doesn't suffer from write "wear" with each write to
each individual address. Instead, the page suffers wear when it is filled.

Each write containing changed values will add more data to the page until it is full, causing a page erase.  When writing unchanged data, there is no flash wear, but there is a penalty in CPU cycles. Try not write to EEPROM every loop() iteration to avoid unnecessary CPU cycle penalties.  {{#if has-backup-ram}}Backup RAM may be a better storage solution for quickly changing values.  (see [Backup RAM (SRAM)](#backup-ram-sram-)){{/if}}

The EEPROM functions can be used to store small amounts of data in Flash that
will persist even after the device resets after a deep sleep or is powered off.
{{/if}}


### length()
Returns the total number of bytes available in the emulated EEPROM.

```cpp
// SYNTAX
size_t length = EEPROM.length();
```

- The Gen 2 (Photon, P1, Electron, and E Series) have 2047 bytes of emulated EEPROM.
- The Gen 3 (Argon, Boron, Xenon) devices have 4096 bytes of emulated EEPROM.

### put()
This function will write an object to the EEPROM. You can write single values like `int` and
`float` or group multiple values together using `struct` to ensure that all values of the struct are
updated together.

```
// SYNTAX
EEPROM.put(int address, object)
```

`address` is the start address (int) of the EEPROM locations to write. It must be a value between 0
and `EEPROM.length()-1`

`object` is the object data to write. The number of bytes to write is automatically determined from
the type of object.

```cpp
// EXAMPLE USAGE
// Write a value (2 bytes in this case) to the EEPROM address
int addr = 10;
uint16_t value = 12345;
EEPROM.put(addr, value);

// Write an object to the EEPROM address
addr = 20;
struct MyObject {
  uint8_t version;
  float field1;
  uint16_t field2;
  char name[10];
};
MyObject myObj = { 0, 12.34f, 25, "Test!" };
EEPROM.put(addr, myObj);
```

The object data is first compared to the data written in the EEPROM to avoid writing values that
haven't changed.

If the device loses power before the write finishes, the partially written data will be ignored.

If you write several objects to EEPROM, make sure they don't overlap: the address of the second
object must be larger than the address of the first object plus the size of the first object. You
can leave empty room between objects in case you need to make the first object bigger later.

### get()
This function will retrieve an object from the EEPROM. Use the same type of object you used in the
`put` call.

```
// SYNTAX
EEPROM.get(int address, object)
```

`address` is the start address (int) of the EEPROM locations to read. It must be a value between 0
and `EEPROM.length()-1`

`object` is the object data that would be read. The number of bytes read is automatically determined
from the type of object.

```cpp
// EXAMPLE USAGE
// Read a value (2 bytes in this case) from EEPROM addres
int addr = 10;
uint16_t value;
EEPROM.get(addr, value);
if(value == 0xFFFF) {
  // EEPROM was empty -> initialize value
  value = 25;
}

// Read an object from the EEPROM addres
addr = 20;
struct MyObject {
  uint8_t version;
  float field1;
  uint16_t field2;
  char name[10];
};
MyObject myObj;
EEPROM.get(addr, myObj);
if(myObj.version != 0) {
  // EEPROM was empty -> initialize myObj
  MyObject defaultObj = { 0, 12.34f, 25, "Test!" };
  myObj = defaultObj;
}
```

The default value of bytes in the EEPROM is 255 (hexadecimal 0xFF) so reading an object on a new
device will return an object filled with 0xFF. One trick to deal with default data is to include
a version field that you can check to see if there was valid data written in the EEPROM.

### read()
Read a single byte of data from the emulated EEPROM.

```
// SYNTAX
uint8_t value = EEPROM.read(int address);
```

`address` is the address (int) of the EEPROM location to read

```cpp
// EXAMPLE USAGE

// Read the value of the second byte of EEPROM
int addr = 1;
uint8_t value = EEPROM.read(addr);
```

When reading more than 1 byte, prefer `get()` over multiple `read()` since it's faster.

### write()
Write a single byte of data to the emulated EEPROM.

```
// SYNTAX
write(int address, uint8_t value);
```

`address` is the address (int) of the EEPROM location to write to
`value` is the byte data (uint8_t) to write

```cpp
// EXAMPLE USAGE

// Write a byte value to the second byte of EEPROM
int addr = 1;
uint8_t val = 0x45;
EEPROM.write(addr, val);
```

When writing more than 1 byte, prefer `put()` over multiple `write()` since it's faster and it ensures
consistent data even when power is lost while writing.

The object data is first compared to the data written in the EEPROM to avoid writing values that
haven't changed.

### clear()
Erase all the EEPROM so that all reads will return 255 (hexadecimal 0xFF).

```cpp
// EXAMPLE USAGE
// Reset all EEPROM locations to 0xFF
EEPROM.clear();
```

{{#unless has-eeprom-file}}
Calling this function pauses processor execution (including code running in interrupts) for 800ms since
no instructions can be fetched from Flash while the Flash controller is busy erasing both EEPROM
pages.
{{/unless}}

{{#unless has-eeprom-file}}
### hasPendingErase()
### performPendingErase()

*Automatic page erase is the default behavior. This section describes optional functions the
application can call to manually control page erase for advanced use cases.*

After enough data has been written to fill the first page, the EEPROM emulation will write new data
to a second page. The first page must be erased before being written again.

Erasing a page of Flash pauses processor execution (including code running in interrupts) for 500ms since
no instructions can be fetched from Flash while the Flash controller is busy erasing the EEPROM
page. This could cause issues in applications that use EEPROM but rely on precise interrupt timing.

`hasPendingErase()` lets the application developer check if a full EEPROM page needs to be erased.
When the application determines it is safe to pause processor execution to erase EEPROM it calls
`performPendingErase()`. You can call this at boot, or when your device is idle if you expect it to
run without rebooting for a long time.

```
// EXAMPLE USAGE
void setup() {
  // Erase full EEPROM page at boot when necessary
  if(EEPROM.hasPendingErase()) {
    EEPROM.performPendingErase();
  }
}
```

To estimate how often page erases will be necessary in your application, assume that it takes
`2*EEPROM.length()` byte writes to fill a page (it will usually be more because not all bytes will always be
updated with different values).

If the application never calls `performPendingErase()` then the pending page erase will be performed
when data is written using `put()` or `write()` and both pages are full. So calling
`performPendingErase()` is optional and provided to avoid the uncertainty of a potential processor
pause any time `put()` or `write()` is called.
{{/unless}} {{!-- has-eeprom-file --}}


{{/if}}

{{#if has-backup-ram}}
## Backup RAM (SRAM)

{{#if has-stm32}}
The STM32F2xx features 4KB of backup RAM (3068 bytes for Device OS
version v0.6.0 and later) of which is available to the user. Unlike the regular RAM memory, the backup RAM is retained so long as power is provided to VIN or to VBAT. In particular this means that the data in backup RAM is retained when:

- the device goes into deep sleep mode (SLEEP_MODE_DEEP or HIBERNATE)
- the device is hardware or software reset (while maintaining power)
- power is removed from VIN but retained on VBAT (which will retain both the backup RAM and the RTC)

Note that _if neither VIN or VBAT is powered then the contents of the backup RAM will be lost; for data to be
retained, the device needs a power source._  For persistent storage of data through a total power loss, please use the [EEPROM](#eeprom).

Power Conditions and how they relate to Backup RAM initialization and data retention:

| Power Down Method | Power Up Method | When VIN Powered | When VBAT Powered | SRAM Initialized | SRAM Retained |
| -: | :- | :-: | :-: | :-: | :-: |
| Power removed on VIN and VBAT | Power applied on VIN | - | No<sup>[1]</sup> | Yes | No |
| Power removed on VIN and VBAT | Power applied on VIN | - | Yes | Yes | No |
| Power removed on VIN | Power applied on VIN | - | Yes | No | Yes |
| System.sleep(SLEEP_MODE_DEEP) | Rising edge on WKP pin, or Hard Reset | Yes | Yes/No | No | Yes |
| System.sleep(SLEEP_MODE_DEEP,10) | RTC alarm after 10 seconds | Yes | Yes/No | No | Yes |
| System.reset() | Boot after software reset | Yes | Yes/No | No | Yes |
| Hard reset | Boot after hard reset | Yes | Yes/No | No | Yes |

<sup>[1]</sup> Note: If VBAT is floating when powering up for the first time, SRAM remains uninitialized.  When using this feature for Backup RAM, it is recommended to have VBAT connected to a 3V3 or a known good power source on system first boot.  When using this feature for Extra RAM, it is recommended to jumper VBAT to GND to ensure it always initializes on system first boot.
{{/if}}

{{#if has-nrf52}}
A 3068 bytes section of backup RAM is provided for storing values that are maintained across system reset and hibernate sleep mode. Unlike EEPROM emulation, the backup RAM can be accessed at the same speed as regular RAM and does not have any wear limitations.

On Gen 3 devices (Argon, Boron, B Series SoM), retained memory is only initialized in Device OS 1.5.0 and later. In prior versions, retained memory would always be uninitialized on first power-up.
{{/if}}

### Storing data in Backup RAM (SRAM)

With regular RAM, data is stored in RAM by declaring variables.

```cpp
// regular variables stored in RAM
float lastTemperature;
int numberOfPresses;
int numberOfTriesRemaining = 10;
```

This tells the system to store these values in RAM so they can be changed. The
system takes care of giving them initial values. Before they are set,
they will have the initial value 0 if an initial value isn't specified.

Variables stored in backup RAM follow a similar scheme but use an additional keyword `retained`:

```cpp
// retained variables stored in backup RAM
retained float lastTemperature;
retained int numberOfPresses;
retained int numberOfTriesRemaining = 10;
```

A `retained` variable is similar to a regular variable, with some key differences:

- it is stored in backup RAM - no space is used in regular RAM
- instead of being initialized on each program start, `retained` variables are initialized
when the device is first powered on (with VIN, from being powered off with VIN and VBAT completely removed).
When the device is powered on, the system takes care of setting these variables to their initial values.
`lastTemperature` and `numberOfPresses` would be initialized to 0, while `numberOfTriesRemaining` would be initialized to 10.
- the last value set on the variable is retained *as long as the device is powered from VIN or VBAT and is not hard reset*.

`retained` variables can be updated freely just as with regular RAM variables and operate
just as fast as regular RAM variables.

Here's some typical use cases for `retained` variables:

- storing data for use after waking up from deep sleep
- storing data for use after power is removed on VIN, while power is still applied to VBAT (with coin cell battery or super capacitor)
- storing data for use after a hardware or software reset

Finally, if you don't need the persistence of `retained` variables, you
can consider them simply as extra RAM to use.

```cpp
// EXAMPLE USAGE
SerialLogHandler logHandler;

retained int value = 10;

void setup() {
    System.enableFeature(FEATURE_RETAINED_MEMORY);
}

void loop() {
    Log.info("value before=%s", value);
    value = 20;
    Log.info("value after=%s", value);
    delay(100); // Give the serial TX buffer a chance to empty
    System.sleep(SLEEP_MODE_DEEP, 10);
    // Or try a software reset
    // System.reset();
}

/* OUTPUT
 *
 * 10
 * 20
 * DEEP SLEEP for 10 seconds
 * 20 (value is retained as 20)
 * 20
 *
 */
```

### Enabling Backup RAM (SRAM)

Backup RAM is disabled by default, since it does require some maintenance power
which may not be desired on some low-powered projects.  Backup RAM consumes roughly
5uA or less on VIN and 9uA or less on VBAT.

Backup RAM is enabled with this code in setup():

```cpp
void setup() 
{
  System.enableFeature(FEATURE_RETAINED_MEMORY));
}
```

### Making changes to the layout or types of retained variables

When adding new `retained` variables to an existing set of `retained` variables,
it's a good idea to add them after the existing variables. this ensures the
existing retained data is still valid even with the new code.

For example, if we wanted to add a new variable `char name[50]` we should add this after
the existing `retained` variables:

```
retained float lastTemperature;
retained int numberOfPresses;
retained int numberOfTriesRemaining = 10;
retained char name[50];
```

If instead we added `name` to the beginning or middle of the block of variables,
the program would end up reading the stored values of the wrong variables.  This is
because the new code would be expecting to find the variables in a different memory location.

Similarly, you should avoid changing the type of your variables as this will also
alter the memory size and location of data in memory.

This caveat is particularly important when updating firmware without power-cycling
the device, which uses a software reset to reboot the device.  This will allow previously
`retained` variables to persist.

During development, a good suggestion to avoid confusion is to design your application to work
correctly when power is being applied for the first time, and all `retained` variables are
initialized.  If you must rearrange variables, simply power down the device (VIN and VBAT)
after changes are made to allow reinitialization of `retained` variables on the next power
up of the device.

It's perfectly fine to mix regular and `retained` variables, but for clarity we recommend
keeping the `retained` variables in their own separate block. In this way it's easier to recognize
when new `retained` variables are added to the end of the list, or when they are rearranged.


{{/if}} {{!-- has-backup-ram --}}

## Macros

### STARTUP()

```cpp
void setup_the_fundulating_conbobulator()
{
   pinMode(D3, OUTPUT);
   digitalWrite(D3, HIGH);
}

// The STARTUP call is placed outside of any other function
// What goes inside is any valid code that can be executed. Here, we use a function call.
// Using a single function is preferable to having several `STARTUP()` calls.
STARTUP( setup_the_fundulating_conbobulator() );
```

Typically an application will have its initialization code in the `setup()` function. Using `SYSTEM_THREAD(ENABLED)` reduces the amount of time before setup is called to milliseconds and is the recommended method of calling code early.

The `STARTUP()` function instructs the system to execute the code even earlier, however there are limitations:

- STARTUP should only be used for things like setting GPIO state very early.
- Avoid using most system calls except as listed below. For example, you cannot use System.sleep(), any Particle calls like Particle.publish(), etc.
- Avoid using I2C (Wire) and SPI from STARTUP.
- The order of globally constructed objects is unpredictable and you should not rely on global variables being fully initialized.

The code referenced by `STARTUP()` is executed very early in the startup sequence, so it's best suited
to initializing digital I/O and peripherals. Networking setup code should still be placed in `setup()`.
{{#if has-wifi-antenna-switch}}
Although there is one notable exception - `WiFi.selectAntenna()` should be called from `STARTUP()` to select the default antenna before the Wi-Fi connection is made on the Photon and P1.
{{/if}}

Note that when startup code performs digital I/O, there will still be a period of at least few hundred milliseconds
where the I/O pins are in their default power-on state, namely `INPUT`. Circuits should be designed with this
in mind, using pullup/pulldown resistors as appropriate. For Gen 2 devices, see note below about JTAG/SWD as well.

---

{{note op="start" type="gen2"}}
Some acceptable calls to make from `STARTUP()` on Gen 2 devices (Photon, P1, Electron, E Series) include:

- `cellular_credentials_set()`
- `WiFi.selectAntenna()`
- `Mouse.begin()`
- `Keyboard.begin()`

On Gen 2 devices, beware when using pins D3, D5, D6, and D7 as OUTPUT controlling external devices on Gen 2 devices. After reset, these pins will be briefly taken over for JTAG/SWD, before being restored to the default high-impedance INPUT state during boot.

- D3, D5, and D7 are pulled high with a pull-up
- D6 is pulled low with a pull-down
- D4 is left floating

The brief change in state (especially when connected to a MOSFET that can be triggered by the pull-up or pull-down) may cause issues when using these pins in certain circuits. Using STARTUP will not prevent this!
{{note op="end"}}

### PRODUCT_ID()

When preparing software for your product, it is essential to include your product ID and version at the top of the firmware source code.

```cpp
// EXAMPLE
PRODUCT_ID(94); // replace by your product ID
PRODUCT_VERSION(1); // increment each time you upload to the console
```

You can find more details about the product ID and how to get yours in the [_Console_ guide.](/tutorials/device-cloud/console#your-product-id)

In Device OS 1.5.3 and later, you can also use a wildcard product ID. In order to take advantage of this feature you must pre-add the device IDs to your product as you cannot use quarantine with a wildcard product ID. Then use:

```cpp
PRODUCT_ID(PLATFORM_ID);
PRODUCT_VERSION(1); // increment each time you upload to the console
```

This will allow the device to join the product it has been added to without hardcoding the product ID into the device firmware. This is used with the Tracker SoM to join the product it is assigned to with the factory firmware and not have to recompile and flash custom firmware. 



{{#if has-sleep}}

## sleep() [ Sleep ]

```cpp
SystemSleepConfiguration config;
config.mode(SystemSleepMode::STOP)
      .gpio(D2, RISING);
SystemSleepResult result = System.sleep(config);
```


{{since when="1.5.0"}}

`System.sleep()` can be used to dramatically improve the battery life of a Particle-powered project. 

The `SystemSleepConfiguration` class configures all of the sleep parameters and eliminates the previous numerous and confusing overloads of the `System.sleep()` function. You pass this object to `System.sleep()`.

For earlier versions of Device OS you can use the [classic API](#sleep-classic-api-).

The Tracker One and Tracker SoM have an additional layer of sleep functionality. You can find out more in the [Tracker Sleep Tutorial](/tutorials/asset-tracking/tracker-sleep/) and [TrackerSleep API Reference](/reference/asset-tracking/tracker-edge-firmware/#trackersleep).

### mode() (SystemSleepConfiguration)

The are are three sleep modes:

- STOP
- ULTRA_LOW_POWER
- HIBERNATE

| | STOP | ULTRA_LOW_POWER | HIBERNATE |
| :--- | :---: | :---: | :---: |
| Relative power consumption | Low | Lower | Lowest |
| Relative wake options | Most | Some | Fewest |
| Execution continues with variables intact | &check; | &check; | &nbsp; |


---

### STOP (SystemSleepMode)

```cpp
// EXAMPLE
SystemSleepConfiguration config;
config.mode(SystemSleepMode::STOP)
      .gpio(WKP, RISING)
      .duration(15min);
System.sleep(config);

// EXAMPLE
SystemSleepConfiguration config;
config.mode(SystemSleepMode::STOP)
      .network(NETWORK_INTERFACE_CELLULAR)
      .flag(SystemSleepFlag::WAIT_CLOUD)
      .duration(15min);
```

The `SystemSleepMode::STOP` mode is the same as the classic stop sleep mode (pin or pin + time). 

- Real-time clock (RTC) is kept running.
- Network is optionally kept running for cellular, similar to  `SLEEP_NETWORK_STANDBY`.
- On the Argon, network can optionally be kept running for Wi-Fi.
- BLE is kept on if used as a wake-up source (Gen 3 devices only).
- UART, ADC are only kept on if used as a wake-up source. 
- GPIO are kept on; OUTPUT pins retain their HIGH or LOW voltage level during sleep.
- Can wake from: Time, GPIO, analog, serial, and cellular. On Gen 3 also BLE and Wi-Fi.
- On wake, execution continues after the the `System.sleep()` command with all local and global variables intact.

| Wake Mode | Gen 2 | Gen 3 |
| :--- | :---: | :---: |
| GPIO | &check; | &check; |
| Time (RTC) | &check; | &check; | 
| Analog | &check; | &check; | 
| Serial | &check; | &check; | 
| BLE | &nbsp; | &check; |
| Cellular | &check; | &check; |
| Wi-Fi | &nbsp; | &check; |

Typical power consumption in STOP sleep mode, based on the wakeup source:

| Device      | GPIO      | RTC       | Analog    | Serial    | BLE       | Network   |
| :---------- | --------: | --------: | --------: | --------: | --------: | --------: |
| T523 Eval   |    872 uA |    873 uA |    852 uA |    840 uA |    919 uA |   21.5 mA |
| T402 Eval   |    807 uA |    835 uA |    831 uA |    798 uA |    858 uA |   17.2 mA |
| Boron 2G/3G |    631 uA |    607 uA |    585 uA |    606 uA |    907 uA |   15.6 mA |
| Boron LTE   |    575 uA |    584 uA |    577 uA |    587 uA |    885 uA |   12.1 mA |
| B402 SoM    |    555 uA |    556 uA |    557 uA |    556 uA |    631 uA |    9.7 mA |
| B523 SoM    |    538 uA |    537 uA |    537 uA |    537 uA |    604 uA |   23.1 mA |
| Argon       |    396 uA |    398 uA |    398 uA |    397 uA |    441 uA |   22.2 mA |
| Electron    |   2.40 mA |   2.53 mA |   6.03 mA |   13.1 mA |       n/a |   28.1 mA |  
| Photon      |   2.75 mA |   2.82 mA |   7.56 mA |   18.2 mA |       n/a |       n/a |

---

{{note op="start" type="cellular"}}
- On cellular devices, wake-on network can be enabled in STOP mode. This is recommended for any sleep duration of less than 10 minutes as it keeps the modem active while in sleep mode.

- You should avoid powering off and on the cellular modem in periods of less than 10 minutes. Since the cellular modem needs to reconnect to the cellular network on wake, your mobile carrier may ban your SIM card from the network for aggressive reconnection if you reconnect more than approximately 6 times per hour.
{{note op="end"}}

---

### ULTRA_LOW_POWER (SystemSleepMode)

```cpp
// EXAMPLE
SystemSleepConfiguration config;
config.mode(SystemSleepMode::ULTRA_LOW_POWER)
      .gpio(D2, FALLING);
System.sleep(config);
```

{{since when="2.0.0"}}

The `SystemSleepMode::ULTRA_LOW_POWER` mode is similar to STOP mode however internal peripherals such as GPIO, UART, ADC, and DAC are turned off. Like STOP mode, the RTC continues to run but since many more peripherals are disabled, the current used is closer to HIBERNATE. It is available in Device OS 2.0.0 and later.

In this mode:

- Real-time clock (RTC) is kept running.
- Network is kept on if used as a wake-up source (Gen 3 devices only).
- BLE is kept on if used as a wake-up source (Gen 3 devices only).
- GPIO, UART, ADC are only kept on if used as a wake-up source. 
- OUTPUT GPIO are disabled in ultra-low power mode.
- Can wake from: Time or GPIO. On Gen 3 also analog, serial, BLE, and network.
- On wake, execution continues after the the `System.sleep()` command with all local and global variables intact.

| Wake Mode | Gen 2 | Gen 3 |
| :--- | :---: | :---: |
| GPIO | &check; | &check; |
| Time (RTC) | &check; | &check; | 
| Analog | &nbsp; | &check; | 
| Serial | &nbsp; | &check; | 
| BLE | &nbsp; | &check; |
| Cellular | &nbsp; | &check; |
| Wi-Fi | &nbsp; | &check; |


Typical power consumption in ultra-low power (ULP) sleep mode, based on the wakeup source:

| Device      | GPIO      | RTC       | Analog    | Serial    | BLE       | Network   |
| :---------- | --------: | --------: | --------: | --------: | --------: | --------: |
| T523 Eval   |    139 uA |    139 uA |    140 uA |    564 uA |    214 uA |   21.7 mA |
| T402 Eval   |    114 uA |    114 uA |    117 uA |    530 uA |    186 uA |   16.9 mA |
| Boron 2G/3G |    171 uA |    174 uA |    178 uA |    610 uA |    494 uA |   16.4 mA |
| Boron LTE   |    127 uA |    128 uA |    130 uA |    584 uA |    442 uA |   14.2 mA |
| B402 SoM    |     48 uA |     47 uA |     48 uA |    557 uA |    130 uA |    9.5 mA |
| B523 SoM    |     54 uA |     55 uA |     56 uA |    537 uA |    139 uA |   22.8 mA |
| Argon       |     82 uA |     81 uA |     82 uA |    520 uA |    141 uA |   21.3 mA |
| Electron    |   2.42 mA |   2.55 mA |       n/a |       n/a |       n/a |       n/a |  
| Photon      |   2.76 mA |   2.83 mA |       n/a |       n/a |       n/a |       n/a |

---

{{note op="start" type="cellular"}}
- On Gen 3 cellular devices, wake-on network can be enabled in ultra-low power mode. This is recommended for any sleep duration of less than 10 minutes as it keeps the modem active while in sleep mode.

- You should avoid powering off and on the cellular modem in periods of less than 10 minutes. Since the cellular modem needs to reconnect to the cellular network on wake, your mobile carrier may ban your SIM card from the network for aggressive reconnection if you reconnect more than approximately 6 times per hour.
{{note op="end"}}

---

### HIBERNATE (SystemSleepMode)

```
// EXAMPLE
SystemSleepConfiguration config;
config.mode(SystemSleepMode::HIBERNATE)
      .gpio(WKP, RISING);
System.sleep(config);
```

The `SystemSleepMode::HIBERNATE` mode is the similar to the classic `SLEEP_MODE_DEEP`. It is the lowest power mode, however there are limited ways you can wake:

| Wake Mode | Gen 2 | Gen 3 |
| :--- | :---: | :---: |
| GPIO | WKP RISING Only | &check; |
| Time (RTC) | &check; | <sup>1</sup> | 
| Analog | &nbsp; | &check; | 

<sup>1</sup>Tracker SoM can wake from RTC in HIBERNATE mode. Other Gen 3 devices cannot.

Typical power consumption in hibernate sleep mode, based on the wakeup source:

| Device      | GPIO      | RTC       |
| :---------- | --------: | --------: |
| T523 Eval   |    103 uA |     95 uA |
| T402 Eval   |    103 uA |     95 uA |
| Boron 2G/3G |    146 uA |       n/a |
| Boron LTE   |    106 uA |       n/a |
| B402 SoM    |     26 uA |       n/a |
| B523 SoM    |     30 uA |       n/a |
| Argon       |     65 uA |       n/a |
| Electron    |    114 uA |    114 uA |
| Photon      |    114 uA |    114 uA |

In this mode:

- Real-time clock (RTC) stops (Argon, Boron, B Series SoM).
- Can wake from: Time or GPIO. On Gen 3 also analog.
- On wake, device is reset, running setup() again.


---

{{note op="start" type="gen3"}}
- On the Argon, Boron, and B Series SoM you can only wake by pin, not by time, in HIBERNATE mode.

- On the Tracker SoM you can wake by time from HIBERNATE mode using the hardware RTC (AM1805).

- You can wake from HIBERNATE (SLEEP_MODE_DEEP) on any GPIO pin, on RISING, FALLING, or CHANGE, not just WKP/D8 with Device OS 2.0.0 and later on Gen 3 devices.

- Since the difference in current consumption is so small between HIBERNATE and ULTRA_LOW_POWER, using ULTRA_LOW_POWER is a good alternative if you wish to wake based on time on Gen 3 devices. The difference is 106 uA vs. 127 uA on the Boron LTE, for example.
{{note op="end"}}

{{note op="start" type="gen2"}}
- On the Photon, P1, Electron, and E Series you can only wake on time or WKP RISING in HIBERNATE mode.
{{note op="end"}}

{{note op="start" type="cellular"}}
- On cellular devices, the cellular modem is turned off in HIBERNATE mode. This reduces current consumption but increases the time to reconnect. Also, you should avoid any HIBERNATE period of less than 10 minutes on cellular devices. Since the cellular modem needs to reconnect to the cellular network on wake, your mobile carrier may ban your SIM card from the network for aggressive reconnection if you reconnect more than approximately 6 times per hour.
{{note op="end"}}

---

### duration() (SystemSleepConfiguration)

```c++
// PROTOTYPES
SystemSleepConfiguration& duration(system_tick_t ms)
SystemSleepConfiguration& duration(std::chrono::milliseconds ms)

// EXAMPLE
SystemSleepConfiguration config;
config.mode(SystemSleepMode::HIBERNATE)
      .gpio(WKP, RISING)
      .duration(15min);
```

Specifies the sleep duration in milliseconds. Note that this is different than the classic API, which was in seconds.

You can also specify a value using [chrono literals](#chrono-literals), for example: `.duration(15min)` for 15 minutes.

---

{{note op="start" type="gen3"}}
On the Argon, Boron, B Series SoM, and Tracker SoM you cannot wake from HIBERNATE mode by time because the RTC does not run in HIBERNATE mode. You can only wake by pin. The maximum duration is approximately 24 days in STOP mode. You can wake by time in ultra-low power (ULP) mode.
{{note op="end"}}

{{note op="start" type="gen2"}}
On the Photon, P1, Electron, and E Series even though the parameter can be in milliseconds, the resolution is only in seconds, and the minimum sleep time is 1000 milliseconds.
{{note op="end"}}

{{note op="start" type="cellular"}}
On cellular devices, if you turn off the cellular modem, you should not wake with a period of less than 10 minutes on average. Your mobile carrier may ban your SIM card from the network for aggressive reconnection if you reconnect more than approximately 6 times per hour. You can wake your device frequently if you do not reconnect to cellular every time. For example, you can wake, sample a sensor and save the value, then go to sleep and only connect to cellular and upload the data every 10 minutes. Or you can use cellular standby so cellular stays connected through sleep cycles and then you can sleep for short durations.
{{note op="end"}}


---

### gpio() (SystemSleepConfiguration)


```c++
// PROTOTYPE
SystemSleepConfiguration& gpio(pin_t pin, InterruptMode mode) 

// EXAMPLE
SystemSleepConfiguration config;
config.mode(SystemSleepMode::HIBERNATE)
      .gpio(WKP, RISING);

// EXAMPLE
SystemSleepConfiguration config;
config.mode(SystemSleepMode::STOP)
      .gpio(D2, RISING);
      .gpio(D3, FALLING);
```

Specifies wake on pin. The mode is:

- RISING
- FALLING
- CHANGE

You can use `.gpio()` multiple times to wake on any of multiple pins, with the limitations below.

---

{{note op="start" type="gen3"}}
- You can wake on any pins on Gen 3 devices, however there is as limit of 8 total pins for wake.

On Gen 3 devices the location of the `WKP` pin varies, and it may make more sense to just use the actual pin name. You do not need to use `WKP` to wake from `HIBERNATE` on Gen 3 devices, and you can wake on either RISING, FALLING or CHANGE.
- Argon, Boron, and Xenon, WKP is pin D8. 
- B Series SoM, WKP is pin A7 in Device OS 1.3.1 and later. In prior versions, it was D8. 
- Tracker SoM WKP is pin A7/D7.
{{note op="end"}}

{{note op="start" type="gen2"}}
- You can only wake on external interrupt-supported pins on Gen 2 devices. See the list in [`attachInterrupt`](#attachinterrupt-).
- On the Photon, P1, Electron, and E Series you can only wake from HIBERNATE mode using WKP RISING. 
- Do not attempt to enter sleep mode with WKP already high. Doing so will cause the device to never wake again, either by pin or time.
- `SLEEP_MODE_DEEP` in the classic API defaults to allowing wake by `WKP` rising. This is no longer automatic and you should specify it explicitly as in the example here if you want this behavior by adding `.gpio(WKP, RISING)`.
{{note op="end"}}
---


### flag() (SystemSleepConfiguration)

```c++
// PROTOTYPE
SystemSleepConfiguration& flag(particle::EnumFlags<SystemSleepFlag> f)

// EXAMPLE
SystemSleepConfiguration config;
config.mode(SystemSleepMode::STOP)
      .network(NETWORK_INTERFACE_CELLULAR)
      .flag(SystemSleepFlag::WAIT_CLOUD)
      .duration(2min);
```

The only supported flag is:

- `SystemSleepFlag::WAIT_CLOUD`

This will make sure all cloud messages have been acknowledged before going to sleep. Another way to accomplish this is to use [graceful disconnect mode](#particle-setdisconnectoptions-).

---

### network() (SystemSleepConfiguration)

```c++
// PROTOTYPE
SystemSleepConfiguration& network(network_interface_t netif, EnumFlags<SystemSleepNetworkFlag> flags = SystemSleepNetworkFlag::NONE)

// EXAMPLE 1
SystemSleepConfiguration config;
config.mode(SystemSleepMode::STOP)
      .duration(15min)
      .network(NETWORK_INTERFACE_CELLULAR);

// EXAMPLE 2
SystemSleepConfiguration config;
config.mode(SystemSleepMode::ULTRA_LOW_POWER)
      .duration(15min)
      .network(NETWORK_INTERFACE_CELLULAR, SystemSleepNetworkFlag::INACTIVE_STANDBY);

```

This option not only allows wake from network activity, but also keeps the network connected, making resume from sleep significantly faster. This is a superset of the `SLEEP_NETWORK_STANDBY` feature. This should also be used with cellular devices with sleep periods of less than 10 minutes to prevent your SIM from being banned for aggressively reconnecting to the cellular network.

| Network Wake Support | Gen 2 Wi-Fi | Gen 2 Cellular | Gen 3 (any) |
| :--- | :---: | :---: | :---: |
| Wake from STOP sleep | | &check; | &check; |
| Wake from ULTRA_LOW_POWER sleep | &nbsp; | &nbsp; | &check; |
| Wake from HIBERNATE sleep | &nbsp; | &nbsp; | &nbsp; |

The first example configures the cellular modem to both stay awake and for the network to be a wake source. If incoming data, from a function call, variable request, subscribed event, or OTA request arrives, the device will wake from sleep mode.

The second example adds the `SystemSleepNetworkFlag::INACTIVE_STANDBY` flag which keeps the cellular modem powered, but does not wake the MCU for received data. This is most similar to `SLEEP_NETWORK_STANDBY`.

Note: You must not sleep longer than the keep-alive value, which by default is 23 minutes in order to wake on data received by cellular. The reason is that if data is not transmitted by the device before the keep-alive expires, the mobile network will remove the channel back to the device, so it can no longer receive data from the cloud. Fortunately in network sleep mode you can wake, transmit data, and go back to sleep in a very short period of time, under 2 seconds, to keep the connection alive without using significanly more battery power.

If you use `NETWORK_INTERFACE_CELLULAR` without `INACTIVE_STANDBY`, then data from the cloud to the device (function, variable, subscribe, OTA) will wake the device from sleep. However if you sleep for less than the keep-alive length, you can wake up with zero additional overhead. This is offers the fastest wake time with the least data usage.

If you use `INACTIVE_STANDBY`, the modem is kept powered, but the cloud is disconnected. This eliminates the need to go through a reconnection process to the cellular tower (blinking green) and prevents problems with aggressive reconnection. The device will not wake from sleep on functions, variables, or OTA. However, it also will cause the cloud to disconnect. The device will be marked offline in the console, and will go through a cloud session resumption on wake. This will result in the normal session negotiation and device vitals events at wake that are normally part of the blinking cyan phase.

### analog() (SystemSleepConfiguration)

```c++
// PROTOTYPE
SystemSleepConfiguration& analog(pin_t pin, uint16_t voltage, AnalogInterruptMode trig) 

// EXAMPLE
SystemSleepConfiguration config;
config.mode(SystemSleepMode::STOP)
      .analog(A2, 1500, AnalogInterruptMode::BELOW);
```

Wake on an analog voltage compared to a reference value specified in **millivolts**. Can only be used on analog pins. Voltage is a maximum of 3.3V (3300 mV).

The `AnalogInterruptMode` is one of:

- AnalogInterruptMode::ABOVE - Voltage rises above the threshold `voltage`.
- AnalogInterruptMode::BELOW - Voltage falls below the threshold `voltage`.
- AnalogInterruptMode::CROSS - Voltage crosses the threshold `volage` in either direction.

| Analog Wake Support | Gen 2 | Gen 3|
| :--- | :---: | :---: |
| Wake from STOP sleep | &check; | &check; |
| Wake from ULTRA_LOW_POWER sleep | &nbsp; | &check; |
| Wake from HIBERNATE sleep | &nbsp; | &nbsp;  |


### usart (SystemSleepConfiguration)

```c++
// PROTOTYPE
SystemSleepConfiguration& usart(const USARTSerial& serial)

// EXAMPLE
SystemSleepConfiguration config;
config.mode(SystemSleepMode::STOP)
      .usart(Serial1);
```

Wake from a hardware UART (USART). This can only be done with a hardware serial port; you cannot wake from the USB virtual serial port (Serial).

Note: Keeping the USART active in ultra-low power mode significanly increases the current used while sleeping.

| USART Wake Support | Gen 2 | Gen 3|
| :--- | :---: | :---: |
| Wake from STOP sleep | &check; | &check; |
| Wake from ULTRA_LOW_POWER sleep | &nbsp; | &check; |
| Wake from HIBERNATE sleep | &nbsp; | &nbsp; |

---

### ble() (SystemSleepConfiguration)

```c++
// PROTOTYPE
SystemSleepConfiguration& ble()

// EXAMPLE
SystemSleepConfiguration config;
config.mode(SystemSleepMode::STOP)
      .duration(15min)
      .ble();
```

Wake on Bluetooth LE data (BLE). Only available on Gen 3 platforms (Argon, Boron, B Series SoM, and Tracker SoM).

In addition to Wake on BLE, this keeps the BLE subsystem activated so the nRF52 MCU can wake up briefly to:

- Advertise when in BLE peripheral mode. This allows the MCU to wake when a connection is attempted.
- Keep an already open connection alive, in both central and peripheral mode. This allows the MCU to wake when data arrives on the connection or when the connection is lost.

This brief wake-up only services the radio. User firmware and Device OS do not resume execution if waking only to service the radio. If the radio receives incoming data or connection attempt packets, then the MCU completely wakes up in order to handle those events.

| BLE Wake Support | Gen 2 | Gen 3 |
| :--- | :---: | :---: |
| Wake from STOP sleep | &nbsp; | &check; |
| Wake from ULTRA_LOW_POWER sleep | &nbsp; | &check; |
| Wake from HIBERNATE sleep | &nbsp; | &nbsp; |



## SystemSleepResult Class

{{since when="1.5.0"}}

The `SystemSleepResult` class is a superset of the older [`SleepResult`](#sleepresult-) class and contains additional information when using `System.sleep()` with the newer API. 

### wakeupReason() (SystemSleepResult)

```cpp
// PROTOTYPE
SystemSleepWakeupReason wakeupReason() const;

// EXAMPLE
SystemSleepConfiguration config;
config.mode(SystemSleepMode::STOP)
      .gpio(D2, FALLING)
      .duration(15min);
SystemSleepResult result = System.sleep(config);
if (result.wakeupReason() == SystemSleepWakeupReason::BY_GPIO) {
  // Waken by pin 
  pin_t whichPin = result.wakeupPin();
}
```

Returns the reason for wake. Constants include:

| Constant | Purpose |
| :--- | :--- |
| `SystemSleepWakeupReason::UNKNOWN` | Unknown reason |
| `SystemSleepWakeupReason::BY_GPIO` | GPIO pin |
| `SystemSleepWakeupReason::BY_RTC` | Time-based |
| `SystemSleepWakeupReason::BY_LPCOMP` | Analog value |
| `SystemSleepWakeupReason::BY_USART` | Serial |
| `SystemSleepWakeupReason::BY_CAN` | CAN bus |
| `SystemSleepWakeupReason::BY_BLE` | BLE |
| `SystemSleepWakeupReason::BY_NETWORK` | Network (cellular or Wi-Fi) |


### wakeupPin() (SystemSleepResult)

```cpp
// PROTOTYPE
pin_t wakeupPin() const;
```

If `wakeupReason()` is `SystemSleepWakeupReason::BY_GPIO` returns which pin caused the wake. See example under `wakeupReason()`, above.

### error() (SystemSleepResult)

```cpp
// PROTOTYPE
system_error_t error() const;
```

If there was an error, returns the system error code. 0 is no error.

### toSleepResult() (SystemSleepResult)

```cpp
// PROTOTYPES
SleepResult toSleepResult();
operator SleepResult();
```

Returns the previous style of [`SleepResult`](#sleepresult-). There is also an operator to automatically convert to a `SleepResult`.


## sleep() [ Classic API ]

This API is the previous API for sleep and is less flexible. You should use the [newer sleep APIs](#sleep-sleep-) with Device OS 1.5.0 and later.

`System.sleep()` can be used to dramatically improve the battery life of a Particle-powered project. There are several variations of `System.sleep()` based on which arguments are passed.

{{#if has-nrf52}}
Gen 3 devices (Argon, Boron, Xenon) only support sleep modes in 0.9.0 and later. Sleep does not function properly in 0.8.0-rc versions of Device OS for Gen 3 devices.

On the Argon, Boron, and Xenon, WKP is pin D8.

On the B Series SoM, WKP is pin A7 in Device OS 1.3.1 and later. In prior versions, it was D8.

On the Tracker SoM WKP is pin A7/D7.

{{/if}}

---

{{#if has-stm32}}
`System.sleep(SLEEP_MODE_DEEP, long seconds)` can be used to put the entire device into a *deep sleep* mode, sometimes referred to as "standby sleep mode."

```cpp
// SYNTAX
System.sleep(SLEEP_MODE_DEEP, long seconds);

// EXAMPLE USAGE

// Put the device into deep sleep for 60 seconds
System.sleep(SLEEP_MODE_DEEP, 60);
// The device LED will shut off during deep sleep

// Since 0.8.0
// Put the device into deep sleep for 60 seconds and disable WKP pin
System.sleep(SLEEP_MODE_DEEP, 60, SLEEP_DISABLE_WKP_PIN);
// The device LED will shut off during deep sleep
// The device will not wake up if a rising edge signal is applied to WKP
```

Note: Be sure WKP is LOW before going into SLEEP_MODE_DEEP with a time interval! If WKP is high, even if it falls and rises again the device will not wake up. Additionally, the time limit will not wake the device either, and the device will stay in sleep mode until reset or power cycled.


{{since when="1.5.0"}}

You can also specify a value using [chrono literals](#chrono-literals), for example: `System.sleep(SLEEP_MODE_DEEP, 2min)` for 2 minutes.


{{/if}} {{!-- has-stm32 --}}

{{#if has-nrf52}}
`System.sleep(SLEEP_MODE_DEEP)` can be used to put the entire device into a *deep sleep* mode, sometimes referred to as "standby sleep mode."


```cpp
// SYNTAX
System.sleep(SLEEP_MODE_DEEP);

// EXAMPLE USAGE

// Put the device into deep sleep until wakened by D8.
System.sleep(SLEEP_MODE_DEEP);
// The device LED will shut off during deep sleep
```

On the Boron, B Series SoM, and Tracker SoM it is not useful to combine `SLEEP_MODE_DEEP` and `SLEEP_NETWORK_STANDBY` as the modem will remain on, but also be reset when the device resets, eliminating any advantage of using `SLEEP_NETWORK_STANDBY`.

{{/if}} {{!-- has-nrf52 --}}

In this particular mode, the device shuts down the network subsystem and puts the microcontroller in a standby mode. 

When the device awakens from deep sleep, it will reset and run all user code from the beginning with no values being maintained in memory from before the deep sleep.

The standby mode is used to achieve the lowest power consumption.  After entering standby mode, the RAM and register contents are lost{{#if has-backup-ram}} except for retained memory{{/if}}.

For cellular devices, reconnecting to cellular after `SLEEP_MODE_DEEP` will generally use more power than using `SLEEP_NETWORK_STANDBY` for periods less than 15 minutes. You should definitely avoid using `SLEEP_MODE_DEEP` on cellular devices for periods less than 10 minutes. Your SIM can be blocked by your mobile carrier for aggressive reconnection if you reconnect to cellular very frequently.

{{#if has-stm32}}
The device will automatically *wake up* after the specified number of seconds or by applying a rising edge signal to the WKP pin. 

{{since when="0.8.0"}}
Wake up by WKP pin may be disabled by passing `SLEEP_DISABLE_WKP_PIN` option to `System.sleep()`: `System.sleep(SLEEP_MODE_DEEP, long seconds, SLEEP_DISABLE_WKP_PIN)`.

{{#if has-fuel-gauge}}
---

`System.sleep(SLEEP_MODE_SOFTPOWEROFF, long seconds)` is just like `SLEEP_MODE_DEEP`, with the added benefit that it also sleeps the Fuel Gauge. This is the only way to achieve the lowest quiescent current on the device, apart from sleeping the Fuel Gauge before calling `SLEEP_MODE_DEEP`. This is also the same net result as used in the user-activated Soft Power Down feature when you double-tap the Mode button and the Electron powers down.

```cpp
// SYNTAX
System.sleep(SLEEP_MODE_SOFTPOWEROFF, long seconds);
```
{{/if}} {{!-- has-fuel-gauge --}}

{{/if}} {{!-- has-stm32 --}}

{{#if has-nrf52}}

The Gen 3 devices (Argon, Boron, Xenon) can only wake from SLEEP_MODE_DEEP by a high level on D8. It's not possible to exit SLEEP_MODE_DEEP based on time because the clock does not run in standby sleep mode on the nRF52. 

Also, the real-time-clock (Time class) will not be set when waking up from SLEEP_MODE_DEEP. It will get set on after the first cloud connection, but initially it will not be set. 

{{#if has-fuel-gauge}}
---

`System.sleep(SLEEP_MODE_SOFTPOWEROFF)` is just like `SLEEP_MODE_DEEP`, with the added benefit that it also sleeps the Fuel Gauge. This is the only way to achieve the lowest quiescent current on the device, apart from sleeping the Fuel Gauge before calling `SLEEP_MODE_DEEP`.
```cpp
// SYNTAX
System.sleep(SLEEP_MODE_SOFTPOWEROFF);
```
{{/if}} {{!-- has-fuel-gauge --}}


{{/if}} {{!-- has-nrf52 --}}


---

`System.sleep(uint16_t wakeUpPin, uint16_t edgeTriggerMode)` can be used to put the entire device into a *stop* mode with *wakeup on interrupt*. In this particular mode, the device shuts down the network and puts the microcontroller in a stop mode with configurable wakeup pin and edge triggered interrupt. When the specific interrupt arrives, the device awakens from stop mode. 

The device will not reset before going into stop mode so all the application variables are preserved after waking up from this mode. This mode achieves the lowest power consumption while retaining the contents of RAM and registers.

```cpp
// SYNTAX
System.sleep(uint16_t wakeUpPin, uint16_t edgeTriggerMode);
{{#if has-cellular}}
System.sleep(uint16_t wakeUpPin, uint16_t edgeTriggerMode, SLEEP_NETWORK_STANDBY);
{{/if}}

// EXAMPLE USAGE

// Put the device into stop mode with wakeup using RISING edge interrupt on D1 pin
System.sleep(D1,RISING);
// The device LED will shut off during sleep
```

{{#if has-cellular}}
The Electron and Boron maintain the cellular connection for the duration of the sleep when  `SLEEP_NETWORK_STANDBY` is given as the last parameter value. On wakeup, the device is able to reconnect to the cloud much quicker, at the expense of increased power consumption during sleep. Roughly speaking, for sleep periods of less than 15 minutes, `SLEEP_NETWORK_STANDBY` uses less power.

For sleep periods of less than 10 minutes you must use `SLEEP_NETWORK_STANDBY`. Your SIM can be blocked by your mobile carrier for aggressive reconnection if you reconnect to cellular very frequently. Using `SLEEP_NETWORK_STANDBY` keeps the connection up and prevents your SIM from being blocked.
{{/if}}


*Parameters:*

- `wakeUpPin`: the wakeup pin number. supports external interrupts on the following pins:
{{#if has-stm32}}
    - supports external interrupts on the following pins:
      - D1, D2, D3, D4, A0, A1, A3, A4, A6, A7
      - The same [pin limitations as `attachInterrupt`](#attachinterrupt-) apply
{{else}}
    - all pins are allowed, but a maximum of 8 can be used at a time
{{/if}}
- `edgeTriggerMode`: defines when the interrupt should be triggered. Three constants are predefined as valid values:
    - CHANGE to trigger the interrupt whenever the pin changes value,
    - RISING to trigger when the pin goes from low to high,
    - FALLING for when the pin goes from high to low.
{{#if electron}}
- `SLEEP_NETWORK_STANDBY`: optional - keeps the cellular modem in a standby state while the device is sleeping..
{{/if}}

The device will automatically reconnect to the cloud if the cloud was connected when sleep was entered. If disconnected prior to sleep, it will stay disconnected on wake.

{{since when="0.8.0"}}
```cpp
// SYNTAX
System.sleep(std::initializer_list<pin_t> wakeUpPins, InterruptMode edgeTriggerMode);
System.sleep(const pin_t* wakeUpPins, size_t wakeUpPinsCount, InterruptMode edgeTriggerMode);

System.sleep(std::initializer_list<pin_t> wakeUpPins, std::initializer_list<InterruptMode> edgeTriggerModes);
System.sleep(const pin_t* wakeUpPins, size_t wakeUpPinsCount, const InterruptMode* edgeTriggerModes, size_t edgeTriggerModesCount);
{{#if has-cellular}}

System.sleep(std::initializer_list<pin_t> wakeUpPins, InterruptMode edgeTriggerMode, SLEEP_NETWORK_STANDBY);
System.sleep(const pin_t* wakeUpPins, size_t wakeUpPinsCount, InterruptMode edgeTriggerMode, SLEEP_NETWORK_STANDBY);

System.sleep(std::initializer_list<pin_t> wakeUpPins, std::initializer_list<InterruptMode> edgeTriggerModes, SLEEP_NETWORK_STANDBY);
System.sleep(const pin_t* wakeUpPins, size_t wakeUpPinsCount, const InterruptMode* edgeTriggerModes, size_t edgeTriggerModesCount, SLEEP_NETWORK_STANDBY);
{{/if}}

// EXAMPLE USAGE

// Put the device into stop mode with wakeup using RISING edge interrupt on D1 and A4 pins
// Specify the pins in-place (using std::initializer_list)
System.sleep({D1, A4}, RISING);
// The device LED will shut off during sleep

// Put the device into stop mode with wakeup using RISING edge interrupt on D1 and FALLING edge interrupt on A4 pin
// Specify the pins and edge trigger mode in-place (using std::initializer_list)
System.sleep({D1, A4}, {RISING, FALLING});
// The device LED will shut off during sleep

// Put the device into stop mode with wakeup using RISING edge interrupt on D1 and A4 pins
// Specify the pins in an array
pin_t wakeUpPins[2] = {D1, A4};
System.sleep(wakeUpPins, 2, RISING);
// The device LED will shut off during sleep

// Put the device into stop mode with wakeup using RISING edge interrupt on D1 and FALLING edge interrupt on A4 pin
// Specify the pins and edge trigger modes in an array
pin_t wakeUpPins[2] = {D1, A4};
InterruptMode edgeTriggerModes[2] = {RISING, FALLING};
System.sleep(wakeUpPins, 2, edgeTriggerModes, 2);
// The device LED will shut off during sleep
```

Multiple wakeup pins may be specified for this mode.

*Parameters:*

- `wakeUpPins`: a list of wakeup pins:
    - `std::initializer_list<pin_t>`: e.g. `{D1, D2, D3}`
    - a `pin_t` array. The length of the array needs to be provided in `wakeUpPinsCount` argument
{{#if has-stm32}}
    - supports external interrupts on the following pins:
      - D1, D2, D3, D4, A0, A1, A3, A4, A6, A7
      - The same [pin limitations as `attachInterrupt`](#attachinterrupt-) apply
{{else}}
    - all pins are allowed, but a maximum of 8 can be used at a time
{{/if}}

- `wakeUpPinsCount`: the length of the list of wakeup pins provided in `wakeUpPins` argument. This argument should only be specified if `wakeUpPins` is an array of pins and not an `std::initializer_list`.
- `edgeTriggerMode`: defines when the interrupt should be triggered. Three constants are predefined as valid values:
    - CHANGE to trigger the interrupt whenever the pin changes value,
    - RISING to trigger when the pin goes from low to high,
    - FALLING for when the pin goes from high to low.
- `edgeTriggerModes`: defines when the interrupt should be triggered on a specific pin from `wakeUpPins` list:
    - `std::initializer_list<InterruptMode>`: e.g. `{RISING, FALLING, CHANGE}`
    - an `InterruptMode` array. The length of the array needs to be provided in `edgeTriggerModesCount` argument
- `edgeTriggerModesCount`: the length of the edge trigger modes provided in `edgeTriggerModes` argument. This argument should only be specified if `edgeTriggerModes` is an array of modes and not an `std::initializer_list`.
{{#if electron}}
- `SLEEP_NETWORK_STANDBY`: optional - keeps the cellular modem in a standby state while the device is sleeping..
{{/if}}

```cpp
// SYNTAX
System.sleep(uint16_t wakeUpPin, uint16_t edgeTriggerMode, long seconds);
{{#if has-cellular}}
System.sleep(uint16_t wakeUpPin, uint16_t edgeTriggerMode, SLEEP_NETWORK_STANDBY, long seconds);
{{/if}}

// EXAMPLE USAGE

// Put the device into stop mode with wakeup using RISING edge interrupt on D1 pin or wakeup after 60 seconds whichever comes first
System.sleep(D1,RISING,60);
// The device LED will shut off during sleep
```

`System.sleep(uint16_t wakeUpPin, uint16_t edgeTriggerMode, long seconds)` can be used to put the entire device into a *stop* mode with *wakeup on interrupt* or *wakeup after specified seconds*. In this particular mode, the device shuts network subsystem and puts the microcontroller in a stop mode with configurable wakeup pin and edge triggered interrupt or wakeup after the specified seconds. When the specific interrupt arrives or upon reaching the configured timeout, the device awakens from stop mode. The device will not reset before going into stop mode so all the application variables are preserved after waking up from this mode. The voltage regulator is put in low-power mode. This mode achieves the lowest power consumption while retaining the contents of RAM and registers.

*Parameters:*

- `wakeUpPin`: the wakeup pin number. supports external interrupts on the following pins:
{{#if has-stm32}}
    - supports external interrupts on the following pins:
      - D1, D2, D3, D4, A0, A1, A3, A4, A6, A7
      - The same [pin limitations as `attachInterrupt`](#attachinterrupt-) apply
{{else}}
    - all pins are allowed, but a maximum of 8 can be used at a time
{{/if}}
apply
- `edgeTriggerMode`: defines when the interrupt should be triggered. Three constants are predefined as valid values:
    - CHANGE to trigger the interrupt whenever the pin changes value,
    - RISING to trigger when the pin goes from low to high,
    - FALLING for when the pin goes from high to low.
- `seconds`: wakeup after the specified number of seconds (0 = no alarm is set). {{#if has-nrf52}}On Gen 3 devices (Argon, Boron, Xenon), the maximum sleep time is approximately 24 days.{{/if}}
{{#if has-cellular}}
- `SLEEP_NETWORK_STANDBY`: optional - keeps the cellular modem in a standby state while the device is sleeping..
{{/if}}


{{since when="1.5.0"}}

You can also specify a value using [chrono literals](#chrono-literals), for example: `System.sleep(D1, RISING, 2min)` for 2 minutes.

{{since when="0.8.0"}}
```cpp
// SYNTAX
System.sleep(std::initializer_list<pin_t> wakeUpPins, InterruptMode edgeTriggerMode, long seconds);
System.sleep(const pin_t* wakeUpPins, size_t wakeUpPinsCount, InterruptMode edgeTriggerMode, long seconds);

System.sleep(std::initializer_list<pin_t> wakeUpPins, std::initializer_list<InterruptMode> edgeTriggerModes, long seconds);
System.sleep(const pin_t* wakeUpPins, size_t wakeUpPinsCount, const InterruptMode* edgeTriggerModes, size_t edgeTriggerModesCount, long seconds);
{{#if has-cellular}}

System.sleep(std::initializer_list<pin_t> wakeUpPins, InterruptMode edgeTriggerMode, SLEEP_NETWORK_STANDBY, long seconds);
System.sleep(const pin_t* wakeUpPins, size_t wakeUpPinsCount, InterruptMode edgeTriggerMode, SLEEP_NETWORK_STANDBY, long seconds);

System.sleep(std::initializer_list<pin_t> wakeUpPins, std::initializer_list<InterruptMode> edgeTriggerModes, SLEEP_NETWORK_STANDBY, long seconds);
System.sleep(const pin_t* wakeUpPins, size_t wakeUpPinsCount, const InterruptMode* edgeTriggerModes, size_t edgeTriggerModesCount, SLEEP_NETWORK_STANDBY, long seconds);
{{/if}}

// EXAMPLE USAGE

// Put the device into stop mode with wakeup using RISING edge interrupt on D1 and A4 pins or wakeup after 60 seconds whichever comes first
// Specify the pins in-place (using std::initializer_list)
System.sleep({D1, A4}, RISING, 60);
// The device LED will shut off during sleep

// Put the device into stop mode with wakeup using RISING edge interrupt on D1 and FALLING edge interrupt on A4 pin or wakeup after 60 seconds whichever comes first
// Specify the pins and edge trigger mode in-place (using std::initializer_list)
System.sleep({D1, A4}, {RISING, FALLING}, 60);
// The device LED will shut off during sleep

// Put the device into stop mode with wakeup using RISING edge interrupt on D1 and A4 pins or wakeup after 60 seconds whichever comes first
// Specify the pins in an array
pin_t wakeUpPins[2] = {D1, A4};
System.sleep(wakeUpPins, 2, RISING, 60);
// The device LED will shut off during sleep

// Put the device into stop mode with wakeup using RISING edge interrupt on D1 and FALLING edge interrupt on A4 pin or wakeup after 60 seconds whichever comes first
// Specify the pins and edge trigger modes in an array
pin_t wakeUpPins[2] = {D1, A4};
InterruptMode edgeTriggerModes[2] = {RISING, FALLING};
System.sleep(wakeUpPins, 2, edgeTriggerModes, 2, 60);
// The device LED will shut off during sleep
```

Multiple wakeup pins may be specified for this mode.

*Parameters:*

- `wakeUpPins`: a list of wakeup pins:
    - `std::initializer_list<pin_t>`: e.g. `{D1, D2, D3}`
    - a `pin_t` array. The length of the array needs to be provided in `wakeUpPinsCount` argument
{{#if has-stm32}}
    - supports external interrupts on the following pins:
      - D1, D2, D3, D4, A0, A1, A3, A4, A6, A7
      - The same [pin limitations as `attachInterrupt`](#attachinterrupt-) apply
{{else}}
    - all pins are allowed, but a maximum of 8 can be used at a time
{{/if}}
(#attachinterrupt-) apply
- `wakeUpPinsCount`: the length of the list of wakeup pins provided in `wakeUpPins` argument. This argument should only be specified if `wakeUpPins` is an array of pins and not an `std::initializer_list`.
- `edgeTriggerMode`: defines when the interrupt should be triggered. Three constants are predefined as valid values:
    - CHANGE to trigger the interrupt whenever the pin changes value,
    - RISING to trigger when the pin goes from low to high,
    - FALLING for when the pin goes from high to low.
- `edgeTriggerModes`: defines when the interrupt should be triggered on a specific pin from `wakeUpPins` list:
    - `std::initializer_list<InterruptMode>`: e.g. `{RISING, FALLING, CHANGE}`
    - an `InterruptMode` array. The length of the array needs to be provided in `edgeTriggerModesCount` argument
- `edgeTriggerModesCount`: the length of the edge trigger modes provided in `edgeTriggerModes` argument. This argument should only be specified if `edgeTriggerModes` is an array of modes and not an `std::initializer_list`.
- `seconds`: wakeup after the specified number of seconds (0 = no alarm is set). {{#if has-nrf52}}On Gen 3 devices (Argon, Boron, Xenon), the maximum sleep time is approximately 24 days.{{/if}}
{{#if has-cellular}}
- `SLEEP_NETWORK_STANDBY`: optional - keeps the cellular modem in a standby state while the device is sleeping..
{{/if}}

_Since 0.4.5._ The state of the {{network-type}} and Cloud connections is restored when the system wakes up from sleep. So if the device was connected to the cloud before sleeping, then the cloud connection
is automatically resumed on waking up.

_Since 0.5.0_ In automatic modes, the `sleep()` function doesn't return until the cloud connection has been established. This means that application code can use the cloud connection as soon as  `sleep()` returns. In previous versions, it was necessary to call `Particle.process()` to have the cloud reconnected by the system in the background.

_Since 0.8.0_ All `System.sleep()` variants return an instance of [`SleepResult`](#sleepresult-) class that can be queried on the result of `System.sleep()` execution.

_Since 0.8.0_ An application may check the information about the latest sleep by using [`System.sleepResult()`](#sleepresult-) or additional accessor methods:
- [`System.wakeUpReason()`](#wakeupreason-)
- [`System.wokenUpByPin()`](#wokenupbypin--1)
- [`System.wokenUpByRtc()`](#wokenupbyrtc--1)
- [`System.wakeUpPin()`](#wakeuppin-)
- [`System.sleepError()`](#sleeperror-)

---

`System.sleep(long seconds)` does NOT stop the execution of application code (non-blocking call).  Application code will continue running while the {{network-type}} module is in this mode.

This mode is not recommended; it is better to manually control the network connection using SYSTEM_MODE(MANUAL) instead.

```cpp
// SYNTAX
System.sleep(long seconds);

// EXAMPLE USAGE

// Put the Wi-Fi module in standby (low power) for 5 seconds
System.sleep(5);
// The device LED will breathe white during sleep
```

{{since when="1.5.0"}}

You can also specify a value using [chrono literals](#chrono-literals), for example: `System.sleep(2min)` for 2 minutes.


### Sleep [Transitioning from Classic API]

Some common sleep commands:

- `SLEEP_MODE_DEEP` wake by `WKP`:

```
// CLASSIC
System.sleep(SLEEP_MODE_DEEP);

// NEW
SystemSleepConfiguration config;
config.mode(SystemSleepMode::HIBERNATE)
      .gpio(WKP, RISING);
SystemSleepResult result = System.sleep(config);
```

---

- `SLEEP_MODE_DEEP` wake by `WKP` or time:

```
// CLASSIC
System.sleep(SLEEP_MODE_DEEP, 60);

// NEW
SystemSleepConfiguration config;
config.mode(SystemSleepMode::HIBERNATE)
      .gpio(WKP, RISING)
      .duration(60s);
SystemSleepResult result = System.sleep(config);
```
---

- `SLEEP_MODE_DEEP` wake by time only (disable WKP):

```
// CLASSIC
System.sleep(SLEEP_MODE_DEEP, 60, SLEEP_DISABLE_WKP_PIN);

// NEW
SystemSleepConfiguration config;
config.mode(SystemSleepMode::HIBERNATE)
      .duration(60s);
SystemSleepResult result = System.sleep(config);
```

---

- Stop mode sleep, pin D2 RISING

```
// CLASSIC
System.sleep(D2, RISING);

// NEW
SystemSleepConfiguration config;
config.mode(SystemSleepMode::STOP)
      .gpio(D2, RISING);
SystemSleepResult result = System.sleep(config);
```

---

- Stop mode sleep, pin D2 FALLING, or 30 seconds

```
// CLASSIC
System.sleep(D2, FALLING, 30);

// NEW
SystemSleepConfiguration config;
config.mode(SystemSleepMode::STOP)
      .gpio(D2, FALLING)
      .duration(30s);
SystemSleepResult result = System.sleep(config);
```

---

- Stop mode sleep, pin D2 or D3 RISING

```
// CLASSIC
System.sleep({D2, D3}, RISING);

// NEW
SystemSleepConfiguration config;
config.mode(SystemSleepMode::STOP)
      .gpio(D2, RISING);
      .gpio(D3, RISING);
SystemSleepResult result = System.sleep(config);
```

---

- Stop mode sleep, pin D2 rising, or 30 seconds with SLEEP_NETWORK_STANDBY

```
// CLASSIC
System.sleep(D2, RISING, SLEEP_NETWORK_STANDBY);

// NEW
SystemSleepConfiguration config;
config.mode(SystemSleepMode::STOP)
      .gpio(D2, RISING)
      .duration(30s)
      .network(NETWORK_INTERFACE_CELLULAR, SystemSleepNetworkFlag::INACTIVE_STANDBY);
SystemSleepResult result = System.sleep(config);
```

### SleepResult Class

{{since when="0.8.0"}}

This class allows to query the information about the most recent `System.sleep()`. It is only recommended for use in Device OS 0.8.0 - 1.4.4. There is a newer, more flexible class `SystemSleepResult` in 1.5.0 and later.

#### reason()

```cpp
// SYNTAX
SleepResult result = System.sleepResult();
int reason = result.reason();
```

Get the wake up reason.

```cpp
// EXAMPLE
SleepResult result = System.sleepResult();
switch (result.reason()) {
  case WAKEUP_REASON_NONE: {
    Log.info("did not wake up from sleep");
    break;
  }
  case WAKEUP_REASON_PIN: {
    Log.info("was woken up by a pin");
    break;
  }
  case WAKEUP_REASON_RTC: {
    Log.info("was woken up by the RTC (after a specified number of seconds)");
    break;
  }
  case WAKEUP_REASON_PIN_OR_RTC: {
    Log.info("was woken up by either a pin or the RTC (after a specified number of seconds)");
    break;
  }
}
```

Returns a code describing a reason the device woke up from sleep. The following reasons are defined:
- `WAKEUP_REASON_NONE`: did not wake up from sleep
- `WAKEUP_REASON_PIN`: was woken up by an edge signal to a pin
- `WAKEUP_REASON_RTC`: was woken up by the RTC (after a specified number of seconds)
- `WAKEUP_REASON_PIN_OR_RTC`: was woken up either by an edge signal to a pin or by the RTC (after a specified number of seconds)


#### wokenUpByPin()

```cpp
// SYNTAX
SleepResult result = System.sleepResult();
bool r = result.wokenUpByPin();

// EXAMPLE
SleepResult result = System.sleepResult();
if (result.wokenUpByPin()) {
  Log.info("was woken up by a pin");
}
```

Returns `true` when the device was woken up by a pin.

#### wokenUpByRtc()

Returns `true` when the device was woken up by the RTC (after a specified number of seconds).

```cpp
// SYNTAX
SleepResult result = System.sleepResult();
bool r = result.wokenUpByRtc();

// EXAMPLE
SleepResult result = System.sleepResult();
if (result.wokenUpByRtc()) {
  Log.info("was woken up by the RTC (after a specified number of seconds)");
}
```

#### rtc()

An alias to [`wokenUpByRtc()`](#wokenupbyrtc-).

#### pin()

```cpp
// SYNTAX
SleepResult result = System.sleepResult();
pin_t pin = result.pin();

// EXAMPLE
SleepResult result = System.sleepResult();
pin_t pin = result.pin();
if (result.wokenUpByPin()) {
  Log.info("was woken up by the pin number %d", pin);
}
```

Returns: the number of the pin that woke the device.

#### error()

Get the error code of the latest sleep.

```cpp
// SYNTAX
SleepResult result = System.sleepResult();
int err = result.error();
```

Returns: `SYSTEM_ERROR_NONE (0)` when there was no error during latest sleep or a non-zero error code.

### sleepResult()

{{since when="0.8.0"}}

```cpp
// SYNTAX
SleepResult result = System.sleepResult();
```

Retrieves the information about the latest sleep.

Returns: an instance of [`SleepResult`](#sleepresult-) class.

### wakeUpReason()

{{since when="0.8.0"}}

```cpp
// SYNTAX
int reason = System.wakeUpReason();
```

See [`SleepResult`](#reason-) documentation.

### wokenUpByPin()

{{since when="0.8.0"}}

```cpp
// SYNTAX
bool result = System.wokenUpByPin();
```

See [`SleepResult`](#wokenupbypin-) documentation.

### wokenUpByRtc()

_Since 0.8.0_

```cpp
// SYNTAX
bool result = System.wokenUpByRtc();
```

See [`SleepResult`](#wokenupbyrtc-) documentation.

### wakeUpPin()

{{since when="0.8.0"}}

```cpp
// SYNTAX
pin_t pin = System.wakeUpPin();
```

See [`SleepResult`](#pin-) documentation.

### sleepError()

{{since when="0.8.0"}}

```cpp
// SYNTAX
int err = System.sleepError();
```

See [`SleepResult`](#error-) documentation.

{{/if}} {{!-- has-sleep --}}


## System Events

{{since when="0.4.9"}}

### System Events Overview

System events are messages sent by the system and received by application code. They inform the application about changes in the system, such as when the system has entered setup mode (listening mode, blinking dark blue), or when an Over-the-Air (OTA) update starts, or when the system is about to reset.

System events are received by the application by registering a handler. The handler has this general format:

```
void handler(system_event_t event, int data, void* moredata);
```

Unused parameters can be removed from right to left, giving these additional function signatures:

```
void handler(system_event_t event, int data);
void handler(system_event_t event);
void handler();
```

Here's an example of an application that listens for `reset` events so that the application is notified the device is about to reset. The application publishes a reset message to the cloud and turns off connected equipment before returning from the handler, allowing the device to reset.

```
void reset_handler()
{
	// turn off the crankenspitzen
	digitalWrite(D6, LOW);
	// tell the world what we are doing
	Particle.publish("reset", "going down for reboot NOW!");
}

void setup()
{
	// register the reset handler
	System.on(reset, reset_handler);
}
```

Some event types provide additional information. For example the `button_click` event provides a parameter with the number of button clicks:

```
void button_clicked(system_event_t event, int param)
{
	int times = system_button_clicks(param);
	Serial.printlnf("button was clicked %d times", times);
}
```

#### Registering multiple events with the same handler

It's possible to subscribe to multiple events with the same handler in cases where you want the same handler to be notified for all the events. For example:

```
void handle_all_the_events(system_event_t event, int param)
{
	Serial.printlnf("got event %d with value %d", event, param);
}

void setup()
{
	// listen for Wi-Fi Listen events and Firmware Update events
	System.on(wifi_listen+firmware_update, handle_all_the_events);
}
```

To subscribe to all events, there is the placeholder `all_events`:

```
void setup()
{
	// listen for network events and firmware update events
	System.on(all_events, handle_all_the_events);
}
```

### System Events Reference

These are the system events produced by the system, their numeric value (what you will see when printing the system event to Serial) and details of how to handle the parameter value. The version of firmware these events became available is noted in the first column below.

Setup mode is also referred to as listening mode (blinking dark blue).

| Since | Event Name | ID | Description | Parameter |
|-------|------------|----|-------------|-----------|
|       | setup_begin | 2 | signals the device has entered setup mode |  not used |
|       | setup_update | 4 | periodic event signaling the device is still in setup mode. | milliseconds since setup mode was started |
|       | setup_end | 8 | signals setup mode was exited | time in ms since setup mode was started |
|       | network_credentials | 16 | network credentials were changed | `network_credentials_added` or `network_credentials_cleared` |
| 0.6.1 | network_status | 32 | network connection status | one of `network_status_powering_on`, `network_status_on`, `network_status_powering_off`, `network_status_off`, `network_status_connecting`, `network_status_connected` |
| 0.6.1 | cloud_status | 64 | cloud connection status | one of `cloud_status_connecting`, `cloud_status_connected`, `cloud_status_disconnecting`, `cloud_status_disconnected` |
|       | button_status | 128 | button pressed or released | the duration in ms the button was pressed: 0 when pressed, >0 on release. |
|       | firmware_update | 256 | firmware update status | one of `firmware_update_begin`, `firmware_update_progress`, `firmware_update_complete`, `firmware_update_failed` |
|       | firmware_update_pending | 512 | notifies the application that a firmware update is available. This event is sent even when updates are disabled, giving the application chance to re-enable firmware updates with `System.enableUpdates()` | not used |
|       | reset_pending | 1024 | notifies the application that the system would like to reset. This event is sent even when resets are disabled, giving the application chance to re-enable resets with `System.enableReset()` | not used |
|       | reset | 2048 | notifies that the system will reset once the application has completed handling this event | not used |
|       | button_click | 4096 | event sent each time SETUP/MODE button is clicked. | `int clicks = system_button_clicks(param); ` retrieves the number of clicks so far. |
|       | button_final_click | 8192 | sent after a run of one or more clicks not followed by additional clicks. Unlike the `button_click` event, the `button_final_click` event is sent once, at the end of a series of clicks. | `int clicks = system_button_clicks(param); ` retrieves the number of times the button was pushed. |
| 0.6.1 | time_changed | 16384 | device time changed | `time_changed_manually` or `time_changed_sync` |
| 0.6.1 | low_battery | 32768 | generated when low battery condition is detected. | not used |
| 0.8.0 | out_of_memory | 1<<18 | event generated when a request for memory could not be satisfied | the amount in bytes of memory that could not be allocated | 

## System Modes

System modes help you control how the device manages the connection with the cloud.

By default, the device connects to the Cloud and processes messages automatically. However there are many cases where a user will want to take control over that connection. There are three available system modes: `AUTOMATIC`, `SEMI_AUTOMATIC`, and `MANUAL`. These modes describe how connectivity is handled.
These system modes describe how connectivity is handled and when user code is run.

System modes must be called before the setup() function. By default, the device is always in `AUTOMATIC` mode.

### Automatic mode

The automatic mode of connectivity provides the default behavior of the device, which is that:

```cpp
SYSTEM_MODE(AUTOMATIC);

void setup() {
  // This won't be called until the device is connected to the cloud
}

void loop() {
  // Neither will this
}
```

- When the device starts up, it automatically tries to connect to Wi-Fi or Cellular and the Particle Device Cloud.
- Once a connection with the Particle Device Cloud has been established, the user code starts running.
- Messages to and from the Cloud are handled in between runs of the user loop; the user loop automatically alternates with [`Particle.process()`](#particle-process-).
- `Particle.process()` is also called during any delay() of at least 1 second.
- If the user loop blocks for more than about 20 seconds, the connection to the Cloud will be lost. To prevent this from happening, the user can call `Particle.process()` manually.
- If the connection to the Cloud is ever lost, the device will automatically attempt to reconnect. This re-connection will block from a few milliseconds up to 8 seconds.
- `SYSTEM_MODE(AUTOMATIC)` does not need to be called, because it is the default state; however the user can invoke this method to make the mode explicit.

In automatic mode, the user can still call `Particle.disconnect()` to disconnect from the Cloud, but is then responsible for re-connecting to the Cloud by calling `Particle.connect()`.

### Semi-automatic mode

The semi-automatic mode will not attempt to connect the device to the Cloud automatically. However once the device is connected to the Cloud (through some user intervention), messages will be processed automatically, as in the automatic mode above.

```cpp
SYSTEM_MODE(SEMI_AUTOMATIC);

void setup() {
  // This is called immediately
}

void loop() {
  if (buttonIsPressed()) {
    Particle.connect();
  } else {
    doOfflineStuff();
  }
}
```

The semi-automatic mode is therefore much like the automatic mode, except:

- When the device boots up, `setup()` and `loop()` will begin running immediately.
- Once the user calls [`Particle.connect()`](#particle-connect-), the user code will be blocked while the device attempts to negotiate a connection. This connection will block execution of `loop()` or `setup()` until either the device connects to the Cloud or an interrupt is fired that calls [`Particle.disconnect()`](#particle-disconnect-).

### Manual mode


The "manual" mode puts the device's connectivity completely in the user's control. This means that the user is responsible for both establishing a connection to the Particle Device Cloud and handling communications with the Cloud by calling [`Particle.process()`](#particle-process-) on a regular basis.

```cpp
SYSTEM_MODE(MANUAL);

void setup() {
  // This will run automatically
}

void loop() {
  if (buttonIsPressed()) {
    Particle.connect();
  }
  if (Particle.connected()) {
    Particle.process();
    doOtherStuff();
  }
}
```

When using manual mode:

- The user code will run immediately when the device is powered on.
- Once the user calls [`Particle.connect()`](#particle-connect-), the device will attempt to begin the connection process.
- Once the device is connected to the Cloud ([`Particle.connected()`](#particle-connected-) ` == true`), the user must call `Particle.process()` regularly to handle incoming messages and keep the connection alive. The more frequently `Particle.process()` is called, the more responsive the device will be to incoming messages.
- If `Particle.process()` is called less frequently than every 20 seconds, the connection with the Cloud will die. It may take a couple of additional calls of `Particle.process()` for the device to recognize that the connection has been lost.


{{#if has-threading}}
## System Thread

{{since when="0.4.6"}}

The System Thread is a system configuration that helps ensure the application loop
is not interrupted by the system background processing and network management.
It does this by running the application loop and the system loop on separate threads,
so they execute in parallel rather than sequentially.

At present, System Thread is an opt-in change. To enable system threading for your application, add to the top of your application code.

```
// EXAMPLE USAGE
SYSTEM_THREAD(ENABLED);
```



### System Threading Behavior

When the system thread is enabled, application execution changes compared to
non-threaded execution:

- `setup()` is executed immediately regardless of the system mode, which means
setup typically executes before the Network or Cloud is connected.
Calls to network-related code will be impacted and may fail because the network is not up yet.
`Particle.function()`, `Particle.variable()` and `Particle.subscribe()` will function
as intended whether the cloud is connected or not.  `Particle.publish()` will return
`false` when the cloud is not available and the event will not be published.
Other network initialisation (such as those in `UDP`, `TCPServer` and `TCPClient`)
may not function yet.
See `waitUntil` below for details on waiting for the network or cloud connection.

- after `setup()` is called, `loop()` is called repeatedly, independent from the current state of the
network or cloud connection. The system does not block `loop()` waiting
for the network or cloud to be available, nor while connecting to Wi-Fi.

- System modes `SEMI_AUTOMATIC` and `MANUAL` behave identically - both of these
modes do not not start the Networking or a Cloud
connection automatically, while `AUTOMATIC` mode connects to the cloud as soon as possible.
Neither has an effect on when the application `setup()` function is run - it is run
as soon as possible, independently from the system network activities, as described above.

- `Particle.process()` and `delay()` are not needed to keep the background tasks active - they run independently. These functions have a new role in keeping the application events serviced. Application events are:
 - cloud function calls
 - cloud events
 - system events

- Cloud functions registered with `Particle.function()` and event handlers
registered with `Particle.subscribe()` continue to execute on the application
thread in between calls to `loop()`, or when `Particle.process()` or `delay()` is called.
A long running cloud function will block the application loop (since it is application code)
but not the system code, so cloud connectivity is maintained.

 - the application continues to execute during listening mode
 - the application continues to execute during OTA updates

### System Functions

With system threading enabled, the majority of the Particle API continues to run on the calling thread, as it does for non-threaded mode. For example, when a function, such as `Time.now()`, is called, it is processed entirely on the calling thread (typically the application thread when calling from `loop()`.)

There are a small number of API functions that are system functions. These functions execute on the system thread regardless of which thread they are called from.

There are two types of system functions:

- asynchronous system functions: these functions do not return a result to the caller and do not block the caller
- synchronous system functions: these functions return a result to the caller, and block the caller until the function completes

Asynchronous system functions do not block the application thread, even when the system thread is busy, so these can be used liberally without causing unexpected delays in the application.  (Exception: when more than 20 asynchronous system functions are invoked, but not yet serviced by the application thread, the application will block for 5 seconds while attempting to put the function on the system thread queue.)

Synchronous system functions always block the caller until the system has performed the requested operation. These are the synchronous system functions:

- `WiFi.hasCredentials()`, `WiFi.setCredentials()`, `WiFi.clearCredentials()`
- `Particle.function()`
- `Particle.variable()`
- `Particle.subscribe()`
- `Particle.publish()`

For example, when the system is busy connecting to Wi-Fi or establishing the cloud connection and the application calls `Particle.variable()` then the application will be blocked until the system finished connecting to the cloud (or gives up) so that it is free to service the `Particle.variable()` function call.

This presents itself typically in automatic mode and where `setup()` registers functions, variables or subscriptions. Even though the application thread is running `setup()` independently of the system thread, calling synchronous functions will cause the application to block until the system thread has finished connecting to the cloud. This can be avoided by delaying the cloud connection until after the synchronous functions have been called.

```
SYSTEM_THREAD(ENABLED);
SYSTEM_MODE(SEMI_AUTOMATIC);

void setup()
{
	// the system thread isn't busy so these synchronous functions execute quickly
    Particle.subscribe("event", handler);
	Particle.publish("myvar", myvar);
	Particle.connect();    // <-- now connect to the cloud, which ties up the system thread
}
```

### Task Switching

The Device OS includes an RTOS (Real Time Operating System). The RTOS is responsible for switching between the application thread and the system thread, which it does automatically every millisecond. This has 2 main consequences:

- delays close to 1ms are typically much longer
- application code may be stopped at any time when the RTOS switches to the system thread

When executing timing-critical sections of code, the task switching needs to be momentarily disabled.

### SINGLE_THREADED_BLOCK()

`SINGLE_THREADED_BLOCK()` declares that the next code block is executed in single threaded mode. Task switching is disabled until the end of the block and automatically re-enabled when the block exits. Interrupts remain enabled, so the thread may be interrupted for small periods of time, such as by interrupts from peripherals.

```
// SYNTAX
SINGLE_THREADED_BLOCK() {
   // code here is executed atomically, without task switching
   // or interrupts
}
```

Here's an example:

```
void so_timing_sensitive()
{
    if (ready_to_send) {
   		SINGLE_THREADED_BLOCK() { // single threaded execution starts now
	    		digitalWrite(D0, LOW);		// timing critical GPIO
    			delayMicroseconds(1500);
    			digitalWrite(D0, HIGH);
		}
    }  // single threaded execution stops now
}
```

You must avoid within a SINGLE_THREADED_BLOCK:

- Lengthy operations
- Calls to delay()
- Any call that can block (Particle.publish, Cellular.RSSI, and others)
- Any function that uses a mutex to guard a resource (Log.info, SPI transactions, etc.)
- Nesting. You cannot have a SINGLE_THREADED_BLOCK within another SINGLE_THREADED_BLOCK.

The problem with mutex guarded resources is a bit tricky. For example: Log.info uses a mutex to prevent multiple threads from trying to log at the same time, causing the messages to be mixed together. However the code runs with interrupts and thread swapping enabled. Say the system thread is logging and your user thread code swaps in. The system thread still holds the logging mutex. Your code enters a SINGLE_THREADED_BLOCK, then does Log.info. The system will deadlock at this point. Your Log.info in the user thread blocks on the logging mutex. However it will never become available because thread swapping has been disabled, so the system thread can never release it. All threads will stop running at this point.

Because it's hard to know exactly what resources will be guarded by a mutex its best to minimize the use of SINGLE_THREADED_BLOCK.

### ATOMIC_BLOCK()

`ATOMIC_BLOCK()` is similar to `SINGLE_THREADED_BLOCK()` in that it prevents other threads executing during a block of code. In addition, interrupts are also disabled.

WARNING: Disabling interrupts prevents normal system operation. Consequently, `ATOMIC_BLOCK()` should be used only for brief periods where atomicity is essential.

```
// SYNTAX
ATOMIC_BLOCK() {
   // code here is executed atomically, without task switching
   // or interrupts
}
```

Here's an example:

```
void so_timing_sensitive_and_no_interrupts()
{
    if (ready_to_send) {
   		ATOMIC_BLOCK() { // only this code runs from here on - no other threads or interrupts
    		digitalWrite(D0, LOW);		// timing critical GPIO
    		delayMicroseconds(1500);
    		digitalWrite(D0, HIGH);
    		}
    }  // other threads and interrupts can run from here
}
```

### Synchronizing Access to Shared System Resources

With system threading enabled, the system thread and the application thread run in parallel. When both attempt to use the same resource, such as writing a message to `Serial`, there is no guaranteed order - the message printed by the system and the message printed by the application are arbitrarily interleaved as the RTOS rapidly switches between running a small part of the system code and then the application code. This results in both messages being intermixed.

This can be avoided by acquiring exclusive access to a resource. To get exclusive access to a resource, we can use locks. A lock
ensures that only the thread owning the lock can access the resource. Any other thread that tries to use the resource via the lock will not be granted access until the first thread eventually unlocks the resource when it is done.

At present there is only one shared resource that is used by the system and the application - `Serial`. The system makes use of `Serial` during listening mode. If the application also makes use of serial during listening mode, then it should be locked before use.

```
void print_status()
{
    WITH_LOCK(Serial) {
	    Serial.print("Current status is:");
    		Serial.println(status);
	}
}
```

The primary difference compared to using Serial without a lock is the `WITH_LOCK` declaration. This does several things:

- attempts to acquire the lock for `Serial`. If the lock isn't available, the thread blocks indefinitely until it is available.

- once `Serial` has been locked, the code in the following block is executed.

- when the block has finished executing, the lock is released, allowing other threads to use the resource.

It's also possible to attempt to lock a resource, but not block when the resource isn't available.

```
TRY_LOCK(Serial) {
    // this code is only run when no other thread is using Serial
}
```

The `TRY_LOCK()` statement functions similarly to `WITH_LOCK()` but it does not block the current thread if the lock isn't available. Instead, the entire block is skipped over.


### Waiting for the system

Use [waitUntil](#waituntil-) to delay the application indefinitely until the condition is met.

Use [waitFor](#waitfor-) to delay the application only for a period of time or the condition is met.

Makes your application wait until/for something that the system is doing, such as waiting for Wi-Fi to be ready or the Cloud to be connected. **Note:** that conditions must be a function that takes a void argument `function(void)` with the `()` removed, e.g. `Particle.connected` instead of `Particle.connected()`.  Functions should return 0/false to indicate waiting, or non-zero/true to stop waiting.  `bool` or `int` are valid return types.  If a complex expression is required, a separate function should be created to evaluate that expression.

---

#### waitUntil()

```
// SYNTAX
waitUntil(condition);

// Wait until the Cloud is connected to publish a critical event.
waitUntil(Particle.connected);
Particle.publish("weather", "sunny");

// For Wi-Fi
waitUntil(WiFi.ready);

// For Cellular
waitUntil(Cellular.ready);
```

To delay the application indefinitely until the condition is met.

Note: `waitUntil` does not tickle the [application watchdog](/reference/device-os/firmware/#application-watchdog). If the condition you are waiting for is longer than the application watchdog timeout, the device will reset.

---

#### waitUntilNot()

{{since when="2.0.0"}}


```cpp
// SYNTAX
waitUntilNot(condition);

// EXAMPLE
Particle.disconnect();
waitUntilNot(Particle.connected);
Log.info("disconnected");
```

To delay the application indefinitely until the condition is not met (value of condition is false)

Note: `waitUntilNot` does not tickle the [application watchdog](/reference/device-os/firmware/#application-watchdog). If the condition you are waiting for is longer than the application watchdog timeout, the device will reset.

---

#### waitFor()

```cpp
// SYNTAX
waitFor(condition, timeout);

// wait up to 10 seconds for the cloud connection to be connected.
if (waitFor(Particle.connected, 10000)) {
    Particle.publish("weather", "sunny");
}

// wait up to 10 seconds for the cloud connection to be disconnected.
// Here we have to add a function to invert the condition.
// In Device OS 2.0.0 and later you can more easily use waitFotNot()
bool notConnected() {
    return !Particle.connected();
}
if (waitFor(notConnected, 10000)) {
    Log.info("not connected");
}
```

To delay the application only for a period of time or the condition is met.

Note: `waitFor` does not tickle the [application watchdog](/reference/device-os/firmware/#application-watchdog). If the condition you are waiting for is longer than the application watchdog timeout, the device will reset.

---

#### waitForNot()

```cpp
// SYNTAX
waitForNot(condition, timeout);

// EXAMPLE
if (waitForNot(Particle.connected, 10000)) {
    Log.info("not connected");
}
```

{{since when="2.0.0"}}

To delay the application only for a period of time or the condition is not met (value of condition is false)

Note: `waitForNot` does not tickle the [application watchdog](/reference/device-os/firmware/#application-watchdog). If the condition you are waiting for is longer than the application watchdog timeout, the device will reset.


{{/if}} {{!-- has-threading --}}

## System Calls

### version()

{{since when="0.4.7"}}

Determine the version of Device OS available. Returns a version string
of the format:

> MAJOR.MINOR.PATCH

Such as "0.4.7".

For example

```

void setup()
{
   Log.info("System version: %s", System.version().c_str());
   // prints
   // System version: 0.4.7
}

```

### versionNumber()

Determines the version of Device OS available. Returns the version encoded
as a number:

> 0xAABBCCDD

 - `AA` is the major release
 - `BB` is the minor release
 - `CC` is the patch number
 - `DD` is 0

Firmware 0.4.7 has a version number 0x00040700


### buttonPushed()

{{since when="0.4.6"}}

Can be used to determine how long the System button (SETUP on Photon, MODE on other devices) has been pushed.

Returns `uint16_t` as duration button has been held down in milliseconds.

```cpp
// EXAMPLE USAGE
void button_handler(system_event_t event, int duration, void* )
{
    if (!duration) { // just pressed
        RGB.control(true);
        RGB.color(255, 0, 255); // MAGENTA
    }
    else { // just released
        RGB.control(false);
    }
}

void setup()
{
    System.on(button_status, button_handler);
}

void loop()
{
    // it would be nice to fire routine events while
    // the button is being pushed, rather than rely upon loop
    if (System.buttonPushed() > 1000) {
        RGB.color(255, 255, 0); // YELLOW
    }
}
```


### System Cycle Counter

{{since when="0.4.6"}}

The system cycle counter is incremented for each instruction executed. It functions
in normal code and during interrupts. Since it operates at the clock frequency
of the device, it can be used for accurately measuring small periods of time.

```cpp
    // overview of System tick functions
    uint32_t now = System.ticks();

    // for converting an the unknown system tick frequency into microseconds
    uint32_t scale = System.ticksPerMicrosecond();

    // delay a given number of ticks.
    System.ticksDelay(10);
```

The system ticks are intended for measuring times from less than a microsecond up
to a second. For longer time periods, using [micros()](#micros-) or [millis()](#millis-) would
be more suitable.


#### ticks()

Returns the current value of the system tick count. One tick corresponds to
one cpu cycle.

```cpp
    // measure a precise time whens something start
    uint32_t ticks = System.ticks();

```

#### ticksPerMicrosecond();

Retrieves the number of ticks per microsecond for this device. This is useful
when converting between a number of ticks and time in microseconds.

```cpp

    uint32_t start = System.ticks();
    startTheFrobnicator();
    uint32_t end = System.ticks();
    uint32_t duration = (end-start)/System.ticksPerMicrosecond();

    Log.info("The frobnicator took %d microseconds to start", duration);

```

#### ticksDelay()

Pause execution a given number of ticks. This can be used to implement precise
delays.

```cpp
    // delay 10 ticks. How long this is actually depends upon the clock speed of the
    // device.
    System.ticksDelay(10);

    // to delay for 3 microseconds on any device:
    System.ticksDelay(3*System.ticksPerMicrosecond());

```

The system code has been written such that the compiler can compute the number
of ticks to delay
at compile time and inline the function calls, reducing overhead to a minimum.



### freeMemory()

{{since when="0.4.4"}}

Retrieves the amount of free memory in the system in bytes.

```cpp
uint32_t freemem = System.freeMemory();
Serial.print("free memory: ");
Serial.println(freemem);
```

### reset()

```cpp
// PROTOTYPES
void reset();
void reset(SystemResetFlags flags);
void reset(uint32_t data, SystemResetFlags flags = SystemResetFlags());


// EXAMPLE
uint32_t lastReset = 0;

void setup() {
    lastReset = millis();
}

void loop() {
  // Reset after 5 minutes of operation
  // ==================================
  if (millis() - lastReset > 5*60000UL) {
    System.reset();
  }
}
```

Resets the device, just like hitting the reset button or powering down and back up.

- If the `data` parameter is present, this is included in the [reset reason](#reset-reason) as the user data parameter for `RESET_REASON_USER`.

{{since when="2.0.0"}}

- `SystemResetFlags` can be specified in Device OS 2.0.0 and later. There is currently only one applicable flag:
  
  - `RESET_NO_WAIT` reset immediately and do not attempt to notify the cloud that a reset is about to occur.

In Device OS 2.0.0 and later, a call to `System.reset()` defaults to notifying the cloud of a pending reset and waiting for an acknowledgement. To prevent this, use the `RESET_NO_WAIT` flag.


### dfu()

```cpp
// PROTOTYPES
void dfu(SystemResetFlags flags = SystemResetFlags());
void dfu(bool persist);
```

The device will enter DFU-mode to allow new user firmware to be refreshed. DFU mode is cancelled by

- flashing firmware to the device using dfu-util, specifying the `:leave` option, or
- a system reset

{{since when="2.0.0"}}

- `SystemResetFlags` can be specified in Device OS 2.0.0 and later. There is currently two applicable flags:
  
  - `RESET_NO_WAIT` reset immediately and do not attempt to notify the cloud that a reset is about to occur.
  - `RESET_PERSIST_DFU` re-enter DFU mode even after reset until firmware is flashed.

In Device OS 2.0.0 and later, a call to `System.dfu()` defaults to notifying the cloud of a pending reset and waiting for an acknowledgement. To prevent this, use the `RESET_NO_WAIT` flag.

---

```cpp
System.dfu(true);   // persistent DFU mode - will enter DFU after a reset until firmware is flashed.
```

To make DFU mode permanent - so that it continues to enter DFU mode even after a reset until
new firmware is flashed, pass `true` for the `persist` flag.

### enterSafeMode()

```cpp
// PROTOTYPE
void enterSafeMode(SystemResetFlags flags = SystemResetFlags())
```

{{since when="0.4.6"}}

Resets the device and restarts in safe mode (blinking green, blinking cyan, followed by breathing magenta). Note that the device must be able to connect to the cloud in order to successfully enter safe mode.

In safe mode, the device is running Device OS and is able to receive OTA firmware updates from the cloud, but does not run the user firmware.

{{since when="2.0.0"}}

- `SystemResetFlags` can be specified in Device OS 2.0.0 and later. There is currently only one applicable flag:
  
  - `RESET_NO_WAIT` reset immediately and do not attempt to notify the cloud that a reset is about to occur.

In Device OS 2.0.0 and later, a call to `System.dfu()` defaults to notifying the cloud of a pending reset and waiting for an acknowledgement. To prevent this, use the `RESET_NO_WAIT` flag.


### deviceID()

`System.deviceID()` provides an easy way to extract the device ID of your device. It returns a [String object](#string-class) of the device ID, which is used to identify your device.

```cpp
// EXAMPLE USAGE

void setup()
{
  // Make sure your Serial Terminal app is closed before powering your device
  Serial.begin(9600);
  // Wait for a USB serial connection for up to 30 seconds
  waitFor(Serial.isConnected, 30000);

  String myID = System.deviceID();
  // Prints out the device ID over Serial
  Log.info("deviceID=%s", myID.c_str());
}

void loop() {}
```


### System.millis()

{{since when="0.8.0"}}

Returns the number of milliseconds passed since the device was last reset. This function is similar to the global [`millis()`](#millis-) function but returns a 64-bit value.

While the 32-bit `millis()` rolls over to 0 after approximately 49 days, the 64-bit `System.millis()` does not.

One caveat is that sprintf-style formatting, including `snprintf()`, `Log.info()`, `Serial.printf()`, `String::format()` etc. does not support 64-bit integers. It does not support `%lld`, `%llu` or Microsoft-style `%I64d` or `%I64u`.  

As a workaround you can use the `Print64` firmware library in the community libraries. The source and instructions can be found [in Github](https://github.com/rickkas7/Print64/).

### System.uptime()

{{since when="0.8.0"}}

Returns the number of seconds passed since the device was last reset.


{{#if has-pmic}}

### powerSource()

{{since when="1.5.0"}}

Determines the power source, typically one of:

- `POWER_SOURCE_VIN` Powered by VIN.
- `POWER_SOURCE_USB_HOST` Powered by a computer that is acting as a USB host.
- `POWER_SOURCE_USB_ADAPTER` Powered by a USB power adapter that supports DPDM but is not a USB host.
- `POWER_SOURCE_BATTERY` Powered by battery connected to LiPo connector or Li+.

```cpp
// PROTOTYPE
int powerSource() const;

// CONSTANTS
typedef enum {
    POWER_SOURCE_UNKNOWN = 0,
    POWER_SOURCE_VIN = 1,
    POWER_SOURCE_USB_HOST = 2,
    POWER_SOURCE_USB_ADAPTER = 3,
    POWER_SOURCE_USB_OTG = 4,
    POWER_SOURCE_BATTERY = 5
} power_source_t;

// EXAMPLE
int powerSource = System.powerSource();
if (powerSource == POWER_SOURCE_BATTERY) {
  Log.info("running off battery");
}
```

### batteryState()

{{since when="1.5.0"}}

Determines the state of battery charging.

```cpp
// PROTOTYPE
int batteryState() const

// CONSTANTS
typedef enum {
    BATTERY_STATE_UNKNOWN = 0,
    BATTERY_STATE_NOT_CHARGING = 1,
    BATTERY_STATE_CHARGING = 2,
    BATTERY_STATE_CHARGED = 3,
    BATTERY_STATE_DISCHARGING = 4,
    BATTERY_STATE_FAULT = 5,
    BATTERY_STATE_DISCONNECTED = 6
} battery_state_t;

// EXAMPLE
int batteryState = System.batteryState();
if (batteryState == BATTERY_STATE_CHARGING) {
  Log.info("battery charging");
}
```

### batteryCharge()

{{since when="1.5.0"}}

Determines the battery state of charge (SoC) as a percentage, as a floating point number.

```cpp
// PROTOTYPE
float batteryCharge() const

// EXAMPLE
float batterySoc = System.batteryCharge();
Log.info("soc=%.1f", batterySoc);
```


{{/if}}

### disableReset()

This method allows to disable automatic resetting of the device on such events as successful firmware update.

```cpp
// EXAMPLE
void on_reset_pending() {
    // Enable resetting of the device. The system will reset after this method is called
    System.enableReset();
}

void setup() {
    // Register the event handler
    System.on(reset_pending, on_reset_pending);
    // Disable resetting of the device
    System.disableReset();

}

void loop() {
}
```

When the system needs to reset the device it first sends the [`reset_pending`](#system-events-reference) event to the application, and, if automatic resetting is disabled, waits until the application has called `enableReset()` to finally perform the reset. This allows the application to perform any necessary cleanup before resetting the device.

### enableReset()

Allows the system to reset the device when necessary.

### resetPending()

Returns `true` if the system needs to reset the device.

### Reset Reason

{{since when="0.6.0"}}

The system can track the hardware and software resets of the device.

```
// EXAMPLE
// Restart in safe mode if the device previously reset due to a PANIC (SOS code)
void setup() {
   System.enableFeature(FEATURE_RESET_INFO);
   if (System.resetReason() == RESET_REASON_PANIC) {
       System.enterSafeMode();
   }
}
```

You can also pass in your own data as part of an application-initiated reset:

```cpp
// EXAMPLE

void setup() {
    System.enableFeature(FEATURE_RESET_INFO);

    // Reset the device 3 times in a row
    if (System.resetReason() == RESET_REASON_USER) {
        uint32_t data = System.resetReasonData();
        if (data < 3) {
            System.reset(data + 1);
        }
    } else {
		// This will set the reset reason to RESET_REASON_USER
        System.reset(1);
    }
}

```

**Note:** This functionality requires `FEATURE_RESET_INFO` flag to be enabled in order to work.

`resetReason()`

Returns a code describing reason of the last device reset. The following codes are defined:

- `RESET_REASON_PIN_RESET`: Reset button or reset pin
- `RESET_REASON_POWER_MANAGEMENT`: Low-power management reset
- `RESET_REASON_POWER_DOWN`: Power-down reset
- `RESET_REASON_POWER_BROWNOUT`: Brownout reset
- `RESET_REASON_WATCHDOG`: Hardware watchdog reset
- `RESET_REASON_UPDATE`: Successful firmware update
- `RESET_REASON_UPDATE_TIMEOUT`: Firmware update timeout
- `RESET_REASON_FACTORY_RESET`: Factory reset requested
- `RESET_REASON_SAFE_MODE`: Safe mode requested
- `RESET_REASON_DFU_MODE`: DFU mode requested
- `RESET_REASON_PANIC`: System panic
- `RESET_REASON_USER`: User-requested reset
- `RESET_REASON_UNKNOWN`: Unspecified reset reason
- `RESET_REASON_NONE`: Information is not available

`resetReasonData()`

Returns a user-defined value that has been previously specified for the `System.reset()` call.

`reset(uint32_t data)`

This overloaded method accepts an arbitrary 32-bit value, stores it to the backup register and resets the device. The value can be retrieved via `resetReasonData()` method after the device has restarted.

### System Config [ set ]

System configuration can be modified with the `System.set()` call.

```cpp
// SYNTAX
System.set(SYSTEM_CONFIG_..., "value");
System.set(SYSTEM_CONFIG_..., buffer, length);

{{#if has-wifi}}
// EXAMPLE
// Change the SSID prefix in listening mode
System.set(SYSTEM_CONFIG_SOFTAP_PREFIX, "Gizmo");

// Change the SSID suffix in listening mode
System.set(SYSTEM_CONFIG_SOFTAP_SUFFIX, "ABC");
{{/if}} {{!-- has-wifi --}}
```

The following configuration values can be changed:
- `SYSTEM_CONFIG_DEVICE_KEY`: the device private key. Max length of `DCT_DEVICE_PRIVATE_KEY_SIZE` (1216).
- `SYSTEM_CONFIG_SERVER_KEY`: the server public key. Max length of `SYSTEM_CONFIG_SERVER_KEY` (768).
{{#if has-wifi}}
- `SYSTEM_CONFIG_SOFTAP_PREFIX`: the prefix of the SSID broadcast in listening mode. Defaults to Photon. Max length of `DCT_SSID_PREFIX_SIZE-1` (25).
- `SYSTEM_CONFIG_SOFTAP_SUFFIX`: the suffix of the SSID broadcast in listening mode. Defaults to a random 4 character alphanumerical string. Max length of `DCT_DEVICE_ID_SIZE` (6).
{{/if}} {{!-- has-wifi --}}

### System Flags [ disable ]

The system allows to alter certain aspects of its default behavior via the system flags. The following system flags are defined:

  * `SYSTEM_FLAG_PUBLISH_RESET_INFO` : enables publishing of the last [reset reason](#reset-reason) to the cloud (enabled by default)
  * `SYSTEM_FLAG_RESET_NETWORK_ON_CLOUD_ERRORS` : enables resetting of the network connection on cloud connection errors (enabled by default)

```cpp
// EXAMPLE
// Do not publish last reset reason
System.disable(SYSTEM_FLAG_PUBLISH_RESET_INFO);

// Do not reset network connection on cloud errors
System.disable(SYSTEM_FLAG_RESET_NETWORK_ON_CLOUD_ERRORS);
```

`System.enable(system_flag_t flag)`

Enables the system flag.

`System.disable(system_flag_t flag)`

Disables the system flag.

`System.enabled(system_flag_t flag)`

Returns `true` if the system flag is enabled.

{{#if has-interrupts}}

## System Interrupts

This is advanced, low-level functionality, intended primarily for library writers.

System interrupts happen as a result of peripheral events within the system. These
system interrupts are supported on all platforms:

|Identifier | Description |
|-----------|-------------|
|SysInterrupt_SysTick | System Tick (1ms) handler |
|SysInterrupt_TIM3 | Timer 3 interrupt |
|SysInterrupt_TIM4 | Timer 4 interrupt |

NB: SysInterrupt_TIM3 and SysInterrupt_TIM4 are used by the system to provide `tone()` and PWM output.

{{#if has-stm32f2}}

The device supports these additional interrupts:

| Identifier | Description |
| -----------|-------------|
| SysInterrupt_TIM5 | Timer 5 interrupt |
| SysInterrupt_TIM6 | Timer 6 interrupt |
| SysInterrupt_TIM7 | Timer 7 interrupt |

NB: SysInterrupt_TIM5 is used by the system to provide `tone()` and PWM output.
NB: SysInterrupt_TIM7 is used as a shadow watchdog timer by WICED when connected to JTAG.

{{/if}} {{!-- has-stm32f2 --}}

See the [full list of interrupts in the firmware
repository](https://github.com/particle-iot/device-os/blob/develop/hal/inc/interrupts_hal.h).

> When implementing an interrupt handler, the handler **must** execute quickly, or the system operation may be impaired. Any variables shared between the interrupt handler and the main program should be declared as `volatile` to ensure that changes in the interrupt handler are visible in the main loop and vice versa.

### attachSystemInterrupt()

Registers a function that is called when a system interrupt happens.

```cpp
void handle_timer5()
{
   // called when timer 5 fires an interrupt
}

void setup()
{
    attachSystemInterrupt(SysInterrupt_TIM5, handle_timer5);
}
```

### detachSystemInterrupt()

Removes all handlers for the given interrupt, or for all interrupts.

```cpp

detachSystemInterrupt(SysInterrupt_TIM5);
// remove all handlers for the SysInterrupt_TIM5 interrupt
```

### attachInteruptDirect()

_Since 0.8.0_

Registers a function that is called when an interrupt happens. This function installs the interrupt handler function directly into the interrupt vector table and will override system handlers for the specified interrupt.

**NOTE**: Most likely use-cases:
- if lower latency is required: handlers registered with `attachInterrupt()` or `attachSystemInterrupt()` may be called with some delay due to handler chaining or some additional processing done by the system
- system interrupt handler needs to be overriden
- interrupt unsupported by `attachSystemInterrupt()` needs to be handled

```cpp
// SYNTAX
attachInterruptDirect(irqn, handler);

// EXAMPLE
void handle_timer5()
{
  // called when timer 5 fires an interrupt
}

void setup()
{
  attachInterruptDirect(TIM5_IRQn, handle_timer5);
}

```

Parameters:
- `irqn`: platform-specific IRQ number
- `handler`: interrupt handler function pointer

If the interrupt is an external (pin) interrupt, you also need to clear the interrupt flag from your direct interrupt handler, as it is not done automatically for direct interrrupts.

```
// EXAMPLE
EXTI_ClearFlag(EXTI9_5_IRQn);
```

### detachInterruptDirect()

_Since 0.8.0_

Unregisters application-provided interrupt handlers for the given interrupt and restores the default one.

```cpp
// SYNTAX
detachInterruptDirect(irqn);

// EXAMPLE
detachInterruptDirect(TIM5_IRQn);
```

Parameters:
- `irqn`: platform-specific IRQ number

{{/if}} {{!-- has-interrupts --}}



{{#if has-button-mirror}}
### buttonMirror()

{{since when="0.6.1"}}

Allows a pin to mirror the functionality of the SETUP/MODE button.

```cpp
// SYNTAX
System.buttonMirror(D1, RISING);
System.buttonMirror(D1, FALLING, true);
```
Parameters:

  * `pin`: the pin number
  * `mode`: defines the condition that signifies a button press:
    - RISING to trigger when the pin goes from low to high,
    - FALLING for when the pin goes from high to low.
  * `bootloader`: (optional) if `true`, the mirror pin configuration is saved in DCT and pin mirrors the SETUP/MODE button functionality while in bootloader as well. If `false`, any previously stored configuration is removed from the DCT and pin only mirrors the SETUP/MODE button while running the firmware (default).

See also [`System.disableButtonMirror()`](#disablebuttonmirror-).

```cpp
// EXAMPLE
// Mirror SETUP/MODE button on D1 pin. Button pressed state - LOW
STARTUP(System.buttonMirror(D1, FALLING));

// EXAMPLE
// Mirror SETUP/MODE button on D1 pin. Button pressed state - HIGH
// Works in both firmware and bootloader
STARTUP(System.buttonMirror(D1, RISING, true));
```

***NOTE:*** Pins `D0` and `A5` will disable normal SETUP button operation. Pins `D0` and `A5` also can not be used in bootloader, the configuration will not be saved in DCT.

### disableButtonMirror()

{{since when="0.6.1"}}

Disables SETUP button mirroring on a pin.

```cpp
// SYNTAX
System.disableButtonMirror();
System.disableButtonMirror(false);
```
Parameters:
  * `bootloader`: (optional) if `true`, the mirror pin configuration is cleared from the DCT, disabling the feature in bootloader (default).

{{/if}} {{!-- button-mirror --}}

{{#if has-backup-ram}}
### System Features

The system allows to alter certain aspects of its default behavior via the system features. The following system features are defined:

  * `FEATURE_RETAINED_MEMORY` : enables/disables retained memory on backup power (disabled by default) (see [Enabling Backup RAM (SRAM)](#enabling-backup-ram-sram-))
{{#if has-powersave-clock}}
  * `FEATURE_WIFI_POWERSAVE_CLOCK` : enables/disables the Wi-Fi Powersave Clock on P1S6 on P1 (enabled by default).
{{/if}} {{!-- has-powersave-clock --}}

#### FEATURE_RETAINED_MEMORY

Enables/disables retained memory on backup power (disabled by default) (see [Enabling Backup RAM (SRAM)](#enabling-backup-ram-sram-))

```cpp
// SYNTAX
// enable RETAINED MEMORY
System.enableFeature(FEATURE_RETAINED_MEMORY);

// disable RETAINED MEMORY (default)
System.disableFeature(FEATURE_RETAINED_MEMORY);
```
{{/if}} {{!-- has-backup-ram --}}

{{#if has-powersave-clock}}
#### FEATURE_WIFI_POWERSAVE_CLOCK

{{since when="0.6.1"}}

```cpp
// SYNTAX
// enable POWERSAVE_CLOCK on P1S6 on P1 (default)
System.enableFeature(FEATURE_WIFI_POWERSAVE_CLOCK);

// disable POWERSAVE_CLOCK on P1S6 on P1
System.disableFeature(FEATURE_WIFI_POWERSAVE_CLOCK);
```

Enables/disables the Wi-Fi Powersave Clock on P1S6 on P1 (enabled by default). Useful for gaining 1 additional GPIO or PWM output on the P1.  When disabled, the 32kHz oscillator will not be running on this pin, and subsequently Wi-Fi Eco Mode (to be defined in the future) will not be usable.

**Note:** the FEATURE_WIFI_POWERSAVE_CLOCK feature setting is remembered even after power off or when entering safe mode. This is to allow your device to be configured once and then continue to function with the feature enabled/disabled.


```cpp
// Use the STARTUP() macro to disable the powersave clock at the time of boot
STARTUP(System.disableFeature(FEATURE_WIFI_POWERSAVE_CLOCK));

void setup() {
  pinMode(P1S6, OUTPUT);
  analogWrite(P1S6, 128); // set PWM output on P1S6 to 50% duty cycle
}

void loop() {
  // your loop code
}
```
{{/if}} {{!-- has-powersave-clock --}}

{{#if has-posix-filesystem}}

## File System

This device implements a POSIX-style file system API to store files on the LittleFS flash file system on the QSPI flash memory on the module.

| Device | Since Device OS | Size |
| :--- | :--- | :--- |
| Tracker SoM | 1.5.4-rc.1 | 4 MB |
| Argon, Boron, B Series SoM | 2.0.0-rc.1 | 2 MB |

The file system is not available on Gen 2 devices.

### File System open 

```cpp
// INCLUDE
#include <fcntl.h>

// PROTOTYPE
int open(const char* pathname, int flags, ... /* arg */)

// EXAMPLE
int fd = open("/FileSystemTest/test1.txt", O_RDWR | O_CREAT | O_TRUNC);
if (fd != -1) {
    for(int ii = 0; ii < 100; ii++) {
        String msg = String::format("testing %d\n", ii);

        write(fd, msg.c_str(), msg.length());
    }
    close(fd);
}

```

Open a file for reading or writing, depending on the flags.

- `pathname`: The pathname to the file (Unix-style, with forward slash as the directory separator).
- `flags`:
  These flags specify the read or write mode:
  - `O_RDWR`: Read or write.
  - `O_RDONLY`: Read only.
  - `O_WRONLY`: Write only.

  These optional flags can be logically ORed with the read/write mode:
  - `O_CREAT`: The file is created if it does not exist (see also `O_EXCL`).
  - `O_EXCL`: If `O_CREAT | O_EXCL` are set, then the file is created if it does not exist, but returns -1 and sets `errno` to `EEXIST` if file already exists.
  - `O_TRUNC` If the file exists and is opened in mode `O_RDWR` or `O_WRONLY` it is truncated to zero length.
  - `O_APPEND`: The file offset is set to the end of the file prior to each write.
 
Returns: A file descriptor number (>= 3) or -1 if an error occurs.

On error, returns -1 and sets `errno`. Some possible `errno` values include:

- `EINVAL` Pathname was NULL, invalid flags.
- `ENOMEM` Out of memory.
- `EEXIST` File already exists when using `O_CREAT | O_EXCL`.

When you are done accessing a file, be sure to call [`close`](#file-system-close) on the file descriptor.

Opening the same path again without closing opens up a new file descriptor each time, as is the case in UNIX.

### File System write

```cpp
// PROTOTYPE
int write(int fd, const void* buf, size_t count)
```

Writes to a file. If the file was opened with flag `O_APPEND` then the file is appended to. Otherwise, writes occur at the current file position, see [`lseek`](#file-system-lseek).

- `fd`: The file descriptor for the file, return from the [`open`](#file-system-open) call.
- `buf`: Pointer to the buffer to write to the file.
- `count`: Number of bytes to write to the file.


Returns the number of bytes written, which is typically `count`

On error, returns -1 and sets `errno`. Some possible `errno` values include:

- `EBADF` Bad `fd`.
- `ENOSPC` There is no space on the file system.

### File System read

```cpp
// PROTOTYPE
int read(int fd, void* buf, size_t count)
```

Reads from a file. Reads occur at the current file position, see [`lseek`](#file-system-lseek), and end at the current end-of-file.

- `fd`: The file descriptor for the file, return from the [`open`](#file-system-open) call.
- `buf`: Pointer to the buffer to read data from the file into.
- `count`: Number of bytes to read to the file.

Returns the number of bytes read, which is typically `count` unless the end-of-file is reached, in which case the number of bytes actually read is returned. The number of bytes may be 0 if already at the end-of-file.

On error, returns -1 and sets `errno`. Some possible `errno` values include:

- `EBADF` Bad `fd`

### File System lseek

```cpp
// PROTOTYPE
off_t lseek(int fd, off_t offset, int whence)
```

Seek to a position in a file. Affects where the next read or write will occur. Seeking past the end of the file does not immediately increase the size of the file, but will do so after the next write.

- `fd`: The file descriptor for the file, return from the [`open`](#file-system-open) call.
- `offset`: Offset. The usage depends on `whence`. For `SEEK_SET` the offset must be >= 0. For `SEEK_CUR` it can be positive or negative to seek relative to the current position. Negative values used with `SEEK_END` move relative to the end-of-file.
- `whence`:
  - `SEEK_SET`: Seek to `offset` bytes from the beginning of the file.
  - `SEEK_CUR`: Seek relative to the current file position.
  - `SEEK_END`: Seek relative to the end of the file. `offset` of 0 means seek to the end of the file when using `SEEK_END`. 

### File System close

```cpp
// PROTOTYPE
int close(int fd)
```

Closes a file descriptor.

- `fd`: The file descriptor for the file, return from the [`open`](#file-system-open) call.

Returns 0 on success. On error, returns -1 and sets `errno`. 

### File System fsync

```cpp
// PROTOTYPE
int fsync(int fd) 
```

- `fd`: The file descriptor for the file, return from the [`open`](#file-system-open) call.

Synchronizes the file data flash, for example writing out any cached data.

Returns 0 on success. On error, returns -1 and sets `errno`. 

### File System truncate

```cpp
// PROTOTYPE
int truncate(const char* pathname, off_t length)
```

Truncate a file to a given length.

- `pathname`: The pathname to the file (Unix-style, with forward slash as the directory separator).
- `length`: length in bytes.

Returns 0 on success. On error, returns -1 and sets `errno`. Some possible `errno` values include:

- `ENOENT`: File does not exist.
- `ENOSPC` There is no space on the file system.

### File System ftruncate

```cpp
// PROTOTYPE
int ftruncate(int fd, off_t length)
```

Truncate an open file to a given length.

- `fd`: The file descriptor for the file, return from the [`open`](#file-system-open) call.
- `length`: length in bytes.

Returns 0 on success. On error, returns -1 and sets `errno`. Some possible `errno` values include:

- `ENOENT`: File does not exist.
- `ENOSPC` There is no space on the file system.


### File System fstat

```cpp
// INCLUDE
#include <sys/stat.h>

// PROTOTYPE
int fstat(int fd, struct stat* buf)
```

Get information about a file that is open.

- `fd`: The file descriptor for the file, return from the [`open`](#file-system-open) call.
- `buf`: Filled in with file information.

Returns 0 on success. On error, returns -1 and sets `errno`. 

Only a subset of the `struct stat` fields are filled in. In particular:

- `st_size`: file size in bytes.
- `st_mode`: 
  - For files, the `S_IFREG` bit is set.
  - For directories, the `S_IFDIR` bit is set.
  - Be sure to check for the bit, not equality, as other bits may be set (like `S_IRWXU` | `S_IRWXG` | `S_IRWXO`) may be set.

### File System stat

```cpp
// INCLUDE
#include <sys/stat.h>

// PROTOTYPE
int stat(const char* pathname, struct stat* buf)
```

Get information about a file by pathname. The file can be open or closed.

- `pathname`: The pathname to the file (Unix-style, with forward slash as the directory separator).
- `buf`: Filled in with file information

Returns 0 on success. On error, returns -1 and sets `errno`. Some possible `errno` values include:

- `ENOENT`: File does not exist.
- `ENOTDIR`: A directory component of the path is not a directory.

Only a subset of the `struct stat` fields are filled in. In particular:

- `st_size`: file size in bytes.
- `st_mode`: 
  - For files, the `S_IFREG` bit is set.
  - For directories, the `S_IFDIR` bit is set.
  - Be sure to check for the bit, not equality, as other bits may be set (like `S_IRWXU | S_IRWXG | S_IRWXO`) may be set.

The file system does not store file times (creation, modification, or access).

### File System mkdir

```cpp
// PROTOTYPE
int mkdir(const char* pathname, mode_t mode)

// EXAMPLE
#include <sys/stat.h>

bool createDirIfNecessary(const char *path) {
    struct stat statbuf;

    int result = stat(path, &statbuf);
    if (result == 0) {
        if ((statbuf.st_mode & S_IFDIR) != 0) {
            Log.info("%s exists and is a directory", path);
            return true;
        }

        Log.error("file in the way, deleting %s", path);
        unlink(path);
    }
    else {
        if (errno != ENOENT) {
            // Error other than file does not exist
            Log.error("stat filed errno=%d", errno);
            return false;
        }
    }
    
    // File does not exist (errno == 2)
    result = mkdir(path, 0777);
    if (result == 0) {
        Log.info("created dir %s", path);
        return true;
    }
    else {
        Log.error("mkdir failed errno=%d", errno);
        return false;
    }
}
```

- `pathname`: The pathname to the file (Unix-style, with forward slash as the directory separator).
- `mode`: Mode of the file, currently ignored. For future compatibility, you may want to set this to `S_IRWXU | S_IRWXG | S_IRWXO` (or 0777).

Create a directory on the file system. 

Returns 0 on success. On error, returns -1 and sets `errno`. Some possible `errno` values include:

- `EEXIST`: Directory already exists, or there is file that already exists with that name.
- `ENOSPC`: No space left on the file system to create a directory.

The example code creates a directory if it does not already exists. It takes care of several things:

- If there is a file with the same name as the directory, it deletes the file.
- If the directory exists, it does not try to create it.
- If the directory does not exist, it will be created.
- It will only create the last directory in the path - it does not create a hierarchy of directories!

### File System rmdir

```cpp
// PROTOTYPE
int rmdir(const char* pathname) 
```

Removes a directory from the file system. The directory must be empty to remove it.

- `pathname`: The pathname to the file (Unix-style, with forward slash as the directory separator).


### File System unlink

```cpp
// PROTOTYPE
int unlink(const char* pathname)
```

Removes a file from the file system.

- `pathname`: The pathname to the file (Unix-style, with forward slash as the directory separator).

Returns 0 on success. On error, returns -1 and sets `errno`. Some possible `errno` values include:

- `EEXIST` or `ENOTEMPTY`: Directory is not empty.


### File System rename

```cpp
// PROTOTYPE
int rename(const char* oldpath, const char* newpath)
```

Renames a file from the file system. Can also move a file to a different directory.

- `oldpath`: The pathname to the file (Unix-style, with forward slash as the directory separator).
- `newpath`: The to rename to (Unix-style, with forward slash as the directory separator).

Returns 0 on success. On error, returns -1 and sets `errno`. 


### File System opendir

```cpp
// INCLUDE
#include <dirent.h>

// PROTOTYPE
DIR* opendir(const char* pathname)
```

Open a directory stream to iterate the files in the directory. Be sure to close the directory when done using [`closedir`](#file-system-closedir). Do not attempt to free the returned `DIR*`, only use `closedir`.

- `pathname`: The pathname to the directory (Unix-style, with forward slash as the directory separator).

Returns `NULL` (0) on error, or a non-zero value for use with `readdir`.

### File System readdir
```cpp
// INCLUDE
#include <dirent.h>

// PROTOTYPE
struct dirent* readdir(DIR* dirp) 
```

Reads the next entry from a directory. Used to find the names of all of the files and directories within a directory. See also [`readdir_r`](#file-system-readdir_r).

- `dirp`: The `DIR*` returned by [`opendir`](#file-system-opendir).

Returns a pointer to a `struct dirent` containing information about the next file in the directory. Returns NULL when the end of the directory is reached. Returns NULL and sets `errno` if an error occurs.

Not all fields of the `struct dirent` are filled in. You should only rely on:

- `d_type`: Type of entry:
  - `DT_REG`: File
  - `DT_DIR`: Directory 
- `d_name`: Name of the file or directory. Just the name, not the whole path.

This structure is reused on subsequent calls to `readdir` so if you need to save the values, you'll need to copy them.


### File System telldir

```cpp
// INCLUDE
#include <dirent.h>

// PROTOTYPE
long telldir(DIR* pdir)
```

- `dirp`: The `DIR*` returned by [`opendir`](#file-system-opendir).

Returns a numeric value for the current position in the directory that can subsequently be used with [`seekdir`](#file-system-seekdir) to go back to that position.

### File System seekdir

```cpp
// INCLUDE
#include <dirent.h>

// PROTOTYPE
void seekdir(DIR* pdir, long loc)
```

- `dirp`: The `DIR*` returned by [`opendir`](#file-system-opendir).
- `loc`: The location previously saved by [`telldir`](#file-system-telldir).

### File System rewinddir

```cpp
// INCLUDE
#include <dirent.h>

// PROTOTYPE
void rewinddir(DIR* pdir)
```

Starts scanning the directory from the beginning again.

- `dirp`: The `DIR*` returned by [`opendir`](#file-system-opendir).


### File System readdir_r

```cpp
// INCLUDE
#include <dirent.h>

// PROTOTYPE
int readdir_r(DIR* pdir, struct dirent* dentry, struct dirent** out_dirent)
```

Reads the next entry from a directory. Used to find the names of all of the files and directories within a directory. See also [`readdir`](#file-system-readdir).

- `dirp`: The `DIR*` returned by [`opendir`](#file-system-opendir).
- `dentry`: Pass in a pointer to a `struct dirent` to be filled in with the current directory entry.
- `out_dirent`: If not `NULL`, filled in with `dentry` if a directory entry was retrieved, or `NULL` if at the end of the directory.

Not all fields of `dentry` are filled in. You should only rely on:

- `d_type`: Type of entry:
  - `DT_REG`: File
  - `DT_DIR`: Directory 
- `d_name`: Name of the file or directory. Just the name, not the whole path.

Returns 0 on success. On error, returns -1 and sets `errno`. 

### File System closedir

```cpp
// INCLUDE
#include <dirent.h>

// PROTOTYPE
int closedir(DIR* dirp)
```

- `dirp`: The `DIR*` returned by [`opendir`](#file-system-opendir).

Returns 0 on success. On error, returns -1 and sets `errno`. 


{{/if}} {{!-- has-posix-filesystem --}}


## OTA Updates
This section describes the Device OS APIs that control firmware updates
for Particle devices.

_Many of the behaviors described below require
Device OS version 1.2.0 or higher_.

### Controlling OTA Availability

This feature allows the application developer to control when the device
is available for firmware updates. This affects both over-the-air (OTA)
and over-the-wire (OTW) updates. OTA availability also affects both
_single device OTA updates_ (flashing a single device) and _fleet-wide OTA updates_
(deploying a firmware update to many devices in a Product).

Firmware updates are enabled by default when the device starts up after a deep sleep or system reset. Applications may choose to disable firmware updates during critical periods by calling the `System.disableUpdates()` function and then enabling them again with `System.enableUpdates()`.

When the firmware update is the result of an [Intelligent
Firmware Release](/tutorials/device-cloud/ota-updates/#intelligent-firmware-releases),
the update is delivered immediately after `System.enableUpdates()` is called.

Standard Firmware Releases are delivered the next time the device connects to the cloud or when the current session expires or is revoked.

**Note**: Calling `System.disableUpdates()` and `System.enableUpdates()`
for devices running Device OS version 1.2.0 or later will result in a
message sent to the Device Cloud. This will result in a small amount of
additional data usage each time they are called.

### System.disableUpdates()
```cpp
// System.disableUpdates() example where updates are disabled
// when the device is busy.

int unlockScooter(String arg) {
  // scooter is busy, so disable updates
  System.disableUpdates();
  // ... do the unlock step
  // ...
  return 0;
}

int parkScooter(String arg) {
  // scooter is no longer busy, so enable updates
  System.enableUpdates();
  // ... do the park step
  // ...
  return 0;
}

void setup() {
  Particle.function("unlockScooter", unlockScooter);
  Particle.function("parkScooter", parkScooter);
}

```
Disables OTA updates on this device. An attempt to begin an OTA update
from the cloud will be prevented by the device. When updates are disabled, firmware updates are not
delivered to the device [unless forced](/tutorials/device-cloud/ota-updates/#force-enable-ota-updates).

**Since 1.2.0**

Device OS version 1.2.0 introduced enhanced support of
`System.disableUpdates()` and `System.enableUpdates()`. When running Device OS version 1.2.0
or higher, the device will notify the Device Cloud of its OTA
availability, which is [visible in the
Console](/tutorials/device-cloud/ota-updates/#ota-availability-in-the-console)
as well as [queryable via the REST
API](/reference/device-cloud/api/#get-device-information). The cloud
will use this information to deliver [Intelligent Firmware
Releases](/tutorials/device-cloud/ota-updates/#intelligent-firmware-releases).

In addition, a cloud-side system event will be emitted when updates are disabled,
`particle/device/updates/enabled` with a data value of `false`. This event is sent
only if updates were not already disabled.

| Version | Self service customers | Standard Product | Enterprise Product |
| ------- | ---------------------- | ---------------- |------------------- |
| Device OS &lt; 1.2.0 | Limited Support | Limited Support | Limited Support |
| Device OS &gt;= 1.2.0 | Full support | Full Support | Full Support |

**Enterprise Feature**

When updates are disabled, an attempt to send a firmware update to a
device that has called `System.disableUpdates()` will result in the
[`System.updatesPending()`](#system-updatespending-) function returning `true`.

### System.enableUpdates()
```cpp
// System.enableUpdates() example where updates are disabled on startup

SYSTEM_MODE(SEMI_AUTOMATIC);

void setup() {
  System.disableUpdates();  // updates are disabled most of the time

  Particle.connect();       // now connect to the cloud 
}

bool isSafeToUpdate() {
  // determine if the device is in a good state to receive updates. 
  // In a real application, this function would inspect the device state
  // to determine if it is busy or not. 
  return true;
}

void loop() {
  if (isSafeToUpdate()) {
    // Calling System.enableUpdates() when updates are already enabled
    // is safe, and doesn't use any data. 
    System.enableUpdates();
  }
  else {
    // Calling System.disableUpdates() when updates are already disabled
    // is safe, and doesn't use any data. 
    System.disableUpdates();
  }
}
```
Enables firmware updates on this device. Updates are enabled by default when the device starts.

Calling this function marks the device as available for updates. When
updates are enabled, updates triggered from the Device Cloud are delivered to
the device.

In addition, a cloud-side system event will be emitted when updates are
enabled,
`particle/device/updates/enabled` with a data value of `true`. This event is sent
only if updates were not already enabled.

**Since 1.2.0**

Device OS version 1.2.0 introduced enhanced support of
`System.disableUpdates()` and `System.enableUpdates()`. If running 1.2.0
or higher, the device will notify the Device Cloud of its OTA update
availability, which is [visible in the
Console](/tutorials/device-cloud/ota-updates/#ota-availability-in-the-console)
as well as [queryable via the REST
API](/reference/device-cloud/api/#get-device-information). The cloud
will use this information to deliver [Intelligent Firmware
Releases](/tutorials/device-cloud/ota-updates/#intelligent-firmware-releases).

| Version | Self service customers | Standard Product | Enterprise Product |
| ------- | ---------------------- | ---------------- |------------------- |
| Device OS &lt; 1.2.0 | Limited Support | Limited Support | Limited Support |
| Device OS &gt;= 1.2.0 | Full support | Full Support | Full Support |

### System.updatesEnabled()
```cpp
// System.updatesEnabled() example
bool isSafeToUpdate() {
  return true;
}

void loop() {
  if (!isSafeToUpdate() && System.updatesEnabled()) {
      Particle.publish("error", "Updates are enabled but the device is not safe to update.");
  }
}
```

Determine if firmware updates are presently enabled or disabled for this device.

Returns `true` on startup, and after `System.enableUpdates()` has been called. Returns `false` after `System.disableUpdates()` has been called.

| Version | Self service customers | Standard Product | Enterprise Product |
| ------- | ---------------------- | ---------------- |------------------- |
| Device OS &lt; 1.2.0 | Supported | Supported | Supported |
| Device OS &gt;= 1.2.0 | Supported | Supported | Supported |

### System.updatesPending()
```cpp
// System.updatesPending() example

SYSTEM_MODE(SEMI_AUTOMATIC);

void setup() {
  // When disabling updates by default, you must use either system
  // thread enabled or system mode SEMI_AUTOMATIC or MANUAL
  System.disableUpdates();

  // After setting the disable updates flag, it's safe to connect to
  // the cloud.
  Particle.connect();
}

bool isSafeToUpdate() {
  // ...
  return true;
}

void loop() {
  // NB: System.updatesPending() should only be used in a Product on the Enterprise Plan
  if (isSafeToUpdate() && System.updatesPending()) {
        System.enableUpdates();

        // Wait 2 minutes for the update to complete and the device
        // to restart. If the device doesn't automatically reset, manually
        // reset just in case.
        unsigned long start = millis();
        while (millis() - start < (120 * 1000)) {
            Particle.process();
        }
        // You normally won't reach this point as the device will
        // restart automatically to apply the update.
        System.reset();
    }
    else {
      // ... do some critical activity that shouldn't be interrupted
    }
}

```

**Enterprise Feature, Since 1.2.0**

`System.updatesPending()` indicates if there is a firmware update pending that was not delivered to the device while updates were disabled. When an update is pending, the `firmware_update_pending` system event is emitted and the `System.updatesPending()` function returns `true`.

When new product firmware is released with the `intelligent` option
enabled, the firmware is delivered immediately after release for devices
that have firmware updates are enabled.

For devices with [updates disabled](#system-disableupdates-), firmware
updates are deferred by the device. The device is notified of the
pending update at the time of deferral. The system event
`firmware_update_pending` is emmitted and the `System.updatesPending()`
function returns `true`.  The update is delivered when the application
later re-enables updates by calling `System.enableUpdates()`, or when
updates are force enabled from the cloud, or when the device is restarted.

In addition, a cloud-side system event will be emitted when a pending
OTA update is queued,
`particle/device/updates/pending` with a data value of `true`.

| Version | Self service customers | Standard Product | Enterprise Product |
| ------- | ---------------------- | ---------------- |------------------- |
| Device OS < 1.2.0 | N/A | N/A | N/A |
| Device OS >= 1.2.0 | N/A | N/A | Supported |

### System.updatesForced()

```cpp
// System.updatesForced() example
void loop() {
  if (System.updatesForced()) {
    // don't perform critical functions while updates are forced
  }
  else {
    // perform critical functions
  }
}
```

*Since 1.2.0*

When the device is not available for updates, the pending firmware
update is not normally delivered to the device. Updates can be forced in
the cloud [either via the Console or the REST API](/tutorials/device-cloud/ota-updates/#force-enable-ota-updates) to override the local
setting on the device. This means that firmware updates are delivered
even when `System.disableUpdates()` has been called by the device application.

When updates are forced in the cloud, the `System.updatesForced()` function returns `true`. 

In addition, a cloud-side system event will be emitted when OTA updates
are force enabled from the cloud, `particle/device/updates/forced` with
a data value of `true`.


Updates may be forced for a particular device. When this happens, updates are delivered even when `System.disableUpdates()` has been called.

When updates are forced in the cloud, this function returns `true`.

Forced updates may be used with Product firmware releases or single
device OTA updates.

| Version | Self service customers | Standard Product | Enterprise Product |
--------- | ---------------------- | ---------------- | ------------------ |
| Device OS &lt; 1.2.0 | N/A | N/A | N/A |
| Device OS &gt;= 1.2.0 | Supported | Supported | Supported |



## Checking for Features

User firmware is designed to run transparently regardless of what type of device it is run on. However, sometimes you will need to have code that varies depending on the capabilities of the device.

It's always best to check for a capability, rather than a specific device. For example, checking for cellular instead of checking for the Electron allows the code to work properly on the Boron without modification.

Some commonly used features include:

- Wiring_Cellular
- Wiring_Ethernet
- Wiring_IPv6
- Wiring_Keyboard
- Wiring_Mouse
- Wiring_Serial2
- Wiring_Serial3
- Wiring_Serial4
- Wiring_Serial5
- Wiring_SPI1
- Wiring_SPI2
- Wiring_USBSerial1
- Wiring_WiFi
- Wiring_Wire1
- Wiring_Wire3
- Wiring_WpaEnterprise

For example, you might have code like this to declare two different methods, depending on your network type:

```
#if Wiring_WiFi
	const char *wifiScan();
#endif

#if Wiring_Cellular
	const char *cellularScan();
#endif
```

The official list can be found [in the source](https://github.com/particle-iot/device-os/blob/develop/wiring/inc/spark_wiring_platform.h#L47).

### Checking Device OS Version

The define value `SYSTEM_VERSION` specifies the [system version](https://github.com/particle-iot/device-os/blob/develop/system/inc/system_version.h).

For example, if you had code that you only wanted to include in 0.7.0 and later, you'd check for:

```
#if SYSTEM_VERSION >= SYSTEM_VERSION_v070
// Code to include only for 0.7.0 and later
#endif
```

### Checking Platform ID

It's always best to check for features, but it is possible to check for a specific platform:

```
#if PLATFORM_ID == PLATFORM_BORON
// Boron-specific code goes here
#endif
```

You can find a complete list of platforms in [the source](https://github.com/particle-iot/device-os/blob/develop/hal/shared/platforms.h).

## Arduino Compatibility

All versions of Particle firmware to date have supported parts of the [Arduino API](https://www.arduino.cc/reference/en), such as `digitalRead`, `Serial` and `String`.

From 0.6.2 onwards, the firmware API will continue to provide increasing levels of support for new Arduino APIs to make
porting applications and libraries as straightforward as possible.

However, to prevent breaking existing applications and libraries, these new Arduino APIs have to be specifically enabled
in order to be available for use in your application or library.

Arduino APIs that need to be enabled explicitly are marked with "requires Arduino.h" in this reference documentation.


### Enabling Extended Arduino SDK Compatibility

The extended Arduino APIs that are added from 0.6.2 onwards are not immediately available but 
have to be enabled by declaring Arduino support in your app or library.

This is done by adding  `#include "Arduino.h"` to each source file that requires an extended Arduino API.

### Arduino APIs added by Firmware Version

Once `Arduino.h` has been added to a source file, additional Arduino APIs are made available.
The APIs added are determined by the targeted firmware version. In addition to defining the new APIs,
the `ARDUINO` symbol is set to a value that describes the supported SDK version. (e.g. 10800 for 1.8.0)

The table below lists the Arduino APIs added for each firmware version
and the value of the `ARDUINO` symbol.

|API name|description|ARDUINO version|Particle version|
|---|---|---|---|
|SPISettings||10800|0.6.2|
|__FastStringHelper||10800|0.6.2|
|Wire.setClock|synonym for `Wire.setSpeed`|10800|0.6.2|
|SPI.usingInterrupt|NB: this function is included to allow libraries to compile, but is implemented as a empty function.|10800|0.6.2|
|LED_BUILTIN|defines the pin that corresponds to the built-in LED|10800|0.6.2|

### Adding Arduino Symbols to Applications and Libraries

The Arduino SDK has a release cycle that is independent from Particle firmware. When a new Arduino SDK is released,
the new APIs introduced will not be available in the Particle firmware until the next Particle firmware release at
the earliest.

However, this does not have to stop applications and library authors from using these new Arduino APIs.
In some cases, it's possible to duplicate the sources in your application or library. 
However, it is necessary to be sure these APIs defined in your code are only conditionally included,
based on the version of the Arduino SDK provided by Particle firmware used to compile the library or application.

For example, let's say that in Arduino SDK 1.9.5, a new function was added, `engageHyperdrive()`.
You read the description and determine this is perfect for your application or library and that you want to use it.

In your application sources, or library headers you would add the definition like this:

```cpp
// Example of adding an Arduino SDK API in a later Arduino SDK than presently supported
#include "Arduino.h" // this declares that our app/library wants the extended Arduino support

#if ARDUINO < 10905   // the API is added in SDK version 1.9.5 so we don't re-define it when the SDK already has it
// now to define the new API
bool engageHyperdrive() {
   return false;  // womp womp
}
#endif
```
 
In your source code, you use the function normally. When compiling against a version of firmware that supports
an older Arduino SDK, then your own version of the API will be used.  Later, when `engageHyperdrive()` is added to
Particle firmware,  our version will be used. This happens when the `ARDUINO` version is the same or greater than
the the corresponding version of the Arduino SDK, which indicates the API is provided by Particle firmware.

By using this technique, you can use new APIs and functions right away, while also allowing them to be later defined
in the Arduino support provided by Particle, and crucially, without clashes.

*Note*: for this to work, the version check has to be correct and must use the value that the Arduino SDK sets the
`ARDUINO` symbol to when the new Arduino API is first introduced in the Arduino SDK.



## String Class

The String class allows you to use and manipulate strings of text in more complex ways than character arrays do. You can concatenate Strings, append to them, search for and replace substrings, and more. It takes more memory than a simple character array, but it is also more useful.

For reference, character arrays are referred to as strings with a small s, and instances of the String class are referred to as Strings with a capital S. Note that constant strings, specified in "double quotes" are treated as char arrays, not instances of the String class.

### String()

Constructs an instance of the String class. There are multiple versions that construct Strings from different data types (i.e. format them as sequences of characters), including:

  * a constant string of characters, in double quotes (i.e. a char array)
  * a single constant character, in single quotes
  * another instance of the String object
  * a constant integer or long integer
  * a constant integer or long integer, using a specified base
  * an integer or long integer variable
  * an integer or long integer variable, using a specified base
  * a float variable, showing a specific number of decimal places

```cpp
// SYNTAX
String(val)
String(val, base)
```

```cpp
// EXAMPLES

String stringOne = "Hello String";                     // using a constant String
String stringOne =  String('a');                       // converting a constant char into a String
String stringTwo =  String("This is a string");        // converting a constant string into a String object
String stringOne =  String(stringTwo + " with more");  // concatenating two strings
String stringOne =  String(13);                        // using a constant integer
String stringOne =  String(analogRead(0), DEC);        // using an int and a base
String stringOne =  String(45, HEX);                   // using an int and a base (hexadecimal)
String stringOne =  String(255, BIN);                  // using an int and a base (binary)
String stringOne =  String(millis(), DEC);             // using a long and a base
String stringOne =  String(34.5432, 2);                // using a float showing only 2 decimal places shows 34.54
```
Constructing a String from a number results in a string that contains the ASCII representation of that number. The default is base ten, so

`String thisString = String(13)`
gives you the String "13". You can use other bases, however. For example,
`String thisString = String(13, HEX)`
gives you the String "D", which is the hexadecimal representation of the decimal value 13. Or if you prefer binary,
`String thisString = String(13, BIN)`
gives you the String "1101", which is the binary representation of 13.



Parameters:

  * val: a variable to format as a String - string, char, byte, int, long, unsigned int, unsigned long
  * base (optional) - the base in which to format an integral value

Returns: an instance of the String class



### charAt()

Access a particular character of the String.

```cpp
// SYNTAX
string.charAt(n)
```
Parameters:

  * `string`: a variable of type String
  * `n`: the character to access

Returns: the n'th character of the String


### compareTo()

Compares two Strings, testing whether one comes before or after the other, or whether they're equal. The strings are compared character by character, using the ASCII values of the characters. That means, for example, that 'a' comes before 'b' but after 'A'. Numbers come before letters.


```cpp
// SYNTAX
string.compareTo(string2)
```

Parameters:

  * string: a variable of type String
  * string2: another variable of type String

Returns:

  * a negative number: if string comes before string2
  * 0: if string equals string2
  * a positive number: if string comes after string2

### concat()

Combines, or *concatenates* two strings into one string. The second string is appended to the first, and the result is placed in the original string.

```cpp
// SYNTAX
string.concat(string2)
```

Parameters:

  * string, string2: variables of type String

Returns: None

### endsWith()

Tests whether or not a String ends with the characters of another String.

```cpp
// SYNTAX
string.endsWith(string2)
```

Parameters:

  * string: a variable of type String
  * string2: another variable of type String

Returns:

  * true: if string ends with the characters of string2
  * false: otherwise


### equals()

Compares two strings for equality. The comparison is case-sensitive, meaning the String "hello" is not equal to the String "HELLO".

```cpp
// SYNTAX
string.equals(string2)
```
Parameters:

  * string, string2: variables of type String

Returns:

  * true: if string equals string2
  * false: otherwise

### equalsIgnoreCase()

Compares two strings for equality. The comparison is not case-sensitive, meaning the String("hello") is equal to the String("HELLO").

```cpp
// SYNTAX
string.equalsIgnoreCase(string2)
```
Parameters:

  * string, string2: variables of type String

Returns:

  * true: if string equals string2 (ignoring case)
  * false: otherwise

### format()

{{since when="0.4.6"}}


```cpp
// EXAMPLE
Particle.publish("startup", String::format("frobnicator started at %s", Time.timeStr().c_str()));

// EXAMPLE
int a = 123;
Particle.publish("startup", String::format("{\"a\":%d}", a);

```

Provides [printf](http://www.cplusplus.com/reference/cstdio/printf/)-style formatting for strings.

Sprintf-style formatting does not support 64-bit integers, such as `%lld`, `%llu` or Microsoft-style `%I64d` or `%I64u`.  

### getBytes()

Copies the string's characters to the supplied buffer.

```cpp
// SYNTAX
string.getBytes(buf, len)
```
Parameters:

  * string: a variable of type String
  * buf: the buffer to copy the characters into (byte [])
  * len: the size of the buffer (unsigned int)

Returns: None

### c_str()

Gets a pointer (const char *) to the internal c-string representation of the string. You can use this to pass to a function that require a c-string. This string cannot be modified.

The object also supports `operator const char *` so for things that specifically take a c-string (like Particle.publish) the conversion is automatic.

You would normally use c_str() if you need to pass the string to something like Serial.printlnf or Log.info where the conversion is ambiguous:

```cpp
Log.info("the string is: %s", string.c_str());
```

This is also helpful if you want to print out an IP address:

```cpp
Log.info("ip addr: %s", WiFi.localIP().toString().c_str());
```

### indexOf()

Locates a character or String within another String. By default, searches from the beginning of the String, but can also start from a given index, allowing for the locating of all instances of the character or String.

```cpp
// SYNTAX
string.indexOf(val)
string.indexOf(val, from)
```

Parameters:

  * string: a variable of type String
  * val: the value to search for - char or String
  * from: the index to start the search from

Returns: The index of val within the String, or -1 if not found.

### lastIndexOf()

Locates a character or String within another String. By default, searches from the end of the String, but can also work backwards from a given index, allowing for the locating of all instances of the character or String.

```cpp
// SYNTAX
string.lastIndexOf(val)
string.lastIndexOf(val, from)
```

Parameters:

  * string: a variable of type String
  * val: the value to search for - char or String
  * from: the index to work backwards from

Returns: The index of val within the String, or -1 if not found.

### length()

Returns the length of the String, in characters. (Note that this doesn't include a trailing null character.)

```cpp
// SYNTAX
string.length()
```

Parameters:

  * string: a variable of type String

Returns: The length of the String in characters.

### remove()

The String `remove()` function modifies a string, in place, removing chars from the provided index to the end of the string or from the provided index to index plus count.

```cpp
// SYNTAX
string.remove(index)
string.remove(index,count)
```

Parameters:

  * string: the string which will be modified - a variable of type String
  * index: a variable of type unsigned int
  * count: a variable of type unsigned int

Returns: None

### replace()

The String `replace()` function allows you to replace all instances of a given character with another character. You can also use replace to replace substrings of a string with a different substring.

```cpp
// SYNTAX
string.replace(substring1, substring2)
```

Parameters:

  * string: the string which will be modified - a variable of type String
  * substring1: searched for - another variable of type String (single or multi-character), char or const char (single character only)
  * substring2: replaced with - another variable of type String (single or multi-character), char or const char (single character only)

Returns: None

### reserve()

The String reserve() function allows you to allocate a buffer in memory for manipulating strings.

```cpp
// SYNTAX
string.reserve(size)
```
Parameters:

  * size: unsigned int declaring the number of bytes in memory to save for string manipulation

Returns: None

```cpp
//EXAMPLE
SerialLogHandler logHandler;

String myString;

void setup() {
  // initialize serial and wait for port to open:
  Serial.begin(9600);
  while (!Serial) {
    ; // wait for serial port to connect. Needed for Leonardo only
  }

  myString.reserve(26);
  myString = "i=";
  myString += "1234";
  myString += ", is that ok?";

  // print the String:
  Log.info(myString);
}

void loop() {
 // nothing to do here
}
```

### setCharAt()

Sets a character of the String. Has no effect on indices outside the existing length of the String.

```cpp
// SYNTAX
string.setCharAt(index, c)
```
Parameters:

  * string: a variable of type String
  * index: the index to set the character at
  * c: the character to store to the given location

Returns: None

### startsWith()

Tests whether or not a String starts with the characters of another String.

```cpp
// SYNTAX
string.startsWith(string2)
```

Parameters:

  * string, string2: variable2 of type String

Returns:

  * true: if string starts with the characters of string2
  * false: otherwise


### substring()

Get a substring of a String. The starting index is inclusive (the corresponding character is included in the substring), but the optional ending index is exclusive (the corresponding character is not included in the substring). If the ending index is omitted, the substring continues to the end of the String.

```cpp
// SYNTAX
string.substring(from)
string.substring(from, to)
```

Parameters:

  * string: a variable of type String
  * from: the index to start the substring at
  * to (optional): the index to end the substring before

Returns: the substring

### toCharArray()

Copies the string's characters to the supplied buffer.

```cpp
// SYNTAX
string.toCharArray(buf, len)
```
Parameters:

  * string: a variable of type String
  * buf: the buffer to copy the characters into (char [])
  * len: the size of the buffer (unsigned int)

Returns: None

### toFloat()

Converts a valid String to a float. The input string should start with a digit. If the string contains non-digit characters, the function will stop performing the conversion. For example, the strings "123.45", "123", and "123fish" are converted to 123.45, 123.00, and 123.00 respectively. Note that "123.456" is approximated with 123.46. Note too that floats have only 6-7 decimal digits of precision and that longer strings might be truncated.

```cpp
// SYNTAX
string.toFloat()
```

Parameters:

  * string: a variable of type String

Returns: float (If no valid conversion could be performed because the string doesn't start with a digit, a zero is returned.)

### toInt()

Converts a valid String to an integer. The input string should start with an integral number. If the string contains non-integral numbers, the function will stop performing the conversion.

```cpp
// SYNTAX
string.toInt()
```

Parameters:

  * string: a variable of type String

Returns: long (If no valid conversion could be performed because the string doesn't start with a integral number, a zero is returned.)

### toLowerCase()

Get a lower-case version of a String. `toLowerCase()` modifies the string in place.

```cpp
// SYNTAX
string.toLowerCase()
```

Parameters:

  * string: a variable of type String

Returns: None

### toUpperCase()

Get an upper-case version of a String. `toUpperCase()` modifies the string in place.

```cpp
// SYNTAX
string.toUpperCase()
```

Parameters:

  * string: a variable of type String

Returns: None

### trim()

Get a version of the String with any leading and trailing whitespace removed.

```cpp
// SYNTAX
string.trim()
```

Parameters:

  * string: a variable of type String

Returns: None


## Stream Class
Stream is the base class for character and binary based streams. It is not called directly, but invoked whenever you use a function that relies on it.  The Particle Stream Class is based on the Arduino Stream Class.

Stream defines the reading functions in Particle. When using any core functionality that uses a read() or similar method, you can safely assume it calls on the Stream class. For functions like print(), Stream inherits from the Print class.

Some of the Particle classes that rely on Stream include :
`Serial`
`Wire`
`TCPClient`
`UDP`

### setTimeout()
`setTimeout()` sets the maximum milliseconds to wait for stream data, it defaults to 1000 milliseconds.

```cpp
// SYNTAX
stream.setTimeout(time);
```

Parameters:

  * stream: an instance of a class that inherits from Stream
  * time: timeout duration in milliseconds (unsigned int)

Returns: None

### find()
`find()` reads data from the stream until the target string of given length is found.

```cpp
// SYNTAX
stream.find(target);		// reads data from the stream until the target string is found
stream.find(target, length);	// reads data from the stream until the target string of given length is found
```

Parameters:

  * stream : an instance of a class that inherits from Stream
  * target : pointer to the string to search for (char *)
  * length : length of target string to search for (size_t)

Returns: returns true if target string is found, false if timed out

### findUntil()
`findUntil()` reads data from the stream until the target string or terminator string is found.

```cpp
// SYNTAX
stream.findUntil(target, terminal);		// reads data from the stream until the target string or terminator is found
stream.findUntil(target, terminal, length);	// reads data from the stream until the target string of given length or terminator is found
```

Parameters:

  * stream : an instance of a class that inherits from Stream
  * target : pointer to the string to search (char *)
  * terminal : pointer to the terminal string to search for (char *)
  * length : length of target string to search for (size_t)

Returns: returns true if target string or terminator string is found, false if timed out

### readBytes()
`readBytes()` read characters from a stream into a buffer. The function terminates if the determined length has been read, or it times out.

```cpp
// SYNTAX
stream.readBytes(buffer, length);
```

Parameters:

  * stream : an instance of a class that inherits from Stream
  * buffer : pointer to the buffer to store the bytes in (char *)
  * length : the number of bytes to read (size_t)

Returns: returns the number of characters placed in the buffer (0 means no valid data found)

### readBytesUntil()
`readBytesUntil()` reads characters from a stream into a buffer. The function terminates if the terminator character is detected, the determined length has been read, or it times out.

```cpp
// SYNTAX
stream.readBytesUntil(terminator, buffer, length);
```

Parameters:

  * stream : an instance of a class that inherits from Stream
  * terminator : the character to search for (char)
  * buffer : pointer to the buffer to store the bytes in (char *)
  * length : the number of bytes to read (size_t)

Returns: returns the number of characters placed in the buffer (0 means no valid data found)

### readString()
`readString()` reads characters from a stream into a string. The function terminates if it times out.

```cpp
// SYNTAX
stream.readString();
```

Parameters:

  * stream : an instance of a class that inherits from Stream

Returns: the entire string read from stream (String)

### readStringUntil()
`readStringUntil()` reads characters from a stream into a string until a terminator character is detected. The function terminates if it times out.

```cpp
// SYNTAX
stream.readStringUntil(terminator);
```

Parameters:

  * stream : an instance of a class that inherits from Stream
  * terminator : the character to search for (char)

Returns: the entire string read from stream, until the terminator character is detected

### parseInt()
`parseInt()` returns the first valid (long) integer value from the current position under the following conditions:

 - Initial characters that are not digits or a minus sign, are skipped;
 - Parsing stops when no characters have been read for a configurable time-out value, or a non-digit is read;

```cpp
// SYNTAX
stream.parseInt();
stream.parseInt(skipChar);	// allows format characters (typically commas) in values to be ignored
```

Parameters:

  * stream : an instance of a class that inherits from Stream
  * skipChar : the character to ignore while parsing (char).

Returns: parsed int value (long). If no valid digits were read when the time-out occurs, 0 is returned.

### parseFloat()
`parseFloat()` as `parseInt()` but returns the first valid floating point value from the current position.

```cpp
// SYNTAX
stream.parsetFloat();
stream.parsetFloat(skipChar);	// allows format characters (typically commas) in values to be ignored
```

Parameters:

  * stream : an instance of a class that inherits from Stream
  * skipChar : the character to ignore while parsing (char).

Returns: parsed float value (float). If no valid digits were read when the time-out occurs, 0 is returned.

## JSON

```json
{
   "a":123,
   "b":"testing",
   "c":
       [
           1,
           2,
           3
       ],
   "d":10.333,
   "e":false,
   "f":
       {
           "g":"Call me \"John\"",
           "h":-0.78
       }
}
```

{{since when="0.6.1"}}

[JSON](https://json.org) is a standard for transmitting data in a text-based format. It's often used on Particle devices for placing multiple pieces of data in a single publish, subscribe, or function call. It's more flexible than formats like comma-separated values and has well-defined methods for escaping characters safely.

The Particle JSON library is based on [JSMN](https://github.com/zserge/jsmn) for parsing and also includes a JSON generator/writer. It's lightweight and efficient. The JSMN parser is built into Device OS so it doesn't take up additional application RAM, however the wrapper library is included within the user application firmware binary.

- The JSON encoded data consists only of 7-bit ASCII characters. Control characters are escaped.
- There are types of data for bool, int, double, string, object, and array.
- Objects and arrays can contain nested objects and arrays, as well as primitive types (bool, int, double, string).
- There is no binary blob in JSON, you need to encode the data in something like Base64, Base85, or hex encoding.
- You can't encode circular structures with JSON.

### JSONWriter

The `JSONWriter` object creates JSON objects and arrays. While you can create JSON objects using things like `sprintf` the `JSONWriter` has a number of advantages:

| Measure           | `sprintf`    | `JSONWriter` | JsonParserGeneratorRK | 
| :---------------- | :----------: | :----------: | :-------------------- |
| Code Size         | Small        | Fairly Small | Medium                |
| Easy to Use       | Not really   | Yes          | Yes                   |
| Escapes Strings   | No           | Yes          | Yes                   |
| Converts UTF-8    | No           | No           | Yes                   |

Using `sprintf` is tried-and-true, but the escaping of double quotes can get messy:

```cpp
int a = 123;
bool b = true;
const char *c = "testing";

snprintf(buf, sizeof(buf), "{\"a\":%d,\"b\":%s,\"c\":\"%s\"}", 
    a, 
    b ? "true" : "false",
    c);
```

That generates the string in `buf`: `{"a":123,"b":true,"c":"testing"}`.

---

Using `JSONWriter` the code is much easier to read:

```cpp
JSONBufferWriter writer(buf, sizeof(buf));
writer.beginObject();
    writer.name("a").value(a);
    writer.name("b").value(b);
    writer.name("c").value(c);
writer.endObject();
```

The real place where this becomes important is for strings that contain special characters including:

- Double quote
- Backslash
- Control characters (tab, CR, LF, and others)
- Unicode characters

If the `testing` string above contained a double quote the `sprintf` version would generate invalid JSON, but the `JSONWriter` version correctly escapes a double quote in a string.

Note: `JSONWriter` does not handle Unicode characters. If you need to handle characters other than 7-bit ASCII, you should use [JsonParserGeneratorRK](https://github.com/rickkas7/JsonParserGeneratorRK) which handles UTF-8 to JSON Unicode (hex escaped UTF-16) conversion.

You will not create a `JSONWriter` directly, as it's an abstract base class. Instead use `JSONBufferWriter` or `JSONStreamWriter`, or your own custom subclass.

The sprintf-style code above created a 12,212 byte binary. The JSONWriter created a 12,452 byte binary, a difference of 240 bytes. However, as the data you are trying to encode becomes more complicated, the difference will likely become smaller.


#### JSONWriter::beginArray()

Creates an array. This can be a top-level array, or an array as a value with an object at a specific key.

```cpp
// PROTOTYPE
JSONWriter& beginArray();

// EXAMPLE
memset(buf, 0, sizeof(buf));
JSONBufferWriter writer(buf, sizeof(buf) - 1);

writer.beginArray();
writer.value(1);
writer.value(2);
writer.value(3);       
writer.endArray();

// RESULT
[1,2,3]
```

---

You can chain `JSONWriter` methods, fluent-style, if you prefer that style:

```cpp
writer.beginArray()
  .value(1)
  .value(2)
  .value(3)       
  .endArray();
```

---

Example of using an array within a key/value pair of an object:

```cpp
// EXAMPLE
memset(buf, 0, sizeof(buf));
JSONBufferWriter writer(buf, sizeof(buf) - 1);

writer.beginObject();
    writer.name("a").value(123);
    writer.name("b").beginArray();
        writer.value(1);
        writer.value(2);
        writer.value(3);       
    writer.endArray();
writer.endObject();

// RESULT
{"a":123,"b":[1,2,3]}
```
---

#### JSONWriter::endArray()

```cpp
// PROTOTYPE
JSONWriter& endArray();
```

Closes an array. You must always balance `beginArray()` with an `endArray()`.


#### JSONWriter::beginObject()

```cpp
// PROTOTYPE
JSONWriter& beginObject();

// EXAMPLE
memset(buf, 0, sizeof(buf));
JSONBufferWriter writer(buf, sizeof(buf) - 1);

writer.beginObject();
writer.name("a").value(123);
writer.endObject();

// RESULT
{"a":123}
```

Begins a new object. The outermost object is not created automatically, so you almost always will start by using `beginObject()`, which must always be balanced with an `endObject()`.

---

#### JSONWriter::endObject()

```cpp
// PROTOTYPE
JSONWriter& endObject();
```

Closes an object. You must always balance `beginObject()` with `endObject()`.

---

#### JSONWriter::name(const char *name)

```cpp
// PROTOTYPE
JSONWriter& name(const char *name);

// EXAMPLE
memset(buf, 0, sizeof(buf));
JSONBufferWriter writer(buf, sizeof(buf) - 1);

bool v1 = false;
bool v2 = true;

writer.beginObject();
writer.name("v1").value(v1);
writer.name("v2").value(v2);
writer.endObject();

// RESULT
{"v":false,"v2":true}
```

When adding key/value pairs to an object, you call `name()` to add the key, then call `value()` to add the value. 

This overload takes a `const char *`, a c-string, null terminated, that is not modified.

The name is escaped so it can contain double quote, backslash, and other special JSON characters, but it must be 7-bit ASCII (not Unicode).

---

#### JSONWriter::name(const char *name, size_t size)

```cpp
// PROTOTYPE
JSONWriter& name(const char *name, size_t size);
```

When adding key/value pairs to an object, you call `name()` to add the key, then call `value()` to add the value. 

This overload takes a pointer to a string and a length, allowing it to be used with unterminated strings.

The name is escaped so it can contain double quote, backslash, and other special JSON characters, but it must be 7-bit ASCII (not Unicode).

---

#### JSONWriter::name(const String &name)

```cpp
// PROTOTYPE
JSONWriter& name(const String &name);
```

Sets the name of a key/value pair from a `String` object.

---

#### JsonWriter::value(bool val)

```cpp
// PROTOTYPE
JSONWriter& value(bool val);

// EXAMPLE
memset(buf, 0, sizeof(buf));
JSONBufferWriter writer(buf, sizeof(buf) - 1);

bool v1 = false;
bool v2 = true;

writer.beginObject();
writer.name("v1").value(v1);
writer.name("v2").value(v2);
writer.endObject();

// RESULT
{"v":false,"v2":true}
```

Adds a boolean value to an object or array. 

When adding to an object, you call `beginObject()` then pairs of `name()` and `value()` for each key/value pair, followed by `endObject()`.

When adding to an array, you call `beginArray()` then call `value()` for each value, followed by `endArray()`. You can mix different types of values within an array (int, string, double, bool, etc.).

---

#### JsonWriter::value(int val)


```cpp
// PROTOTYPE
JSONWriter& value(int val);

// EXAMPLE
memset(buf, 0, sizeof(buf));
JSONBufferWriter writer(buf, sizeof(buf) - 1);

writer.beginObject();
writer.name("a").value(123);
writer.endObject();

// RESULT
{"a":123}
```

Adds a signed 32-bit integer value to an object or array. Since both `int` and `long` are 32-bits you can cast a `long` to an `int` and use this method.

---

#### JsonWriter::value(unsigned val)

```cpp
// PROTOTYPE
JSONWriter& value(unsigned val);
```

Adds an unsigned 32-bit integer value to an object or array. 


#### JsonWriter::value(double val, int precision)

{{since when="1.5.0"}}

```cpp
// PROTOTYPE
JSONWriter& value(double val, int precision);

// EXAMPLE
memset(buf, 0, sizeof(buf));
JSONBufferWriter writer(buf, sizeof(buf) - 1);

writer.beginObject();
writer.name("d").value(-5.3333333, 3);
writer.endObject();

// RESULT
{"d":-5.333}
```

Adds a `double` or `float` value with a specific number of decimal points. Internally, this uses `sprintf` with the `%.*lf` formatting specifier. The precision option was added in Device OS 1.5.0.

---

#### JsonWriter::value(double val)

```cpp
// PROTOTYPE
JSONWriter& value(double val);

// EXAMPLE
memset(buf, 0, sizeof(buf));
JSONBufferWriter writer(buf, sizeof(buf) - 1);

writer.beginObject();
writer.name("d").value(-5.3333333);
writer.endObject();

// RESULT
{"d":-5.33333}
```

Adds a `double` or `float` value. Internally, this uses `sprintf` with the `%g` formatting specifier. The `%g` specifier uses the shorter of `%e` (Scientific notation, mantissa and exponent, using e character) and `%f`, decimal floating point.

The default precision is 5 decimal places.

---

#### JsonWriter::value(const char *val)

```cpp
// PROTOTYPE
JSONWriter& value(const char *val);
```

This overload add a `const char *`, a c-string, null terminated, that is not modified.

The value is escaped so it can contain double quote, backslash, and other special JSON characters, but it must be 7-bit ASCII (not Unicode).

#### JsonWriter::value(const char *val, size_t size)

```cpp
// PROTOTYPE
JSONWriter& value(const char *val, size_t size);
```

This overload takes a pointer to a string and a length, allowing it to be used with unterminated strings.

The value is escaped so it can contain double quote, backslash, and other special JSON characters, but it must be 7-bit ASCII (not Unicode).

#### JsonWriter::value(const String &val)

```cpp
// PROTOTYPE
JSONWriter& value(const String &val);
```

This overload takes a reference to a `String` object.

The value is escaped so it can contain double quote, backslash, and other special JSON characters, but it must be 7-bit ASCII (not Unicode).


#### JsonWriter::nullValue()

```cpp
// PROTOTYPE
JSONWriter& nullValue();

// EXAMPLE
memset(buf, 0, sizeof(buf));
JSONBufferWriter writer(buf, sizeof(buf) - 1);

writer.beginObject();
writer.name("n").nullValue();
writer.endObject();

// RESULT
{"n":null}
```

Adds a null value to an object. This is a special JSON value, and is not the same as 0 or false.

---


### JSONBufferWriter

Writes a JSON object to a buffer in RAM. You must pre-allocate the buffer larger than the maximum size of the object you intend to create.

#### JSONBufferWriter::JSONBufferWriter(char *buf, size_t size)

```
// PROTOTYPE
JSONBufferWriter(char *buf, size_t size);

// EXAMPLE - Clear Buffer
memset(buf, 0, sizeof(buf));
JSONBufferWriter writer(buf, sizeof(buf) - 1);

writer.beginObject();
writer.name("d").value(10.5);
writer.endObject();
```

Construct a `JSONWriter` to write to a buffer in RAM.

- `buf` A pointer to a buffer to store the data. Must be non-null.
- `size` Size of the buffer in bytes. 

The `buf` is not zereod out before use. 

---

```cpp
// EXAMPLE - Null Terminate
JSONBufferWriter writer(buf, sizeof(buf) - 1);

writer.beginObject();
writer.name("d").value(10.5);
writer.endObject();
writer.buffer()[std::min(writer.bufferSize(), writer.dataSize())] = 0;
```

Instead of of zeroing out the whole buffer, you can just add the null terminator. A few things:

- Pass `sizeof(buf) - 1` to leave room for the null terminator.
- You must use the expression `std::min(writer.bufferSize(), writer.dataSize())` for the location to put the null terminator.

The reason is that `writer.dataSize()` is the size the data would be if it fit. It the data is truncated, then zeroing out at offset `writer.dataSize()` will write past the end of the buffer. 

#### JSONBufferWriter::buffer()

```
// PROTOTYPE
char* buffer() const;
```

Returns the buffer you passed into the constructor.

#### JSONBufferWriter::bufferSize()

```
// PROTOTYPE
size_t bufferSize() const;
```

Returns the buffer size passed into the constructor.

#### JSONBufferWriter::dataSize()

```
// PROTOTYPE
size_t dataSize() const;
```

Returns the actual data size, which may be larger than `bufferSize()`. If the data is too large it is truncated, creating an invalid JSON object, but `dataSize()` will indicate the actual size, if the buffer had been big enough. 


### JSONStreamWriter

You can use `JSONStreamWriter` to write JSON directly to a `Stream` that implements the `Print` interface. 

You can use this technique to write JSON directly to a `TCPClient` for example, without buffering in RAM. This is useful for very large objects, however it's generally more efficient to buffer reasonably-sized objects in RAM and write them in a single `write()` instead of byte-by-byte.


#### JSONStreamWriter::JSONStreamWriter(Print &stream)

```
// PROTOTYPE
JSONStreamWriter(Print &stream); 
```

Constructs a `JSONWriter` that writes to a `Print` interface.


#### JSONStreamWriter::stream()

```cpp
// PROTOTYPE
Print* stream() const;
```

Returns the stream you passed to the constructor.


### Parsing

There is also a JSON parser available. You can use it to parse JSON objects that you get from event subscriptions, Particle function calls, BLE, TCP, UDP, Serial, etc..

There are some limitations to be aware of:

- The entire object must be stored in RAM.
- The parser modifies the buffer, so if you have a buffer that you cannot modify, it will need to be copied into RAM.
- Grabbing values by key name or array elements by index is cumbersome.
- Unicode strings are not supported. All strings must be 7-bit ASCII, but double quote, backslash, and control characters are unescaped.

However, it is a fast and efficient parser, and since the JSMN parser is part of Device OS, it saves on code space.

### JSONValue

```cpp
// EXAMPLE
SerialLogHandler logHandler;

void setup() {
    Particle.subscribe("jsonTest", subscriptionHandler);
}

void subscriptionHandler(const char *event, const char *data) {

    JSONValue outerObj = JSONValue::parseCopy(data);

    JSONObjectIterator iter(outerObj);
    while(iter.next()) {
        Log.info("key=%s value=%s", 
          (const char *) iter.name(), 
          (const char *) iter.value().toString());
    }
}

// TEST EVENT
$ particle publish jsonTest '{"a":123,"b":"testing"}'

// LOG
0000068831 [app] INFO: key=a value=123
0000068831 [app] INFO: key=b value=testing
```

The `JSONValue` object is a container that holds one of: 

- A value (bool, int, double, string, etc.) 
- A JSON object
- A JSON array

If you have a buffer of data containing a JSON object or array, you pass it to one of the static `parse()` methods.

In this example, `parseCopy()` is used because a subscription handler data must not be modified (it is `const`). It's a static method, so you always use it like `JSONValue::parseCopy(data)`.

#### JSONValue::isNull()

```cpp
// PROTOTYPE
bool isNull() const;
```

Returns true if the value is the JSON null value, like `{"value":null}`. This is different than just being 0 or false!


#### JSONValue::isBool()

```cpp
// PROTOTYPE
bool isBool() const;
```

Returns true if the value is the JSON boolean value, like `{"value":true}` or `{"value":false}`. This is different than just being 0 or 1!

#### JSONValue::isNumber()

```cpp
// PROTOTYPE
bool isNumber() const;
```

Returns true if the value is the JSON number value, either int or double, like `{"value":123}` or `{"value":-10.5}`.

#### JSONValue::isString()

```cpp
// PROTOTYPE
bool isString() const;
```

Returns true if the value is the JSON string value, like `{"value":"testing"}`.

#### JSONValue::isArray()

```cpp
// PROTOTYPE
bool isArray() const;
```

Returns true if the value is the JSON array value, like `[1,2,3]`.

#### JSONValue::isObject()

```cpp
// PROTOTYPE
bool isObject() const;
```

Returns true if the value is a JSON object, like `{"a":123,"b":"testing"}`.

#### JSONValue::type()

```cpp
// PROTOTYPE
JSONType type() const;

// CONSTANTS
enum JSONType {
    JSON_TYPE_INVALID,
    JSON_TYPE_NULL,
    JSON_TYPE_BOOL,
    JSON_TYPE_NUMBER,
    JSON_TYPE_STRING,
    JSON_TYPE_ARRAY,
    JSON_TYPE_OBJECT
};
```

Instead of using `isNumber()` for example, you can use `type()` and check it against `JSON_TYPE_NUMBER`.

#### JSONValue::toBool()

```
// PROTOTYPE
bool toBool() const;
```

Converts the value to a boolean. Some type conversion is done if necessary:

| JSON Type          | Conversion |
| :----------------- | :--- |
| `JSON_TYPE_BOOL`   | true if begins with 't' (case-sensitive), otherwise false |
| `JSON_TYPE_NUMBER` | false if 0 (integer) or 0.0 (double), otherwise true |
| `JSON_TYPE_STRING` | false if empty, "false", "0", or "0.0", otherwise true | 

#### JSONValue::toInt()

```
// PROTOTYPE
int toInt() const;
```

Converts the value to a signed integer (32-bit). Some type conversion is done if necessary:

| JSON Type          | Conversion |
| :----------------- | :--- |
| `JSON_TYPE_BOOL`   | 0 if false, 1 if true |
| `JSON_TYPE_NUMBER` | as converted by `strtol` |
| `JSON_TYPE_STRING` | as converted by `strtol` | 

`strltol` parses:

- An optional sign character (+ or -)
- An optional prefix indicating octal ("0") or hexadecimal ("0x" or "0X")
- A sequence of digits (octal, decimal, or hexadecimal)

Beware of passing decimal values with leading zeros as they will be interpreted as octal when using `toInt()`!

#### JSONValue::toDouble()

```
// PROTOTYPE
double toDouble() const;
```

Converts the value to a floating point double (64-bit). Some type conversion is done if necessary:

| JSON Type          | Conversion |
| :----------------- | :--- |
| `JSON_TYPE_BOOL`   | 0.0 if false, 1.0 if true |
| `JSON_TYPE_NUMBER` | as converted by `strtod` |
| `JSON_TYPE_STRING` | as converted by `strtod` | 

`strtod` supports decimal numbers, and also scientific notation (using `e` as in `1.5e4`). 

#### JSONValue::toString()

```cpp
// PROTOTYPE
JSONString toString() const;
```

Converts a value to a `JSONString` object. This can only be used for primitive types (bool, int, number, string, null). It cannot be used to serialize an array or object. 

Since the underlying JSON is always a string, this really just returns a reference to the underlying representation.

A `JSONString` is only a reference to the underlying data, and does not copy it. 

#### JSONValue::isValid()

```cpp
// PROTOTYPE
bool isValid() const;
```

Returns true if the `JSONValue` is valid. If you parse an invalid object, `isValid()` will be false.

### JSONString

The `JSONString` object is used to represent string objects and is returned from methods like `toString()` in the `JSONValue` class. Note that this is merely a view into the parsed JSON object. It does not create a separate copy of the string! 



#### JSONString::JSONString(const JSONValue &value);

```cpp
// PROTOTYPE
explicit JSONString(const JSONValue &value);
```

Constructs a `JSONString` from a `JSONValue`. You will probably use the `toString()` method of `JSONValue` instead of manually constructing the object.

#### JSONString::data()

```cpp
// PROTOTYPE
const char* data() const; 
```

Returns a c-string (null-terminated). Note that only 7-bit ASCII characters are supported. This returns a pointer to the original parsed JSON data, not a copy.

#### JSONString::operator const char *()

```cpp
// PROTOTYPE
explicit operator const char*() const;
```

Returns a c-string (null-terminated). Note that only 7-bit ASCII characters are supported. This returns a pointer to the original parsed JSON data, not a copy. This is basically the same as `data()`.


#### JSONString::operator String()

```cpp
// PROTOTYPE
explicit operator String() const;
```

Returns a `String` object containing a copy of the string data. Note that only 7-bit ASCII characters are supported.

#### JSONString::size()

```cpp
// PROTOTYPE
size_t size() const;
```

Returns the size of the string in bytes, not including the null terminator. Since the data must be 7-bit ASCII characters (not Unicode), the number of bytes and the number of characters will be the same.

The `size()` method is fast, <i>O</i>(1), as the length is stored in the parsed JSON tokens.

#### JSONString::isEmpty()

```cpp
// PROTOTYPE
bool isEmpty() const;
```

Returns true if the string is empty, false if not.

#### JSONString::operator==()

```cpp
// PROTOTYPES
bool operator==(const char *str) const;
bool operator==(const String &str) const;
bool operator==(const JSONString &str) const;
```

Tests for equality with another string. Uses `strncmp` internally.

#### JSONString::operator!=()

```cpp
// PROTOTYPES
bool operator!=(const char *str) const;
bool operator!=(const String &str) const;
bool operator!=(const JSONString &str) const;
```

Tests for inequality with another string.

### JSONObjectIterator

```cpp
// EXAMPLE
SerialLogHandler logHandler;

void setup() {
    Particle.subscribe("jsonTest", subscriptionHandler);
}

void subscriptionHandler(const char *event, const char *data) {

    JSONValue outerObj = JSONValue::parseCopy(data);

    JSONObjectIterator iter(outerObj);
    while(iter.next()) {
        Log.info("key=%s value=%s", 
          (const char *) iter.name(), 
          (const char *) iter.value().toString());
    }
}

// TEST EVENT
$ particle publish jsonTest '{"a":123,"b":"testing"}'

// LOG
0000068831 [app] INFO: key=a value=123
0000068831 [app] INFO: key=b value=testing
```

In order to access key/value pairs in a JSON object, you just create a `JSONObjectIterator` from the `JSONValue`.

The basic flow is:

- Create a `JSONObjectIterator` from a `JSONValue`.
- Call `iter.next()`. This must be done before accessing the first value, and to access each subsequent value. When it returns false, there are no more elements. It's possible for `next()` return false on the first call for an empty object.
- Use `iter.name()` and `iter.value()` to get the key name and value.

---

```cpp
// EXAMPLE
JSONValue outerObj = JSONValue::parseCopy(
  "{\"a\":123,\"b\":\"test\",\"c\":true}");

JSONObjectIterator iter(outerObj);
while(iter.next()) {
    if (iter.name() == "a") {
        Log.trace("a=%d", 
          iter.value().toInt());
    }
    else
    if (iter.name() == "b") {
        Log.trace("b=%s", 
          (const char *) iter.value().toString());     
    }
    else
    if (iter.name() == "c") {
        Log.trace("c=%d", 
          iter.value().toBool());
    }
    else {
        Log.trace("unknown key %s", 
          (const char *)iter.name());
    }
}

// LOG
0000242555 [app] TRACE: a=123
0000242555 [app] TRACE: b=test
0000242555 [app] TRACE: c=1
```

Since there is no way to find an element by its key name, you typically iterate the object and compare the name like this:

You should not rely on the ordering of keys in a JSON object. While in this simple example, the keys will always be in the order a, b, c, when JSON objects are manipulated by server-based code, the keys can sometimes be reordered. The name-based check here assures compatibility even if reordered. Arrays will always stay in the same order.

---

#### JSONObjectIterator::JSONObjectIterator(const JSONValue &value)

```cpp
// PROTOTYPE
explicit JSONObjectIterator(const JSONValue &value);
```

Construct an iterator from a `JSONValue`. This can be the whole object, or you can use it to iterate an object within the key of another object.

#### JSONObjectIterator::next()

```cpp
// PROTOTYPE
bool next();
```

Call `next()` before accessing `name()` and `value()`. Then each subsequent call will get the next pair. When it returns false, there are no elements left. It's possible for `next()` to return false on the first call if the object has no key/value pairs.

There is no rewind function to go back to the beginning. To start over, construct a new `JSONObjectIterator` from the `JSONValue` again.

#### JSONObjectIterator::name()

```cpp
// PROTOTYPE
JSONString name() const;
```

Returns the name of the current name/value pair in the object. The name must be 7-bit ASCII but can contain characters that require escaping (like double quotes and backslash). To get a `const char *` you can use `iter.name().data()`.

#### JSONObjectIterator::value()

```cpp
// PROTOTYPE
JSONValue value() const;
```

Returns the current value of the name/value pair in the object. 

You will typically use methods of `JSONValue` like `toInt()`, `toBool()`, `toDouble()`, and `toString()` to get useful values. For example:

- `iter.value().toInt()`: Returns a signed 32-bit int.
- `iter.value().toDouble()`: Returns a 64-bit double.
- `iter.value().toString().data()`: Returns a `const char *`. You can assign this to a `String` to copy the value, if desired.

#### JSONObjectIterator::count()

```cpp
// PROTOTYPE
size_t count() const;
```

Returns the count of the number of remaining key/value pairs. As you call `next()` this value will decrease.


### JSONArrayIterator

```cpp
// EXAMPLE
JSONValue outerObj = JSONValue::parseCopy(
  "[\"abc\",\"def\",\"xxx\"]");

JSONArrayIterator iter(outerObj);
for(size_t ii = 0; iter.next(); ii++) {
    Log.info("%u: %s", ii, iter.value().toString().data());
}

// OUTPUT
0000004723 [app] INFO: 0: abc
0000004723 [app] INFO: 1: def
0000004723 [app] INFO: 2: xxx
```

In order to access array elements, you must create a `JSONArrayIterator` object from a `JSONValue`.

The basic flow is:

- Create a `JSONArrayIterator` from a `JSONValue`. 
- Call `iter.next()`. This must be done before accessing the first value, and to access each subsequent value. When it returns false, there are no more elements. It's possible for `next()` return false on the first call for an empty object.
- Use `iter.name()` and `iter.value()` to get the key name and value.

There is no method to find a value from its index; you must iterate the array to find it.

#### JSONArrayIterator::JSONArrayIterator(const JSONValue &value)

```cpp
// PROTOTYPE
explicit JSONArrayIterator(const JSONValue &value);
```

Construct an array iterator.

#### JSONArrayIterator::next()

```cpp
// PROTOTYPE
bool next();
```

Call `next()` before accessing `value()`. Then each subsequent call will get the value. When it returns false, there are no elements left. It's possible for `next()` to return false on the first call if the array is empty.

There is no rewind function to go back to the beginning. To start over, construct a new `JSONArrayIterator` from the `JSONValue` again.

#### JSONArrayIterator::value()

```cpp
// PROTOTYPE
JSONValue value() const;
```

Returns the current value in the array. 

You will typically use methods of `JSONValue` like `toInt()`, `toBool()`, `toDouble()`, and `toString()` to get useful values. For example:

- `iter.value().toInt()`: Returns a signed 32-bit int.
- `iter.value().toDouble()`: Returns a 64-bit double.
- `iter.value().toString().data()`: Returns a `const char *`. You can assign this to a `String` to copy the value, if desired.

#### JSONArrayIterator::count()
```cpp
// PROTOTYPE
size_t count() const;
```

Returns the count of the number of remaining values. As you call `next()` this value will decrease.


## Logging

{{since when="0.6.0"}}

This library provides various classes for logging.

```cpp
// EXAMPLE

// Use primary serial over USB interface for logging output
SerialLogHandler logHandler;

void setup() {
    // Log some messages with different logging levels
    Log.info("This is info message");
    Log.warn("This is warning message");
    Log.error("This is error message, error=%d", errCode);

    // Format text message
    Log.info("System version: %s", (const char*)System.version());
}

void loop() {
}
```

At higher level, the logging framework consists of two parts represented by their respective classes: [loggers](#logger-class) and [log handlers](#log-handlers). Most of the logging operations, such as generating a log message, are done through logger instances, while log handlers act as _sinks_ for the overall logging output generated by the system and application modules.

The library provides default logger instance named `Log`, which can be used for all typical logging operations. Note that applications still need to instantiate at least one log handler in order to enable logging, otherwise most of the logging operations will have no effect. In the provided example, the application uses `SerialLogHandler` which sends the logging output to the primary serial over USB interface.

Consider the following logging output as generated by the example application:

`0000000047 [app] INFO: This is info message`  
`0000000050 [app] WARN: This is warning message`  
`0000000100 [app] ERROR: This is error message, error=123`  
`0000000149 [app] INFO: System version: 0.6.0`

Here, each line starts with a timestamp (a number of milliseconds since the system startup), `app` is a default [logging category](#logging-categories), and `INFO`, `WARN` and `ERROR` are [logging levels](#logging-levels) of the respective log messages.

All of the logging functions like `Log.info()` and `Log.error()` support sprintf-style argument formatting so you can use options like `%d` (integer), `%.2f` (2 decimal place floating point), or `%s` (c-string). 

Sprintf-style formatting does not support 64-bit integers, such as `%lld`, `%llu` or Microsoft-style `%I64d` or `%I64u`. As a workaround you can use the `Print64` firmware library in the community libraries. The source and instructions can be found [in Github](https://github.com/rickkas7/Print64/).

```cpp
// Using the Print64 firmware library to format a 64-bit integer (uint64_t)
Log.info("millis=%s", toString(System.millis()).c_str());
```

### Logging Levels

Every log message is always associated with some logging level that describes _severity_ of the message. Supported logging levels are defined by the `LogLevel` enum (from lowest to highest level):

  * `LOG_LEVEL_ALL` : special value that can be used to enable logging of all messages
  * `LOG_LEVEL_TRACE` : verbose output for debugging purposes
  * `LOG_LEVEL_INFO` : regular information messages
  * `LOG_LEVEL_WARN` : warnings and non-critical errors
  * `LOG_LEVEL_ERROR` : error messages
  * `LOG_LEVEL_NONE` : special value that can be used to disable logging of any messages

```cpp
// EXAMPLE - message logging

Log.trace("This is trace message");
Log.info("This is info message");
Log.warn("This is warning message");
Log.error("This is error message");

// Specify logging level directly
Log(LOG_LEVEL_INFO, "This is info message");

// Log message with the default logging level (LOG_LEVEL_INFO)
Log("This is info message");
```

For convenience, [Logger class](#logger-class) (and its default `Log` instance) provides separate logging method for each of the defined logging levels.

These messages are limited to 200 characters and are truncated if longer. 

If you want to use write longer data, you can use `Log.print(str)` which takes a pointer to a null-terminated c-string. Note that the output does not include the timestamp, category, and level, so you may want to preceed it with `Log.info()`, etc. but is not length-limited. You cannot use printf-style formating with `Log.print()`.

You can also print data in hexadecimal using `Log.dump(ptr, len)` to print a buffer in hex as specified by pointer and length. It also does not include the timestamp, category, and level.

Log handlers can be configured to filter out messages that are below a certain logging level. By default, any messages below the `LOG_LEVEL_INFO` level are filtered out.


```cpp
// EXAMPLE - basic filtering

// Log handler processing only warning and error messages
SerialLogHandler logHandler(LOG_LEVEL_WARN);

void setup() {
    Log.trace("This is trace message"); // Ignored by the handler
    Log.info("This is info message"); // Ignored by the handler
    Log.warn("This is warning message");
    Log.error("This is error message");
}

void loop() {
}
```

In the provided example, the trace and info messages will be filtered out according to the log handler settings, which prevent log messages below the `LOG_LEVEL_WARN` level from being logged:

`0000000050 [app] WARN: This is warning message`  
`0000000100 [app] ERROR: This is error message`

### Logging Categories

In addition to logging level, log messages can also be associated with some _category_ name. Categories allow to organize system and application modules into namespaces, and are used for more selective filtering of the logging output.

One of the typical use cases for category filtering is suppressing of non-critical system messages while preserving application messages at lower logging levels. In the provided example, a message that is not associated with the `app` category will be logged only if its logging level is at or above the warning level (`LOG_LEVEL_WARN`).

```cpp
// EXAMPLE - filtering out system messages

SerialLogHandler logHandler(LOG_LEVEL_WARN, { // Logging level for non-application messages
    { "app", LOG_LEVEL_ALL } // Logging level for application messages
});
```

Default `Log` logger uses `app` category for all messages generated via its logging methods. In order to log messages with different category name it is necessary to instantiate another logger, passing category name to its constructor.

```cpp
// EXAMPLE - using custom loggers

void connect() {
    Logger log("app.network");
    log.trace("Connecting to server"); // Using local logger
}

SerialLogHandler logHandler(LOG_LEVEL_WARN, { // Logging level for non-application messages
    { "app", LOG_LEVEL_INFO }, // Default logging level for all application messages
    { "app.network", LOG_LEVEL_TRACE } // Logging level for networking messages
});

void setup() {
    Log.info("System started"); // Using default logger instance
    Log.trace("My device ID: %s", (const char*)System.deviceID());
    connect();
}

void loop() {
}
```

Category names are written in all lower case and may contain arbitrary number of _subcategories_ separated by period character. In order to not interfere with the system logging, it is recommended to always add `app` prefix to all application-specific category names.

The example application generates the following logging output:

`0000000044 [app] INFO: System started`  
`0000000044 [app.network] TRACE: Connecting to server`

Note that the trace message containing device ID has been filtered out according to the log handler settings, which prevent log messages with the `app` category from being logged if their logging level is below the `LOG_LEVEL_INFO` level.

Category filters are specified using _initializer list_ syntax with each element of the list containing a filter string and a minimum logging level required for messages with matching category to be logged. Note that filter string matches not only exact category name but any of its subcategory names as well, for example:

  * `a` – matches `a`, `a.b`, `a.b.c` but not `aaa` or `aaa.b`
  * `b.c` – matches `b.c`, `b.c.d` but not `a.b.c` or `b.ccc`

If more than one filter matches a given category name, the most specific filter is used.

### Additional Attributes

As described in previous sections, certain log message attributes, such as a timestamp, are automatically added to all generated messages. The library also defines some attributes that can be used for application-specific needs:

  * `code` : arbitrary integer value (e.g. error code)
  * `details` : description string (e.g. error message)

```cpp
// EXAMPLE - specifying additional attributes

SerialLogHandler logHandler;

int connect() {
    return ECONNREFUSED; // Return an error
}

void setup() {
    Log.info("Connecting to server");
    int error = connect();
    if (error) {
        // Get error message string
        const char *message = strerror(error);
        // Log message with additional attributes
        Log.code(error).details(message).error("Connection error");
    }
}

void loop() {
}
```

The example application specifies `code` and `details` attributes for the error message, generating the following logging output:

`0000000084 [app] INFO: Connecting to server`  
`0000000087 [app] ERROR: Connection error [code = 111, details = Connection refused]`

### Log Handlers

In order to enable logging, application needs to instantiate at least one log handler. If necessary, several different log handlers can be instantiated at the same time.

```cpp
// EXAMPLE - enabling multiple log handlers

SerialLogHandler logHandler1;
Serial1LogHandler logHandler2(57600); // Baud rate

void setup() {
    Log.info("This is info message"); // Processed by all handlers
}

void loop() {
}
```

The library provides the following log handlers:

- `SerialLogHandler`
- Additional community-supported log handlers can be found further below.

This handler uses primary serial over USB interface for the logging output ([Serial](#serial)).

`SerialLogHandler(LogLevel level, const Filters &filters)`

Parameters:

  * level : default logging level (default value is `LOG_LEVEL_INFO`)
  * filters : category filters (not specified by default)

`Serial1LogHandler`

This handler uses the device's TX and RX pins for the logging output ([Serial1](#serial)).

`Serial1LogHandler(LogLevel level, const Filters &filters)`  
`Serial1LogHandler(int baud, LogLevel level, const Filters &filters)`

Parameters:

  * level : default logging level (default value is `LOG_LEVEL_INFO`)
  * filters : category filters (not specified by default)
  * baud : baud rate (default value is 9600)

#### Community Log Handlers

The log handlers below are written by the community and are not considered "Official" Particle-supported log handlers. If you have any issues with them please raise an issue in the forums or, ideally, in the online repo for the handler.

- [Papertrail](https://papertrailapp.com/) Log Handler by [barakwei](https://community.particle.io/users/barakwei/activity). [[Particle Web IDE](https://build.particle.io/libs/585c5e64edfd74acf7000e7a/)] [[GitHub Repo](https://github.com/barakwei/ParticlePapertrail)] [[Known Issues](https://github.com/barakwei/ParticlePapertrail/issues/)]
- Web Log Handler by [geeksville](https://github.com/geeksville). [[Particle Web IDE](https://build.particle.io/libs/ParticleWebLog)] [[GitHub Repo](https://github.com/geeksville/ParticleWebLog)] [[Known Issues](https://github.com/geeksville/ParticleWebLog/issues/)]
- More to come (feel free to add your own by editing the docs on GitHub)

### Logger Class

This class is used to generate log messages. The library also provides default instance of this class named `Log`, which can be used for all typical logging operations.

`Logger()`  
`Logger(const char *name)`

```cpp
// EXAMPLE
Logger myLogger("app.main");
```

Construct logger.

Parameters:

  * name : category name (default value is `app`)

`const char* name()`

```cpp
// EXAMPLE
const char *name = Log.name(); // Returns "app"
```

Returns category name set for this logger.

`void trace(const char *format, ...)`  
`void info(const char *format, ...)`  
`void warn(const char *format, ...)`  
`void error(const char *format, ...)`

```cpp
// EXAMPLE
Log.trace("This is trace message");
Log.info("This is info message");
Log.warn("This is warn message");
Log.error("This is error message");

// Format text message
Log.info("The secret of everything is %d", 42);
```

Generate trace, info, warning or error message respectively.

Parameters:

  * format : format string

`void log(const char *format, ...)`  
`void operator()(const char *format, ...)`

```cpp
// EXAMPLE
Log("The secret of everything is %d", 42); // Generates info message
```

Generates log message with the default logging level (`LOG_LEVEL_INFO`).

Parameters:

  * format : format string

`void log(LogLevel level, const char *format, ...)`  
`void operator()(LogLevel level, const char *format, ...)`

```cpp
// EXAMPLE
Log(LOG_LEVEL_INFO, "The secret of everything is %d", 42);
```

Generates log message with the specified logging level.

Parameters:

  * format : format string
  * level : logging level (default value is `LOG_LEVEL_INFO`)

`bool isTraceEnabled()`  
`bool isInfoEnabled()`  
`bool isWarnEnabled()`  
`bool isErrorEnabled()`

```cpp
// EXAMPLE
if (Log.isTraceEnabled()) {
    // Do some heavy logging
}
```

Return `true` if logging is enabled for trace, info, warning or error messages respectively.

`bool isLevelEnabled(LogLevel level)`

```cpp
// EXAMPLE
if (Log.isLevelEnabled(LOG_LEVEL_TRACE)) {
    // Do some heavy logging
}
```

Returns `true` if logging is enabled for the specified logging level.

Parameters:

  * level : logging level

## Global Object Constructors

It can be convenient to use C++ objects as global variables. You must be careful about what you do in the constructor, however.

The first code example is the bad example, don't do this.

```cpp
#include "Particle.h"

SerialLogHandler logHandler;

class MyClass {
public:
	MyClass();
	virtual ~MyClass();

	void subscriptionHandler(const char *eventName, const char *data);
};

MyClass::MyClass() {
	// This is generally a bad idea. You should avoid doing this from a constructor.
	Particle.subscribe("myEvent", &MyClass::subscriptionHandler, this);
}

MyClass::~MyClass() {

}

void MyClass::subscriptionHandler(const char *eventName, const char *data) {
	Log.info("eventName=%s data=%s", eventName, data);
}

// In this example, MyClass is a globally constructed object.
MyClass myClass;

void setup() {

}
void loop() {

}

```

Making `MyClass myClass` a global variable is fine, and is a useful technique. However, it contains a `Particle.subscribe` call in the constructor. This may fail, or crash the device. You should avoid in a global constructor:

- All functions in the Particle class (Particle.subscribe, Particle.variable, etc.)
- Creation of threads
- Hardware initialization including I2C and SPI
- Calls to `delay()`
- Any class that depends on another globally initialized class instance

The reason is that the order that the compiler initializes global objects varies, and is not predictable. Thus sometimes it may work, but then later it may decide to reorder initialization  and may fail.

---

One solution is to use two-phase setup. Instead of putting the setup code in the constructor, you put it in a setup() method of your class and call the setup() method from the actual setup(). This is the recommended method.

```cpp
#include "Particle.h"

SerialLogHandler logHandler;

class MyClass {
public:
	MyClass();
	virtual ~MyClass();

	void setup();

	void subscriptionHandler(const char *eventName, const char *data);
};

MyClass::MyClass() {
}

MyClass::~MyClass() {
}

void MyClass::setup() {
	Particle.subscribe("myEvent", &MyClass::subscriptionHandler, this);
}

void MyClass::subscriptionHandler(const char *eventName, const char *data) {
	Log.info("eventName=%s data=%s", eventName, data);
}

// In this example, MyClass is a globally constructed object.
MyClass myClass;

void setup() {
	myClass.setup();
}

void loop() {

}
```

---

Another option is to allocate the class member using `new` instead.

```cpp
#include "Particle.h"

SerialLogHandler logHandler;

class MyClass {
public:
	MyClass();
	virtual ~MyClass();

	void subscriptionHandler(const char *eventName, const char *data);
};

MyClass::MyClass() {
	// This is OK as long as MyClass is allocated with new from setup
	Particle.subscribe("myEvent", &MyClass::subscriptionHandler, this);
}

MyClass::~MyClass() {

}

void MyClass::subscriptionHandler(const char *eventName, const char *data) {
	Log.info("eventName=%s data=%s", eventName, data);
}

// In this example, MyClass is allocated in setup() using new, and is safe because
// the constructor is called during setup() time.
MyClass *myClass;

void setup() {
	myClass = new MyClass();
}

void loop() {

}

```


## Language Syntax

Particle devices are programmed in C/C++. While the Arduino compatibility features are available as described below, you can also write programs in plain C or C++, specifically:

| Device OS Version | C++ (.cpp and .ino) | C (.c) |
| --- | :--: | :---: |
| 1.2.1 and later | gcc C++14 | gcc C11 |
| earlier versions | gcc C++11 | gcc C11 |

The following documentation is based on the Arduino reference which can be found [here.](http://www.arduino.cc/en/Reference/HomePage)

### Structure

#### setup()
The setup() function is called when an application starts. Use it to initialize variables, pin modes, start using libraries, etc. The setup function will only run once, after each powerup or device reset.

```cpp
// EXAMPLE USAGE

int button = D0;
int LED = D1;
//setup initializes D0 as input and D1 as output
void setup()
{
  pinMode(button, INPUT_PULLDOWN);
  pinMode(LED, OUTPUT);
}

void loop()
{
  // ...
}
```

#### loop()
After creating a setup() function, which initializes and sets the initial values, the loop() function does precisely what its name suggests, and loops consecutively, allowing your program to change and respond. Use it to actively control the device.  A return may be used to exit the loop() before it completely finishes.

```cpp
// EXAMPLE USAGE

int button = D0;
int LED = D1;
//setup initializes D0 as input and D1 as output
void setup()
{
  pinMode(button, INPUT_PULLDOWN);
  pinMode(LED, OUTPUT);
}

//loops to check if button was pressed,
//if it was, then it turns ON the LED,
//else the LED remains OFF
void loop()
{
  if (digitalRead(button) == HIGH)
    digitalWrite(LED,HIGH);
  else
    digitalWrite(LED,LOW);
}
```

### Control structures

#### if

`if`, which is used in conjunction with a comparison operator, tests whether a certain condition has been reached, such as an input being above a certain number.

```cpp
// SYNTAX
if (someVariable > 50)
{
  // do something here
}
```
The program tests to see if someVariable is greater than 50. If it is, the program takes a particular action. Put another way, if the statement in parentheses is true, the statements inside the brackets are run. If not, the program skips over the code.

The brackets may be omitted after an *if* statement. If this is done, the next line (defined by the semicolon) becomes the only conditional statement.

```cpp
if (x > 120) digitalWrite(LEDpin, HIGH);

if (x > 120)
digitalWrite(LEDpin, HIGH);

if (x > 120){ digitalWrite(LEDpin, HIGH); }

if (x > 120)
{
  digitalWrite(LEDpin1, HIGH);
  digitalWrite(LEDpin2, HIGH);
}                                 // all are correct
```
The statements being evaluated inside the parentheses require the use of one or more operators:

#### Comparison Operators

```cpp
x == y (x is equal to y)
x != y (x is not equal to y)
x <  y (x is less than y)
x >  y (x is greater than y)
x <= y (x is less than or equal to y)
x >= y (x is greater than or equal to y)
```

**WARNING:**
Beware of accidentally using the single equal sign (e.g. `if (x = 10)` ). The single equal sign is the assignment operator, and sets x to 10 (puts the value 10 into the variable x). Instead use the double equal sign (e.g. `if (x == 10)` ), which is the comparison operator, and tests whether x is equal to 10 or not. The latter statement is only true if x equals 10, but the former statement will always be true.

This is because C evaluates the statement `if (x=10)` as follows: 10 is assigned to x (remember that the single equal sign is the assignment operator), so x now contains 10. Then the 'if' conditional evaluates 10, which always evaluates to TRUE, since any non-zero number evaluates to TRUE. Consequently, `if (x = 10)` will always evaluate to TRUE, which is not the desired result when using an 'if' statement. Additionally, the variable x will be set to 10, which is also not a desired action.

`if` can also be part of a branching control structure using the `if...else`] construction.

#### if...else

*if/else* allows greater control over the flow of code than the basic *if* statement, by allowing multiple tests to be grouped together. For example, an analog input could be tested and one action taken if the input was less than 500, and another action taken if the input was 500 or greater. The code would look like this:

```cpp
// SYNTAX
if (pinFiveInput < 500)
{
  // action A
}
else
{
  // action B
}
```
`else` can proceed another `if` test, so that multiple, mutually exclusive tests can be run at the same time.

Each test will proceed to the next one until a true test is encountered. When a true test is found, its associated block of code is run, and the program then skips to the line following the entire if/else construction. If no test proves to be true, the default else block is executed, if one is present, and sets the default behavior.

Note that an *else if* block may be used with or without a terminating *else* block and vice versa. An unlimited number of such else if branches is allowed.

```cpp
if (pinFiveInput < 500)
{
  // do Thing A
}
else if (pinFiveInput >= 1000)
{
  // do Thing B
}
else
{
  // do Thing C
}
```

Another way to express branching, mutually exclusive tests, is with the [`switch case`](#switch-case) statement.

#### for

The `for` statement is used to repeat a block of statements enclosed in curly braces. An increment counter is usually used to increment and terminate the loop. The `for` statement is useful for any repetitive operation, and is often used in combination with arrays to operate on collections of data/pins.

There are three parts to the for loop header:

```cpp
// SYNTAX
for (initialization; condition; increment)
{
  //statement(s);
}
```
The *initialization* happens first and exactly once. Each time through the loop, the *condition* is tested; if it's true, the statement block, and the *increment* is executed, then the condition is tested again. When the *condition* becomes false, the loop ends.

```cpp
// EXAMPLE USAGE

// slowy make the LED glow brighter
int ledPin = D1; // LED in series with 470 ohm resistor on pin D1

void setup()
{
  // set ledPin as an output
  pinMode(ledPin,OUTPUT);
}

void loop()
{
  for (int i=0; i <= 255; i++){
    analogWrite(ledPin, i);
    delay(10);
  }
}
```
The C `for` loop is much more flexible than for loops found in some other computer languages, including BASIC. Any or all of the three header elements may be omitted, although the semicolons are required. Also the statements for initialization, condition, and increment can be any valid C statements with unrelated variables, and use any C datatypes including floats. These types of unusual for statements may provide solutions to some rare programming problems.

For example, using a multiplication in the increment line will generate a logarithmic progression:

```cpp
for(int x = 2; x < 100; x = x * 1.5)
{
  Serial.print(x);
}
//Generates: 2,3,4,6,9,13,19,28,42,63,94
```
Another example, fade an LED up and down with one for loop:

```cpp
// slowy make the LED glow brighter
int ledPin = D1; // LED in series with 470 ohm resistor on pin D1

void setup()
{
  // set ledPin as an output
  pinMode(ledPin,OUTPUT);
}

void loop()
{
  int x = 1;
  for (int i = 0; i > -1; i = i + x)
  {
    analogWrite(ledPin, i);
    if (i == 255) x = -1;     // switch direction at peak
    delay(10);
  }
}
```

#### switch case

Like `if` statements, `switch`...`case` controls the flow of programs by allowing programmers to specify different code that should be executed in various conditions. In particular, a switch statement compares the value of a variable to the values specified in case statements. When a case statement is found whose value matches that of the variable, the code in that case statement is run.

The `break` keyword exits the switch statement, and is typically used at the end of each case. Without a break statement, the switch statement will continue executing the following expressions ("falling-through") until a break, or the end of the switch statement is reached.

```cpp
// SYNTAX
switch (var)
{
  case label:
    // statements
    break;
  case label:
    // statements
    break;
  default:
    // statements
}
```
`var` is the variable whose value to compare to the various cases
`label` is a value to compare the variable to

```cpp
// EXAMPLE USAGE

switch (var)
{
  case 1:
    // do something when var equals 1
    break;
  case 2:
    // do something when var equals 2
    break;
  default:
    // if nothing else matches, do the
    // default (which is optional)
}
```

#### while

`while` loops will loop continuously, and infinitely, until the expression inside the parenthesis, () becomes false. Something must change the tested variable, or the `while` loop will never exit. This could be in your code, such as an incremented variable, or an external condition, such as testing a sensor.

```cpp
// SYNTAX
while(expression)
{
  // statement(s)
}
```
`expression` is a (boolean) C statement that evaluates to true or false.

```cpp
// EXAMPLE USAGE

var = 0;
while(var < 200)
{
  // do something repetitive 200 times
  var++;
}
```

#### do... while

The `do` loop works in the same manner as the `while` loop, with the exception that the condition is tested at the end of the loop, so the do loop will *always* run at least once.

```cpp
// SYNTAX
do
{
  // statement block
} while (test condition);
```

```cpp
// EXAMPLE USAGE

do
{
  delay(50);          // wait for sensors to stabilize
  x = readSensors();  // check the sensors

} while (x < 100);
```

#### break

`break` is used to exit from a `do`, `for`, or `while` loop, bypassing the normal loop condition. It is also used to exit from a `switch` statement.

```cpp
// EXAMPLE USAGE

for (int x = 0; x < 255; x++)
{
  digitalWrite(ledPin, x);
  sens = analogRead(sensorPin);
  if (sens > threshold)
  {
    x = 0;
    break;  // exit for() loop on sensor detect
  }
  delay(50);
}
```

#### continue

The continue statement skips the rest of the current iteration of a loop (`do`, `for`, or `while`). It continues by checking the conditional expression of the loop, and proceeding with any subsequent iterations.

```cpp
// EXAMPLE USAGE

for (x = 0; x < 255; x++)
{
    if (x > 40 && x < 120) continue;  // create jump in values

    digitalWrite(PWMpin, x);
    delay(50);
}
```

#### return

Terminate a function and return a value from a function to the calling function, if desired.

```cpp
//EXAMPLE USAGE

// A function to compare a sensor input to a threshold
 int checkSensor()
 {
    if (analogRead(0) > 400) return 1;
    else return 0;
}
```
The return keyword is handy to test a section of code without having to "comment out" large sections of possibly buggy code.

```cpp
void loop()
{
  // brilliant code idea to test here

  return;

  // the rest of a dysfunctional sketch here
  // this code will never be executed
}
```

#### goto

Transfers program flow to a labeled point in the program

```cpp
// SYNTAX

label:

goto label; // sends program flow to the label

```

**TIP:**
The use of `goto` is discouraged in C programming, and some authors of C programming books claim that the `goto` statement is never necessary, but used judiciously, it can simplify certain programs. The reason that many programmers frown upon the use of `goto` is that with the unrestrained use of `goto` statements, it is easy to create a program with undefined program flow, which can never be debugged.

With that said, there are instances where a `goto` statement can come in handy, and simplify coding. One of these situations is to break out of deeply nested `for` loops, or `if` logic blocks, on a certain condition.

```cpp
// EXAMPLE USAGE

for(byte r = 0; r < 255; r++) {
  for(byte g = 255; g > -1; g--) {
    for(byte b = 0; b < 255; b++) {
      if (analogRead(0) > 250) {
        goto bailout;
      }
      // more statements ...
    }
  }
}
bailout:
// Code execution jumps here from
// goto bailout; statement
```

### Further syntax

#### ; (semicolon)

Used to end a statement.

`int a = 13;`

**Tip:**
Forgetting to end a line in a semicolon will result in a compiler error. The error text may be obvious, and refer to a missing semicolon, or it may not. If an impenetrable or seemingly illogical compiler error comes up, one of the first things to check is a missing semicolon, in the immediate vicinity, preceding the line at which the compiler complained.

#### {} (curly braces)

Curly braces (also referred to as just "braces" or as "curly brackets") are a major part of the C programming language. They are used in several different constructs, outlined below, and this can sometimes be confusing for beginners.

```cpp
//The main uses of curly braces

//Functions
  void myfunction(datatype argument){
    statements(s)
  }

//Loops
  while (boolean expression)
  {
     statement(s)
  }

  do
  {
     statement(s)
  } while (boolean expression);

  for (initialisation; termination condition; incrementing expr)
  {
     statement(s)
  }

//Conditional statements
  if (boolean expression)
  {
     statement(s)
  }

  else if (boolean expression)
  {
     statement(s)
  }
  else
  {
     statement(s)
  }

```

An opening curly brace "{" must always be followed by a closing curly brace "}". This is a condition that is often referred to as the braces being balanced.

Beginning programmers, and programmers coming to C from the BASIC language often find using braces confusing or daunting. After all, the same curly braces replace the RETURN statement in a subroutine (function), the ENDIF statement in a conditional and the NEXT statement in a FOR loop.

Because the use of the curly brace is so varied, it is good programming practice to type the closing brace immediately after typing the opening brace when inserting a construct which requires curly braces. Then insert some carriage returns between your braces and begin inserting statements. Your braces, and your attitude, will never become unbalanced.

Unbalanced braces can often lead to cryptic, impenetrable compiler errors that can sometimes be hard to track down in a large program. Because of their varied usages, braces are also incredibly important to the syntax of a program and moving a brace one or two lines will often dramatically affect the meaning of a program.


#### // (single line comment)
#### /\* \*/ (multi-line comment)

Comments are lines in the program that are used to inform yourself or others about the way the program works. They are ignored by the compiler, and not exported to the processor, so they don't take up any space on the device.

Comments only purpose are to help you understand (or remember) how your program works or to inform others how your program works. There are two different ways of marking a line as a comment:

```cpp
// EXAMPLE USAGE

x = 5;  // This is a single line comment. Anything after the slashes is a comment
        // to the end of the line

/* this is multiline comment - use it to comment out whole blocks of code

if (gwb == 0) {   // single line comment is OK inside a multiline comment
  x = 3;          /* but not another multiline comment - this is invalid */
}
// don't forget the "closing" comment - they have to be balanced!
*/
```

**TIP:**
When experimenting with code, "commenting out" parts of your program is a convenient way to remove lines that may be buggy. This leaves the lines in the code, but turns them into comments, so the compiler just ignores them. This can be especially useful when trying to locate a problem, or when a program refuses to compile and the compiler error is cryptic or unhelpful.


#### #define

`#define` is a useful C component that allows the programmer to give a name to a constant value before the program is compiled. Defined constants don't take up any program memory space on the chip. The compiler will replace references to these constants with the defined value at compile time.

`#define constantName value`

Note that the # is necessary.

This can have some unwanted side effects if the constant name in a `#define` is used in some other constant or variable name. In that case the text would be replaced by the `#define` value.

```cpp
// EXAMPLE USAGE

#define ledPin 3
// The compiler will replace any mention of ledPin with the value 3 at compile time.
```

In general, the `const` keyword is preferred for defining constants and should be used instead of #define.

**TIP:**
There is no semicolon after the #define statement. If you include one, the compiler will throw cryptic errors further down the page.

`#define ledPin 3;   // this is an error`

Similarly, including an equal sign after the #define statement will also generate a cryptic compiler error further down the page.

`#define ledPin = 3  // this is also an error`

#### #include

`#include` is used to include outside libraries in your application code. This gives the programmer access to a large group of standard C libraries (groups of pre-made functions), and also libraries written especially for your device.

Note that #include, similar to #define, has no semicolon terminator, and the compiler will yield cryptic error messages if you add one.

### Arithmetic operators

#### = (assignment operator)

Stores the value to the right of the equal sign in the variable to the left of the equal sign.

The single equal sign in the C programming language is called the assignment operator. It has a different meaning than in algebra class where it indicated an equation or equality. The assignment operator tells the microcontroller to evaluate whatever value or expression is on the right side of the equal sign, and store it in the variable to the left of the equal sign.

```cpp
// EXAMPLE USAGE

int sensVal;                // declare an integer variable named sensVal
senVal = analogRead(A0);    // store the (digitized) input voltage at analog pin A0 in SensVal
```
**TIP:**
The variable on the left side of the assignment operator ( = sign ) needs to be able to hold the value stored in it. If it is not large enough to hold a value, the value stored in the variable will be incorrect.

Don't confuse the assignment operator `=` (single equal sign) with the comparison operator `==` (double equal signs), which evaluates whether two expressions are equal.

#### + - * / (addition subtraction multiplication division)

These operators return the sum, difference, product, or quotient (respectively) of the two operands. The operation is conducted using the data type of the operands, so, for example,`9 / 4` gives 2 since 9 and 4 are ints. This also means that the operation can overflow if the result is larger than that which can be stored in the data type (e.g. adding 1 to an int with the value 2,147,483,647 gives -2,147,483,648). If the operands are of different types, the "larger" type is used for the calculation.

If one of the numbers (operands) are of the type float or of type double, floating point math will be used for the calculation.

```cpp
// EXAMPLE USAGES

y = y + 3;
x = x - 7;
i = j * 6;
r = r / 5;
```

```cpp
// SYNTAX
result = value1 + value2;
result = value1 - value2;
result = value1 * value2;
result = value1 / value2;
```
`value1` and `value2` can be any variable or constant.

**TIPS:**

  - Know that integer constants default to int, so some constant calculations may overflow (e.g. 50 * 50,000,000 will yield a negative result).
  - Choose variable sizes that are large enough to hold the largest results from your calculations
  - Know at what point your variable will "roll over" and also what happens in the other direction e.g. (0 - 1) OR (0 + 2147483648)
  - For math that requires fractions, use float variables, but be aware of their drawbacks: large size, slow computation speeds
  - Use the cast operator e.g. (int)myFloat to convert one variable type to another on the fly.

#### % (modulo)

Calculates the remainder when one integer is divided by another. It is useful for keeping a variable within a particular range (e.g. the size of an array).  It is defined so that `a % b == a - ((a / b) * b)`.

`result = dividend % divisor`

`dividend` is the number to be divided and
`divisor` is the number to divide by.

`result` is the remainder

The remainder function can have unexpected behavior when some of the operands are negative.  If the dividend is negative, then the result will be the smallest negative equivalency class.  In other words, when `a` is negative, `(a % b) == (a mod b) - b` where (a mod b) follows the standard mathematical definition of mod.  When the divisor is negative, the result is the same as it would be if it was positive.

```cpp
// EXAMPLE USAGES

x = 9 % 5;   // x now contains 4
x = 5 % 5;   // x now contains 0
x = 4 % 5;   // x now contains 4
x = 7 % 5;   // x now contains 2
x = -7 % 5;  // x now contains -2
x = 7 % -5;  // x now contains 2
x = -7 % -5; // x now contains -2
```

```cpp
EXAMPLE CODE
//update one value in an array each time through a loop

int values[10];
int i = 0;

void setup() {}

void loop()
{
  values[i] = analogRead(A0);
  i = (i + 1) % 10;   // modulo operator rolls over variable
}
```

**TIP:**
The modulo operator does not work on floats.  For floats, an equivalent expression to `a % b` is `a - (b * ((int)(a / b)))`

### Boolean operators

These can be used inside the condition of an if statement.

#### && (and)

True only if both operands are true, e.g.

```cpp
if (digitalRead(D2) == HIGH  && digitalRead(D3) == HIGH)
{
  // read two switches
  // ...
}
//is true only if both inputs are high.
```

#### || (or)

True if either operand is true, e.g.

```cpp
if (x > 0 || y > 0)
{
  // ...
}
//is true if either x or y is greater than 0.
```

#### ! (not)

True if the operand is false, e.g.

```cpp
if (!x)
{
  // ...
}
//is true if x is false (i.e. if x equals 0).
```

**WARNING:**
Make sure you don't mistake the boolean AND operator, && (double ampersand) for the bitwise AND operator & (single ampersand). They are entirely different beasts.

Similarly, do not confuse the boolean || (double pipe) operator with the bitwise OR operator | (single pipe).

The bitwise not ~ (tilde) looks much different than the boolean not ! (exclamation point or "bang" as the programmers say) but you still have to be sure which one you want where.

`if (a >= 10 && a <= 20){}   // true if a is between 10 and 20`

### Bitwise operators

#### & (bitwise and)

The bitwise AND operator in C++ is a single ampersand, &, used between two other integer expressions. Bitwise AND operates on each bit position of the surrounding expressions independently, according to this rule: if both input bits are 1, the resulting output is 1, otherwise the output is 0. Another way of expressing this is:

```
    0  0  1  1    operand1
    0  1  0  1    operand2
    ----------
    0  0  0  1    (operand1 & operand2) - returned result
```

```cpp
// EXAMPLE USAGE

int a =  92;    // in binary: 0000000001011100
int b = 101;    // in binary: 0000000001100101
int c = a & b;  // result:    0000000001000100, or 68 in decimal.
```
One of the most common uses of bitwise AND is to select a particular bit (or bits) from an integer value, often called masking.

#### | (bitwise or)

The bitwise OR operator in C++ is the vertical bar symbol, |. Like the & operator, | operates independently each bit in its two surrounding integer expressions, but what it does is different (of course). The bitwise OR of two bits is 1 if either or both of the input bits is 1, otherwise it is 0. In other words:

```
    0  0  1  1    operand1
    0  1  0  1    operand2
    ----------
    0  1  1  1    (operand1 | operand2) - returned result
```
```cpp
// EXAMPLE USAGE

int a =  92;    // in binary: 0000000001011100
int b = 101;    // in binary: 0000000001100101
int c = a | b;  // result:    0000000001111101, or 125 in decimal.
```

#### ^ (bitwise xor)

There is a somewhat unusual operator in C++ called bitwise EXCLUSIVE OR, also known as bitwise XOR. (In English this is usually pronounced "eks-or".) The bitwise XOR operator is written using the caret symbol ^. This operator is very similar to the bitwise OR operator |, only it evaluates to 0 for a given bit position when both of the input bits for that position are 1:

```
    0  0  1  1    operand1
    0  1  0  1    operand2
    ----------
    0  1  1  0    (operand1 ^ operand2) - returned result
```
Another way to look at bitwise XOR is that each bit in the result is a 1 if the input bits are different, or 0 if they are the same.

```cpp
// EXAMPLE USAGE

int x = 12;     // binary: 1100
int y = 10;     // binary: 1010
int z = x ^ y;  // binary: 0110, or decimal 6
```

The ^ operator is often used to toggle (i.e. change from 0 to 1, or 1 to 0) some of the bits in an integer expression. In a bitwise OR operation if there is a 1 in the mask bit, that bit is inverted; if there is a 0, the bit is not inverted and stays the same.


#### ~ (bitwise not)

The bitwise NOT operator in C++ is the tilde character ~. Unlike & and |, the bitwise NOT operator is applied to a single operand to its right. Bitwise NOT changes each bit to its opposite: 0 becomes 1, and 1 becomes 0. For example:

```
    0  1    operand1
   ----------
    1  0   ~ operand1

int a = 103;    // binary:  0000000001100111
int b = ~a;     // binary:  1111111110011000 = -104
```
You might be surprised to see a negative number like -104 as the result of this operation. This is because the highest bit in an int variable is the so-called sign bit. If the highest bit is 1, the number is interpreted as negative. This encoding of positive and negative numbers is referred to as two's complement. For more information, see the Wikipedia article on [two's complement.](http://en.wikipedia.org/wiki/Twos_complement)

As an aside, it is interesting to note that for any integer x, ~x is the same as -x-1.

At times, the sign bit in a signed integer expression can cause some unwanted surprises.

#### << (bitwise left shift), >> (bitwise right shift)

There are two bit shift operators in C++: the left shift operator << and the right shift operator >>. These operators cause the bits in the left operand to be shifted left or right by the number of positions specified by the right operand.

More on bitwise math may be found [here.](http://playground.arduino.cc/Code/BitMath)

```
variable << number_of_bits
variable >> number_of_bits
```

`variable` can be `byte`, `int`, `long`
`number_of_bits` and integer <= 32

```cpp
// EXAMPLE USAGE

int a = 5;        // binary: 0000000000000101
int b = a << 3;   // binary: 0000000000101000, or 40 in decimal
int c = b >> 3;   // binary: 0000000000000101, or back to 5 like we started with
```
When you shift a value x by y bits (x << y), the leftmost y bits in x are lost, literally shifted out of existence:

```cpp
int a = 5;        // binary: 0000000000000101
int b = a << 14;  // binary: 0100000000000000 - the first 1 in 101 was discarded
```
If you are certain that none of the ones in a value are being shifted into oblivion, a simple way to think of the left-shift operator is that it multiplies the left operand by 2 raised to the right operand power. For example, to generate powers of 2, the following expressions can be employed:

```
1 <<  0  ==    1
1 <<  1  ==    2
1 <<  2  ==    4
1 <<  3  ==    8
...
1 <<  8  ==  256
1 <<  9  ==  512
1 << 10  == 1024
...
```
When you shift x right by y bits (x >> y), and the highest bit in x is a 1, the behavior depends on the exact data type of x. If x is of type int, the highest bit is the sign bit, determining whether x is negative or not, as we have discussed above. In that case, the sign bit is copied into lower bits, for esoteric historical reasons:

```cpp
int x = -16;     // binary: 1111111111110000
int y = x >> 3;  // binary: 1111111111111110
```
This behavior, called sign extension, is often not the behavior you want. Instead, you may wish zeros to be shifted in from the left. It turns out that the right shift rules are different for unsigned int expressions, so you can use a typecast to suppress ones being copied from the left:

```cpp
int x = -16;                   // binary: 1111111111110000
int y = (unsigned int)x >> 3;  // binary: 0001111111111110
```

If you are careful to avoid sign extension, you can use the right-shift operator >> as a way to divide by powers of 2. For example:

```cpp
int x = 1000;
int y = x >> 3;   // integer division of 1000 by 8, causing y = 125
```
### Compound operators

#### ++ (increment), -- (decrement)

Increment or decrement a variable

```cpp
// SYNTAX
x++;  // increment x by one and returns the old value of x
++x;  // increment x by one and returns the new value of x

x-- ;   // decrement x by one and returns the old value of x
--x ;   // decrement x by one and returns the new value of x
```

where `x` is an integer or long (possibly unsigned)

```cpp
// EXAMPLE USAGE

x = 2;
y = ++x;      // x now contains 3, y contains 3
y = x--;      // x contains 2 again, y still contains 3
```

#### compound arithmetic

- += (compound addition)
- -= (compound subtraction)
- *= (compound multiplication)
- /= (compound division)

Perform a mathematical operation on a variable with another constant or variable. The += (et al) operators are just a convenient shorthand for the expanded syntax.

```cpp
// SYNTAX
x += y;   // equivalent to the expression x = x + y;
x -= y;   // equivalent to the expression x = x - y;
x *= y;   // equivalent to the expression x = x * y;
x /= y;   // equivalent to the expression x = x / y;
```

`x` can be any variable type
`y` can be any variable type or constant

```cpp
// EXAMPLE USAGE

x = 2;
x += 4;      // x now contains 6
x -= 3;      // x now contains 3
x *= 10;     // x now contains 30
x /= 2;      // x now contains 15
```

#### &= (compound bitwise and)

The compound bitwise AND operator (&=) is often used with a variable and a constant to force particular bits in a variable to the LOW state (to 0). This is often referred to in programming guides as "clearing" or "resetting" bits.

`x &= y;   // equivalent to x = x & y;`

`x` can be a char, int or long variable
`y` can be an integer constant, char, int, or long

```
   0  0  1  1    operand1
   0  1  0  1    operand2
   ----------
   0  0  0  1    (operand1 & operand2) - returned result
```
Bits that are "bitwise ANDed" with 0 are cleared to 0 so, if myByte is a byte variable,
`myByte & B00000000 = 0;`

Bits that are "bitwise ANDed" with 1 are unchanged so,
`myByte & B11111111 = myByte;`

**Note:** because we are dealing with bits in a bitwise operator - it is convenient to use the binary formatter with constants. The numbers are still the same value in other representations, they are just not as easy to understand. Also, B00000000 is shown for clarity, but zero in any number format is zero (hmmm something philosophical there?)

Consequently - to clear (set to zero) bits 0 & 1 of a variable, while leaving the rest of the variable unchanged, use the compound bitwise AND operator (&=) with the constant B11111100

```
   1  0  1  0  1  0  1  0    variable
   1  1  1  1  1  1  0  0    mask
   ----------------------
   1  0  1  0  1  0  0  0

 variable unchanged
                     bits cleared
```
Here is the same representation with the variable's bits replaced with the symbol x

```
   x  x  x  x  x  x  x  x    variable
   1  1  1  1  1  1  0  0    mask
   ----------------------
   x  x  x  x  x  x  0  0

 variable unchanged
                     bits cleared
```

So if:
`myByte =  10101010;`
`myByte &= B1111100 == B10101000;`


#### |= (compound bitwise or)

The compound bitwise OR operator (|=) is often used with a variable and a constant to "set" (set to 1) particular bits in a variable.

```cpp
// SYNTAX
x |= y;   // equivalent to x = x | y;
```
`x` can be a char, int or long variable
`y` can be an integer constant or char, int or long

```
   0  0  1  1    operand1
   0  1  0  1    operand2
   ----------
   0  1  1  1    (operand1 | operand2) - returned result
```
Bits that are "bitwise ORed" with 0 are unchanged, so if myByte is a byte variable,
`myByte | B00000000 = myByte;`

Bits that are "bitwise ORed" with 1 are set to 1 so:
`myByte | B11111111 = B11111111;`

Consequently - to set bits 0 & 1 of a variable, while leaving the rest of the variable unchanged, use the compound bitwise OR operator (|=) with the constant B00000011

```
   1  0  1  0  1  0  1  0    variable
   0  0  0  0  0  0  1  1    mask
   ----------------------
   1  0  1  0  1  0  1  1

 variable unchanged
                     bits set
```
Here is the same representation with the variables bits replaced with the symbol x
```
   x  x  x  x  x  x  x  x    variable
   0  0  0  0  0  0  1  1    mask
   ----------------------
   x  x  x  x  x  x  1  1

 variable unchanged
                     bits set
```
So if:
`myByte =  B10101010;`
`myByte |= B00000011 == B10101011;`



### Variables

#### HIGH | LOW

When reading or writing to a digital pin there are only two possible values a pin can take/be-set-to: HIGH and LOW.

`HIGH`

The meaning of `HIGH` (in reference to a pin) is somewhat different depending on whether a pin is set to an `INPUT` or `OUTPUT`. When a pin is configured as an INPUT with pinMode, and read with digitalRead, the microcontroller will report HIGH if a voltage of 3 volts or more is present at the pin.

A pin may also be configured as an `INPUT` with `pinMode`, and subsequently made `HIGH` with `digitalWrite`, this will set the internal 40K pullup resistors, which will steer the input pin to a `HIGH` reading unless it is pulled LOW by external circuitry. This is how INPUT_PULLUP works as well

When a pin is configured to `OUTPUT` with `pinMode`, and set to `HIGH` with `digitalWrite`, the pin is at 3.3 volts. In this state it can source current, e.g. light an LED that is connected through a series resistor to ground, or to another pin configured as an output, and set to `LOW.`

`LOW`

The meaning of `LOW` also has a different meaning depending on whether a pin is set to `INPUT` or `OUTPUT`. When a pin is configured as an `INPUT` with `pinMode`, and read with `digitalRead`, the microcontroller will report `LOW` if a voltage of 1.5 volts or less is present at the pin.

When a pin is configured to `OUTPUT` with `pinMode`, and set to `LOW` with digitalWrite, the pin is at 0 volts. In this state it can sink current, e.g. light an LED that is connected through a series resistor to, +3.3 volts, or to another pin configured as an output, and set to `HIGH.`

#### INPUT, OUTPUT, INPUT_PULLUP, INPUT_PULLDOWN

Digital pins can be used as INPUT, INPUT_PULLUP, INPUT_PULLDOWN or OUTPUT. Changing a pin with `pinMode()` changes the electrical behavior of the pin.

Pins Configured as `INPUT`

The device's pins configured as `INPUT` with `pinMode()` are said to be in a high-impedance state. Pins configured as `INPUT` make extremely small demands on the circuit that they are sampling, equivalent to a series resistor of 100 Megohms in front of the pin. This makes them useful for reading a sensor, but not powering an LED.

If you have your pin configured as an `INPUT`, you will want the pin to have a reference to ground, often accomplished with a pull-down resistor (a resistor going to ground).

Pins Configured as `INPUT_PULLUP` or `INPUT_PULLDOWN`

The STM32 microcontroller has internal pull-up resistors (resistors that connect to power internally) and pull-down resistors (resistors that connect to ground internally) that you can access. If you prefer to use these instead of external resistors, you can use these argument in `pinMode()`.

Pins Configured as `OUTPUT`

Pins configured as `OUTPUT` with `pinMode()` are said to be in a low-impedance state. This means that they can provide a substantial amount of current to other circuits. STM32 pins can source (provide positive current) or sink (provide negative current) up to 20 mA (milliamps) of current to other devices/circuits. This makes them useful for powering LED's but useless for reading sensors. Pins configured as outputs can also be damaged or destroyed if short circuited to either ground or 3.3 volt power rails. The amount of current provided by the pin is also not enough to power most relays or motors, and some interface circuitry will be required.

#### true | false

There are two constants used to represent truth and falsity in the Arduino language: true, and false.

`false`

`false` is the easier of the two to define. false is defined as 0 (zero).

`true`

`true` is often said to be defined as 1, which is correct, but true has a wider definition. Any integer which is non-zero is true, in a Boolean sense. So -1, 2 and -200 are all defined as true, too, in a Boolean sense.

Note that the true and false constants are typed in lowercase unlike `HIGH, LOW, INPUT, & OUTPUT.`

### Data Types

**Note:** The Photon/P1/Electron uses a 32-bit ARM based microcontroller and hence the datatype lengths are different from a standard 8-bit system (for e.g. Arduino Uno).

#### void

The `void` keyword is used only in function declarations. It indicates that the function is expected to return no information to the function from which it was called.

```cpp

//EXAMPLE
// actions are performed in the functions "setup" and "loop"
// but  no information is reported to the larger program

void setup()
{
  // ...
}

void loop()
{
  // ...
}
```

#### boolean

A `boolean` holds one of two values, `true` or `false`. (Each boolean variable occupies one byte of memory.)

```cpp
//EXAMPLE

int LEDpin = D0;       // LED on D0
int switchPin = A0;   // momentary switch on A0, other side connected to ground

boolean running = false;

void setup()
{
  pinMode(LEDpin, OUTPUT);
  pinMode(switchPin, INPUT_PULLUP);
}

void loop()
{
  if (digitalRead(switchPin) == LOW)
  {  // switch is pressed - pullup keeps pin high normally
    delay(100);                        // delay to debounce switch
    running = !running;                // toggle running variable
    digitalWrite(LEDpin, running)      // indicate via LED
  }
}

```

#### char

A data type that takes up 1 byte of memory that stores a character value. Character literals are written in single quotes, like this: 'A' (for multiple characters - strings - use double quotes: "ABC").
Characters are stored as numbers however. You can see the specific encoding in the ASCII chart. This means that it is possible to do arithmetic on characters, in which the ASCII value of the character is used (e.g. 'A' + 1 has the value 66, since the ASCII value of the capital letter A is 65). See Serial.println reference for more on how characters are translated to numbers.
The char datatype is a signed type, meaning that it encodes numbers from -128 to 127. For an unsigned, one-byte (8 bit) data type, use the `byte` data type.

```cpp
//EXAMPLE

char myChar = 'A';
char myChar = 65;      // both are equivalent
```

#### unsigned char

An unsigned data type that occupies 1 byte of memory. Same as the `byte` datatype.
The unsigned char datatype encodes numbers from 0 to 255.
For consistency of Arduino programming style, the `byte` data type is to be preferred.

```cpp
//EXAMPLE

unsigned char myChar = 240;
```

#### byte

A byte stores an 8-bit unsigned number, from 0 to 255.

```cpp
//EXAMPLE

byte b = 0x11;
```

#### int

Integers are your primary data-type for number storage. On the Photon/Electron, an int stores a 32-bit (4-byte) value. This yields a range of -2,147,483,648 to 2,147,483,647 (minimum value of -2^31 and a maximum value of (2^31) - 1).
int's store negative numbers with a technique called 2's complement math. The highest bit, sometimes referred to as the "sign" bit, flags the number as a negative number. The rest of the bits are inverted and 1 is added.

Other variations:

  * `int32_t` : 32 bit signed integer
  * `int16_t` : 16 bit signed integer
  * `int8_t`  : 8 bit signed integer

#### unsigned int

The Photon/Electron stores a 4 byte (32-bit) value, ranging from 0 to 4,294,967,295 (2^32 - 1).
The difference between unsigned ints and (signed) ints, lies in the way the highest bit, sometimes referred to as the "sign" bit, is interpreted.

Other variations:

  * `uint32_t`  : 32 bit unsigned integer
  * `uint16_t`  : 16 bit unsigned integer
  * `uint8_t`   : 8 bit unsigned integer

#### word

`word` stores a 32-bit unsigned number, from 0 to 4,294,967,295.

#### long

Long variables are extended size variables for number storage, and store 32 bits (4 bytes), from -2,147,483,648 to 2,147,483,647.

#### unsigned long

Unsigned long variables are extended size variables for number storage, and store 32 bits (4 bytes). Unlike standard longs unsigned longs won't store negative numbers, making their range from 0 to 4,294,967,295 (2^32 - 1).

#### short

A short is a 16-bit data-type. This yields a range of -32,768 to 32,767 (minimum value of -2^15 and a maximum value of (2^15) - 1).

#### float

Datatype for floating-point numbers, a number that has a decimal point. Floating-point numbers are often used to approximate analog and continuous values because they have greater resolution than integers. Floating-point numbers can be as large as 3.4028235E+38 and as low as -3.4028235E+38. They are stored as 32 bits (4 bytes) of information.

Floating point numbers are not exact, and may yield strange results when compared. For example 6.0 / 3.0 may not equal 2.0. You should instead check that the absolute value of the difference between the numbers is less than some small number.
Floating point math is also much slower than integer math in performing calculations, so should be avoided if, for example, a loop has to run at top speed for a critical timing function. Programmers often go to some lengths to convert floating point calculations to integer math to increase speed.

#### double

Double precision floating point number. On the Photon/Electron, doubles have 8-byte (64 bit) precision.

#### string - char array

A string can be made out of an array of type `char` and null-terminated.

```cpp
// EXAMPLES

char Str1[15];
char Str2[8] = {'a', 'r', 'd', 'u', 'i', 'n', 'o'};
char Str3[8] = {'a', 'r', 'd', 'u', 'i', 'n', 'o', '\0'};
char Str4[ ] = "arduino";
char Str5[8] = "arduino";
char Str6[15] = "arduino";
```

Possibilities for declaring strings:

  * Declare an array of chars without initializing it as in Str1
  * Declare an array of chars (with one extra char) and the compiler will add the required null character, as in Str2
  * Explicitly add the null character, Str3
  * Initialize with a string constant in quotation marks; the compiler will size the array to fit the string constant and a terminating null character, Str4
  * Initialize the array with an explicit size and string constant, Str5
  * Initialize the array, leaving extra space for a larger string, Str6

*Null termination:*
Generally, strings are terminated with a null character (ASCII code 0). This allows functions (like Serial.print()) to tell where the end of a string is. Otherwise, they would continue reading subsequent bytes of memory that aren't actually part of the string.
This means that your string needs to have space for one more character than the text you want it to contain. That is why Str2 and Str5 need to be eight characters, even though "arduino" is only seven - the last position is automatically filled with a null character. Str4 will be automatically sized to eight characters, one for the extra null. In Str3, we've explicitly included the null character (written '\0') ourselves.
Note that it's possible to have a string without a final null character (e.g. if you had specified the length of Str2 as seven instead of eight). This will break most functions that use strings, so you shouldn't do it intentionally. If you notice something behaving strangely (operating on characters not in the string), however, this could be the problem.

*Single quotes or double quotes?*
Strings are always defined inside double quotes ("Abc") and characters are always defined inside single quotes('A').

Wrapping long strings

```cpp
//You can wrap long strings like this:
char myString[] = "This is the first line"
" this is the second line"
" etcetera";
```

*Arrays of strings:*
It is often convenient, when working with large amounts of text, such as a project with an LCD display, to setup an array of strings. Because strings themselves are arrays, this is in actually an example of a two-dimensional array.
In the code below, the asterisk after the datatype char "char*" indicates that this is an array of "pointers". All array names are actually pointers, so this is required to make an array of arrays. Pointers are one of the more esoteric parts of C for beginners to understand, but it isn't necessary to understand pointers in detail to use them effectively here.


```cpp
//EXAMPLE
SerialLogHandler logHandler;

char* myStrings[] = {"This is string 1", "This is string 2",
"This is string 3", "This is string 4", "This is string 5",
"This is string 6"};

void setup(){
}

void loop(){
  for (int i = 0; i < 6; i++) {
    Log.info(myStrings[i]);
    delay(500);
  }
}

```

#### String - object

More info can be found [here.](#string-class)

#### array

An array is a collection of variables that are accessed with an index number.

*Creating (Declaring) an Array:*
All of the methods below are valid ways to create (declare) an array.

```cpp
int myInts[6];
int myPins[] = {2, 4, 8, 3, 6};
int mySensVals[6] = {2, 4, -8, 3, 2};
char message[6] = "hello";
```

You can declare an array without initializing it as in myInts.

In myPins we declare an array without explicitly choosing a size. The compiler counts the elements and creates an array of the appropriate size.
Finally you can both initialize and size your array, as in mySensVals. Note that when declaring an array of type char, one more element than your initialization is required, to hold the required null character.

*Accessing an Array:*
Arrays are zero indexed, that is, referring to the array initialization above, the first element of the array is at index 0, hence

`mySensVals[0] == 2, mySensVals[1] == 4`, and so forth.
It also means that in an array with ten elements, index nine is the last element. Hence:
```cpp
int myArray[10] = {9,3,2,4,3,2,7,8,9,11};
//  myArray[9]    contains the value 11
//  myArray[10]   is invalid and contains random information (other memory address)
```

For this reason you should be careful in accessing arrays. Accessing past the end of an array (using an index number greater than your declared array size - 1) is reading from memory that is in use for other purposes. Reading from these locations is probably not going to do much except yield invalid data. Writing to random memory locations is definitely a bad idea and can often lead to unhappy results such as crashes or program malfunction. This can also be a difficult bug to track down.
Unlike BASIC or JAVA, the C compiler does no checking to see if array access is within legal bounds of the array size that you have declared.

*To assign a value to an array:*
`mySensVals[0] = 10;`

*To retrieve a value from an array:*
`x = mySensVals[4];`

*Arrays and FOR Loops:*
Arrays are often manipulated inside `for` loops, where the loop counter is used as the index for each array element. To print the elements of an array over the serial port, you could do something like the following code example.  Take special note to a MACRO called `arraySize()` which is used to determine the number of elements in `myPins`.  In this case, arraySize() returns 5, which causes our `for` loop to terminate after 5 iterations.  Also note that `arraySize()` will not return the correct answer if passed a pointer to an array.

```cpp
int myPins[] = {2, 4, 8, 3, 6};
for (int i = 0; i < arraySize(myPins); i++) {
  Log.info(myPins[i]);
}
```

### Exceptions

Exceptions are disabled at the compiler level (`-fno-exceptions`) and cannot be used. You cannot use `std::nothrow` or try/catch blocks.

This means that things like `new`, `malloc`, `strdup`, etc., will not throw an exception and instead will return NULL if the allocation failed, so be sure to check for NULL return values.

## Other Functions

{{#if has-linux}}
The C standard library and other Linux libraries are available on the device. See this [description of the standard library](https://en.wikipedia.org/wiki/C_standard_library).
{{else}}
The C standard library used on the device is called newlib and is described at [https://sourceware.org/newlib/libc.html](https://sourceware.org/newlib/libc.html)
{{/if}} {{!-- has-linux --}}

For advanced use cases, those functions are available for use in addition to the functions outlined above.

### sprintf

One commonly used function in the standard C library is `sprintf()`, which is used to format a string with variables. This also includes variations like `snprintf()` and also functions that call `snprintf()` internally, like `Log.info()` and `String::format()`.

This example shows several common formatting techiques along with the expected output.

```cpp
#include "Particle.h"

SerialLogHandler logHandler;

int counter = 0;
const std::chrono::milliseconds testPeriod = 30s;
unsigned long lastTest = 0;

void runTest();

void setup() {
}

void loop() {
    if (millis() - lastTest >= testPeriod.count()) {
        lastTest = millis();

        runTest();
    }
}

void runTest() {
    Log.info("staring test millis=%lu", millis());
    // 0000068727 [app] INFO: staring test millis=68727

    // To print an int as decimal, use %d
    Log.info("counter=%d", ++counter);
    // 0000068728 [app] INFO: counter=1

    // To print an int as hexadecimal, use %x
    int value1 = 1234;
    Log.info("value1=%d value1=%x (hex)", value1, value1);
    // 0000068728 [app] INFO: value1=1234 value1=4d2 (hex)

    // To print a string, use %s
    const char *testStr1 = "testing 1, 2, 3";
    Log.info("value1=%d testStr=%s", value1, testStr1);
    // 0000068728 [app] INFO: value1=1234 testStr=testing 1, 2, 3

    // To print a long integer, use %ld, %lx, etc.
    long value2 = 123456789;
    Log.info("value2=%ld value2=%lx (hex)", value2, value2);
    // 0000068729 [app] INFO: value2=123456789 value2=75bcd15 (hex)

    // To print to a fixed number of places with leading zeros:
    Log.info("value2=%08lx (hex, 8 digits, with leading zeros)", value2);
    // 0000068729 [app] INFO: value2=075bcd15 (hex, 8 digits, with leading zeros)

    // To print an unsigned long integer (uint32_t), use %lu or %lx
    uint32_t value3 = 0xaabbccdd;
    Log.info("value3=%lu value3=%lx (hex)", value3, value3);
    // 0000068730 [app] INFO: value3=2864434397 value3=aabbccdd (hex)

    // To print a floating point number, use %f
    float value4 = 1234.5;
    Log.info("value4=%f", value4);
    // 0000068730 [app] INFO: value4=1234.500000

    // To print a double floating point, use %lf
    double value5 = 1234.333;
    Log.info("value5=%lf", value5);
    //  0000068731 [app] INFO: value5=1234.333000

    // To limit the number of decimal places:
    Log.info("value5=%.2lf (to two decimal places)", value5);
    // 0000068732 [app] INFO: value5=1234.33 (to two decimal places)

    // To print to a character buffer
    {
        char buf[32];
        snprintf(buf, sizeof(buf), "%.3lf", value5);

        Log.info("buf=%s (3 decimal places)", buf);
        // 0000068733 [app] INFO: buf=1234.333 (3 decimal places)

        Particle.publish("testing", buf);
    }

    // To print JSON to a buffer
    {
        char buf[256];
        
        snprintf(buf, sizeof(buf), "{\"value2\":%ld,\"value5\":%.2lf}", value2, value5);
        Log.info(buf);
        // 0000068734 [app] INFO: {"value2":123456789,"value5":1234.33}

        Particle.publish("testing", buf);
    }

    // Using String::format
    Particle.publish("testing", String::format("{\"value1\":%d,\"testStr1\":\"%s\"}", value1, testStr1).c_str());
}

```

One caveat is that sprintf-style formatting does not support 64-bit integers. It does not support `%lld`, `%llu` or Microsoft-style `%I64d` or `%I64u`.  

As a workaround you can use the `Print64` firmware library in the community libraries. The source and instructions can be found [in Github](https://github.com/rickkas7/Print64/).

| Variation | Supported | Purpose |
| :--- | :---: | :--- |
| `sprintf()` | &check; | Prints to a buffer, but `snprintf` is recommended to prevent overflowing the buffer. |
| `snprintf()` | &check; | Prints to a buffer, recommended method. |
| `vsprintf()` | &check; | Prints to a buffer, using va_list variable arguments. |
| `vsnprintf()` | &check; | Prints to a buffer, using va_list variable arguments and buffer size. |
| `printf()` | &nbsp; | Prints to standard output, use `Log.info()` instead. |
| `vprintf()` | &nbsp; | Prints to standard output, using va_list variable arguments. Not supported. |
| `fprintf()` | &nbsp; | Prints to a file system file. Not supported. |
| `vfprintf()` | &nbsp; | Prints to a file system file, using va_list variable arguments. Not supported. |


### sscanf

The opposite of `sprintf()` is `sscanf()`, which reads a string and allows for simple parsing of strings. It's a little tricky to use so you may need to seearch for some examples online. 

Note: `sscanf()` does not support the `%f` scanning option to scan for floating point numbers! You must instead use `atof()` to convert an ASCII decimal floating point number to a `float`.

| Variation | Supported | Purpose |
| :--- | :---: | :--- |
| `sscanf()` | &check; | Scan a buffer of characters. |
| `vsscanf()` | &check; | Scan a buffer of characters, using va_list variable arguments. |
| `scanf()` | &nbsp; | Scan characters from standard input. Not supported. |
| `vscanf()` | &nbsp; | Scan characters from standard input, using va_list variable arguments.. Not supported. |
| `fscanf()` | &nbsp; | Scan characters from a file. Not supported. |
| `vfscanf()` | &nbsp; | Scan characters from a file, using va_list variable arguments.. Not supported. |


## Preprocessor

When you are using the Particle Device Cloud to compile your `.ino` source code, a preprocessor comes in to modify the code into C++ requirements before producing the binary file used to flash onto your devices.

```
// EXAMPLE
/* This is my awesome app! */
#include "TinyGPS++.h"

TinyGPSPlus gps;
enum State { GPS_START, GPS_STOP };

void updateState(State st); // You must add this prototype

void setup() {
  updateState(GPS_START);
}

void updateState(State st) {
  // ...
}

void loop() {
  displayPosition(gps);
}

void displayPosition(TinyGPSPlus &gps) {
  // ...
}

// AFTER PREPROCESSOR
#include "Particle.h" // <-- added by preprocessor
/* This is my awesome app! */
#include "TinyGPS++.h"

void setup(); // <-- added by preprocessor
void loop();  // <-- added by preprocessor
void displayPosition(TinyGPSPlus &gps); // <-- added by preprocessor

TinyGPSPlus gps;
enum State { GPS_START, GPS_STOP };

void updateState(State st); // You must add this prototype

void setup() {
  updateState(GPS_START);
}

void updateState(State st) {
  // ...
}

void loop() {
  displayPosition(gps);
}

void displayPosition(TinyGPSPlus &gps) {
  // ...
}
```

The preprocessor automatically adds the line `#include "Particle.h"` to the top of the file, unless your file already includes "Particle.h", "Arduino.h" or "application.h".

The preprocessor adds prototypes for your functions so your code can call functions declared later in the source code. The function prototypes are added at the top of the file, below `#include` statements.

If you define custom classes, structs or enums in your code, the preprocessor will not add prototypes for functions with those custom types as arguments. This is to avoid putting the prototype before the type definition. This doesn't apply to functions with types defined in libraries. Those functions will get a prototype.

If you need to include another file or define constants before Particle.h gets included, define `PARTICLE_NO_ARDUINO_COMPATIBILITY` to 1 to disable Arduino compatibility macros, be sure to include Particle.h manually in the right place.

---

If you are getting unexpected errors when compiling valid code, it could be the preprocessor causing issues in your code. You can disable the preprocessor by adding this pragma line. Be sure to add `#include "Particle.h"` and the function prototypes to your code.

```
#pragma PARTICLE_NO_PREPROCESSOR
//
#pragma SPARK_NO_PREPROCESSOR
```

{{#if has-stm32f2}}

## Memory

The Photon, P1, and Electron all have an STM32F205 processor with 128K of available RAM and 128K of flash for your user firmware.

Some tips for understanding the memory used by your firmware [can be found here](https://support.particle.io/hc/en-us/articles/360039741093/).

Some of the available resources are used by the system, so there's about 80K of free RAM available for the user firmware to use.

### Stack

The available stack depends on the environment:

- Main loop thread: 6144 bytes
- Software timer callbacks: 1024 bytes

The stack size cannot be changed as it's allocated by the Device OS before the user firmware is loaded. 

{{/if}}

{{#if has-mesh}}
## Mesh

The mesh networking features are only available in Device OS 0.9.0 - 1.5.4 and have been discontinued. See [mesh deprecation](/reference/discontinued/mesh/) for more information. The [mesh API](/reference/discontinued/firmware-mesh/) reference is still available for compatible versions of Device OS.

{{/if}}

## Device OS Versions

Particle Device OS firmware is open source and stored [here on GitHub](https://github.com/particle-iot/device-os).

New versions are published [here on GitHub](https://github.com/particle-iot/device-os/releases) as they are created, tested and deployed.

### New version release process

The process in place for releasing all Device OS versions as prerelease or default release versions can be found [here on GitHub](https://github.com/particle-iot/device-os/wiki/Firmware-Release-Process).

### GitHub Release Notes

Please go to GitHub to read the Changelog for your desired firmware version (Click a version below).

|Firmware Version||||||||
|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
|v3.0.x prereleases|[v3.0.0-beta.1](https://github.com/particle-iot/device-os/releases/tag/v3.0.0-beta.1)|[v3.0.0-rc.1](https://github.com/particle-iot/device-os/releases/tag/v3.0.0-rc.1)|-|-|-|-|-|
|v2.0.x default releases|[v2.0.0](https://github.com/particle-iot/device-os/releases/tag/v2.0.0)|[v2.0.1](https://github.com/particle-iot/device-os/releases/tag/v2.0.1)|-||-|-|-|
|v2.0.x prereleases|[v2.0.0-rc.1](https://github.com/particle-iot/device-os/releases/tag/v2.0.0-rc.1)|[v2.0.0-rc.2](https://github.com/particle-iot/device-os/releases/tag/v2.0.0-rc.2)|[v2.0.0-rc.3](https://github.com/particle-iot/device-os/releases/tag/v2.0.0-rc.3)|[v2.0.0-rc.4](https://github.com/particle-iot/device-os/releases/tag/v2.0.0-rc.4)|-|-|-|
|v1.5.x default releases|[v1.5.0](https://github.com/particle-iot/device-os/releases/tag/v1.5.0)|[v1.5.1](https://github.com/particle-iot/device-os/releases/tag/v1.5.1)|[v1.5.2](https://github.com/particle-iot/device-os/releases/tag/v1.5.2)|-|-|-|-|
|v1.5.x prereleases|[v1.5.0-rc.1](https://github.com/particle-iot/device-os/releases/tag/v1.5.0-rc.1)|[v1.5.0-rc.2](https://github.com/particle-iot/device-os/releases/tag/v1.5.0-rc.2)|[v1.5.1-rc.1](https://github.com/particle-iot/device-os/releases/tag/v1.5.1-rc.1)|[v1.5.4-rc.1](https://github.com/particle-iot/device-os/releases/tag/v1.5.4-rc.1)|[v1.5.4-rc.2](https://github.com/particle-iot/device-os/releases/tag/v1.5.4-rc.2)|-|-|
|v1.4.x default releases|[v1.4.0](https://github.com/particle-iot/device-os/releases/tag/v1.4.0)|[v1.4.1](https://github.com/particle-iot/device-os/releases/tag/v1.4.1)|[v1.4.2](https://github.com/particle-iot/device-os/releases/tag/v1.4.2)|[v1.4.3](https://github.com/particle-iot/device-os/releases/tag/v1.4.3)|[v1.4.4](https://github.com/particle-iot/device-os/releases/tag/v1.4.4)|-|-|
|v1.4.x prereleases|[v1.4.0-rc.1](https://github.com/particle-iot/device-os/releases/tag/v1.4.0-rc.1)|[v1.4.1-rc.1](https://github.com/particle-iot/device-os/releases/tag/v1.4.1-rc.1)|-|-|-|-|-|
|v1.3.x default releases|[v1.3.1](https://github.com/particle-iot/device-os/releases/tag/v1.3.1)|-|-|-|-|-|-|
|v1.3.x prereleases|[v1.3.0-rc.1](https://github.com/particle-iot/device-os/releases/tag/v1.3.0-rc.1)|[v1.3.1-rc.1](https://github.com/particle-iot/device-os/releases/tag/v1.3.1-rc.1)|-|-|-|-|-|
|v1.2.x default releases|[v1.2.1](https://github.com/particle-iot/device-os/releases/tag/v1.2.1)|-|-|-|-|-|-|
|v1.2.x prereleases|[v1.2.0-beta.1](https://github.com/particle-iot/device-os/releases/tag/v1.2.0-beta.1)|[v1.2.0-rc.1](https://github.com/particle-iot/device-os/releases/tag/v1.2.0-rc.1)|[v1.2.1-rc.1](https://github.com/particle-iot/device-os/releases/tag/v1.2.1-rc.1)|[v1.2.1-rc.2](https://github.com/particle-iot/device-os/releases/tag/v1.2.1-rc.2)|[v1.2.1-rc.3](https://github.com/particle-iot/device-os/releases/tag/v1.2.1-rc.3)|-|-|
|v1.1.x default releases|[v1.1.0](https://github.com/particle-iot/device-os/releases/tag/v1.1.0)|[v1.1.1](https://github.com/particle-iot/device-os/releases/tag/v1.1.1)|-|-|-|-|-|
|v1.1.x prereleases|[v1.1.0-rc.1](https://github.com/particle-iot/device-os/releases/tag/v1.1.0-rc.1)|[v1.1.0-rc.2](https://github.com/particle-iot/device-os/releases/tag/v1.1.0-rc.2)|[v1.1.1-rc.1](https://github.com/particle-iot/device-os/releases/tag/v1.1.1-rc.1)|-|-|-|-|
|v1.0.x default releases|[v1.0.0](https://github.com/particle-iot/device-os/releases/tag/v1.0.0)|[v1.0.1](https://github.com/particle-iot/device-os/releases/tag/v1.0.1)|-|-|-|-|-|
|v1.0.x prereleases|[v1.0.1-rc.1](https://github.com/particle-iot/device-os/releases/tag/v1.0.1-rc.1)|-|-|-|-|-|-|
|v0.8.x-rc.x prereleases|[v0.8.0-rc.10](https://github.com/particle-iot/device-os/releases/tag/v0.8.0-rc.10)|[v0.8.0-rc.11](https://github.com/particle-iot/device-os/releases/tag/v0.8.0-rc.11)|[v0.8.0-rc.12](https://github.com/particle-iot/device-os/releases/tag/v0.8.0-rc.12)|[v0.8.0-rc.14](https://github.com/particle-iot/device-os/releases/tag/v0.8.0-rc.14)|-|-|-|
|v0.8.x-rc.x prereleases|[v0.8.0-rc.1](https://github.com/particle-iot/device-os/releases/tag/v0.8.0-rc.1)|[v0.8.0-rc.2](https://github.com/particle-iot/device-os/releases/tag/v0.8.0-rc.2)|[v0.8.0-rc.3](https://github.com/particle-iot/device-os/releases/tag/v0.8.0-rc.3)|[v0.8.0-rc.4](https://github.com/particle-iot/device-os/releases/tag/v0.8.0-rc.4)|[v0.8.0-rc.7](https://github.com/particle-iot/device-os/releases/tag/v0.8.0-rc.7)|[v0.8.0-rc.8](https://github.com/particle-iot/device-os/releases/tag/v0.8.0-rc.8)|[v0.8.0-rc.9](https://github.com/particle-iot/device-os/releases/tag/v0.8.0-rc.9)|
|v0.7.x default releases|[v0.7.0](https://github.com/particle-iot/device-os/releases/tag/v0.7.0)|-|-|-|-|-|-|
|v0.7.x-rc.x prereleases|[v0.7.0-rc.1](https://github.com/particle-iot/device-os/releases/tag/v0.7.0-rc.1)|[v0.7.0-rc.2](https://github.com/particle-iot/device-os/releases/tag/v0.7.0-rc.2)|[v0.7.0-rc.3](https://github.com/particle-iot/device-os/releases/tag/v0.7.0-rc.3)|[v0.7.0-rc.4](https://github.com/particle-iot/device-os/releases/tag/v0.7.0-rc.4)|[v0.7.0-rc.5](https://github.com/particle-iot/device-os/releases/tag/v0.7.0-rc.5)|[v0.7.0-rc.6](https://github.com/particle-iot/device-os/releases/tag/v0.7.0-rc.6)|[v0.7.0-rc.7](https://github.com/particle-iot/device-os/releases/tag/v0.7.0-rc.7)|
|v0.6.x default releases|[v0.6.0](https://github.com/particle-iot/device-os/releases/tag/v0.6.0)|[v0.6.1](https://github.com/particle-iot/device-os/releases/tag/v0.6.1)|[v0.6.2](https://github.com/particle-iot/device-os/releases/tag/v0.6.2)|[v0.6.3](https://github.com/particle-iot/device-os/releases/tag/v0.6.3)|[v0.6.4](https://github.com/particle-iot/device-os/releases/tag/v0.6.4)|-|-|
|v0.6.x-rc.x prereleases|[v0.6.2-rc.1](https://github.com/particle-iot/device-os/releases/tag/v0.6.2-rc.1)|[v0.6.2-rc.2](https://github.com/particle-iot/device-os/releases/tag/v0.6.2-rc.2)|-|-|-|-|-|
|-|[v0.6.0-rc.1](https://github.com/particle-iot/device-os/releases/tag/v0.6.0-rc.1)|[v0.6.0-rc.2](https://github.com/particle-iot/device-os/releases/tag/v0.6.0-rc.2)|[v0.6.1-rc.1](https://github.com/particle-iot/device-os/releases/tag/v0.6.1-rc.1)|[v0.6.1-rc.2](https://github.com/particle-iot/device-os/releases/tag/v0.6.1-rc.2)|-|-|-|
|v0.5.x default releases|[v0.5.0](https://github.com/particle-iot/device-os/releases/tag/v0.5.0)|[v0.5.1](https://github.com/particle-iot/device-os/releases/tag/v0.5.1)|[v0.5.2](https://github.com/particle-iot/device-os/releases/tag/v0.5.2)|[v0.5.3](https://github.com/particle-iot/device-os/releases/tag/v0.5.3)|[v0.5.4](https://github.com/particle-iot/device-os/releases/tag/v0.5.4)|[v0.5.5](https://github.com/particle-iot/device-os/releases/tag/v0.5.5)|-|
|v0.5.x-rc.x prereleases|[v0.5.3-rc.1](https://github.com/particle-iot/device-os/releases/tag/v0.5.3-rc.1)|[v0.5.3-rc.2](https://github.com/particle-iot/device-os/releases/tag/v0.5.3-rc.2)|[v0.5.3-rc.3](https://github.com/particle-iot/device-os/releases/tag/v0.5.3-rc.3)|-|-|-|-|

### Programming and Debugging Notes

If you don't see any notes below the table or if they are the wrong version, please select your Firmware Version in the table below to reload the page with the correct notes.  Otherwise, you must have come here from a firmware release page on GitHub and your version's notes will be found below the table :)

|Firmware Version||||||||
|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
|v3.0.x prereleases|[v3.0.0-beta.1](/reference/device-os/firmware/photon/?fw_ver=3.0.0-beta.1&cli_ver=2.10.0&electron_parts=3#programming-and-debugging-notes)|[v3.0.0-rc.1](/reference/device-os/firmware/photon/?fw_ver=3.0.0-rc.1&cli_ver=2.10.0&electron_parts=3#programming-and-debugging-notes)|-|-|-|-|
|v2.0.x default releases|[v2.0.0](/reference/device-os/firmware/photon/?fw_ver=2.0.0&cli_ver=2.9.0&electron_parts=3#programming-and-debugging-notes)|[v2.0.1](/reference/device-os/firmware/photon/?fw_ver=2.0.1&cli_ver=2.10.0&electron_parts=3#programming-and-debugging-notes)|-|-|-|-|
|v2.0.x prereleases|[v2.0.0-rc.1](/reference/device-os/firmware/photon/?fw_ver=2.0.0-rc.1&cli_ver=2.7.2&electron_parts=3#programming-and-debugging-notes)|[v2.0.0-rc.2](/reference/device-os/firmware/photon/?fw_ver=2.0.0-rc.2&cli_ver=2.7.2&electron_parts=3#programming-and-debugging-notes)|[v2.0.0-rc.3](/reference/device-os/firmware/photon/?fw_ver=2.0.0-rc.3&cli_ver=2.8.1&electron_parts=3#programming-and-debugging-notes)|[v2.0.0-rc.4](/reference/device-os/firmware/photon/?fw_ver=2.0.0-rc.4&cli_ver=2.8.1&electron_parts=3#programming-and-debugging-notes)|-|-|
|v1.5.x default releases|[v1.5.0](/reference/device-os/firmware/photon/?fw_ver=1.5.0&cli_ver=2.3.0&electron_parts=3#programming-and-debugging-notes)|[v1.5.1](/reference/device-os/firmware/photon/?fw_ver=1.5.1&cli_ver=2.5.0&electron_parts=3#programming-and-debugging-notes)|[v1.5.1](/reference/device-os/firmware/photon/?fw_ver=1.5.2&cli_ver=2.6.0&electron_parts=3#programming-and-debugging-notes)|-|-|-|
|v1.5.x prereleases|[v1.5.0-rc.1](/reference/device-os/firmware/photon/?fw_ver=1.5.0-rc.1&cli_ver=2.1.0&electron_parts=3#programming-and-debugging-notes)|[v1.5.0-rc.2](/reference/device-os/firmware/photon/?fw_ver=1.5.0-rc.2&cli_ver=2.1.0&electron_parts=3#programming-and-debugging-notes)|[v1.5.1-rc.1](/reference/device-os/firmware/photon/?fw_ver=1.5.1-rc.1&cli_ver=2.3.0&electron_parts=3#programming-and-debugging-notes)|[v1.5.4-rc.1](/reference/device-os/firmware/photon/?fw_ver=1.5.4-rc.1&cli_ver=2.6.0&electron_parts=3#programming-and-debugging-notes)|[v1.5.4-rc.2](/reference/device-os/firmware/photon/?fw_ver=1.5.4-rc.2&cli_ver=2.8.1&electron_parts=3#programming-and-debugging-notes)|-|
|v1.4.x default releases|[v1.4.0](/reference/device-os/firmware/photon/?fw_ver=1.4.0&cli_ver=1.47.0&electron_parts=3#programming-and-debugging-notes)|[v1.4.1](/reference/device-os/firmware/photon/?fw_ver=1.4.1&cli_ver=1.48.0&electron_parts=3#programming-and-debugging-notes)|[v1.4.2](/reference/device-os/firmware/photon/?fw_ver=1.4.2&cli_ver=1.49.0&electron_parts=3#programming-and-debugging-notes)|[v1.4.3](/reference/device-os/firmware/photon/?fw_ver=1.4.3&cli_ver=1.52.0&electron_parts=3#programming-and-debugging-notes)|[v1.4.4](/reference/device-os/firmware/photon/?fw_ver=1.4.4&cli_ver=1.53.0&electron_parts=3#programming-and-debugging-notes)|-|-|
|v1.4.x prereleases|[v1.4.0-rc.1](/reference/device-os/firmware/photon/?fw_ver=1.4.0-rc.1&cli_ver=1.43.3&electron_parts=3#programming-and-debugging-notes)|[v1.4.1-rc.1](/reference/device-os/firmware/photon/?fw_ver=1.4.1-rc.1&cli_ver=1.47.0&electron_parts=3#programming-and-debugging-notes)|-|-|-|-|
|v1.3.x default releases|[v1.3.1](/reference/device-os/firmware/photon/?fw_ver=1.3.1&cli_ver=1.46.1&electron_parts=3#programming-and-debugging-notes)|-|-|-|-|-|-|
|v1.3.x prereleases|[v1.3.0-rc.1](/reference/device-os/firmware/photon/?fw_ver=1.3.0-rc.1&cli_ver=1.41.2&electron_parts=3#programming-and-debugging-notes)|[v1.3.1-rc.1](/reference/device-os/firmware/photon/?fw_ver=1.3.1-rc.1&cli_ver=1.43.3&electron_parts=3#programming-and-debugging-notes)|-|-|-|-|
|v1.2.x default releases|[v1.2.1](/reference/device-os/firmware/photon/?fw_ver=1.2.1&cli_ver=1.43.0&electron_parts=3#programming-and-debugging-notes)|-|-|-|-|-|-|
|v1.2.x prereleases|[v1.2.0-beta.1](/reference/device-os/firmware/photon/?fw_ver=1.2.0-beta.1&cli_ver=1.40.0&electron_parts=3#programming-and-debugging-notes)|[v1.2.0-rc.1](/reference/device-os/firmware/photon/?fw_ver=1.2.0-rc.1&cli_ver=1.41.0&electron_parts=3#programming-and-debugging-notes)|[v1.2.1-rc.1](/reference/device-os/firmware/photon/?fw_ver=1.2.1-rc.1&cli_ver=1.41.0&electron_parts=3#programming-and-debugging-notes)|[v1.2.1-rc.2](/reference/device-os/firmware/photon/?fw_ver=1.2.1-rc.2&cli_ver=1.41.1&electron_parts=3#programming-and-debugging-notes)|[v1.2.1-rc.3](/reference/device-os/firmware/photon/?fw_ver=1.2.1-rc.3&cli_ver=1.41.2&electron_parts=3#programming-and-debugging-notes)|-|
|v1.1.x default releases|[v1.1.0](/reference/device-os/firmware/photon/?fw_ver=1.1.0&cli_ver=1.41.0&electron_parts=3#programming-and-debugging-notes)|[v1.1.1](/reference/device-os/firmware/photon/?fw_ver=1.1.1&cli_ver=1.42.0&electron_parts=3#programming-and-debugging-notes)|-|-|-|-|-|
|v1.0.x prereleases|[v1.0.1-rc.1](/reference/device-os/firmware/photon/?fw_ver=1.0.1-rc.1&cli_ver=1.38.0&electron_parts=3#programming-and-debugging-notes)|-|-|-|-|-|-|
|v1.1.x prereleases|[v1.1.0-rc.1](/reference/device-os/firmware/photon/?fw_ver=1.1.0-rc.1&cli_ver=1.40.0&electron_parts=3#programming-and-debugging-notes)|[v1.1.0-rc.2](/reference/device-os/firmware/photon/?fw_ver=1.1.0-rc.2&cli_ver=1.40.0&electron_parts=3#programming-and-debugging-notes)|[v1.1.1-rc.1](/reference/device-os/firmware/photon/?fw_ver=1.1.1-rc.1&cli_ver=1.41.2&electron_parts=3#programming-and-debugging-notes)|-|-|
|v1.0.x default releases|[v1.0.0](/reference/device-os/firmware/photon/?fw_ver=1.0.0&cli_ver=1.37.0&electron_parts=3#programming-and-debugging-notes)|[v1.0.1](/reference/device-os/firmware/photon/?fw_ver=1.0.1&cli_ver=1.39.0&electron_parts=3#programming-and-debugging-notes)|-|-|-|-|-|
|v1.0.x prereleases|[v1.0.1-rc.1](/reference/device-os/firmware/photon/?fw_ver=1.0.1-rc.1&cli_ver=1.38.0&electron_parts=3#programming-and-debugging-notes)|-|-|-|-|-|-|
|v0.8.x-rc.x prereleases|[v0.8.0-rc.10](/reference/device-os/firmware/photon/?fw_ver=0.8.0-rc.10&cli_ver=1.33.0&electron_parts=3#programming-and-debugging-notes)|[v0.8.0-rc.11](/reference/device-os/firmware/photon/?fw_ver=0.8.0-rc.11&cli_ver=1.35.0&electron_parts=3#programming-and-debugging-notes)|[v0.8.0-rc.12](/reference/device-os/firmware/photon/?fw_ver=0.8.0-rc.12&cli_ver=1.36.3&electron_parts=3#programming-and-debugging-notes)|[v0.8.0-rc.14](/reference/device-os/firmware/photon/?fw_ver=0.8.0-rc.14&cli_ver=1.36.3&electron_parts=3#programming-and-debugging-notes)|-|-|-|
|v0.8.x-rc.x prereleases|[v0.8.0-rc.1](/reference/device-os/firmware/photon/?fw_ver=0.8.0-rc.1&cli_ver=1.29.0&electron_parts=3#programming-and-debugging-notes)|[v0.8.0-rc.2](/reference/device-os/firmware/photon/?fw_ver=0.8.0-rc.2&cli_ver=1.29.0&electron_parts=3#programming-and-debugging-notes)|[v0.8.0-rc.3](/reference/device-os/firmware/photon/?fw_ver=0.8.0-rc.3&cli_ver=1.29.0&electron_parts=3#programming-and-debugging-notes)|[v0.8.0-rc.4](/reference/device-os/firmware/photon/?fw_ver=0.8.0-rc.4&cli_ver=1.29.0&electron_parts=3#programming-and-debugging-notes)|[v0.8.0-rc.7](/reference/device-os/firmware/photon/?fw_ver=0.8.0-rc.7&cli_ver=1.29.0&electron_parts=3#programming-and-debugging-notes)|[v0.8.0-rc.8](/reference/device-os/firmware/photon/?fw_ver=0.8.0-rc.8&cli_ver=1.32.1&electron_parts=3#programming-and-debugging-notes)|[v0.8.0-rc.9](/reference/device-os/firmware/photon/?fw_ver=0.8.0-rc.9&cli_ver=1.32.4&electron_parts=3#programming-and-debugging-notes)|
|v0.7.x default releases|[v0.7.0](/reference/device-os/firmware/photon/?fw_ver=0.7.0&cli_ver=1.29.0&electron_parts=3#programming-and-debugging-notes)|-|-|-|-|-|-|
|v0.7.x-rc.x prereleases|[v0.7.0-rc.1](/reference/device-os/firmware/photon/?fw_ver=0.7.0-rc.1&cli_ver=1.23.1&electron_parts=3#programming-and-debugging-notes)|[v0.7.0-rc.2](/reference/device-os/firmware/photon/?fw_ver=0.7.0-rc.2&cli_ver=1.23.1&electron_parts=3#programming-and-debugging-notes)|[v0.7.0-rc.3](/reference/device-os/firmware/photon/?fw_ver=0.7.0-rc.3&cli_ver=1.23.1&electron_parts=3#programming-and-debugging-notes)|[v0.7.0-rc.4](/reference/device-os/firmware/photon/?fw_ver=0.7.0-rc.4&cli_ver=1.23.1&electron_parts=3#programming-and-debugging-notes)|[v0.7.0-rc.5](/reference/device-os/firmware/photon/?fw_ver=0.7.0-rc.5&cli_ver=1.23.1&electron_parts=3#programming-and-debugging-notes)|[v0.7.0-rc.6](/reference/device-os/firmware/photon/?fw_ver=0.7.0-rc.6&cli_ver=1.23.1&electron_parts=3#programming-and-debugging-notes)|[v0.7.0-rc.7](/reference/device-os/firmware/photon/?fw_ver=0.7.0-rc.7&cli_ver=1.23.1&electron_parts=3#programming-and-debugging-notes)|
|v0.6.x default releases|[v0.6.0](/reference/device-os/firmware/photon/?fw_ver=0.6.0&cli_ver=1.18.0&electron_parts=3#programming-and-debugging-notes)|[v0.6.1](/reference/device-os/firmware/photon/?fw_ver=0.6.1&cli_ver=1.20.1&electron_parts=3#programming-and-debugging-notes)|[v0.6.2](/reference/device-os/firmware/photon/?fw_ver=0.6.2&cli_ver=1.22.0&electron_parts=3#programming-and-debugging-notes)|[v0.6.3](/reference/device-os/firmware/photon/?fw_ver=0.6.3&cli_ver=1.25.0&electron_parts=3#programming-and-debugging-notes)|[v0.6.4](/reference/device-os/firmware/photon/?fw_ver=0.6.4&cli_ver=1.26.2&electron_parts=3#programming-and-debugging-notes)|-|-|
|v0.6.x-rc.x prereleases|[v0.6.2-rc.1](/reference/device-os/firmware/photon/?fw_ver=0.6.2-rc.1&cli_ver=1.21.0&electron_parts=3#programming-and-debugging-notes)|[v0.6.2-rc.2](/reference/device-os/firmware/photon/?fw_ver=0.6.2-rc.2&cli_ver=1.21.0&electron_parts=3#programming-and-debugging-notes)|-|-|-|-|-|
|-|[v0.6.0-rc.1](/reference/device-os/firmware/photon/?fw_ver=0.6.0-rc.1&cli_ver=1.17.0&electron_parts=3#programming-and-debugging-notes)|[v0.6.0-rc.2](/reference/device-os/firmware/photon/?fw_ver=0.6.0-rc.2&cli_ver=1.17.0&electron_parts=3#programming-and-debugging-notes)|[v0.6.1-rc.1](/reference/device-os/firmware/photon/?fw_ver=0.6.1-rc.1&cli_ver=1.18.0&electron_parts=3#programming-and-debugging-notes)|[v0.6.1-rc.2](/reference/device-os/firmware/photon/?fw_ver=0.6.1-rc.2&cli_ver=1.18.0&electron_parts=3#programming-and-debugging-notes)|-|-|-|
|v0.5.x default releases|[v0.5.0](/reference/device-os/firmware/photon/?fw_ver=0.5.0&cli_ver=1.12.0&electron_parts=2#programming-and-debugging-notes)|[v0.5.1](/reference/device-os/firmware/photon/?fw_ver=0.5.1&cli_ver=1.14.2&electron_parts=2#programming-and-debugging-notes)|[v0.5.2](/reference/device-os/firmware/photon/?fw_ver=0.5.2&cli_ver=1.15.0&electron_parts=2#programming-and-debugging-notes)|[v0.5.3](/reference/device-os/firmware/photon/?fw_ver=0.5.3&cli_ver=1.17.0&electron_parts=2#programming-and-debugging-notes)|[v0.5.4](/reference/device-os/firmware/photon/?fw_ver=0.5.4&cli_ver=1.24.1&electron_parts=2#programming-and-debugging-notes)|[v0.5.5](/reference/device-os/firmware/photon/?fw_ver=0.5.5&cli_ver=1.24.1&electron_parts=2#programming-and-debugging-notes)|-|
|v0.5.x-rc.x prereleases|[v0.5.3-rc.1](/reference/device-os/firmware/photon/?fw_ver=0.5.3-rc.1&cli_ver=1.15.0&electron_parts=2#programming-and-debugging-notes)|[v0.5.3-rc.2](/reference/device-os/firmware/photon/?fw_ver=0.5.3-rc.2&cli_ver=1.16.0&electron_parts=2#programming-and-debugging-notes)|[v0.5.3-rc.3](/reference/device-os/firmware/photon/?fw_ver=0.5.3-rc.3&cli_ver=1.16.0&electron_parts=2#programming-and-debugging-notes)|-|-|-|-|

<!--
CLI VERSION is compatable with FIRMWARE VERSION
v2.10.0 = 2.0.1 3.0.0-beta.1 3.0.0-rc.1
v2.9.0  = 2.0.0
v2.8.1  = 1.5.4-rc.2, 2.0.0-rc.3, 2.0.0-rc.4
v2.7.2  = 2.0.0-rc.1, 2.0.0-rc.2
v2.6.0  = 1.5.2, 1.5.4-rc.1
v2.5.0  = 1.5.1
v2.3.0  = 1.5.0, 1.5.1-rc.1
v2.1.0  = 1.5.0-rc.1, 1.5.0-rc.2
v1.53.0 = 1.4.4
v1.52.0 = 1.4.3
v1.49.0 = 1.4.2
v1.48.0 = 1.4.1
v1.47.0 = 1.4.0, 1.4.1-rc.1
v1.46.1 = 1.3.1
v1.43.3 = 1.3.1-rc.1, 1.4.0-rc.1
v1.43.1 = 1.2.1
v1.42.0 = 1.1.1
v1.41.2 = 1.1.1-rc.1, 1.2.1-rc.3, 1.3.0-rc.1
v1.41.1 = 1.2.1-rc.2
v1.41.0 = 1.1.0, 1.2.0-rc.1, 1.2.1-rc.1
v1.40.0 = 1.1.0-rc.1, 1.1.0-rc.2, 1.2.0-beta.1
v1.39.0 = 1.0.1
v1.38.0 = 1.0.1-rc.1
v1.37.0 = 1.0.0
v1.36.3 = 0.8.0-rc.14
v1.36.3 = 0.8.0-rc.12
v1.35.0 = 0.8.0-rc.11
v1.33.0 = 0.8.0-rc.10
v1.32.4 = 0.8.0-rc.9
v1.32.1 = 0.8.0-rc.8
v1.29.0 = 0.7.0, 0.8.0-rc.1, 0.8.0-rc2, 0.8.0-rc.3, 0.8.0-rc.4, 0.8.0-rc.7
v1.26.2 = 0.6.4
v1.25.0 = 0.6.3
v1.23.1 = 0.7.0-rc.1 support for WPA Enterprise setup
v1.22.0 = 0.6.2
v1.21.0 = 0.6.2-rc.1, 0.6.2-rc.2
v1.20.1 = 0.6.1
v1.19.4 = Particle Libraries v2
v1.18.0 = 0.6.0, 0.6.1-rc.1, 0.6.1-rc.2
v1.24.1 = 0.5.4 (technically this doesn't have 0.5.4 binaries in it for `particle update` but this was the version currently out when 0.5.4 was released)
v1.17.0 = 0.5.3, 0.6.0-rc.1, 0.6.0-rc.2
v1.16.0 = required to recognize system part 3 of electron, 0.5.3-rc.2, 0.5.3-rc.3
v1.15.0 = 0.5.2, 0.5.3-rc.1
v1.14.2 = 0.5.1
v1.12.0 = 0.5.0
-->

#### release-notes-wrapper

<!-- these empty if/endif blocks are required to be used first before any other use later on -->
##### @FW_VER@0.5.0if
##### @FW_VER@0.5.0endif
##### @FW_VER@0.5.1if
##### @FW_VER@0.5.1endif
##### @FW_VER@0.5.2if
##### @FW_VER@0.5.2endif
##### @FW_VER@0.5.3if
##### @FW_VER@0.5.3endif
##### @FW_VER@0.5.4if
##### @FW_VER@0.5.4endif
##### @FW_VER@0.5.5if
##### @FW_VER@0.5.5endif
##### @FW_VER@0.6.0if
##### @FW_VER@0.6.0endif
##### @FW_VER@0.6.1if
##### @FW_VER@0.6.1endif
##### @FW_VER@0.6.2if
##### @FW_VER@0.6.2endif
##### @FW_VER@0.6.3if
##### @FW_VER@0.6.3endif
##### @FW_VER@0.6.4if
##### @FW_VER@0.6.4endif
##### @FW_VER@0.7.0if
##### @FW_VER@0.7.0endif
##### @FW_VER@1.1.1if
##### @FW_VER@1.1.1endif
##### @FW_VER@1.2.1if
##### @FW_VER@1.2.1endif
##### @FW_VER@1.3.1if
##### @FW_VER@1.3.1endif
##### @FW_VER@1.4.0if
##### @FW_VER@1.4.0endif
##### @FW_VER@1.4.1if
##### @FW_VER@1.4.1endif
##### @FW_VER@1.4.2if
##### @FW_VER@1.4.2endif
##### @FW_VER@1.4.3if
##### @FW_VER@1.4.3endif
##### @FW_VER@1.4.4if
##### @FW_VER@1.4.4endif
##### @FW_VER@1.5.0if
##### @FW_VER@1.5.0endif
##### @FW_VER@1.5.1if
##### @FW_VER@1.5.1endif
##### @FW_VER@1.5.2if
##### @FW_VER@1.5.2endif
##### @FW_VER@1.5.4if
##### @FW_VER@1.5.4endif
##### @FW_VER@2.0.0if
##### @FW_VER@2.0.0endif
##### @FW_VER@2.1.0if
##### @FW_VER@2.1.0endif
##### @FW_VER@3.0.0if
##### @FW_VER@3.0.0endif
##### @CLI_VER@1.15.0if
##### @CLI_VER@1.15.0endif
##### @CLI_VER@1.17.0if
##### @CLI_VER@1.17.0endif
##### @CLI_VER@1.18.0if
##### @CLI_VER@1.18.0endif
##### @CLI_VER@1.20.1if
##### @CLI_VER@1.20.1endif
##### @CLI_VER@1.21.0if
##### @CLI_VER@1.21.0endif
##### @CLI_VER@1.22.0if
##### @CLI_VER@1.22.0endif
##### @CLI_VER@1.23.1if
##### @CLI_VER@1.23.1endif
##### @CLI_VER@1.24.1if
##### @CLI_VER@1.24.1endif
##### @CLI_VER@1.25.0if
##### @CLI_VER@1.25.0endif
##### @CLI_VER@1.26.2if
##### @CLI_VER@1.26.2endif
##### @CLI_VER@1.29.0if
##### @CLI_VER@1.29.0endif
##### @CLI_VER@1.32.1if
##### @CLI_VER@1.32.1endif
##### @CLI_VER@1.32.4if
##### @CLI_VER@1.32.4endif
##### @CLI_VER@1.33.0if
##### @CLI_VER@1.33.0endif
##### @CLI_VER@1.35.0if
##### @CLI_VER@1.35.0endif
##### @CLI_VER@1.36.3if
##### @CLI_VER@1.36.3endif
##### @CLI_VER@1.37.0if
##### @CLI_VER@1.37.0endif
##### @CLI_VER@1.38.0if
##### @CLI_VER@1.38.0endif
##### @CLI_VER@1.39.0if
##### @CLI_VER@1.39.0endif
##### @CLI_VER@1.40.0if
##### @CLI_VER@1.40.0endif
##### @CLI_VER@1.41.0if
##### @CLI_VER@1.41.0endif
##### @CLI_VER@1.41.1if
##### @CLI_VER@1.41.1endif
##### @CLI_VER@1.41.2if
##### @CLI_VER@1.41.2endif
##### @CLI_VER@1.42.0if
##### @CLI_VER@1.42.0endif
##### @CLI_VER@1.43.0if
##### @CLI_VER@1.43.0endif
##### @CLI_VER@1.43.1if
##### @CLI_VER@1.43.1endif
##### @CLI_VER@1.43.3if
##### @CLI_VER@1.43.3endif
##### @CLI_VER@1.46.1if
##### @CLI_VER@1.46.1endif
##### @CLI_VER@1.47.0if
##### @CLI_VER@1.47.0endif
##### @CLI_VER@1.48.0if
##### @CLI_VER@1.48.0endif
##### @CLI_VER@1.49.0if
##### @CLI_VER@1.49.0endif
##### @CLI_VER@1.52.0if
##### @CLI_VER@1.52.0endif
##### @CLI_VER@1.53.0if
##### @CLI_VER@1.53.0endif
##### @CLI_VER@2.1.0if
##### @CLI_VER@2.1.0endif
##### @CLI_VER@2.3.0if
##### @CLI_VER@2.3.0endif
##### @CLI_VER@2.5.0if
##### @CLI_VER@2.5.0endif
##### @CLI_VER@2.6.0if
##### @CLI_VER@2.6.0endif
##### @CLI_VER@2.7.2if
##### @CLI_VER@2.7.2endif
##### @CLI_VER@2.8.1if
##### @CLI_VER@2.8.1endif
##### @CLI_VER@2.9.0if
##### @CLI_VER@2.9.0endif
##### @CLI_VER@2.10.0if
##### @CLI_VER@2.10.0endif
##### @ELECTRON_PARTS@2if
##### @ELECTRON_PARTS@2endif
##### @ELECTRON_PARTS@3if
##### @ELECTRON_PARTS@3endif

<!-- HOW TO USE if/endif blocks
##### @FW_VER@0.5.3if
This is for firmware version 0.5.3 ONLY!
##### @FW_VER@0.5.3endif

##### @FW_VER@0.5.4if
This is for firmware version 0.5.4 ONLY!
##### @FW_VER@0.5.4endif

##### @FW_VER@0.5.3if
This is another for 0.5.3
##### @FW_VER@0.5.3endif

##### @ELECTRON_PARTS@3if
particle flash YOUR_DEVICE_NAME system-part3-@FW_VER@-electron.bin
##### @ELECTRON_PARTS@3endif
-->

The following instructions are for upgrading to **Device OS v@FW_VER@** which requires **Particle CLI v@CLI_VER@**.

**Updating Device OS Automatically**

To update your Photon or P1 Device OS version automatically, compile and flash your application in the [Web IDE](https://build.particle.io), selecting version **@FW_VER@** in the devices drawer. The app will be flashed, following by the system part1 and part2 firmware for Photon and P1. Other update instructions for Photon, P1 and Electron can be found below.

---

**The easy local method using Particle CLI**

##### @FW_VER@0.5.4if
**Note:** There is no version of the Particle CLI released that supports the `particle update` command for firmware version **@FW_VER@**. Please download the binaries and use one of the other supported programming methods.
##### @FW_VER@0.5.4endif

##### @FW_VER@0.5.5if
**Note:** There is no version of the Particle CLI released that supports the `particle update` command for firmware version **@FW_VER@**. Please download the binaries and use one of the other supported programming methods.
##### @FW_VER@0.5.5endif

The easiest way to upgrade to Device OS Version @FW_VER@ is to use the
Particle CLI with a single command.  You will first upgrade the Device
OS, then optionally program Tinker on the device. This **requires CLI version @CLI_VER@**. You can check with `particle --version`.

If you have the [Particle CLI](/tutorials/developer-tools/cli/) installed already, you can update it with the following command `sudo npm update -g particle-cli@v@CLI_VER@` (note: you can try without sudo first if you wish).

To upgrade Device OS, make sure the device is in [DFU mode](/tutorials/device-os/led#dfu-mode-device-firmware-upgrade-) (flashing yellow LED) and run these commands in order:

```
The easy local method using Particle CLI

1) Make sure the device is in DFU mode and run:

particle update

2) Optionally add Tinker as the user firmware instead of an app that you may currently have running on your device.  Have the device in DFU mode and run:

particle flash --usb tinker
```

---

**The OTA method using Particle CLI**

##### @FW_VER@0.6.0if
**Note:** You must update your Electron to (v0.5.3, v0.5.3-rc.2, or v0.5.3-rc.3) first before attempting to use OTA or YModem transfer to update to v0.6.0. If you use DFU over USB, you can update to v0.6.0 directly, but make sure you have installed v1.18.0 of the CLI first.
##### @FW_VER@0.6.0endif

##### @FW_VER@0.7.0if
**Note:** The following update sequence is required!

- First Update to 0.5.3 (if the current version is less than that)
- Then update to 0.6.3(Photon/P1) or 0.6.4(Electron) (if the current version is less than that)
- Then update to 0.7.0

##### @FW_VER@0.7.0endif

##### @FW_VER@1.1.1if
**Note:** The following update sequence is required!

- First Update to 0.5.3 (if the current version is less than that)
- Then update to 0.6.3(Photon/P1) or 0.6.4(Electron) (if the current version is less than that)
- Then update to 0.7.0
- Then update to 1.1.1

##### @FW_VER@1.1.1endif

##### @FW_VER@1.2.1if
**Note:** The following update sequence is required!

- First Update to 0.5.3 (if the current version is less than that)
- Then update to 0.6.3(Photon/P1) or 0.6.4(Electron) (if the current version is less than that)
- Then update to 0.7.0
- Then update to 1.2.1

##### @FW_VER@1.2.1endif

##### @FW_VER@1.3.1if
**Note:** The following update sequence is required!

- First Update to 0.5.3 (if the current version is less than that)
- Then update to 0.6.3(Photon/P1) or 0.6.4(Electron) (if the current version is less than that)
- Then update to 0.7.0
- Then update to 1.2.1
- Then update to 1.3.1

##### @FW_VER@1.3.1endif

##### @FW_VER@1.4.0if
**Note:** The following update sequence is required!

- First Update to 0.5.3 (if the current version is less than that)
- Then update to 0.6.3(Photon/P1) or 0.6.4(Electron) (if the current version is less than that)
- Then update to 0.7.0
- Then update to 1.2.1
- Then update to 1.4.0

##### @FW_VER@1.4.0endif

##### @FW_VER@1.4.1if
**Note:** The following update sequence is required!

- First Update to 0.5.3 (if the current version is less than that)
- Then update to 0.6.3(Photon/P1) or 0.6.4(Electron) (if the current version is less than that)
- Then update to 0.7.0
- Then update to 1.2.1
- Then update to 1.4.1

##### @FW_VER@1.4.1endif

##### @FW_VER@1.4.2if
**Note:** The following update sequence is required!

- First Update to 0.5.3 (if the current version is less than that)
- Then update to 0.6.3(Photon/P1) or 0.6.4(Electron) (if the current version is less than that)
- Then update to 0.7.0
- Then update to 1.2.1
- Then update to 1.4.2

##### @FW_VER@1.4.2endif

##### @FW_VER@1.4.3if
**Note:** The following update sequence is required!

- First Update to 0.5.3 (if the current version is less than that)
- Then update to 0.6.3(Photon/P1) or 0.6.4(Electron) (if the current version is less than that)
- Then update to 0.7.0
- Then update to 1.2.1
- Then update to 1.4.3

##### @FW_VER@1.4.3endif

##### @FW_VER@1.4.4if
**Note:** The following update sequence is required!

- First Update to 0.5.3 (if the current version is less than that)
- Then update to 0.6.3(Photon/P1) or 0.6.4(Electron) (if the current version is less than that)
- Then update to 0.7.0
- Then update to 1.2.1
- Then update to 1.4.4

##### @FW_VER@1.4.4endif

##### @FW_VER@1.5.0if
**Note:** The following update sequence is required!

- First Update to 0.5.3 (if the current version is less than that)
- Then update to 0.6.3(Photon/P1) or 0.6.4(Electron) (if the current version is less than that)
- Then update to 0.7.0
- Then update to 1.2.1
- Then update to 1.5.0

##### @FW_VER@1.5.0endif

**Note:** As a Product in the Console, when flashing a >= 0.6.0 user
app, Electrons can now Safe Mode Heal from < 0.5.3 to >= 0.6.0 firmware.
This will consume about 500KB of data as it has to transfer two 0.5.3
system parts and three >= 0.6.0 system parts. Devices will not
automatically update Device OS if not added as a Product in Console.

**Note**: You must download system binaries to a local directory on your machine for this to work. Binaries are attached to the bottom of the [GitHub Release Notes](#github-release-notes).

If your device is online, you can attempt to OTA (Over The Air) update these system parts as well with the Particle CLI.  Run the following commands in order for your device type:

##### @ELECTRON_PARTS@2if
```
The OTA method using Particle CLI

// Photon
particle flash YOUR_DEVICE_NAME system-part1-@FW_VER@-photon.bin
particle flash YOUR_DEVICE_NAME system-part2-@FW_VER@-photon.bin
particle flash YOUR_DEVICE_NAME tinker (optional)

// P1
particle flash YOUR_DEVICE_NAME system-part1-@FW_VER@-p1.bin
particle flash YOUR_DEVICE_NAME system-part2-@FW_VER@-p1.bin
particle flash YOUR_DEVICE_NAME tinker (optional)

// Electron
particle flash YOUR_DEVICE_NAME system-part1-@FW_VER@-electron.bin
particle flash YOUR_DEVICE_NAME system-part2-@FW_VER@-electron.bin
particle flash YOUR_DEVICE_NAME tinker (optional)
```
##### @ELECTRON_PARTS@2endif

##### @ELECTRON_PARTS@3if
```
The OTA method using Particle CLI


// Photon
particle flash YOUR_DEVICE_NAME system-part1-@FW_VER@-photon.bin
particle flash YOUR_DEVICE_NAME system-part2-@FW_VER@-photon.bin
particle flash YOUR_DEVICE_NAME tinker (optional)

// P1
particle flash YOUR_DEVICE_NAME system-part1-@FW_VER@-p1.bin
particle flash YOUR_DEVICE_NAME system-part2-@FW_VER@-p1.bin
particle flash YOUR_DEVICE_NAME tinker (optional)

// Electron
particle flash YOUR_DEVICE_NAME system-part1-@FW_VER@-electron.bin
particle flash YOUR_DEVICE_NAME system-part2-@FW_VER@-electron.bin
particle flash YOUR_DEVICE_NAME system-part3-@FW_VER@-electron.bin
particle flash YOUR_DEVICE_NAME tinker (optional)
```
##### @ELECTRON_PARTS@3endif

---

**The local method over USB using Particle CLI**

This **requires CLI version @CLI_VER@ or newer**. You can check with `particle --version`.

If you have the [Particle CLI](/tutorials/developer-tools/cli/) installed already, you can update it with the following command `sudo npm update -g particle-cli` (note: you can try without sudo first if you wish).

To upgrade Device OS, make sure the device is in [DFU mode](/tutorials/device-os/led#dfu-mode-device-firmware-upgrade-) (flashing yellow LED) and run these commands in order for your device type:

##### @ELECTRON_PARTS@2if
```
The local method over USB using Particle CLI

// Photon
particle flash --usb system-part1-@FW_VER@-photon.bin
particle flash --usb system-part2-@FW_VER@-photon.bin
particle flash --usb tinker (optional)

// P1
particle flash --usb system-part1-@FW_VER@-p1.bin
particle flash --usb system-part2-@FW_VER@-p1.bin
particle flash --usb tinker (optional)

// Electron
particle flash --usb system-part1-@FW_VER@-electron.bin
particle flash --usb system-part2-@FW_VER@-electron.bin
particle flash --usb tinker (optional)
```
##### @ELECTRON_PARTS@2endif

##### @ELECTRON_PARTS@3if
```
The local method over USB using Particle CLI

// Photon
particle flash --usb system-part1-@FW_VER@-photon.bin
particle flash --usb system-part2-@FW_VER@-photon.bin
particle flash --usb tinker (optional)

// P1
particle flash --usb system-part1-@FW_VER@-p1.bin
particle flash --usb system-part2-@FW_VER@-p1.bin
particle flash --usb tinker (optional)

// Electron
particle flash --usb system-part1-@FW_VER@-electron.bin
particle flash --usb system-part2-@FW_VER@-electron.bin
particle flash --usb system-part3-@FW_VER@-electron.bin
particle flash --usb tinker (optional)
```
##### @ELECTRON_PARTS@3endif

---

**The local DFU-UTIL method**
can be applied to offline devices locally over USB using `dfu-util`
- Put the device in [DFU mode](/tutorials/device-os/led#dfu-mode-device-firmware-upgrade-) (flashing yellow LED)
- open a terminal window, change to the directory where you downloaded the files above, and run these commands in order for your device type:

##### @ELECTRON_PARTS@2if
```
The local DFU-UTIL method

// Photon
dfu-util -d 2b04:d006 -a 0 -s 0x8020000 -D system-part1-@FW_VER@-photon.bin
dfu-util -d 2b04:d006 -a 0 -s 0x8060000:leave -D system-part2-@FW_VER@-photon.bin

// P1
dfu-util -d 2b04:d008 -a 0 -s 0x8020000 -D system-part1-@FW_VER@-p1.bin
dfu-util -d 2b04:d008 -a 0 -s 0x8060000:leave -D system-part2-@FW_VER@-p1.bin

// Electron
dfu-util -d 2b04:d00a -a 0 -s 0x8020000 -D system-part1-@FW_VER@-electron.bin
dfu-util -d 2b04:d00a -a 0 -s 0x8040000:leave -D system-part2-@FW_VER@-electron.bin
```
##### @ELECTRON_PARTS@2endif

##### @ELECTRON_PARTS@3if
```
The local DFU-UTIL method


// Photon
dfu-util -d 2b04:d006 -a 0 -s 0x8020000 -D system-part1-@FW_VER@-photon.bin
dfu-util -d 2b04:d006 -a 0 -s 0x8060000:leave -D system-part2-@FW_VER@-photon.bin

// P1
dfu-util -d 2b04:d008 -a 0 -s 0x8020000 -D system-part1-@FW_VER@-p1.bin
dfu-util -d 2b04:d008 -a 0 -s 0x8060000:leave -D system-part2-@FW_VER@-p1.bin

// Electron
dfu-util -d 2b04:d00a -a 0 -s 0x8060000 -D system-part1-@FW_VER@-electron.bin
dfu-util -d 2b04:d00a -a 0 -s 0x8020000 -D system-part2-@FW_VER@-electron.bin
dfu-util -d 2b04:d00a -a 0 -s 0x8040000:leave -D system-part3-@FW_VER@-electron.bin
```
##### @ELECTRON_PARTS@3endif

---

**Downgrading from @FW_VER@ to current default firmware**

Current default Device OS would be the latest non-rc.x firmware version.  E.g. if the current list of default releases was 0.5.3, 0.6.0, **0.6.1** (would be the latest).

##### @FW_VER@0.5.1if
**Caution:** After upgrading to 0.5.1, DO NOT downgrade Device OS via OTA remotely! This will cause Wi-Fi credentials to be erased on the Photon and P1.  This does not affect the Electron.  Feel free to downgrade locally with the understanding that you will have to re-enter Wi-Fi credentials.  Also note that 0.5.1 fixes several important bugs, so there should be no reason you'd normally want to downgrade.
##### @FW_VER@0.5.1endif

##### @FW_VER@0.5.2if
**Note:** Upgrading to 0.5.2 will now allow you to downgrade remotely OTA to v0.5.0 or earlier without erasing Wi-Fi credentials.  There are still some cases where a downgrade will erase credentials, but only if you have explicitly set the country code to something other than the `default` or `JP2`.  For example, if you set the country code to `GB0` or `US4`, if you downgrade to v0.5.0 your Wi-Fi credentials will be erased.  Leaving the country code at `default` or set to `JP2` will not erase credentials when downgrading to v0.5.0.  **Do not** downgrade to v0.5.1 first, and then v0.5.0... this will erase credentials in all cases.
##### @FW_VER@0.5.2endif

##### @FW_VER@0.7.0if
**Note:** If you need to downgrade, you must downgrade to 0.6.3(Photon/P1) or 0.6.4(Electron) to ensure that the bootloader downgrades automatically. When downgrading to older versions, downgrade to 0.6.3(Photon/P1) or 0.6.4(Electron) first, then to an older version such as 0.5.3. You will have to manually downgrade the bootloader as well (see release notes in 0.7.0-rc.3 release)
##### @FW_VER@0.7.0endif

##### @FW_VER@0.7.0if
**Note:** The following is not applicable for 0.7.0, please see above.
##### @FW_VER@0.7.0endif
The easiest way to downgrade from a Device OS Version @FW_VER@ is to use the Particle CLI with a single command.  You will first put the Tinker back on the device, then downgrade the Device OS. Running the commands in this order prevents the device from automatically re-upgrading (based on user app version dependencies) after downgrading.  This will **require a CLI version associated with your desired default firmware**. To determine which version to use, click on the default version desired in the table under [Programming and Debugging Notes](#programming-and-debugging-notes) and refer to the CLI version required in **The easy local method using Particle CLI** section.

If you have the [Particle CLI](/tutorials/developer-tools/cli/) installed already, you can install a specific version like v1.16.0 with the following command `sudo npm update -g particle-cli@v1.16.0` (note: you can try without sudo first if you wish).  Replace v1.16.0 with your desired version.

To downgrade Device OS, make sure the device is in [DFU mode](/tutorials/device-os/led#dfu-mode-device-firmware-upgrade-) (flashing yellow LED) and run these commands in order:

```
Downgrading from @FW_VER@ to current default firmware

1) Make sure Tinker is installed, instead of a @FW_VER@ app that you may currently have running on your device.  Have the device in DFU mode and run:

particle flash --usb tinker

2) Make sure the device is in DFU mode and run:

particle update
```

**Note:** The CLI and `particle update` command is only updated when default firmware versions are released.  This is why we install a specific version of the CLI to get a specific older version of default firmware.

---

**Debugging for Electron**

##### Instructions on using the Tinker USB Debugging app [are here](https://docs.google.com/document/d/1NdYxPPk_i_mM2wM9oSbSZB1ElDlHA_x-IHY-UC7w62M/pub)
This is useful for simply capturing the Electron's connection process.

---

##### Instructions on using the Electron Troubleshooting app [are here](https://docs.google.com/document/d/1U_Wzy2SPRC3hZnKtw8d6QN2Tm8Q7QwtEbSUAeTkO3bk/pub)
This is useful for interacting with the Electron's connection process.

#### release-notes-wrapper
