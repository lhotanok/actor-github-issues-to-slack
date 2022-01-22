const Apify = require('apify');
const { EXCLUDED_AUTHORS } = require('./constants');

const { getGithubIssuesRequests } = require('./tools');

const { utils: { log } } = Apify;

exports.scrapeGithubIssues = async ({ request, crawler, json }, issuesState) => {
    const { url, userData: { repository, page } } = request;
    const { requestQueue } = crawler;

    if (json.message && json.message === 'Not Found') {
        log.error(`Invalid url: ${url}
        Check if repository exists and if it has the right input format: username/repository`);
        return;
    }

    const issues = getIssuesInfo(json);

    if (issues.length !== 0) {
        const nextIssueRequests = getGithubIssuesRequests([repository], page + 1);
        for (const nextRequest of nextIssueRequests) {
            await requestQueue.addRequest(nextRequest);
        }

        log.info(`Scraped ${issues.length} issues from ${repository} repository (page ${page}).`);
    }

    if (!issuesState[repository]) {
        issuesState[repository] = {};
    }

    issues.forEach((issue) => {
        const { id } = issue;
        issuesState[repository][id] = issue;
    });
};

function getIssuesInfo(items) {
    const issues = items.map((issue) => {
        const { title, id, state, labels, assignee } = issue;

        const labelNames = labels.map((label) => label.name);
        const assigneeLogin = assignee ? assignee.login : null;

        return {
            title,
            id,
            state,
            labels: labelNames,
            author: issue.user.login,
            assignee: assigneeLogin,
            url: issue.html_url,
        };
    });

    const filteredIssues = issues.filter((issue) => {
        return !EXCLUDED_AUTHORS.includes(issue.author);
    });

    return filteredIssues;
}
