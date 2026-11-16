The Pipeline stages are now in the required order (Invoicing, Picking, Quality check, Credit check, Intake, Packing, Shipping), and I clicked "Save order". After a page reload the new order was still in place, so the save held.

I moved Invoicing to the top, then moved Packing down to just above Shipping. The first drag attempts failed on stale snapshot refs, so I used locator-based drags instead.

ANSWER: Invoicing, Picking, Quality check, Credit check, Intake, Packing, Shipping