import {jest, describe, it, expect, beforeEach} from '@jest/globals'

// Mock the @actions modules before any imports
const mockCore = {
   getInput: jest.fn(),
   exportVariable: jest.fn(),
   debug: jest.fn(),
   setFailed: jest.fn()
}

const mockIo = {
   which: jest.fn()
}

const mockExec = {
   exec: jest.fn()
}

const mockFs = {
   chmodSync: jest.fn()
}

jest.unstable_mockModule('@actions/core', () => mockCore)
jest.unstable_mockModule('@actions/io', () => mockIo)
jest.unstable_mockModule('@actions/exec', () => mockExec)
jest.unstable_mockModule('fs', () => mockFs)

const {run} = await import('./run.js')

const resourceGroup: string = 'sample-rg'
const clusterName: string = 'sample-cluster'
const resourceType: string = 'Microsoft.ContainerService/managedClusters'
const resourceTypeFleet: string = 'Microsoft.ContainerService/fleets'
const resourceTypeMixedCasingFleet: string = 'miCrosOft.contAinerServIce/fleeTs'
const subscription: string = 'subscription-example'
const azPath: string = 'path'
const runnerTemp: string = 'temp'
const date: number = 1644272184664
// GitHub testrunner was timing out so needed to up the timeout limit
const extendedTimeout: number = 30000

