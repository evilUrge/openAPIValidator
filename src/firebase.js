const admin = require('firebase-admin');

const utils = require('./utils');

exports.admin = (() =>
    admin.initializeApp(
        (() => utils.isDev ?
                {
                    credential: admin.credential.cert(utils.config.FirebaseAdminSDK),
                    databaseURL: utils.config.FirebaseConf.databaseURL
                } : require('firebase-functions').config().firebase
        )())
)();
