# Cato Networks ServiceNow CMDB Integration

This integration synchronizes Cato Socket hardware inventory into ServiceNow's Configuration Management Database (CMDB) as SD-WAN Edge devices.

## Overview

The integration consists of:
- **Outbound REST API** (`cato.api`) - Connects to Cato Networks GraphQL API
- **Scheduled Job** - Runs periodically to sync hardware data into CMDB
- **GraphQL Queries** - Two queries to fetch socket inventory and account details

## Prerequisites

### ServiceNow Requirements
- ServiceNow instance with admin access
- **Required Plugins**:
  - **Expanded Model and Asset Classes** - Provides extended CMDB CI classes including SD-WAN Edge devices
  - **Data Foundation Model** - Provides core data model for CMDB configuration items

### Cato Networks Requirements
- Cato Networks API credentials (Account ID and API token)
- Active Cato account with registered Socket devices

### ServiceNow Configuration
- Manufacturer record for Cato Networks in ServiceNow
- `cmdb_ci_sdwan_edge` table available (provided by Expanded Model and Asset Classes plugin)

## Setup Instructions

### Step 1: Create the Outbound REST Message

1. Navigate to **System Web Services > Outbound > REST Message**
2. Click **New** to create a new REST Message
3. Configure the REST Message:
   - **Name**: `cato.api`
   - **Endpoint**: `https://api.catonetworks.com/api/v1/graphql2`
   - **Authentication type**: No authentication (or configure based on your requirements)
   - **HTTP Headers**: Add `Authorization` header if using mutual authentication

4. Under **HTTP Methods**, create two POST methods:

#### Method 1: query.hardwareManagement
- **Name**: `query.hardwareManagement`
- **HTTP method**: POST
- **Endpoint**: `https://api.catonetworks.com/api/v1/graphql2`
- **Content**: Use the content from `cato.api.query.hardwareManagement.json` (abbreviated for clarity - use full query from file):

```json
{
    "query": "query hardwareManagement ( $accountId:ID! ) { hardwareManagement ( accountId:$accountId ) { socketInventory { items { id status serialNumber socketMac socketVersion site { id name } account { id name } shippingDate socketType trackingUrl trackingNumber shippingCompany deliverySiteName description isPrimary registrationStatus availableUpgradeVersions upgradeStatus upgradesPaused } pageInfo { total } } } }",
    "variables": {
        "accountId": "YOUR_ACCOUNT_ID"
    },
    "operationName": "hardwareManagement"
}
```

#### Method 2: query.accountSnapshot
- **Name**: `query.accountSnapshot`
- **HTTP method**: POST
- **Endpoint**: `https://api.catonetworks.com/api/v1/graphql2`
- **Content**: Use the content from `cato.api.query.accountSnapshot.json` (abbreviated for clarity - use full query from file):

```json
{
    "query": "query accountSnapshot ( $accountID:ID ) { accountSnapshot ( accountID:$accountID ) { ... } }",
    "variables": {
        "accountID": "YOUR_ACCOUNT_ID"
    },
    "operationName": "accountSnapshot"
}
```

**Important**: Replace `YOUR_ACCOUNT_ID` with your actual Cato Networks Account ID in both queries.

5. Click **Update** to save the REST Message

### Step 2: Configure Authentication (Optional)

If using API token authentication:
1. Add HTTP Header:
   - **Name**: `x-api-key`
   - **Value**: `{{YOUR_API_TOKEN}}`

2. Or configure OAuth 2.0 if required by your Cato instance

### Step 3: Get the Manufacturer System ID

1. Navigate to **Configuration > Companies**
2. Find or create a record for "Cato Networks"
3. Copy the **sys_id** from the record
4. Update the `MANUFACURER_ID` constant in `script.js`:

```javascript
const MANUFACURER_ID = "YOUR_MANUFACTURER_SYS_ID";
```

### Step 4: Create the Scheduled Job

1. Navigate to **System Scheduler > Scheduled Jobs**
2. Click **New**
3. Configure the scheduled job:
   - **Name**: `cato.CMDB.integration` (or `Cato CMDB Hardware Sync`)
   - **Run**: Select your desired schedule (e.g., Daily at a specific time)
   - **Repeat interval**: Configure based on your sync requirements
     - Example: Every 1 hour (Hours: `01`, Minutes: `00`)
   - **Time zone**: Select appropriate timezone
   - **Active**: Check to enable

