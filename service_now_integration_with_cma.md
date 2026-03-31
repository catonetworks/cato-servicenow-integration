## Overview

This integration enables analysts working in ServiceNow to add comments to Cato Stories directly from the ServiceNow Incident.

When an analyst adds a comment to a ServiceNow Incident, a Business Rule triggers an outbound webhook that calls the XDR GraphQL API and creates a corresponding story comment in the originating system.

This ensures bi-directional visibility between ServiceNow and Cato Management Application.

## The Flow
```text
ServiceNow Incident Comment
        │ (Business Rule Trigger)
        ▼
Business Rule Script
        │
        │ HTTPS POST
        ▼
Cato GraphQL API
        │
        ▼
Story Comment Created
```

---

### Components (Transformed)

- ServiceNow Business Rule:
    Triggers when a comment is added to a ticket.

- Custom Fields:
    Store Cato Stories identifiers (Account ID, Story ID).

- System Property 
    Secure storage for the Customer API key.
    
- Cato GraphQL API
    Receives comment creation request.




## ServiceNow Configuration

### 1. Create Custom Fields

Two custom fields were added to the ServiceNow Incident to hold data from CMA. Storing them in custom fields allows easy fetching in the Business Rule script.

Custom fields automatically get names in the format `u_<field_name>` for easy access.

| Field Name | Type | Purpose                 |
|---|---|-------------------------|
| `u_cma_account_id` | String | Cato account identifier |
| `u_cma_story_id` | String | Cato story identifier   |

These fields are populated when the ticket is created by calling CMA webhooks.

### How to create custom fields in a ServiceNow ticket

1. Open any Incident in ServiceNow.
2. Right-click on the top banner (grey).
3. Select **Configure → Form Design**.
4. A pop-up appears to try Form Builder; click **Agree**.
5. Choose **Default view**.

## Store API Key Securely

Create a secure system property to store the API key.

Navigate to:

`https://<instance>.service-now.com/sys_properties_list.do`

Create a new property with the following values:

| Field | Value |
|---|---|
| Name | `cma_prod_api_key` |
| Type | `Password2` |
| Description | No need |
| Value | Add the API key in the format `R=<...>|K=<...>` (without quotation marks) |

The API key is encrypted and not stored or shows in code.

## Create REST Message

Navigate to:

**System Web Services → Outbound → REST Message**

Create a REST message.

- **Name:** `Update Cato story comments CMA Prod`
- Endpoint
  https://system.cc.catonetworks.com/api/v1/graphql2
  Cursor
## Business Rule Configuration

The Business Rule runs when a comment is added to the ticket.

### Trigger configuration

| Property | Value |
|---|---|
| Table | Ticket table |
| When | After |
| Update | True |
| Condition | Comment added |

## Business Rule Script

We used the **update story comments** Business Rule to run when a work note is added.  
Make sure to uncheck the **Work notes** checkbox so the comment is customer-visible in the ticket.

```aiignore
(function executeRule(current, previous) {
  try {
    var lastComment = current.comments.getJournalEntry(1) || '';
    lastComment = stripJournalHeader(lastComment);

    if (!lastComment) {
      gs.info("GraphQL webhook: Empty comment, skipping " + current.number);
      return;
    }

    var accountId = current.u_cma_account_id;
    var storyId = current.u_cma_story_id;

	gs.info("GraphQL webhook: accountId " + accountId + " story " + storyId);


    if (!accountId || !storyId) {
      gs.error("GraphQL webhook: Missing accountId/storyId for " + current.number);
      return;
    }

    var gqlQuery =
      "mutation CreateStoryComment($accountId: ID!, $input: AddStoryCommentInput!) {" +
      "  xdr(accountId: $accountId) {" +
      "    addStoryComment(input: $input) {" +
      "      comment { id type __typename }" +
      "      __typename" +
      "    }" +
      "    __typename" +
      "  }" +
      "}";

    var body = {
      query: gqlQuery,
      variables: {
        accountId: accountId.toString(),
        input: {
          type: "USER",
          storyId: storyId.toString(),
          text: lastComment
        }
      }
    };

	var apiKey = gs.getProperty('cma_prod_api_key');

    var r = new sn_ws.RESTMessageV2('Update XDR story comments CMA Prod', 'post');
    r.setRequestHeader('Content-Type', 'application/json');
    r.setRequestHeader('Accept', 'application/json');
	r.setRequestHeader('x-api-key', apiKey);
    r.setRequestBody(JSON.stringify(body));
	
    var eccSysId = r.executeAsync();
    gs.info("GraphQL webhook queued, ECC sys_id=" + eccSysId);

    var status = response.getStatusCode();
    var responseBody = response.getBody();

     gs.info("GraphQL webhook: status=" + status);
     gs.info("GraphQL webhook: responseBody=" + responseBody);


  } catch (ex) {
    gs.info("GraphQL webhook: Failed: " + ex.message);
  }

  function stripJournalHeader(text) {
    text = text || '';
    if (text.indexOf('\n') > -1) {
      return text.split('\n').slice(1).join('\n').trim();
    }
    return text.trim();
  }
})(current, previous);
```