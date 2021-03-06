/*
 * Based off jwt-simple, adds query string hash verification
 *
 * JSON Web Token encode and decode module for node.js
 *
 * Copyright(c) 2011 Kazuhito Hokamura
 * MIT Licensed
 */

/**
 * module dependencies
 */
var crypto = require('crypto');
var _ = require('lodash');
var Uri = require('jsuri');


/**
 * support algorithm mapping
 */
var algorithmMap = {
    HS256: 'sha256',
    HS384: 'sha384',
    HS512: 'sha512'
};


/**
 * The separator between sections of a canonical query.
 */
var CANONICAL_QUERY_SEPARATOR = '&';


/**
 * expose object
 */
var jwt = module.exports;


/**
 * version
 */
jwt.version = '0.1.0';

/**
 * Decode jwt
 *
 * @param {Object} token
 * @param {String} key
 * @param {Boolean} noVerify
 * @return {Object} payload
 * @api public
 */
jwt.decode = function jwt_decode(token, key, noVerify) {
    // check seguments
    var segments = token.split('.');
    if (segments.length !== 3) {
        throw new Error('Not enough or too many segments');
    }

    // All segment should be base64
    var headerSeg = segments[0];
    var payloadSeg = segments[1];
    var signatureSeg = segments[2];

    // base64 decode and parse JSON
    var header = JSON.parse(base64urlDecode(headerSeg));
    var payload = JSON.parse(base64urlDecode(payloadSeg));

    // normalize 'aud' claim, the spec allows both String and Array
    if (payload.aud && !_.isArray(payload.aud)) {
        payload.aud = [ payload.aud ];
    }

    if (!noVerify) {
        var signingMethod = algorithmMap[header.alg];
        if (!signingMethod) {
            throw new Error('Algorithm "' + header.alg + '" is not supported');
        }

        // verify signature. `sign` will return base64 string.
        var signingInput = [headerSeg, payloadSeg].join('.');
        if (signatureSeg !== sign(signingInput, key, signingMethod)) {
            throw new Error('Signature verification failed for input: ' + signingInput + ' with method ' + signingMethod);
        }
    }

    return payload;
};


/**
 * Encode jwt
 *
 * @param {Object} payload
 * @param {String} key
 * @param {String} algorithm
 * @return {String} token
 * @api public
 */
jwt.encode = function jwt_encode(payload, key, algorithm) {
    // Check key
    if (!key) {
        throw new Error('Require key');
    }

    // Check algorithm, default is HS256
    if (!algorithm) {
        algorithm = 'HS256';
    }

    var signingMethod = algorithmMap[algorithm];
    if (!signingMethod) {
        throw new Error('Algorithm "' + algorithm + '" is not supported');
    }

    // header, typ is fixed value.
    var header = { typ: 'JWT', alg: algorithm };

    // create segments, all segment should be base64 string
    var segments = [];
    segments.push(base64urlEncode(JSON.stringify(header)));
    segments.push(base64urlEncode(JSON.stringify(payload)));
    segments.push(sign(segments.join('.'), key, signingMethod));

    return segments.join('.');
};

jwt.createCanonicalRequest = function createCanonicalRequest(req, checkBodyForParams, baseUrl) {
    return canonicalizeMethod(req) + CANONICAL_QUERY_SEPARATOR + canonicalizeUri(req, baseUrl) + CANONICAL_QUERY_SEPARATOR + canonicalizeQueryString(req, checkBodyForParams);
};

jwt.createQueryStringHash = function createQueryStringHash(req, checkBodyForParams, baseUrl) {
    return crypto.createHash(algorithmMap.HS256).update(this.createCanonicalRequest(req, checkBodyForParams, baseUrl)).digest('hex');
};


/**
 * private util functions
 */

function sign(input, key, method) {
    var base64str = crypto.createHmac(method, key).update(input).digest('base64');
    return base64urlEscape(base64str);
}

function base64urlDecode(str) {
    return new Buffer(base64urlUnescape(str), 'base64').toString();
}

function base64urlUnescape(str) {
    str += Array(5 - str.length % 4).join('=');
    return str.replace(/\-/g, '+').replace(/_/g, '/');
}

function base64urlEncode(str) {
    return base64urlEscape(new Buffer(str).toString('base64'));
}

function base64urlEscape(str) {
    return str.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function canonicalizeMethod(req) {
    return req.method.toUpperCase();
}

function canonicalizeUri(req, baseUrlString) {
    var path = req.path;
    var baseUrl = new Uri(baseUrlString);

    if (path && path.indexOf(baseUrl.path()) === 0) {
        path = path.replace(baseUrl.path(), '');
    }

    if (!path || path.length === 0) {
        return '/';
    }

    // If the separator is not URL encoded then the following URLs have the same query-string-hash:
    //   https://djtest9.jira-dev.com/rest/api/2/project&a=b?x=y
    //   https://djtest9.jira-dev.com/rest/api/2/project?a=b&x=y
    path = path.replace(new RegExp(CANONICAL_QUERY_SEPARATOR, 'g'), encodeRfc3986(CANONICAL_QUERY_SEPARATOR));

    // prefix with /
    if (path[0] !== '/') {
        path = '/' + path;
    }

    // remove trailing /
    if (path.length > 1 && path[path.length - 1] === '/') {
        path = path.substring(0, path.length - 1);
    }

    return path;
}

function canonicalizeQueryString(req, checkBodyForParams) {
    var queryParams = req.query,
        method = req.method.toUpperCase();

    // Apache HTTP client (or something) sometimes likes to take the query string and put it into the request body
    // if the method is PUT or POST
    if (checkBodyForParams && _.isEmpty(queryParams) && (method === 'POST' || method === 'PUT')) {
        queryParams = req.body;
    }

    var sortedQueryString = [],
        query = _.extend({}, queryParams);
    if (!_.isEmpty(query)) {
        // remove the 'jwt' query string param
        delete query['jwt'];

        _.each(_.keys(query).sort(), function (key) {
            var param = query[key],
                paramValue = '';
            if (Array.isArray(param)) {
                paramValue = _.map(param.sort(), function (v) {
                    return encodeRfc3986(v);
                }).join(',');
            } else {
                paramValue = encodeRfc3986(param);
            }
            sortedQueryString.push(encodeRfc3986(key) + "=" + paramValue);
        });
    }
    return sortedQueryString.join("&");
}

/**
 * We follow the same rules as specified in OAuth1:
 * Percent-encode everything but the unreserved characters according to RFC-3986:
 * unreserved  = ALPHA / DIGIT / "-" / "." / "_" / "~"
 * See http://tools.ietf.org/html/rfc3986
 */
function encodeRfc3986(value) {
    return encodeURIComponent(value)
        .replace(/[!'()]/g, escape)
        .replace(/\*/g, "%2A");
}