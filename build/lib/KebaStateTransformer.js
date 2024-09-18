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
var KebaStateTransformer_exports = {};
__export(KebaStateTransformer_exports, {
  default: () => KebaStateTransformer
});
module.exports = __toCommonJS(KebaStateTransformer_exports);
class KebaStateTransformer {
  constructor() {
  }
  transformNameToId(name) {
    const regex = /\[(\d+)]\./g;
    return name.replace(regex, ".$1.");
  }
  transformVarToSate(name, readWriteVar) {
    const typeMapping = {
      "numeric": "number",
      "bool": "boolean",
      "enum": "string",
      "text": "string"
    };
    let descriptiveName = readWriteVar.name;
    if (readWriteVar.attributes && readWriteVar.attributes["longText"]) {
      descriptiveName = readWriteVar.attributes["longText"];
    }
    const common = {
      name: descriptiveName,
      type: typeMapping[readWriteVar.type],
      role: "value",
      // https://www.iobroker.net/#de/documentation/basics/roles.md
      read: true,
      write: readWriteVar.writable
    };
    if (readWriteVar.unit) {
      common.unit = readWriteVar.unit;
    }
    if (readWriteVar.formats) {
      common.states = {};
      for (let i = 0; i < readWriteVar.formats.length; i++) {
        common.states[i] = readWriteVar.formats[i] || `UNDEFINED (${i})`;
      }
    }
    if (readWriteVar.attributes) {
      if (readWriteVar.attributes["upperLimit"]) {
        common.max = parseInt(readWriteVar.attributes["upperLimit"]);
      }
      if (readWriteVar.attributes["lowerLimit"]) {
        common.min = parseInt(readWriteVar.attributes["lowerLimit"]);
      }
    }
    return {
      type: "state",
      common,
      native: {
        name,
        type: readWriteVar.type
      }
    };
  }
}
//# sourceMappingURL=KebaStateTransformer.js.map
