"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
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
var utils = __toESM(require("@iobroker/adapter-core"));
var import_KebaMiddleware = __toESM(require("./lib/KebaMiddleware"));
var import_globalUtils = __toESM(require("./lib/globalUtils"));
class Keenergy extends utils.Adapter {
  _periodically = null;
  _kebaMiddleware = null;
  _stateIds = [];
  constructor(options = {}) {
    super({
      ...options,
      name: "keenergy"
    });
    this.on("ready", this.onReady.bind(this));
    this.on("stateChange", this.onStateChange.bind(this));
    this.on("unload", this.onUnload.bind(this));
    this._periodically = null;
    this._kebaMiddleware = null;
    this._stateIds = [];
  }
  init() {
    import_globalUtils.default.adapter = this;
  }
  get kebaMiddleware() {
    if (!this._kebaMiddleware) {
      this._kebaMiddleware = new import_KebaMiddleware.default();
    }
    return this._kebaMiddleware;
  }
  setConnectionState(state) {
    this.setState("info.connection", state, true);
  }
  /**
   * Is called when databases are connected and adapter received configuration.
   */
  async onReady() {
    this.setConnectionState(false);
    this.init();
    if (await this.kebaMiddleware.keba.checkConnection()) {
      this.setConnectionState(true);
      await this.createStates();
      this.registerPeriodicalCall();
    }
  }
  async createStates() {
    if (this.config.reloadAllStates) {
      const existingStateIds = await this.getExistingStateIds();
      for (const id in existingStateIds) {
        await this.delStateAsync(this.removeNamespaceFromStateId(id));
      }
    }
    const stateConfigurations = await this.kebaMiddleware.getStateConfigurations();
    for (const id in stateConfigurations) {
      const stateConfiguration = stateConfigurations[id];
      await this.setObjectNotExistsAsync(id, stateConfiguration).then(() => {
        this._stateIds.push(id);
      });
      if (stateConfiguration.common && stateConfiguration.common.write) {
        this.subscribeStates(id);
      }
    }
  }
  registerPeriodicalCall() {
    const updateInterval = parseInt(this.config.updateInterval) * 1e3;
    this._periodically = this.setInterval(this.onPeriodically.bind(this), updateInterval);
  }
  async onPeriodically() {
    if (await this.kebaMiddleware.keba.checkConnection()) {
      const states = await this.kebaMiddleware.readStates(this._stateIds);
      const existingStateIds = await this.getExistingStateIds();
      for (const id in states) {
        const val = states[id];
        if (!existingStateIds.includes(id)) {
          const stateConfiguration = await this.kebaMiddleware.getStateConfiguration(id);
          await this.setObjectNotExistsAsync(id, stateConfiguration);
        }
        await this.setState(id, val, true);
      }
    }
  }
  async getExistingStateIds() {
    return Object.keys(await this.getStatesAsync("APPL.*")).map((id) => this.removeNamespaceFromStateId(id));
  }
  /**
   * Is called when adapter shuts down - callback has to be called under any circumstances!
   */
  onUnload(callback) {
    try {
      if (this._periodically) {
        this.clearInterval(this._periodically);
      }
      callback();
    } catch {
      callback();
    }
  }
  /**
   * Is called if a subscribed state changes
   */
  async onStateDeleted(id) {
    this.log.warn(`state ${id} deleted`);
    this.log.debug(`recreate state ${id} in order to avoid errors.`);
    const stateConfiguration = await this.kebaMiddleware.getStateConfiguration(id);
    await this.setObjectNotExistsAsync(id, stateConfiguration);
    const val = await this.kebaMiddleware.readState(id);
    await this.setState(id, val, true);
  }
  /**
   * Is called if a subscribed state changes
   */
  async onStateChangeExternal(id, state) {
    try {
      if (null !== state.val) {
        const newVal = await this.kebaMiddleware.writeState(id, state.val);
        this.log.info(`state ${id} changed: ${state.val} (ack = ${state.ack}, by = ${state.from})`);
        await this.setState(id, newVal, true);
      } else {
        this.log.warn(`Ignoring state ${id} changed: ${state.val} (ack = ${state.ack}, by = ${state.from}) because value must not be null.`);
      }
    } catch (e) {
      this.log.warn(`Ignoring state ${id} changed: ${state.val} (ack = ${state.ack}, by = ${state.from}) because var is not writable.`);
    }
  }
  removeNamespaceFromStateId(id) {
    if (id.search(this.namespace) === 0) {
      id = id.substring(this.namespace.length + 1);
    }
    return id;
  }
  /**
   * Is called if a subscribed state changes
   * @param {string} id
   * @param {ioBroker.State | null | undefined} state
   */
  async onStateChange(id, state) {
    id = this.removeNamespaceFromStateId(id);
    if (!state) {
      await this.onStateDeleted(id);
      return;
    }
    if (!state.ack) {
      await this.onStateChangeExternal(id, state);
    }
  }
}
if (require.main !== module) {
  module.exports = (options) => new Keenergy(options);
} else {
  new Keenergy();
}
//# sourceMappingURL=main.js.map
