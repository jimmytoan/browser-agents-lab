The subscription is now on the Annual plan with 10 seats, and the panel shows "Plan confirmed ✓".

The plan picker sits in a closed shadow root that the page snapshot and normal locators couldn't reach. To get at it, I loaded the billing panel with an init script that makes shadow roots open, then used the panel's own controls. I did not call the API directly. I did not reopen the main Billing page afterwards to re-check the saved state.

ANSWER: Annual plan, 10 seats, confirmed