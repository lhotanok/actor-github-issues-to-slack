exports.getGithubIssuesRequests = (repositories) => {
    return repositories.map((repository) => ({
        url: `https://api.github.com/repos/${repository}/issues`,
        userData: { repository },
    }));
};
