# Overview

Cato Networks provides a cloud-native SASE platform that converges SD-WAN, security, and networking services. These ServiceNow integrations help organizations maintain accurate asset inventories, automate change management, and enhance visibility of Cato infrastructure within ITSM workflows.

## Cato Networks ServiceNow Integrations

The Cato Networks ServiceNow Integrations package consists of scripts and configurations used to integrate Cato's SASE platform with ServiceNow. These integrations enable automated synchronization of network infrastructure data and streamline IT operations workflows.

## Available Integrations

1. [CMDB Hardware Synchronization](./cmdb) - Automatically sync Cato Socket hardware inventory into ServiceNow's Configuration Management Database (CMDB) as SD-WAN Edge devices
2. [XDR Story to Multi-Ticket Integration](./ticketing_system_integration.md) - Configure Cato XDR response policies, webhooks, and subscriptions to automate ticket creation and updates in ServiceNow and Zendesk
3. [ServiceNow to XDR Story Integration](./service_now_integration_with_cma.md) - Enable bi-directional comment synchronization between ServiceNow Incidents and Cato Stories via the XDR GraphQL API

Refer to the individual integration README files for detailed setup instructions, configuration options, and troubleshooting guidance.

## Related Resources

- [Cato Networks Documentation](https://support.catonetworks.com/)
- [Cato API Documentation](https://api.catonetworks.com/documentation/)
- [ServiceNow Documentation](https://docs.servicenow.com/)
