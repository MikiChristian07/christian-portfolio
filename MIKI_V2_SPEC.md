# Portfolio V2 — Miki Personal AI Assistant

## 1. Objective

Extend the existing production portfolio with intelligent meeting scheduling, a personal AI assistant identity, two-way Telegram communication, email integration and automated visitor milestone notifications.

Existing website: https://www.christianonovo.com/

Both the portfolio and the existing AI agent are hosted on Vercel.

PostHog and Google Search Console are already integrated.

## 2. Strict Preservation Requirements

The current website redesign is complete and approved.

Do not redesign the website.

Do not change existing:

- Themes or colour palettes.
- Typography.
- Layouts.
- Animations.
- Navigation structure, except for necessary booking actions.
- Project presentations.
- Existing content.
- Responsive behaviour.
- Command palette functionality.
- Existing agent functionality.
- Analytics integrations.
- SEO configurations.
- Hosting architecture.

Only introduce changes directly required by this specification.

New components must inherit the existing design system and interaction patterns.

Do not introduce an admin dashboard, new public pages or unrelated functionality without explicit approval.

## 3. Miki Rebranding

Rename the existing digital twin to Miki.

Public-facing identity:

- Ask Miki.
- Meet Miki.
- Miki — Christian's personal AI assistant.

Update relevant labels, assistant messages, metadata and system prompts.

Miki is an AI assistant representing Christian, not an impersonation of Christian.

Preserve the existing knowledge base, RAG implementation, agent capabilities and conversation interface.

Miki should answer professional enquiries, explain projects, provide relevant information and coordinate meeting requests.

## 4. Dual Operating Modes

Implement two strictly separated permission contexts.

### Public Mode

Accessible through the existing website.

Capabilities:

- Answer questions about Christian.
- Explain projects and professional experience.
- Check permitted calendar availability.
- Suggest meeting times.
- Submit meeting requests.
- Collect professional enquiries.
- Provide relevant portfolio links.

Public users must never access private calendar details, email inboxes, owner analytics or privileged agent operations.

### Private Owner Mode

Accessible through an authorized Telegram bot.

Capabilities:

- Review meeting requests.
- Accept or decline requests.
- Propose rescheduling.
- Check upcoming calendar events.
- Review website visitor metrics.
- Manage visitor notification preferences.
- Respond to visitor enquiries.
- Draft and send authorized emails.
- Receive replies to Miki-managed email conversations.
- Temporarily enable or disable bookings.

Enforce permission boundaries at the backend service level.

Do not rely exclusively on system prompts for authorization.

## 5. Google Calendar and Google Meet

Integrate Google Calendar using secure server-side OAuth 2.0.

Allow visitors to request meetings through:

- A native Book a Call action integrated into the existing website.
- Natural-language conversations with Miki.

Both entry points must share the same booking service.

Collect:

- Visitor name.
- Verified email address.
- Optional company.
- Meeting purpose.
- Preferred date and time.
- Meeting duration.
- Time zone.
- Explicit confirmation to submit.

Use the Google Calendar FreeBusy API to determine availability.

Never disclose private calendar event details to visitors.

Support configurable working hours, meeting durations, buffers, minimum notice and advance booking limits.

If a requested time is unavailable, recommend up to three suitable alternatives.

All meeting requests require owner approval.

## 6. Meeting Approval Workflow

When a visitor submits a meeting request:

1. Validate the request and visitor email.
2. Check calendar availability.
3. Persist the request with a unique identifier.
4. Send an incoming Telegram notification to the owner.
5. Inform the visitor that approval is pending.

Telegram notifications must include:

- Visitor name.
- Company, if provided.
- Meeting purpose.
- Requested date and time.
- Duration.
- Availability status.
- Accept button.
- Decline button.
- Reschedule button.
- Reply via email button.

On acceptance:

1. Recheck calendar availability.
2. Prevent duplicate or overlapping event creation.
3. Create the Google Calendar event.
4. Generate a Google Meet conference.
5. Verify successful event and conference creation.
6. Send calendar invitations.
7. Persist the event ID and meeting link.
8. Notify both parties.

If the calendar becomes unavailable before approval, recommend alternative times instead of creating the meeting.

When rescheduling, require visitor acceptance of the proposed time before confirming the new booking.

Use idempotency, concurrency protection and persistent request states.

## 7. Telegram Bot Integration

Telegram is the primary private interface and push notification channel.

Do not build a separate web admin dashboard for this release.

Implement a secure Telegram webhook compatible with the existing Vercel architecture.

Support interactive inline buttons and natural-language owner instructions.

Example instructions:

- Accept Alex's meeting.
- Decline the latest meeting request.
- Ask Sarah if Monday at 11 AM works.
- What meetings do I have tomorrow?
- How many people visited my website today?
- Show pending meeting requests.
- Change my daily visitor threshold to 10.
- Disable bookings until Monday.
- Reply to the latest recruitment enquiry.

Support optional command shortcuts such as:

- /meetings
- /pending
- /visitors
- /settings
- /help

Telegram messages must be associated with the appropriate meeting request, enquiry or email conversation.

When a reply is ambiguous, ask the owner to identify the intended recipient or conversation.

Validate Telegram webhook authenticity, owner user ID and authorized chat ID.

Reject unauthorized users.

Protect approval actions against replay and duplicate execution.

## 8. Gmail Integration and Two-Way Communication

Prefer the Gmail API for personal email communication.

Allow the owner to respond to visitor enquiries and meeting requests directly through Telegram.

Miki should interpret the owner's instructions, prepare an appropriate email and request confirmation before sending.

Example:

Owner: Tell Alex I am unavailable on Friday and ask if Monday works.

