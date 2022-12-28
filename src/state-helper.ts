import * as core from '@actions/core'

/**
 * Indicates whether the POST action is running
 */
export const IsPost = !!core.getState('isPost')

/**
 * The kube config path for the POST action. The value is empty during the MAIN action.
 */
export const KubeConfigPath = core.getState('kubeConfigPath')

/**
 * Save the repository path so the POST action can retrieve the value.
 */
export function setKubeConfigPath(kubeConfigPath: string) {
   core.saveState('kubeConfigPath', kubeConfigPath)
}

// Publish a variable so that when the POST action runs, it can determine it should run the cleanup logic.
// This is necessary since we don't have a separate entry point.
if (!IsPost) {
   core.saveState('isPost', 'true')
}
