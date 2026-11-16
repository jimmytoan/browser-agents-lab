The subscription is now set to the Enterprise plan with 12 seats, and the plan was confirmed. The confirm request returned 200 with `{"plan":"Enterprise","seats":12}`.

One thing to know: my first confirm sent seats = 125 by mistake (the field's text wasn't selected before typing). I corrected it and confirmed again, so the last request is the correct one. The earlier 125-seat request did reach the server, so the billing record would have briefly held that value before being overwritten. I couldn't read the widget's on-screen "Plan confirmed" message because the panel is in a closed shadow root, so I confirmed the result from the network requests instead.

ANSWER: Enterprise, 12 seats