import { GitHubClient } from "./types";

type IssueAnalytics = {
    id: number,
    state: boolean,
    comments: number,
    difference: number | null,
    number: number,
    creation: string,
}

const getUserHighscore = (usersMap: Map<string, number>): [string, number] => {
    const userList: [string, number][] = [];
    for (const user of usersMap.keys()) {
        userList.push([user, usersMap.get(user) ?? 0]);
    }

    console.log(userList.sort(([_, aSize], [__, bSize]) => bSize - aSize));
    return userList.sort(([_, aSize], [__, bSize]) => bSize - aSize)[0];
}

type Nullish<T> = T | undefined | null;

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

    getDateDifference(creation: string, closing: Nullish<string>) {
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

        if ((this.issues + this.prs) > 1000) {
            console.log("This will take a minute or two.");
        }


        const data = await this.api.paginate(this.api.rest.issues.listForRepo, { state: "all", owner: this.repo.org, repo: this.repo.repo, });

        for (const issue of data) {
            const analyticData: IssueAnalytics = {
                id: issue.id,
                difference: this.getDateDifference(issue.created_at, issue.closed_at),
                state: issue.state !== "closed",
                comments: issue.comments,
                number: issue.number,
                creation: issue.created_at
            }
            if (issue.pull_request) {
                prAnalytics.push(analyticData);
            } else {
                issuesAnalytics.push(analyticData);
            }
        }

        console.log("Finished fetching issues. Analyzing PRs")

        const prResult: (IssueAnalytics & { size: number, timeToFirstReview: number | null })[] = [];
        const authors: Map<string, number> = new Map<string, number>();
        const reviewers: Map<string, number> = new Map<string, number>();
        for (let i = 0; i < prAnalytics.length; i++) {
            if (i % 10 === 0) {
                console.log(`${i}/${prAnalytics.length - 1}`);
            }
            const pr = prAnalytics[i];
            const repoParams = { owner: this.repo.org, repo: this.repo.repo, pull_number: pr.number };
            const { data } = await this.api.rest.pulls.get(repoParams);
            const size = data.additions + data.deletions;
            if (data.user) {
                const { login } = data.user;
                authors.set(login, (authors.get(login) ?? 0) + 1)
            }

            if (data.review_comments > 0) {
                const reviewsRequest = await this.api.rest.pulls.listReviews(repoParams);
                const reviews = reviewsRequest.data.sort((a, b) => a.id - b?.id);
                const timeToFirstReview = !!reviews[0]?.submitted_at ? this.getDateDifference(pr.creation, reviews[0].submitted_at) : null;
                for (const review of reviews) {
                    if (review.user) {
                        const { login } = review.user;
                        reviewers.set(login, (reviewers.get(login) ?? 0) + 1);
                    }
                }
                prResult.push({ ...pr, timeToFirstReview, size });
            } else {
                prResult.push({ ...pr, timeToFirstReview: null, size });
            }
        }

        const averageIssueLength = issuesAnalytics.reduce((a, issue) => a + (issue.difference ?? 0), 0) / issuesAnalytics.length;

        const issueAverage = {
            total: issuesAnalytics.length,
            open: issuesAnalytics.filter(i => i.state).length,
            closed: issuesAnalytics.filter(i => !i.state).length,
            comments: Math.round(((issuesAnalytics.reduce((a, b) => a + b.comments, 0) / issuesAnalytics.length) * 100)) / 100,
            duration: this.getDurationOfDate(averageIssueLength)
        }

        const averagePrLength = prResult.reduce((a, pr) => a + (pr.difference ?? 0), 0) / prResult.length;
        const averageTimeToFirstReview = prResult.reduce((time, pr) => time + (pr.timeToFirstReview ?? 0), 0) / prResult.length;

        const prAverage = {
            total: prResult.length,
            open: prResult.filter(i => i.state).length,
            closed: prResult.filter(i => !i.state).length,
            comments: Math.round(((prResult.reduce((a, b) => a + b.comments, 0) / prResult.length) * 100)) / 100,
            duration: this.getDurationOfDate(averagePrLength),
            timeToFirstReview: this.getDurationOfDate(averageTimeToFirstReview),
            size: Math.round((prResult.reduce((length, pr) => length + pr.size, 0) / prResult.length * 100)) / 100,
            author: getUserHighscore(authors),
            reviewers: getUserHighscore(reviewers)
        }

        console.log("Finished issue report", issueAverage);
        console.log("Finished PR report", prAverage);

        return { prs: prAverage, issues: issueAverage };
    }
}
