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
var KebaMiddleware_exports = {};
__export(KebaMiddleware_exports, {
  default: () => KebaMiddleware_default
});
module.exports = __toCommonJS(KebaMiddleware_exports);
var import_KebaStateTransformer = __toESM(require("./KebaStateTransformer"));
var import_Keba = __toESM(require("./Keba"));
class KebaMiddleware {
  _keba;
  _stateConfigurations = null;
  _idToName = {};
  _nameToId = {};
  constructor() {
    this._keba = new import_Keba.default();
  }
  get keba() {
    return this._keba;
  }
  normalizeStateValue(val, type) {
    switch (type) {
      case "numeric":
        return parseFloat(val);
      case "bool":
        return val === "true";
    }
    return val;
  }
  denormalizeStateValue(val, type) {
    switch (type) {
      case "numeric":
        return `${val}`;
      case "bool":
        return val ? "true" : "false";
    }
    return `${val}`;
  }
  async readStates(ids) {
    const states = {};
    const names = ids.map((id) => this.getNameFromId(id));
    const data = await this._keba.readVars(names);
    for (const { name, value } of data) {
      const id = this.getIdFromName(name);
      const stateConfiguration = await this.getStateConfiguration(id);
      states[id] = this.normalizeStateValue(value, stateConfiguration.native.type);
    }
    return states;
  }
  async readState(id) {
    const name = this.getNameFromId(id);
    const { value } = await this._keba.readVar(name);
    const stateConfiguration = await this.getStateConfiguration(id);
    return this.normalizeStateValue(value, stateConfiguration.native.type);
  }
  async writeState(id, value) {
    const stateConfiguration = await this.getStateConfiguration(id);
    if (!stateConfiguration.common.write) {
      throw new Error(`State ${id} is not writable.`);
    }
    await this._keba.writeVar(
      stateConfiguration.native.name,
      this.denormalizeStateValue(value, stateConfiguration.native.type)
    );
    return await this.readState(id);
  }
  async getStateConfigurations() {
    if (!this._stateConfigurations) {
      this._stateConfigurations = {};
      const stateTransformer = new import_KebaStateTransformer.default();
      const readWriteVars = await this._keba.getReadWriteVars();
      for (const name in readWriteVars) {
        const stateConfiguration = stateTransformer.transformVarToSate(name, readWriteVars[name]);
        const id = stateTransformer.transformNameToId(name);
        this._nameToId[name] = id;
        this._idToName[id] = name;
        this._stateConfigurations[id] = stateConfiguration;
      }
    }
    return this._stateConfigurations;
  }
  /**
   * @param {string} id
   * @returns {Promise<StateConfiguration>}
   */
  async getStateConfiguration(id) {
    return (await this.getStateConfigurations())[id];
  }
  /**
   * @param {string} name
   * @returns {string}
   */
  getIdFromName(name) {
    return this._nameToId[name];
  }
  /**
   * @param {string} id
   * @returns {string}
   */
  getNameFromId(id) {
    return this._idToName[id];
  }
}
var KebaMiddleware_default = KebaMiddleware;
//# sourceMappingURL=KebaMiddleware.js.map
