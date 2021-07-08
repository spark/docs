---
title: Particle API JS (Javascript SDK)
layout: commonTwo.hbs
columns: three
description: Manage your Particle IoT device your IoT device from a web browser or server (node.js) using Javascript
---

# Particle API JS

ParticleJS is JavaScript library for the Particle Device Cloud API for Node.js and the browser.
It's [open source](https://github.com/particle-iot/particle-api-js) so you can edit, change or even send in pull requests if you want to share!

This page contains examples to get started using the library.

For more details, see the [detailed reference below](#detailed-reference) and check the
[examples folder on GitHub](https://github.com/particle-iot/particle-api-js/blob/master/examples).

## Installation

### Node.js

First, make sure you have [node.js](http://nodejs.org/) installed!

Next, open a command prompt or terminal, and install by typing:

```shell
$ npm install particle-api-js
```

### Browser

Particle API JS can be included using bower:

```shell
$ bower install particle-api-js
```

Alternately, you can pull in Particle API JS from the JSDelivr and simply include the script in your HTML.

```html
<script type="text/javascript" src="https://cdn.jsdelivr.net/npm/particle-api-js@8/dist/particle.min.js">
</script>
```

Now you will have a `Particle` object available that you can use in your application.

## Responses

All functions in this library return [promises](https://promisesaplus.com/).

```javascript
particle.login({username: 'email@example.com', password: 'pass'}).then(
  function(data){
    console.log('API call completed on promise resolve: ', data.body.access_token);
  },
  function(err) {
    console.log('API call completed on promise fail: ', err);
  }
);
```

# Examples

Here are some common use cases of using the functions in the Javascript library.

## Logging in

### login

You can create an account [here](https://build.particle.io/signup). Use the token from [`login`](#login) as the `auth` parameter in other calls.

```javascript
var Particle = require('particle-api-js');
var particle = new Particle();
var token;

particle.login({username: 'user@email.com', password: 'pass'}).then(
  function(data) {
    token = data.body.access_token;
  },
  function (err) {
    console.log('Could not log in.', err);
  }
);
```

## Device management

### listDevices

List devices for a user with [`listDevices`](#listdevices).

```javascript
var token; // from result of particle.login
var devicesPr = particle.listDevices({ auth: token });

devicesPr.then(
  function(devices){
    console.log('Devices: ', devices);
  },
  function(err) {
    console.log('List devices call failed: ', err);
  }
);
```


### callFunction

Call a function in device with [`callFunction`](#callfunction).

```javascript
var fnPr = particle.callFunction({ deviceId: 'DEVICE_ID', name: 'brew', argument: 'D0:HIGH', auth: token });

fnPr.then(
  function(data) {
    console.log('Function called succesfully:', data);
  }, function(err) {
    console.log('An error occurred:', err);
  });
```

The function needs to be defined in the firmware uploaded to the
device and registered to the Particle cloud.

You pass along the name of the function and the params.

If the function call succeeds, `data.body.return_value` is the value returned by the function call on the Particle device.

### claimDevice

Claims device and adds it to the user account with [`claimDevice`](#claimdevice)

```javascript
particle.claimDevice({ deviceId: 'DEVICE_ID', auth: token }).then(function(data) {
  console.log('device claim data:', data);
}, function(err) {
  console.log('device claim err:', err);
});
```

### flashDevice

Flash firmware to device with [`flashDevice`](#flashdevice)

```javascript
particle.flashDevice({ deviceId: 'DEVICE_ID', files: { file1: './path/file1' }, auth: token }).then(function(data) {
  console.log('Device flashing started successfully:', data);
}, function(err) {
  console.log('An error occurred while flashing the device:', err);
});
```

### getDevice

Gets all attributes for the device with [`getDevice`](#getdevice)

```javascript
var devicesPr = particle.getDevice({ deviceId: 'DEVICE_ID', auth: token });

devicesPr.then(
  function(data){
    console.log('Device attrs retrieved successfully:', data);
  },
  function(err) {
    console.log('API call failed: ', err);
  }
);
```

### getVariable

Gets a variable value for the device with [`getVariable`](#getvariable)

```javascript
particle.getVariable({ deviceId: 'DEVICE_ID', name: 'temp', auth: token }).then(function(data) {
  console.log('Device variable retrieved successfully:', data);
}, function(err) {
  console.log('An error occurred while getting attrs:', err);
});
```

The variable needs to be defined in your device's code.

If getting the variable succeeds, `data.body.result` is the value of the variable on the Particle device.


### removeDevice

Removes device from the user account with [`removeDevice`](#removedevice)

```javascript
particle.removeDevice({ deviceId: 'DEVICE_ID', auth: token }).then(function(data) {
  console.log('remove call response:', data);
}, function(err) {
  console.log('An error occurred while removing:', err);
});
```

### renameDevice

Renames device for the user account with [`renameDevice`](#renamedevice)

```javascript
particle.renameDevice({ deviceId: 'DEVICE_ID', name: 'new-name', auth: token }).then(function(data) {
  console.log('Device renamed successfully:', data);
}, function(err) {
  console.log('An error occurred while renaming device:', err);
});
```

### signalDevice

Send a signal to the device to shout rainbows with [`signalDevice`](#signaldevice)

```javascript
particle.signalDevice({ deviceId: 'DEVICE_ID', signal: true, auth: token }).then(function(data) {
  console.log('Device is shouting rainbows:', data);
}, function(err) {
  console.log('Error sending a signal to the device:', err);
});
```

Send a signal to the device to stop shouting rainbows

```javascript
particle.signalDevice({ deviceId: 'DEVICE_ID', signal: false, auth: token }).then(function(data) {
  console.log('The LED is back to normal:', data);
}, function(err) {
  console.log('Error sending a signal to the device:', err);
});
```

### sendPublicKey

Send public key for a device to the cloud with [`sendPublicKey`](#sendpublickey)

```javascript
particle.sendPublicKey({ deviceId: 'DEVICE_ID', key: 'key', auth: token }).then(function(data) {
  console.log('Public key sent successfully:', data);
}, function(err) {
  console.log('Error sending public key to the device:', err);
});
```

### getEventStream

Get event listener to an stream in the Particle cloud with [`getEventStream`](#geteventstream)

```javascript
//Get events filtered by name
particle.getEventStream({ name: 'x', auth: token}).then(function(stream) {
  stream.on('event', function(data) {
    console.log("Event: ", data);
  });
});

//Get your devices events
particle.getEventStream({ deviceId: 'mine', auth: token }).then(function(stream) {
  stream.on('event', function(data) {
    console.log("Event: ", data);
  });
});

//Get test event for specific device
particle.getEventStream({ deviceId: 'DEVICE_ID', name: 'test', auth: token }).then(function(stream) {
  stream.on('event', function(data) {
    console.log("Event: ", data);
  });
});
```

---

`data` is an object with the following properties

```
{
  "name":"Uptime",
  "data":"5:28:54",
  "ttl":"60",
  "published_at":"2014-MM-DDTHH:mm:ss.000Z",
  "coreid":"012345678901234567890123"
}
```

---

When a network error occurs or the event stream has not received a heartbeat from the Particle API in 13 seconds, the event stream will disconnect and attempt to reconnect after 2 seconds. To customize the reconnection behavior, close the stream in the disconnect handler.

```
// This is not a functional reconnection implementation, only an illustration of the various events
let attempts = 10;
particle.getEventStream(options).then(function(stream) {
  stream.on('disconnect', function() {
    console.log('Disconnected from Particle event stream');
    attempts--;
    if (attempts <= 0) {
      console.log('Giving up reconnecting');
      stream.abort();
    }
  });
  stream.on('reconnect', function() {
    console.log('Attempting to reconnect to Particle event stream');
  });
  stream.on('reconnect-success', function() {
    console.log('Reconnected to Particle event stream');
    attempts = 10;
  });
  stream.on('reconnect-error', function(error) {
    console.log('Failed to reconnect to Particle event stream', error);
  });
});
```

---

In case your event handler throws an exception, the `error` event will be emitted.

```
particle.getEventStream(options).then(function(stream) {
  stream.on('event', function(data) {
    throw new Error('oops');
  });
  stream.on('error', function(error) {
    console.log('Error in handler', error);
  });
});
```

### publishEvent

Register an event stream in the Particle cloud with [`publishEvent`](#publishevent)

```javascript
var publishEventPr = particle.publishEvent({ name: 'test', data: JSON.stringify({ ok: true }), auth: token });

publishEventPr.then(
  function(data) {
    if (data.body.ok) { console.log("Event published succesfully") }
  },
  function(err) {
    console.log("Failed to publish event: " + err)
  }
);
```

## Working with code

### compileCode

Compiles files in the Particle cloud with [`compileCode`](#compilecode)

```javascript
var ccPr = particle.compileCode({ files: { 'main.cpp': './project/main.cpp', 'my_lib/lib.cpp': './project/my_lib/lib.cpp' }, auth: token });

ccPr.then(
  function(data) {
    console.log('Code compilation started successfully:', data);
  }, function(err) {
    console.log('An error occurred while compiling the code:', err);
  });
```

### Flashing

Flash firmware to a device with [`flashDevice`](#flashdevice)

## User management

### createUser

Creates a user in the Particle cloud with [`createUser`](#createuser)

```javascript
particle.createUser({ username: 'example@email.com', password: 'pass' }).then(function(data) {
```

We try to login and get back an accessToken to verify user creation

```javascript
  var loginPromise = particle.login('example@email.com', 'pass');
```

We'll use promises to check the result of the login process

```javascript
    loginPromise.then(
      function(data) {
        console.log('Login successful! access_token:', data.access_token);
      },
      function(err) {
        console.log('Login failed:', err);
      }
    );
  }
});
```

### listAccessTokens

Lists access tokens from the Particle cloud for the specified user with [`listAccessTokens`](#listaccesstokens)

```javascript
particle.listAccessTokens({ username: 'u@m.com', password: 'pass' }).then(function(data) {
  console.log('data on listing access tokens: ', data);
}, function(err) {
  console.log('error on listing access tokens: ', err);
});
```

### deleteAccessToken

Removes an access token from the Particle cloud for the specified user with [`deleteAccessToken`](#deleteaccesstoken)

```javascript
particle.deleteAccessToken({ username: 'u@m.com', password: 'pass', token: 'token' }).then(function(data) {
  console.log('data on deleting accessToken: ', data);
}, function(err) {
  console.log('error on deleting accessToken: ', err);
});
```

## Product support

If you are a product creator you can use the Javascript library to manage devices, firmware, integrations, and more.

Many of the functions in the Javascript library accept a `product` parameter. Pass your product ID number (such as 4567) or the slug (such as `myproduct-v100`) to make that function act on that product.

## Detailed reference

Here a full reference of every function available in the Javascript
client library.

{{!--
  The detailed Javascript docs are automatically generated from JSDoc comments
  in the source code of the library.  To fix any issues in the generated
  documentation, edit the source code at https://github.com/particle-iot/particle-api-js
  and make a pull request with your changes on that repository. The docs will be
  automatically updated with the new content.
--}}

GENERATED_JAVASCRIPT_DOCS
