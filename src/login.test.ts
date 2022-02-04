import * as login from './login'
import * as core from '@actions/core';
import * as fs from 'fs';
import * as path from 'path';
import * as azureActionsUtil from "@azure-actions/utilities/lib/http";

describe('Testing all functions in login file.', () => {
    test('getAKSKubeconfig() - get kubeconfig from aks API and return it', async () => {
        jest.spyOn(core, 'getInput').mockImplementation((inputName, options) => {
            if (inputName == 'resource-group') return 'sample-rg';
            if (inputName == 'cluster-name') return 'testing';
        });
        const response = {
            'statusCode': 200,
            'body': { 
                'properties': {
                    'kubeConfig': Buffer.from('###').toString('base64')
                } 
            }
        } as azureActionsUtil.WebResponse; 
        jest.spyOn(azureActionsUtil, 'sendRequest').mockResolvedValue(response);

        expect(await login.getAKSKubeconfig('<access_token>', '<subscription id>', 'https://management.azure.com/')).toBe('###');
        const request = {
            'body': '',
            'method': 'GET',
            'headers': {
                'Authorization': 'Bearer <access_token>',
                'Content-Type': 'application/json; charset=utf-8'
            },
            'uri': 'https://management.azure.com//subscriptions/<subscription id>/resourceGroups/sample-rg/providers/Microsoft.ContainerService/managedClusters/testing/accessProfiles/clusterAdmin?api-version=2017-08-31'
        } as azureActionsUtil.WebRequest;
        expect(azureActionsUtil.sendRequest).toBeCalledWith(request);
    });

    test('getAKSKubeconfig() - reject if response not in expected format', async () => {
        jest.spyOn(core, 'getInput').mockImplementation((inputName, options) => {
            if (inputName == 'resource-group') return 'sample-rg';
            if (inputName == 'cluster-name') return 'testing';
        });
        const response = {
            'statusCode': 200,
            'body': {
                'error': 'ErrorMessage'
            }
        } as azureActionsUtil.WebResponse; 
        jest.spyOn(azureActionsUtil, 'sendRequest').mockResolvedValue(response);

        await login.getAKSKubeconfig('<access_token>', '<subscription id>', 'https://management.azure.com/')
        .then(response => expect(response).toBeUndefined())
        .catch(error => expect(error).toBe(JSON.stringify(response.body)));
        const request = {
            'body': '',
            'method': 'GET',
            'headers': {
                'Authorization': 'Bearer <access_token>',
                'Content-Type': 'application/json; charset=utf-8'
            },
            'uri': 'https://management.azure.com//subscriptions/<subscription id>/resourceGroups/sample-rg/providers/Microsoft.ContainerService/managedClusters/testing/accessProfiles/clusterAdmin?api-version=2017-08-31'
        } as azureActionsUtil.WebRequest;
        expect(azureActionsUtil.sendRequest).toBeCalledWith(request);
    });

    test('getAKSKubeconfig() - reject if error recieved', async () => {
        jest.spyOn(core, 'getInput').mockImplementation((inputName, options) => {
            if (inputName == 'resource-group') return 'sample-rg';
            if (inputName == 'cluster-name') return 'testing';
        });
        jest.spyOn(azureActionsUtil, 'sendRequest').mockRejectedValue('ErrorMessage');

        await login.getAKSKubeconfig('<access_token>', '<subscription id>', 'https://management.azure.com/')
        .then(response => expect(response).toBeUndefined())
        .catch(error => expect(error).toBe('ErrorMessage'));
        const request = {
            'body': '',
            'method': 'GET',
            'headers': {
                'Authorization': 'Bearer <access_token>',
                'Content-Type': 'application/json; charset=utf-8'
            },
            'uri': 'https://management.azure.com//subscriptions/<subscription id>/resourceGroups/sample-rg/providers/Microsoft.ContainerService/managedClusters/testing/accessProfiles/clusterAdmin?api-version=2017-08-31'
        } as azureActionsUtil.WebRequest;
        expect(azureActionsUtil.sendRequest).toBeCalledWith(request);
    });

    test('getKubeconfig() - reject if incorrect credentials', async () => {
        jest.spyOn(core, 'getInput').mockReturnValue('Wrong cred.')

        await expect(login.getKubeconfig()).rejects.toThrow('Credentials object is not a valid JSON');
    });

    test('getKubeconfig() - get access token, use it to get kubeconfig and return it ', async () => {
        const creds = {
            "clientId": "<client id>",
            "clientSecret": "<client secret>",
            "subscriptionId": "<subscription id>",
            "tenantId": "<tenant id>",
            "activeDirectoryEndpointUrl": "https://login.k8s.microsoftonline.com",
            "resourceManagerEndpointUrl": "https://management.k8s.azure.com/",
            "activeDirectoryGraphResourceId": "https://graph.windows.net/",
            "sqlManagementEndpointUrl": "https://management.core.windows.net:8443/",
            "galleryEndpointUrl": "https://gallery.azure.com/",
            "managementEndpointUrl": "https://management.core.windows.net/"
        }
        const responseKube = {
            'statusCode': 200,
            'body': { 
                'properties': {
                    'kubeConfig': Buffer.from('###').toString('base64')
                } 
            }
        } as azureActionsUtil.WebResponse; 
        const responseLogin = {
            'statusCode': 200,
            'body': { 
                'access_token': '<access_token>' 
            }
        } as azureActionsUtil.WebResponse; 
        jest.spyOn(core, 'getInput').mockImplementation((inputName, options) => {
            if (inputName == 'resource-group') return 'sample-rg';
            if (inputName == 'cluster-name') return 'testing';
            if (inputName == 'creds') return JSON.stringify(creds);
        });
        jest.spyOn(azureActionsUtil, 'sendRequest').mockResolvedValueOnce(responseLogin).mockResolvedValueOnce(responseKube);

        await login.getKubeconfig()
        .then(response => expect(response).toBe('###'))
        .catch(error => expect(error).toBeUndefined());
        const requestForToken = {
            method: 'POST',
            uri: 'https://login.k8s.microsoftonline.com/<tenant id>/oauth2/token/',
            body: 'resource=https%3A%2F%2Fmanagement.k8s.azure.com%2F&client_id=%3Cclient%20id%3E&grant_type=client_credentials&client_secret=%3Cclient%20secret%3E',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8'
            }
        } as azureActionsUtil.WebRequest;
        let optionsForToken = {
            retriableStatusCodes: [400, 408, 409, 500, 502, 503, 504],
        } as azureActionsUtil.WebRequestOptions;
        expect(azureActionsUtil.sendRequest).toBeCalledWith(requestForToken, optionsForToken);
        const requestForKubecongig = {
            'body': '',
            'method': 'GET',
            'headers': {
                'Authorization': 'Bearer <access_token>',
                'Content-Type': 'application/json; charset=utf-8'
            },
            'uri': 'https://management.k8s.azure.com//subscriptions/<subscription id>/resourceGroups/sample-rg/providers/Microsoft.ContainerService/managedClusters/testing/accessProfiles/clusterAdmin?api-version=2017-08-31'
        } as azureActionsUtil.WebRequest;
        expect(azureActionsUtil.sendRequest).toBeCalledWith(requestForKubecongig);
    });

    test('getKubeconfig() - use default endpoints if not provided in creds', async () => {
        const creds = {
            "clientId": "<client id>",
            "clientSecret": "<client secret>",
            "subscriptionId": "<subscription id>",
            "tenantId": "<tenant id>",
            "activeDirectoryGraphResourceId": "https://graph.windows.net/",
            "sqlManagementEndpointUrl": "https://management.core.windows.net:8443/",
            "galleryEndpointUrl": "https://gallery.azure.com/",
            "managementEndpointUrl": "https://management.core.windows.net/"
        }
        const responseKube = {
            'statusCode': 200,
            'body': { 
                'properties': {
                    'kubeConfig': Buffer.from('###').toString('base64')
                } 
            }
        } as azureActionsUtil.WebResponse; 
        const responseLogin = {
            'statusCode': 200,
            'body': { 
                'access_token': '<access_token>' 
            }
        } as azureActionsUtil.WebResponse; 
        jest.spyOn(core, 'getInput').mockImplementation((inputName, options) => {
            if (inputName == 'resource-group') return 'sample-rg';
            if (inputName == 'cluster-name') return 'testing';
            if (inputName == 'creds') return JSON.stringify(creds);
        });
        jest.spyOn(azureActionsUtil, 'sendRequest').mockResolvedValueOnce(responseLogin).mockResolvedValueOnce(responseKube);

        await login.getKubeconfig()
        .then(response => expect(response).toBe('###'))
        .catch(error => expect(error).toBeUndefined());
        const requestForToken = {
            method: 'POST',
            uri: 'https://login.microsoftonline.com/<tenant id>/oauth2/token/',
            body: 'resource=https%3A%2F%2Fmanagement.azure.com%2F&client_id=%3Cclient%20id%3E&grant_type=client_credentials&client_secret=%3Cclient%20secret%3E',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8'
            }
        } as azureActionsUtil.WebRequest;
        let optionsForToken = {
            retriableStatusCodes: [400, 408, 409, 500, 502, 503, 504],
        } as azureActionsUtil.WebRequestOptions;
        expect(azureActionsUtil.sendRequest).toBeCalledWith(requestForToken, optionsForToken);
        const requestForKubecongig = {
            'body': '',
            'method': 'GET',
            'headers': {
                'Authorization': 'Bearer <access_token>',
                'Content-Type': 'application/json; charset=utf-8'
            },
            'uri': 'https://management.azure.com//subscriptions/<subscription id>/resourceGroups/sample-rg/providers/Microsoft.ContainerService/managedClusters/testing/accessProfiles/clusterAdmin?api-version=2017-08-31'
        } as azureActionsUtil.WebRequest;
        expect(azureActionsUtil.sendRequest).toBeCalledWith(requestForKubecongig);
    });

    test('run() - create kubeconfig, export variable and give appropriate access', async () => {
        jest.spyOn(fs, 'writeFileSync').mockImplementation();
        jest.spyOn(fs, 'chmodSync').mockImplementation();
        jest.spyOn(core, 'exportVariable').mockImplementation();
        jest.spyOn(console, 'log').mockImplementation();
        jest.spyOn(core, 'debug').mockImplementation();
        jest.spyOn(core, 'getInput').mockImplementation((inputName, options) => {
            if (inputName == 'resource-group') return 'sample-rg';
            if (inputName == 'cluster-name') return 'testing';
            if (inputName == 'creds') return JSON.stringify(creds);
        });
        const creds = {
            "clientId": "<client id>",
            "clientSecret": "<client secret>",
            "subscriptionId": "<subscription id>",
            "tenantId": "<tenant id>",
            "activeDirectoryEndpointUrl": "https://login.microsoftonline.com",
            "resourceManagerEndpointUrl": "https://management.azure.com/",
            "activeDirectoryGraphResourceId": "https://graph.windows.net/",
            "sqlManagementEndpointUrl": "https://management.core.windows.net:8443/",
            "galleryEndpointUrl": "https://gallery.azure.com/",
            "managementEndpointUrl": "https://management.core.windows.net/"
        }
        const responseKube = {
            'statusCode': 200,
            'body': { 
                'properties': {
                    'kubeConfig': Buffer.from('###').toString('base64')
                } 
            }
        } as azureActionsUtil.WebResponse; 
        const responseLogin = {
            'statusCode': 200,
            'body': { 
                'access_token': '<access_token>' 
            }
        } as azureActionsUtil.WebResponse; 
        jest.spyOn(azureActionsUtil, 'sendRequest').mockResolvedValueOnce(responseLogin).mockResolvedValueOnce(responseKube);
        process.env['RUNNER_TEMP'] =  'tempDirPath'
        jest.spyOn(Date, 'now').mockImplementation(() => 1234561234567);

        expect(await login.run());
        expect(fs.writeFileSync).toHaveBeenCalledWith(path.join('tempDirPath', 'kubeconfig_1234561234567'), '###');
        expect(fs.chmodSync).toHaveBeenCalledWith(path.join('tempDirPath', 'kubeconfig_1234561234567'), '600');
        expect(core.exportVariable).toHaveBeenCalledWith('KUBECONFIG', path.join('tempDirPath', 'kubeconfig_1234561234567'));
    });
}); 