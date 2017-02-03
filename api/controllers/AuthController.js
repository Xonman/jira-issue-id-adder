module.exports = {
    installed: (request, response) => {
        let jwtFields = request.body;
        if ( !jwtFields.hasOwnProperty('clientKey') ) return response.status(400).send();
        if ( !jwtFields.hasOwnProperty('publicKey') ) return response.status(400).send();
        if ( !jwtFields.hasOwnProperty('sharedSecret') ) return response.status(400).send();

        Jwt.create(jwtFields).exec((error, model) => {
            if ( error ) return response.status(500).send();

            return response.status(200).send();
        });
    }
};