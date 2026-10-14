# ProbeX Vision

This document outlines the vision and principles of the ProbeX platform.

## Problem

Understanding what applications are doing while they run is often difficult, slow, and expensive.

When an incident happens, engineers frequently lack the runtime information they need. Getting it often requires reproducing issues locally, adding temporary instrumentation, or repeatedly redeploying applications.

Traditional instrumentation is valuable, but it only captures what was anticipated in advance. Missing data often requires code changes and additional deployments before an issue can be investigated.

Commercial runtime tooling exists, but it is often expensive, proprietary, or difficult to adopt for smaller teams and open-source projects.

## Vision

Insight into running applications should be accessible to every team.

Engineers should be able to inspect, understand, and troubleshoot their applications where they actually run, without needing to rely on closed infrastructures or proprietary solutions.

ProbeX aims to provide a simple, open-source runtime platform that is easy to adopt for any team.

## Scope

ProbeX starts with runtime debugging: inspecting the state of live applications without changing code or redeploying.

The platform is designed so that additional capabilities, such as logging and broader observability, can be built on the same foundation over time.

## Principles

- Runtime-first
- Lightweight
- Extensible
- Open
- Production-ready
