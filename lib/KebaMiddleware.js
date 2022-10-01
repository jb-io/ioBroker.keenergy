'use strict';

const KebaStateTransformer = require('./KebaStateTransformer');
const Keba = require('./Keba');


class KebaMiddleware {

    constructor() {
        this.keba = new Keba();
        this._stateConfigurations = null;
        this._idToName = {};
        this._nameToId = {};
    }

    /**
     * @typedef VariableTypes
     * @type {"text"|"numeric"|"enum"|"bool"}
     */
    /**
     * @typedef StateValue
     * @type {string|number|boolean}
     */
    /**
     * @param {string} val
     * @param {VariableTypes} type
     * @returns {StateValue}
     */
    #normalizeStateValue(val, type) {
        switch (type) {
            case 'numeric':
                return parseFloat(val);
            case 'bool':
                return val === 'true';

        }
        return val;
    }

    /**
     *
     * @param {string|number|boolean} val
     * @param {VariableTypes} type
     * @returns {string}
     */
    #denormalizeStateValue(val, type) {
        switch (type) {
            case 'numeric':
                return `${val}`;
            case 'bool':
                return val ? 'true' : 'false';
        }
        return `${val}`;
    }

    /**
     * @param {Array<string>} ids
     * @returns {Promise<Object.<string, StateValue>>}
     */
    async readStates(ids) {
        const states = {};

        const names = ids.map((id) => this.#getNameFromId(id));
        const data = await this.keba.readVars(names);

        for (const {name, value} of data) {
            const id = this.#getIdFromName(name);
            const stateConfiguration = await this.getStateConfiguration(id);
            states[id] = this.#normalizeStateValue(value, stateConfiguration.native.type);
        }

        // @ts-ignore
        return states;
    }

    /**
     * @param {string} id
     * @returns {Promise<StateValue>}
     */
    async readState(id) {
        const name = this.#getNameFromId(id);
        const {value} = await this.keba.readVar(name);

        const stateConfiguration = await this.getStateConfiguration(id);
        return this.#normalizeStateValue(value, stateConfiguration.native.type);
    }

    /**
     * @param {string} id
     * @param {StateValue} value
     * @returns {Promise<StateValue>}
     */
    async writeState(id, value) {
        const stateConfiguration = await this.getStateConfiguration(id);
        if (!stateConfiguration.common.write) {
            throw new Error(`State ${id} is not writable.`);
        }
        await this.keba.writeVar(stateConfiguration.native.name, this.#denormalizeStateValue(value, stateConfiguration.native.type));
        return await this.readState(id);
    }

    /**
     * @typedef StateNative
     * @type {Object}
     * @property {string} name
     * @property {("numeric"|"bool"|"enum"|"text")} type
     */
    /**
     * @typedef StateCommon
     * @type {Object}
     * @property {string} name
     * @property {("number"|"boolean"|"string")} type
     * @property {string} role
     * @property {boolean} read
     * @property {boolean} write
     * @property {string} [unit]
     * @property {Object.<number, string>} [states]
     * @property {number} [min]
     * @property {number} [max]
     */
    /**
     * @typedef StateConfiguration
     * @type {Object}
     * @property {string} type
     * @property {StateCommon} common
     * @property {StateNative} native
     */
    /**
     * @returns {Promise<Object.<string, StateConfiguration>>}
     */
    async getStateConfigurations() {
        if (!this._stateConfigurations) {
            this._stateConfigurations = {};

            const stateTransformer = new KebaStateTransformer();

            const readWriteVars = await this.keba.getReadWriteVars();
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
    #getIdFromName(name) {
        return this._nameToId[name];
    }

    /**
     * @param {string} id
     * @returns {string}
     */
    #getNameFromId(id) {
        return this._idToName[id];
    }

}

module.exports = KebaMiddleware;
