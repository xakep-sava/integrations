import schemas from '@sava.team/broid-schemas'
import { concat, Logger } from '@sava.team/broid-utils'
import * as Promise from 'bluebird'
import { EventEmitter } from 'events'
import { Router } from 'express'
import * as R from 'ramda'
import * as rp from 'request-promise'
import { Observable } from 'rxjs'
import * as uuid from 'uuid'

import {
  createButtons,
  createCard,
  createElement,
  createQuickReplies,
  createTextWithButtons,
  isXHubSignatureValid
} from './helpers'
import { IAdapterOptions, IWebHookEvent } from './interfaces'
import { Parser } from './Parser'
import { WebHookServer } from './WebHookServer'

export class Adapter {
  private connected: boolean
  private emitter: EventEmitter
  private logLevel: string
  private logger: Logger
  private parser: Parser
  private router: Router
  private serviceID: string
  private storeUsers: Map<string, object>
  private connections: Map<string, object>
  private token: string | null
  private tokenSecret: string | null
  private consumerSecret: string | null
  private webhookServer: WebHookServer
  private versionAPI: string

  constructor(obj: IAdapterOptions) {
    this.serviceID = (obj && obj.serviceID) || uuid.v4()
    this.logLevel = (obj && obj.logLevel) || 'info'
    this.token = (obj && obj.token) || null
    this.tokenSecret = (obj && obj.tokenSecret) || null
    this.consumerSecret = (obj && obj.consumerSecret) || null
    this.storeUsers = new Map()
    this.connections = new Map()

    this.parser = new Parser(this.serviceName(), this.serviceID, this.logLevel)
    this.logger = new Logger('adapter', this.logLevel)
    this.router = this.setupRouter()
    this.emitter = new EventEmitter()
    this.versionAPI = 'v10.0'

    if (obj.http) {
      this.webhookServer = new WebHookServer(obj.http, this.router, this.logLevel)
    }
  }

  // Return list of users information
  public users(): Promise<Map<string, object>> {
    return Promise.resolve(this.storeUsers)
  }

  // Return list of channels information
  public channels(): Promise<Error> {
    return Promise.reject(new Error('Not supported'))
  }

  // Return the service ID of the current instance
  public serviceId(): string {
    return this.serviceID
  }

  public serviceName(): string {
    return 'google-my-business'
  }

  public getRouter(): Router | null {
    if (this.webhookServer) {
      return null
    }
    return this.router
  }

  // Connect to Google My Business
  // Start the webhook server
  public connect(): Observable<object> {
    if (this.connected) {
      return Observable.of({ type: 'connected', serviceID: this.serviceId() })
    }

    // if (!this.token || !this.tokenSecret) {
    //   return Observable.throw(new Error('Credentials should exist.'))
    // }

    if (this.webhookServer) {
      this.webhookServer.listen()
    }

    this.connected = true
    return Observable.of({ type: 'connected', serviceID: this.serviceId() })
  }

  public addConnection(pageId: string, accessToken: string = '', additionalData: object = {}) {
    this.connections.set(pageId, { accessToken, ...additionalData })
  }

  public getConnection(pageId: string): any {
    return this.connections.size && this.connections.get(pageId) || null
  }

  public removeConnection(pageId: string) {
    this.connections.delete(pageId)
  }

  public getConnections(): Map<string, object> {
    return this.connections
  }

  public disconnect(): Promise<null> {
    this.connected = false
    return Promise.resolve(null)
  }

  // Listen 'message' event from Google My Business
  public listen(): Observable<object> {
    return Observable.fromEvent(this.emitter, 'message')
      .switchMap(value => {
        return Observable.of(value)
          .mergeMap((event: IWebHookEvent) => this.parser.normalize(event))
          .mergeMap((messages: any) => {
            if (!messages || R.isEmpty(messages)) {
              return Observable.empty()
            }
            return Observable.from(messages)
          })
          .mergeMap(normalized => this.parser.parse(normalized))
          .mergeMap(parsed => this.parser.validate(parsed))
          .mergeMap(validated => {
            if (!validated) {
              return Observable.empty()
            }
            return Promise.resolve(validated)
          })
          .catch(err => {
            this.logger.error('Caught Error, continuing', err)
            // Return an empty Observable which gets collapsed in the output
            return Observable.of(err)
          })
      })
      .mergeMap(value => {
        if (value instanceof Error) {
          return Observable.empty()
        }
        return Promise.resolve(value)
      })
  }

