const base_utils = require('../src/utils');
const constant = require(`${base_utils.baseDir}/test/consts`);

exports.baseDir=base_utils.baseDir;


exports.server = (() => {
    const schema = require(`${base_utils.baseDir}/test/examples/api-docs`);
    const express = require('express');
    const bodyParser = require('body-parser');

    const server = express({name: 'Test server for serving a openapi spec'});

    server.use(bodyParser.json())
        .use(bodyParser.urlencoded({extended: true}));

    server['get']('/v1/status',(req, res)=>res.status(200).send('yas'));
    server['get']('/v1/api-docs',(req, res)=>res.status(200).send(schema));
    server['get']('/v1/examples',(req, res)=>res.status(200).send(constant.dummy.example_list));
    server['get']('/v1/examples/:example_id',(req, res)=>{
        for (let current_example of constant.dummy.example_list){
            if (current_example.example_id === req.params.example_id){
                return res.status(200).send(current_example)
            }
        } return res.status(405).send(res)
    });
    server['post']('/examples',(req, res)=>(req.body && req.body.name && req.body.id) ? res.status(200).send(req.body) : req.status(405));

    server.listen(constant.settings.port);
    console.log(`Test server is running on port ${constant.settings.port}`);

    return server;
})();

