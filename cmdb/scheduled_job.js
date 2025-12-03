
const MANUFACURER_ID = "YOUR_MANUFACURER_ID_HERE"; // Replace with actual manufacturer sys_id
const LOG_PREFIX = "CATO_CMDB_JOB";
const ASSIGNMENT_GROUP = "Infrastructure Gear";
const DEVICE_TYPE = "Cato Socket Appliance";
const ACCOUNT_ID = "YOUR_ACCOUNT_ID_HERE";

try {
    gs.info(LOG_PREFIX + 'Starting CATO Hardware Management CMDB API Integration Job');        
    var cis = []
    var hardwareManagementQuery = new sn_ws.RESTMessageV2('cato.api', 'query.hardwareManagement');
    var hardwareManagementResponse = hardwareManagementQuery.execute();
    var hardwareManagementResponseStatus = hardwareManagementResponse.getStatusCode();
    
    if (hardwareManagementResponseStatus != 200) {
        gs.error(LOG_PREFIX + 'CATO query.hardwareManagement() API failed with status: ' + hardwareManagementResponseStatus);
    }
    
    var hardwareManagementResponseJson = hardwareManagementResponse.getBody();
    gs.info('hardwareManagementResponseJson ' + hardwareManagementResponseJson);
    var hmResponse = JSON.parse(hardwareManagementResponseJson);
    
    // Parse response and organize socket data
    for (var i = 0; i < hmResponse.data.hardwareManagement.socketInventory.items.length; i++) {
        var item = hmResponse.data.hardwareManagement.socketInventory.items[i];
        if (item.registrationStatus == 'REGISTERED') {
            gs.info('Device registered: ' + item.site.name);
            cis["id_"+item.id] = {
                "asset_tag": item.id,
                "assignment_group":ASSIGNMENT_GROUP,
                "attributes": item.site.name,
                "company": MANUFACURER_ID,
                "device_type": DEVICE_TYPE,
                "environment": item.site.name,
                "firmware_manufacturer": item.version,
                "manufacturer": MANUFACURER_ID,
                "name": item.socketType + "-" + (item.serialNumber!="" ? item.serialNumber : item.socketMac),
                "installed_date": item.connectedSince,
                "system_ip": "",
                "mac_address": item.socketMac,
                "model_id": item.socketType,
                "model_number": item.socketType,
                "serial_number": item.serialNumber!="" ? item.serialNumber : item.socketMac,
                "description": item.isPrimary ? "primary" : "secondary",
                "site_id": item.site.id
            }                
        }
    }

    // Query accountSnapshot to collect wan interface ip, and haRole
    var accountSnapshotQuery = new sn_ws.RESTMessageV2('cato.api', 'query.accountSnapshot');
    var accountSnapshotResponse = accountSnapshotQuery.execute();
    var accountSnapshotResponseStatus = accountSnapshotResponse.getStatusCode();
    
    if (accountSnapshotResponseStatus != 200) {
        gs.error(LOG_PREFIX + 'CATO query.accountSnapshot() API failed with status: ' + accountSnapshotResponseStatus);
    }

    var accountSnapshotResponseJson = accountSnapshotResponse.getBody();
    gs.info('accountSnapshotResponseJson ' + accountSnapshotResponseJson);
    var asResponse = JSON.parse(accountSnapshotResponseJson);

    // Parse accountSnapshot response and hydrate additional socket and site attributes
    for (var i = 0; i < asResponse.data.accountSnapshot.sites.length; i++) {
        var curSite = asResponse.data.accountSnapshot.sites[i];
        for (var j = 0; j < curSite.devices.length; j++) {
            var curDevice = curSite.devices[j];
            if (curDevice.socketInfo!=null && cis["id_"+curDevice.socketInfo.id]!=undefined) {
                curCi = cis["id_"+curDevice.socketInfo.id];
                for (var k=0; k<curDevice.interfaces.length; k++) {
                    var curInterface = curDevice.interfaces[k];
                    if (curInterface.infoInterfaceSnapshot.wanRole == "wan_1") {
                        curCi.ip_address = curInterface.tunnelRemoteIP;
                    }
                }
            }
        }
    }
    for (socket_id in cis) {
        gs.info(LOG_PREFIX + 'socket_id:"' + socket_id + '"');
        curCI = cis[socket_id];
        gs.info(LOG_PREFIX + 'Adding socket type:"'+curCI.model_number+'" with serial number:"' + curCI.serial_number +'" and siteId: "'+curCI.site_id+'"');
        updateCMDB(curCI);
        gs.info(LOG_PREFIX + 'API Integration Job completed successfully');        
    }
} catch (ex) {
    gs.error(LOG_PREFIX + 'Error in API Integration Job: ' + ex.message);
}

// Function to update CMDB
function updateCMDB(curCI) {
    try {
        // Find existing CI by sys_id
        var ci = new GlideRecord('cmdb_ci_sdwan_edge'); 
        ci.addQuery('serial_number', curCI.serial_number); 
        // ci.addQuery('sys_id', curCI.sys_id); // Adjust query field as needed
        ci.query();
        if (ci.next()) {
            // Update existing CI
            ci.attributes = curCI.attributes;
            ci.asset_tag = curCI.asset_tag;
            ci.company = curCI.company;
            ci.device_type = curCI.device_type;
            ci.environment = curCI.environment;
            ci.firmware_manufacturer = curCI.firmware_manufacturer;
            ci.name = curCI.name;
            ci.installed_date = curCI.installed_date;
            ci.ip_address = curCI.ip_address;
            ci.mac_address = curCI.mac_address;
            ci.manufacturer = curCI.manufacturer;
            ci.model_id = curCI.model_number;
            ci.model_number = curCI.model_number;
            ci.name = curCI.name;
            ci.serial_number = curCI.serial_number;
            ci.short_description = curCI.short_description;
            ci.site_id = curCI.site_id;
            ci.update();
            gs.info('Updated CI: ' + ci.name + ' (sys_id: ' + ci.sys_id + ')');
        } else {
            // Create new CI if not found
            ci.initialize();
            ci.attributes = curCI.attributes;
            ci.asset_tag = curCI.asset_tag;
            ci.company = curCI.company;
            ci.device_type = curCI.device_type;
            ci.environment = curCI.environment;
            ci.firmware_manufacturer = curCI.firmware_manufacturer;
            ci.installed_date = curCI.installed_date;
            ci.ip_address = curCI.ip_address;
            ci.mac_address = curCI.mac_address;
            ci.manufacturer = curCI.manufacturer;
            ci.model_id = curCI.model_number;
            ci.model_number = curCI.model_number;
            ci.name = curCI.name;
            ci.serial_number = curCI.serial_number;
            ci.short_description = curCI.short_description;
            ci.site_id = curCI.site_id;
            var newSysId = ci.insert();
            gs.info(LOG_PREFIX + 'Created new CI: ' + ci.name + ' (sys_id: ' + newSysId + ')');
        }
    } catch (ex) {
        gs.error(LOG_PREFIX + 'Error updating CMDB for device ' + curCI.id + ': ' + ex.message);
    }
}
