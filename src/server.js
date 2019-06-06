module.exports = (() => {
    /**
     * Map all available handlers to express route.
     * @type {{handler}|*}
     */
    const fs = require('fs');

    const express = require('express');
    const bodyParser = require('body-parser');
    const bunyan = require('bunyan');

    const utils = require('./utils');
    const serviceName = require('../package.json').name;
    const logger = bunyan.createLogger({name: serviceName, level: utils.isDev ? 'debug' : 'error'});
    const server = express({name: serviceName, log: logger});
    const router = express.Router();

    const baseHandlersFolder = `${utils.baseDir}/src/handlers`;
    fs.readdirSync(baseHandlersFolder).forEach((fileName) => {
        if (fileName.includes('.js')) {
            const HandlerImport = require(`${baseHandlersFolder}/${fileName}`);
            Object.keys(HandlerImport).forEach((handler) => {
                try {
                    const methods = [handler].type ? HandlerImport[handler].type : ['get'];
                    (Array.isArray(methods) ? methods : [methods]).forEach((method) =>
                        router[method ? method : 'get'](`${handler === 'all' ? '*' : '/' + handler}${HandlerImport[handler].url ? HandlerImport[handler].url : ''}`, HandlerImport[handler].exec ? HandlerImport[handler].exec : HandlerImport[handler]));
                    logger.info(handler === 'all' ? '*' : '/' + handler)
                } catch (e) {
                    console.error(e);
                    logger.error(`Failed to register the following handler: ${handler}`);
                }
            })
        }
    });

    return server
        .use(bodyParser.json())
        .use(bodyParser.urlencoded({extended: true}))
        .use(router);
})();
