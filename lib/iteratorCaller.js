'use strict';

const SwiftTransformStream = require('swift-transform').Transform;

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
        new Promise((resolve, reject) => {
            Promise.resolve(this._iterator(data))
            .then(resolve, reject);
        })
        .then(() => callback(null, data), (err) => callback(err))
        // Equivalent to .done()
        .catch((err) => {
            /* istanbul ignore next */
            setImmediate(() => { throw err; });
        });
    }
}

module.exports = function (iterator, concurrency) {
    return new IteratorCallerStream(iterator, concurrency);
};
