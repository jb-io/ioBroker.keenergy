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
var conditionChecker_exports = {};
__export(conditionChecker_exports, {
  default: () => conditionChecker_default
});
module.exports = __toCommonJS(conditionChecker_exports);
var import_globalUtils = __toESM(require("./globalUtils"));
const getCompareFunction = (expression) => {
  if (!expression) {
    return (value) => {
      if (typeof value === "boolean") {
        return value;
      }
      if (typeof value === "number") {
        return value > 0;
      }
      import_globalUtils.default.log.warn(`Could not interpret ${value} as boolean value!`);
      return false;
    };
  }
  const alwaysFalse = () => false;
  const orExpression = expression.match(/^(.+)\|(.+)$/);
  if (orExpression) {
    return (value) => getCompareFunction(orExpression[1])(value) || getCompareFunction(orExpression[2])(value);
  }
  const bracedExpression = expression.match(/^\((.+)\)$/);
  if (bracedExpression) {
    return (value) => getCompareFunction(bracedExpression[1])(value);
  }
  if (expression.toLowerCase() === "false") {
    return (value) => value === false;
  }
  if (expression.toLowerCase() === "true") {
    return (value) => value === true;
  }
  if (expression.match(/^-?\d+$/)) {
    return (value) => value === parseInt(expression);
  }
  const mathExpression = expression.match(/^(val=|!=|>|<)(-?\d+)$/);
  if (mathExpression) {
    const operator = mathExpression[1];
    const compareValue = parseInt(mathExpression[2]);
    switch (operator) {
      case "val=":
        return (value) => value === compareValue;
      case "!=":
        return (value) => value !== compareValue;
      case ">":
        return (value) => value > compareValue;
      case "<":
        return (value) => value < compareValue;
      default:
        import_globalUtils.default.log.warn(`Could not interpret ${operator} as operator!`);
        return alwaysFalse;
    }
  }
  import_globalUtils.default.log.warn(`Could not interpret ${expression} as expression!`);
  return alwaysFalse;
};
const checkCondition = (value, expression = null) => {
  return getCompareFunction(expression)(value);
};
var conditionChecker_default = checkCondition;
//# sourceMappingURL=conditionChecker.js.map
