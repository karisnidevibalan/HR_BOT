import Groq from "groq-sdk";
import * as fs from 'fs';
import * as path from 'path';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

// Load HR policy data
const leavePolicy = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/leavePolicy.json'), 'utf8'));
const holidays = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/holidays.json'), 'utf8'));
const wfhPolicy = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/wfhPolicy.json'), 'utf8'));

export class AiService {
    private buildSystemPrompt(conversationContext?: string): string {
        const contextInfo = conversationContext ? `\n\nConversation Context:\n${conversationContext}` : '';
        
        return `You are Winfomi HR Assistant, an AI-powered HR agent for Winfomi Technologies. 
        
Your primary responsibilities:
1. Answer HR policy questions about leaves, holidays, WFH, and reimbursements
2. Help employees apply for leaves and WFH
3. Provide information from company policies
4. Be friendly, professional, and helpful
5. Remember conversation context to provide more relevant responses

Company Policies Available:
- Leave Policy: ${JSON.stringify(leavePolicy, null, 2)}
- Holiday Calendar: ${JSON.stringify(holidays, null, 2)}  
- WFH Policy: ${JSON.stringify(wfhPolicy, null, 2)}

Instructions:
- Always be helpful, professional, and empathetic
- If asked about leave/WFH applications, guide users through the process step by step
- Use the policy data to answer questions accurately with specific details
- If you detect intent to apply for leave or WFH, acknowledge it and explain the process
- For reimbursement queries, provide clear process information with examples
- Keep responses concise but informative (3-5 sentences for simple queries)
- Use bullet points for lists and policies
- Always validate dates and provide helpful suggestions for incomplete information
- Be proactive in clarifying ambiguous requests

Special Commands you can suggest:
- "apply for leave" - to start leave application process
- "apply for wfh" - to start WFH application process  
- "check holiday list" - to see company holidays
- "leave policy" - to get leave policy details
- "leave balance" - to check remaining leaves${contextInfo}`;
    }

    async processMessage(message: string, context?: any): Promise<string> {
        try {
            // Build conversation context from history if available
            let conversationContext = '';
            if (context?.history && context.history.length > 0) {
                conversationContext = context.history
                    .slice(-3) // Last 3 messages for context
                    .map((h: any) => `User: ${h.message}\nIntent: ${h.intent}`)
                    .join('\n');
            }
            
            const systemPrompt = this.buildSystemPrompt(conversationContext);
            
            const response = await groq.chat.completions.create({
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: message }
                ],
                model: "llama-3.3-70b-versatile",
                temperature: 0.7,
                max_tokens: 1000,
                top_p: 0.9
            });

            return response.choices[0]?.message?.content || "I apologize, I couldn't process your request. Please try again.";
        } catch (error) {
            console.error('AI Service Error:', error);
            
            // Provide more helpful error messages
            if (error instanceof Error) {
                if (error.message.includes('rate_limit')) {
                    return "I'm currently experiencing high traffic. Please try again in a moment.";
                } else if (error.message.includes('timeout')) {
                    return "The request took too long. Please try again with a simpler query.";
                }
            }
            
            return "I'm experiencing technical difficulties. Please try again later or contact IT support.";
        }
    }

    detectIntent(message: string): string {
        const lowerMessage = message.toLowerCase();
        
        // Enhanced WFH detection with more patterns
        const wfhKeywords = ['wfh', 'work from home', 'working from home', 'remote work', 'wfh request'];
        const hasWfhKeyword = wfhKeywords.some(keyword => lowerMessage.includes(keyword));
        
        if (hasWfhKeyword) {
            // Exclude policy/informational questions
            const policyPatterns = ['policy', 'what is', 'explain', 'tell me about', 'how many', 'what are the rules'];
            const isPolicyQuestion = policyPatterns.some(pattern => lowerMessage.includes(pattern));
            
            if (!isPolicyQuestion) {
                return 'apply_wfh';
            }
            
            // If it's a policy question about WFH
            if (lowerMessage.includes('wfh') && lowerMessage.includes('policy')) {
                return 'wfh_policy';
            }
        }
        
        // Enhanced leave detection with better pattern matching
        const hasLeaveKeyword = lowerMessage.includes('leave') || lowerMessage.includes('holiday');
        
        if (hasLeaveKeyword && !hasWfhKeyword) {
            // Check for leave balance queries first
            const balanceKeywords = ['balance', 'remaining', 'how many', 'left', 'available', 'check leave', 'leave status'];
            if (balanceKeywords.some(keyword => lowerMessage.includes(keyword))) {
                return 'leave_balance';
            }
            
            // Check for policy questions
            if (lowerMessage.includes('policy') || lowerMessage.includes('what is') || lowerMessage.includes('explain')) {
                return 'leave_policy';
            }
            
            // Enhanced application intent detection
            const applicationIndicators = [
                'apply', 'want', 'need', 'i have', 'already have', 
                'give me', 'get me', 'take', 'request', 'submit',
                'yesterday', 'today', 'tomorrow', 'next week', 'last week'
            ];
            
            const hasApplicationIntent = applicationIndicators.some(indicator => lowerMessage.includes(indicator));
            
            // Check for date patterns which strongly suggest application
            const hasDatePattern = /\b(on|from|for|at)\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|\d{1,2})/i.test(lowerMessage) ||
                                  /\d{1,2}(th|st|nd|rd)/i.test(lowerMessage) ||
                                  /\d{1,2}[.\-/]\d{1,2}/i.test(lowerMessage);
            
            if (hasApplicationIntent || hasDatePattern) {
                return 'apply_leave';
            }
        }
        
        // Holiday list query
        if (lowerMessage.includes('holiday') && (lowerMessage.includes('list') || lowerMessage.includes('calendar') || lowerMessage.includes('show'))) {
            return 'holiday_list';
        }
        
        // Reimbursement queries
        if (lowerMessage.includes('reimbursement') || lowerMessage.includes('reimburse') || lowerMessage.includes('claim')) {
            return 'reimbursement_info';
        }
        
        // Default to general query
        return 'general_query';
    }

    parseQuery(query: string): any {
        return { intent: this.detectIntent(query), originalQuery: query };
    }

    generateResponse(parsedQuery: any): string {
        return "Response generated based on parsed query";
    }
}