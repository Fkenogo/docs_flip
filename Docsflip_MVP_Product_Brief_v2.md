# DOCSFLIP — MVP Product Brief
### A Digital Publishing Platform for East Africa

---

**Product Name:** Docsflip  
**Website:** docsflip.com  
**Market:** East Africa (Kenya, Uganda, Tanzania, Rwanda, Burundi)  
**Version:** 2.0 — MVP Scope  
**Purpose:** Build brief and product specification for MVP development  
**Prepared for:** Development Team / AI Coding Agent  
**Companion:** Read alongside the Technical Implementation Guide v1.0

---

## Table of Contents

1. [Product Overview](#1-product-overview)
2. [Target Users](#2-target-users)
3. [MVP Feature Scope](#3-mvp-feature-scope)
4. [Pricing Structure](#4-pricing-structure)
5. [Key User Flows](#5-key-user-flows)
6. [Technical Guidance for the Development Agent](#6-technical-guidance-for-the-development-agent)
7. [What NOT to Build in the MVP](#7-what-not-to-build-in-the-mvp)
8. [Go-to-Market Approach](#8-go-to-market-approach)
9. [Instructions for the AI Coding Agent](#9-instructions-for-the-ai-coding-agent)

---

## 1. Product Overview

Docsflip is a digital publishing platform that converts PDF documents into interactive, professional flipbooks. Publishers, businesses, and individuals across East Africa can upload their PDFs and instantly transform them into an engaging reading experience — complete with page-turn animations, zoom, mobile responsiveness, and shareable links.

Flipbooks can be embedded directly on a client's website, shared via a URL, or downloaded as an offline HTML file for access without an internet connection. Where a static PDF is flat and gives nothing back, a Docsflip publication is alive — it loads fast, reads beautifully on mobile, and tells the publisher exactly how many people read it and how far they got.

### 1.1 The Problem Being Solved

Across East Africa, publishers, businesses, and organizations produce high-value documents — daily newspapers, monthly magazines, annual reports, investor presentations, product catalogs — and distribute them as flat PDF files. The reading experience is dated. There is no engagement data. Documents look no different than they did twenty years ago.

Publishing houses face a sharper problem. Many have digitized their content into PDF format but struggle to share it effectively. Daily and weekly publications especially lack a manageable workflow for getting each edition online. Readers who want to follow their favourite publication have no better option than downloading a static PDF — if it is even available at all.

Global tools like Flipsnack and FlippingBook exist, but they are priced in USD, designed for Western markets, and have no understanding of the East African publishing or business context.

### 1.2 The Opportunity

Docsflip fills this gap. A flipbook publishing platform built specifically for East Africa — priced in local currency, with per-document and workspace pricing that reflects how African businesses and publishers actually pay for things — addresses a real and underserved need across the region. The publishing market alone, covering newspapers, magazines, and journals with regular digital editions, represents a significant recurring revenue opportunity that global tools have not meaningfully captured.

---

## 2. Target Users

The MVP serves four distinct user types. Understanding their different needs is important for how the product is structured and priced.

### Publishing User

A publishing house, newspaper, or magazine that produces regular editions — daily, weekly, or monthly. They currently distribute PDF versions of their publications with no clean digital reading experience for their audience. On Docsflip, they manage all their editions from a single Publishing Workspace, organized by publication title and edition. They share flipbook links with subscribers or embed their publications on their own website. Their primary need is a reliable, repeatable workflow they can use every time a new edition drops — not a one-off tool.

### Corporate User

An in-house marketing, communications, or investor relations professional at a bank, listed company, NGO, or government body. They upload their own documents — annual reports, policy documents, product catalogs — and want them embedded on their company website or shared cleanly with stakeholders. They think in projects and budgets rather than monthly subscriptions, and they care deeply about how professional the output looks.

### Individual User

A person who regularly reads PDF books, research reports, or publications and wants a better reading experience than scrolling through a flat file. They upload their own PDFs and enjoy them as a natural flipbook — page turns, zoom, full screen, mobile-friendly. They pay per document rather than by subscription and return to the platform each time they have a new PDF they want to read properly.

### End Reader

The person who views a flipbook published by someone else. They never log in to the platform. They experience the flipbook via a shared link, embedded on a website they are visiting, or via an offline HTML download someone sent them. Their experience must be excellent — fast, intuitive, and frictionless — because they are the reason the paying user values the product.

---

## 3. MVP Feature Scope

The following features define the MVP. **Nothing outside this list should be built in version one.** Every feature below has a direct reason for being included.

### 3.1 User Accounts and Workspaces

- User registration and login with email and password via Firebase Authentication
- Clean dashboard showing all documents and their current status
- Publishing Workspace accounts can create separate folders per publication title to keep editions organized
- Basic account settings — name, organization name, logo upload, preferred currency

### 3.2 PDF Upload and Conversion

- User uploads a PDF from their device directly to Firebase Storage
- Firebase Cloud Function triggers automatically to convert the PDF into a flipbook
- Each page is rendered as a compressed JPEG image and stored in Firebase Storage
- Support for documents up to 100 pages in the MVP
- Progress indicator shown during conversion so the user knows it is working
- StPageFlip library powers the flip animation in the viewer

### 3.3 Flipbook Viewer

This is the most important piece of quality in the product. The reading experience must be excellent on every device and every connection speed.

- Smooth, natural page-turn animation
- Zoom in and out on pages
- Table of contents navigation where the PDF includes bookmarks
- Mobile responsive with touch-enabled page turning
- Fast loading on slower connections — page images are lazy-loaded and compressed
- Full screen reading mode

### 3.4 Publishing Options

Three publishing outputs map directly to the three pricing tiers.

- **Shareable URL** — a unique link hosted on the platform that any reader can open in a browser
- **Embed code** — an iframe snippet the client pastes into their own website so the flipbook appears on their domain, not Docsflip's
- **Offline HTML download** — a self-contained zip file with the full flipbook experience that works in any browser without internet (Premium tier only)

### 3.5 Branding Controls

- Upload an organization logo to appear in the viewer header
- Choose a background color for the viewer frame
- Option to remove Docsflip platform branding — available on Professional tier and above

> **Why this matters:** Corporate clients and publishers do not want their readers to see a third-party tool. Removing platform branding at the Professional tier is a key selling point and justifies the price step up from Starter.

### 3.6 Basic Analytics

Analytics are one of the core value propositions over a static PDF. For the MVP, simple data is enough to demonstrate clear value.

- Total views per document
- Views over time displayed as a simple chart
- Reader location by country (approximate, based on IP address)
- Average number of pages read per session

> **Why this matters:** A publisher or corporate communications team knowing that 1,200 people read their latest edition, spending an average of six minutes and reaching page 18, is information a PDF can never provide. This data alone justifies the cost of the platform.

### 3.7 Document Management

- Replace a document with an updated PDF without breaking the existing shareable link or embed code
- Rename or delete documents
- Set a document as published or unpublished
- For Publishing Workspace users — organize documents into edition folders per publication title

> **Critical point:** The ability to replace a document without breaking the link is not optional. Annual reports get amended. New editions replace old ones. Clients cannot ask their web team to update embed codes every time a document is refreshed.

### 3.8 Payment Integration

Three payment rails serve the full range of East African users from day one.

- **M-Pesa and mobile money** via Flutterwave — covers Kenya, Uganda, Tanzania, Rwanda, and beyond
- **Card payments** via Flutterwave — handles multi-currency transactions across the region
- **Manual invoicing** — for corporate and Publishing Workspace clients who require purchase orders and formal procurement processes

> **Recommendation:** Use Flutterwave as the single payment integration. It covers mobile money, cards, and bank transfers across East Africa in one API, which keeps the build simple. Stripe is not recommended — it does not handle M-Pesa and has poor coverage in East African markets.

---

## 4. Pricing Structure

Pricing is per-document for individual and corporate users, and per-workspace on a monthly plan for publishing houses. All prices are displayed in local currency — never in USD.

| Tier | Price (KES) | Best For | What Is Included |
|---|---|---|---|
| Starter Document | KSh 400 / doc | Individuals, first-time users | Shareable URL, Docsflip branding visible, basic view count |
| Professional Document | KSh 800 / doc | Corporate one-off documents | Embed code, custom branding, no platform watermark, full analytics |
| Premium Document | KSh 2,500 / doc | Corporate + offline sharing need | Everything in Professional plus offline HTML download |
| Publishing Workspace | KSh 12,500 / month | Newspapers, magazines, publishers | Unlimited documents, edition folders, all features, priority support |

For Uganda, Tanzania, and Rwanda, prices should be converted at prevailing exchange rates and displayed in UGX, TZS, and RWF respectively.

The Publishing Workspace at KSh 12,500 per month is the platform's primary recurring revenue driver. Five active publishing clients on this plan generates KSh 62,500 per month. Ten clients generates KSh 125,000. This is the segment to prioritize in the go-to-market.

---

## 5. Key User Flows

The following describes the end-to-end journey for each paying user type.

### 5.1 Corporate User Flow

1. User visits docsflip.com and registers with email and company name
2. User lands on a clean dashboard with zero documents and a clear Upload prompt
3. User clicks Upload, selects a PDF from their device, and gives it a name
4. System converts the PDF — user sees a progress indicator and then a preview of the finished flipbook
5. User customizes branding — uploads logo, selects viewer background color
6. User selects their publishing tier and sees the price clearly before paying
7. User pays via M-Pesa, card, or requests a manual invoice
8. On payment confirmation — user receives their shareable link or embed code immediately
9. User pastes embed code into their company website or shares the URL with stakeholders
10. User returns to dashboard at any time to view analytics or replace the document with an updated version

### 5.2 Publishing User Flow

1. Publisher registers and selects the Publishing Workspace plan — payment via M-Pesa, card, or invoice
2. Publisher creates a folder for each of their publication titles (e.g. "The Weekly Business Review", "Monthly Property Report")
3. Each time a new edition is ready, publisher uploads the PDF into the relevant title folder and names it by edition or date
4. System converts the PDF automatically — publisher previews and confirms
5. Publisher generates a shareable link for the new edition and shares it with subscribers, or updates the embed on their website to point to the latest edition
6. Publisher manages all past and current editions from the dashboard with clear edition history per title
7. Monthly billing renews automatically via the selected payment method

### 5.3 Individual User Flow

1. User visits docsflip.com and registers with email and password
2. User uploads a PDF — a book, report, or document they want to read in flipbook format
3. System converts the PDF and shows the user a preview of their flipbook
4. User selects either Starter or Premium tier — Starter for a shareable link, Premium for the offline HTML download they can keep and read anywhere
5. User pays via M-Pesa or card
6. User reads their document in the flipbook viewer or downloads the offline version
7. User returns to the platform each time they have a new PDF to convert

### 5.4 End Reader Flow

1. Reader receives a link or lands on a company website with an embedded Docsflip flipbook
2. Flipbook loads directly in the browser — no login required, no download, no friction
3. Reader navigates with page-turn animation, zoom, and table of contents
4. On mobile, the experience is touch-enabled and pages load progressively so reading can begin immediately
5. If given an offline HTML download, reader unzips the file and opens `index.html` in any browser — the full flip experience works without internet connection

---

## 6. Technical Guidance for the Development Agent

This section specifies the exact libraries, services, and architecture for the build. The entire platform is built within the Firebase ecosystem. **Do not substitute components without approval from the product owner.**

### 6.1 Technology Stack

| Component | Tool | Reason |
|---|---|---|
| Frontend Framework | Next.js (React) | Fast, SEO-friendly, works seamlessly with Firebase Hosting |
| Flip Animation | StPageFlip | Free, actively maintained, mobile touch support built in |
| PDF Rendering | PDF.js (via Cloud Function) | Converts PDF pages to JPEG images server-side before display |
| Authentication | Firebase Authentication | Built-in email/password login, easy to extend with Google sign-in later |
| Database | Firestore (Firebase) | Real-time NoSQL database, no server management required |
| File Storage | Firebase Storage | Stores uploaded PDFs and all converted page images |
| Backend / Functions | Firebase Cloud Functions | Serverless functions handle PDF conversion triggered on upload |
| Payments | Flutterwave | M-Pesa, cards, and bank transfers across East Africa in one API |
| Hosting | Firebase Hosting | Fast global CDN, free SSL, integrates directly with the Firebase stack |

> **Why full Firebase:** Keeping the entire stack within Firebase removes the need to manage separate servers, databases, and hosting environments. Firebase Cloud Functions handle the PDF conversion without a dedicated backend server. One platform, one billing account, minimal infrastructure overhead — right for an MVP at this stage.

### 6.2 PDF Conversion Pipeline

The core technical process. Build in this sequence:

1. User selects a PDF on the frontend — file uploads directly to Firebase Storage via the Firebase SDK
2. The upload to Firebase Storage triggers a Firebase Cloud Function automatically
3. The Cloud Function uses PDF.js to render each page of the PDF as a compressed JPEG image
4. Rendered page images are saved back to Firebase Storage in a structured folder: `/documents/{userId}/{documentId}/pages/`
5. A Firestore document is created or updated with the document metadata — title, page count, status, and the array of page image URLs
6. The frontend detects the status update in Firestore in real time and shows the user their completed flipbook preview
7. For the offline HTML download, the Cloud Function packages the StPageFlip viewer, all page images, and an `index.html` file into a zip and saves it to Firebase Storage

### 6.3 The Embed System

The embed output is a standard iframe pointing to a dedicated viewer route on the platform. When this URL is loaded inside an iframe on a client's website, it renders only the flipbook viewer.

```html
<iframe
  src="https://docsflip.com/view/[document-id]"
  width="100%"
  height="600px"
  frameborder="0"
  allowfullscreen>
</iframe>
```

The `/view/[document-id]` route is a stripped-down page — flipbook viewer only. No header, no footer, no platform navigation. Platform branding is removed from this view for Professional tier and above.

### 6.4 Analytics Implementation

Log four events to Firestore against each document record: `viewer_opened`, `page_turned`, `session_ended`, and `download_clicked`. Each event stores a timestamp and an approximate reader country derived from their IP address. The analytics dashboard reads and aggregates these Firestore records. No third-party analytics service is needed for the MVP.

### 6.5 Performance Considerations

A significant proportion of readers will be on mobile devices across East Africa, often on mobile data connections. These optimizations are required from the start — not added later.

- Compress all page images to JPEG at 80% quality
- Lazy load page images — only the current page and the two adjacent pages load at any time
- Show a loading skeleton immediately on flipbook open rather than a blank screen
- Cache loaded page images in the browser so navigating back to a viewed page is instant

---

## 7. What NOT to Build in the MVP

Keeping the MVP focused is as important as knowing what to include. The features below are valid ideas for future versions but **must not be built now**.

| Feature | Why Excluded from MVP |
|---|---|
| Video or audio embeds inside flipbooks | Significant complexity, not needed to prove core value |
| E-commerce or lead capture forms | Out of scope for a publishing platform — version 2 feature |
| Team collaboration and commenting | Not needed until enterprise clients request it explicitly |
| Custom domain hosting for flipbooks | Complex to implement, not a barrier to first customer acquisition |
| AI-generated content or AI summarization | Interesting but distracting — not the core product |
| Native mobile app (iOS or Android) | The mobile web experience is sufficient for MVP |
| White-label reseller accounts | Valuable eventually, not needed for the first 20 customers |
| Automated email delivery of publications | Shareable links handle distribution for now |
| Multi-language platform interface | English is sufficient for the East African B2B market at MVP stage |
| Subscription paywalls for reader access | Publishing houses manage their own subscriber relationships for now |

---

## 8. Go-to-Market Approach

The MVP is not just a technical deliverable — it needs a clear plan for the first paying customers. This shapes what gets built and validated first.

### 8.1 Primary Target: Publishing Houses

East Africa has a large and active publishing sector — daily newspapers, weekly business titles, monthly consumer magazines, industry journals, and community newsletters. Many already produce PDF versions of their publications but lack a professional, manageable way to share them digitally. Some have stopped even attempting to share digital editions because the workflow of uploading and managing individual PDFs every day or every week has become unmanageable.

Docsflip solves this with a structured Publishing Workspace — one account, organized by title, with a simple upload-and-publish workflow that can be repeated in minutes with each new edition. The recurring monthly plan creates predictable revenue for Docsflip and a consistent tool the publisher relies on continuously, not just once.

Target five to ten publishing houses in Nairobi for the initial launch. Offer discounted first-month access in exchange for long-term workspace commitments and honest feedback on the product.

### 8.2 Secondary Target: Financial Institutions and Listed Companies

Banks, insurance companies, SACCOs, and companies listed on the Nairobi Securities Exchange, Uganda Securities Exchange, and Dar es Salaam Stock Exchange are legally required to publish annual reports and financial statements. They have procurement budgets, care about brand presentation, and produce documents with a guaranteed audience in shareholders, regulators, and analysts. A listed company turning its annual report into a professional embedded flipbook on its investor relations page is a straightforward sale if demonstrated in the right room.

### 8.3 Success Metrics for MVP

The MVP is considered successful when the following are achieved within the first 90 days after launch:

- 20 paying customers have published at least one document
- At least 3 Publishing Workspace accounts are active and publishing regularly
- Customer feedback confirms per-document pricing is preferable to subscriptions for corporate and individual users
- Platform uptime is above 99% across any 30-day period
- At least 5 customers have successfully embedded a flipbook on their own website

---

## 9. Instructions for the AI Coding Agent

This section is written directly to the AI coding agent that will build this product. **Read the entire brief before writing any code.**

---

> **PRIORITY 1** — Build the PDF upload and conversion pipeline first.  
> Nothing else works without this. Build and test it fully before moving on.

> **PRIORITY 2** — Build the flipbook viewer using StPageFlip.  
> Must be mobile responsive and fast on slower connections.  
> This is the core product experience — quality here is non-negotiable.

> **PRIORITY 3** — Build Firebase Authentication and the user dashboard.  
> Clean and simple. Document list, upload button, status indicator.

> **PRIORITY 4** — Build the three publishing outputs in sequence:  
> (a) Shareable URL  
> (b) Embed code with iframe  
> (c) Offline HTML download (zip package)

> **PRIORITY 5** — Add branding controls, analytics, and Flutterwave payment integration.

---

> ❌ **DO NOT** deviate from the Firebase stack defined in Section 6.1.  
> ❌ **DO NOT** add features not listed in Section 3.  
> ❌ **DO NOT** build anything listed in Section 7.  
> ❌ **DO NOT** move to the next priority until the current one is confirmed working by the product owner.  
> ✅ When in doubt, build the simpler version and **ask before adding complexity.**

---

The product owner is a no-code developer. All reviews will be visual and functional — not code reviews. Write clear comments throughout the codebase explaining what each major section does in plain language. Keep the user interface clean, intuitive, and self-explanatory. When a decision point has multiple valid approaches, stop and present the options in plain language before choosing.

---

*End of Brief — Docsflip MVP Version 2.0*  
*This document should be updated as the product evolves through development and customer feedback.*  
*Read this document alongside the Technical Implementation Guide v1.0.*
