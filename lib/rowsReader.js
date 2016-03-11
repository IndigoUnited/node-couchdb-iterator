'use strict';

const ReadableStream = require('stream').Readable;

class RowsReaderStream extends ReadableStream {
    constructor(queryFn, queryOptions) {
        super({ objectMode: true, highWaterMark: queryOptions.limit });

        this._queryFn = queryFn;
        this._queryOptions = queryOptions;
    }

    // -------------------------------------------------

    _read() {
        if (this._reading) {
            return;
        }

        this._reading = true;

        // Query the view
        this._queryFn(this._queryOptions)
        .then((response) => {
            this._reading = false;

            const lastRow = response.rows[response.rows.length - 1];

            // Did we reach the end?
            if (!lastRow) {
                this.push(null);
                return;
            }

            // Update query options
            this._queryOptions.startkey = lastRow.key;
            this._queryOptions.startkey_docid = lastRow.id;
            this._queryOptions.skip = 1;
            this._queryOptions.stale = 'ok';

            // Push each row
            response.rows.forEach((row) => this.push(row));
        }, (err) => {
            /* istanbul ignore next */
            this._reading = false;
            /* istanbul ignore next */
            this.emit('error', err);
        })
        // Equivalent to .done()
        .catch((err) => {
            /* istanbul ignore next */
            setImmediate(() => { throw err; });
        });
    }
}

module.exports = function (queryFn, queryOptions) {
    return new RowsReaderStream(queryFn, queryOptions);
};
