# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

HelpDesky is used inside one organisation, by three roles:

- **End users (primary).** Staff across the organisation, mostly non-technical, who need to report an IT problem and see what is happening with it. When design trade-offs come up, their experience wins. They use the `END_USER` role and land on `/portal`.
- **Agents.** IT staff who triage, take on and resolve tickets. They spend most of their day in the queue (`/`), on ticket detail pages, in internal notes and in comments. Agents set their own availability (Available, On leave, At workshop) and sometimes work away from their desk.
- **Admins.** The IT leads who manage staff and end-user accounts, configure ticket categories, subcategories and custom fields, and read the dashboard and reports.

## Product Purpose

HelpDesky is the organisation's internal IT help desk. It covers the whole life of a ticket: intake, assignment, work and resolution. Success means:

- **Staff actually use it.** End users report problems through HelpDesky instead of calling, walking in or sending chat messages.
- **Faster resolution.** Tickets reach the right agent and get closed quickly.
- **Visibility for management.** Admins get reliable numbers on ticket volume, agent workload and turnaround.

## Positioning

HelpDesky is built for one IT team and one organisation, and runs on that organisation's own servers. Its categories and custom fields match the team's real support areas (hardware, software, network, access), and it knows which agents are actually available. It is not a general-purpose service-desk product. Its job is to be easier for a colleague to use than picking up the phone.

## Operating Context

- **Devices.** Mostly desktop browsers on office PCs and laptops. Phones matter too: agents working away from their desk and end users reporting from a phone both need to be served.
- **Hosting.** Self-hosted on a Linux server (openSUSE or Ubuntu). nginx serves the static frontend and proxies `/api`. See `DEPLOYMENT.md`.
- **Ticket lifecycle.** Open → In progress → Resolved. Priority is Low, Medium or High.
- **Ticket conversations.** Shared comments are visible to everyone on the ticket. Internal notes are visible to staff only. Ticket history records the activity.
- **Live updates.** Ticket changes are pushed to open clients through server events.

## Capabilities and Constraints

- **Stack.** React 19 + Vite, React Router, axios, react-icons and react-hot-toast on the frontend. Node/Express and PostgreSQL on the backend. JWT auth with roles `ADMIN`, `AGENT` and `END_USER`.
- **Ticket setup.** Categories and subcategories can be configured, and custom fields can be added per category or subcategory (text or select, optional or required). Default categories are Hardware, Software, Network and Access.
- **Routes.**
  - Login and self-registration.
  - End-user portal.
  - Create ticket and ticket detail.
  - Ticket queue, with pagination.
  - Admin dashboard.
  - Reports, with PDF export.
  - Staff list and end-user list.
  - Ticket settings.
  - Profile, with work-status selection.
- **Access rules.** End users can only see their own tickets. Reports and ticket settings are admin-only.
- **Terminology.** "Ticket", "Agent", "End user", "Internal note", "Comment", "Work status".

## Brand Commitments

- The product's only identity is the name **HelpDesky**.
- No organisation logo or colours are required.
- **Visual identity (chosen 2026-10-13): modern, Apple-like.** Every surface (sign-in, staff screens and the end-user portal) should sit alongside Apple's macOS apps (Mail, Reminders, System Settings): system font (San Francisco on Apple devices), translucent sidebar source list, inset grouped lists, segmented controls, capsule tags, system blue for actions and Apple's system colours for status and priority. Light theme. The owner rejected a bespoke "routing label" look in favour of this.

## Evidence on Hand

- The real product content is the seeded ticket categories, subcategories and custom fields in `server/init_db.js`.
- There are no testimonials, usage metrics, screenshots or case studies. Future work must not invent them, or any ticket volumes or resolution-time figures.

## Product Principles

1. **Reporting a problem should be easier than calling IT.** End-user friction is the main threat to adoption.
2. **Get the right details the first time.** Intake should collect what agents need through categories and custom fields, without making end users feel interrogated.
3. **The queue is a working tool.** Agents need status, priority, assignment and availability to be clear at a glance.
4. **Keep everyone informed without extra effort.** End users should always see where their ticket stands. Staff-only information should stay clearly separate from what end users can see.
5. **Report numbers people can trust.** Reports must reflect real data and must stay printable or exportable.
