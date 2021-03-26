# Azure Kubernetes Service set context 

This action can be used to set cluster context before other actions like [`azure/k8s-deploy`](https://github.com/Azure/k8s-deploy/tree/master), [`azure/k8s-create-secret`](https://github.com/Azure/k8s-create-secret/tree/master) or any kubectl commands (in script) can be run subsequently in the workflow.

Refer to [starter templates](https://github.com/Azure/actions-workflow-samples/tree/master/Kubernetes) to deploy to any Kubernetes cluster on-premise or any cloud including Azure Kubernetes service.

## Action inputs

<table>
  <thead>
    <tr>
      <th>Action inputs</th>
      <th>Description</th>
    </tr>
  </thead>

  <tr>
    <td><code>creds</code><br/>Credentials</td>
    <td>(Required) Credentials required to authenticate with Azure. Steps to obtain these credentials are provided below</td>
  </tr>
  <tr>
    <td><code>resource-group</code><br/>Resource group</td>
    <td>(Required) Resource group containing the AKS cluster</td>
  </tr>
  <tr>
    <td><code>cluster-name</code><br/>Cluster name</td>
    <td>(Required) Name of the AKS cluster</td>
  </tr>
</table>

## Example

```yaml
uses: azure/aks-set-context@v1
    with:
        creds: '${{ secrets.AZURE_CREDENTIALS }}' # Azure credentials
        resource-group: '<resource group name>'
        cluster-name: '<cluster name>'
    id: login
```

To fetch the credentials required to authenticate with Azure, run the following command:

```sh
az ad sp create-for-rbac --sdk-auth
```

For more details on this command, refer to [service principal documentation](https://docs.microsoft.com/cli/azure/ad/sp?view=azure-cli-latest#az-ad-sp-create-for-rbac)

This generates a service principal and the output of the above command will be in the following format:

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

Add the json output as [a secret](https://developer.github.com/actions/managing-workflows/storing-secrets/) (let's say with the name `AZURE_CREDENTIALS`) in the GitHub repository. The example YAML snippet given above showcases how this secret is referenced in the action for specifying the credentials as input to the action.

aks-set-context GitHub Actions is supported for the Azure public cloud as well as Azure government clouds ('AzureUSGovernment' or 'AzureChinaCloud'). Before running this action, login to the respective Azure Cloud  using [Azure Login](https://github.com/Azure/login) by setting appropriate value for the `environment` parameter.

## Contributing

This project welcomes contributions and suggestions.  Most contributions require you to agree to a
Contributor License Agreement (CLA) declaring that you have the right to, and actually do, grant us
the rights to use your contribution. For details, visit https://cla.opensource.microsoft.com.

When you submit a pull request, a CLA bot will automatically determine whether you need to provide
a CLA and decorate the PR appropriately (e.g., status check, comment). Simply follow the instructions
provided by the bot. You will only need to do this once across all repos using our CLA.

This project has adopted the [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/).
For more information see the [Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/) or
contact [opencode@microsoft.com](mailto:opencode@microsoft.com) with any additional questions or comments.
