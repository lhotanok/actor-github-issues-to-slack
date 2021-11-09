const Apify = require('apify');
const { SLACK_ACTOR_ID, OPENED_ISSUE, CLOSED_ISSUE } = require('./constants');

const { utils: { log } } = Apify;

exports.sendModifiedIssuesNotification = async (modifiedIssues, slackIntegration, restrictions) => {
    const { channel, token, separateNotification } = slackIntegration;

    const blocks = buildNotificationBlocks(modifiedIssues, restrictions, separateNotification);

    if (blocks.length > 1) {
        // 1 block is always generated for the header
        const text = 'Github issues tracker';

        const slackActorInput = {
            token,
            channel,
            text,
            blocks,
        };

        const apifyClient = Apify.newClient({ token: process.env.APIFY_TOKEN });
        const actorClient = apifyClient.actor(SLACK_ACTOR_ID);

        if (!separateNotification) {
            // await actorClient.call(slackActorInput);

            log.info(`Slack notification:
            ${JSON.stringify(slackActorInput, null, 2)}`);
        } else {
            for (const block of blocks) {
                slackActorInput.blocks = [block];
                // await actorClient.call(slackActorInput);

                log.info(`Slack notification:
                ${JSON.stringify(slackActorInput, null, 2)}`);
            }
        }
    }
};

function buildNotificationBlocks(modifiedIssues, { excludeOpenedIssues, excludeClosedIssues }, separateNotification) {
    const blocks = [];

    if (!separateNotification) {
        blocks.push(buildHeaderBlock('Updated issues'));
    }

    if (!excludeOpenedIssues) {
        appendIssues(blocks, modifiedIssues, OPENED_ISSUE, separateNotification);
    }

    if (!excludeClosedIssues) {
        appendIssues(blocks, modifiedIssues, CLOSED_ISSUE, separateNotification);
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

function appendIssues(blocks, issues, state, separateNotification) {
    const stateIssues = getIssuesWithMatchingState(issues, state);
    const issueBlocks = buildIssueNotificationBlocks(stateIssues);

    issueBlocks.forEach((issueBlock) => {
        if (!separateNotification) {
            appendDividerBlock(blocks);
        }
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
            text: `${stateEmoji} *${title}*`,
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
