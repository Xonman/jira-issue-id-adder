const jwt = require('jsonwebtoken');
const request = require('request');
const url = require('url');
const atlassianJwt = require('../../atlassian-jwt');

module.exports = {
    addField(issueApiPath, fieldName) {
        return new Promise((resolve, reject) => {
            
            let parsedUrl = url.parse(issueApiPath);
            let path = parsedUrl.path;
            let requestBaseUrl = url.format({protocol: parsedUrl.protocol, host: parsedUrl.host});

            Jwt.findOne({baseUrl: requestBaseUrl}).exec((error, jwtModel) => {

                if ( error ) reject(new Error(`Could not find a JWT model to sign the API request for ${requestBaseUrl}`));

                if ( path.substr(-1) == '/' && path.length > 1 ) path = path.substr(0, path.length-1);
                let token = {
                    iss: 'tmg-custom-field-fixer',
                    iat: Math.floor(Date.now() / 1000),
                    exp: Math.floor(Date.now() / 1000) + (3*60), // expires in 3 minutes
                    qsh: atlassianJwt.createQueryStringHash({method: 'PUT', path: path})
                };

                let signedJwt = jwt.sign(token, jwtModel.sharedSecret);
                sails.log.debug(`Signed JWT for request: ${signedJwt}`, token);

                let requestBody = {update: {}};
                requestBody.update[sails.config.jira.field] = [{set: ' '}];

                request.put({
                    url: issueApiPath,
                    body: JSON.stringify(requestBody),
                    headers: {
                        'Authorization': `JWT ${signedJwt}`,
                        'Content-Type': 'application/json'
                    }
                }, (error, response, body) => {
                    sails.log.debug(`API response code ${response.statusCode}`, body);
                });
            });
        });
    }
}