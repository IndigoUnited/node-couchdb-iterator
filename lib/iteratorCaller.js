'use strict';

const SwiftTransformStream = require('swift-transform').Transform;
const pTry = require('p-try');

class IteratorCallerStream extends SwiftTransformStream {
    constructor(iterator, concurrency) {
        super({ objectMode: true, concurrency });

        this._iterator = iterator;
        this._count = 0;
    }

    getCount() {
        return this._count;
    }

    // -------------------------------------------------

    _transform(data, encoding, callback) {
        data.index = this._count++;  // eslint-disable-line no-plusplus

        // Execute the iterator
        // Note that the iterator can throw synchronously as well as return non-promise values
        pTry(() => this._iterator(data))
        // Invoke callback asyncronously so that errors are not swalled by the promise
        // This also guarantees that the promise chain is broken so that they don't stack (avoiding possible leaks)
        .then(
            () => setImmediate(() => callback(null, data)),
            (err) => setImmediate(() => callback(err))
        );
    }
}

module.exports = function (iterator, concurrency) {
    return new IteratorCallerStream(iterator, concurrency);
};
