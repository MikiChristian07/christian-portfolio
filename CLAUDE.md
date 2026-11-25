# Christian Onovo — AI-Native Personal Portfolio

## 1. Project Mission

Transform my existing personal portfolio into a premium, visually distinctive, AI-native personal website that reflects my identity as a software engineer, technology leader, product builder and cybersecurity researcher.

Existing portfolio: https://www.christianonovo.com/

Existing digital twin: https://digital-twin-mtyb.onrender.com/

The objective is to unify both experiences into a single cohesive digital product. Visitors should be able to explore my professional background, discover my projects and interact with my digital twin without leaving the website.

This must not look or feel like a conventional developer portfolio or a generic AI-generated website.

## 2. Agent Skills

Discover and utilize all relevant globally installed agent skills before beginning implementation.

Prioritize the following skills where available:

- **Frontend Design:** Creative direction and distinctive interface design.
- **Impeccable:** Typography, visual hierarchy, composition and design refinement.
- **Emil Kowalski:** Animation, transitions, micro-interactions and interaction design.
- **UI/UX Pro Max:** Design systems, accessibility, responsive layouts and usability.
- **Vercel Agent Skills:** React architecture, performance optimization and frontend engineering.

Read the relevant SKILL.md files and apply their instructions throughout implementation.

Do not merely acknowledge the skills. Demonstrate their application in the actual implementation.

Where skills conflict, prioritize usability, accessibility, performance and visual consistency.

## 3. Creative Direction

The website should feel like a combination of:

- A premium technology founder's personal website.
- An award-winning creative engineering portfolio.
- A sophisticated AI-native digital product.
- A modern editorial experience.

The design should communicate intelligence, technical competence, curiosity and sophistication without appearing unnecessarily complicated.

### Visual Language

- Obsidian black, charcoal and warm off-white.
- Restrained accent colours.
- Strong editorial typography.
- Generous and intentional whitespace.
- Selective glassmorphism and backdrop blur.
- Subtle ambient lighting.
- Layered surfaces and visual depth.
- Asymmetric layouts where appropriate.
- Interactive Bento grids.
- Subtle grain and texture.
- High-quality project imagery.

Treat this palette as an initial direction, not an inflexible requirement. Explore stronger alternatives during the design phase.

### Avoid

- Generic AI-generated interfaces.
- Excessive purple gradients.
- Excessive rounded cards.
- Unnecessary glowing elements.
- Repetitive layouts.
- Overuse of glassmorphism.
- Stock illustrations without purpose.
- Generic marketing copy.
- Animations that interfere with usability.
- Visual complexity without functional value.

Every design decision must have a purpose.

## 4. Animation and Interaction System

Use the installed animation and interaction design skills to create a refined, responsive experience.

Implement where appropriate:

- Smooth page transitions.
- Staggered content reveals.
- Animated button states.
- Magnetic hover interactions.
- Shared layout transitions.
- Scroll-driven storytelling.
- Interactive project previews.
- Animated navigation indicators.
- Subtle text reveals.
- Contextual cursor interactions.
- Expandable AI conversation interfaces.
- Spring-based animations.

Prefer natural, responsive animations over theatrical effects.

Use Motion, CSS animations or GSAP where appropriate. Do not introduce multiple animation libraries unnecessarily.

Animations must remain performant on mobile devices and respect prefers-reduced-motion settings.

## 5. Website Architecture

### Hero Section

Create a memorable first impression that immediately communicates who I am, what I build and my areas of expertise.

Include primary actions for:

- Exploring my work.
- Interacting with my digital twin.
- Accessing my CV.
- Contacting me.

Explore an interactive hero experience rather than defaulting to a static heading and generic portrait.

### Selected Work

Present my projects as meaningful engineering and product case studies rather than simple project cards.

Potential featured projects include:

- Insight Hub.
- Tytlflow.
- Kordy.
- AI and agentic systems.
- Cybersecurity and blockchain research.
- Other verified projects from my existing portfolio.

Each case study should communicate:

- The problem.
- The solution.
- My contribution.
- Technical architecture.
- Technologies used.
- Challenges and decisions.
- Verified outcomes.
- Relevant links.

Never fabricate project metrics or achievements.

