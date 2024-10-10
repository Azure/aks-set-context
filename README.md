# Azure Kubernetes Service set context

This action can be used to set cluster context before other actions like [`azure/k8s-deploy`](https://github.com/Azure/k8s-deploy/tree/master) and [`azure/k8s-create-secret`](https://github.com/Azure/k8s-create-secret/tree/master). Any kubectl commands (in script) can also be run subsequently in the workflow.

You must run [Azure/login](https://github.com/Azure/login) before this action.

## Action inputs

<table>
  <thead>
    <tr>
      <th>Action inputs</th>
      <th>Description</th>
    </tr>
  </thead>

  <tr>
    <td><code>resource-group</code><br/>(Required)</td>
    <td>Resource group containing the AKS cluster</td>
  </tr>
  <tr>
    <td><code>cluster-name</code><br/>(Required)</td>
    <td>Name of the AKS cluster</td>
  </tr>
  <tr>
    <td><code>subscription</code></td>
    <td>Subscription tied to AKS cluster</td>
  </tr>
  <tr>
    <td><code>admin</code></td>
    <td>Get cluster admin credentials. Values: true or false</td>
  </tr>
  <tr>
    <td><code>use-kubelogin</code></td>
    <td>Allows non-admin users to use the Action via kubelogin</td>
  </tr>
  <tr>
    <td><code>public-fqdn</code></td>
    <td>Get private cluster credential with server address to be public fqdn</td>
  </tr>

</table>

## Example

### OIDC Authentication (recommended)

```yaml
- uses: azure/login@v2
  with:
     client-id: ${{ secrets.AZURE_CLIENT_ID }}
     tenant-id: ${{ secrets.AZURE_TENANT_ID }}
     subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}

- uses: azure/aks-set-context@v4
  with:
     resource-group: '<resource group name>'
     cluster-name: '<cluster name>'
```

### Service Principal Authentication

```yaml
- uses: azure/login@v2
  with:
     creds: ${{ secrets.AZURE_CREDENTIALS }}

- uses: azure/aks-set-context@v4
  with:
     resource-group: '<resource group name>'
     cluster-name: '<cluster name>'
```

### Kubelogin

`kubelogin` is at the core of the non-admin user scenario. For more information on `kubelogin`, refer to the documentation [here](https://github.com/Azure/kubelogin).

To run this Action as a non-admin user, you must first install `kubelogin`. To set up `kubelogin`, you may use the action [azure/use-kubelogin][action_use_kubelogin]:

```yaml
- name: Set up kubelogin for non-interactive login
  uses: azure/use-kubelogin@v2
  with:
     kubelogin-version: 'v0.0.24'
```

[action_use_kubelogin]: https://github.com/marketplace/actions/setup-kubelogin

### Non-Admin User Example

If you are executing this Action as a non-admin user, you need to toggle the optional `use-kubelogin` Action input to `true` for it to work.

```yaml
- uses: azure/login@v2
  with:
     client-id: ${{ secrets.AZURE_CLIENT_ID }}
     tenant-id: ${{ secrets.AZURE_TENANT_ID }}
     subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}

- uses: azure/aks-set-context@v4
  with:
     resource-group: '<resource group name>'
     cluster-name: '<cluster name>'
     admin: 'false'
     use-kubelogin: 'true'
```

```yaml
- uses: azure/login@v2
  with:
     creds: ${{ secrets.AZURE_CREDENTIALS }}

- uses: azure/aks-set-context@v4
  with:
     resource-group: '<resource group name>'
     cluster-name: '<cluster name>'
     admin: 'false'
     use-kubelogin: 'true'
```

## Contributing

This project welcomes contributions and suggestions. Most contributions require you to agree to a
Contributor License Agreement (CLA) declaring that you have the right to, and actually do, grant us
the rights to use your contribution. For details, visit https://cla.opensource.microsoft.com.

When you submit a pull request, a CLA bot will automatically determine whether you need to provide
a CLA and decorate the PR appropriately (e.g., status check, comment). Simply follow the instructions
provided by the bot. You will only need to do this once across all repos using our CLA.

This project has adopted the [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/).
For more information see the [Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/) or
contact [opencode@microsoft.com](mailto:opencode@microsoft.com) with any additional questions or comments.

## Support

aks-set-context is an open source project that is [**not** covered by the Microsoft Azure support policy](https://support.microsoft.com/en-us/help/2941892/support-for-linux-and-open-source-technology-in-azure). [Please search open issues here](https://github.com/Azure/aks-set-context/issues), and if your issue isn't already represented please [open a new one](https://github.com/Azure/aks-set-context/issues/new/choose). The project maintainers will respond to the best of their abilities.
