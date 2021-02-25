import * as core from '@actions/core';
import * as path from 'path';
import * as fs from 'fs';
import { WebRequest, WebResponse, sendRequest } from "@azure-actions/utilities/lib/http";
import { getAzureAccessToken } from '@azure-actions/auth';

function getAKSKubeconfig(azureSessionToken: string, subscriptionId: string, managementEndpointUrl: string): Promise<string> {
    let resourceGroupName = core.getInput('resource-group', { required: true });
    let clusterName = core.getInput('cluster-name', { required: true });
    return new Promise<string>((resolve, reject) => {
        var webRequest = new WebRequest();
        webRequest.method = 'GET';
        webRequest.uri = `${managementEndpointUrl}/subscriptions/${subscriptionId}/resourceGroups/${resourceGroupName}/providers/Microsoft.ContainerService/managedClusters/${clusterName}/accessProfiles/clusterAdmin?api-version=2017-08-31`;
        webRequest.headers = {
            'Authorization': 'Bearer ' + azureSessionToken,
            'Content-Type': 'application/json; charset=utf-8'
        }
        sendRequest(webRequest).then((response: WebResponse) => {
            let accessProfile = response.body;
            if (accessProfile.properties && accessProfile.properties.kubeConfig) {
                var kubeconfig = Buffer.from(accessProfile.properties.kubeConfig, 'base64');
                resolve(kubeconfig.toString());
            } else {
                reject(JSON.stringify(response.body));
            }
        }).catch(reject);
    });
}

async function getKubeconfig(): Promise<string> {
    let creds = core.getInput('creds', { required: true });
    let credsObject: { [key: string]: string; };
    try {
        credsObject = JSON.parse(creds);
    } catch (ex) {
        throw new Error('Credentials object is not a valid JSON');
    }

    let managementEndpointUrl = credsObject["resourceManagerEndpointUrl"] || "https://management.azure.com/";
    let subscriptionId = credsObject["subscriptionId"];
    let azureSessionToken = await getAzureAccessToken(creds);
    let kubeconfig = await getAKSKubeconfig(azureSessionToken, subscriptionId, managementEndpointUrl);
    return kubeconfig;
}

async function run() {
    let kubeconfig = await getKubeconfig();
    const runnerTempDirectory = process.env['RUNNER_TEMP']; // Using process.env until the core libs are updated
    const kubeconfigPath = path.join(runnerTempDirectory, `kubeconfig_${Date.now()}`);
    core.debug(`Writing kubeconfig contents to ${kubeconfigPath}`);
    fs.writeFileSync(kubeconfigPath, kubeconfig);
    fs.chmodSync(kubeconfigPath, '600');
    core.exportVariable('KUBECONFIG', kubeconfigPath);
    console.log('KUBECONFIG environment variable is set');
}

run().catch(core.setFailed);