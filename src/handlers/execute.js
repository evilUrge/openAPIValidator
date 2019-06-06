/**
 * Execute a testsuite based on an openapi sepc that been provided from a microservice
 *
 * Example:
 * {
 *  "url": "https://some-url.beer/openapispec.json",
 * }

 * @param req
 * @param res
 */

const utils = require('../utils');
const constant = require(`${utils.baseDir}/src/consts`);

const junit = (url) => {
    /**
     * Strip the host from the last item and fix the prefix if there's no http\https
     */
    let host = url.split('/');
    host.pop();
    host = host.join('/');
    (!host.includes('http://') || !host.includes('http://')) && (host = `http://${host}`);

    return utils.request(url).then(async openapi => {
        const mapped = utils.mappedVersion(openapi);
        let junit = constant.junit.header;

        /***
         * Create a mapping of the available handlers base on the relative path
         */

        let urls = {};
        Object.keys(mapped.paths).forEach((currentUrl) => {
            let paths = currentUrl.split('/').slice(-2).filter(value => Object.keys(value).length !== 0);
            urls[paths[0]] ?
                urls[paths[0]][paths[1]] = mapped.paths[currentUrl] :
                urls[paths[0]] = {[paths[1] ? paths[1] : 'main']: mapped.paths[currentUrl]};
        });

        junit += constant.junit.test_suite.replace('{name}', mapped.title);
        const tests = Object.keys(urls).length ?
            await Promise.all(Object.keys(urls).map(async (handlerName) => {
                    let tests = [];

                    tests.push(await utils.validateHandlers(mapped.title, `${host}/${handlerName}`, host, urls[handlerName]));
                    if (Object.keys(urls[handlerName]).length) {
                        tests.push(await utils.validateHandlers(mapped.title, `${host}/${handlerName}`, host, urls[handlerName]));
                    }
                    return tests.join('')
                }
            )).catch(() => []) : [];
        junit += utils.syntaxValidator(openapi);
        junit += tests.join('');
        junit += constant.junit.end_test_suite;
        return junit

    }).catch((error) => {
        console.error(error);
        throw error
    });
};
module.exports = {
    execute: {
        type: ['get', 'post'], exec: ((req, res) =>
                req.body && req.body.url || req.query.url ?
                    junit(req.query.url ? req.query.url : req.body.url)
                        .then((junit) => res.set('Content-Type', 'application/xml').status(200).send(junit))
                        .catch(error => res.status(500).send(`Error occurred in the test server: ${error}`))
                    : res.status(400).send('Missing URL param').end()
        )},
    raw: {
        type: 'post', exec: ((req, res) =>
                req.body ?
                    res.set('Content-Type', 'application/xml')
                        .status(200)
                        .send(constant.junit.header + constant.junit.test_suite.replace('{name}', utils.mappedVersion(req.body)) +
                        utils.syntaxValidator(req.body) + constant.junit.end_test_suite)
                    : res.status(400).send('Please provide openapi spec as the req body!').end()
        )}
};