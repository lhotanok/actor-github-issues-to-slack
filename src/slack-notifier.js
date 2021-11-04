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

    // await actorClient.call(slackActorInput);

    log.info(`Slack notification:
    ${JSON.stringify(slackActorInput, null, 2)}`);
};

function buildNotificationBlocks(modifiedIssues, { openedIssues, closedIssues }) {
    const blocks = [];
    log.info(`OPENED ISSUES: ${openedIssues}, CLOSED ISSUES: ${closedIssues}`);

    blocks.push(buildHeaderBlock('Updated issues'));

    if (openedIssues !== false) {
        appendIssues(blocks, modifiedIssues, OPENED_ISSUE);
    }

    if (closedIssues !== false) {
        appendIssues(blocks, modifiedIssues, CLOSED_ISSUE);
    }

    return blocks;
}

function getIssuesWithMatchingState(modifiedIssues, state) {
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

function appendDividerBlock(blocks) {
    if (blocks.length !== 0) {
        blocks.push(buildDividerBlock());
    }
}

function appendIssues(blocks, issues, state) {
    const stateIssues = getIssuesWithMatchingState(issues, state);
    const issueBlocks = buildIssueNotificationBlocks(stateIssues);

    issueBlocks.forEach((issueBlock) => {
        appendDividerBlock(blocks);
        blocks.push(issueBlock);
    });
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

function buildDividerBlock() {
    return { type: 'divider' };
}

function buildIssueNotificationBlocks(issues) {
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

function buildIssueNotificationBlock(issue) {
    const { title, url, state, labels, author, assignee } = issue;

    const stateEmoji = state === OPENED_ISSUE ? '🆕' : '✅';

    return {
        type: 'section',
        text: {
            type: 'mrkdwn',
            text: `*${title}* ${stateEmoji}`,
        },
        fields: [
            {
                type: 'mrkdwn',
                text: `*Url*: ${url}`,
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
                text: `*Assignee*: ${assignee}`,
            },
        ],
    };
}
