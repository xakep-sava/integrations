[npm]: https://img.shields.io/badge/npm-sava.team-green.svg?style=flat
[npm-url]: https://www.npmjs.com/org/sava.team

[node]: https://img.shields.io/node/v/@sava.team/broid-google-my-musiness.svg
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

# Broid Google My Business Integration

Broid Integrations is an open source project providing a suite of Activity Streams 2 libraries for unified communications among a vast number of communication platforms.

> Connect your App to Multiple Messaging Channels with  One OpenSource Language.

[![gitter](https://badges.gitter.im/savateam/community.svg)](https://gitter.im/savateam/community)
[![site](https://img.shields.io/badge/site-sava.team-green?style=flat)](https://sava.team?utm_source=github&utm_medium=readme&utm_campaign=top&link=site)

## Message types supported

| Simple | Image | Video | Buttons | Document | Location |
|:------:|:-----:|:-----:|:-------:|:--------:|:--------:|
|   ✅    |       |      |          |          |          |

| Activity | Phone number | Collection |
|:--------:|:------------:|:----------:|
|          |              |            | 

_Phone number is platform limitation._

## Getting started

### Install

```bash
npm install --save @sava.team/broid-google-my-business
```

### Connect to Google My Business

```javascript
const broidGoogleMyBusiness = require('@sava.team/broid-google-my-business');

const googleMyBusiness = new broidGoogleMyBusiness({
  token: "<oauth_token>",
  tokenSecret: "<verify_token>",
  http: {
    port: 8080,
    host: "0.0.0.0"
  }
});

googleMyBusiness.connect()
  .subscribe({
    next: data => console.log(data),
    error: err => console.error(`Something went wrong: ${err.message}`),
    complete: () => console.log('complete'),
  });
```

**Options available**

| name             | Type     | default    | Description  |
| ---------------- |:--------:| :--------: | --------------------------|
| serviceID        | string   | random     | Arbitrary identifier of the running instance |
| logLevel         | string   | `info`     | Can be : `fatal`, `error`, `warn`, `info`, `debug`, `trace` |
| token            | string   |            | Your application token |
| tokenSecret      | string   |            | Your auth verify token (hub.verify_token) |
| consumerSecret   | string   |            | You App Secret to validate all requests |
| http             | object   |            | WebServer options (`host`, `port`) |

### Receive a message

```javascript
googleMyBusiness.listen()
  .subscribe({
    next: data => console.log(`Received message: ${data}`),
    error: err => console.error(`Something went wrong: ${err.message}`),
    complete: () => console.log('complete'),
  });
```

## Buttons supported

| mediaType             | Action types  | Content of value property |
| --------------------- |:-------------:| --------------------------|
| text/html             | web_url       | URL to be opened in the built-in browser. |
| application/vnd.geo+json | location   | Ask for the user location. |
| audio/telephone-event | phone_number  | Destination for a call in following format: "tel:123123123123". |
|                       | postback   | Text of message which client will sent back as ordinary chat message. |

## Quick replies

To send quick replies, button need to contains mediaType value "text/plain"

Example:

```json
{
  "@context": "https://www.w3.org/ns/activitystreams",
  "type": "Create",
  "generator": {
    "id": "f6e92eb6-f69e-4eae-8158-06613461cf3a",
    "type": "Service",
    "name": "messenger"
  },
  "object": {
    "type": "Note",
    "content": "Simple example with quickreplies",
    "attachment": [
      {
        "content": "Broid",
        "mediaType": "text/plain",
        "name": "broid",
        "type": "Button",
        "url": "broid_payload"
      }      
    ]
  },
  "to": {
    "type": "Person",
    "id": "1396343657196792"
  }
}
```

## Sender Actions or Activity

| content       | Action types  |                           |
| ------------- |:-------------:| --------------------------|
| typing/on     | typing_on     | Turn typing indicators on |
| typing/off    | typing_off    | Turn typing indicators off |
| typing/off    | mark_seen     | Mark last message as read |

Example of turning typing indicators on with 

```json
{
  "@context": "https://www.w3.org/ns/activitystreams",
  "type": "Create",
  "generator": {
    "id": "f6e92eb6-f69e-4eae-8158-06613461cf3a",
    "type": "Service",
    "name": "messenger"
  },
  "object": {
    "type": "Activity",
    "content": "typing/on"
  },
  "to": {
    "type": "Person",
    "id": "1396343657196792"
  }
}
```
### Not supported yet

|            | Action types   | Content of value property |
| ---------- |:--------------:| --------------------------|
|            | element_share  | Open a share dialog in Messenger. |
|            | payment        |  Opens a checkout dialog to enables purchases. |
|            | account_link   |  Sync the user account. |
|            | account_unlink |  Un sync the user account. |

### Post a message

To send a message, the format should use the [broid-schemas](https://github.com/xakep-sava/integrations/tree/master/broid-schemas).

```javascript
const formatted_message = {
  "@context": "https://www.w3.org/ns/activitystreams",
  "type": "Create",
  "generator": {
    "id": "f6e92eb6-f69e-4eae-8158-06613461cf3a",
    "type": "Service",
    "name": "messenger"
  },
  "object": {
    "type": "Note",
    "content": "hello world"
  },
  "to": {
    "type": "Person",
    "id": "1396343657196792"
  }
};

googleMyBusiness.send(formatted_message)
  .then(() => console.log("ok"))
  .catch(err => console.error(err));
```

## Examples of messages

You can find examples of sent and received messages at [Broid-Schemas](https://github.com/xakep-sava/integrations/tree/master/broid-schemas).

## Contributing to Broid

See [CONTRIBUTE.md](../CONTRIBUTE.md)

## Copyright & License

Copyright (c) 2021 SaVa.Team

This project is licensed under the AGPL 3, which can be
[found here](https://www.gnu.org/licenses/agpl-3.0.en.html).
