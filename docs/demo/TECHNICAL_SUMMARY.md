# Know Thyself - Technical Overview

## What It Is

A next-generation clinical simulation platform that transforms medical education through AI-powered patient interactions. Unlike static training modules, Know Thyself provides a complete content-to-training pipeline where medical educators author realistic scenarios without coding, and students experience dynamic, evidence-based patient simulations with metacognitive skill development.

## Four-Agent Architecture

- **Paramedic Master:** Conversational scenario authoring interface enabling medical educators to create complex clinical scenarios through natural dialogue—no coding required, generating structured JSON for immediate deployment
- **Cognitive Coach:** Pre-scenario metacognitive preparation using research-based questioning frameworks to activate prior knowledge and establish cognitive scaffolding before clinical encounters
- **Core Agent:** High-fidelity patient simulation featuring dynamic physiology, progressive information disclosure (vital signs revealed only through proper examination), and realistic responses aligned with clinical guidelines
- **AAR Agent:** Sophisticated pattern recognition analyzing student performance across 8 clinical dimensions (scene safety, patient assessment, critical thinking, treatment quality, communication, time management, clinical knowledge, professionalism) with evidence-based feedback

## Key Technical Innovations

- **Layer 2 Architecture:** Engineered 80% cost reduction through dynamic context extraction—students interact with 300-line focused contexts while Core Agent maintains awareness of complete 2,000-line scenarios, enabling scalable deployment
- **Progressive Information Disclosure:** Simulates real-world clinical workflows where vital signs, physical findings, and patient responses are revealed only through appropriate examination techniques and questions
- **Evidence-Based Clinical Modeling:** Treatment responses and patient deterioration/improvement follow established medical protocols (European Resuscitation Council guidelines) ensuring educational validity
- **Zero-Code Content Pipeline:** Medical educators with zero programming experience create unlimited scenarios through conversational interface, democratizing advanced simulation content creation
- **Production-Ready Architecture:** 9 specialized backend services (~10,000 lines) handling user management, scenario orchestration, agent coordination, real-time WebSocket communication, and research-grade analytics

## Technology Stack

**Content Creation:** Claude Sonnet 4 (Paramedic Master - separate project)
**Frontend:** React 18+, TypeScript, Tailwind CSS, Zustand state management
**Backend:** Node.js, Express, PostgreSQL, Prisma ORM
**AI Integration:** Claude Sonnet 4 API with prompt caching
**Deployment:** Railway (MVP), AWS-ready architecture

## Scale & Metrics

- **Codebase:** ~10,000 lines production-quality code
- **Content Library:** 4 complete clinical scenarios (STEMI, Acute Asthma, Status Epilepticus, Traumatic Brain Injury)
- **Service Architecture:** 9 specialized backend services with clear separation of concerns
- **Token Efficiency:** 300-500 lines per interaction vs 2,000+ line full scenarios (80% reduction)
- **Cost Optimization:** 50-70% savings via Claude prompt caching on scenario content
- **Research Infrastructure:** Built-in A/B testing framework for educational outcomes research

## Clinical Validation

- **Evidence-Based Protocols:** Aligned with European Resuscitation Council guidelines and current emergency medicine best practices
- **Target Pilot:** Slovak paramedic university students (collaboration in development)
- **Clinical Governance:** Advisory board formation in progress for ongoing medical accuracy validation
- **Domain Expertise:** Developed by licensed paramedic with 5+ years emergency medical services experience, ensuring authentic clinical workflows

## Development Approach

- Solo full-stack development demonstrating end-to-end technical capabilities
- Iterative, evidence-based design methodology incorporating educational research
- Production-quality code standards with comprehensive error handling and monitoring
- Research methodology integration enabling future educational outcomes studies

## Business Context

- **Market Opportunity:** Healthcare professional education (€110B+ global market)
- **Go-to-Market Strategy:** Slovak paramedic education beachhead → EU healthcare professional expansion
- **Revenue Model:** B2B institutional licensing + B2C subscription tiers
- **Core Differentiator:** Complete content creation pipeline vs static competitors requiring expensive custom development

## Competitive Positioning

**Traditional Platforms:** Static pre-built content, expensive custom scenario development ($10K-50K per scenario), limited scalability
**Know Thyself:** Medical educators create unlimited scenarios without coding, dynamic AI-driven interactions, continuous content expansion
**Market Gap:** No existing platform offers both sophisticated clinical simulation AND scalable educator-driven content creation

## Developer Profile

- **Clinical Foundation:** Licensed paramedic with 5+ years emergency medical services experience
- **Technical Evolution:** Self-taught full-stack developer building production-grade applications
- **Unique Bridge:** Rare combination of clinical expertise and technical implementation capability
- **Domain Insight:** Deep understanding of healthcare workflows, clinical decision-making, and educational pain points

---

*Created for job applications and professional discussions. This document represents a production-ready MVP with clear path to commercial deployment and educational research validation.*
