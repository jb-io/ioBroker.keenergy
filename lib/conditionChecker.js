'use strict';

const globalUtils = require('./globalUtils');

const getCompareFunction = (expression) => {
    if (!expression) {
        return (value) => {
            if (typeof value === 'boolean') {
                return value;
            }
            if (typeof value === 'number') {
                return value > 0;
            }
            globalUtils.log.warn(`Could not interpret ${value} as boolean value!`);
            return false;
        };
    }
    const alwaysFalse = () => false;

    // (val=0)|(val=1)
    const orExpression = expression.match(/^(.+)\|(.+)$/);
    if (orExpression) {
        return (value) => getCompareFunction(orExpression[1])(value) || getCompareFunction(orExpression[2])(value)
    }

    // (val=2)
    const bracedExpression = expression.match(/^\((.+)\)$/);
    if (bracedExpression) {
        return (value) => getCompareFunction(bracedExpression[1])(value);
    }

    if (expression.toLowerCase() === 'false') {
        return (value) => value === false
    }

    if (expression.toLowerCase() === 'true') {
        return (value) => value === true
    }

    if (expression.match(/^-?\d+$/)) {
        return (value) => value === parseInt(expression)
    }

    const mathExpression = expression.match(/^(val=|!=|>|<)(-?\d+)$/);
    if (mathExpression) {
        const operator = mathExpression[1];
        const compareValue = parseInt(mathExpression[2]);
        switch (operator) {
            case 'val=':
                return (value) => value === compareValue
            case '!=':
                return (value) => value !== compareValue
            case '>':
                return (value) => value > compareValue
            case '<':
                return (value) => value < compareValue
            default:
                globalUtils.log.warn(`Could not interpret ${operator} as operator!`);
                return alwaysFalse;
        }
    }

    globalUtils.log.warn(`Could not interpret ${expression} as expression!`);
    return alwaysFalse;
}

/**
 *
 * @param value
 * @param expression
 * @returns {boolean}
 */
const checkCondition = (value, expression = null) => {
    return getCompareFunction(expression)(value);
}

module.exports = checkCondition;
