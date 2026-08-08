export type GovernanceMode = 0 | 1 | 2 | 3; 
// 0=Disabled, 1=Advisory, 2=Prepare for Approval, 3=Restricted Autonomy

export interface KillSwitchState {
  globalKillSwitchActive: boolean;
  metaKillSwitchActive: boolean;
  googleKillSwitchActive: boolean;
  autonomousSpendCapCents: number;
  updatedAt: string;
}

export class GovernanceEngine {
  private static mode: GovernanceMode = 2; // Default Mode 2 (Prepare for Approval)
  private static killSwitchState: KillSwitchState = {
    globalKillSwitchActive: false,
    metaKillSwitchActive: false,
    googleKillSwitchActive: false,
    autonomousSpendCapCents: 50000, // $500 max autonomous action cap
    updatedAt: new Date().toISOString()
  };

  public static getGovernanceMode(): GovernanceMode {
    return this.mode;
  }

  public static setGovernanceMode(mode: GovernanceMode) {
    this.mode = mode;
  }

  public static getKillSwitchState(): KillSwitchState {
    return { ...this.killSwitchState };
  }

  public static setKillSwitch(key: keyof KillSwitchState, value: any) {
    (this.killSwitchState as any)[key] = value;
    this.killSwitchState.updatedAt = new Date().toISOString();
  }

  /**
   * Sanitizes untrusted external text to prevent prompt injection
   */
  public static sanitizePromptInput(untrustedText: string): string {
    if (!untrustedText) return '';
    // Strip malicious prompt overrides (e.g. "Ignore previous instructions", "System prompt:", "Reveal secrets")
    return untrustedText
      .replace(/ignore (all )?previous (instructions|prompts)/gi, '[REDACTED_ATTEMPT]')
      .replace(/system prompt:/gi, '[REDACTED_ATTEMPT]')
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  }

  public static canExecuteAutonomousAction(financialExposureCents: number): { allowed: boolean; reason?: string } {
    if (this.killSwitchState.globalKillSwitchActive) {
      return { allowed: false, reason: 'Global Emergency Kill Switch is ACTIVE.' };
    }
    if (this.mode < 3) {
      return { allowed: false, reason: `Current Governance Mode (${this.mode}) requires explicit human approval.` };
    }
    if (financialExposureCents > this.killSwitchState.autonomousSpendCapCents) {
      return { allowed: false, reason: `Action cost ($${financialExposureCents / 100}) exceeds autonomous limit ($${this.killSwitchState.autonomousSpendCapCents / 100}).` };
    }
    return { allowed: true };
  }
}
