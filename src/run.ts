import * as core from '@actions/core'
import * as github from '@actions/github'
import * as utils from './utils'
import * as handler from './handler'
import axios, { isAxiosError } from 'axios'

async function validateSubscription(): Promise<void> {
  const API_URL = `https://agent.api.stepsecurity.io/v1/github/${process.env.GITHUB_REPOSITORY}/actions/subscription`

  try {
    await axios.get(API_URL, { timeout: 3000 })
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 403) {
      core.error(
        'Subscription is not valid. Reach out to support@stepsecurity.io'
      )
      process.exit(1)
    } else {
      core.info('Timeout or API not reachable. Continuing to next step.')
    }
  }
}

export async function run() {
  try {
    await validateSubscription()
    const token = core.getInput('repo-token', { required: true })
    const configPath = core.getInput('configuration-path', {
      required: true,
    })

    const client = github.getOctokit(token)
    const { repo, sha } = github.context
    const config = await utils.fetchConfigurationFile(client, {
      owner: repo.owner,
      repo: repo.repo,
      path: configPath,
      ref: sha,
    })

    await handler.handlePullRequest(client, github.context, config)
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message)
    }
  }
}
