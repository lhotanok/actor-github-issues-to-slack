const Apify = require('apify');
const { ISSUES_STATE, ISSUES_KEY_VALUE_STORE } = require('./constants');

const { utils: { log } } = Apify;

exports.getGithubIssuesRequests = (repositories, page = 1) => {
    return repositories.map((repository) => ({
        url: `https://api.github.com/repos/${repository}/issues?state=all&per_page=100&page=${page}`,
        userData: { repository, page },
    }));
};

exports.getModifiedIssues = async (currentIssues) => {
    const modifiedIssues = {};

    const issuesStore = await Apify.openKeyValueStore(ISSUES_KEY_VALUE_STORE);
    const previousIssues = await issuesStore.getValue(ISSUES_STATE) || {};

    // do not compare current issues with the previous state when it is empty
    // do not mark all issues as modified on the first run of the actor
    if (previousIssues === {}) {
        return {};
    }

    Object.keys(currentIssues).forEach((repository) => {
        // compare current issues only for repositories that were monitored before
        // do not mark all issues as modified for the newly monitored repositories
        if (previousIssues[repository]) {
            Object.keys((currentIssues[repository])).forEach((issueId) => {
                const currentIssue = currentIssues[repository][issueId];
                const lastRunIssue = previousIssues[repository][issueId];

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
