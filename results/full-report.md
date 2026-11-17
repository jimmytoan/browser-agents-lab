(excluded 61 runs that ended in a harness/provider error)

## By approach and model (1200 runs)

| Approach | Model | n | Success | Cost/run | Cost per success | Median calls | Median input tok | Median output tok | Median time | Stops other than done |
|---|---|---|---|---|---|---|---|---|---|---|
| cua | claude-haiku-5-5 | 75 | 74/75 | $0.0039 | $0.0040 | 8 | 82700 | 1135 | 25s | – |
| cua | claude-sonnet-5-5 | 45 | 45/45 | $0.0654 | $0.0654 | 8 | 80315 | 876 | 21s | – |
| cua | gpt-6-luna | 75 | 74/75 | $0.0016 | $0.0016 | 7 | 34418 | 438 | 27s | – |
| cua | gpt-6.1-sol | 45 | 44/45 | $0.0415 | $0.0424 | 7 | 43753 | 329 | 26s | – |
| mcp | claude-haiku-5-5 | 75 | 72/75 | $0.0046 | $0.0048 | 9 | 116365 | 1373 | 17s | – |
| mcp | claude-sonnet-5-5 | 45 | 45/45 | $0.0577 | $0.0577 | 11 | 117067 | 985 | 20s | – |
| mcp | gpt-6-luna | 75 | 73/75 | $0.0023 | $0.0024 | 15 | 99179 | 535 | 48s | – |
| mcp | gpt-6.1-sol | 45 | 45/45 | $0.0250 | $0.0250 | 15 | 81326 | 367 | 47s | – |
| pw-cli | claude-haiku-5-5 | 75 | 73/75 | $0.0042 | $0.0043 | 10 | 122010 | 1490 | 26s | – |
| pw-cli | claude-sonnet-5-5 | 45 | 45/45 | $0.0458 | $0.0458 | 8 | 72014 | 850 | 20s | – |
| pw-cli | gpt-6-luna | 75 | 66/75 | $0.0024 | $0.0027 | 14 | 107960 | 553 | 45s | – |
| pw-cli | gpt-6.1-sol | 45 | 45/45 | $0.0252 | $0.0252 | 10 | 74716 | 369 | 36s | – |
| pw-script | claude-haiku-5-5 | 75 | 73/75 | $0.0020 | $0.0021 | 5 | 18977 | 1485 | 17s | – |
| pw-script | claude-sonnet-5-5 | 45 | 42/45 | $0.0298 | $0.0319 | 6 | 18319 | 1379 | 107s | wall_clock x1 |
| pw-script | gpt-6-luna | 75 | 69/75 | $0.0019 | $0.0021 | 9 | 16913 | 1807 | 42s | – |
| pw-script | gpt-6.1-sol | 45 | 40/45 | $0.0201 | $0.0226 | 6 | 11181 | 925 | 33s | wall_clock x1 |
| stagehand | claude-haiku-5-5 | 75 | 52/75 | $0.0112 | $0.0162 | 14 | 97986 | 6533 | 77s | max_calls x1 |
| stagehand | claude-sonnet-5-5 | 45 | 32/45 | $0.1484 | $0.2087 | 11 | 62154 | 2561 | 59s | wall_clock x1 |
| stagehand | gpt-6-luna | 75 | 54/75 | $0.0061 | $0.0085 | 18 | 59767 | 2743 | 105s | wall_clock x4, max_calls x2 |
| stagehand | gpt-6.1-sol | 45 | 34/45 | $0.0816 | $0.1080 | 16 | 46123 | 1434 | 96s | – |

## Per task (passes/n · median cost)

