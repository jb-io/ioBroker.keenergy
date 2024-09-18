"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var Client_exports = {};
__export(Client_exports, {
  default: () => Client
});
module.exports = __toCommonJS(Client_exports);
var import_axios = __toESM(require("axios"));
var import_globalUtils = __toESM(require("./globalUtils"));
class Client {
  _baseUri;
  _timeout;
  constructor(baseUri, timeout) {
    this._baseUri = baseUri;
    this._timeout = timeout;
  }
  post(uri, data = {}) {
    return new Promise((resolve, reject) => {
      import_globalUtils.default.log.silly(`POST ${this._baseUri}${uri}
=> ` + JSON.stringify(data));
      (0, import_axios.default)({
        method: "POST",
        url: `${this._baseUri}${uri}`,
        timeout: this._timeout,
        responseType: "json",
        data
      }).then((response) => {
        import_globalUtils.default.log.silly("<= " + JSON.stringify(response.data));
        if (response.status === 200) {
          resolve(response.data);
        } else {
          import_globalUtils.default.log.error(`POST ${this._baseUri}${uri} (${response.status}) ${response.statusText}`);
          reject(response.statusText);
        }
      }).catch((error) => {
        import_globalUtils.default.log.error(`POST ${this._baseUri}${uri} (error) ${error.message}`);
        reject(error);
      });
    });
  }
}
//# sourceMappingURL=Client.js.map
