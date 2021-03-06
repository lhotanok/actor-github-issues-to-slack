const Apify = require('apify');

const { REPOSITORIES_STATE } = require('./constants');

const { utils: { log } } = Apify;

exports.getGithubIssuesRequests = (repositories, page = 1) => {
    return repositories.map((repository) => ({
        url: `https://api.github.com/repos/${repository}/issues?state=all&per_page=100&page=${page}`,
        userData: { repository, page },
    }));
};

/**
 * Saves new repositories and issues from `repositoriesState` into named KVS in `issuesStore`.
 * If the issue already exists, its value is updated.
 * If the repository exists, its old issues are updated and new issues are saved.
 * No issues are deleted from named KVS. They need to be persisted for comparison in next runs.
 */
exports.saveRepositoryUpdates = async (issuesStore, repositoriesState) => {
    const repositories = await issuesStore.getValue(REPOSITORIES_STATE) || {};

    Object.keys(repositoriesState).forEach((repositoryName) => {
        const updatedRepository = repositoriesState[repositoryName];
        const oldRepository = repositories[repositoryName];

        if (!oldRepository) {
            log.info(`Saving new repository for further monitoring: ${repositoryName}`);
            repositories[repositoryName] = updatedRepository;
        } else {
            saveIssuesUpdates(updatedRepository, oldRepository);
        }
    });

    await issuesStore.setValue(REPOSITORIES_STATE, repositories);
};

exports.getModifiedIssues = (currentRepositories, previousRepositories) => {
    const modifiedIssues = {};

    // don't compare current issues with the previous state when it is empty
    //  (we don't want to mark all issues as modified on the first run of the actor)
    if (!previousRepositories || previousRepositories === {}) {
        return {};
    }

    // compare current issues only for repositories that were monitored before
    //  don't mark all issues as modified for the newly monitored repositories
    Object.keys(previousRepositories).forEach((repository) => {
        // condition needed for case we excluded repository we monitored in the previous run
        if (currentRepositories[repository]) {
            Object.keys(currentRepositories[repository]).forEach((issueId) => {
                const currentIssue = currentRepositories[repository][issueId];
                const previousIssue = previousRepositories[repository][issueId];

                if (issueStateChanged(currentIssue, previousIssue)) {
                    if (!modifiedIssues[repository]) {
                        modifiedIssues[repository] = [];
                    }

                    modifiedIssues[repository].push(currentIssue);

                    log.info(`Issue from ${repository} repository changed.`);
                }
            });
        }
    });

    return modifiedIssues;
};

function saveIssuesUpdates(updatedRepository, oldRepository) {
    Object.keys(updatedRepository).forEach((updatedIssue) => {
        // adds newly discovered issues or updates the old ones, doesn't delete any
        oldRepository[updatedIssue] = updatedRepository[updatedIssue];
    });
}

function issueStateChanged(currentIssue, oldIssue) {
    let stateChanged = false;

    if (oldIssue) {
        stateChanged = currentIssue.state !== oldIssue.state;
    } else {
        // new issue discovered
        log.info(`New ${currentIssue.state} issue discovered: ${currentIssue.url}`);
        stateChanged = true;
    }

    return stateChanged;
}
