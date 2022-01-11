import * as core from '@actions/core';
import * as path from 'path';
import * as fs from 'fs';
import { WebRequest, WebResponse, sendRequest } from "@azure-actions/utilities/lib/http";
import { getAzureAccessToken } from '@azure-actions/auth';

export function getAKSKubeconfig(azureSessionToken: string, subscriptionId: string, managementEndpointUrl: string): Promise<string> {
    const resourceGroupName = core.getInput('resource-group', { required: true });
    const clusterName = core.getInput('cluster-name', { required: true });
    return new Promise<string>((resolve, reject) => {
        var webRequest = new WebRequest();
        webRequest.method = 'GET';
        webRequest.uri = `${managementEndpointUrl}/subscriptions/${subscriptionId}/resourceGroups/${resourceGroupName}/providers/Microsoft.ContainerService/managedClusters/${clusterName}/accessProfiles/clusterAdmin?api-version=2017-08-31`;
        webRequest.headers = {
            'Authorization': 'Bearer ' + azureSessionToken,
            'Content-Type': 'application/json; charset=utf-8'
        }
        sendRequest(webRequest).then((response: WebResponse) => {
            const accessProfile = response.body;
            if (accessProfile.properties && accessProfile.properties.kubeConfig) {
                var kubeconfig = Buffer.from(accessProfile.properties.kubeConfig, 'base64');
                resolve(kubeconfig.toString());
            } else {
                reject(JSON.stringify(response.body));
            }
        }).catch(reject);
    });
}

export async function getKubeconfig(): Promise<string> {
    const creds = core.getInput('creds', { required: true });
    let credsObject: { [key: string]: string; };
    try {
        credsObject = JSON.parse(creds);
    } catch (ex) {
        throw new Error('Credentials object is not a valid JSON');
    }

    const managementEndpointUrl = credsObject["resourceManagerEndpointUrl"] || "https://management.azure.com/";
    const subscriptionId = core.getInput('subscription-id') || credsObject["subscriptionId"];
    const azureSessionToken = await getAzureAccessToken(creds);
    const kubeconfig = await getAKSKubeconfig(azureSessionToken, subscriptionId, managementEndpointUrl);
    return kubeconfig;
}

export async function run() {
    const kubeconfig = await getKubeconfig();
    const runnerTempDirectory = process.env['RUNNER_TEMP']; // Using process.env until the core libs are updated
    const kubeconfigPath = path.join(runnerTempDirectory, `kubeconfig_${Date.now()}`);
    core.debug(`Writing kubeconfig contents to ${kubeconfigPath}`);
    fs.writeFileSync(kubeconfigPath, kubeconfig);
    fs.chmodSync(kubeconfigPath, '600');
    core.exportVariable('KUBECONFIG', kubeconfigPath);
    core.debug('KUBECONFIG environment variable is set');
}

run().catch(core.setFailed);