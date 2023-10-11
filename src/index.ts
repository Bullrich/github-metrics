import { getOctokit } from "@actions/github";
import { GitHubApi } from "./github/api";

console.log("Hello via Bun!");

const token = process.env.TOKEN;

if (!token) {
    throw new Error("Missing GITHUB TOKEN");
}

const instance = getOctokit(token);

const client = new GitHubApi(instance, { org: "polkadot-fellows", repo: "runtimes" });

const total = await client.fetchCount();
console.log("Total amount", total);

const issue = await client.downloadIssues();
