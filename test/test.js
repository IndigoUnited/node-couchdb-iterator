'use strict';

const Promise = require('bluebird');
const expect = require('chai').expect;
const couchdbIterator = require('../');
const prepare = require('./util/prepare');

// Uncomment to improve debugging
// global.Promise = Promise;
// Promise.config({ longStackTraces: true });

describe('couchdbIterator()', () => {
    let prepared;

    before(() => {
        return prepare()
        .then((prepared_) => { prepared = prepared_; });
    });

    after(() => prepared.destroy());

    it('should iterate all rows', () => {
        let count = 0;

        return couchdbIterator(prepared.couchdbAddr, (row) => {
            expect(row.index).to.equal(count);
            count += 1;

            expect(row).to.have.all.keys('index', 'id', 'key', 'value');
            expect(row.id).to.be.a('string');
            expect(row.key).to.be.a('string');
            expect(row.value).to.be.an('object');
            expect(row.key).to.equal(row.id);
        })
        .then((rowsCount) => {
            expect(count).to.equal(prepared.documents.length);
            expect(rowsCount).to.equal(count);
        });
    });

    it('should iterate all rows from a view', () => {
        let count = 0;

        return couchdbIterator(prepared.couchdbAddr, 'test/view-1', (row) => {
            expect(row.index).to.equal(count);
            count += 1;

            expect(row).to.have.all.keys('index', 'id', 'key', 'value');
            expect(row.id).to.be.a('string');
            expect(row.key).to.be.a('array');
            expect(row.value).to.be.an('object');
            expect(row.key).to.eql([row.value.$type, row.id]);
        })
        .then((rowsCount) => {
            expect(count).to.equal(prepared.documents.length - 1);  // Design doc doesn't count
            expect(rowsCount).to.equal(count);
        });
    });

    it('should wait for iterator to fulfill', () => {
        let count = 0;
        let waited = 0;
        const userDocuments = prepared.documents.filter((doc) => doc.$type === 'user');

        return couchdbIterator(prepared.couchdbAddr, 'test/view-1', () => {
            count += 1;

            return Promise.delay(50)
            .then(() => { waited += 1; });
        }, {
            startkey: ['user', ''],
            endkey: ['user', '\ufff0'],
        })
        .then((rowsCount) => {
            expect(waited).to.equal(userDocuments.length);
            expect(count).to.equal(userDocuments.length);
            expect(rowsCount).to.equal(count);
        });
    });

    it('should fail if the iterator fails', () => {
        return couchdbIterator(prepared.couchdbAddr, () => {
            throw new Error('foo');
        })
        .then(() => {
            throw new Error('Expected to fail');
        }, (err) => {
            expect(err).to.be.an.instanceOf(Error);
            expect(err.message).to.equal('foo');
        });
    });

    describe('arguments', () => {
        it('should fail if couchdb does not point to a db', () => {
            return couchdbIterator('http://localhost:5984', () => {})
            .then(() => {
                throw new Error('Expected to fail');
            }, (err) => {
                expect(err).to.be.an.instanceOf(Error);
                expect(err.message).to.match(/no database is selected/i);
            });
        });

        it('should accept a nano instance', () => {
            return couchdbIterator(prepared.couchdb, () => {})
            .then((rowsCount) => {
                expect(rowsCount).to.equal(prepared.documents.length);
            });
        });

        it('should use options as view params', () => {
            let count = 0;
            const userDocuments = prepared.documents.filter((doc) => doc.$type === 'user');

            return couchdbIterator(prepared.couchdbAddr, 'test/view-1', () => {
                count += 1;
            }, {
                startkey: ['user', ''],
                endkey: ['user', '\ufff0'],
            })
            .then((rowsCount) => {
                expect(count).to.equal(userDocuments.length);
                expect(rowsCount).to.equal(count);
            });
        });

        it('should snakeCase view params', () => {
            let count = 0;
            const userDocuments = prepared.documents.filter((doc) => doc.$type === 'user');

            return couchdbIterator(prepared.couchdbAddr, 'test/view-1', (row) => {
                count += 1;
                expect(row.doc).to.be.an('object');
            }, {
                startkey: ['user', ''],
                endkey: ['user', '\ufff0'],
                includeDocs: true,
            })
            .then((rowsCount) => {
                expect(count).to.equal(userDocuments.length);
                expect(rowsCount).to.equal(count);
            });
        });

        it('should fail on invalid options', () => {
            return couchdbIterator(prepared.couchdbAddr, () => {}, { some: 'option' })
            .then(() => {
                throw new Error('Expected to fail');
            }, (err) => {
                expect(err).to.be.an.instanceOf(Error);
                expect(err.message).to.match(/option `some` is not allowed/i);
            });
        });
    });
});

