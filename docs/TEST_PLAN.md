# Test plan

## Automated

- Unit: NPS prototype estimate is capped at ₹50,000 and includes the visible 4% cess assumption.
- Unit: TDS difference is calculated deterministically.
- Build: TypeScript compilation and production bundle generation.

## Judge-flow manual checks

1. Start default demo and select Form 16.
2. Confirm synthetic parsing advances to the extracted tax snapshot.
3. Open “Why are you asking?” and confirm the rationale is plain language.
4. Choose NPS and confirm the impact reads “Estimated, not confirmed.”
5. Open “Show me why” and confirm inputs/assumptions are visible.
6. Open readiness and confirm ₹1,42,000 versus ₹1,32,000 produces “Don’t file yet.”
7. Change scenarios: clean case becomes ready; bank-interest case becomes almost ready.
8. Switch light, dark, and system themes; refresh and confirm persistence.
9. Check desktop and mobile widths, keyboard focus, button labels, semantic controls, and reduced-motion behaviour.
10. Verify that no screen asks for real credentials or implies TaxPath is official.

## Future end-to-end coverage

The intended browser journey is login/demo home → Form 16 → parsing → understood → NPS question → opportunity explanation → readiness → mismatch actions. An end-to-end package is intentionally deferred to keep the static hackathon prototype lean.
