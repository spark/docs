---
title: Cloud API
layout: api.hbs
columns: three
order: 30
description: Control and manage Particle IoT devices from the Internet with a REST API
---

{{!--
  The Cloud API documentation is auto-generated from an internal repository.
  To make a change, please open a GitHub issue with your change and
  someone from Particle will be happy to merge it in for you!
--}}

# Particle Device Cloud API

The Particle Device Cloud API is a [REST](http://en.wikipedia.org/wiki/Representational_State_Transfer) API.
REST means a lot of things, but first and foremost it means that we use the URL in the way that it's intended:
as a "Uniform Resource Locator".

In this case, the unique "resource" in question is your device (Core, Photon, Electron).
Every device has a URL, which can be used to `GET` variables, `POST` a function call, or `PUT` new firmware.
The variables and functions that you have written in your firmware are exposed as *subresources* under the device.

All requests to the device come through our API server using TLS security.

```
PROTOCOL AND HOST
"https://api.particle.io"
```

*Formatting note:* When we write something prefixed with a colon `:`, we mean you should substitute your own information.
For example when you see something like `/v1/devices/:deviceId`
you might code something like `/v1/devices/55ff8800beefcafe12345678`.

![Product ID or slug](/assets/images/productIdOrSlug.png)

For product endpoints, you need to specify which product the API call targets. You can use either the product ID or the short alphanumerical product slug. Get either from the Console. In this example, the product ID is 1337 and the product slug is `my-product-v1`.

## Format

The Particle API accepts requests in [JSON](https://www.w3schools.com/js/js_json_intro.asp) (content type `application/json`) and in [form encoded format](https://en.wikipedia.org/wiki/POST_(HTTP%29) (content type `application/x-www-form-urlencoded`). It always replies with JSON (content type `application/json`).

```bash
# Example with form encoded format
curl https://api.particle.io/v1/devices/mydevice/wakeup \
     -d arg=please \
     -d access_token=1234

# Same example with JSON
curl "https://api.particle.io/v1/devices/mydevice/wakeup?access_token=1234" \
     -H "Content-Type: application/json" \
     -d "{\"arg\": \"please\"}"
```

In these docs, you'll see example calls written using a terminal program called [curl](https://curl.haxx.se/) which may already be available on your machine.

The examples use form encoded data to make them easier to read and type but unless specified otherwise any endpoint can also accept a JSON object with the parameters as properties.

## Postman

In addition to using curl, you can use [Postman](https://www.postman.com/) a 3rd-party product that provides a web-based graphical interface for making API calls.

To making using Postman significantly easier, download [postman.zip](/assets/files/postman.zip) and extract the two files:

- Particle Device Cloud API.postman_collection.json
- Particle Postman Environment.postman_environment.json

Use the **Import** feature to import these two files into Postman.

{{imageOverlay src="/assets/images/postman/import.png" alt="Import"}}

Once you've imported the Particle Postman Environment you can select it from the popup in the upper right corner of the Postman workspace window.

{{imageOverlay src="/assets/images/postman/set-environment.png" alt="Set Environment"}}


### Authenticating with Postman

Using a quickly expiring access token is a good way to maintain security when using Postman. You can easily do this using the [Particle CLI](/reference/developer-tools/cli/#particle-token-create).

The parameter is the number of seconds, so 3600 is one hour. If you leave off the `--expires-in` option, the token will be good for 90 days. You can also create a non-expiring token.

`
particle token create --expires-in 3600
`

- To use this token, select **Particle Postman Environment** in the upper right corner of the Postman workspace  (1). 

- Click the eye icon next to it to view the configuration (2).

- Paste in the access token in the `access_token` field (3).

{{imageOverlay src="/assets/images/postman/access-token.png" alt="Access Token" }}


It's also possible to enter your username and password in the Postman environment, and also possible to generate the token from within Postman itself. However, these techniques are hard to use if you have multi-factor authentication (MFA) enabled on your Particle account. The CLI and `access_token` technique above works both with and without MFA enabled.

### Example: List devices

A good way to test out your access token is use **List devices**.

- Open **Collections** then **Particle Device Cloud API** then **Devices** then **List devices**.

- If you've entered the access_token in the previous step, there should be a small green circle on the **Authorization** tab.

- Click the blue **Send** button.

{{imageOverlay src="/assets/images/postman/list-devices.png" alt="List Devices" }}


You should get output with information about your devices in the bottom pane.

{{imageOverlay src="/assets/images/postman/list-output.png" alt="List Output" }}


### Example: Calling a function

- Open **Collections** then **Particle Device Cloud API** then **Devices** then **Call a function**.

- In the **Params** tab, enter the device ID you want to call in **deviceid** and the function name in **functionName**. 
In this case, we're using the Blink and LED firmware on the device, so it will respond to the **led** function.

{{imageOverlay src="/assets/images/postman/function-name.png" alt="Function Name" }}


- You don't need to enter anything in the **Authorization** tab, but this is how the data gets from the Environment into the API call.

{{imageOverlay src="/assets/images/postman/authorization.png" alt="Authorization" }}

- In this example, we're passing the value **on** in the **arg** parameter. This turns on the blue D7 LED on the device with the Blink and LED firmware.

{{imageOverlay src="/assets/images/postman/call-function-body.png" alt="Call function" }}

- Click **Send**. It will also show some output in the bottom pane if the device is online and is running the appropriate firmware.


## Authentication

Just because you've connected your Particle device to the internet doesn't mean anyone else should have access to it.
Permissions for controlling and communicating with your Particle device are managed with OAuth2.

```bash
# You type in your terminal
curl https://api.particle.io/v1/devices/0123456789abcdef01234567/brew \
     -d access_token=9876987698769876987698769876987698769876
# Response status is 200 OK, which means
# the device says, "Yes ma'am!"

# Sneaky Pete tries the same thing in his terminal
curl https://api.particle.io/v1/devices/0123456789abcdef01234567/brew \
     -d access_token=1234123412341234123412341234123412341234
# Response status is 403 Forbidden, which means
# the device says, "You ain't the boss of me."

# LESSON: Protect your access token.
```

You can create an access token using [the Particle CLI](/reference/developer-tools/cli/#particle-token-create).

When you connect your Particle device to the Cloud for the first time, it will be associated with your account,
and only you will have permission to control your Particle device—using your access token.

If you need to transfer ownership of the device to another user, the easiest way is to simply log into the [Particle build site](https://build.particle.io), click on the 'Devices' drawer on the bottom left, and then click the small 'right arrow' by the device you want to release, then click "Remove Device". This will make it possible for the other person you are transferring the device to, to go through the normal [claiming process](https://setup.particle.io).

In the future, you will be able to provision access to your Particle device to other accounts
and to third-party app developers; however, these features are not yet available.



### How to send your access token

There are three ways to send your access token in a request.

* In an HTTP Authorization header (always works)
* In the URL query string (only works with GET requests)
* In the request body (only works for POST, PUT and DELETE when body is form encoded)

---

To send a custom header using curl, use you the `-H` flag.
The access token is called a "Bearer" token and goes in the standard
HTTP `Authorization` header.

``` bash
curl -H "Authorization: Bearer 38bb7b318cc6898c80317decb34525844bc9db55" \
  https://...
```

---

The query string is the part of the URL after a `?` question mark.
To send the access token in the query string just add `access_token=38bb...`.
Because your terminal may think the question mark is special, enclose
the entire URL in double quotes.

``` bash
curl "https://api.particle.io/v1/devices?access_token=38bb7b318cc6898c80317decb34525844bc9db55"
```

---

The request body is how form contents are submitted on the web.
Using curl, each parameter you send, including the access token is preceded by a `-d` flag.
By default, if you add a `-d` flag, curl assumes that the request is a POST.
If you need a different request type, you have to specifically say so with the `-X` flag,
for example `-X PUT`.

``` bash
curl -d access_token=38bb7b318cc6898c80317decb34525844bc9db55 \
  https://...
```


{{> api group=apiGroups.Authentication}}

## OAuth Clients

An OAuth client generally represents an app.
The Particle CLI is a client, as are the Particle Web IDE, the Particle iOS app, and
the Particle Android app. You too can create your own clients.
You should create separate clients for each of your web and mobile apps that hit
the Particle API.

Some requests, like generating an access token, require you to specify an OAuth
client ID and secret using HTTP Basic authentication. Normally, when calling the
Particle API as a single developer user to access your own account, you can use
`particle` for both the client ID and secret as in the example above for
generating an access token.

```bash
curl -u particle:particle https://...
```

However, especially when you are *creating a product* on the Particle platform
and your web app needs to hit our API on behalf of your customers, you need to
create your own client.

*NEVER expose the client secret to a browser.*
If, for example, you have a client that controls all your organization's
products, and you use the client secret in front-end JavaScript, then a
tech-savvy customer using your website can read the secret in her developer
console and hack all your customers' devices.

{{> api group=apiGroups.OAuth}}

## Errors

The Particle Device Cloud uses traditional HTTP response codes to provide feedback from the device regarding the validity
of the request and its success or failure. As with other HTTP resources, response codes in the 200 range
indicate success; codes in the 400 range indicate failure due to the information provided;
codes in the 500 range indicate failure within Particle's server infrastructure.

```html
200 OK - API call successfully delivered to the device and executed.

400 Bad Request - Your request is not understood by the device, or the requested subresource (variable/function) has not been exposed.

401 Unauthorized - Your access token is not valid.

403 Forbidden - Your access token is not authorized to interface with this device.

404 Not Found - The device you requested is not currently connected to the cloud.

408 Timed Out - The cloud experienced a significant delay when trying to reach the device.

429 Too Many Requests - You are either making requests too often or too many at the same time. Please slow down.

500 Server errors - Fail whale. Something's wrong on our end.
```

## API rate limits

There is an API rate limit of approximately 10 calls per second to api.particle.io from each public IP address. This limit is the total number of requests from a public IP address and does not depend on the access token or API endpoint used.

#### Beware of monitoring variables for change

One situation that can cause problems is continuously monitoring variables for change. If you're polling every few seconds it's not a problem for a single device and variable. But if you are trying to monitor many devices, or have a classroom of students each polling their own device, you can easily exceed the API rate limit.

Having the device call [Particle.publish](/cards/firmware/cloud-functions/particle-publish/) when the value changes may be more efficient.

#### Make sure you handle error conditions properly

If you get a 401 (Unauthorized), your access token has probably expired so retransmitting the request won't help.

If you get a 429 (Too many requests) you've already hit the limit, so making another request immediately will not help.

In response to most error conditions you may want to consider a delay before retrying the request.

## Versioning

The API endpoints all start with `/v1` to represent the first official
version of the Particle Device Cloud API.
The existing API is stable, and we may add new endpoints with the `/v1` prefix.

If in the future we make backwards-incompatible changes to the API, the new endpoints will start with
something different, probably `/v2`.  If we decide to deprecate any `/v1` endpoints,
we'll give you lots of notice and a clear upgrade path.

## Devices

Note: Cellular devices may indicate that the device is online for up to 46 minutes after the device has gone offline because it went out of range or was powered off. Wi-Fi devices will generally be accurate to within a few minutes. Online indications are should occur immediately if the device was previously offline for both cellular and Wi-Fi.

{{> api group=apiGroups.Devices}}
## Remote Diagnostics
{{> api group=apiGroups.Diagnostics}}
## User
{{> api group=apiGroups.User}}
## Quarantine
{{> api group=apiGroups.Quarantine}}
## SIM Cards
{{> api group=apiGroups.Sims}}
## Events
{{> api group=apiGroups.Events}}
## Integrations [Webhooks]
{{> api group=apiGroups.Integrations}}
## Special Events

If you watch your event stream, you may notice your devices publishing events that don't appear in your firmware.  The
cloud will automatically publish events in special situations that would be hard to monitor without an event.

### Special Device Events

#### Connection Status

When your device starts ("online") or stops ("offline") a session with the cloud, you'll see a 'spark/status' event.

```
# spark/status, online
{"name":"spark/status","data":"online","ttl":"60","published_at":"2015-01-01T14:29:49.787Z","coreid":"0123456789abcdef01234567"}
    
# spark/status, offline
{"name":"spark/status","data":"offline","ttl":"60","published_at":"2015-01-01T14:31:49.787Z","coreid":"0123456789abcdef01234567"}
```

For cellular devices (Electron, E Series) and Gen 3 devices (Argon, Boron, and Xenon), online events occur only on a full handshake with the cloud. Sleeping for short periods of time (under 23 minutes) will not cause an online event. Offline events are never generated for cellular or Gen 3 devices.

For Wi-Fi devices (Photon, P1, Core), online events occur on every connection to the cloud and after any length of sleep. If you abruptly power off the device an offline event may take some time to occur.

If your device is a packaged product, you may see an "auto-update" event from time to time.  This is the cloud 
signaling that a new version of firmware is available for your product from your manufacturer, and an update is 
about to be delivered over the air.

```
#  spark/status, auto-update
{"name":"spark/status","data":"auto-update","ttl":"60","published_at":"2015-01-01T14:35:0.000Z","coreid":"0123456789abcdef01234567"}
```
    
    
#### Safe-Mode

If your device is running an app that needs a particular version of
Device OS, your device may come online and
report that it's in Safe Mode.  In this case, your device is waiting to run your app until it has received an update.
Some products can receive system updates automatically while in safe mode, but others like the Electron prevent this to
save you costs on bandwidth.  If you do get an automatic update, you may see a "spark/safe-mode-updater/updating" event.

```
#  spark/status/safe-mode
{"name":"spark/status/safe-mode","data":"{ .. a bunch of data from your device about the system parts ...","ttl":"60","published_at":"2016-01-01T14:40:0.000Z","coreid":"0123456789abcdef01234567"}
{"name":"spark/status/safe-mode","data":"{\"f\":[],\"v\":{},\"p\":6,\"m\":[{\"s\":16384,\"l\":\"m\",\"vc\":30,\"vv\":30,\"f\":\"b\",\"n\":\"0\",\"v\":4,\"d\":[]},{\"s\":262144,\"l\":\"m\",\"vc\":30,\"vv\":30,\"f\":\"s\",\"n\":\"1\",\"v\":11,\"d\":[]},{\"s\":262144,\"l\":\"m\",\"vc\":30,\"vv\":30,\"f\":\"s\",\"n\":\"2\",\"v\":7,\"d\":[{\"f\":\"s\",\"n\":\"1\",\"v\":7,\"_\":\"\"}]},{\"s\":131072,\"l\":\"m\",\"vc\":30,\"vv\":26,\"u\":\"F3380CF3018C104BA3BD9438EA921A1ABF315E8063318FDDDCDBE10FED044BEB\",\"f\":\"u\",\"n\":\"1\",\"v\":3,\"d\":[{\"f\":\"s\",\"n\":\"2\",\"v\":11,\"_\":\"\"}]},{\"s\":131072,\"l\":\"f\",\"vc\":30,\"vv\":0,\"d\":[]}]}","ttl":"60","published_at":"2015-01-01T14:40:0.000Z","coreid":"0123456789abcdef01234567"}

#  spark/safe-mode-updater/updating
{"name":"spark/safe-mode-updater/updating","data":"2","ttl":"60","published_at":"2016-01-01T14:41:0.000Z","coreid":"particle-internal"}
```


#### Flashing

As updates are being delivered via the cloud to your device, you may see some events published by the cloud to help
you monitor the update.  These may include an optional file name after the status type if available.


```
#spark/flash/status, started + [filename]
{"name":"spark/flash/status","data":"started ","ttl":"60","published_at":"2016-02-09T14:43:05.606Z","coreid":"0123456789abcdef01234567"}

#spark/flash/status, success + [filename]
{"name":"spark/flash/status","data":"success ","ttl":"60","published_at":"2016-02-09T14:38:18.978Z","coreid":"0123456789abcdef01234567"}
   
#spark/flash/status, failed + [filename]
{"name":"spark/flash/status","data":"failed ","ttl":"60","published_at":"2016-02-09T14:43:11.732Z","coreid":"0123456789abcdef01234567"}
```

#### app-hash

After you've flashed a new app to your device, you may see an "app-hash" event.  This is a unique hash corresponding
to that exact app binary.  This hash can help confirm a flash succeeded and your new app is running, and also help you
track exactly which version of which app is running on your device.  This is only published when it is different from
the previous session.

```
#  spark/device/app-hash
{"name":"spark/device/app-hash","data":"2BA4E71E840F596B812003882AAE7CA6496F1590CA4A049310AF76EAF11C943A","ttl":"60","published_at":"2016-02-09T14:43:13.040Z","coreid":"2e0041000447343232363230"}
```



#### future reserved events

These events are planned, but not yet available.

If an update is available from the cloud, but isn't sent automatically, the cloud may publish
an "flash/available" event to let the firmware know it can ask to have the update delivered.

```
#  spark/flash/available
{ reserved / not yet implemented}
```

If the cloud detects than an update is very large, or the update is taking a very long time,
it might decide to publish periodic flash progress events.  These are meant to help you track the progress of a slow
update.

```
# spark/flash/progress,   sent,total,seconds
{ reserved / not yet implemented }
```



### Special Webhook Events

Webhooks are a powerful way to connect events from your devices to other services online.

When the webhook detects your event, it'll publish back a hook-sent event to let you know it's processing the event and
has sent a request to your server.

```
# hook-sent
{"name":"hook-sent/your_published_event_topic","data":"undefined","ttl":"60","published_at":"2016-02-09T14:42:19.876Z","coreid":"particle-internal"}

```

If the hook got an error back from your server, it'll publish a hook-error event with the contents of the error.

```
# hook-error

{"name":"hook-error/your_published_event_topic/0","data":"Message ...","ttl":"60","published_at":"2016-02-09T15:23:23.047Z","coreid":"particle-internal"}

```

If the hook got a good response back, it'll break the response into 512 byte chunks and publish up to the first 100KB
of the response back to your devices.

```
# hook-response
{"name":"hook-response/your_published_event_topic/0","data":"your server response...","ttl":"60","published_at":"2016-02-09T15:23:23.047Z","coreid":"particle-internal"}
```

A response larger than 512 bytes will be split into multiple parts of 512 bytes. The events are of the form:

- hook-response/name_of_my_event/0
- hook-response/name_of_my_event/1
- hook-response/name_of_my_event/2
- ...

All parts except the last will be exactly 512 bytes.

The parts may arrive out of order. This has always been the case if retransmission occurred, but as of late 2020, it will happen regularly. The reason is that events now flow through multiple redundant servers for fault tolerance and performance, but this also means that events may arrive in a different order.

There is no express indication of how many parts there are. Any part less than 512 bytes is the last part, however if the data is a multiple of 512 bytes, then it will be impossible to tell. Some formats like JSON will only be parsable after all parts have been received.


These special webhook events cannot trigger webhooks themselves to avoid the possibility of a bad webhook recursively triggering other webhooks. Use the [Console event logs](https://console.particle.io/logs) or open an [event stream](/reference/device-cloud/api/#get-a-stream-of-events) to see these events.

## Asset Tracking Events

### Tracker Location Events

A location event typically has JSON that looks like this:

```
{
	"cmd":"loc",
	"time":1584484345,
	"loc":{
		"lck":1,
		"time":1584484333,
		"lat":37.295945,
		"lon":-121.986830,
		"alt":71.6,
		"hd":46.16,
		"h_acc":10.0,
		"v_acc":2.57,
		"cell":37.1,
		"batt":98.8
	},
	"trig": ["lock"],
	"req_id":1
}
```

To estimate the data usage for location events, see [this page](/tutorials/device-cloud/console/#data-usage).

#### cmd

This currently always the string `loc`, indicating that the payload contains the `loc` object.

#### time

Event time, from the device RTC. UTC time/date in 32-bit, signed, POSIX epoch format (seconds past January 1, 1970). This timestamp may be different than the timestamp in the event metadata, which is generated cloud-side when the event is received because of event queuing and retries due to connection failures. 

#### loc.lck

Lock or fix status. If 0, the GNSS has not locked yet. If non-zero, it has locked and the lat/lon are valid.

#### loc.time

GNSS timestamp. This may be different than the device and cloud times.

#### loc.lat

Latitude part of geographic coordinate in reference to WGS84 datum. It is floating point degrees in the range of -180.0 to +180.0.

#### loc.lon

Longitude part of geographic coordinate in reference to WGS84 datum. It is floating point degrees in the range of -90.0 to +90.0.

#### loc.alt

Altitude, in meters, part of geographic coordinate in reference to WGS84 datum.

#### loc.hd

Heading, in degrees, of perceived direction. It is floating point degrees in the range of -360.0 to +360.0.

#### loc.h_acc

Horizontal accuracy, in meters, of geographic latitude and longitude coordinates.

#### loc.v_acc

Vertical accuracy, in meters, of geographic altitude coordinates.

#### loc.spd

Speed, in meters per second, of perceived GNSS movement. Added in Tracker Edge v12.

#### loc.batt

Battery level, in percentage (0-100.0) when available and valid.  This field will be omitted when no battery is connected.

#### loc.cell

Cellular signal strength/quality, in percentage (0-100.0).

#### loc.temp

Device temperature, in degrees Celsius, if available.

#### towers.str

Serving and neighboring cell tower signal strength (RSSI in dBm). Added in Tracker Edge v12.

#### towers.rat

Radio Access Technology, for example, "lte". Added in Tracker Edge v12.

#### towers.mcc

Mobile Country Code (0 - 999). Added in Tracker Edge v12.

#### towers.mnc

Mobile Network Code (0 - 999). This is the operator or carrier within the country. Added in Tracker Edge v12.

#### towers.lac

Location Area Code (0 - 65535). Added in Tracker Edge v12.

#### towers.cid

Cell Identifier (0 - 268435455). Added in Tracker Edge v12.

#### towers.nid

Neighboring tower Physical Cell ID (0 - 2147483647). Added in Tracker Edge v12.

#### towers.ch

Frequency channel number (0 - 2147483647). Added in Tracker Edge v12.

#### wps.bssid

MAC address (BSSID) for the base station (access point). Added in Tracker Edge v12.

#### wps.str

Signal strength (RSSI in dBm). Added in Tracker Edge v12.

#### wps.ch

Wi-Fi channel number. Added in Tracker Edge v12.

#### trig

Reason for point location publish message, an array of causes enumeration strings:

- `time` time-based (`interval_max`)
- `radius` movement-based (`radius`)
- `imu_m` IMU wake on motion
- `imu_g` IMU wake on high-G acceleration (4g for at least 2.5ms.)
- `temp_h` High temperature wake
- `temp_l` Low temperature wake
- `user` User-triggered publish
- `batt_warn` Low battery warning
- `batt_low` Low battery

The JSON schema for location events will be released soon.

#### req_id

The request identifier, used to make sure the event was received.

### Enhanced Location Events 

The `loc-enhanced` event includes Location Fusion information, enhanced geolocation using Wi-Fi and/or cellular tower information. This can occur indoors, and in "urban canyons" where view of the GNSS satellites is obstructed.

`loc-enhanced` events are generated by the Particle cloud, one for every `loc` event sent by the Tracker, with any additional location information added. The enhanced location can be monitored using webhooks or server-sent-events. Optionally, these events can also be sent to devices, to allow the device to act on the enhanced location information. See [location configuration](/tutorials/device-cloud/console/#location-settings).

The `loc-enhanced` event will have data the same as the original `loc` event, such as: `cmd`, `time`, `loc.lck`, `loc.cell`, `loc.batt`, `loc.temp`, `loc.time`, `loc.lat`, `loc.lon`, `loc.h_acc`, and `trig`. 

Note that `loc.alt` (altitude), `loc.v_acc` (vertical accuracy), `loc.hd` (heading), and `loc.spd` (speed) are not available for locations derived from location fusion, but if that information was in the original `loc` event from the GNSS, it will be preserved in the `loc-enhanced` event.

#### src

The sources used for enhanced geolocation, an array. Can be "cell" or "wifi" or both. Added in Tracker Edge v12.


### Tracker Configuration Events

Tracker Configuration Events are sent to devices to change configuration parameters. You should not send these events directly by yourself, as configuration events are designed to be synchronized between the device and cloud, including getting configuration updates after waking up from sleep or going out of cellular range.

The JSON schema for configuration events will be released soon.

## Firmware
{{> api group=apiGroups.Firmware}}
## Product Firmware
{{> api group=apiGroups.ProductFirmware}}


## Libraries
The libraries endpoints are a little different as they follow the [JSON API](http://jsonapi.org/) specification.

{{> api group=apiGroups.Libraries}}
## Products
{{> api group=apiGroups.Products}}

## Device Groups

Device groups allow you to define subsets of your IoT deployment that
can be addressed separately from the rest of the fleet. Groups are
defined within the scope of a [product](#products). For more information,
please see [the guide](/tutorials/product-tools/device-groups/).

{{> api group=apiGroups.Groups}}

## Asset Tracking

### Location
{{> api group=apiGroups.Location}}

### Configuration
{{> api group=apiGroups.Configuration}}


## Customers
{{> api group=apiGroups.Customers}}

### Reset Password (Simple Auth)

In most cases, we recommend using **Two-Legged Auth** where you have complete control over your customers and accounts. **Simple Auth** can be used as a simpler alternative, however you will need to provide an additional service if you want to allow your customers to be able to reset their password by email. The process works like this:

1. Customer loses access, clicks "forgot password" on your mobile or front-end app.
2. App hits an endpoint on your back-end. The back-end app should know your Particle access token, the one you used to create that product, and, optionally, list of valid customer emails.
3. This triggers an email to the customer sent from your back-end. This email can have your brand, logo, colors, etc. The email contains link to reset his or her password. Behind the scenes, a short-lived reset password token is created and stored in your back-end database.
4. The email links to your hosted, brand-themed webpage that shows the a "set new password" field and verifies the reset password token. The customer types in new password, and the front-end hits an endpoint on your back-end with the new password.
5. The back-end hits the update customer password API.
6. Customer password is reset.

```
PUT /v1/products/:productIdOrSlug/customers/:customerEmail 
{password: <new_password>, access_token: <your_token>}
```

We've provided a [sample app using Heroku and PostgreSQL](https://github.com/particle-iot/password-reset-example). This can be used as-is, or you can use it as an example of how to add support into your existing server infrastructure. 


## Service agreements and usage
{{> api group=apiGroups.ServiceAgreements}}
