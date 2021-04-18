---
title: Webhooks
layout: reference.hbs
columns: three
order: 50
description: Control external web services from your Particle IoT device using the Particle cloud
---

# {{title}}

Webhooks lets you connect Particle events to other services on the Internet.  If you're new to webhooks, you should start at [the guide for webhooks](/tutorials/device-cloud/webhooks/) before continuing on here.

You can create and administer webhooks with the [Console](https://console.particle.io) and the [Command Line Interface (CLI)](https://particle.io/cli).

## Overview

```
EXAMPLE WEBHOOK
{
  "eventName": "Metric",
  "url": "http://example.com",
  "headers": {
    "X-Timestamp": "\{{PARTICLE_PUBLISHED_AT}}"
  },
  "auth": {
    "username": "USERNAME",
    "password": "API_KEY"
  },
  "json": {
    "field1": "\{{{indoorTemp}}}",
    "field2": "\{{{outdoorTemp}}}",
    "created_at": "\{{SPARK_PUBLISHED_AT}}"
  }
}
```

The 3 main parts of the webhook are: which events from which devices trigger it, which service it targets and what data format to use.

An event will trigger a webhook if:
- The event name starts with the webhook `eventName`.
- The device that published the event matches the webhook `deviceID` or all devices you own if `deviceID` is omitted.

## Webhook properties

Webhook are created by specifying several properties in a configuration file in [JSON format](http://www.w3schools.com/js/js_json_intro.asp).

The configuration properties can contain [event variables](#pre-defined-variables) that will be interpolated when the webhook is triggered.

Here is the full list of properties that can be included in a webhook configuration.

### event

```
EXAMPLE
"event": "Temperature"

FIRMWARE EVENTS THAT TRIGGER WEBHOOK
Particle.publish("Temperature", "25", PRIVATE);
Particle.publish("Temperature/Outside", "25", PRIVATE);
```

_Required_

Events starting with this prefix will trigger the webhook.

So a webhook for `temp` will trigger for events `temp`, `temperature` and `temperature/basement`, but not `high_temp`.

**eventName** is an alias for **event**.

### url

```
EXAMPLES
"url": "https://metrics-api.librato.com/v1/metrics"
"url": "http://requestb.in/\{{bin}}"
```

_Required_

The web address that will be targeted when the webhook is triggered.

### requestType

The HTTP method for the request, one of GET, POST, PUT, or DELETE.

```
DEFAULT
"requestType": "POST"

EXAMPLE
"requestType": "GET"
```

### deviceID

```
EXAMPLE
"deviceID": "3f002b000000000000000000"
```

If specified trigger on events from this device only. When omitted, triggers on events by all your devices.

Triggering by device name is not supported.

### headers

```
EXAMPLES
"headers": {
  "Authorization": "Bearer 12345"
}
"headers": {
  "X-Sender": "\{{PARTICLE_DEVICE_ID}}",
  "X-Application": "My app"
}
```

A JSON object with key / value pairs specifying custom headers. This can be useful for authorization codes or custom headers required by some services.

The keys and values can contain variables.

### auth

```
EXAMPLE
"auth": {
  "username": "user@email.com",
  "password": "API_KEY"
}
```

A JSON object with keys `username` and `password` for [basic HTTP authentication](https://en.wikipedia.org/wiki/Basic_access_authentication).

The values can contain variables.

### query

```
EXAMPLE
"query": {
  "q": "\{{{PARTICLE_EVENT_VALUE}}}",
  "p": "my app"
}

REQUEST URL
http://<url>/?q=data&my+app
```

A JSON object with key / value pairs to encode as a [query string](https://en.wikipedia.org/wiki/Query_string).

The keys and values can contain variables.

If the [requestType](#requesttype) is GET, the [default data](#default-data) will be added to the query string unless [noDefaults](#nodefaults) is true.

### form

```
EXAMPLE
"form": {
  "From" : "FROM_PHONE_NUMBER",
  "To" : "TO_PHONE_NUMBER",
  "Body" : "\{{{BODY}}}"
}

REQUEST BODY
Body=Hi%20there%21&To=TO_PHONE_NUMBER&From=FROM_PHONE_NUMBER
```

A JSON object with key / value pairs to encode as an [HTTP form](https://en.wikipedia.org/wiki/POST_(HTTP%29#Use_for_submitting_web_forms).

This sets the header to `application/x-www-form-urlencoded`.

The keys and values can contain variables.

Unless [noDefaults](#nodefaults) is true, the form data will also include [the default data](#default-data).

The properties [form](#form), [json](#json) and [body](#body) are mutually exclusive.

### json

```
EXAMPLE
"json": {
  "value": "\{{{PARTICLE_EVENT_VALUE}}}"
}

REQUEST BODY
{
  "value": "true"
}

EXAMPLE
"json": {
  "gauges": [
    {
      "name": "\{{{n}}}",
      "value": "\{{{v}}}",
      "source": "\{{PARTICLE_DEVICE_ID}}"
    }
  ]
}

REQUEST BODY
{
  "gauges": [
    {
      "name": "click",
      "value": "2",
      "source": "3f002b000000000000000000"
    }
  ]
}
```

A JSON object for the data to encode as JSON.

This sets the header to `application/json`.

The keys or values can contain variables.

One current limitation of this format is that variables can only be interpolated as strings.  In particular this is not a valid template:

`"json": { "value": \{{{PARTICLE_EVENT_VALUE}}} }`

See [body](#body) for a workaround.

The properties [form](#form), [json](#json) and [body](#body) are mutually exclusive.

### body

```
EXAMPLE
"body": "{ \"value\": \{{{PARTICLE_EVENT_VALUE}}} }"

REQUEST BODY
{ "value": true }

EXAMPLE
"body": "{ \"gauges\": [{ \"name\": \"\{{{n}}}\", \"value\": \{{{v}}} }] }"

REQUEST BODY
{ "gauges": [{ "name": "click", "value": 2 }] }
```

A string that will be used as the body of the web request. Use this key to generate a completely custom request, as JSON, HTML or plain text. You may need to set a Content-Type header for the right format.

You can use any syntax from [mustache templates](http://mustache.github.io/mustache.5.html). Note that using double braces `\{{var}}` will HTML escape strings. Use triple braces `\{{{var}}}` to avoid escaping.

The properties [form](#form), [json](#json) and [body](#body) are mutually exclusive.

### noDefaults

```
DEFAULT
"noDefaults": false

EXAMPLE
"noDefaults": true
```

By default, the [default data](#default-data) is included with query parameters for GET requests, form params or JSON params for other requests types.
These four parameters, "name", "data", "coreid", and "published_at" might cause issues for some servers.

When true, don't include the default data with the webhook. Defaults to false.

### rejectUnauthorized

```
DEFAULT
"rejectUnauthorized": true

EXAMPLE
"rejectUnauthorized": false
```

By default, if your URL targets a url with a HTTPS prefix (SSL encrypted), the hook will validate the certificate against its certificate authority chain.

If you're using a self-signed certificate, or are otherwise having certificate issues, you can tell the hook to ignore the validation process by setting **rejectUnauthorized** to false.

### responseTemplate

```
EXAMPLE
"responseTemplate": {
  "lat": "\{{{results.0.location.lat}}}",
  "lng": "\{{{results.0.location.lng}}}"
}
```

If your server sends a JSON response back, it will be automagically parsed into variables that you can use to craft a custom response back to your devices!

See the [Variable substitution](#variable-substitution) section for details.

If omitted, the response from the server will be published verbatim as events. See the [sequence of events](#sequence-of-events)


### responseTopic

```
DEFAULT
hook-response/\{{PARTICLE_EVENT_NAME}}

EXAMPLE
"responseTopic": "\{{PARTICLE_DEVICE_ID}}/hook-response/weather"

FIRMWARE
// Subscribe to the response event, scoped to webhooks triggered by this device
Particle.subscribe(System.deviceID() + "/hook-response/weather/", myHandler, MY_DEVICES);
```

Customize the webhook response event name that your devices can subscribe to.

This is most commonly use to have the response contains to the device ID so the device that triggered an event will be the only one to get the response.

[See the product webhook guide](/tutorials/device-cloud/webhooks/#product-webhook-responses) for more details.

### errorResponseTopic

```
DEFAULT
hook-error/\{{PARTICLE_EVENT_NAME}}

EXAMPLE
"errorResponseTopic": "save_failed_for_\{{PARTICLE_DEVICE_ID}}"
```

Customize the webhook error response event name. Similar to responseTopic.

### mydevices

_Deprecated_

This property is ignored. Webhooks trigger only for your devices.

## Variable substitution

One of the great features of the webhook is using  [mustache templates](http://mustache.github.io/mustache.5.html). It allows you to do simple processing of JSON data both in the request data going out and response data coming back. It's a logic-less template system so you're not actually writing code, but you can do useful and powerful text transformations.

```
EXAMPLE DATA
{
    "a": {
        "aa":"testing",
        "ab":1234
    },
    "b": "xxx",
    "c": [
        {
            "ca":"first",
            "cb":123
        },
        {
            "ca":"second",
            "cb":456
        }
    ]
}

TEMPLATE: \{{{a.aa}}}
RESULT:   testing

TEMPLATE: \{{{a.ab}}}
RESULT:   1234

TEMPLATE: \{{{b}}}
RESULT:   xxx

TEMPLATE: \{{{c.0.ca}}}
RESULT:   first

TEMPLATE: \{{{c.1.cb}}}
RESULT:   456

TEMPLATE: \{{#b}}\{{{b}}}\{{/b}}\{{^b}}Missing\{{/b}}
RESULT:   xxx

TEMPLATE: \{{#z}}\{{{z}}}\{{/z}}\{{^z}}Missing\{{/z}}
RESULT:   Missing

TEMPLATE: \{{#c}}\{{{ca}}}~\{{/c}}
RESULT:   first~second~
```

Inserting a variable with double braces `\{{a}}` will do HTML escaping of the characters `&<>"'`. To avoid this, use triple braces `\{{{a}}}`.

The `\{{{PARTICLE_EVENT_VALUE}}}` is a mustache template to include the event value in the data. It's automatically replaced by the event value when the template is processed.

If the response from a webhook is JSON with multiple levels, you can use the `\{{a.aa}}` syntax to extract keys nested deep in the structure.

You can also use the `\{{#b}}value\{{/b}}` syntax to display a value if the key exists or expand an array. See the [mustache documentation](http://mustache.github.io/mustache.5.html) for more examples.

### Pre-defined variables

These variables are predefined for any webhook (use triple braces to avoid HTML escaping of the values):

- `\{{{PARTICLE_DEVICE_ID}}}`: The ID of the device that triggered the webhook
- `\{{{PARTICLE_EVENT_NAME}}}`: The name of the event that triggers the webhook
- `\{{{PARTICLE_EVENT_VALUE}}}`: The data associated with the event
- `\{{{PARTICLE_PUBLISHED_AT}}}`: When the event was published

Product webhooks also have access to:

- `\{{{PRODUCT_USER_ID}}}`: The user id of the device owner
- `\{{{PRODUCT_VERSION}}}`: The firmware version that published the event

### Custom variables

If the event data is valid JSON, it is automagically converted to variables that are available in the template.

```
FIRMWARE
String room = "kitchen";
int temp = 20;
String data = String::format(
  "{ \"room\": \"%s\", \"temp\": %d }",
  room.c_str(), temp);
Particle.publish("test", data, PRIVATE);

WEBHOOK
{
  "eventName": "test",
  "url": "http://example.com/log/\{{{room}}}",
  "json": {
    "location": "\{{{room}}}",
    "temperature": "\{{{temp}}}"
  }
}
```

For example, this firmware code will make variables `\{{{room}}}` and `\{{{temp}}}` available inside the webhook template.

## Default data

```
WEBHOOK
{
    "eventName": "demo",
    "url": "http://host.com"
}

FIRMWARE
Particle.publish("demo", "mydata", PRIVATE);

REQUEST
POST / HTTP/1.1
User-Agent: ParticleBot/1.1 (https://docs.particle.io/webhooks)
host: host.com
content-type: application/x-www-form-urlencoded
content-length: 96

event=demo&data=mydata&published_at=2017-02-01T21%3A08%3A05.763Z&coreid=3f002b000000000000000000
```

If you create a webhook with only an event name and URL, the request will contain the event data in HTTP form format.

The included fields are:
- **event**: The name of the event that triggers the webhook
- **data**: The data associated with the event
- **published\_at**: When the event was published
- **coreid**: The ID of the device that triggered the webhook

If you specify **form**, **json** or **query**, these fields will be
included in addition to your data.

Set [noDefaults](#nodefaults) to true to omit the default data.

## Sequence of events

You will know that your webhook succeeded if you see the following pattern on your event stream, using the [Console](https://console.particle.io/logs) or the Particle CLI command `particle subscribe mine`:

```
{
  "name":"name_of_my_event",
  "data":"data_sent_with_event",
  "ttl":"60",
  "published_at":"2016-04-16T13:37:08.728Z",
  "coreid":"1234567890987654321"
}
{
  "hook-sent/name":"name_of_my_event",
  "data":"undefined",
  "ttl":"60",
  "published_at":"2016-04-16T13:37:08.743Z",
  "coreid":"particle-internal"
}
{
  "name":"hook-response/name_of_my_event/0",
  "data":"ok",
  "ttl":"60",
  "published_at":"2016-04-16T13:37:08.755Z",
  "coreid":"particle-internal"
}
```

Explanation:

- The first line is when your device events reaches the Particle cloud.
- The second line (`hook-sent`) acknowledges that the Particle cloud forwarded your event to your webhook URL.
- The third line (`hook-response`) contains the response received from your webhook URL. Large responses will generate multiple response events. Your device can subscribe to these events with `Particle.subscribe()` to receive the data.

The event name will use the triggering event, not the webhook hook name filter.

If your hook captures everything starting with `my-hooks`, but you published `my-hooks/get_weather`, then your response event name would be `hook-response/my-hooks/get_weather`.  Each packet event name includes the index of the packet in the response.

The hook sent and response events cannot trigger webhooks themselves to avoid the possibility of a bad webhook recursively triggering other webhooks. Use the [Console event logs](https://console.particle.io/logs) or open an [event stream](/reference/device-cloud/api/#get-a-stream-of-events) to see these events.

### Multipart responses

A response larger than 512 bytes will be split into multiple parts of 512 bytes. The events are of the form:

- hook-response/name_of_my_event/0
- hook-response/name_of_my_event/1
- hook-response/name_of_my_event/2
- ...

All parts except the last will be exactly 512 bytes.

The parts may arrive out of order. This has always been the case if retransmission occurred, but as of late 2020, it will happen regularly. The reason is that events now flow through multiple redundant servers for fault tolerance and performance, but this also means that events may arrive in a different order.

There is no express indication of how many parts there are. Any part less than 512 bytes is the last part, however if the data is a multiple of 512 bytes, then it will be impossible to tell. Some formats like JSON will only be parsable after all parts have been received.

### Errors

Error responses from the target url will also be sent back in the response event.

```
{
  "name":"hook-error/demo/0",
  "data":"error status 404 from requestb.in",
  "ttl":"60",
  "published_at":"2016-04-16T13:37:08.755Z",
  "coreid":"particle-internal"
}
```
Too many errors from a receiving server can result in [webhook
throttling](#limits).

The hook error events cannot trigger webhooks themselves to avoid the possibility of a bad webhook recursively triggering other webhooks. Use the [Console event logs](https://console.particle.io/logs) or open an [event stream](/reference/device-cloud/api/#get-a-stream-of-events) to see these events.

### Ordering and Duplicates

Events, and therefore webhooks, do not have guaranteed end-to-end delivery. If you need to guarantee delivery of events, you should send a separate acknowledgement to the device from your server.

Events are not guaranteed to be delivered in the order they were sent. They typically will, and the longer you wait between them, the more likely they will arrive in order, but it is possible in the case of retransmission for events to arrive out-of-order.

Likewise, events are delivered at least once. In the case of a lost acknowledgement, the device may retransmit the event, which would cause your webhook to execute twice for the same event. You should make sure your server code is aware of this possibility. 

## Using the Console

The [Webhook Builder](https://console.particle.io/integrations/webhooks/create) is a handy web-based form for creating webhooks.

![Main settings](/assets/images/webhooks/mainsettings.png)

All the webhook properties can be filled out with the form, _except for `body` which is currently not supported on the Console._

Product webhooks can be created through the Console. Navigate into your product, then click Integrations on the left navigation bar, then New integration, Webhook.

You can also use the Console to see an audit trail of webhooks that have
previously been attempted. From the Integrations page, click on an
integration to display its details.

Scrolling down a bit, you'll see 2 sections, **History** and **Logs**.

History will show you a graph of all attempts and their result over the
last 30 days. Results will be broken down into _success_, _failure_, and
_skipped_ (not sent because there were too many previous failures in
rapid succession). Events that failed or were skipped are retried
twice after 30 seconds and 1 minute, then dropped.

![Webhook History](/assets/images/webhooks/webhook-history.png)

Logs will provide details on both the last 10 request, as well as the
last 10 errors. These logs will also be available for 30 days from the
time of the request.

For each logged webhook, you'll be able to see the source event that triggered the
webhook, the HTTP request sent to the webhook URL, and the full HTTP
response from the webhook server.

![Webhook Logs](/assets/images/webhooks/webhook-logs.png)

## Using the CLI

Webhooks can be created, listed and deleted with the [Particle Command Line Interface (CLI)](/tutorials/developer-tools/cli/).

Product webhooks cannot currently be created through the CLI.

### particle webhook create

Registers your Webhook with the Particle Device Cloud.  Creates a request to the given url when your event is sent.  See [the list of properties](#webhook-properties) for JSON formatting requirements and parameters.

```sh
# how to create a webhook with json data using the CLI
$ particle webhook create slack.json

Using settings from the file slack.json
Sending webhook request  { uri: 'https://api.particle.io/v1/webhooks',
  method: 'POST',
  json: true,
  form:
   { event: 'slack-incoming-webhook',
     url: 'https://hooks.slack.com/services/B1234567/C234567/345634563456345634563456',
     deviceid: undefined,
     access_token: '56785678567856785678567856785678',
     requestType: 'POST',
     headers: undefined,
     json:
      { channel: '#random',
        username: 'ParticleBot',
        text: '\{{{SPARK_EVENT_VALUE}}}',
        icon_emoji: ':spark:' },
     query: undefined,
     auth: undefined,
     mydevices: true } }
```

**Creating a webhook with the same JSON data twice doesn't replace the first webhook, but creates a second one.** Make sure you delete the previous webhook before creating another one that targets the same URL and event.

### particle webhook list

Generates a list of what Webhooks you own, including their ID numbers and registered event names.

```sh
# how to show your currently registered webhooks using the CLI
$ particle webhook list

Found 2 hooks registered

    1.) Hook #123412341234123412341234 is watching for "Librato_"
        and posting to: https://metrics-api.librato.com/v1/metrics
        created at 2015-02-28T03:32:41.412Z

    2.) Hook #234523452345234523452345 is watching for "slack-incoming-webhook"
        and posting to: https://hooks.slack.com/services/B1234567/C234567/345634563456345634563456
        created at 2015-02-28T04:31:47.133Z
```

### particle webhook delete

Delete a webhook using your registered webhook ID number.  Use `particle webhook list` to find the WEBHOOK_ID you wish to delete, then copy/paste it into the `particle webhook delete WEBHOOK_ID` command.

```sh
# how to delete your previously registered webhook
# from the Particle Device Cloud using the CLI
$ particle webhook delete WEBHOOK_ID

$ particle webhook delete 234523452345234523452345
Successfully deleted webhook!
```

## Using the API

```
POST /v1/webhooks
```

See the [API reference](/reference/device-cloud/api/#webhooks) for details on the webhook endpoints.

## Data Operations

When a device sends an event that triggers a webhook or other integration, that will consume one Data Operation.

If the webhook response is not subscribed to by the device, that will be the only Data Operation.

If the webhook response is subscribed to by the device, it will use one Data Operation for each 512-byte segment of a response. Retransmissions could also increase the number of Data Operations, as described [here](/tutorials/cellular-connectivity/data/#retransmissions).

If you have multiple devices that subscribe to a hook-response but only want to monitor the response to their own request, as opposed to any device in the account sharing the webhook, you should include the Device ID in the custom hook response as described [here](/reference/device-cloud/webhooks/#responsetopic). This will assure that you will not consume Data Operations for webhooks intended for other devices.

## Limits

Particle places no limitation on the rate at which a webhook can be
triggered by default. Therefore, ensure that the
receiving server is capable of handling the request volume you are
expecting to send.

When a server receiving webhook requests fails many times in rapid
successions, the Particle Device Cloud will start to skip sending some
events to lighten the load on the receiving server.  Specifically,
Particle uses an adaptive algorithm to skip webhook attempts when
more 4xx or 5xx HTTP status codes than 2xx HTTP status codes are
returned by the receiving server.  

The server rating algorithm is per server hostname, and does not depend on the 
webhook that generated it, the account, or the port number being 
requested.

After a cooldown period of a
few seconds without errors, requests will be allowed to be made
once again.  Events that were skipped will retried after 30
seconds and 1 minute before being dropped.

You will know events are being skipped if you see a
`hook-error` event in your event stream that reads "Sleeping, too many errors,
please wait and try again" in the body.

If you anticipate that your target webservice may respond to data packets with an HTTP status error code, ie a smart wifi plug  is offline and cannot be contacted, then it's a good idea to use middleware to always return a 200 status code to the Particle webhook request. IE you could create a GCP Cloud Function or use AWS HTTP Gateway as your webhook target. In your cloud function or HTTP Gateway you can easily force a code 200 response to Particle. This avoid any impact on the webhook system processing your requests.

We remind you to be a good Internet citizen and only send webhook
requests to target sites that you have permission to send traffic.

Servers must return a response within the timeout period of 20 seconds. A server that does not respond within the timeout period will also count as a failed request, which could result in throttling of the traffic to that server. This is intended to prevent further overloading and overloaded server. 

## Examples

### Sending Simple Data

Create a webhook that posts JSON data using the name and data from the event.

```
WEBHOOK
{
  "event": "Temperature/",
  "url": "https://example.com/123456789",
  "json": {
    "\{{PARTICLE_EVENT_NAME}}": "\{{{PARTICLE_EVENT_VALUE}}}"
  },
  "noDefaults": true
}

FIRMWARE
float temp = 20.0;
String data = String::format("%.2f", temp);
Particle.publish("Temperature/Kitchen", data, PRIVATE);

REQUEST
POST /123456789 HTTP/1.1
User-Agent: ParticleBot/1.1 (https://docs.particle.io/webhooks)
host: example.com
accept: application/json
content-type: application/json
content-length: 31

{"Temperature/Kitchen":"20.00"}
```

### Sending Complex Data

Create a webhook that posts JSON data using several fields from the event.

```
WEBHOOK
{
  "event": "Elevation",
  "url": "https://example.com/123456789",
  "json": {
    "coordinates": {
      "lat": "\{{{lat}}}",
      "lng": "\{{{lng}}}"
    }
  },
  "noDefaults": true
}


FIRMWARE
float lat = 39.73915360;
float lng = -104.98470340;
String data = String::format(
  "{\"lat\":%f, \"lng\":%f}",
  lat, lng);
Particle.publish("Elevation", data, PRIVATE);

REQUEST
POST /123456789 HTTP/1.1
User-Agent: ParticleBot/1.1 (https://docs.particle.io/webhooks)
host: example.com
accept: application/json
content-type: application/json
content-length: 55

{"coordinates":{"lng":"-104.984703","lat":"39.739155"}}
```

If you have to send the data as JSON numbers instead of JSON strings,
the current workaround is to use the [body](#body) property.

```
WEBHOOK
{
  "event": "Elevation",
  "url": "https://example.com/123456789",
  "headers": {
      "content-type": "application/json"
  },
  "body": "{ \"coordinates\": { \"lat\": \{{{lat}}}, \"lng\": \{{{lng}}} } }",
  "noDefaults": true
}


FIRMWARE
float lat = 39.73915360;
float lng = -104.98470340;
String data = String::format(
  "{\"lat\":%f, \"lng\":%f}",
  lat, lng);
Particle.publish("Elevation", data, PRIVATE);

REQUEST
POST /123456789 HTTP/1.1
content-type: application/json
User-Agent: ParticleBot/1.1 (https://docs.particle.io/webhooks)
host: example.com
content-length: 59

{ "coordinates": { "lat": 39.739155, "lng": -104.984703 } }

```

### Receiving Complex Data

Use template variables in both the request and response to interact with the [Google Maps Elevation API] (https://developers.google.com/maps/documentation/elevation/start).

```
WEBHOOK
{
    "event": "Elevation",
    "url": "https://maps.googleapis.com/maps/api/elevation/json",
    "requestType": "GET",
    "query": {
		"locations": "\{{{lat}}},\{{{lng}}}",
		"key": "<paste your secret Google API key here>"
    },
    "responseTemplate": "\{{{results.0.elevation}}}",
    "noDefaults": true
}

FIRMWARE
void setup() {
  Particle.subscribe("hook-response/Elevation", receiveElevation, MY_DEVICES);
  Particle.publish("Elevation", "39.7,-104.9", PRIVATE);
}

void receiveElevation(const char *event, const char *data) {
  float elevation = atof(data);
}

REQUEST
GET /maps/api/elevation/json?key=XXXXXXXXXX&locations=39.7%2C-104.9 HTTP/1.1
User-Agent: ParticleBot/1.1 (https://docs.particle.io/webhooks)
host: maps.googleapis.com
```

According to the Google documentation, you make a request like this:

`
https://maps.googleapis.com/maps/api/elevation/json?locations=39.7391536,-104.9847034&key=YOUR_API_KEY
`

And you get a response back in JSON, like this:

`
{
   "results" : [
      {
         "elevation" : 1608.637939453125,
         "location" : {
            "lat" : 39.73915360,
            "lng" : -104.98470340
         },
         "resolution" : 4.771975994110107
      }
   ],
   "status" : "OK"
}
`

Since this a GET request we use the [query](#query) in the hook template.

The Google API wants a parameter "location" with a value of two decimal numbers for the latitude and longitude, separated by a comma. We can do this easily using the Mustache template `\{{{lat}}},\{{{lng}}}`.

In the response we want to return just the "elevation" parameter. The returned JSON object contains a key "results" that is an array. In the array is an object with the "elevation". Rather than dealing with parsing the whole result on the Photon we return just the elevation using the template `\{{results.0.elevation}}`.


## Community Webhook Examples

Below are a few community-written webhook examples. They have been sorted by what they do. These examples were not written by Particle but instead members of our community. Got your own webhook example? Post on the [community forums](https://community.particle.io/) and then issue a pull request to our [docs repo](https://github.com/particle-iot/docs/compare).

### Sending SMS (Text Messages)

- [Twilio - Sending a text message using Twilio](https://community.particle.io/t/webhooks-sending-a-text-message/10560) by [hoxworth](https://community.particle.io/users/hoxworth/activity)
- [Tropo - Sending a text message (or voice call) using Tropo](https://community.particle.io/t/webhook-tutorial-send-a-sms/11431) by [harrisonhjones](https://community.particle.io/users/harrisonhjones/activity)

### Push Notifications

- [Pushbullet - Sending a push notification using Pushbullet](https://www.hackster.io/gusgonnet/add-push-notifications-to-your-hardware-41fa5e) by [gusgonnet](https://community.particle.io/users/gusgonnet/activity)

- [Pushover - Sending push notifications to the devices of your choosing](https://community.particle.io/t/webhooks-tutorial-push-notifications-with-pushover/52070) by [jaredwolff](https://community.particle.io/users/jaredwolff/activity)

### Sending Emails

- [mailgun - Sending emails with mailgun](https://github.com/harrisonhjones/webhook-examples/tree/master/mailgun.org) by [harrisonhjones](https://community.particle.io/users/harrisonhjones/activity)

### Saving data in Firebase

- [Firebase tutorial](https://github.com/rickkas7/firebase_tutorial) by [rickkas7](https://community.particle.io/users/rickkas7/activity)

### Sending Data to Influx Cloud

- [InfluxData Cloud 2 tutorial](https://github.com/davidgs/ParticleInflux) by [davidgs](https://community.particle.io/u/davidgs/activity)

**Also**, check out and join our [community forums](https://community.particle.io/) for advanced help, tutorials, and troubleshooting.

