/**
 * Detects access to potentially sensitive data based on configurable patterns.
 *
 * The detector inspects:
 *   - column names referenced in SELECT/UPDATE
 *   - table names referenced in FROM/JOIN/UPDATE
 *   - WHERE clause comparisons against sensitive identifiers
 */

export interface PiiPattern {
  name: string;
  category: 'auth' | 'financial' | 'identity' | 'health' | 'other';
  pattern: RegExp;
  severity: 'low' | 'medium' | 'high';
  description: string;
}

export interface PiiMatch {
  pattern: PiiPattern;
  matchedText: string;
  category: string;
  severity: string;
}

const DEFAULT_PATTERNS: PiiPattern[] = [
  {
    name: 'password',
    category: 'auth',
    pattern: /\b(password|passwd|pwd|password_hash|hashed_password)\b/i,
    severity: 'high',
    description: 'Password column access',
  },
  {
    name: 'api_token',
    category: 'auth',
    pattern: /\b(api_key|api_token|access_token|refresh_token|auth_token|secret|client_secret)\b/i,
    severity: 'high',
    description: 'Authentication token access',
  },
  {
    name: 'private_key',
    category: 'auth',
    pattern: /\b(private_key|secret_key|signing_key)\b/i,
    severity: 'high',
    description: 'Cryptographic key access',
  },
  {
    name: 'ssn',
    category: 'identity',
    pattern: /\b(ssn|social_security_number|tax_id|national_id)\b/i,
    severity: 'high',
    description: 'Government identifier access',
  },
  {
    name: 'birth_date',
    category: 'identity',
    pattern: /\b(date_of_birth|birth_date|dob)\b/i,
    severity: 'medium',
    description: 'Date of birth access',
  },
  {
    name: 'credit_card',
    category: 'financial',
    pattern: /\b(credit_card|card_number|cc_number|card_no|cvv|cvc|cvv2)\b/i,
    severity: 'high',
    description: 'Credit card data access',
  },
  {
    name: 'bank_account',
    category: 'financial',
    pattern: /\b(bank_account|account_number|routing_number|iban|swift_code)\b/i,
    severity: 'high',
    description: 'Bank account information access',
  },
  {
    name: 'salary',
    category: 'financial',
    pattern: /\b(salary|compensation|annual_income|wage)\b/i,
    severity: 'medium',
    description: 'Compensation data access',
  },
  {
    name: 'phone',
    category: 'identity',
    pattern: /\b(phone_number|mobile_number|home_phone|cell_phone)\b/i,
    severity: 'low',
    description: 'Phone number access',
  },
  {
    name: 'address',
    category: 'identity',
    pattern: /\b(home_address|street_address|postal_code|zip_code)\b/i,
    severity: 'low',
    description: 'Physical address access',
  },
  {
    name: 'medical',
    category: 'health',
    pattern: /\b(medical_record|diagnosis|prescription|patient_id|health_record)\b/i,
    severity: 'high',
    description: 'Medical record access',
  },
];

export class PiiDetector {
  private patterns: PiiPattern[];

  constructor(customPatterns: PiiPattern[] = []) {
    this.patterns = [...DEFAULT_PATTERNS, ...customPatterns];
  }

  /**
   * Scan SQL for PII / sensitive data references.
   * Returns all matches found.
   */
  scan(sql: string): PiiMatch[] {
    const matches: PiiMatch[] = [];
    const seen = new Set<string>();

    for (const pattern of this.patterns) {
      const match = sql.match(pattern.pattern);
      if (match) {
        const key = `${pattern.name}:${match[0].toLowerCase()}`;
        if (!seen.has(key)) {
          seen.add(key);
          matches.push({
            pattern,
            matchedText: match[0],
            category: pattern.category,
            severity: pattern.severity,
          });
        }
      }
    }

    return matches;
  }

  /**
   * Determine the highest severity from a list of matches.
   */
  getHighestSeverity(matches: PiiMatch[]): 'none' | 'low' | 'medium' | 'high' {
    if (matches.length === 0) return 'none';
    if (matches.some(m => m.severity === 'high')) return 'high';
    if (matches.some(m => m.severity === 'medium')) return 'medium';
    return 'low';
  }

  /**
   * Group matches by category for reporting.
   */
  groupByCategory(matches: PiiMatch[]): Record<string, PiiMatch[]> {
    const groups: Record<string, PiiMatch[]> = {};
    for (const match of matches) {
      if (!groups[match.category]) groups[match.category] = [];
      groups[match.category].push(match);
    }
    return groups;
  }

  /**
   * Build a human-readable summary of detected PII access.
   */
  summarize(matches: PiiMatch[]): string {
    if (matches.length === 0) return 'No sensitive data access detected.';

    const groups = this.groupByCategory(matches);
    const parts: string[] = [];

    for (const [category, items] of Object.entries(groups)) {
      const labels = items.map(i => i.matchedText).join(', ');
      parts.push(`${category} (${items.length}): ${labels}`);
    }

    return `Sensitive data access detected — ${parts.join('; ')}.`;
  }

  addPattern(pattern: PiiPattern): void {
    this.patterns.push(pattern);
  }

  getPatterns(): PiiPattern[] {
    return [...this.patterns];
  }
}
