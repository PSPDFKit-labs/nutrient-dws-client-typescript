# Contributing to Nutrient DWS TypeScript Client

Thank you for your interest in contributing to the Nutrient DWS TypeScript Client! This document provides a quick overview of our development standards and practices. For more detailed information about the library itself, please refer to the [README](./README.md), [Methods Documentation](./METHODS.md), and [Workflow Documentation](./WORKFLOW.md).

## Development Standards

### Commit Message Convention

We use [Conventional Commits](https://www.conventionalcommits.org/) to ensure consistent and meaningful commit messages. This helps with:
- Automatic versioning
- Clear change logs
- Better collaboration

#### Commit Message Format

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

#### Types

- **feat**: A new feature
- **fix**: A bug fix
- **docs**: Documentation only changes
- **style**: Changes that do not affect the meaning of the code (white-space, formatting, etc)
- **refactor**: A code change that neither fixes a bug nor adds a feature
- **perf**: A code change that improves performance
- **test**: Adding missing tests or correcting existing tests
- **build**: Changes that affect the build system or external dependencies
- **ci**: Changes to CI configuration files and scripts
- **chore**: Other changes that don't modify src or test files
- **revert**: Reverts a previous commit

#### Examples

```bash
# Feature
feat(client): add convert document method
feat: implement file input validation

# Bug fix
fix(http): handle authentication token refresh
fix: resolve memory leak in workflow execution

# Documentation
docs: update API reference for client options
docs(readme): add installation instructions

# Refactoring
refactor(types): simplify operation interface hierarchy
refactor: extract case transformation to utils

# Build/tooling
build: add commitlint configuration
chore: update dependencies to latest versions
```

#### Scopes (Optional)

Use scopes to indicate which part of the codebase is affected:
- `client` - Main NutrientClient class
- `workflow` - WorkflowBuilder functionality
- `http` - HTTP layer and requests
- `types` - TypeScript interfaces and types
- `utils` - Utility functions
- `errors` - Error handling
- `inputs` - File input processing

### Making Commits

```bash
# Ensure your commit message follows the convention
git commit -m "feat(client): add document conversion method"
```

### Commit Best Practices

#### Atomic Commits
- **One logical change per commit**
- Each commit should represent a complete, working change
- If you need to add multiple files for one feature, commit them together

#### Good Examples:
```bash
feat(types): add FileInput interface
feat(types): add type guards for file validation
feat(inputs): implement file input processor
test(inputs): add unit tests for file input processor
```

#### Bad Examples:
```bash
# Too broad - multiple unrelated changes
feat: add types, fix bugs, update docs

# Too granular - incomplete changes
feat: start adding types
fix: continue fixing bug from previous commit
```

#### Commit Message Guidelines

1. **Use imperative mood**: "add feature" not "added feature"
2. **Be concise but descriptive**: Explain what and why, not how
3. **Reference issues when applicable**: "fixes #123" or "closes #456"
4. **Keep the subject line under 50 characters**
5. **Use body for additional context when needed**

#### Examples with Body:

```bash
feat(workflow): add parallel execution support

Allow multiple operations to run concurrently when they don't
depend on each other's outputs. This improves performance for
complex workflows with independent operations.

Closes #45
```

```bash
fix(http): handle network timeout errors

Previously, network timeouts would cause uncaught exceptions.
Now they are properly caught and converted to NutrientError
instances with appropriate error codes.

Fixes #78
```

## Pull Request Guidelines

### Branch Naming Convention

Use descriptive branch names that follow this pattern:
```
<type>/<short-description>
```

**Examples:**
```bash
feat/add-document-conversion
fix/authentication-token-refresh
docs/update-api-reference
refactor/simplify-error-handling
test/add-workflow-tests
```

**Branch Types:**
- `feat/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation changes
- `refactor/` - Code refactoring
- `test/` - Adding or updating tests
- `perf/` - Performance improvements
- `chore/` - Maintenance tasks

### Pull Request Workflow

#### 1. Fork and Clone
```bash
# Fork the repository on GitHub, then clone your fork
git clone https://github.com/YOUR_USERNAME/nutrient-dws-client-typescript.git
cd nutrient-dws-client-typescript

# Add upstream remote
git remote add upstream https://github.com/pspdfkit-labs/nutrient-dws-client-typescript.git
```

#### 2. Create Feature Branch
```bash
# Ensure you're on main and up to date
git checkout main
git pull upstream main

# Create your feature branch
git checkout -b feat/your-feature-name
```

#### 3. Development Process
Follow our atomic commit standards:

```bash
# Make small, focused changes
# Each commit should be a complete, logical unit

# Stage and commit using conventional commits
git add src/errors.ts
git commit -m "feat(errors): add NutrientError base class"

git add src/errors.ts
git commit -m "feat(errors): add ValidationError class"

git add tests/errors.test.ts
git commit -m "test(errors): add unit tests for error classes"
```

#### 4. Keep Branch Updated
```bash
# Regularly sync with upstream main
git fetch upstream
git rebase upstream/main
```

#### 5. Pre-submission Checklist

Before creating your PR, ensure:

- [ ] **All commits follow conventional format**
- [ ] **Each commit is atomic (one logical change)**
- [ ] **All tests pass**: `npm test`
- [ ] **Code is properly formatted**: `npm run format`
- [ ] **No linting errors**: `npm run lint`
- [ ] **TypeScript compiles**: `npm run typecheck`
- [ ] **Build succeeds**: `npm run build`
- [ ] **New features have tests**
- [ ] **Public APIs have JSDoc comments**
- [ ] **Breaking changes are documented**

#### 6. Create Pull Request

**PR Title Format:**
Use the same format as commit messages:
```
<type>[optional scope]: <description>
```

**Examples:**
```
feat(client): add document conversion methods
fix(http): resolve authentication token refresh issue
docs: update API usage examples
```

**PR Description Template:**

```markdown
## Summary
Brief description of what this PR does and why.

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## Changes Made
- List the specific changes
- Use bullet points for clarity
- Reference relevant files

## Testing
- [ ] Unit tests added/updated
- [ ] All existing tests pass
- [ ] Manual testing performed

## Related Issues
Closes #123
Fixes #456
```

### Pull Request Standards

#### Atomic PR Principle
Each PR should:
- **Address one concern** - Don't mix features, fixes, and refactoring
- **Have focused scope** - Related changes only
- **Be reviewable** - Not too large (aim for <500 lines changed)

#### Good PR Examples:
```
feat(client): add document conversion methods
├── Add convert() method to NutrientClient
├── Add conversion options interface
├── Add unit tests for conversion
└── Update API documentation
```

```
fix(http): resolve timeout handling
├── Fix timeout error handling in sendRequest()
├── Add timeout-specific error class
└── Add tests for timeout scenarios
```

#### Bad PR Examples:
```
feat: add multiple features and fix bugs
├── Add conversion methods
├── Fix authentication bug
├── Update documentation
├── Refactor error handling
└── Add new workflow features
```

### Code Review Standards

#### For Contributors
- **Self-review first** - Review your own PR before requesting review
- **Write clear descriptions** - Explain the what and why
- **Respond promptly** - Address review feedback quickly
- **Be open to feedback** - Code review improves code quality

#### Review Criteria
Reviewers will check for:

1. **Code Quality**
   - Follows TypeScript best practices
   - No ESLint violations
   - Proper error handling
   - Performance considerations

2. **Testing**
   - Adequate test coverage
   - Tests are meaningful and thorough
   - Edge cases covered

3. **Documentation**
   - JSDoc comments for public APIs
   - README updates if needed
   - Breaking changes documented

4. **Commit Standards**
   - Conventional commit format
   - Atomic commits
   - Clear commit messages

5. **Backwards Compatibility**
   - No breaking changes without major version
   - Deprecation notices for removed features

### Development Workflow

1. **Setup Development Environment**
   ```bash
   # Ensure you have Node.js 18.0.0 or higher installed
   node --version

   # Install dependencies
   npm install
   npm run build  # Verify everything works
   npm test       # Ensure tests pass
   ```

2. **Make Changes Following Standards**
   - Write tests first (TDD approach recommended)
   - Make atomic commits
   - Use conventional commit format

3. **Quality Checks**
   ```bash
   npm run lint:fix    # Fix linting issues
   npm run format      # Format code
   npm run typecheck   # Verify TypeScript
   npm test            # Run tests
   npm run build       # Verify build
   ```

4. **Submit PR**
   - Use proper title format
   - Fill out PR template completely
   - Request review from maintainers

### Code Quality Standards

- **TypeScript strict mode**: All code must pass strict type checking
- **ESLint compliance**: Follow configured linting rules
- **Test coverage**: Maintain >90% test coverage
- **Documentation**: Add JSDoc comments for public APIs

### Pre-commit Hooks

Our pre-commit hooks will:
- Run ESLint and fix auto-fixable issues
- Format code with Prettier
- Validate commit messages against conventional commit format

### Node.js Version Requirement

This project requires Node.js version 18.0.0 or higher. Make sure you have the correct version installed before setting up the development environment.

### Questions?

If you have questions about these guidelines or need help with contributions, please:
- Open an issue for discussion
- Check existing issues and discussions
- Review the project documentation

Thank you for contributing to making this library better!
