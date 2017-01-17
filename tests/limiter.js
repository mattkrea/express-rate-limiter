'use strict';

const supertest = require('supertest');
const limiter = require('../index');
const express = require('express');
const assert = require('assert');

describe('limiter()', () => {
	describe('configuration', () => {
		it('should require an rpm', () => {
			assert.throws(() => {
				limiter();
			}, /rpm/);
		});

		it('should allow shorthand syntax', () => {
			limiter(60);
		});

		it('should require function for handler', () => {
			assert.throws(() => {
				limiter({
					rpm: 50,
					handler: 'handler'
				});
			}, /function/);
		});

		it('should not allow use of both header and property', () => {
			assert.throws(() => {
				limiter({
					rpm: 50,
					header: 'header',
					property: 'property'
				});
			}, /only/);
		});
	});

	describe('middleware', () => {
		it('should reject too many requests', (done) => {
			const app = express();
			app.use(limiter({ rpm: 3 }));
			app.use('*', (req, res) => res.status(200).end('OK'));

			const request = supertest(app);
			request.get('/').end((e, res) => {
				assert.equal(res.text, 'OK');
				request.get('/').end((e, res) => {
					assert.equal(res.text, 'OK');
					request.get('/').end((e, res) => {
						assert.equal(res.text, 'OK');
						request.get('/').end((e, res) => {
							assert.equal(res.status, 429);
							done();
						});
					});
				});
			});
		});

		it('should call the handler func if provided', (done) => {
			const app = express();
			app.use(limiter({
				rpm: 3,
				handler: (req, res, next) => {
					return res.status(512).end('test message');
				}
			}));
			app.use('*', (req, res) => res.status(200).end('OK'));

			const request = supertest(app);
			request.get('/').end((e, res) => {
				assert.equal(res.text, 'OK');
				request.get('/').end((e, res) => {
					assert.equal(res.text, 'OK');
					request.get('/').end((e, res) => {
						assert.equal(res.text, 'OK');
						request.get('/').end((e, res) => {
							assert.equal(res.status, 512);
							assert.equal(res.text, 'test message');
							done();
						});
					});
				});
			});
		});

		it('should check the header provided', (done) => {
			const app = express();
			app.use(limiter({ rpm: 3, header: 'token' }));
			app.use('*', (req, res) => res.status(200).end('OK'));

			const request = supertest(app);
			request.get('/').set('token', 'first').end((e, res) => {
				assert.equal(res.text, 'OK');
				request.get('/').set('token', 'first').end((e, res) => {
					assert.equal(res.text, 'OK');
					request.get('/').set('token', 'first').end((e, res) => {
						assert.equal(res.text, 'OK');
						request.get('/').set('token', 'first').end((e, res) => {
							assert.equal(res.status, 429);
							assert.equal(res.body.error.code, 429);
							request.get('/').set('token', 'second').end((e, res) => {
								assert.equal(res.text, 'OK');
								done();
							});
						});
					});
				});
			});
		});
	});
});
