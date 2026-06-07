## ADDED Requirements

### Requirement: No known high or critical dependency vulnerabilities

The project's installed dependency tree (as resolved in `yarn.lock`) MUST NOT contain
any dependency with a known advisory of **high** or **critical** severity. This
explicitly includes the React Server Components RCE (CVE-2025-66478 / CVE-2025-55182)
and the ESLint-toolchain advisories in `glob` and `minimatch`.

#### Scenario: Critical RCE is patched

- **WHEN** the dependency tree is resolved after the change
- **THEN** `next` is on the patched `15.5.x` line (`>= 15.5.9`)
- **AND** `react` and `react-dom` are on a patched stable `19.x` release per the
  official advisory matrix
- **AND** no advisory for CVE-2025-66478 / CVE-2025-55182 applies to any resolved
  version

#### Scenario: Audit reports no high or critical findings

- **WHEN** a dependency audit is run against the resolved tree
- **THEN** it reports zero vulnerabilities of high or critical severity
- **AND** any remaining moderate/low findings are recorded with a justification

### Requirement: No pre-release packages in production dependencies

Production `dependencies` in `package.json` MUST resolve to stable releases. Release
candidates, alphas, betas, and other pre-release identifiers MUST NOT be used for
runtime dependencies.

#### Scenario: React is on a stable release

- **WHEN** `package.json` `dependencies` are inspected
- **THEN** `react` and `react-dom` resolve to a stable `19.x` version
- **AND** no production dependency version contains a pre-release tag
  (`-rc`, `-alpha`, `-beta`, `-canary`)

### Requirement: Toolchain versions are mutually consistent

Lint and build tooling tied to the framework version MUST be aligned with it, so the
toolchain reflects the framework actually in use.

#### Scenario: ESLint config matches the Next.js major

- **WHEN** `eslint-config-next` is inspected
- **THEN** its major version matches the installed `next` major version (15.x)

### Requirement: Clean build and lint as the pre-deploy gate

The production build and the linter MUST both complete successfully with no errors
before the site is considered fit for deployment.

#### Scenario: Production build succeeds

- **WHEN** `yarn build` is run on the updated dependency tree
- **THEN** the build completes successfully with no errors

#### Scenario: Lint passes

- **WHEN** `yarn lint` is run
- **THEN** it completes with no errors

#### Scenario: Application renders after the React stable upgrade

- **WHEN** the app is started and the landing page is loaded after the RC→stable move
- **THEN** the hero, experience, and education sections render without console or
  hydration errors
