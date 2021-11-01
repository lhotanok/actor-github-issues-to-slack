const Apify = require('apify');
const { ISSUES_STATE, SUCCEEDED_STATUS, THIS_ACTOR_ID } = require('./constants');

const { utils: { log } } = Apify;

exports.getGithubIssuesRequests = (repositories, page = 1) => {
    return repositories.map((repository) => ({
        url: `https://api.github.com/repos/${repository}/issues?state=all&per_page=100&page=${page}`,
        userData: { repository, page },
    }));
};

exports.getModifiedIssues = async (currentIssues) => {
    const modifiedIssues = {};

    const lastRunIssues = await getLastRunIssues();

    // do not compare current issues with the previous state when it is empty
    // do not mark all issues as modified on the first run of the actor
    if (lastRunIssues === {}) {
        return {};
    }

    Object.keys(currentIssues).forEach((repository) => {
        // compare current issues only for repositories that were monitored before
        // do not mark all issues as modified for the newly monitored repositories
        if (lastRunIssues[repository]) {
            Object.keys((currentIssues[repository])).forEach((issueId) => {
                const currentIssue = currentIssues[repository][issueId];
                const lastRunIssue = lastRunIssues[repository][issueId];

                if (issueStateChanged(currentIssue, lastRunIssue)) {
                    if (!modifiedIssues[repository]) {
                        modifiedIssues[repository] = [];
                    }
                    modifiedIssues[repository].push(currentIssue);
                }
            });
        }
    });

    return modifiedIssues;
};

async function getLastRunIssues() {
    const apifyClient = Apify.newClient({ token: process.env.APIFY_TOKEN });
    const actorClient = apifyClient.actor(THIS_ACTOR_ID);

    // selects the last actor's run that finished with a SUCCEEDED status
    const lastSucceededRunClient = actorClient.lastRun({ status: SUCCEEDED_STATUS });

    const issues = await lastSucceededRunClient.keyValueStore().getRecord(ISSUES_STATE);
    const lastRunIssues = issues ? issues.value : {};

    return lastRunIssues;
}

function issueStateChanged(currentIssue, oldIssue) {
    let stateChanged = false;

    if (oldIssue) {
        stateChanged = currentIssue.state !== oldIssue.state;
    } else {
        // new issue discovered
        stateChanged = true;
    }

    return stateChanged;
}
