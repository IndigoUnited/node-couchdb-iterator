'use strict';

const Promise = require('bluebird');
const nano = require('nano');

const couchdbAddr = process.env.COUCHDB || 'http://localhost:5984/couchdb-iterator-tests';

// Fixed documents
// ------------------------------------------
const fixedDocuments = [
    { _id: 'foo', $type: 'foo', foo: 'bar' },
    { _id: 'user!1', $type: 'user', name: 'André Cruz' },
    { _id: 'user!2', $type: 'user', name: 'José Bateira' },
    { _id: 'user!3', $type: 'user', name: 'Marco Oliveira' },
    { _id: 'user!4', $type: 'user', name: 'Filipe Dias' },
];

// Random documents
// ------------------------------------------
const randomDocuments = [];

for (let x = 0; x < 1000; x += 1) {
    randomDocuments.push({
        _id: `random!${Math.round(Math.random() * 1000000000000000000).toString(36)}`,
        $type: 'random',
        foo: 'bar',
    });
}

// Design doc
// ------------------------------------------
const designDoc = {
    _id: '_design/test',
    language: 'javascript',
    views: {
        'view-1': {
            map: 'function(doc) {\n  emit([doc.$type, doc._id], doc);\n}',
        },
    },
};

// Final documents to be inserted
// ------------------------------------------
const documents = [].concat(designDoc, fixedDocuments, randomDocuments);

function prepare() {
    const couchdb = nano(couchdbAddr);
    const couch = nano(couchdb.config.url);

    Promise.promisifyAll(couch.db);
    Promise.promisifyAll(couchdb);

    // Destroy previous db if any
    return couch.db.destroyAsync(couchdb.config.db)
    .catch({ error: 'not_found' }, () => {})
    // Create db
    .then(() => couch.db.createAsync(couchdb.config.db))
    // Create documents
    .then(() => {
        return Promise.map(documents, (doc) => couchdb.insertAsync(doc), { concurrency: 15 });
    })
    // Resolve with an object to be used by the tests
    .return({
        couchdb,
        couchdbAddr,
        documents,
        destroy: () => couch.db.destroyAsync(couchdb.config.db),
    });
}

module.exports = prepare;
