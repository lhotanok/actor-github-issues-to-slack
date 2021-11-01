const Apify = require('apify');
const { handleGithubIssues } = require('./routes');
const { getGithubIssuesRequests, getModifiedIssues } = require('./tools');
const { ISSUES_STATE } = require('./constants');

const { utils: { log } } = Apify;

Apify.main(async () => {
    const { repositories, token, channel, proxyConfiguration } = await Apify.getInput();

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

    log.info(`Scraped ${issuesState.length} Github issues in total.`);
    await Apify.setValue(ISSUES_STATE, issuesState);

    await getModifiedIssues();
});
