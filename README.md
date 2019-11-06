# Azure Kubernetes Service set context

Used for setting the target AKS cluster context which will be used by other actions like [`azure/k8s-deploy`](https://github.com/Azure/k8s-deploy/tree/master), [`azure/k8s-create-secret`](https://github.com/Azure/k8s-create-secret/tree/master) etc. or run any [kubectl](https://kubernetes.io/docs/reference/kubectl/overview/) commands.

```yaml
uses: azure/aks-set-context@v1
    with:
        creds: '${{ secrets.AZURE_CREDENTIALS }}' # Azure credentials
        resource-group: '<resource group name>'
        cluster-name: '<cluster name>'
    id: login
```

Refer to the action metadata file for details about all the inputs https://github.com/Azure/aks-set-context/blob/master/action.yml

## Azure credentials
Run `az ad sp create-for-rbac --sdk-auth` to generate an Azure Active Directory service principals.
For more details refer to: [az ad sp create-for-rbac](https://docs.microsoft.com/en-us/cli/azure/ad/sp?view=azure-cli-latest#az-ad-sp-create-for-rbac)

```json
{
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
```
## Using secret
Now add the json output as [a secret](https://developer.github.com/actions/managing-workflows/storing-secrets/) in the GitHub repository. In the above example the secret name is `AZURE_CREDENTIALS` and it can be used in the workflow by using the following syntax:
```yaml
creds: '${{ secrets.AZURE_CREDENTIALS }}'
```

# Contributing

This project welcomes contributions and suggestions.  Most contributions require you to agree to a
Contributor License Agreement (CLA) declaring that you have the right to, and actually do, grant us
the rights to use your contribution. For details, visit https://cla.opensource.microsoft.com.

When you submit a pull request, a CLA bot will automatically determine whether you need to provide
a CLA and decorate the PR appropriately (e.g., status check, comment). Simply follow the instructions
provided by the bot. You will only need to do this once across all repos using our CLA.

This project has adopted the [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/).
For more information see the [Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/) or
contact [opencode@microsoft.com](mailto:opencode@microsoft.com) with any additional questions or comments.
