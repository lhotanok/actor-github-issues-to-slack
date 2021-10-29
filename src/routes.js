const Apify = require('apify');

const { getGithubIssuesRequests } = require('./tools');

const { utils: { log } } = Apify;

exports.handleGithubIssues = async ({ request, crawler, json }, issuesState) => {
    const { userData: { repository, page } } = request;
    const { requestQueue } = crawler;

    const issues = getIssuesInfo(json, repository);
    log.info(`Scraped ${issues.length} issues from ${repository} repository.`);

    if (issues.length !== 0) {
        const nextIssueRequests = getGithubIssuesRequests([repository], page + 1);
        for (const nextRequest of nextIssueRequests) {
            await requestQueue.addRequest(nextRequest);
        }
    }

    issuesState.push(...issues);
};

function getIssuesInfo(items, repository) {
    return items.map((issue) => {
        const { title, id, state, comments, labels, assignee } = issue;

        const labelNames = labels.map((label) => label.name);
        const assigneeLogin = assignee ? assignee.login : null;

        return {
            repository,
            title,
            id,
            state,
            labels: labelNames,
            author: issue.user.login,
            createdAt: issue.created_at,
            updatedAt: issue.updated_at,
            assignee: assigneeLogin,
            comments,
            url: issue.html_url,
        };
    });
}
