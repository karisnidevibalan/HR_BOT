# HR Agent – Core Test Cases

## Policy Q&A
1. Holiday – "Is 25 Dec a holiday?" → Answer from Holiday file.
2. Leave policy – "What is casual leave policy?" → Exact policy summary.

## Leave & WFH
3. "Apply casual leave tomorrow" → asks for reason, confirms, creates Pending record.
4. "WFH on Friday" → parses date, asks for reason, confirms.

## Validation
5. "Leave yesterday" → reject past date.
6. "Leave on 32nd" → invalid date message.
7. "Leave 20th, I already have leave that week" → detect overlap.
8. "Leave on company holiday" → holiday warning/decision.

## Flows
9. Confirm → record created.
10. Edit → change reason/dates, then confirm.
11. Cancel → do not create record.

## Status / Misc
12. "What is my leave status?" → fetch latest request.
13. Salesforce error → show friendly retry message.
