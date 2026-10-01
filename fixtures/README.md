# Test Fixtures

**Everything in this folder is fictional.** The organizations, people, places, numbers, phone numbers, and links are made up for testing. Any resemblance to a real organization is a coincidence. Links use `example.org` and `example.com`.

This folder gives every skill in this repo realistic content from an organization other than Vets Who Code. Some files hide traps on purpose. A correct skill catches them. A broken one fills the gap with made-up facts.

## The organizations

Both live in the same fictional town, Alder Bay.

- **Wrenfield Community Pantry** (`nonprofit/`): a small neighborhood food pantry with Saturday grocery pickup, weekend snack bags for kids, and a community garden.
- **Lark & Lug Cycle Repair** (`small-business/`): a two-mechanic bike repair shop.

The two brands are deliberately different in color, type, and voice so the same script can be rendered in both.

## Files

| File | What it is | Used by |
| --- | --- | --- |
| `nonprofit/brand.md` | Wrenfield brand: mission, colors, fonts, voice, copy rules | #3, #5, #6, #8 |
| `nonprofit/blog-post.md` | About 800 words on a Saturday at the pantry | #2, #8 |
| `nonprofit/impact-report.md` | One-year report, July 2025 through June 2026 | #5 |
| `nonprofit/donor-notes.md` | One month (September 2026) of rough staff notes, 5 stories | #6 |
| `small-business/brand.md` | Lark & Lug brand: mission, colors, fonts, voice, copy rules | #3, #7 |
| `small-business/service-page.md` | Services, hours, and a 7-question FAQ | #7 |

Issue key: #2 Blog to image and audio. #3 Brand pack and brand-locked explainer video. #5 Impact story video, audio and social images. #6 Donor update email with audio and images. #7 Product explainer video. #8 Repurpose one post into a full content kit.

## Planted traps

| File | Trap | Skill that must catch it | Correct behavior |
| --- | --- | --- | --- |
| `nonprofit/impact-report.md` | Exactly one number has no source: "1 in 4 kids skips meals on weekends." Every other number names where it came from. | #5 | Flag it. Do not repeat it as fact. |
| `small-business/service-page.md` | No prices anywhere. The FAQ answer to "How much does a repair cost?" says "Call for a quote." | #7 | Do not invent prices or price ranges. |
| `nonprofit/donor-notes.md` | The last story ("the lady w the casserole") has no link, no photo, no name, and two lines of detail. | #6 | Keep it as thin as the notes. Do not add a name, quote, backstory, or image details. |

## Consistent numbers

The nonprofit numbers match across `impact-report.md` and `blog-post.md`. If you edit one file, update the other.

| Number | Value | Source named in the files |
| --- | --- | --- |
| Unique families served | 310 | intake log |
| Grocery pickups | 2,080 | Saturday sign-in sheets |
| Pounds of food distributed | 96,000 | warehouse scale records |
| Kids getting snack bags | 75 | school partner list |
| Snack bags packed | 3,600 | packing tally sheet |
| Garden produce | 2,300 lbs | garden harvest log |
| Active volunteers | 85 | volunteer roster |
| Volunteer hours | 4,200 | volunteer shift log |
| Dollars raised | $142,000 | year-end bookkeeping |

## Notes

- **Photos are referenced, not included.** `donor-notes.md` lists photo filenames like `ray-cake.jpg`. This version has no binary files, so the images do not exist. A skill should treat them as named but missing, not describe what they show.
- **Fonts** are from Google Fonts under the SIL Open Font License: Fraunces, Source Sans 3, Archivo Black, and Inter.
- **Phone numbers** use the 555-01XX range, which is reserved for fiction.

## License

Everything in this folder is released under [CC0 1.0](LICENSE). Use it for anything.
