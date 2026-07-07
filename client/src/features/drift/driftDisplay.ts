export const driftAnalysisTitle = (inputText: string) => {
  const words = inputText.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return 'Saved client input';
  return `${words.slice(0, 8).join(' ')}${words.length > 8 ? '...' : ''}`;
};
