import { getOctokit } from "@actions/github";
import { GitHubApi } from "./src/github";

console.log("Hello via Bun!");

const token = process.env.TOKEN;

if(!token) {
    throw new Error("Missing GITHUB TOKEN");
}

const instance = getOctokit(token);

const client = new GitHubApi(instance, {org:"paritytech",repo:"polkadot-sdk"});

const total = await client.fetchCount();
console.log("Total amount", total);

const issue = await client.downloadIssues();
