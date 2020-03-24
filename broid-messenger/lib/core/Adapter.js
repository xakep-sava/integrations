"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const broid_schemas_1 = require("@sava.team/broid-schemas");
const broid_utils_1 = require("@sava.team/broid-utils");
const Promise = require("bluebird");
const events_1 = require("events");
const express_1 = require("express");
const R = require("ramda");
const rp = require("request-promise");
const rxjs_1 = require("rxjs");
const uuid = require("uuid");
const helpers_1 = require("./helpers");
const Parser_1 = require("./Parser");
const WebHookServer_1 = require("./WebHookServer");
class Adapter {
    constructor(obj) {
        this.serviceID = (obj && obj.serviceID) || uuid.v4();
        this.logLevel = (obj && obj.logLevel) || 'info';
        this.token = (obj && obj.token) || null;
        this.tokenSecret = (obj && obj.tokenSecret) || null;
        this.consumerSecret = (obj && obj.consumerSecret) || null;
        this.storeUsers = new Map();
        this.parser = new Parser_1.Parser(this.serviceName(), this.serviceID, this.logLevel);
        this.logger = new broid_utils_1.Logger('adapter', this.logLevel);
        this.router = this.setupRouter();
        this.emitter = new events_1.EventEmitter();
        this.versionAPI = 'v6.0';
        if (obj.http) {
            this.webhookServer = new WebHookServer_1.WebHookServer(obj.http, this.router, this.logLevel);
        }
    }
    users() {
        return Promise.resolve(this.storeUsers);
    }
    channels() {
        return Promise.reject(new Error('Not supported'));
    }
    serviceId() {
        return this.serviceID;
    }
    serviceName() {
        return 'messenger';
    }
    getRouter() {
        if (this.webhookServer) {
            return null;
        }
        return this.router;
    }
    connect() {
        if (this.connected) {
            return rxjs_1.Observable.of({ type: 'connected', serviceID: this.serviceId() });
        }
        if (!this.token || !this.tokenSecret) {
            return rxjs_1.Observable.throw(new Error('Credentials should exist.'));
        }
        if (this.webhookServer) {
            this.webhookServer.listen();
        }
        this.connected = true;
        return rxjs_1.Observable.of({ type: 'connected', serviceID: this.serviceId() });
    }
    disconnect() {
        this.connected = false;
        return Promise.resolve(null);
    }
    listen() {
        return rxjs_1.Observable.fromEvent(this.emitter, 'message')
            .switchMap(value => {
            return rxjs_1.Observable.of(value)
                .mergeMap((event) => this.parser.normalize(event))
                .mergeMap((messages) => {
                if (!messages || R.isEmpty(messages)) {
                    return rxjs_1.Observable.empty();
                }
                return rxjs_1.Observable.from(messages);
            })
                .mergeMap((message) => this.user(message.author).then(author => R.assoc('authorInformation', author, message)))
                .mergeMap(normalized => this.parser.parse(normalized))
                .mergeMap(parsed => this.parser.validate(parsed))
                .mergeMap(validated => {
                if (!validated) {
                    return rxjs_1.Observable.empty();
                }
                return Promise.resolve(validated);
            })
                .catch(err => {
                this.logger.error('Caught Error, continuing', err);
                return rxjs_1.Observable.of(err);
            });
        })
            .mergeMap(value => {
            if (value instanceof Error) {
                return rxjs_1.Observable.empty();
            }
            return Promise.resolve(value);
        });
    }
    send(data) {
        this.logger.debug('sending', { message: data });
        return broid_schemas_1.default(data, 'send').then(() => {
            const toID = R.path(['to', 'id'], data) || R.path(['to', 'name'], data);
            const dataType = R.path(['object', 'type'], data);
            let messageData = {
                recipient: { id: toID }
            };
            if (dataType === 'Collection') {
                const items = R.filter((item) => item.type === 'Image', R.path(['object', 'items'], data));
                const elements = R.map(helpers_1.createElement, items);
                messageData = R.assoc('message', {
                    attachment: {
                        payload: {
                            elements,
                            template_type: 'generic'
                        },
                        type: 'template'
                    }
                }, messageData);
            }
            else if (['Note', 'Image', 'Video', 'Audio', 'Document'].indexOf(dataType) > -1) {
                messageData = R.assoc('message', {
                    attachment: {},
                    text: ''
                }, messageData);
                const content = R.path(['object', 'content'], data);
                const name = R.path(['object', 'name'], data) || content;
                const attachments = R.path(['object', 'attachment'], data) || [];
                const buttons = R.filter((attachment) => attachment.type === 'Button' || attachment.type === 'Link', attachments);
                const fButtons = helpers_1.createButtons(buttons);
                if (['Image', 'Audio', 'Video', 'Document'].indexOf(dataType) > -1) {
                    if (dataType === 'Video' && R.isEmpty(fButtons)) {
                        messageData.message.text = broid_utils_1.concat([name || '', content || '', R.path(['object', 'url'], data)]);
                    }
                    else {
                        messageData.message.attachment = helpers_1.createCard(name, content, fButtons, R.path(['object', 'url'], data), dataType === 'Document' ? 'File' : dataType);
                    }
                }
                else if (dataType === 'Note') {
                    const quickReplies = helpers_1.createQuickReplies(buttons);
                    if (!R.isEmpty(quickReplies)) {
                        messageData.message.quick_replies = quickReplies;
                        messageData.message.text = content;
                    }
                    else if (!R.isEmpty(fButtons)) {
                        messageData.message.attachment = helpers_1.createTextWithButtons(name, content, fButtons);
                    }
                    else {
                        messageData.message.text = content;
                    }
                }
            }
            else if (dataType === 'Activity') {
                const content = R.path(['object', 'content'], data);
                if (content === 'typing/on') {
                    messageData.sender_action = 'typing_on';
                }
                else if (content === 'typing/off') {
                    messageData.sender_action = 'typing_off';
                }
                else if (content === 'mark/seen') {
                    messageData.sender_action = 'mark_seen';
                }
            }
            if (R.isEmpty(R.path(['message', 'attachment'], messageData))) {
                delete messageData.message.attachment;
            }
            if (!R.isEmpty(messageData)) {
                this.logger.debug('Message build', { message: messageData });
                return rp({
                    json: messageData,
                    method: 'POST',
                    qs: { access_token: this.token },
                    uri: `https://graph.facebook.com/${this.versionAPI}/me/messages`
                }).then(() => ({ type: 'sent', serviceID: this.serviceId() }));
            }
            return Promise.reject(new Error('Only Note, Image, Video, Audio and Document are supported.'));
        });
    }
    user(id, fields = 'first_name,last_name', cache = true) {
        const key = `${id}${fields}`;
        if (cache) {
            const data = this.storeUsers.get(key);
            if (data) {
                return Promise.resolve(data);
            }
        }
        const params = {
            json: true,
            method: 'GET',
            qs: { access_token: this.token, fields },
            uri: `https://graph.facebook.com/${this.versionAPI}/${id}`
        };
        return rp(params)
            .catch(err => {
            if (err.message && err.message.includes('nonexisting field')) {
                params.qs.fields = 'name';
                return rp(params);
            }
            throw err;
        })
            .then((data) => {
            data.id = data.id || id;
            if (!data.first_name && data.name) {
                data.first_name = data.name;
                data.last_name = '';
            }
            this.storeUsers.set(key, data);
            return data;
        });
    }
    setupRouter() {
        const router = express_1.Router();
        router.get('/', (req, res) => {
            if (req.query['hub.mode'] === 'subscribe') {
                if (req.query['hub.verify_token'] === this.tokenSecret) {
                    res.send(req.query['hub.challenge']);
                }
                else {
                    res.send('OK');
                }
            }
        });
        router.post('/', (req, res) => {
            let verify = true;
            if (this.consumerSecret) {
                verify = helpers_1.isXHubSignatureValid(req, this.consumerSecret);
            }
            if (verify) {
                const event = {
                    request: req,
                    response: res
                };
                this.emitter.emit('message', event);
                res.sendStatus(200);
                return;
            }
            this.logger.error('Failed signature validation. Make sure the consumerSecret is match.');
            res.sendStatus(403);
        });
        return router;
    }
}
exports.Adapter = Adapter;
