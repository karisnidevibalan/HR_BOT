export const config = {
    provider: process.env.PROVIDER || 'groq',
    groqApiKey: process.env.GROQ_API_KEY || '',
    openAiApiKey: process.env.OPENAI_API_KEY || '',
    salesforceInstance: process.env.SALESFORCE_INSTANCE || '',
    salesforceAccessToken: process.env.SALESFORCE_ACCESS_TOKEN || ''
};