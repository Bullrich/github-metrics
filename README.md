# github-metrics

To install dependencies:

```bash
bun install
```

To run:

```bash
bun run index.ts
```

This project was created using `bun init` in bun v0.5.9. [Bun](https://bun.sh) is a fast all-in-one JavaScript runtime.

## GitHub action

To use, create the file `.github/workflows/metrics.yml` and paste the following:

```yml
name: Get metrics

on:
  workflow_dispatch:
    inputs:
      ORG:
        description: 'Organization'
        required: true
        type: string
      REPO:
        description: 'Repository name'
        required: true
        type: string
  
jobs:
  repository-metrics:
    runs-on: ubuntu-latest
    steps:
      - name: Fetch metrics
        uses: Bullrich/github-metrics@main
        env:
          owner: ${{ inputs.ORG }}
          repo: ${{ inputs.REPO }}
          # You need a personal access token with scope repo
          TOKEN: ${{ secrets.PAT }}
```
