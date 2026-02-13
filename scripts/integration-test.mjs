import {spawn} from 'child_process'
import fs from 'fs'
import os from 'os'
import path from 'path'

function fail(message) {
   console.error(message)
   process.exit(1)
}

// -- 1. Ensure the production bundle exists before running the test --
const bundlePath = path.resolve('lib/index.js')
if (!fs.existsSync(bundlePath)) {
   fail(`Missing bundle at ${bundlePath}. Run the build first.`)
}

// -- 2. Set up a temp directory with a fake `az` CLI --
// We create a stub shell script that stands in for the real Azure CLI.
// When invoked, the stub:
//   a) logs every argument it receives to az.log
//   b) finds the -f <path> (kubeconfig) argument and `touch`es the file
//      so downstream code that expects the file to exist won't fail
//   c) exits 0 (success)
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aks-set-context-'))
const binDir = path.join(tempDir, 'bin')
fs.mkdirSync(binDir, {recursive: true})

const logPath = path.join(tempDir, 'az.log')
const azPath = path.join(binDir, 'az')
const azScript = `#!/usr/bin/env bash
set -euo pipefail          # abort on errors, undefined vars, or pipe failures
echo "$@" > "${logPath}"   # log all received arguments so tests can assert on them
args=("$@")
# scan for the -f flag to find the kubeconfig output path, then create the
# file so the action doesn't fail when it checks for its existence afterward
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

// -- 3. Build the environment the action expects at runtime --
// RUNNER_TEMP  – where the action writes temporary files (GitHub-provided)
// PATH         – prepend our stub dir so the fake `az` is found first
// INPUT_*      – how GitHub Actions passes inputs to action code
const resourceGroup = 'sample-rg'
const clusterName = 'sample-cluster'

const env = {
   ...process.env,
   RUNNER_TEMP: tempDir,
   PATH: `${binDir}:${process.env.PATH || ''}`,
   'INPUT_RESOURCE-GROUP': resourceGroup,
   'INPUT_CLUSTER-NAME': clusterName
}

// -- 4. Run the bundled action in a child process --
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

// -- 5. Verify the stub `az` was actually called --
if (!fs.existsSync(logPath)) {
   fail('Expected az to be invoked, but no log was written.')
}

// -- 6. Assert that az received the correct arguments --
// We do an ordered subsequence match: the required tokens must appear
// in order, but other tokens may appear between them.
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

// -- 7. Verify the kubeconfig path lives inside our temp directory --
const kubeconfigIndex = tokens.indexOf('-f')
const kubeconfigPath = tokens[kubeconfigIndex + 1]
if (!kubeconfigPath || !kubeconfigPath.startsWith(tempDir)) {
   fail(
      `Expected kubeconfig path in ${tempDir}, got: ${kubeconfigPath || 'missing'}`
   )
}

console.log('Integration test passed.')
