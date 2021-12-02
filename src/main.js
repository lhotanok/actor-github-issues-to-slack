const Apify = require('apify');
const { scrapeGithubIssues } = require('./issues-scraper');
const { sendModifiedIssuesNotification } = require('./slack-notifier');
const { getGithubIssuesRequests, getModifiedIssues, saveRepositoryUpdates } = require('./tools');
const { REPOSITORIES_STATE, ISSUES_KEY_VALUE_STORE } = require('./constants');

const { utils: { log } } = Apify;

Apify.main(async () => {
    const input = await Apify.getInput();
    const { repositories, token, separateNotification, proxyConfiguration, excludeOpenedIssues, excludeClosedIssues } = input;

    // handle missing '#' at the beginning of channel name
    const channel = input.channel[0] === '#' ? input.channel : `#${input.channel}`;

    let actorIsMigrating = false;
    Apify.events.on('migrating', async () => { actorIsMigrating = true; });

    const repositoriesState = await Apify.getValue(REPOSITORIES_STATE) || {};
    Apify.events.on('persistState', async () => { await Apify.setValue(REPOSITORIES_STATE, repositoriesState); });

    const issuesRequests = getGithubIssuesRequests(repositories);
    const requestQueue = await Apify.openRequestQueue();
    for (const request of issuesRequests) {
        await requestQueue.addRequest(request);
    }

    const proxyConfig = {};
    if (proxyConfiguration && (proxyConfiguration.useApifyProxy || proxyConfiguration.proxyUrls)) {
        proxyConfig.proxyConfiguration = await Apify.createProxyConfiguration(proxyConfiguration);
    }

    const crawler = new Apify.CheerioCrawler({
        requestQueue,
        ...proxyConfig,
        maxConcurrency: 50,
        handlePageFunction: async (context) => {
            const { url } = context.request;
            log.info('Page opened.', { url });

            if (actorIsMigrating) {
                // error needs to be thrown since `scrapeGithubIssues` function is not guaranteed to finish
                //  and some issues might be missed in this run because of that
                throw Error('Actor is migrating. Request will be processed in the next run.');
            }

            await scrapeGithubIssues(context, repositoriesState);
        },
    });

    log.info('Starting Github issues crawl.');
    await crawler.run();
    log.info('Crawl finished.');

    await Apify.setValue(REPOSITORIES_STATE, repositoriesState);

    const issuesStore = await Apify.openKeyValueStore(ISSUES_KEY_VALUE_STORE);
    const previousState = await issuesStore.getValue(REPOSITORIES_STATE);

    if (!previousState) {
        log.info('No previous state of GitHub issues found in global key value store github-issues.');
        log.info('Saving current state without comparing to previous state. No Slack notification will be send.');
    } else {
        const modifiedIssues = getModifiedIssues(repositoriesState, previousState);
        const modifiedRepositoriesCount = Object.keys(modifiedIssues).length;
        log.info(`Found ${modifiedRepositoriesCount} repositories with modified issues since previous run.`);

        if (modifiedRepositoriesCount !== 0) {
            const slackIntegration = { channel, token, separateNotification };
            const restrictions = { excludeOpenedIssues, excludeClosedIssues };
            await sendModifiedIssuesNotification(modifiedIssues, slackIntegration, restrictions);
        }
    }

    await saveRepositoryUpdates(issuesStore, repositoriesState);
    log.info('Saved updated state of monitored GitHub repositories. Will be used for comparison in the next run.');
});
