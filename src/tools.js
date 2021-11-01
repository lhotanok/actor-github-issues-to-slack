const Apify = require('apify');
const { ISSUES_STATE } = require('./constants');

const { utils: { log } } = Apify;

exports.getGithubIssuesRequests = (repositories, page = 1) => {
    return repositories.map((repository) => ({
        url: `https://api.github.com/repos/${repository}/issues?state=all&per_page=100&page=${page}`,
        userData: { repository, page },
    }));
};

exports.getModifiedIssues = async () => {
    const apifyClient = Apify.newClient({ token: process.env.APIFY_TOKEN });
    const actorClient = apifyClient.actor('lhotanok/github-issues-to-slack');

    // Selects the last actor's run that finished with a SUCCEEDED status.
    const lastSucceededRunClient = actorClient.lastRun({ status: 'SUCCEEDED' });

    const issues = await lastSucceededRunClient.keyValueStore().getRecord(ISSUES_STATE);

    log.info(`ISSUES:
    ${JSON.stringify(issues, null, 2)}`);
};
