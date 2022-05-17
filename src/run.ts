import * as core from "@actions/core";
import * as io from "@actions/io";
import * as exec from "@actions/exec";
import * as path from "path";
import * as fs from "fs";

const AZ_TOOL_NAME = "az";
const KUBELOGIN_TOOL_NAME = "kubelogin";

export async function run() {
  // get inputs
  const resourceGroupName = core.getInput("resource-group", { required: true });
  const clusterName = core.getInput("cluster-name", { required: true });
  const subscription = core.getInput("subscription") || "";
  const adminInput = core.getInput("admin") || "";
  const admin = adminInput.toLowerCase() === "true";

  // check az tools
  const azPath = await io.which(AZ_TOOL_NAME, false);
  if (!azPath)
    throw Error(
      "Az cli tools not installed. You must install them before running this action."
    );

  // get kubeconfig
  const runnerTempDirectory = process.env["RUNNER_TEMP"]; // use process.env until the core libs are updated
  const kubeconfigPath = path.join(
    runnerTempDirectory,
    `kubeconfig_${Date.now()}`
  );
  core.debug(`Writing kubeconfig to ${kubeconfigPath}`);
  const cmd = [
    "aks",
    "get-credentials",
    "--resource-group",
    resourceGroupName,
    "--name",
    clusterName,
    "-f",
    kubeconfigPath,
  ];
  if (subscription) cmd.push("--subscription", subscription);
  if (admin) cmd.push("--admin");

  const exitCode = await exec.exec(AZ_TOOL_NAME, cmd);
  if (exitCode !== 0) throw Error("az cli exited with error code " + exitCode);

  if (!admin) {
    const nonAdminCmd = [
      "convert-kubeconfig",
      "-l",
      "azurecli",
    ]

    const exitCode2 = await exec.exec(KUBELOGIN_TOOL_NAME, nonAdminCmd);
    if (exitCode2 !== 0) throw Error("kubelogin exited with error code " + exitCode);
  }
 
  fs.chmodSync(kubeconfigPath, "600");

  // export variable
  core.exportVariable("KUBECONFIG", kubeconfigPath);
  core.debug("KUBECONFIG environment variable set");
}

run().catch(core.setFailed);
