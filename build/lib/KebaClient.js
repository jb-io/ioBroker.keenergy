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
var KebaClient_exports = {};
__export(KebaClient_exports, {
  default: () => KebaClient_default
});
module.exports = __toCommonJS(KebaClient_exports);
var import_globalUtils = __toESM(require("./globalUtils"));
var import_Client = __toESM(require("./Client"));
class KebaClient {
  client;
  constructor() {
    this.client = new import_Client.default(`http://${import_globalUtils.default.config.host}`, 3e3);
  }
  /**
   * @returns {Promise<ResponseDateTime | null>}
   */
  async getDateTime() {
    return new Promise((resolve) => {
      this.client.post("/dateTime?action=getDateTime").then((data) => {
        resolve(data);
      }).catch(() => {
        import_globalUtils.default.log.error("Failed to get DateTime from host.");
        resolve(null);
      });
    });
  }
  /**
   * @returns {Promise<"de" | "en" | "fr" | null>}
   */
  async getLanguageCode() {
    return new Promise((resolve) => {
      this.client.post("/var/readWriteVars?action=read", { name: "APPL.CtrlAppl.sParam.hmiRetainData.systemLanguage" }).then((data) => {
        resolve(data.value);
      }).catch(() => {
        import_globalUtils.default.log.error("Failed to get LanguageCode from host.");
        resolve(null);
      });
    });
  }
  /**
   * @returns {Promise<"ISO" | "imperial" | null>}
   */
  async getSystemUnit() {
    return new Promise((resolve) => {
      this.client.post("/var/readWriteVars?action=read", { name: "APPL.CtrlAppl.sParam.hmiRetainData.systemUnit" }).then((data) => {
        resolve(data.value);
      }).catch(() => {
        import_globalUtils.default.log.error("Failed to get SystemUnit from host.");
        resolve(null);
      });
    });
  }
  /**
   * @param {string} languageCode
   * @returns {Promise<Array<UnitObject>>}
   */
  async readAllUnits(languageCode) {
    return new Promise((resolve) => {
      this.client.post(`/var/readAllUnits?action=getUnits&languageCode=${languageCode}`).then((data) => {
        resolve(data.units);
      }).catch(() => {
        import_globalUtils.default.log.error("Failed to get all Units from host.");
        resolve([]);
      });
    });
  }
  /**
   * @param {string} languageCode
   * @returns {Promise<Array<FormatObject>>}
   */
  async readAllFormats(languageCode) {
    return new Promise((resolve) => {
      this.client.post(`/var/readAllFormats?action=getFormats&languageCode=${languageCode}`).then((data) => {
        resolve(data.formats);
      }).catch(() => {
        import_globalUtils.default.log.error("Failed to get all Formats from host.");
        resolve([]);
      });
    });
  }
  /**
   * @returns {Promise<string>}
   */
  async readMaskTreeGetContent() {
    return new Promise((resolve) => {
      this.client.post("/readMaskTree?action=getcontent", { filename: "DetailMask.xml" }).then(({ content: xmlContent }) => {
        resolve(xmlContent);
      }).catch(() => {
        import_globalUtils.default.log.error("Failed to read mask tree from host.");
        resolve("");
      });
    });
  }
  /**
   * @param {string} languageCode
   * @param {Array<ReadVarsRequest>} data
   * @returns {Promise<Array<ReadWriteVarsResponse>>}
   */
  async readVars(languageCode, data) {
    return new Promise((resolve) => {
      this.client.post(`/var/readWriteVars?languageCode=${languageCode}`, data).then((responseData) => {
        resolve(responseData);
      }).catch(() => {
        const nameList = data.map(({ name }) => name);
        import_globalUtils.default.log.error(
          `Failed reading vars (${nameList.length}): 
"` + JSON.stringify(nameList)
        );
        resolve([]);
      });
    });
  }
  /**
   * @param {Array<WriteVarsRequest>} data
   * @returns {Promise<boolean>}
   */
  async writeVars(data) {
    return new Promise((resolve) => {
      this.client.post("/var/readWriteVars?action=set", data).then(() => {
        resolve(true);
      }).catch(() => {
        const nameList = data.map(({ name }) => name);
        import_globalUtils.default.log.error(
          `Failed writing vars (${nameList.length}): 
"` + JSON.stringify(nameList)
        );
        resolve(false);
      });
    });
  }
}
var KebaClient_default = KebaClient;
//# sourceMappingURL=KebaClient.js.map
