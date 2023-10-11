import { context, getOctokit } from "@actions/github";
import { GitHubApi } from "./github/api";
import { getInput, summary } from "@actions/core";

console.log("Hello via Bun!");


const token = getInput("TOKEN", { required: true });

const getRepo = () => {
    let repo = getInput("repo", { required: false });
    if (!repo) {
        repo = context.repo.repo;
    }

    let owner = getInput("owner", { required: false });
    if (!owner) {
        owner = context.repo.owner;
    }

    return { repo, owner };
};

const repo = getRepo();

const instance = getOctokit(token);

const client = new GitHubApi(instance, { org: repo.owner, repo: repo.repo });

const total = await client.fetchCount();
console.log("Total amount", total);

const report = await client.downloadIssues();

summary
    .addHeading(`Metrics report for ${repo.owner}/${repo.repo}`)
    .addHeading("Issues", 3)
    .addTable([
        ["Total", report.issues.total.toString()],
        ["Open", report.issues.open.toString()],
        ["Closed", report.issues.closed.toString()],
    ]).addRaw(`Average duration: ${report.issues.duration}`)
    .addEOL()
    .addHeading("Pull Requests", 3)
    .addTable([
        ["Total", report.prs.total.toString()],
        ["Open", report.prs.open.toString()],
        ["Closed", report.prs.closed.toString()],
    ]).addRaw(`Average duration: ${report.prs.duration}`)
    .write();
