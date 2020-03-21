[npm]: https://img.shields.io/badge/npm-sava.team-green.svg?style=flat
[npm-url]: https://www.npmjs.com/org/sava.team

[node]: https://img.shields.io/node/v/@sava.team/broid-telegram.svg
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

# Broid Telegram Integration

Integrations is an open source project providing a suite of Activity Streams 2 libraries for unified communications among a vast number of communication platforms.

> Connect your App to Multiple Messaging Channels with  One OpenSource Language.

[![gitter](https://badges.gitter.im/savateam/community.svg)](https://gitter.im/savateam/community)
[![slackin](https://img.shields.io/badge/site-sava.team-green?style=flat)](https://sava.team?utm_source=github&utm_medium=readme&utm_campaign=top&link=site)

## Message types supported

| Simple | Image | Video | Buttons | Location | Phone number | Audio | Document |
|:------:|:-----:|:-----:|:-------:|:--------:|:------------:|:-----:|:---------:
|   ✅    |   ✅   |   ✅   |    ✅    |          |              |  ✅  |    ✅    |

_Location, Phone number are platform limitations._

## Getting started

### Install

```bash
npm install --save @sava.team/broid-telegram
```

### Connect to Telegram

```javascript
const BroidTelegram = require('@sava.team/broid-telegram');

const telegram = new BroidTelegram({
  token: "<api_key>",
  webhookURL: "http://127.0.0.1",
  http: {
    host: "127.0.0.1",
    port: 8080
  }
});

telegram.connect()
  .subscribe({
    next: data => console.log(data),
    error: err => console.error(`Something went wrong: ${err.message}`),
    complete: () => console.log('complete'),
  });
```

Telegram can also be used with your existing express setup.

```javascript
const BroidTelegram = require('@sava.team/broid-telegram');
const express = require("express");

const telegram = new BroidTelegram({
  token: "<api_key>",
  webhookURL: "http://127.0.0.1"
});

const app = express();
app.use("/telegram", telegram.getRouter());

telegram.connect()
  .subscribe({
    next: data => console.log(data),
    error: err => console.error(`Something went wrong: ${err.message}`),
    complete: () => console.log('complete'),
  });

app.listen(8080);
```

**Options available**

| name             | Type     | default    | Description  |
| ---------------- |:--------:| :--------: | --------------------------|
| serviceID        | string   | random     | Arbitrary identifier of the running instance |
| logLevel         | string   | `info`     | Can be : `fatal`, `error`, `warn`, `info`, `debug`, `trace` |
| token            | string   |            | Your API Key |
| http             | object   | `{ "port": 8080, "http": "0.0.0.0", "webhookURL": "127.0.0.1" }` | WebServer options (`host`, `port`, `webhookURL`) |

### Receive a message

```javascript
telegram.listen()
  .subscribe({
    next: data => console.log(`Received message: ${data}`),
    error: err => console.error(`Something went wrong: ${err.message}`),
    complete: () => console.log('complete'),
  });
```

## Buttons supported

| mediaType             | Action types  | Content of value property |
| --------------------- |:-------------:| --------------------------|
| text/html             | redirect      | URL to be opened in the built-in browser. |
|                       | postback   | Text of message which client will sent back as ordinary chat message. |


### Post a message

To send a message, the format should use the [broid-schemas](https://github.com/xakep-sava/integrations/tree/master/broid-schemas).

```javascript
const formatted_message = {
  "@context": "https://www.w3.org/ns/activitystreams",
  "type": "Create",
  "generator": {
    "id": "f6e92eb6-f69e-4eae-8158-06613461cf3a",
    "type": "Service",
    "name": "telegram"
  },
  "object": {
    "type": "Note",
    "content": "hello world"
  },
  "to": {
    "type": "Person",
    "id": "43418004"
  }
};

telegram.send(formatted_message)
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
