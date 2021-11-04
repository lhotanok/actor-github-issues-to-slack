# GitHub Issues to Slack

This is an [Apify actor](https://apify.com/actors) designed for GitHub issues monitoring. It scrapes all issues from the specified GitHub repositories, saves them into actor's [key-value store](https://sdk.apify.com/docs/api/key-value-store) under the `ISSUES_STATE` value and then uses this value to extract only those issues that were modified from the previous run. The actor currently tracks changes of issue's state so it recognizes newly opened / closed / re-opened issues. You can customize it to monitor only opened / closed issues through `excludeClosesIssues` / `excludeOpenedIssues` input properties. If the actor discovers any modified issues, it sends a message to Slack by calling the [Slack Message Generator](https://apify.com/katerinahronik/slack-message) actor. It is sufficient to create a [scheduled task](#scheduling) for the actor's run to trigger it periodically and keep your Slack channel updated.

Note that when you run the actor for the first time it will only fetch the issues and won't send any notification as all issues would be considered updated at this point. For each of the next runs it uses the issues' state from the last [SUCCEEDED run](https://docs.apify.com/actors/running#lifecycle) to compare what issues has changed.

## Slack notification format

### Opened issue

🆕 **Testing opened issue**
**Url**: https://github.com/lhotanok/actor-github-issues-to-slack/issues/4

**Labels**: ["documentation","good first issue"]

**Author**: lhotanok

**Assignee**: lhotanok

### Closed issue

✅ **Testing closed issue**
**Url**: https://github.com/lhotanok/actor-github-issues-to-slack/issues/5

**Labels**: ["documentation"]

**Author**: lhotanok

**Assignee**: null

## Input

### GitHub integration

- `repositories` - specify the list of repositories you want to monitor in **username/repository** format
- `excludeOpenedIssues` - check this option if you don't want to keep track of opened issues
- `excludeClosesIssues` - check this option if you don't want to keep track of closed issues

### Slack integration

- `token` - provide your Slack API token
- `channel` - fill in the Slack channel you want to use for sending notifications (use **#channel** format)
- `separateNotification` - you can either send 1 Slack notification per 1 modified issue (by setting this value on `true`) or you can merge all modified issues into 1 notification

## Scheduling

To report the state of the issues regularly you can use the [Apify scheduler](https://my.apify.com/schedules). Feel free to set up any interval in the scheduler but the shortest interval should be about 1 hour so the GitHub and Slack APIs don't get overloaded.
