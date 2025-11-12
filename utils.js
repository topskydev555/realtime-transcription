// Text processing utilities for transcription

function isEnglishText(text) {
  if (!text || text.trim().length === 0) return false;
  
  const cleanText = text.replace(/[.,!?;:\s\-'"]/g, '');
  if (cleanText.length === 0) return true;
  
  const englishChars = cleanText.match(/[A-Za-z0-9]/g) || [];
  const englishRatio = englishChars.length / cleanText.length;
  
  if (englishRatio >= 0.8) return true;
  
  const nonEnglishPatterns = [
    /[àáâãäåæçèéêëìíîïðñòóôõöøùúûüýþÿ]/i,
    /[А-Яа-яЁё]/,
    /[一-龯]/,
    /[ひらがなカタカナ]/,
    /[ㄱ-ㅎㅏ-ㅣ가-힣]/,
    /[α-ωΑ-Ω]/,
    /[א-ת]/,
    /[ء-ي]/,
  ];
  
  for (const pattern of nonEnglishPatterns) {
    if (pattern.test(text)) {
      return false;
    }
  }
  
  return englishRatio >= 0.5;
}

function normalizeText(text) {
  return text
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\s+([.,!?;:])/g, '$1')
    .replace(/([.,!?;:])\s*([.,!?;:])/g, '$1')
    .trim();
}

function mergeText(existing, newText) {
  if (!existing) return newText;
  if (!newText) return existing;

  const existingWords = existing.trim().split(/\s+/);
  const newWords = newText.trim().split(/\s+/);
  
  let overlap = 0;
  const maxOverlap = Math.min(existingWords.length, newWords.length, 5);
  
  for (let i = 1; i <= maxOverlap; i++) {
    const existingEnd = existingWords.slice(-i).join(' ').toLowerCase();
    const newStart = newWords.slice(0, i).join(' ').toLowerCase();
    
    if (existingEnd === newStart) {
      overlap = i;
      break;
    }
  }

  if (overlap > 0) {
    return existingWords.slice(0, -overlap).join(' ') + ' ' + newWords.join(' ');
  }

  return existing + ' ' + newText;
}

