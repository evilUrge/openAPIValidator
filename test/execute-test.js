process.env.NODE_ENV = 'development';

const chai = require('chai');
const chaiHttp = require('chai-http');
const assert = chai.assert;

const utils = require('./utils');
const server = require(`${utils.baseDir}/src/server`);

const constant = require(`${utils.baseDir}/test/consts`);
const url = '/execute';
const test_url = {url: `http://127.0.0.1:${constant.settings.port}/v1/api-docs`};

const should = chai.should();
let session = {};
let test_server = {};

chai.use(chaiHttp);

describe('Validate schema', () => {
    beforeEach(async () => {
        session = server.listen(process.env.PORT || 3000);
        test_server = utils.server;
    });

    afterEach(() => {
        session.close();
        test_server.close();
    });

    describe('post test', () => {
        it('Check if exists', (done) => {
            chai.request(server).post(url).send(test_url)
                .end((err, res)=>{
                    chai.expect(err).to.be.null;
                    res.should.status(200);
                done();
            });
        });

    });
});
