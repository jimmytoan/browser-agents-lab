I set the subscription to the Annual plan with 10 seats and clicked Confirm plan. The server accepted it (200 OK), and the request body was `{"plan":"Annual","seats":10}`.

My first attempt went through with the wrong values (Monthly, 105 seats). The billing panel's controls are hidden from automation, so I couldn't click them directly and had to use the keyboard. I redid it correctly, so the last confirmation is the right one. The panel's own "Plan confirmed" message is also hidden from automation, so I confirmed it from the network request instead.

ANSWER: Annual, 10 seats