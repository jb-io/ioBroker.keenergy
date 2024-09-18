"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
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
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var globalUtils_exports = {};
__export(globalUtils_exports, {
  default: () => globalUtils_default
});
module.exports = __toCommonJS(globalUtils_exports);
class GlobalUtils {
  _adapter = null;
  constructor() {
    this._adapter = null;
  }
  set adapter(adapter) {
    this._adapter = adapter;
  }
  get adapter() {
    return this._adapter;
  }
  get log() {
    return this.adapter.log;
  }
  get config() {
    return this.adapter.config;
  }
}
const globalUtils = new GlobalUtils();
var globalUtils_default = globalUtils;
//# sourceMappingURL=globalUtils.js.map
