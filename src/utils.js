const fs = require('fs');
const phin = require('phin');

const constant = require('./consts');
const baseDir = require('path').join(__dirname, '..');


/**
 * request retrieves a response body in a JSON obj.
 * @param url
 * @param callType default GET
 * @param data
 * @returns {Promise<boolean>}
 */
const request = async (url, callType = 'get', data = false) => {
    let conf = {
        url: url,
        method: callType.toUpperCase()
    };
    (data && (callType.toLocaleUpperCase() === 'POST')) && (conf['data'] = data);
    const response = await phin(conf);
    const responseIsOk = response.statusCode === 200;
    if (responseIsOk) {
        return response.body ?
            await require('util').promisify(require('json-schema-deref'))(JSON.parse(response.body.toString()))
            : true
    } if(!responseIsOk) {
        throw `Error: ${response.statusCode}`
    }
};


/**
 * Reads the definitions from consts open api mapper and returns the giving object value.
 * @param obj - Object to iterate and retrieve value from the mapper
 * @param definition - definition from the mapper json obj (see consts)
 * @return {*} value or same obj
 */
const mapReader = (obj, definition)=>{
    if (constant.openapiMap[definition]){
        const arrayOfDef = Array.isArray(constant.openapiMap[definition]) ?
            constant.openapiMap[definition] :
            constant.openapiMap[definition].split();

        for (let index of arrayOfDef){
            obj = obj[index]
        }
        return obj
    } return false
};


/**
 * Exposing Firebase realtime database for internal usage(mainly catching responses)
 * @param path
 * @param write
 * @returns {Promise<*>}
 */
const db = async(path, write=false) =>{
    const fb = require('./firebase');
    const db = await fb.admin.database();
    if (write){
        return await db
            .ref(`/cloud-test/${path}`)
            .set(write)
            .then((snapshot)=>snapshot)
    }
    return await db
        .ref(`/cloud-test/${path}`)
        .once('value')
        .then((snapshot)=>snapshot.val())
        .catch(error=>console.error(error))
};