4. In the **Script** field, paste the content from `script.js`

5. **Important Configuration**: Update these constants at the top of the script:

```javascript
const LOG_PREFIX = "CATO_CMDB_JOB";
const MANUFACURER_ID = "YOUR_MANUFACTURER_SYS_ID";  // From Step 3
const ASSIGNMENT_GROUP = "Infrastructure Gear";     // Your assignment group
const DEVICE_TYPE = "Cato Socket Appliance";        // Device type label
```

6. Click **Submit** to save the scheduled job

### Step 5: Test the Integration

1. Navigate to your newly created scheduled job
2. Click **Execute Now** to run it immediately
3. Check the **System Logs** for job execution status:
   - Navigate to **System Logs > System Log > All**
   - Filter by Source: `CATO_CMDB_JOB`
   - Look for success/error messages

4. Verify CMDB records:
   - Navigate to **Configuration > SD-WAN Edges**
   - Look for newly created Cato Socket devices

## What Gets Synchronized

The integration creates/updates records in the `cmdb_ci_sdwan_edge` table with the following fields:

| Field | Source | Description |
|-------|--------|-------------|
| `asset_tag` | Socket ID | Unique identifier from Cato |
| `assignment_group` | Configured in script | Assignment group for device |
| `attributes` | Site name | Associated Cato site |
| `company` | Configured in script | Manufacturer record |
| `device_type` | Configured in script | Device type label |
| `environment` | Site name | Environment/site name |
| `firmware_manufacturer` | Socket version | Current firmware version |
| `installed_date` | connectedSince | First connection timestamp |
| `ip_address` | WAN interface IP | Primary WAN interface IP |
| `mac_address` | socketMac | Socket MAC address |
| `manufacturer` | Configured in script | Manufacturer record |
| `model_id` | socketType | Socket model type |
| `model_number` | socketType | Socket model type |
| `name` | Generated | Format: `{socketType}-{serialNumber}` |
| `serial_number` | serialNumber | Serial number (or MAC if empty) |
| `description` | isPrimary | "primary" or "secondary" |
| `site_id` | Site ID | Cato site identifier |

## How It Works

1. **Hardware Management Query**: Fetches all registered Cato Sockets with their basic information
2. **Account Snapshot Query**: Fetches detailed site and interface information including WAN IP addresses
3. **Data Processing**: Combines data from both queries to build complete CI records
4. **CMDB Update**: Creates new CIs or updates existing ones based on serial number matching

## Filtering

The integration only syncs sockets with `registrationStatus == 'REGISTERED'`. Unregistered or decommissioned devices are ignored.

## Logging

All log messages are prefixed with `CATO_CMDB_JOB` for easy filtering. Monitor logs at:
- **System Logs > System Log > All**
- Filter by Source containing: `CATO_CMDB_JOB`

## Troubleshooting

### Issue: "API failed with status: XXX"

- Verify your Cato API credentials are correct
- Check the REST Message configuration
- Ensure Account ID is correct in the query JSON
- Verify API endpoint is accessible from ServiceNow

### Issue: No devices appearing in CMDB

- Check that devices have `registrationStatus: 'REGISTERED'` in Cato
- Verify the `cmdb_ci_sdwan_edge` table exists
- Check system logs for JavaScript errors
- Ensure manufacturer sys_id is correct

### Issue: Duplicate records being created

- Verify that serial numbers are unique
- Check if `serial_number` field matching logic is working
- Review existing CI records for conflicts

## Customization

You can customize the integration by:
- Modifying the GraphQL queries to include additional fields
- Adjusting the CMDB field mappings in the `updateCMDB()` function
- Changing the device filtering logic (currently filters by `registrationStatus`)
- Updating the scheduled job frequency
- Adding custom business logic for specific use cases

## Support

For issues with:
- **Cato Networks API**: Contact Cato Networks support
- **ServiceNow Configuration**: Consult ServiceNow documentation or your ServiceNow admin
- **Integration Script**: Review the code in `script.js` and system logs

## License

Please refer to your organization's licensing terms for this integration code.