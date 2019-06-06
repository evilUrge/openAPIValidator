module.exports = {
    dummy:{
        example_list: [
            {"name":"v1/examples/dude","example_id":"dude","age":30},
            {"name":"v1/examples/avigdor","example_id":"avigdor","age":41}],
    },
    settings: {
        port: process.env.TEST_PORT || 53253
    }
};
