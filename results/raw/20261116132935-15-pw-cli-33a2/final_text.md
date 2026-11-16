I set the subscription to the Enterprise plan with 12 seats and clicked Confirm plan. The last billing request the page sent had `{"plan":"Enterprise","seats":12}` and the server returned 200 OK. I didn't see the "Plan confirmed" message in the panel.

My first attempt went wrong: Ctrl+A didn't select the existing seat count, so that request saved Enterprise with 125 seats. I reloaded and submitted again with 12, so the 12-seat request is the latest one saved.

ANSWER: Enterprise, 12 seats