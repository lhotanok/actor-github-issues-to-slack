const Apify = require('apify');

const { utils: { log } } = Apify;

exports.handleGithubIssues = async ({ request, json }) => {
    const { userData: { repository } } = request;

    const issues = getIssuesInfo(json, repository);

    await Apify.pushData(issues);
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
