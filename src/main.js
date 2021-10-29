const Apify = require('apify');
const { handlGithubIssues } = require('./routes');
const { getGithubIssuesUrls } = require('./tools');

const { utils: { log } } = Apify;

Apify.main(async () => {
    const { repositories, token, channel, proxyConfiguration } = await Apify.getInput();

    const issuesUrls = getGithubIssuesUrls(repositories);
    const requestList = await Apify.openRequestList('github-issues-urls', issuesUrls);

    const proxyConfig = {};
    if (proxyConfiguration && (proxyConfiguration.useApifyProxy || proxyConfiguration.proxyUrls)) {
        // createProxyConfiguration forces proxy usage no matter the input settings
        proxyConfig.proxyConfiguration = await Apify.createProxyConfiguration(proxyConfiguration);
    }

    const crawler = new Apify.CheerioCrawler({
        requestList,
        ...proxyConfig,
        maxConcurrency: 50,
        handlePageFunction: async (context) => {
            const { url } = context.request;
            log.info('Page opened.', { url });
            handlGithubIssues(context);
        },
    });

    log.info('Starting the Github issues crawl.');
    await crawler.run();
    log.info('Crawl finished.');
});
