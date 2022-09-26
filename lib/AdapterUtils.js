'use strict';


class AdapterUtils {

    transformVariablePath(name) {
        const regex = /\[(\d)\]\./g;
        return name.replace(regex, '.$1.');
    }

    reverseTransformVariablePath(name) {
        const regex = /\.(\d)\./g;
        return name.replace(regex, '[$1].');
    }

}

module.exports = AdapterUtils;
