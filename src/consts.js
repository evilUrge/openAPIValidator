const TEST_CORE = `<testcase type="{type}" name="{name}" {tags}>{failed}</testcase>`;

module.exports = {
    validatePath: {
        types: ['connect','delete','get','head','options','patch','post','put','trace'],
    },
    junit: {
        header: `<?xml version="1.0" encoding="UTF-8"?>`,
        test_suite: `<testsuite name="{name}">`,
        end_test_suite: `</testsuite>`,
        handler:{
            test_pass: TEST_CORE.replace('{type}', 'handler').replace('{tags}', ' method="{method}"').replace('{failed}',''),
            test_fail: TEST_CORE.replace('{type}', 'handler').replace('{tags}', ' method="{method}"').replace('{failed}', '<failure message="{failed}"/>')
        },
        syntax:{
            test_pass: TEST_CORE.replace('{type}', 'syntax').replace('{tags}', '').replace('{failed}',''),
            test_fail: TEST_CORE.replace('{type}', 'syntax').replace('{tags}', '').replace('{failed}', '<failure message="{failed}"/>')
        }
    },
    re: {
        kebabCase:/{(.*?)}/g,
        camelCase: /[A-Z]([A-Z0-9]*[a-z][a-z0-9]*[A-Z]|[a-z0-9]*[A-Z][A-Z0-9]*[a-z])[A-Za-z0-9]*/gm
    },
    openapiMap: {
        title: ['info', 'title'],
        paths:'paths',

        // From here, all are related to paths
        schema_example: ['requestBody', 'content' ,`application/json` ,'schema', 'example']
    }
};