describe('Set context', () => {
   beforeEach(() => {
      // Reset all mocks before each test
      jest.clearAllMocks()
   })
   it('throws without resource-group', async () => {
      await expect(run()).rejects.toThrow()
   })

   it(
      'throws without cluster-name',
      async () => {
         mockCore.getInput.mockImplementation((inputName) => {
            if (inputName == 'resource-group') return resourceGroup
            if (inputName == 'cluster-name') return ''
            return ''
         })
         await expect(run()).rejects.toThrow()
      },
      extendedTimeout
   )

   it(
      'throws if resource-type is not recognized',
      async () => {
         mockCore.getInput.mockImplementation((inputName, options) => {
            if (inputName == 'resource-group') return resourceGroup
            if (inputName == 'cluster-name') return clusterName
            if (inputName == 'resource-type') return 'invalid-resource-type'
            return ''
         })
         await expect(run()).rejects.toThrow()
      },
      extendedTimeout
   )

   it(
      'throws without az tools',
      async () => {
         mockCore.getInput.mockImplementation((inputName) => {
            if (inputName == 'resource-group') return resourceGroup
            if (inputName == 'cluster-name') return clusterName
         })
         await expect(run()).rejects.toThrow()
      },
      extendedTimeout
   )

   it('gets the kubeconfig and sets the context', async () => {
      mockCore.getInput.mockImplementation((inputName) => {
         if (inputName == 'resource-group') return resourceGroup
         if (inputName == 'cluster-name') return clusterName
      })
      mockIo.which.mockImplementation(async () => azPath)
      process.env['RUNNER_TEMP'] = runnerTemp as string
      ;(Date as any).now = jest.fn(() => date)
      mockExec.exec.mockImplementation(async () => 0)
      mockFs.chmodSync.mockImplementation(() => {})
      mockCore.exportVariable.mockImplementation(() => {})
      mockCore.debug.mockImplementation(() => {})

      await expect(run()).resolves.not.toThrow()
      const kubeconfigPath = `${runnerTemp}/kubeconfig_${date}`
      expect(mockExec.exec).toHaveBeenCalledWith('az', [
         'aks',
         'get-credentials',
         '--resource-group',
         resourceGroup,
         '--name',
         clusterName,
         '-f',
         kubeconfigPath
      ])
      expect(mockFs.chmodSync).toHaveBeenCalledWith(kubeconfigPath, '600')
      expect(mockCore.exportVariable).toHaveBeenCalledWith(
         'KUBECONFIG',
         kubeconfigPath
      )
   })

   it('calls az fleet get-credentials when fleet is the resource type', async () => {
      mockCore.getInput.mockImplementation((inputName, options) => {
         if (inputName == 'resource-group') return resourceGroup
         if (inputName == 'cluster-name') return clusterName
         if (inputName == 'resource-type') return resourceTypeFleet
         return ''
      })
      mockIo.which.mockImplementation(async () => azPath)
      process.env['RUNNER_TEMP'] = runnerTemp as string
      ;(Date as any).now = jest.fn(() => date)
      mockExec.exec.mockImplementation(async () => 0)
      mockFs.chmodSync.mockImplementation(() => {})
      mockCore.exportVariable.mockImplementation(() => {})
      mockCore.debug.mockImplementation(() => {})

      await expect(run()).resolves.not.toThrow()
      const kubeconfigPath = `${runnerTemp}/kubeconfig_${date}`
      expect(mockExec.exec).toHaveBeenCalledWith('az', [
         'fleet',
         'get-credentials',
         '--resource-group',
         resourceGroup,
         '--name',
         clusterName,
         '-f',
         kubeconfigPath
      ])
      expect(mockFs.chmodSync).toHaveBeenCalledWith(kubeconfigPath, '600')
      expect(mockCore.exportVariable).toHaveBeenCalledWith(
         'KUBECONFIG',
         kubeconfigPath
      )
      expect(mockCore.debug).toHaveBeenCalledWith(
         `Writing kubeconfig to ${kubeconfigPath}`
      )
   })

   it('passes even if resource type has mixed casing', async () => {
      mockCore.getInput.mockImplementation((inputName, options) => {
         if (inputName == 'resource-group') return resourceGroup
         if (inputName == 'cluster-name') return clusterName
         if (inputName == 'resource-type') return resourceTypeMixedCasingFleet
         return ''
      })
      mockIo.which.mockImplementation(async () => azPath)
      process.env['RUNNER_TEMP'] = runnerTemp as string
      ;(Date as any).now = jest.fn(() => date)
      mockExec.exec.mockImplementation(async () => 0)
      mockFs.chmodSync.mockImplementation(() => {})
      mockCore.exportVariable.mockImplementation(() => {})
      mockCore.debug.mockImplementation(() => {})

      await expect(run()).resolves.not.toThrow()
      const kubeconfigPath = `${runnerTemp}/kubeconfig_${date}`
      expect(mockExec.exec).toHaveBeenCalledWith('az', [
         'fleet',
         'get-credentials',
         '--resource-group',
         resourceGroup,
         '--name',
         clusterName,
         '-f',
         kubeconfigPath
      ])
      expect(mockFs.chmodSync).toHaveBeenCalledWith(kubeconfigPath, '600')
      expect(mockCore.exportVariable).toHaveBeenCalledWith(
         'KUBECONFIG',
         kubeconfigPath
      )
      expect(mockCore.debug).toHaveBeenCalledWith(
         `Writing kubeconfig to ${kubeconfigPath}`
      )
   })

   it('gets the kubeconfig and sets the context as a non admin user', async () => {
      mockCore.getInput.mockImplementation((inputName) => {
         if (inputName == 'resource-group') return resourceGroup
         if (inputName == 'resource-type') return resourceType
         if (inputName == 'cluster-name') return clusterName
         if (inputName == 'admin') return 'false'
         if (inputName == 'use-kubelogin') return 'true'
      })
      mockIo.which.mockImplementation(async () => azPath)
      process.env['RUNNER_TEMP'] = runnerTemp as string
      ;(Date as any).now = jest.fn(() => date)
      mockExec.exec.mockImplementation(async () => 0)
      mockFs.chmodSync.mockImplementation(() => {})
      mockCore.exportVariable.mockImplementation(() => {})
      mockCore.debug.mockImplementation(() => {})

      const kubeconfigPath = `${runnerTemp}/kubeconfig_${date}`
      await expect(run()).resolves.not.toThrow()
      expect(mockExec.exec).toHaveBeenNthCalledWith(1, 'az', [
         'aks',
         'get-credentials',
         '--resource-group',
         resourceGroup,
         '--name',
         clusterName,
         '-f',
         kubeconfigPath
      ])
      expect(mockExec.exec).toHaveBeenNthCalledWith(2, 'kubelogin', [
         'convert-kubeconfig',
         '-l',
         'azurecli'
      ])
      expect(mockFs.chmodSync).toHaveBeenCalledWith(kubeconfigPath, '600')
      expect(mockCore.exportVariable).toHaveBeenCalledWith(
         'KUBECONFIG',
         kubeconfigPath
      )
   })

   it('gets the kubeconfig and sets the context with subscription', async () => {
      mockCore.getInput.mockImplementation((inputName) => {
         if (inputName == 'resource-group') return resourceGroup
         if (inputName == 'resource-type') return resourceType
         if (inputName == 'cluster-name') return clusterName
         if (inputName == 'subscription') return subscription
      })
      mockIo.which.mockImplementation(async () => azPath)
      process.env['RUNNER_TEMP'] = runnerTemp as string
      ;(Date as any).now = jest.fn(() => date)
      mockExec.exec.mockImplementation(async () => 0)
      mockFs.chmodSync.mockImplementation(() => {})
      mockCore.exportVariable.mockImplementation(() => {})
      mockCore.debug.mockImplementation(() => {})

      await expect(run()).resolves.not.toThrow()
      const kubeconfigPath = `${runnerTemp}/kubeconfig_${date}`
      expect(mockExec.exec).toHaveBeenCalledWith('az', [
         'aks',
         'get-credentials',
         '--resource-group',
         resourceGroup,
         '--name',
         clusterName,
         '-f',
         kubeconfigPath,
         '--subscription',
         subscription
      ])
      expect(mockFs.chmodSync).toHaveBeenCalledWith(kubeconfigPath, '600')
      expect(mockCore.exportVariable).toHaveBeenCalledWith(
         'KUBECONFIG',
         kubeconfigPath
      )
   })

   it('gets the kubeconfig and sets the context with admin', async () => {
      mockCore.getInput.mockImplementation((inputName) => {
         if (inputName == 'resource-group') return resourceGroup
         if (inputName == 'resource-type') return resourceType
         if (inputName == 'cluster-name') return clusterName
         if (inputName == 'admin') return 'true'
      })
      mockIo.which.mockImplementation(async () => azPath)
      process.env['RUNNER_TEMP'] = runnerTemp as string
      ;(Date as any).now = jest.fn(() => date)
      mockExec.exec.mockImplementation(async () => 0)
      mockFs.chmodSync.mockImplementation(() => {})
      mockCore.exportVariable.mockImplementation(() => {})
      mockCore.debug.mockImplementation(() => {})

      await expect(run()).resolves.not.toThrow()
      const kubeconfigPath = `${runnerTemp}/kubeconfig_${date}`
      expect(mockExec.exec).toHaveBeenCalledWith('az', [
         'aks',
         'get-credentials',
         '--resource-group',
         resourceGroup,
         '--name',
         clusterName,
         '-f',
         kubeconfigPath,
         '--admin'
      ])
      expect(mockFs.chmodSync).toHaveBeenCalledWith(kubeconfigPath, '600')
      expect(mockCore.exportVariable).toHaveBeenCalledWith(
         'KUBECONFIG',
         kubeconfigPath
      )
   })

   it('can use public-fqdn', async () => {
      mockCore.getInput.mockImplementation((inputName, options) => {
         if (inputName == 'resource-group') return resourceGroup
         if (inputName == 'resource-type') return resourceType
         if (inputName == 'cluster-name') return clusterName
         if (inputName == 'admin') return 'true'
         if (inputName == 'public-fqdn') return 'true'
      })
      mockIo.which.mockImplementation(async () => azPath)
      process.env['RUNNER_TEMP'] = runnerTemp as string
      ;(Date as any).now = jest.fn(() => date)
      mockExec.exec.mockImplementation(async () => 0)
      mockFs.chmodSync.mockImplementation(() => {})
      mockCore.exportVariable.mockImplementation(() => {})
      mockCore.debug.mockImplementation(() => {})

      await expect(run()).resolves.not.toThrow()
      const kubeconfigPath = `${runnerTemp}/kubeconfig_${date}`
      expect(mockExec.exec).toHaveBeenCalledWith('az', [
         'aks',
         'get-credentials',
         '--resource-group',
         resourceGroup,
         '--name',
         clusterName,
         '-f',
         kubeconfigPath,
         '--admin',
         '--public-fqdn'
      ])
      expect(mockFs.chmodSync).toHaveBeenCalledWith(kubeconfigPath, '600')
      expect(mockCore.exportVariable).toHaveBeenCalledWith(
         'KUBECONFIG',
         kubeconfigPath
      )
   })
})
