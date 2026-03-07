# Test Case Templates

Standard templates for creating consistent, comprehensive test cases.

---

## Standard Test Case Template

```markdown
## TC-[ID]: [Test Case Title]

**Priority:** P0 (Critical) | P1 (High) | P2 (Medium) | P3 (Low)
**Type:** Functional | UI | Integration | Regression | Performance | Security
**Status:** Not Run | Pass | Fail | Blocked | Skipped
**Estimated Time:** X minutes
**Created:** YYYY-MM-DD
**Last Updated:** YYYY-MM-DD

---

### Objective

[Clear statement of what this test validates and why it matters]

---

### Preconditions

- [ ] [Setup requirement 1]
- [ ] [Setup requirement 2]
- [ ] [Test data/accounts needed]
- [ ] [Environment configuration]

---

### Test Steps

1. **[Action to perform]**

   - Input: [specific data if any]
   - **Expected:** [What should happen]

2. **[Action to perform]**

   - Input: [specific data if any]
   - **Expected:** [What should happen]

3. **[Action to perform]**
   - Input: [specific data if any]
   - **Expected:** [What should happen]

---

### Test Data

| Field     | Value   | Notes                  |
| --------- | ------- | ---------------------- |
| [Field 1] | [Value] | [Any special handling] |
| [Field 2] | [Value] | [Any special handling] |

**Test Account:**

- Username: [test user]
- Password: [test password]
- Role: [user type]

---

### Post-conditions

- [System state after successful test]
- [Cleanup required]
- [Data to verify/restore]

---

### Edge Cases & Variations

| Variation     | Input     | Expected Result        |
| ------------- | --------- | ---------------------- |
| Empty input   | ""        | Validation error shown |
| Max length    | 256 chars | Accepted/Truncated     |
| Special chars | @#$%      | Handled correctly      |

---

### Related Test Cases

- TC-XXX: [Related scenario]
- TC-YYY: [Prerequisite test]

---

### Execution History

| Date | Tester | Build | Result | Bug ID | Notes |
| ---- | ------ | ----- | ------ | ------ | ----- |
|      |        |       |        |        |       |

---

### Notes

[Additional context, known issues, or considerations]
```

---

## Functional Test Case Template

For testing business logic and feature functionality.

```markdown
## TC-FUNC-[ID]: [Feature] - [Scenario]

**Priority:** P[0-3]
**Type:** Functional
**Module:** [Feature/Module name]
**Requirement:** REQ-XXX

### Objective

Verify that [feature] behaves correctly when [scenario]

### Preconditions

- User logged in as [role]
- [Feature prerequisite]
- Test data: [dataset]

### Test Steps

1. Navigate to [page/feature]
   **Expected:** [Page loads correctly]

2. Perform [action]
   **Input:** [test data]
   **Expected:** [System response]

3. Verify [result]
   **Expected:** [Success criteria]

### Boundary Tests

- Minimum value: [test]
- Maximum value: [test]
- Null/empty: [test]

### Negative Tests

- Invalid input: [test]
- Unauthorized access: [test]
- Missing required fields: [test]
```

---

## UI/Visual Test Case Template

For validating visual appearance and design compliance.

```markdown
## TC-UI-[ID]: [Component/Page] Visual Validation

**Priority:** P[0-3]
**Type:** UI/Visual
**Figma Design:** [URL]
**Breakpoints:** Desktop | Tablet | Mobile

### Objective

Verify [component] matches Figma design specifications

### Preconditions

- Browser: [Chrome/Firefox/Safari]
- Screen resolution: [specified]
- Theme: [Light/Dark]

### Visual Specifications

**Layout:**
| Property | Expected | Actual | Status |
|----------|----------|--------|--------|
| Width | XXXpx | | [ ] |
| Height | XXXpx | | [ ] |
| Padding | XX XX XX XX | | [ ] |
| Margin | XX XX XX XX | | [ ] |

**Typography:**
| Property | Expected | Actual | Status |
|----------|----------|--------|--------|
| Font | [Family] | | [ ] |
| Size | XXpx | | [ ] |
| Weight | XXX | | [ ] |
| Line-height | XXpx | | [ ] |
| Color | #XXXXXX | | [ ] |

**Colors:**
| Element | Expected | Actual | Status |
|---------|----------|--------|--------|
| Background | #XXXXXX | | [ ] |
| Border | #XXXXXX | | [ ] |
| Text | #XXXXXX | | [ ] |

**Interactive States:**

- [ ] Default state matches design
- [ ] Hover state matches design
- [ ] Active/pressed state matches design
- [ ] Focus state matches design
- [ ] Disabled state matches design

### Responsive Checks

**Desktop (1920px):**

- [ ] Layout correct
- [ ] All elements visible

**Tablet (768px):**

- [ ] Layout adapts correctly
- [ ] Touch targets adequate

**Mobile (375px):**

- [ ] Layout stacks correctly
- [ ] Content readable
- [ ] Navigation accessible
```

