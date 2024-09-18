'use strict';

import checkCondition from './conditionChecker';
import xpath from 'xpath.js';
import { Node, Element } from 'xmldom/lib/dom';
import { DOMParser as Dom } from 'xmldom';
import globalUtils from './globalUtils';
import Keba from './Keba';

type Context = {
    placeHolder?: string;
};

type ReadWriteVar = {
    name: string;
    type: 'text' | 'numeric' | 'enum' | 'bool';
    writable: boolean;
    observe?: boolean;
    attributes?: Record<string, any>;
    unit?: string;
    formats?: any;
};

export default class MaskTreeParser {
    private keba: Keba;
    private _readWriteVars: Record<string, ReadWriteVar> = {};
    private _varsCache: Record<string, string | number | boolean> = {};
    private readonly _maxInputLevel: number;
    private readonly _maxDisplayLevel: number;

    constructor(keba: Keba) {
        this.keba = keba;
        this._maxInputLevel = parseInt(globalUtils.config.maxInputLevel);
        this._maxDisplayLevel = parseInt(globalUtils.config.maxDisplayLevel);
    }

    private isNumeric(value: string): boolean {
        return (parseInt(value) + "") === value;
    }

    private parseVar(value: string): string | number | boolean {
        const valueMap: Record<string, boolean> = {
            'true': true,
            'false': false,
        };
        if (valueMap[value] !== undefined) {
            return valueMap[value];
        }
        if (this.isNumeric(value)) {
            return parseInt(value);
        }
        return value;
    }

    private async initCachedVars(visibleVars: Array<string>): Promise<void> {
        for (const { name, value } of await this.keba.readVars(visibleVars)) {
            this._varsCache[name] = this.parseVar(value);
        }
    }

    private async getCachedVar<T extends string | number | boolean>(variable: string): Promise<T> {
        if (typeof this._varsCache[variable] === 'undefined') {
            this._varsCache[variable] = this.parseVar((await this.keba.readVar(variable)).value);
        }
        return this._varsCache[variable] as T;
    }

    private async checkNodeVisible(node: Element, context: Context): Promise<boolean> {
        if (!node.hasAttribute('visibleVar')) {
            return true;
        }
        const visibleValueExpression = node.hasAttribute('visibleValue') ? node.getAttribute('visibleValue') : null;
        const visibleVars = this.replacePlaceholder(node.getAttribute('visibleVar')!, context).split(';');
        for (const visibleVar of visibleVars) {
            if (!(await this.checkVisibleVarCondition(visibleVar, visibleValueExpression))) {
                return false;
            }
        }
        return true;
    }

    private async checkVisibleVarCondition(visibleVar: string, visibleValueExpression: string | null): Promise<boolean> {
        const value = await this.getCachedVar(visibleVar);
        return checkCondition(value, visibleValueExpression);
    }

    private getNodeAttribute(node: Element, attribute: string, defaultValue: string | null = null): string | null {
        return node.hasAttribute(attribute) ? node.getAttribute(attribute) : defaultValue;
    }

    private checkNodeDisplayLevel(node: Element): boolean {
        const displayLevel = this.getNodeAttribute(node, 'displayLevel', '-1');
        return parseInt(displayLevel!) <= this._maxDisplayLevel;
    }

    private replacePlaceholder(value: string, context: Context): string {
        if (typeof context.placeHolder !== 'undefined' && value.match(/\[\?]/)) {
            return value.replace(/\[\?]/, `[${context.placeHolder}]`);
        }
        return value;
    }

    private isElementNode(node: Node): boolean {
        return node.nodeType === Node.ELEMENT_NODE;
    }

    private async loopChildNodes(node: Element, context: Context): Promise<void> {
        const childNodes = node.childNodes;
        for (let i = 0; i < childNodes.length; i++) {
            const childNode = childNodes[i] as Element;
            if (this.isElementNode(childNode)) {
                await this.handleNode(childNode, context);
            }
        }
    }

    private addReadWriteVar(name: string, type: 'text' | 'numeric' | 'enum' | 'bool', writable = false, observe = false): void {
        this._readWriteVars[name] = {
            name: name,
            type: type,
            writable: writable,
            observe: observe
        };
    }

