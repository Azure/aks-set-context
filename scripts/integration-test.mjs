import {spawn} from 'child_process'
import fs from 'fs'
import os from 'os'
import path from 'path'

function fail(message) {
   console.error(message)
   process.exit(1)
}

const bundlePath = path.resolve('lib/index.js')
if (!fs.existsSync(bundlePath)) {
   fail(`Missing bundle at ${bundlePath}. Run the build first.`)
}

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aks-set-context-'))
const binDir = path.join(tempDir, 'bin')
fs.mkdirSync(binDir, {recursive: true})

const logPath = path.join(tempDir, 'az.log')
const azPath = path.join(binDir, 'az')
const azScript = `#!/usr/bin/env bash
set -euo pipefail
echo "$@" > "${logPath}"
args=("$@")
for ((i=0; i<\${#args[@]}; i++)); do
  if [[ "\${args[$i]}" == "-f" ]]; then
    kubeconfig_path="\${args[$i+1]}"
    if [[ -n "\${kubeconfig_path:-}" ]]; then
      mkdir -p "$(dirname "\${kubeconfig_path}")"
      touch "\${kubeconfig_path}"
    fi
    break
  fi
done
exit 0
`

fs.writeFileSync(azPath, azScript, {mode: 0o755})
fs.chmodSync(azPath, 0o755)

const resourceGroup = 'sample-rg'
const clusterName = 'sample-cluster'

const env = {
   ...process.env,
   RUNNER_TEMP: tempDir,
   PATH: `${binDir}:${process.env.PATH || ''}`,
   'INPUT_RESOURCE-GROUP': resourceGroup,
   'INPUT_CLUSTER-NAME': clusterName
}

const child = spawn(process.execPath, [bundlePath], {
   env,
   stdio: 'inherit'
})

const exitCode = await new Promise((resolve) => {
   child.on('exit', resolve)
})

if (exitCode !== 0) {
   fail(`Bundle execution failed with exit code ${exitCode}`)
}

if (!fs.existsSync(logPath)) {
   fail('Expected az to be invoked, but no log was written.')
}

const logged = fs.readFileSync(logPath, 'utf8').trim()
const tokens = logged.split(' ').filter(Boolean)
const requiredSequence = [
   'aks',
   'get-credentials',
   '--resource-group',
   resourceGroup,
   '--name',
   clusterName,
   '-f'
]

let cursor = 0
for (const token of tokens) {
   if (token === requiredSequence[cursor]) cursor += 1
   if (cursor === requiredSequence.length) break
}

if (cursor !== requiredSequence.length) {
   fail(`az invocation did not include expected args. Got: ${logged}`)
}

const kubeconfigIndex = tokens.indexOf('-f')
const kubeconfigPath = tokens[kubeconfigIndex + 1]
if (!kubeconfigPath || !kubeconfigPath.startsWith(tempDir)) {
   fail(
      `Expected kubeconfig path in ${tempDir}, got: ${kubeconfigPath || 'missing'}`
   )
}

console.log('Integration test passed.')