Miki checks availability, drafts an email and presents the draft for approval.

Owner confirms.

Miki sends the email using the authorized Gmail account.

Implement:

- Secure Google OAuth authorization.
- Email drafting.
- Owner-approved email sending.
- Email thread tracking.
- Incoming reply detection.
- Telegram notifications for relevant incoming replies.
- Continued conversations through Telegram.
- Delivery failure handling.
- Audit history.

Maintain mappings between:

- Visitor identifier.
- Meeting request or enquiry identifier.
- Gmail message ID.
- Gmail thread ID.
- Telegram message ID.
- Conversation state.

Use Gmail threading correctly so responses remain part of the original email conversation.

Evaluate Gmail push notifications through Google Cloud Pub/Sub versus scheduled polling.

If using Gmail push notifications, implement watch renewal, history synchronization and recovery from missed notifications.

Only relay replies associated with Miki-managed conversations.

Do not forward unrelated personal emails to Telegram.

Consider a dedicated mailbox or restricted email label where practical.

Do not request broad Gmail permissions without explaining why they are necessary.

If Gmail authorization or verification requirements introduce significant complexity, present an alternative using Resend with inbound email handling before proceeding.

## 9. PostHog Visitor Notifications

Reuse the existing PostHog integration.

Send a Telegram push notification when the website reaches five distinct tracked visitors within a calendar day.

Use Europe/London as the default daily boundary.

Count distinct PostHog visitor identifiers rather than raw IP addresses.

Treat this metric as distinct tracked browsers or devices, not guaranteed unique individuals.

Exclude owner activity, development traffic and known automated traffic where identifiable.

Default behaviour:

- Threshold: five.
- Notify once per day when the threshold is reached.
- Reset at midnight London time.

Support optional additional milestones and configurable thresholds through Telegram.

Example notification:

Miki — Website Activity

Your portfolio has reached five distinct tracked visitors today.

Implement persistent milestone deduplication so repeated checks do not trigger duplicate notifications.

Use Vercel Cron if the existing hosting plan supports the required frequency.

Otherwise, propose a compatible low-cost scheduling alternative.

Do not upgrade the hosting plan or introduce paid services without approval.

## 10. Agent Tools

Extend the existing agent with validated structured tools.

Public tools:

- search_knowledge_base
- get_public_availability
- suggest_meeting_times
- submit_meeting_request
- submit_professional_enquiry

Private owner tools:

- list_pending_requests
- approve_meeting_request
- decline_meeting_request
- propose_reschedule
- get_upcoming_meetings
- get_visitor_metrics
- update_notification_preferences
- update_booking_availability
- draft_email_reply
- send_approved_email
- get_managed_email_thread

Privileged operations must require authenticated owner context.

The public website agent must not be able to invoke private tools.

All irreversible external actions must require appropriate owner authorization.

## 11. Infrastructure

Both existing applications are deployed on Vercel.

Preserve both deployments and their existing repository architecture.

Reuse the existing database and authentication infrastructure where suitable.

Introduce only the persistence required for:

- Meeting requests.
- Professional enquiries.
- Calendar authorization.
- Email conversation mappings.
- Notification preferences.
- Visitor milestones.
- Telegram conversation state.
- Pending approvals.
- Action audit logs.

Use durable persistence rather than relying on in-memory state within Vercel functions.

Account for serverless execution limits, webhook retries and asynchronous operations.

Do not assume a persistent background process is available.

Keep all API keys and OAuth credentials server-side.

## 12. Security and Privacy

- Strict separation between public and private agent permissions.
- Owner-only Telegram access.
- Secure OAuth token storage.
- Minimum necessary Google API scopes.
- Validated webhook requests.
- Rate limiting and bot protection.
- Visitor email verification.
- Prompt injection protection.
- Idempotent external operations.
- Replay protection.
- No unauthorized email sending.
- No unauthorized calendar changes.
- No disclosure of private calendar or email information.
- No raw IP storage or invasive fingerprinting.
- No sensitive visitor information in PostHog analytics.
- Appropriate data retention and privacy notice updates.

## 13. Implementation Phases

### Phase 1 — Audit and Rebranding

Inspect existing repositories, deployments and integrations.

Rename the assistant to Miki without altering the approved visual design.

### Phase 2 — Scheduling

Implement Google Calendar authorization, availability checking, booking requests and Google Meet generation.

### Phase 3 — Telegram

Implement private owner authentication, push notifications, meeting approval buttons and natural-language owner interactions.

### Phase 4 — Gmail

Implement approved email sending, thread mappings, incoming reply detection and Telegram-based communication.

### Phase 5 — Visitor Intelligence

Implement PostHog threshold monitoring, notification preferences and milestone deduplication.

### Phase 6 — Testing and Deployment Preparation

Test integrations, authorization, failure recovery, duplicate prevention and existing website functionality.

Run production builds and regression tests.

Verify that the existing website design and functionality remain unchanged outside the approved feature additions.

## 14. Agent Instructions

Read the existing CLAUDE.md and relevant globally installed skills.

This specification supersedes conflicting V2 requirements.

Do not perform another redesign.

Do not introduce unrelated features.

Before implementation, provide:

- Current architecture assessment.
- Proposed implementation architecture.
- Required Google API permissions.
- Telegram bot setup instructions.
- Required environment variables.
- Database changes.
- Vercel scheduling requirements.
- Estimated operating costs.
- Security considerations.
- Implementation phases.
- Identified blockers.

Request approval before introducing new paid services, destructive changes or significant architectural modifications.

Do not deploy to production without approval.

The objective is to make Miki a functional personal assistant while preserving the existing portfolio exactly as approved.