| Task | cua · claude-haiku-5-5 | cua · claude-sonnet-5-5 | cua · gpt-6-luna | cua · gpt-6.1-sol | mcp · claude-haiku-5-5 | mcp · claude-sonnet-5-5 | mcp · gpt-6-luna | mcp · gpt-6.1-sol | pw-cli · claude-haiku-5-5 | pw-cli · claude-sonnet-5-5 | pw-cli · gpt-6-luna | pw-cli · gpt-6.1-sol | pw-script · claude-haiku-5-5 | pw-script · claude-sonnet-5-5 | pw-script · gpt-6-luna | pw-script · gpt-6.1-sol | stagehand · claude-haiku-5-5 | stagehand · claude-sonnet-5-5 | stagehand · gpt-6-luna | stagehand · gpt-6.1-sol |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 01_login_read | 5/5 · $0.0018 | 3/3 · $0.0352 | 5/5 · $0.0005 | 3/3 · $0.0116 | 5/5 · $0.0018 | 3/3 · $0.0311 | 4/5 · $0.0004 | 3/3 · $0.0065 | 5/5 · $0.0014 | 3/3 · $0.0288 | 2/5 · $0.0004 | 3/3 · $0.0085 | 5/5 · $0.0009 | 3/3 · $0.0066 | 5/5 · $0.0007 | 3/3 · $0.0141 | 5/5 · $0.0031 | 3/3 · $0.0433 | 5/5 · $0.0012 | 3/3 · $0.0220 |
| 02_wizard | 5/5 · $0.0048 | 3/3 · $0.0773 | 5/5 · $0.0019 | 3/3 · $0.0364 | 5/5 · $0.0040 | 3/3 · $0.0554 | 5/5 · $0.0023 | 3/3 · $0.0316 | 5/5 · $0.0040 | 3/3 · $0.0425 | 5/5 · $0.0020 | 3/3 · $0.0262 | 3/5 · $0.0026 | 3/3 · $0.0267 | 5/5 · $0.0020 | 3/3 · $0.0184 | 4/5 · $0.0243 | 3/3 · $0.2053 | 5/5 · $0.0087 | 3/3 · $0.1268 |
| 03_search_filter | 5/5 · $0.0039 | 3/3 · $0.0724 | 5/5 · $0.0013 | 3/3 · $0.0265 | 5/5 · $0.0043 | 3/3 · $0.0564 | 5/5 · $0.0018 | 3/3 · $0.0267 | 5/5 · $0.0034 | 3/3 · $0.0396 | 5/5 · $0.0018 | 3/3 · $0.0255 | 5/5 · $0.0022 | 3/3 · $0.0384 | 5/5 · $0.0017 | 3/3 · $0.0174 | 5/5 · $0.0079 | 3/3 · $0.0997 | 5/5 · $0.0039 | 3/3 · $0.0731 |
| 04_table_edit | 5/5 · $0.0039 | 3/3 · $0.0601 | 5/5 · $0.0019 | 3/3 · $0.0271 | 5/5 · $0.0058 | 3/3 · $0.0480 | 5/5 · $0.0028 | 3/3 · $0.0182 | 5/5 · $0.0032 | 3/3 · $0.0301 | 5/5 · $0.0027 | 3/3 · $0.0287 | 5/5 · $0.0019 | 3/3 · $0.0258 | 5/5 · $0.0012 | 3/3 · $0.0155 | 5/5 · $0.0102 | 3/3 · $0.1531 | 5/5 · $0.0066 | 3/3 · $0.1143 |
| 05_datepicker_dropdown | 5/5 · $0.0038 | 3/3 · $0.0661 | 5/5 · $0.0016 | 3/3 · $0.0269 | 5/5 · $0.0046 | 3/3 · $0.0705 | 5/5 · $0.0032 | 3/3 · $0.0321 | 5/5 · $0.0039 | 3/3 · $0.0477 | 5/5 · $0.0029 | 3/3 · $0.0247 | 5/5 · $0.0019 | 3/3 · $0.0239 | 5/5 · $0.0023 | 3/3 · $0.0238 | 4/5 · $0.0108 | 3/3 · $0.1391 | 5/5 · $0.0075 | 3/3 · $0.0911 |
| 06_upload | 5/5 · $0.0039 | 3/3 · $0.0747 | 5/5 · $0.0018 | 3/3 · $0.0309 | 5/5 · $0.0042 | 3/3 · $0.0506 | 5/5 · $0.0018 | 3/3 · $0.0240 | 5/5 · $0.0037 | 3/3 · $0.0472 | 5/5 · $0.0019 | 3/3 · $0.0225 | 5/5 · $0.0013 | 3/3 · $0.0184 | 5/5 · $0.0012 | 2/3 · $0.0127 | 0/5 · $0.0054 | 0/3 · $0.0765 | 0/5 · $0.0041 | 0/3 · $0.0541 |
| 07_modal_toast | 5/5 · $0.0041 | 3/3 · $0.0624 | 5/5 · $0.0013 | 3/3 · $0.0228 | 5/5 · $0.0045 | 3/3 · $0.0661 | 4/5 · $0.0018 | 3/3 · $0.0245 | 5/5 · $0.0045 | 3/3 · $0.0417 | 4/5 · $0.0018 | 3/3 · $0.0247 | 5/5 · $0.0013 | 0/3 · $0.0490 | 0/5 · $0.0031 | 0/3 · $0.0241 | 5/5 · $0.0100 | 3/3 · $0.1007 | 4/5 · $0.0048 | 3/3 · $0.0731 |
| 08_iframe_shadow | 5/5 · $0.0029 | 3/3 · $0.0498 | 5/5 · $0.0009 | 3/3 · $0.0159 | 5/5 · $0.0027 | 3/3 · $0.0391 | 5/5 · $0.0012 | 3/3 · $0.0150 | 5/5 · $0.0024 | 3/3 · $0.0290 | 5/5 · $0.0008 | 3/3 · $0.0140 | 5/5 · $0.0014 | 3/3 · $0.0280 | 5/5 · $0.0015 | 3/3 · $0.0216 | 5/5 · $0.0038 | 3/3 · $0.0629 | 5/5 · $0.0024 | 3/3 · $0.0465 |
| 09_drag_reorder | 5/5 · $0.0037 | 3/3 · $0.0610 | 5/5 · $0.0014 | 3/3 · $0.0226 | 5/5 · $0.0042 | 3/3 · $0.0568 | 5/5 · $0.0016 | 3/3 · $0.0211 | 5/5 · $0.0037 | 3/3 · $0.0407 | 5/5 · $0.0020 | 3/3 · $0.0209 | 5/5 · $0.0018 | 3/3 · $0.0204 | 5/5 · $0.0015 | 3/3 · $0.0162 | 4/5 · $0.0150 | 3/3 · $0.1310 | 4/5 · $0.0086 | 3/3 · $0.1042 |
| 10_layout_shift | 5/5 · $0.0029 | 3/3 · $0.0532 | 5/5 · $0.0011 | 3/3 · $0.0187 | 4/5 · $0.0047 | 3/3 · $0.0585 | 5/5 · $0.0016 | 3/3 · $0.0229 | 4/5 · $0.0033 | 3/3 · $0.0464 | 4/5 · $0.0018 | 3/3 · $0.0233 | 5/5 · $0.0015 | 3/3 · $0.0230 | 5/5 · $0.0014 | 3/3 · $0.0186 | 1/5 · $0.0124 | 1/3 · $0.4038 | 2/5 · $0.0096 | 1/3 · $0.1001 |
| 11_canvas_map | 5/5 · $0.0032 | 3/3 · $0.0589 | 5/5 · $0.0013 | 3/3 · $0.0223 | 5/5 · $0.0041 | 3/3 · $0.0512 | 5/5 · $0.0021 | 3/3 · $0.0216 | 5/5 · $0.0047 | 3/3 · $0.0499 | 5/5 · $0.0041 | 3/3 · $0.0232 | 5/5 · $0.0014 | 3/3 · $0.0315 | 5/5 · $0.0014 | 2/3 · $0.0159 | 0/5 · $0.0084 | 0/3 · $0.1365 | 0/5 · $0.0065 | 0/3 · $0.0500 |
| 12_hover_slider | 5/5 · $0.0042 | 3/3 · $0.0713 | 5/5 · $0.0016 | 3/3 · $0.0266 | 5/5 · $0.0061 | 3/3 · $0.0747 | 5/5 · $0.0026 | 3/3 · $0.0312 | 5/5 · $0.0041 | 3/3 · $0.0549 | 5/5 · $0.0026 | 3/3 · $0.0309 | 5/5 · $0.0020 | 3/3 · $0.0391 | 5/5 · $0.0020 | 3/3 · $0.0221 | 0/5 · $0.0173 | 0/3 · $0.4261 | 0/5 · $0.0131 | 0/3 · $0.1294 |
| 13_bulk_policy | 5/5 · $0.0083 | 3/3 · $0.0871 | 5/5 · $0.0037 | 3/3 · $0.0506 | 3/5 · $0.0115 | 3/3 · $0.0903 | 5/5 · $0.0042 | 3/3 · $0.0463 | 4/5 · $0.0073 | 3/3 · $0.0713 | 3/5 · $0.0039 | 3/3 · $0.0390 | 5/5 · $0.0032 | 3/3 · $0.0284 | 5/5 · $0.0022 | 3/3 · $0.0239 | 4/5 · $0.0198 | 1/3 · $0.1892 | 5/5 · $0.0087 | 3/3 · $0.1286 |
| 14_transient_key | 4/5 · $0.0039 | 3/3 · $0.0685 | 4/5 · $0.0014 | 2/3 · $0.0230 | 5/5 · $0.0032 | 3/3 · $0.0454 | 5/5 · $0.0015 | 3/3 · $0.0210 | 5/5 · $0.0031 | 3/3 · $0.0354 | 5/5 · $0.0014 | 3/3 · $0.0171 | 5/5 · $0.0016 | 3/3 · $0.0274 | 5/5 · $0.0015 | 3/3 · $0.0244 | 5/5 · $0.0055 | 3/3 · $0.0683 | 5/5 · $0.0034 | 3/3 · $0.0519 |
| 15_closed_shadow | 5/5 · $0.0029 | 3/3 · $0.0483 | 5/5 · $0.0009 | 3/3 · $0.0193 | 5/5 · $0.0042 | 3/3 · $0.0663 | 5/5 · $0.0033 | 3/3 · $0.0301 | 5/5 · $0.0060 | 3/3 · $0.0697 | 3/5 · $0.0043 | 3/3 · $0.0405 | 5/5 · $0.0060 | 3/3 · $0.0581 | 4/5 · $0.0055 | 3/3 · $0.0240 | 5/5 · $0.0043 | 3/3 · $0.0642 | 4/5 · $0.0026 | 3/3 · $0.0455 |