module.exports = {
    baseDir: baseDir,
    isDev: process.env.NODE_ENV === 'dev' || process.env.NODE_ENV === 'development',
    config: (() => {
        /**
         * Get GCP\FB config base on NODE_ENV
         * @type {string} path to the service account.
         * @return {JSON} service account json.
         */

        const confDir = `${baseDir}/config`;
        const isNodeEnvConf = Boolean(fs.readdirSync(confDir).find(
            (currentFile)=> process.env.NODE_ENV ?
                currentFile===`${process.env.NODE_ENV.toLowerCase()}.json`
                :false));

        return require(`${confDir}/${isNodeEnvConf?process.env.NODE_ENV:'production'}.json`);
    })(),
    request: request,
    mapReader: mapReader,

    /**
     * Generate a dictionary for easy accessing the specs defined paths and name(or just generates a random hex).
     * @param openapi - spec
     * @returns {{title: string, paths: *}}
     */
    mappedVersion: (openapi) =>({
        title: mapReader(openapi, 'title')?
            mapReader(openapi, 'title').toLowerCase().split(' ').join('_') :
            require('crypto').randomBytes(20).toString('hex'),
        paths: mapReader(openapi, 'paths')
    }),

    /**
     * Reads the openapi specs and try to find invalid syntax. this function is super easy to extand. all you need to do
     * is to add additional value to validators dictionary in a form of {nameOfValidator: ()=>conditions_for_passing}
     * @param specToCheck - should be a JSON obj
     * @returns {string} => Tests with pass\fail in a Junit format.
     */
    syntaxValidator: (specToCheck) => {
        /**
         * Run a test and generate a junit result
         * @param term - function to execute
         * @param name - name of the function
         * @returns Junit true|false result
         */
        const testCoverage = (term, name)=>{
            try{
                return term ?
                    constant.junit.syntax.test_pass
                        .replace('{name}', name) :
                    constant.junit.syntax.test_fail
                        .replace('{name}', name)
                        .replace('{failed}', `Found illegal usage for ${name}`);
            } catch (error) {
                console.error(error);
                return constant.junit.syntax.test_fail
                    .replace('{name}', name)
                    .replace('{failed}', `error occurred during validation of ${name}`);
            }

        };

        /**
         * @type {string[]} splitting the openapi spec into an array(easy to work with for some validators)
         */
        const specArray = JSON.stringify(specToCheck).split('"');

        /**
         * External validator, had to get it out from validators dict as it's a recursive function(!)
         * @type {Function}
         */
        const snakeCaseMethod = ((innerIndex)=>{
            const index = innerIndex.findIndex((char)=>char==='-'||char==='_')+1;
            if (index === 0) {
                return true
            } else if (innerIndex.length === index){
                return false
            }
            return snakeCaseMethod(innerIndex.slice(index))
        });

        /**
         * Available validators. EXTEND HERE IF YOU WANT TO ADD MORE SYNTAX VALIDATORS(EASY RIGHT?)
         * @type {
         * {snakeCase: (function(): boolean),
         * camelCase: (function(): boolean),
         * kebabCase: (function(): boolean),
         * pluralValidation: (function(): boolean)}}
         */
        const validators = {
            snakeCase : ()=>specArray.every((term)=>snakeCaseMethod([...term])),
            camelCase: ()=>!specArray.some((word)=>word.match(constant.re.camelCase)),
            kebabCase : ()=>Object.keys(specToCheck.paths).every((path)=>{
                if (path.match(constant.re.kebabCase)){
                    if (!specToCheck.paths[path].get){
                        return true
                    } else if(specToCheck.paths[path].get.parameters) {
                        return specToCheck.paths[path].get.parameters.some((parameter)=>path.match(constant.re.kebabCase)[0] === `{${parameter.name}}`)
                    }
                } return true
            }),
            pluralValidation: ()=>Object.keys(specToCheck.paths).every((path)=>
                path.endsWith('s') ? ()=>
                    Object.keys(specToCheck.paths[path]).every((method)=>
                        method === 'get'
                            ? method.responses['200'].content['application/json'].example.length > 1
                            : Array.isArray(method.parameters) && method.parameters.length > 1
                    ) : true
            )
        };
        return Object.keys(validators)
            .map((validator)=> testCoverage(validators[validator](), validator)).join('')
    },

    /**
     * Checking the available service handlers and make requests based on what is being specified in the spec.
     * @param serviceName
     * @param baseUrl
     * @param host
     * @param properties
     * @returns {Promise<*>}
     */
    validateHandlers: async (serviceName, baseUrl, host, properties) => {
        /**
         * Check records of a response if it's including a name param.
         * @param records => array of results from a single call
         * @return {Promise<*>} responses
         */
        const checkRecords = async (records) => {
            const job = records.map(item => item.name ? item.name : false);

            if (job.every(item => typeof item === 'string') || job.every(item => item === false)) {
                try {
                    const work = job.map(async (item) => phin(host.split('/')
                        .map(word => !item.includes(word) ? word : '').join('/') + item));
                    let session = await Promise.all(work);
                    return session.map(session => session ? JSON.parse(session.body) : false);
                } catch (e) {
                    console.error(e)
                }
            }
            return []
        };

        const reqHandler = async (body, callType, url, isMain) => {
            let reqData = null;

            let mainParamsAnalyzer = (mainParams) => {
                if (mainParams && Object.keys(mainParams).length){
                    for (let method of Object.keys(mainParams)){
                        for (let callName of Object.keys(mainParams[method])){
                            let currentCall = mainParams[method][callName];

                            let example = Array.isArray(currentCall) ?
                                currentCall[Math.floor(Math.random() * currentCall.length)] :
                                currentCall;

                            example.name ? delete example.name : ()=>{};

                            if (body.parameters.length === Object.keys(example).length && body.parameters.map((val)=>Object.keys(example).includes(val.name) && val.schema.type === typeof example[val.name])) {
                                return example;
                            }
                        }
                    }
                }
                return {}
            };

            /**
             * If get req with get params; refactor URL to include params.
             */
            const mainParams = !isMain ? await db(serviceName): {};

            if (callType.toLowerCase() === 'get') {
                let params = {};

                if (url.match(constant.re.kebabCase)) {
                    if (body.example && body.example.params) {
                        params = body.example.params;
                    } else if (!isMain) {
                        params = mainParamsAnalyzer(mainParams)
                    }
                    Object.keys(params).map((key) => url.includes(`{${key}}`) ? url = url.replace(`{${key}}`, params[key]) : null);
                }
            }

            /**
             * Get reqData in case of a post\patch\put
             */
            else if (['patch', 'post', 'put'].includes(callType)) {
                const example = mapReader(body, 'schema_example');
                if (example) {
                    reqData = example;
                } else if (!isMain) {
                    reqData = mainParamsAnalyzer(mainParams);
                }
            }
            const response = await request(url, callType, reqData).then(response => response).catch((error) => console.error(error));
            await db(`${serviceName}/${body.operationId}/${callType}`, response);
            return response// TODO: catch HTTP errors
        };

        const checkPaths = async (serviceName, callType, isMain = false) => {
            const session = await reqHandler(serviceName, callType, baseUrl, isMain).catch(error=>console.error(error));
            if (session) {
                let result = '';
                if (Array.isArray(session)) {
                    const subSessions = await checkRecords(session);
                    subSessions.every(item => {
                        result += item && item.name ?
                            constant.junit.handler.test_pass.replace('{name}', baseUrl).replace('{method}', callType) :
                            constant.junit.handler.test_fail.replace('{name}', baseUrl).replace('{method}', callType).replace('{failed}', 'Failed to fetch name tag')
                    })
                } else {
                    result += constant.junit.handler.test_pass.replace('{name}', baseUrl).replace('{method}', callType)
                }
                return result
            }
            return constant.junit.handler.test_fail.replace('{name}', baseUrl).replace('{method}', callType).replace('{failed}', 'Failed to execute the entire handlers-test')
        };


        /**
         * Deals with the main handler of a path; saving value for later usage.
         */
        const corePaths = properties.main ? await Promise.all(Object.keys(properties.main).map(async (callType) =>
            await checkPaths(properties.main[callType], callType, true)
        )).catch(error=>console.error(error)) : [];

        delete properties.main;

        const otherPaths = properties ? await Promise.all(Object.keys(properties).map(async (path) =>
            await Promise.all(Object.keys(properties[path]).map(async (callType) =>
                await checkPaths(properties[path][callType], callType, false)))
        )).catch(error=>console.error(error)) : [];

        return corePaths.join('') + otherPaths.join('')
    },

};