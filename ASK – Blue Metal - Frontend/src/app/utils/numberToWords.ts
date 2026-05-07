/**
 * Convert a number to words (Indian English format)
 * Example: 12751.20 -> "Twelve Thousand Seven Hundred and Fifty One and Twenty Paise Only"
 */

const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];

function convertLessThanThousand(num: number): string {
  if (num === 0) return '';
  
  let result = '';
  
  if (num >= 100) {
    result += ones[Math.floor(num / 100)] + ' Hundred ';
    num %= 100;
    if (num > 0) result += 'and ';
  }
  
  if (num >= 20) {
    result += tens[Math.floor(num / 10)] + ' ';
    num %= 10;
  } else if (num >= 10) {
    result += teens[num - 10] + ' ';
    num = 0;
  }
  
  if (num > 0) {
    result += ones[num] + ' ';
  }
  
  return result.trim();
}

export function numberToWords(amount: number): string {
  if (amount === 0) return 'Zero Rupees Only';
  
  // Split into rupees and paise
  let rupees = Math.floor(amount);
  const paise = Math.round((amount - rupees) * 100);
  
  let words = '';
  
  // Handle rupees
  if (rupees > 0) {
    // Handle crores (10,000,000+)
    if (rupees >= 10000000) {
      const crores = Math.floor(rupees / 10000000);
      words += convertLessThanThousand(crores) + ' Crore ';
      rupees %= 10000000;
    }
    
    // Handle lakhs (100,000+)
    if (rupees >= 100000) {
      const lakhs = Math.floor(rupees / 100000);
      words += convertLessThanThousand(lakhs) + ' Lakh ';
      rupees %= 100000;
    }
    
    // Handle thousands (1,000+)
    if (rupees >= 1000) {
      const thousands = Math.floor(rupees / 1000);
      words += convertLessThanThousand(thousands) + ' Thousand ';
      rupees %= 1000;
    }
    
    // Handle remaining hundreds, tens, and ones
    if (rupees > 0) {
      words += convertLessThanThousand(rupees);
    }
    
    words = words.trim();
    
    // Add paise if present
    if (paise > 0) {
      words += ' and ' + convertLessThanThousand(paise) + ' Paise';
    }
    
    words += ' Only';
  } else if (paise > 0) {
    // Only paise, no rupees
    words = convertLessThanThousand(paise) + ' Paise Only';
  }
  
  return words.trim();
}