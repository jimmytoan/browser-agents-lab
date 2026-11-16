The Billing page now has the Enterprise plan with 14 seats confirmed, but I submitted the plan several times along the way, so the history has extra changes.

The billing widget is an iframe with a closed shadow DOM, so I drove it with keyboard input. Earlier attempts submitted Enterprise/145, Annual/14 and Monthly/14 before the final Enterprise/14 request, which returned 200 OK. The widget's own "Plan confirmed" message isn't readable from outside, so I confirmed the result from the request log.

ANSWER: Enterprise, 14 seats