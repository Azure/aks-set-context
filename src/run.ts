import * as core from "@actions/core";
import * as io from "@actions/io";
import * as exec from "@actions/exec";
import * as path from "path";
import * as fs from "fs";

const AZ_TOOL_NAME = "az";

export async function run() {
  // get inputs
  const resourceGroupName = core.getInput("resource-group", { required: true });
  const clusterName = core.getInput("cluster-name", { required: true });

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
  const exitCode = await exec.exec(AZ_TOOL_NAME, [
    "aks",
    "get-credentials",
    "--resource-group",
    resourceGroupName,
    "--name",
    clusterName,
    "-f",
    kubeconfigPath,
  ]);
  if (exitCode !== 0) throw Error("Az cli exited with error code " + exitCode);
  fs.chmodSync(kubeconfigPath, "600");

  // export variable
  core.exportVariable("KUBECONFIG", kubeconfigPath);
  core.debug("KUBECONFIG environment variable set");
}

run().catch(core.setFailed);
