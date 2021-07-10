import { default as schemas, IActivityStream, IASMedia, IASObject } from '@sava.team/broid-schemas'
import { capitalizeFirstLetter, cleanNulls, concat, fileInfo, Logger } from '@sava.team/broid-utils'

import * as Promise from 'bluebird'
import * as R from 'ramda'
import * as uuid from 'uuid'

import { IWebHookEvent } from './interfaces'

export class Parser {
  public serviceID: string
  public generatorName: string
  private logger: Logger

  constructor(serviceName: string, serviceID: string, logLevel: string) {
    this.serviceID = serviceID
    this.generatorName = serviceName
    this.logger = new Logger('parser', logLevel)
  }

  // Validate parsed data with Broid schema validator
  public validate(event: any): Promise<object | null> {
    this.logger.debug('Validation process', { event })

    const parsed = cleanNulls(event)
    if (!parsed || R.isEmpty(parsed)) {
      return Promise.resolve(null)
    }

    if (!parsed.type) {
      this.logger.debug('Type not found.', { parsed })
      return Promise.resolve(null)
    }

    return schemas(parsed, 'activity')
      .then(() => parsed)
      .catch(err => {
        this.logger.error(err)
        return null
      })
  }

  // Convert normalized data to Broid schema
  public parse(event: any): Promise<any> {
    this.logger.debug('Parse process', { event })

    const normalized = cleanNulls(event)
    if (!normalized || R.isEmpty(normalized)) {
      return Promise.resolve(null)
    }

    const activitystreams = this.createActivityStream(normalized)
    activitystreams.actor = {
      id: R.path(['authorInformation', 'id'], normalized),
      name: R.path(['authorInformation', 'name'], normalized),
      type: 'Person'
    }

    activitystreams.target = {
      id: normalized.channel,
      name: normalized.channel,
      type: 'Person'
    }

    // Process potentially media.
    return Promise.map(normalized.attachments, attachment => this.parseAttachment(attachment))
      .then(R.reject(R.isNil))
      .then(attachments => {
        const places = R.filter(attachment => attachment.type === 'Place', attachments)
        const objectID = normalized.mid || this.createIdentifier()

        if (R.length(places) === 1) {
          activitystreams.object = places[0]
          activitystreams.object.id = objectID
        } else if (R.length(attachments) === 1) {
          const attachment: IASMedia = attachments[0]
          activitystreams.object = {
            id: objectID,
            type: attachment.type,
            url: attachment.url
          }

          if (attachment.mediaType) {
            activitystreams.object.mediaType = attachment.mediaType
          }
        } else if (R.length(attachments) > 1) {
          activitystreams.object = {
            attachment: attachments,
            content: normalized.content || '',
            id: objectID,
            type: 'Note'
          }
        } else if (R.path(['quickReply', 'payload'], normalized)) {
          activitystreams.object = {
            content: R.path(['quickReply', 'payload'], normalized),
            id: objectID,
            name: normalized.content || '',
            type: 'Note'
          }
        }

        return activitystreams
      })
      .then(as2 => {
        if (!as2.object && !R.isEmpty(normalized.content)) {
          as2.object = {
            content: normalized.content,
            id: normalized.mid || this.createIdentifier(),
            type: 'Note'
          }
        }

        if (normalized.title) {
          as2.object.name = normalized.title
        }

        return as2
      })
  }

  // Normalize the raw event
  public normalize(event: IWebHookEvent): Promise<IActivityStream> {
    this.logger.debug('Event received to normalize')

    const req = event.response.req
    const body = req.body

    if (!body || R.isEmpty(body) || !body.entry[0] || !body.entry[0].messaging) {
      return Promise.resolve(null)
    }

    const messages = R.map(
      (entry: any) =>
        R.map((data: any) => {
          if (data.message) {
            return {
              author: data.sender.id,
              attachments: [],
              authorInformation: {
                id: data.sender.id || 0,
                name: 'Test'
              },
              channel: data.sender.id,
              content: data.message.text || null,
              createdTimestamp: data.timestamp,
              mid: data.message.mid,
              quickReply: data.message.quick_reply || [],
            }
          }
          return null
        }, entry.messaging),
      body.entry
    )

    return Promise.resolve(R.reject(R.isNil)(R.flatten(messages)))
  }

  private createIdentifier(): string {
    return uuid.v4()
  }

  private createActivityStream(normalized: any): IActivityStream {
    return {
      '@context': 'https://www.w3.org/ns/activitystreams',
      generator: {
        id: this.serviceID,
        name: this.generatorName,
        type: 'Service'
      },
      published: normalized.createdTimestamp
        ? Math.floor(normalized.createdTimestamp / 1000)
        : Math.floor(Date.now() / 1000),
      type: 'Create'
    }
  }

  private parseAttachment(attachment: any): Promise<IASMedia | IASObject | null> {
    let attachmentType = attachment.type || ''
    attachmentType = attachmentType.toLowerCase()

    if (['image', 'audio', 'video', 'file'].indexOf(attachmentType) > -1) {
      const url: string = R.path(['payload', 'url'], attachment)

      const a: IASMedia = {
        type: capitalizeFirstLetter(attachmentType === 'file' ? 'document' : attachmentType),
        content:
          url
            ?.split('/')
            ?.reverse()[0]
            ?.split('?')[0] ?? '',
        url
      }

      return Promise.resolve(a).then(am => {
        if (am.url) {
          return fileInfo(am.url, this.logger).then(infos => R.assoc('mediaType', infos.mimetype, am))
        }
        return null
      })
    // } else if (attachmentType === 'location') {
    //   return Promise.resolve({
    //     id: this.createIdentifier(),
    //     latitude: R.path(['payload', 'coordinates', 'lat'], attachment),
    //     longitude: R.path(['payload', 'coordinates', 'long'], attachment),
    //     name: attachment.title,
    //     type: 'Place'
    //   } as IASObject) // tslint:disable-line:no-object-literal-type-assertion
    }
    // TODO
    // else if (attachmentType === 'template') {
    //   // "template_type": "generic",
    //   // Handle with collection
    //
    // }

    return Promise.resolve(null)
  }
}
