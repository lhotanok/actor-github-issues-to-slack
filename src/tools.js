exports.getGithubIssuesUrls = (repositories) => {
    return repositories.map((repository) => `https://api.github.com/repos/${repository}/issues`);
};
