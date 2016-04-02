# couchdb-iterator

[![NPM version][npm-image]][npm-url] [![Downloads][downloads-image]][npm-url] [![Build Status][travis-image]][travis-url] [![Coverage Status][coveralls-image]][coveralls-url] [![Dependency status][david-dm-image]][david-dm-url] [![Dev Dependency status][david-dm-dev-image]][david-dm-dev-url]

[npm-url]:https://npmjs.org/package/couchdb-iterator
[downloads-image]:http://img.shields.io/npm/dm/couchdb-iterator.svg
[npm-image]:http://img.shields.io/npm/v/couchdb-iterator.svg
[travis-url]:https://travis-ci.org/IndigoUnited/node-couchdb-iterator
[travis-image]:http://img.shields.io/travis/IndigoUnited/node-couchdb-iterator/master.svg
[coveralls-url]:https://coveralls.io/r/IndigoUnited/node-couchdb-iterator
[coveralls-image]:https://img.shields.io/coveralls/IndigoUnited/node-couchdb-iterator/master.svg
[david-dm-url]:https://david-dm.org/IndigoUnited/node-couchdb-iterator
[david-dm-image]:https://img.shields.io/david/IndigoUnited/node-couchdb-iterator.svg
[david-dm-dev-url]:https://david-dm.org/IndigoUnited/node-couchdb-iterator#info=devDependencies
[david-dm-dev-image]:https://img.shields.io/david/dev/IndigoUnited/node-couchdb-iterator.svg

A fast and easy to ease CouchDB iterator for views and all documents.


## Installation

`$ npm install couchdb-iterator`


## Usage

### Concurrent row iteration

`couchdbIterator(couchdbAddr, [view], iterator, [options])`

Calls `iterator` for each row of the database referenced by `couchdbAddr`.
If a `view` is supplied, iterates only over that view's rows.

This library aims to be fast, therefore iteration happens concurrently. The iterator function can be async but beware that order
is not guaranteed.

Examples:

```js
const couchdbIterator = require('couchdb-iterator');

// Iterate over all rows of a database
couchdbIterator('http://localhost:5984/my-db', (row, index) => {
    console.log(index, row.id, row.key, row.value);
    // Do something with `row`; you may return a promise here
})
.then((rowsCount) => {
    console.log(`Iteration completed! ${rowsCount}`);
}, (err) => {
    console.log('Iteration failed', err);
});

// Iterate over all rows of a view
couchdbIterator('http://localhost:5984/my-db', 'my-design-doc/my-view', (row, index) => {
    console.log(index, row.id, row.key, row.value);
    // Do something with `row`; you may return a promise here
})
.then((rowsCount) => {
    console.log(`Iteration completed! ${rowsCount}`);
}, (err) => {
    console.log('Iteration failed', err);
});
```

The `couchdbAddr` argument must be a connection string with protocol, host, port and database path (e.g.: http://localhost:5984/my-db) or a [nano](https://www.npmjs.com/package/nano) instance. The `view` argument is a string in the form of `design-doc/view-name` (e.g.: app/byUser).

Available options:

- `concurrency`: The concurrency in which the `iterator` is called, defaults to `50`.
- `nano`: Custom options to be used when creating the [nano]((https://www.npmjs.com/package/nano)) instance, defaults to `null`.
- The following [querying options](https://wiki.apache.org/couchdb/HTTP_view_API) are available: `limit`, `skip`, `stale`, `descending`, `startkey`, `startkey_docid`, `endkey`, `endkey_docid`, `include_docs` and `inclusive_end` (can be camelCased).

All querying options have no default value, except for `limit` which is `concurrency * 10`. Also, `stale` is automatically set to `ok` after the first iteration to further improve performance.


### Bulk iteration

`couchdbIterator.bulk(couchdbAddr, [view], iterator, [options])`

Calls `iterator` for a bulk of rows of the database referenced by `couchdbAddr`.
If a `view` is supplied, iterates only over that view's rows.

This method is similar to `couchdbIterator()` but iterates in bulks and it respects the order of rows. The order is respected because since a bulk is ordered and the next bulk only comes when the current bulk is handled.

Examples:

```js
const couchdbIterator = require('couchdb-iterator');

// Iterate over all rows of a database
couchdbIterator.bulk('http://localhost:5984/my-db', (rows) => {
    rows.forEach((row) => {
        console.log(row.index, row.id, row.key, row.value);
    });
    // Do something with `rows`; you may return a promise here
})
.then((rowsCount) => {
    console.log(`Iteration completed! ${rowsCount}`);
}, (err) => {
    console.log('Iteration failed', err);
});

// Iterate over all rows of a view
couchdbIterator.bulk('http://localhost:5984/my-db', 'my-design-doc/my-view', (rows) => {
    rows.forEach((row) => {
        console.log(row.index, row.id, row.key, row.value);
    });
    // Do something with `rows`; you may return a promise here
})
.then((rowsCount) => {
    console.log(`Iteration completed! ${rowsCount}`);
}, (err) => {
    console.log('Iteration failed', err);
});
```

The `couchdbAddr` argument must be a connection string with protocol, host, port and database path (e.g.: http://localhost:5984/my-db) or a [nano](https://www.npmjs.com/package/nano) instance. The `view` argument is a string in the form of `design-doc/view-name` (e.g.: app/byUser).

Available options:

- `bulkSize`: The bulkSize, defaults to `50`.
- `nano`: Custom options to be used when creating the [nano]((https://www.npmjs.com/package/nano)) instance, defaults to `null`.
- The following [querying options](https://wiki.apache.org/couchdb/HTTP_view_API) are available: `limit`, `skip`, `stale`, `descending`, `startkey`, `startkey_docid`, `endkey`, `endkey_docid`, `include_docs` and `inclusive_end` (can be camelCased).

All querying options have no default value, except for `limit` which is `bulkSize * 10`. Also, `stale` is automatically set to `ok` after the first iteration to further improve performance.


## Tests

`$ npm test`   
`$ npm test-cov` to get coverage report

The tests expect a running CouchDB in `http://localhost:5984` and will create and destroy `couchdb-iterator-tests` database. You may specify a different address with `COUCHDB`, e.g.: `$ COUCHDB=http://admin:admin@localhost:5984/my-custom-database-for-tests npm test`.


## License

Released under the [MIT License](http://www.opensource.org/licenses/mit-license.php).