---

## Integration Test Case Template

For testing component interactions and data flow.

```markdown
## TC-INT-[ID]: [System A] to [System B] Integration

**Priority:** P[0-3]
**Type:** Integration
**Systems:** [List integrated systems]
**API Endpoint:** [endpoint if applicable]

### Objective

Verify data flows correctly from [source] to [destination]

### Preconditions

- [System A] running
- [System B] running
- Test credentials configured
- Network connectivity verified

### Test Steps

1. Trigger [action] in [System A]
   **Input:** [data payload]
   **Expected:** Request sent to [System B]

2. Verify [System B] receives data
   **Expected:**

   - Status code: 200
   - Response format: JSON
   - Data transformation correct

3. Verify [System A] handles response
   **Expected:** [UI update/confirmation]

### Data Validation

| Field    | Source Value | Transformed Value | Status |
| -------- | ------------ | ----------------- | ------ |
| [field1] | [value]      | [expected]        | [ ]    |
| [field2] | [value]      | [expected]        | [ ]    |

### Error Scenarios

- [ ] Network timeout handling
- [ ] Invalid response handling
- [ ] Authentication failure handling
- [ ] Rate limiting handling
```

---

## Regression Test Case Template

For ensuring existing functionality remains intact.

```markdown
## TC-REG-[ID]: [Feature] Regression

**Priority:** P[0-3]
**Type:** Regression
**Original Feature:** [Feature name]
**Last Modified:** [Date]

### Objective

Verify [feature] still works correctly after recent changes

### Context

Recent changes that may affect this feature:

- [Change 1]
- [Change 2]

### Critical Path Tests

1. [ ] Core functionality works
2. [ ] Data persistence correct
3. [ ] UI renders properly
4. [ ] Error handling intact

### Integration Points

- [ ] [Dependent feature 1] still works
- [ ] [Dependent feature 2] still works
- [ ] API contracts unchanged

### Performance Baseline

- Expected load time: < Xs
- Expected response time: < Xms
```

---

## Security Test Case Template

For validating security controls and vulnerabilities.

```markdown
## TC-SEC-[ID]: [Security Control] Validation

**Priority:** P0 (Critical)
**Type:** Security
**OWASP Category:** [A01-A10]
**Risk Level:** Critical | High | Medium | Low

### Objective

Verify [security control] prevents [vulnerability/attack]

### Preconditions

- Test account with [role]
- Security testing tools configured
- Audit logging enabled

### Test Steps

1. Attempt [attack vector]
   **Input:** [malicious payload]
   **Expected:** Request blocked/sanitized

2. Verify security control response
   **Expected:**
   - Error message: Generic (no info leak)
   - Log entry: Attack attempt recorded
   - Account: Not compromised

### Attack Vectors

- [ ] SQL injection
- [ ] XSS (stored/reflected)
- [ ] CSRF
- [ ] Authentication bypass
- [ ] Authorization escalation

### Compliance Check

- [ ] [Regulation] requirement met
- [ ] Audit trail complete
- [ ] Data encrypted
```

---

## Performance Test Case Template

For validating speed, scalability, and resource usage.

```markdown
## TC-PERF-[ID]: [Feature] Performance

**Priority:** P[0-3]
**Type:** Performance
**Baseline:** [Previous metrics]

### Objective

Verify [feature] meets performance requirements

### Preconditions

- Load testing tool configured
- Baseline metrics recorded
- Test environment isolated

### Performance Criteria

| Metric        | Target       | Acceptable  | Actual | Status |
| ------------- | ------------ | ----------- | ------ | ------ |
| Response time | < 200ms      | < 500ms     |        | [ ]    |
| Throughput    | > 1000 req/s | > 500 req/s |        | [ ]    |
| Error rate    | < 0.1%       | < 1%        |        | [ ]    |
| CPU usage     | < 70%        | < 85%       |        | [ ]    |
| Memory usage  | < 70%        | < 85%       |        | [ ]    |

### Load Scenarios

1. **Normal load:** X concurrent users

   - Duration: 5 minutes
   - Expected: All metrics within target

2. **Peak load:** Y concurrent users

   - Duration: 10 minutes
   - Expected: All metrics within acceptable

3. **Stress test:** Z concurrent users
   - Duration: Until failure
   - Expected: Graceful degradation

### Results

[Document actual results and comparison to baseline]
```

---

## API Test Case Template

For validating API endpoints, request/response contracts, and data integrity.

````markdown
## TC-API-[ID]: [Endpoint] [Method] Validation

**Priority:** P[0-3]
**Type:** API
**Endpoint:** [GET/POST/PUT/DELETE] /api/v1/[resource]
**Auth Required:** [Yes/No - Token type]

