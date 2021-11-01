const Apify = require('apify');
const { SLACK_ACTOR_ID, OPENED_ISSUE, CLOSED_ISSUE } = require('./constants');

const { utils: { log } } = Apify;

exports.sendModifiedIssuesNotification = async (modifiedIssues, { channel, token }, { openedIssues, closedIssues }) => {
    const text = buildNotificationMessage(modifiedIssues, { openedIssues, closedIssues });

    const slackActorInput = {
        token,
        channel,
        text,
    };

    const apifyClient = Apify.newClient({ token: process.env.APIFY_TOKEN });
    const actorClient = apifyClient.actor(SLACK_ACTOR_ID);

    // const run = await actorClient.call(slackActorInput);

    log.info(`Slack notification:
    ${JSON.stringify(slackActorInput, null, 2)}`);
};

function buildNotificationMessage(modifiedIssues, { openedIssues, closedIssues }) {
    let message = '';

    if (openedIssues) {
        const opened = getIssuesWithState(modifiedIssues, OPENED_ISSUE);
        message = `${buildIssuesNotification(opened, 'opened')}\n`;
    }

    if (closedIssues) {
        const closed = getIssuesWithState(modifiedIssues, CLOSED_ISSUE);
        message = `${message}${buildIssuesNotification(closed, 'closed')}`;
    }

    return message;
}

function getIssuesWithState(modifiedIssues, state) {
    const issues = {};

    Object.keys(modifiedIssues).forEach((repository) => {
        issues[repository] = [];
        modifiedIssues[repository].forEach((issue) => {
            if (issue.state === state) {
                issues[repository].push(issue);
            }
        });
    });

    return issues;
}

function buildIssuesNotification(issues, state) {
    let notification = `Newly ${state} issues:`;

    Object.keys(issues).forEach((repository) => {
        const repositoryIssues = issues[repository];

        if (repositoryIssues.length !== 0) {
            notification = `${notification}\nRepository ${repository}:`;
            repositoryIssues.forEach((issue) => {
                notification = `${notification}\n${JSON.stringify(issue, null, 2)}`;
            });
        }
    });

    return notification;
}