### About

Communicate my professional background, engineering philosophy, interests and multidisciplinary expertise.

Avoid generic descriptions and exaggerated claims.

### Experience

Create an engaging professional timeline covering verified employment, leadership experience, education and significant milestones.

### Technical Expertise

Showcase relevant capabilities across:

- Software engineering.
- Full-stack development.
- AI and intelligent automation.
- Cybersecurity.
- System architecture.
- Product engineering.
- Technical leadership.
- Blockchain and post-quantum security research.

Use verified information from existing portfolio content and approved knowledge sources.

### Research

Provide a dedicated space for academic research, technical experimentation and emerging technology interests.

### Contact

Provide clear routes for professional enquiries, recruitment opportunities, collaborations and business partnerships.

## 6. Digital Twin Integration

The digital twin is a core feature of the website, not an optional chatbot.

Preserve the existing agent's intelligence, knowledge base, tools and working backend infrastructure.

Inspect the digital twin repository and deployed service before implementing integration.

Do not assume API endpoints, authentication mechanisms or response formats.

### Integration Entry Points

Implement a unified conversation experience through:

**Homepage Integration**

An embedded AI conversation interface that allows visitors to immediately ask questions about me.

**Persistent Assistant**

A discreet, expandable assistant accessible throughout the website.

**Dedicated AI Experience**

A full-screen conversational interface at /ask.

All three entry points should share reusable components and conversation state where appropriate.

### Conversation Features

- Suggested questions.
- Context-aware responses.
- Streaming responses where supported.
- Markdown rendering.
- Session-based conversation history.
- Loading and typing indicators.
- Retry and error recovery.
- Responsive mobile chat interface.
- Accessible keyboard interactions.
- Conversation reset.
- Relevant links to portfolio content.

Example questions:

- Tell me about Christian.
- What is his professional experience?
- What projects has he built?
- What programming languages does he use?
- What is his cybersecurity research about?
- Does he have engineering leadership experience?
- How can I contact him?
- Where can I download his CV?

### Contextual Awareness

Where supported, allow the digital twin to understand which section or project a visitor is currently exploring.

For example, a visitor viewing Insight Hub should be able to ask about its architecture or my involvement without repeating the project name.

### Backend Architecture

Prefer retaining the existing Render backend if it is reliable and suitable.

Use a secure server-side API proxy where appropriate.

The portfolio frontend and digital twin backend may remain in separate repositories.

Do not migrate, replace or rebuild working agent infrastructure without a justified technical reason and approval.

### Security and Privacy

- Never expose API keys or credentials.
- Implement rate limiting and abuse prevention.
- Validate incoming requests.
- Sanitize rendered content.
- Protect against prompt injection and unauthorized tool execution.
- Restrict the agent to approved public and professional information.
- Do not expose confidential company information.
- Do not disclose private personal information.
- Do not invent facts when knowledge is unavailable.
- Isolate conversations between visitors.
- Avoid unnecessary collection of personal data.

### Reliability

Handle Render cold starts, service interruptions, request timeouts and unavailable AI providers gracefully.

The portfolio must remain fully functional even when the digital twin is unavailable.

## 7. Command Palette

Implement a global command palette accessible through Cmd+K and Ctrl+K.

The command palette should support:

- Website navigation.
- Project search.
- Opening the digital twin.
- Asking questions.
- Downloading my CV.
- Accessing contact information.
- Opening professional social profiles.
- Theme switching if supported.

The command palette should be visually refined, fast and fully keyboard accessible.

## 8. Engineering Standards

Audit the existing technology stack before introducing new dependencies.

Preferred technologies where compatible:

- Next.js.
- TypeScript.
- Tailwind CSS.
- shadcn/ui primitives.
- Motion.
- cmdk.
- Lucide icons.
- Lenis where justified.
- Vercel for frontend hosting.
- Existing Render deployment for the digital twin.

These are preferences, not mandatory replacements for existing working technologies.

### Code Quality

- Modular, reusable components.
- Strong TypeScript typing.
- Clear separation of concerns.
- Consistent naming conventions.
- Centralized design tokens.
- Minimal unnecessary dependencies.
- Maintainable folder structure.
- Secure environment variable management.
- Meaningful error handling.
- No hardcoded secrets.
- No unnecessary architectural complexity.

