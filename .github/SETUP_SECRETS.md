# Setting Up GitHub Secrets for Integration Tests

## ⚠️ IMPORTANT SECURITY NOTICE

**NEVER commit API keys or secrets directly to your repository!** Always use GitHub Secrets for sensitive information.

## Required Secrets

To run the Integration tests in GitHub Actions, you need to configure the following secrets:

### 1. NUTRIENT_API_KEY (Required)
Your Nutrient DWS Processor API key for running integration tests.

### 2. NPM_TOKEN (Optional)
Required only if you want to automatically publish to NPM.

### 3. SNYK_TOKEN (Optional)
Required only if you want to run Snyk security scans.

## How to Add Secrets

1. Go to your repository on GitHub
2. Click on **Settings** (you need admin access)
3. In the left sidebar, click **Secrets and variables** → **Actions**
4. Click **New repository secret**
5. Add each secret:
   - Name: `NUTRIENT_API_KEY`
   - Value: Your API key (without quotes)
   - Click **Add secret**

## Security Best Practices

### 1. Rotate API Keys Regularly
- Create a schedule to rotate your API keys every 90 days
- Update the GitHub secret when you rotate keys

### 2. Use Scoped API Keys
- If possible, use API keys with limited scope for testing
- Never use production API keys for testing

### 3. Monitor Usage
- Regularly check your API key usage
- Set up alerts for unusual activity

### 4. Restrict Secret Access
- GitHub secrets are only available to workflows running on your repository
- They are not exposed to pull requests from forks
- Integration tests only run on:
  - Pushes to main branch
  - Pull requests from the same repository

### 5. Environment-Specific Keys
Consider using different API keys for different environments:

```yaml
# In your workflow
env:
  NUTRIENT_API_KEY: ${{ github.ref == 'refs/heads/main' && secrets.NUTRIENT_API_KEY_PROD || secrets.NUTRIENT_API_KEY_DEV }}
```

## Workflow Security Features

Our GitHub Actions workflows include several security features:

1. **Secret Scanning**: Automatically checks for hardcoded secrets
2. **Dependency Scanning**: Checks for vulnerable dependencies
3. **Code Scanning**: Uses CodeQL to find security vulnerabilities
4. **Limited Integration Execution**: Integration tests only run on trusted sources

## Local Development

For local development, use environment variables:

```bash
# Create a .env file (already in .gitignore)
echo "NUTRIENT_API_KEY=your_api_key_here" > .env

# Run integration tests locally
source .env
npm run test:integration
```

## Troubleshooting

### Integration Tests Not Running
- Check that the secret is properly set in GitHub
- Verify the secret name matches exactly: `NUTRIENT_API_KEY`
- Check the workflow logs for authentication errors

### Authentication Errors
- Ensure the API key is valid and active
- Check that the API key has the necessary permissions
- Verify the API key format (no extra spaces or quotes)

## Emergency Response

If an API key is accidentally exposed:

1. **Immediately revoke the exposed key** in your Nutrient dashboard
2. **Generate a new API key**
3. **Update the GitHub secret** with the new key
4. **Check logs** for any unauthorized usage
5. **Run security scan** to ensure no other secrets are exposed

## Questions?

If you have questions about security or need help setting up secrets, please open an issue (without including any sensitive information).