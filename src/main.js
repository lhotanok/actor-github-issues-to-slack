const Apify = require('apify');
const { handleGithubIssues } = require('./issues-scraper');
const { sendModifiedIssuesNotification } = require('./slack-notifier');
const { getGithubIssuesRequests, getModifiedIssues } = require('./tools');
const { ISSUES_STATE } = require('./constants');

const { utils: { log } } = Apify;

Apify.main(async () => {
    const input = await Apify.getInput();
    const { repositories, token, proxyConfiguration, openedIssues, closedIssues } = input;

    // handle missing '#' at the beginning of channel name
    const channel = input.channel[0] === '#' ? input.channel : `#${input.channel}`;

    const issuesState = await Apify.getValue(ISSUES_STATE) || {};
    Apify.events.on('persistState', async () => Apify.setValue(ISSUES_STATE, issuesState));

    const issuesRequests = getGithubIssuesRequests(repositories);
    const requestQueue = await Apify.openRequestQueue();
    for (const request of issuesRequests) {
        await requestQueue.addRequest(request);
    }

    const proxyConfig = {};
    if (proxyConfiguration && (proxyConfiguration.useApifyProxy || proxyConfiguration.proxyUrls)) {
        // createProxyConfiguration forces proxy usage no matter the input settings
        proxyConfig.proxyConfiguration = await Apify.createProxyConfiguration(proxyConfiguration);
    }

    const crawler = new Apify.CheerioCrawler({
        requestQueue,
        ...proxyConfig,
        maxConcurrency: 50,
        handlePageFunction: async (context) => {
            const { url } = context.request;
            log.info('Page opened.', { url });

            return handleGithubIssues(context, issuesState);
        },
    });

    log.info('Starting the Github issues crawl.');
    await crawler.run();
    log.info('Crawl finished.');

    await Apify.setValue(ISSUES_STATE, issuesState);

    const modifiedIssues = await getModifiedIssues(issuesState);
    const modifiedRepositoriesCount = Object.keys(modifiedIssues).length;
    log.info(`Found repositories with modified issues since previous run: ${modifiedRepositoriesCount}`);

    if (modifiedRepositoriesCount !== 0) {
        await sendModifiedIssuesNotification(modifiedIssues, { channel, token }, { openedIssues, closedIssues });
    }
});
