import * as core from "@actions/core";
import * as path from "path";
import * as fs from "fs";
import {
  WebRequest,
  WebResponse,
  sendRequest,
} from "@azure-actions/utilities/lib/http";
import { getAzureAccessToken } from "@azure-actions/auth";

export async function run() {
  // get inputs
  const creds = core.getInput("creds", { required: true });
  let credsObject: { [key: string]: string };
  try {
    credsObject = JSON.parse(creds);
  } catch (ex) {
    throw new Error("Credentials object is not a valid JSON: " + ex);
  }
  const subscriptionId =
    core.getInput("subscription-id") || credsObject["subscriptionId"];
  const resourceGroupName = core.getInput("resource-group", { required: true });
  const clusterName = core.getInput("cluster-name", { required: true });

  // get kubeconfig
  core.debug("Getting kubeconfig");
  const kubeconfig = await getKubeconfig(
    credsObject,
    subscriptionId,
    resourceGroupName,
    clusterName
  );

  // create file
  const runnerTempDirectory = process.env["RUNNER_TEMP"]; // use process.env until the core libs are updated
  const kubeconfigPath = path.join(
    runnerTempDirectory,
    `kubeconfig_${Date.now()}`
  );
  core.debug(`Writing kubeconfig to ${kubeconfigPath}`);
  fs.writeFileSync(kubeconfigPath, kubeconfig);
  fs.chmodSync(kubeconfigPath, "600");

  // export
  core.exportVariable("KUBECONFIG", kubeconfigPath);
  core.debug("KUBECONFIG environment variable is set");
}

export async function getKubeconfig(
  creds: {
    [key: string]: string;
  },
  subscriptionId: string,
  resourceGroupName: string,
  clusterName: string
): Promise<string> {
  const managementEndpointUrl =
    creds["resourceManagerEndpointUrl"] || "https://management.azure.com/";
  const azureSessionToken = await getAzureAccessToken(JSON.stringify(creds));

  return await getAksKubeconfig(
    azureSessionToken,
    subscriptionId,
    managementEndpointUrl,
    resourceGroupName,
    clusterName
  );
}

export function getAksKubeconfig(
  azureSessionToken: string,
  subscriptionId: string,
  managementEndpointUrl: string,
  resourceGroupName: string,
  clusterName: string
): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const webRequest = new WebRequest();
    webRequest.method = "GET";
    webRequest.uri = `${managementEndpointUrl}/subscriptions/${subscriptionId}/resourceGroups/${resourceGroupName}/providers/Microsoft.ContainerService/managedClusters/${clusterName}/accessProfiles/clusterAdmin?api-version=2017-08-31`;
    webRequest.headers = {
      Authorization: "Bearer " + azureSessionToken,
      "Content-Type": "application/json; charset=utf-8",
    };

    sendRequest(webRequest)
      .then((response: WebResponse) => {
        const accessProfile = response.body;
        if (accessProfile?.properties?.kubeConfig) {
          const kubeconfig = Buffer.from(
            accessProfile.properties.kubeConfig,
            "base64"
          );
          resolve(kubeconfig.toString());
        } else {
          reject(JSON.stringify(response.body));
        }
      })
      .catch(reject);
  });
}

run().catch(core.setFailed);
