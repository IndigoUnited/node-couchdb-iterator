'use strict';

const TransformStream = require('stream').Transform;
const pTry = require('p-try');

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
        // Invoke callback asyncronously so that errors are not swalled by the promise
        // This also guarantees that the promise chain is broken so that they don't stack (avoiding possible leaks)
        .then(
            () => setImmediate(() => callback(null, data)),
            (err) => setImmediate(() => callback(err))
        );
    }

    _flush(callback) {
        this._flushBuffer()
        // Invoke callback asyncronously so that errors are not swalled by the promise
        // This also guarantees that the promise chain is broken so that they don't stack (avoiding possible leaks)
        .then(
            () => setImmediate(() => callback()),
            (err) => setImmediate(() => callback(err))
        );
    }

    _flushBuffer() {
        const bufferLength = this._buffer.length;

        if (!bufferLength) {
            return Promise.resolve();
        }

        // Execute the iterator
        // Note that the iterator can throw synchronously as well as return non-promise values
        return pTry(() => this._iterator(this._buffer))
        .then(() => { this._buffer = []; });
    }
}

module.exports = function (iterator, bulkSize) {
    return new IteratorCallerBulkStream(iterator, bulkSize);
};
