const Apify = require('apify');
const { SLACK_ACTOR_ID, OPENED_ISSUE, CLOSED_ISSUE } = require('./constants');

const { utils: { log } } = Apify;

exports.sendModifiedIssuesNotification = async (modifiedIssues, { channel, token }, { openedIssues, closedIssues }) => {
    const text = 'Github issues tracker';
    const blocks = buildNotificationBlocks(modifiedIssues, { openedIssues, closedIssues });

    const slackActorInput = {
        token,
        channel,
        text,
        blocks,
    };

    const apifyClient = Apify.newClient({ token: process.env.APIFY_TOKEN });
    const actorClient = apifyClient.actor(SLACK_ACTOR_ID);

    const run = await actorClient.call(slackActorInput);

    log.info(`Slack notification:
    ${JSON.stringify(slackActorInput, null, 2)}`);
};

function buildNotificationBlocks(modifiedIssues, { openedIssues, closedIssues }) {
    const blocks = [];
    log.info(`OPENED ISSUES: ${openedIssues}, CLOSED ISSUES: ${closedIssues}`);

    if (openedIssues !== false) {
        const opened = getIssuesWithState(modifiedIssues, OPENED_ISSUE);
        blocks.push(buildHeaderBlock(`Newly opened issues:`));
        blocks.push(...buildIssuesNotificationBlocks(opened));
    }

    if (closedIssues !== false) {
        const closed = getIssuesWithState(modifiedIssues, CLOSED_ISSUE);

        if (blocks.length !== 0) {
            blocks.push({ type: 'divider' });
        }

        blocks.push(buildHeaderBlock(`Newly closed issues:`));
        blocks.push(...buildIssuesNotificationBlocks(closed));
    }

    return blocks;
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

function buildHeaderBlock(text) {
    return {
        type: 'header',
        text: {
            type: 'plain_text',
            text,
        },
    };
}

function buildIssuesNotificationBlocks(issues) {
    const notificationBlocks = [];

    Object.keys(issues).forEach((repository) => {
        const repositoryIssues = issues[repository];

        if (repositoryIssues.length !== 0) {
            repositoryIssues.forEach((issue) => {
                const notificationBlock = buildIssueNotificationBlock(issue, repository);
                notificationBlocks.push(notificationBlock);
            });
        }
    });

    return notificationBlocks;
}

function buildIssueNotificationBlock(issue, repository) {
    const { title, state, labels, author, createdAt, updatedAt, assignee, comments, url } = issue;

    return {
        type: 'section',
        text: {
            type: 'mrkdwn',
            text: `*${title}*`,
        },
        fields: [
            {
                type: 'mrkdwn',
                text: `*Repository*: ${repository}`,
            },
            {
                type: 'mrkdwn',
                text: `*State*: ${state}`,
            },
            {
                type: 'mrkdwn',
                text: `*Labels*: ${JSON.stringify(labels)}`,
            },
            {
                type: 'mrkdwn',
                text: `*Author*: ${author}`,
            },
            {
                type: 'mrkdwn',
                text: `*Created at*: ${createdAt}`,
            },
            {
                type: 'mrkdwn',
                text: `*Updated at*: ${updatedAt}`,
            },
            {
                type: 'mrkdwn',
                text: `*Assignee*: ${assignee}`,
            },
            {
                type: 'mrkdwn',
                text: `*Comments*: ${comments}`,
            },
            {
                type: 'mrkdwn',
                text: `*Url*: ${url}`,
            },
        ],
    };
}
