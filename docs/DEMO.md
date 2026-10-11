# Saans · Three-minute demo

**Target length:** 03:00 · **Format:** screen recording with voiceover · **Audience:** judges and school partners

The script uses the seeded Delhi school, a saved replay, and an activated demo parent account. The replay KPI is decision-specific: if the scenario is still awaiting approval, the dashboard labels the shown time as elapsed.

| On-screen action and timecode | Voiceover |
|---|---|
| **00:00–00:15** — Open the Saans principal dashboard. Keep the top bar and replay KPI visible. | “Saans helps a school turn an air-quality forecast into a clear plan for outdoor activities and a family update.” |
| **00:15–00:30** — Open **School settings**. Show the school location, hours, and India Standard Time. | “The principal sets the school’s locality and hours, so the estimate uses the school’s own schedule.” |
| **00:30–00:45** — Click **Preview reading for this location** and show the AQI/category result. | “Before saving a location, the principal can preview today’s modelled reading for it.” |
| **00:45–01:00** — Return to the morning desk. Select the **Very Poor · PM2.5 driven · Delhi · 22 Nov 2025** replay. | “For this walkthrough I’m using a saved Delhi day, so the demo does not depend on today’s forecast.” |
| **01:00–01:15** — Run the replay. Frame the large AQI and **Minutes from breach to notice** KPI in the top bar. | “The headline KPI measures elapsed time from the recorded forecast check to notice approval or dispatch.” |
| **01:15–01:30** — Show the recommended cancellation and parent notice preview, including the school-open line. | “This Very Poor reading recommends cancelling outdoor activities; the school remains open unless it tells families otherwise.” |
| **01:30–01:45** — Click **Approve notice** and show the delivery status. | “Parents are notified only after approval, unless the school has an exact matching standing rule.” |
| **01:45–02:00** — Open **Parents** and show active/invited account statuses. | “Principals invite families directly, or import a CSV, and can see each account’s status.” |
| **02:00–02:15** — Open `/parent/login` in a second browser window and sign in as the demo parent. | “Parents use their own sign-in, separate from the principal workspace.” |
| **02:15–02:30** — Show today’s approved notice and press **I’ve read this**. | “The family sees the message, the outdoor-time guidance, and the reason, then acknowledges it here.” |
| **02:30–02:45** — Return to the principal dashboard and show acknowledgement progress update. Open decision history if time allows. | “The principal’s progress updates as acknowledgements arrive, with pending families and delivery status.” |
| **02:45–03:00** — End on the notice’s school-open line and the safety/estimate note. | “Saans is a process tool using regional model data; it is not medical advice, and the school notice uses a fixed bilingual template.” |

## Recording notes

- Use preview delivery for the recording unless SES has been configured and verified for the chosen recipients.
- If no demo parent is set up, seed one first with a real test email address in `DEMO_PARENT_EMAILS`, or create an invitation and use its preview link.
- Reload the principal dashboard after acknowledgement if the video capture does not show the automatic progress refresh promptly.
