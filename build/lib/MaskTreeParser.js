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
var MaskTreeParser_exports = {};
__export(MaskTreeParser_exports, {
  default: () => MaskTreeParser
});
module.exports = __toCommonJS(MaskTreeParser_exports);
var import_conditionChecker = __toESM(require("./conditionChecker"));
var import_xpath = __toESM(require("xpath.js"));
var import_dom = require("xmldom/lib/dom");
var import_xmldom = require("xmldom");
var import_globalUtils = __toESM(require("./globalUtils"));
class MaskTreeParser {
  keba;
  _readWriteVars = {};
  _varsCache = {};
  _maxInputLevel;
  _maxDisplayLevel;
  constructor(keba) {
    this.keba = keba;
    this._maxInputLevel = parseInt(import_globalUtils.default.config.maxInputLevel);
    this._maxDisplayLevel = parseInt(import_globalUtils.default.config.maxDisplayLevel);
  }
  isNumeric(value) {
    return parseInt(value) + "" === value;
  }
  parseVar(value) {
    const valueMap = {
      "true": true,
      "false": false
    };
    if (valueMap[value] !== void 0) {
      return valueMap[value];
    }
    if (this.isNumeric(value)) {
      return parseInt(value);
    }
    return value;
  }
  async initCachedVars(visibleVars) {
    for (const { name, value } of await this.keba.readVars(visibleVars)) {
      this._varsCache[name] = this.parseVar(value);
    }
  }
  async getCachedVar(variable) {
    if (typeof this._varsCache[variable] === "undefined") {
      this._varsCache[variable] = this.parseVar((await this.keba.readVar(variable)).value);
    }
    return this._varsCache[variable];
  }
  async checkNodeVisible(node, context) {
    if (!node.hasAttribute("visibleVar")) {
      return true;
    }
    const visibleValueExpression = node.hasAttribute("visibleValue") ? node.getAttribute("visibleValue") : null;
    const visibleVars = this.replacePlaceholder(node.getAttribute("visibleVar"), context).split(";");
    for (const visibleVar of visibleVars) {
      if (!await this.checkVisibleVarCondition(visibleVar, visibleValueExpression)) {
        return false;
      }
    }
    return true;
  }
  async checkVisibleVarCondition(visibleVar, visibleValueExpression) {
    const value = await this.getCachedVar(visibleVar);
    return (0, import_conditionChecker.default)(value, visibleValueExpression);
  }
  getNodeAttribute(node, attribute, defaultValue = null) {
    return node.hasAttribute(attribute) ? node.getAttribute(attribute) : defaultValue;
  }
  checkNodeDisplayLevel(node) {
    const displayLevel = this.getNodeAttribute(node, "displayLevel", "-1");
    return parseInt(displayLevel) <= this._maxDisplayLevel;
  }
  replacePlaceholder(value, context) {
    if (typeof context.placeHolder !== "undefined" && value.match(/\[\?]/)) {
      return value.replace(/\[\?]/, `[${context.placeHolder}]`);
    }
    return value;
  }
  isElementNode(node) {
    return node.nodeType === import_dom.Node.ELEMENT_NODE;
  }
  async loopChildNodes(node, context) {
    const childNodes = node.childNodes;
    for (let i = 0; i < childNodes.length; i++) {
      const childNode = childNodes[i];
      if (this.isElementNode(childNode)) {
        await this.handleNode(childNode, context);
      }
    }
  }
  addReadWriteVar(name, type, writable = false, observe = false) {
    this._readWriteVars[name] = {
      name,
      type,
      writable,
      observe
    };
  }
  async handleNode(node, context) {
    if (!this.isElementNode(node)) {
      return;
    }
    if (!this.checkNodeDisplayLevel(node) || !await this.checkNodeVisible(node, context)) {
      return;
    }
    switch (node.nodeName) {
      case "genericMask":
        if (node.hasAttribute("placeHolderVar")) {
          const maxPlaceHolder = await this.getCachedVar(node.getAttribute("placeHolderVar"));
          for (let placeHolder = 0; placeHolder < maxPlaceHolder; placeHolder++) {
            const subContext = { ...context, placeHolder: `${placeHolder}` };
            await this.loopChildNodes(node, subContext);
          }
        } else {
          await this.loopChildNodes(node, context);
        }
        break;
      case "userMask":
        const maskId = node.getAttribute("maskId");
        if (maskId.match(/^usermasks\..*LinTab$/)) {
          const prefix = this.replacePlaceholder(node.getAttribute("visibleVar").split(".").slice(0, -1).join("."), context);
          const varName2 = prefix + ".linTab.fileName";
          this.addReadWriteVar(varName2, "text");
          const curveName = await this.getCachedVar(varName2);
          const linTabIds = Array.from({ length: 30 }, (_, i) => `APPL.CtrlAppl.sParam.linTabPool[${i}].name`);
          const linTabMappings = {};
          for (const { name, value } of await this.keba.readVars(linTabIds)) {
            if (value.length > 0) {
              linTabMappings[value] = name.split(".").slice(0, -1).join(".");
            }
          }
          const linTabPoolPrefix = linTabMappings[curveName];
          const noOfPointsVarName = `${linTabPoolPrefix}.noOfPoints`;
          const nameVarName = `${linTabPoolPrefix}.name`;
          const noOfPoints = await this.getCachedVar(noOfPointsVarName);
          this.addReadWriteVar(nameVarName, "text");
          this.addReadWriteVar(noOfPointsVarName, "numeric", true);
          for (let i = 0; i < noOfPoints; i++) {
            for (const suffix of ["x", "y"]) {
              this.addReadWriteVar(`${linTabPoolPrefix}.points[${i}].${suffix}`, "numeric", true);
            }
          }
        }
        break;
      case "weektimerMask":
        const varPath = this.replacePlaceholder(node.getAttribute("varPath"), context);
        for (let day = 0; day <= 6; day++) {
          for (let time = 0; time <= 2; time++) {
            for (const mode of ["start", "stop"]) {
              this.addReadWriteVar(`${varPath}.day[${day}].enableTime[${time}].${mode}`, "numeric", true);
            }
          }
        }
        break;
      case "var":
        let varName = this.replacePlaceholder(node.childNodes[0].nodeValue, context);
        this.addReadWriteVar(
          varName,
          node.getAttribute("type"),
          this.getNodeAttribute(node, "readOnly") === "false" && parseInt(this.getNodeAttribute(node, "inputLevel", "-1")) <= this._maxInputLevel,
          this.getNodeAttribute(node, "observeMsgId") === "true"
        );
        break;
    }
  }
  async enrichWithAttributes() {
    const readWriteVars = await this.keba.readVars(Object.keys(this._readWriteVars), true);
    const units = await this.keba.readAllUnits();
    const formats = await this.keba.readAllFormats();
    for (const { name, attributes } of readWriteVars) {
      const readWriteVar = this._readWriteVars[name];
      readWriteVar.attributes = attributes;
      if (readWriteVar.attributes && readWriteVar.attributes["unitId"] && units[readWriteVar.attributes["unitId"]]) {
        readWriteVar.unit = units[readWriteVar.attributes["unitId"]];
      }
      if (readWriteVar.attributes && readWriteVar.attributes["formatId"] && formats[readWriteVar.attributes["formatId"]]) {
        readWriteVar.formats = formats[readWriteVar.attributes["formatId"]];
      }
    }
  }
  async getVarsFromMaskTree() {
    this._readWriteVars = {};
    this._varsCache = {};
    const maskTreeContent = await this.keba.readMaskTreeGetContent();
    const doc = new import_xmldom.DOMParser().parseFromString(maskTreeContent);
    const visibleVars = (0, import_xpath.default)(doc, "/*/genericMask[@visibleVar]/@visibleVar").map((node) => node.nodeValue);
    await this.initCachedVars(visibleVars);
    const nodes = (0, import_xpath.default)(doc, "/*/genericMask[@visibleVar]");
    for (const node of nodes) {
      await this.handleNode(node, {});
    }
    await this.enrichWithAttributes();
    return this._readWriteVars;
  }
}
//# sourceMappingURL=MaskTreeParser.js.map
