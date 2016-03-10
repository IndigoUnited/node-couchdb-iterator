'use strict';

const nano = require('nano');
const find = require('lodash.find');
const omit = require('lodash.omit');
const snakeCase = require('lodash.snakecase');
const mapKeys = require('lodash.mapkeys');
const rowsReader = require('./lib/rowsReader');
const iteratorCaller = require('./lib/IteratorCaller');

const allowedQueryOptions = [
    'limit', 'skip', 'stale', 'descending', 'startkey', 'startkey_docid',
    'endkey', 'endkey_docid', 'include_docs', 'inclusive_end',
];

function getCouchDb(couchdbAddr, options) {
    const couchdb = typeof couchdbAddr === 'string' ? nano(couchdbAddr, options.nano) : couchdbAddr;

    if (!couchdb.config.db) {
        throw new Error('No database is selected, did you pass a database in the couchdb address?');
    }

    return couchdb;
}

function getQueryFn(couchdb, view) {
    if (!view) {
        return (options) => {
            return new Promise((resolve, reject) => {
                couchdb.list(options, (err, response) => {
                    /* istanbul ignore if */
                    if (err) {
                        reject(err);
                    } else {
                        resolve(response);
                    }
                });
            });
        };
    }

    const viewSplit = view.split('/');
    const designName = viewSplit[0];
    const viewName = viewSplit[1];

    return (options) => {
        return new Promise((resolve, reject) => {
            couchdb.view(designName, viewName, options, (err, response) => {
                /* istanbul ignore if */
                if (err) {
                    reject(err);
                } else {
                    resolve(response);
                }
            });
        });
    };
}

function getQueryOptions(options) {
    const queryOptions = mapKeys(omit(options, ['nano', 'concurrency']), (value, key) => snakeCase(key));
    const invalidQueryOption = find(Object.keys(queryOptions), (queryOption) => allowedQueryOptions.indexOf(queryOption) === -1);

    if (invalidQueryOption) {
        throw new Error(`Query option \`${invalidQueryOption}\` is not allowed`);
    }

    return queryOptions;
}

// ------------------------------------------------

function couchdbIterator(couchdbAddr, view, iterator, options) {
    if (typeof view === 'function') {
        options = iterator;
        iterator = view;
        view = null;
    }

    options = Object.assign({ limit: 500, concurrency: 50 }, options);
    return new Promise((resolve, reject) => {
        const couchdb = getCouchDb(couchdbAddr, options);
        const queryFn = getQueryFn(couchdb, view);
        const queryOptions = getQueryOptions(options);

        // Start the iteration!
        const rowsReaderStream = rowsReader(queryFn, queryOptions);
        const iteratorCallerStream = iteratorCaller(iterator, options.concurrency);

        rowsReaderStream
        .on('error', reject)
        .pipe(iteratorCallerStream)
        .on('error', reject)
        .on('end', () => resolve(iteratorCallerStream.getCount()));

        iteratorCallerStream.on('readable', () => {
            while (iteratorCallerStream.read() !== null) { /* do nothing */ }
        });
    });
}

module.exports = couchdbIterator;
