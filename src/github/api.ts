import { GitHubClient } from "./types";

type IssueAnalytics = {
    id: number,
    state: boolean,
    comments: number,
    difference: number | null
}

export class GitHubApi {
    private readonly repository: string;
    private issues: number = 0;
    private prs: number = 0;
    constructor(private readonly api: GitHubClient, private readonly repo: { org: string, repo: string }) {
        this.repository = `${repo.org}/${repo.repo}`;
    }

    async fetchCount() {
        console.log("Searching information for", this.repository)
        const issuesRequest = await this.api.rest.search.issuesAndPullRequests({ q: `repo:${this.repository} is:issue` });
        this.issues = issuesRequest.data.total_count;

        console.log("Found", this.issues, "issues");

        const prsRequest = await this.api.rest.search.issuesAndPullRequests({ q: `repo:${this.repository} is:pr` });
        this.prs = prsRequest.data.total_count;

        console.log("Found", this.prs, "Pull Requests");

        return this.issues + this.prs;
    }

    getDateDifference(creation: string, closing: string | null) {
        if (!closing) {
            return null;
        }

        const difference = new Date(closing) - new Date(creation);
        // const diffDays = Math.ceil(difference / (1000 * 60 * 60 * 24));

        // console.log("Difference in days", diffDays);
        return difference;
    }

    getDurationOfDate(averageLength: number) {
        var diffDays = Math.floor(averageLength / 86_400_000); // days
        var diffHrs = Math.floor((averageLength % 86_400_000) / 3_600_000); // hours
        var diffMins = Math.round(((averageLength % 86_400_000) % 3_600_000) / 60_000);
        const duration = diffDays + " days, " + diffHrs + " hours, " + diffMins + " minutes";

        return duration;
    }

    async downloadIssues() {
        const issuesAnalytics: IssueAnalytics[] = [];
        const prAnalytics: IssueAnalytics[] = [];

        console.log("Searching issues for", this.repository);


        const data = await this.api.paginate(this.api.rest.issues.listForRepo, { state: "all", owner: this.repo.org, repo: this.repo.repo, });

        for (const issue of data) {
            const analyticData: IssueAnalytics = {
                id: issue.id,
                difference: this.getDateDifference(issue.created_at, issue.closed_at),
                state: issue.state !== "closed",
                comments: issue.comments,
            }
            if (issue.pull_request) {
                prAnalytics.push(analyticData);
            } else {
                issuesAnalytics.push(analyticData);
            }
        }


        const averageIssueLength = issuesAnalytics.reduce((a, issue) => a + (issue.difference ?? 0), 0) / issuesAnalytics.length;
        const averagePrLength = prAnalytics.reduce((a, pr) => a + (pr.difference ?? 0), 0) / prAnalytics.length;

        const issueAverage = {
            total: issuesAnalytics.length,
            open: issuesAnalytics.filter(i => i.state).length,
            closed: issuesAnalytics.filter(i => !i.state).length,
            comments: Math.round(((issuesAnalytics.reduce((a, b) => a + b.comments, 0) / issuesAnalytics.length) * 100) / 100),
            duration: this.getDurationOfDate(averageIssueLength)
        }

        const prAverage = {
            total:prAnalytics.length,
            open: prAnalytics.filter(i => i.state).length,
            closed: prAnalytics.filter(i => !i.state).length,
            comments: Math.round(((prAnalytics.reduce((a, b) => a + b.comments, 0) / prAnalytics.length) * 100) / 100),
            duration: this.getDurationOfDate(averagePrLength)
        }

        console.log("Finished issue report", issueAverage);
        console.log("Finished PR report", prAverage);

        return {prs:prAverage, issues:issueAverage};
    }
}
