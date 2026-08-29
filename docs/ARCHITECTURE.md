# Architecture

TaxPath is a lightweight React + TypeScript + Vite single-page prototype. It is designed to be deployable to any static browser host.

UI state and accessible components → synthetic scenario fixtures → deterministic prototype calculation helpers → plain-language template explanations.

## Mock API boundary

The prototype keeps data local for fast, safe demos. A production-ready adaptation would expose mock-contract routes for citizen, tax year, documents, Form 16, AIS, 26AS, opportunities, mismatches, readiness, document upload, questions, scenarios, simulations, and explanations.

The UI presently simulates upload parsing with a controlled Form 16 fixture. This prevents accidental processing of real PII and keeps the demonstration deterministic.

## Core entities

Citizen, TaxYear, Document, Form16, AISRecord, TDSRecord, IncomeRecord, Deduction, TaxOpportunity, TaxMismatch, TaxScenario, TaxCalculation, ReadinessCheck, and ConversationContext.

## Safety boundary

No LLM determines tax liability, eligibility, compliance, or filing status. The assistant UI returns deterministic, context-aware copy based on visible synthetic data.
