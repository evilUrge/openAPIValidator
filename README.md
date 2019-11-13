openAPIValidator - Validate your openapi spec like a _boss_
-----------------------------------------------------------

<a href="https://codeclimate.com/github/evilUrge/openAPIValidator/maintainability"><img src="https://api.codeclimate.com/v1/badges/562791ecf358c2f97c23/maintainability" /></a>

Microservice that runs set of tests on an exposed openapispecs of a microservice (as part of [OpenAPI Specification](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.0.md)).

## Prerequisites:
* Node ^v8
* Firebase service account

## Before running
As we have 2 separate environments in this setup, edit `/config/production.json` and `development.json` based on your project configurations:
* Go to the main project overview tab `https://console.firebase.google.com/u/0/project/<your-firebase-project-id>/overview`, click on *"Add app"* and then chose *"Web"* (`html-head` icon), copy the content of the var `config` after the key `FirebaseConf` in the selected configuration file.
* Generate a private key from: `https://console.firebase.google.com/u/0/project/<your-firebase-project-id>/settings/serviceaccounts/adminsdk` and paste it under the key "FirebaseAdminSDK".
When executing from dev env use the env_param `NODE_ENV=DEV`.

## Time to test your microservice (by method)
- **GET:** http://localhost:3000/v1/execute?url=https://host.tld/v1/api-docs
- **POST:** http://localhost:3000/v1/execute body: `{url:https://host.tld/v1/api-docs}`

## How to deploy
- First install all node dependencies: `npm i`
- Make sure you have firebase tools installed in your global: `npm i -g firebase-tools`
- And deploy via: `firebase deploy --only functions`


## How to extend
How you ask? Easy!
Add to the following following func `module.exports.syntaxValidator.validators` (in `src/utils.js`) your desired new validator and link it to an external function
###### Example:

```javascript
exampleForAValidator : ()=>yourFunctionallityGoesHere),
```

