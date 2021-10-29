const Apify = require('apify');

const { utils: { log } } = Apify;

exports.handlGithubIssues = async ({ request, json }) => {
    log.info(JSON.stringify(json, null, 2));
};