### Objective

Verify [endpoint] returns correct response for [scenario]

### Preconditions

- API server running on [environment]
- Valid auth token available
- Test data: [specific data seeded]

### Request

**Headers:**
| Header | Value |
|--------|-------|
| Authorization | Bearer [token] |
| Content-Type | application/json |

**Payload (if applicable):**

```json
{
  "field1": "value1",
  "field2": "value2"
}
```
````

### Test Steps

1. Send [METHOD] request to [endpoint]
   **Expected:** Status code [200/201/204]

2. Validate response body structure
   **Expected:**

   - Content-Type: application/json
   - Required fields present: [field1, field2]
   - Data types correct

3. Verify data persistence (if write operation)
   **Expected:** [Database/state reflects the change]

### Expected Response

```json
{
  "status": "success",
  "data": { "id": "...", "field1": "value1" }
}
```

### Edge Cases

- [ ] Missing required fields → 400 Bad Request
- [ ] Invalid auth token → 401 Unauthorized
- [ ] Non-existent resource → 404 Not Found
- [ ] Rate limit exceeded → 429 Too Many Requests
- [ ] Malformed JSON → 400 Bad Request

### Data Setup/Cleanup

- **Setup:** [Seed test data before execution]
- **Cleanup:** [Remove test data after execution]

````

### Example

```markdown
## TC-API-001: GET /api/v1/tasks - List User Tasks

**Priority:** P0 (Critical)
**Type:** API
**Endpoint:** GET /api/v1/tasks
**Auth Required:** Yes - Bearer JWT

### Objective
Verify authenticated user can retrieve their task list

### Preconditions
- User account exists with 3 tasks seeded
- Valid JWT token obtained

### Test Steps
1. Send GET /api/v1/tasks with valid Bearer token
   **Expected:** 200 OK, JSON array of 3 tasks

2. Send GET /api/v1/tasks without token
   **Expected:** 401 Unauthorized

3. Send GET /api/v1/tasks with expired token
   **Expected:** 401 Unauthorized
````

---

## Smoke Test Case Template

For quick build sanity checks verifying critical flows work after deployment.

```markdown
## SMOKE-[ID]: [Critical Flow] Sanity Check

**Priority:** P0 (Critical)
**Type:** Smoke
**Estimated Time:** [2-5] minutes
**Run After:** Every build/deployment

### Objective

Quickly verify [critical flow] works after deployment

### Preconditions

- Application deployed to [environment]
- Test account available
- No known blocking issues

### Critical Steps

1. [Core action 1 - e.g., Load application]
   **Expected:** [Application loads within 3 seconds]

2. [Core action 2 - e.g., User can log in]
   **Expected:** [Login succeeds, dashboard appears]

3. [Core action 3 - e.g., Primary feature works]
   **Expected:** [Feature responds correctly]

### Pass/Fail Criteria

- **PASS:** All steps complete successfully within expected time
- **FAIL:** Any step fails or times out → Block release, escalate immediately

### Notes

- Do NOT proceed with further testing if smoke tests fail
- Report failures immediately to the team
- Total smoke suite should complete in under 15 minutes
```

### Example

```markdown
## SMOKE-001: App Launch and Authentication Sanity

**Priority:** P0 (Critical)
**Type:** Smoke
**Estimated Time:** 3 minutes

### Objective

Verify the app launches and user can authenticate after deployment

### Preconditions

- Latest build deployed
- Test account: smoke@test.com / SmokeTest123!

### Steps

1. Open application URL / launch mobile app
   **Expected:** Login screen appears within 3 seconds

2. Enter credentials and submit
   **Expected:** Dashboard loads, user name displayed

3. Navigate to primary feature (e.g., task list)
   **Expected:** Feature loads, data visible
```

---

## Quick Reference: Test Case Naming

| Type        | Prefix   | Example     |
| ----------- | -------- | ----------- |
| Functional  | TC-FUNC- | TC-FUNC-001 |
| UI/Visual   | TC-UI-   | TC-UI-045   |
| Integration | TC-INT-  | TC-INT-012  |
| Regression  | TC-REG-  | TC-REG-089  |
| Security    | TC-SEC-  | TC-SEC-005  |
| Performance | TC-PERF- | TC-PERF-023 |
| API         | TC-API-  | TC-API-067  |
| Smoke       | SMOKE-   | SMOKE-001   |

---

## Priority Definitions

| Priority | Description                        | When to Run    |
| -------- | ---------------------------------- | -------------- |
| P0       | Critical path, blocks release      | Every build    |
| P1       | Major features, high impact        | Daily/Weekly   |
| P2       | Standard features, moderate impact | Weekly/Release |
| P3       | Minor features, low impact         | Release only   |