## Failures

- 20261116034943-02-pw-script-9e98 02_wizard pw-script claude-haiku-5-5: done; 2 suppliers created
- 20261116035128-02-stagehand-dd42 02_wizard stagehand claude-haiku-5-5: max_calls; 0 suppliers created
- 20261116040621-06-stagehand-f51b 06_upload stagehand claude-haiku-5-5: done; 0 documents uploaded
- 20261116041902-11-stagehand-39b5 11_canvas_map stagehand claude-haiku-5-5: done; assignments {}
- 20261116042216-12-stagehand-6a82 12_hover_slider stagehand claude-haiku-5-5: done; discounts {}
- 20261116045056-05-stagehand-ff2f 05_datepicker_dropdown stagehand claude-haiku-5-5: done; 0 bookings
- 20261116045558-06-stagehand-ec32 06_upload stagehand claude-haiku-5-5: done; 0 documents uploaded
- 20261116050245-09-stagehand-e574 09_drag_reorder stagehand claude-haiku-5-5: done; saved=false order=Picking, Quality check, Packing, Credit check, Intake, Invoicing, Shipping
- 20261116050609-10-stagehand-8a0c 10_layout_shift stagehand claude-haiku-5-5: done; wrong: Elin Fors=Pending, Maria Sund=Pending
- 20261116050912-11-stagehand-5ac0 11_canvas_map stagehand claude-haiku-5-5: done; assignments {}
- 20261116051224-12-stagehand-c7fc 12_hover_slider stagehand claude-haiku-5-5: done; discounts {}
- 20261116051425-13-mcp-48de 13_bulk_policy mcp claude-haiku-5-5: done; 1 wrong, e.g. RF-5259=Approved (want Rejected)
- 20261116054624-06-stagehand-960f 06_upload stagehand claude-haiku-5-5: done; 0 documents uploaded
- 20261116055530-10-mcp-fe18 10_layout_shift mcp claude-haiku-5-5: done; wrong: Elin Fors=Rejected
- 20261116055548-10-pw-cli-0a29 10_layout_shift pw-cli claude-haiku-5-5: done; wrong: Elin Fors=Rejected
- 20261116055650-10-stagehand-7115 10_layout_shift stagehand claude-haiku-5-5: done; wrong: Per Åberg=Pending, Elin Fors=Pending
- 20261116060052-11-stagehand-91a3 11_canvas_map stagehand claude-haiku-5-5: done; assignments {}
- 20261116060333-12-stagehand-3edf 12_hover_slider stagehand claude-haiku-5-5: done; discounts {"P-1048":0}
- 20261116062445-02-pw-script-94d3 02_wizard pw-script claude-haiku-5-5: done; 2 suppliers created
- 20261116064010-06-stagehand-9162 06_upload stagehand claude-haiku-5-5: done; 0 documents uploaded
- 20261116065114-10-stagehand-0eec 10_layout_shift stagehand claude-haiku-5-5: done; wrong: Tomas Rask=Pending, Lena Strid=Pending
- 20261116065434-11-stagehand-51b7 11_canvas_map stagehand claude-haiku-5-5: done; assignments {}
- 20261116065906-12-stagehand-0b02 12_hover_slider stagehand claude-haiku-5-5: done; discounts {}
- 20261116073210-06-stagehand-3388 06_upload stagehand claude-haiku-5-5: done; 0 documents uploaded
- 20261116074417-10-stagehand-2310 10_layout_shift stagehand claude-haiku-5-5: done; wrong: Karin Lund=Approved
- 20261116074736-11-stagehand-da59 11_canvas_map stagehand claude-haiku-5-5: done; assignments {}
- 20261116075047-12-stagehand-df93 12_hover_slider stagehand claude-haiku-5-5: done; discounts {}
- 20261116075335-13-mcp-c7aa 13_bulk_policy mcp claude-haiku-5-5: done; 1 wrong, e.g. RF-57115=Rejected (want Approved)
- 20261116075433-13-pw-cli-b17f 13_bulk_policy pw-cli claude-haiku-5-5: done; 2 wrong, e.g. RF-61219=Rejected (want Approved), RF-24521=Rejected (want Approved)
- 20261116075725-13-stagehand-aa34 13_bulk_policy stagehand claude-haiku-5-5: done; 1 wrong, e.g. RF-24521=Rejected (want Approved)
- 20261116080037-14-cua-73aa 14_transient_key cua claude-haiku-5-5: done; secret "" != key "H5JG-W5SO-ZZF0-6D5V" (generated 1)
- 20261116082930-06-stagehand-af59 06_upload stagehand claude-sonnet-5-5: done; 0 documents uploaded
- 20261116083112-07-pw-script-e404 07_modal_toast pw-script claude-sonnet-5-5: wall_clock; archived but answer "" lacks ARC-7CEFEA
- 20261116084916-11-stagehand-ce63 11_canvas_map stagehand claude-sonnet-5-5: done; assignments {}
- 20261116085356-12-stagehand-c388 12_hover_slider stagehand claude-sonnet-5-5: done; discounts {}
- 20261116093723-06-stagehand-a4b9 06_upload stagehand claude-sonnet-5-5: done; 0 documents uploaded
- 20261116093846-07-pw-script-5631 07_modal_toast pw-script claude-sonnet-5-5: done; archived but answer "" lacks ARC-39353C
- 20261116094906-10-stagehand-d467 10_layout_shift stagehand claude-sonnet-5-5: done; wrong: Elin Fors=Pending, Maria Sund=Pending
- 20261116095600-11-stagehand-fa10 11_canvas_map stagehand claude-sonnet-5-5: done; assignments {}
- 20261116100043-12-stagehand-58c0 12_hover_slider stagehand claude-sonnet-5-5: done; discounts {}
- 20261116100839-13-stagehand-f456 13_bulk_policy stagehand claude-sonnet-5-5: done; 8 wrong, e.g. RF-2420=Pending (want Approved), RF-3827=Pending (want Rejected), RF-5259=Pending (want Rejected)
- 20261116124345-06-stagehand-3765 06_upload stagehand claude-sonnet-5-5: done; 0 documents uploaded
- 20261116124501-07-pw-script-d688 07_modal_toast pw-script claude-sonnet-5-5: done; archived but answer "unavailable" lacks ARC-07E9DD
- 20261116125833-10-stagehand-6235 10_layout_shift stagehand claude-sonnet-5-5: done; wrong: Per Åberg=Pending, Elin Fors=Pending
- 20261116130350-11-stagehand-b465 11_canvas_map stagehand claude-sonnet-5-5: done; assignments {}
- 20261116130928-12-stagehand-8a25 12_hover_slider stagehand claude-sonnet-5-5: done; discounts {}
- 20261116131824-13-stagehand-7d72 13_bulk_policy stagehand claude-sonnet-5-5: wall_clock; 5 wrong, e.g. RF-20717=Pending (want Rejected), RF-19818=Pending (want Approved), RF-94120=Pending (want Rejected)
- 20261116142041-01-mcp-5d1d 01_login_read mcp gpt-6-luna: done; answer "" != 40612
- 20261116144706-06-stagehand-ea83 06_upload stagehand gpt-6-luna: done; 0 documents uploaded
- 20261116144843-07-mcp-9c75 07_modal_toast mcp gpt-6-luna: done; archived but answer "" lacks ARC-7CEFEA
- 20261116144920-07-pw-cli-b577 07_modal_toast pw-cli gpt-6-luna: done; archived but answer "" lacks ARC-7CEFEA
- 20261116144956-07-pw-script-ef51 07_modal_toast pw-script gpt-6-luna: done; archived but answer "unavailable" lacks ARC-7CEFEA
- 20261116150117-10-pw-cli-1315 10_layout_shift pw-cli gpt-6-luna: done; wrong: Anna Lindqvist=Approved
- 20261116150736-11-stagehand-889b 11_canvas_map stagehand gpt-6-luna: done; assignments {}
- 20261116151421-12-stagehand-6e74 12_hover_slider stagehand gpt-6-luna: wall_clock; discounts {}
- 20261116153306-15-pw-cli-bb8d 15_closed_shadow pw-cli gpt-6-luna: done; billing {"plan":"Annual","seats":215,"confirmed":true}
- 20261116160739-06-stagehand-7599 06_upload stagehand gpt-6-luna: done; 0 documents uploaded
- 20261116161044-07-pw-script-bde5 07_modal_toast pw-script gpt-6-luna: done; archived but answer "unavailable" lacks ARC-39353C
- 20261116161548-07-stagehand-965e 07_modal_toast stagehand gpt-6-luna: done; archived but answer "" lacks ARC-39353C
- 20261116162406-09-stagehand-268b 09_drag_reorder stagehand gpt-6-luna: wall_clock; saved=false order=Picking, Quality check, Packing, Credit check, Intake, Invoicing, Shipping
- 20261116163131-10-stagehand-2a06 10_layout_shift stagehand gpt-6-luna: done; wrong: Elin Fors=Pending, Maria Sund=Pending
- 20261116163849-11-stagehand-054a 11_canvas_map stagehand gpt-6-luna: done; assignments {}
- 20261116164613-12-stagehand-ed3a 12_hover_slider stagehand gpt-6-luna: wall_clock; discounts {}
- 20261116171137-01-pw-cli-4b78 01_login_read pw-cli gpt-6-luna: done; answer "" != 36533
- 20261116173742-06-stagehand-d1de 06_upload stagehand gpt-6-luna: done; 0 documents uploaded
- 20261116174039-07-pw-script-1ee4 07_modal_toast pw-script gpt-6-luna: done; archived but answer "" lacks ARC-07E9DD
- 20261116175545-10-stagehand-d348 10_layout_shift stagehand gpt-6-luna: done; wrong: Per Åberg=Pending, Elin Fors=Pending
- 20261116180232-11-stagehand-4ea1 11_canvas_map stagehand gpt-6-luna: done; assignments {}
- 20261116180926-12-stagehand-46be 12_hover_slider stagehand gpt-6-luna: wall_clock; discounts {}
- 20261116181629-13-pw-cli-bc53 13_bulk_policy pw-cli gpt-6-luna: done; 1 wrong, e.g. RF-37923=Pending (want Rejected)
- 20261116183719-01-pw-cli-5256 01_login_read pw-cli gpt-6-luna: done; answer "" != 77448
- 20261116190324-06-stagehand-dc17 06_upload stagehand gpt-6-luna: done; 0 documents uploaded
- 20261116190611-07-pw-script-9cf8 07_modal_toast pw-script gpt-6-luna: done; archived but answer "" lacks ARC-DE10B7
- 20261116192243-10-stagehand-4678 10_layout_shift stagehand gpt-6-luna: done; wrong: Tomas Rask=Pending, Lena Strid=Pending
- 20261116193033-11-stagehand-4df2 11_canvas_map stagehand gpt-6-luna: done; assignments {}
- 20261116193625-12-stagehand-64da 12_hover_slider stagehand gpt-6-luna: max_calls; discounts {}
- 20261116195223-14-cua-8b62 14_transient_key cua gpt-6-luna: done; secret "JMW9-964C-FCTC-06CS" != key "JMW9-964C-FCTC-O6CS" (generated 1)
- 20261116200106-01-pw-cli-4c15 01_login_read pw-cli gpt-6-luna: done; answer "" != 14989
- 20261116202728-06-stagehand-a4ba 06_upload stagehand gpt-6-luna: done; 0 documents uploaded
- 20261116203015-07-pw-script-ea48 07_modal_toast pw-script gpt-6-luna: done; archived but answer "unavailable" lacks ARC-BC8094
- 20261116204747-11-stagehand-b763 11_canvas_map stagehand gpt-6-luna: done; assignments {}
- 20261116205459-12-stagehand-d14a 12_hover_slider stagehand gpt-6-luna: max_calls; discounts {}
- 20261116210055-13-pw-cli-ab79 13_bulk_policy pw-cli gpt-6-luna: done; 1 wrong, e.g. RF-96612=Pending (want Rejected)
- 20261116211144-15-pw-cli-eea0 15_closed_shadow pw-cli gpt-6-luna: done; billing {"plan":"Enterprise","seats":145,"confirmed":true}
- 20261116211255-15-pw-script-b4f2 15_closed_shadow pw-script gpt-6-luna: done; billing {"plan":"Enterprise","seats":145,"confirmed":true}
- 20261116211400-15-stagehand-4c80 15_closed_shadow stagehand gpt-6-luna: done; billing {"plan":"Monthly","seats":14,"confirmed":true}
- 20261116213903-06-pw-script-6014 06_upload pw-script gpt-6.1-sol: done; 0 documents uploaded
- 20261116214008-06-stagehand-82ac 06_upload stagehand gpt-6.1-sol: done; 0 documents uploaded
- 20261116214252-07-pw-script-8889 07_modal_toast pw-script gpt-6.1-sol: done; archived but answer "" lacks ARC-7CEFEA
- 20261116215919-11-pw-script-9f6a 11_canvas_map pw-script gpt-6.1-sol: wall_clock; assignments {}
- 20261116220454-11-stagehand-95d7 11_canvas_map stagehand gpt-6.1-sol: done; assignments {}
- 20261116220908-12-stagehand-6016 12_hover_slider stagehand gpt-6.1-sol: done; discounts {}
- 20261116222109-14-cua-52c0 14_transient_key cua gpt-6.1-sol: done; secret "5UI4-X0N0-9C7V-XNKE" != key "5UI4-X0NO-9C7V-XNKE" (generated 1)
- 20261116225319-06-stagehand-a599 06_upload stagehand gpt-6.1-sol: done; 0 documents uploaded
- 20261116225547-07-pw-script-d7fb 07_modal_toast pw-script gpt-6.1-sol: done; archived but answer "" lacks ARC-39353C
- 20261116230953-10-stagehand-4959 10_layout_shift stagehand gpt-6.1-sol: done; wrong: Elin Fors=Pending, Maria Sund=Pending
- 20261116231437-11-stagehand-95fd 11_canvas_map stagehand gpt-6.1-sol: done; assignments {}
- 20261116231856-12-stagehand-160c 12_hover_slider stagehand gpt-6.1-sol: done; discounts {}
- 20261116235814-10-stagehand-eefb 10_layout_shift stagehand gpt-6.1-sol: done; wrong: Per Åberg=Pending, Elin Fors=Pending
- 20261117000252-11-stagehand-d077 11_canvas_map stagehand gpt-6.1-sol: done; assignments {}
- 20261117000707-12-stagehand-7386 12_hover_slider stagehand gpt-6.1-sol: done; discounts {}
- 20261117003957-06-stagehand-fd4a 06_upload stagehand gpt-6.1-sol: done; 0 documents uploaded
- 20261117004219-07-pw-script-2335 07_modal_toast pw-script gpt-6.1-sol: done; archived but answer "" lacks ARC-07E9DD
- ERROR 20261116100859-14-mcp-ab7e 14_transient_key mcp: invalidated: network stall, run lasted 727.1s against a 300s limit
- ERROR 20261116102106-14-pw-cli-1bc6 14_transient_key pw-cli: APIConnectionError: Connection error.
- ERROR 20261116102107-14-pw-script-01c4 14_transient_key pw-script: APIConnectionError: Connection error.
- ERROR 20261116102109-14-cua-6173 14_transient_key cua: APIConnectionError: Connection error.
- ERROR 20261116102110-14-stagehand-4317 14_transient_key stagehand: APIConnectionError: Connection error.
- ERROR 20261116102112-15-mcp-01fe 15_closed_shadow mcp: APIConnectionError: Connection error.
- ERROR 20261116102114-15-pw-cli-e80f 15_closed_shadow pw-cli: APIConnectionError: Connection error.
- ERROR 20261116102115-15-pw-script-8ddb 15_closed_shadow pw-script: APIConnectionError: Connection error.
- ERROR 20261116102117-15-cua-8d91 15_closed_shadow cua: APIConnectionError: Connection error.
- ERROR 20261116102118-15-stagehand-9dae 15_closed_shadow stagehand: APIConnectionError: Connection error.
- ERROR 20261116102125-01-mcp-0a14 01_login_read mcp: APIConnectionError: Connection error.
- ERROR 20261116102126-01-pw-cli-886c 01_login_read pw-cli: APIConnectionError: Connection error.
- ERROR 20261116102128-01-pw-script-4ea1 01_login_read pw-script: APIConnectionError: Connection error.
- ERROR 20261116102129-01-cua-ccd5 01_login_read cua: APIConnectionError: Connection error.
- ERROR 20261116102130-01-stagehand-c86c 01_login_read stagehand: APIConnectionError: Connection error.
- ERROR 20261116102133-02-mcp-fc64 02_wizard mcp: APIConnectionError: Connection error.
- ERROR 20261116102134-02-pw-cli-cb5f 02_wizard pw-cli: APIConnectionError: Connection error.
- ERROR 20261116102136-02-pw-script-6ba5 02_wizard pw-script: APIConnectionError: Connection error.
- ERROR 20261116102137-02-cua-60f9 02_wizard cua: APIConnectionError: Connection error.
- ERROR 20261116102139-02-stagehand-a53b 02_wizard stagehand: invalidated: network stall, run lasted 921.2s against a 300s limit
- ERROR 20261116103700-03-mcp-e103 03_search_filter mcp: APIConnectionError: Connection error.
- ERROR 20261116103701-03-pw-cli-df84 03_search_filter pw-cli: APIConnectionError: Connection error.
- ERROR 20261116103703-03-pw-script-bd5b 03_search_filter pw-script: APIConnectionError: Connection error.
- ERROR 20261116103704-03-cua-7646 03_search_filter cua: invalidated: network stall, run lasted 903.8s against a 300s limit
- ERROR 20261116105208-03-stagehand-1379 03_search_filter stagehand: APIConnectionError: Connection error.
- ERROR 20261116105210-04-mcp-f189 04_table_edit mcp: APIConnectionError: Connection error.
- ERROR 20261116105212-04-pw-cli-86d6 04_table_edit pw-cli: APIConnectionError: Connection error.
- ERROR 20261116105213-04-pw-script-4796 04_table_edit pw-script: APIConnectionError: Connection error.
- ERROR 20261116105215-04-cua-b0b2 04_table_edit cua: invalidated: network stall, run lasted 952.2s against a 300s limit
- ERROR 20261116110807-04-stagehand-b53b 04_table_edit stagehand: invalidated: network stall, run lasted 640.9s against a 300s limit
- ERROR 20261116111903-05-mcp-58e7 05_datepicker_dropdown mcp: invalidated: network stall, run lasted 657s against a 300s limit
- ERROR 20261116113026-05-pw-script-ade8 05_datepicker_dropdown pw-script: invalidated: network stall, run lasted 1751.8s against a 300s limit
- ERROR 20261116115959-05-stagehand-eaa4 05_datepicker_dropdown stagehand: invalidated: network stall, run lasted 436.5s against a 300s limit
- ERROR 20261116120737-06-pw-cli-42a2 06_upload pw-cli: invalidated: network stall, run lasted 1108.7s against a 300s limit
- ERROR 20261116122607-06-pw-script-a652 06_upload pw-script: invalidated: network stall, run lasted 947.4s against a 300s limit
- ERROR 20261116234722-03-cua-9290 03_search_filter cua: APIConnectionError: Connection error.
- ERROR 20261116234847-03-stagehand-df8e 03_search_filter stagehand: APIConnectionError: Connection error.
- ERROR 20261116234849-04-mcp-ae8f 04_table_edit mcp: APIConnectionError: Connection error.
- ERROR 20261116234851-04-pw-cli-d0f8 04_table_edit pw-cli: APIConnectionError: Connection error.
- ERROR 20261116234852-04-pw-script-2d73 04_table_edit pw-script: APIConnectionError: Connection error.
- ERROR 20261116234854-04-cua-2c27 04_table_edit cua: APIConnectionError: Connection error.
- ERROR 20261116234855-04-stagehand-b499 04_table_edit stagehand: APIConnectionError: Connection error.
- ERROR 20261116234857-05-mcp-f624 05_datepicker_dropdown mcp: APIConnectionError: Connection error.
- ERROR 20261116234859-05-pw-cli-e823 05_datepicker_dropdown pw-cli: APIConnectionError: Connection error.
- ERROR 20261116234900-05-pw-script-9c50 05_datepicker_dropdown pw-script: APIConnectionError: Connection error.
- ERROR 20261116234902-05-cua-ce2b 05_datepicker_dropdown cua: APIConnectionError: Connection error.
- ERROR 20261116234903-05-stagehand-b15a 05_datepicker_dropdown stagehand: APIConnectionError: Connection error.
- ERROR 20261116234905-06-mcp-fb5a 06_upload mcp: APIConnectionError: Connection error.
- ERROR 20261116234906-06-pw-cli-8cb6 06_upload pw-cli: APIConnectionError: Connection error.
- ERROR 20261116234908-06-pw-script-783a 06_upload pw-script: APIConnectionError: Connection error.
- ERROR 20261116234909-06-cua-4f50 06_upload cua: APIConnectionError: Connection error.
- ERROR 20261116234911-06-stagehand-97bb 06_upload stagehand: APIConnectionError: Connection error.
- ERROR 20261116234913-07-mcp-8cb7 07_modal_toast mcp: APIConnectionError: Connection error.
- ERROR 20261116234914-07-pw-cli-d059 07_modal_toast pw-cli: APIConnectionError: Connection error.
- ERROR 20261116234916-07-pw-script-bdfc 07_modal_toast pw-script: APIConnectionError: Connection error.
- ERROR 20261116234917-07-cua-3c3c 07_modal_toast cua: APIConnectionError: Connection error.
- ERROR 20261116234918-07-stagehand-b6ab 07_modal_toast stagehand: APIConnectionError: Connection error.
- ERROR 20261116234920-08-mcp-4ad5 08_iframe_shadow mcp: APIConnectionError: Connection error.
- ERROR 20261116234922-08-pw-cli-c954 08_iframe_shadow pw-cli: APIConnectionError: Connection error.
- ERROR 20261116234923-08-pw-script-95cd 08_iframe_shadow pw-script: APIConnectionError: Connection error.
- ERROR 20261116234925-08-cua-da21 08_iframe_shadow cua: APIConnectionError: Connection error.
