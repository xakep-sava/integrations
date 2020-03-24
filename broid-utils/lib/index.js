"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const FileType = require("file-type");
const R = require("ramda");
const readChunk = require("read-chunk");
const rp = require("request-promise");
const validUrl = require("valid-url");
const Logger_1 = require("./Logger");
exports.Logger = Logger_1.Logger;
const cleanNulls = R.when(R.either(R.is(Array), R.is(Object)), R.pipe(R.reject(R.isNil), R.map(a => cleanNulls(a))));
exports.cleanNulls = cleanNulls;
function capitalizeFirstLetter(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}
exports.capitalizeFirstLetter = capitalizeFirstLetter;
const defaults = R.flip(R.merge);
exports.defaults = defaults;
const concat = R.compose(R.join(' '), R.reject(R.isNil));
exports.concat = concat;
function isUrl(url) {
    return validUrl.isWebUri(url);
}
exports.isUrl = isUrl;
function fileInfo(file, logger) {
    return Promise.resolve(isUrl(file))
        .then((is) => __awaiter(this, void 0, void 0, function* () {
        if (is) {
            return rp({ uri: file, encoding: null })
                .then((response) => __awaiter(this, void 0, void 0, function* () { return yield FileType.fromBuffer(Buffer.from(response, 'utf8')); }))
                .catch(error => {
                throw new Error(error);
            });
        }
        return yield FileType.fromBuffer(readChunk.sync(file, 0, 4100));
    }))
        .then(infos => R.dissoc('mime', R.assoc('mimetype', infos.mime, infos)))
        .catch(error => {
        if (logger) {
            logger.debug(error);
        }
        return { mimetype: '' };
    });
}
exports.fileInfo = fileInfo;
