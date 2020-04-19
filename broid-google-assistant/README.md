[npm]: https://img.shields.io/badge/npm-sava.team-green.svg?style=flat
[npm-url]: https://www.npmjs.com/org/sava.team

[node]: https://img.shields.io/node/v/@sava.team/google-assistant.svg
[node-url]: https://nodejs.org

[deps]: https://img.shields.io/badge/dependencies-checked-green.svg?style=flat
[deps-url]: #integrations

[tests]: https://img.shields.io/travis/xakep-sava/integrations/master.svg
[tests-url]: https://travis-ci.org/xakep-sava/integrations

[nsp-checked]: https://img.shields.io/badge/nsp-checked-green.svg?style=flat
[nsp-checked-url]: https://nodesecurity.io

[![npm][npm]][npm-url]
[![node][node]][node-url]
[![deps][deps]][deps-url]
[![tests][tests]][tests-url]
[![nsp-checked][nsp-checked]][nsp-checked-url]

[![Build](https://www.buymeacoffee.com/assets/img/custom_images/orange_img.png)](https://www.buymeacoffee.com/sava)

# Broid Google Assistant Integration

Broid Integrations is an open source project providing a suite of Activity Streams 2 libraries for unified communications among a vast number of communication platforms.

> Connect your App to Multiple Messaging Channels with  One OpenSource Language.

[![gitter](https://badges.gitter.im/savateam/community.svg)](https://gitter.im/savateam/community)
[![site](https://img.shields.io/badge/site-sava.team-green?style=flat)](https://sava.team?utm_source=github&utm_medium=readme&utm_campaign=top&link=site)

## Message types supported

| Simple | Image | Video | Buttons | Location | Phone number |
|:------:|:-----:|:-----:|:-------:|:--------:|:------------:|
|   ✅    |       |       |         |          |              |

_Image, Video, Buttons, Location, Phone number are platform limitations._

## Getting started

### Install

```bash
npm install --save @sava.team/broid-google-assistant
```

### Connect to Google Assistant

```javascript
const BroidGoogleAssistant = require('@sava.team/broid-google-assistant');

const googleAssistant = new BroidGoogleAssistant({
  username: '<your_action_name_here>',
  http: {
    port: 8080,
    host: "0.0.0.0"
  }
});

googleAssistant.connect()
  .subscribe({
    next: data => console.log(data),
    error: err => console.error(`Something went wrong: ${err.message}`),
    complete: () => console.log('complete'),
  });
```

Google Assitant can also be used with your existing express setup.

```javascript
const BroidGoogleAssistant = require('@sava.team/broid-google-assistant');
const express = require("express");

const googleAssistant = new BroidGoogleAssistant({
  username: '<your_action_name_here>',
});

const app = express();
app.use("/googleAssistant", googleAssistant.getRouter());

googleAssistant.connect()
  .subscribe({
    next: data => console.log(data),
    error: err => console.error(`Something went wrong: ${err.message}`),
    complete: () => console.log('complete'),
  });

app.listen(8080);
```

**Options available**

| name            | Type     | default    | Description  |
| --------------- |:--------:| :--------: | --------------------------|
| serviceID       | string   | random     | Arbitrary identifier of the running instance |
| logLevel        | string   | `info`     | Can be : `fatal`, `error`, `warn`, `info`, `debug`, `trace` |
| username        | string   |            | Your action name here |
| http            | object   | `{ "port": 8080, "http": "0.0.0.0" }` | WebServer options (`host`, `port`) |

### Receive a message

```javascript
googleAssistant.listen()
  .subscribe({
    next: data => console.log(`Received message: ${data}`),
    error: err => console.error(`Something went wrong: ${err.message}`),
    complete: () => console.log('complete'),
  });
```

### Post a message

To send a message, the format should use the [broid-schemas](https://github.com/xakep-sava/integrations/tree/master/broid-schemas).

```javascript
const formatted_message = {
  "@context": "https://www.w3.org/ns/activitystreams",
  "type": "Create",
  "generator": {
    "id": "f6e92eb6-f69e-4eae-8158-06613461cf3a",
    "type": "Service",
    "name": "google-assistant"
  },
  "object": {
    "type": "Note",
    "content": "What is the weather like tomorrow?"
  },
  "to": {
    "id": "IL12J7nWa/2zothSEg46DsY0q7o/H9FUis/YGdp64te=",
    "type": "Person"
  }
};

googleAssistant.send(formatted_message)
  .then(() => console.log("ok"))
  .catch(err => console.error(err));
```

## Examples of messages

You can find examples of sent and received messages at [Broid-Schemas](https://github.com/xakep-sava/integrations/tree/master/broid-schemas).

## Contributing to Broid

See [CONTRIBUTE.md](../CONTRIBUTE.md)

## Copyright & License

Copyright (c) 2020 SaVa.Team

This project is licensed under the AGPL 3, which can be
[found here](https://www.gnu.org/licenses/agpl-3.0.en.html).
