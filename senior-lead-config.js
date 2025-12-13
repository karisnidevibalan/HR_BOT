// TEMPORARY CONFIG FOR TESTING
// Senior leads who get auto-approval and skip email notifications

module.exports = {
  // List of senior lead email patterns or names
  // Add your test email here!
  seniorLeads: [
    'senior@winfomi.com',
    'lead@winfomi.com', 
    'director@winfomi.com',
    'cto@winfomi.com',
    'ceo@winfomi.com',
    'manager@winfomi.com'
  ],
  
  // Keywords that identify senior leads
  seniorKeywords: [
    'senior',
    'lead', 
    'director',
    'cto',
    'ceo',
    'manager',
    'head',
    'vp'
  ],
  
  // Check if email/name is a senior lead
  isSeniorLead: function(email, name) {
    if (!email && !name) return false;
    
    const checkText = ((email || '') + ' ' + (name || '')).toLowerCase();
    
    // Check against full email list
    const exactMatch = this.seniorLeads.some(lead => 
      checkText.includes(lead.toLowerCase())
    );
    
    // Check against keywords
    const keywordMatch = this.seniorKeywords.some(keyword => 
      checkText.includes(keyword.toLowerCase())
    );
    
    return exactMatch || keywordMatch;
  },
  
  // Enable/disable this feature
  skipEmailsForSeniorLeads: true,
  autoApproveSeniorLeads: true
};
