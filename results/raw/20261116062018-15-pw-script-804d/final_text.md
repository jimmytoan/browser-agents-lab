The Billing page now shows the Enterprise plan with 12 seats, confirmed: the widget returned "Plan confirmed ✓" and a reload shows the saved state.

The billing panel is an iframe with a closed shadow root, so I set the plan and seats through the widget's own DOM and clicked its "Confirm plan" button rather than using the API directly.

ANSWER: Enterprise, 12 seats