describe('couchdbIterator.bulk()', () => {
    let prepared;

    before(() => {
        return prepare()
        .then((prepared_) => { prepared = prepared_; });
    });

    after(() => prepared.destroy());

    it('should iterate all rows, respecting the options.bulkSize', () => {
        let count = 0;

        return couchdbIterator.bulk(prepared.couchdbAddr, (rows) => {
            count < prepared.documents.length - 5 && expect(rows).to.have.length(5);
            count += rows.length;

            rows.forEach((row) => {
                expect(row).to.have.all.keys('index', 'id', 'key', 'value');
                expect(row.id).to.be.a('string');
                expect(row.key).to.be.a('string');
                expect(row.value).to.be.an('object');
                expect(row.key).to.equal(row.id);
            });
        }, { bulkSize: 5 })
        .then((rowsCount) => {
            expect(count).to.equal(prepared.documents.length);
            expect(rowsCount).to.equal(count);
        });
    });

    it('should iterate all rows from a view, respecting the options.bulkSize', () => {
        let count = 0;

        return couchdbIterator.bulk(prepared.couchdbAddr, 'test/view-1', (rows) => {
            count < prepared.documents.length - 5 && expect(rows).to.have.length(5);
            count += rows.length;

            rows.forEach((row) => {
                expect(row).to.have.all.keys('index', 'id', 'key', 'value');
                expect(row.id).to.be.a('string');
                expect(row.key).to.be.a('array');
                expect(row.value).to.be.an('object');
                expect(row.key).to.eql([row.value.$type, row.id]);
            });
        }, { bulkSize: 5 })
        .then((rowsCount) => {
            expect(count).to.equal(prepared.documents.length - 1);  // Design doc doesn't count
            expect(rowsCount).to.equal(count);
        });
    });

    it('should wait for iterator to fulfill', () => {
        let count = 0;
        let waited = 0;
        const userDocuments = prepared.documents.filter((doc) => doc.$type === 'user');

        return couchdbIterator.bulk(prepared.couchdbAddr, 'test/view-1', () => {
            count += 1;

            return Promise.delay(50)
            .then(() => { waited += 1; });
        }, {
            startkey: ['user', ''],
            endkey: ['user', '\ufff0'],
            bulkSize: 1,
        })
        .then((rowsCount) => {
            expect(waited).to.equal(userDocuments.length);
            expect(count).to.equal(userDocuments.length);
            expect(rowsCount).to.equal(count);
        });
    });

    it('should fail if the iterator fails', () => {
        return couchdbIterator.bulk(prepared.couchdbAddr, () => {
            throw new Error('foo');
        })
        .then(() => {
            throw new Error('Expected to fail');
        }, (err) => {
            expect(err).to.be.an.instanceOf(Error);
            expect(err.message).to.equal('foo');
        });
    });

    describe('arguments', () => {
        it('should fail if couchdb does not point to a db', () => {
            return couchdbIterator.bulk('http://localhost:5984', () => {})
            .then(() => {
                throw new Error('Expected to fail');
            }, (err) => {
                expect(err).to.be.an.instanceOf(Error);
                expect(err.message).to.match(/no database is selected/i);
            });
        });

        it('should accept a nano instance', () => {
            return couchdbIterator.bulk(prepared.couchdb, () => {})
            .then((rowsCount) => {
                expect(rowsCount).to.equal(prepared.documents.length);
            });
        });

        it('should use options as view params', () => {
            let count = 0;
            const userDocuments = prepared.documents.filter((doc) => doc.$type === 'user');

            return couchdbIterator.bulk(prepared.couchdbAddr, 'test/view-1', (rows) => {
                count += rows.length;
            }, {
                startkey: ['user', ''],
                endkey: ['user', '\ufff0'],
            })
            .then((rowsCount) => {
                expect(count).to.equal(userDocuments.length);
                expect(rowsCount).to.equal(count);
            });
        });

        it('should snakeCase view params', () => {
            let count = 0;
            const userDocuments = prepared.documents.filter((doc) => doc.$type === 'user');

            return couchdbIterator.bulk(prepared.couchdbAddr, 'test/view-1', (rows) => {
                count += rows.length;
                rows.forEach((row) => expect(row.doc).to.be.an('object'));
            }, {
                startkey: ['user', ''],
                endkey: ['user', '\ufff0'],
                includeDocs: true,
            })
            .then((rowsCount) => {
                expect(count).to.equal(userDocuments.length);
                expect(rowsCount).to.equal(count);
            });
        });

        it('should fail on invalid options', () => {
            return couchdbIterator.bulk(prepared.couchdbAddr, () => {}, { some: 'option' })
            .then(() => {
                throw new Error('Expected to fail');
            }, (err) => {
                expect(err).to.be.an.instanceOf(Error);
                expect(err.message).to.match(/option `some` is not allowed/i);
            });
        });
    });
});
