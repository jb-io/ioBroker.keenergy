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
var Keba_exports = {};
__export(Keba_exports, {
  default: () => Keba_default
});
module.exports = __toCommonJS(Keba_exports);
var import_globalUtils = __toESM(require("./globalUtils"));
var import_KebaClient = __toESM(require("./KebaClient"));
var import_MaskTreeParser = __toESM(require("./MaskTreeParser"));
class Keba {
  kebaClient;
  _languageCode;
  _systemUnit;
  _readAllUnits;
  _readAllFormats;
  _readMaskTree;
  _readWriteVars;
  constructor() {
    this.kebaClient = new import_KebaClient.default();
  }
  /**
   * @returns {Promise<boolean>}
   */
  async checkConnection() {
    const host = import_globalUtils.default.config.host;
    if (await this.kebaClient.getDateTime()) {
      import_globalUtils.default.log.debug(`Connection established to ${host}`);
      return true;
    }
    import_globalUtils.default.log.error(`Errors while trying to connect to ${host}`);
    return false;
  }
  /**
   * @returns {Promise<SystemLanguageCode>}
   */
  async getLanguageCode() {
    if (!this._languageCode) {
      if (import_globalUtils.default.config.languageCode === "auto") {
        this._languageCode = await this.kebaClient.getLanguageCode() || "en";
      } else {
        this._languageCode = import_globalUtils.default.config.languageCode;
      }
    }
    return this._languageCode;
  }
  /**
   * @returns {Promise<SystemUnit>}
   */
  async getSystemUnit() {
    if (!this._systemUnit) {
      if (import_globalUtils.default.config.systemUnit === "auto") {
        this._systemUnit = await this.kebaClient.getSystemUnit();
      } else {
        this._systemUnit = import_globalUtils.default.config.systemUnit;
      }
    }
    return this._systemUnit;
  }
  async readAllUnits() {
    if (!this._readAllUnits) {
      const systemUnit = await this.getSystemUnit();
      const unitProperty = systemUnit.toLowerCase() === "imperial" ? "textImperial" : "textIso";
      this._readAllUnits = {};
      const units = await this.kebaClient.readAllUnits(await this.getLanguageCode());
      for (const unit of units) {
        const identifierProperty = "unitId";
        if (unit[identifierProperty] && unit[unitProperty]) {
          this._readAllUnits[unit[identifierProperty]] = unit[unitProperty];
        }
      }
    }
    return this._readAllUnits;
  }
  async readAllFormats() {
    if (!this._readAllFormats) {
      this._readAllFormats = {};
      const formats = await this.kebaClient.readAllFormats(await this.getLanguageCode());
      for (const format of formats) {
        const identifierProperty = "formatId";
        const valueProperty = "formatTexts";
        if (format[identifierProperty] && format[valueProperty]) {
          this._readAllFormats[format[identifierProperty]] = format[valueProperty].split("|");
        }
      }
    }
    return this._readAllFormats;
  }
  async readMaskTreeGetContent() {
    if (!this._readMaskTree) {
      this._readMaskTree = await this.kebaClient.readMaskTreeGetContent();
    }
    return this._readMaskTree;
  }
  async readVar(id, withAttributes = false) {
    return (await this.readVars([id], withAttributes))[0];
  }
  async readVars(ids, withAttributes = false) {
    const blockSize = 50;
    const postData = [];
    for (const id of ids) {
      const item = { name: id };
      if (withAttributes) {
        item.attr = "1";
      }
      postData.push(item);
    }
    const result = [];
    const languageCode = await this.getLanguageCode();
    while (postData.length > 0) {
      const postDataSub = postData.splice(0, blockSize);
      result.push(...await this.kebaClient.readVars(languageCode, postDataSub));
    }
    return result;
  }
  async writeVar(id, value) {
    return await this.writeVars({ [id]: value });
  }
  async writeVars(values) {
    const data = [];
    for (const id in values) {
      data.push({ name: id, value: values[id] });
    }
    return await this.kebaClient.writeVars(data);
  }
  async getReadWriteVars() {
    if (!this._readWriteVars) {
      const parser = new import_MaskTreeParser.default(this);
      this._readWriteVars = await parser.getVarsFromMaskTree();
    }
    return this._readWriteVars;
  }
}
var Keba_default = Keba;
//# sourceMappingURL=Keba.js.map
