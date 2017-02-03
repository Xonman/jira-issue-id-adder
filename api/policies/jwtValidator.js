const jwt = require('jsonwebtoken');

module.exports = (request, response, next) => {

    let authHeader = request.get('Authorization');
    let rawJwt = '';
    let jwtMatch;
    
    if ( authHeader && (jwtMatch = authHeader.match(/^JWT\s(.+)/)) ) {
        rawJwt = jwtMatch.pop();
    } else if ( request.param('jwt') ) {
        rawJwt = request.param('jwt');
    } else {
        return response.status(401).send();
    }

    let decoded = jwt.decode(rawJwt);
    let issuer = decoded.iss;
    Jwt.findOne({clientKey: issuer}).exec((error, jwtModel) => {
        if ( error || !jwtModel ) return response.status(401).send(`Issuer not known`);

        let psk = jwtModel.sharedSecret;
        jwt.verify(rawJwt, psk, (error, decoded) => {
            if ( error ) return response.status(401).send(`JWT could not be verified`);

            next();
        });
    });
}