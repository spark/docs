---
word: CLI
title: Command Line Interface (CLI)
layout: commonTwo.hbs
columns: three
redirects: true
description: Command line interface for managing your devices for Windows, Mac OS, and Linux
---

# CLI Command Reference

For information on how to install the Particle CLI, see the [CLI guide](/tutorials/developer-tools/cli/).


## particle setup

  Everything you need to get started using a Particle Photon or P1 device from the command line. Create an account or log in, set up Wi-Fi to a device and claim the device to your Particle account.

```sh
$ particle setup
```

To set up a cellular device (Electron, Boron, B Series SoM), go to [setup.particle.io](https://setup.particle.io) or use the mobile apps.

To set up an Argon, see [particle serial wifi](#particle-serial-wifi) or use the mobile apps.


## particle login

  Login and save an access token for interacting with your account on the Particle Device Cloud.

```sh
# how to login - creates and saves an access token for your session with the CLI
$ particle login
```


## particle logout

  Logout and optionally revoke the access token for your CLI session.

```sh
# how to remove your saved access token, and optionally revoke that token as well
$ particle logout
```


## particle list

Generates a list of what devices you own, and displays information about their status, including what variables and functions are available

```sh
# how to show what devices of yours are online
# and what functions and variables are available
$ particle list

Checking with the cloud...
Retrieving devices... (this might take a few seconds)
my_device_name (0123456789ABCDEFGHI) 0 variables, and 4 functions
  Functions:
    int digitalWrite(string)
    int digitalRead(string)
    int analogWrite(string)
    int analogRead(string)

```


## particle call

  Calls a function on one of your devices, use ```particle list``` to see which devices are online, and what functions are available.

```sh
# how to call a function on your device
$ particle call 0123456789ABCDEFGHI digitalWrite "D7,HIGH"
1
```

To call a function on a product device, set the `--product` flag to your product's id.

```sh
# call the `brew` function on the device with id `0123456789abcdef01234567` within product `12345`
$ particle call 0123456789abcdef01234567 brew --product 12345
```


## particle get

  Retrieves a variable value from one of your devices, use ```particle list``` to see which devices are online, and what variables are available.

```sh
# how to get a variable value from a device
$ particle get 0123456789ABCDEFGHI temperature
72.1
```

To get a variable from a product device, set the `--product` flag to your product's id.

```sh
# read the `temperature` variable from the device with id `0123456789abcdef01234567` within product `12345`
$ particle get 0123456789abcdef01234567 temperature --product 12345
```


## particle device


### particle device add

  Adds a new device to your account.

  Your device will need to be connected to the Internet (onboard LED breathing cyan) for this process to work.

```sh
# how to add a new device to your account
$ particle device add 0123456789ABCDEFGHI
Claiming device 0123456789ABCDEFGHI
Successfully claimed device 0123456789ABCDEFGHI
```


### particle device rename

  Assigns a new name to a device you've claimed

```sh
# how to change the name of your device
$ particle device rename 0123456789ABCDEFGHI "pirate frosting"
```


### particle device remove

  Removes a device from your account so someone else can claim it.

```sh
# how to remove a device from your account
$ particle device remove 0123456789ABCDEFGHI
Are you sure?  Please Type yes to continue: yes
releasing device 0123456789ABCDEFGHI
server said  { ok: true }
Okay!
```

Unclaiming a cellular device removes it from your account, but does not stop billing. As the claiming status and SIM are separate, you must also pause or release ownership of your SIM to stop billing. If you plan on selling or giving away your device, you should both unclaim the device and release ownership of the SIM. That will allow it to be set up as if a new device later.


### particle device doctor

Brings back a Gen2 device (`photon`, `p1`, `electron`) with bad firmware, bad network settings or bad keys
to health so it can connect to the Particle cloud.

The Device Doctor will:
* Update Device OS to the latest version
* Update the CC3000 Wi-Fi module firmware (Core only)
* Reset the antenna selection
* Reset the IP configuration
* Reset the SoftAP (listen mode) hotspot name
* Clear the data in the EEPROM
* Clear the Wi-Fi credentials
* Prompt for new Wi-Fi credentials
* Reset server and device key
* Flash the default Particle Tinker app

```sh
# first connect your device to the USB port and disconnect all others
$ particle device doctor
The Device Doctor will put your device back into a healthy state
# follow the prompts to restore your device
```

_NOTE: Currently, only Gen2 devices are supported_


## particle flash

  Sends a firmware binary, a source file, or a directory of source files, or a known app to your device.


### Flashing a directory

  You can setup a directory of source files and libraries for your project, and the CLI will use those when compiling remotely.

```sh
# how to compile and flash a directory of source code to your device
$ particle flash 0123456789ABCDEFGHI my_project
```


### Flashing one or more source files

You can include any number of individual source files after the device Name, and the CLI will include them while flashing your app.

```sh
# how to compile and flash a list of source files to your device
$ particle flash 0123456789ABCDEFGHI app.ino library1.cpp library1.h
```

Note that the CLI since 1.9.0 has support for firmware libraries via the [particle library](#particle-library)
commands.


### Target a specific firmware version for flashing

You can compile and flash your application against a specific firmware version using the `--target` flag. If you don't specify `target` your code will compile against the latest released firmware.

This is useful if you are not ready to upgrade to the latest Device OS
version on your device or if you want to try a pre-release version.

```sh
# compile your application with the 0.5.0 Device OS version and flash it
$ particle flash --target 0.5.0 0123456789ABCDEFGHI my_project
```


### Flashing a known app

You can easily reset a device back to a previous existing app with a quick command. Two app names are reserved right now: "tinker" and "cc3000".  Tinker is the original firmware that ships with the device, and cc3000 will patch the wifi module on the Spark Core. 

```sh
$ particle flash deviceName tinker
$ particle flash deviceName cc3000

```

You can also update the factory reset version using the `--factory` flag, over USB with `--usb`, or over serial using `--serial`.

```sh
$ particle flash --factory tinker
$ particle flash --usb tinker
$ particle flash --serial tinker
```


### Flashing a product device

To flash a product device, use the `particle cloud flash` command and set the `--product` flag to your product's id.

```sh
# Compile the source code in the current directory in the cloud and flash to device `0123456789abcdef01234567` within product `12345`
$ particle cloud flash 0123456789abcdef01234567 --product 12345
```


### Compiling remotely and flashing locally

To work locally, but use the cloud compiler, simply use the compile command, and then the local flash command after.  Make sure you connect your device via USB and place it into [DFU mode](/tutorials/device-os/led/#dfu-mode-device-firmware-upgrade-).

```sh
# how to compile a directory of source code and tell the CLI where to save the results
$ particle compile photon my_project_folder --saveTo firmware.bin
OR
# how to compile a list of source files
$ particle compile photon app.ino library1.cpp library1.h --saveTo firmware.bin

# how to flash a pre-compiled binary over usb to your device
# make sure your device is flashing yellow and connected via USB
# requires dfu-util to be installed
$ particle flash --usb firmware.bin
```


## particle compile

  Compiles one or more source file, or a directory of source files, and downloads a firmware binary to your computer. The cloud compiler is device-specific, so the name of device you want to target (or its alias) must be provided as an argument. The supported devices are:

  - photon ('p')
  - core ('c')
  - electron ('e')
  - p1
  - argon
  - boron
  - bsom (B Series SoM)


  **NOTE**: Remember that **\*.cpp** and **\*.ino** files behave differently. You can read more about it on our [support page](https://support.particle.io/hc/en-us/articles/204952620).

```bash
$ particle compile photon myapp.ino
$ particle compile p myapp.ino

$ particle compile electron myapp.ino
$ particle compile e myapp.ino
```

---

The cloud compiles `.ino` and `.cpp` files differently.  For `.ino` files, the cloud will apply a pre-processor.  It will add missing function declarations, and it will inject an `#include "Particle.h"` line at the top of your files if it is missing. See [the pre-processor documentation for details](/cards/firmware/preprocessor/preprocessor/).

If you want to build a library that can be used for both Arduino and Particle, here's a useful code snippet:

```cpp
#if defined(ARDUINO) && ARDUINO >= 100
#include "Arduino.h"
#elif defined(SPARK)
#include "application.h"
#endif
```


### Compiling a directory

You can setup a directory of source files and libraries for your project, and the CLI will use those when compiling remotely.

```sh
# how to compile a directory of source code
$ particle compile photon my_project_folder
# by default the current directory will be compiled
$ particle compile photon
```


### Compiling one or more source files

```sh
# how to compile a list of source files
$ particle compile photon app.ino library1.cpp library1.h
```


### Target a specific firmware version for compiling

You can compile your application against a specific firmware version use the `--target` flag. If you don't specific `target` your code will compile against the latest released firmware.

This is useful if you are not ready to upgrade to the latest Device OS
version on your device.

```sh
# compile your application with the 0.5.0 Device OS version
$ particle compile photon --target 0.5.0 my_project
$ particle compile electron myapp.ino --target 0.5.1`
$ `particle flash <deviceid> myapp.ino --target 0.5.1` would compile and
flash myapp.ino for device <deviceid> against Device OS version 0.5.1.

```

This is also useful for the Xenon, which requires 1.5.x or earlier:

```sh
$ particle compile xenon --target 1.5.0 my_project
```

Or the Spark Core, which requires 1.4.4 or earlier:

```sh
$ particle compile core --target 1.4.4 my_project
```


## particle project

Use the project structure when you want to use libraries or you want to organize your source code better.


### creating a project

You will be prompted to create the project in a default directory or in the current directory. The default directory for projects is your home directory

```sh
# create a new project
$ particle project create
What would you like to call your project? [myproject]: doorbell
Would you like to create your project in the default project directory? [Y/n]:
Initializing project in directory /home/user/Particle/projects/doorbell...
> A new project has been initialized in directory /home/user/Particle/projects/doorbell
```

The meta data about the project is stored in the `project.properties` file. It includes the project name and what libraries are used by the project.


### compiling a project

Compile or flash a project like you would another directory.

```sh
# compile the project in the current directory
$ particle compile photon
# flash the project in the current directory to a device
$ particle flash my_device
```


## particle library

The fantastic Particle community has created and ported many libraries to make it easier to get your project done fast. You can use those libraries in projects you compile through the command line.


### particle library list

Browse the list of all libraries to see what are the most popular libraries available.

```
$ particle library list
```


### particle library search

Find a specific library by name. The name is case insensitive.

```sh
# seach for the InternetButton library
$ particle library search internet
```


### particle library add

First, [create a project](#creating-a-project) then in the project directory add the library. It will be added to the `project.properties`.

```sh
# add the InternetButton library
$ particle library add internetbutton
# add a specific version of the InternetButton library
$ particle library add internetbutton@0.1.10
# add the line #include "InternetButton.h" in your source code to use the library
```

To upgrade to a newer version later, just do `particle library add` with the same name and the `project.properties` will be updated with the latest version of that library.


### particle library view

See the source and examples of a library with `particle library view`.  It will download the library and tell you where it is on the local file system.

```sh
# see the InternetButton library
$ particle library view internetbutton
```


### particle library copy

If you need to make modifications to a published library, to fix a bug or add a new feature, copy the library locally to your project. It will end up in the `lib` folder of your project.

```sh
# add a custom version of the InternetButton library to your project
$ particle library copy internetbutton
# add the line #include "InternetButton.h" in your source code to use the library
```

If you previously had added the library with `particle library add` you should remove it from your `project.properties` to make sure you don't include 2 versions of the library: the published one and modified one.


### particle library create

To make your own library you can use `particle library create` to get a folder structure with all the files you'll need and customize it from there.

```sh
$ mkdir mylib
$ cd mylib
$ particle library create
```


### particle library upload

After you modified a published library or you are ready to use the [library you created](#particle-library-create) in a project, you upload a private version of your library to the Particle cloud.

```sh
# upload the library in the current directory
$ particle library upload
```

You can upload the same private version several times until you have happy with it.

If you modified an existing library you have to modify the name of the library in `library.properties`.


### particle library publish

When you're ready to make a new private library version available, you publish it.

```sh
# publish you library
$ particle library publish mylib
```

Remember that it's necessary to publish every new version after uploading it before others can use it in their projects.


## particle webhook


### particle webhook create

Create a webhook that will trigger an HTTP request when a Particle event is published to the cloud. You can pass in an `eventName`, `url`, and `deviceID`
as arguments to the CLI command. Optionally, you can create your own custom JSON file that includes webhook params. For a full list of available
webhook parameters, see the [REST API documentation](/reference/device-cloud/api/#create-a-webhook). This command is only available for user webhooks.

```sh
$ particle webhook create temperature https://mysite.com
$ particle webhook create temperature https://mysite.com 0123456789ABCDEFGHI
$ particle webhook create webhook.json
```

```sh
# An example custom webhook JSON file that will target Librato, webhook.json
{
    "event": "librato_",
    "url": "https://metrics-api.librato.com/v1/metrics",
    "requestType": "POST",
    "auth": {
        "username": "YOUR_LIBRATO_USERNAME",
        "password": "YOUR_LIBRATO_ACCESS_TOKEN"
    },
    "json": {
        "gauges": [
            {
                "name": "\{{PARTICLE_EVENT_NAME}}",
                "value": "\{{PARTICLE_EVENT_VALUE}}",
                "source": "\{{PARTICLE_DEVICE_ID}}"
            }
        ]
    },
    "mydevices": true
}

```


### particle webhook list

List all webhooks belonging to the authenticated user. This command is only available for user webhooks.

```sh
$ particle webhook list

Found 2 hooks registered

    1.) Hook ID 57223d27ffedc82b02697efb is watching for "temp"
        and sending to: http://google.com
        for device 53ff73066678505550292167
        created at 2016-04-28T16:41:11.687Z

    2.) Hook ID 57228c5e4b112b4f2f51cfc2 is watching for "hello"
        and sending to: https://google.com
        created at 2016-04-28T22:19:10.726Z
```


### particle webhook delete

Delete a webhook and immediately stop it from triggering. This command is only available for user webhooks.

```sh
$ particle webhook delete 234523452345234523452345
Successfully deleted webhook!
```

All registered user webhooks can be removed by passing the `all` parameter. 

```sh
$ particle webhook delete all
? Do you want to delete ALL your webhooks? Yes
Found 3 hooks registered

deleting 58889c0af14a8228a3fe64c8
deleting 58889c0ef14a8228a3fe64dd
deleting 58889c1113e45f1b69be21b7
```


## particle monitor

  Pulls the value of a variable at a set interval, and optionally display a timestamp

  * Minimum delay for now is 500 (there is a check anyway if you keyed anything less)
  * hitting ```CTRL + C``` in the console will exit the monitoring

```sh
# how to poll for a variable value from one or more devices continuously
$ particle monitor 0123456789ABCDEFGHI temperature 5000
$ particle monitor 0123456789ABCDEFGHI temperature 5000 --time
$ particle monitor all temperature 5000
$ particle monitor all temperature 5000 --time
$ particle monitor all temperature 5000 --time > my_temperatures.csv
```


## particle identify

  Retrieves your device id when the device is connected via USB and in listening mode (flashing blue). It also provides the current system firmware version on the device.

```sh
# helps get your device id and system firmware version via usb and serial
# make sure your device is connected and blinking blue
$ particle identify
$ particle identify --port 1
$ particle identify --port COM3
$ particle identify --port /dev/cu.usbmodem12345

$ particle identify 0123456789ABCDEFGHI
```


## particle subscribe

Subscribes to published events on the cloud, and pipes them to the console.  

Remember that the eventName is a prefix, so if you subscribe to "test" you'll also get events "testing" and "test1234".

```sh
# opens a connection to the API so you can stream events coming from your devices
$ particle subscribe
$ particle subscribe eventName
$ particle subscribe eventName CoreName
$ particle subscribe eventName 0123456789ABCDEFGHI
```

---

```sh
# subscribe to all events for a particular device
$ particle subscribe --device deviceName
$ particle subscribe --device 0123456789abcdef01234567
```

It's also possible to subscribe to all events from a specific device in your account. 

---

```sh
# subscribe to all events published by devices within product `12345`
$ particle subscribe --product 12345
```

To listen to a product's event stream, set the `--product` flag to your product's id.

---

```sh
# subscribe to all events published by the device with id `0123456789abcdef01234567` within product `12345`
$ particle subscribe --device 0123456789abcdef01234567 prod-01 --product 12345
```

Likewise, to listen to a product device's event stream, set the `--device` flag to your device's id and the `--product` flag to your product's id.

---

```sh
# No longer necessary to use "mine" as this is the only option 
# when subscribing to events from your devices
$ particle subscribe mine
$ particle subscribe eventName mine
$ particle subscribe mine deviceName
```

Prior to August 2020, you could subscribe to the public event stream, but the public event stream is no longer available. Thus specifying special device name "mine" is no longer necessary as you only will ever receive events for your account and devices now.



## particle publish

Publishes events to the cloud via API, similar to running Particle.publish() on a Particle Device.

```sh
$ particle publish eventName
$ particle publish eventName data
$ particle publish eventName "some data with spaces"
```

---

Prior to August 2020, there were both public and private event streams. The public event stream no longer exists, thus you do not need to explicitly specify the `--private` flag. All events are private, and will be received whether `MY_DEVICES` is specified or not when subscribing on a device.

```sh
$ particle publish eventName --private
$ particle publish eventName someData --private
```

---

To send events to a product's event stream, set the `--product` flag to your product's id. Note that the product event stream cannot be received by devices - it can only be used for product webhooks and the product SSE event stream.


```sh
# publish a `temp` event with a value of `25.0` to your product `12345`'s event stream
$ particle publish temp 25.0 --product 12345
```


## particle serial

### particle serial wifi

Configure Wi-Fi credentials over serial on the Photon, P1, and Argon.

```sh
# Configure new Wi-Fi credentials for a Photon or Argon over a serial connection
$ particle serial wifi
```

You will need to use this command to set up a device using WPA2 Enterprise and services like EduRoam that use it. See [this article](https://support.particle.io/hc/en-us/articles/360039741153) for more information.

Note: Argons cannot connect to a Wi-Fi network with a hidden SSID, even using the CLI. The reason is that prior to connecting, a Wi-Fi scan is done to find the BSSID with the strongest signal and connect to that. Otherwise, on network with multiple access points, the Argon would not necessarily connect to the best AP.


### particle serial list

  Shows currently connected Particle devices acting as serial devices over USB

```sh
# shows a list of devices connected via serial usb
$ particle serial list
```


### particle serial monitor

  Starts listening to the specified serial device, and echoes to the terminal

```sh
# opens a read-only serial monitor for a particular device
$ particle serial monitor
$ particle serial monitor --port 1
$ particle serial monitor --port COM3
$ particle serial monitor --port /dev/cu.usbmodem12345
```


### particle serial flash

Flash a firmware binary over serial.

```sh
$ particle serial flash firmware.bin
```

This is a synonym for `particle flash --serial firmware.bin`.
Note that at present only binaries can be flashed using this command.
If you wish to flash from application sources, first use `particle compile` to compile a binary from sources.

If you have Device OS firmware with debugging enabled (which is the default on the Electron) then flashing via serial will fail unless debugging is disabled. You can disable debugging logs flashing Tinker via USB: `particle flash --usb tinker`.

In general, using `--usb` mode in DFU mode (blinking yellow) is a more reliable way to flash your device over USB.


### particle serial inspect

Print information about the firmware modules on a device. The device must be in listening mode (blinking blue) and connected by USB to your computer.

```sh
$ particle serial inspect
Platform: 6 - Photon
Modules
  Bootloader module #0 - version 502, main location, 16384 bytes max size
    Integrity: PASS
    Address Range: PASS
    Platform: PASS
    Dependencies: PASS
  System module #1 - version 1512, main location, 262144 bytes max size
    Integrity: PASS
    Address Range: PASS
    Platform: PASS
    Dependencies: PASS
      System module #2 - version 207
  System module #2 - version 1512, main location, 262144 bytes max size
    Integrity: PASS
    Address Range: PASS
    Platform: PASS
    Dependencies: PASS
      System module #1 - version 1512
      Bootloader module #0 - version 400
  User module #1 - version 3, main location, 131072 bytes max size
    UUID: B3A6DCD529BE70FBE24EE959C7305D58E3BC9A04ACDCE8F093C7A1F759097D09
    Integrity: PASS
    Address Range: PASS
    Platform: PASS
    Dependencies: PASS
      System module #2 - version 6
```

If you see any `FAIL` entries, there is likely a missing dependency, such as a bootloader that needs to be upgraded. Normally this will be corrected automatically over-the-air, but if you cannot connect to the cloud the dependency cannot be fixed OTA.

The version numbers in the output can be mapped to common version numbers using [this table](https://github.com/particle-iot/device-os/blob/develop/system/system-versions.md). For example, system version 1512 is more commonly known as 1.5.2.


## particle usb

Various commands to interact with a device connected through USB.

_On Windows, these commands require the latest drivers. See the [CLI installation guide](/tutorials/developer-tools/cli/#using-windows) for details._

The Particle USB commands are only available in Device OS 0.9.0 (Gen 3, including Argon and Boron), and 1.0.0 (Gen 2, including Photon, P1, Electron, and E Series). These commands are not available on the Gen 1 (Spark Core).

At this time it is possible that you can receive new devices from distributors or Particle that have an older version of Device OS than required to use these command. Doing a `particle update` will upgrade the devices to support these commands.

### particle usb list

List Particle USB devices attached to the host

```
particle usb list [--exclude-dfu] [--ids-only]
```

### particle usb start-listening

Put a device or multiple devices into the listening mode

```
particle usb start-listening [devices...] [--all]
```

Also aliases to `usb listen`.

```
particle usb listen [devices...] [--all]
```

Start listening can only be done from normal operating mode or safe mode.

### particle usb stop-listening

Make a device or multiple devices exit the listening mode

```
particle usb stop-listening [devices...] [--all]
```

Stop listening can only be done from listening mode (blinking dark blue).


### particle usb safe-mode

Put a device or multiple devices into the safe mode

```
particle usb safe-mode [devices...] [--all]
```

Safe mode can only be entered from normal operating mode (not DFU mode).


### particle usb dfu

Put a device or multiple devices into the DFU mode

```
particle usb dfu [devices...] [--all]
```

DFU mode can only be entered from normal operating mode or safe mode.

### particle usb reset

Reset a device or multiple devices

```
particle usb reset [devices...] [--all]
```

Reset can be used from normal operating mode, safe mode, or DFU mode.

### particle usb setup-done

On the Argon and Boron, the setup done flag indicates that mesh setup has been complete. This is set automatically by the mobile apps, however if you are setting up manually over USB, you will need to set the setup done flag, otherwise the device will always boot into listening mode (blinking dark blue).

```
particle usb setup-done [devices...] [--reset]
```

The `--reset` command clears the setup done flag, so the device will resume booting into listening mode.

Setup done can only be issued when in normal operating mode or safe mode. It is only applicable for Gen 3 devices (Argon, Boron).


### particle usb configure

Install udev rules for Particle USB devices (Linux-only)

```
particle usb configure
```


## particle update

Update your device to the latest Device OS release. Follow this with `particle flash --usb tinker` to reflash the default Tinker app to make your device run known good software.

```sh
# put the device in DFU mode first, then update the Device OS
$ particle update
> Your device is ready for a system update.
> This process should take about 30 seconds. Here goes!

! System firmware update successfully completed!

> Your device should now restart automatically.
```


## particle keys


### particle keys doctor

Helps you update your keys, or recover your device when the keys on the server are out of sync with the keys on your device.  The ```particle keys``` tools requires both dfu-util, and openssl to be installed.

Connect your device in [DFU mode](/tutorials/device-os/led/#dfu-mode-device-firmware-upgrade-), and run this command to replace the unique cryptographic keys on your device.  Automatically attempts to send the new public key to the cloud as well.

```sh
# helps repair key issues on a device
$ particle keys doctor 0123456789ABCDEFGHI
```

See also [`particle device doctor`](#particle-device-doctor)


### particle keys new

Generates a new public / private key pair that can be used on a device.

```sh
# generates a new public/private keypair
$ particle keys new
running openssl genrsa -out device.pem 1024
running openssl rsa -in device.pem -pubout -out device.pub.pem
running openssl rsa -in device.pem -outform DER -out device.der
New Key Created!

# generates a new public/private keypair with the filename mykey
$ particle keys new mykey
running openssl genrsa -out mykey.pem 1024
running openssl rsa -in mykey.pem -pubout -out mykey.pub.pem
running openssl rsa -in mykey.pem -outform DER -out mykey.der
New Key Created!
```


### particle keys load

Copies a ```.DER``` formatted private key onto your device's external flash.  Make sure your device is connected and in [DFU mode](/tutorials/device-os/led/#dfu-mode-device-firmware-upgrade-).  The ```particle keys``` tools requires both dfu-util, and openssl to be installed.  Make sure any key you load is sent to the cloud with ```particle keys send device.pub.pem```

```sh
# loads a key to your device via USB
# make sure your device is connected and blinking yellow
# requires dfu-util
$ particle keys load device.der
...
Saved!
```


### particle keys save

Copies a ```.DER``` formatted private key from your device's external flash to your computer.  Make sure your device is connected and in [DFU mode](/tutorials/device-os/led/#dfu-mode-device-firmware-upgrade-).  The ```particle keys``` tools requires both dfu-util, and openssl to be installed.

```sh
# creates a backup of the private key from your device to a file
# requires dfu-util
$ particle keys save device.der
...
Saved!
```


### particle keys send

Sends a device's public key to the cloud for use in opening an encrypted session with your device.  Please make sure your device has the corresponding private key loaded using the ```particle keys load``` command.

```sh
# sends a new public key to the API for use for your device
$ particle keys send 0123456789ABCDEFGHI device.pub.pem
submitting public key succeeded!
```


### particle keys server

Switches the server public key stored on the device's external flash. This command is important when changing which server your device is connecting to, and the server public key helps protect your connection. Your device will stay in DFU mode after this command, so that you can load new firmware to connect to your server. By default this will only change the server key associated with the default protocol for a device. If you wish to change a specific protocol, add `--protocol tcp` or `--protocol udp` to the end of your command.


```sh
$ particle keys server my_server.der
$ particle keys server my_server.der --protocol udp
```


#### Encoding a server address and port

When using the local cloud you can ask the CLI to encode the IP or dns address into your key to control where your device will connect. You may also specify a port number to be included.

```sh
$ particle keys server my_server.pub.pem 192.168.1.10
$ particle keys server my_server.der 192.168.1.10 9000
$ particle keys server my_server.der 192.168.1.10 9000 --protocol udp
```


### particle keys address

Reads and displays the server address, port, and protocol from a device.

```sh
$ particle keys address

tcp://device.spark.io:5683
```


### particle keys protocol

Views or changes the transport protocol used to communicate with the cloud. Available options are `tcp` and `udp` for Electrons (if you are running at least firmware version 0.4.8).

```sh
# determine the current protocol
$ particle keys protocol

# set the protocol to tcp or udp
$ particle keys protocol tcp
$ particle keys protocol udp
```


## particle nyan

Make your device shout rainbows. Useful in a hackerspace-type setting to easily identify a specific device, or to verify that your device can receive commands from the cloud.

```sh
# Activates the "shouting rainbow LED" sequence
$ particle nyan
$ particle nyan my_device_id on
$ particle nyan my_device_id off
$ particle nyan all on
$ particle nyan [on/off]
$ particle nyan [device_id/all] [on/off]
```


## particle config

The config command lets you create groups of settings and quickly switch to a profile by calling `particle config <profile-name>`. This is especially useful for switching to your local server or between other environments.

Calling `particle config particle` will switch **Particle-Cli** back to the Particle Device Cloud API server.

```sh
$ particle config my-profile-name // switch to a new profile called 'my-profile-name'
$ particle config particle // switch back to your default profile
$ particle config local apiUrl http://localhost:8080  //creates a new profile with name "local" and saves the IP-address parameter
$ particle config set proxyUrl http://proxy:8080 //changes the proxy url for the current profile
$ particle config useSudoForDfu true // sets the `useSudoForDfu` option to `true`
```

Calling `particle config` will output your current config settings.

```sh
$ particle config
Current profile: particle
Using API: https://api.particle.io
Access token: 01234567890abcdef01234567890abcdef012345
```


## particle binary

Inspect binaries


### particle binary inspect

Describe binary generated by compile.

```sh
$ particle binary inspect file.bin
file.bin
 CRC is ok (06276dc6)
 Compiled for photon
 This is a system module number 2 at version 6
 It depends on a system module number 1 at version 6
```


## particle token


### particle token list
Retrieve all the access token under your Particle account.

```sh
$ particle token list
Checking with the cloud...
? Using account cli@particle.io
Please enter your password: *******

spark-ide
 Token:      da39a3ee5e6b4b0d3255bfef95601890afd80709
 Expires at: null

cloud-compile
 Token:      da39a3ee5e6b4b0d3255bfef95601890afd80709
 Expires at: null

spark-cli
 Token:      da39a3ee5e6b4b0d3255bfef95601890afd80709
 Expires at: null

__PASSWORD_ONLY__
 Token:      da39a3ee5e6b4b0d3255bfef95601890afd80709
 Expires at: 2017-06-12T13:42:46.308Z

__PASSWORD_ONLY__
 Token:      da39a3ee5e6b4b0d3255bfef95601890afd80709
 Expires at: 2017-06-12T09:03:45.797Z

__PASSWORD_ONLY__ (active)
 Token:      da39a3ee5e6b4b0d3255bfef95601890afd80709
 Expires at: 2017-06-12T08:44:16.371Z
```


### particle token create
Create a new access token under your Particle account.

```sh
$ particle token create
? Using account cli@particle.io
Please enter your password: *******
New access token expires on Fri Jun 23 2017 23:09:24 GMT+0800 (SGT)
		da39a3ee5e6b4b0d3255bfef95601890afd80709
```

In order to change the duration a token is valid, use `--expires-in <seconds>` option. The default if not specified is 90 days.

```sh
$ particle token create --expires-in 600
```

To make a non-expiring token, use the `--never-expires` option. Short lived tokens are better for security. Reserve non-expiring tokens for hosted web applications that need to access the Particle API reliably over an indefinite period of time.


```sh
$ particle token create --never-expires
```


### particle token revoke
Revoke an access token under your Particle account.

```sh
$ particle token revoke ACCESS_TOKEN
? Using account cli@particle.io
Please enter your password: *******
successfully deleted ACCESS_TOKEN
```

The only available option is `--force` which is necessary if you want to delete the access token used by the CLI itself.


## particle product [BETA]

Access Particle Product functionality


### particle product device add

Adds one or more devices into a Product


```sh
# add device id `0123456789abcdef01234567` into product `12345`
$ particle product device add 12345 0123456789abcdef01234567
```

...or upload a `.txt` file with a single column of device ids

```sh
# add a list of devices into product `12345`
$ particle product device add 12345 --file ./path/to/device_ids.txt
```


### particle product device list

List all devices that are part of a product


```sh
# lists devices in product `12345`
$ particle product device list 12345
```