  public send(data: object): Promise<object | Error> {
    this.logger.debug('sending', { message: data })

    return schemas(data, 'send').then(() => {
      const toID: string = (R.path(['to', 'id'], data) as string) || (R.path(['to', 'name'], data) as string)
      const dataType: string = R.path(['object', 'type'], data) as string

      let messageData: any = {
        recipient: { id: toID }
      }

      if (dataType === 'Collection') {
        const items: any = R.filter((item: any) => item.type === 'Image', R.path(['object', 'items'], data) as any)
        const elements = R.map(createElement, items)

        messageData = R.assoc(
          'message',
          {
            attachment: {
              payload: {
                elements,
                template_type: 'generic'
              },
              type: 'template'
            }
          },
          messageData
        )
      } else if (['Note', 'Image', 'Video', 'Audio', 'Document'].indexOf(dataType) > -1) {
        messageData = R.assoc(
          'message',
          {
            attachment: {},
            text: ''
          },
          messageData
        )

        let content: string = R.path(['object', 'content'], data) as string
        let name: string = (R.path(['object', 'name'], data) as string) || content
        const attachments: any[] = (R.path(['object', 'attachment'], data) as any[]) || []
        const buttons = R.filter(
          (attachment: any) => attachment.type === 'Button' || attachment.type === 'Link',
          attachments
        )
        const fButtons = createButtons(buttons)

        if (['Image', 'Audio', 'Video', 'Document'].indexOf(dataType) > -1) {
          if (dataType === 'Video' && R.isEmpty(fButtons)) {
            messageData.message.text = concat([name || '', content || '', R.path(['object', 'url'], data)])
          } else {
            if (dataType === 'Image') {
              name = content = 'ᅠ'
            }

            messageData.message.attachment = createCard(
              name,
              content,
              fButtons,
              R.path(['object', 'url'], data),
              dataType === 'Document' ? 'File' : dataType
            )
          }
        } else if (dataType === 'Note') {
          const quickReplies = createQuickReplies(buttons)

          if (!R.isEmpty(quickReplies)) {
            messageData.message.quick_replies = quickReplies
            messageData.message.text = content
          } else if (!R.isEmpty(fButtons)) {
            messageData.message.attachment = createTextWithButtons(name, content, fButtons)
          } else {
            messageData.message.text = content
          }
        }
      } else if (dataType === 'Activity') {
        const content: string = R.path(['object', 'content'], data) as string
        if (content === 'typing/on') {
          messageData.sender_action = 'typing_on'
        } else if (content === 'typing/off') {
          messageData.sender_action = 'typing_off'
        } else if (content === 'mark/seen') {
          messageData.sender_action = 'mark_seen'
        }
      }

      if (R.isEmpty(R.path(['message', 'attachment'], messageData))) {
        delete messageData.message.attachment
      }

     /* if (!R.isEmpty(messageData)) {
        this.logger.debug('Message build', { message: messageData })
        const connection = pageId && this.getConnection(pageId)

        return rp({
          json: messageData,
          method: 'POST',
          qs: { access_token: connection && connection.accessToken || this.token },
          uri: `https://graph.facebook.com/${this.versionAPI}/me/messages`
        }).then(() => ({ type: 'sent', serviceID: this.serviceId() }))
      } */

      return Promise.reject(new Error('Only Note is supported.'))
    })
  }

  private setupRouter(): Router {
    const router = Router()

    // route handler
    router.post('/', (req, res) => {
      const event: IWebHookEvent = {
        request: req,
        response: res
      }

      this.emitter.emit('message', event)

      // Assume all went well.
      res.sendStatus(200)
      return
    })

    return router
  }
}
