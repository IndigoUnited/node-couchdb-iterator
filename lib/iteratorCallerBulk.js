'use strict';

const TransformStream = require('stream').Transform;

class IteratorCallerBulkStream extends TransformStream {
    constructor(iterator, bulkSize) {
        super({ objectMode: true });

        this._iterator = iterator;
        this._bulkSize = bulkSize;
        this._buffer = [];
        this._count = 0;
    }

    getCount() {
        return this._count;
    }

    // -------------------------------------------------

    _transform(data, encoding, callback) {
        data.index = this._count++;  // eslint-disable-line no-plusplus
        this._buffer.push(data);

        if (this._buffer.length < this._bulkSize) {
            return callback(null, data);
        }

        this._flushBuffer()
        .then(() => callback(null, data), (err) => callback(err))
        // Equivalent to .done()
        .catch((err) => {
            /* istanbul ignore next */
            setImmediate(() => { throw err; });
        });
    }

    _flush(callback) {
        this._flushBuffer()
        .then(() => callback(), (err) => callback(err))
        // Equivalent to .done()
        .catch((err) => {
            /* istanbul ignore next */
            setImmediate(() => { throw err; });
        });
    }

    _flushBuffer() {
        const bufferLength = this._buffer.length;

        if (!bufferLength) {
            return Promise.resolve();
        }

        // Execute the iterator
        // Note that the iterator can throw synchronously as well as return non-promise values
        return new Promise((resolve, reject) => {
            Promise.resolve(this._iterator(this._buffer))
            .then(resolve, reject);
        })
        .then(() => { this._buffer = []; });
    }
}

module.exports = function (iterator, bulkSize) {
    return new IteratorCallerBulkStream(iterator, bulkSize);
};
