# Express Rate Limiting
Basic rate limiting for Express.js

# Install

`npm install express-rate-limiter`

# Usage

```js
'use strict';

const limiter = require('express-rate-limiter');
const app = require('express')();

app.use(limiter({
	rpm: 60,                 // 60 requests per minute
	header: 'X-Access-Token' // identify the request with this header
}));

// You may also specify a handler if you want to do something other than
// return with { error: { code: 429, message: 'too many requests' } }
app.use(limiter({
	rpm: 60,
	handler: (req, res, next) => {
		return res.status(429).json({ MyFancyError: 'Try again next time!' });
	}
}));

```
