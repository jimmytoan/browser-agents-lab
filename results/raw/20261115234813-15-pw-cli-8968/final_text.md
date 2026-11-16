The Billing subscription is now on the Enterprise plan with 8 seats, and the final confirm request returned 200 with `{"plan":"Enterprise","seats":8}`.

Along the way I sent two wrong confirmations: one with Enterprise and 85 seats, and one with Annual and 8 seats. The final confirmation overwrote both, but the billing history will show them. The widget's closed shadow DOM meant I had to drive it by keyboard, so I couldn't read its "Plan confirmed" message to verify the result on screen.

ANSWER: Enterprise, 8 seats