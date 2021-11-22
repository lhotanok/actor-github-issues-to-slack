const Apify = require('apify');

const { utils: { log } } = Apify;

exports.getGithubIssuesRequests = (repositories, page = 1) => {
    return repositories.map((repository) => ({
        url: `https://api.github.com/repos/${repository}/issues?state=all&per_page=100&page=${page}`,
        userData: { repository, page },
    }));
};

exports.getModifiedIssues = (currentIssues, previousIssues) => {
    const modifiedIssues = {};

    // don't compare current issues with the previous state when it is empty
    //  (we don't want to mark all issues as modified on the first run of the actor)
    if (!previousIssues || previousIssues === {}) {
        return {};
    }

    log.info(`Current number of monitored repositories: ${Object.keys(currentIssues).length}`);
    log.info(`Previous number of monitored repositories: ${Object.keys(previousIssues).length}`);

    // compare current issues only for repositories that were monitored before
    //  don't mark all issues as modified for the newly monitored repositories
    Object.keys(previousIssues).forEach((repository) => {
        const modifiedRepoIssues = []; // to compare modified vs all repo issues count

        if (currentIssues[repository]) {
            // condition needed for case we excluded repository we monitored in the previous run
            Object.keys(currentIssues[repository]).forEach((issueId) => {
                const currentIssue = currentIssues[repository][issueId];
                const previousIssue = previousIssues[repository][issueId];

                if (issueStateChanged(currentIssue, previousIssue)) {
                    if (!modifiedIssues[repository]) {
                        modifiedIssues[repository] = [];
                    }

                    modifiedIssues[repository].push(currentIssue);
                    modifiedRepoIssues.push(currentIssue);

                    log.info(`Issue from ${repository} repository changed.`);
                    log.info(`Previous issue state: ${JSON.stringify(previousIssue, null, 2)}`);
                    log.info(`New issue state: ${JSON.stringify(currentIssue, null, 2)}`);
                }
            });

            logIfAllRepoIssuesChanged(modifiedRepoIssues, currentIssues, previousIssues, repository);
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
        log.info(`New issue discovered in repository (${currentIssue.url})`);
        stateChanged = true;
    }

    return stateChanged;
}

function logIfAllRepoIssuesChanged(modifiedRepoIssues, currentIssues, previousIssues, repository) {
    if (modifiedRepoIssues.length === currentIssues[repository].length) {
        log.info(`All issues from ${repository} were modified (${modifiedRepoIssues.length} issues).`);
        log.info(`Current repository state:
            ${JSON.stringify(currentIssues[repository], null, 2)}`);
        log.info(`Previous repository state:
            ${JSON.stringify(previousIssues[repository], null, 2)}`);
    }
}
