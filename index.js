'use strict';

/**
 * Create a middleware function for rate limiting
 *
 * @param   {Object|Number}     opts            [Middleware options or just the requests per minute to allow]
 * @param   {Number}            [opts.rpm]      [Requests per minute to allow]
 * @param   {String}            [opts.property] [Property on the request to use to identify requests (default: `ip`)]
 * @param   {String}            [opts.header]   [Header name to use to identify requests (use either this or `property`--not both)]
 * @param   {Function}          [opts.handler]  [Middleware function that will be called when limit is hit rather than allowing the middleware to reply directly]
 * @param   {Promise.<Object>}  [opts.getStore] [Function the middleware may use to retrieve the token store (e.g. when storing in redis)]
 * @param 	{Promise}           [opts.setStore] [Function to save data to the store (required if `getStore` is set)]
 *
 * @returns {Function} Configured rate limiter
 */
module.exports = (opts) => {

	opts = opts || {};

	if (typeof opts === 'number') {
		opts = { rpm: opts };
	}

	if (typeof opts.rpm !== 'number' || opts.rpm <= 0) {
		throw new TypeError(`'rpm' must be a number greater than 0`);
	}

	if (typeof opts.property === 'string' && typeof opts.header === 'string') {
		throw new Error(`only 'property' or 'header' should be defined--not both`);
	}

	if (typeof opts.handler !== 'undefined' && typeof opts.handler !== 'function') {
		throw new TypeError(`'handler' must be a function`);
	}

	// Default to using `req.ip` to identify requests
	if (typeof opts.property === 'undefined' && typeof opts.header === 'undefined') {
		opts.property = 'ip';
	}

	let tokens = {};

	// Every second lower the number of tokens based upon
	// the given request per minute setting
	setInterval(() => {
		Object.keys(tokens).forEach((token) => {
			if (tokens[token] > 0) {
				tokens[token] -= (opts.rpm / 60);
			}
		});
	}, 1000);

	return (req, res, next) => {

		let prop = opts.property ? req[opts.property] : req.headers[opts.header];

		if (tokens[prop]) {

			if (tokens[prop] >= opts.rpm) {

				if (opts.handler) {
					return opts.handler(req, res, next);
				}

				return res.status(429).json({
					error: {
						code: 429,
						message: 'too many requests'
					}
				});
			}

			tokens[prop] += 1;
		} else {
			tokens[prop] = 1;
		}

		return next();
	}
};