## 9. Performance and Accessibility

Prioritize:

- Fast initial page loading.
- Optimized images and fonts.
- Lazy loading where appropriate.
- Minimal unnecessary client-side JavaScript.
- Responsive layouts.
- Semantic HTML.
- Keyboard navigation.
- Accessible colour contrast.
- Screen reader compatibility.
- Reduced-motion support.
- Stable layouts without unexpected shifts.

Target WCAG 2.2 AA accessibility and strong Lighthouse scores without compromising essential functionality.

## 10. SEO and Discoverability

Implement or preserve:

- Page-specific metadata.
- Open Graph previews.
- Structured person and project data.
- Canonical URLs.
- Sitemap.
- Robots.txt.
- Semantic heading hierarchy.
- Descriptive project URLs.
- Search-friendly content.

Important professional information must remain accessible without requiring visitors to interact with the digital twin.

## 11. Analytics

Consider privacy-conscious analytics for:

- Project views.
- CV downloads.
- Digital twin engagement.
- Conversation initiation.
- Contact interactions.
- Navigation behaviour.
- AI service errors.

PostHog may be used if appropriate and approved.

Do not introduce unnecessary tracking or collect sensitive conversation content by default.

## 12. Implementation Workflow

### Phase 1 — Discovery and Audit

- Discover globally installed agent skills.
- Inspect the existing portfolio repository.
- Inspect the digital twin repository.
- Understand existing infrastructure.
- Identify reusable components and assets.
- Document integration requirements.
- Identify technical blockers.

### Phase 2 — Creative Exploration

- Develop three distinct visual design directions.
- Explain the strengths and weaknesses of each.
- Recommend the strongest direction.
- Define typography, colour, spacing and motion systems.
- Propose the homepage composition.
- Obtain approval before committing to the final direction.

### Phase 3 — Design System and Portfolio

- Establish reusable design tokens.
- Implement foundational components.
- Redesign navigation and homepage.
- Build project case studies.
- Implement professional experience and research sections.
- Ensure mobile responsiveness.

### Phase 4 — Digital Twin Integration

- Establish the actual API contract.
- Implement secure backend communication.
- Build shared conversation components.
- Implement all conversation entry points.
- Add contextual awareness where supported.
- Implement security and reliability measures.

### Phase 5 — Interaction and Refinement

- Implement the command palette.
- Refine animations.
- Improve visual hierarchy.
- Review responsive behaviour.
- Apply relevant design refinement skills.
- Remove unnecessary visual and technical complexity.

### Phase 6 — Testing and Deployment

- Run linting and type checks.
- Run production builds.
- Test API integration.
- Test mobile and desktop layouts.
- Test keyboard accessibility.
- Test AI service failure states.
- Review performance and SEO.
- Prepare deployment documentation.

Do not deploy to production without explicit approval.

## 13. Agent Operating Rules

- Understand the existing codebase before changing it.
- Read relevant installed skills before implementation.
- Design intentionally before writing production code.
- Preserve working functionality.
- Do not fabricate professional information.
- Do not invent backend endpoints.
- Do not introduce unnecessary dependencies.
- Do not perform destructive changes without approval.
- Explain significant architectural decisions.
- Work incrementally and verify each implementation phase.
- Maintain an implementation checklist.
- Report blockers instead of silently working around critical problems.
- Run appropriate tests before marking tasks complete.
- Use browser-based visual verification when available.
- Do not claim that functionality works unless it has been tested.

## 14. Definition of Done

The project is complete when:

- The website has a distinctive and cohesive visual identity.
- The portfolio accurately represents my professional experience.
- The digital twin is seamlessly integrated into the website.
- All AI conversation entry points function correctly.
- The website remains usable when the AI service is unavailable.
- Animations are polished and performant.
- The command palette is functional.
- Desktop and mobile experiences are refined.
- Security and privacy requirements are satisfied.
- Production builds and relevant tests pass.
- The website is ready for deployment.

## Guiding Principle

Do not build another ordinary portfolio.

Build an interactive digital representation of my professional identity — one that visitors can explore, experience and have a conversation with.