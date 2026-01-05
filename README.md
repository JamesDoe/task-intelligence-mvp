
# Task Intelligence Truth Layer (Minimum Viable Program)

This repository contains the minimum viable implementation of a deterministic evaluation engine that defines **when a real estate transaction task or subtask is completed and why**.

It is a foundational “Truth Layer” that automation, notifications, workflows, and UI state can safely be built on with minimal overhead.

## Relationship to the Automation Roadmap

The broader automation roadmap (referred to internally as the “Automation Marathon”) describes the behaviors the platform ultimately needs: automatic task completion, reminders, scheduling, and scalable workflows.

This repository implements a proof-of-concept for the **Truth Layer** that those capabilities can depend upon.

By stabilizing how task completion is evaluated (deterministically, explainably, and without side effects), this layer enables automation to be added incrementally and safely in higher-level systems.

This project is intentionally foundational, not exhaustive.

## What This Is

This project implements a **side-effect-free task evaluation engine**.

It evaluates tasks against rulebooks using immutable events and deterministic conditions, producing explainable results such as:

- Is this task complete?
- Which conditions passed or failed?
- What evidence supports that conclusion?

This layer is intentionally:
- Deterministic
- Database agnostic
- UI independent
- Explainable
- Test-driven

## What This Is Not

This repository does **not**:

- Mutate task state
- Trigger automation
- Send notifications
- Schedule events
- Manage permissions
- Implement UI or workflows

Those capabilities are layered **on top of** this Truth Layer in higher-level systems.

## Core Concepts

- **Event** – An immutable record of something that happened
- **Condition** – A deterministic boolean check over events
- **Rulebook** – A named set of conditions defining task completion
- **Evaluation** – A pure function returning pass/fail with evidence

Canonical definitions and semantics live in the Ground Truth document (see below).

## Golden Tests

Golden tests define the **semantics** of task completion.

They lock in behaviors such as:
- Anchor-relative time windows
- Deterministic event selection
- Inclusive deadlines
- Explicit failure modes

If a golden test fails, the implementation must change — not the test — unless a formal design decision is made.

Golden tests protect correctness, explainability, and future automation.

## Ground Truth

The authoritative specification for this system lives here:

📄 **docs/Task_Intelligence_Truth_Layer_MVP.pdf**

That document defines:
- Canonical semantics
- Locked behaviors
- MVP scope boundaries
- Evolution roadmap

This README is a guide.  
The PDF is the source of truth.

## Running Tests

This project is fully DB-free and uses Vitest.

```bash
npm install
npm test
