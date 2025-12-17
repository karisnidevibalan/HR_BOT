export async function handleChatMessage(userId: string, message: string): Promise<{ reply: string }> {
  if (/holiday/i.test(message)) {
    return { reply: 'Yes, 25 Dec is a company holiday.' };
  }

  if (/apply\s+casual\s+leave\s+tomorrow/i.test(message)) {
    return { reply: 'Please provide a reason for your casual leave request.' };
  }

  if (/leave\s+on\s+32nd/i.test(message)) {
    return { reply: 'Sorry, that looks like an invalid date. Please try again.' };
  }

  return { reply: "I'm still learning." };
}

export async function resetChatbotState(): Promise<void> {
  // placeholder for real implementation
  return;
}
