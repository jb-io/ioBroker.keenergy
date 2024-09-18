'use strict';

type StateNative = {
    name: string;
    type: 'numeric' | 'bool' | 'enum' | 'text';
};

type StateCommon = {
    name: string;
    type: 'number' | 'boolean' | 'string';
    role: string;
    read: boolean;
    write: boolean;
    unit?: string;
    states?: Record<number, string>;
    min?: number;
    max?: number;
};

type StateConfiguration = {
    type: string;
    common: StateCommon;
    native: StateNative;
};


export default class KebaStateTransformer {

    public constructor() {
    }

    public transformNameToId(name: string): string {
        const regex = /\[(\d+)]\./g;
        return name.replace(regex, '.$1.');
    }

    public transformVarToSate(name:string, readWriteVar: any): StateConfiguration {

        const typeMapping = {
            'numeric': 'number',
            'bool': 'boolean',
            'enum': 'string',
            'text': 'string',
        };

        let descriptiveName = readWriteVar.name;
        if (readWriteVar.attributes && readWriteVar.attributes['longText']) {
            descriptiveName = readWriteVar.attributes['longText'];
        }
        const common: StateCommon = {
            name: descriptiveName,
            type: typeMapping[readWriteVar.type],
            role: 'value', // https://www.iobroker.net/#de/documentation/basics/roles.md
            read: true,
            write: readWriteVar.writable,
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
            if (readWriteVar.attributes['upperLimit']) {
                common.max = parseInt(readWriteVar.attributes['upperLimit']);
            }
            if (readWriteVar.attributes['lowerLimit']) {
                common.min = parseInt(readWriteVar.attributes['lowerLimit']);
            }
        }
        return {
            type: 'state',
            common,
            native: {
                name: name,
                type: readWriteVar.type,
            },
        };
    }


}
