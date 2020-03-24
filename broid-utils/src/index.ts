import * as FileType from 'file-type'
import * as R from 'ramda'
import * as readChunk from 'read-chunk'
import * as rp from 'request-promise'
import * as validUrl from 'valid-url'

import { Logger } from './Logger'

const cleanNulls = R.when(
  R.either(R.is(Array), R.is(Object)),
  R.pipe(
    R.reject(R.isNil),
    R.map(a => cleanNulls(a))
  )
)

// Capitalize the first character of the string
// Return a string
function capitalizeFirstLetter(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

const defaults = R.flip(R.merge)
const concat = R.compose(R.join(' '), R.reject(R.isNil))

// Check if a string is an url format
// Return a boolean
function isUrl(url) {
  return validUrl.isWebUri(url)
}

// Return information about one file
// File can be Buffer, ReadStream, file path, file name or url.
// Return an object
function fileInfo(file, logger?: Logger) {
  return Promise.resolve(isUrl(file))
    .then(async is => {
      if (is) {
        return rp({ uri: file, encoding: null })
          .then(async response => await FileType.fromBuffer(Buffer.from(response, 'utf8')))
          .catch(error => {
            throw new Error(error)
          })
      }

      return await FileType.fromBuffer(readChunk.sync(file, 0, 4100))
    })
    .then(infos => R.dissoc('mime', R.assoc('mimetype', infos.mime, infos)))
    .catch(error => {
      if (logger) {
        logger.debug(error)
      }
      return { mimetype: '' }
    })
}

export { capitalizeFirstLetter, cleanNulls, concat, defaults, fileInfo, isUrl, Logger }
