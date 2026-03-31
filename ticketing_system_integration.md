# Response Policy Configurations

## Response Policies

### 1. Create Tickets in SN & ZN

**Criteria:**
- Producer is Site Operations

**Trigger:**
- Story Created

**Response:**
- Send Notification
    - Subscription Group
        - Create ZN & SN Tickets

---

### 2. Update SN & ZN on Story Ingestion

**Criteria:**
- Producer is Site Operations
- Status is Open, Monitoring, Reopened
- Investigation Status Changed is False
- Added user comment is False
- Added Managed Service Comment is False

**Trigger:**
- Story Updated

**Response:**
- Send Notification
    - Subscription Group
        - Update ZN & SN on ingestion

---

### 3. Update ServiceNow (SN) with New Comments

**Criteria:**
- Producer is Site Operations
- Status is Open, Monitoring, Reopened
- Added Managed Service Comment is True

**Trigger:**
- Story Updated

**Response:**
- Send Notification
  - Webhook
  - SN Update Ticket

---

### 4. Update ServiceNow (SN) Investigation Status

**Criteria:**
- Producer is Site Operations
- Status is Open, Monitoring, Reopened
- Investigation Status Changed is True

**Trigger:**
- Story Updated

**Response:**
- Webhook
  - SN Update Investigation Status

---

### 5. Update Zendesk (ZN) with New Comments

**Criteria:**
- Producer is Site Operations
- Status is Open, Monitoring, Reopened
- Added user comment is True

**Trigger:**
- Story Updated

**Response:**
- Webhook
    - ZN Update Ticket

---

## Subscriptions
### SN Create ticket 
  - URL: POST https://<service-now-instance>/api/now/table/incident
- Body:
  ```
  {
  "short_description": "Alert on Cato account '$accountName': $title",
  "description": "Cato alert: $contentText",
  "work_notes": "[code] Account: $accountName<br>Account ID: $accountId<br>Story ID: $storyId<br>Alert type: $alertType<br>Alert content: $contentHTML<br>Alert level: $level<br> Socket Serial : $socketSerial <br> Secondary Socket Serial: $secondarySocketSerial <br> Socket description: $socketDescription [/code]",
  "u_cma_account_id": "$accountId",
  "u_cma_story_id": "$storyId"
  }
- Correlation:
  - Correlation Update Flow
    - Enable correlation
      - This is create webhook
      - result.sys_id

### SN Update Ticket
  - URL: PUT https://<service-now-instance>/api/now/table/incident/$correlationId
  - Body:
  - ```
    {
    "work_notes": "NEW ZN comment Added: $lastManagedComment.",
    "u_cma_account_id": "$accountId",
    "u_cma_story_id": "$storyId"
    } 
    ```
  - Correlation:
    - Correlation Update Flow
      - Enable correlation
        - This is update webhook
        - Corresponding create webhook
          - SN Create Ticket

  
### SN Update on Ingestion
- URL
  - PUT https://<service-now-instance>/api/now/table/incident/$correlationId
- Body
  ```
  {
  "work_notes": "[code]NEW Story update: $contentHTML[/code]",
  "u_cma_account_id": "$accountId",
  "u_cma_story_id": "$storyId"
  }
  ```
- Correlation
  - Correlation Update Flow
    - Enable correlation
      - This is update webhook
      - Corresponding create webhook
        - SN Create Ticket


### SN Update Investigation Status  
- URL
  - PUT https://<service-now-instance>/api/now/table/incident/$correlationId
- Body
- ```
  {    
    "work_notes": "[code] ZN investigation Status updated.<br> Staus: $managedServiceStatus, <br>Link: <a href='https://$link'>Zendesk Ticket</a>[/code].",
    "u_cma_account_id": "$accountId",
    "u_cma_story_id": "$storyId"
  }
  ```
- Correlation
  - Correlation Update Flow
    - Enable correlation
      - This is update webhook
      - Corresponding create webhook
        - SN Create Ticket

### ZN Create Ticket
- URL: POST https://<zendesk-instance>/api/v2/tickets.json
- Body:
  ```
   {
  "ticket" : {
    "subject" : "$accountName - $siteName - $indication - $socketInterfaceId",
    "comment" : {
      "html_body" : "$contentHTML"
    },
    "custom_fields" : [ {
      "id" : 25212613618077,
      "value" : "$accountId"
    }, {
      "id" : 25212622788381,
      "value" : "$storyId"
    }, {
      "id" : 360005387438,
      "value" : "$siteName"
    }, {
      "id" : 360005387458,
      "value" : "$time"
    }, {
      "id" : 360005397597,
      "value" : "$socketInterface"
    } ],
    "ticket_form_id" : 25212960199965,
    "brand_id" : 360000089377
  }
  ```
  Correlation:
    - Correlation Update Flow
      - Enable correlation
        - This is create webhook
        - ticket.id
  
### ZN Update with user comment Ticket
- URL: PUT https://<zendesk-instance>/api/v2/tickets/$correlationId.json
- Body:
  ```
  {
  "ticket": {
    "comment": {
      "body": "",
      "html_body" : "NEW *SN* comment Added: <br> $lastUserComment.",
      "public": true
    }
  }
  ```
Correlation:
  - Correlation Update Flow
    - Enable correlation
      - This is update webhook
      - Corresponding create webhook
        - ZN Create Ticket

### ZN Update on Ingestion
- URL: PUT https://<zendesk-instance>/api/v2/tickets/$correlationId.json
- Body:
  ```
  {
  "ticket": {
    "comment": {
      "body": "story id $storyId has been updated $storyStatus and $lastIncidentDescription .",
      "public": false
    },
    "status": "open"
  }
  ```
Correlation:  
  - Correlation Update Flow
    - Enable correlation
      - This is update webhook
      - Corresponding create webhook
        - ZN Create Ticket

  


## Subscription Groups

### Create ZD & SN Tickets
Members
  - SN Create Ticket
  - ZD Create Ticket

### Update ZN & SN on ingestion
- Members
  - SN Update on Ingestion
  - ZD Update on Ingestion


