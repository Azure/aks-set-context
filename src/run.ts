import * as core from '@actions/core'
import * as io from '@actions/io'
import * as exec from '@actions/exec'
import * as path from 'path'
import * as fs from 'fs'
import {createHash} from 'crypto'

const AZ_TOOL_NAME = 'az'
const KUBELOGIN_TOOL_NAME = 'kubelogin'
const ACTION_NAME = 'Azure/aks-set-context'
const AZ_USER_AGENT_ENV = 'AZURE_HTTP_USER_AGENT'
const AZ_USER_AGENT_ENV_PS = 'AZUREPS_HOST_ENVIRONMENT'

export async function run() {
   const originalAzUserAgent = process.env[AZ_USER_AGENT_ENV] || ''
   const originalAzUserAgentPs = process.env[AZ_USER_AGENT_ENV_PS] || ''

   // use try finally to always unset temp user agent
   try {
      // set az user agent
      core.exportVariable(AZ_USER_AGENT_ENV, getUserAgent(originalAzUserAgent))
      core.exportVariable(
         AZ_USER_AGENT_ENV_PS,
         getUserAgent(originalAzUserAgentPs)
      )

      // get inputs
      const resourceGroupName = core.getInput('resource-group', {
         required: true
      })
      const clusterName = core.getInput('cluster-name', {required: true})
      const subscription = core.getInput('subscription') || ''
      const adminInput = core.getInput('admin') || ''
      const admin = adminInput.toLowerCase() === 'true'
      const useKubeLoginInput = core.getInput('use-kubelogin') || ''
      const useKubeLogin = useKubeLoginInput.toLowerCase() === 'true' && !admin
      const publicFqdnInput = core.getInput('public-fqdn') || ''
      const publicFqdn = publicFqdnInput.toLowerCase() === 'true'
      const fleetName = core.getInput('fleet-name') || ''

      // check az tools
      const azPath = await io.which(AZ_TOOL_NAME, false)
      if (!azPath)
         throw Error(
            'Az cli tools not installed. You must install them before running this action.'
         )

      // get kubeconfig
      const runnerTempDirectory = process.env['RUNNER_TEMP'] // use process.env until the core libs are updated
      const kubeconfigPath = path.join(
         runnerTempDirectory,
         `kubeconfig_${Date.now()}`
      )

      core.debug(`Writing kubeconfig to ${kubeconfigPath}`)

      const cmd = [
            fleetName ? 'fleet':'aks',
            'get-credentials',
            '--resource-group',
            resourceGroupName,
            '--name',
             fleetName? fleetName : clusterName,
            '-f',
            kubeconfigPath
         ]

         if (subscription) cmd.push('--subscription', subscription)
         if (!fleetName) {
            if (admin) cmd.push('--admin')
            if (publicFqdn) cmd.push('--public-fqdn')
         }

      const exitCode = await exec.exec(AZ_TOOL_NAME, cmd)
      if (exitCode !== 0)
         throw Error('az cli exited with error code ' + exitCode)

      fs.chmodSync(kubeconfigPath, '600')

      // export variable
      core.exportVariable('KUBECONFIG', kubeconfigPath)
      core.debug('KUBECONFIG environment variable set')
      core.exportVariable('KUBE_CONFIG_PATH', kubeconfigPath)

      if (useKubeLogin) {
         const kubeloginCmd = ['convert-kubeconfig', '-l', 'azurecli']

         const kubeloginExitCode = await exec.exec(
            KUBELOGIN_TOOL_NAME,
            kubeloginCmd
         )
         if (kubeloginExitCode !== 0)
            throw Error('kubelogin exited with error code ' + exitCode)
      }
   } catch (e) {
      throw e
   } finally {
      core.exportVariable(AZ_USER_AGENT_ENV, originalAzUserAgent)
      core.exportVariable(AZ_USER_AGENT_ENV_PS, originalAzUserAgentPs)
   }
}

function getUserAgent(prevUserAgent: string): string {
   const actionName = process.env.GITHUB_ACTION_REPOSITORY || ACTION_NAME
   const runRepo = process.env.GITHUB_REPOSITORY || ''
   const runRepoHash = createHash('sha256').update(runRepo).digest('hex')
   const runId = process.env.GITHUB_RUN_ID
   const newUserAgent = `GitHubActions/${actionName}(${runRepoHash}; ${runId})`

   if (prevUserAgent) return `${prevUserAgent}+${newUserAgent}`
   return newUserAgent
}
