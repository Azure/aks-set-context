import {spawn} from 'child_process'
import fs from 'fs'
import os from 'os'
import path from 'path'

// -- Helpers ------------------------------------------------------------------

const bundlePath = path.resolve('lib/index.js')
if (!fs.existsSync(bundlePath)) {
   console.error(`Missing bundle at ${bundlePath}. Run the build first.`)
   process.exit(1)
}

// Create a fresh temp directory with a bin/ subdirectory for CLI stubs.
function createTempDir() {
   const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aks-set-context-'))
   const binDir = path.join(tempDir, 'bin')
   fs.mkdirSync(binDir, {recursive: true})
   return {tempDir, binDir}
}

// Write a fake `az` script that logs its arguments and exits with the given code.
// When exitCode is 0 it also creates the kubeconfig file referenced by -f so
// the action doesn't fail when it checks for its existence.
function writeAzStub(binDir, logPath, exitCode) {
   const script = `#!/usr/bin/env bash
set -euo pipefail
echo "$@" > "${logPath}"
if [ ${exitCode} -ne 0 ]; then exit ${exitCode}; fi
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
   const azPath = path.join(binDir, 'az')
   fs.writeFileSync(azPath, script, {mode: 0o755})
   fs.chmodSync(azPath, 0o755)
}

// Build the environment the action expects at runtime.
// `inputs` is a map of action input names (e.g. 'RESOURCE-GROUP') to values.
function buildEnv(binDir, tempDir, inputs) {
   const env = {
      ...process.env,
      RUNNER_TEMP: tempDir,
      PATH: `${binDir}:${process.env.PATH || ''}`
   }
   for (const [key, value] of Object.entries(inputs)) {
      env[`INPUT_${key}`] = value
   }
   return env
}

// Spawn the bundled action and return its exit code.
function runBundle(env) {
   return new Promise((resolve) => {
      const child = spawn(process.execPath, [bundlePath], {
         env,
         stdio: 'pipe' // suppress output from individual cases
      })
      child.on('exit', (code) => resolve(code))
   })
}

// Assert that `tokens` contains the `expected` values as an ordered subsequence.
function assertArgsSubsequence(tokens, expected) {
   let cursor = 0
   for (const token of tokens) {
      if (token === expected[cursor]) cursor += 1
      if (cursor === expected.length) break
   }
   if (cursor !== expected.length) {
      throw new Error(
         `Expected args subsequence ${JSON.stringify(expected)}, got: ${tokens.join(' ')}`
      )
   }
}

// -- Test cases ---------------------------------------------------------------

const cases = [
   {
      name: 'basic success',
      inputs: {'RESOURCE-GROUP': 'sample-rg', 'CLUSTER-NAME': 'sample-cluster'},
      azExitCode: 0,
      expectSuccess: true,
      expectedArgs: [
         'aks',
         'get-credentials',
         '--resource-group',
         'sample-rg',
         '--name',
         'sample-cluster',
         '-f'
      ]
   },
   {
      name: 'missing required input (cluster-name)',
      inputs: {'RESOURCE-GROUP': 'sample-rg'},
      azExitCode: 0,
      expectSuccess: false
   },
   {
      name: 'az exits non-zero',
      inputs: {'RESOURCE-GROUP': 'sample-rg', 'CLUSTER-NAME': 'sample-cluster'},
      azExitCode: 1,
      expectSuccess: false
   }
]

// -- Runner -------------------------------------------------------------------

let passed = 0
let failed = 0

for (const tc of cases) {
   const {tempDir, binDir} = createTempDir()
   const logPath = path.join(tempDir, 'az.log')

   writeAzStub(binDir, logPath, tc.azExitCode)

   const env = buildEnv(binDir, tempDir, tc.inputs)
   const exitCode = await runBundle(env)

   try {
      if (tc.expectSuccess) {
         if (exitCode !== 0) {
            throw new Error(`Expected exit 0, got ${exitCode}`)
         }

         if (!fs.existsSync(logPath)) {
            throw new Error('Expected az to be invoked, but no log was written')
         }

         const tokens = fs
            .readFileSync(logPath, 'utf8')
            .trim()
            .split(' ')
            .filter(Boolean)

         if (tc.expectedArgs) {
            assertArgsSubsequence(tokens, tc.expectedArgs)
         }

         // Verify kubeconfig path lives inside the temp directory
         const kubeconfigIndex = tokens.indexOf('-f')
         const kubeconfigPath = tokens[kubeconfigIndex + 1]
         if (!kubeconfigPath || !kubeconfigPath.startsWith(tempDir)) {
            throw new Error(
               `Expected kubeconfig in ${tempDir}, got: ${kubeconfigPath || 'missing'}`
            )
         }
      } else {
         if (exitCode === 0) {
            throw new Error('Expected non-zero exit code, got 0')
         }
      }

      console.log(`  PASS  ${tc.name}`)
      passed += 1
      // Clean up on success
      fs.rmSync(tempDir, {recursive: true, force: true})
   } catch (err) {
      console.error(`  FAIL  ${tc.name}: ${err.message}`)
      console.error(`        temp dir preserved at ${tempDir}`)
      failed += 1
   }
}

// -- Summary ------------------------------------------------------------------

console.log(`\n${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