    private async handleNode(node: Element, context: Context): Promise<void> {
        if (!this.isElementNode(node)) {
            return;
        }
        if (!this.checkNodeDisplayLevel(node) || !(await this.checkNodeVisible(node, context))) {
            return;
        }

        switch (node.nodeName) {
            case 'genericMask':
                if (node.hasAttribute('placeHolderVar')) {
                    const maxPlaceHolder = await this.getCachedVar<number>(node.getAttribute('placeHolderVar')!);
                    for (let placeHolder = 0; placeHolder < maxPlaceHolder; placeHolder++) {
                        const subContext: Context = { ...context, placeHolder: `${placeHolder}` };
                        await this.loopChildNodes(node, subContext);
                    }
                } else {
                    await this.loopChildNodes(node, context);
                }
                break;
            case 'userMask':
                const maskId = node.getAttribute('maskId')!;
                if (maskId.match(/^usermasks\..*LinTab$/)) {
                    const prefix = this.replacePlaceholder(node.getAttribute('visibleVar')!.split('.').slice(0, -1).join('.'), context);
                    const varName = prefix + '.linTab.fileName';

                    this.addReadWriteVar(varName, 'text');
                    const curveName = await this.getCachedVar(varName);

                    const linTabIds = Array.from({ length: 30 }, (_, i) => `APPL.CtrlAppl.sParam.linTabPool[${i}].name`);
                    const linTabMappings: Record<string, string> = {};
                    for (const { name, value } of await this.keba.readVars(linTabIds)) {
                        if (value.length > 0) {
                            linTabMappings[value] = name.split('.').slice(0, -1).join('.');
                        }
                    }

                    const linTabPoolPrefix = linTabMappings[curveName as string];
                    const noOfPointsVarName = `${linTabPoolPrefix}.noOfPoints`;
                    const nameVarName = `${linTabPoolPrefix}.name`;
                    const noOfPoints = await this.getCachedVar<number>(noOfPointsVarName);

                    this.addReadWriteVar(nameVarName, 'text');
                    this.addReadWriteVar(noOfPointsVarName, 'numeric', true);

                    for (let i = 0; i < noOfPoints; i++) {
                        for (const suffix of ['x', 'y']) {
                            this.addReadWriteVar(`${linTabPoolPrefix}.points[${i}].${suffix}`, 'numeric', true);
                        }
                    }
                }
                break;
            case 'weektimerMask':
                const varPath = this.replacePlaceholder(node.getAttribute('varPath')!, context);
                for (let day = 0; day <= 6; day++) {
                    for (let time = 0; time <= 2; time++) {
                        for (const mode of ['start', 'stop']) {
                            this.addReadWriteVar(`${varPath}.day[${day}].enableTime[${time}].${mode}`, 'numeric', true);
                        }
                    }
                }
                break;
            case 'var':
                let varName = this.replacePlaceholder(node.childNodes[0].nodeValue!, context);
                this.addReadWriteVar(
                    varName,
                    node.getAttribute('type')! as 'text' | 'numeric' | 'enum' | 'bool',
                    this.getNodeAttribute(node, 'readOnly') === 'false' && parseInt(this.getNodeAttribute(node, 'inputLevel', '-1')!) <= this._maxInputLevel,
                    this.getNodeAttribute(node, 'observeMsgId') === 'true'
                );
                break;
        }
    }

    private async enrichWithAttributes(): Promise<void> {
        const readWriteVars = await this.keba.readVars(Object.keys(this._readWriteVars), true);
        const units = await this.keba.readAllUnits();
        const formats = await this.keba.readAllFormats();
        for (const { name, attributes } of readWriteVars) {
            const readWriteVar = this._readWriteVars[name];
            readWriteVar.attributes = attributes;

            if (readWriteVar.attributes && readWriteVar.attributes['unitId'] && units[readWriteVar.attributes['unitId']]) {
                readWriteVar.unit = units[readWriteVar.attributes['unitId']];
            }
            if (readWriteVar.attributes && readWriteVar.attributes['formatId'] && formats[readWriteVar.attributes['formatId']]) {
                readWriteVar.formats = formats[readWriteVar.attributes['formatId']];
            }
        }
    }

    public async getVarsFromMaskTree(): Promise<Record<string, ReadWriteVar>> {
        this._readWriteVars = {};
        this._varsCache = {};

        const maskTreeContent = await this.keba.readMaskTreeGetContent();
        const doc = new Dom().parseFromString(maskTreeContent);

        const visibleVars = xpath(doc, '/*/genericMask[@visibleVar]/@visibleVar').map((node: any) => node.nodeValue);
        await this.initCachedVars(visibleVars);

        const nodes = xpath(doc, '/*/genericMask[@visibleVar]');
        for (const node of nodes) {
            await this.handleNode(node as Element, {});
        }

        await this.enrichWithAttributes();

        return this._readWriteVars;
    }
}
