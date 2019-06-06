process.env.NODE_ENV = 'development';

const chai = require('chai');
const chaiHttp = require('chai-http');
const assert = chai.assert;

const utils = require('../src/utils');
const server = require(`${utils.baseDir}/src/server`);

const should = chai.should();
let session = {};
chai.use(chaiHttp);

describe('Health test', () => {
    beforeEach(() => {
        session = server.listen(process.env.PORT || 3000);
    });

    afterEach(() => {
        session.close();
    });

    describe('check /status', () => {
        it('Should return 200', (done) => {
            chai.request(server).get('/v1/status')
                .end((err, res)=>{
                    res.should.status(200);
                done();
            });


        });
    });
});
